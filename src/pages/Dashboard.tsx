import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  HeartPulse,
  Video,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { fetchMyMeasurements, readCachedMeasurements, type MeasurementItem } from "../lib/apiMeasurements";
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
  isHomeOnlineConsultation,
  readRoomLabel,
  isWardOnlineConsultation,
  readBedLabel,
  readWardLabel,
} from "../lib/consultationMode";
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
    wardShortError: "Опишите состояние подробнее — минимум 10 символов.",
    wardStatusPending: "Заявка в обработке",
    wardStatusAssigned: "Врач назначен",
    wardStatusSubtitle: "Робот и звонок запустятся автоматически к указанному времени.",
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
    wardShortError: "Жағдайды толығырақ сипаттаңыз — кем дегенде 10 таңба.",
    wardStatusPending: "Өтінім өңделуде",
    wardStatusAssigned: "Дәрігер тағайындалды",
    wardStatusSubtitle: "Робот пен қоңырау көрсетілген уақытта автоматты түрде іске қосылады.",
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
    wardShortError: "Please describe the condition in more detail — at least 10 characters.",
    wardStatusPending: "Request under review",
    wardStatusAssigned: "Doctor assigned",
    wardStatusSubtitle: "The robot and video call will start automatically at the scheduled time.",
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

function hasAssignedDoctor(item: Appointment) {
  const doctorId = item.doctor_id || item.doctorId;
  return Boolean(doctorId && doctorId !== "pending");
}

function appointmentSortAsc(a: Appointment, b: Appointment) {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  return (a.time || "00:00").localeCompare(b.time || "00:00");
}

export default function Dashboard() {
  const nav = useNavigate();
  const { locale } = useAppPreferences();
  const currentUser = useMemo(() => readCurrentUser(), []);
  const isAdmin = currentUser?.role === "admin";
  const displayName = currentUser?.name || currentUser?.email || "HealthAssist";

  const t = copy[locale];

  const [items, setItems] = useState<MeasurementItem[]>(() => readCachedMeasurements());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState<OnlineTicketView | null>(null);
  const [apptVisible, setApptVisible] = useState(5);
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
  const latestMeasurement = items[0] ?? null;

  const refreshTicket = useCallback(() => {
    const currentTicket = getMyTicket();
    setTicket(currentTicket?.status === "passed" ? null : currentTicket);
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const data = await fetchMyMeasurements();
      setItems(data.items ?? []);
    } catch {
      setItems(readCachedMeasurements());
      setErr(t.measurementError);
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

  useEffect(() => { pingBackend(); }, []);

  useEffect(() => {
    load();
    loadAppointments();
    refreshTicket();

    const timer = window.setInterval(() => {
      refreshTicket();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [load, loadAppointments, refreshTicket]);

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

  async function submitWardConsultation() {
    setWardErr(null);
    setWardOk(null);

    if (wardForm.reason.trim().length < 10) {
      setWardErr(t.wardShortError);
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
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                    {confirmed.specialty_request || confirmed.specialtyRequest || "Специалист"} · {confirmed.date}{confirmed.time && confirmed.time !== "00:00" ? ` · ${confirmed.time}` : ""}
                  </div>
                </div>
              </div>
              {meetingUrl && (
                <a href={meetingUrl} target="_blank" rel="noreferrer" style={{
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
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
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
          const wardLabel = readWardLabel(appointment) || "Палата не указана";
          const bedLabel = readBedLabel(appointment) || "Койка не указана";
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
                  {assigned ? t.wardStatusAssigned : t.wardStatusPending}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
                  {wardLabel} · {bedLabel}
                  {appointment.time && appointment.time !== "00:00" ? ` · ${appointment.date} · ${appointment.time}` : ` · ${appointment.date}`}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginTop: 3 }}>
                  {assigned ? t.wardStatusSubtitle : appointment.reason}
                </div>
              </div>
            </div>
          );
        })}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            alignItems: "start",
            gap: 20,
            marginTop: confirmedAppts.length > 0 || wardAppointments.length > 0 ? 24 : 0,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 12,
              padding: "20px 22px",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
              Ward
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{t.wardBannerTitle}</div>
            <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.68)" }}>
              {t.wardBannerText}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.52)" }}>{t.wardSpecialty}</span>
                <select
                  className="input"
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
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.52)" }}>{t.wardDate}</span>
                <input
                  className="input"
                  type="date"
                  value={wardForm.date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setWardForm((current) => ({ ...current, date: event.target.value }))}
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.52)" }}>{t.wardRoom}</span>
                <input
                  className="input"
                  value={wardForm.wardLabel}
                  onChange={(event) => setWardForm((current) => ({ ...current, wardLabel: event.target.value }))}
                  placeholder="Палата 305"
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.52)" }}>{t.wardBed}</span>
                <input
                  className="input"
                  value={wardForm.bedLabel}
                  onChange={(event) => setWardForm((current) => ({ ...current, bedLabel: event.target.value }))}
                  placeholder="Койка 2"
                />
              </label>
            </div>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.52)" }}>{t.wardReason}</span>
              <textarea
                className="input"
                rows={4}
                value={wardForm.reason}
                onChange={(event) => setWardForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder={t.wardReasonPlaceholder}
                style={{ height: "auto", resize: "vertical" }}
              />
            </label>
            {wardErr ? (
              <div className="alert" style={{ marginTop: 12 }}>
                {wardErr}
              </div>
            ) : null}
            {wardOk ? (
              <div className="badge badge--ok" style={{ marginTop: 12 }}>
                <span className="badge__dot" />
                {wardOk}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void submitWardConsultation()}
              disabled={wardSubmitting}
              style={{
                marginTop: 14,
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

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 48, marginTop: confirmedAppts.length > 0 || inPersonConfirmedAppts.length > 0 ? 24 : 0 }}>

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
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 110px", gap: 12, padding: "0 0 8px", borderBottom: "1px solid rgba(255,255,255,0.07)", marginBottom: 4 }}>
                  {["Специальность · Дата", "", "Статус"].map((h, i) => (
                    <div key={i} style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</div>
                  ))}
                </div>

                {appointments.slice(0, apptVisible).map((appt, idx) => {
                  const roomLabel = readRoomLabel(appt);
                  const sm =
                    appt.status === "pending" && hasAssignedDoctor(appt)
                      ? { label: t.appointmentStatusConfirmed, color: "#6ee7b7", bg: "rgba(52,211,153,0.12)" }
                      : statusMeta(appt.status);
                  const isEven = idx % 2 === 0;
                  return (
                    <div key={appt.id} style={{
                      display: "grid", gridTemplateColumns: "1fr auto 110px", gap: 12,
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
                          {roomLabel ? ` · ${t.confirmedRoom}: ${roomLabel}` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {hasAssignedDoctor(appt) && isHomeOnlineConsultation(appt) && appt.meeting_url && (
                          <a
                            href={appt.meeting_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.35)",
                              color: "#6ee7b7", borderRadius: 6, padding: "4px 10px",
                              fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
                            }}
                          >
                            <Video size={11} /> {t.joinMeeting}
                          </a>
                        )}
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
