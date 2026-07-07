import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  MonitorSmartphone,
  Settings,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AdminMobileNav from "../components/AdminMobileNav";
import AvatarCircle from "../components/AvatarCircle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ProfileAvatarDialog from "../components/ProfileAvatarDialog";
import {
  AdminApiError,
  buildRegistrationStatsFromPatients,
  fetchAdminPatients,
  fetchAdminRegistrationStats,
  type AdminRegistrationStats,
} from "../lib/apiAdmin";
import { isAdminAccount } from "../lib/adminAccess";
import { BMO_SETTINGS_URL } from "../lib/apiBase";
import {
  getCurrentUser,
  hasSession,
  logout,
  SESSION_USER_UPDATED_EVENT,
  type SessionUser,
} from "../lib/auth";
import { resolveAvatarUrl } from "../lib/avatar";
import { type AppLocale } from "../lib/locale";
import { countNewBedsideConsultations } from "../lib/onlineConsultations";
import { usePageSeo } from "../lib/seo";
import { useSyncedLocale } from "../lib/useSyncedLocale";

type Locale = AppLocale;
type ErrorState = "load" | "serverAuth" | null;

const pageText = {
  ru: {
    panelTitle: "Админ-панель",
    adminRole: "Администратор",
    title: "Аналитика",
    subtitle: "Регистрации и активность пациентов",
    loading: "Обновляем данные...",
    refresh: "Обновить",
    navDashboard: "Дашборд",
    navSchedule: "Расписание",
    navAppointments: "Записи",
    navPatients: "Пациенты",
    navDoctorSchedule: "График врачей",
    navWardConsults: "Палатные консультации",
    navAnalytics: "Аналитика",
    navAimar: "Настроить Aimar",
    navSettings: "Настроить BMO",
    total: "Всего",
    today: "Сегодня",
    last7: "За 7 дней",
    last30: "За 30 дней",
    totalHint: "пациентов зарегистрировано",
    todayHint: "новых регистраций",
    last7Hint: "за неделю",
    last30Hint: "за месяц",
    chartTitle: "Регистрации за 30 дней",
    chartSubtitle: "Новые пациенты по дням",
    chartEmpty: "За последние 30 дней регистраций не было.",
    registrationsLabel: "Регистрации",
    dayLabel: "Дата",
    countLabel: "Количество",
    accessDenied: "Нет доступа",
    accessDeniedText: "Раздел аналитики доступен только администраторам.",
    loadError: "Не удалось загрузить аналитику регистраций.",
    serverAuthError:
      "Сервер не подтвердил права admin. Войдите через Google с почтой администратора, добавленной в backend ADMIN_EMAILS.",
  },
  kk: {
    panelTitle: "Әкімші панелі",
    adminRole: "Әкімші",
    title: "Аналитика",
    subtitle: "Пациент тіркеулері мен белсенділігі",
    loading: "Деректер жаңартылуда...",
    refresh: "Жаңарту",
    navDashboard: "Басқару",
    navSchedule: "Кесте",
    navAppointments: "Жазылулар",
    navPatients: "Пациенттер",
    navDoctorSchedule: "Дәрігер кестесі",
    navWardConsults: "Палаталық кеңестер",
    navAnalytics: "Аналитика",
    navAimar: "Aimar баптау",
    navSettings: "BMO баптау",
    total: "Барлығы",
    today: "Бүгін",
    last7: "7 күн",
    last30: "30 күн",
    totalHint: "тіркелген пациент",
    todayHint: "жаңа тіркелім",
    last7Hint: "апта ішінде",
    last30Hint: "ай ішінде",
    chartTitle: "30 күндегі тіркелімдер",
    chartSubtitle: "Күн сайынғы жаңа пациенттер",
    chartEmpty: "Соңғы 30 күнде тіркелім болған жоқ.",
    registrationsLabel: "Тіркелімдер",
    dayLabel: "Күн",
    countLabel: "Саны",
    accessDenied: "Қол жеткізу жоқ",
    accessDeniedText: "Аналитика бөлімі тек әкімшілерге ашық.",
    loadError: "Тіркелу аналитикасын жүктеу мүмкін болмады.",
    serverAuthError:
      "Сервер admin құқығын растаған жоқ. Backend ADMIN_EMAILS ішінде тұрған әкімші поштасымен Google арқылы кіріңіз.",
  },
  en: {
    panelTitle: "Admin Panel",
    adminRole: "Administrator",
    title: "Analytics",
    subtitle: "Patient registrations and activity",
    loading: "Refreshing data...",
    refresh: "Refresh",
    navDashboard: "Dashboard",
    navSchedule: "Schedule",
    navAppointments: "Appointments",
    navPatients: "Patients",
    navDoctorSchedule: "Doctor schedule",
    navWardConsults: "Ward consultations",
    navAnalytics: "Analytics",
    navAimar: "Configure Aimar",
    navSettings: "Configure BMO",
    total: "Total",
    today: "Today",
    last7: "Last 7 days",
    last30: "Last 30 days",
    totalHint: "registered patients",
    todayHint: "new registrations",
    last7Hint: "this week",
    last30Hint: "this month",
    chartTitle: "Registrations over 30 days",
    chartSubtitle: "New patients by day",
    chartEmpty: "No registrations in the last 30 days.",
    registrationsLabel: "Registrations",
    dayLabel: "Date",
    countLabel: "Count",
    accessDenied: "Access denied",
    accessDeniedText: "Analytics are available to admins only.",
    loadError: "Could not load registration analytics.",
    serverAuthError:
      "The server did not confirm admin access. Sign in with a Google account that is listed in backend ADMIN_EMAILS.",
  },
} as const;

