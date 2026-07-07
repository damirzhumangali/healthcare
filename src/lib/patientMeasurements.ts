import type { MeasurementItem } from "./apiMeasurements";

export type MeasurementSource = "patient" | "doctor" | "aimar";
export type PatientMeasurementMetric = "temperature" | "pulse";

export type PatientMeasurementEntry = {
  id: string;
  eventId: string;
  patientId: string;
  metric: PatientMeasurementMetric;
  createdAt: string;
  source: MeasurementSource;
  actorName: string | null;
  deviceId: string | null;
  value: number;
  secondaryValue: number | null;
};

type ExternalMeasurementPayload = {
  id: string;
  createdAt: string;
  deviceId?: string | null;
  tempC?: number | null;
  hr?: number | null;
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
  return value === "temperature" || value === "pulse" ? value : null;
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
    const next = parsed
      .map((item) => normalizeEntry(item))
      .filter((item): item is PatientMeasurementEntry => Boolean(item))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (next.length !== parsed.length) {
      localStorage.setItem(KEY, JSON.stringify(next));
    }
    return next;
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
): PatientMeasurementEntry | null {
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

function buildVitalsEntries(
  patientId: string,
  eventId: string,
  source: MeasurementSource,
  values: {
    tempC?: number | null;
    hr?: number | null;
  },
  options: {
    createdAt: string;
    actorName?: string | null;
    deviceId?: string | null;
  },
) : PatientMeasurementEntry[] {
  const entries: PatientMeasurementEntry[] = [];

  const temperatureEntry = buildEntry(patientId, eventId, "temperature", normalizeNumber(values.tempC), {
      createdAt: options.createdAt,
      source,
      actorName: options.actorName,
      deviceId: options.deviceId,
    });
  if (temperatureEntry) {
    entries.push(temperatureEntry);
  }

  const pulseEntry = buildEntry(patientId, eventId, "pulse", normalizeNumber(values.hr), {
      createdAt: options.createdAt,
      source,
      actorName: options.actorName,
      deviceId: options.deviceId,
    });
  if (pulseEntry) {
    entries.push(pulseEntry);
  }

  return entries;
}

export function listPatientMeasurements(patientId: string) {
  return readAll()
    .filter((item) => item.patientId === patientId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function recordPatientVitals(input: {
  patientId: string;
  source: MeasurementSource;
  tempC?: number | null;
  hr?: number | null;
  actorName?: string | null;
  deviceId?: string | null;
  createdAt?: string;
  eventId?: string;
}) {
  const patientId = String(input.patientId || "").trim();
  if (!patientId) return [];

  const createdAt = input.createdAt || new Date().toISOString();
  const eventId = input.eventId || `event-${createId()}`;
  const entries = buildVitalsEntries(
    patientId,
    eventId,
    input.source,
    {
      tempC: input.tempC,
      hr: input.hr,
    },
    {
      createdAt,
      actorName: input.actorName,
      deviceId: input.deviceId,
    },
  );

  if (entries.length === 0) return [];
  upsertEntries(entries);
  return entries;
}

export function replaceApiMeasurementsForPatientHistory(patientId: string, items: MeasurementItem[]) {
  const normalizedPatientId = String(patientId || "").trim();
  if (!normalizedPatientId) return [];

  const apiEntries = items.flatMap((item): PatientMeasurementEntry[] => {
    const measurementOwner = String(item.userId ?? "").trim();
    if (measurementOwner && measurementOwner !== normalizedPatientId) {
      return [];
    }

    return buildVitalsEntries(
      normalizedPatientId,
      `api-${item.id}`,
      "aimar",
      {
        tempC: item.tempC,
        hr: item.hr,
      },
      {
        createdAt: item.createdAt,
        deviceId: item.deviceId,
      },
    );
  });

  const persisted = readAll().filter(
    (entry) => !(entry.patientId === normalizedPatientId && entry.eventId.startsWith("api-")),
  );

  writeAll(
    [...persisted, ...apiEntries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  );

  return listPatientMeasurements(normalizedPatientId);
}

export function syncApiMeasurementsToPatientHistory(patientId: string, items: MeasurementItem[]) {
  const normalizedPatientId = String(patientId || "").trim();
  if (!normalizedPatientId) return;

  items.forEach((item) => {
    const measurementOwner = String(item.userId ?? "").trim();
    if (measurementOwner && measurementOwner !== normalizedPatientId) {
      return;
    }

    recordPatientVitals({
      patientId: normalizedPatientId,
      source: "aimar",
      tempC: item.tempC,
      hr: item.hr,
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
      deviceId: item.deviceId,
      createdAt: item.createdAt,
      eventId: `ext-${item.id}`,
    });
  });
}

export function measurementMetricLabel(metric: PatientMeasurementMetric, locale: "ru" | "kk" | "en") {
  if (metric === "temperature") return locale === "en" ? "Temperature" : "Температура";
  return locale === "en" ? "Pulse" : "Пульс";
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
  return locale === "en" ? `${Math.round(entry.value)} bpm` : `${Math.round(entry.value)} уд/мин`;
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
