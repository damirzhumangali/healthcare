export type AppLocale = "ru" | "kk" | "en";

export const APP_LOCALES: AppLocale[] = ["ru", "kk", "en"];

export const LOCALE_STORAGE_KEY = "healthassist_locale";
export const LEGACY_LOCALE_STORAGE_KEY = "ha_locale";
export const LOCALE_UPDATED_EVENT = "healthassist:locale-updated";

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
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlLang = normalizeLocale(params.get("lang"));
      if (urlLang) {
        localStorage.setItem(LOCALE_STORAGE_KEY, urlLang);
        localStorage.setItem(LEGACY_LOCALE_STORAGE_KEY, urlLang);
        return urlLang;
      }
    } catch {
      // Ignore URL parsing or storage errors.
    }
  }

  try {
    const stored = normalizeLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) return stored;

    const legacyStored = normalizeLocale(localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY));
    if (legacyStored) return legacyStored;
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
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    localStorage.setItem(LEGACY_LOCALE_STORAGE_KEY, locale);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LOCALE_UPDATED_EVENT, { detail: locale }));
    }
  } catch {
    // Ignore storage errors to avoid blocking the UI.
  }
}
