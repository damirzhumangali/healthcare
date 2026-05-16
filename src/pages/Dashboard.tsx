import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Bot,
  CalendarClock,
  HeartPulse,
  Mic,
  Package,
  Stethoscope,
  Video,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { fetchMyMeasurements, readCachedMeasurements, type MeasurementItem } from "../lib/apiMeasurements";
import {
  DOCTORS,
  fetchAppointments,
  type Appointment,
  type AppointmentStatus,
} from "../lib/apiAppointments";
import {
  syncBedsideConsultations,
  type BedsideConsultationView,
  type ConsultationStage,
} from "../lib/onlineConsultations";
import { createNewMyTicket, getMyTicket, type OnlineTicketView } from "../lib/onlineTicket";
import { useAppPreferences } from "../lib/appPreferences";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

const copy = {
  ru: {
    title: "Кабинет пациента",
    subtitle: "Записывайтесь к врачу, следите за талоном и храните историю измерений.",
    hello: "Аккаунт",
    heroAppointments: "Записей",
    heroMeasurements: "Измерений",
    heroTicket: "Талон",
    heroSnapshot: "Состояние кабинета",
    heroQueueMissing: "Талон пока не получен",
    heroUpcomingVisit: "Ближайшая запись",
    heroLatestMeasurement: "Последнее измерение",
    heroNoAppointments: "Записей пока нет",
    heroNoMeasurements: "Данных измерений пока нет",
    quickActions: "Быстрые действия",
    quickActionsHint: "Выберите, что нужно сделать сейчас.",
    bookDoctor: "Записаться к врачу",
    newMeasurement: "Добавить измерение",
    adminPanel: "Зайти в админку",
    myAppointments: "История",
    myAppointmentsHint: "Здесь будут отображаться ваши записи и посещения.",
    noAppointments: "История пока пуста.",
    appointmentError: "Не удалось загрузить записи. Попробуйте обновить страницу.",
    doctor: "Врач",
    reason: "Причина",
    appointmentStatusPending: "Ожидает",
    appointmentStatusActive: "На приеме",
    appointmentStatusDone: "Завершен",
    onlineTicket: "Талон",
    refresh: "Обновить статус",
    noTicket: "Активного талона нет. Получите талон, если вы уже в клинике.",
    takeNewTicket: "Получить талон",
    yourNumber: "Ваш талон",
    nowCalling: "Сейчас принимают",
    ahead: "Перед вами",
    waiting: "Примерное ожидание",
    minutes: "мин",
    invited: "Вас приглашают",
    waitForCall: "Талон активен",
    ticketMissed: "Талон пропущен",
    issued: "Получен",
    history: "История измерений",
    loading: "Загрузка...",
    noMeasurements: "Измерений пока нет. Добавьте вручную.",
    pressure: "Давление",
    temp: "Темп",
    pulse: "Пульс",
    spo2: "SpO₂",
    device: "устройство",
    measurementError: "Не удалось загрузить измерения. Попробуйте обновить страницу.",
    createMeasurementError: "Не получилось создать измерение. Попробуйте еще раз.",
    showAll: "Показать все",
    showLess: "Свернуть",
    confirmedTitle: "Ваш приём подтверждён",
    confirmedDoctor: "Врач",
    confirmedDate: "Дата",
    confirmedTime: "Время",
    joinMeeting: "Присоединиться к встрече",
  },
  kk: {
    title: "Науқас кабинеты",
    subtitle: "Дәрігерге жазылып, талонды бақылап, өлшеулер тарихын сақтаңыз.",
    hello: "Аккаунт",
    heroAppointments: "Жазылулар",
    heroMeasurements: "Өлшеулер",
    heroTicket: "Талон",
    heroSnapshot: "Кабинет күйі",
    heroQueueMissing: "Талон әлі алынбаған",
    heroUpcomingVisit: "Жақын жазылу",
    heroLatestMeasurement: "Соңғы өлшеу",
    heroNoAppointments: "Жазылулар әзірге жоқ",
    heroNoMeasurements: "Өлшеу деректері әзірге жоқ",
    quickActions: "Жылдам әрекеттер",
    quickActionsHint: "Қазір не істеу керегін таңдаңыз.",
    bookDoctor: "Дәрігерге жазылу",
    newMeasurement: "Өлшеу қосу",
    adminPanel: "Админкаға кіру",
    myAppointments: "Тарих",
    myAppointmentsHint: "Мұнда сіздің жазылуларыңыз бен қабылдауларыңыз көрсетіледі.",
    noAppointments: "Тарих әзірге бос.",
    appointmentError: "Жазбаларды жүктеу мүмкін болмады. Бетті жаңартып көріңіз.",
    doctor: "Дәрігер",
    reason: "Себебі",
    appointmentStatusPending: "Күтуде",
    appointmentStatusActive: "Қабылдауда",
    appointmentStatusDone: "Аяқталды",
    onlineTicket: "Талон",
    refresh: "Статусты жаңарту",
    noTicket: "Белсенді талон жоқ. Клиникада болсаңыз, талон алыңыз.",
    takeNewTicket: "Талон алу",
    yourNumber: "Сіздің талоныңыз",
    nowCalling: "Қазір қабылдайды",
    ahead: "Алдыңызда",
    waiting: "Шамамен күту",
    minutes: "мин",
    invited: "Сізді шақырып жатыр",
    waitForCall: "Талон белсенді",
    ticketMissed: "Талон өткізіп алды",
    issued: "Алынды",
    history: "Өлшеулер тарихы",
    loading: "Жүктелуде...",
    noMeasurements: "Әлі өлшеулер жоқ. Қолмен қосыңыз.",
    confirmedTitle: "Қабылдауыңыз расталды",
    confirmedDoctor: "Дәрігер",
    confirmedDate: "Күні",
    confirmedTime: "Уақыты",
    joinMeeting: "Кездесуге қосылу",
    pressure: "Қысым",
    temp: "Темп",
    pulse: "Пульс",
    spo2: "SpO₂",
    device: "құрылғы",
    measurementError: "Өлшеулерді жүктеу мүмкін болмады. Бетті жаңартып көріңіз.",
    createMeasurementError: "Өлшеуді қосу мүмкін болмады. Қайта көріңіз.",
    showAll: "Барлығын көрсету",
    showLess: "Жию",
  },
  en: {
    title: "Patient Dashboard",
    subtitle: "Book visits, track your clinic ticket, and keep measurement history.",
    hello: "Account",
    heroAppointments: "Appointments",
    heroMeasurements: "Measurements",
    heroTicket: "Ticket",
    heroSnapshot: "Dashboard status",
    heroQueueMissing: "No active ticket yet",
    heroUpcomingVisit: "Closest visit",
    heroLatestMeasurement: "Latest reading",
    heroNoAppointments: "No appointments yet",
    heroNoMeasurements: "No measurements yet",
    quickActions: "Quick Actions",
    quickActionsHint: "Choose what you need to do now.",
    bookDoctor: "Book a Doctor",
    newMeasurement: "Add Measurement",
    adminPanel: "Open Admin",
    myAppointments: "History",
    myAppointmentsHint: "Your appointments and visits will appear here.",
    noAppointments: "History is empty for now.",
    appointmentError: "Failed to load appointments. Try refreshing the page.",
    doctor: "Doctor",
    reason: "Reason",
    appointmentStatusPending: "Pending",
    appointmentStatusActive: "In progress",
    appointmentStatusDone: "Done",
    onlineTicket: "Queue Ticket",
    refresh: "Refresh Status",
    noTicket: "No active ticket. Take a ticket if you are already at the clinic.",
    takeNewTicket: "Take Ticket",
    yourNumber: "Your Ticket",
    nowCalling: "Now Seeing",
    ahead: "Ahead",
    waiting: "Estimated Wait",
    minutes: "min",
    invited: "You are invited",
    waitForCall: "Ticket active",
    ticketMissed: "Ticket missed",
    issued: "Taken",
    history: "Measurement History",
    loading: "Loading...",
    noMeasurements: "No measurements yet. Add one manually.",
    confirmedTitle: "Your appointment is confirmed",
    confirmedDoctor: "Doctor",
    confirmedDate: "Date",
    confirmedTime: "Time",
    joinMeeting: "Join meeting",
    pressure: "Pressure",
    temp: "Temp",
    pulse: "Pulse",
    spo2: "SpO₂",
    device: "device",
    measurementError: "Failed to load measurements. Try refreshing the page.",
    createMeasurementError: "Failed to add measurement. Try again.",
    showAll: "Show all",
    showLess: "Show less",
  },
} as const;

