export type MeasurementType = "BP" | "TEMP" | "HR" | "SPO2";

export type Measurement = {
  id: string;
  userId: string;
  createdAt: string; // ISO
  systolic?: number;
  diastolic?: number;
  tempC?: number;
  hr?: number;
  spo2?: number;
  note?: string;
};

const KEY = "healthassist_measurements_v1";

function loadAll(): Measurement[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Measurement[]) : [];
  } catch {
    return [];
  }
}

function saveAll(items: Measurement[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function getCurrentUserId(): string | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u?.id ?? null;
  } catch {
    return null;
  }
}

export function listMyMeasurements(): Measurement[] {
  const uid = getCurrentUserId();
  if (!uid) return [];
  return loadAll()
    .filter((m) => m.userId === uid)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function addDemoMeasurement(): Measurement | null {
  const uid = getCurrentUserId();
  if (!uid) return null;

  const now = new Date();
  const id = crypto.randomUUID();

  const m: Measurement = {
    id,
    userId: uid,
    createdAt: now.toISOString(),
    systolic: 110 + Math.floor(Math.random() * 25),
    diastolic: 70 + Math.floor(Math.random() * 15),
    tempC: Math.round((36.2 + Math.random() * 1.6) * 10) / 10,
    hr: 60 + Math.floor(Math.random() * 35),
    spo2: 95 + Math.floor(Math.random() * 5),
    note: "Демо-измерение",
  };

  const all = loadAll();
  all.push(m);
  saveAll(all);
  return m;
}

export function getMeasurementById(id: string): Measurement | null {
  return loadAll().find((m) => m.id === id) ?? null;
}
