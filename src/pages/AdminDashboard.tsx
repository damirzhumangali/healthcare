import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Cpu,
  House,
  LayoutDashboard,
  LayoutGrid,
  LoaderCircle,
  MonitorSmartphone,
  Settings,
  SlidersHorizontal,
  Users,
  Video,
} from "lucide-react";
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
  fetchAdminDoctors,
  fetchAdminPatients,
  fetchAdminSummary,
  type AdminPatient,
  type AdminSummary,
} from "../lib/apiAdmin";
import { isAdminAccount } from "../lib/adminAccess";
import { API_URL, BMO_SETTINGS_URL } from "../lib/apiBase";
import { getToken, hasSession, setCurrentUser, setToken } from "../lib/auth";
import {
  isHomeOnlineConsultation,
  isOnlineConsultation,
  readRoomLabel,
  isWardOnlineConsultation,
  readBedLabel,
  readWardLabel,
} from "../lib/consultationMode";
import { APP_LOCALES, readStoredLocale, writeStoredLocale, type AppLocale } from "../lib/locale";
import { usePageSeo } from "../lib/seo";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
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
    actionEdit: "Изменить",
    actionComplete: "Завершить",
    newAppointment: "Новая запись",
    accessDenied: "Нет доступа",
    accessDeniedText: "Для админ-панели нужна роль admin.",
    loadError: "Не удалось загрузить админ-данные. Проверь backend и VITE_API_BASE_URL.",
    statusUpdateError: "Не удалось изменить статус записи.",
    serverAuthError:
      "Локальный email/пароль вход работает только как demo. Войдите через Google с админ-почтой для доступа к данным сервера.",
    patientFallback: "Пациент",
    doctorFallback: "Врач",
    appointmentFallback: "Прием",
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
    onlineConsultsTitle: "Онлайн-консультации",
    onlineConsultsSubtitle: "После назначения врача и времени ссылка Jitsi сразу сохраняется и отправляется пациенту и врачу.",
    noOnlineConsults: "Пока нет онлайн-заявок или назначенных онлайн-консультаций.",
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
    actionEdit: "Өзгерту",
    actionComplete: "Аяқтау",
    newAppointment: "Жаңа жазылу",
    accessDenied: "Қол жеткізу жоқ",
    accessDeniedText: "Әкімші панелі үшін admin рөлі қажет.",
    loadError: "Әкімші деректерін жүктеу мүмкін болмады. Backend пен VITE_API_BASE_URL тексеріңіз.",
    statusUpdateError: "Жазылу мәртебесін өзгерту мүмкін болмады.",
    serverAuthError:
      "Жергілікті email/құпиясөз кіруі тек demo режимінде. Сервер деректерін көру үшін Google арқылы әкімші поштасымен кіріңіз.",
    patientFallback: "Пациент",
    doctorFallback: "Дәрігер",
    appointmentFallback: "Қабылдау",
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
    onlineConsultsTitle: "Онлайн кеңестер",
    onlineConsultsSubtitle: "Дәрігер мен уақыт тағайындалған соң, Jitsi сілтемесі бірден сақталып, пациент пен дәрігерге жіберіледі.",
    noOnlineConsults: "Әзірге онлайн өтінімдер немесе тағайындалған онлайн кеңестер жоқ.",
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
    actionEdit: "Edit",
    actionComplete: "Complete",
    newAppointment: "New appointment",
    accessDenied: "Access denied",
    accessDeniedText: "The admin panel requires the admin role.",
    loadError: "Could not load admin data. Check the backend and VITE_API_BASE_URL.",
    statusUpdateError: "Could not change the appointment status.",
    serverAuthError:
      "Local email/password login works only as a demo. Sign in with Google using an admin email to access backend data.",
    patientFallback: "Patient",
    doctorFallback: "Doctor",
    appointmentFallback: "Appointment",
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
    onlineConsultsTitle: "Online consultations",
    onlineConsultsSubtitle: "Once a doctor and time are assigned, the Jitsi link is stored immediately and sent to both patient and doctor.",
    noOnlineConsults: "No online requests or scheduled online consultations yet.",
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
  // Direct name fields win — they come from enrichment or the original booking
  if (item.patientName) return item.patientName;
  if (item.patient_name) return item.patient_name;

  const pid = item.patient_id || item.patientId || item.patient_email || item.patientEmail || "";
  const fromPatients = patients.find(
    (p) => p.id === pid || p.email === pid || p.email === item.patient_email || p.email === item.patientEmail
  );
  const idTail = String(pid).slice(-4);
  // Skip auto-generated fallback names that look like "Пациент XXXX"
  const fromPatientName = fromPatients?.name && !/^Пациент\s+\S+$/.test(fromPatients.name)
    ? fromPatients.name
    : undefined;
  return (
    fromPatientName ||
    item.patient_email ||
    item.patientEmail ||
    (idTail ? `${fallback} ${idTail}` : fallback)
  );
}

