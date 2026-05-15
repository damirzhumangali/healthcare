import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  BedDouble,
  Bot,
  CalendarClock,
  House,
  LayoutDashboard,
  Loader2,
  Monitor,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import {
  fetchAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../lib/apiAppointments";
import { hasSession } from "../lib/auth";
import {
  listAllBedsideConsultations,
  updateBedsideConsultationStage,
  type BedsideConsultationView,
  type ConsultationStage,
} from "../lib/onlineConsultations";
import { API_URL } from "../lib/apiBase";
import { usePageSeo } from "../lib/seo";

type StoredUser = { id?: string; email?: string; name?: string; role?: string };
type NavSection = "overview" | "patients" | "ward" | "schedule";
type AiAdvice = {
  status: string;
  summary: string;
  concerns: string[];
  doctor: string;
  doctor_urgency: string;
  medications: Array<{ drug: string; compartment: string | null; dosage: string; available_in_robot: boolean }>;
  actions: string[];
};
type AiResult = { consultId: string; loading: boolean; data: AiAdvice | null; error: boolean };

function readCurrentUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch { return null; }
}

function today() { return new Date().toISOString().slice(0, 10); }

function patientLabel(item: Appointment) {
  return item.patientName || item.patient_email || item.patientEmail || item.patient_id || item.patientId || "Пациент";
}

const STAGE_LABELS: Record<ConsultationStage, string> = {
  scheduled: "Назначено",
  robot_en_route: "Робот в пути",
  bedside_ready: "У кровати",
  live: "Идёт звонок",
  completed: "Завершено",
};

const STAGE_BADGE: Record<ConsultationStage, string> = {
  scheduled: "badge--danger",
  robot_en_route: "badge--warn",
  bedside_ready: "badge--warn",
  live: "badge--ok",
  completed: "badge--ok",
};

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => { dispose: () => void };
  }
}

function JitsiPanel({ roomId, doctorName, onClose }: { roomId: string; doctorName: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    let disposed = false;

    function mount() {
      if (!ref.current || !window.JitsiMeetExternalAPI) return;
      apiRef.current = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName: roomId,
        parentNode: ref.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: `Врач: ${doctorName}` },
        configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          TOOLBAR_BUTTONS: ["microphone", "camera", "hangup", "chat", "fullscreen"],
        },
      });
    }

    if (window.JitsiMeetExternalAPI) {
      mount();
    } else {
      const s = document.createElement("script");
      s.src = "https://meet.jit.si/external_api.js";
      s.onload = () => { if (!disposed) mount(); };
      document.head.appendChild(s);
    }

    return () => {
      disposed = true;
      apiRef.current?.dispose();
    };
  }, [roomId, doctorName]);

  return (
    <div className="wc-jitsi-overlay">
      <div className="wc-jitsi-header">
        <span>🔴 Видеозвонок активен</span>
        <button className="wc-jitsi-close" onClick={onClose}><X size={18} /></button>
      </div>
      <div ref={ref} style={{ flex: 1 }} />
    </div>
  );
}

