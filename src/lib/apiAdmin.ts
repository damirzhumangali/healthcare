import { API_URL } from "./apiBase";
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
  telegramNew?: number;
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

export type TelegramConsultationStatus = "new" | "reviewed";

export type AdminTelegramConsultation = {
  id: string;
  chat_id: string;
  telegram_username?: string | null;
  telegram_first_name?: string | null;
  telegram_last_name?: string | null;
  patient_name: string;
  problem: string;
  days?: string | null;
  temperature?: string | null;
  status: TelegramConsultationStatus;
  wants_consultation?: number | boolean | null;
  requested_at?: string | null;
  meeting_url?: string | null;
  meeting_at?: string | null;
  created_at: string;
  updated_at?: string;
};

const LOCAL_DOCTORS_KEY = "healthassist_doctors_v1";
const LOCAL_APPOINTMENTS_KEY = "healthassist_appointments_v1";

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
      item.patient_name ||
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
      credentials: "include",
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
      credentials: "include",
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

export async function fetchAdminTelegramConsultations(): Promise<{
  items: AdminTelegramConsultation[];
}> {
  try {
    const res = await fetch(`${API_URL}/api/admin/telegram-consultations`, {
      headers: authHeaders(),
      credentials: "include",
    });
    if (!res.ok) throw new Error("fetch telegram consultations failed");
    const data = await res.json();
    return { items: data.items ?? data.consultations ?? [] };
  } catch {
    return { items: [] };
  }
}

export async function updateAdminTelegramConsultationStatus(
  id: string,
  status: TelegramConsultationStatus
): Promise<{ item: AdminTelegramConsultation | null }> {
  const res = await fetch(`${API_URL}/api/admin/telegram-consultations/${id}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify({ status }),
  });

  if (!res.ok) throw new Error("update telegram consultation status failed");
  const data = await res.json();
  return { item: data.item ?? data.consultation ?? null };
}

export async function acceptAdminTelegramConsultation(
  id: string,
  meetingAtIso: string
): Promise<{ item: AdminTelegramConsultation | null; notified: boolean; notify_error: string | null }> {
  const res = await fetch(`${API_URL}/api/admin/telegram-consultations/${id}/accept`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify({ meeting_at: meetingAtIso }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`accept telegram consultation failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  return {
    item: data.item ?? data.consultation ?? null,
    notified: Boolean(data.notified),
    notify_error: data.notify_error ?? null,
  };
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
      credentials: "include",
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
      credentials: "include",
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

export type ServoDeviceState = {
  isOpen: boolean;
  angle: number;
  updatedAt: string;
};

export async function fetchServoState(): Promise<Record<string, ServoDeviceState>> {
  const res = await fetch(`${API_URL}/api/servo-control/state`, {
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("fetch servo state failed");
  const data = await res.json();
  return data.states ?? {};
}

export async function sendServoCommand(deviceId: string, command: "open" | "close"): Promise<void> {
  const res = await fetch(`${API_URL}/api/servo-control/command`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ deviceId, command }),
  });
  if (!res.ok) throw new Error("send servo command failed");
}
