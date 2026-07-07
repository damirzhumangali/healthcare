import { API_URL } from "./apiBase";
import { getCurrentUser, getToken } from "./auth";

export type MeasurementItem = {
  id: string;
  userId?: string | null;
  createdAt: string;
  deviceId: string;
  systolic: number;
  diastolic: number;
  tempC: number;
  hr: number;
  spo2: number;
};

const MEASUREMENTS_CACHE_KEY_PREFIX = "healthassist_measurements_cache_v2:";

function resolveMeasurementsCacheKey(userId?: string | null) {
  const normalizedUserId = String(userId ?? getCurrentUser()?.id ?? "").trim();
  return normalizedUserId ? `${MEASUREMENTS_CACHE_KEY_PREFIX}${normalizedUserId}` : null;
}

function normalizeMeasurement(input: any): MeasurementItem | null {
  if (!input || typeof input !== "object") return null;
  const id = String(input.id ?? "").trim();
  if (!id) return null;

  return {
    id,
    userId: String(input.userId ?? input.user_id ?? "").trim() || null,
    createdAt: String(input.createdAt ?? input.created_at ?? new Date().toISOString()),
    deviceId: String(input.deviceId ?? input.device_id ?? "device-001"),
    systolic: Number(input.systolic ?? 0),
    diastolic: Number(input.diastolic ?? 0),
    tempC: Number(input.tempC ?? input.temp_c ?? 0),
    hr: Number(input.hr ?? 0),
    spo2: Number(input.spo2 ?? 0),
  };
}

function writeCachedMeasurements(items: MeasurementItem[], userId?: string | null) {
  const key = resolveMeasurementsCacheKey(userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // Ignore storage write failures so API flow keeps working.
  }
}

export function readCachedMeasurements(userId?: string | null): MeasurementItem[] {
  const key = resolveMeasurementsCacheKey(userId);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
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

export function getCachedMeasurementById(id: string, userId?: string | null) {
  return readCachedMeasurements(userId).find((item) => item.id === id) ?? null;
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
  const currentUserId = getCurrentUser()?.id ?? null;
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
    const ownerId = String(created.userId ?? currentUserId ?? "").trim();
    const cache = readCachedMeasurements(ownerId).filter((item) => item.id !== created.id);
    writeCachedMeasurements([created, ...cache], ownerId);
  }

  return data;
}

export async function fetchMyMeasurements(limit = 100) {
  const token = getToken();
  const currentUserId = getCurrentUser()?.id ?? null;
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const qs = limit > 0 ? `?limit=${encodeURIComponent(String(limit))}` : "";
  const res = await fetch(`${API_URL}/api/measurements/my${qs}`, {
    headers,
    credentials: "include",
  });
  if (!res.ok) throw new Error("fetch measurements failed");
  const data = await res.json();
  const items = normalizeMeasurementsEnvelope(data);
  writeCachedMeasurements(items, currentUserId);
  return { ...data, items };
}
