import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Cpu,
  ExternalLink,
  House,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
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
import AdminMobileNav from "../components/AdminMobileNav";
import AvatarCircle from "../components/AvatarCircle";
import LanguageSwitcher from "../components/LanguageSwitcher";
import ProfileAvatarDialog from "../components/ProfileAvatarDialog";
import { assignDoctorToAppointment, DOCTORS, fetchAppointments, readCachedAppointments, type DoctorOption } from "../lib/apiAppointments";
import { isAdminAccount } from "../lib/adminAccess";
import { fetchAdminDoctors, fetchAdminPatients, type AdminPatient } from "../lib/apiAdmin";
import {
  buildAimarMeasurementCommandContext,
  canRunAimarMeasurement,
  dispatchAimarMeasurementCommand,
  dispatchAimarMeasurementResult,
  getAimarMeasurementDisabledReason,
  resolveAimarMeasurementValues,
  type AimarMeasurementState,
} from "../lib/aimarMeasurement";
import { API_URL, BMO_SETTINGS_URL } from "../lib/apiBase";
import { hasSession, SESSION_USER_UPDATED_EVENT } from "../lib/auth";
import { resolveAvatarUrl } from "../lib/avatar";
import { type AppLocale } from "../lib/locale";
import { formatMeasurementDateTime, recordPatientVitals } from "../lib/patientMeasurements";
import { setSessionIdleSuppressed } from "../lib/sessionIdle";
import { usePageSeo } from "../lib/seo";
import {
  countNewBedsideConsultations,
  assignBedsideConsultationSlot,
  createManualWardConsultation,
  deleteBedsideConsultation,
  listAllBedsideConsultations,
  markBedsideConsultationFormat,
  setRealVitals,
  syncBedsideConsultations,
  updateBedsideConsultationStage,
  updateMedication,
  type BedsideConsultationFormat,
  type BedsideConsultationView,
  type ConsultationOrigin,
  type ConsultationStage,
  type MedicationSlot,
} from "../lib/onlineConsultations";
import { normalizePatientFullName, resolvePatientDisplayName } from "../lib/patientName";
import {
  clearScheduleSelection,
  readScheduleSelection,
  saveActiveScheduleTarget,
  type ScheduleSelection,
} from "../lib/requestScheduleSelection";
import { useSoundOnNewIds } from "../lib/notificationSound";
import { useSyncedLocale } from "../lib/useSyncedLocale";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  picture?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
};
type Locale = AppLocale;
type ActiveWardCall = {
  consultId: string;
  roomId: string;
  doctorName: string;
};

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

function patientDisplayName(consult: Pick<BedsideConsultationView, "patientName" | "patientId" | "patientEmail" | "appointmentId" | "id">) {
  return resolvePatientDisplayName({
    names: [consult.patientName],
    source: consult.patientId || consult.patientEmail || consult.appointmentId || consult.id,
    fallback: "Пациент",
    requireFullName: true,
  });
}

function meaningfulPatientProfileName(value: string | null | undefined) {
  return normalizePatientFullName(value, { requireFullName: true });
}

const MANUAL_WARD_FORM_ID = "manual-ward-consult-draft";

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

