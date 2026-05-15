import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  ClipboardList,
  Cpu,
  Activity,
  ExternalLink,
  House,
  LayoutDashboard,
  MessageSquare,
  MonitorSmartphone,
  PhoneCall,
  Pill,
  Plus,
  Settings,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { DOCTORS } from "../lib/apiAppointments";
import { isAdminAccount } from "../lib/adminAccess";
import { BMO_SETTINGS_URL } from "../lib/apiBase";
import { hasSession } from "../lib/auth";
import { readStoredLocale, writeStoredLocale } from "../lib/locale";
import { usePageSeo } from "../lib/seo";
import {
  createManualWardConsultation,
  deleteBedsideConsultation,
  listAllBedsideConsultations,
  setRealVitals,
  updateBedsideConsultationStage,
  updateMedication,
  type BedsideConsultationView,
  type ConsultationStage,
  type MedicationSlot,
} from "../lib/onlineConsultations";

type StoredUser = { id?: string; email?: string; name?: string; role?: string };
type Locale = "ru" | "kk" | "en";

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

const stageLabels: Record<ConsultationStage, string> = {
  scheduled: "Запланировано",
  robot_en_route: "Робот едет",
  bedside_ready: "У кровати",
  live: "🔴 Онлайн",
  completed: "Завершено",
};

const stageTones: Record<ConsultationStage, string> = {
  scheduled: "amber",
  robot_en_route: "blue",
  bedside_ready: "blue",
  live: "ok",
  completed: "green",
};

type WardFormState = {
  patientName: string;
  wardLabel: string;
  bedLabel: string;
  doctorId: string;
  date: string;
  time: string;
  notes: string;
};

function emptyForm(): WardFormState {
  return {
    patientName: "",
    wardLabel: "",
    bedLabel: "",
    doctorId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "",
    notes: "",
  };
}

function emptyMedSlot(): MedicationSlot {
  return { compartment: "", drug: "", dosage: "", instruction: "" };
}

function JitsiPanel({ roomId, doctorName, onClose }: { roomId: string; doctorName: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose(): void } | null>(null);

  useEffect(() => {
    function init() {
      if (!ref.current) return;
      const JitsiAPI = (window as Record<string, unknown>).JitsiMeetExternalAPI as new (
        domain: string, opts: Record<string, unknown>
      ) => { dispose(): void };
      if (!JitsiAPI) return;
      if (apiRef.current) apiRef.current.dispose();
      apiRef.current = new JitsiAPI("meet.jit.si", {
        roomName: roomId,
        parentNode: ref.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: `Врач: ${doctorName}` },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          TOOLBAR_BUTTONS: ["microphone", "camera", "hangup", "fullscreen"],
        },
      });
    }

    if ((window as Record<string, unknown>).JitsiMeetExternalAPI) {
      init();
    } else {
      const s = document.createElement("script");
      s.src = "https://meet.jit.si/external_api.js";
      s.onload = init;
      document.head.appendChild(s);
    }
    return () => { apiRef.current?.dispose(); apiRef.current = null; };
  }, [roomId, doctorName]);

  return (
    <div className="wc-jitsi-overlay">
      <div className="wc-jitsi-header">
        <span className="rt__live-dot" style={{ marginRight: 8 }} />
        Видеозвонок · {roomId}
        <button className="wc-jitsi-close" type="button" onClick={onClose}><X size={18} /></button>
      </div>
      <div ref={ref} style={{ flex: 1 }} />
    </div>
  );
}

