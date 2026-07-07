import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { House, LogOut, Moon, Sun, User } from "lucide-react";
import AvatarCircle from "../components/AvatarCircle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ProfileAvatarDialog from "../components/ProfileAvatarDialog";
import Button from "../components/Button";
import { getCurrentUser, logout } from "../lib/authStore";
import { SESSION_USER_UPDATED_EVENT, type SessionUser } from "../lib/auth";
import { isAdminAccount } from "../lib/adminAccess";
import { resolveAvatarUrl } from "../lib/avatar";
import {
  AppPreferencesProvider,
  type AppTheme,
  type Locale,
} from "../lib/appPreferences";
import { type AppLocale } from "../lib/locale";
import { hasPatientFullName, normalizePatientFullName } from "../lib/patientName";
import { usePageSeo } from "../lib/seo";
import { useSyncedLocale } from "../lib/useSyncedLocale";

const copy = {
  ru: {
    account: "Аккаунт:",
    patientArea: "Кабинет пациента",
    home: "На главную",
    logout: "Выйти",
    logoutShort: "Выйти",
    lightTheme: "Включить светлый режим",
    darkTheme: "Включить ночной режим",
    telegramSupport: "Открыть Telegram-бот",
  },
  kk: {
    account: "Аккаунт:",
    patientArea: "Пациент кабинеті",
    home: "Басты бетке",
    logout: "Шығу",
    logoutShort: "Шығу",
    lightTheme: "Жарық режимді қосу",
    darkTheme: "Түнгі режимді қосу",
    telegramSupport: "Telegram-ботты ашу",
  },
  en: {
    account: "Account:",
    patientArea: "Patient Dashboard",
    home: "Home",
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
  const location = useLocation();
  const isPatientDashboard = location.pathname === "/app";
  const [user, setUser] = useState<SessionUser | null>(() => getCurrentUser());
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const [locale, setLocale] = useSyncedLocale();
  const [theme, setTheme] = useState<AppTheme>(() => {
    const value = window.localStorage.getItem("ha_theme");
    return value === "light" ? "light" : "dark";
  });

  useEffect(() => {
    window.localStorage.setItem("ha_theme", theme);
  }, [theme]);

  useEffect(() => {
    const syncUser = () => setUser(getCurrentUser());
    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
  }, []);

  const mobileProfileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (mobileProfileRef.current && !mobileProfileRef.current.contains(target)) {
        setMobileProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    setMobileProfileMenuOpen(false);
  }, [location.pathname]);

  const preferences = useMemo(
    () => ({
      locale,
      setLocale: setLocale as (locale: Locale) => void,
      theme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [locale, setLocale, theme, setTheme]
  );
  const t = copy[locale as Locale];
  const themeLogo = theme === "light" ? "/images/ha-logo-light.webp" : "/images/ha-logo-dark.webp";
  const userAvatar = resolveAvatarUrl(
    user ? { ...user, role: user.role || "patient" } : null,
    { patientFallback: true },
  );
  const resolvedUserName =
    normalizePatientFullName(user?.name, { requireFullName: user?.role === "patient" }) ||
    user?.name ||
    user?.email ||
    "Пациент";
  const requiresPatientName = user?.role === "patient" && !hasPatientFullName(user?.name);
  const seoTitle =
    location.pathname.includes("/measurements/")
      ? locale === "kk"
        ? "Өлшеу деректері — HealthAssist"
        : locale === "en"
          ? "Measurement details — HealthAssist"
          : "Детали измерения — HealthAssist"
      : locale === "kk"
        ? "Науқас кабинеті — HealthAssist"
        : locale === "en"
          ? "Patient dashboard — HealthAssist"
          : "Кабинет пациента — HealthAssist";
  const seoDescription =
    locale === "kk"
      ? "HealthAssist ішіндегі пациентке арналған жеке, индекстелмейтін аймақ."
      : locale === "en"
        ? "Private, non-indexed patient area inside HealthAssist."
        : "Приватная, неиндексируемая зона пациента внутри HealthAssist.";

  usePageSeo({
    title: seoTitle,
    description: seoDescription,
    path: location.pathname,
    locale,
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    if (requiresPatientName) {
      setProfileOpen(true);
    }
  }, [requiresPatientName]);

  if (isAdminAccount(user)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AppPreferencesProvider value={preferences}>
      <div className={`app-shell app-shell--${theme}`}>
      <header className="topbar">
        <div className="brand">
          <img src={themeLogo} alt="HealthAssist" className="brand__logo" />
          <div className="brand__meta">
            <div className="brand__title">HealthAssist</div>
          </div>
        </div>

        <div className="app-topbar__toolbar">
          <button
            type="button"
            className="app-topbar__account-chip"
            onClick={() => setProfileOpen(true)}
            aria-label={resolvedUserName}
            title={resolvedUserName}
          >
            <AvatarCircle
              name={resolvedUserName}
              src={userAvatar}
              size={34}
              className="brand__avatar"
              alt={resolvedUserName}
            />
            <span className="app-topbar__account-chip-copy">
              <strong>{resolvedUserName}</strong>
              <span>{user?.role === "patient" ? "Пациент" : t.patientArea}</span>
            </span>
          </button>

          <button
            type="button"
            className="theme-toggle"
            onClick={preferences.toggleTheme}
            aria-label={theme === "dark" ? t.lightTheme : t.darkTheme}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <LanguageSwitcher
            locale={locale as AppLocale}
            onChange={setLocale}
            variant="segmented"
            className="language-switcher--topbar"
          />

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

        <div className="app-topbar__mobile-controls">
          <div className="app-topbar__mobile-group" ref={mobileProfileRef}>
            <button
              type="button"
              className="app-topbar__mobile-profile"
              onClick={() => {
                setMobileProfileMenuOpen((current) => !current);
              }}
              aria-label={resolvedUserName}
              title={resolvedUserName}
            >
              <AvatarCircle
                name={resolvedUserName}
                src={userAvatar}
                size={38}
                className="brand__avatar"
                alt={resolvedUserName}
              />
              <span className="app-topbar__mobile-profile-copy">
                <strong>{resolvedUserName}</strong>
                <span>{user?.role === "patient" ? "Пациент" : t.patientArea}</span>
              </span>
            </button>
            {mobileProfileMenuOpen ? (
              <div className="app-topbar__popover app-topbar__popover--profile">
                <div className="app-topbar__popover-copy">
                  <strong>{resolvedUserName}</strong>
                  <span>{user?.role === "patient" ? "Пациент" : t.patientArea}</span>
                </div>
                <button
                  type="button"
                  className="app-topbar__popover-item"
                  onClick={() => {
                    setProfileOpen(true);
                    setMobileProfileMenuOpen(false);
                  }}
                >
                  <User size={15} />
                  Фото профиля
                </button>
              </div>
            ) : null}
          </div>

          <LanguageSwitcher
            locale={locale as AppLocale}
            onChange={setLocale}
            variant="segmented"
            ariaLabel="Язык интерфейса"
            title="Язык интерфейса"
          />

          <button
            type="button"
            className="app-topbar__home-btn"
            onClick={() => nav("/")}
            aria-label={t.home}
            title={t.home}
          >
            <House size={14} />
            <span className="app-topbar__home-label">{t.home}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              logout();
              nav("/login");
            }}
            className="app-topbar__icon-btn"
            aria-label={t.logoutShort}
            title={t.logoutShort}
          >
            <LogOut size={18} />
          </button>

          <button
            type="button"
            onClick={preferences.toggleTheme}
            className="app-topbar__icon-btn"
            aria-label={theme === "dark" ? t.lightTheme : t.darkTheme}
            title={theme === "dark" ? t.lightTheme : t.darkTheme}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className={`container app-shell__main${isPatientDashboard ? " app-shell__main--dashboard" : ""}`}>
        <Outlet />
      </main>

      <ProfileAvatarDialog
        open={profileOpen}
        user={user}
        showNameField={user?.role === "patient"}
        requireName={requiresPatientName}
        onClose={() => {
          if (!requiresPatientName) {
            setProfileOpen(false);
          }
        }}
        onSaved={(savedUser) => {
          setUser(savedUser);
          setProfileOpen(false);
        }}
      />
      </div>
    </AppPreferencesProvider>
  );
}