function doctorLabel(item: Appointment, doctors: DoctorOption[], fallback: string) {
  const doctorId = item.doctor_id || item.doctorId;
  const doctor = doctors.find((doctorItem) => doctorItem.id === doctorId);
  const raw = item.doctorName || (doctor ? `${doctor.name} — ${doctor.specialty}` : doctorId) || fallback;
  return raw.replace(/^Др\.\s*/i, "");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
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
  return isWardOnlineConsultation(item) ? t.modeOnlineWard : t.modeOnlineHome;
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
  const user = useMemo(() => readCurrentUser(), []);
  const allowed = isAdminAccount(user) || isLocalDemoHost();
  const [locale, setLocale] = useState<Locale>(() => readStoredLocale());
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

  const t = adminText[locale];
  const displayName = user?.name || user?.email || t.defaultAdminName;
  const navItems = [
    { id: "overview", label: t.navDashboard, icon: LayoutDashboard },
    { id: "schedule", label: t.navSchedule, icon: CalendarClock },
    { id: "appointments", label: t.navAppointments, icon: ClipboardList },
    { id: "patients", label: t.navPatients, icon: Users },
  ] as const;

  const aimarNavItem = { id: "aimar", label: t.navAimar, icon: Cpu };

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

  const unassignedItems = useMemo(
    () => allItems.filter((item) => item.status === "pending" && !hasAssignedDoctor(item)),
    [allItems]
  );
  const inProgressItems = useMemo(
    () => allItems.filter((item) => item.status === "pending" && hasAssignedDoctor(item)),
    [allItems]
  );
  const completedItems = useMemo(
    () => allItems
      .filter((item) => item.status === "active" || item.status === "done")
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
    [allItems]
  );
  const onlineItems = useMemo(
    () =>
      allItems
        .filter((item) => isOnlineConsultation(item))
        .sort((a, b) => {
          const byDate = a.date.localeCompare(b.date);
          return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
        }),
    [allItems],
  );
  const visibleItems = filteredItems;
  const visiblePatients =
    patients.length > 0
      ? patients
      : visibleItems.map((item) => ({
          id: item.patient_id || item.patientId || item.id,
          email: item.patient_email || item.patientEmail || null,
          name: patientLabel(item, t.patientFallback, patients),
          role: "patient",
          last_appointment_at: item.created_at || item.createdAt || null,
          appointment_count: 1,
        }));

  const stats = useMemo(() => {
    return {
      today: summary?.appointmentsToday ?? visibleItems.length,
      patients: summary?.patients ?? visiblePatients.length,
      pending:
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
    patients.length === 0;
  const showEmptyDashboard =
    !isInitialLoading &&
    !loading &&
    visibleItems.length === 0 &&
    patients.length === 0 &&
    (summary?.appointmentsToday ?? 0) === 0 &&
    (summary?.patients ?? 0) === 0 &&
    (summary?.pending ?? 0) === 0 &&
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

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    writeStoredLocale(nextLocale);
  }

  function copyMeetingLink(url: string) {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(url);
  }

  useEffect(() => {
    if (allowed) {
      pingBackend(); // warm up Render backend before patient requests arrive
      void load();
    }
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
            Онлайн в палатах
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

        {unassignedItems.length > 0 ? (
          <section className="doctor-admin__panel" style={{ marginBottom: 0 }} id="requests">
            <div className="doctor-admin__panel-head">
              <div>
                <h2>{t.requestsTitle}</h2>
                <p className="doctor-admin__panel-subtitle">{t.requestsSubtitle}</p>
              </div>
              <span style={{
                background: "rgba(251,191,36,0.18)", color: "#f59e0b",
                borderRadius: 20, padding: "2px 12px", fontSize: 13, fontWeight: 700,
              }}>
                {unassignedItems.length}
              </span>
            </div>
            <div className="doctor-admin__record-list">
              {unassignedItems.map((item) => {
                const name = patientLabel(item, t.patientFallback, patients);
                const isOnline = isOnlineConsultation(item);
                const isWardOnline = isWardOnlineConsultation(item);
                const busyIds = getBusyDoctorIds(item.date, items);
                const freeDocs = doctors.filter((d) => !busyIds.has(d.id));
                const specialtyNeeded = item.specialty_request || item.specialtyRequest;
                const wardMeta = isWardOnline
                  ? [readWardLabel(item), readBedLabel(item)].filter(Boolean).join(" · ")
                  : "";

                return (
                  <div
                    key={`req-${item.id}`}
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(251,191,36,0.25)",
                      borderLeft: "4px solid #f59e0b",
                      background: "rgba(251,191,36,0.04)",
                      padding: "14px 18px",
                      display: "flex", alignItems: "center", gap: 14,
                    }}
                  >
                    <div className="doctor-admin__mini-avatar" style={{ flexShrink: 0 }}>{initials(name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                        {specialtyNeeded ? (
                          <span style={{ background: "rgba(99,102,241,0.18)", color: "#a5b4fc", borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
                            {specialtyNeeded}
                          </span>
                        ) : null}
                        {isOnline ? (
                          <span style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee", borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
                            {consultationModeLabel(item, locale)}
                          </span>
                        ) : null}
                        {wardMeta ? (
                          <span style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 600 }}>
                            {wardMeta}
                          </span>
                        ) : null}
                        <span style={{ fontSize: 12, color: freeDocs.length > 0 ? "#34d399" : "#f59e0b" }}>
                          {freeDocs.length > 0 ? `✓ ${freeDocs.length} свободн.` : "⚠ Все заняты"}
                        </span>
                      </div>
                      {item.reason ? (
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.reason}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                        style={{
                          background: "linear-gradient(135deg, #34d399, #22d3ee)",
                          color: "#0a1628", border: "none",
                          borderRadius: 9, padding: "7px 18px",
                          fontWeight: 800, cursor: "pointer", fontSize: 13,
                        }}
                      >
                        {t.actionAccept}
                      </button>
                      <button
                        type="button"
                        disabled
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 9, padding: "7px 18px",
                          fontWeight: 700, cursor: "not-allowed", fontSize: 13,
                        }}
                      >
                        {t.actionComplete}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {inProgressItems.length > 0 && (
          <section className="doctor-admin__panel" style={{ marginBottom: 0 }} id="in-progress">
            <div className="doctor-admin__panel-head">
              <div>
                <h2>В работе</h2>
                <p className="doctor-admin__panel-subtitle">Врач назначен — нажмите «Завершить», чтобы подтвердить запись.</p>
              </div>
              <span style={{
                background: "rgba(34,211,238,0.18)", color: "#22d3ee",
                borderRadius: 20, padding: "2px 12px", fontSize: 13, fontWeight: 700,
              }}>
                {inProgressItems.length}
              </span>
            </div>
            <div className="doctor-admin__record-list">
              {inProgressItems.map((item) => {
                const name = patientLabel(item, t.patientFallback, patients);
                const isOnline = isOnlineConsultation(item);
                return (
                  <div
                    key={`prog-${item.id}`}
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(34,211,238,0.25)",
                      borderLeft: "4px solid #22d3ee",
                      background: "rgba(34,211,238,0.04)",
                      padding: "12px 18px",
                      display: "flex", alignItems: "center", gap: 14,
                    }}
                  >
                    <div className="doctor-admin__mini-avatar" style={{ flexShrink: 0 }}>{initials(name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                        {doctorLabel(item, doctors, t.doctorFallback)}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }}>
                        {isOnline ? (
                          <span style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee", borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
                            Онлайн
                          </span>
                        ) : (
                          <span style={{ background: "rgba(129,140,248,0.15)", color: "#c4b5fd", borderRadius: 6, padding: "2px 9px", fontSize: 12, fontWeight: 700 }}>
                            Офлайн
                          </span>
                        )}
                        {item.date ? (
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                            {item.date}{item.time && item.time !== "00:00" ? ` · ${item.time}` : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 9, padding: "7px 16px",
                          fontWeight: 700, cursor: "pointer", fontSize: 13,
                        }}
                      >
                        {t.actionEdit}
                      </button>
                      <button
                        type="button"
                        onClick={() => void changeStatus(item.id, "active")}
                        style={{
                          background: "linear-gradient(135deg, #34d399, #22d3ee)",
                          color: "#0a1628", border: "none",
                          borderRadius: 9, padding: "7px 18px",
                          fontWeight: 800, cursor: "pointer", fontSize: 13,
                        }}
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
                <>
                  {(scheduleShowAll ? visibleItems : visibleItems.slice(0, 3)).map((item) => {
                    const name = patientLabel(item, t.patientFallback, patients);
                    const isPendingUnassigned = item.status === "pending" && !hasAssignedDoctor(item);

                    return (
                      <div className="doctor-admin__appointment" key={item.id}>
                        <time>{item.time}</time>
                        <div className="doctor-admin__mini-avatar">{initials(name)}</div>
                        <div className="doctor-admin__appointment-main">
                          <strong>{name}</strong>
                          <span>{item.reason || t.appointmentFallback}</span>
                        </div>
                        <span className={`doctor-admin__status doctor-admin__status--${statusTone(item.status)}`}>
                          {statusLabel(item.status, locale)}
                        </span>
                        {isPendingUnassigned && (
                          <button
                            onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                            style={{
                              padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                              background: "linear-gradient(135deg, #34d399, #10b981)",
                              color: "#0a0f1a", fontWeight: 700, fontSize: 12,
                            }}
                          >
                            {t.actionAccept}
                          </button>
                        )}
                        {item.status !== "done" && (
                          <button
                            disabled={isPendingUnassigned}
                            onClick={() => void changeStatus(item.id, "done")}
                            style={{
                              padding: "4px 12px", borderRadius: 6, border: "none", cursor: isPendingUnassigned ? "not-allowed" : "pointer",
                              background: isPendingUnassigned ? "rgba(255,255,255,0.06)" : "rgba(52,211,153,0.15)",
                              color: isPendingUnassigned ? "rgba(255,255,255,0.25)" : "#34d399",
                              fontWeight: 700, fontSize: 12,
                            }}
                          >
                            {t.actionComplete}
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {visibleItems.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setScheduleShowAll(!scheduleShowAll)}
                      style={{
                        width: "100%", padding: "8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)",
                        cursor: "pointer", fontSize: 13, marginTop: 4,
                      }}
                    >
                      {scheduleShowAll ? "Свернуть" : `Показать ещё ${visibleItems.length - 3}`}
                    </button>
                  )}
                </>
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
                const isWardOnline = isWardOnlineConsultation(item);
                const meetingUrl = isHomeOnline ? item.meeting_url || jitsiRoomUrl(item.id) : "";
                const meetingAt = item.meeting_at || item.meetingAt || `${item.date}T${item.time || "00:00"}:00`;
                const notified = item.meeting_notified ?? item.meetingNotified;
                const specialty = item.specialty_request || item.specialtyRequest;
                const roomLabel = readRoomLabel(item);
                const wardMeta = isWardOnline
                  ? [readWardLabel(item), readBedLabel(item)].filter(Boolean).join(" · ")
                  : "";
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
                  <div className="doctor-admin__record" key={`${item.id}-online`}>
                    <div className="doctor-admin__record-date">
                      <strong>{item.date}</strong>
                      <span>{item.time || t.timeMissing}</span>
                    </div>
                    <div className="doctor-admin__mini-avatar">{initials(name)}</div>
                    <div className="doctor-admin__record-main">
                      <strong>{name}</strong>
                      <span>
                        {assigned ? doctorLabel(item, doctors, t.doctorFallback) : t.doctorMissing}
                      </span>
                      <div className="doctor-admin__online-tags">
                        <span className="doctor-admin__online-tag doctor-admin__online-tag--cyan">
                          {consultationModeLabel(item, locale)}
                        </span>
                        {specialty ? (
                          <span className="doctor-admin__online-tag doctor-admin__online-tag--violet">
                            {specialty}
                          </span>
                        ) : null}
                        {wardMeta ? (
                          <span className="doctor-admin__online-tag">
                            {wardMeta}
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
                      <small>{item.reason || t.appointmentFallback}</small>
                      {assigned ? (
                        <small className="doctor-admin__online-meta">
                          {formatDateTime(meetingAt, locale)}
                        </small>
                      ) : null}
                    </div>
                    <div className="doctor-admin__record-actions">
                      <span className={`doctor-admin__status doctor-admin__status--${statusTone}`}>
                        {statusLabelText}
                      </span>
                      {!assigned ? (
                        <button
                          type="button"
                          onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                        >
                          {t.actionAccept}
                        </button>
                      ) : (
                        <>
                          {isHomeOnline ? (
                            <>
                              <a
                                href={meetingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="doctor-admin__online-link"
                              >
                                <Video size={13} />
                                {t.startMeeting}
                              </a>
                              <button type="button" onClick={() => copyMeetingLink(meetingUrl)}>
                                {t.copyLink}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => nav("/admin/ward-consults")}
                            >
                              {t.openWardBoardSingle}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                          >
                            {t.actionEdit}
                          </button>
                        </>
                      )}
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
                const isWardOnline = isWardOnlineConsultation(item);
                const meetingUrl = isHomeOnline ? item.meeting_url || jitsiRoomUrl(item.id) : "";
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
                    <div className="doctor-admin__mini-avatar">{initials(name)}</div>
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
                      {isHomeOnline && meetingUrl ? (
                        <a
                          href={meetingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="doctor-admin__online-link"
                        >
                          <Video size={13} />
                          {t.startMeeting}
                        </a>
                      ) : isWardOnline ? (
                        <button
                          type="button"
                          onClick={() => nav("/admin/ward-consults")}
                        >
                          {t.openWardBoardSingle}
                        </button>
                      ) : null}
                      {item.status === "pending" && !hasDoctor && (
                        <button
                          type="button"
                          onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                          style={{
                            background: "linear-gradient(135deg, #34d399, #22d3ee)",
                            color: "#0a1628", border: "none",
                            borderRadius: 8, padding: "6px 16px",
                            fontWeight: 800, cursor: "pointer", fontSize: 13,
                          }}
                        >
                          {t.actionAccept}
                        </button>
                      )}
                      {(item.status === "active" || item.status === "done" || isScheduledOnline) && (
                        <button
                          type="button"
                          onClick={() => nav(`/admin/request/${item.id}`, { state: { appointment: item } })}
                          style={{
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.15)",
                            borderRadius: 8, padding: "6px 16px",
                            fontWeight: 700, cursor: "pointer", fontSize: 13,
                          }}
                        >
                          {t.actionEdit}
                        </button>
                      )}
                      <button
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
                  style={{
                    width: "100%", padding: "9px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)",
                    cursor: "pointer", fontSize: 13, marginTop: 4,
                  }}
                >
                  {completedShowAll ? "Свернуть" : `Показать все (${completedItems.length})`}
                </button>
              )}
              </>
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
        <button
          className="doctor-admin__mobile-nav-item"
          type="button"
          onClick={() => nav("/admin/aimar")}
        >
          <Cpu size={18} />
          <span>{aimarNavItem.label}</span>
        </button>
      </nav>
    </div>
  );
}
