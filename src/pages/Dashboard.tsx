import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { fetchMyMeasurements, createMeasurement } from "../lib/apiMeasurements";
import {
  DOCTORS,
  fetchAppointments,
  type Appointment,
  type AppointmentStatus,
} from "../lib/apiAppointments";
import { createNewMyTicket, getMyTicket, type OnlineTicketView } from "../lib/onlineTicket";
import { useAppPreferences } from "../lib/appPreferences";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

type MeasurementItem = {
  id: string;
  createdAt: string;
  deviceId: string;
  systolic: number;
  diastolic: number;
  tempC: number;
  hr: number;
  spo2: number;
};

const copy = {
  ru: {
    title: "Кабинет пациента",
    subtitle: "Записывайтесь к врачу, следите за талоном и храните историю измерений.",
    hello: "Аккаунт",
    quickActions: "Быстрые действия",
    quickActionsHint: "Выберите, что нужно сделать сейчас.",
    bookDoctor: "Записаться к врачу",
    newMeasurement: "Добавить измерение",
    qrStation: "Открыть QR-станцию",
    adminPanel: "Зайти в админку",
    myAppointments: "Мои записи",
    myAppointmentsHint: "Здесь появятся ваши приемы после записи к врачу.",
    noAppointments: "Записей пока нет. Выберите врача и удобное время.",
    appointmentError: "Не удалось загрузить записи. Попробуйте обновить страницу.",
    doctor: "Врач",
    reason: "Причина",
    appointmentStatusPending: "Ожидает",
    appointmentStatusActive: "На приеме",
    appointmentStatusDone: "Завершен",
    onlineTicket: "Очередь в клинике",
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
    noMeasurements: "Измерений пока нет. Добавьте вручную или откройте QR-станцию.",
    pressure: "Давление",
    temp: "Темп",
    pulse: "Пульс",
    spo2: "SpO₂",
    device: "устройство",
    measurementError: "Не удалось загрузить измерения. Попробуйте обновить страницу.",
    createMeasurementError: "Не получилось создать измерение. Попробуйте еще раз.",
  },
  kk: {
    title: "Науқас кабинеты",
    subtitle: "Дәрігерге жазылып, талонды бақылап, өлшеулер тарихын сақтаңыз.",
    hello: "Аккаунт",
    quickActions: "Жылдам әрекеттер",
    quickActionsHint: "Қазір не істеу керегін таңдаңыз.",
    bookDoctor: "Дәрігерге жазылу",
    newMeasurement: "Өлшеу қосу",
    qrStation: "QR-станцияны ашу",
    adminPanel: "Админкаға кіру",
    myAppointments: "Менің жазбаларым",
    myAppointmentsHint: "Дәрігерге жазылғаннан кейін қабылдауларыңыз осында көрінеді.",
    noAppointments: "Әзірге жазба жоқ. Дәрігер мен ыңғайлы уақытты таңдаңыз.",
    appointmentError: "Жазбаларды жүктеу мүмкін болмады. Бетті жаңартып көріңіз.",
    doctor: "Дәрігер",
    reason: "Себебі",
    appointmentStatusPending: "Күтуде",
    appointmentStatusActive: "Қабылдауда",
    appointmentStatusDone: "Аяқталды",
    onlineTicket: "Клиника кезегі",
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
    noMeasurements: "Әлі өлшеулер жоқ. Қолмен қосыңыз немесе QR-станцияны ашыңыз.",
    pressure: "Қысым",
    temp: "Темп",
    pulse: "Пульс",
    spo2: "SpO₂",
    device: "құрылғы",
    measurementError: "Өлшеулерді жүктеу мүмкін болмады. Бетті жаңартып көріңіз.",
    createMeasurementError: "Өлшеуді қосу мүмкін болмады. Қайта көріңіз.",
  },
  en: {
    title: "Patient Dashboard",
    subtitle: "Book visits, track your clinic ticket, and keep measurement history.",
    hello: "Account",
    quickActions: "Quick Actions",
    quickActionsHint: "Choose what you need to do now.",
    bookDoctor: "Book a Doctor",
    newMeasurement: "Add Measurement",
    qrStation: "Open QR Station",
    adminPanel: "Open Admin",
    myAppointments: "My Appointments",
    myAppointmentsHint: "Your doctor visits will appear here after booking.",
    noAppointments: "No appointments yet. Choose a doctor and a convenient time.",
    appointmentError: "Failed to load appointments. Try refreshing the page.",
    doctor: "Doctor",
    reason: "Reason",
    appointmentStatusPending: "Pending",
    appointmentStatusActive: "In progress",
    appointmentStatusDone: "Done",
    onlineTicket: "Clinic Queue",
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
    noMeasurements: "No measurements yet. Add one manually or open the QR station.",
    pressure: "Pressure",
    temp: "Temp",
    pulse: "Pulse",
    spo2: "SpO₂",
    device: "device",
    measurementError: "Failed to load measurements. Try refreshing the page.",
    createMeasurementError: "Failed to add measurement. Try again.",
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

export default function Dashboard() {
  const nav = useNavigate();
  const { locale } = useAppPreferences();
  const currentUser = useMemo(() => readCurrentUser(), []);
  const isAdmin = currentUser?.role === "admin";
  const displayName = currentUser?.name || currentUser?.email || "HealthAssist";

  const t = copy[locale];

  const [items, setItems] = useState<MeasurementItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState<OnlineTicketView | null>(null);

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

  return (
    <div className="container">
      <div className="stack">
        <div className="patient-hero">
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>{t.title}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {t.subtitle}
            </p>
            <div className="patient-account">
              <span>{t.hello}</span>
              <strong>{displayName}</strong>
            </div>
          </div>
        </div>

        <Card>
          <div className="patient-actions">
            <div>
              <h2 className="h2" style={{ margin: 0 }}>{t.quickActions}</h2>
              <p className="muted" style={{ margin: "6px 0 0" }}>{t.quickActionsHint}</p>
            </div>

            <div className="patient-actions__buttons">
              {isAdmin ? (
                <Button onClick={() => nav("/admin")}>
                  {t.adminPanel}
                </Button>
              ) : null}

              <Button variant="ghost" onClick={() => nav("/appointments/new")}>
                {t.bookDoctor}
              </Button>

              <Button
                onClick={async () => {
                  setErr(null);
                  try {
                    await createMeasurement("device-001");
                    await load();
                  } catch {
                    setErr(t.createMeasurementError);
                  }
                }}
              >
                {t.newMeasurement}
              </Button>

              <Button variant="ghost" onClick={() => nav("/scan/device-001")}>
                {t.qrStation}
              </Button>
            </div>
          </div>
        </Card>

        {err ? <div className="alert">{err}</div> : null}

        <Card>
          <div className="stack">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 className="h2" style={{ margin: 0 }}>{t.myAppointments}</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>{t.myAppointmentsHint}</p>
              </div>
              <Button variant="ghost" onClick={loadAppointments} disabled={appointmentsLoading}>
                {appointmentsLoading ? t.loading : t.refresh}
              </Button>
            </div>

            {appointmentsLoading ? (
              <p className="muted" style={{ margin: 0 }}>{t.loading}</p>
            ) : appointments.length === 0 ? (
              <div className="stack">
                <p className="muted" style={{ margin: 0 }}>{t.noAppointments}</p>
                <div className="row">
                  <Button onClick={() => nav("/appointments/new")}>{t.bookDoctor}</Button>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {appointment.date} • {appointment.time}
                        </div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {t.doctor}: {doctorLabel(appointment)}
                        </div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {t.reason}: {appointment.reason || "Прием"}
                        </div>
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
              <h2 className="h2" style={{ margin: 0 }}>{t.onlineTicket}</h2>
              <Button variant="ghost" onClick={refreshTicket}>
                {t.refresh}
              </Button>
            </div>

            {!ticket ? (
              <div className="stack">
                <p className="muted" style={{ margin: 0 }}>
                  {t.noTicket}
                </p>
                <div className="row">
                  <Button
                    onClick={() => {
                      const created = createNewMyTicket();
                      setTicket(created);
                    }}
                  >
                    {t.takeNewTicket}
                  </Button>
                </div>
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
                  <Button
                    onClick={() => {
                      const next = createNewMyTicket();
                      setTicket(next);
                    }}
                  >
                    {t.takeNewTicket}
                  </Button>
                  <span className={`badge ${
                    ticket.status === "invited"
                      ? "badge--ok"
                      : ticket.status === "waiting"
                        ? "badge--warn"
                        : "badge--danger"
                  }`}>
                    <span className="badge__dot" />
                    {ticket.status === "invited"
                      ? t.invited
                      : ticket.status === "waiting"
                        ? t.waitForCall
                        : t.ticketMissed}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {t.issued}: {fmtDate(ticket.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="stack">
            <h2 className="h2" style={{ margin: 0 }}>{t.history}</h2>

            {loading ? (
              <p className="muted" style={{ margin: 0 }}>{t.loading}</p>
            ) : items.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {t.noMeasurements}
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((m) => (
                  <Link
                    key={m.id}
                    to={`/app/measurements/${m.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div className="muted" style={{ fontSize: 13 }}>
                            {fmtDate(m.createdAt)} • {t.device}: {m.deviceId}
                          </div>
                          <div style={{ fontWeight: 700, marginTop: 2 }}>
                            {t.pressure}: {m.systolic}/{m.diastolic} • {t.temp}: {m.tempC}°C
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {t.pulse} {m.hr} • {t.spo2} {m.spo2}%
                        </div>
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
  );
}
