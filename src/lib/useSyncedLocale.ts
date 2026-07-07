import { useCallback, useEffect, useState } from "react";
import {
  LEGACY_LOCALE_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  LOCALE_UPDATED_EVENT,
  readStoredLocale,
  writeStoredLocale,
  type AppLocale,
} from "./locale";

export function useSyncedLocale() {
  const [locale, setLocaleState] = useState<AppLocale>(() => readStoredLocale());

  const setLocale = useCallback((nextLocale: AppLocale) => {
    writeStoredLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    const syncLocale = () => setLocaleState(readStoredLocale());
    const handleStorage = (event: StorageEvent) => {
      if (
        !event.key ||
        event.key === LOCALE_STORAGE_KEY ||
        event.key === LEGACY_LOCALE_STORAGE_KEY
      ) {
        syncLocale();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LOCALE_UPDATED_EVENT, syncLocale as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LOCALE_UPDATED_EVENT, syncLocale as EventListener);
    };
  }, []);

  return [locale, setLocale] as const;
}
