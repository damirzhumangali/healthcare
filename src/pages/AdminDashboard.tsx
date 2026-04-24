import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  House,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import {
  DOCTORS,
  fetchAppointments,
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
import { getToken } from "../lib/auth";
import { APP_LOCALES, readStoredLocale, writeStoredLocale, type AppLocale } from "../lib/locale";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

type StatusFilter = AppointmentStatus | "all";
type DoctorFilter = string | "all";
type ErrorState = "load" | "statusUpdate" | null;
type Locale = AppLocale;

const adminText = {
  ru: {
    panelTitle: "Админ-панель",
    navDashboard: "Дашборд",
    navSchedule: "Расписание",
    navAppointments: "Записи",
    navPatients: "Пациенты",
    navSettings: "Настроить BMO",
    home: "На главную",
    overview: "Обзор",
    loading: "Обновляем данные...",
    clinicSnapshot: "Сегодняшняя картина по клинике",
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
    actionComplete: "Завершить",
    newAppointment: "Новая запись",
    accessDenied: "Нет доступа",
    accessDeniedText: "Для админ-панели нужна роль admin.",
    loadError: "Не удалось загрузить админ-данные. Проверь backend :4000.",
    statusUpdateError: "Не удалось изменить статус записи.",
    patientFallback: "Пациент",
    doctorFallback: "Врач",
    appointmentFallback: "Прием",
    statusOnline: "Онлайн",
    statusConfirmed: "Подтвержден",
    statusWaiting: "Ожидает",
  },
  kk: {
    panelTitle: "Әкімші панелі",
    navDashboard: "Басқару",
    navSchedule: "Кесте",
    navAppointments: "Жазылулар",
    navPatients: "Пациенттер",
    navSettings: "BMO баптау",
    home: "Басты бетке",
    overview: "Шолу",
    loading: "Деректер жаңартылуда...",
    clinicSnapshot: "Клиниканың бүгінгі көрінісі",
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
    actionComplete: "Аяқтау",
    newAppointment: "Жаңа жазылу",
    accessDenied: "Қол жеткізу жоқ",
    accessDeniedText: "Әкімші панелі үшін admin рөлі қажет.",
    loadError: "Әкімші деректерін жүктеу мүмкін болмады. Backend :4000 тексеріңіз.",
    statusUpdateError: "Жазылу мәртебесін өзгерту мүмкін болмады.",
    patientFallback: "Пациент",
    doctorFallback: "Дәрігер",
    appointmentFallback: "Қабылдау",
    statusOnline: "Онлайн",
    statusConfirmed: "Расталды",
    statusWaiting: "Күтіп тұр",
  },
  en: {
    panelTitle: "Admin Panel",
    navDashboard: "Dashboard",
    navSchedule: "Schedule",
    navAppointments: "Appointments",
    navPatients: "Patients",
    navSettings: "Configure BMO",
    home: "Home",
    overview: "Overview",
    loading: "Refreshing data...",
    clinicSnapshot: "Today's clinic snapshot",
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
    actionComplete: "Complete",
    newAppointment: "New appointment",
    accessDenied: "Access denied",
    accessDeniedText: "The admin panel requires the admin role.",
    loadError: "Could not load admin data. Check backend :4000.",
    statusUpdateError: "Could not change the appointment status.",
    patientFallback: "Patient",
    doctorFallback: "Doctor",
    appointmentFallback: "Appointment",
    statusOnline: "Online",
    statusConfirmed: "Confirmed",
    statusWaiting: "Waiting",
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

function formatDay(date: string, locale: Locale, allLabel: string) {
  if (!date) return allLabel;

  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat(localeDateMap[locale], { day: "2-digit", month: "short" })
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

function patientLabel(item: Appointment, fallback: string) {
  const idTail = (item.patient_id || item.patientId || "").slice(-4);
  return (
    item.patientName ||
    item.patient_email ||
    item.patientEmail ||
    (idTail ? `${fallback} ${idTail}` : fallback)
  );
}

function doctorLabel(item: Appointment, doctors: DoctorOption[], fallback: string) {
  const doctorId = item.doctor_id || item.doctorId;
  const doctor = doctors.find((doctorItem) => doctorItem.id === doctorId);
  return item.doctorName || (doctor ? `${doctor.name} - ${doctor.specialty}` : doctorId) || fallback;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function statusLabel(status: AppointmentStatus, locale: Locale) {
  const t = adminText[locale];

  if (status === "active") return t.statusOnline;
  if (status === "done") return t.statusConfirmed;
  return t.statusWaiting;
}

function statusTone(status: AppointmentStatus) {
  if (status === "active") return "dark";
  if (status === "done") return "green";
  return "amber";
}

function appointmentCountLabel(locale: Locale, count: number) {
  if (locale === "kk") return `${count} жазылу`;
  if (locale === "en") return `${count} appointments`;
  return `${count} записей`;
}

export default function AdminDashboard() {
  const user = useMemo(() => readCurrentUser(), []);
  const allowed = isAdminAccount(user) || isLocalDemoHost();
  const [locale, setLocale] = useState<Locale>(() => readStoredLocale());
  const [date, setDate] = useState(today());
  const [status, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilter>("all");
  const [items, setItems] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>(DOCTORS.map((doctor) => ({ ...doctor, active: true })));
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<ErrorState>(null);

  const t = adminText[locale];
  const displayName = user?.name || user?.email || t.defaultAdminName;

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);

    try {
      const [appointmentsData, summaryData, doctorsData, patientsData] = await Promise.all([
        fetchAppointments(date || undefined),
        fetchAdminSummary(),
        fetchAdminDoctors(),
        fetchAdminPatients(),
      ]);

      setItems(appointmentsData.items ?? []);
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

  const visibleItems = filteredItems;
  const visiblePatients =
    patients.length > 0
      ? patients
      : visibleItems.map((item) => ({
          id: item.patient_id || item.patientId || item.id,
          email: item.patient_email || item.patientEmail || null,
          name: patientLabel(item, t.patientFallback),
          role: "patient",
          last_appointment_at: item.created_at || item.createdAt || null,
          appointment_count: 1,
        }));

  const stats = useMemo(() => {
    return {
      today: summary?.appointmentsToday ?? visibleItems.length,
      patients: summary?.patients ?? visiblePatients.length,
      pending: summary?.pending ?? visibleItems.filter((item) => item.status === "pending").length,
      done: summary?.done ?? visibleItems.filter((item) => item.status === "done").length,
      doctors: summary?.doctors ?? doctors.filter((doctor) => doctor.active !== false).length,
    };
  }, [doctors, summary, visibleItems, visiblePatients]);

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

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (!getToken()) {
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
          <a className="doctor-admin__nav-item doctor-admin__nav-item--active" href="#overview">
            <LayoutDashboard size={18} />
            {t.navDashboard}
          </a>
          <a className="doctor-admin__nav-item" href="#schedule">
            <CalendarClock size={18} />
            {t.navSchedule}
          </a>
          <a className="doctor-admin__nav-item" href="#appointments">
            <ClipboardList size={18} />
            {t.navAppointments}
          </a>
          <a className="doctor-admin__nav-item" href="#patients">
            <Users size={18} />
            {t.navPatients}
          </a>
          <a className="doctor-admin__nav-item" href="http://10.202.27.117">
            <Settings size={18} />
            {t.navSettings}
          </a>
        </nav>
      </aside>

      <main className="doctor-admin__main" id="overview">
        <header className="doctor-admin__topbar">
          <div>
            <h1>{t.overview}</h1>
            <p>{loading ? t.loading : t.clinicSnapshot}</p>
          </div>

          <div className="doctor-admin__profile">
            <label className="doctor-admin__date">
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <button className="doctor-admin__refresh" type="button" onClick={() => setDate("")}>
              {t.allDates}
            </button>
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
            <button className="doctor-admin__refresh" type="button" onClick={load}>
              {t.refresh}
            </button>
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
            {err === "load" ? t.loadError : t.statusUpdateError}
          </div>
        ) : null}

        <section className="doctor-admin__metrics">
          <article className="doctor-admin__metric">
            <span>{t.appointmentsToday}</span>
            <strong>{stats.today}</strong>
            <small className="doctor-admin__green">{t.todayDelta}</small>
          </article>
          <article className="doctor-admin__metric">
            <span>{t.patientsTotal}</span>
            <strong>{stats.patients}</strong>
            <small className="doctor-admin__green">{t.patientsDelta}</small>
          </article>
          <article className="doctor-admin__metric">
            <span>{t.awaitingResponse}</span>
            <strong>{stats.pending}</strong>
            <small className="doctor-admin__red">{t.pendingDelta}</small>
          </article>
          <article className="doctor-admin__metric">
            <span>{t.prescriptionsIssued}</span>
            <strong>{stats.done}</strong>
            <small className="doctor-admin__green">{t.prescriptionsDelta}</small>
          </article>
          <article className="doctor-admin__metric">
            <span>{t.activeDoctors}</span>
            <strong>{stats.doctors}</strong>
            <small className="doctor-admin__green">{t.doctorsDelta}</small>
          </article>
        </section>

        <section className="doctor-admin__content">
          <article className="doctor-admin__panel doctor-admin__schedule" id="schedule">
            <div className="doctor-admin__panel-head">
              <h2>{date ? t.scheduleForDate : t.allAppointments}</h2>
              <span>{formatDay(date, locale, t.all)}</span>
            </div>

            <div className="doctor-admin__list">
              {visibleItems.length === 0 ? (
                <p className="doctor-admin__empty">{t.noAppointments}</p>
              ) : (
                visibleItems.map((item) => {
                  const name = patientLabel(item, t.patientFallback);

                  return (
                    <div className="doctor-admin__appointment" key={item.id}>
                      <time>{item.time}</time>
                      <div className="doctor-admin__mini-avatar">{initials(name)}</div>
                      <div className="doctor-admin__appointment-main">
                        <strong>{name}</strong>
                        <span>{item.reason || t.appointmentFallback}</span>
                      </div>
                      <button
                        className={`doctor-admin__status doctor-admin__status--${statusTone(item.status)}`}
                        type="button"
                        onClick={() => changeStatus(item.id, item.status === "done" ? "pending" : "done")}
                      >
                        {statusLabel(item.status, locale)}
                      </button>
                    </div>
                  );
                })
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
              {visiblePatients.length === 0 ? (
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

        <section className="doctor-admin__panel doctor-admin__records" id="appointments">
          <div className="doctor-admin__panel-head">
            <div>
              <h2>{t.allAppointments}</h2>
              <p className="doctor-admin__panel-subtitle">{t.recordsSubtitle}</p>
            </div>
            <span>{visibleItems.length}</span>
          </div>

          <div className="doctor-admin__record-list">
            {visibleItems.length === 0 ? (
              <p className="doctor-admin__empty">{t.noRecords}</p>
            ) : (
              visibleItems.map((item) => {
                const name = patientLabel(item, t.patientFallback);

                return (
                  <div className="doctor-admin__record" key={`${item.id}-record`}>
                    <div className="doctor-admin__record-date">
                      <strong>{item.date}</strong>
                      <span>{item.time}</span>
                    </div>
                    <div className="doctor-admin__mini-avatar">{initials(name)}</div>
                    <div className="doctor-admin__record-main">
                      <strong>{name}</strong>
                      <span>{doctorLabel(item, doctors, t.doctorFallback)}</span>
                      <small>{item.reason || t.appointmentFallback}</small>
                    </div>
                    <div className="doctor-admin__record-actions">
                      <span className={`doctor-admin__status doctor-admin__status--${statusTone(item.status)}`}>
                        {statusLabel(item.status, locale)}
                      </span>
                      <button
                        type="button"
                        disabled={item.status === "pending"}
                        onClick={() => changeStatus(item.id, "pending")}
                      >
                        {t.actionPending}
                      </button>
                      <button
                        type="button"
                        disabled={item.status === "active"}
                        onClick={() => changeStatus(item.id, "active")}
                      >
                        {t.actionAccept}
                      </button>
                      <button
                        type="button"
                        disabled={item.status === "done"}
                        onClick={() => changeStatus(item.id, "done")}
                      >
                        {t.actionComplete}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="doctor-admin__quick">
          <Link to="/appointments/new">
            <ClipboardList size={18} />
            {t.newAppointment}
          </Link>
        </section>
      </main>
    </div>
  );
}
