import { DOCTORS, type Appointment, type AppointmentStatus } from "./apiAppointments";
import { isWardOnlineConsultation, readBedLabel, readWardLabel } from "./consultationMode";

export type ConsultationStage =
  | "scheduled"
  | "robot_en_route"
  | "bedside_ready"
  | "live"
  | "completed";

export type MedicationSlot = {
  compartment: string;
  drug: string;
  dosage: string;
  instruction: string;
};

export type BedsideConsultationFormat = "online" | "offline";
export type ConsultationOrigin = "incoming" | "admin_created";

type ConsultationRecord = {
  id: string;
  appointmentId: string;
  patientId?: string;
  patientEmail?: string;
  patientName: string;
  originType?: ConsultationOrigin;
  doctorId?: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  wardLabel: string;
  bedLabel: string;
  robotUnit: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  stage: ConsultationStage;
  meetRoomId?: string;
  medication?: MedicationSlot[];
  realTempC?: number;
  realHr?: number;
  deliveryMode?: BedsideConsultationFormat | null;
  handledAt?: string | null;
};

export type BedsideConsultationView = ConsultationRecord & {
  vitals: {
    tempC: number;
    pulseBpm: number;
    systolic: number;
    diastolic: number;
    spo2: number;
  };
  devices: {
    robotLinked: boolean;
    cameraReady: boolean;
    audioReady: boolean;
    monitoringReady: boolean;
    medicationReady: boolean;
  };
};

const CONSULTATIONS_KEY = "healthassist_bedside_consultations_v1";

