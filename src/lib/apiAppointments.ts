import { API_URL } from "./apiBase";
import { getToken } from "./auth";

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
  time?: string;
};

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
      ...item,
      doctor_id: ov.doctorId,
      doctorId: ov.doctorId,
      doctorName: ov.doctorName,
      ...(ov.time ? { time: ov.time } : {}),
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
    merged.set(appointmentKey(entry), entry);
  });
  merged.set(appointmentKey(item), item);

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

function mergeAppointments(serverItems: Appointment[], localItems: Appointment[]) {
  const merged = new Map<string, Appointment>();

  serverItems.forEach((item) => {
    merged.set(appointmentKey(item), item);
  });

  localItems.forEach((item) => {
    const key = appointmentKey(item);
    const server = merged.get(key);
    if (!server) {
      merged.set(key, item);
      return;
    }
    merged.set(key, {
      ...server,
      doctor_id: item.doctor_id || server.doctor_id,
      doctorId: item.doctorId || server.doctorId,
      doctorName: item.doctorName || server.doctorName,
      time: (item.time && item.time !== "00:00") ? item.time : server.time,
      status: item.status,
      patientName: item.patientName || server.patientName,
      patient_name: item.patient_name || server.patient_name,
      patient_email: item.patient_email || server.patient_email,
    });
  });

  return Array.from(merged.values()).sort(appointmentSort);
}

function readCurrentUser() {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as { id?: string; email?: string; name?: string }) : null;
  } catch {
    return null;
  }
}

function createLocalAppointment(input: {
  doctorId?: string;
  date: string;
  time: string;
  reason: string;
  specialtyRequest?: string;
  wantsOnline?: boolean;
}) {
  const user = readCurrentUser();
  const doctor = input.doctorId ? DOCTORS.find((item) => item.id === input.doctorId) : undefined;
  const appointment: Appointment = {
    id: crypto.randomUUID(),
    patient_id: user?.id || user?.email || "local-patient",
    patient_email: user?.email,
    patientName: user?.name || user?.email || "Пациент",
    patient_name: user?.name || user?.email || "",
    doctor_id: input.doctorId,
    doctorName: doctor ? `${doctor.name} — ${doctor.specialty}` : undefined,
    date: input.date,
    time: input.time,
    reason: input.reason,
    specialty_request: input.specialtyRequest,
    wants_online: input.wantsOnline,
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
  return { items: data.items ?? data.doctors ?? [] };
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
}) {
  let resolvedDoctorId = input.doctorId;
  if (!resolvedDoctorId) {
    try {
      const docs = await fetchDoctors();
      resolvedDoctorId = docs.items[0]?.id;
    } catch {
      // ignore, will fall back to localStorage
    }
  }

  const currentUser = readCurrentUser();
  const patientName = currentUser?.name || currentUser?.email || "";

  try {
    const res = await fetch(`${API_URL}/api/appointments`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({
        ...input,
        doctor_id: resolvedDoctorId ?? "",
        time: input.time || "00:00",
        specialty_request: input.specialtyRequest ?? "",
        wants_online: input.wantsOnline ?? false,
        patient_name: patientName,
      }),
    });

    if (!res.ok) throw new Error("create appointment failed");
    const data = await res.json();
    const created = data.item ?? data.appointment ?? null;

    if (created) {
      // Enrich server response with local user info the server may not return
      persistAppointment({
        ...created,
        patient_name: created.patient_name || patientName || undefined,
        patientName: created.patientName || patientName || undefined,
        patient_email: created.patient_email || currentUser?.email || undefined,
      });
      addMyAptId(created.id);
    }

    return data;
  } catch {
    return createLocalAppointment(input);
  }
}

export async function assignDoctorToAppointment(
  id: string,
  doctorId: string,
  time?: string,
  meetingUrl?: string,
) {
  const doctor = DOCTORS.find((d) => d.id === doctorId);
  const doctorName = doctor ? `${doctor.name} — ${doctor.specialty}` : doctorId;

  // Save to separate override map — applied after every fetch, cannot be overwritten by server
  saveAssignOverride(id, { doctorId, doctorName, time });

  // Also update main appointments list for consistency
  const items = readAppointments();
  const next = items.map((item) =>
    item.id === id
      ? { ...item, doctor_id: doctorId, doctorId, doctorName, time: time ?? item.time }
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
        time,
        ...(meetingUrl ? { meeting_url: meetingUrl } : {}),
      }),
    });
    if (!res.ok) throw new Error("assign failed");
    return await res.json();
  } catch {
    return { item: next.find((item) => item.id === id) ?? null };
  }
}

export async function fetchAppointments(date?: string): Promise<{ items: Appointment[] }> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const query = params.toString();
  const url = query ? `${API_URL}/api/appointments?${query}` : `${API_URL}/api/appointments`;
  const localItems = fetchLocalAppointments(date).items;

  try {
    const res = await fetch(url, {
      headers: authHeaders(),
      credentials: "include",
    });

    if (!res.ok) throw new Error("fetch appointments failed");
    const data = normalizeAppointmentList(await res.json());
    // Apply overrides last — always wins over both server and merged local data
    return { items: applyAssignOverrides(mergeAppointments(data.items ?? [], localItems)) };
  } catch {
    return { items: applyAssignOverrides(localItems) };
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

export async function fetchMyAppointments(): Promise<{ items: Appointment[] }> {
  const user = readCurrentUser();
  try {
    const res = await fetch(`${API_URL}/api/appointments/my`, {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error();
    const data = normalizeAppointmentList(await res.json());
    // Merge server list with local so enriched fields (patient_email etc.) survive
    const localItems = readAppointments();
    return { items: applyAssignOverrides(mergeAppointments(data.items, localItems)) };
  } catch {
    const all = readAppointments();
    // Try strict email/id match first
    const byId = all.filter((a) => {
      const pid = a.patient_id || a.patientId || "";
      const pemail = (a.patient_email || a.patientEmail || "").toLowerCase();
      return (
        (user?.id && pid === user.id) ||
        (user?.email && pemail === user.email.toLowerCase())
      );
    });
    if (byId.length > 0) return { items: applyAssignOverrides(byId) };

    // Fall back to IDs recorded at booking time — avoids exposing admin-fetched records
    const myIds = readMyAptIds();
    if (myIds.size > 0) {
      const byMyIds = all.filter((a) => myIds.has(a.id));
      return { items: applyAssignOverrides(byMyIds) };
    }

    return { items: [] };
  }
}
