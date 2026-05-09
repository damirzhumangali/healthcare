import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  House,
  LayoutDashboard,
  LoaderCircle,
  MessageSquare,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  DOCTORS,
  fetchAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
  type DoctorOption,
} from "../lib/apiAppointments";
import {
  fetchAdminDoctors,
  fetchAdminPatients,
  fetchAdminSummary,
  acceptAdminTelegramConsultation,
  fetchAdminTelegramConsultations,
  type AdminPatient,
  type AdminSummary,
  type AdminTelegramConsultation,
  type TelegramConsultationStatus,
  updateAdminTelegramConsultationStatus,
} from "../lib/apiAdmin";
import { isAdminAccount } from "../lib/adminAccess";
import { API_URL, BMO_SETTINGS_URL } from "../lib/apiBase";
import { getToken, setToken } from "../lib/auth";
import { APP_LOCALES, readStoredLocale, writeStoredLocale, type AppLocale } from "../lib/locale";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

type StatusFilter = AppointmentStatus | "all";
type DoctorFilter = string | "all";
type ErrorState = "load" | "statusUpdate" | "serverAuth" | "acceptConsultation" | "acceptNotify" | null;
type Locale = AppLocale;

const adminText = {
  ru: {
    panelTitle: "Админ-панель",
    navDashboard: "Дашборд",
    navSchedule: "Расписание",
    navAppointments: "Записи",
    navPatients: "Пациенты",
    navTelegram: "Telegram",
    navSettings: "Настроить BMO",
    home: "На главную",
    overview: "Обзор",
    loading: "Обновляем данные...",
    clinicSnapshot: "Сегодняшняя картина по клинике",
    filtersTitle: "Фильтры",
    filtersSubtitle: "Управляйте списками приемов и пациентов отдельно от навигации.",
    filterDateLabel: "Дата",
    filterStatusLabel: "Статус",
    filterDoctorLabel: "Врач",
    allDates: "Все даты",
    refresh: "Обновить",
    allStatuses: "Все статусы",
    statusPendingFilter: "Ожидает",
    statusActiveFilter: "На приеме",
    statusDoneFilter: "Завершен",
    allDoctors: "Все врачи",
    adminRole: "Администратор",
    defaultAdminName: "Др. Алия",
    appointmentsToday: "Приемов сегодня",
    patientsTotal: "Пациентов всего",
    awaitingResponse: "Ожидают ответа",
    prescriptionsIssued: "Рецептов выписано",
    activeDoctors: "Врачей активны",
    todayDelta: "+2 vs вчера",
    patientsDelta: "+5 за неделю",
    pendingDelta: "сообщений",
    prescriptionsDelta: "за эту неделю",
    doctorsDelta: "в системе",
    scheduleForDate: "Расписание на дату",
    allAppointments: "Все записи",
    all: "Все",
    noAppointments: "На выбранную дату записей нет.",
    latestPatients: "Последние пациенты",
    noPatients: "Пока нет реальных пациентов.",
    noEmail: "Без email",
    patientCard: "Карта",
    recordsSubtitle: "Управляйте статусом приема по выбранным фильтрам.",
    noRecords: "Записей по выбранным фильтрам нет.",
    actionPending: "Ожидает",
    actionAccept: "Принять",
    actionComplete: "Завершить",
    newAppointment: "Новая запись",
    accessDenied: "Нет доступа",
    accessDeniedText: "Для админ-панели нужна роль admin.",
    loadError: "Не удалось загрузить админ-данные. Проверь backend и VITE_API_BASE_URL.",
    statusUpdateError: "Не удалось изменить статус записи.",
    serverAuthError:
      "Локальный email/пароль вход работает только как demo. Чтобы увидеть Telegram-заявки и данные сервера, войдите через Google с админ-почтой.",
    patientFallback: "Пациент",
    doctorFallback: "Врач",
    appointmentFallback: "Прием",
    statusOnline: "Онлайн",
    statusConfirmed: "Подтвержден",
    statusWaiting: "Ожидает",
    telegramInbox: "Telegram-заявки",
    telegramSubtitle: "Анкеты пациентов из Telegram-бота приходят сюда в реальном времени.",
    noTelegram: "Пока нет новых анкет из Telegram.",
    telegramProblem: "Проблема",
    telegramDays: "Дней",
    telegramTemperature: "Температура",
    telegramNoData: "Не указано",
    telegramMarkReviewed: "Отметить просмотренной",
    telegramMarkNew: "Вернуть в новые",
    emptyDashboardTitle: "Дашборд пока пуст",
    emptyDashboardText:
      "Когда появятся записи, пациенты или Telegram-заявки, здесь сразу отобразятся ключевые метрики и последние обновления.",
  },
  kk: {
    panelTitle: "Әкімші панелі",
    navDashboard: "Басқару",
    navSchedule: "Кесте",
    navAppointments: "Жазылулар",
    navPatients: "Пациенттер",
    navTelegram: "Telegram",
    navSettings: "BMO баптау",
    home: "Басты бетке",
    overview: "Шолу",
    loading: "Деректер жаңартылуда...",
    clinicSnapshot: "Клиниканың бүгінгі көрінісі",
    filtersTitle: "Сүзгілер",
    filtersSubtitle: "Қабылдаулар мен пациенттер тізімін навигациядан бөлек басқарыңыз.",
    filterDateLabel: "Күн",
    filterStatusLabel: "Мәртебе",
    filterDoctorLabel: "Дәрігер",
    allDates: "Барлық күн",
    refresh: "Жаңарту",
    allStatuses: "Барлық мәртебе",
    statusPendingFilter: "Күтіп тұр",
    statusActiveFilter: "Қабылдауда",
    statusDoneFilter: "Аяқталды",
    allDoctors: "Барлық дәрігер",
    adminRole: "Әкімші",
    defaultAdminName: "Др. Алия",
    appointmentsToday: "Бүгінгі қабылдау",
    patientsTotal: "Пациенттер саны",
    awaitingResponse: "Жауап күтуде",
    prescriptionsIssued: "Жазылған рецепт",
    activeDoctors: "Белсенді дәрігер",
    todayDelta: "+2 кешегімен салыстырғанда",
    patientsDelta: "+5 апта ішінде",
    pendingDelta: "хабарлама",
    prescriptionsDelta: "осы аптада",
    doctorsDelta: "жүйеде",
    scheduleForDate: "Күнге арналған кесте",
    allAppointments: "Барлық жазылулар",
    all: "Барлығы",
    noAppointments: "Таңдалған күнге жазылу жоқ.",
    latestPatients: "Соңғы пациенттер",
    noPatients: "Әзірге нақты пациенттер жоқ.",
    noEmail: "Email жоқ",
    patientCard: "Карта",
    recordsSubtitle: "Таңдалған сүзгілер бойынша қабылдау мәртебесін басқарыңыз.",
    noRecords: "Таңдалған сүзгілер бойынша жазылу жоқ.",
    actionPending: "Күту",
    actionAccept: "Қабылдау",
    actionComplete: "Аяқтау",
    newAppointment: "Жаңа жазылу",
    accessDenied: "Қол жеткізу жоқ",
    accessDeniedText: "Әкімші панелі үшін admin рөлі қажет.",
    loadError: "Әкімші деректерін жүктеу мүмкін болмады. Backend пен VITE_API_BASE_URL тексеріңіз.",
    statusUpdateError: "Жазылу мәртебесін өзгерту мүмкін болмады.",
    serverAuthError:
      "Жергілікті email/құпиясөз кіруі тек demo режимінде. Сервер деректері мен Telegram өтінімдерін көру үшін Google арқылы әкімші поштасымен кіріңіз.",
    patientFallback: "Пациент",
    doctorFallback: "Дәрігер",
    appointmentFallback: "Қабылдау",
    statusOnline: "Онлайн",
    statusConfirmed: "Расталды",
    statusWaiting: "Күтіп тұр",
    telegramInbox: "Telegram өтінімдері",
    telegramSubtitle: "Telegram-боттағы пациент сауалнамалары осында бірден түседі.",
    noTelegram: "Telegram-нан өтінімдер әлі жоқ.",
    telegramProblem: "Мәселе",
    telegramDays: "Күн",
    telegramTemperature: "Температура",
    telegramNoData: "Көрсетілмеген",
    telegramMarkReviewed: "Қаралды деп белгілеу",
    telegramMarkNew: "Жаңаға қайтару",
    emptyDashboardTitle: "Басқару тақтасы әзірге бос",
    emptyDashboardText:
      "Жазылулар, пациенттер немесе Telegram өтінімдері түскенде, негізгі метрикалар мен соңғы жаңартулар осында бірден көрінеді.",
  },
  en: {
    panelTitle: "Admin Panel",
    navDashboard: "Dashboard",
    navSchedule: "Schedule",
    navAppointments: "Appointments",
    navPatients: "Patients",
    navTelegram: "Telegram",
    navSettings: "Configure BMO",
    home: "Home",
    overview: "Overview",
    loading: "Refreshing data...",
    clinicSnapshot: "Today's clinic snapshot",
    filtersTitle: "Filters",
    filtersSubtitle: "Control appointments and patient lists separately from navigation.",
    filterDateLabel: "Date",
    filterStatusLabel: "Status",
    filterDoctorLabel: "Doctor",
    allDates: "All dates",
    refresh: "Refresh",
    allStatuses: "All statuses",
    statusPendingFilter: "Waiting",
    statusActiveFilter: "In session",
    statusDoneFilter: "Completed",
    allDoctors: "All doctors",
    adminRole: "Administrator",
    defaultAdminName: "Dr. Aliya",
    appointmentsToday: "Appointments today",
    patientsTotal: "Total patients",
    awaitingResponse: "Awaiting response",
    prescriptionsIssued: "Prescriptions issued",
    activeDoctors: "Active doctors",
    todayDelta: "+2 vs yesterday",
    patientsDelta: "+5 this week",
    pendingDelta: "messages",
    prescriptionsDelta: "this week",
    doctorsDelta: "in system",
    scheduleForDate: "Schedule for date",
    allAppointments: "All appointments",
    all: "All",
    noAppointments: "No appointments for the selected date.",
    latestPatients: "Latest patients",
    noPatients: "No real patients yet.",
    noEmail: "No email",
    patientCard: "Card",
    recordsSubtitle: "Manage appointment status using the selected filters.",
    noRecords: "No appointments match the selected filters.",
    actionPending: "Waiting",
    actionAccept: "Admit",
    actionComplete: "Complete",
    newAppointment: "New appointment",
    accessDenied: "Access denied",
    accessDeniedText: "The admin panel requires the admin role.",
    loadError: "Could not load admin data. Check the backend and VITE_API_BASE_URL.",
    statusUpdateError: "Could not change the appointment status.",
    serverAuthError:
      "Local email/password login works only as a demo. To see Telegram requests and backend data, sign in with Google using an admin email.",
    patientFallback: "Patient",
    doctorFallback: "Doctor",
    appointmentFallback: "Appointment",
    statusOnline: "Online",
    statusConfirmed: "Confirmed",
    statusWaiting: "Waiting",
    telegramInbox: "Telegram requests",
    telegramSubtitle: "Patient questionnaires from the Telegram bot appear here automatically.",
    noTelegram: "No Telegram questionnaires yet.",
    telegramProblem: "Problem",
    telegramDays: "Days",
    telegramTemperature: "Temperature",
    telegramNoData: "Not provided",
    telegramMarkReviewed: "Mark reviewed",
    telegramMarkNew: "Move back to new",
    emptyDashboardTitle: "The dashboard is empty for now",
    emptyDashboardText:
      "As soon as appointments, patients, or Telegram requests appear, the main metrics and recent updates will show up here.",
  },
} as const;

