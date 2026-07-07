import { API_URL } from "./apiBase";
import { getToken } from "./auth";
import { normalizePatientFullName } from "./patientName";
import {
  isHomeOnlineConsultation,
  readRoomLabel,
  resolveConsultationMode,
  resolveAppointmentRequestType,
  type AppointmentRequestType,
  type ConsultationMode,
} from "./consultationMode";

export type AppointmentStatus = "pending" | "active" | "done";

export type Appointment = {
  id: string;
  patient_id?: string;
  patientId?: string;
  patient_email?: string;
  patientEmail?: string;
  patientName?: string;
  patient_name?: string;
  doctor_id?: string;
  doctorId?: string;
  doctorName?: string;
  date: string;
  time: string;
  reason: string;
  specialty_request?: string;
  specialtyRequest?: string;
  status: AppointmentStatus;
  wants_online?: boolean;
  wantsOnline?: boolean;
  consultation_mode?: ConsultationMode;
  consultationMode?: ConsultationMode;
  request_type?: AppointmentRequestType;
  requestType?: AppointmentRequestType;
  room_label?: string;
  roomLabel?: string;
  ward_label?: string;
  wardLabel?: string;
  bed_label?: string;
  bedLabel?: string;
  meeting_url?: string;
  meeting_at?: string;
  meetingAt?: string;
  meeting_notified?: boolean;
  meetingNotified?: boolean;
  created_at?: string;
  createdAt?: string;
};

export type DoctorOption = {
  id: string;
  email?: string | null;
  name: string;
  specialty: string;
  active?: boolean;
};

export class AppointmentRequestError extends Error {
  code: "auth_required" | "server_create_failed";

  constructor(code: "auth_required" | "server_create_failed") {
    super(code);
    this.code = code;
  }
}

export const DOCTORS: DoctorOption[] = [
  { id: "doctor-001", name: "Айжан Нурбекова",  specialty: "Терапевт" },
  { id: "doctor-002", name: "Ерлан Садыков",    specialty: "Кардиолог" },
  { id: "doctor-003", name: "Мария Ким",         specialty: "Невролог" },
  { id: "doctor-004", name: "Алибек Жумабеков", specialty: "Хирург" },
  { id: "doctor-005", name: "Гүлнар Байжанова", specialty: "Педиатр" },
  { id: "doctor-006", name: "Серік Оспанов",    specialty: "ЛОР" },
  { id: "doctor-007", name: "Наталья Соколова", specialty: "Офтальмолог" },
  { id: "doctor-008", name: "Дамир Усенов",     specialty: "Стоматолог" },
  { id: "doctor-009", name: "Айгүл Нурланова",  specialty: "Гинеколог" },
  { id: "doctor-010", name: "Руслан Ахметов",   specialty: "Уролог" },
  { id: "doctor-011", name: "Венера Исмаилова", specialty: "Дерматолог" },
  { id: "doctor-012", name: "Болат Серіков",    specialty: "Эндокринолог" },
  { id: "doctor-013", name: "Ирина Власова",    specialty: "Ортопед" },
];

const LOCAL_APPOINTMENTS_KEY = "healthassist_appointments_v1";
// Separate key for doctor assignments — never overwritten by server data
const ASSIGN_OVERRIDES_KEY = "healthassist_assign_overrides_v1";
// Tracks IDs of appointments created by the current patient on this device
const MY_APT_IDS_KEY = "healthassist_my_apt_ids_v1";

type AssignOverride = {
  doctorId: string;
  doctorName: string;
  date?: string;
  time?: string;
  roomLabel?: string;
  meetingUrl?: string;
  meetingAt?: string;
  meetingNotified?: boolean;
};

function mergeDoctorLists(primary: DoctorOption[], fallback: DoctorOption[]) {
  const merged = new Map<string, DoctorOption>();

  fallback.forEach((doctor) => {
    merged.set(doctor.id, doctor);
  });

  primary.forEach((doctor) => {
    const existing = merged.get(doctor.id);
    merged.set(doctor.id, {
      ...existing,
      ...doctor,
      active: doctor.active ?? existing?.active ?? true,
    });
  });

  return Array.from(merged.values());
}