function formatChartDate(value: string, locale: Locale) {
  try {
    const [year, month, day] = value.split("-").map((part) => Number(part));
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(locale === "kk" ? "kk-KZ" : locale === "en" ? "en-GB" : "ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function AdminAnalyticsPage() {
  const [locale, setLocale] = useSyncedLocale();
  const t = pageText[locale];

  usePageSeo({
    title: `${t.title} — HealthAssist`,
    description: t.subtitle,
    path: "/admin/analytics",
    locale,
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const [currentUser, setCurrentUserState] = useState<SessionUser | null>(() => getCurrentUser());
  const [stats, setStats] = useState<AdminRegistrationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<ErrorState>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const [wardRequestCount, setWardRequestCount] = useState(0);

  useEffect(() => {
    const syncUser = () => setCurrentUserState(getCurrentUser());
    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncUser as EventListener);
    return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncUser as EventListener);
  }, []);

  useEffect(() => {
    const handleDocumentClick = () => setMobileProfileMenuOpen(false);
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      let nextStats: AdminRegistrationStats | null = null;
      try {
        nextStats = await fetchAdminRegistrationStats();
      } catch (error) {
        if (error instanceof AdminApiError && error.code === "forbidden") {
          throw error;
        }

        const { items } = await fetchAdminPatients();
        nextStats = buildRegistrationStatsFromPatients(items);
      }

      setStats(nextStats);

      try {
        setWardRequestCount(countNewBedsideConsultations());
      } catch {
        setWardRequestCount(0);
      }
    } catch (error) {
      if (error instanceof AdminApiError && error.code === "forbidden") {
        setErr("serverAuth");
      } else {
        setErr("load");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!hasSession()) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminAccount(currentUser)) {
    return <Navigate to="/admin" replace />;
  }

  const displayName = currentUser?.name || currentUser?.email || "Admin";
  const userAvatar = resolveAvatarUrl(currentUser);
  const metricCards = [
    { key: "total", label: t.total, value: stats?.total ?? 0, hint: t.totalHint },
    { key: "today", label: t.today, value: stats?.today ?? 0, hint: t.todayHint },
    { key: "last7", label: t.last7, value: stats?.last_7_days ?? 0, hint: t.last7Hint },
    { key: "last30", label: t.last30, value: stats?.last_30_days ?? 0, hint: t.last30Hint },
  ];

  const chartData = useMemo(
    () =>
      (stats?.by_day ?? []).map((item) => ({
        ...item,
        label: formatChartDate(item.date, locale),
      })),
    [locale, stats?.by_day],
  );

  return (
    <div className="doctor-admin">
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <strong>HealthAssist</strong>
          <span>{t.panelTitle}</span>
        </div>

        <nav className="doctor-admin__nav">
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin")}>
            <LayoutDashboard size={18} />
            {t.navDashboard}
          </button>
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin#schedule")}>
            <CalendarClock size={18} />
            {t.navSchedule}
          </button>
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin#appointments")}>
            <ClipboardList size={18} />
            {t.navAppointments}
          </button>
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin#patients")}>
            <Users size={18} />
            {t.navPatients}
          </button>
          <button className="doctor-admin__nav-item doctor-admin__nav-item--compact" type="button" onClick={() => nav("/admin/doctor-schedule")}>
            <LayoutGrid size={18} />
            {t.navDoctorSchedule}
          </button>
          <button className="doctor-admin__nav-item doctor-admin__nav-item--compact" type="button" onClick={() => nav("/admin/ward-consults")}>
            <MonitorSmartphone size={18} />
            <span className="doctor-admin__nav-item-copy">
              <span>{t.navWardConsults}</span>
              {wardRequestCount > 0 ? (
                <span className="doctor-admin__nav-item-badge">{wardRequestCount}</span>
              ) : null}
            </span>
          </button>
          <button className="doctor-admin__nav-item doctor-admin__nav-item--active" type="button" onClick={() => nav("/admin/analytics")}>
            <BarChart3 size={18} />
            {t.navAnalytics}
          </button>
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin/aimar")}>
            <Cpu size={18} />
            {t.navAimar}
          </button>
          {BMO_SETTINGS_URL ? (
            <a className="doctor-admin__nav-item" href={BMO_SETTINGS_URL} target="_blank" rel="noreferrer">
              <Settings size={18} />
              {t.navSettings}
            </a>
          ) : null}
        </nav>
      </aside>

      <main className="doctor-admin__main" id="analytics">
        <header className="doctor-admin__topbar">
          <div className="doctor-admin__topbar-copy">
            <div>
              <h1>{t.title}</h1>
              <p>{t.subtitle}</p>
            </div>
            {loading ? (
              <div className="doctor-admin__loading-pill" aria-live="polite">
                <LoaderCircle className="doctor-admin__spin" size={16} />
                {t.loading}
              </div>
            ) : null}
          </div>

          <div className="doctor-admin__profile">
            <LanguageSwitcher
              locale={locale}
              onChange={setLocale}
              variant="segmented"
              ariaLabel="Язык интерфейса"
              title="Язык интерфейса"
            />
            <button
              type="button"
              className="doctor-admin__identity doctor-admin__identity-trigger"
              onClick={() => setProfileOpen(true)}
            >
              <AvatarCircle
                name={displayName}
                src={userAvatar}
                size={64}
                className="doctor-admin__avatar"
                alt={displayName}
              />
              <div className="doctor-admin__doctor">
                <strong>{displayName}</strong>
                <span>{t.adminRole}</span>
              </div>
            </button>
          </div>

          <div className="doctor-admin__mobile-head-actions">
            <LanguageSwitcher
              locale={locale}
              onChange={setLocale}
              variant="segmented"
              ariaLabel="Язык интерфейса"
              title="Язык интерфейса"
            />
            <div className="doctor-admin__mobile-menu-group">
              <button
                type="button"
                className="doctor-admin__mobile-avatar-trigger"
                onClick={(event) => {
                  event.stopPropagation();
                  setMobileProfileMenuOpen((current) => !current);
                }}
                aria-label="Открыть меню профиля"
              >
                <AvatarCircle
                  name={displayName}
                  src={userAvatar}
                  size={38}
                  className="doctor-admin__avatar doctor-admin__avatar--small"
                  alt={displayName}
                />
              </button>
              {mobileProfileMenuOpen ? (
                <div
                  className="doctor-admin__mobile-popover doctor-admin__mobile-popover--profile"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="doctor-admin__mobile-popover-copy">
                    <strong>{displayName}</strong>
                    <span>{t.adminRole}</span>
                  </div>
                  <button
                    type="button"
                    className="doctor-admin__mobile-popover-item"
                    onClick={() => {
                      setMobileProfileMenuOpen(false);
                      nav("/admin/aimar");
                    }}
                  >
                    <Cpu size={14} />
                    {t.navAimar}
                  </button>
                  <button
                    type="button"
                    className="doctor-admin__mobile-popover-item"
                    onClick={() => {
                      setMobileProfileMenuOpen(false);
                      setProfileOpen(true);
                    }}
                  >
                    Фото профиля
                  </button>
                  <button
                    type="button"
                    className="doctor-admin__mobile-popover-item doctor-admin__mobile-popover-item--danger"
                    onClick={() => {
                      setMobileProfileMenuOpen(false);
                      logout();
                      nav("/login", { replace: true });
                    }}
                  >
                    <LogOut size={14} />
                    Выйти
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {err ? (
          <div className="doctor-admin__alert">
            {err === "serverAuth" ? t.serverAuthError : t.loadError}
          </div>
        ) : null}

        <section className="doctor-admin__metrics doctor-admin__metrics--admin">
          {metricCards.map((metric) => (
            <article className="doctor-admin__metric doctor-admin__metric--admin" key={metric.key}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small className="doctor-admin__green">{metric.hint}</small>
            </article>
          ))}
        </section>

        <section className="doctor-admin__panel admin-analytics__chart-panel">
          <div className="doctor-admin__panel-head">
            <div>
              <h2>{t.chartTitle}</h2>
              <p className="doctor-admin__panel-subtitle">{t.chartSubtitle}</p>
            </div>
            <button className="doctor-admin__refresh" type="button" onClick={load} disabled={loading}>
              {t.refresh}
            </button>
          </div>

          {chartData.length ? (
            <div className="admin-analytics__chart-wrap">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "rgba(255,255,255,0.62)", fontSize: 11, fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(34,211,238,0.08)" }}
                    contentStyle={{
                      background: "rgba(17,20,25,0.96)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      boxShadow: "0 18px 42px rgba(0,0,0,.32)",
                    }}
                    labelStyle={{ color: "#f4f4ef", fontWeight: 800 }}
                    formatter={(value: number) => [`${value}`, t.countLabel]}
                    labelFormatter={(label: string) => `${t.dayLabel}: ${label}`}
                  />
                  <Bar
                    dataKey="count"
                    name={t.registrationsLabel}
                    fill="url(#admin-analytics-gradient)"
                    radius={[10, 10, 4, 4]}
                    maxBarSize={24}
                  />
                  <defs>
                    <linearGradient id="admin-analytics-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#32c18d" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="doctor-admin__empty-simple">{t.chartEmpty}</div>
          )}
        </section>

        <AdminMobileNav activeItem="more" wardBadge={wardRequestCount} onDashboardClick={() => nav("/admin")} />

        <ProfileAvatarDialog
          open={profileOpen}
          user={currentUser}
          onClose={() => setProfileOpen(false)}
          onSaved={(nextUser) => {
            setCurrentUserState(nextUser);
            setProfileOpen(false);
          }}
        />
      </main>
    </div>
  );
}
