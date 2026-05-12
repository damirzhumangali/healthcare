import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import QrCode from "../components/QrCode";
import {
  closeDeviceSession,
  createDevicePairingSession,
  fetchDevicePairingSession,
  fetchDeviceSession,
  type DeviceMeasurement,
  type DevicePairingSession,
  type DeviceSessionState,
} from "../lib/devicePairing";
import { getCurrentUser, hasSession, logout } from "../lib/auth";

type Locale = "ru" | "kk" | "en";

const copy = {
  ru: {
    kicker: "QR → СТАНЦИЯ",
    title: "Станция измерений",
    device: "Устройство",
    waitingPair: "Сканируйте QR код",
    waitingPairDesc:
      "Пациент сканирует QR телефоном, входит в аккаунт и подтверждает вход на планшете.",
    qrRefresh: "Новый QR",
    pairingError: "Не получилось подготовить QR-сессию. Попробуйте обновить код.",
    pairingUnavailable: "QR временно недоступен",
    pairingUnavailableDesc:
      "Сейчас не удалось создать безопасную QR-сессию. Можно войти прямо на планшете и продолжить работу без QR.",
    pairingPending: "Ожидаем подтверждение пациента",
    pairingApproved: "Пациент подтверждён",
    pairingExpired: "QR код истек",
    pairingAutoUpdate: "Статус обновляется автоматически после подтверждения с телефона.",
    readyTitle: "Экран измерений",
    readyDesc:
      "Пациент подтвержден. Планшет открыт на странице температуры и пульса. Когда ESP32 пришлет данные, значения обновятся автоматически.",
    linkedPatient: "Пациент",
    refreshSession: "Обновить данные",
    refreshingSession: "Обновляю...",
    waitingMeasurements: "Ожидаем данные от датчиков",
    waitingMeasurementsDesc:
      "ESP32 пока не отправил новое измерение. Как только данные придут, они появятся здесь автоматически.",
    dashboardSyncHint:
      "История на сайте пациента обновляется автоматически после сохранения измерения сервером.",
    latestMeasurement: "Последнее измерение",
    measuredAt: "Время",
    tempMetric: "Температура",
    pulseMetric: "Пульс",
    spo2Metric: "SpO₂",
    pressureMetric: "Давление",
    waitingValue: "Ожидание",
    tempHint: "Появится после измерения датчиком температуры.",
    pulseHint: "Появится после измерения пульса.",
    spo2Hint: "Появится вместе с пульсом, если модуль поддерживает SpO₂.",
    pressureHint: "Показывается только если backend получит давление.",
    directModeTitle: "Планшет вошел напрямую",
    directModeDesc:
      "Это запасной режим без безопасной QR-привязки пациента. Для робота и датчиков лучше использовать вход через QR с телефона.",
    openDashboard: "Открыть кабинет",
    endSession: "Завершить сеанс",
    sessionError:
      "Не получилось получить актуальные данные станции. Проверь backend и активную device-session.",
    sessionEndError: "Не получилось завершить сеанс. Попробуйте еще раз.",
  },
  kk: {
    kicker: "QR → СТАНЦИЯ",
    title: "Өлшеу станциясы",
    device: "Құрылғы",
    waitingPair: "QR кодты сканерлеңіз",
    waitingPairDesc:
      "Пациент телефонмен QR кодты сканерлеп, аккаунтқа кіріп, планшеттегі кіруді растайды.",
    qrRefresh: "Жаңа QR",
    pairingError: "QR сессиясын дайындау мүмкін болмады. Кодты жаңартып көріңіз.",
    pairingUnavailable: "QR уақытша қолжетімсіз",
    pairingUnavailableDesc:
      "Қазір қауіпсіз QR сессиясын құру мүмкін болмады. Қажет болса, планшетте тікелей кіріп, QR-сыз жалғастыра аласыз.",
    pairingPending: "Пациенттің растауын күтіп тұрмыз",
    pairingApproved: "Пациент расталды",
    pairingExpired: "QR кодтың мерзімі бітті",
    pairingAutoUpdate: "Статус телефоннан расталғаннан кейін автоматты түрде жаңарады.",
    readyTitle: "Өлшеу экраны",
    readyDesc:
      "Пациент расталды. Планшет температура мен пульс экранында ашылды. ESP32 дерек жібергенде, мәндер автоматты түрде жаңарады.",
    linkedPatient: "Пациент",
    refreshSession: "Деректерді жаңарту",
    refreshingSession: "Жаңартылуда...",
    waitingMeasurements: "Датчик деректерін күтіп тұрмыз",
    waitingMeasurementsDesc:
      "ESP32 әлі жаңа өлшеу жібермеді. Деректер келген бойда осында автоматты түрде шығады.",
    dashboardSyncHint:
      "Сервер өлшеуді сақтағаннан кейін пациент сайтындағы тарих автоматты түрде жаңарады.",
    latestMeasurement: "Соңғы өлшеу",
    measuredAt: "Уақыты",
    tempMetric: "Температура",
    pulseMetric: "Пульс",
    spo2Metric: "SpO₂",
    pressureMetric: "Қысым",
    waitingValue: "Күтілуде",
    tempHint: "Температура датчигі өлшегеннен кейін шығады.",
    pulseHint: "Пульс өлшенгеннен кейін шығады.",
    spo2Hint: "Егер модуль қолдаса, пульспен бірге шығады.",
    pressureHint: "Backend қысымды алса ғана көрсетіледі.",
    directModeTitle: "Планшет тікелей кірді",
    directModeDesc:
      "Бұл пациентті қауіпсіз QR арқылы байланыстырмайтын қосалқы режим. Робот пен датчиктер үшін QR арқылы кіру дұрыс болады.",
    openDashboard: "Кабинетті ашу",
    endSession: "Сеансты аяқтау",
    sessionError:
      "Станцияның өзекті деректерін алу мүмкін болмады. Backend пен active device-session тексеріңіз.",
    sessionEndError: "Сеансты аяқтау мүмкін болмады. Қайтадан көріңіз.",
  },
  en: {
    kicker: "QR → STATION",
    title: "Measurement Station",
    device: "Device",
    waitingPair: "Scan the QR code",
    waitingPairDesc:
      "The patient scans the QR with their phone, signs in, and confirms tablet access.",
    qrRefresh: "New QR",
    pairingError: "Could not prepare the QR session. Try generating a new code.",
    pairingUnavailable: "QR is temporarily unavailable",
    pairingUnavailableDesc:
      "A secure QR session could not be created right now. You can sign in directly on the tablet and continue without QR.",
    pairingPending: "Waiting for patient confirmation",
    pairingApproved: "Patient confirmed",
    pairingExpired: "QR code expired",
    pairingAutoUpdate: "The status updates automatically after confirmation on the phone.",
    readyTitle: "Measurements Screen",
    readyDesc:
      "The patient is confirmed. The tablet is now on the temperature and pulse screen. When ESP32 sends data, the values update automatically.",
    linkedPatient: "Patient",
    refreshSession: "Refresh data",
    refreshingSession: "Refreshing...",
    waitingMeasurements: "Waiting for sensor readings",
    waitingMeasurementsDesc:
      "ESP32 has not sent a new measurement yet. As soon as it arrives, it will appear here automatically.",
    dashboardSyncHint:
      "The patient website updates automatically after the server saves a measurement.",
    latestMeasurement: "Latest measurement",
    measuredAt: "Time",
    tempMetric: "Temperature",
    pulseMetric: "Pulse",
    spo2Metric: "SpO₂",
    pressureMetric: "Pressure",
    waitingValue: "Waiting",
    tempHint: "It will appear after the temperature sensor sends a reading.",
    pulseHint: "It will appear after the pulse sensor sends a reading.",
    spo2Hint: "It appears together with pulse if the module supports SpO₂.",
    pressureHint: "Shown only if the backend receives blood pressure.",
    directModeTitle: "Tablet signed in directly",
    directModeDesc:
      "This is a fallback mode without secure QR patient pairing. For the robot and sensors, QR flow from the patient phone is the better option.",
    openDashboard: "Open Dashboard",
    endSession: "End Session",
    sessionError:
      "Could not load current station data. Check the backend and active device session.",
    sessionEndError: "Could not end the session. Try again.",
  },
} as const;

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatMetric(value: number | null | undefined, suffix = "") {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return `${value}${suffix}`;
}

