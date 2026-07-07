const PATIENT_FALLBACK_RE = /^пациент(?:\s+\S+)?$/iu;
const PATIENT_NAME_CACHE_KEY = "healthassist_patient_name_cache_v1";

function normalizeSpaces(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isEmailLike(value: string) {
  return value.includes("@");
}

function extractNameParts(value: string | null | undefined) {
  const normalized = normalizeSpaces(value);
  if (!normalized || isEmailLike(normalized) || PATIENT_FALLBACK_RE.test(normalized)) {
    return [];
  }

  return normalized.match(/[\p{L}][\p{L}\p{M}'’.-]*/gu) || [];
}

function letterCount(value: string) {
  return (value.match(/\p{L}/gu) || []).length;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readPatientNameCache(): Record<string, string> {
  if (!canUseStorage()) return {};
  try {
    const raw = localStorage.getItem(PATIENT_NAME_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePatientNameCache(cache: Record<string, string>) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(PATIENT_NAME_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota issues.
  }
}

function normalizePatientSourceKey(value: string | null | undefined) {
  const normalized = normalizeSpaces(value);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

export function rememberPatientDisplayName(
  source: string | null | undefined,
  name: string | null | undefined,
) {
  const key = normalizePatientSourceKey(source);
  const normalized = normalizePatientFullName(name, { requireFullName: true });
  if (!key || !normalized) return normalized;

  const cache = readPatientNameCache();
  if (cache[key] === normalized) return normalized;
  cache[key] = normalized;
  writePatientNameCache(cache);
  return normalized;
}

export function getRememberedPatientDisplayName(source: string | null | undefined) {
  const key = normalizePatientSourceKey(source);
  if (!key) return null;
  const cached = readPatientNameCache()[key];
  return normalizePatientFullName(cached, { requireFullName: true });
}

export function shortPatientFallback(source: string | null | undefined, fallback = "Пациент") {
  const raw = normalizeSpaces(source);
  const digits = raw.replace(/\D/g, "");
  const tail = (digits || raw.replace(/[^a-zA-Z0-9]/g, "")).slice(-4);
  return tail ? `${fallback} ${tail}` : fallback;
}

export function normalizePatientFullName(
  value: string | null | undefined,
  options?: { requireFullName?: boolean },
) {
  const parts = extractNameParts(value);
  if (parts.length === 0) return null;
  if (options?.requireFullName && parts.length < 2) return null;

  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.slice(0, 4).join(" ") : null;
}

export function hasPatientFullName(value: string | null | undefined) {
  return Boolean(normalizePatientFullName(value, { requireFullName: true }));
}

export function resolvePatientDisplayName(input: {
  names?: Array<string | null | undefined>;
  source?: string | null | undefined;
  fallback?: string;
  requireFullName?: boolean;
}) {
  for (const candidate of input.names || []) {
    const normalized = normalizePatientFullName(candidate, {
      requireFullName: input.requireFullName ?? true,
    });
    if (normalized) {
      if (input.source) rememberPatientDisplayName(input.source, normalized);
      return normalized;
    }
  }

  const remembered = getRememberedPatientDisplayName(input.source);
  if (remembered) return remembered;

  return shortPatientFallback(input.source, input.fallback || "Пациент");
}

export function validatePatientFullName(value: string | null | undefined) {
  const normalized = normalizeSpaces(value);
  if (!normalized) {
    return "Введите имя и фамилию пациента.";
  }

  if (/\d/.test(normalized)) {
    return "Имя и фамилия не должны содержать цифры.";
  }

  const parts = extractNameParts(normalized);
  if (parts.length < 2) {
    return "Укажите имя и фамилию полностью.";
  }

  if (parts.some((part) => letterCount(part) < 2)) {
    return "В имени и фамилии должно быть минимум по 2 буквы.";
  }

  const compact = parts.join(" ");
  if (compact !== normalized) {
    return "Используйте только буквы, пробелы и дефис в имени и фамилии.";
  }

  return null;
}
