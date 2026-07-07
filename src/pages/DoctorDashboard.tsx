import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  BedDouble,
  Bot,
  CalendarClock,
  CircleUserRound,
  House,
  LayoutDashboard,
  Loader2,
  LogOut,
  Monitor,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import AvatarCircle from "../components/AvatarCircle";
import DayDateNavigator, { getTodayDateInput } from "../components/DayDateNavigator";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ProfileAvatarDialog from "../components/ProfileAvatarDialog";
import {
  fetchDoctors,
  fetchDoctorSchedule,
  readCachedAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../lib/apiAppointments";
import {
  isHomeOnlineConsultation,
  isWardOnlineRequest,
  isWardOnlineConsultation,
  readRoomLabel,
} from "../lib/consultationMode";
import { hasSession, clearStoredSession, SESSION_USER_UPDATED_EVENT } from "../lib/auth";
import { getGoogleAuthUrl } from "../lib/apiAuth";
import { resolveAvatarUrl } from "../lib/avatar";
import {
  buildAimarMeasurementCommandContext,
  canRunAimarMeasurement,
  dispatchAimarMeasurementCommand,
  dispatchAimarMeasurementResult,
  getAimarMeasurementDisabledReason,
  resolveAimarMeasurementValues,
  type AimarMeasurementState,
} from "../lib/aimarMeasurement";
import {
  formatMeasurementDateTime,
  formatMeasurementValue,
  listPatientMeasurements,
  measurementMetricLabel,
  measurementSourceLabel,
  PATIENT_MEASUREMENTS_UPDATED_EVENT,
  recordPatientVitals,
} from "../lib/patientMeasurements";
import {
  listAllBedsideConsultations,
  setRealVitals,
  syncBedsideConsultations,
  updateBedsideConsultationStage,
  type BedsideConsultationView,
  type ConsultationStage,
} from "../lib/onlineConsultations";
import { API_URL } from "../lib/apiBase";
import { type AppLocale } from "../lib/locale";
import { usePageSeo } from "../lib/seo";
import { useSoundOnNewIds } from "../lib/notificationSound";
import { resolvePatientDisplayName } from "../lib/patientName";
import { setSessionIdleSuppressed } from "../lib/sessionIdle";
import { useSyncedLocale } from "../lib/useSyncedLocale";

const ALLOWED_DOCTOR_EMAIL = "alixan.baktybaev@gmail.com";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  picture?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
};
type NavSection = "overview" | "patients" | "ward" | "schedule";
type Locale = AppLocale;
type ActiveWardCall = {
  consultId: string;
  roomId: string;
};
type AiAdvice = {
  status: string;
  summary: string;
  concerns: string[];
  doctor: string;
  doctor_urgency: string;
  medications: Array<{ drug: string; compartment: string | null; dosage: string; available_in_robot: boolean }>;
  actions: string[];
};
type AiResult = { consultId: string; loading: boolean; data: AiAdvice | null; error: boolean };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: { client_id: string; callback: (r: { credential: string }) => void; auto_select?: boolean }) => void;
          renderButton: (el: HTMLElement, cfg: object) => void;
        };
      };
    };
  }
}

function readCurrentUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch { return null; }
}

function today() { return getTodayDateInput(); }

function patientLabel(item: Appointment, fallback = "Пациент") {
  return resolvePatientDisplayName({
    names: [item.patientName, item.patient_name],
    source: item.patient_id || item.patientId || item.patient_email || item.patientEmail || item.id,
    fallback,
    requireFullName: true,
  });
}

function hasAssignedDoctor(item: Appointment) {
  const doctorId = item.doctor_id || item.doctorId;
  return Boolean(doctorId && doctorId !== "pending");
}

function isSharedDoctorInbox(user: StoredUser | null) {
  return user?.email === ALLOWED_DOCTOR_EMAIL || user?.role === "admin";
}

function appointmentDateTimeValue(item: Appointment) {
  const time = item.time && item.time !== "00:00" ? item.time : "00:00";
  const value = Date.parse(`${item.date}T${time}:00`);
  return Number.isNaN(value) ? 0 : value;
}

function intlLocale(locale: Locale) {
  if (locale === "kk") return "kk-KZ";
  if (locale === "en") return "en-US";
  return "ru-RU";
}

function formatAppointmentDay(item: Appointment, locale: Locale) {
  const time = item.time && item.time !== "00:00" ? item.time : null;
  const value = Date.parse(`${item.date}T${time || "00:00"}:00`);
  if (Number.isNaN(value)) return `${item.date}${time ? ` · ${time}` : ""}`;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "long",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value)).replace(",", " ·");
}

function formatAppointmentTime(item: Appointment, pendingLabel = "Время уточняется") {
  return item.time && item.time !== "00:00" ? item.time : pendingLabel;
}

function appointmentFormatLabel(
  item: Appointment,
  labels = { ward: "Палата", online: "Онлайн", offline: "Офлайн" },
) {
  if (isWardOnlineConsultation(item)) return labels.ward;
  if (isHomeOnlineConsultation(item)) return labels.online;
  const room = readRoomLabel(item);
  return room ? `${labels.offline} · ${room}` : labels.offline;
}

function canFinishDoctorAppointment(item: Appointment) {
  return item.status === "active";
}

const STAGE_LABELS: Record<ConsultationStage, string> = {
  scheduled: "Назначено",
  robot_en_route: "Робот в пути",
  bedside_ready: "У кровати",
  live: "Идёт звонок",
  completed: "Завершено",
};

const STAGE_BADGE: Record<ConsultationStage, string> = {
  scheduled: "badge--danger",
  robot_en_route: "badge--warn",
  bedside_ready: "badge--warn",
  live: "badge--ok",
  completed: "badge--ok",
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => { dispose: () => void };
  }
}