function formatPressure(item: DeviceMeasurement | null) {
  if (!item) {
    return "—";
  }

  if (item.systolic == null && item.diastolic == null) {
    return "—";
  }

  return `${item.systolic ?? "—"} / ${item.diastolic ?? "—"}`;
}

function pairingToSessionSnapshot(pairing: DevicePairingSession): DeviceSessionState | null {
  if (!pairing.sessionToken) {
    return null;
  }

  return {
    session: {
      sessionToken: pairing.sessionToken,
      deviceId: pairing.deviceId,
      patientId: pairing.patientId ? String(pairing.patientId) : "",
      status: pairing.status,
      createdAt: pairing.createdAt,
      claimedAt: pairing.claimedAt ?? pairing.approvedAt ?? null,
      sessionExpiresAt: pairing.sessionExpiresAt ?? null,
    },
    patient: pairing.patient ?? pairing.user ?? null,
    measurements: [],
  };
}

function getQrSize() {
  if (typeof window === "undefined") {
    return 404;
  }

  if (window.innerWidth < 640) {
    return 256;
  }

  if (window.innerWidth < 1024) {
    return 336;
  }

  return 404;
}

export default function ScanDevice() {
  const nav = useNavigate();
  const location = useLocation();
  const { deviceId = "device-001" } = useParams();

  const [locale, setLocale] = useState<Locale>(() => {
    const value = window.localStorage.getItem("ha_locale");
    if (value === "en" || value === "kk" || value === "ru") return value;
    return "ru";
  });

  const t = copy[locale];

  const [authed, setAuthed] = useState(() => hasSession());
  const [pairing, setPairing] = useState<DevicePairingSession | null>(null);
  const [deviceSession, setDeviceSession] = useState<DeviceSessionState | null>(null);
  const [pairingLoading, setPairingLoading] = useState(true);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number | null>(null);
  const [qrSize, setQrSize] = useState(getQrSize);

  const stationLoginMode =
    new URLSearchParams(location.search).get("stationLogin") === "1";
  const stationLoginNext = `/scan/${deviceId}?stationLogin=1`;
  const directMode = authed && stationLoginMode && !deviceSession;
  const stationReady = Boolean(deviceSession) || directMode;
  const currentUser = useMemo(() => getCurrentUser(), [authed]);
  const patientLabel =
    deviceSession?.patient?.name ||
    deviceSession?.patient?.email ||
    pairing?.user?.name ||
    pairing?.user?.email ||
    currentUser?.name ||
    currentUser?.email ||
    "HealthAssist";
  const pairUrl = pairing?.pairingUrl ?? "";
  const latestMeasurement = deviceSession?.measurements[0] ?? null;

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  useEffect(() => {
    const onResize = () => setQrSize(getQrSize());
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const sync = () => setAuthed(hasSession());

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setPairingLoading(true);
      setPairingError(null);
      setErr(null);

      try {
        const activeSession = await fetchDeviceSession(deviceId);
        if (cancelled) return;

        if (activeSession) {
          setDeviceSession(activeSession);
          setPairing(null);
          return;
        }

        const nextPairing = await createDevicePairingSession(deviceId);
        if (!cancelled) {
          setPairing(nextPairing);
          setDeviceSession(null);
        }
      } catch {
        if (!cancelled) {
          setPairingError(copy[locale].pairingError);
        }
      } finally {
        if (!cancelled) {
          setPairingLoading(false);
        }
      }
    }

    void boot();

    return () => {
      cancelled = true;
    };
  }, [deviceId]);

  useEffect(() => {
    if (!pairing?.pairingToken || pairing.status !== "pending") {
      return;
    }

    let cancelled = false;

    const timer = window.setInterval(() => {
      void fetchDevicePairingSession(pairing.pairingToken, {
        pollSecret: pairing.pollSecret,
      })
        .then((next) => {
          if (cancelled) return;

          setPairing(next);
          setPairingError(null);

          if (next.status === "approved") {
            const snapshot = pairingToSessionSnapshot(next);
            if (snapshot) {
              setDeviceSession((current) => current ?? snapshot);
              void fetchDeviceSession(deviceId)
                .then((activeSession) => {
                  if (cancelled || !activeSession) return;
                  setDeviceSession(activeSession);
                })
                .catch(() => {});
            }
          }
        })
        .catch(() => {});
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deviceId, pairing?.pairingToken, pairing?.pollSecret, pairing?.status]);

  useEffect(() => {
    if (!pairing?.pairingToken || deviceSession) {
      return;
    }

    let cancelled = false;

    async function rotatePairing() {
      try {
        const nextPairing = await createDevicePairingSession(deviceId, { forceNew: true });
        if (cancelled) return;

        setPairing(nextPairing);
        setPairingError(null);
      } catch {
        if (cancelled) return;
        setPairingError(copy[locale].pairingError);
      }
    }

    if (pairing.status === "expired" || pairing.status === "closed") {
      void rotatePairing();
      return () => {
        cancelled = true;
      };
    }

    if (pairing.status !== "pending") {
      return () => {
        cancelled = true;
      };
    }

    const expiresAtMs = Date.parse(pairing.expiresAt);
    if (!Number.isFinite(expiresAtMs)) {
      return () => {
        cancelled = true;
      };
    }

    const delayMs = Math.max(250, expiresAtMs - Date.now() + 250);
    const timer = window.setTimeout(() => {
      void rotatePairing();
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    deviceId,
    deviceSession,
    locale,
    pairing?.expiresAt,
    pairing?.pairingToken,
    pairing?.status,
  ]);

  useEffect(() => {
    if (!deviceSession?.session.sessionToken) {
      return;
    }

    let cancelled = false;

    const timer = window.setInterval(() => {
      void fetchDeviceSession(deviceId)
        .then((next) => {
          if (cancelled) return;

          if (!next) {
            setDeviceSession(null);
            setPairing(null);
            setPairingLoading(true);
            void createDevicePairingSession(deviceId, { forceNew: true })
              .then((nextPairing) => {
                if (!cancelled) {
                  setPairing(nextPairing);
                  setPairingLoading(false);
                }
              })
              .catch(() => {
                if (!cancelled) setPairingLoading(false);
              });
          } else {
            setDeviceSession(next);
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deviceId, deviceSession?.session.sessionToken]);

  useEffect(() => {
    if (!pairing?.expiresAt || pairing.status !== "pending" || deviceSession) {
      setQrSecondsLeft(null);
      return;
    }

    const tick = () => {
      const ms = Date.parse(pairing.expiresAt) - Date.now();
      setQrSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [pairing?.expiresAt, pairing?.status, deviceSession]);

  async function handleCreatePairing(forceNew = false) {
    setPairingError(null);
    setErr(null);
    setPairingLoading(true);

    try {
      const next = await createDevicePairingSession(deviceId, { forceNew });
      setPairing(next);
      setDeviceSession(null);
    } catch {
      setPairingError(t.pairingError);
    } finally {
      setPairingLoading(false);
    }
  }

  async function handleRefreshSession() {
    setErr(null);
    setSessionBusy(true);

    try {
      const next = await fetchDeviceSession(deviceId);
      if (next) {
        setDeviceSession(next);
        return;
      }

      setDeviceSession(null);
      await handleCreatePairing(true);
    } catch {
      setErr(t.sessionError);
    } finally {
      setSessionBusy(false);
    }
  }

  async function handleEndSession() {
    setErr(null);
    setSessionBusy(true);

    try {
      if (deviceSession) {
        await closeDeviceSession(deviceId);
      } else {
        logout();
      }
    } catch {
      // ignore — still reload to reset state
    } finally {
      // Full reload: re-runs boot() which auto-creates a fresh QR
      window.location.reload();
    }
  }

  return (
    <div className="center station-screen min-h-screen relative">
      <div className="absolute top-4 right-4 z-10">
        <div className="flex rounded-full border border-white/20 overflow-hidden bg-slate-900/50 backdrop-blur-sm">
          {(["ru", "kk", "en"] as Locale[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLocale(lang)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                locale === lang
                  ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="stack station-shell station-screen__content">
          <div>
            <div className="kicker">{t.kicker}</div>
            <h1 className="h1">{t.title}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {t.device}: <b>{deviceId}</b>
            </p>
            {deviceSession || pairing ? (
              <div
                className={`badge ${
                  deviceSession
                    ? "badge--ok"
                    : pairing?.status === "approved"
                      ? "badge--ok"
                      : pairing?.status === "expired" || pairing?.status === "closed"
                        ? "badge--danger"
                        : "badge--warn"
                }`}
                style={{ marginTop: 12 }}
              >
                <span className="badge__dot" />
                {deviceSession || pairing?.status === "approved"
                  ? t.pairingApproved
                  : pairing?.status === "expired" || pairing?.status === "closed"
                    ? t.pairingExpired
                    : t.pairingPending}
              </div>
            ) : null}
          </div>

          {pairingError ? <div className="alert">{pairingError}</div> : null}

          {pairingLoading ? (
            <div className="muted">{t.pairingPending}...</div>
          ) : stationReady ? (
            deviceSession ? (
              <div className="stack station-ready">
                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  {t.linkedPatient}: <b>{patientLabel}</b>
                </div>

                <div className="station-board">
                  <div className="station-board__instruction">
                    <img
                      src="/images/device-tap.png"
                      alt=""
                      aria-hidden="true"
                      className="station-board__device-illustration"
                    />
                    <span className="muted">{t.waitingMeasurements}</span>
                  </div>
                  <div className="station-board__grid">
                    <div className="station-board__tile station-board__tile--primary">
                      <div className="station-board__label">{t.tempMetric}</div>
                      <div className={`station-board__value${latestMeasurement?.tempC == null ? " station-board__value--waiting" : ""}`}>
                        {latestMeasurement?.tempC != null ? formatMetric(latestMeasurement.tempC, " °C") : null}
                      </div>
                      <p className="muted station-board__hint">
                        {latestMeasurement?.tempC != null ? t.latestMeasurement : t.tempHint}
                      </p>
                    </div>

                    <div className="station-board__tile station-board__tile--primary">
                      <div className="station-board__label">{t.pulseMetric}</div>
                      <div className={`station-board__value${latestMeasurement?.hr == null ? " station-board__value--waiting" : ""}`}>
                        {latestMeasurement?.hr != null ? formatMetric(latestMeasurement.hr, " bpm") : null}
                      </div>
                      <p className="muted station-board__hint">
                        {latestMeasurement?.hr != null ? t.latestMeasurement : t.pulseHint}
                      </p>
                    </div>

                  </div>

                  {latestMeasurement && (
                    <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                      {t.measuredAt}: {formatDateTime(latestMeasurement.createdAt)}
                    </p>
                  )}
                </div>

                {err ? <div className="alert">{err}</div> : null}

                <div className="station-ready__actions">
                  <Button onClick={() => void handleRefreshSession()} disabled={sessionBusy}>
                    {sessionBusy ? t.refreshingSession : t.refreshSession}
                  </Button>

                  <Button variant="danger" onClick={() => void handleEndSession()} disabled={sessionBusy}>
                    {t.endSession}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="stack station-ready">
                <h2 className="h2" style={{ marginTop: 6 }}>
                  {t.readyTitle}
                </h2>
                <p className="muted" style={{ marginTop: -6 }}>
                  {t.directModeDesc}
                </p>

                <div
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  {t.linkedPatient}: <b>{patientLabel}</b>
                </div>

                <div className="station-board">
                  <div className="station-board__grid">
                    <div className="station-board__tile station-board__tile--primary">
                      <div className="station-board__label">{t.tempMetric}</div>
                      <div className="station-board__value station-board__value--waiting" />
                      <p className="muted station-board__hint">{t.tempHint}</p>
                    </div>

                    <div className="station-board__tile station-board__tile--primary">
                      <div className="station-board__label">{t.pulseMetric}</div>
                      <div className="station-board__value station-board__value--waiting" />
                      <p className="muted station-board__hint">{t.pulseHint}</p>
                    </div>

                  </div>

                  <p className="muted station-board__waiting-hint">{t.waitingMeasurementsDesc}</p>
                </div>

                <p className="muted station-ready__hint">{t.dashboardSyncHint}</p>

                {err ? <div className="alert">{err}</div> : null}

                <div className="row station-ready__actions">
                  <Button onClick={() => nav("/app")}>{t.openDashboard}</Button>

                  <Button variant="danger" onClick={() => void handleEndSession()}>
                    {t.endSession}
                  </Button>
                </div>
              </div>
            )
          ) : pairingError && !pairing ? (
            <div className="stack station-fallback">
              <h2 className="h2" style={{ marginTop: 6 }}>
                {t.pairingUnavailable}
              </h2>
              <p className="muted" style={{ marginTop: -6 }}>
                {t.pairingUnavailableDesc}
              </p>

              <div className="station-actions">
                <div className="station-actions__secondary">
                  <Button
                    variant="ghost"
                    className="station-actions__button"
                    onClick={() => void handleCreatePairing(true)}
                  >
                    {t.qrRefresh}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="station-pairing">
              <div className="station-pairing__copy">
                <div>
                  <div className="kicker">{t.kicker}</div>
                  <h1 className="h1">{t.title}</h1>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {t.device}: <b>{deviceId}</b>
                  </p>
                  {pairing ? (
                    <div className="badge badge--warn" style={{ marginTop: 12 }}>
                      <span className="badge__dot" />
                      {t.pairingPending}
                    </div>
                  ) : null}
                </div>
                <h2 className="h2" style={{ marginTop: 6 }}>
                  {t.waitingPair}
                </h2>
                <p className="muted" style={{ marginTop: -6 }}>
                  {t.waitingPairDesc}
                </p>
                <p className="muted station-pairing__auto">
                  {t.pairingAutoUpdate}
                </p>
              </div>

              {pairing ? (
                <div className="station-pairing__scene">
                  {/* QR card */}
                  <QrCode value={pairUrl} size={qrSize} />
                  {/* Phone illustration — cropped to show only hand+phone portion */}
                  <div className="station-pairing__phone-wrap">
                    <img
                      src="/images/scan-phone-qr-frame.png"
                      alt=""
                      aria-hidden="true"
                      className="station-pairing__illustration"
                    />
                  </div>
                  {qrSecondsLeft !== null && (
                    <div
                      className="station-pairing__timer"
                      style={{
                        color: qrSecondsLeft <= 30 ? "#f87171" : "rgba(255,255,255,0.52)",
                      }}
                    >
                      {locale === "kk"
                        ? `QR ${qrSecondsLeft}с кейін жаңарады`
                        : locale === "en"
                          ? `QR refreshes in ${qrSecondsLeft}s`
                          : `QR обновится через ${qrSecondsLeft}с`}
                    </div>
                  )}
                </div>
              ) : null}

            </div>
          )}
        </div>
    </div>
  );
}