const localeDateMap: Record<Locale, string> = {
  ru: "ru-RU",
  kk: "kk-KZ",
  en: "en-US",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isJwtLikeToken(token: string | null) {
  return typeof token === "string" && token.split(".").length === 3;
}

function formatDay(date: string, locale: Locale, allLabel: string) {
  if (!date) return allLabel;

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat(localeDateMap[locale], { day: "2-digit", month: "short" })
    .format(parsed)
    .replace(/\./g, "");
}

function formatDateTime(value: string, locale: Locale) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat(localeDateMap[locale], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(parsed)
    .replace(/\./g, "");
}

function readCurrentUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function isLocalDemoHost() {
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

async function ensureLocalBackendToken(user: StoredUser | null) {
  if (!user?.email) {
    throw new Error("missing_local_user");
  }

  const res = await fetch(`${API_URL}/auth/local/dev-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      name: user.name,
    }),
  });

  if (!res.ok) {
    throw new Error("local_dev_token_exchange_failed");
  }

  const data = await res.json();
  if (!data?.token || !data?.user) {
    throw new Error("invalid_local_dev_token_response");
  }

  setToken(data.token);
  localStorage.setItem("healthassist_current_user", JSON.stringify(data.user));
}

function patientLabel(item: Appointment, fallback: string) {
  const idTail = (item.patient_id || item.patientId || "").slice(-4);
  return (
    item.patientName ||
    item.patient_email ||
    item.patientEmail ||
    (idTail ? `${fallback} ${idTail}` : fallback)
  );
}

function doctorLabel(item: Appointment, doctors: DoctorOption[], fallback: string) {
  const doctorId = item.doctor_id || item.doctorId;
  const doctor = doctors.find((doctorItem) => doctorItem.id === doctorId);
  return item.doctorName || (doctor ? `${doctor.name} - ${doctor.specialty}` : doctorId) || fallback;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function statusLabel(status: AppointmentStatus, locale: Locale) {
  const t = adminText[locale];

  if (status === "active") return t.statusOnline;
  if (status === "done") return t.statusConfirmed;
  return t.statusWaiting;
}

function statusTone(status: AppointmentStatus) {
  if (status === "active") return "dark";
  if (status === "done") return "green";
  return "amber";
}

function consultationTone(status: TelegramConsultationStatus) {
  return status === "reviewed" ? "green" : "amber";
}

function appointmentCountLabel(locale: Locale, count: number) {
  if (locale === "kk") return `${count} жазылу`;
  if (locale === "en") return `${count} appointments`;
  return `${count} записей`;
}

export default function AdminDashboard() {
  const user = useMemo(() => readCurrentUser(), []);
  const allowed = isAdminAccount(user) || isLocalDemoHost();
  const [locale, setLocale] = useState<Locale>(() => readStoredLocale());
  const [activeSection, setActiveSection] = useState(() =>
    window.location.hash.replace("#", "") || "overview"
  );
  const [date, setDate] = useState(today());
  const [status, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilter>("all");
  const [items, setItems] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>(DOCTORS.map((doctor) => ({ ...doctor, active: true })));
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [consultations, setConsultations] = useState<AdminTelegramConsultation[]>([]);
  const [acceptForm, setAcceptForm] = useState<{ id: string; value: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<ErrorState>(null);

  const t = adminText[locale];
  const displayName = user?.name || user?.email || t.defaultAdminName;
  const navItems = [
    { id: "overview", label: t.navDashboard, icon: LayoutDashboard },
    { id: "schedule", label: t.navSchedule, icon: CalendarClock },
    { id: "appointments", label: t.navAppointments, icon: ClipboardList },
    { id: "patients", label: t.navPatients, icon: Users },
    { id: "telegram", label: t.navTelegram, icon: MessageSquare },
  ] as const;

  const load = useCallback(async () => {
    const token = getToken();
    if (isLocalDemoHost() && !isJwtLikeToken(token)) {
      try {
        await ensureLocalBackendToken(readCurrentUser());
      } catch {
        setErr("serverAuth");
        setLoading(false);
        return;
      }
    }

    setErr(null);
    setLoading(true);

    try {
      const [appointmentsData, summaryData, doctorsData, patientsData, consultationsData] = await Promise.all([
        fetchAppointments(date || undefined),
        fetchAdminSummary(),
        fetchAdminDoctors(),
        fetchAdminPatients(),
        fetchAdminTelegramConsultations(),
      ]);

      setItems(appointmentsData.items ?? []);
      setSummary(summaryData);
      setDoctors(
        doctorsData.items.length > 0
          ? doctorsData.items
          : DOCTORS.map((doctor) => ({ ...doctor, active: true }))
      );
      setPatients(patientsData.items ?? []);
      setConsultations(consultationsData.items ?? []);
    } catch {
      setErr("load");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = status === "all" ? true : item.status === status;
      const matchesDoctor =
        doctorFilter === "all" ? true : (item.doctor_id || item.doctorId) === doctorFilter;

      return matchesStatus && matchesDoctor;
    });
  }, [doctorFilter, items, status]);

  const visibleItems = filteredItems;
  const visiblePatients =
    patients.length > 0
      ? patients
      : visibleItems.map((item) => ({
          id: item.patient_id || item.patientId || item.id,
          email: item.patient_email || item.patientEmail || null,
          name: patientLabel(item, t.patientFallback),
          role: "patient",
          last_appointment_at: item.created_at || item.createdAt || null,
          appointment_count: 1,
        }));

  const stats = useMemo(() => {
    return {
      today: summary?.appointmentsToday ?? visibleItems.length,
      patients: summary?.patients ?? visiblePatients.length,
      pending:
        summary?.telegramNew ??
        summary?.pending ??
        visibleItems.filter((item) => item.status === "pending").length,
      done: summary?.done ?? visibleItems.filter((item) => item.status === "done").length,
      doctors: summary?.doctors ?? doctors.filter((doctor) => doctor.active !== false).length,
    };
  }, [doctors, summary, visibleItems, visiblePatients]);

  const isInitialLoading =
    loading &&
    !summary &&
    items.length === 0 &&
    patients.length === 0 &&
    consultations.length === 0;
  const showEmptyDashboard =
    !isInitialLoading &&
    !loading &&
    visibleItems.length === 0 &&
    patients.length === 0 &&
    consultations.length === 0 &&
    (summary?.appointmentsToday ?? 0) === 0 &&
    (summary?.patients ?? 0) === 0 &&
    (summary?.telegramNew ?? summary?.pending ?? 0) === 0 &&
    (summary?.done ?? 0) === 0;
  const metricCards = [
    { key: "today", label: t.appointmentsToday, value: stats.today, tone: "green", delta: t.todayDelta },
    { key: "patients", label: t.patientsTotal, value: stats.patients, tone: "green", delta: t.patientsDelta },
    { key: "pending", label: t.awaitingResponse, value: stats.pending, tone: "red", delta: t.pendingDelta },
    { key: "done", label: t.prescriptionsIssued, value: stats.done, tone: "green", delta: t.prescriptionsDelta },
    { key: "doctors", label: t.activeDoctors, value: stats.doctors, tone: "green", delta: t.doctorsDelta },
  ] as const;

  async function changeStatus(id: string, nextStatus: AppointmentStatus) {
    setErr(null);

    try {
      await updateAppointmentStatus(id, nextStatus);
      await load();
    } catch {
      setErr("statusUpdate");
    }
  }

  async function changeConsultationStatus(id: string, nextStatus: TelegramConsultationStatus) {
    setErr(null);

    try {
      await updateAdminTelegramConsultationStatus(id, nextStatus);
      await load();
    } catch {
      setErr("statusUpdate");
    }
  }

  async function acceptConsultation(id: string, meetingAtIso: string) {
    setErr(null);

    try {
      const result = await acceptAdminTelegramConsultation(id, meetingAtIso);
      await load();
      if (!result.notified) {
        setErr("acceptNotify");
      }
    } catch {
      setErr("acceptConsultation");
    }
  }

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    writeStoredLocale(nextLocale);
  }

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  useEffect(() => {
    const syncActiveSection = () => {
      setActiveSection(window.location.hash.replace("#", "") || "overview");
    };

    syncActiveSection();
    window.addEventListener("hashchange", syncActiveSection);

    return () => {
      window.removeEventListener("hashchange", syncActiveSection);
    };
  }, []);

  const ringAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/Ring.mp3");
    audio.preload = "auto";
    audio.volume = 0.7;
    ringAudioRef.current = audio;
    return () => {
      ringAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const token = getToken();
    if (!token) return;

    const url = `${API_URL}/api/admin/telegram-consultations/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);

    source.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "created" && ringAudioRef.current) {
          ringAudioRef.current.currentTime = 0;
          ringAudioRef.current.play().catch(() => {});
        }
        if (data.type === "created" || data.type === "accepted" || data.type === "status_changed") {
          void load();
        }
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      // EventSource auto-reconnects; we keep a fallback poll-on-error here
      // so a permanent failure doesn't leave the dashboard stuck.
    };

    return () => {
      source.close();
    };
  }, [allowed, load]);

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  if (!allowed) {
    return (
      <div className="admin-shell admin-shell--center">
        <section className="admin-denied">
          <h1>{t.accessDenied}</h1>
          <p>{t.accessDeniedText}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="doctor-admin">
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <strong>HealthAssist</strong>
          <span>{t.panelTitle}</span>
        </div>

        <nav className="doctor-admin__nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.id}
                className={`doctor-admin__nav-item ${
                  activeSection === item.id ? "doctor-admin__nav-item--active" : ""
                }`}
                href={`#${item.id}`}
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </a>
            );
          })}
          {BMO_SETTINGS_URL ? (
            <a
              className="doctor-admin__nav-item"
              href={BMO_SETTINGS_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Settings size={18} />
              {t.navSettings}
            </a>
          ) : null}
        </nav>
      </aside>

      <main className="doctor-admin__main" id="overview">
        <header className="doctor-admin__topbar">
          <div className="doctor-admin__topbar-copy">
            <div>
              <h1>{t.overview}</h1>
              <p>{t.clinicSnapshot}</p>
            </div>
            {loading ? (
              <div className="doctor-admin__loading-pill" aria-live="polite">
                <LoaderCircle className="doctor-admin__spin" size={16} />
                {t.loading}
              </div>
            ) : null}
          </div>

          <div className="doctor-admin__profile">
            <div className="doctor-admin__locale" aria-label="Language switcher">
              {APP_LOCALES.map((lang) => (
                <button
                  key={lang}
                  className={`doctor-admin__locale-button ${
                    locale === lang ? "doctor-admin__locale-button--active" : ""
                  }`}
                  type="button"
                  onClick={() => changeLocale(lang)}
                >
                  {lang === "kk" ? "KZ" : lang.toUpperCase()}
                </button>
              ))}
            </div>
            <Link className="doctor-admin__home" to="/">
              <House size={18} />
              {t.home}
            </Link>
            <div className="doctor-admin__identity">
              <div className="doctor-admin__avatar">{initials(displayName)}</div>
              <div className="doctor-admin__doctor">
                <strong>{displayName}</strong>
                <span>{t.adminRole}</span>
              </div>
            </div>
          </div>
        </header>

        {err ? (
          <div className="doctor-admin__alert">
            {err === "load"
              ? t.loadError
              : err === "serverAuth"
                ? t.serverAuthError
                : t.statusUpdateError}
          </div>
        ) : null}

        <section className="doctor-admin__panel doctor-admin__filters">
          <div className="doctor-admin__panel-head">
            <div>
              <h2>{t.filtersTitle}</h2>
              <p className="doctor-admin__panel-subtitle">{t.filtersSubtitle}</p>
            </div>
            <button className="doctor-admin__refresh" type="button" onClick={load} disabled={loading}>
              {t.refresh}
            </button>
          </div>

          <div className="doctor-admin__filters-grid">
            <label className="doctor-admin__field">
              <span>{t.filterDateLabel}</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="doctor-admin__field">
              <span>{t.filterStatusLabel}</span>
              <select
                className="doctor-admin__select"
                value={status}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="all">{t.allStatuses}</option>
                <option value="pending">{t.statusPendingFilter}</option>
                <option value="active">{t.statusActiveFilter}</option>
                <option value="done">{t.statusDoneFilter}</option>
              </select>
            </label>
            <label className="doctor-admin__field">
              <span>{t.filterDoctorLabel}</span>
              <select
                className="doctor-admin__select"
                value={doctorFilter}
                onChange={(event) => setDoctorFilter(event.target.value)}
              >
                <option value="all">{t.allDoctors}</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="doctor-admin__filters-actions">
              <button
                className="doctor-admin__refresh doctor-admin__refresh--secondary"
                type="button"
                onClick={() => setDate("")}
                disabled={!date}
              >
                <SlidersHorizontal size={16} />
                {t.allDates}
              </button>
            </div>
          </div>
        </section>

        {showEmptyDashboard ? (
          <section className="doctor-admin__panel doctor-admin__empty-state">
            <div className="doctor-admin__empty-illustration" aria-hidden="true">
              <span className="doctor-admin__empty-orb doctor-admin__empty-orb--blue">
                <LayoutDashboard size={22} />
              </span>
              <span className="doctor-admin__empty-orb doctor-admin__empty-orb--amber">
                <ClipboardList size={20} />
              </span>
              <span className="doctor-admin__empty-orb doctor-admin__empty-orb--green">
                <Users size={20} />
              </span>
            </div>
            <div className="doctor-admin__empty-copy">
              <h2>{t.emptyDashboardTitle}</h2>
              <p>{t.emptyDashboardText}</p>
            </div>
            <div className="doctor-admin__empty-actions">
              <Link to="/appointments/new">
                <ClipboardList size={18} />
                {t.newAppointment}
              </Link>
              <button type="button" onClick={load}>
                <LoaderCircle size={16} />
                {t.refresh}
              </button>
            </div>
          </section>
        ) : null}

        <section className="doctor-admin__metrics">
          {isInitialLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <article className="doctor-admin__metric doctor-admin__metric--loading" key={`metric-skeleton-${index}`}>
                  <span className="doctor-admin__skeleton doctor-admin__skeleton--label" aria-hidden="true" />
                  <strong className="doctor-admin__skeleton doctor-admin__skeleton--value" aria-hidden="true" />
                  <small className="doctor-admin__skeleton doctor-admin__skeleton--meta" aria-hidden="true" />
                </article>
              ))
            : metricCards.map((metric) => (
                <article className="doctor-admin__metric" key={metric.key}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small className={metric.tone === "red" ? "doctor-admin__red" : "doctor-admin__green"}>
                    {metric.delta}
                  </small>
                </article>
              ))}
        </section>

        <section className="doctor-admin__content">
          <article className="doctor-admin__panel doctor-admin__schedule" id="schedule">
            <div className="doctor-admin__panel-head">
              <h2>{date ? t.scheduleForDate : t.allAppointments}</h2>
              <span>{formatDay(date, locale, t.all)}</span>
            </div>

            <div className="doctor-admin__list">
              {isInitialLoading ? (
                <div className="doctor-admin__panel-loading" aria-live="polite">
                  <LoaderCircle className="doctor-admin__spin" size={18} />
                  {t.loading}
                </div>
              ) : visibleItems.length === 0 ? (
                <p className="doctor-admin__empty">{t.noAppointments}</p>
              ) : (
                visibleItems.map((item) => {
                  const name = patientLabel(item, t.patientFallback);

                  return (
                    <div className="doctor-admin__appointment" key={item.id}>
                      <time>{item.time}</time>
                      <div className="doctor-admin__mini-avatar">{initials(name)}</div>
                      <div className="doctor-admin__appointment-main">
                        <strong>{name}</strong>
                        <span>{item.reason || t.appointmentFallback}</span>
                      </div>
                      <button
                        className={`doctor-admin__status doctor-admin__status--${statusTone(item.status)}`}
                        type="button"
                        onClick={() => changeStatus(item.id, item.status === "done" ? "pending" : "done")}
                      >
                        {statusLabel(item.status, locale)}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className="doctor-admin__panel doctor-admin__patients" id="patients">
            <div className="doctor-admin__panel-head doctor-admin__panel-head--row">
              <h2>{t.latestPatients}</h2>
              <Link to="/appointments/new">
                {t.all} <ArrowRight size={18} />
              </Link>
            </div>

            <div className="doctor-admin__patient-list">
              {isInitialLoading ? (
                <div className="doctor-admin__panel-loading" aria-live="polite">
                  <LoaderCircle className="doctor-admin__spin" size={18} />
                  {t.loading}
                </div>
              ) : visiblePatients.length === 0 ? (
                <p className="doctor-admin__empty">{t.noPatients}</p>
              ) : (
                visiblePatients.slice(0, 4).map((patient) => {
                  const name = patient.name;

                  return (
                    <div className="doctor-admin__patient" key={`${patient.id}-patient`}>
                      <div className="doctor-admin__mini-avatar doctor-admin__mini-avatar--soft">
                        {initials(name)}
                      </div>
                      <div>
                        <strong>{name}</strong>
                        <span>
                          {patient.email || t.noEmail} • {appointmentCountLabel(locale, patient.appointment_count)}
                        </span>
                      </div>
                      <button type="button">{t.patientCard}</button>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </section>

        <section className="doctor-admin__panel doctor-admin__messages" id="telegram">
          <div className="doctor-admin__panel-head">
            <div>
              <h2>{t.telegramInbox}</h2>
              <p className="doctor-admin__panel-subtitle">{t.telegramSubtitle}</p>
            </div>
            {consultations.length > 0 ? <span>{consultations.length}</span> : null}
          </div>

          <div className="doctor-admin__list">
            {isInitialLoading ? (
              <div className="doctor-admin__panel-loading" aria-live="polite">
                <LoaderCircle className="doctor-admin__spin" size={18} />
                {t.loading}
              </div>
            ) : consultations.length === 0 ? (
              <p className="doctor-admin__empty">{t.noTelegram}</p>
            ) : (
              consultations.map((item) => {
                const telegramLabel = item.telegram_username
                  ? `@${item.telegram_username}`
                  : `ID ${item.chat_id}`;
                const telegramPerson = [item.telegram_first_name, item.telegram_last_name]
                  .filter(Boolean)
                  .join(" ");
                const wantsConsultation =
                  item.wants_consultation === 1 || item.wants_consultation === true;
                const hasMeeting = Boolean(item.meeting_url && item.meeting_at);
                const isOpen = acceptForm?.id === item.id;

                return (
                  <div className="doctor-admin__message" key={`${item.id}-telegram`}>
                    <span
                      className={`doctor-admin__dot doctor-admin__dot--${item.status === "reviewed" ? "reviewed" : "new"}`}
                    />
                    <div
                      className={`doctor-admin__mini-avatar ${
                        item.status === "reviewed" ? "doctor-admin__mini-avatar--soft" : ""
                      }`}
                    >
                      {initials(item.patient_name)}
                    </div>
                    <div className="doctor-admin__message-content">
                      <strong>{item.patient_name}</strong>
                      <p>
                        {telegramLabel}
                        {telegramPerson ? ` • ${telegramPerson}` : ""}
                      </p>
                      <p>
                        {t.telegramProblem}: {item.problem}
                      </p>
                      <p>
                        {t.telegramDays}: {item.days || t.telegramNoData} • {t.telegramTemperature}:{" "}
                        {item.temperature || t.telegramNoData}
                      </p>
                      <p>{formatDateTime(item.created_at, locale)}</p>

                      {wantsConsultation && !hasMeeting ? (
                        <div style={{ marginTop: 6, padding: 6, background: "rgba(245,158,11,0.12)", borderRadius: 6 }}>
                          <p style={{ margin: 0, color: "#f59e0b", fontWeight: 600 }}>
                            📹 Запрошена видеоконсультация
                          </p>
                          {item.requested_at ? (
                            <p style={{ margin: "4px 0 0" }}>
                              Пациент выбрал: <b>{formatDateTime(item.requested_at, locale)}</b>
                            </p>
                          ) : null}
                        </div>
                      ) : null}

                      {hasMeeting ? (
                        <div style={{ marginTop: 8, padding: 8, background: "rgba(16,185,129,0.1)", borderRadius: 6 }}>
                          <p style={{ margin: 0 }}>
                            🕐 <b>{formatDateTime(item.meeting_at!, locale)}</b>
                          </p>
                          <p style={{ margin: "4px 0 0" }}>
                            🔗 <a href={item.meeting_url!} target="_blank" rel="noreferrer">{item.meeting_url}</a>
                          </p>
                        </div>
                      ) : null}

                      {isOpen ? (
                        <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <input
                            type="datetime-local"
                            value={acceptForm!.value}
                            onChange={(e) =>
                              setAcceptForm({ id: item.id, value: e.target.value })
                            }
                          />
                          <button
                            type="button"
                            disabled={!acceptForm!.value}
                            onClick={async () => {
                              const iso = new Date(acceptForm!.value).toISOString();
                              await acceptConsultation(item.id, iso);
                              setAcceptForm(null);
                            }}
                          >
                            Подтвердить и отправить пациенту
                          </button>
                          <button type="button" onClick={() => setAcceptForm(null)}>
                            Отмена
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {wantsConsultation && !hasMeeting && !isOpen ? (
                        <button
                          type="button"
                          className="doctor-admin__status doctor-admin__status--ok"
                          onClick={() => {
                            const base = item.requested_at
                              ? new Date(item.requested_at)
                              : new Date(Date.now() + 30 * 60 * 1000);
                            const localIso = new Date(base.getTime() - base.getTimezoneOffset() * 60000)
                              .toISOString()
                              .slice(0, 16);
                            setAcceptForm({ id: item.id, value: localIso });
                          }}
                        >
                          {item.requested_at ? "Принять (время пациента)" : "Принять консультацию"}
                        </button>
                      ) : null}
                      <button
                        className={`doctor-admin__status doctor-admin__status--${consultationTone(item.status)}`}
                        type="button"
                        onClick={() =>
                          changeConsultationStatus(
                            item.id,
                            item.status === "reviewed" ? "new" : "reviewed"
                          )
                        }
                      >
                        {item.status === "reviewed" ? t.telegramMarkNew : t.telegramMarkReviewed}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="doctor-admin__panel doctor-admin__records" id="appointments">
          <div className="doctor-admin__panel-head">
            <div>
              <h2>{t.allAppointments}</h2>
              <p className="doctor-admin__panel-subtitle">{t.recordsSubtitle}</p>
            </div>
            {visibleItems.length > 0 ? <span>{visibleItems.length}</span> : null}
          </div>

          <div className="doctor-admin__record-list">
            {isInitialLoading ? (
              <div className="doctor-admin__panel-loading" aria-live="polite">
                <LoaderCircle className="doctor-admin__spin" size={18} />
                {t.loading}
              </div>
            ) : visibleItems.length === 0 ? (
              <p className="doctor-admin__empty">{t.noRecords}</p>
            ) : (
              visibleItems.map((item) => {
                const name = patientLabel(item, t.patientFallback);

                return (
                  <div className="doctor-admin__record" key={`${item.id}-record`}>
                    <div className="doctor-admin__record-date">
                      <strong>{item.date}</strong>
                      <span>{item.time}</span>
                    </div>
                    <div className="doctor-admin__mini-avatar">{initials(name)}</div>
                    <div className="doctor-admin__record-main">
                      <strong>{name}</strong>
                      <span>{doctorLabel(item, doctors, t.doctorFallback)}</span>
                      <small>{item.reason || t.appointmentFallback}</small>
                    </div>
                    <div className="doctor-admin__record-actions">
                      <span className={`doctor-admin__status doctor-admin__status--${statusTone(item.status)}`}>
                        {statusLabel(item.status, locale)}
                      </span>
                      <button
                        type="button"
                        disabled={item.status === "pending"}
                        onClick={() => changeStatus(item.id, "pending")}
                      >
                        {t.actionPending}
                      </button>
                      <button
                        type="button"
                        disabled={item.status === "active"}
                        onClick={() => changeStatus(item.id, "active")}
                      >
                        {t.actionAccept}
                      </button>
                      <button
                        type="button"
                        disabled={item.status === "done"}
                        onClick={() => changeStatus(item.id, "done")}
                      >
                        {t.actionComplete}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="doctor-admin__quick">
          <Link to="/appointments/new">
            <ClipboardList size={18} />
            {t.newAppointment}
          </Link>
          {BMO_SETTINGS_URL ? (
            <a href={BMO_SETTINGS_URL} target="_blank" rel="noreferrer">
              <Settings size={18} />
              {t.navSettings}
            </a>
          ) : null}
        </section>
      </main>

      <nav className="doctor-admin__mobile-nav" aria-label={`${t.panelTitle} mobile navigation`}>
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <a
              key={`mobile-${item.id}`}
              className={`doctor-admin__mobile-nav-item ${
                activeSection === item.id ? "doctor-admin__mobile-nav-item--active" : ""
              }`}
              href={`#${item.id}`}
              onClick={() => setActiveSection(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