export default function DoctorDashboard() {
  usePageSeo({
    title: "Кабинет врача — HealthAssist",
    description: "Рабочий кабинет врача в системе HealthAssist.",
    path: "/doctor",
    locale: "ru",
    robots: "noindex, nofollow",
  });

  const user = useMemo(() => readCurrentUser(), []);
  const role = user?.role;
  const allowed = role === "doctor" || role === "admin";
  const doctorName = user?.name || user?.email || "Врач";

  const [activeSection, setActiveSection] = useState<NavSection>("overview");
  const [date, setDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<BedsideConsultationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);

  const loadConsultations = useCallback((d: string) => {
    const all = listAllBedsideConsultations();
    setConsultations(all.filter(c => c.date === d));
  }, []);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const data = await fetchAppointments(date);
      setAppointments(data.items ?? []);
      loadConsultations(date);
    } catch {
      setErr("Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  }, [date, loadConsultations]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  useEffect(() => {
    if (!allowed) return;
    const t = window.setInterval(() => loadConsultations(date), 5000);
    return () => window.clearInterval(t);
  }, [allowed, date, loadConsultations]);

  async function setStatus(id: string, status: AppointmentStatus) {
    try {
      await updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } catch {
      setErr("Не удалось изменить статус.");
    }
  }

  async function setConsultStage(session: BedsideConsultationView, stage: ConsultationStage) {
    updateBedsideConsultationStage(session.id, stage);
    if (stage === "live") {
      await updateAppointmentStatus(session.appointmentId, "active").catch(() => {});
      if (session.meetRoomId) setActiveCall(session.meetRoomId);
    }
    if (stage === "completed") {
      await updateAppointmentStatus(session.appointmentId, "done").catch(() => {});
    }
    loadConsultations(date);
  }

  async function requestAiAdvice(consult: BedsideConsultationView) {
    setAiResult({ consultId: consult.id, loading: true, data: null, error: false });
    try {
      const res = await fetch(`${API_URL}/api/ai/vitals-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tempC: consult.realTempC ?? null,
          hr: consult.realHr ?? null,
          medication: consult.medication ?? [],
        }),
      });
      const json = await res.json();
      setAiResult({ consultId: consult.id, loading: false, data: json.advice ?? null, error: false });
    } catch {
      setAiResult({ consultId: consult.id, loading: false, data: null, error: true });
    }
  }

  const todayAppts = appointments.filter(a => a.date === date);
  const activeConsults = consultations.filter(c => c.stage === "live" || c.stage === "bedside_ready");
  const completedToday = appointments.filter(a => a.status === "done").length;

  if (!hasSession()) return <Navigate to="/login" replace />;

  if (!allowed) {
    return (
      <div className="container">
        <div className="stack" style={{ padding: "64px 0" }}>
          <h1 className="h2">Нет доступа</h1>
          <p className="muted">Для кабинета врача нужна роль doctor или admin.</p>
          <Link to="/" style={{ color: "var(--primary)" }}>← На главную</Link>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: NavSection; label: string; icon: React.ReactNode }> = [
    { id: "overview",  label: "Дашборд",          icon: <LayoutDashboard size={18} /> },
    { id: "patients",  label: "Мои пациенты",      icon: <Users size={18} /> },
    { id: "ward",      label: "Онлайн в палатах",  icon: <Monitor size={18} /> },
    { id: "schedule",  label: "Расписание",         icon: <CalendarClock size={18} /> },
  ];

  return (
    <div className="doctor-admin">
      {/* ── Sidebar ── */}
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <Stethoscope size={22} />
          <strong>HealthAssist</strong>
          <span>Кабинет врача</span>
        </div>

        <nav className="doctor-admin__nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`doctor-admin__nav-item ${activeSection === item.id ? "doctor-admin__nav-item--active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <Link
          className="doctor-admin__nav-item"
          to="/"
          style={{ marginTop: "auto", textDecoration: "none" }}
        >
          <House size={18} />
          На главную
        </Link>
      </aside>

      {/* ── Main ── */}
      <main className="doctor-admin__main">
        <header className="doctor-admin__topbar">
          <div className="doctor-admin__topbar-copy">
            <h1>{navItems.find(n => n.id === activeSection)?.label}</h1>
            <p>Добро пожаловать, {doctorName}</p>
          </div>
          <div className="doctor-admin__profile">
            <button
              onClick={() => void load()}
              disabled={loading}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 8, padding: "6px 14px",
                color: "white", cursor: "pointer", fontSize: 13,
              }}
            >
              {loading ? "Загрузка..." : "Обновить"}
            </button>
            <div className="doctor-admin__identity">
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #22d3ee, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 14, color: "#0a0f1a",
              }}>
                {doctorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong style={{ fontSize: 13 }}>{doctorName}</strong>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "block" }}>Врач</span>
              </div>
            </div>
          </div>
        </header>

        {err && <div className="alert" style={{ margin: "0 24px 16px" }}>{err}</div>}

        <div style={{ padding: "0 24px 32px" }}>

          {/* ── OVERVIEW ── */}
          {activeSection === "overview" && (
            <div className="stack">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14 }}>
                {[
                  { label: "Пациентов сегодня",    value: todayAppts.length,      color: "#22d3ee" },
                  { label: "Активных консультаций", value: activeConsults.length,  color: "#f59e0b" },
                  { label: "Завершено сегодня",     value: completedToday,         color: "#34d399" },
                  { label: "Палатных онлайн",       value: consultations.length,   color: "#818cf8" },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: 16, padding: "20px 22px",
                  }}>
                    <div style={{ fontSize: 30, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 4 }}>
                {navItems.filter(n => n.id !== "overview").map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "18px 20px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: 16, cursor: "pointer", color: "white", textAlign: "left",
                    }}
                  >
                    <span style={{ color: "#22d3ee" }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{item.label}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                        {item.id === "patients" && `${todayAppts.length} на сегодня`}
                        {item.id === "ward" && `${consultations.length} консультаций`}
                        {item.id === "schedule" && "Расписание по датам"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── PATIENTS ── */}
          {activeSection === "patients" && (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 className="h2" style={{ margin: 0 }}>Пациенты на {date}</h2>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Управление приёмами</p>
                </div>
                <input
                  className="input"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ minWidth: 160 }}
                />
              </div>

              {loading ? (
                <p className="muted">Загрузка...</p>
              ) : todayAppts.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <BedDouble size={36} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
                  <p className="muted">На эту дату записей нет.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {todayAppts.map(item => (
                    <div key={item.id} style={{
                      padding: "16px 18px", borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.09)",
                      background: "rgba(255,255,255,0.03)",
                    }}>
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>{item.time} — {patientLabel(item)}</div>
                          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{item.reason || "Без причины"}</div>
                        </div>
                        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span className={`badge ${item.status === "active" ? "badge--warn" : item.status === "done" ? "badge--ok" : "badge--danger"}`}>
                            <span className="badge__dot" />
                            {item.status === "active" ? "На приёме" : item.status === "done" ? "Завершён" : "Ожидает"}
                          </span>
                          {item.status !== "active" && item.status !== "done" && (
                            <button
                              onClick={() => void setStatus(item.id, "active")}
                              style={{ padding: "5px 13px", borderRadius: 8, background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee", cursor: "pointer", fontSize: 13 }}
                            >Принять</button>
                          )}
                          {item.status !== "done" && (
                            <button
                              onClick={() => void setStatus(item.id, "done")}
                              style={{ padding: "5px 13px", borderRadius: 8, background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399", cursor: "pointer", fontSize: 13 }}
                            >Завершить</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── WARD CONSULTATIONS ── */}
          {activeSection === "ward" && (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 className="h2" style={{ margin: 0 }}>Онлайн-консультации в палатах</h2>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Видеосвязь у кровати пациента через робота AIMAR</p>
                </div>
                <input
                  className="input"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ minWidth: 160 }}
                />
              </div>

              {consultations.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <Monitor size={36} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
                  <p className="muted">На эту дату палатных консультаций нет.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {consultations.map(session => {
                    const ai = aiResult?.consultId === session.id ? aiResult : null;
                    const isCritical = ai?.data?.status === "критично";
                    const isWarn = ai?.data?.status === "внимание";
                    const aiColor = isCritical ? "#f87171" : isWarn ? "#fbbf24" : "#34d399";

                    return (
                      <div key={session.id} style={{
                        borderRadius: 16,
                        border: `1px solid ${session.stage === "live" ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.09)"}`,
                        background: session.stage === "live" ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.03)",
                        overflow: "hidden",
                      }}>
                        {/* Card header */}
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 16 }}>{session.patientName}</div>
                              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                                {session.doctorName} • {session.wardLabel}, {session.bedLabel} • {session.time}
                              </div>
                              {session.notes && (
                                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{session.notes}</div>
                              )}
                            </div>
                            <span className={`badge ${STAGE_BADGE[session.stage]}`}>
                              <span className="badge__dot" />
                              {STAGE_LABELS[session.stage]}
                            </span>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div style={{ display: "flex", gap: 0, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexWrap: "wrap" }}>
                          {[
                            { icon: <BedDouble size={14} />, label: "Палата", val: `${session.wardLabel} / ${session.bedLabel}` },
                            { icon: <Bot size={14} />, label: "Терминал", val: session.robotUnit },
                            { icon: <Stethoscope size={14} />, label: "Специальность", val: session.specialty },
                          ].map(s => (
                            <div key={s.label} style={{ minWidth: 140, padding: "6px 16px 6px 0", marginRight: 16, borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center", color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 3 }}>
                                {s.icon} {s.label}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{s.val}</div>
                            </div>
                          ))}
                          {(session.realTempC != null || session.realHr != null) && (
                            <div style={{ padding: "6px 0" }}>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>Показатели</div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#34d399" }}>
                                {session.realTempC != null && `🌡 ${session.realTempC}°C`}
                                {session.realHr != null && ` ❤️ ${session.realHr} уд/мин`}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ padding: "14px 20px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          {session.stage === "scheduled" && (
                            <button onClick={() => void setConsultStage(session, "robot_en_route")} style={btnStyle("#f59e0b")}>
                              Отправить робота
                            </button>
                          )}
                          {session.stage === "robot_en_route" && (
                            <button onClick={() => void setConsultStage(session, "bedside_ready")} style={btnStyle("#22d3ee")}>
                              У кровати
                            </button>
                          )}
                          {session.stage === "bedside_ready" && (
                            <button onClick={() => void setConsultStage(session, "live")} style={btnStyle("#34d399")}>
                              Начать звонок
                            </button>
                          )}
                          {session.stage === "live" && (
                            <>
                              <button
                                onClick={() => session.meetRoomId && setActiveCall(session.meetRoomId)}
                                style={btnStyle("#34d399")}
                              >
                                📹 Открыть видео
                              </button>
                              <button onClick={() => void setConsultStage(session, "completed")} style={btnStyle("rgba(255,255,255,0.25)")}>
                                Завершить
                              </button>
                            </>
                          )}

                          {(session.realTempC != null || session.realHr != null) && session.stage !== "completed" && (
                            <button
                              onClick={() => void requestAiAdvice(session)}
                              disabled={ai?.loading}
                              style={{ ...btnStyle("#818cf8"), display: "flex", alignItems: "center", gap: 6 }}
                            >
                              {ai?.loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Bot size={13} />}
                              Анализ ИИ
                            </button>
                          )}
                        </div>

                        {/* AI advice panel */}
                        {ai?.data && !ai.loading && (
                          <div style={{
                            margin: "0 20px 16px",
                            borderRadius: 14,
                            border: `1.5px solid ${aiColor}`,
                            padding: "14px 16px",
                            background: isCritical ? "rgba(248,113,113,0.07)" : isWarn ? "rgba(251,191,36,0.07)" : "rgba(52,211,153,0.07)",
                          }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>Анализ ИИ</span>
                              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 800, background: aiColor, color: "#0a0f1a" }}>{ai.data.status}</span>
                            </div>
                            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", margin: "0 0 10px", lineHeight: 1.5 }}>{ai.data.summary}</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Врач:</span>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{ai.data.doctor}</span>
                              <span style={{ fontSize: 11, padding: "1px 9px", borderRadius: 10, background: `${aiColor}25`, color: aiColor, fontWeight: 600 }}>{ai.data.doctor_urgency}</span>
                            </div>
                            {ai.data.medications.length > 0 && (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Лекарства</div>
                                {ai.data.medications.map((m, i) => (
                                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 10px", marginBottom: 4, borderRadius: 8, background: "rgba(255,255,255,0.05)" }}>
                                    {m.compartment ? (
                                      <span style={{ background: "#22d3ee", color: "#0a0f1a", fontWeight: 800, fontSize: 11, borderRadius: 6, padding: "2px 8px" }}>{m.compartment}</span>
                                    ) : (
                                      <span style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)", fontSize: 11, borderRadius: 6, padding: "2px 8px" }}>—</span>
                                    )}
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{m.drug}</span>
                                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{m.dosage}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {ai.data.actions.length > 0 && (
                              <div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Действия</div>
                                {ai.data.actions.map((a, i) => (
                                  <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 5 }}>
                                    <span style={{ color: aiColor }}>•</span>
                                    <span style={{ color: "rgba(255,255,255,0.8)" }}>{a}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {ai?.error && (
                          <div className="alert" style={{ margin: "0 20px 16px" }}>Не удалось получить анализ ИИ</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── SCHEDULE ── */}
          {activeSection === "schedule" && (
            <div className="stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 className="h2" style={{ margin: 0 }}>Расписание</h2>
                  <p className="muted" style={{ margin: "4px 0 0" }}>Все записи на выбранную дату</p>
                </div>
                <input
                  className="input"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  style={{ minWidth: 160 }}
                />
              </div>

              {loading ? (
                <p className="muted">Загрузка...</p>
              ) : appointments.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center" }}>
                  <CalendarClock size={36} style={{ color: "rgba(255,255,255,0.2)", margin: "0 auto 12px" }} />
                  <p className="muted">На эту дату записей нет.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {appointments.map(item => (
                    <div key={item.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "14px 18px", borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.09)",
                      background: "rgba(255,255,255,0.03)",
                      gap: 12, flexWrap: "wrap",
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{item.time} — {patientLabel(item)}</div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>{item.reason || "Без причины"}</div>
                      </div>
                      <span className={`badge ${item.status === "active" ? "badge--warn" : item.status === "done" ? "badge--ok" : "badge--danger"}`}>
                        <span className="badge__dot" />
                        {item.status === "active" ? "На приёме" : item.status === "done" ? "Завершён" : "Ожидает"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Jitsi overlay */}
      {activeCall && (
        <JitsiPanel
          roomId={activeCall}
          doctorName={doctorName}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding: "7px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600,
    background: `${color}20`, border: `1px solid ${color}50`,
    color: color === "rgba(255,255,255,0.25)" ? "rgba(255,255,255,0.7)" : color,
    cursor: "pointer",
  };
}