const doctorText = {
  ru: {
    welcome: "Добро пожаловать",
    loading: "Загрузка...",
    refresh: "Обновить",
    navOverview: "Дашборд",
    navPatients: "Мои пациенты",
    navPatientsMobile: "Пациенты",
    navWard: "Онлайн в палатах",
    navWardMobile: "Палаты",
    navSchedule: "Расписание",
    metricPatients: "Пациентов",
    metricActive: "Активных",
    metricCompleted: "Завершено",
    metricWard: "В палатах",
    freeToday: "Сегодня свободно",
    noAppointmentsNext: "На сегодня и ближайшие дни назначенных приёмов нет.",
    nearestAppointment: (day: string) => `Ближайший приём — ${day}.`,
    nextAppointment: "Ближайший приём",
    nextAppointmentSub: "Следующая запись, с которой врачу нужно работать",
    noNextAppointment: "Ближайших приёмов нет.",
    todayAppointments: "Сегодняшние приёмы",
    todayAppointmentsSub: "Три ближайшие записи на сегодня",
    allAppointments: "Все приёмы",
    noAppointmentsToday: "На сегодня приёмов нет",
    noAppointmentsTodaySub: "Новые записи появятся здесь автоматически.",
    patientsOn: "Пациенты на",
    manageAppointments: "Управление приёмами",
    noRecordsForDate: "На эту дату записей нет.",
    todayCount: (n: number) => `${n} на сегодня`,
    consultationsCount: (n: number) => `${n} консультаций`,
    scheduleByDate: "Расписание по датам",
    startCall: "Начать звонок",
    openCard: "Открыть карточку",
    openLink: "Открыть ссылку",
    patientFallback: "Пациент",
    activeNow: "Идёт сейчас",
    assigned: "Назначено",
    noDescription: "Без описания",
    noReason: "Без причины",
    room: "Кабинет",
    pendingTime: "Время уточняется",
    inAppointment: "На приёме",
    completedStatus: "Завершён",
    waiting: "Ожидает",
    accept: "Принять",
    finish: "Завершить",
    scheduleTitle: "Расписание",
    scheduleSub: "Все записи на выбранную дату",
    formatWard: "Палата",
    formatOnline: "Онлайн",
    formatOffline: "Офлайн",
  },
  kk: {
    welcome: "Қош келдіңіз",
    loading: "Жүктелуде...",
    refresh: "Жаңарту",
    navOverview: "Дашборд",
    navPatients: "Менің пациенттерім",
    navPatientsMobile: "Пациенттер",
    navWard: "Палаталардағы онлайн",
    navWardMobile: "Палаталар",
    navSchedule: "Кесте",
    metricPatients: "Пациент",
    metricActive: "Белсенді",
    metricCompleted: "Аяқталды",
    metricWard: "Палаталарда",
    freeToday: "Бүгін бос",
    noAppointmentsNext: "Бүгін және жақын күндерге тіркеулер жоқ.",
    nearestAppointment: (day: string) => `Келесі қабылдау — ${day}.`,
    nextAppointment: "Келесі қабылдау",
    nextAppointmentSub: "Дәрігерге жұмыс істеу керек келесі жазба",
    noNextAppointment: "Жақын арада қабылдаулар жоқ.",
    todayAppointments: "Бүгінгі қабылдаулар",
    todayAppointmentsSub: "Бүгінге ең жақын үш жазба",
    allAppointments: "Барлық қабылдаулар",
    noAppointmentsToday: "Бүгін қабылдау жоқ",
    noAppointmentsTodaySub: "Жаңа жазбалар автоматты түрде пайда болады.",
    patientsOn: "Пациенттер:",
    manageAppointments: "Қабылдауларды басқару",
    noRecordsForDate: "Бұл күні жазбалар жоқ.",
    todayCount: (n: number) => `${n} бүгін`,
    consultationsCount: (n: number) => `${n} консультация`,
    scheduleByDate: "Күні бойынша кесте",
    startCall: "Қоңырауды бастау",
    openCard: "Картаны ашу",
    openLink: "Сілтемені ашу",
    patientFallback: "Пациент",
    activeNow: "Қазір өтіп жатыр",
    assigned: "Тағайындалды",
    noDescription: "Сипаттама жоқ",
    noReason: "Себеп көрсетілмеген",
    room: "Кабинет",
    pendingTime: "Уақыты нақтыланады",
    inAppointment: "Қабылдауда",
    completedStatus: "Аяқталды",
    waiting: "Күтуде",
    accept: "Қабылдау",
    finish: "Аяқтау",
    scheduleTitle: "Кесте",
    scheduleSub: "Таңдалған күндегі барлық жазбалар",
    formatWard: "Палата",
    formatOnline: "Онлайн",
    formatOffline: "Офлайн",
  },
  en: {
    welcome: "Welcome",
    loading: "Loading...",
    refresh: "Refresh",
    navOverview: "Dashboard",
    navPatients: "My Patients",
    navPatientsMobile: "Patients",
    navWard: "Online in Wards",
    navWardMobile: "Wards",
    navSchedule: "Schedule",
    metricPatients: "Patients",
    metricActive: "Active",
    metricCompleted: "Completed",
    metricWard: "In Wards",
    freeToday: "Free Today",
    noAppointmentsNext: "No scheduled appointments for today or the near future.",
    nearestAppointment: (day: string) => `Next appointment — ${day}.`,
    nextAppointment: "Next Appointment",
    nextAppointmentSub: "The next upcoming appointment to handle",
    noNextAppointment: "No upcoming appointments.",
    todayAppointments: "Today's Appointments",
    todayAppointmentsSub: "The three nearest appointments today",
    allAppointments: "All appointments",
    noAppointmentsToday: "No appointments today",
    noAppointmentsTodaySub: "New records will appear here automatically.",
    patientsOn: "Patients on",
    manageAppointments: "Manage appointments",
    noRecordsForDate: "No records for this date.",
    todayCount: (n: number) => `${n} for today`,
    consultationsCount: (n: number) => `${n} consultations`,
    scheduleByDate: "Schedule by date",
    startCall: "Start call",
    openCard: "Open card",
    openLink: "Open link",
    patientFallback: "Patient",
    activeNow: "In progress",
    assigned: "Assigned",
    noDescription: "No description",
    noReason: "No reason provided",
    room: "Room",
    pendingTime: "Time pending",
    inAppointment: "With patient",
    completedStatus: "Completed",
    waiting: "Waiting",
    accept: "Accept",
    finish: "Finish",
    scheduleTitle: "Schedule",
    scheduleSub: "All appointments for the selected date",
    formatWard: "Ward",
    formatOnline: "Online",
    formatOffline: "Offline",
  },
} as const;

