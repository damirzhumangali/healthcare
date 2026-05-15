import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
  MonitorSmartphone,
  Users,
} from "lucide-react";
import { DOCTORS, fetchAppointments, type Appointment } from "../lib/apiAppointments";
import { usePageSeo } from "../lib/seo";

// Time slots 08:00 – 18:00 every 30 min
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}
TIME_SLOTS.push("18:00");

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${String(parseInt(h, 10)).padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return d;
  }
}

function statusColor(s: string) {
  if (s === "active") return "#22d3ee";
  if (s === "done") return "rgba(255,255,255,0.3)";
  return "#f59e0b";
}
function statusBg(s: string) {
  if (s === "active") return "rgba(34,211,238,0.12)";
  if (s === "done") return "rgba(255,255,255,0.04)";
  return "rgba(251,191,36,0.12)";
}
function statusLabel(s: string) {
  if (s === "active") return "На приёме";
  if (s === "done") return "Завершён";
  return "Ожидает";
}

export default function DoctorSchedulePage() {
  usePageSeo({
    title: "График врачей — HealthAssist",
    description: "Расписание и свободные окна врачей.",
    path: "/admin/doctor-schedule",
    locale: "ru",
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const [date, setDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAppointments(date)
      .then((data) => setAppointments(data.items ?? []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [date]);

  function getSlot(doctorId: string, slotTime: string): Appointment | undefined {
    return appointments.find((a) => {
      const docId = a.doctor_id ?? a.doctorId ?? "";
      return docId === doctorId && normalizeTime(a.time) === slotTime;
    });
  }

  const navItems = [
    { label: "Дашборд",       icon: <LayoutDashboard size={18} />, path: "/admin#overview" },
    { label: "Расписание",    icon: <CalendarClock size={18} />,  path: "/admin#schedule" },
    { label: "Записи",        icon: <ClipboardList size={18} />,  path: "/admin#records" },
    { label: "Пациенты",      icon: <Users size={18} />,          path: "/admin#patients" },
    { label: "Онлайн в палатах", icon: <MonitorSmartphone size={18} />, path: "/admin/ward-consults" },
  ];

  return (
    <div className="doctor-admin">
      {/* ── Sidebar ── */}
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <strong>HealthAssist</strong>
          <span>Админ-панель</span>
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
          <button
            className="doctor-admin__nav-item doctor-admin__nav-item--active"
            type="button"
          >
            <BedDouble size={18} />
            График врачей
          </button>
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="doctor-admin__main">
        <header className="doctor-admin__topbar">
          <div className="doctor-admin__topbar-copy">
            <div>
              <h1>График врачей</h1>
              <p>Свободные и занятые окна на {fmtDate(date)}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ minWidth: 160 }}
            />
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
          </div>
        </header>

        <div style={{ padding: "24px" }}>
          {/* Doctor summary cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${DOCTORS.length}, 1fr)`,
            gap: 14, marginBottom: 24,
          }}>
            {DOCTORS.map((doc) => {
              const docAppts = appointments.filter(
                (a) => (a.doctor_id ?? a.doctorId) === doc.id
              );
              const freeCount = TIME_SLOTS.length - docAppts.length;
              return (
                <div key={doc.id} style={{
                  borderRadius: 16, padding: "18px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{doc.specialty}</div>
                  <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#34d399" }}>{freeCount}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>свободно</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>{docAppts.length}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>записей</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Schedule grid */}
          <div style={{
            borderRadius: 16, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.09)",
          }}>
            {/* Column headers */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `72px repeat(${DOCTORS.length}, 1fr)`,
              background: "rgba(255,255,255,0.06)",
              borderBottom: "1px solid rgba(255,255,255,0.09)",
            }}>
              <div style={{ padding: "12px 14px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Время
              </div>
              {DOCTORS.map((doc) => (
                <div key={doc.id} style={{ padding: "12px 14px", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{doc.specialty}</div>
                </div>
              ))}
            </div>

            {/* Time rows */}
            {loading ? (
              <div style={{ padding: "32px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                Загрузка расписания...
              </div>
            ) : (
              TIME_SLOTS.map((slot, idx) => {
                const isHour = slot.endsWith(":00");
                return (
                  <div
                    key={slot}
                    style={{
                      display: "grid",
                      gridTemplateColumns: `72px repeat(${DOCTORS.length}, 1fr)`,
                      borderBottom: idx < TIME_SLOTS.length - 1
                        ? `1px solid rgba(255,255,255,${isHour ? "0.07" : "0.03"})`
                        : "none",
                      background: isHour ? "rgba(255,255,255,0.015)" : "transparent",
                    }}
                  >
                    {/* Time label */}
                    <div style={{
                      padding: "8px 14px",
                      fontSize: 13, fontWeight: isHour ? 700 : 400,
                      color: isHour ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
                      display: "flex", alignItems: "center",
                    }}>
                      {slot}
                    </div>

                    {/* Doctor cells */}
                    {DOCTORS.map((doc) => {
                      const appt = getSlot(doc.id, slot);
                      return (
                        <div
                          key={doc.id}
                          style={{
                            padding: "5px 8px",
                            borderLeft: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {appt ? (
                            <div style={{
                              borderRadius: 8, padding: "6px 10px",
                              background: statusBg(appt.status),
                              border: `1px solid ${statusColor(appt.status)}35`,
                            }}>
                              <div style={{
                                fontSize: 13, fontWeight: 700,
                                color: statusColor(appt.status),
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {appt.patientName ?? appt.patient_email ?? "Пациент"}
                              </div>
                              {appt.reason && (
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {appt.reason}
                                </div>
                              )}
                              <div style={{ fontSize: 10, color: statusColor(appt.status), marginTop: 2, opacity: 0.8 }}>
                                {statusLabel(appt.status)}
                              </div>
                            </div>
                          ) : (
                            <div style={{
                              borderRadius: 8, padding: "6px 10px",
                              background: "rgba(52,211,153,0.04)",
                              border: "1px solid rgba(52,211,153,0.12)",
                              color: "rgba(52,211,153,0.5)",
                              fontSize: 12,
                            }}>
                              Свободно
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { color: "rgba(52,211,153,0.5)",  bg: "rgba(52,211,153,0.07)",  label: "Свободно" },
              { color: "#f59e0b",               bg: "rgba(251,191,36,0.12)",  label: "Ожидает приёма" },
              { color: "#22d3ee",               bg: "rgba(34,211,238,0.12)",  label: "На приёме" },
              { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", label: "Завершён" },
            ].map((l) => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: l.bg, border: `1px solid ${l.color}60` }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
