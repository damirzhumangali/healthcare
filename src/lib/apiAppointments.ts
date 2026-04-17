import { API_URL } from "./apiAuth";
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
  status: AppointmentStatus;
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
  { id: "doctor-001", name: "Др. Айжан Нурбекова", specialty: "Терапевт" },
  { id: "doctor-002", name: "Др. Ерлан Садыков", specialty: "Кардиолог" },
  { id: "doctor-003", name: "Др. Мария Ким", specialty: "Невролог" },
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

function readCurrentUser() {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as { id?: string; email?: string; name?: string }) : null;
  } catch {
    return null;
  }
}

function createLocalAppointment(input: {
  doctorId: string;
  date: string;
  time: string;
  reason: string;
}) {
  const user = readCurrentUser();
  const doctor = DOCTORS.find((item) => item.id === input.doctorId);
  const appointment: Appointment = {
    id: crypto.randomUUID(),
    patient_id: user?.id || user?.email || "local-patient",
    patient_email: user?.email,
    patientName: user?.name || user?.email || "Пациент",
    doctor_id: input.doctorId,
    doctorName: doctor ? `${doctor.name} - ${doctor.specialty}` : input.doctorId,
    date: input.date,
    time: input.time,
    reason: input.reason,
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
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
    });
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
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
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
    });

    if (!res.ok) throw new Error("fetch doctors failed");
    const data = normalizeDoctors(await res.json());
    return { items: data.items.length > 0 ? data.items : DOCTORS };
  } catch {
    return { items: includeInactive ? DOCTORS.map((doctor) => ({ ...doctor, active: true })) : DOCTORS };
  }
}

export async function createAppointment(input: {
  doctorId: string;
  date: string;
  time: string;
  reason: string;
}) {
  try {
    const res = await fetch(`${API_URL}/api/appointments`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        ...input,
        doctor_id: input.doctorId,
      }),
    });

    if (!res.ok) throw new Error("create appointment failed");
    return res.json();
  } catch {
    return createLocalAppointment(input);
  }
}

export async function fetchAppointments(date?: string): Promise<{ items: Appointment[] }> {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const query = params.toString();
  const url = query ? `${API_URL}/api/appointments?${query}` : `${API_URL}/api/appointments`;

  try {
    const res = await fetch(url, {
      headers: authHeaders(),
    });

    if (!res.ok) throw new Error("fetch appointments failed");
    return normalizeAppointmentList(await res.json());
  } catch {
    return fetchLocalAppointments(date);
  }
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus) {
  try {
    const res = await fetch(`${API_URL}/api/appointments/${id}/status`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!res.ok) throw new Error("update appointment status failed");
    return res.json();
  } catch {
    return updateLocalAppointmentStatus(id, status);
  }
}
