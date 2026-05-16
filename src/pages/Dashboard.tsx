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

  const glass = {
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 24,
  } as React.CSSProperties;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 70%, #0f0c29 100%)",
      color: "white",
      fontFamily: "inherit",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative blobs */}
      <div style={{
        position: "fixed", top: -200, left: -200, width: 600, height: 600,
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
      }} />
      <div style={{
        position: "fixed", bottom: -150, right: -150, width: 500, height: 500,
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 70%)",
      }} />
      <div style={{
        position: "fixed", top: "40%", right: "10%", width: 300, height: 300,
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
      }} />

      {/* Sticky header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px", height: 64,
        background: "rgba(15,12,41,0.6)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, zIndex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #818cf8, #22d3ee)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(129,140,248,0.5)",
          }}>
            <Stethoscope size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>HealthAssist</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
          {isAdmin && (
            <button onClick={() => nav("/admin")} style={{
              padding: "7px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "rgba(129,140,248,0.15)", border: "1px solid rgba(129,140,248,0.35)", color: "#c7d2fe",
            }}>
              {t.adminPanel}
            </button>
          )}
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, #818cf8, #34d399)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 14, color: "#0f0c29",
            boxShadow: "0 0 16px rgba(129,140,248,0.4)",
          }}>
            {initials(displayName)}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 20px 80px", position: "relative", zIndex: 1 }}>

        {/* Hero welcome */}
        <div style={{
          ...glass,
          padding: "32px 36px",
          marginBottom: 24,
          background: "linear-gradient(135deg, rgba(129,140,248,0.15), rgba(34,211,238,0.08))",
          border: "1px solid rgba(129,140,248,0.25)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>
              {new Date().toLocaleDateString(locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
              Привет, {displayName.split(" ")[0]} 👋
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.5)", maxWidth: 400 }}>
              {t.subtitle}
            </p>
          </div>
          <button
            onClick={() => nav("/appointments/new")}
            style={{
              padding: "14px 32px", borderRadius: 14, fontWeight: 800, fontSize: 15, cursor: "pointer",
              border: "none", flexShrink: 0, letterSpacing: "-0.2px",
              background: "linear-gradient(135deg, #818cf8, #22d3ee)",
              color: "#0f0c29",
              boxShadow: "0 8px 32px rgba(129,140,248,0.45)",
            }}
          >
            + {t.bookDoctor}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
          {[
            {
              label: t.heroAppointments, value: appointmentsLoading ? "…" : appointments.length,
              grad: "linear-gradient(135deg, rgba(129,140,248,0.3), rgba(99,102,241,0.1))",
              glow: "rgba(129,140,248,0.3)", color: "#c7d2fe", border: "rgba(129,140,248,0.3)",
            },
            {
              label: t.heroMeasurements, value: loading ? "…" : items.length,
              grad: "linear-gradient(135deg, rgba(34,211,238,0.25), rgba(6,182,212,0.08))",
              glow: "rgba(34,211,238,0.25)", color: "#67e8f9", border: "rgba(34,211,238,0.3)",
            },
            {
              label: t.heroTicket, value: ticket ? `A-${ticket.ticketNumber}` : "—",
              grad: "linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.08))",
              glow: "rgba(251,191,36,0.25)", color: "#fde68a", border: "rgba(251,191,36,0.3)",
            },
          ].map((s) => (
            <div key={s.label} style={{
              ...glass,
              padding: "22px 24px",
              background: s.grad,
              border: `1px solid ${s.border}`,
              boxShadow: `0 8px 32px ${s.glow}`,
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 8, fontWeight: 500 }}>{s.label}</div>
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
              ...glass,
              padding: "24px 28px", marginBottom: 20,
              background: "linear-gradient(135deg, rgba(52,211,153,0.2), rgba(34,211,238,0.1))",
              border: "1.5px solid rgba(52,211,153,0.4)",
              boxShadow: "0 8px 40px rgba(52,211,153,0.15)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "linear-gradient(135deg, #34d399, #22d3ee)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 16px rgba(52,211,153,0.5)",
                }}>
                  <HeartPulse size={18} color="#0f0c29" />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#6ee7b7" }}>{t.confirmedTitle}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16, marginBottom: isOnline ? 20 : 0 }}>
                {[
                  { label: t.confirmedDoctor, value: dLabel },
                  { label: t.confirmedDate, value: confirmed.date },
                  { label: t.confirmedTime, value: confirmed.time && confirmed.time !== "00:00" ? confirmed.time : "—" },
                ].map((row) => (
                  <div key={row.label} style={{
                    background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{row.label}</div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{row.value}</div>
                  </div>
                ))}
              </div>
              {isOnline && (
                <a href={jitsiUrl} target="_blank" rel="noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 8, marginTop: 4,
                  background: "linear-gradient(135deg, #34d399, #22d3ee)",
                  color: "#0f0c29", borderRadius: 12, padding: "12px 28px",
                  fontWeight: 800, fontSize: 14, textDecoration: "none",
                  boxShadow: "0 6px 24px rgba(52,211,153,0.4)",
                }}>
                  <Video size={16} /> {t.joinMeeting}
                </a>
              )}
            </div>
          );
        })}

        {/* Pending appointments */}
        {pendingAppts.length > 0 && (
          <div style={{
            ...glass,
            padding: "20px 24px", marginBottom: 20,
            background: "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06))",
            border: "1px solid rgba(251,191,36,0.3)",
            boxShadow: "0 8px 32px rgba(245,158,11,0.1)",
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#fde68a", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)",
                borderRadius: 8, padding: "2px 10px", fontSize: 12,
              }}>⏳ {pendingAppts.length}</span>
              Ваши заявки на рассмотрении
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pendingAppts.map((a) => (
                <div key={a.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
                  background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "10px 14px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{a.specialty_request || a.specialtyRequest || "Специалист"}</span>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginLeft: 10 }}>{a.date}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600, background: "rgba(251,191,36,0.1)", borderRadius: 8, padding: "3px 10px" }}>
                    Ожидает врача
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 18, marginBottom: 16 }}>

          {/* Appointment list */}
          <div style={{ ...glass, padding: "26px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{t.myAppointments}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{t.myAppointmentsHint}</div>
              </div>
              <CalendarClock size={20} style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
            {appointmentsLoading ? (
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, margin: 0 }}>{t.loading}</p>
            ) : appointments.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <CalendarClock size={36} style={{ color: "rgba(255,255,255,0.1)", display: "block", margin: "0 auto 12px" }} />
                <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, margin: 0 }}>{t.noAppointments}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {appointments.slice(0, 5).map((appt, idx) => {
                  const scMap: Record<string, { grad: string; color: string; label: string }> = {
                    active: { grad: "rgba(34,211,238,0.12)", color: "#67e8f9", label: t.appointmentStatusActive },
                    done: { grad: "rgba(52,211,153,0.12)", color: "#6ee7b7", label: t.appointmentStatusDone },
                    pending: { grad: "rgba(251,191,36,0.1)", color: "#fde68a", label: t.appointmentStatusPending },
                  };
                  const sc = scMap[appt.status] ?? scMap.pending;
                  const dLabel = doctorLabel(appt);
                  const hasRealDoctor = (appt.doctor_id || appt.doctorId) && (appt.doctor_id || appt.doctorId) !== "pending";
                  return (
                    <div key={appt.id} style={{
                      borderRadius: 14, padding: "13px 16px",
                      background: idx === 0 ? "rgba(129,140,248,0.1)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${idx === 0 ? "rgba(129,140,248,0.25)" : "rgba(255,255,255,0.08)"}`,
                      transition: "background 0.2s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>
                            {appt.specialty_request || appt.specialtyRequest || (hasRealDoctor ? dLabel : "Специалист")}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                            {appt.date}{appt.time && appt.time !== "00:00" ? ` · ${appt.time}` : ""}
                            {hasRealDoctor && <span style={{ marginLeft: 8, color: "rgba(255,255,255,0.35)" }}>· {dLabel}</span>}
                          </div>
                        </div>
                        <span style={{
                          borderRadius: 20, padding: "3px 11px", fontSize: 11, fontWeight: 700, flexShrink: 0,
                          background: sc.grad, color: sc.color,
                          border: `1px solid ${sc.color}33`,
                        }}>{sc.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: ticket + vitals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Queue ticket */}
            <div style={{
              ...glass,
              padding: "22px",
              background: ticket
                ? "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(245,158,11,0.08))"
                : "rgba(255,255,255,0.05)",
              border: ticket ? "1px solid rgba(251,191,36,0.35)" : "1px solid rgba(255,255,255,0.1)",
              boxShadow: ticket ? "0 8px 32px rgba(245,158,11,0.15)" : "none",
            }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>🎫</span> {t.onlineTicket}
              </div>
              {!ticket ? (
                <>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 16px", lineHeight: 1.5 }}>{t.noTicket}</p>
                  <button
                    onClick={() => { const c = createNewMyTicket(); setTicket(c); }}
                    style={{
                      padding: "11px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%",
                      background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))",
                      border: "1px solid rgba(251,191,36,0.4)", color: "#fde68a",
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
                      <div key={m.label} style={{ borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 600 }}>{m.label}</div>
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#fde68a" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { const n = createNewMyTicket(); setTicket(n); }}
                    style={{
                      padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%",
                      background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fde68a",
                    }}
                  >{t.takeNewTicket}</button>
                </>
              )}
            </div>

            {/* Latest vitals */}
            {items.length > 0 && (
              <div style={{ ...glass, padding: "22px" }}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📊</span> {t.history}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    {
                      icon: "🌡", label: t.temp,
                      value: latestMeasurement?.tempC != null ? `${latestMeasurement.tempC}°C` : "—",
                      color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)",
                    },
                    {
                      icon: "❤️", label: t.pulse,
                      value: latestMeasurement?.hr != null ? `${latestMeasurement.hr}` : "—",
                      color: "#fb7185", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.25)",
                    },
                  ].map((v) => (
                    <div key={v.label} style={{
                      borderRadius: 14, padding: "16px 14px",
                      background: v.bg, border: `1px solid ${v.border}`,
                    }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{v.icon}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: v.color }}>{v.value}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, fontWeight: 500 }}>{v.label}</div>
                    </div>
                  ))}
                </div>
                {latestMeasurement && (
                  <Link to={`/app/measurements/${latestMeasurement.id}`} style={{
                    display: "block", marginTop: 14, textAlign: "center", fontSize: 13,
                    color: "rgba(255,255,255,0.3)", textDecoration: "none", fontWeight: 500,
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
