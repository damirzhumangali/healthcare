import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  Check,
  ChevronDown,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  MonitorSmartphone,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import AdminMobileNav from "../components/AdminMobileNav";
import AvatarCircle from "../components/AvatarCircle";
import DayDateNavigator, { getTodayDateInput } from "../components/DayDateNavigator";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ProfileAvatarDialog from "../components/ProfileAvatarDialog";
import {
  DOCTORS,
  fetchAppointments,
  pingBackend,
  readCachedAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
  type DoctorOption,
} from "../lib/apiAppointments";
import {
  AdminApiError,
  fetchAdminDoctors,
  fetchAdminPatients,
  fetchAdminSummary,
  type AdminPatient,
  type AdminSummary,
} from "../lib/apiAdmin";
import { isAdminAccount } from "../lib/adminAccess";
import { API_URL, BMO_SETTINGS_URL } from "../lib/apiBase";
import { getToken, hasSession, SESSION_USER_UPDATED_EVENT, setCurrentUser, setToken } from "../lib/auth";
import { resolveAvatarUrl } from "../lib/avatar";
import {
  isHomeOnlineConsultation,
  isOnlineConsultation,
  isWardOnlineRequest,
  readRoomLabel,
  readBedLabel,
  readWardLabel,
} from "../lib/consultationMode";
import { type AppLocale } from "../lib/locale";
import { usePageSeo } from "../lib/seo";
import { countNewBedsideConsultations, listAllBedsideConsultations, syncBedsideConsultations } from "../lib/onlineConsultations";
import { recommendSpecialist } from "../lib/specialistRecommendation";
import { useSoundOnNewIds } from "../lib/notificationSound";
import { resolvePatientDisplayName } from "../lib/patientName";
import { useSyncedLocale } from "../lib/useSyncedLocale";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  picture?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
};

type StatusFilter = AppointmentStatus | "all";
type DoctorFilter = string | "all";
type ErrorState = "load" | "statusUpdate" | "serverAuth" | null;
type Locale = AppLocale;

