import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun } from "lucide-react";
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
    logoutShort: "Выйти",
    lightTheme: "Включить светлый режим",
    darkTheme: "Включить ночной режим",
    telegramSupport: "Открыть Telegram-бот",
  },
  kk: {
    account: "Аккаунт:",
    patientArea: "Пациент кабинеті",
    logout: "Шығу",
    logoutShort: "Шығу",
    lightTheme: "Жарық режимді қосу",
    darkTheme: "Түнгі режимді қосу",
    telegramSupport: "Telegram-ботты ашу",
  },
  en: {
    account: "Account:",
    patientArea: "Patient Dashboard",
    logout: "Sign out",
    logoutShort: "Sign out",
    lightTheme: "Switch to light mode",
    darkTheme: "Switch to dark mode",
    telegramSupport: "Open Telegram bot",
  },
} as const;

function TelegramIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M21.2 4.2L18 19.2C17.76 20.26 17.12 20.52 16.22 20.02L11.36 16.44L9.02 18.7C8.76 18.96 8.54 19.18 8.04 19.18L8.38 14.22L17.4 6.08C17.8 5.72 17.32 5.52 16.8 5.86L5.66 12.88L0.86 11.38C-0.18 11.06 -0.2 10.34 1.08 9.84L19.88 2.58C20.76 2.26 21.52 2.8 21.2 4.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
          <div className="brand__meta hidden sm:block xl:block">
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

        <div className="actions app-topbar__toolbar hidden xl:flex">
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
                {item === "kk" ? "KZ" : item.toUpperCase()}
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

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-hidden xl:hidden">
          <div
            className={`flex h-8 w-[96px] shrink-0 rounded-full border overflow-hidden md:h-9 md:w-[118px] ${
              theme === "dark" ? "border-white/20" : "border-slate-300"
            }`}
          >
            {(["ru", "kk", "en"] as Locale[]).map((item) => (
              <button
                key={item}
                onClick={() => setLocale(item)}
                className={`flex-1 min-w-0 px-0.5 py-1 text-[10px] font-medium md:text-xs ${
                  locale === item
                    ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                    : ""
                }`}
              >
                {item === "kk" ? "KZ" : item.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              nav("/login");
            }}
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
              theme === "dark" ? "border-white/20" : "border-slate-300"
            } md:h-9 md:w-auto md:min-w-[84px] md:px-3 md:text-xs`}
            aria-label={t.logoutShort}
            title={t.logoutShort}
          >
            <LogOut className="h-3.5 w-3.5 md:mr-1.5 md:h-4 md:w-4" />
            <span className="hidden md:inline">{t.logoutShort}</span>
          </button>

          <button
            type="button"
            onClick={preferences.toggleTheme}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border md:h-9 md:w-9 ${
              theme === "dark" ? "border-white/20" : "border-slate-300"
            }`}
            aria-label={theme === "dark" ? t.lightTheme : t.darkTheme}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Moon className="h-3.5 w-3.5 md:h-4 md:w-4" />}
          </button>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
      <a
        href="https://t.me/telehealth_assist_bot"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-4 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#27A7E7] text-white shadow-[0_16px_40px_rgba(39,167,231,0.34)] transition-transform hover:scale-105 md:bottom-6 md:right-6"
        aria-label={t.telegramSupport}
        title={t.telegramSupport}
      >
        <TelegramIcon className="h-5 w-5" />
      </a>
      </div>
    </AppPreferencesProvider>
  );
}
