import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import Button from "../components/Button";
import { getCurrentUser, logout } from "../lib/authStore";
import { isAdminAccount } from "../lib/adminAccess";
import {
  AppPreferencesProvider,
  type AppTheme,
  type Locale,
} from "../lib/appPreferences";

const copy = {
  ru: {
    account: "Аккаунт:",
    patientArea: "Кабинет пациента",
    logout: "Выйти",
    lightTheme: "Включить светлый режим",
    darkTheme: "Включить ночной режим",
  },
  kk: {
    account: "Аккаунт:",
    patientArea: "Пациент кабинеті",
    logout: "Шығу",
    lightTheme: "Жарық режимді қосу",
    darkTheme: "Түнгі режимді қосу",
  },
  en: {
    account: "Account:",
    patientArea: "Patient Dashboard",
    logout: "Sign out",
    lightTheme: "Switch to light mode",
    darkTheme: "Switch to dark mode",
  },
} as const;

export default function AppLayout() {
  const nav = useNavigate();
  const user = getCurrentUser();
  const [locale, setLocale] = useState<Locale>(() => {
    const value = window.localStorage.getItem("ha_locale");
    return value === "kk" || value === "en" || value === "ru" ? value : "ru";
  });
  const [theme, setTheme] = useState<AppTheme>(() => {
    const value = window.localStorage.getItem("ha_theme");
    return value === "light" ? "light" : "dark";
  });

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  useEffect(() => {
    window.localStorage.setItem("ha_theme", theme);
  }, [theme]);

  const preferences = useMemo(
    () => ({
      locale,
      setLocale,
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [locale, setLocale, theme, setTheme]
  );
  const t = copy[locale];

  if (isAdminAccount(user)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AppPreferencesProvider value={preferences}>
      <div className={`app-shell app-shell--${theme}`}>
      <header className="topbar">
        <div className="brand">
          <img src="/icon-192.png" alt="HealthAssist" className="brand__logo" />
          <div className="brand__meta">
            <div className="brand__title">HealthAssist</div>
            <div className="brand__sub">
              {user ? (
                <>
                  <span>{t.account}</span>
                  <strong className="brand__account">{user.name || user.email}</strong>
                </>
              ) : (
                t.patientArea
              )}
            </div>
          </div>
        </div>

        <div className="actions app-topbar__toolbar">
          <button
            type="button"
            className="theme-toggle"
            onClick={preferences.toggleTheme}
            aria-label={theme === "dark" ? t.lightTheme : t.darkTheme}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="language-switcher language-switcher--topbar">
            {(["ru", "kk", "en"] as Locale[]).map((item) => (
              <button
                key={item}
                onClick={() => setLocale(item)}
                className={
                  locale === item
                    ? "language-switcher__item language-switcher__item--active"
                    : "language-switcher__item"
                }
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            className="app-topbar__logout"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            {t.logout}
          </Button>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
      </div>
    </AppPreferencesProvider>
  );
}
