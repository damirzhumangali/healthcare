import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Video,
  HeartPulse,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AppointmentRequestError,
  DOCTORS,
  createAppointment,
  fetchMyAppointments,
  pingBackend,
  type Appointment,
  type AppointmentStatus,
} from "../lib/apiAppointments";
import {
  fetchMyMeasurements,
  readCachedMeasurements,
  type MeasurementItem,
} from "../lib/apiMeasurements";
import {
  formatMeasurementDateTime,
  formatMeasurementValue,
  listPatientMeasurements,
  measurementMetricLabel,
  measurementSourceLabel,
  PATIENT_MEASUREMENTS_UPDATED_EVENT,
  replaceApiMeasurementsForPatientHistory,
  type PatientMeasurementEntry,
} from "../lib/patientMeasurements";
import { setSessionIdleSuppressed } from "../lib/sessionIdle";
import { SESSION_USER_UPDATED_EVENT } from "../lib/auth";
import { normalizePatientFullName } from "../lib/patientName";
import { validateComplaint } from "../lib/complaintValidation";
import {
  isHomeOnlineConsultation,
  readRoomLabel,
  isWardOnlineConsultation,
  readBedLabel,
  readWardLabel,
} from "../lib/consultationMode";
import { syncBedsideConsultations, type BedsideConsultationView } from "../lib/onlineConsultations";
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
    appointmentStatusConfirmed: "Подтвержден",
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
    confirmedRoom: "Кабинет",
    joinMeeting: "Присоединиться к встрече",
    homeOnlineTitle: "Онлайн-консультация из дома",
    homeOnlineText: "Оставьте заявку на видеозвонок и после подтверждения администратор сразу отправит ссылку пациенту и врачу.",
    homeOnlineAction: "Запросить онлайн",
    wardBannerTitle: "Онлайн-консультация в палате",
    wardBannerText: "Если вы уже лежите в палате, отправьте отдельную заявку. Укажите палату и койку, чтобы врач и терминал AIMAR пришли автоматически.",
    wardSpecialty: "Нужный специалист",
    wardDate: "Желаемая дата",
    wardRoom: "Палата",
    wardBed: "Койка",
    wardReason: "Что нужно врачу",
    wardReasonPlaceholder: "Например: нужна консультация по состоянию после операции, боли усилились, нужна связь с кардиологом...",
    wardSubmit: "Отправить к врачу",
    wardSubmitting: "Отправляем...",
    wardSuccess: "Палатная онлайн-заявка отправлена. Администратор назначит врача и время.",
    wardError: "Не удалось отправить заявку врачу. Попробуйте ещё раз.",
    wardAuthError: "Сессия истекла. Войдите снова, чтобы заявка дошла врачу и в админку.",
    wardShortError: "Опишите жалобу понятным текстом — минимум 10 символов, реальными словами.",
    wardSpamError: "Опишите симптом нормально, без повторяющихся символов.",
    wardOffensiveError: "Пожалуйста, без нецензурных выражений.",
    wardStatusPending: "Заявка в обработке",
    wardStatusAssigned: "Врач назначен",
    wardStatusSubtitle: "Робот и звонок запустятся автоматически к указанному времени.",
    wardStatusRobotEnRoute: "Робот едет к пациенту",
    wardStatusRobotEnRouteSubtitle: "Робот уже выехал в палату. Как только он будет у кровати, врач подключит звонок.",
    wardStatusBedsideReady: "Робот у кровати",
    wardStatusBedsideReadySubtitle: "Терминал AIMAR уже у пациента. Ожидаем подключения врача к звонку.",
    wardStatusLive: "Звонок активен",
    wardStatusLiveSubtitle: "Врач уже подключился через терминал AIMAR. Робот и звонок работают у кровати пациента.",
    wardRevealAction: "Я в палате — нужна консультация",
    wardRevealHide: "Скрыть форму палатной консультации",
    wardRevealHint: "Открывайте эту форму только если вы действительно лежите в палате.",
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
    appointmentStatusConfirmed: "Расталды",
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
    confirmedRoom: "Кабинет",
    joinMeeting: "Кездесуге қосылу",
    homeOnlineTitle: "Үйден онлайн кеңес",
    homeOnlineText: "Бейнеқоңырауға өтінім қалдырыңыз, растаудан кейін әкімші сілтемені пациент пен дәрігерге бірден жібереді.",
    homeOnlineAction: "Онлайн сұрау",
    wardBannerTitle: "Палатадағы онлайн кеңес",
    wardBannerText: "Егер сіз қазір палатада жатсаңыз, бөлек өтінім жіберіңіз. Дәрігер мен AIMAR терминалы автоматты келуі үшін палата мен кереуетті көрсетіңіз.",
    wardSpecialty: "Қажетті маман",
    wardDate: "Қалаулы күн",
    wardRoom: "Палата",
    wardBed: "Кереует",
    wardReason: "Дәрігерге не керек",
    wardReasonPlaceholder: "Мысалы: операциядан кейінгі жағдай бойынша кеңес керек, ауырсыну күшейді, кардиологпен байланыс қажет...",
    wardSubmit: "Дәрігерге жіберу",
    wardSubmitting: "Жіберілуде...",
    wardSuccess: "Палаталық онлайн өтінім жіберілді. Әкімші дәрігер мен уақытты тағайындайды.",
    wardError: "Өтінімді дәрігерге жіберу мүмкін болмады. Қайта көріңіз.",
    wardAuthError: "Сессия аяқталды. Өтінім дәрігер мен әкімшіге жетуі үшін қайта кіріңіз.",
    wardShortError: "Шағымды түсінікті мәтінмен жазыңыз — кемінде 10 таңба және нақты сөздер болсын.",
    wardSpamError: "Симптомды қайталанатын таңбаларсыз қалыпты түрде жазыңыз.",
    wardOffensiveError: "Өтінеміз, бейәдеп сөздерсіз жазыңыз.",
    wardStatusPending: "Өтінім өңделуде",
    wardStatusAssigned: "Дәрігер тағайындалды",
    wardStatusSubtitle: "Робот пен қоңырау көрсетілген уақытта автоматты түрде іске қосылады.",
    wardStatusRobotEnRoute: "Робот пациентке бара жатыр",
    wardStatusRobotEnRouteSubtitle: "Робот палатаға жолға шықты. Кереуетке жеткен соң дәрігер қоңырауға қосылады.",
    wardStatusBedsideReady: "Робот кереует жанында",
    wardStatusBedsideReadySubtitle: "AIMAR терминалы пациенттің жанында тұр. Дәрігердің қосылуын күтеміз.",
    wardStatusLive: "Қоңырау белсенді",
    wardStatusLiveSubtitle: "Дәрігер AIMAR терминалы арқылы қосылды. Робот пен қоңырау пациенттің кереуеті жанында жұмыс істеп тұр.",
    wardRevealAction: "Мен палатадамын — кеңес керек",
    wardRevealHide: "Палаталық форманы жасыру",
    wardRevealHint: "Бұл форманы тек шынымен палатада жатқанда ашыңыз.",
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
    appointmentStatusConfirmed: "Confirmed",
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
    confirmedRoom: "Room",
    joinMeeting: "Join meeting",
    homeOnlineTitle: "Online consultation from home",
    homeOnlineText: "Send a video consultation request and, once approved, the admin will immediately send the meeting link to both patient and doctor.",
    homeOnlineAction: "Request online call",
    wardBannerTitle: "Online consultation in the ward",
    wardBannerText: "If you are already staying in a ward, send a separate request. Add ward and bed details so the doctor and AIMAR terminal can connect automatically.",
    wardSpecialty: "Specialist needed",
    wardDate: "Preferred date",
    wardRoom: "Ward",
    wardBed: "Bed",
    wardReason: "What the doctor should know",
    wardReasonPlaceholder: "For example: need a post-op consultation, pain increased, need to connect with a cardiologist...",
    wardSubmit: "Send to doctor",
    wardSubmitting: "Sending...",
    wardSuccess: "Ward online request sent. The admin will assign the doctor and time.",
    wardError: "Could not send the request to the doctor. Please try again.",
    wardAuthError: "Your session expired. Sign in again so the request reaches the doctor and admin.",
    wardShortError: "Please describe the complaint clearly — at least 10 characters, using real words.",
    wardSpamError: "Please describe the symptom normally, without repeated characters.",
    wardOffensiveError: "Please describe the complaint without offensive language.",
    wardStatusPending: "Request under review",
    wardStatusAssigned: "Doctor assigned",
    wardStatusSubtitle: "The robot and video call will start automatically at the scheduled time.",
    wardStatusRobotEnRoute: "Robot is on the way",
    wardStatusRobotEnRouteSubtitle: "The robot is already heading to the ward. Once it reaches the bedside, the doctor will connect the call.",
    wardStatusBedsideReady: "Robot is at the bedside",
    wardStatusBedsideReadySubtitle: "The AIMAR terminal is already with the patient. Waiting for the doctor to join the call.",
    wardStatusLive: "Call is active",
    wardStatusLiveSubtitle: "The doctor is already connected through the AIMAR terminal. The robot and call are running at the patient's bedside.",
    wardRevealAction: "I am in the ward — need a consultation",
    wardRevealHide: "Hide ward consultation form",
    wardRevealHint: "Open this form only if you are actually admitted to a ward.",
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

function readCurrentUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function hasAssignedDoctor(item: Appointment) {
  const doctorId = item.doctor_id || item.doctorId;
  return Boolean(doctorId && doctorId !== "pending");
}

function appointmentSortAsc(a: Appointment, b: Appointment) {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  return (a.time || "00:00").localeCompare(b.time || "00:00");
}

function latestMeasurementEntry(
  items: PatientMeasurementEntry[],
  metric: PatientMeasurementEntry["metric"],
) {
  return items.find((item) => item.metric === metric) ?? null;
}

export default function Dashboard() {
  const nav = useNavigate();
  const { locale, theme } = useAppPreferences();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(() => readCurrentUser());
  const isAdmin = currentUser?.role === "admin";
  const displayName =
    normalizePatientFullName(currentUser?.name, { requireFullName: currentUser?.role === "patient" }) ||
    currentUser?.name ||
    currentUser?.email ||
    "HealthAssist";

  const t = copy[locale];
  const isLightTheme = theme === "light";
  const ui = useMemo(
    () =>
      isLightTheme
        ? {
            text: "#101827",
            muted: "rgba(15,23,42,0.72)",
            faint: "rgba(15,23,42,0.52)",
            quiet: "rgba(15,23,42,0.36)",
            card: "rgba(255,255,255,0.82)",
            cardSoft: "rgba(255,255,255,0.92)",
            cardMuted: "rgba(255,255,255,0.72)",
            border: "rgba(15,23,42,0.10)",
            rowAlt: "rgba(148,163,184,0.08)",
            rowBorder: "rgba(15,23,42,0.06)",
            secondaryBg: "rgba(255,255,255,0.9)",
            secondaryText: "#101827",
            actionShadow: "0 12px 26px rgba(56,189,248,0.08)",
          }
        : {
            text: "#ffffff",
            muted: "rgba(255,255,255,0.68)",
            faint: "rgba(255,255,255,0.5)",
            quiet: "rgba(255,255,255,0.35)",
            card: "rgba(255,255,255,0.03)",
            cardSoft: "rgba(255,255,255,0.05)",
            cardMuted: "rgba(255,255,255,0.04)",
            border: "rgba(255,255,255,0.08)",
            rowAlt: "rgba(255,255,255,0.02)",
            rowBorder: "rgba(255,255,255,0.04)",
            secondaryBg: "rgba(255,255,255,0.04)",
            secondaryText: "rgba(255,255,255,0.82)",
            actionShadow: "0 12px 30px rgba(56,189,248,0.15)",
          },
    [isLightTheme],
  );

  useEffect(() => {
    const syncUser = () => setCurrentUser(readCurrentUser());
    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
  }, []);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<PatientMeasurementEntry[]>(() =>
    currentUser?.id ? listPatientMeasurements(currentUser.id) : [],
  );
  const [measurementVisible, setMeasurementVisible] = useState(5);
  const [wardConsultations, setWardConsultations] = useState<BedsideConsultationView[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState<OnlineTicketView | null>(null);
  const [apptVisible, setApptVisible] = useState(3);
  const [showWardRequestForm, setShowWardRequestForm] = useState(false);
  const [wardForm, setWardForm] = useState(() => ({
    specialty: DOCTORS[0]?.specialty || "Терапевт",
    date: new Date().toISOString().slice(0, 10),
    wardLabel: "",
    bedLabel: "",
    reason: "",
  }));
  const [wardSubmitting, setWardSubmitting] = useState(false);
  const [wardErr, setWardErr] = useState<string | null>(null);
  const [wardOk, setWardOk] = useState<string | null>(null);

  const refreshTicket = useCallback(() => {
    const currentTicket = getMyTicket();
    setTicket(currentTicket?.status === "passed" ? null : currentTicket);
  }, []);

  const refreshMeasurementHistory = useCallback((items?: MeasurementItem[]) => {
    if (!currentUser?.id) {
      setMeasurementHistory([]);
      return [];
    }
    if (items?.length) {
      const next = replaceApiMeasurementsForPatientHistory(currentUser.id, items);
      setMeasurementHistory(next);
      return next;
    }
    const next = listPatientMeasurements(currentUser.id);
    setMeasurementHistory(next);
    return next;
  }, [currentUser?.id]);

  const loadMeasurements = useCallback(async () => {
    try {
      const data = await fetchMyMeasurements(100);
      const next = data.items ?? [];
      refreshMeasurementHistory(next);
    } catch {
      const cached = readCachedMeasurements(currentUser?.id);
      refreshMeasurementHistory(cached);
    }
  }, [currentUser?.id, refreshMeasurementHistory]);

  const loadAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    try {
      const data = await fetchMyAppointments();
      const sorted = (data.items ?? []).sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        return byDate === 0 ? a.time.localeCompare(b.time) : byDate;
      });
      setAppointments(sorted);
      setWardConsultations(syncBedsideConsultations(sorted));
    } catch {
      setErr(t.appointmentError);
    } finally {
      setAppointmentsLoading(false);
    }
  }, [t.appointmentError]);

  useEffect(() => { pingBackend(); }, []);

  useEffect(() => {
    loadAppointments();
    void loadMeasurements();
    refreshTicket();

    const timer = window.setInterval(() => {
      refreshTicket();
      void loadAppointments();
      void loadMeasurements();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadAppointments, loadMeasurements, refreshTicket]);

  useEffect(() => {
    const handleMeasurementsUpdate = () => {
      refreshMeasurementHistory();
    };
    window.addEventListener(PATIENT_MEASUREMENTS_UPDATED_EVENT, handleMeasurementsUpdate);
    return () => window.removeEventListener(PATIENT_MEASUREMENTS_UPDATED_EVENT, handleMeasurementsUpdate);
  }, [refreshMeasurementHistory]);

  const confirmedAppts = appointments
    .filter((a) => a.status === "active" && isHomeOnlineConsultation(a) && hasAssignedDoctor(a))
    .sort(appointmentSortAsc)
    .slice(0, 1);
  const inPersonConfirmedAppts = appointments
    .filter(
      (a) =>
        a.status === "active" &&
        hasAssignedDoctor(a) &&
        !isHomeOnlineConsultation(a) &&
        !isWardOnlineConsultation(a),
    )
    .sort(appointmentSortAsc)
    .slice(0, 1);
  const wardAppointments = appointments
    .filter((a) => a.status !== "done" && isWardOnlineConsultation(a))
    .sort(appointmentSortAsc)
    .slice(0, 1);
  const specialtyOptions = useMemo(
    () => Array.from(new Set(DOCTORS.map((doctor) => doctor.specialty))),
    [],
  );
  const wardConsultByAppointmentId = useMemo(
    () => new Map(wardConsultations.map((consult) => [consult.appointmentId, consult])),
    [wardConsultations],
  );
  const latestTemperature = useMemo(
    () => latestMeasurementEntry(measurementHistory, "temperature"),
    [measurementHistory],
  );
  const latestPulse = useMemo(
    () => latestMeasurementEntry(measurementHistory, "pulse"),
    [measurementHistory],
  );
  const latestMeasurementAt =
    latestTemperature?.createdAt ||
    latestPulse?.createdAt ||
    null;
  const historyAppointments = useMemo(
    () =>
      [...appointments].sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return (b.time || "00:00").localeCompare(a.time || "00:00");
      }),
    [appointments],
  );

  async function submitWardConsultation() {
    setWardErr(null);
    setWardOk(null);

    const reasonCheck = validateComplaint(wardForm.reason);
    if (reasonCheck === "meaningless") {
      setWardErr(t.wardShortError);
      return;
    }
    if (reasonCheck === "repeating") {
      setWardErr(t.wardSpamError);
      return;
    }
    if (reasonCheck === "offensive") {
      setWardErr(t.wardOffensiveError);
      return;
    }

    if (!wardForm.date || !wardForm.wardLabel.trim()) {
      setWardErr(t.wardError);
      return;
    }

    setWardSubmitting(true);
    try {
      await createAppointment({
        date: wardForm.date,
        time: "",
        reason: wardForm.reason.trim(),
        specialtyRequest: wardForm.specialty,
        wantsOnline: true,
        consultationMode: "online_ward",
        wardLabel: wardForm.wardLabel.trim(),
        bedLabel: wardForm.bedLabel.trim() || "Койка не указана",
      });
      setWardOk(t.wardSuccess);
      setShowWardRequestForm(true);
      setWardForm((current) => ({
        ...current,
        wardLabel: "",
        bedLabel: "",
        reason: "",
      }));
      await loadAppointments();
    } catch (error) {
      setWardErr(error instanceof AppointmentRequestError && error.code === "auth_required" ? t.wardAuthError : t.wardError);
    } finally {
      setWardSubmitting(false);
    }
  }

  if (currentUser?.email === "alixan.baktybaev@gmail.com") {
    return <Navigate to="/doctor" replace />;
  }

  const statusMeta = (status: AppointmentStatus) => {
    if (status === "active") return { label: t.appointmentStatusActive, color: "#60a5fa", bg: "rgba(96,165,250,0.12)" };
    if (status === "done") return { label: t.appointmentStatusDone, color: "#34d399", bg: "rgba(52,211,153,0.12)" };
    return { label: t.appointmentStatusPending, color: ui.quiet, bg: ui.cardSoft };
  };
  const formatAppointmentDateTime = (date: string, time?: string) => {
    const [year, month, day] = date.split("-");
    const formattedDate = year && month && day ? `${day}.${month}.${year}` : date;
    return time && time !== "00:00" ? `${formattedDate} · ${time}` : formattedDate;
  };
  const wardFieldStyle: React.CSSProperties = {
    fontSize: 16,
    lineHeight: 1.25,
    padding: "12px 14px",
    minWidth: 0,
  };
  const wardSelectStyle: React.CSSProperties = {
    ...wardFieldStyle,
    paddingRight: 38,
    appearance: "auto",
    WebkitAppearance: "menulist",
  };
  const dashboardPanelStyle: React.CSSProperties = {
    background: ui.card,
    border: `1px solid ${ui.border}`,
    borderRadius: 24,
    padding: "24px 24px 22px",
    boxShadow: isLightTheme ? "0 18px 38px rgba(15,23,42,0.06)" : "0 18px 40px rgba(0,0,0,0.18)",
  };
  const dashboardSectionEyebrowStyle: React.CSSProperties = {
    fontSize: 11,
    color: ui.quiet,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 700,
  };
  const dashboardSectionTitleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 800,
    color: ui.text,
    marginTop: 10,
  };
  const dashboardSectionHintStyle: React.CSSProperties = {
    fontSize: 13,
    lineHeight: 1.55,
    color: ui.faint,
    marginTop: 8,
  };

  /* escape .container padding (28px top, 24px sides, 60px bottom) */
  return (
    <div
      className="patient-dashboard-shell"
      style={{
        background: "transparent",
        color: ui.text,
        fontFamily: "inherit",
      }}
    >

      <div className="patient-dashboard-inner">

        {/* Welcome */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 11, color: ui.quiet, marginBottom: 6, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
              {new Date().toLocaleDateString(locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: "-0.8px", color: ui.text }}>
              Привет, {displayName.split(" ")[0]} 👋
            </h1>
          </div>
          {isAdmin ? (
            <button onClick={() => nav("/admin")} style={{
              padding: "10px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
              background: ui.secondaryBg, border: `1px solid ${ui.border}`, color: ui.secondaryText,
            }}>{t.adminPanel}</button>
          ) : null}
        </div>

        {/* Confirmed appointment banner */}
        {confirmedAppts.map((confirmed) => {
          const meetingUrl = confirmed.meeting_url || `https://meet.jit.si/healthassist-${confirmed.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
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
                  <div style={{ fontSize: 12, color: ui.faint, marginTop: 2 }}>
                    {confirmed.specialty_request || confirmed.specialtyRequest || "Специалист"} · {confirmed.date}{confirmed.time && confirmed.time !== "00:00" ? ` · ${confirmed.time}` : ""}
                  </div>
                </div>
              </div>
              {meetingUrl && (
                <a href={meetingUrl} target="_blank" rel="noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#34d399", color: "#0a0f1a", borderRadius: 6,
                  padding: "7px 16px", fontWeight: 700, fontSize: 12, textDecoration: "none",
                }} onClick={() => setSessionIdleSuppressed(true)}>
                  <Video size={12} /> {t.joinMeeting}
                </a>
              )}
            </div>
          );
        })}

        {inPersonConfirmedAppts.map((confirmed) => {
          const roomLabel = readRoomLabel(confirmed);
          return (
            <div
              key={`visit-${confirmed.id}`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
                background: "rgba(129,140,248,0.08)", borderLeft: "3px solid #818cf8",
                padding: "14px 20px", marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <HeartPulse size={16} color="#818cf8" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#c4b5fd" }}>{t.confirmedTitle}</div>
                  <div style={{ fontSize: 12, color: ui.faint, marginTop: 2 }}>
                    {confirmed.specialty_request || confirmed.specialtyRequest || "Специалист"} · {confirmed.date}
                    {confirmed.time && confirmed.time !== "00:00" ? ` · ${confirmed.time}` : ""}
                    {roomLabel ? ` · ${t.confirmedRoom}: ${roomLabel}` : ""}
                  </div>
                </div>
              </div>
              <span style={{
                background: "rgba(129,140,248,0.2)", color: "#c4b5fd",
                borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700,
              }}>
                Офлайн
              </span>
            </div>
          );
        })}

        {wardAppointments.map((appointment) => {
          const assigned = hasAssignedDoctor(appointment);
          const consult = wardConsultByAppointmentId.get(appointment.id);
          const stage = appointment.status === "active" ? "live" : consult?.stage || "scheduled";
          const wardLabel = readWardLabel(appointment) || "Палата не указана";
          const bedLabel = readBedLabel(appointment) || "Койка не указана";
          const stageTitle =
            stage === "live"
              ? t.wardStatusLive
              : stage === "bedside_ready"
                ? t.wardStatusBedsideReady
                : stage === "robot_en_route"
                  ? t.wardStatusRobotEnRoute
                  : assigned
                    ? t.wardStatusAssigned
                    : t.wardStatusPending;
          const stageSubtitle =
            stage === "live"
              ? t.wardStatusLiveSubtitle
              : stage === "bedside_ready"
                ? t.wardStatusBedsideReadySubtitle
                : stage === "robot_en_route"
                  ? t.wardStatusRobotEnRouteSubtitle
                  : assigned
                    ? t.wardStatusSubtitle
                    : appointment.reason;
          return (
            <div
              key={`ward-${appointment.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                background: "rgba(56,189,248,0.08)",
                borderLeft: "3px solid #38bdf8",
                padding: "14px 20px",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#7dd3fc" }}>
                  {stageTitle}
                </div>
                <div style={{ fontSize: 12, color: ui.muted, marginTop: 3 }}>
                  {wardLabel} · {bedLabel}
                  {appointment.time && appointment.time !== "00:00" ? ` · ${appointment.date} · ${appointment.time}` : ` · ${appointment.date}`}
                </div>
                <div style={{ fontSize: 12, color: ui.faint, marginTop: 3 }}>
                  {stageSubtitle}
                </div>
              </div>
            </div>
          );
        })}

        <div className="patient-dashboard-overview-grid">
          <div
            className="patient-dashboard-card patient-dashboard-card--measurement"
            style={{
              ...dashboardPanelStyle,
              background: isLightTheme
                ? "linear-gradient(135deg, rgba(238,250,255,0.95), rgba(239,255,246,0.92))"
                : "linear-gradient(135deg, rgba(34,211,238,0.10), rgba(12,33,56,0.68))",
              borderColor: isLightTheme ? "rgba(56,189,248,0.16)" : "rgba(34,211,238,0.14)",
            }}
          >
            <div style={{ ...dashboardSectionEyebrowStyle, color: "#67e8f9" }}>
              {t.heroLatestMeasurement}
            </div>
            <div style={{ fontSize: 12, color: ui.faint, marginTop: 6 }}>
              {latestMeasurementAt ? formatMeasurementDateTime(latestMeasurementAt, locale) : t.heroNoMeasurements}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
                marginTop: 18,
              }}
            >
              <div
                style={{
                  borderRadius: 18,
                  border: `1px solid ${ui.border}`,
                  background: ui.cardSoft,
                  padding: "18px 20px",
                }}
              >
                <div style={{ fontSize: 11, color: ui.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  {t.temp}
                </div>
                <div style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 900, marginTop: 14, color: ui.text }}>
                  {latestTemperature ? formatMeasurementValue(latestTemperature, locale) : "—"}
                </div>
              </div>
              <div
                style={{
                  borderRadius: 18,
                  border: `1px solid ${ui.border}`,
                  background: ui.cardSoft,
                  padding: "18px 20px",
                }}
              >
                <div style={{ fontSize: 11, color: ui.faint, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  {t.pulse}
                </div>
                <div style={{ fontSize: 46, lineHeight: 1.02, fontWeight: 900, marginTop: 14, color: ui.text }}>
                  {latestPulse ? formatMeasurementValue(latestPulse, locale) : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="patient-dashboard-side-stack">
            <div className="patient-dashboard-card" style={dashboardPanelStyle}>
              <div style={dashboardSectionEyebrowStyle}>{t.quickActions}</div>
              <div style={dashboardSectionTitleStyle}>{t.quickActionsHint}</div>
              <div className="patient-dashboard-action-group">
                <button
                  onClick={() => nav("/appointments/new")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "11px 18px",
                    minHeight: 46,
                    borderRadius: 12,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                    border: "none",
                    background: "linear-gradient(135deg, var(--primary), var(--primary2))",
                    color: "var(--primaryText)",
                    boxShadow: ui.actionShadow,
                  }}
                >
                  + {t.bookDoctor}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowWardRequestForm((current) => !current)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "11px 16px",
                      minHeight: 46,
                      borderRadius: 12,
                      border: `1px solid ${ui.border}`,
                      background: ui.secondaryBg,
                      color: ui.secondaryText,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {showWardRequestForm ? t.wardRevealHide : t.wardRevealAction}
                  </button>
                  {!showWardRequestForm ? (
                    <div style={{ fontSize: 12, color: ui.faint, marginTop: 8, lineHeight: 1.55 }}>
                      {t.wardRevealHint}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="patient-dashboard-card" style={dashboardPanelStyle}>
              <div style={dashboardSectionEyebrowStyle}>{t.onlineTicket}</div>
              <div style={dashboardSectionTitleStyle}>{ticket ? t.heroSnapshot : t.heroQueueMissing}</div>
              {!ticket ? (
                <>
                  <div style={dashboardSectionHintStyle}>{t.noTicket}</div>
                  <div style={{ marginTop: 18 }}>
                    <button
                      onClick={() => { const c = createNewMyTicket(); setTicket(c); }}
                      style={{
                        padding: "10px 16px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
                        background: ui.secondaryBg, border: `1px solid ${ui.border}`, color: ui.muted,
                      }}
                    >{t.takeNewTicket}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="patient-dashboard-ticket-grid" style={{ marginTop: 18 }}>
                    {[
                      { label: t.yourNumber, value: `A-${ticket.ticketNumber}` },
                      { label: t.nowCalling, value: `A-${ticket.servingNow}` },
                      { label: t.ahead, value: ticket.peopleAhead },
                      { label: t.waiting, value: `~${ticket.etaMinutes} ${t.minutes}` },
                    ].map((m) => (
                      <div key={m.label} className="patient-dashboard-ticket-metric">
                        <div style={{ fontSize: 10, color: ui.quiet, fontWeight: 700, marginBottom: 3 }}>{m.label}</div>
                        <div style={{ fontWeight: 900, fontSize: 22, color: ui.text }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <button
                      onClick={() => { const n = createNewMyTicket(); setTicket(n); }}
                      style={{
                        padding: "9px 15px", borderRadius: 10, fontWeight: 700, fontSize: 12, cursor: "pointer",
                        background: ui.secondaryBg, border: `1px solid ${ui.border}`, color: ui.muted,
                      }}
                    >{t.takeNewTicket}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {showWardRequestForm ? (
          <div
            className="patient-dashboard-card"
            style={{
              ...dashboardPanelStyle,
              marginBottom: 32,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: ui.text }}>{t.wardBannerTitle}</div>
            <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.65, color: ui.muted }}>
              {t.wardBannerText}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: ui.faint }}>{t.wardSpecialty}</span>
                <select
                  className="input"
                  style={wardSelectStyle}
                  value={wardForm.specialty}
                  onChange={(event) => setWardForm((current) => ({ ...current, specialty: event.target.value }))}
                >
                  {specialtyOptions.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: ui.faint }}>{t.wardDate}</span>
                <input
                  className="input"
                  style={wardFieldStyle}
                  type="date"
                  value={wardForm.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setWardForm((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: ui.faint }}>{t.wardRoom}</span>
                <input
                  className="input"
                  style={wardFieldStyle}
                  value={wardForm.wardLabel}
                  onChange={(event) => setWardForm((current) => ({ ...current, wardLabel: event.target.value }))}
                  placeholder="Палата 305"
                />
              </label>
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: ui.faint }}>{t.wardBed}</span>
                <input
                  className="input"
                  style={wardFieldStyle}
                  value={wardForm.bedLabel}
                  onChange={(event) => setWardForm((current) => ({ ...current, bedLabel: event.target.value }))}
                  placeholder="Койка 2"
                />
              </label>
            </div>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: ui.faint }}>{t.wardReason}</span>
              <textarea
                className="input"
                style={{ ...wardFieldStyle, height: "auto", resize: "vertical" }}
                rows={4}
                value={wardForm.reason}
                onChange={(event) => {
                  setWardForm((current) => ({ ...current, reason: event.target.value }));
                  if (wardErr) {
                    setWardErr(null);
                  }
                }}
                placeholder={t.wardReasonPlaceholder}
              />
            </label>
            {wardErr ? (
              <div className="alert" style={{ marginTop: 12 }}>
                {wardErr}
              </div>
            ) : null}
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {wardOk ? (
                <div className="badge badge--ok" style={{ maxWidth: "100%" }}>
                  <span className="badge__dot" />
                  {wardOk}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void submitWardConsultation()}
                disabled={wardSubmitting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "1px solid rgba(52,211,153,0.28)",
                  background: "rgba(52,211,153,0.15)",
                  color: "#6ee7b7",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {wardSubmitting ? t.wardSubmitting : t.wardSubmit}
              </button>
            </div>
          </div>
        ) : null}

        <div className="patient-dashboard-content-grid">

          {/* Appointments — paginated table */}
          <div className="patient-dashboard-card patient-dashboard-card--history" style={dashboardPanelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: ui.quiet, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                {t.myAppointments} {!appointmentsLoading && historyAppointments.length > 0 && `(${historyAppointments.length})`}
              </div>
            </div>

            {appointmentsLoading ? (
              <p style={{ color: ui.quiet, fontSize: 14, margin: 0 }}>{t.loading}</p>
            ) : historyAppointments.length === 0 ? (
              <div style={{ padding: "28px 0" }}>
                <CalendarClock size={24} style={{ color: ui.quiet, display: "block", marginBottom: 8 }} />
                <p style={{ color: ui.quiet, fontSize: 14, margin: 0 }}>{t.noAppointments}</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="dashboard-history__head" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 12, padding: "0 0 8px", borderBottom: `1px solid ${ui.border}`, marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: ui.quiet, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Специальность · Дата
                  </div>
                  <div style={{ fontSize: 10, color: ui.quiet, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "right" }}>
                    Статус
                  </div>
                </div>

                {historyAppointments.slice(0, apptVisible).map((appt, idx) => {
                  const roomLabel = readRoomLabel(appt);
                  const sm =
                    appt.status === "pending" && hasAssignedDoctor(appt)
                      ? { label: t.appointmentStatusConfirmed, color: "#6ee7b7", bg: "rgba(52,211,153,0.12)" }
                      : statusMeta(appt.status);
                  const isEven = idx % 2 === 0;
                  return (
                    <div key={appt.id} className="dashboard-history__row" style={{
                      display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 12,
                      padding: "11px 8px",
                      background: isEven ? ui.rowAlt : "transparent",
                      borderBottom: `1px solid ${ui.rowBorder}`,
                    }}>
                      <div className="dashboard-history__main" style={{ minWidth: 0 }}>
                        <div className="dashboard-history__title" style={{ fontWeight: 600, fontSize: 13, color: ui.text }}>
                          {appt.specialty_request || appt.specialtyRequest || "Специалист"}
                        </div>
                        <div className="dashboard-history__meta" style={{ fontSize: 11, color: ui.quiet, marginTop: 2 }}>
                          {formatAppointmentDateTime(appt.date, appt.time)}
                          {roomLabel ? ` · ${t.confirmedRoom}: ${roomLabel}` : ""}
                        </div>
                      </div>
                      <div className="dashboard-history__status" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                        {hasAssignedDoctor(appt) && isHomeOnlineConsultation(appt) && appt.meeting_url ? (
                          <a
                            href={appt.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)",
                              color: "#6ee7b7", borderRadius: 6, padding: "3px 8px",
                              fontSize: 10, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
                            }}
                            onClick={() => setSessionIdleSuppressed(true)}
                          >
                            <Video size={10} /> {t.joinMeeting}
                          </a>
                        ) : null}
                        <span style={{
                          fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 8px",
                          color: sm.color, background: sm.bg, whiteSpace: "nowrap",
                        }}>{sm.label}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {historyAppointments.length > apptVisible ? (
                  <button
                    onClick={() => setApptVisible((v) => v + 3)}
                    style={{
                      marginTop: 14, width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: ui.secondaryBg, border: `1px solid ${ui.border}`, color: ui.muted,
                    }}
                  >
                    {t.showAll} ({historyAppointments.length})
                  </button>
                ) : apptVisible > 3 ? (
                  <button
                    onClick={() => setApptVisible(3)}
                    style={{
                      marginTop: 14, width: "100%", padding: "9px 0", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: "none", border: "none", color: ui.quiet,
                    }}
                  >{t.showLess}</button>
                ) : null}
              </>
            )}
          </div>

          <div className="patient-dashboard-card patient-dashboard-card--measurements" style={dashboardPanelStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: ui.quiet, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>
                {t.history} {measurementHistory.length > 0 ? `(${measurementHistory.length})` : ""}
              </div>
            </div>

            {measurementHistory.length === 0 ? (
              <div style={{ padding: "20px 0", color: ui.quiet, fontSize: 14 }}>
                {t.noMeasurements}
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gap: 8 }}>
                  {measurementHistory.slice(0, measurementVisible).map((entry, idx) => (
                    <div
                      key={entry.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 12,
                        alignItems: "center",
                        padding: "11px 8px",
                        background: idx % 2 === 0 ? ui.rowAlt : "transparent",
                        borderBottom: `1px solid ${ui.rowBorder}`,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: ui.text }}>
                          {measurementMetricLabel(entry.metric, locale)} — {formatMeasurementValue(entry, locale)}
                        </div>
                        <div style={{ fontSize: 11, color: ui.quiet, marginTop: 3 }}>
                          {measurementSourceLabel(entry.source, locale)}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: ui.faint, textAlign: "right", whiteSpace: "nowrap" }}>
                        {formatMeasurementDateTime(entry.createdAt, locale)}
                      </div>
                    </div>
                  ))}
                </div>
                {measurementHistory.length > measurementVisible ? (
                  <button
                    type="button"
                    onClick={() => setMeasurementVisible((value) => value + 5)}
                    style={{
                      marginTop: 14,
                      width: "100%",
                      padding: "9px 0",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: ui.secondaryBg,
                      border: `1px solid ${ui.border}`,
                      color: ui.muted,
                    }}
                  >
                    {t.showAll} ({measurementHistory.length})
                  </button>
                ) : measurementVisible > 5 ? (
                  <button
                    type="button"
                    onClick={() => setMeasurementVisible(5)}
                    style={{
                      marginTop: 14,
                      width: "100%",
                      padding: "9px 0",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      background: "none",
                      border: "none",
                      color: ui.quiet,
                    }}
                  >
                    {t.showLess}
                  </button>
                ) : null}
              </>
            )}
          </div>

        </div>
        {err && <div className="alert" style={{ marginTop: 24 }}>{err}</div>}
      </div>
    </div>
  );
}
