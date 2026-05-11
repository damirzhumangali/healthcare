import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
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
    signInTablet: "Войти на планшете",
    pairingError: "Не получилось подготовить QR-сессию. Попробуйте обновить код.",
    pairingUnavailable: "QR временно недоступен",
    pairingUnavailableDesc:
      "Сейчас не удалось создать безопасную QR-сессию. Можно войти прямо на планшете и продолжить работу без QR.",
    pairingPending: "Ожидаем подтверждение пациента",
    pairingApproved: "Пациент подтверждён",
    pairingExpired: "QR код истек",
    pairingAutoUpdate: "Статус обновляется автоматически после подтверждения с телефона.",
    readyTitle: "Станция связана с пациентом",
    readyDesc:
      "Пациент подтвержден. Когда ESP32 пришлет показатели, они появятся на планшете и в кабинете пациента.",
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
    signInTablet: "Планшетте кіру",
    pairingError: "QR сессиясын дайындау мүмкін болмады. Кодты жаңартып көріңіз.",
    pairingUnavailable: "QR уақытша қолжетімсіз",
    pairingUnavailableDesc:
      "Қазір қауіпсіз QR сессиясын құру мүмкін болмады. Қажет болса, планшетте тікелей кіріп, QR-сыз жалғастыра аласыз.",
    pairingPending: "Пациенттің растауын күтіп тұрмыз",
    pairingApproved: "Пациент расталды",
    pairingExpired: "QR кодтың мерзімі бітті",
    pairingAutoUpdate: "Статус телефоннан расталғаннан кейін автоматты түрде жаңарады.",
    readyTitle: "Станция пациентпен байланыстырылды",
    readyDesc:
      "Пациент расталды. ESP32 көрсеткіш жібергенде, ол планшетте де, пациент кабинетінде де бірден көрінеді.",
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
    signInTablet: "Sign in on tablet",
    pairingError: "Could not prepare the QR session. Try generating a new code.",
    pairingUnavailable: "QR is temporarily unavailable",
    pairingUnavailableDesc:
      "A secure QR session could not be created right now. You can sign in directly on the tablet and continue without QR.",
    pairingPending: "Waiting for patient confirmation",
    pairingApproved: "Patient confirmed",
    pairingExpired: "QR code expired",
    pairingAutoUpdate: "The status updates automatically after confirmation on the phone.",
    readyTitle: "Station linked to patient",
    readyDesc:
      "The patient is confirmed. When ESP32 sends readings, they will appear on the tablet and in the patient dashboard.",
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

function maskToken(token: string) {
  if (token.length <= 12) {
    return token;
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function isLocalPairUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return isLocalPublicAppUrl();
  }
}

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
    if (!deviceSession) {
      logout();
      setAuthed(false);
      setErr(null);
      nav(`/scan/${deviceId}`, { replace: true });
      return;
    }

    setErr(null);
    setSessionBusy(true);

    try {
      await closeDeviceSession(deviceId);
      setDeviceSession(null);
      setPairing(null);
      await handleCreatePairing(true);
    } catch {
      setErr(t.sessionEndError);
    } finally {
      setSessionBusy(false);
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

      <Card>
        <div className="stack station-shell">
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
                <h2 className="h2" style={{ marginTop: 6 }}>
                  {t.readyTitle}
                </h2>
                <p className="muted" style={{ marginTop: -6 }}>
                  {t.readyDesc}
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

                {latestMeasurement ? (
                  <div className="stack">
                    <div className="station-ready__section">
                      <h3 className="h2">{t.latestMeasurement}</h3>
                      <p className="muted" style={{ margin: "6px 0 0" }}>
                        {t.measuredAt}: {formatDateTime(latestMeasurement.createdAt)}
                      </p>
                    </div>

                    <div className="grid station-ready__metrics">
                      <div className="metric">
                        <div className="metric__label">{t.tempMetric}</div>
                        <div className="metric__value">
                          {formatMetric(latestMeasurement.tempC, " °C")}
                        </div>
                      </div>

                      <div className="metric">
                        <div className="metric__label">{t.pulseMetric}</div>
                        <div className="metric__value">
                          {formatMetric(latestMeasurement.hr, " bpm")}
                        </div>
                      </div>

                      <div className="metric">
                        <div className="metric__label">{t.spo2Metric}</div>
                        <div className="metric__value">
                          {formatMetric(latestMeasurement.spo2, " %")}
                        </div>
                      </div>

                      <div className="metric">
                        <div className="metric__label">{t.pressureMetric}</div>
                        <div className="metric__value">{formatPressure(latestMeasurement)}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="station-ready__empty">
                    <h3 className="h2">{t.waitingMeasurements}</h3>
                    <p className="muted" style={{ margin: "6px 0 0" }}>
                      {t.waitingMeasurementsDesc}
                    </p>
                  </div>
                )}

                <p className="muted station-ready__hint">{t.dashboardSyncHint}</p>

                {err ? <div className="alert">{err}</div> : null}

                <div className="row station-ready__actions">
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
                  {t.directModeTitle}
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
                <Button
                  className="station-actions__primary"
                  onClick={() =>
                    nav(`/login?next=${encodeURIComponent(stationLoginNext)}`)
                  }
                >
                  {t.signInTablet}
                </Button>

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
                <div className="station-pairing__qr">
                  <QrCode value={pairUrl} />
                </div>
              ) : null}

              <div className="station-actions">
                <Button
                  className="station-actions__primary"
                  onClick={() =>
                    nav(`/login?next=${encodeURIComponent(stationLoginNext)}`)
                  }
                >
                  {t.signInTablet}
                </Button>

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
          )}
        </div>
      </Card>
    </div>
  );
}
