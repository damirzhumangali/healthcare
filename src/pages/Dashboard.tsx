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

  /* escape .container padding (28px top, 24px sides, 60px bottom) */
  return (
    <div style={{
      margin: "-28px -24px -60px",
      minHeight: "calc(100vh - 56px)",
      background: "transparent",
      color: "white",
      fontFamily: "inherit",
      position: "relative",
    }}>

      <div style={{ position: "relative", zIndex: 1, padding: "44px 48px 80px" }}>

        {/* Welcome + CTA */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
              {new Date().toLocaleDateString(locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 style={{ fontSize: 38, fontWeight: 900, margin: "0 0 8px", letterSpacing: "-1px", lineHeight: 1.1 }}>
              Привет, {displayName.split(" ")[0]} 👋
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.4)" }}>
              {t.subtitle}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            {isAdmin && (
              <button onClick={() => nav("/admin")} style={{
                padding: "12px 22px", borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: "pointer",
                background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.25)", color: "#c7d2fe",
              }}>
                {t.adminPanel}
              </button>
            )}
            <button onClick={() => nav("/appointments/new")} style={{
              padding: "12px 28px", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", border: "none",
              background: "linear-gradient(135deg, #818cf8, #22d3ee)", color: "#0f0c29",
              boxShadow: "0 4px 20px rgba(129,140,248,0.4)",
            }}>
              + {t.bookDoctor}
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          display: "flex",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          marginBottom: 36,
          padding: "22px 0",
        }}>
          {[
            { label: t.heroAppointments, value: appointmentsLoading ? "…" : appointments.length, color: "#a5b4fc" },
            { label: t.heroMeasurements, value: loading ? "…" : items.length, color: "#67e8f9" },
            { label: t.heroTicket, value: ticket ? `A-${ticket.ticketNumber}` : "—", color: "#fde68a" },
          ].map((s, i) => (
            <div key={s.label} style={{
              flex: 1, textAlign: "center",
              borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
            }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Confirmed appointment banners */}
        {confirmedAppts.map((confirmed) => {
          const isOnline = confirmed.wants_online || confirmed.wantsOnline;
          const jitsiUrl = `https://meet.jit.si/healthassist-${confirmed.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
          const dLabel = doctorLabel(confirmed);
          return (
            <div key={`conf-${confirmed.id}`} style={{
              borderLeft: "4px solid #34d399",
              background: "rgba(52,211,153,0.07)",
              padding: "16px 24px",
              marginBottom: 12,
              display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <HeartPulse size={18} color="#34d399" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#6ee7b7", marginBottom: 3 }}>{t.confirmedTitle}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
                    {dLabel} · {confirmed.date}{confirmed.time && confirmed.time !== "00:00" ? ` · ${confirmed.time}` : ""}
                  </div>
                </div>
              </div>
              {isOnline && (
                <a href={jitsiUrl} target="_blank" rel="noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  background: "linear-gradient(135deg, #34d399, #22d3ee)",
                  color: "#0f0c29", borderRadius: 8, padding: "8px 18px",
                  fontWeight: 700, fontSize: 13, textDecoration: "none",
                }}>
                  <Video size={13} /> {t.joinMeeting}
                </a>
              )}
            </div>
          );
        })}

        {/* Pending appointments banner */}
        {pendingAppts.length > 0 && (
          <div style={{
            borderLeft: "4px solid #fbbf24",
            background: "rgba(251,191,36,0.05)",
            padding: "16px 24px",
            marginBottom: 36,
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#fde68a", marginBottom: 10 }}>
              ⏳ Ваши заявки на рассмотрении ({pendingAppts.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingAppts.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                    {a.specialty_request || a.specialtyRequest || "Специалист"}
                    <span style={{ color: "rgba(255,255,255,0.3)", marginLeft: 10, fontSize: 13 }}>{a.date}</span>
                  </span>
                  <span style={{ fontSize: 12, color: "#fbbf24", fontWeight: 600 }}>Ожидает врача</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 48 }}>

          {/* Appointments list */}
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 20 }}>
              {t.myAppointments}
            </div>
            {appointmentsLoading ? (
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, margin: 0 }}>{t.loading}</p>
            ) : appointments.length === 0 ? (
              <div style={{ padding: "32px 0" }}>
                <CalendarClock size={28} style={{ color: "rgba(255,255,255,0.1)", display: "block", marginBottom: 10 }} />
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, margin: 0 }}>{t.noAppointments}</p>
              </div>
            ) : (
              <div>
                {appointments.slice(0, 7).map((appt, idx) => {
                  const scMap: Record<string, { color: string; label: string }> = {
                    active: { color: "#67e8f9", label: t.appointmentStatusActive },
                    done: { color: "#6ee7b7", label: t.appointmentStatusDone },
                    pending: { color: "#fde68a", label: t.appointmentStatusPending },
                  };
                  const sc = scMap[appt.status] ?? scMap.pending;
                  const dLabel = doctorLabel(appt);
                  const hasRealDoctor = (appt.doctor_id || appt.doctorId) && (appt.doctor_id || appt.doctorId) !== "pending";
                  return (
                    <div key={appt.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                      padding: "13px 0",
                      borderBottom: idx < appointments.slice(0, 7).length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {appt.specialty_request || appt.specialtyRequest || (hasRealDoctor ? dLabel : "Специалист")}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                          {appt.date}{appt.time && appt.time !== "00:00" ? ` · ${appt.time}` : ""}
                          {hasRealDoctor && ` · ${dLabel}`}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap",
                        color: sc.color, background: `${sc.color}1a`,
                        borderRadius: 20, padding: "3px 12px",
                      }}>{sc.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: ticket + vitals */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

            {/* Ticket */}
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 20 }}>
                {t.onlineTicket}
              </div>
              {!ticket ? (
                <div style={{ borderLeft: "4px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.04)", padding: "16px 20px" }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", margin: "0 0 14px", lineHeight: 1.6 }}>{t.noTicket}</p>
                  <button
                    onClick={() => { const c = createNewMyTicket(); setTicket(c); }}
                    style={{
                      padding: "9px 18px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fde68a",
                    }}
                  >{t.takeNewTicket}</button>
                </div>
              ) : (
                <div style={{ borderLeft: "4px solid #fbbf24", background: "rgba(251,191,36,0.06)", padding: "16px 20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                    {[
                      { label: t.yourNumber, value: `A-${ticket.ticketNumber}` },
                      { label: t.nowCalling, value: `A-${ticket.servingNow}` },
                      { label: t.ahead, value: ticket.peopleAhead },
                      { label: t.waiting, value: `~${ticket.etaMinutes} ${t.minutes}` },
                    ].map((m) => (
                      <div key={m.label}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginBottom: 2 }}>{m.label}</div>
                        <div style={{ fontWeight: 800, fontSize: 20, color: "#fde68a" }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => { const n = createNewMyTicket(); setTicket(n); }}
                    style={{
                      padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer",
                      background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fde68a",
                    }}
                  >{t.takeNewTicket}</button>
                </div>
              )}
            </div>

            {/* Vitals */}
            {items.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, marginBottom: 20 }}>
                  {t.history}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { icon: "🌡", label: t.temp, value: latestMeasurement?.tempC != null ? `${latestMeasurement.tempC}°C` : "—", color: "#f87171" },
                    { icon: "❤️", label: t.pulse, value: latestMeasurement?.hr != null ? `${latestMeasurement.hr}` : "—", color: "#fb7185" },
                  ].map((v) => (
                    <div key={v.label} style={{
                      borderLeft: `4px solid ${v.color}55`,
                      background: `${v.color}0d`,
                      padding: "14px 16px",
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{v.icon}</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: v.color, lineHeight: 1 }}>{v.value}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{v.label}</div>
                    </div>
                  ))}
                </div>
                {latestMeasurement && (
                  <Link to={`/app/measurements/${latestMeasurement.id}`} style={{
                    display: "block", marginTop: 12, fontSize: 12,
                    color: "rgba(255,255,255,0.2)", textDecoration: "none",
                  }}>
                    {fmtDate(latestMeasurement.createdAt)} →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        {err && <div className="alert" style={{ marginTop: 24 }}>{err}</div>}
      </div>
    </div>
  );
}