function normalizePatientName(value: string | null | undefined) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function extractPatientNameWords(value: string | null | undefined) {
  const normalized = normalizePatientName(value);
  if (!normalized || normalized.includes("@")) return [];
  return (normalized.match(/[\p{L}][\p{L}\p{M}'’.-]*/gu) || []).filter((word) => !/^пациент$/iu.test(word));
}

function cleanHumanPatientName(value: string | null | undefined) {
  const words = extractPatientNameWords(value);
  if (words.length === 0) return null;
  const joined = words.slice(0, 4).join(" ").trim();
  return joined.length >= 2 ? joined : null;
}

function shortPatientFallback(source: string | null | undefined, fallback = "Пациент") {
  const raw = (source || "").trim();
  const compact = raw.replace(/\D/g, "");
  const tail = (compact || raw.replace(/[^a-zA-Z0-9]/g, "")).slice(-4);
  return tail ? `${fallback} ${tail}` : fallback;
}

export function safePatientDisplayName(
  patientName: string | null | undefined,
  source: string | null | undefined,
  fallback = "Пациент",
) {
  return cleanHumanPatientName(patientName) || shortPatientFallback(source, fallback);
}

function readConsultations(): ConsultationRecord[] {
  try {
    const raw = localStorage.getItem(CONSULTATIONS_KEY);
    const parsed = raw ? (JSON.parse(raw) as ConsultationRecord[]) : [];
    let changed = false;
    const sanitized = parsed.map((item) => {
      const hasDeliveryMode = Object.prototype.hasOwnProperty.call(item, "deliveryMode");
      const normalizedTime = normalizeAppointmentTime(item.time);
      const sanitizedPatientName = safePatientDisplayName(
        item.patientName,
        item.patientId || item.patientEmail || item.appointmentId || item.id,
      );
      const originType: ConsultationOrigin =
        item.originType || (String(item.id || item.appointmentId).startsWith("consult-manual-") ? "admin_created" : "incoming");
      const normalizedDeliveryMode = hasDeliveryMode ? (item.deliveryMode ?? null) : "online";
      const normalizedHandledAt = hasDeliveryMode ? (item.handledAt ?? null) : (item.updatedAt || item.createdAt || new Date().toISOString());
      const didChange =
        sanitizedPatientName !== item.patientName ||
        normalizedTime !== item.time ||
        originType !== item.originType ||
        normalizedDeliveryMode !== (item.deliveryMode ?? undefined) ||
        normalizedHandledAt !== (item.handledAt ?? undefined);
      changed = changed || didChange;

      if (hasDeliveryMode) {
        return {
          ...item,
          patientName: sanitizedPatientName,
          originType,
          time: normalizedTime,
          deliveryMode: normalizedDeliveryMode,
          handledAt: normalizedHandledAt,
        };
      }

      // Old bedside records were always already-scheduled online consultations.
      return {
        ...item,
        patientName: sanitizedPatientName,
        originType,
        time: normalizedTime,
        deliveryMode: normalizedDeliveryMode,
        handledAt: normalizedHandledAt,
      };
    });
    if (changed) writeConsultations(sanitized);
    return sanitized;
  } catch {
    return [];
  }
}

function writeConsultations(items: ConsultationRecord[]) {
  localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(items));
}

function consultationSort(a: ConsultationRecord, b: ConsultationRecord) {
  const aIsNew = a.deliveryMode ? 1 : 0;
  const bIsNew = b.deliveryMode ? 1 : 0;
  if (aIsNew !== bIsNew) return aIsNew - bIsNew;

  const byDate = a.date.localeCompare(b.date);
  return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
}

function normalizeAppointmentTime(time: string | null | undefined) {
  return time && time !== "00:00" ? time : "";
}

function hasAssignedDoctor(appointment: Appointment) {
  const doctorId = appointment.doctor_id || appointment.doctorId;
  return Boolean(doctorId && doctorId !== "pending");
}

function appointmentKey(item: Appointment) {
  if (item.id) return item.id;
  return [
    item.patient_id || item.patientId || "",
    item.patient_email || item.patientEmail || "",
    item.doctor_id || item.doctorId || "",
    item.date,
    item.time,
    item.reason,
  ].join("|");
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function deriveStageFromAppointment(status: AppointmentStatus, date: string, time: string): ConsultationStage {
  if (status === "done") return "completed";
  if (status === "active") return "live";

  const scheduledMs = Date.parse(`${date}T${time}:00`);
  if (Number.isNaN(scheduledMs)) return "scheduled";

  const delta = scheduledMs - Date.now();
  if (delta <= 10 * 60 * 1000 && delta >= -20 * 60 * 1000) return "bedside_ready";
  if (delta <= 40 * 60 * 1000) return "robot_en_route";
  return "scheduled";
}

function normalizeDoctor(appointment: Appointment) {
  const doctorId = appointment.doctor_id || appointment.doctorId;
  const doctor = DOCTORS.find((item) => item.id === doctorId);
  const requestedSpecialty = appointment.specialty_request || appointment.specialtyRequest || "Онлайн-консультация";
  return {
    id: doctorId,
    name: appointment.doctorName || doctor?.name || doctorId || "Врач по запросу",
    specialty: doctor?.specialty || requestedSpecialty,
  };
}

function resolvePatientName(appointment: Appointment, fallback = "Пациент") {
  return safePatientDisplayName(
    appointment.patientName || appointment.patient_name,
    appointment.patient_id || appointment.patientId || appointment.patient_email || appointment.patientEmail || appointment.id,
    fallback,
  );
}

function createConsultationFromAppointment(appointment: Appointment): ConsultationRecord {
  const key = appointmentKey(appointment);
  const seed = hashString(key);
  const doctor = normalizeDoctor(appointment);
  const time = normalizeAppointmentTime(appointment.time);
  const floor = 2 + (seed % 4);
  const room = floor * 100 + 1 + (seed % 18);
  const bed = 1 + (Math.floor(seed / 7) % 3);
  const robotIndex = 1 + (Math.floor(seed / 11) % 4);
  const reason = appointment.reason?.trim();
  const appointmentId = appointment.id || key;
  const wardLabel = readWardLabel(appointment) || `Палата ${room}`;
  const bedLabel = readBedLabel(appointment) || `Койка ${bed}`;
  const assignedDoctor = hasAssignedDoctor(appointment);

  return {
    id: `consult-${key}`,
    appointmentId,
    patientId: appointment.patient_id || appointment.patientId,
    patientEmail: appointment.patient_email || appointment.patientEmail,
    patientName: resolvePatientName(appointment),
    originType: "incoming",
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date: appointment.date,
    time,
    wardLabel,
    bedLabel,
    robotUnit: `AIMAR-${robotIndex}`,
    notes: reason || "Плановая дистанционная консультация у кровати пациента.",
    createdAt: appointment.created_at || appointment.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stage: deriveStageFromAppointment(appointment.status, appointment.date, time),
    meetRoomId: `healthassist-ward-${appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`,
    deliveryMode: assignedDoctor ? "online" : null,
    handledAt: assignedDoctor ? new Date().toISOString() : null,
  };
}

function reconcileStage(
  currentStage: ConsultationStage | undefined,
  appointmentStatus: AppointmentStatus,
  date: string,
  time: string,
): ConsultationStage {
  if (appointmentStatus === "done") return "completed";
  if (appointmentStatus === "active") return currentStage === "completed" ? "completed" : "live";
  return currentStage || deriveStageFromAppointment(appointmentStatus, date, time);
}

function enrichConsultation(record: ConsultationRecord): BedsideConsultationView {
  const seed = hashString(record.id);
  const tempC = record.realTempC != null ? record.realTempC : Number((36.4 + (seed % 8) * 0.1).toFixed(1));
  const pulseBpm = record.realHr != null ? record.realHr : 68 + (seed % 18);
  const systolic = 112 + (seed % 17);
  const diastolic = 72 + (seed % 9);
  const spo2 = 96 + (seed % 3);

  const stageRank: Record<ConsultationStage, number> = {
    scheduled: 0,
    robot_en_route: 1,
    bedside_ready: 2,
    live: 3,
    completed: 4,
  };
  const rank = stageRank[record.stage];

  return {
    ...record,
    vitals: {
      tempC,
      pulseBpm,
      systolic,
      diastolic,
      spo2,
    },
    devices: {
      robotLinked: rank >= 1,
      cameraReady: rank >= 2,
      audioReady: rank >= 2,
      monitoringReady: rank >= 2,
      medicationReady: rank >= 3,
    },
  };
}

export function syncBedsideConsultations(appointments: Appointment[]): BedsideConsultationView[] {
  const existing = readConsultations();
  const mapped = new Map(existing.map((item) => [item.appointmentId, item]));
  const relevantIds = new Set<string>();

  appointments.forEach((appointment) => {
    if (!isWardOnlineConsultation(appointment)) return;
    const appointmentId = appointment.id || appointmentKey(appointment);
    relevantIds.add(appointmentId);
    const current = mapped.get(appointmentId);
    const created = current || createConsultationFromAppointment(appointment);
    const doctor = normalizeDoctor(appointment);
    const time = normalizeAppointmentTime(appointment.time);
    const assignedDoctor = hasAssignedDoctor(appointment);
    const deliveryMode = current?.deliveryMode ?? (assignedDoctor ? "online" : null);
    const handledAt = current?.handledAt ?? (assignedDoctor ? new Date().toISOString() : null);
    const stage =
      deliveryMode === "offline"
        ? "completed"
        : reconcileStage(created.stage, appointment.status, appointment.date, time);

    mapped.set(appointmentId, {
      ...created,
      appointmentId,
      patientId: appointment.patient_id || appointment.patientId || created.patientId,
      patientEmail: appointment.patient_email || appointment.patientEmail || created.patientEmail,
      patientName: resolvePatientName(appointment, created.patientName || "Пациент"),
      originType: current?.originType || created.originType || "incoming",
      doctorId: appointment.doctor_id || appointment.doctorId || created.doctorId,
      doctorName: appointment.doctorName || doctor.name || created.doctorName,
      specialty: doctor.specialty || created.specialty,
      date: appointment.date,
      time,
      wardLabel: readWardLabel(appointment) || created.wardLabel,
      bedLabel: readBedLabel(appointment) || created.bedLabel,
      notes: appointment.reason?.trim() || created.notes,
      meetRoomId: current?.meetRoomId || created.meetRoomId,
      deliveryMode,
      handledAt,
      stage,
      updatedAt: new Date().toISOString(),
    });
  });

  const next = Array.from(mapped.values()).sort(consultationSort);
  writeConsultations(next);
  return next.filter((item) => relevantIds.has(item.appointmentId)).map(enrichConsultation);
}

export type ManualWardConsultationParams = {
  patientName: string;
  wardLabel: string;
  bedLabel: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  notes?: string;
};

function generateRoomId(id: string) {
  return `healthassist-ward-${id.slice(-8)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createManualWardConsultation(params: ManualWardConsultationParams): BedsideConsultationView {
  const id = `consult-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const robotIndex = 1 + (Math.floor(Math.random() * 4));
  const handledAt = new Date().toISOString();
  const record: ConsultationRecord = {
    id,
    appointmentId: id,
    meetRoomId: generateRoomId(id),
    patientName: params.patientName,
    originType: "admin_created",
    doctorId: params.doctorId,
    doctorName: params.doctorName,
    specialty: params.specialty,
    date: params.date,
    time: params.time,
    wardLabel: params.wardLabel,
    bedLabel: params.bedLabel,
    robotUnit: `AIMAR-${robotIndex}`,
    notes: params.notes || "Плановая дистанционная консультация у кровати пациента.",
    createdAt: handledAt,
    updatedAt: handledAt,
    stage: deriveStageFromAppointment("pending", params.date, params.time),
    deliveryMode: "online",
    handledAt,
  };

  const existing = readConsultations();
  writeConsultations([...existing, record].sort(consultationSort));
  return enrichConsultation(record);
}

export function listAllBedsideConsultations(): BedsideConsultationView[] {
  return readConsultations().sort(consultationSort).map(enrichConsultation);
}

export function countNewBedsideConsultations() {
  return readConsultations().filter((item) => !item.deliveryMode).length;
}

export function markBedsideConsultationFormat(id: string, deliveryMode: BedsideConsultationFormat) {
  const items = readConsultations();
  const handledAt = new Date().toISOString();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          deliveryMode,
          handledAt,
          stage: deliveryMode === "offline" ? "completed" : item.stage === "completed" ? "scheduled" : item.stage,
          updatedAt: handledAt,
        }
      : item,
  );
  writeConsultations(next);
  const updated = next.find((item) => item.id === id);
  return updated ? enrichConsultation(updated) : null;
}

export function assignBedsideConsultationSlot(
  id: string,
  input: {
    doctorId: string;
    doctorName: string;
    specialty: string;
    date: string;
    time: string;
  },
) {
  const items = readConsultations();
  const updatedAt = new Date().toISOString();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          doctorId: input.doctorId,
          doctorName: input.doctorName,
          specialty: input.specialty,
          date: input.date,
          time: input.time,
          updatedAt,
        }
      : item,
  );
  writeConsultations(next);
  const updated = next.find((item) => item.id === id);
  return updated ? enrichConsultation(updated) : null;
}