function isDoctorAssigned(item: Appointment) {
  const doctorId = item.doctor_id || item.doctorId;
  return Boolean(doctorId && doctorId !== "pending");
}

function sanitizePendingAssignment(item: Appointment): Appointment {
  const hasGhostDoctor =
    item.status === "pending" &&
    isDoctorAssigned(item) &&
    (!item.time || item.time === "00:00") &&
    !item.meeting_at &&
    !item.meetingAt &&
    !readRoomLabel(item);

  if (!hasGhostDoctor) return item;

  return {
    ...item,
    doctor_id: undefined,
    doctorId: undefined,
    doctorName: undefined,
    meeting_url: undefined,
  };
}

function readAssignOverrides(): Record<string, AssignOverride> {
  try {
    const raw = localStorage.getItem(ASSIGN_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AssignOverride>) : {};
  } catch {
    return {};
  }
}

function saveAssignOverride(appointmentId: string, override: AssignOverride) {
  const overrides = readAssignOverrides();
  overrides[appointmentId] = override;
  localStorage.setItem(ASSIGN_OVERRIDES_KEY, JSON.stringify(overrides));
}

function readMyAptIds(): Set<string> {
  try {
    const raw = localStorage.getItem(MY_APT_IDS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function addMyAptId(id: string) {
  const ids = readMyAptIds();
  ids.add(id);
  localStorage.setItem(MY_APT_IDS_KEY, JSON.stringify([...ids]));
}

function applyAssignOverrides(items: Appointment[]): Appointment[] {
  const overrides = readAssignOverrides();
  if (Object.keys(overrides).length === 0) return items;
  return items.map((item) => {
    const ov = overrides[item.id];
    if (!ov) return item;
    return {
      ...sanitizePendingAssignment(item),
      doctor_id: ov.doctorId,
      doctorId: ov.doctorId,
      doctorName: ov.doctorName,
      ...(ov.date ? { date: ov.date } : {}),
      ...(ov.time ? { time: ov.time } : {}),
      ...(ov.roomLabel ? { room_label: ov.roomLabel, roomLabel: ov.roomLabel } : {}),
      ...(ov.meetingUrl ? { meeting_url: ov.meetingUrl } : {}),
      ...(ov.meetingAt ? { meeting_at: ov.meetingAt, meetingAt: ov.meetingAt } : {}),
      ...(ov.meetingNotified != null ? { meeting_notified: ov.meetingNotified, meetingNotified: ov.meetingNotified } : {}),
    };
  });
}

function readAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(LOCAL_APPOINTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Appointment[]) : [];
  } catch {
    return [];
  }
}

function writeAppointments(items: Appointment[]) {
  localStorage.setItem(LOCAL_APPOINTMENTS_KEY, JSON.stringify(items));
}

function persistAppointment(item: Appointment) {
  const current = readAppointments();
  const merged = new Map<string, Appointment>();

  current.forEach((entry) => {
    merged.set(appointmentKey(entry), sanitizePendingAssignment(entry));
  });
  merged.set(appointmentKey(item), sanitizePendingAssignment(item));

  writeAppointments(Array.from(merged.values()).sort(appointmentSort));
}

function appointmentSort(a: Appointment, b: Appointment) {
  const byDate = a.date.localeCompare(b.date);
  return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
}

function appointmentKey(item: Appointment) {
  if (item.id) return `id:${item.id}`;
  return [
    item.patient_id || item.patientId || "",
    item.patient_email || item.patientEmail || "",
    item.doctor_id || item.doctorId || "",
    item.date,
    item.time,
    item.reason,
  ].join("|");
}

function readCurrentUser() {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as { id?: string; email?: string; name?: string }) : null;
  } catch {
    return null;
  }
}

function buildLocalMeetingUrl(id: string) {
  return `https://meet.jit.si/healthassist-${id.replace(/-/g, "").slice(0, 14)}`;
}

