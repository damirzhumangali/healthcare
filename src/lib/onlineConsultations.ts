import { DOCTORS, type Appointment, type AppointmentStatus } from "./apiAppointments";

export type ConsultationStage =
  | "scheduled"
  | "robot_en_route"
  | "bedside_ready"
  | "live"
  | "completed";

type ConsultationRecord = {
  id: string;
  appointmentId: string;
  patientId?: string;
  patientEmail?: string;
  patientName: string;
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

function readConsultations(): ConsultationRecord[] {
  try {
    const raw = localStorage.getItem(CONSULTATIONS_KEY);
    return raw ? (JSON.parse(raw) as ConsultationRecord[]) : [];
  } catch {
    return [];
  }
}

function writeConsultations(items: ConsultationRecord[]) {
  localStorage.setItem(CONSULTATIONS_KEY, JSON.stringify(items));
}

function consultationSort(a: ConsultationRecord, b: ConsultationRecord) {
  const byDate = a.date.localeCompare(b.date);
  return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
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
  return {
    id: doctorId,
    name: appointment.doctorName || doctor?.name || doctorId || "Врач",
    specialty: doctor?.specialty || "Онлайн-консультация",
  };
}

function createConsultationFromAppointment(appointment: Appointment): ConsultationRecord {
  const key = appointmentKey(appointment);
  const seed = hashString(key);
  const doctor = normalizeDoctor(appointment);
  const floor = 2 + (seed % 4);
  const room = floor * 100 + 1 + (seed % 18);
  const bed = 1 + (Math.floor(seed / 7) % 3);
  const robotIndex = 1 + (Math.floor(seed / 11) % 4);
  const reason = appointment.reason?.trim();

  return {
    id: `consult-${key}`,
    appointmentId: appointment.id || key,
    patientId: appointment.patient_id || appointment.patientId,
    patientEmail: appointment.patient_email || appointment.patientEmail,
    patientName:
      appointment.patientName ||
      appointment.patient_email ||
      appointment.patientEmail ||
      appointment.patient_id ||
      appointment.patientId ||
      "Пациент",
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    date: appointment.date,
    time: appointment.time,
    wardLabel: `Палата ${room}`,
    bedLabel: `Койка ${bed}`,
    robotUnit: `AIMAR-${robotIndex}`,
    notes: reason || "Плановая дистанционная консультация у кровати пациента.",
    createdAt: appointment.created_at || appointment.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stage: deriveStageFromAppointment(appointment.status, appointment.date, appointment.time),
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
  const tempC = Number((36.4 + (seed % 8) * 0.1).toFixed(1));
  const pulseBpm = 68 + (seed % 18);
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
    const appointmentId = appointment.id || appointmentKey(appointment);
    relevantIds.add(appointmentId);
    const current = mapped.get(appointmentId);
    const created = current || createConsultationFromAppointment(appointment);
    const doctor = normalizeDoctor(appointment);

    mapped.set(appointmentId, {
      ...created,
      appointmentId,
      patientId: appointment.patient_id || appointment.patientId || created.patientId,
      patientEmail: appointment.patient_email || appointment.patientEmail || created.patientEmail,
      patientName:
        appointment.patientName ||
        appointment.patient_email ||
        appointment.patientEmail ||
        appointment.patient_id ||
        appointment.patientId ||
        created.patientName,
      doctorId: appointment.doctor_id || appointment.doctorId || created.doctorId,
      doctorName: appointment.doctorName || doctor.name || created.doctorName,
      specialty: doctor.specialty || created.specialty,
      date: appointment.date,
      time: appointment.time,
      notes: appointment.reason?.trim() || created.notes,
      stage: reconcileStage(created.stage, appointment.status, appointment.date, appointment.time),
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

export function createManualWardConsultation(params: ManualWardConsultationParams): BedsideConsultationView {
  const id = `consult-manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const robotIndex = 1 + (Math.floor(Math.random() * 4));
  const record: ConsultationRecord = {
    id,
    appointmentId: id,
    patientName: params.patientName,
    doctorId: params.doctorId,
    doctorName: params.doctorName,
    specialty: params.specialty,
    date: params.date,
    time: params.time,
    wardLabel: params.wardLabel,
    bedLabel: params.bedLabel,
    robotUnit: `AIMAR-${robotIndex}`,
    notes: params.notes || "Плановая дистанционная консультация у кровати пациента.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    stage: deriveStageFromAppointment("pending", params.date, params.time),
  };

  const existing = readConsultations();
  writeConsultations([...existing, record].sort(consultationSort));
  return enrichConsultation(record);
}

export function listAllBedsideConsultations(): BedsideConsultationView[] {
  return readConsultations().sort(consultationSort).map(enrichConsultation);
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