function JitsiPanel({
  roomId,
  doctorName,
  consult,
  measurementState,
  onRunMeasurement,
  onClose,
}: {
  roomId: string;
  doctorName: string;
  consult: BedsideConsultationView | null;
  measurementState: AimarMeasurementState | null;
  onRunMeasurement: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    let disposed = false;

    function mount() {
      if (!ref.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: roomId,
        parentNode: ref.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: `Врач: ${doctorName}` },
        configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          TOOLBAR_BUTTONS: ["microphone", "camera", "hangup", "chat", "fullscreen"],
        },
      });
    }

    if (window.JitsiMeetExternalAPI) {
      mount();
    } else {
      const s = document.createElement("script");
      s.src = "https://meet.jit.si/external_api.js";
      s.onload = () => { if (!disposed) mount(); };
      document.head.appendChild(s);
    }

    return () => {
      disposed = true;
      apiRef.current?.dispose();
    };
  }, [roomId, doctorName]);

  return (
    <div className="wc-jitsi-overlay">
      <div className="wc-jitsi-header">
        <span>🔴 Видеозвонок активен</span>
        <button className="wc-jitsi-close" onClick={onClose}><X size={18} /></button>
      </div>
      {consult ? (
        <div className="wc-jitsi-toolbar">
          <div className="wc-jitsi-toolbar__meta">
            <strong>{consult.patientName}</strong>
            <span>{consult.wardLabel} · {consult.bedLabel} · {consult.robotUnit}</span>
          </div>
          <div className="wc-jitsi-toolbar__measure">
            <button
              type="button"
              className="wc-jitsi-toolbar__measure-btn"
              disabled={!canRunAimarMeasurement(consult)}
              title={getAimarMeasurementDisabledReason(consult) || "Запустить измерение температуры и пульса на роботе"}
              onClick={onRunMeasurement}
            >
              <Activity size={16} />
              {measurementState?.phase === "measuring" ? "Идёт измерение..." : "Запустить измерение"}
            </button>
            <div className={`wc-jitsi-toolbar__measure-status wc-jitsi-toolbar__measure-status--${measurementState?.phase || "idle"}`}>
              {measurementState?.message || (consult.devices.robotLinked ? "Робот AIMAR готов к измерению" : "Робот не подключён")}
            </div>
            {measurementState?.phase === "success" && measurementState.createdAt ? (
              <div className="wc-jitsi-toolbar__measure-result">
                Температура {measurementState.tempC?.toFixed(1)} °C · Пульс {measurementState.hr} уд/мин · {formatMeasurementDateTime(measurementState.createdAt, "ru")}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div ref={ref} style={{ flex: 1 }} />
    </div>
  );
}

export default function DoctorDashboard() {
  const [locale, setLocale] = useSyncedLocale();
  const t = doctorText[locale];
  const resolvePatientName = useCallback(
    (item: Appointment) => patientLabel(item, t.patientFallback),
    [t.patientFallback],
  );
  usePageSeo({
    title: "Кабинет врача — HealthAssist",
    description: "Рабочий кабинет врача в системе HealthAssist.",
    path: "/doctor",
    locale,
    robots: "noindex, nofollow",
  });

  const [sessionUser, setSessionUser] = useState<StoredUser | null>(() => readCurrentUser());
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const user = useMemo(() => sessionUser, [sessionUser]);
  const allowed =
    Boolean(user) &&
    (user?.email === ALLOWED_DOCTOR_EMAIL || user?.role === "admin" || user?.role === "doctor");
  const sharedDoctorInbox = isSharedDoctorInbox(user);
  const doctorName = user?.name || user?.email || "Врач";
  const doctorAvatar = resolveAvatarUrl(
    { ...user, role: user?.role || "doctor" },
    { doctorFallback: true },
  );
  const backendDoctorRoleMissing =
    Boolean(user?.email === ALLOWED_DOCTOR_EMAIL) && user?.role !== "admin" && user?.role !== "doctor";

  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [date, setDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [wardInbox, setWardInbox] = useState<BedsideConsultationView[]>([]);
  const [consultations, setConsultations] = useState<BedsideConsultationView[]>([]);
  const [doctorProfileId, setDoctorProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveWardCall | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [measurementTick, setMeasurementTick] = useState(0);
  const [aimarMeasurementByConsult, setAimarMeasurementByConsult] = useState<Record<string, AimarMeasurementState>>({});
  const aimarTimersRef = useRef<Record<string, number[]>>({});

  async function handleGoogleLogin() {
    setGoogleError(null);
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch {
      setGoogleError("Не удалось получить ссылку входа. Попробуйте ещё раз.");
    }
  }

  const loadConsultations = useCallback((
    d: string,
    profileId?: string | null,
    scopeToOwnProfile = false,
    sourceAppointments?: Appointment[],
  ) => {
    if (sourceAppointments) {
      syncBedsideConsultations(sourceAppointments);
    }

    const all = listAllBedsideConsultations().filter((c) =>
      c.deliveryMode === "online" &&
      (!scopeToOwnProfile || !profileId || c.doctorId === profileId),
    );

    setWardInbox(all);
    setConsultations(all.filter((c) => c.date === d));
  }, []);
  const clearAimarTimers = useCallback((consultId?: string) => {
    if (!consultId) {
      Object.values(aimarTimersRef.current).flat().forEach((timerId) => window.clearTimeout(timerId));
      aimarTimersRef.current = {};
      return;
    }
    (aimarTimersRef.current[consultId] || []).forEach((timerId) => window.clearTimeout(timerId));
    delete aimarTimersRef.current[consultId];
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [apptData, doctorsData] = await Promise.all([
        fetchDoctorSchedule(),
        fetchDoctors(true),
      ]);
      const liveItems = apptData.items ?? [];
      const all = liveItems.length > 0 ? liveItems : readCachedAppointments();
      const matchedDoctor = doctorsData.items.find(
        (doctor) => doctor.email?.toLowerCase() === user?.email?.toLowerCase(),
      );
      const profileId = matchedDoctor?.id || null;
      const scopeToOwnProfile = Boolean(profileId) && !sharedDoctorInbox;
      setDoctorProfileId(profileId);
      const mine = all
        .filter((appointment) => {
          if (isWardOnlineRequest(appointment)) return false;
          const appointmentDoctorId = appointment.doctor_id || appointment.doctorId;
          if (scopeToOwnProfile && appointmentDoctorId && appointmentDoctorId !== profileId) return false;
          if (hasAssignedDoctor(appointment)) return true;
          return appointment.status === "active" || appointment.status === "done";
        })
        .sort((a, b) => {
          const byDate = a.date.localeCompare(b.date);
          return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
        });
      setAppointments(mine);
      loadConsultations(date, profileId, scopeToOwnProfile, all);
    } catch {
      setErr("Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }, [date, loadConsultations, sharedDoctorInbox, user?.email]);

  useEffect(() => {
    const syncUser = (event: Event) => {
      const detail = (event as CustomEvent<StoredUser | null>).detail;
      setSessionUser(detail ?? readCurrentUser());
    };
    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    const syncMeasurements = () => setMeasurementTick((value) => value + 1);
    window.addEventListener(PATIENT_MEASUREMENTS_UPDATED_EVENT, syncMeasurements);
    return () => window.removeEventListener(PATIENT_MEASUREMENTS_UPDATED_EVENT, syncMeasurements);
  }, []);

  useEffect(() => () => clearAimarTimers(), [clearAimarTimers]);

  useEffect(() => {
    if (activeCall) {
      setSessionIdleSuppressed(true);
      return;
    }
    setSessionIdleSuppressed(false);
  }, [activeCall]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  useEffect(() => {
    if (!allowed) return;
    const t = window.setInterval(() => { void load(); }, 15_000);
    return () => window.clearInterval(t);
  }, [allowed, load]);

  useEffect(() => {
    if (!allowed) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    const refreshOnFocus = () => {
      void load();
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [allowed, load]);

  async function setStatus(id: string, status: AppointmentStatus) {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch {
      setErr("Не удалось изменить статус.");
    }
  }

  async function openMeeting(item: Appointment) {
    const meetingUrl = item.meeting_url;
    if (!meetingUrl) return;

    const url =
      meetingUrl.startsWith("http://") || meetingUrl.startsWith("https://")
        ? meetingUrl
        : `https://${meetingUrl}`;

    window.open(url, "_blank", "noopener,noreferrer");

    setSessionIdleSuppressed(true);

    if (item.status === "pending" && hasAssignedDoctor(item)) {
      try {
        await updateAppointmentStatus(item.id, "active");
        setAppointments((prev) =>
          prev.map((entry) =>
            entry.id === item.id ? { ...entry, status: "active" } : entry
          )
        );
      } catch {
        setErr("Не удалось обновить статус.");
      }
    }
  }

  async function setConsultStage(session: BedsideConsultationView, stage: ConsultationStage) {
    updateBedsideConsultationStage(session.id, stage);
    if (stage === "live") {
      setSessionIdleSuppressed(true);
      await updateAppointmentStatus(session.appointmentId, "active").catch(() => {});
      if (session.meetRoomId) setActiveCall({ consultId: session.id, roomId: session.meetRoomId });
    }
    if (stage === "completed") {
      setSessionIdleSuppressed(false);
      await updateAppointmentStatus(session.appointmentId, "done").catch(() => {});
    }
    loadConsultations(date, doctorProfileId, !sharedDoctorInbox);
  }

  function runAimarMeasurement(session: BedsideConsultationView) {
    if (!canRunAimarMeasurement(session)) {
      setAimarMeasurementByConsult((current) => ({
        ...current,
        [session.id]: {
          consultId: session.id,
          phase: "error",
          message: getAimarMeasurementDisabledReason(session) || "Не удалось получить измерение, попробуйте ещё раз",
        },
      }));
      return;
    }

    clearAimarTimers(session.id);
    const commandContext = buildAimarMeasurementCommandContext(session);
    dispatchAimarMeasurementCommand(commandContext);
    setAimarMeasurementByConsult((current) => ({
      ...current,
      [session.id]: {
        consultId: session.id,
        phase: "sent",
        message: "Команда отправлена роботу",
      },
    }));

    const sentTimer = window.setTimeout(() => {
      setAimarMeasurementByConsult((current) => ({
        ...current,
        [session.id]: {
          consultId: session.id,
          phase: "measuring",
          message: "Идёт измерение...",
        },
      }));
    }, 700);

    const finishTimer = window.setTimeout(() => {
      const createdAt = new Date().toISOString();
      const { tempC, hr } = resolveAimarMeasurementValues(session);
      setRealVitals(session.id, tempC, hr);
      recordPatientVitals({
        patientId: commandContext.patientId,
        source: "aimar",
        actorName: "Робот AIMAR / во время консультации",
        deviceId: session.robotUnit,
        tempC,
        hr,
        createdAt,
        eventId: `aimar-live-${session.id}-${Date.now()}`,
      });
      dispatchAimarMeasurementResult({
        ...commandContext,
        createdAt,
        tempC,
        hr,
      });
      setAimarMeasurementByConsult((current) => ({
        ...current,
        [session.id]: {
          consultId: session.id,
          phase: "success",
          message: "Готово: результат получен",
          createdAt,
          tempC,
          hr,
        },
      }));
      loadConsultations(date, doctorProfileId, !sharedDoctorInbox);
      delete aimarTimersRef.current[session.id];
    }, 3200);

    aimarTimersRef.current[session.id] = [sentTimer, finishTimer];
  }

  async function requestAiAdvice(consult: BedsideConsultationView) {
    setAiResult({ consultId: consult.id, loading: true, data: null, error: false });
    try {
      const res = await fetch(`${API_URL}/api/ai/vitals-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempC: consult.realTempC ?? null,
          hr: consult.realHr ?? null,
          medication: consult.medication ?? [],
        }),
      });
      const json = await res.json();
      setAiResult({ consultId: consult.id, loading: false, data: json.advice ?? null, error: false });
    } catch {
      setAiResult({ consultId: consult.id, loading: false, data: null, error: true });
    }
  }

  const todayAppts = appointments.filter(a => a.date === date);
  const todayDate = today();
  const nowValue = Date.now();
  const newAppts = useMemo(() => appointments
    .filter((a) => (a.status === "pending" || a.status === "active") && hasAssignedDoctor(a))
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return appointmentDateTimeValue(a) - appointmentDateTimeValue(b);
    }), [appointments]);
  const scheduledOverviewAppts = useMemo(() => appointments
    .filter((a) => hasAssignedDoctor(a) && a.status !== "done")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1;
      return appointmentDateTimeValue(a) - appointmentDateTimeValue(b);
    }), [appointments]);
  const upcomingOverviewAppts = useMemo(() => scheduledOverviewAppts.filter((item) => (
    item.status === "active" || appointmentDateTimeValue(item) >= nowValue
  )), [nowValue, scheduledOverviewAppts]);
  const nextOverviewAppointment = upcomingOverviewAppts[0] ?? null;
  const todayOverviewAppts = useMemo(() => upcomingOverviewAppts
    .filter((item) => item.date === todayDate)
    .slice(0, 3), [todayDate, upcomingOverviewAppts]);
  const showOverviewEmpty = !nextOverviewAppointment && todayOverviewAppts.length === 0;
  const activeConsults = wardInbox.filter(c => c.stage === "live" || c.stage === "bedside_ready");
  const wardPendingCount = wardInbox.filter(c => c.stage === "scheduled").length;
  const wardInboxCount = wardInbox.filter(c => c.stage !== "completed").length;
  const completedToday = appointments.filter(a => a.status === "done").length;
  const activeCallSession = useMemo(
    () => (activeCall ? wardInbox.find((session) => session.id === activeCall.consultId) || null : null),
    [activeCall, wardInbox],
  );

  useSoundOnNewIds(newAppts.map((item) => item.id), "doctor-new-appointments");
  useSoundOnNewIds(
    wardInbox.filter((session) => session.stage === "scheduled").map((session) => session.id),
    "doctor-ward-appointments",
  );

  // Not logged in → Google Sign-In screen
  if (!sessionUser || !hasSession()) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg, #0a0f1a)",
      }}>
        <div style={{
          width: "100%", maxWidth: 400, padding: "40px 36px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24, textAlign: "center",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--primary2))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Stethoscope size={26} color="#0a0f1a" />
            </div>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Кабинет врача</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "0 0 28px" }}>
            HealthAssist · Только для авторизованных врачей
          </p>

          <button
            onClick={() => void handleGoogleLogin()}
            style={{
              width: "100%", padding: "12px 20px", borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, var(--primary), var(--primary2))",
              color: "var(--primaryText)", border: "none", cursor: "pointer",
            }}
          >
            Войти через Google
          </button>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "10px 0 0" }}>
            Только для аккаунта {ALLOWED_DOCTOR_EMAIL}
          </p>
          {googleError && (
            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 13, textAlign: "left" }}>
              {googleError}
            </div>
          )}

          <Link to="/" style={{ display: "block", marginTop: 24, color: "rgba(255,255,255,0.35)", fontSize: 13, textDecoration: "none" }}>
            ← На главную
          </Link>
        </div>
      </div>
    );
  }

  // Logged in but wrong account
  if (!allowed) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--bg, #0a0f1a)",
      }}>
        <div style={{
          width: "100%", maxWidth: 400, padding: "40px 36px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 24, textAlign: "center",
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 10px" }}>Нет доступа</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, margin: "0 0 20px" }}>
            Аккаунт <b>{user?.email}</b> не имеет доступа к кабинету врача.
          </p>
          <button
            onClick={() => { clearStoredSession(); setSessionUser(null); }}
            style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", cursor: "pointer", fontSize: 14 }}
          >
            Выйти и войти другим аккаунтом
          </button>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: NavSection; label: string; mobileLabel?: string; icon: React.ReactNode; badge?: number }> = [
    { id: "overview",  label: t.navOverview,   icon: <LayoutDashboard size={18} /> },
    { id: "patients",  label: t.navPatients,   mobileLabel: t.navPatientsMobile, icon: <Users size={18} /> },
    { id: "ward",      label: t.navWard,        mobileLabel: t.navWardMobile, icon: <Monitor size={18} />, badge: wardPendingCount },
    { id: "schedule",  label: t.navSchedule,   icon: <CalendarClock size={18} /> },
  ];

  return (
    <div className="doctor-admin">
      {/* ── Sidebar ── */}
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <Stethoscope size={22} />
          <strong>HealthAssist</strong>
          <span>Кабинет врача</span>
        </div>

        <nav className="doctor-admin__nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`doctor-admin__nav-item ${activeSection === item.id ? "doctor-admin__nav-item--active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              {item.badge ? (
                <span className="doctor-admin__nav-item-copy">
                  <span>{item.label}</span>
                  <span className="doctor-admin__nav-item-badge">{item.badge}</span>
                </span>
              ) : item.label}
            </button>
          ))}
        </nav>

        <Link
          className="doctor-admin__nav-item"
          to="/"
          style={{ marginTop: "auto", textDecoration: "none" }}
        >
          <House size={18} />
          На главную
        </Link>
      </aside>

      {/* ── Main ── */}
      <main className="doctor-admin__main">
        <header className="doctor-admin__topbar">
          <div className="doctor-admin__topbar-copy">
            <h1>{navItems.find(n => n.id === activeSection)?.label}</h1>
            <p>{t.welcome}, {doctorName}</p>
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
              onClick={() => void load()}
              disabled={loading}
              className="doctor-admin__refresh doctor-admin__refresh--secondary doctor-admin__refresh--compact"
            >
              {loading ? t.loading : t.refresh}
            </button>
            <div className="doctor-admin__identity">
              <button
                type="button"
                className="doctor-admin__identity-trigger"
                onClick={() => setProfileOpen(true)}
                aria-label="Открыть профиль"
                title="Открыть профиль"
              >
                <AvatarCircle
                  name={doctorName}
                  src={doctorAvatar}
                  size={34}
                  className="doctor-admin__avatar doctor-admin__avatar--small"
                  alt={doctorName}
                />
              </button>
              <div className="doctor-admin__doctor doctor-admin__doctor--compact">
                <strong>{doctorName}</strong>
                <button
                  onClick={() => { clearStoredSession(); setSessionUser(null); }}
                  className="doctor-admin__profile-link-button"
                >
                  Выйти
                </button>
              </div>
            </div>
          </div>

          {/* Mobile-only controls */}
          <div className="doctor-admin__mobile-head-actions">
            <LanguageSwitcher
              locale={locale}
              onChange={setLocale}
              variant="segmented"
              ariaLabel="Язык интерфейса"
              title="Язык интерфейса"
            />
            <button
              type="button"
              className="doctor-admin__mobile-avatar-trigger"
              onClick={() => setProfileOpen(true)}
              aria-label="Открыть профиль"
            >
              <AvatarCircle
                name={doctorName}
                src={doctorAvatar}
                size={36}
                className="doctor-admin__avatar doctor-admin__avatar--small"
                alt={doctorName}
              />
            </button>
            <button
              type="button"
              className="doctor-admin__mobile-logout"
              onClick={() => { clearStoredSession(); setSessionUser(null); }}
              aria-label="Выйти"
              title="Выйти"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {err && <div className="alert" style={{ margin: "0 24px 16px" }}>{err}</div>}
        {backendDoctorRoleMissing && (
          <div className="alert" style={{ margin: "0 24px 16px" }}>
            Backend не привязал этот Google-аккаунт как врача. В таблице `doctors` на сервере должен быть email `alixan.baktybaev@gmail.com`, иначе живые заявки в кабинете врача не появятся.
          </div>
        )}

        <div className="doctor-admin__content doctor-admin__content--doctor">

          {/* ── OVERVIEW ── */}
          {activeSection === "overview" && (
            <div className="doctor-admin__overview">
              <div className="doctor-admin__metrics doctor-admin__metrics--overview">
                {[
                  { label: t.metricPatients,  value: todayAppts.length,     color: "#22d3ee" },
                  { label: t.metricActive,    value: activeConsults.length, color: "#f59e0b" },
                  { label: t.metricCompleted, value: completedToday,        color: "#34d399" },
                  { label: t.metricWard,      value: wardInboxCount,        color: "#818cf8" },
                ].map(stat => (
                  <div key={stat.label} className="doctor-admin__metric doctor-admin__metric--overview">
                    <div style={{ fontSize: 30, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {showOverviewEmpty ? (
                <div className="doctor-admin__overview-empty">
                  <div className="doctor-admin__overview-empty-icon">📅</div>
                  <div>
                    <h2>{t.freeToday}</h2>
                    <p>
                      {scheduledOverviewAppts[0]
                        ? t.nearestAppointment(formatAppointmentDay(scheduledOverviewAppts[0], locale))
                        : t.noAppointmentsNext}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="doctor-admin__overview-panels">
                  <section className="doctor-admin__overview-panel doctor-admin__overview-panel--hero">
                    <div className="doctor-admin__panel-head">
                      <div>
                        <h2>{t.nextAppointment}</h2>
                        <p className="doctor-admin__panel-subtitle">{t.nextAppointmentSub}</p>
                      </div>
                    </div>

                    {nextOverviewAppointment ? (() => {
                      const item = nextOverviewAppointment;
                      const patientName = resolvePatientName(item);
                      const patientAvatar = resolveAvatarUrl(
                        { name: patientName, role: "patient" },
                        { patientFallback: true },
                      );
                      const isOnline = isHomeOnlineConsultation(item);
                      const isActive = item.status === "active";
                      const roomLabel = readRoomLabel(item);
                      return (
                        <article className="doctor-admin__overview-next-card">
                          <div className="doctor-admin__overview-next-copy">
                            <AvatarCircle
                              name={patientName}
                              src={patientAvatar}
                              size={56}
                              className="doctor-admin__mini-avatar"
                              alt={patientName}
                            />
                            <div className="doctor-admin__overview-next-main">
                              <strong>{patientName}</strong>
                              <span>{formatAppointmentDay(item, locale)}</span>
                              <div className="doctor-admin__overview-record-tags">
                                <span className={`doctor-admin__online-tag ${isOnline ? "doctor-admin__online-tag--cyan" : "doctor-admin__online-tag--violet"}`}>
                                  {appointmentFormatLabel(item, {
                                    ward: t.formatWard,
                                    online: t.formatOnline,
                                    offline: t.formatOffline,
                                  })}
                                </span>
                                <span className={`doctor-admin__online-tag ${isActive ? "doctor-admin__online-tag--green" : "doctor-admin__online-tag--amber"}`}>
                                  {isActive ? t.activeNow : t.assigned}
                                </span>
                              </div>
                              <p>{item.reason || item.specialty_request || item.specialtyRequest || t.noDescription}</p>
                              {roomLabel && !isOnline ? (
                                <small>{t.room}: {roomLabel}</small>
                              ) : null}
                            </div>
                          </div>
                          <div className="doctor-admin__overview-next-actions">
                            {isOnline && item.meeting_url ? (
                              <button
                                type="button"
                                onClick={() => void openMeeting(item)}
                                className="doctor-admin__action-btn doctor-admin__action-btn--link"
                              >
                                {t.startCall}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveSection("schedule")}
                                className="doctor-admin__action-btn doctor-admin__action-btn--secondary"
                              >
                                {t.openCard}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })() : (
                      <div className="doctor-admin__overview-panel-empty">
                        {t.noNextAppointment}
                      </div>
                    )}
                  </section>

                  <section className="doctor-admin__overview-panel">
                    <div className="doctor-admin__panel-head doctor-admin__panel-head--row">
                      <div>
                        <h2>{t.todayAppointments}</h2>
                        <p className="doctor-admin__panel-subtitle">{t.todayAppointmentsSub}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSection("schedule")}
                        className="doctor-admin__overview-inline-link"
                      >
                        {t.allAppointments}
                      </button>
                    </div>

                    {todayOverviewAppts.length > 0 ? (
                      <div className="doctor-admin__overview-today-list">
                        {todayOverviewAppts.map((item) => (
                          <article key={item.id} className="doctor-admin__overview-today-item">
                            <div className="doctor-admin__overview-today-copy">
                              <strong>{resolvePatientName(item)}</strong>
                              <span>{formatAppointmentTime(item, t.pendingTime)}</span>
                            </div>
                            <div className="doctor-admin__overview-today-tags">
                              <span className={`doctor-admin__online-tag ${isHomeOnlineConsultation(item) ? "doctor-admin__online-tag--cyan" : isWardOnlineConsultation(item) ? "doctor-admin__online-tag--green" : "doctor-admin__online-tag--violet"}`}>
                                {appointmentFormatLabel(item, {
                                  ward: t.formatWard,
                                  online: t.formatOnline,
                                  offline: t.formatOffline,
                                })}
                              </span>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="doctor-admin__overview-panel-empty doctor-admin__overview-panel-empty--soft">
                        <span>🗓️</span>
                        <div>
                          <strong>{t.noAppointmentsToday}</strong>
                          <p>{t.noAppointmentsTodaySub}</p>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}

              <div className="doctor-admin__overview-links doctor-admin__overview-links--doctor">
                {navItems.filter(n => n.id !== "overview").map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className="doctor-admin__overview-link doctor-admin__overview-link--doctor"
                  >
                    <span className="doctor-admin__overview-link-icon">{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                        {item.id === "patients" && t.todayCount(todayAppts.length)}
                        {item.id === "ward" && t.consultationsCount(wardInboxCount)}
                        {item.id === "schedule" && t.scheduleByDate}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PATIENTS ── */}
          {activeSection === "patients" && (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 className="h2" style={{ margin: 0 }}>{t.patientsOn} {date}</h2>
                  <p className="muted" style={{ margin: "4px 0 0" }}>{t.manageAppointments}</p>
                </div>
                <DayDateNavigator
                  date={date}
                  onChange={setDate}
                  className="doctor-admin__date-nav"
                />
              </div>

              {loading ? (
                <p className="muted">{t.loading}</p>
              ) : todayAppts.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <BedDouble size={36} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
                  <p className="muted">{t.noRecordsForDate}</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {todayAppts.map(item => {
                    const patientMeasurements = item.patient_id || item.patientId
                      ? listPatientMeasurements(String(item.patient_id || item.patientId)).slice(0, 3)
                      : [];

                    return (
                    <div key={`${item.id}-${measurementTick}`} style={{
                      padding: "16px 18px", borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.09)",
                      background: "rgba(255,255,255,0.03)",
                    }}>
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>{item.time} — {resolvePatientName(item)}</div>
                          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{item.reason || t.noReason}</div>
                        </div>
                        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span className={`badge ${item.status === "active" ? "badge--warn" : item.status === "done" ? "badge--ok" : "badge--danger"}`}>
                            <span className="badge__dot" />
                            {item.status === "active"
                              ? t.inAppointment
                              : item.status === "done"
                                ? t.completedStatus
                                : hasAssignedDoctor(item)
                                  ? t.assigned
                                  : t.waiting}
                          </span>
                          {item.meeting_url && (
                            <a
                              href={item.meeting_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setSessionIdleSuppressed(true)}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 5,
                              padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                              background: "rgba(34,211,238,0.18)", color: "#22d3ee",
                              border: "1px solid rgba(34,211,238,0.4)", textDecoration: "none",
                            }}
                          >
                            {item.status === "active" ? t.startCall : t.openLink}
                          </a>
                          )}
                          {!isHomeOnlineConsultation(item) && !isWardOnlineConsultation(item) && (
                            <span style={{
                              background: "rgba(129,140,248,0.2)", color: "#c4b5fd",
                              borderRadius: 6, padding: "3px 9px", fontSize: 12, fontWeight: 700,
                            }}>
                              Офлайн{readRoomLabel(item) ? ` · ${readRoomLabel(item)}` : ""}
                            </span>
                          )}
                          {item.status !== "active" && item.status !== "done" && !hasAssignedDoctor(item) && (
                            <button
                              onClick={() => void setStatus(item.id, "active")}
                              style={{ padding: "5px 13px", borderRadius: 8, background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", cursor: "pointer", fontSize: 13 }}
                            >{t.accept}</button>
                          )}
                          {item.status !== "done" && (
                            <button
                              onClick={() => void setStatus(item.id, "done")}
                              style={{ padding: "5px 13px", borderRadius: 8, background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", cursor: "pointer", fontSize: 13 }}
                            >{t.finish}</button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 8 }}>
                          История измерений
                        </div>
                        {patientMeasurements.length === 0 ? (
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)" }}>
                            Измерений пока нет.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 6 }}>
                            {patientMeasurements.map((entry) => (
                              <div
                                key={entry.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "minmax(0, 1fr) auto",
                                  gap: 10,
                                  alignItems: "center",
                                  fontSize: 12,
                                }}
                              >
                                <div style={{ minWidth: 0, color: "rgba(255,255,255,0.82)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {measurementMetricLabel(entry.metric, "ru")} — {formatMeasurementValue(entry, "ru")}
                                </div>
                                <div style={{ color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", textAlign: "right" }}>
                                  {formatMeasurementDateTime(entry.createdAt, "ru")} · {measurementSourceLabel(entry.source, "ru")}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {/* ── WARD CONSULTATIONS ── */}
          {activeSection === "ward" && (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 className="h2" style={{ margin: 0 }}>Онлайн-консультации в палатах</h2>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Видеосвязь у кровати пациента через робота AIMAR</p>
                </div>
                <DayDateNavigator
                  date={date}
                  onChange={setDate}
                  className="doctor-admin__date-nav"
                />
              </div>

              {consultations.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <Monitor size={36} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
                  <p className="muted">На эту дату палатных консультаций нет.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {consultations.map(session => {
                    const ai = aiResult?.consultId === session.id ? aiResult : null;
                    const isCritical = ai?.data?.status === "критично";
                    const isWarn = ai?.data?.status === "внимание";
                    const aiColor = isCritical ? "#f87171" : isWarn ? "#fbbf24" : "#34d399";
                    const robotMeasurement = aimarMeasurementByConsult[session.id] || null;
                    const canTriggerMeasurement = canRunAimarMeasurement(session);
                    const measureTitle = getAimarMeasurementDisabledReason(session) || "Запустить измерение температуры и пульса на роботе";

                    return (
                      <div key={session.id} style={{
                        borderRadius: 16,
                        border: `1px solid ${session.stage === "live" ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.09)"}`,
                        background: session.stage === "live" ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.03)",
                        overflow: "hidden",
                      }}>
                        {/* Card header */}
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 16 }}>{session.patientName}</div>
                              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                                {session.date} • {session.time || "время уточняется"} • {session.wardLabel}, {session.bedLabel}
                              </div>
                              {session.notes && (
                                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{session.notes}</div>
                              )}
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                <span style={{
                                  background: "rgba(52,211,153,0.15)", color: "#34d399",
                                  borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700,
                                }}>Палата</span>
                                <span style={{
                                  background: "rgba(34,211,238,0.15)", color: "#22d3ee",
                                  borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700,
                                }}>Онлайн</span>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{session.doctorName}</span>
                              <span className={`badge ${STAGE_BADGE[session.stage]}`}>
                                <span className="badge__dot" />
                                {STAGE_LABELS[session.stage]}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "flex", gap: 0, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap" }}>
                          {[
                            { icon: <BedDouble size={14} />, label: "Палата", val: `${session.wardLabel} / ${session.bedLabel}` },
                            { icon: <Bot size={14} />, label: "Терминал", val: session.robotUnit },
                            { icon: <Stethoscope size={14} />, label: "Специальность", val: session.specialty },
                          ].map(s => (
                            <div key={s.label} style={{ minWidth: 140, padding: "6px 16px 6px 0", marginRight: 16, borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 3 }}>
                                {s.icon} {s.label}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.val}</div>
                            </div>
                          ))}
                          {(session.realTempC != null || session.realHr != null) && (
                            <div style={{ padding: "6px 0" }}>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>Показатели</div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#34d399" }}>
                                {session.realTempC != null && `🌡 ${session.realTempC}°C`}
                                {session.realHr != null && ` ❤️ ${session.realHr} уд/мин`}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ padding: "14px 20px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {session.stage === "scheduled" && (
                            <button onClick={() => void setConsultStage(session, "robot_en_route")} style={btnStyle("#f59e0b")}>
                              Отправить робота
                            </button>
                          )}
                          {session.stage === "robot_en_route" && (
                            <button onClick={() => void setConsultStage(session, "bedside_ready")} style={btnStyle("#22d3ee")}>
                              У кровати
                            </button>
                          )}
                          {session.stage === "bedside_ready" && (
                            <button onClick={() => void setConsultStage(session, "live")} style={btnStyle("#34d399")}>
                              Начать звонок
                            </button>
                          )}
                          {session.stage === "live" && (
                            <>
                              <button
                                onClick={() => session.meetRoomId && setActiveCall({ consultId: session.id, roomId: session.meetRoomId })}
                                style={btnStyle("#34d399")}
                              >
                                📹 Открыть видео
                              </button>
                              <button
                                onClick={() => runAimarMeasurement(session)}
                                disabled={!canTriggerMeasurement}
                                title={measureTitle}
                                style={btnStyle("#60a5fa", !canTriggerMeasurement)}
                              >
                                {robotMeasurement?.phase === "measuring" ? "Идёт измерение..." : "Измерение"}
                              </button>
                              <button onClick={() => void setConsultStage(session, "completed")} style={btnStyle("rgba(255,255,255,0.25)")}>
                                Завершить
                              </button>
                            </>
                          )}

                          {(session.realTempC != null || session.realHr != null) && session.stage !== "completed" && (
                            <button
                              onClick={() => void requestAiAdvice(session)}
                              disabled={ai?.loading}
                              style={{ ...btnStyle("#818cf8"), display: "flex", alignItems: "center", gap: 6 }}
                            >
                              {ai?.loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Bot size={13} />}
                              Анализ ИИ
                            </button>
                          )}
                        </div>
                        {robotMeasurement ? (
                          <div style={{
                            margin: "0 20px 16px",
                            borderRadius: 12,
                            padding: "10px 12px",
                            display: "grid",
                            gap: 4,
                            border: `1px solid ${robotMeasurement.phase === "error" ? "rgba(248,113,113,0.28)" : robotMeasurement.phase === "success" ? "rgba(52,211,153,0.24)" : "rgba(96,165,250,0.24)"}`,
                            background: robotMeasurement.phase === "error" ? "rgba(127,29,29,0.14)" : "rgba(15,23,42,0.55)",
                          }}>
                            <strong style={{ fontSize: 13, color: "#f4f4ef" }}>{robotMeasurement.message}</strong>
                            {robotMeasurement.phase === "success" && robotMeasurement.createdAt ? (
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.68)" }}>
                                Температура {robotMeasurement.tempC?.toFixed(1)} °C · Пульс {robotMeasurement.hr} уд/мин · {formatMeasurementDateTime(robotMeasurement.createdAt, "ru")}
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        {/* AI advice panel */}
                        {ai?.data && !ai.loading && (
                          <div style={{
                            margin: "0 20px 16px",
                            borderRadius: 14,
                            border: `1.5px solid ${aiColor}`,
                            padding: "14px 16px",
                            background: isCritical ? "rgba(248,113,113,0.07)" : isWarn ? "rgba(251,191,36,0.07)" : "rgba(52,211,153,0.07)",
                          }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Анализ ИИ</span>
                              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 800, background: aiColor, color: "#0a0f1a" }}>{ai.data.status}</span>
                            </div>
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "0 0 10px", lineHeight: 1.5 }}>{ai.data.summary}</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Врач:</span>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{ai.data.doctor}</span>
                              <span style={{ fontSize: 11, padding: "1px 9px", borderRadius: 10, background: `${aiColor}25`, color: aiColor, fontWeight: 600 }}>{ai.data.doctor_urgency}</span>
                            </div>
                            {ai.data.medications.length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Лекарства</div>
                                {ai.data.medications.map((m, i) => (
                                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", marginBottom: 4, borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
                                    {m.compartment ? (
                                      <span style={{ background: "#22d3ee", color: "#0a0f1a", fontWeight: 800, fontSize: 11, borderRadius: 6, padding: "2px 8px" }}>{m.compartment}</span>
                                    ) : (
                                      <span style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", fontSize: 11, borderRadius: 6, padding: "2px 8px" }}>—</span>
                                    )}
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{m.drug}</span>
                                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{m.dosage}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {ai.data.actions.length > 0 && (
                              <div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Действия</div>
                                {ai.data.actions.map((a, i) => (
                                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 5 }}>
                                    <span style={{ color: aiColor }}>•</span>
                                    <span style={{ color: "rgba(255,255,255,0.8)" }}>{a}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {ai?.error && (
                          <div className="alert" style={{ margin: "0 20px 16px" }}>Не удалось получить анализ ИИ</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SCHEDULE ── */}
          {activeSection === "schedule" && (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 className="h2" style={{ margin: 0 }}>{t.scheduleTitle}</h2>
                  <p className="muted" style={{ margin: "4px 0 0" }}>{t.scheduleSub}</p>
                </div>
                <DayDateNavigator
                  date={date}
                  onChange={setDate}
                  className="doctor-admin__date-nav"
                />
              </div>

              {loading ? (
                <p className="muted">{t.loading}</p>
              ) : appointments.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <CalendarClock size={36} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
                  <p className="muted">{t.noRecordsForDate}</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {appointments.map(item => (
                    <div key={item.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "14px 18px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.09)",
                      background: "rgba(255,255,255,0.03)",
                      gap: 12, flexWrap: "wrap",
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{item.time} — {resolvePatientName(item)}</div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{item.reason || t.noReason}</div>
                        {readRoomLabel(item) ? (
                          <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{t.room}: {readRoomLabel(item)}</div>
                        ) : null}
                      </div>
                      <span className={`badge ${item.status === "active" ? "badge--warn" : item.status === "done" ? "badge--ok" : "badge--danger"}`}>
                        <span className="badge__dot" />
                        {item.status === "active" ? t.inAppointment : item.status === "done" ? t.completedStatus : t.waiting}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Jitsi overlay */}
      {activeCall && (
        <JitsiPanel
          roomId={activeCall.roomId}
          doctorName={doctorName}
          consult={activeCallSession}
          measurementState={activeCallSession ? aimarMeasurementByConsult[activeCallSession.id] || null : null}
          onRunMeasurement={() => {
            if (activeCallSession) runAimarMeasurement(activeCallSession);
          }}
          onClose={() => setActiveCall(null)}
        />
      )}
      <ProfileAvatarDialog
        open={profileOpen}
        user={user}
        doctorFallback
        onClose={() => setProfileOpen(false)}
        onSaved={(next) => setSessionUser(next)}
      />
      <nav className="doctor-admin__mobile-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`doctor-admin__mobile-nav-item ${activeSection === item.id ? "doctor-admin__mobile-nav-item--active" : ""}`}
            onClick={() => setActiveSection(item.id)}
          >
            {item.icon}
            <span>{item.mobileLabel || item.label}</span>
            {item.badge ? <em className="doctor-admin__mobile-nav-badge">{item.badge}</em> : null}
          </button>
        ))}
        <button
          type="button"
          className="doctor-admin__mobile-nav-item"
          onClick={() => setProfileOpen(true)}
        >
          <CircleUserRound size={18} />
          <span>Профиль</span>
        </button>
      </nav>
    </div>
  );
}

function btnStyle(color: string, disabled = false): React.CSSProperties {
  return {
    padding: "7px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    background: disabled ? "rgba(255,255,255,0.06)" : `${color}20`,
    border: disabled ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${color}50`,
    color: disabled ? "rgba(255,255,255,0.35)" : color === "rgba(255,255,255,0.25)" ? "rgba(255,255,255,0.7)" : color,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.78 : 1,
  };
}