function shouldAllowLocalAppointmentFallback() {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function createLocalAppointment(input: {
  doctorId?: string;
  date: string;
  time: string;
  reason: string;
  specialtyRequest?: string;
  wantsOnline?: boolean;
  consultationMode?: ConsultationMode;
  roomLabel?: string;
  wardLabel?: string;
  bedLabel?: string;
}) {
  const user = readCurrentUser();
  const patientProfileName = normalizePatientFullName(user?.name, { requireFullName: true }) || "";
  const doctor = input.doctorId ? DOCTORS.find((item) => item.id === input.doctorId) : undefined;
  const id = crypto.randomUUID();
  const consultationMode =
    input.consultationMode || (input.wantsOnline ? "online_home" : "in_person");
  const wantsOnline = consultationMode !== "in_person";
  const requestType: AppointmentRequestType =
    consultationMode === "online_ward" ? "ward_online" : "regular";
  const meetingUrl =
    consultationMode === "online_home" && input.doctorId ? buildLocalMeetingUrl(id) : undefined;
  const appointment: Appointment = {
    id,
    patient_id: user?.id || user?.email || "local-patient",
    patient_email: user?.email,
    patientName: patientProfileName || "Пациент",
    patient_name: patientProfileName,
    doctor_id: input.doctorId,
    doctorName: doctor ? `${doctor.name} — ${doctor.specialty}` : undefined,
    date: input.date,
    time: input.time,
    reason: input.reason,
    specialty_request: input.specialtyRequest,
    wants_online: wantsOnline,
    wantsOnline,
    consultation_mode: consultationMode,
    consultationMode,
    request_type: requestType,
    requestType,
    room_label: input.roomLabel,
    roomLabel: input.roomLabel,
    ward_label: input.wardLabel,
    wardLabel: input.wardLabel,
    bed_label: input.bedLabel,
    bedLabel: input.bedLabel,
    meeting_url: meetingUrl,
    status: "pending",
    created_at: new Date().toISOString(),
  };

  const items = readAppointments();
  items.push(appointment);
  writeAppointments(items);
  addMyAptId(appointment.id);
  return { item: appointment };
}

function fetchLocalAppointments(date?: string): { items: Appointment[] } {
  const items = readAppointments()
    .filter((item) => (date ? item.date === date : true))
    .sort(appointmentSort);
  return { items };
}

function updateLocalAppointmentStatus(id: string, status: AppointmentStatus) {
  const items = readAppointments();
  const next = items.map((item) => (item.id === id ? { ...item, status } : item));
  writeAppointments(next);
  return { item: next.find((item) => item.id === id) ?? null };
}

function normalizeAppointmentList(data: { items?: Appointment[]; appointments?: Appointment[] }) {
  return { items: data.items ?? data.appointments ?? [] };
}

function mergeAppointmentWithFallback(primary: Appointment, fallback?: Appointment | null): Appointment {
  if (!fallback) return primary;

  return {
    ...fallback,
    ...primary,
    patientName: primary.patientName || primary.patient_name || fallback.patientName || fallback.patient_name,
    patient_name: primary.patient_name || primary.patientName || fallback.patient_name || fallback.patientName,
    patient_email: primary.patient_email || primary.patientEmail || fallback.patient_email || fallback.patientEmail,
    patientEmail: primary.patientEmail || primary.patient_email || fallback.patientEmail || fallback.patient_email,
    doctorName: primary.doctorName || fallback.doctorName,
    reason: primary.reason || fallback.reason,
    specialty_request: primary.specialty_request || primary.specialtyRequest || fallback.specialty_request || fallback.specialtyRequest,
    specialtyRequest: primary.specialtyRequest || primary.specialty_request || fallback.specialtyRequest || fallback.specialty_request,
    meeting_url: primary.meeting_url || fallback.meeting_url,
    meeting_at: primary.meeting_at || primary.meetingAt || fallback.meeting_at || fallback.meetingAt,
    room_label: primary.room_label || primary.roomLabel || fallback.room_label || fallback.roomLabel,
    roomLabel: primary.roomLabel || primary.room_label || fallback.roomLabel || fallback.room_label,
    ward_label: primary.ward_label || primary.wardLabel || fallback.ward_label || fallback.wardLabel,
    wardLabel: primary.wardLabel || primary.ward_label || fallback.wardLabel || fallback.ward_label,
    bed_label: primary.bed_label || primary.bedLabel || fallback.bed_label || fallback.bedLabel,
    bedLabel: primary.bedLabel || primary.bed_label || fallback.bedLabel || fallback.bed_label,
  };
}

function authHeaders() {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function normalizeDoctors(data: { items?: DoctorOption[]; doctors?: DoctorOption[] }) {
  return { items: mergeDoctorLists(data.items ?? data.doctors ?? [], DOCTORS) };
}

export async function fetchDoctors(includeInactive = false): Promise<{ items: DoctorOption[] }> {
  const params = new URLSearchParams();
  if (includeInactive) params.set("includeInactive", "1");
  const query = params.toString();
  const url = query ? `${API_URL}/api/doctors?${query}` : `${API_URL}/api/doctors`;

  try {
    const res = await fetch(url, {
      headers: includeInactive ? authHeaders() : undefined,
      credentials: includeInactive ? "include" : undefined,
    });

    if (!res.ok) throw new Error("fetch doctors failed");
    const data = normalizeDoctors(await res.json());
    return { items: data.items.length > 0 ? data.items : DOCTORS };
  } catch {
    return { items: includeInactive ? DOCTORS.map((doctor) => ({ ...doctor, active: true })) : DOCTORS };
  }
}

export async function createAppointment(input: {
  doctorId?: string;
  date: string;
  time: string;
  reason: string;
  specialtyRequest?: string;
  wantsOnline?: boolean;
  consultationMode?: ConsultationMode;
  roomLabel?: string;
  wardLabel?: string;
  bedLabel?: string;
}) {
  const currentUser = readCurrentUser();
  const patientName = normalizePatientFullName(currentUser?.name, { requireFullName: true }) || "";
  const consultationMode =
    input.consultationMode || (input.wantsOnline ? "online_home" : "in_person");
  const wantsOnline = consultationMode !== "in_person";
  const requestType: AppointmentRequestType =
    consultationMode === "online_ward" ? "ward_online" : "regular";

  try {
    const payload: Record<string, unknown> = {
      ...input,
      time: input.time || "00:00",
      specialty_request: input.specialtyRequest ?? "",
      wants_online: wantsOnline,
      consultation_mode: consultationMode,
      request_type: requestType,
      room_label: input.roomLabel ?? "",
      ward_label: input.wardLabel ?? "",
      bed_label: input.bedLabel ?? "",
      patient_name: patientName,
    };
    if (input.doctorId) payload.doctor_id = input.doctorId;

    const res = await fetch(`${API_URL}/api/appointments`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new AppointmentRequestError("auth_required");
      }
      throw new AppointmentRequestError("server_create_failed");
    }
    const data = await res.json();
    const created = data.item ?? data.appointment ?? null;

    if (created) {
      // Enrich server response with local user info the server may not return
      persistAppointment({
        ...created,
        patient_name: created.patient_name || patientName || undefined,
        patientName: created.patientName || patientName || undefined,
        patient_email: created.patient_email || currentUser?.email || undefined,
        wants_online: created.wants_online ?? created.wantsOnline ?? wantsOnline,
        wantsOnline: created.wantsOnline ?? created.wants_online ?? wantsOnline,
        consultation_mode:
          created.consultation_mode ||
          created.consultationMode ||
          consultationMode,
        consultationMode:
          created.consultationMode ||
          created.consultation_mode ||
          consultationMode,
        request_type:
          created.request_type ||
          created.requestType ||
          requestType,
        requestType:
          created.requestType ||
          created.request_type ||
          requestType,
        room_label: created.room_label || created.roomLabel || input.roomLabel,
        roomLabel: created.roomLabel || created.room_label || input.roomLabel,
        ward_label: created.ward_label || created.wardLabel || input.wardLabel,
        wardLabel: created.wardLabel || created.ward_label || input.wardLabel,
        bed_label: created.bed_label || created.bedLabel || input.bedLabel,
        bedLabel: created.bedLabel || created.bed_label || input.bedLabel,
      });
      addMyAptId(created.id);
    }

    return data;
  } catch (error) {
    if (shouldAllowLocalAppointmentFallback()) {
      return createLocalAppointment(input);
    }
    if (error instanceof AppointmentRequestError) {
      throw error;
    }
    throw new AppointmentRequestError("server_create_failed");
  }
}

export async function assignDoctorToAppointment(
  id: string,
  doctorId: string,
  input?: {
    date?: string;
    time?: string;
    roomLabel?: string;
    meetingUrl?: string;
    meetingAt?: string;
  },
) {
  const doctor = DOCTORS.find((d) => d.id === doctorId);
  const doctorName = doctor ? `${doctor.name} — ${doctor.specialty}` : doctorId;
  const time = input?.time;
  const meetingUrl = input?.meetingUrl;
  const meetingAt = input?.meetingAt;
  const date = input?.date;
  const roomLabel = input?.roomLabel;

  // Save to separate override map — applied after every fetch, cannot be overwritten by server
  saveAssignOverride(id, { doctorId, doctorName, date, time, roomLabel, meetingUrl, meetingAt });

  // Also update main appointments list for consistency
  const items = readAppointments();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          doctor_id: doctorId,
          doctorId,
          doctorName,
          date: date ?? item.date,
          time: time ?? item.time,
          ...(roomLabel ? { room_label: roomLabel, roomLabel } : {}),
          ...(meetingUrl ? { meeting_url: meetingUrl } : {}),
          ...(meetingAt ? { meeting_at: meetingAt, meetingAt } : {}),
        }
      : item
  );
  writeAppointments(next);

  try {
    const res = await fetch(`${API_URL}/api/appointments/${id}/assign`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({
        doctor_id: doctorId,
        date,
        time,
        room_label: roomLabel,
        ...(meetingUrl ? { meeting_url: meetingUrl } : {}),
        ...(meetingAt ? { meeting_at: meetingAt } : {}),
      }),
    });
    if (!res.ok) throw new Error("assign failed");
    return await res.json();
  } catch {
    return { item: next.find((item) => item.id === id) ?? null };
  }
}

