import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft, BedDouble, CalendarClock, ClipboardList,
  LayoutDashboard, MonitorSmartphone, Users, Video, Check,
} from "lucide-react";
import {
  DOCTORS,
  assignDoctorToAppointment,
  updateAppointmentStatus,
  getLocalAppointmentById,
  fetchAppointments,
  type Appointment,
} from "../lib/apiAppointments";
import { fetchAdminDoctors } from "../lib/apiAdmin";
import { usePageSeo } from "../lib/seo";

type DoctorRow = { id: string; name: string; specialty: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function jitsiRoomUrl(appointmentId: string) {
  return `https://meet.jit.si/healthassist-${appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

function getBusyDoctorIds(date: string, appointments: Appointment[], excludeId: string): Set<string> {
  return new Set(
    appointments
      .filter((a) => a.date === date && a.id !== excludeId && (a.doctor_id || a.doctorId))
      .map((a) => (a.doctor_id || a.doctorId) as string)
  );
}

export default function AdminRequestPage() {
  usePageSeo({
    title: "Принять заявку — HealthAssist",
    description: "Назначение врача и времени для заявки пациента.",
    path: "/admin/request",
    locale: "ru",
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [request, setRequest] = useState<Appointment | null>(
    (location.state as { appointment?: Appointment } | null)?.appointment ?? null
  );
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>(DOCTORS);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!request && id) {
      setRequest(getLocalAppointmentById(id));
    }
  }, [id, request]);

  useEffect(() => {
    if (request?.date) setDate(request.date || today());
  }, [request]);

  useEffect(() => {
    fetchAppointments().then((d) => setAllAppointments(d.items ?? [])).catch(() => {});
    fetchAdminDoctors()
      .then((d) => {
        if (d.items.length > 0) setDoctors(d.items);
      })
      .catch(() => {});
  }, []);

  // Pre-select first free doctor matching patient's specialty
  useEffect(() => {
    if (!selectedDoctorId && doctors.length > 0) {
      const specialty = request?.specialty_request || request?.specialtyRequest;
      const busyIds = getBusyDoctorIds(date, allAppointments, id ?? "");
      const matching = specialty
        ? doctors.filter((d) => d.specialty === specialty && !busyIds.has(d.id))
        : doctors.filter((d) => !busyIds.has(d.id));
      setSelectedDoctorId((matching[0] ?? doctors[0])?.id ?? "");
    }
  }, [doctors, allAppointments, date, request, id, selectedDoctorId]);

  const busyIds = getBusyDoctorIds(date, allAppointments, id ?? "");
  const freeDocs = doctors.filter((d) => !busyIds.has(d.id));
  const busyDocs = doctors.filter((d) => busyIds.has(d.id));

  const isOnline = request?.wants_online || request?.wantsOnline;
  const jitsiUrl = request ? jitsiRoomUrl(request.id) : "";
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  async function handleSubmit() {
    if (!request || !selectedDoctorId || !date || !time) return;
    setSaving(true);
    try {
      await assignDoctorToAppointment(request.id, selectedDoctorId, time);
      await updateAppointmentStatus(request.id, "active");
      setDone(true);
      window.setTimeout(() => nav("/admin"), 1500);
    } catch {
      setSaving(false);
    }
  }

  const navItems = [
    { label: "Дашборд",        icon: <LayoutDashboard size={18} />, path: "/admin#overview" },
    { label: "Расписание",     icon: <CalendarClock size={18} />,  path: "/admin#schedule" },
    { label: "Записи",         icon: <ClipboardList size={18} />,  path: "/admin#appointments" },
    { label: "Пациенты",       icon: <Users size={18} />,          path: "/admin#patients" },
    { label: "Онлайн в палатах", icon: <MonitorSmartphone size={18} />, path: "/admin/ward-consults" },
    { label: "График врачей",  icon: <BedDouble size={18} />,      path: "/admin/doctor-schedule" },
  ];

  return (
    <div className="doctor-admin">
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <strong>HealthAssist</strong>
          <span>Принять заявку</span>
        </div>
        <nav className="doctor-admin__nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className="doctor-admin__nav-item"
              type="button"
              onClick={() => nav(item.path)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="doctor-admin__main">
        <header className="doctor-admin__topbar">
          <div className="doctor-admin__topbar-copy">
            <div>
              <h1>Принять заявку</h1>
              <p>Назначьте свободного врача и время приёма</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => nav("/admin")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8, fontSize: 13,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white", cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} />
            Назад
          </button>
        </header>

        {!request ? (
          <div style={{ padding: 32, color: "rgba(255,255,255,0.4)" }}>
            Заявка не найдена.
          </div>
        ) : (
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20, maxWidth: 700 }}>

            {/* Patient request card */}
            <div style={{
              borderRadius: 16, padding: "20px 24px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                Заявка пациента
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                {request.patientName || request.patient_email || "Пациент"}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {(request.specialty_request || request.specialtyRequest) ? (
                  <span style={{
                    background: "rgba(99,102,241,0.18)", color: "#a5b4fc",
                    borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 700,
                  }}>
                    {request.specialty_request || request.specialtyRequest}
                  </span>
                ) : null}
                {isOnline ? (
                  <span style={{
                    background: "rgba(34,211,238,0.15)", color: "#22d3ee",
                    borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 700,
                  }}>
                    Онлайн
                  </span>
                ) : null}
                <span style={{
                  background: "rgba(251,191,36,0.12)", color: "#f59e0b",
                  borderRadius: 7, padding: "3px 12px", fontSize: 13,
                }}>
                  Желаемая дата: {request.date || "не указана"}
                </span>
              </div>
              {request.reason ? (
                <div style={{
                  fontSize: 14, color: "rgba(255,255,255,0.65)",
                  fontStyle: "italic", lineHeight: 1.5,
                  background: "rgba(255,255,255,0.04)", borderRadius: 8,
                  padding: "10px 14px",
                }}>
                  «{request.reason}»
                </div>
              ) : null}
            </div>

            {/* Free/busy summary */}
            <div style={{
              display: "flex", gap: 12, flexWrap: "wrap",
            }}>
              <div style={{
                borderRadius: 12, padding: "12px 18px",
                background: freeDocs.length > 0 ? "rgba(34,211,153,0.08)" : "rgba(251,191,36,0.08)",
                border: `1px solid ${freeDocs.length > 0 ? "rgba(34,211,153,0.25)" : "rgba(251,191,36,0.25)"}`,
                flex: 1,
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: freeDocs.length > 0 ? "#34d399" : "#f59e0b" }}>
                  {freeDocs.length}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                  врачей свободны {date && `(${date})`}
                </div>
              </div>
              <div style={{
                borderRadius: 12, padding: "12px 18px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                flex: 1,
              }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.4)" }}>
                  {busyDocs.length}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>
                  врачей заняты
                </div>
              </div>
            </div>

            {/* Assignment form */}
            <div style={{
              borderRadius: 16, padding: "20px 24px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              display: "flex", flexDirection: "column", gap: 16,
            }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Назначение
              </div>

              <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Врач</span>
                <select
                  className="input"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  style={{ maxWidth: 400 }}
                >
                  {freeDocs.length > 0 ? (
                    <optgroup label="✓ Свободны">
                      {freeDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} — {doc.specialty}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {busyDocs.length > 0 ? (
                    <optgroup label="✗ Заняты в этот день">
                      {busyDocs.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} — {doc.specialty}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Дата приёма</span>
                  <input
                    type="date"
                    className="input"
                    value={date}
                    min={today()}
                    onChange={(e) => { setDate(e.target.value); setSelectedDoctorId(""); }}
                    style={{ minWidth: 160 }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Время приёма</span>
                  <input
                    type="time"
                    className="input"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{ minWidth: 130 }}
                    placeholder="09:00"
                  />
                </label>
              </div>

              {isOnline && jitsiUrl ? (
                <div style={{
                  borderRadius: 10, padding: "12px 14px",
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <Video size={16} style={{ color: "#22d3ee", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#22d3ee", fontWeight: 700 }}>Ссылка на встречу будет отправлена пациенту</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2, wordBreak: "break-all" }}>{jitsiUrl}</div>
                  </div>
                  <a
                    href={jitsiUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: "rgba(34,211,238,0.15)", color: "#22d3ee",
                      border: "1px solid rgba(34,211,238,0.3)",
                      borderRadius: 7, padding: "5px 12px",
                      fontSize: 12, fontWeight: 700, textDecoration: "none",
                    }}
                  >
                    Открыть
                  </a>
                </div>
              ) : null}

              {done ? (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: "#34d399", fontWeight: 700, fontSize: 15,
                }}>
                  <Check size={18} />
                  Заявка принята! Пациент уведомлён. Переходим в админ...
                </div>
              ) : (
                <button
                  type="button"
                  disabled={saving || !selectedDoctorId || !date || !time}
                  onClick={handleSubmit}
                  style={{
                    padding: "12px 28px", borderRadius: 10, fontSize: 15, fontWeight: 800,
                    background: (!selectedDoctorId || !date || !time)
                      ? "rgba(255,255,255,0.07)"
                      : "linear-gradient(135deg, #34d399, #22d3ee)",
                    color: (!selectedDoctorId || !date || !time) ? "rgba(255,255,255,0.35)" : "#0a1628",
                    border: "none", cursor: (!selectedDoctorId || !date || !time) ? "not-allowed" : "pointer",
                    alignSelf: "flex-start",
                    transition: "all 0.15s",
                  }}
                >
                  {saving ? "Отправляем..." : (
                    <>
                      {selectedDoctor ? `Назначить ${selectedDoctor.name}` : "Назначить врача"}
                      {date && time ? ` · ${date} ${time}` : ""}
                    </>
                  )}
                </button>
              )}

              {!time ? (
                <div style={{ fontSize: 12, color: "#f59e0b" }}>
                  ⚠ Укажите время приёма
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
