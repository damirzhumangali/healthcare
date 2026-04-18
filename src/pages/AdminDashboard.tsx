import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
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

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

type StatusFilter = AppointmentStatus | "all";
type DoctorFilter = string | "all";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDay(date: string) {
  if (!date) return "Все";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short" })
    .format(parsed)
    .replace(".", "");
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

function patientLabel(item: Appointment) {
  const idTail = (item.patient_id || item.patientId || "").slice(-4);
  return item.patientName || item.patient_email || item.patientEmail || (idTail ? `Пациент ${idTail}` : "Пациент");
}

function doctorLabel(item: Appointment, doctors: DoctorOption[]) {
  const doctorId = item.doctor_id || item.doctorId;
  const doctor = doctors.find((doctorItem) => doctorItem.id === doctorId);
  return item.doctorName || (doctor ? `${doctor.name} - ${doctor.specialty}` : doctorId) || "Врач";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function statusLabel(status: AppointmentStatus) {
  if (status === "active") return "Онлайн";
  if (status === "done") return "Подтвержден";
  return "Ожидает";
}

function statusTone(status: AppointmentStatus) {
  if (status === "active") return "dark";
  if (status === "done") return "green";
  return "amber";
}

export default function AdminDashboard() {
  const user = useMemo(() => readCurrentUser(), []);
  const allowed = isAdminAccount(user) || isLocalDemoHost();
  const [date, setDate] = useState(today());
  const [status, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilter>("all");
  const [items, setItems] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>(DOCTORS.map((doctor) => ({ ...doctor, active: true })));
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
      setDoctors(doctorsData.items.length > 0 ? doctorsData.items : DOCTORS.map((doctor) => ({ ...doctor, active: true })));
      setPatients(patientsData.items ?? []);
    } catch {
      setErr("Не удалось загрузить админ-данные. Проверь backend :4000.");
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
          name: patientLabel(item),
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
      setErr("Не удалось изменить статус записи.");
    }
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
          <h1>Нет доступа</h1>
          <p>Для админ-панели нужна роль admin.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="doctor-admin">
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <strong>HealthAssist</strong>
          <span>Админ-панель</span>
        </div>

        <nav className="doctor-admin__nav">
          <a className="doctor-admin__nav-item doctor-admin__nav-item--active" href="#overview">
            <LayoutDashboard size={18} />
            Дашборд
          </a>
          <a className="doctor-admin__nav-item" href="#schedule">
            <CalendarClock size={18} />
            Расписание
          </a>
          <a className="doctor-admin__nav-item" href="#appointments">
            <ClipboardList size={18} />
            Записи
          </a>
          <a className="doctor-admin__nav-item" href="#patients">
            <Users size={18} />
            Пациенты
          </a>
          <a className="doctor-admin__nav-item" href="http://10.202.25.141/">
            <Settings size={18} />
            Настроить BMO
          </a>
        </nav>
      </aside>

      <main className="doctor-admin__main" id="overview">
        <header className="doctor-admin__topbar">
          <div>
            <h1>Обзор</h1>
            <p>{loading ? "Обновляем данные..." : "Сегодняшняя картина по клинике"}</p>
          </div>

          <div className="doctor-admin__profile">
            <label className="doctor-admin__date">
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <button className="doctor-admin__refresh" type="button" onClick={() => setDate("")}>
              Все даты
            </button>
            <select
              className="doctor-admin__select"
              value={status}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидает</option>
              <option value="active">На приеме</option>
              <option value="done">Завершен</option>
            </select>
            <select
              className="doctor-admin__select"
              value={doctorFilter}
              onChange={(event) => setDoctorFilter(event.target.value)}
            >
              <option value="all">Все врачи</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
            <button className="doctor-admin__refresh" type="button" onClick={load}>
              Обновить
            </button>
            <div className="doctor-admin__avatar">AC</div>
            <div className="doctor-admin__doctor">
              <strong>{user?.name || "Др. Алия"}</strong>
              <span>Администратор</span>
            </div>
          </div>
        </header>

        {err ? <div className="doctor-admin__alert">{err}</div> : null}

        <section className="doctor-admin__metrics">
          <article className="doctor-admin__metric">
            <span>Приемов сегодня</span>
            <strong>{stats.today}</strong>
            <small className="doctor-admin__green">+2 vs вчера</small>
          </article>
          <article className="doctor-admin__metric">
            <span>Пациентов всего</span>
            <strong>{stats.patients}</strong>
            <small className="doctor-admin__green">+5 за неделю</small>
          </article>
          <article className="doctor-admin__metric">
            <span>Ожидают ответа</span>
            <strong>{stats.pending}</strong>
            <small className="doctor-admin__red">сообщений</small>
          </article>
          <article className="doctor-admin__metric">
            <span>Рецептов выписано</span>
            <strong>{stats.done}</strong>
            <small className="doctor-admin__green">за эту неделю</small>
          </article>
          <article className="doctor-admin__metric">
            <span>Врачей активны</span>
            <strong>{stats.doctors}</strong>
            <small className="doctor-admin__green">в системе</small>
          </article>
        </section>

        <section className="doctor-admin__content">
          <article className="doctor-admin__panel doctor-admin__schedule" id="schedule">
            <div className="doctor-admin__panel-head">
              <h2>{date ? "Расписание на дату" : "Все записи"}</h2>
              <span>{formatDay(date)}</span>
            </div>

            <div className="doctor-admin__list">
              {visibleItems.length === 0 ? (
                <p className="doctor-admin__empty">На выбранную дату записей нет.</p>
              ) : (
                visibleItems.map((item) => {
                  const name = patientLabel(item);
                  return (
                    <div className="doctor-admin__appointment" key={item.id}>
                      <time>{item.time}</time>
                      <div className="doctor-admin__mini-avatar">{initials(name)}</div>
                      <div className="doctor-admin__appointment-main">
                        <strong>{name}</strong>
                        <span>{item.reason || "Прием"}</span>
                      </div>
                      <button
                        className={`doctor-admin__status doctor-admin__status--${statusTone(item.status)}`}
                        type="button"
                        onClick={() => changeStatus(item.id, item.status === "done" ? "pending" : "done")}
                      >
                        {statusLabel(item.status)}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className="doctor-admin__panel doctor-admin__patients" id="patients">
            <div className="doctor-admin__panel-head doctor-admin__panel-head--row">
              <h2>Последние пациенты</h2>
              <Link to="/appointments/new">
                Все <ArrowRight size={18} />
              </Link>
            </div>

            <div className="doctor-admin__patient-list">
              {visiblePatients.length === 0 ? (
                <p className="doctor-admin__empty">Пока нет реальных пациентов.</p>
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
                          {patient.email || "Без email"} • {patient.appointment_count} записей
                        </span>
                      </div>
                      <button type="button">Карта</button>
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
              <h2>Все записи</h2>
              <p className="doctor-admin__panel-subtitle">
                Управляйте статусом приема по выбранным фильтрам.
              </p>
            </div>
            <span>{visibleItems.length}</span>
          </div>

          <div className="doctor-admin__record-list">
            {visibleItems.length === 0 ? (
              <p className="doctor-admin__empty">Записей по выбранным фильтрам нет.</p>
            ) : (
              visibleItems.map((item) => {
                const name = patientLabel(item);
                return (
                  <div className="doctor-admin__record" key={`${item.id}-record`}>
                    <div className="doctor-admin__record-date">
                      <strong>{item.date}</strong>
                      <span>{item.time}</span>
                    </div>
                    <div className="doctor-admin__mini-avatar">{initials(name)}</div>
                    <div className="doctor-admin__record-main">
                      <strong>{name}</strong>
                      <span>{doctorLabel(item, doctors)}</span>
                      <small>{item.reason || "Прием"}</small>
                    </div>
                    <div className="doctor-admin__record-actions">
                      <span className={`doctor-admin__status doctor-admin__status--${statusTone(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                      <button
                        type="button"
                        disabled={item.status === "pending"}
                        onClick={() => changeStatus(item.id, "pending")}
                      >
                        Ожидает
                      </button>
                      <button
                        type="button"
                        disabled={item.status === "active"}
                        onClick={() => changeStatus(item.id, "active")}
                      >
                        Принять
                      </button>
                      <button
                        type="button"
                        disabled={item.status === "done"}
                        onClick={() => changeStatus(item.id, "done")}
                      >
                        Завершить
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
            Новая запись
          </Link>
        </section>
      </main>
    </div>
  );
}