const telemedCopy = {
  ru: {
    eyebrow: "AIMAR Ward Link",
    title: "Онлайн-консультация в палате",
    emptyTitle: "Палатная онлайн-сессия появится здесь",
    emptyText:
      "Как только врач назначит дистанционный осмотр, система покажет время, врача, палату и готовность терминала у кровати.",
    automation:
      "Пациенту не нужно идти в кабинет: робот или терминал сам приедет к кровати, включит связь и передаст врачу показатели.",
    doctor: "Врач",
    schedule: "Время",
    location: "Палата",
    robot: "Терминал",
    deviceReadiness: "Готовность у кровати",
    liveMetrics: "Данные в реальном времени",
    timeline: "Как это пройдет",
    vitalsHint:
      "Температура и пульс уходят врачу автоматически, без ручного ввода со стороны пациента.",
    camera: "Камера врача",
    audio: "Микрофон и динамик",
    monitoring: "Мониторинг",
    medication: "Выдача лекарства",
    bookVisit: "Назначить консультацию",
    robotOnline: "связь с AIMAR готова",
    pending: "ожидает активации",
    stageScheduled: "Назначено",
    stageRobot: "Робот едет",
    stageReady: "У кровати",
    stageLive: "Идёт онлайн",
    stageCompleted: "Сохранено",
    stageScheduledDesc: "Система знает врача, время и палату пациента.",
    stageRobotDesc: "Терминал сам направляется к нужной кровати.",
    stageReadyDesc: "Экран, камера и звук готовы к разговору.",
    stageLiveDesc: "Врач видит пациента и показатели в одном окне.",
    stageCompletedDesc: "Итоги, назначения и лекарства попадут в историю.",
  },
  kk: {
    eyebrow: "AIMAR Ward Link",
    title: "Палатадағы онлайн кеңес",
    emptyTitle: "Палаталық онлайн сессия осында көрінеді",
    emptyText:
      "Дәрігер қашықтан қарауды тағайындаған кезде, жүйе уақытты, дәрігерді, палатаны және терминал дайындығын көрсетеді.",
    automation:
      "Пациентке кабинетке барудың қажеті жоқ: робот немесе терминал кереуетке өзі келіп, байланысты қосып, көрсеткіштерді дәрігерге жібереді.",
    doctor: "Дәрігер",
    schedule: "Уақыты",
    location: "Палата",
    robot: "Терминал",
    deviceReadiness: "Кереует жанындағы дайындық",
    liveMetrics: "Нақты уақыттағы деректер",
    timeline: "Қалай өтеді",
    vitalsHint:
      "Температура мен пульс пациент ештеңе енгізбей-ақ дәрігерге автоматты түрде жіберіледі.",
    camera: "Дәрігер камерасы",
    audio: "Микрофон мен динамик",
    monitoring: "Мониторинг",
    medication: "Дәрі беру",
    bookVisit: "Кеңес тағайындау",
    robotOnline: "AIMAR байланысы дайын",
    pending: "іске қосуды күтуде",
    stageScheduled: "Тағайындалды",
    stageRobot: "Робот келе жатыр",
    stageReady: "Кереует жанында",
    stageLive: "Онлайн жүріп жатыр",
    stageCompleted: "Сақталды",
    stageScheduledDesc: "Жүйе дәрігерді, уақытты және палатаны біледі.",
    stageRobotDesc: "Терминал қажетті кереуетке өзі барады.",
    stageReadyDesc: "Экран, камера және дыбыс сөйлесуге дайын.",
    stageLiveDesc: "Дәрігер науқас пен көрсеткіштерді бір терезеде көреді.",
    stageCompletedDesc: "Қорытынды, тағайындаулар және дәрілер тарихқа сақталады.",
  },
  en: {
    eyebrow: "AIMAR Ward Link",
    title: "Bedside online consultation",
    emptyTitle: "Your bedside session will appear here",
    emptyText:
      "As soon as a doctor schedules a remote bedside review, this panel will show the time, doctor, ward, and terminal readiness.",
    automation:
      "The patient does not need to move: a robot or bedside terminal comes to the bed, opens the call, and streams vitals to the doctor.",
    doctor: "Doctor",
    schedule: "Schedule",
    location: "Ward",
    robot: "Terminal",
    deviceReadiness: "Bedside readiness",
    liveMetrics: "Live vitals",
    timeline: "How it will work",
    vitalsHint:
      "Temperature and pulse are sent to the doctor automatically without patient input.",
    camera: "Doctor camera",
    audio: "Mic and speaker",
    monitoring: "Monitoring",
    medication: "Medication handoff",
    bookVisit: "Schedule consult",
    robotOnline: "AIMAR link ready",
    pending: "waiting for activation",
    stageScheduled: "Scheduled",
    stageRobot: "Robot en route",
    stageReady: "At bedside",
    stageLive: "Live now",
    stageCompleted: "Saved",
    stageScheduledDesc: "The system knows the doctor, time, and patient ward.",
    stageRobotDesc: "The terminal drives itself to the correct bed.",
    stageReadyDesc: "Screen, camera, and audio are ready for the visit.",
    stageLiveDesc: "The doctor sees the patient and vitals in one view.",
    stageCompletedDesc: "Results, orders, and meds are archived automatically.",
  },
} as const;

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function readCurrentUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function appointmentBelongsToUser(item: Appointment, user: StoredUser | null) {
  const userId = String(user?.id || "");
  const userEmail = String(user?.email || "").toLowerCase();
  const patientId = String(item.patient_id || item.patientId || "");
  const patientEmail = String(item.patient_email || item.patientEmail || "").toLowerCase();

  if (!patientId && !patientEmail) return true;
  return Boolean((userId && patientId === userId) || (userEmail && patientEmail === userEmail));
}

