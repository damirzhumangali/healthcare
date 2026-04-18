import { createContext, useContext } from "react";

export type Locale = "ru" | "kk" | "en";
export type AppTheme = "dark" | "light";

export type AppPreferences = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: AppTheme;
  toggleTheme: () => void;
};

const AppPreferencesContext = createContext<AppPreferences | null>(null);

export const AppPreferencesProvider = AppPreferencesContext.Provider;

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  }
  return context;
}