const adminText = {
  ru: {
    panelTitle: "Админ-панель",
    navDashboard: "Дашборд",
    navSchedule: "Расписание",
    navAppointments: "Записи",
    navPatients: "Пациенты",
    navWardConsults: "Палатные консультации",
    navAnalytics: "Аналитика",
    navWardsMobile: "Палаты",
    navSettings: "Настроить BMO",
    navAimar: "Настроить Aimar",
    aimarSubtitle: "Управление замком двери",
    aimarStatus: "Статус",
    aimarOpen: "Открыть",
    aimarClose: "Закрыть",
    aimarIsOpen: "Открыто",
    aimarIsClosed: "Закрыто",
    aimarNoData: "Нет данных",
    aimarUpdated: "Обновлено",
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
    todayEmptyDelta: "на выбранную дату пусто",
    patientsDelta: "+5 за неделю",
    pendingDelta: "сообщений",
    prescriptionsDelta: "за эту неделю",
    doctorsDelta: "в системе",
    overviewQuickTitle: "Быстрый доступ",
    overviewQuickSubtitle: "Полные списки перенесены в отдельные разделы, чтобы обзор оставался коротким.",
    scheduleSummary: "Расписание",
    scheduleSummaryHint: "Записи на выбранную дату",
    recordsSummary: "Записи",
    recordsSummaryHint: "Подтверждённые и завершённые приёмы",
    onlineSummary: "Онлайн из дома",
    onlineSummaryHint: "Только уже назначенные видеозвонки",
    openSection: "Открыть",
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
    actionEdit: "Изменить",
    actionComplete: "Завершить",
    newAppointment: "Новая запись",
    accessDenied: "Нет доступа",
    accessDeniedText: "Для админ-панели нужна роль admin.",
    loadError: "Не удалось загрузить админ-данные. Проверь backend и VITE_API_BASE_URL.",
    statusUpdateError: "Не удалось изменить статус записи.",
    serverAuthError:
      "Сервер не подтвердил права admin. Войдите через Google с почтой администратора, добавленной в backend ADMIN_EMAILS.",
    patientFallback: "Пациент",
    doctorFallback: "Врач",
    appointmentFallback: "Прием",
    todayButton: "Сегодня",
    prevDay: "Предыдущий день",
    nextDay: "Следующий день",
    jumpToday: "Перейти к сегодня",
    statusOnline: "Онлайн",
    statusConfirmed: "Подтвержден",
    statusWaiting: "Ожидает",
    emptyDashboardTitle: "Дашборд пока пуст",
    emptyDashboardText:
      "Когда появятся записи или пациенты, здесь сразу отобразятся ключевые метрики и последние обновления.",
    requestsTitle: "Новые заявки",
    requestsSubtitle: "Пациенты без назначенного врача. Выберите врача и назначьте.",
    noRequests: "Новых заявок нет.",
    assignDoctorLabel: "Назначить врача",
    assignBtn: "Назначить",
    wantsOnlineLabel: "Онлайн",
    assignedOk: "Врач назначен.",
    freeDoctor: "Свободен",
    busyDoctor: "Занят",
    startMeeting: "Начать встречу",
    onlineConsultsTitle: "Онлайн-консультации из дома",
    onlineConsultsSubtitle: "Здесь остаются только домашние видеозвонки: после назначения врача и времени ссылка Jitsi сразу сохраняется и отправляется пациенту и врачу.",
    noOnlineConsults: "Пока нет домашних онлайн-заявок или назначенных видеозвонков.",
    openOnlineBoard: "Открыть палатный экран",
    openWardBoardSingle: "Палатный экран",
    copyLink: "Скопировать ссылку",
    linkSent: "Ссылка отправлена",
    linkSaved: "Ссылка сохранена",
    doctorMissing: "Врач не назначен",
    timeMissing: "Время не указано",
    onlineScheduled: "Назначено",
    modeOnlineHome: "Онлайн из дома",
    modeOnlineWard: "Онлайн в палате",
  },
  kk: {
    panelTitle: "Әкімші панелі",
    navDashboard: "Басқару",
    navSchedule: "Кесте",
    navAppointments: "Жазылулар",
    navPatients: "Пациенттер",
    navWardConsults: "Палаталық кеңестер",
    navAnalytics: "Аналитика",
    navWardsMobile: "Палаталар",
    navSettings: "BMO баптау",
    navAimar: "Aimar баптау",
    aimarSubtitle: "Есік құлпын басқару",
    aimarStatus: "Мәртебе",
    aimarOpen: "Ашу",
    aimarClose: "Жабу",
    aimarIsOpen: "Ашық",
    aimarIsClosed: "Жабық",
    aimarNoData: "Деректер жоқ",
    aimarUpdated: "Жаңартылды",
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
    todayEmptyDelta: "таңдалған күнде бос",
    patientsDelta: "+5 апта ішінде",
    pendingDelta: "хабарлама",
    prescriptionsDelta: "осы аптада",
    doctorsDelta: "жүйеде",
    overviewQuickTitle: "Жылдам өту",
    overviewQuickSubtitle: "Шолу қысқа болуы үшін толық тізімдер бөлек бөлімдерге көшірілді.",
    scheduleSummary: "Кесте",
    scheduleSummaryHint: "Таңдалған күнге жазылулар",
    recordsSummary: "Жазылулар",
    recordsSummaryHint: "Расталған және аяқталған қабылдаулар",
    onlineSummary: "Үйден онлайн",
    onlineSummaryHint: "Тек тағайындалған бейнеқоңыраулар",
    openSection: "Ашу",
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
    actionEdit: "Өзгерту",
    actionComplete: "Аяқтау",
    newAppointment: "Жаңа жазылу",
    accessDenied: "Қол жеткізу жоқ",
    accessDeniedText: "Әкімші панелі үшін admin рөлі қажет.",
    loadError: "Әкімші деректерін жүктеу мүмкін болмады. Backend пен VITE_API_BASE_URL тексеріңіз.",
    statusUpdateError: "Жазылу мәртебесін өзгерту мүмкін болмады.",
    serverAuthError:
      "Сервер admin құқығын растаған жоқ. Backend ADMIN_EMAILS ішінде тұрған әкімші поштасымен Google арқылы кіріңіз.",
    patientFallback: "Пациент",
    doctorFallback: "Дәрігер",
    appointmentFallback: "Қабылдау",
    todayButton: "Бүгін",
    prevDay: "Алдыңғы күн",
    nextDay: "Келесі күн",
    jumpToday: "Бүгінге өту",
    statusOnline: "Онлайн",
    statusConfirmed: "Расталды",
    statusWaiting: "Күтіп тұр",
    emptyDashboardTitle: "Басқару тақтасы әзірге бос",
    emptyDashboardText:
      "Жазылулар немесе пациенттер түскенде, негізгі метрикалар мен соңғы жаңартулар осында бірден көрінеді.",
    requestsTitle: "Жаңа өтінімдер",
    requestsSubtitle: "Дәрігер тағайындалмаған пациенттер. Дәрігер таңдап, тағайындаңыз.",
    noRequests: "Жаңа өтінімдер жоқ.",
    assignDoctorLabel: "Дәрігер тағайындау",
    assignBtn: "Тағайындау",
    wantsOnlineLabel: "Онлайн",
    assignedOk: "Дәрігер тағайындалды.",
    freeDoctor: "Бос",
    busyDoctor: "Бос емес",
    startMeeting: "Кездесу бастау",
    onlineConsultsTitle: "Үйден онлайн кеңестер",
    onlineConsultsSubtitle: "Мұнда тек үйден болатын бейнеқоңыраулар қалады: дәрігер мен уақыт тағайындалған соң, Jitsi сілтемесі бірден сақталып, пациент пен дәрігерге жіберіледі.",
    noOnlineConsults: "Әзірге үйден онлайн өтінімдер немесе тағайындалған бейнеқоңыраулар жоқ.",
    openOnlineBoard: "Палаталық экранды ашу",
    openWardBoardSingle: "Палаталық экран",
    copyLink: "Сілтемені көшіру",
    linkSent: "Сілтеме жіберілді",
    linkSaved: "Сілтеме сақталды",
    doctorMissing: "Дәрігер тағайындалмаған",
    timeMissing: "Уақыты көрсетілмеген",
    onlineScheduled: "Тағайындалды",
    modeOnlineHome: "Үйден онлайн",
    modeOnlineWard: "Палатада онлайн",
  },
  en: {
    panelTitle: "Admin Panel",
    navDashboard: "Dashboard",
    navSchedule: "Schedule",
    navAppointments: "Appointments",
    navPatients: "Patients",
    navWardConsults: "Ward consultations",
    navAnalytics: "Analytics",
    navWardsMobile: "Wards",
    navSettings: "Configure BMO",
    navAimar: "Configure Aimar",
    aimarSubtitle: "Door lock control",
    aimarStatus: "Status",
    aimarOpen: "Open",
    aimarClose: "Close",
    aimarIsOpen: "Open",
    aimarIsClosed: "Closed",
    aimarNoData: "No data",
    aimarUpdated: "Updated",
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
    todayEmptyDelta: "nothing on this date",
    patientsDelta: "+5 this week",
    pendingDelta: "messages",
    prescriptionsDelta: "this week",
    doctorsDelta: "in system",
    overviewQuickTitle: "Quick access",
    overviewQuickSubtitle: "Full lists were moved into dedicated sections so the overview stays short.",
    scheduleSummary: "Schedule",
    scheduleSummaryHint: "Appointments for the selected date",
    recordsSummary: "Appointments",
    recordsSummaryHint: "Confirmed and completed visits",
    onlineSummary: "Online from home",
    onlineSummaryHint: "Only already scheduled video calls",
    openSection: "Open",
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
    actionEdit: "Edit",
    actionComplete: "Complete",
    newAppointment: "New appointment",
    accessDenied: "Access denied",
    accessDeniedText: "The admin panel requires the admin role.",
    loadError: "Could not load admin data. Check the backend and VITE_API_BASE_URL.",
    statusUpdateError: "Could not change the appointment status.",
    serverAuthError:
      "The server did not confirm admin access. Sign in with a Google account that is listed in backend ADMIN_EMAILS.",
    patientFallback: "Patient",
    doctorFallback: "Doctor",
    appointmentFallback: "Appointment",
    todayButton: "Today",
    prevDay: "Previous day",
    nextDay: "Next day",
    jumpToday: "Go to today",
    statusOnline: "Online",
    statusConfirmed: "Confirmed",
    statusWaiting: "Waiting",
    emptyDashboardTitle: "The dashboard is empty for now",
    emptyDashboardText:
      "As soon as appointments or patients appear, the main metrics and recent updates will show up here.",
    requestsTitle: "New Requests",
    requestsSubtitle: "Patients without an assigned doctor. Pick a doctor and assign.",
    noRequests: "No new requests.",
    assignDoctorLabel: "Assign doctor",
    assignBtn: "Assign",
    wantsOnlineLabel: "Online",
    assignedOk: "Doctor assigned.",
    freeDoctor: "Free",
    busyDoctor: "Busy",
    startMeeting: "Start meeting",
    onlineConsultsTitle: "Online consultations from home",
    onlineConsultsSubtitle: "Only home video calls stay here: once a doctor and time are assigned, the Jitsi link is stored immediately and sent to both patient and doctor.",
    noOnlineConsults: "No home online requests or scheduled video calls yet.",
    openOnlineBoard: "Open bedside board",
    openWardBoardSingle: "Bedside board",
    copyLink: "Copy link",
    linkSent: "Link sent",
    linkSaved: "Link saved",
    doctorMissing: "Doctor not assigned",
    timeMissing: "Time not set",
    onlineScheduled: "Scheduled",
    modeOnlineHome: "Online from home",
    modeOnlineWard: "Online in ward",
  },
} as const;

