import type { MeasurementItem } from "./apiMeasurements";

export type MeasurementSource = "patient" | "doctor" | "aimar";
export type PatientMeasurementMetric = "temperature" | "pulse" | "pressure" | "spo2";

export type PatientMeasurementEntry = {
  id: string;
  eventId: string;
  patientId: string;
  metric: PatientMeasurementMetric;
  createdAt: string;
  source: MeasurementSource;
  actorName?: string | null;
  deviceId?: string | null;
  value: number;
  secondaryValue?: number | null;
};

type ExternalMeasurementPayload = {
  id: string;
  createdAt: string;
  deviceId?: string | null;
  tempC?: number | null;
  hr?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  spo2?: number | null;
};

const KEY = "healthassist_patient_measurement_history_v1";
export const PATIENT_MEASUREMENTS_UPDATED_EVENT = "healthassist:patient-measurements-updated";
const ALMATY_TIME_ZONE = "Asia/Almaty";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `measurement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNumber(value: unknown) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeMetric(value: unknown): PatientMeasurementMetric | null {
  return value === "temperature" || value === "pulse" || value === "pressure" || value === "spo2"
    ? value
    : null;
}

function normalizeSource(value: unknown): MeasurementSource {
  return value === "patient" || value === "doctor" || value === "aimar" ? value : "patient";
}

function normalizeEntry(input: unknown): PatientMeasurementEntry | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Record<string, unknown>;
  const id = String(item.id ?? "").trim();
  const eventId = String(item.eventId ?? "").trim();
  const patientId = String(item.patientId ?? "").trim();
  const metric = normalizeMetric(item.metric);
  const createdAt = String(item.createdAt ?? "").trim();
  const value = normalizeNumber(item.value);

  if (!id || !eventId || !patientId || !metric || !createdAt || value == null) {
    return null;
  }

  return {
    id,
    eventId,
    patientId,
    metric,
    createdAt,
    source: normalizeSource(item.source),
    actorName: item.actorName ? String(item.actorName) : null,
    deviceId: item.deviceId ? String(item.deviceId) : null,
    value,
    secondaryValue: normalizeNumber(item.secondaryValue),
  };
}

function readAll(): PatientMeasurementEntry[] {
  if (!canUseLocalStorage()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return parsed
      .map((item) => normalizeEntry(item))
      .filter((item): item is PatientMeasurementEntry => Boolean(item))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  } catch {
    return [];
  }
}

function writeAll(items: PatientMeasurementEntry[]) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(PATIENT_MEASUREMENTS_UPDATED_EVENT));
}

function upsertEntries(entries: PatientMeasurementEntry[]) {
  const map = new Map(readAll().map((item) => [item.id, item]));
  entries.forEach((entry) => map.set(entry.id, entry));
  writeAll(Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}

function buildEntry(
  patientId: string,
  eventId: string,
  metric: PatientMeasurementMetric,
  value: number | null,
  options: {
    createdAt: string;
    source: MeasurementSource;
    actorName?: string | null;
    deviceId?: string | null;
    secondaryValue?: number | null;
  },
) {
  if (value == null) return null;
  return {
    id: `${eventId}:${metric}`,
    eventId,
    patientId,
    metric,
    createdAt: options.createdAt,
    source: options.source,
    actorName: options.actorName || null,
    deviceId: options.deviceId || null,
    value,
    secondaryValue: options.secondaryValue ?? null,
  } satisfies PatientMeasurementEntry;
}

export function listPatientMeasurements(patientId: string) {
  return readAll()
    .filter((item) => item.patientId === patientId && (item.metric === "temperature" || item.metric === "pulse"))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function recordPatientVitals(input: {
  patientId: string;
  source: MeasurementSource;
  tempC?: number | null;
  hr?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
  spo2?: number | null;
  actorName?: string | null;
  deviceId?: string | null;
  createdAt?: string;
  eventId?: string;
}) {
  const patientId = String(input.patientId || "").trim();
  if (!patientId) return [];

  const createdAt = input.createdAt || new Date().toISOString();
  const eventId = input.eventId || `event-${createId()}`;
  const entries = [
    buildEntry(patientId, eventId, "temperature", normalizeNumber(input.tempC), {
      createdAt,
      source: input.source,
      actorName: input.actorName,
      deviceId: input.deviceId,
    }),
    buildEntry(patientId, eventId, "pulse", normalizeNumber(input.hr), {
      createdAt,
      source: input.source,
      actorName: input.actorName,
      deviceId: input.deviceId,
    }),
  ].filter((item): item is PatientMeasurementEntry => Boolean(item));

  if (entries.length === 0) return [];
  upsertEntries(entries);
  return entries;
}

export function syncApiMeasurementsToPatientHistory(patientId: string, items: MeasurementItem[]) {
  items.forEach((item) => {
    recordPatientVitals({
      patientId,
      source: "aimar",
      tempC: item.tempC,
      hr: item.hr,
      systolic: item.systolic,
      diastolic: item.diastolic,
      spo2: item.spo2,
      deviceId: item.deviceId,
      createdAt: item.createdAt,
      eventId: `api-${item.id}`,
    });
  });
}

export function syncExternalMeasurementsToPatientHistory(
  patientId: string,
  items: ExternalMeasurementPayload[],
  source: MeasurementSource = "aimar",
) {
  items.forEach((item) => {
    recordPatientVitals({
      patientId,
      source,
      tempC: item.tempC,
      hr: item.hr,
      systolic: item.systolic,
      diastolic: item.diastolic,
      spo2: item.spo2,
      deviceId: item.deviceId,
      createdAt: item.createdAt,
      eventId: `ext-${item.id}`,
    });
  });
}

export function measurementMetricLabel(metric: PatientMeasurementMetric, locale: "ru" | "kk" | "en") {
  if (metric === "temperature") return locale === "en" ? "Temperature" : "Температура";
  if (metric === "pulse") return locale === "en" ? "Pulse" : "Пульс";
  if (metric === "pressure") return locale === "en" ? "Pressure" : locale === "kk" ? "Қысым" : "Давление";
  return "SpO₂";
}

export function measurementSourceLabel(source: MeasurementSource, locale: "ru" | "kk" | "en") {
  if (source === "doctor") return locale === "en" ? "Doctor" : locale === "kk" ? "Дәрігер" : "Врач";
  if (source === "aimar") return "AIMAR";
  return locale === "en" ? "Patient" : locale === "kk" ? "Науқас" : "Пациент";
}

export function formatMeasurementValue(entry: PatientMeasurementEntry, locale: "ru" | "kk" | "en") {
  if (entry.metric === "temperature") {
    return `${entry.value.toFixed(1)} °C`;
  }
  if (entry.metric === "pulse") {
    return locale === "en" ? `${Math.round(entry.value)} bpm` : `${Math.round(entry.value)} уд/мин`;
  }
  if (entry.metric === "pressure") {
    return `${Math.round(entry.value)}/${Math.round(entry.secondaryValue ?? 0)}`;
  }
  return `${Math.round(entry.value)}%`;
}

export function formatMeasurementDateTime(iso: string, locale: "ru" | "kk" | "en") {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale === "kk" ? "kk-KZ" : "ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: ALMATY_TIME_ZONE,
    })
      .format(new Date(iso))
      .replace(",", " ·");
  } catch {
    return iso;
  }
}
