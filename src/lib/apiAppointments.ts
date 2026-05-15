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
  { id: "doctor-001", name: "Айжан Нурбекова", specialty: "Терапевт" },
  { id: "doctor-002", name: "Ерлан Садыков", specialty: "Кардиолог" },
  { id: "doctor-003", name: "Мария Ким", specialty: "Невролог" },
];

const LOCAL_APPOINTMENTS_KEY = "healthassist_appointments_v1";

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

  localItems.forEach((item) => {
    merged.set(appointmentKey(item), item);
  });

  serverItems.forEach((item) => {
    merged.set(appointmentKey(item), item);
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
    doctor_id: input.doctorId,
    doctorName: doctor ? `${doctor.name} - ${doctor.specialty}` : undefined,
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
  try {
    const res = await fetch(`${API_URL}/api/appointments`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({
        ...input,
        doctor_id: input.doctorId,
        specialty_request: input.specialtyRequest,
        wants_online: input.wantsOnline,
      }),
    });

    if (!res.ok) throw new Error("create appointment failed");
    const data = await res.json();
    const created = data.item ?? data.appointment ?? null;

    if (created) {
      persistAppointment(created);
    }

    return data;
  } catch {
    return createLocalAppointment(input);
  }
}

export async function assignDoctorToAppointment(id: string, doctorId: string) {
  try {
    const res = await fetch(`${API_URL}/api/appointments/${id}/assign`, {
      method: "PATCH",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({ doctor_id: doctorId }),
    });
    if (!res.ok) throw new Error("assign failed");
    const data = await res.json();
    const updated = data.item ?? data.appointment ?? null;
    if (updated) persistAppointment(updated);
    return data;
  } catch {
    const items = readAppointments();
    const doctor = DOCTORS.find((d) => d.id === doctorId);
    const next = items.map((item) =>
      item.id === id
        ? { ...item, doctor_id: doctorId, doctorName: doctor ? `${doctor.name} - ${doctor.specialty}` : doctorId }
        : item
    );
    writeAppointments(next);
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
    return { items: mergeAppointments(data.items ?? [], localItems) };
  } catch {
    return { items: localItems };
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