export function setAppointmentMeetingInfo(
  id: string,
  input: {
    meetingUrl?: string;
    meetingAt?: string;
    meetingNotified?: boolean;
  },
) {
  const items = readAppointments();
  const next = items.map((item) =>
    item.id === id
      ? {
          ...item,
          ...(input.meetingUrl ? { meeting_url: input.meetingUrl } : {}),
          ...(input.meetingAt ? { meeting_at: input.meetingAt, meetingAt: input.meetingAt } : {}),
          ...(input.meetingNotified != null
            ? { meeting_notified: input.meetingNotified, meetingNotified: input.meetingNotified }
            : {}),
        }
      : item,
  );
  writeAppointments(next);

  const currentOverride = readAssignOverrides()[id];
  if (currentOverride) {
    saveAssignOverride(id, {
      ...currentOverride,
      meetingUrl: input.meetingUrl ?? currentOverride.meetingUrl,
      meetingAt: input.meetingAt ?? currentOverride.meetingAt,
      meetingNotified:
        input.meetingNotified != null ? input.meetingNotified : currentOverride.meetingNotified,
    });
  }

  return next.find((item) => item.id === id) ?? null;
}

function normalizeFetchedAppointments(items: Appointment[]) {
  return items
    .map((item) =>
      sanitizePendingAssignment({
        ...item,
        meeting_url:
          item.meeting_url ||
          (isHomeOnlineConsultation(item) && isDoctorAssigned(item) ? buildLocalMeetingUrl(item.id) : undefined),
        consultation_mode: item.consultation_mode || item.consultationMode || resolveConsultationMode(item),
        consultationMode: item.consultationMode || item.consultation_mode || resolveConsultationMode(item),
        request_type: item.request_type || item.requestType || resolveAppointmentRequestType(item),
        requestType: item.requestType || item.request_type || resolveAppointmentRequestType(item),
      }),
    )
    .sort(appointmentSort);
}

