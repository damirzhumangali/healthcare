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
  fetchMyAppointments,
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
  const [apptVisible, setApptVisible] = useState(5);
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
      const data = await fetchMyAppointments();
      const sorted = (data.items ?? []).sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
      });
      setAppointments(sorted);
    } catch {
      setErr(t.appointmentError);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [t.appointmentError]);

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
      { key: "scheduled" as const, label: tele.stageScheduled, desc: tele.stageScheduledDesc },
      { key: "robot_en_route" as const, label: tele.stageRobot, desc: tele.stageRobotDesc },
      { key: "bedside_ready" as const, label: tele.stageReady, desc: tele.stageReadyDesc },
      { key: "live" as const, label: tele.stageLive, desc: tele.stageLiveDesc },
      { key: "completed" as const, label: tele.stageCompleted, desc: tele.stageCompletedDesc },
    ];
  }

  const stageRank: Record<ConsultationStage, number> = {
    scheduled: 0,
    robot_en_route: 1,
    bedside_ready: 2,
    live: 3,
    completed: 4,
  };

  const confirmedAppts = appointments.filter(
    (a) => a.status === "active" && (a.doctor_id || a.doctorId) && (a.doctor_id || a.doctorId) !== "pending"
  );
  const pendingAppts = appointments.filter((a) => a.status === "pending");

  const statusMeta = (status: AppointmentStatus) => {
    if (status === "active") return { label: t.appointmentStatusActive, color: "#60a5fa", bg: "rgba(96,165,250,0.12)" };
    if (status === "done") return { label: t.appointmentStatusDone, color: "#34d399", bg: "rgba(52,211,153,0.12)" };
    return { label: t.appointmentStatusPending, color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.06)" };
  };

  /* escape .container padding (28px top, 24px sides, 60px bottom) */
  return (
    <div style={{
      margin: "-28px -24px -60px",
      minHeight: "calc(100vh - 56px)",
      background: "transparent",
      color: "white",
      fontFamily: "inherit",
    }}>

      <div style={{ padding: "40px 48px 80px" }}>

        {/* Welcome */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
              {new Date().toLocaleDateString(locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: "-0.8px" }}>
              Привет, {displayName.split(" ")[0]} 👋
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isAdmin && (
              <button onClick={() => nav("/admin")} style={{
                padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)",
              }}>{t.adminPanel}</button>
            )}
            <button onClick={() => nav("/appointments/new")} style={{
              padding: "10px 22px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", border: "none",
              background: "linear-gradient(135deg, #818cf8, #38bdf8)", color: "#0a0f1a",
            }}>+ {t.bookDoctor}</button>
          </div>
        </div>

        {/* Stats row — appointments + ticket only */}
        <div style={{ display: "flex", gap: 0, borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 32, padding: "18px 0" }}>
          <div style={{ flex: 1, textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: "white", lineHeight: 1 }}>{appointmentsLoading ? "…" : appointments.length}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 5 }}>{t.heroAppointments}</div>
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: "white", lineHeight: 1 }}>{ticket ? `A-${ticket.ticketNumber}` : "—"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 5 }}>{t.heroTicket}</div>
          </div>
        </div>

        {/* Confirmed appointment banner */}
        {confirmedAppts.map((confirmed) => {
          const isOnline = confirmed.wants_online || confirmed.wantsOnline;
          const jitsiUrl = `https://meet.jit.si/healthassist-${confirmed.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
          return (
            <div key={`conf-${confirmed.id}`} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
              background: "rgba(52,211,153,0.07)", borderLeft: "3px solid #34d399",
              padding: "14px 20px", marginBottom: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <HeartPulse size={16} color="#34d399" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#6ee7b7" }}>{t.confirmedTitle}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                    {confirmed.specialty_request || confirmed.specialtyRequest || "Специалист"} · {confirmed.date}{confirmed.time && confirmed.time !== "00:00" ? ` · ${confirmed.time}` : ""}
                  </div>
                </div>
              </div>
              {isOnline && (
                <a href={jitsiUrl} target="_blank" rel="noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#34d399", color: "#0a0f1a", borderRadius: 6,
                  padding: "7px 16px", fontWeight: 700, fontSize: 12, textDecoration: "none",
                }}>
                  <Video size={12} /> {t.joinMeeting}
                </a>
              )}
            </div>
          );
        })}

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 48, marginTop: confirmedAppts.length > 0 ? 24 : 0 }}>

          {/* Appointments — paginated table */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                {t.myAppointments} {!appointmentsLoading && appointments.length > 0 && `(${appointments.length})`}
              </div>
            </div>

            {appointmentsLoading ? (
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, margin: 0 }}>{t.loading}</p>
            ) : appointments.length === 0 ? (
              <div style={{ padding: "28px 0" }}>
                <CalendarClock size={24} style={{ color: "rgba(255,255,255,0.1)", display: "block", marginBottom: 8 }} />
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, margin: 0 }}>{t.noAppointments}</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 12, padding: "0 0 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}>
                  {["Специальность · Дата", "Статус"].map((h) => (
                    <div key={h} style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>
                  ))}
                </div>

                {appointments.slice(0, apptVisible).map((appt, idx) => {
                  const sm = statusMeta(appt.status);
                  const isEven = idx % 2 === 0;
                  return (
                    <div key={appt.id} style={{
                      display: "grid", gridTemplateColumns: "1fr 110px", gap: 12,
                      padding: "11px 8px",
                      background: isEven ? "rgba(255,255,255,0.02)" : "transparent",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {appt.specialty_request || appt.specialtyRequest || "Специалист"}
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                          {appt.date}{appt.time && appt.time !== "00:00" ? ` · ${appt.time}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, borderRadius: 4, padding: "2px 8px",
                          color: sm.color, background: sm.bg, whiteSpace: "nowrap",
                        }}>{sm.label}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {appointments.length > apptVisible ? (
                  <button
                    onClick={() => setApptVisible((v) => v + 5)}
                    style={{
                      marginTop: 14, width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    Показать ещё {Math.min(5, appointments.length - apptVisible)} из {appointments.length - apptVisible}
                  </button>
                ) : apptVisible > 5 ? (
                  <button
                    onClick={() => setApptVisible(5)}
                    style={{
                      marginTop: 14, width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: "none", border: "none", color: "rgba(255,255,255,0.25)",
                    }}
                  >{t.showLess}</button>
                ) : null}
              </>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* Ticket */}
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>
                {t.onlineTicket}
              </div>
              {!ticket ? (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "16px 18px" }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", margin: "0 0 12px", lineHeight: 1.6 }}>{t.noTicket}</p>
                  <button
                    onClick={() => { const c = createNewMyTicket(); setTicket(c); }}
                    style={{
                      padding: "8px 16px", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
                    }}
                  >{t.takeNewTicket}</button>
                </div>
              ) : (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "16px 18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    {[
                      { label: t.yourNumber, value: `A-${ticket.ticketNumber}` },
                      { label: t.nowCalling, value: `A-${ticket.servingNow}` },
                      { label: t.ahead, value: ticket.peopleAhead },
                      { label: t.waiting, value: `~${ticket.etaMinutes} ${t.minutes}` },
                    ].map((m) => (
                      <div key={m.label}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontWeight: 800, fontSize: 20, color: "white" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { const n = createNewMyTicket(); setTicket(n); }}
                    style={{
                      padding: "7px 14px", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
                    }}
                  >{t.takeNewTicket}</button>
                </div>
              )}
            </div>

            {/* Measurements */}
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>
                {t.history}
              </div>
              {items.length === 0 ? (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "16px 18px" }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", margin: "0 0 12px", lineHeight: 1.5 }}>{t.noMeasurements}</p>
                  <button onClick={() => nav("/app/measurements/new")} style={{
                    padding: "8px 16px", borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: "pointer",
                    background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)", color: "#a5b4fc",
                  }}>+ {t.newMeasurement}</button>
                </div>
              ) : (
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "16px 18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    {[
                      { icon: "🌡", label: t.temp, value: latestMeasurement?.tempC != null ? `${latestMeasurement.tempC}°C` : "—" },
                      { icon: "❤️", label: t.pulse, value: latestMeasurement?.hr != null ? `${latestMeasurement.hr} bpm` : "—" },
                    ].map((v) => (
                      <div key={v.label}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, marginBottom: 4 }}>{v.icon} {v.label}</div>
                        <div style={{ fontWeight: 800, fontSize: 22, color: "white" }}>{v.value}</div>
                      </div>
                    ))}
                  </div>
                  {latestMeasurement && (
                    <Link to={`/app/measurements/${latestMeasurement.id}`} style={{
                      fontSize: 12, color: "rgba(255,255,255,0.2)", textDecoration: "none",
                    }}>
                      {fmtDate(latestMeasurement.createdAt)} →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {err && <div className="alert" style={{ marginTop: 24 }}>{err}</div>}
      </div>
    </div>
  );
}