function doctorLabel(item: Appointment) {
  const doctorId = item.doctor_id || item.doctorId;
  const doctor = DOCTORS.find((doctorItem) => doctorItem.id === doctorId);
  return item.doctorName || (doctor ? `${doctor.name} - ${doctor.specialty}` : doctorId) || "Врач";
}

function appointmentStatusClass(status: AppointmentStatus) {
  if (status === "active") return "badge--warn";
  if (status === "done") return "badge--ok";
  return "badge--danger";
}

function consultationBadgeClass(stage: ConsultationStage) {
  if (stage === "live" || stage === "completed") return "badge--ok";
  if (stage === "bedside_ready") return "badge--ok";
  return "badge--warn";
}

function scheduleMs(date: string, time: string) {
  const value = Date.parse(`${date}T${time}:00`);
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
}

function pickPrimaryAppointment(items: Appointment[]) {
  if (items.length === 0) return null;
  const now = Date.now();
  const future = items
    .filter((item) => scheduleMs(item.date, item.time) >= now - 60 * 60 * 1000)
    .sort((a, b) => scheduleMs(a.date, a.time) - scheduleMs(b.date, b.time));
  return future[0] ?? items[items.length - 1] ?? null;
}

function pickPrimaryConsultation(items: BedsideConsultationView[]) {
  if (items.length === 0) return null;
  const now = Date.now();
  const liveOrReady = items.filter((item) => item.stage === "live" || item.stage === "bedside_ready");
  if (liveOrReady.length > 0) return liveOrReady[0];

  const future = items
    .filter((item) => item.stage !== "completed" && scheduleMs(item.date, item.time) >= now - 60 * 60 * 1000)
    .sort((a, b) => scheduleMs(a.date, a.time) - scheduleMs(b.date, b.time));
  return future[0] ?? items[items.length - 1] ?? null;
}