export function setRealVitals(id: string, tempC: number, hr: number) {
  const items = readConsultations();
  const next = items.map((item) =>
    item.id === id ? { ...item, realTempC: tempC, realHr: hr, updatedAt: new Date().toISOString() } : item
  );
  writeConsultations(next);
  const updated = next.find((item) => item.id === id);
  return updated ? enrichConsultation(updated) : null;
}

export function updateMedication(id: string, medication: MedicationSlot[]) {
  const items = readConsultations();
  const next = items.map((item) =>
    item.id === id ? { ...item, medication, updatedAt: new Date().toISOString() } : item
  );
  writeConsultations(next);
  const updated = next.find((item) => item.id === id);
  return updated ? enrichConsultation(updated) : null;
}

export function getActiveLiveConsultation(): BedsideConsultationView | null {
  const items = readConsultations();
  const live = items.find((item) => item.stage === "live");
  return live ? enrichConsultation(live) : null;
}

export function deleteBedsideConsultation(id: string) {
  const items = readConsultations().filter((item) => item.id !== id);
  writeConsultations(items);
}

export function updateBedsideConsultationStage(id: string, stage: ConsultationStage) {
  const items = readConsultations();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          stage,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );
  writeConsultations(next);
  const updated = next.find((item) => item.id === id);
  return updated ? enrichConsultation(updated) : null;
}