const localeDateMap: Record<Locale, string> = {
  ru: "ru-RU",
  kk: "kk-KZ",
  en: "en-US",
};

function today() {
  return getTodayDateInput();
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
    credentials: "include",
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
  setCurrentUser(data.user);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const pad = part.length % 4;
    const padded = pad ? part + "=".repeat(4 - pad) : part;
    return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function patientLabel(item: Appointment, fallback: string, patients: AdminPatient[] = []) {
  const pid = item.patient_id || item.patientId || item.patient_email || item.patientEmail || "";
  const fromPatients = patients.find(
    (p) => p.id === pid || p.email === pid || p.email === item.patient_email || p.email === item.patientEmail
  );

  return resolvePatientDisplayName({
    names: [fromPatients?.name, item.patientName, item.patient_name],
    source: pid || item.patient_email || item.patientEmail || item.id,
    fallback,
    requireFullName: true,
  });
}

function doctorLabel(item: Appointment, doctors: DoctorOption[], fallback: string) {
  const doctorId = item.doctor_id || item.doctorId;
  const doctor = doctors.find((doctorItem) => doctorItem.id === doctorId);
  const raw = item.doctorName || (doctor ? `${doctor.name} — ${doctor.specialty}` : doctorId) || fallback;
  return raw.replace(/^Др\.\s*/i, "");
}

function statusLabel(status: AppointmentStatus, locale: Locale) {
  const t = adminText[locale];

  if (status === "active") return t.statusConfirmed;
  if (status === "done") return t.statusDoneFilter;
  return t.statusWaiting;
}

function statusTone(status: AppointmentStatus) {
  if (status === "active") return "green";
  if (status === "done") return "dark";
  return "amber";
}

function appointmentCountLabel(locale: Locale, count: number) {
  if (locale === "kk") return `${count} жазылу`;
  if (locale === "en") return `${count} appointments`;
  return `${count} записей`;
}

function getBusyDoctorIds(date: string, appointments: Appointment[]): Set<string> {
  return new Set(
    appointments
      .filter((a) => {
        const docId = a.doctor_id || a.doctorId;
        return a.date === date && docId && docId !== "pending";
      })
      .map((a) => (a.doctor_id || a.doctorId) as string)
  );
}

function jitsiRoomUrl(appointmentId: string) {
  return `https://meet.jit.si/healthassist-${appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

function hasAssignedDoctor(item: Appointment) {
  const doctorId = item.doctor_id || item.doctorId;
  return Boolean(doctorId && doctorId !== "pending");
}

function consultationModeLabel(item: Appointment, locale: Locale) {
  const t = adminText[locale];
  return isWardOnlineRequest(item) ? t.modeOnlineWard : t.modeOnlineHome;
}

export default function AdminDashboard() {
  usePageSeo({
    title: "Админ-панель — HealthAssist",
    description: "Служебная административная панель HealthAssist.",
    path: "/admin",
    locale: "ru",
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<StoredUser | null>(() => readCurrentUser());
  const allowed = isAdminAccount(user) || isLocalDemoHost();
  const [locale, setLocale] = useSyncedLocale();
  const [activeSection, setActiveSection] = useState(() =>
    window.location.hash.replace("#", "") || "overview"
  );
  const [date, setDate] = useState(today());
  const [scheduleShowAll, setScheduleShowAll] = useState(false);
  const [completedShowAll, setCompletedShowAll] = useState(false);
  const [status, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilter>("all");
  const [items, setItems] = useState<Appointment[]>([]);
  const [allItems, setAllItems] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>(DOCTORS.map((doctor) => ({ ...doctor, active: true })));
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<ErrorState>(null);
  const [wardRequestCount, setWardRequestCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const [openFilterMenu, setOpenFilterMenu] = useState<"status" | "doctor" | null>(null);
  const statusFilterRef = useRef<HTMLDivElement | null>(null);
  const doctorFilterRef = useRef<HTMLDivElement | null>(null);

  const t = adminText[locale];
  const displayName = user?.name || user?.email || t.defaultAdminName;
  const userAvatar = resolveAvatarUrl(user ? { ...user, role: user.role || "admin" } : null);
  const navItems = [
    { id: "overview", label: t.navDashboard, icon: LayoutDashboard },
    { id: "schedule", label: t.navSchedule, icon: CalendarClock },
    { id: "appointments", label: t.navAppointments, icon: ClipboardList },
    { id: "patients", label: t.navPatients, icon: Users },
  ] as const;
  const mobileNavItems = [
    { id: "overview", label: t.navDashboard, icon: LayoutDashboard, type: "hash" as const },
    { id: "schedule", label: t.navSchedule, icon: CalendarClock, type: "hash" as const },
    { id: "appointments", label: t.navAppointments, icon: ClipboardList, type: "hash" as const },
    {
      id: "ward-consults",
      label: t.navWardsMobile,
      icon: MonitorSmartphone,
      type: "route" as const,
      badge: wardRequestCount,
    },
  ] as const;

  const aimarNavItem = { id: "aimar", label: t.navAimar, icon: Cpu };

  useEffect(() => {
    const syncUser = () => setUser(readCurrentUser());
    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        statusFilterRef.current?.contains(target) ||
        doctorFilterRef.current?.contains(target)
      ) {
        return;
      }
      setOpenFilterMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFilterMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
      const [appointmentsData, allAppointmentsData, summaryData, doctorsData, patientsData] = await Promise.all([
        fetchAppointments(date || undefined),
        fetchAppointments(),
        fetchAdminSummary(),
        fetchAdminDoctors(),
        fetchAdminPatients(),
      ]);
      const cachedAppointments = readCachedAppointments();
      const scopedAppointments =
        (appointmentsData.items ?? []).length > 0
          ? appointmentsData.items ?? []
          : cachedAppointments.filter((item) => (date ? item.date === date : true));
      const allAppointments =
        (allAppointmentsData.items ?? []).length > 0 ? allAppointmentsData.items ?? [] : cachedAppointments;
      syncBedsideConsultations(allAppointments);
      setWardRequestCount(countNewBedsideConsultations());

      const enrichWithCurrentUser = (apts: Appointment[]) => {
        const cu = readCurrentUser();
        const jwtPayload = (() => { const tok = getToken(); return tok ? parseJwtPayload(tok) : null; })();

        // Collect every identifier format the server might have stored as patient_id
        const userIds = new Set<string>(
          [
            cu?.id,
            cu?.email,
            jwtPayload?.sub as string | undefined,
            jwtPayload?.id as string | undefined,
            jwtPayload?.user_id as string | undefined,
            jwtPayload?.email as string | undefined,
          ].filter((v): v is string => Boolean(v))
        );

        if (userIds.size === 0) return apts;

        const userName =
          cu?.name ||
          (jwtPayload?.name as string | undefined) ||
          cu?.email ||
          (jwtPayload?.email as string | undefined);
        const userEmail = cu?.email || (jwtPayload?.email as string | undefined);

        return apts.map((apt) => {
          if (apt.patientName || apt.patient_name || apt.patient_email || apt.patientEmail) return apt;
          const pid = apt.patient_id || apt.patientId || "";
          if (!pid || !userIds.has(pid)) return apt;
          return {
            ...apt,
            patientName: userName || userEmail,
            patient_name: userName || userEmail,
            patient_email: userEmail,
          };
        });
      };

      setItems(enrichWithCurrentUser(scopedAppointments));
      setAllItems(enrichWithCurrentUser(allAppointments));
      setSummary(summaryData);
      setDoctors(
        doctorsData.items.length > 0
          ? doctorsData.items
          : DOCTORS.map((doctor) => ({ ...doctor, active: true }))
      );
      setPatients(patientsData.items ?? []);
    } catch (error) {
      syncBedsideConsultations(readCachedAppointments());
      setWardRequestCount(countNewBedsideConsultations());
      setErr(error instanceof AdminApiError && (error.code === "unauthorized" || error.code === "forbidden") ? "serverAuth" : "load");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const dashboardItems = useMemo(
    () => items.filter((item) => !isWardOnlineRequest(item)),
    [items],
  );
  const dashboardAllItems = useMemo(
    () => allItems.filter((item) => !isWardOnlineRequest(item)),
    [allItems],
  );
  const isOverviewSection = activeSection === "overview";
  const isScheduleSection = activeSection === "schedule";
  const isAppointmentsSection = activeSection === "appointments";
  const isPatientsSection = activeSection === "patients";

  const filteredItems = useMemo(() => {
    return dashboardItems.filter((item) => {
      const matchesStatus = status === "all" ? true : item.status === status;
      const matchesDoctor =
        doctorFilter === "all" ? true : (item.doctor_id || item.doctorId) === doctorFilter;

      return matchesStatus && matchesDoctor;
    });
  }, [dashboardItems, doctorFilter, status]);

  const unassignedItems = useMemo(
    () => dashboardAllItems.filter((item) => item.status === "pending" && !hasAssignedDoctor(item)),
    [dashboardAllItems]
  );
  const wardPendingIds = useMemo(
    () => listAllBedsideConsultations().filter((consult) => !consult.deliveryMode).map((consult) => consult.id),
    [wardRequestCount],
  );
  const inProgressItems = useMemo(
    () => dashboardAllItems.filter((item) => item.status === "pending" && hasAssignedDoctor(item)),
    [dashboardAllItems]
  );
  const completedItems = useMemo(
    () => dashboardAllItems
      .filter((item) => item.status === "active" || item.status === "done")
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
    [dashboardAllItems]
  );
  const onlineItems = useMemo(
    () =>
      dashboardAllItems
        .filter(
          (item) =>
            isHomeOnlineConsultation(item) &&
            hasAssignedDoctor(item) &&
            item.status !== "done",
        )
        .sort((a, b) => {
          const byDate = a.date.localeCompare(b.date);
          return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
        }),
    [dashboardAllItems],
  );
  const visibleItems = filteredItems;
  const visiblePatients = useMemo(() => {
    const dashboardPatientIds = new Set(
      dashboardAllItems.map((item) => item.patient_id || item.patientId || item.patient_email || item.patientEmail || item.id),
    );

    if (patients.length > 0) {
      return patients.filter((patient) => dashboardPatientIds.has(patient.id) || (patient.email ? dashboardPatientIds.has(patient.email) : false));
    }

    return visibleItems.map((item) => ({
      id: item.patient_id || item.patientId || item.id,
      email: item.patient_email || item.patientEmail || null,
      name: patientLabel(item, t.patientFallback, patients),
      role: "patient",
      last_appointment_at: item.created_at || item.createdAt || null,
      appointment_count: 1,
    }));
  }, [dashboardAllItems, patients, visibleItems, t.patientFallback]);

  const patientPictureMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const patient of patients) {
      if (!patient.picture) continue;
      map.set(patient.id, patient.picture);
      if (patient.email) {
        map.set(patient.email, patient.picture);
      }
    }
    return map;
  }, [patients]);

  const statusOptions = useMemo(
    () => [
      { value: "all" as StatusFilter, label: t.allStatuses },
      { value: "pending" as StatusFilter, label: t.statusPendingFilter },
      { value: "active" as StatusFilter, label: t.statusActiveFilter },
      { value: "done" as StatusFilter, label: t.statusDoneFilter },
    ],
    [t.allStatuses, t.statusActiveFilter, t.statusDoneFilter, t.statusPendingFilter],
  );

  const doctorOptions = useMemo(
    () => [
      { value: "all" as DoctorFilter, label: t.allDoctors },
      ...doctors.map((doctor) => ({ value: doctor.id as DoctorFilter, label: doctor.name })),
    ],
    [doctors, t.allDoctors],
  );

  const selectedStatusLabel =
    statusOptions.find((option) => option.value === status)?.label || t.allStatuses;
  const selectedDoctorLabel =
    doctorOptions.find((option) => option.value === doctorFilter)?.label || t.allDoctors;

  function appointmentAvatar(item: Appointment) {
    const picture =
      patientPictureMap.get(item.patient_id || item.patientId || "") ||
      patientPictureMap.get(item.patient_email || item.patientEmail || "") ||
      null;
    return resolveAvatarUrl(
      {
        id: item.patient_id || item.patientId || null,
        email: item.patient_email || item.patientEmail || null,
        role: "patient",
        picture,
      },
      { patientFallback: true },
    );
  }

  const stats = useMemo(() => {
    const dashboardPatientIds = new Set(
      dashboardAllItems.map((item) => item.patient_id || item.patientId || item.patient_email || item.patientEmail || item.id),
    );
    return {
      today: dashboardAllItems.filter((item) => item.date === today()).length,
      patients: dashboardPatientIds.size || visiblePatients.length,
      pending: dashboardAllItems.filter((item) => item.status === "pending").length,
      done: dashboardAllItems.filter((item) => item.status === "done").length,
      doctors: summary?.doctors ?? doctors.filter((doctor) => doctor.active !== false).length,
    };
  }, [dashboardAllItems, doctors, summary, visiblePatients]);

  const isInitialLoading =
    loading &&
    !summary &&
    items.length === 0 &&
    patients.length === 0;
  const showEmptyDashboard =
    !isInitialLoading &&
    !loading &&
    visibleItems.length === 0 &&
    visiblePatients.length === 0 &&
    stats.today === 0 &&
    stats.patients === 0 &&
    stats.pending === 0 &&
    stats.done === 0;
  const metricCards = [
    { key: "today", label: locale === "ru" ? "Приемов" : locale === "kk" ? "Қабылдау" : "Visits", value: stats.today, tone: "green", delta: stats.today > 0 ? t.todayDelta : t.todayEmptyDelta },
    { key: "pending", label: locale === "ru" ? "Ожидают" : locale === "kk" ? "Күтуде" : "Waiting", value: stats.pending, tone: "red", delta: t.pendingDelta },
    { key: "done", label: locale === "ru" ? "Рецептов" : locale === "kk" ? "Рецепт" : "Scripts", value: stats.done, tone: "green", delta: t.prescriptionsDelta },
    { key: "doctors", label: locale === "ru" ? "Врачи" : locale === "kk" ? "Дәрігер" : "Doctors", value: stats.doctors, tone: "green", delta: t.doctorsDelta },
  ] as const;

  useSoundOnNewIds(unassignedItems.map((item) => item.id), "admin-new-appointments");
  useSoundOnNewIds(wardPendingIds, "admin-ward-requests");
  const overviewSummaryCards = [
    {
      key: "schedule",
      label: t.scheduleSummary,
      hint: t.scheduleSummaryHint,
      value: visibleItems.length,
      section: "schedule" as const,
    },
    {
      key: "appointments",
      label: t.recordsSummary,
      hint: t.recordsSummaryHint,
      value: completedItems.length,
      section: "appointments" as const,
    },
    {
      key: "online",
      label: t.onlineSummary,
      hint: t.onlineSummaryHint,
      value: onlineItems.length,
      section: "appointments" as const,
    },
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

  function openSection(section: "overview" | "schedule" | "appointments" | "patients") {
    setActiveSection(section);
    window.location.hash = section;
  }

  useEffect(() => {
    if (allowed) {
      pingBackend(); // warm up Render backend before patient requests arrive
      void load();
    }
  }, [allowed, load]);

  useEffect(() => {
    if (!allowed) return;
    const timer = window.setInterval(() => {
      void load();
    }, 15_000);
    return () => window.clearInterval(timer);
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

  // React Router navigate() uses history.pushState which doesn't fire hashchange.
  // Watch location.hash via useLocation() to catch sheet-item navigation.
  useEffect(() => {
    const section = location.hash.replace("#", "") || "overview";
    setActiveSection(section);
  }, [location.hash]);

  useEffect(() => {
    const handleDocumentClick = () => {
      setMobileLocaleOpen(false);
      setMobileProfileMenuOpen(false);
    };

    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, []);

  if (!hasSession()) {
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
          <button
            className="doctor-admin__nav-item doctor-admin__nav-item--compact"
            type="button"
            onClick={() => nav("/admin/doctor-schedule")}
          >
            <LayoutGrid size={18} />
            График врачей
          </button>
          <button
            className="doctor-admin__nav-item doctor-admin__nav-item--compact"
            type="button"
            onClick={() => nav("/admin/ward-consults")}
          >
            <MonitorSmartphone size={18} />
            <span className="doctor-admin__nav-item-copy">
              <span>{t.navWardConsults}</span>
              {wardRequestCount > 0 ? (
                <span className="doctor-admin__nav-item-badge">{wardRequestCount}</span>
              ) : null}
            </span>
          </button>
          <button
            className="doctor-admin__nav-item"
            type="button"
            onClick={() => nav("/admin/analytics")}
          >
            <BarChart3 size={18} />
            {t.navAnalytics}
          </button>
          <button
            className="doctor-admin__nav-item"
            type="button"
            onClick={() => nav("/admin/aimar")}
          >
            <Cpu size={18} />
            {aimarNavItem.label}
          </button>
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
                <div className="doctor-admin__mobile-popover doctor-admin__mobile-popover--profile" onClick={(event) => event.stopPropagation()}>
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
                      setCurrentUser(null);
                      setToken("");
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
            {err === "load"
              ? t.loadError
              : err === "serverAuth"
                ? t.serverAuthError
                : t.statusUpdateError}
          </div>
        ) : null}

        {!isOverviewSection ? (
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
              <DayDateNavigator
                date={date}
                onChange={setDate}
                todayLabel={t.todayButton}
                prevTitle={t.prevDay}
                nextTitle={t.nextDay}
                todayTitle={t.jumpToday}
                className="doctor-admin__date-nav doctor-admin__date-nav--field"
              />
            </label>
            <label className="doctor-admin__field">
              <span>{t.filterStatusLabel}</span>
              <div className="doctor-admin__filter-select-wrap" ref={statusFilterRef}>
                <button
                  type="button"
                  className="doctor-admin__filter-trigger"
                  onClick={() =>
                    setOpenFilterMenu((current) => (current === "status" ? null : "status"))
                  }
                  aria-haspopup="listbox"
                  aria-expanded={openFilterMenu === "status"}
                >
                  <span>{selectedStatusLabel}</span>
                  <ChevronDown size={16} />
                </button>
                {openFilterMenu === "status" ? (
                  <div className="doctor-admin__filter-menu" role="listbox" aria-label={t.filterStatusLabel}>
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={status === option.value}
                        className={`doctor-admin__filter-option ${
                          status === option.value ? "doctor-admin__filter-option--active" : ""
                        }`}
                        onClick={() => {
                          setStatusFilter(option.value);
                          setOpenFilterMenu(null);
                        }}
                      >
                        <span>{option.label}</span>
                        {status === option.value ? <Check size={15} /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </label>
            <label className="doctor-admin__field">
              <span>{t.filterDoctorLabel}</span>
              <div className="doctor-admin__filter-select-wrap" ref={doctorFilterRef}>
                <button
                  type="button"
                  className="doctor-admin__filter-trigger"
                  onClick={() =>
                    setOpenFilterMenu((current) => (current === "doctor" ? null : "doctor"))
                  }
                  aria-haspopup="listbox"
                  aria-expanded={openFilterMenu === "doctor"}
                >
                  <span>{selectedDoctorLabel}</span>
                  <ChevronDown size={16} />
                </button>
                {openFilterMenu === "doctor" ? (
                  <div className="doctor-admin__filter-menu" role="listbox" aria-label={t.filterDoctorLabel}>
                    {doctorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={doctorFilter === option.value}
                        className={`doctor-admin__filter-option ${
                          doctorFilter === option.value ? "doctor-admin__filter-option--active" : ""
                        }`}
                        onClick={() => {
                          setDoctorFilter(option.value);
                          setOpenFilterMenu(null);
                        }}
                      >
                        <span>{option.label}</span>
                        {doctorFilter === option.value ? <Check size={15} /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
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
        ) : null}

        {isOverviewSection && showEmptyDashboard ? (
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

        {isOverviewSection ? (
        <section className="doctor-admin__metrics doctor-admin__metrics--admin">
          {isInitialLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <article className="doctor-admin__metric doctor-admin__metric--admin doctor-admin__metric--loading" key={`metric-skeleton-${index}`}>
                  <span className="doctor-admin__skeleton doctor-admin__skeleton--label" aria-hidden="true" />
                  <strong className="doctor-admin__skeleton doctor-admin__skeleton--value" aria-hidden="true" />
                  <small className="doctor-admin__skeleton doctor-admin__skeleton--meta" aria-hidden="true" />
                </article>
              ))
            : metricCards.map((metric) => (
                <article className="doctor-admin__metric doctor-admin__metric--admin" key={metric.key}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small className={metric.tone === "red" ? "doctor-admin__red" : "doctor-admin__green"}>
                    {metric.delta}
                  </small>
                </article>
              ))}
        </section>
        ) : null}

        {isOverviewSection && unassignedItems.length > 0 ? (
          <section className="doctor-admin__panel" style={{ marginBottom: 0 }} id="requests">
            <div className="doctor-admin__panel-head doctor-admin__panel-head--requests">
              <div className="doctor-admin__panel-title-row">
                <h2>{t.requestsTitle}</h2>
                <span className="doctor-admin__panel-count doctor-admin__panel-count--amber">
                  {unassignedItems.length}
                </span>
              </div>
              <p className="doctor-admin__panel-subtitle">{t.requestsSubtitle}</p>
            </div>
            <div className="doctor-admin__record-list">
              {unassignedItems.map((item) => {
                const name = patientLabel(item, t.patientFallback, patients);
                const isOnline = isOnlineConsultation(item);
                const isWardOnline = isWardOnlineRequest(item);
                const busyIds = getBusyDoctorIds(item.date, items);
                const freeDocs = doctors.filter((d) => !busyIds.has(d.id));
                const specialtyNeeded = item.specialty_request || item.specialtyRequest;
                const recommended = recommendSpecialist(item.reason);
                const wardMeta = isWardOnline
                  ? [readWardLabel(item), readBedLabel(item)].filter(Boolean).join(" · ")
                  : "";

                return (
                  <div className="doctor-admin__record doctor-admin__record--request" key={`req-${item.id}`}>
                    {/* Row 1: Avatar + Name */}
                    <div className="doctor-admin__req-header">
                      <AvatarCircle
                        name={name}
                        src={appointmentAvatar(item)}
                        size={44}
                        className="doctor-admin__mini-avatar"
                        alt={name}
                      />
                      <strong className="doctor-admin__req-name">{name}</strong>
                    </div>
                    {/* Row 2: Tags */}
                    <div className="doctor-admin__online-tags doctor-admin__req-tags">
                      {specialtyNeeded ? (
                        <span className="doctor-admin__online-tag doctor-admin__online-tag--violet">
                          {specialtyNeeded}
                        </span>
                      ) : null}
                      <span className={`doctor-admin__online-tag ${isOnline ? "doctor-admin__online-tag--cyan" : ""}`}>
                        {isOnline ? consultationModeLabel(item, locale) : "Очный приём"}
                      </span>
                      {wardMeta ? (
                        <span className="doctor-admin__online-tag">
                          {wardMeta}
                        </span>
                      ) : null}
                      <span className="doctor-admin__online-tag doctor-admin__online-tag--green">
                        Рекомендуем: {recommended.specialty}
                      </span>
                      <span className={`doctor-admin__online-tag ${freeDocs.length > 0 ? "doctor-admin__online-tag--green" : ""}`}>
                        {freeDocs.length > 0 ? `✓ ${freeDocs.length} свободн.` : "⚠ Все заняты"}
                      </span>
                    </div>
                    {/* Row 3: Complaint */}
                    {item.reason ? (
                      <div className="doctor-admin__record-complaint">
                        <span className="doctor-admin__record-complaint-label">Жалоба</span>
                        <small className="doctor-admin__record-note doctor-admin__record-note--plain">{item.reason}</small>
                      </div>
                    ) : null}
                    {/* Row 4: Date + Button */}
                    <div className="doctor-admin__req-footer">
                      <span className="doctor-admin__req-datetime">
                        {item.date} · {item.time || t.timeMissing}
                      </span>
                      <button
                        className="doctor-admin__action-btn doctor-admin__action-btn--primary"
                        type="button"
                        onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                      >
                        {t.actionAccept}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {isOverviewSection && inProgressItems.length > 0 && (
          <section className="doctor-admin__panel" style={{ marginBottom: 0 }} id="in-progress">
            <div className="doctor-admin__panel-head">
              <div>
                <h2>В работе</h2>
                <p className="doctor-admin__panel-subtitle">Врач назначен — нажмите «Завершить», чтобы подтвердить запись.</p>
              </div>
              <span className="doctor-admin__panel-count doctor-admin__panel-count--cyan">
                {inProgressItems.length}
              </span>
            </div>
            <div className="doctor-admin__record-list">
              {inProgressItems.map((item) => {
                const name = patientLabel(item, t.patientFallback, patients);
                const isOnline = isOnlineConsultation(item);
                return (
                  <div className="doctor-admin__record doctor-admin__record--progress" key={`prog-${item.id}`}>
                    <div className="doctor-admin__record-date">
                      <strong>{item.date}</strong>
                      <span>{item.time || t.timeMissing}</span>
                    </div>
                    <AvatarCircle
                      name={name}
                      src={appointmentAvatar(item)}
                      size={48}
                      className="doctor-admin__mini-avatar"
                      alt={name}
                    />
                    <div className="doctor-admin__record-main">
                      <strong>{name}</strong>
                      <div className="doctor-admin__online-tags">
                        {isOnline ? (
                          <span className="doctor-admin__online-tag doctor-admin__online-tag--cyan">
                            Онлайн
                          </span>
                        ) : (
                          <span className="doctor-admin__online-tag doctor-admin__online-tag--violet">
                            Офлайн
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="doctor-admin__record-actions">
                      <button
                        className="doctor-admin__action-btn doctor-admin__action-btn--secondary"
                        type="button"
                        onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                      >
                        {t.actionEdit}
                      </button>
                      <button
                        className="doctor-admin__action-btn doctor-admin__action-btn--primary"
                        type="button"
                        onClick={() => void changeStatus(item.id, "active")}
                      >
                        {t.actionComplete}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {isOverviewSection ? (
          <section className="doctor-admin__panel doctor-admin__overview-summary">
            <div className="doctor-admin__panel-head">
              <div>
                <h2>{t.overviewQuickTitle}</h2>
                <p className="doctor-admin__panel-subtitle">{t.overviewQuickSubtitle}</p>
              </div>
            </div>
            <div className="doctor-admin__overview-links">
              {overviewSummaryCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className="doctor-admin__overview-link"
                  onClick={() => openSection(card.section)}
                >
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.hint}</small>
                  <em>{t.openSection}</em>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {isScheduleSection || isPatientsSection ? (
        <section className="doctor-admin__content">
          {isScheduleSection ? (
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
                <>
                  {(scheduleShowAll ? visibleItems : visibleItems.slice(0, 3)).map((item) => {
                    const name = patientLabel(item, t.patientFallback, patients);
                    const isPendingUnassigned = item.status === "pending" && !hasAssignedDoctor(item);

                    return (
                      <div className="doctor-admin__appointment" key={item.id}>
                        <time>{item.time}</time>
                        <AvatarCircle
                          name={name}
                          src={appointmentAvatar(item)}
                          size={48}
                          className="doctor-admin__mini-avatar"
                          alt={name}
                        />
                        <div className="doctor-admin__appointment-main">
                          <strong>{name}</strong>
                          <span>{item.reason || t.appointmentFallback}</span>
                          <div className="doctor-admin__online-tags">
                            {(item.specialty_request || item.specialtyRequest) ? (
                              <span className="doctor-admin__online-tag doctor-admin__online-tag--violet">
                                {item.specialty_request || item.specialtyRequest}
                              </span>
                            ) : null}
                            {readRoomLabel(item) ? (
                              <span className="doctor-admin__online-tag">
                                {readRoomLabel(item)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="doctor-admin__appointment-actions">
                          <span className={`doctor-admin__status doctor-admin__status--${statusTone(item.status)}`}>
                            {statusLabel(item.status, locale)}
                          </span>
                          {isPendingUnassigned ? (
                            <span className="doctor-admin__appointment-note">Откройте заявку выше</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {visibleItems.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setScheduleShowAll(!scheduleShowAll)}
                      className="doctor-admin__show-more"
                    >
                      {scheduleShowAll ? "Свернуть" : `Показать ещё ${visibleItems.length - 3}`}
                    </button>
                  )}
                </>
              )}
            </div>
          </article>
          ) : null}

          {isPatientsSection ? (
          <article className="doctor-admin__panel doctor-admin__patients" id="patients">
            <div className="doctor-admin__panel-head doctor-admin__panel-head--row">
              <h2>{t.latestPatients}</h2>
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
                      <AvatarCircle
                        name={name}
                        src={resolveAvatarUrl(
                          {
                            id: patient.id,
                            email: patient.email,
                            role: "patient",
                            picture: patient.picture || null,
                          },
                          { patientFallback: true },
                        )}
                        size={48}
                        className="doctor-admin__mini-avatar doctor-admin__mini-avatar--soft"
                        alt={name}
                      />
                      <div>
                        <strong>{name}</strong>
                        <span>
                          {patient.email || t.noEmail} • {appointmentCountLabel(locale, patient.appointment_count)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
          ) : null}
        </section>
        ) : null}

        {isAppointmentsSection ? (
        <section className="doctor-admin__panel doctor-admin__online-consults" id="online-consults">
          <div className="doctor-admin__panel-head">
            <div>
              <h2>{t.onlineConsultsTitle}</h2>
              <p className="doctor-admin__panel-subtitle">{t.onlineConsultsSubtitle}</p>
            </div>
            <div className="doctor-admin__panel-head-actions">
              {onlineItems.length > 0 ? <span>{onlineItems.length}</span> : null}
            </div>
          </div>

          <div className="doctor-admin__record-list">
            {isInitialLoading ? (
              <div className="doctor-admin__panel-loading" aria-live="polite">
                <LoaderCircle className="doctor-admin__spin" size={18} />
                {t.loading}
              </div>
            ) : onlineItems.length === 0 ? (
              <p className="doctor-admin__empty">{t.noOnlineConsults}</p>
            ) : (
              onlineItems.map((item) => {
                const name = patientLabel(item, t.patientFallback, patients);
                const assigned = hasAssignedDoctor(item);
                const isHomeOnline = isHomeOnlineConsultation(item);
                const meetingAt = item.meeting_at || item.meetingAt || `${item.date}T${item.time || "00:00"}:00`;
                const notified = item.meeting_notified ?? item.meetingNotified;
                const specialty = item.specialty_request || item.specialtyRequest;
                const roomLabel = readRoomLabel(item);
                const statusTone =
                  item.status === "active" ? "ok" : item.status === "done" ? "green" : assigned ? "green" : "amber";
                const statusLabelText =
                  item.status === "active"
                    ? t.statusOnline
                    : item.status === "done"
                      ? t.statusConfirmed
                      : assigned
                        ? t.onlineScheduled
                        : t.statusWaiting;

                return (
                  <div className="doctor-admin__record doctor-admin__record--online" key={`${item.id}-online`}>
                    <div className="doctor-admin__record-date">
                      <strong>{item.date}</strong>
                      <span>{item.time || t.timeMissing}</span>
                    </div>
                    <AvatarCircle
                      name={name}
                      src={appointmentAvatar(item)}
                      size={48}
                      className="doctor-admin__mini-avatar"
                      alt={name}
                    />
                    <div className="doctor-admin__record-main">
                      <strong className="doctor-admin__record-title">{name}</strong>
                      <span className="doctor-admin__record-subtitle">
                        {assigned ? doctorLabel(item, doctors, t.doctorFallback) : t.doctorMissing}
                      </span>
                      <div className="doctor-admin__online-tags doctor-admin__online-tags--aligned">
                        <span className="doctor-admin__online-tag doctor-admin__online-tag--cyan">
                          {consultationModeLabel(item, locale)}
                        </span>
                        {specialty ? (
                          <span className="doctor-admin__online-tag doctor-admin__online-tag--violet">
                            {specialty}
                          </span>
                        ) : null}
                        {roomLabel ? (
                          <span className="doctor-admin__online-tag">
                            {roomLabel}
                          </span>
                        ) : null}
                        {assigned && isHomeOnline ? (
                          <span className="doctor-admin__online-tag doctor-admin__online-tag--green">
                            {notified ? t.linkSent : t.linkSaved}
                          </span>
                        ) : null}
                      </div>
                      <small className="doctor-admin__record-note doctor-admin__record-note--plain">
                        {item.reason || t.appointmentFallback}
                      </small>
                      {assigned ? (
                        <small className="doctor-admin__record-meta">
                          {formatDateTime(meetingAt, locale)}
                        </small>
                      ) : null}
                    </div>
                    <div className="doctor-admin__record-actions">
                      <span className={`doctor-admin__status doctor-admin__status--${statusTone}`}>
                        {statusLabelText}
                      </span>
                      <button
                        className="doctor-admin__action-btn doctor-admin__action-btn--secondary"
                        type="button"
                        onClick={() => void changeStatus(item.id, "done")}
                        disabled={item.status === "done"}
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
        ) : null}

        {isAppointmentsSection ? (
        <section className="doctor-admin__panel doctor-admin__records" id="appointments">
          <div className="doctor-admin__panel-head">
            <div>
              <h2>{t.allAppointments}</h2>
              <p className="doctor-admin__panel-subtitle">{t.recordsSubtitle}</p>
            </div>
            {completedItems.length > 0 ? <span>{completedItems.length}</span> : null}
          </div>

          <div className="doctor-admin__record-list">
            {isInitialLoading ? (
              <div className="doctor-admin__panel-loading" aria-live="polite">
                <LoaderCircle className="doctor-admin__spin" size={18} />
                {t.loading}
              </div>
            ) : completedItems.length === 0 ? (
              <p className="doctor-admin__empty">{t.noRecords}</p>
            ) : (
              <>
              {(completedShowAll ? completedItems : completedItems.slice(0, 3)).map((item) => {
                const name = patientLabel(item, t.patientFallback, patients);
                const isOnline = isOnlineConsultation(item);
                const docId = item.doctor_id || item.doctorId;
                const hasDoctor = Boolean(docId) && docId !== "pending";
                const isHomeOnline = isHomeOnlineConsultation(item);
                const isWardOnline = isWardOnlineRequest(item);
                const isScheduledOnline = isOnline && hasDoctor && item.status === "pending";
                const roomLabel = readRoomLabel(item);
                const wardMeta = isWardOnline
                  ? [readWardLabel(item), readBedLabel(item)].filter(Boolean).join(" · ")
                  : "";

                return (
                  <div className="doctor-admin__record" key={`${item.id}-record`}>
                    <div className="doctor-admin__record-date">
                      <strong>{item.date}</strong>
                      <span>{item.time || "—"}</span>
                    </div>
                    <AvatarCircle
                      name={name}
                      src={appointmentAvatar(item)}
                      size={48}
                      className="doctor-admin__mini-avatar"
                      alt={name}
                    />
                    <div className="doctor-admin__record-main">
                      <strong>{name}</strong>
                      {hasDoctor
                        ? <span>{doctorLabel(item, doctors, t.doctorFallback)}</span>
                        : <span style={{ color: "#f59e0b", fontSize: 12 }}>⚠ Врач не назначен</span>
                      }
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                        {isOnline ? (
                          <span style={{
                            background: "rgba(34,211,238,0.15)", color: "#22d3ee",
                            borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                          }}>
                            {consultationModeLabel(item, locale)}
                          </span>
                        ) : null}
                        {wardMeta ? (
                          <span style={{
                            background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)",
                            borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 600,
                          }}>
                            {wardMeta}
                          </span>
                        ) : null}
                        {roomLabel ? (
                          <span style={{
                            background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)",
                            borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 600,
                          }}>
                            {roomLabel}
                          </span>
                        ) : null}
                        {(item.specialty_request || item.specialtyRequest) ? (
                          <span style={{
                            background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
                            borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 700,
                          }}>
                            {item.specialty_request || item.specialtyRequest}
                          </span>
                        ) : null}
                      </div>
                      <small>{item.reason || t.appointmentFallback}</small>
                    </div>
                    <div className="doctor-admin__record-actions">
                      {isWardOnline ? (
                        <button
                          className="doctor-admin__action-btn doctor-admin__action-btn--secondary"
                          type="button"
                          onClick={() => nav("/admin/ward-consults")}
                        >
                          {t.openWardBoardSingle}
                        </button>
                      ) : null}
                      {item.status === "pending" && !hasDoctor && (
                        <button
                          className="doctor-admin__action-btn doctor-admin__action-btn--primary"
                          type="button"
                          onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                        >
                          {t.actionAccept}
                        </button>
                      )}
                      {(item.status === "active" || item.status === "done" || isScheduledOnline) && (
                        <button
                          className="doctor-admin__action-btn doctor-admin__action-btn--secondary"
                          type="button"
                          onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                        >
                          {t.actionEdit}
                        </button>
                      )}
                      <button
                        className="doctor-admin__action-btn doctor-admin__action-btn--secondary"
                        type="button"
                        onClick={() => changeStatus(item.id, "done")}
                        disabled={item.status !== "active"}
                      >
                        {t.actionComplete}
                      </button>
                    </div>
                  </div>
                );
              })}
              {completedItems.length > 3 && (
                <button
                  type="button"
                  onClick={() => setCompletedShowAll(!completedShowAll)}
                  className="doctor-admin__show-more"
                >
                  {completedShowAll ? "Свернуть" : `Показать все (${completedItems.length})`}
                </button>
              )}
              </>
            )}
          </div>
        </section>
        ) : null}


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

      <AdminMobileNav
        activeItem={activeSection === "overview" ? "dashboard" : "more"}
        wardBadge={wardRequestCount}
        onDashboardClick={() => setActiveSection("overview")}
      />
      <ProfileAvatarDialog
        open={profileOpen}
        user={user}
        onClose={() => setProfileOpen(false)}
        onSaved={(next) => setUser(next)}
      />
    </div>
  );
}
