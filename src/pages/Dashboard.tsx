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

  return (
    <div className="container dashboard-page">
      <div className="dashboard-layout">

        {/* Hero — full width */}
        <div className="dashboard-hero">
          <div className="patient-hero">
            <div className="patient-hero__copy">
              <div className="patient-hero__eyebrow">HealthAssist</div>
              <h1 className="patient-hero__title">{t.title}</h1>
              <p className="patient-hero__subtitle">{t.subtitle}</p>
              <div className="patient-account">
                <span>{t.hello}</span>
                <strong>{displayName}</strong>
              </div>
            </div>

            <div className="patient-hero__aside">
              <div className="patient-hero__stats">
                <div className="patient-hero__stat">
                  <span className="patient-hero__stat-label">{t.heroAppointments}</span>
                  <strong className="patient-hero__stat-value">
                    {appointmentsLoading ? "…" : appointments.length}
                  </strong>
                </div>
                <div className="patient-hero__stat">
                  <span className="patient-hero__stat-label">{t.heroMeasurements}</span>
                  <strong className="patient-hero__stat-value">
                    {loading ? "…" : items.length}
                  </strong>
                </div>
                <div className="patient-hero__stat">
                  <span className="patient-hero__stat-label">{t.heroTicket}</span>
                  <strong className="patient-hero__stat-value">
                    {ticket ? `A-${ticket.ticketNumber}` : "—"}
                  </strong>
                </div>
              </div>

              <div className="patient-hero__panel">
                <div className="patient-hero__panel-top">
                  <div>
                    <div className="patient-hero__panel-label">{t.heroSnapshot}</div>
                    <div className="patient-hero__panel-title">
                      {ticket
                        ? ticket.status === "invited"
                          ? t.invited
                          : ticket.status === "waiting"
                            ? t.waitForCall
                            : t.ticketMissed
                        : t.heroQueueMissing}
                    </div>
                  </div>
                  {ticket ? (
                    <span className={`badge ${ticket.status === "invited" ? "badge--ok" : ticket.status === "waiting" ? "badge--warn" : "badge--danger"}`}>
                      <span className="badge__dot" />
                      {ticket.status === "invited" ? t.invited : ticket.status === "waiting" ? t.waitForCall : t.ticketMissed}
                    </span>
                  ) : null}
                </div>

                <div className="patient-hero__panel-grid">
                  <div className="patient-hero__mini">
                    <span className="patient-hero__mini-label">{t.heroUpcomingVisit}</span>
                    <strong className="patient-hero__mini-value">
                      {nextAppointment ? `${nextAppointment.date} • ${nextAppointment.time}` : "—"}
                    </strong>
                    <span className="patient-hero__mini-meta">
                      {nextAppointment ? doctorLabel(nextAppointment) : t.heroNoAppointments}
                    </span>
                  </div>

                  <div className="patient-hero__mini">
                    <span className="patient-hero__mini-label">{t.heroLatestMeasurement}</span>
                    <strong className="patient-hero__mini-value">
                      {latestMeasurement ? `${latestMeasurement.tempC}°C / ${latestMeasurement.hr}` : "—"}
                    </strong>
                    <span className="patient-hero__mini-meta">
                      {latestMeasurement ? fmtDate(latestMeasurement.createdAt) : t.heroNoMeasurements}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {err ? <div className="alert" style={{ marginTop: 12 }}>{err}</div> : null}
        </div>

        {/* Sidebar — Quick Actions + Ticket */}
        <div className="dashboard-sidebar">
          <Card>
            <div className="stack">
              <div>
                <h2 className="h2" style={{ margin: 0 }}>{t.quickActions}</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>{t.quickActionsHint}</p>
              </div>
              <div className="dashboard-actions">
                {isAdmin ? (
                  <Button className="dashboard-actions__button" onClick={() => nav("/admin")}>{t.adminPanel}</Button>
                ) : null}
                <Button className="dashboard-actions__button" variant="ghost" onClick={() => nav("/appointments/new")}>
                  {t.bookDoctor}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="stack">
              <h2 className="h2" style={{ margin: 0 }}>{t.onlineTicket}</h2>

              {!ticket ? (
                <div className="stack">
                  <p className="muted" style={{ margin: 0 }}>{t.noTicket}</p>
                  <Button onClick={() => { const c = createNewMyTicket(); setTicket(c); }}>
                    {t.takeNewTicket}
                  </Button>
                </div>
              ) : (
                <div className="stack">
                  <div className="grid">
                    <div className="metric">
                      <div className="metric__label">{t.yourNumber}</div>
                      <div className="metric__value">A-{ticket.ticketNumber}</div>
                    </div>
                    <div className="metric">
                      <div className="metric__label">{t.nowCalling}</div>
                      <div className="metric__value">A-{ticket.servingNow}</div>
                    </div>
                    <div className="metric">
                      <div className="metric__label">{t.ahead}</div>
                      <div className="metric__value">{ticket.peopleAhead}</div>
                    </div>
                    <div className="metric">
                      <div className="metric__label">{t.waiting}</div>
                      <div className="metric__value">~{ticket.etaMinutes} {t.minutes}</div>
                    </div>
                  </div>
                  <div className="row">
                    <Button onClick={() => { const n = createNewMyTicket(); setTicket(n); }}>
                      {t.takeNewTicket}
                    </Button>
                    <span className={`badge ${ticket.status === "invited" ? "badge--ok" : ticket.status === "waiting" ? "badge--warn" : "badge--danger"}`}>
                      <span className="badge__dot" />
                      {ticket.status === "invited" ? t.invited : ticket.status === "waiting" ? t.waitForCall : t.ticketMissed}
                    </span>
                  </div>
                  <span className="muted" style={{ fontSize: 12 }}>{t.issued}: {fmtDate(ticket.createdAt)}</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Main — History + Appointments */}
        <div className="dashboard-main">
          <Card>
            <div className="stack telemed-card telemed-card--patient">
              <div className="telemed-card__top">
                <div>
                  <div className="telemed-card__eyebrow">{tele.eyebrow}</div>
                  <h2 className="h2" style={{ margin: 0 }}>{tele.title}</h2>
                  <p className="muted" style={{ margin: "8px 0 0" }}>
                    {nextConsultation ? tele.automation : tele.emptyText}
                  </p>
                </div>
                {nextConsultation ? (
                  <span className={`badge ${consultationBadgeClass(nextConsultation.stage)}`}>
                    <span className="badge__dot" />
                    {consultationStageLabel(nextConsultation.stage)}
                  </span>
                ) : null}
              </div>

              {!nextConsultation ? (
                <div className="telemed-empty">
                  <div>
                    <strong>{tele.emptyTitle}</strong>
                    <p className="muted" style={{ margin: "8px 0 0" }}>{tele.emptyText}</p>
                  </div>
                  <Button onClick={() => nav("/appointments/new")}>{tele.bookVisit}</Button>
                </div>
              ) : (
                <>
                  <div className="telemed-grid">
                    <div className="telemed-stat">
                      <div className="telemed-stat__icon"><Stethoscope size={18} /></div>
                      <span className="telemed-stat__label">{tele.doctor}</span>
                      <strong className="telemed-stat__value">{nextConsultation.doctorName}</strong>
                      <span className="telemed-stat__meta">{nextConsultation.specialty}</span>
                    </div>
                    <div className="telemed-stat">
                      <div className="telemed-stat__icon"><CalendarClock size={18} /></div>
                      <span className="telemed-stat__label">{tele.schedule}</span>
                      <strong className="telemed-stat__value">{nextConsultation.date} • {nextConsultation.time}</strong>
                      <span className="telemed-stat__meta">{nextConsultation.notes}</span>
                    </div>
                    <div className="telemed-stat">
                      <div className="telemed-stat__icon"><BedDouble size={18} /></div>
                      <span className="telemed-stat__label">{tele.location}</span>
                      <strong className="telemed-stat__value">{nextConsultation.wardLabel}</strong>
                      <span className="telemed-stat__meta">{nextConsultation.bedLabel}</span>
                    </div>
                    <div className="telemed-stat">
                      <div className="telemed-stat__icon"><Bot size={18} /></div>
                      <span className="telemed-stat__label">{tele.robot}</span>
                      <strong className="telemed-stat__value">{nextConsultation.robotUnit}</strong>
                      <span className="telemed-stat__meta">
                        {nextConsultation.devices.robotLinked ? tele.robotOnline : tele.pending}
                      </span>
                    </div>
                  </div>

                  <div className="telemed-body">
                    <div className="telemed-panel">
                      <div className="telemed-panel__title">{tele.deviceReadiness}</div>
                      <div className="telemed-device-grid">
                        {[
                          {
                            key: "camera",
                            label: tele.camera,
                            icon: <Video size={16} />,
                            ready: nextConsultation.devices.cameraReady,
                          },
                          {
                            key: "audio",
                            label: tele.audio,
                            icon: <Mic size={16} />,
                            ready: nextConsultation.devices.audioReady,
                          },
                          {
                            key: "monitoring",
                            label: tele.monitoring,
                            icon: <HeartPulse size={16} />,
                            ready: nextConsultation.devices.monitoringReady,
                          },
                          {
                            key: "medication",
                            label: tele.medication,
                            icon: <Package size={16} />,
                            ready: nextConsultation.devices.medicationReady,
                          },
                        ].map((device) => (
                          <div
                            key={device.key}
                            className={`telemed-device ${device.ready ? "telemed-device--ready" : "telemed-device--pending"}`}
                          >
                            <span className="telemed-device__icon">{device.icon}</span>
                            <span>
                              <strong>{device.label}</strong>
                              <small>{device.ready ? tele.robotOnline : tele.pending}</small>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="telemed-panel">
                      <div className="telemed-panel__title">{tele.liveMetrics}</div>
                      <div className="telemed-vitals">
                        <div className="telemed-vital">
                          <span>{t.temp}</span>
                          <strong>{latestMeasurement?.tempC != null ? `${latestMeasurement.tempC}°C` : "—"}</strong>
                        </div>
                        <div className="telemed-vital">
                          <span>{t.pulse}</span>
                          <strong>{latestMeasurement?.hr != null ? latestMeasurement.hr : "—"}</strong>
                        </div>
                      </div>
                      <p className="muted" style={{ margin: "12px 0 0", fontSize: 13 }}>{tele.vitalsHint}</p>
                    </div>
                  </div>

                  <div className="telemed-timeline-wrap">
                    <div className="telemed-panel__title">{tele.timeline}</div>
                    <div className="telemed-timeline">
                      {consultationTimeline().map((step) => {
                        const active = step.key === nextConsultation.stage;
                        const done = stageRank[nextConsultation.stage] > stageRank[step.key];
                        return (
                          <div
                            key={step.key}
                            className={`telemed-step ${active ? "telemed-step--active" : ""} ${done ? "telemed-step--done" : ""}`}
                          >
                            <div className="telemed-step__marker" />
                            <strong>{step.label}</strong>
                            <span>{step.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <div className="stack">
              <div>
                <h2 className="h2" style={{ margin: 0 }}>{t.myAppointments}</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>{t.myAppointmentsHint}</p>
              </div>
              {appointmentsLoading ? (
                <p className="muted" style={{ margin: 0 }}>{t.loading}</p>
              ) : appointments.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>{t.noAppointments}</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {appointments.map((appointment) => (
                    <div key={appointment.id} className="dashboard-list-item">
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>{appointment.date} • {appointment.time}</div>
                          <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>{t.doctor}: {doctorLabel(appointment)}</div>
                          <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{t.reason}: {appointment.reason || "—"}</div>
                        </div>
                        <span className={`badge ${appointmentStatusClass(appointment.status)}`}>
                          <span className="badge__dot" />
                          {appointmentStatusLabel(appointment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h2 className="h2" style={{ margin: 0 }}>{t.history}</h2>
                {items.length > 3 && (
                  <button
                    onClick={() => setShowAllMeasurements((p) => !p)}
                    style={{ fontSize: 13, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    {showAllMeasurements ? t.showLess : t.showAll} ({items.length})
                  </button>
                )}
              </div>

              {loading ? (
                <p className="muted" style={{ margin: 0 }}>{t.loading}</p>
              ) : items.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  {t.noMeasurements}
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {(showAllMeasurements ? items : items.slice(0, 3)).map((m) => (
                    <Link key={m.id} to={`/app/measurements/${m.id}`} style={{ textDecoration: "none" }}>
                      <div className="dashboard-list-item dashboard-list-item--measure">
                        <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                          {fmtDate(m.createdAt)} · {t.device}: {m.deviceId}
                        </div>
                        <div className="dashboard-measure-row">
                          <span><b>{m.tempC}°C</b> <span className="muted">{t.temp}</span></span>
                          <span><b>{m.hr}</b> <span className="muted">{t.pulse}</span></span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