export function pingBackend() {
  void fetch(`${API_URL}/api/appointments`, { method: "HEAD", headers: authHeaders(), credentials: "include" }).catch(() => {});
}

export async function fetchAppointments(date?: string): Promise<{ items: Appointment[] }> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const query = params.toString();
  const url = query ? `${API_URL}/api/appointments?${query}` : `${API_URL}/api/appointments`;
  const allLocal = normalizeFetchedAppointments(readAppointments()); // full local cache, unfiltered
  const localItems = fetchLocalAppointments(date).items;

  try {
    const res = await fetch(url, {
      headers: authHeaders(),
      credentials: "include",
    });

    if (!res.ok) throw new Error("fetch appointments failed");
    const data = normalizeAppointmentList(await res.json());
    const normalized = normalizeFetchedAppointments(data.items ?? []);
    const cachedById = new Map(allLocal.map((item) => [item.id, item]));
    const hydrated = normalized.map((item) => mergeAppointmentWithFallback(item, cachedById.get(item.id)));

    // Preserve local-only appointments (created while backend was unreachable)
    const serverIds = new Set(hydrated.map((a) => a.id));
    const localOnly = allLocal.filter((a) => !serverIds.has(a.id));
    const merged = localOnly.length > 0 ? [...hydrated, ...localOnly] : hydrated;

    writeAppointments(merged);
    const result = date ? merged.filter((a) => a.date === date) : merged;
    return { items: applyAssignOverrides(result) };
  } catch {
    return { items: applyAssignOverrides(normalizeFetchedAppointments(localItems)) };
  }
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  try {
    const res = await fetch(`${API_URL}/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({ status }),
    });

    if (!res.ok) throw new Error("update appointment status failed");
    return res.json();
  } catch {
    return updateLocalAppointmentStatus(id, status);
  }
}

export function getLocalAppointmentById(id: string): Appointment | null {
  return readAppointments().find((a) => a.id === id) ?? null;
}

export function readCachedAppointments(): Appointment[] {
  return applyAssignOverrides(normalizeFetchedAppointments(readAppointments()));
}

export async function fetchMyAppointments(): Promise<{ items: Appointment[] }> {
  const user = readCurrentUser();
  try {
    const res = await fetch(`${API_URL}/api/appointments/my`, {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error();
    const data = normalizeAppointmentList(await res.json());
    const cached = readAppointments();
    const cachedById = new Map(cached.map((item) => [item.id, item]));
    const updated = normalizeFetchedAppointments(data.items).map((item) =>
      mergeAppointmentWithFallback(item, cachedById.get(item.id)),
    );
    writeAppointments(updated);

    return { items: applyAssignOverrides(updated) };
  } catch {
    const all = readAppointments();

    const backfilled = normalizeFetchedAppointments(all);
    if (backfilled.some((a, i) => a.meeting_url !== all[i].meeting_url)) {
      writeAppointments(backfilled);
    }

    // Try strict email/id match first
    const byId = backfilled.filter((a) => {
      const pid = a.patient_id || a.patientId || "";
      const pemail = (a.patient_email || a.patientEmail || "").toLowerCase();
      return (
        (user?.id && pid === user.id) ||
        (user?.email && pemail === user.email.toLowerCase())
      );
    });
    if (byId.length > 0) return { items: applyAssignOverrides(byId) };

    const myIds = readMyAptIds();
    if (myIds.size > 0) {
      const byMyIds = backfilled.filter((a) => myIds.has(a.id));
      return { items: applyAssignOverrides(byMyIds) };
    }

    return { items: [] };
  }
}

export async function fetchDoctorSchedule(date?: string): Promise<{ items: Appointment[] }> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const query = params.toString();
  const url = query ? `${API_URL}/api/appointments/my-schedule?${query}` : `${API_URL}/api/appointments/my-schedule`;
  const cached = normalizeFetchedAppointments(readAppointments());
  const cachedById = new Map(cached.map((item) => [item.id, item]));

  try {
    const res = await fetch(url, {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error("fetch doctor schedule failed");
    const data = normalizeAppointmentList(await res.json());
    const normalized = normalizeFetchedAppointments(data.items ?? []).map((item) =>
      mergeAppointmentWithFallback(item, cachedById.get(item.id)),
    );

    const serverIds = new Set(normalized.map((item) => item.id));
    const localOnly = cached.filter((item) => !serverIds.has(item.id));
    const merged = localOnly.length > 0 ? [...normalized, ...localOnly] : normalized;
    writeAppointments(merged);

    return { items: applyAssignOverrides(date ? merged.filter((item) => item.date === date) : merged) };
  } catch {
    return fetchAppointments(date);
  }
}
