import { API_URL } from "./apiAuth";
import { getToken } from "./auth";
import {
  DOCTORS,
  fetchDoctors,
  type Appointment,
  type DoctorOption,
} from "./apiAppointments";

export type AdminSummary = {
  appointmentsToday: number;
  appointmentsTotal: number;
  pending: number;
  active: number;
  done: number;
  doctors: number;
  patients: number;
};

export type AdminPatient = {
  id: string;
  email?: string | null;
  name: string;
  picture?: string | null;
  role?: string;
  created_at?: string;
  last_appointment_at?: string | null;
  appointment_count: number;
};

const LOCAL_DOCTORS_KEY = "healthassist_doctors_v1";
const LOCAL_APPOINTMENTS_KEY = "healthassist_appointments_v1";

function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function readLocalDoctors(): DoctorOption[] {
  try {
    const raw = localStorage.getItem(LOCAL_DOCTORS_KEY);
    const parsed = raw ? (JSON.parse(raw) as DoctorOption[]) : [];
    return parsed.length > 0 ? parsed : DOCTORS.map((doctor) => ({ ...doctor, active: true }));
  } catch {
    return DOCTORS.map((doctor) => ({ ...doctor, active: true }));
  }
}

function writeLocalDoctors(items: DoctorOption[]) {
  localStorage.setItem(LOCAL_DOCTORS_KEY, JSON.stringify(items));
}

function readLocalAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(LOCAL_APPOINTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Appointment[]) : [];
  } catch {
    return [];
  }
}

function localSummary(): AdminSummary {
  const today = new Date().toISOString().slice(0, 10);
  const appointments = readLocalAppointments();
  const doctors = readLocalDoctors();
  const patients = new Set(appointments.map((item) => item.patient_id || item.patientId || item.patientEmail));

  return {
    appointmentsToday: appointments.filter((item) => item.date === today).length,
    appointmentsTotal: appointments.length,
    pending: appointments.filter((item) => item.status === "pending").length,
    active: appointments.filter((item) => item.status === "active").length,
    done: appointments.filter((item) => item.status === "done").length,
    doctors: doctors.filter((doctor) => doctor.active !== false).length,
    patients: patients.size,
  };
}

function localPatients(): AdminPatient[] {
  const grouped = new Map<string, AdminPatient>();

  for (const item of readLocalAppointments()) {
    const id = item.patient_id || item.patientId || item.patientEmail || "local-patient";
    const existing = grouped.get(id);
    const name =
      item.patientName ||
      item.patient_email ||
      item.patientEmail ||
      `Пациент ${String(id).slice(-4)}`;

    grouped.set(id, {
      id,
      email: item.patient_email || item.patientEmail || null,
      name,
      role: "patient",
      last_appointment_at: item.created_at || item.createdAt || null,
      appointment_count: (existing?.appointment_count || 0) + 1,
    });
  }

  return [...grouped.values()];
}

export async function fetchAdminSummary(): Promise<AdminSummary> {
  try {
    const res = await fetch(`${API_URL}/api/admin/summary`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("fetch admin summary failed");
    const data = await res.json();
    return data.summary ?? localSummary();
  } catch {
    return localSummary();
  }
}

export async function fetchAdminPatients(): Promise<{ items: AdminPatient[] }> {
  try {
    const res = await fetch(`${API_URL}/api/admin/patients`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("fetch admin patients failed");
    const data = await res.json();
    return { items: data.items ?? data.patients ?? [] };
  } catch {
    return { items: localPatients() };
  }
}

export async function fetchAdminDoctors(): Promise<{ items: DoctorOption[] }> {
  try {
    return await fetchDoctors(true);
  } catch {
    return { items: readLocalDoctors() };
  }
}

export async function createDoctor(input: {
  email?: string;
  name: string;
  specialty: string;
  active: boolean;
}): Promise<{ item: DoctorOption }> {
  try {
    const res = await fetch(`${API_URL}/api/doctors`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("create doctor failed");
    const data = await res.json();
    return { item: data.item ?? data.doctor };
  } catch {
    const doctor: DoctorOption = {
      id: crypto.randomUUID(),
      email: input.email || null,
      name: input.name,
      specialty: input.specialty,
      active: input.active,
    };
    const doctors = readLocalDoctors();
    doctors.push(doctor);
    writeLocalDoctors(doctors);
    return { item: doctor };
  }
}

export async function updateDoctor(
  id: string,
  input: Partial<Pick<DoctorOption, "email" | "name" | "specialty" | "active">>
): Promise<{ item: DoctorOption | null }> {
  try {
    const res = await fetch(`${API_URL}/api/doctors/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("update doctor failed");
    const data = await res.json();
    return { item: data.item ?? data.doctor };
  } catch {
    const doctors = readLocalDoctors();
    const next = doctors.map((doctor) => (doctor.id === id ? { ...doctor, ...input } : doctor));
    writeLocalDoctors(next);
    return { item: next.find((doctor) => doctor.id === id) ?? null };
  }
}