export default function WardConsultationsPage() {
  usePageSeo({
    title: "Палатные консультации — HealthAssist",
    description: "Управление дистанционными консультациями у кровати пациента.",
    path: "/admin/ward-consults",
    locale: "ru",
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const user = readCurrentUser();
  const allowed = isAdminAccount(user) || isLocalDemoHost();
  const [locale, setLocale] = useState<Locale>(() => readStoredLocale() as Locale);
  const displayName = user?.name || user?.email || "Администратор";

  const [consults, setConsults] = useState<BedsideConsultationView[]>(() => listAllBedsideConsultations());
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<WardFormState>(emptyForm);
  const [activeCall, setActiveCall] = useState<{ roomId: string; doctorName: string } | null>(null);
  const [medEditId, setMedEditId] = useState<string | null>(null);
  const [medSlots, setMedSlots] = useState<MedicationSlot[]>([emptyMedSlot()]);
  const [vitalsEditId, setVitalsEditId] = useState<string | null>(null);
  const [vitalsInput, setVitalsInput] = useState({ tempC: "", hr: "" });

  function refresh() {
    setConsults(listAllBedsideConsultations());
  }

  useEffect(() => {
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, []);

  function handleCreate() {
    if (!form.patientName || !form.wardLabel || !form.doctorId || !form.date || !form.time) return;
    const doc = DOCTORS.find((d) => d.id === form.doctorId);
    createManualWardConsultation({
      patientName: form.patientName,
      wardLabel: form.wardLabel,
      bedLabel: form.bedLabel || "Койка 1",
      doctorId: form.doctorId,
      doctorName: doc?.name || form.doctorId,
      specialty: doc?.specialty || "Онлайн-консультация",
      date: form.date,
      time: form.time,
      notes: form.notes,
    });
    setForm(emptyForm());
    setFormOpen(false);
    refresh();
  }

  function handleStage(id: string, stage: ConsultationStage) {
    updateBedsideConsultationStage(id, stage);
    refresh();
  }

  function openCall(consult: BedsideConsultationView) {
    if (!consult.meetRoomId) return;
    setActiveCall({ roomId: consult.meetRoomId, doctorName: consult.doctorName });
    handleStage(consult.id, "live");
  }

  function openVitalsEdit(consult: BedsideConsultationView) {
    setVitalsEditId(consult.id);
    setVitalsInput({
      tempC: consult.realTempC != null ? String(consult.realTempC) : "",
      hr: consult.realHr != null ? String(consult.realHr) : "",
    });
  }

  function saveVitals() {
    if (!vitalsEditId) return;
    const t = parseFloat(vitalsInput.tempC);
    const h = parseInt(vitalsInput.hr, 10);
    if (isNaN(t) || isNaN(h)) return;
    setRealVitals(vitalsEditId, t, h);
    setVitalsEditId(null);
    refresh();
  }

  function openMedEdit(consult: BedsideConsultationView) {
    setMedEditId(consult.id);
    setMedSlots(consult.medication?.length ? consult.medication : [emptyMedSlot()]);
  }

  function saveMeds() {
    if (!medEditId) return;
    const filled = medSlots.filter((s) => s.drug.trim());
    updateMedication(medEditId, filled);
    setMedEditId(null);
    refresh();
  }

  function handleDelete(id: string) {
    deleteBedsideConsultation(id);
    refresh();
  }

  function changeLocale(next: Locale) {
    setLocale(next);
    writeStoredLocale(next);
  }

  if (!hasSession()) return <Navigate to="/login" replace />;

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

  const liveCount = consults.filter((c) => c.stage === "live").length;
  const upcomingCount = consults.filter((c) => c.stage !== "completed").length;

  return (
    <div className="doctor-admin">
      {/* ── Sidebar ── */}
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <strong>HealthAssist</strong>
          <span>Админ-панель</span>
        </div>

        <nav className="doctor-admin__nav">
          <a className="doctor-admin__nav-item" href="/admin#overview" onClick={() => nav("/admin")}>
            <LayoutDashboard size={18} />
            Дашборд
          </a>
          <a className="doctor-admin__nav-item" href="/admin#schedule" onClick={() => nav("/admin#schedule")}>
            <CalendarClock size={18} />
            Расписание
          </a>
          <a className="doctor-admin__nav-item" href="/admin#appointments" onClick={() => nav("/admin#appointments")}>
            <ClipboardList size={18} />
            Записи
          </a>
          <a className="doctor-admin__nav-item" href="/admin#patients" onClick={() => nav("/admin#patients")}>
            <Users size={18} />
            Пациенты
          </a>
          <a className="doctor-admin__nav-item doctor-admin__nav-item--active" href="/admin/ward-consults">
            <MonitorSmartphone size={18} />
            Палатные консультации
          </a>
          <a className="doctor-admin__nav-item" href="/admin#telegram" onClick={() => nav("/admin#telegram")}>
            <MessageSquare size={18} />
            Telegram
          </a>
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin/aimar")}>
            <Cpu size={18} />
            Настроить Aimar
          </button>
          {BMO_SETTINGS_URL ? (
            <a className="doctor-admin__nav-item" href={BMO_SETTINGS_URL} target="_blank" rel="noreferrer">
              <Settings size={18} />
              Настроить BMO
            </a>
          ) : null}
        </nav>
      </aside>

      {/* ── Main ── */}
      <main className="doctor-admin__main">
        {/* Topbar */}
        <header className="doctor-admin__topbar">
          <div className="doctor-admin__topbar-copy">
            <div>
              <h1 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <MonitorSmartphone size={22} style={{ color: "#60a5fa" }} />
                Палатные онлайн-консультации
              </h1>
              <p>Дистанционный осмотр прямо у кровати — врач подключается через терминал AIMAR.</p>
            </div>
          </div>

          <div className="doctor-admin__profile">
            <div className="doctor-admin__locale">
              {(["ru", "kk", "en"] as Locale[]).map((lang) => (
                <button
                  key={lang}
                  className={`doctor-admin__locale-button ${locale === lang ? "doctor-admin__locale-button--active" : ""}`}
                  type="button"
                  onClick={() => changeLocale(lang)}
                >
                  {lang === "kk" ? "KZ" : lang.toUpperCase()}
                </button>
              ))}
            </div>
            <Link className="doctor-admin__home" to="/">
              <House size={18} />
              На главную
            </Link>
            <div className="doctor-admin__identity">
              <div className="doctor-admin__avatar">{initials(displayName)}</div>
              <div className="doctor-admin__doctor">
                <strong>{displayName}</strong>
                <span>Администратор</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats row */}
        <section className="doctor-admin__metrics" style={{ marginBottom: 0 }}>
          <article className="doctor-admin__metric">
            <span>Всего активных</span>
            <strong>{upcomingCount}</strong>
            <small className="doctor-admin__green">незавершённых</small>
          </article>
          <article className="doctor-admin__metric">
            <span>Сейчас онлайн</span>
            <strong style={{ color: liveCount > 0 ? "#4ade80" : undefined }}>{liveCount}</strong>
            <small className={liveCount > 0 ? "doctor-admin__green" : "doctor-admin__red"}>
              {liveCount > 0 ? "идёт сеанс" : "нет активных"}
            </small>
          </article>
          <article className="doctor-admin__metric">
            <span>Завершено</span>
            <strong>{consults.filter((c) => c.stage === "completed").length}</strong>
            <small className="doctor-admin__green">за всё время</small>
          </article>
        </section>

        {/* Panel */}
        <section className="doctor-admin__panel doctor-admin__ward-consults" style={{ marginTop: 20 }}>
          <div className="doctor-admin__panel-head">
            <div>
              <h2>Консультации</h2>
              <p className="doctor-admin__panel-subtitle">
                Назначьте время, врача и палату — пациент не двигается, всё происходит у кровати.
              </p>
            </div>
            <button
              className="doctor-admin__refresh--primary"
              type="button"
              onClick={() => setFormOpen((v) => !v)}
            >
              <Plus size={16} />
              Назначить консультацию
            </button>
          </div>

          {/* Create form */}
          {formOpen ? (
            <div className="ward-consult-form">
              <h3>Новая палатная консультация</h3>
              <div className="ward-consult-form__grid">
                <label className="doctor-admin__field">
                  <span>Пациент (ФИО)</span>
                  <input
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    value={form.patientName}
                    onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
                  />
                </label>
                <label className="doctor-admin__field">
                  <span>Палата</span>
                  <input
                    type="text"
                    placeholder="Палата 301"
                    value={form.wardLabel}
                    onChange={(e) => setForm((f) => ({ ...f, wardLabel: e.target.value }))}
                  />
                </label>
                <label className="doctor-admin__field">
                  <span>Койка</span>
                  <input
                    type="text"
                    placeholder="Койка 2"
                    value={form.bedLabel}
                    onChange={(e) => setForm((f) => ({ ...f, bedLabel: e.target.value }))}
                  />
                </label>
                <label className="doctor-admin__field">
                  <span>Врач</span>
                  <select
                    className="doctor-admin__select"
                    value={form.doctorId}
                    onChange={(e) => setForm((f) => ({ ...f, doctorId: e.target.value }))}
                  >
                    <option value="">— Выберите врача —</option>
                    {DOCTORS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.specialty}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="doctor-admin__field">
                  <span>Дата</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </label>
                <label className="doctor-admin__field">
                  <span>Время начала</span>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </label>
                <label className="doctor-admin__field ward-consult-form__notes">
                  <span>Примечание (необязательно)</span>
                  <input
                    type="text"
                    placeholder="Плановый осмотр, постоперационный контроль..."
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </label>
              </div>
              <div className="ward-consult-form__actions">
                <button
                  className="doctor-admin__refresh--primary"
                  type="button"
                  disabled={!form.patientName || !form.wardLabel || !form.doctorId || !form.date || !form.time}
                  onClick={handleCreate}
                >
                  <Video size={16} />
                  Создать и назначить
                </button>
                <button
                  className="doctor-admin__refresh"
                  type="button"
                  onClick={() => { setFormOpen(false); setForm(emptyForm()); }}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : null}

          {/* List */}
          <div className="ward-consult-list">
            {consults.length === 0 ? (
              <div className="ward-consult-empty">
                <MonitorSmartphone size={48} style={{ color: "#374151", marginBottom: 12 }} />
                <p>Пока нет назначенных консультаций.</p>
                <p style={{ fontSize: 13, color: "#6b7280" }}>
                  Нажмите «Назначить консультацию», чтобы создать первую.
                </p>
                <button
                  className="doctor-admin__refresh--primary"
                  style={{ marginTop: 16 }}
                  type="button"
                  onClick={() => setFormOpen(true)}
                >
                  <Plus size={16} />
                  Назначить консультацию
                </button>
              </div>
            ) : (
              consults.map((consult) => {
                const scheduledMs = Date.parse(`${consult.date}T${consult.time}:00`);
                const delta = scheduledMs - Date.now();
                const minutesUntil = Math.round(delta / 60000);
                const isLive = consult.stage === "live";
                const isDone = consult.stage === "completed";
                const canStart =
                  !isDone && (isLive || delta <= 5 * 60_000);

                return (
                  <div
                    className={`ward-consult-card ${isLive ? "ward-consult-card--live" : ""} ${isDone ? "ward-consult-card--done" : ""}`}
                    key={consult.id}
                  >
                    <div className="ward-consult-card__header">
                      <div className="ward-consult-card__id">
                        <MonitorSmartphone size={16} style={{ color: isLive ? "#4ade80" : "#60a5fa" }} />
                        <strong>{consult.wardLabel}</strong>
                        <span>·</span>
                        <span>{consult.bedLabel}</span>
                        <span>·</span>
                        <span style={{ color: "#6b7280" }}>{consult.robotUnit}</span>
                      </div>
                      <span className={`doctor-admin__status doctor-admin__status--${stageTones[consult.stage]}`}>
                        {stageLabels[consult.stage]}
                      </span>
                    </div>

                    <div className="ward-consult-card__body">
                      <div className="ward-consult-card__patient">
                        <div className="doctor-admin__mini-avatar">
                          {initials(consult.patientName)}
                        </div>
                        <div>
                          <strong>{consult.patientName}</strong>
                          <span>{consult.notes}</span>
                        </div>
                      </div>

                      <div className="ward-consult-card__meta">
                        <div className="ward-consult-card__doctor">
                          <Video size={14} />
                          <span>{consult.doctorName}</span>
                          <small>{consult.specialty}</small>
                        </div>
                        <div className="ward-consult-card__time">
                          <CalendarClock size={14} />
                          <strong>{consult.date} {consult.time}</strong>
                          {!isDone && delta > 0 ? (
                            <small style={{ color: minutesUntil <= 10 ? "#f59e0b" : "#9ca3af" }}>
                              {minutesUntil <= 60
                                ? `через ${minutesUntil} мин`
                                : `через ${Math.floor(minutesUntil / 60)} ч ${minutesUntil % 60} мин`}
                            </small>
                          ) : null}
                          {!isDone && delta <= 0 && !isLive ? (
                            <small style={{ color: "#f87171" }}>время пришло</small>
                          ) : null}
                        </div>
                      </div>

                      <div className="ward-consult-card__vitals">
                        <span className={consult.realTempC != null ? "wc-vital--real" : "wc-vital--est"}>
                          🌡 {consult.vitals.tempC}°C
                        </span>
                        <span className={consult.realHr != null ? "wc-vital--real" : "wc-vital--est"}>
                          ❤️ {consult.vitals.pulseBpm} уд/мин
                        </span>
                        <button
                          className="wc-vitals-btn"
                          type="button"
                          title="Ввести реальные показатели"
                          onClick={() => openVitalsEdit(consult)}
                        >
                          <Activity size={12} />
                          {consult.realTempC != null ? "Обновить" : "Ввести показатели"}
                        </button>
                        <span style={{ marginLeft: "auto", color: consult.devices.robotLinked ? "#4ade80" : "#6b7280", fontSize: 11 }}>
                          {consult.devices.robotLinked ? "● Робот подключён" : "○ Робот не подключён"}
                        </span>
                      </div>
                    </div>

                    <div className="ward-consult-card__actions">
                      {consult.stage === "scheduled" ? (
                        <button
                          className="doctor-admin__status doctor-admin__status--blue"
                          type="button"
                          onClick={() => handleStage(consult.id, "robot_en_route")}
                        >
                          Отправить робота
                        </button>
                      ) : null}
                      {consult.stage === "robot_en_route" ? (
                        <button
                          className="doctor-admin__status doctor-admin__status--blue"
                          type="button"
                          onClick={() => handleStage(consult.id, "bedside_ready")}
                        >
                          Подтвердить: у кровати
                        </button>
                      ) : null}
                      {(consult.stage === "bedside_ready" || canStart) && !isLive && !isDone ? (
                        <button
                          className="doctor-admin__status doctor-admin__status--ok ward-consult-card__call-btn"
                          type="button"
                          onClick={() => openCall(consult)}
                        >
                          <PhoneCall size={14} />
                          Начать звонок
                        </button>
                      ) : null}
                      {isLive ? (
                        <>
                          <button
                            className="doctor-admin__status doctor-admin__status--ok ward-consult-card__call-btn"
                            type="button"
                            onClick={() => openCall(consult)}
                          >
                            <Video size={14} />
                            Открыть звонок
                          </button>
                          <button
                            className="doctor-admin__status doctor-admin__status--green"
                            type="button"
                            onClick={() => handleStage(consult.id, "completed")}
                          >
                            Завершить
                          </button>
                        </>
                      ) : null}
                      {/* Лекарства */}
                      <button
                        className="doctor-admin__status doctor-admin__status--amber"
                        type="button"
                        title="Назначить лекарства"
                        onClick={() => openMedEdit(consult)}
                      >
                        <Pill size={13} />
                        {consult.medication?.length ? `${consult.medication.length} лек.` : "Лекарства"}
                      </button>
                      {/* Ссылка на терминал */}
                      <a
                        className="doctor-admin__status doctor-admin__status--dark"
                        href="/robot-terminal"
                        target="_blank"
                        rel="noreferrer"
                        title="Открыть страницу планшета робота"
                        style={{ display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}
                      >
                        <ExternalLink size={13} />
                        Планшет
                      </a>
                      <button
                        className="ward-consult-card__delete"
                        type="button"
                        title="Удалить"
                        onClick={() => handleDelete(consult.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Vitals input modal */}
      {vitalsEditId ? (
        <div className="wc-med-overlay">
          <div className="wc-med-modal" style={{ maxWidth: 360 }}>
            <div className="wc-med-modal__head">
              <Activity size={18} style={{ color: "#4ade80" }} />
              <h3>Реальные показатели пациента</h3>
              <button type="button" className="wc-jitsi-close" onClick={() => setVitalsEditId(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
              Введите данные с термометра и пульсоксиметра.
            </p>
            <div style={{ display: "grid", gap: 12 }}>
              <label className="doctor-admin__field">
                <span>Температура (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  min="34"
                  max="42"
                  placeholder="36.6"
                  value={vitalsInput.tempC}
                  onChange={(e) => setVitalsInput((v) => ({ ...v, tempC: e.target.value }))}
                  autoFocus
                />
              </label>
              <label className="doctor-admin__field">
                <span>Пульс (уд/мин)</span>
                <input
                  type="number"
                  min="30"
                  max="220"
                  placeholder="72"
                  value={vitalsInput.hr}
                  onChange={(e) => setVitalsInput((v) => ({ ...v, hr: e.target.value }))}
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="doctor-admin__refresh--primary"
                disabled={!vitalsInput.tempC || !vitalsInput.hr}
                onClick={saveVitals}
              >
                Сохранить
              </button>
              <button
                type="button"
                className="doctor-admin__refresh"
                onClick={() => setVitalsEditId(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Jitsi overlay */}
      {activeCall ? (
        <JitsiPanel
          roomId={activeCall.roomId}
          doctorName={activeCall.doctorName}
          onClose={() => setActiveCall(null)}
        />
      ) : null}

      {/* Medication edit modal */}
      {medEditId ? (
        <div className="wc-med-overlay">
          <div className="wc-med-modal">
            <div className="wc-med-modal__head">
              <Pill size={18} style={{ color: "#fbbf24" }} />
              <h3>Лекарства в ячейках робота</h3>
              <button type="button" className="wc-jitsi-close" onClick={() => setMedEditId(null)}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
              Укажите что в каком ящике AIMAR — пациент увидит это на экране планшета.
            </p>
            {medSlots.map((slot, i) => (
              <div className="wc-med-row" key={i}>
                <input
                  placeholder="Ячейка (A1, B2...)"
                  value={slot.compartment}
                  onChange={(e) => setMedSlots((prev) => prev.map((s, j) => j === i ? { ...s, compartment: e.target.value } : s))}
                />
                <input
                  placeholder="Препарат"
                  value={slot.drug}
                  onChange={(e) => setMedSlots((prev) => prev.map((s, j) => j === i ? { ...s, drug: e.target.value } : s))}
                />
                <input
                  placeholder="Доза (500мг)"
                  value={slot.dosage}
                  onChange={(e) => setMedSlots((prev) => prev.map((s, j) => j === i ? { ...s, dosage: e.target.value } : s))}
                />
                <input
                  placeholder="Инструкция (после еды)"
                  value={slot.instruction}
                  onChange={(e) => setMedSlots((prev) => prev.map((s, j) => j === i ? { ...s, instruction: e.target.value } : s))}
                />
                <button type="button" onClick={() => setMedSlots((prev) => prev.filter((_, j) => j !== i))}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                type="button"
                className="doctor-admin__status doctor-admin__status--dark"
                onClick={() => setMedSlots((prev) => [...prev, emptyMedSlot()])}
              >
                + Добавить ячейку
              </button>
              <button
                type="button"
                className="doctor-admin__refresh--primary"
                onClick={saveMeds}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Mobile nav */}
      <nav className="doctor-admin__mobile-nav" aria-label="Admin mobile navigation">
        <a className="doctor-admin__mobile-nav-item" href="/admin" onClick={() => nav("/admin")}>
          <LayoutDashboard size={18} />
          <span>Дашборд</span>
        </a>
        <a className="doctor-admin__mobile-nav-item doctor-admin__mobile-nav-item--active" href="/admin/ward-consults">
          <MonitorSmartphone size={18} />
          <span>Консультации</span>
        </a>
        <a className="doctor-admin__mobile-nav-item" href="/admin#telegram">
          <MessageSquare size={18} />
          <span>Telegram</span>
        </a>
        <button className="doctor-admin__mobile-nav-item" type="button" onClick={() => nav("/admin/aimar")}>
          <Cpu size={18} />
          <span>Aimar</span>
        </button>
      </nav>
    </div>
  );
}
