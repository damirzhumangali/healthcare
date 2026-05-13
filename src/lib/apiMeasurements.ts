import { API_URL } from "./apiBase";
import { getToken } from "./auth";

export type MeasurementItem = {
  id: string;
  createdAt: string;
  deviceId: string;
  systolic: number;
  diastolic: number;
  tempC: number;
  hr: number;
  spo2: number;
};

const MEASUREMENTS_CACHE_KEY = "healthassist_measurements_cache_v1";

function normalizeMeasurement(input: any): MeasurementItem | null {
  if (!input || typeof input !== "object") return null;
  const id = String(input.id ?? "").trim();
  if (!id) return null;

  return {
    id,
    createdAt: String(input.createdAt ?? input.created_at ?? new Date().toISOString()),
    deviceId: String(input.deviceId ?? input.device_id ?? "device-001"),
    systolic: Number(input.systolic ?? 0),
    diastolic: Number(input.diastolic ?? 0),
    tempC: Number(input.tempC ?? input.temp_c ?? 0),
    hr: Number(input.hr ?? 0),
    spo2: Number(input.spo2 ?? 0),
  };
}

function writeCachedMeasurements(items: MeasurementItem[]) {
  try {
    localStorage.setItem(MEASUREMENTS_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage write failures so API flow keeps working.
  }
}

export function readCachedMeasurements(): MeasurementItem[] {
  try {
    const raw = localStorage.getItem(MEASUREMENTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return parsed
      .map((item) => normalizeMeasurement(item))
      .filter((item): item is MeasurementItem => Boolean(item))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

export function getCachedMeasurementById(id: string) {
  return readCachedMeasurements().find((item) => item.id === id) ?? null;
}

function normalizeMeasurementsEnvelope(data: any): MeasurementItem[] {
  const source = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.measurements)
      ? data.measurements
      : [];

  return source
    .map((item: unknown) => normalizeMeasurement(item))
    .filter((item: MeasurementItem | null): item is MeasurementItem => Boolean(item))
    .sort((a: MeasurementItem, b: MeasurementItem) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function createMeasurement(deviceId: string) {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/measurements`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) throw new Error("create measurement failed");
  const data = await res.json();
  const created = normalizeMeasurement(data?.item ?? data?.measurement ?? data);

  if (created) {
    const cache = readCachedMeasurements().filter((item) => item.id !== created.id);
    writeCachedMeasurements([created, ...cache]);
  }

  return data;
}

export async function fetchMyMeasurements() {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api/measurements/my`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) throw new Error("fetch measurements failed");
  const data = await res.json();
  const items = normalizeMeasurementsEnvelope(data);
  writeCachedMeasurements(items);
  return { ...data, items };
}
