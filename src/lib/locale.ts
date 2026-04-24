export type AppLocale = "ru" | "kk" | "en";

export const APP_LOCALES: AppLocale[] = ["ru", "kk", "en"];

const STORAGE_KEY = "healthassist_locale";

function normalizeLocale(value: string | null | undefined): AppLocale | null {
  if (!value) return null;

  const normalized = value.toLowerCase();

  if (normalized === "ru" || normalized.startsWith("ru")) return "ru";
  if (normalized === "kk" || normalized === "kz" || normalized.startsWith("kk") || normalized.startsWith("kz")) {
    return "kk";
  }
  if (normalized === "en" || normalized.startsWith("en")) return "en";

  return null;
}

export function readStoredLocale(): AppLocale {
  try {
    const stored = normalizeLocale(localStorage.getItem(STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Ignore storage errors and fall back to browser language.
  }

  if (typeof navigator !== "undefined") {
    const browserLocale = normalizeLocale(navigator.language);
    if (browserLocale) return browserLocale;
  }

  return "ru";
}

export function writeStoredLocale(locale: AppLocale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore storage errors to avoid blocking the UI.
  }
}