type WardProcessingDraft = {
  deliveryMode: BedsideConsultationFormat;
  doctorId: string;
  date: string;
  time: string;
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function consultationTimestamp(consult: BedsideConsultationView) {
  const direct = consult.handledAt || consult.updatedAt || consult.createdAt || "";
  const parsedDirect = Date.parse(direct);
  if (!Number.isNaN(parsedDirect)) return parsedDirect;

  const fallback = Date.parse(`${consult.date}T${consult.time || "00:00"}:00`);
  if (!Number.isNaN(fallback)) return fallback;

  return 0;
}

function JitsiPanel({
  roomId,
  doctorName,
  consult,
  measurementState,
  onRunMeasurement,
  onClose,
}: {
  roomId: string;
  doctorName: string;
  consult: BedsideConsultationView | null;
  measurementState: AimarMeasurementState | null;
  onRunMeasurement: () => void;
  onClose: () => void;
}) {
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
      {consult ? (
        <div className="wc-jitsi-toolbar">
          <div className="wc-jitsi-toolbar__meta">
            <strong>{patientDisplayName(consult)}</strong>
            <span>{consult.wardLabel} · {consult.bedLabel} · {consult.robotUnit}</span>
          </div>
          <div className="wc-jitsi-toolbar__measure">
            <button
              type="button"
              className="wc-jitsi-toolbar__measure-btn"
              disabled={!canRunAimarMeasurement(consult)}
              title={getAimarMeasurementDisabledReason(consult) || "Запустить измерение температуры и пульса на роботе"}
              onClick={onRunMeasurement}
            >
              <Activity size={16} />
              {measurementState?.phase === "measuring" ? "Идёт измерение..." : "Запустить измерение"}
            </button>
            <div className={`wc-jitsi-toolbar__measure-status wc-jitsi-toolbar__measure-status--${measurementState?.phase || "idle"}`}>
              {measurementState?.message || (consult.devices.robotLinked ? "Робот AIMAR готов к измерению" : "Робот не подключён")}
            </div>
            {measurementState?.phase === "success" && measurementState.createdAt ? (
              <div className="wc-jitsi-toolbar__measure-result">
                Температура {measurementState.tempC?.toFixed(1)} °C · Пульс {measurementState.hr} уд/мин · {formatMeasurementDateTime(measurementState.createdAt, "ru")}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
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
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [user, setUser] = useState<StoredUser | null>(() => readCurrentUser());
  const allowed = isAdminAccount(user) || isLocalDemoHost();
  const [locale, setLocale] = useSyncedLocale();
  const displayName = user?.name || user?.email || "Администратор";
  const userAvatar = resolveAvatarUrl(user);

  const [consults, setConsults] = useState<BedsideConsultationView[]>(() => listAllBedsideConsultations());
  const [newRequestCount, setNewRequestCount] = useState(() => countNewBedsideConsultations());
  const [doctors, setDoctors] = useState<DoctorOption[]>(DOCTORS.map((doctor) => ({ ...doctor, active: true })));
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<WardFormState>(emptyForm);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingDrafts, setProcessingDrafts] = useState<Record<string, WardProcessingDraft>>({});
  const [processingSaveId, setProcessingSaveId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveWardCall | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [medEditId, setMedEditId] = useState<string | null>(null);
  const [medSlots, setMedSlots] = useState<MedicationSlot[]>([emptyMedSlot()]);
  const [vitalsEditId, setVitalsEditId] = useState<string | null>(null);
  const [vitalsInput, setVitalsInput] = useState({ tempC: "", hr: "" });
  const [aimarMeasurementByConsult, setAimarMeasurementByConsult] = useState<Record<string, AimarMeasurementState>>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<{
    consultId: string;
    loading: boolean;
    data: {
      status: string;
      summary: string;
      concerns: string[];
      doctor: string;
      doctor_urgency: string;
      medications: { compartment: string | null; drug: string; dosage: string; reason: string; available_in_robot: boolean }[];
      actions: string[];
    } | null;
    error: string | null;
  } | null>(null);
  const aimarTimersRef = useRef<Record<string, number[]>>({});

  const refreshLocal = useCallback(() => {
    setConsults(listAllBedsideConsultations());
    setNewRequestCount(countNewBedsideConsultations());
  }, []);
  const clearAimarTimers = useCallback((consultId?: string) => {
    if (!consultId) {
      Object.values(aimarTimersRef.current).flat().forEach((timerId) => window.clearTimeout(timerId));
      aimarTimersRef.current = {};
      return;
    }
    (aimarTimersRef.current[consultId] || []).forEach((timerId) => window.clearTimeout(timerId));
    delete aimarTimersRef.current[consultId];
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchAppointments();
      syncBedsideConsultations(data.items ?? []);
    } catch {
      syncBedsideConsultations(readCachedAppointments());
    }
    refreshLocal();
  }, [refreshLocal]);

  useEffect(() => {
    const syncUser = () => setUser(readCurrentUser());
    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => { void refresh(); }, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    fetchAdminDoctors()
      .then((data) => {
        if (data.items.length > 0) {
          setDoctors(data.items.filter((doctor) => doctor.active !== false));
        }
      })
      .catch(() => {});

    fetchAdminPatients()
      .then((data) => setPatients(data.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => () => clearAimarTimers(), [clearAimarTimers]);

  useEffect(() => {
    if (activeCall) {
      setSessionIdleSuppressed(true);
      return;
    }
    setSessionIdleSuppressed(false);
  }, [activeCall]);

  useEffect(() => {
    const wardConsultId = query.get("wardConsultId") || "";
    if (!wardConsultId) return;

    const stateSelection =
      ((location.state as { selectedWardSchedule?: ScheduleSelection } | null)?.selectedWardSchedule ?? null);
    const selection =
      stateSelection?.requestId === wardConsultId
        ? stateSelection
        : readScheduleSelection(wardConsultId);

    if (!selection || (selection.contextType ?? "appointment") !== "wardConsult") return;

    if (wardConsultId === MANUAL_WARD_FORM_ID) {
      const timer = window.setTimeout(() => {
        setFormOpen(true);
        setForm((current) => ({
          ...current,
          doctorId: selection.doctorId,
          date: selection.date,
          time: selection.time,
        }));
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const consult = consults.find((item) => item.id === wardConsultId);
    if (!consult) return;

    const timer = window.setTimeout(() => {
      setProcessingId(wardConsultId);
      setProcessingDrafts((current) => ({
        ...current,
        [wardConsultId]: {
          ...(current[wardConsultId] || buildProcessingDraft(consult)),
          doctorId: selection.doctorId,
          date: selection.date,
          time: selection.time,
        },
      }));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [consults, location.state, query]);

  const activeCallConsult = useMemo(
    () => (activeCall ? consults.find((item) => item.id === activeCall.consultId) || null : null),
    [activeCall, consults],
  );

  function buildProcessingDraft(consult: BedsideConsultationView): WardProcessingDraft {
    return {
      deliveryMode: consult.deliveryMode || "online",
      doctorId: consult.doctorId || "",
      date: consult.date || today(),
      time: consult.time || "",
    };
  }

  function updateProcessingDraft(id: string, patch: Partial<WardProcessingDraft>) {
    setProcessingDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || { deliveryMode: "online", doctorId: "", date: today(), time: "" }),
        ...patch,
      },
    }));
  }

  function openDoctorScheduleForConsult(consult: BedsideConsultationView) {
    const draft = processingDrafts[consult.id] || buildProcessingDraft(consult);
    const params = new URLSearchParams();
    params.set("wardConsultId", consult.id);
    params.set("date", draft.date || consult.date || today());
    saveActiveScheduleTarget({
      requestId: consult.id,
      contextType: "wardConsult",
      date: draft.date || consult.date || today(),
    });

    nav(`/admin/doctor-schedule?${params.toString()}`, {
      state: { wardConsult: consult },
    });
  }

  function openDoctorScheduleForManualCreate() {
    const params = new URLSearchParams();
    params.set("wardConsultId", MANUAL_WARD_FORM_ID);
    params.set("date", form.date || today());
    saveActiveScheduleTarget({
      requestId: MANUAL_WARD_FORM_ID,
      contextType: "wardConsult",
      date: form.date || today(),
    });
    nav(`/admin/doctor-schedule?${params.toString()}`);
  }

  async function finalizeProcessing(consult: BedsideConsultationView) {
    const draft = processingDrafts[consult.id] || buildProcessingDraft(consult);
    if (!draft.doctorId || !draft.time || !draft.date) return;

    setProcessingSaveId(consult.id);
    try {
      const selectedDoctor = doctors.find((doctor) => doctor.id === draft.doctorId);
      await assignDoctorToAppointment(consult.appointmentId, draft.doctorId, {
        date: draft.date,
        time: draft.time,
      });
      assignBedsideConsultationSlot(consult.id, {
        doctorId: draft.doctorId,
        doctorName: selectedDoctor?.name || consult.doctorName || draft.doctorId,
        specialty: selectedDoctor?.specialty || consult.specialty,
        date: draft.date,
        time: draft.time,
      });
      markBedsideConsultationFormat(consult.id, draft.deliveryMode);
      clearScheduleSelection(consult.id);
      setProcessingId((current) => (current === consult.id ? null : current));
      await refresh();
    } finally {
      setProcessingSaveId(null);
    }
  }

  function handleCreate() {
    if (!form.patientName || !form.wardLabel || !form.doctorId || !form.date || !form.time) return;
    const doc = doctors.find((d) => d.id === form.doctorId);
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
    clearScheduleSelection(MANUAL_WARD_FORM_ID);
    nav("/admin/ward-consults", { replace: true });
    refreshLocal();
  }

  function handleStage(id: string, stage: ConsultationStage) {
    updateBedsideConsultationStage(id, stage);
    refreshLocal();
  }

  function handleFormat(id: string, deliveryMode: BedsideConsultationFormat) {
    markBedsideConsultationFormat(id, deliveryMode);
    refreshLocal();
  }

  function openCall(consult: BedsideConsultationView) {
    if (consult.deliveryMode !== "online" || !consult.meetRoomId) return;
    setSessionIdleSuppressed(true);
    setActiveCall({ consultId: consult.id, roomId: consult.meetRoomId, doctorName: consult.doctorName });
    handleStage(consult.id, "live");
  }

  function runAimarMeasurement(consult: BedsideConsultationView) {
    if (!canRunAimarMeasurement(consult)) {
      setAimarMeasurementByConsult((current) => ({
        ...current,
        [consult.id]: {
          consultId: consult.id,
          phase: "error",
          message: getAimarMeasurementDisabledReason(consult) || "Не удалось получить измерение, попробуйте ещё раз",
        },
      }));
      return;
    }

    clearAimarTimers(consult.id);
    dispatchAimarMeasurementCommand(buildAimarMeasurementCommandContext(consult));
    setAimarMeasurementByConsult((current) => ({
      ...current,
      [consult.id]: {
        consultId: consult.id,
        phase: "sent",
        message: "Команда отправлена роботу",
      },
    }));

    const sentTimer = window.setTimeout(() => {
      setAimarMeasurementByConsult((current) => ({
        ...current,
        [consult.id]: {
          consultId: consult.id,
          phase: "measuring",
          message: "Идёт измерение...",
        },
      }));
    }, 700);

    const finishTimer = window.setTimeout(() => {
      const createdAt = new Date().toISOString();
      const commandContext = buildAimarMeasurementCommandContext(consult);
      const { tempC, hr } = resolveAimarMeasurementValues(consult);
      setRealVitals(consult.id, tempC, hr);
      recordPatientVitals({
        patientId: commandContext.patientId,
        source: "aimar",
        actorName: "Робот AIMAR / во время консультации",
        deviceId: consult.robotUnit,
        tempC,
        hr,
        createdAt,
        eventId: `aimar-live-${consult.id}-${Date.now()}`,
      });
      dispatchAimarMeasurementResult({
        ...commandContext,
        createdAt,
        tempC,
        hr,
      });
      setAimarMeasurementByConsult((current) => ({
        ...current,
        [consult.id]: {
          consultId: consult.id,
          phase: "success",
          message: "Готово: результат получен",
          createdAt,
          tempC,
          hr,
        },
      }));
      refreshLocal();
      delete aimarTimersRef.current[consult.id];
    }, 3200);

    aimarTimersRef.current[consult.id] = [sentTimer, finishTimer];
  }

  async function requestAiAdvice(consult: BedsideConsultationView) {
    setAiAdvice({ consultId: consult.id, loading: true, data: null, error: null });
    try {
      const res = await fetch(`${API_URL}/api/ai/vitals-advice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tempC: consult.vitals.tempC,
          hr: consult.vitals.pulseBpm,
          systolic: consult.vitals.systolic,
          diastolic: consult.vitals.diastolic,
          spo2: consult.vitals.spo2,
          medication: consult.medication ?? [],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setAiAdvice({ consultId: consult.id, loading: false, data: json.advice, error: null });
    } catch {
      setAiAdvice({ consultId: consult.id, loading: false, data: null, error: "Не удалось получить анализ ИИ. Проверьте подключение к серверу." });
    }
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
    const consult = consults.find((item) => item.id === vitalsEditId) || null;
    setRealVitals(vitalsEditId, t, h);
    if (consult?.patientId) {
      recordPatientVitals({
        patientId: consult.patientId,
        source: "doctor",
        actorName: user?.name || user?.email || "Врач",
        tempC: t,
        hr: h,
      });
    }
    setVitalsEditId(null);
    refreshLocal();
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
    refreshLocal();
  }

  function handleDelete(id: string) {
    deleteBedsideConsultation(id);
    refreshLocal();
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

  const liveCount = consults.filter((c) => c.deliveryMode === "online" && c.stage === "live").length;
  const upcomingCount = consults.filter((c) => c.deliveryMode === "online" && c.stage !== "completed").length;
  const newRequestItems = consults.filter((consult) => !consult.deliveryMode);
  const historyItems = [...consults]
    .filter((consult) => Boolean(consult.deliveryMode))
    .sort((a, b) => consultationTimestamp(b) - consultationTimestamp(a));
  const visibleHistoryItems = historyExpanded ? historyItems : historyItems.slice(0, 3);

  useSoundOnNewIds(newRequestItems.map((consult) => consult.id), "admin-ward-consults-page");

  function renderConsultCard(consult: BedsideConsultationView) {
    const isNewRequest = !consult.deliveryMode;
    const isOffline = consult.deliveryMode === "offline";
    const isOnlineFlow = consult.deliveryMode === "online";
    const scheduledMs = consult.time ? Date.parse(`${consult.date}T${consult.time}:00`) : Number.NaN;
    const delta = Number.isNaN(scheduledMs) ? Number.POSITIVE_INFINITY : scheduledMs - Date.now();
    const minutesUntil = Number.isFinite(delta) ? Math.round(delta / 60000) : null;
    const isLive = consult.stage === "live";
    const isDone = consult.stage === "completed";
    const canStart =
      isOnlineFlow &&
      !isDone &&
      (isLive || !Number.isFinite(delta) || delta <= 5 * 60_000);
    const statusTone = isNewRequest ? "amber" : isOffline ? "green" : stageTones[consult.stage];
    const statusLabel = isNewRequest
      ? "Новая заявка"
      : isOffline
        ? "Офлайн визит"
        : stageLabels[consult.stage];
    const doctorSummary = isNewRequest
      ? "Ожидает решения администратора"
      : isOffline
        ? "Врач придёт лично"
        : consult.doctorName;
    const timeLabel = consult.time || "по готовности";
    const draft = processingDrafts[consult.id] || buildProcessingDraft(consult);
    const isProcessing = processingId === consult.id;
    const canFinalize = Boolean(draft.doctorId && draft.time && draft.date);
    const isSaving = processingSaveId === consult.id;
    const finalizeDisabled = !isProcessing || !canFinalize || isSaving;
    const profileMatch = patients.find(
      (patient) =>
        patient.id === consult.patientId ||
        patient.email === consult.patientEmail ||
        patient.email === consult.patientId,
    );
    const displayPatient = meaningfulPatientProfileName(profileMatch?.name) || patientDisplayName(consult);
    const canOpenCall = isOnlineFlow && !isDone && (isLive || consult.stage === "bedside_ready" || canStart);
    const measurementState = aimarMeasurementByConsult[consult.id] || null;
    const canTriggerMeasurement = canRunAimarMeasurement(consult);
    const measurementTitle = getAimarMeasurementDisabledReason(consult) || "Запустить измерение температуры и пульса на роботе AIMAR";
    const toolsMenuOpen = actionMenuId === consult.id;
    const closeToolsMenu = () => setActionMenuId((current) => (current === consult.id ? null : current));
    const originType: ConsultationOrigin = consult.originType || (String(consult.id).startsWith("consult-manual-") ? "admin_created" : "incoming");
    const originLabel = originType === "admin_created" ? "Создано админом" : "Входящая заявка";
    const originTone = originType === "admin_created" ? "ok" : "dark";
    const utilityActions: Array<
      | { key: string; label: string; icon: JSX.Element; onClick: () => void; tone?: "default" | "danger" }
      | { key: string; label: string; icon: JSX.Element; href: string }
    > = [];

    if (!isNewRequest && isOnlineFlow) {
      if (consult.stage === "scheduled") {
        utilityActions.push({
          key: "send-robot",
          label: "Отправить робота",
          icon: <Bot size={14} />,
          onClick: () => handleStage(consult.id, "robot_en_route"),
        });
      }

      if (consult.stage === "robot_en_route") {
        utilityActions.push({
          key: "bedside-ready",
          label: "Подтвердить: у кровати",
          icon: <CheckCircle size={14} />,
          onClick: () => handleStage(consult.id, "bedside_ready"),
        });
      }

      utilityActions.push(
        {
          key: "vitals",
          label: consult.realTempC != null ? "Обновить показатели" : "Ввести показатели",
          icon: <Activity size={14} />,
          onClick: () => openVitalsEdit(consult),
        },
        {
          key: "ai",
          label: "Анализ ИИ",
          icon: aiAdvice?.consultId === consult.id && aiAdvice.loading
            ? <Loader2 size={14} className="wc-spin" />
            : <Bot size={14} />,
          onClick: () => requestAiAdvice(consult),
        },
        {
          key: "meds",
          label: consult.medication?.length ? `Лекарства (${consult.medication.length})` : "Лекарства",
          icon: <Pill size={14} />,
          onClick: () => openMedEdit(consult),
        },
        {
          key: "tablet",
          label: "Планшет робота",
          icon: <ExternalLink size={14} />,
          href: "/robot-terminal",
        },
      );
    }

    if (!isNewRequest && isOffline) {
      utilityActions.push({
        key: "move-online",
        label: "Перевести в AIMAR",
        icon: <MonitorSmartphone size={14} />,
        onClick: () => handleFormat(consult.id, "online"),
      });
    }

    if (!isNewRequest) {
      utilityActions.push({
        key: "delete",
        label: "Удалить консультацию",
        icon: <Trash2 size={14} />,
        onClick: () => handleDelete(consult.id),
        tone: "danger",
      });
    }

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
          <span className={`doctor-admin__status doctor-admin__status--${statusTone}`}>
            {statusLabel}
          </span>
        </div>

        <div className="ward-consult-card__body">
          <div className="ward-consult-card__patient">
            <AvatarCircle
              name={displayPatient}
              src={resolveAvatarUrl(
                {
                  id: consult.patientId || null,
                  email: consult.patientEmail || null,
                  role: "patient",
                  picture: profileMatch?.picture || null,
                },
                { patientFallback: true },
              )}
              size={48}
              className="doctor-admin__mini-avatar"
              alt={displayPatient}
            />
            <div>
              <div className="ward-consult-card__patient-title">
                <strong>{displayPatient}</strong>
                <span className={`doctor-admin__status doctor-admin__status--${originTone}`}>
                  {originLabel}
                </span>
              </div>
              <span>{consult.notes}</span>
            </div>
          </div>

          <div className="ward-consult-card__meta">
            <div className="ward-consult-card__doctor">
              <Video size={14} />
              <span>{doctorSummary}</span>
              <small>{consult.specialty}</small>
            </div>
            <div className="ward-consult-card__time">
              <CalendarClock size={14} />
              <strong>{consult.date} · {timeLabel}</strong>
              {!isDone && minutesUntil != null && delta > 0 ? (
                <small style={{ color: minutesUntil <= 10 ? "#f59e0b" : "#9ca3af" }}>
                  {minutesUntil <= 60
                    ? `через ${minutesUntil} мин`
                    : `через ${Math.floor(minutesUntil / 60)} ч ${minutesUntil % 60} мин`}
                </small>
              ) : null}
              {!isDone && Number.isFinite(delta) && delta <= 0 && !isLive ? (
                <small style={{ color: "#f87171" }}>время пришло</small>
              ) : null}
              {isNewRequest ? (
                <small style={{ color: "#9ca3af" }}>Пациент ждёт решения по формату консультации</small>
              ) : null}
            </div>
          </div>

          {isOnlineFlow ? (
            <div className="ward-consult-card__support">
              <span className={`ward-consult-card__device-status ${consult.devices.robotLinked ? "ward-consult-card__device-status--on" : ""}`}>
                {consult.devices.robotLinked ? "● Робот подключён" : "○ Робот не подключён"}
              </span>
              {measurementState ? (
                <span className={`ward-consult-card__measure-state ward-consult-card__measure-state--${measurementState.phase}`}>
                  {measurementState.message}
                  {measurementState.phase === "success" && measurementState.createdAt ? (
                    <small>
                      {measurementState.tempC?.toFixed(1)} °C · {measurementState.hr} уд/мин · {formatMeasurementDateTime(measurementState.createdAt, "ru")}
                    </small>
                  ) : null}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="ward-consult-card__offline-note">
              {isOffline
                ? "Врач приглашён в палату для личного осмотра."
                : "Выберите формат: личный визит врача или онлайн через робота AIMAR."}
            </div>
          )}

          {isNewRequest && isProcessing ? (
            <div className="ward-consult-card__offline-note" style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 10, color: "white" }}>Обработка заявки</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <label className="doctor-admin__field" style={{ margin: 0 }}>
                  <span>Формат</span>
                  <div className="ward-consult-card__format-switch" role="tablist" aria-label="Формат консультации">
                    <button
                      type="button"
                      className={`ward-consult-card__format-option ${draft.deliveryMode === "online" ? "ward-consult-card__format-option--active" : ""}`}
                      aria-pressed={draft.deliveryMode === "online"}
                      onClick={() => updateProcessingDraft(consult.id, { deliveryMode: "online" })}
                    >
                      Онлайн через AIMAR
                    </button>
                    <button
                      type="button"
                      className={`ward-consult-card__format-option ${draft.deliveryMode === "offline" ? "ward-consult-card__format-option--active" : ""}`}
                      aria-pressed={draft.deliveryMode === "offline"}
                      onClick={() => updateProcessingDraft(consult.id, { deliveryMode: "offline" })}
                    >
                      Офлайн
                    </button>
                  </div>
                </label>
                <div className="doctor-admin__field" style={{ margin: 0 }}>
                  <span>Выбор врача и времени</span>
                  <div
                    style={{
                      borderRadius: 12,
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "grid",
                      gap: 8,
                      minHeight: 108,
                    }}
                  >
                    {draft.doctorId && draft.date && draft.time ? (
                      <>
                        <strong style={{ color: "white" }}>
                          {(doctors.find((doctor) => doctor.id === draft.doctorId)?.name) || consult.doctorName || "Врач"}
                        </strong>
                        <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 13 }}>
                          {(doctors.find((doctor) => doctor.id === draft.doctorId)?.specialty) || consult.specialty}
                        </span>
                        <span style={{ color: "#60a5fa", fontSize: 13, fontWeight: 700 }}>
                          {draft.date} · {draft.time}
                        </span>
                      </>
                    ) : (
                      <span style={{ color: "#fbbf24", fontSize: 13 }}>
                        Слот ещё не выбран. Откройте график врачей и нажмите на свободную ячейку.
                      </span>
                    )}
                    <button
                      type="button"
                      className="doctor-admin__refresh--primary"
                      style={{ justifySelf: "start" }}
                      onClick={() => openDoctorScheduleForConsult(consult)}
                    >
                      <CalendarClock size={16} />
                      {draft.doctorId ? "Изменить в графике" : "Выбрать в графике врачей"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {isOnlineFlow && aiAdvice?.consultId === consult.id && !aiAdvice.loading ? (
          <div className={`wc-ai-panel wc-ai-panel--${aiAdvice.data?.status === "критично" ? "critical" : aiAdvice.data?.status === "внимание" ? "warn" : "ok"}`}>
            {aiAdvice.error ? (
              <p style={{ color: "#f87171", margin: 0 }}>{aiAdvice.error}</p>
            ) : aiAdvice.data ? (
              <>
                <div className="wc-ai-panel__header">
                  {aiAdvice.data.status === "критично" ? <AlertTriangle size={16} /> : aiAdvice.data.status === "внимание" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                  <strong>ИИ-анализ: {aiAdvice.data.status.toUpperCase()}</strong>
                  <button type="button" className="wc-jitsi-close" onClick={() => setAiAdvice(null)}><X size={14} /></button>
                </div>
                <p className="wc-ai-panel__summary">{aiAdvice.data.summary}</p>
                {aiAdvice.data.concerns.length > 0 && (
                  <div className="wc-ai-section">
                    <span>Отклонения:</span>
                    <ul>{aiAdvice.data.concerns.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </div>
                )}
                <div className="wc-ai-section">
                  <span>Врач:</span>
                  <strong>{aiAdvice.data.doctor}</strong>
                  <em className={`wc-urgency wc-urgency--${aiAdvice.data.doctor_urgency === "срочно" ? "critical" : aiAdvice.data.doctor_urgency === "в течение дня" ? "warn" : "ok"}`}>
                    {aiAdvice.data.doctor_urgency}
                  </em>
                </div>
                {aiAdvice.data.medications.length > 0 && (
                  <div className="wc-ai-section">
                    <span>Лекарства:</span>
                    <div className="wc-ai-meds">
                      {aiAdvice.data.medications.map((item, index) => (
                        <div key={index} className={`wc-ai-med ${item.available_in_robot ? "wc-ai-med--available" : ""}`}>
                          {item.available_in_robot && item.compartment ? (
                            <span className="wc-ai-med__cell">Ячейка {item.compartment}</span>
                          ) : null}
                          <strong>{item.drug}</strong>
                          <span>{item.dosage}</span>
                          <small>{item.reason}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiAdvice.data.actions.length > 0 && (
                  <div className="wc-ai-section">
                    <span>Действия:</span>
                    <ul>{aiAdvice.data.actions.map((action, index) => <li key={index}>{action}</li>)}</ul>
                  </div>
                )}
                <p className="wc-ai-disclaimer">Проконсультируйтесь с врачом перед применением препаратов.</p>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="ward-consult-card__actions">
          {isNewRequest ? (
            <>
              <button
                className="doctor-admin__status doctor-admin__status--blue"
                type="button"
                onClick={() => openDoctorScheduleForConsult(consult)}
              >
                {isProcessing ? "Изменить слот" : "Принять"}
              </button>
              <button
                className={`doctor-admin__status ${finalizeDisabled ? "doctor-admin__status--dark ward-consult-card__status-disabled" : "doctor-admin__status--green"}`}
                type="button"
                disabled={finalizeDisabled}
                onClick={() => void finalizeProcessing(consult)}
              >
                {isSaving ? "Сохраняем..." : "Завершить"}
              </button>
              {isProcessing ? (
                <button
                  className="doctor-admin__status doctor-admin__status--dark"
                  type="button"
                  onClick={() => setProcessingId((current) => (current === consult.id ? null : current))}
                >
                  Отмена
                </button>
              ) : null}
            </>
          ) : null}
          {isOnlineFlow && !isDone ? (
            <button
              className="doctor-admin__status doctor-admin__status--ok ward-consult-card__call-btn"
              type="button"
              disabled={!canOpenCall}
              onClick={() => openCall(consult)}
              title={canOpenCall ? "Открыть видеозвонок" : "Сначала подготовьте консультацию через меню"}
            >
              <PhoneCall size={14} />
              {isLive ? "Открыть звонок" : "Начать звонок"}
            </button>
          ) : null}
          {isOnlineFlow && isLive ? (
            <button
              className="doctor-admin__status doctor-admin__status--blue ward-consult-card__call-btn"
              type="button"
              disabled={!canTriggerMeasurement}
              title={measurementTitle}
              onClick={() => runAimarMeasurement(consult)}
            >
              <Activity size={14} />
              {measurementState?.phase === "measuring" ? "Идёт измерение..." : "Запустить измерение"}
            </button>
          ) : null}
          {isOnlineFlow && isLive ? (
            <button
              className="doctor-admin__status doctor-admin__status--dark"
              type="button"
              onClick={() => handleStage(consult.id, "completed")}
            >
              Завершить
            </button>
          ) : null}
          {utilityActions.length ? (
            <div className="ward-consult-card__menu">
              <button
                className="ward-consult-card__menu-trigger"
                type="button"
                title="Дополнительные действия"
                onClick={closeToolsMenu}
              >
                <MoreHorizontal size={16} />
              </button>
              {toolsMenuOpen ? (
                <div className="ward-consult-card__menu-panel">
                  {utilityActions.map((action) => {
                    if ("href" in action) {
                      return (
                        <a
                          key={action.key}
                          className="ward-consult-card__menu-item"
                          href={action.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setActionMenuId(null)}
                        >
                          {action.icon}
                          <span>{action.label}</span>
                        </a>
                      );
                    }

                    return (
                      <button
                        key={action.key}
                        className={`ward-consult-card__menu-item ${action.tone === "danger" ? "ward-consult-card__menu-item--danger" : ""}`}
                        type="button"
                        onClick={() => {
                          setActionMenuId(null);
                          action.onClick();
                        }}
                      >
                        {action.icon}
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

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
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin/doctor-schedule")}>
            <LayoutGrid size={18} />
            График врачей
          </button>
          <a className="doctor-admin__nav-item doctor-admin__nav-item--active" href="/admin/ward-consults">
            <MonitorSmartphone size={18} />
            <span className="doctor-admin__nav-item-copy">
              <span>Палатные консультации</span>
              {newRequestCount > 0 ? (
                <span className="doctor-admin__nav-item-badge">{newRequestCount}</span>
              ) : null}
            </span>
          </a>
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin/analytics")}>
            <BarChart3 size={18} />
            Аналитика
          </button>
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
                Палатные консультации
              </h1>
              <p className="wc-topbar-desc">Дистанционный осмотр через AIMAR.</p>
            </div>
          </div>

          <div className="doctor-admin__profile">
            <LanguageSwitcher
              locale={locale}
              onChange={setLocale}
              variant="segmented"
              ariaLabel="Язык интерфейса"
              title="Язык интерфейса"
            />
            <Link className="doctor-admin__home" to="/">
              <House size={18} />
              На главную
            </Link>
            <button
              type="button"
              className="doctor-admin__identity doctor-admin__identity-trigger"
              onClick={() => setProfileOpen(true)}
            >
              <AvatarCircle
                name={displayName}
                src={userAvatar}
                size={64}
                className="doctor-admin__avatar"
                alt={displayName}
              />
              <div className="doctor-admin__doctor">
                <strong>{displayName}</strong>
                <span>Администратор</span>
              </div>
            </button>
          </div>
        </header>

        {/* Stats row */}
        <section className="doctor-admin__metrics doctor-admin__metrics--ward" style={{ marginBottom: 0 }}>
          <article className="doctor-admin__metric">
            <span>Новых заявок</span>
            <strong>{newRequestCount}</strong>
            <small className={newRequestCount > 0 ? "doctor-admin__red" : "doctor-admin__green"}>
              {newRequestCount > 0 ? "нужна обработка" : "все обработаны"}
            </small>
          </article>
          <article className="doctor-admin__metric">
            <span>Онлайн через AIMAR</span>
            <strong style={{ color: upcomingCount > 0 ? "#60a5fa" : undefined }}>{upcomingCount}</strong>
            <small className={upcomingCount > 0 ? "doctor-admin__green" : "doctor-admin__red"}>
              {upcomingCount > 0 ? "в потоке" : "нет активных"}
            </small>
          </article>
          <article className="doctor-admin__metric">
            <span>Сейчас онлайн</span>
            <strong style={{ color: liveCount > 0 ? "#4ade80" : undefined }}>{liveCount}</strong>
            <small className={liveCount > 0 ? "doctor-admin__green" : "doctor-admin__red"}>
              {liveCount > 0 ? "идёт сеанс" : "нет активных"}
            </small>
          </article>
        </section>

        {/* Panel */}
        <section className="doctor-admin__panel doctor-admin__ward-consults" style={{ marginTop: 20 }}>
          <div className="doctor-admin__panel-head">
            <div>
              <h2>Консультации</h2>
            </div>
            <button
              className="doctor-admin__refresh--primary"
              type="button"
              onClick={() => setFormOpen((v) => !v)}
            >
              <Plus size={16} />
              Назначить
            </button>
          </div>

          {/* Create form */}
          {formOpen ? (
            <div className="ward-consult-form">
              <h3>Новая палатная консультация</h3>
              <p className="ward-consult-form__subtitle">
                Создано админом: исходящая консультация для планового осмотра или проверки состояния пациента.
              </p>
              <div className="ward-consult-form__grid">
                <label className="doctor-admin__field ward-consult-form__field ward-consult-form__field--patient">
                  <span>Пациент (ФИО)</span>
                  <input
                    type="text"
                    placeholder="Иванов Иван Иванович"
                    value={form.patientName}
                    onChange={(e) => setForm((f) => ({ ...f, patientName: e.target.value }))}
                  />
                </label>
                <label className="doctor-admin__field ward-consult-form__field ward-consult-form__field--ward">
                  <span>Палата</span>
                  <input
                    type="text"
                    placeholder="Палата 301"
                    value={form.wardLabel}
                    onChange={(e) => setForm((f) => ({ ...f, wardLabel: e.target.value }))}
                  />
                </label>
                <label className="doctor-admin__field ward-consult-form__field ward-consult-form__field--bed">
                  <span>Койка</span>
                  <input
                    type="text"
                    placeholder="Койка 2"
                    value={form.bedLabel}
                    onChange={(e) => setForm((f) => ({ ...f, bedLabel: e.target.value }))}
                  />
                </label>
                <label className="doctor-admin__field ward-consult-form__field ward-consult-form__field--date">
                  <span>Дата</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => {
                      const nextDate = e.target.value;
                      clearScheduleSelection(MANUAL_WARD_FORM_ID);
                      setForm((f) => ({ ...f, date: nextDate, doctorId: "", time: "" }));
                    }}
                  />
                </label>
                <div className="doctor-admin__field ward-consult-form__schedule">
                  <span>Врач и время</span>
                  <div className="ward-consult-form__slot">
                    {form.doctorId && form.time ? (
                      <>
                        <strong>{doctors.find((doctor) => doctor.id === form.doctorId)?.name || "Врач"}</strong>
                        <small>{doctors.find((doctor) => doctor.id === form.doctorId)?.specialty || "Специалист"}</small>
                        <span>{form.date} · {form.time}</span>
                      </>
                    ) : (
                      <small>Слот ещё не выбран. Откройте график врачей и нажмите на свободную ячейку.</small>
                    )}
                    <button
                      type="button"
                      className="doctor-admin__refresh--primary"
                      onClick={openDoctorScheduleForManualCreate}
                    >
                      <CalendarClock size={16} />
                      {form.doctorId ? "Изменить в графике" : "Выбрать в графике врачей"}
                    </button>
                  </div>
                </div>
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
                  onClick={() => {
                    clearScheduleSelection(MANUAL_WARD_FORM_ID);
                    setFormOpen(false);
                    setForm(emptyForm());
                    nav("/admin/ward-consults", { replace: true });
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : null}

          <div className="ward-consult-sections">
            <section className="ward-consult-block">
              <div className="ward-consult-block__head">
                <div>
                  <h3>Новые заявки</h3>
                </div>
                <span className="doctor-admin__panel-count doctor-admin__panel-count--amber">
                  {newRequestItems.length}
                </span>
              </div>

              {newRequestItems.length === 0 ? (
                <div className="ward-consult-empty ward-consult-empty--compact">
                  <p>Новых заявок нет — все обработаны.</p>
                </div>
              ) : (
                <div className="ward-consult-list">
                  {newRequestItems.map(renderConsultCard)}
                </div>
              )}
            </section>

            <section className="ward-consult-block">
              <div className="ward-consult-block__head">
                <div>
                  <h3>История</h3>
                </div>
                <span className="doctor-admin__panel-count">
                  {historyItems.length}
                </span>
              </div>

              {historyItems.length === 0 ? (
                <div className="ward-consult-empty ward-consult-empty--compact">
                  <p>История пока пуста.</p>
                </div>
              ) : (
                <>
                  <div className="ward-consult-list">
                    {visibleHistoryItems.map(renderConsultCard)}
                  </div>
                  {historyItems.length > 3 ? (
                    <button
                      className="doctor-admin__show-more"
                      type="button"
                      onClick={() => setHistoryExpanded((value) => !value)}
                    >
                      {historyExpanded ? "Свернуть" : "Показать больше"}
                    </button>
                  ) : null}
                </>
              )}
            </section>
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
          consult={activeCallConsult}
          measurementState={activeCallConsult ? aimarMeasurementByConsult[activeCallConsult.id] || null : null}
          onRunMeasurement={() => {
            if (activeCallConsult) runAimarMeasurement(activeCallConsult);
          }}
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
      <AdminMobileNav
        activeItem="ward-consults"
        wardBadge={newRequestCount}
      />
      <ProfileAvatarDialog
        open={profileOpen}
        user={user}
        onClose={() => setProfileOpen(false)}
        onSaved={(next) => setUser(next)}
      />
    </div>
  );
}