export default function Dashboard() {
  const nav = useNavigate();
  const { locale } = useAppPreferences();
  const currentUser = useMemo(() => readCurrentUser(), []);
  const isAdmin = currentUser?.role === "admin";
  const displayName = currentUser?.name || currentUser?.email || "HealthAssist";

  // Doctor account → redirect to doctor dashboard
  if (currentUser?.email === "alixan.baktybaev@gmail.com") {
    return <Navigate to="/doctor" replace />;
  }

  const t = copy[locale];
  const tele = telemedCopy[locale];

  const [items, setItems] = useState<MeasurementItem[]>(() => readCachedMeasurements());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<BedsideConsultationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState<OnlineTicketView | null>(null);
  const [showAllMeasurements, setShowAllMeasurements] = useState(false);
  const latestMeasurement = items[0] ?? null;
  const nextAppointment = pickPrimaryAppointment(appointments);
  const nextConsultation = pickPrimaryConsultation(consultations);

  const refreshTicket = useCallback(() => {
    const currentTicket = getMyTicket();
    setTicket(currentTicket?.status === "passed" ? null : currentTicket);
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const data = await fetchMyMeasurements();
      setItems(data.items ?? []);
    } catch {
      setItems(readCachedMeasurements());
      setErr(t.measurementError);
    } finally {
      setLoading(false);
    }
  }, [t.measurementError]);

  const loadAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    try {
      const data = await fetchAppointments();
      const mine = (data.items ?? [])
        .filter((item) => appointmentBelongsToUser(item, currentUser))
        .sort((a, b) => {
          const byDate = a.date.localeCompare(b.date);
          return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
        });
      setAppointments(mine);
    } catch {
      setErr(t.appointmentError);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [currentUser, t.appointmentError]);

  function appointmentStatusLabel(status: AppointmentStatus) {
    if (status === "active") return t.appointmentStatusActive;
    if (status === "done") return t.appointmentStatusDone;
    return t.appointmentStatusPending;
  }

  useEffect(() => {
    load();
    loadAppointments();
    refreshTicket();

    const timer = window.setInterval(() => {
      refreshTicket();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [load, loadAppointments, refreshTicket]);

  useEffect(() => {
    setConsultations(syncBedsideConsultations(appointments));
  }, [appointments]);

  function consultationStageLabel(stage: ConsultationStage) {
    if (stage === "robot_en_route") return tele.stageRobot;
    if (stage === "bedside_ready") return tele.stageReady;
    if (stage === "live") return tele.stageLive;
    if (stage === "completed") return tele.stageCompleted;
    return tele.stageScheduled;
  }

  function consultationTimeline() {
    return [
      {
        key: "scheduled" as const,
        label: tele.stageScheduled,
        desc: tele.stageScheduledDesc,
      },
      {
        key: "robot_en_route" as const,
        label: tele.stageRobot,
        desc: tele.stageRobotDesc,
      },
      {
        key: "bedside_ready" as const,
        label: tele.stageReady,
        desc: tele.stageReadyDesc,
      },
      {
        key: "live" as const,
        label: tele.stageLive,
        desc: tele.stageLiveDesc,
      },
      {
        key: "completed" as const,
        label: tele.stageCompleted,
        desc: tele.stageCompletedDesc,
      },
    ];
  }

  const stageRank: Record<ConsultationStage, number> = {
    scheduled: 0,
    robot_en_route: 1,
    bedside_ready: 2,
    live: 3,
    completed: 4,
  };

  const confirmedAppts = appointments.filter((a) => a.status === "active" && (a.doctor_id || a.doctorId) && (a.doctor_id || a.doctorId) !== "pending");
  const pendingAppts = appointments.filter((a) => a.status === "pending");

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0a0f1a)", color: "white", fontFamily: "inherit" }}>

      {/* Top navbar */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 60,
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky", top: 0, zIndex: 10,
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #22d3ee, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Stethoscope size={16} color="#0a0f1a" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>HealthAssist</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isAdmin && (
            <button
              onClick={() => nav("/admin")}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                color: "#a5b4fc", cursor: "pointer",
              }}
            >
              {t.adminPanel}
            </button>
          )}
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #22d3ee)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 13, color: "#0a0f1a", flexShrink: 0,
          }}>
            {initials(displayName)}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 20px 60px" }}>

        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
            {new Date().toLocaleDateString(locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>
            Привет, {displayName.split(" ")[0]} 👋
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", margin: "6px 0 0", fontSize: 14 }}>
            {t.subtitle}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: t.heroAppointments, value: appointmentsLoading ? "…" : appointments.length, color: "#6366f1", bg: "rgba(99,102,241,0.1)", border: "rgba(99,102,241,0.2)" },
            { label: t.heroMeasurements, value: loading ? "…" : items.length, color: "#22d3ee", bg: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.18)" },
            { label: t.heroTicket, value: ticket ? `A-${ticket.ticketNumber}` : "—", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.18)" },
          ].map((s) => (
            <div key={s.label} style={{
              borderRadius: 16, padding: "18px 20px",
              background: s.bg, border: `1px solid ${s.border}`,
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Confirmed appointment banner */}
        {confirmedAppts.map((confirmed) => {
          const isOnline = confirmed.wants_online || confirmed.wantsOnline;
          const jitsiUrl = `https://meet.jit.si/healthassist-${confirmed.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
          const dLabel = doctorLabel(confirmed);
          return (
            <div key={`conf-${confirmed.id}`} style={{
              borderRadius: 20, padding: "22px 24px", marginBottom: 20,
              background: "linear-gradient(135deg, rgba(52,211,153,0.13), rgba(34,211,238,0.08))",
              border: "1.5px solid rgba(52,211,153,0.4)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(52,211,153,0.2)", border: "1.5px solid rgba(52,211,153,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <HeartPulse size={16} color="#34d399" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#34d399" }}>{t.confirmedTitle}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16, marginBottom: isOnline ? 18 : 0 }}>
                {[
                  { label: t.confirmedDoctor, value: dLabel },
                  { label: t.confirmedDate, value: confirmed.date },
                  { label: t.confirmedTime, value: confirmed.time && confirmed.time !== "00:00" ? confirmed.time : "—" },
                ].map((row) => (
                  <div key={row.label}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{row.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{row.value}</div>
                  </div>
                ))}
              </div>
              {isOnline && (
                <a href={jitsiUrl} target="_blank" rel="noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #34d399, #22d3ee)",
                  color: "#0a1628", borderRadius: 10, padding: "10px 22px",
                  fontWeight: 800, fontSize: 14, textDecoration: "none",
                }}>
                  <Video size={16} />
                  {t.joinMeeting}
                </a>
              )}
            </div>
          );
        })}

        {/* Pending appointments waiting for doctor */}
        {pendingAppts.length > 0 && (
          <div style={{
            borderRadius: 16, padding: "16px 20px", marginBottom: 20,
            background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)",
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#f59e0b", marginBottom: 10 }}>
              ⏳ Ваши заявки на рассмотрении ({pendingAppts.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingAppts.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{a.specialty_request || a.specialtyRequest || "Специалист"}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginLeft: 8 }}>{a.date}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>Ожидает назначения врача</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main CTA */}
        <div style={{
          borderRadius: 20, padding: "24px",
          background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(34,211,238,0.08))",
          border: "1px solid rgba(99,102,241,0.25)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 16, flexWrap: "wrap", marginBottom: 20,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Записаться к врачу</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>Опишите симптомы — администратор назначит врача и время</div>
          </div>
          <button
            onClick={() => nav("/appointments/new")}
            style={{
              padding: "12px 28px", borderRadius: 12, fontWeight: 800, fontSize: 15,
              background: "linear-gradient(135deg, #6366f1, #22d3ee)",
              color: "#0a1628", border: "none", cursor: "pointer", flexShrink: 0,
            }}
          >
            {t.bookDoctor}
          </button>
        </div>

        {/* Two-column grid: appointments + ticket */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

          {/* Appointment list */}
          <div style={{
            borderRadius: 20, padding: "22px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{t.myAppointments}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>{t.myAppointmentsHint}</div>
            {appointmentsLoading ? (
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: 0 }}>{t.loading}</p>
            ) : appointments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CalendarClock size={32} style={{ color: "rgba(255,255,255,0.15)", display: "block", margin: "0 auto 10px" }} />
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, margin: 0 }}>{t.noAppointments}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {appointments.slice(0, 4).map((appt) => {
                  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
                    active: { bg: "rgba(34,211,238,0.12)", color: "#22d3ee", label: t.appointmentStatusActive },
                    done: { bg: "rgba(52,211,153,0.12)", color: "#34d399", label: t.appointmentStatusDone },
                    pending: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b", label: t.appointmentStatusPending },
                  };
                  const sc = statusColors[appt.status] ?? statusColors.pending;
                  const dLabel = doctorLabel(appt);
                  const hasRealDoctor = (appt.doctor_id || appt.doctorId) && (appt.doctor_id || appt.doctorId) !== "pending";
                  return (
                    <div key={appt.id} style={{
                      borderRadius: 12, padding: "12px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {appt.specialty_request || appt.specialtyRequest || (hasRealDoctor ? dLabel : "Специалист")}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                            {appt.date}{appt.time && appt.time !== "00:00" ? ` · ${appt.time}` : ""}
                          </div>
                          {hasRealDoctor && (
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{dLabel}</div>
                          )}
                        </div>
                        <span style={{
                          borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                          background: sc.bg, color: sc.color, flexShrink: 0,
                        }}>{sc.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ticket + Measurements */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Queue ticket */}
            <div style={{
              borderRadius: 20, padding: "22px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.09)",
              flex: ticket ? "none" : 1,
            }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{t.onlineTicket}</div>
              {!ticket ? (
                <>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 16px" }}>{t.noTicket}</p>
                  <button
                    onClick={() => { const c = createNewMyTicket(); setTicket(c); }}
                    style={{
                      padding: "10px 20px", borderRadius: 10, fontWeight: 700, fontSize: 14,
                      background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)",
                      color: "#f59e0b", cursor: "pointer", width: "100%",
                    }}
                  >{t.takeNewTicket}</button>
                </>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: t.yourNumber, value: `A-${ticket.ticketNumber}` },
                      { label: t.nowCalling, value: `A-${ticket.servingNow}` },
                      { label: t.ahead, value: ticket.peopleAhead },
                      { label: t.waiting, value: `~${ticket.etaMinutes} ${t.minutes}` },
                    ].map((m) => (
                      <div key={m.label} style={{ borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.05)" }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { const n = createNewMyTicket(); setTicket(n); }}
                    style={{
                      padding: "8px 16px", borderRadius: 9, fontWeight: 700, fontSize: 13,
                      background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)",
                      color: "#f59e0b", cursor: "pointer", width: "100%",
                    }}
                  >{t.takeNewTicket}</button>
                </>
              )}
            </div>

            {/* Latest measurement */}
            {items.length > 0 && (
              <div style={{
                borderRadius: 20, padding: "22px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14 }}>{t.history}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { icon: "🌡", label: t.temp, value: latestMeasurement?.tempC != null ? `${latestMeasurement.tempC}°C` : "—" },
                    { icon: "❤️", label: t.pulse, value: latestMeasurement?.hr != null ? `${latestMeasurement.hr}` : "—" },
                  ].map((v) => (
                    <div key={v.label} style={{ borderRadius: 12, padding: "14px", background: "rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>{v.icon}</div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{v.value}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{v.label}</div>
                    </div>
                  ))}
                </div>
                {latestMeasurement && (
                  <Link to={`/app/measurements/${latestMeasurement.id}`} style={{
                    display: "block", marginTop: 12, textAlign: "center",
                    fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none",
                  }}>
                    {fmtDate(latestMeasurement.createdAt)} →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {err && <div className="alert" style={{ marginTop: 12 }}>{err}</div>}
      </div>
    </div>
  );
}
