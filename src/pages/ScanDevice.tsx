import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import QrCode from "../components/QrCode";
import {
  createDevicePairingSession,
  fetchDevicePairingSession,
  type DevicePairingSession,
} from "../lib/devicePairing";
import { getCurrentUser, hasSession, logout } from "../lib/auth";
import { createMeasurement } from "../lib/apiMeasurements";
import { buildPublicAppUrl, isLocalPublicAppUrl } from "../lib/publicAppUrl";

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
    openPairLink: "Открыть ссылку",
    signInTablet: "Войти на планшете",
    pairingError: "Не получилось подготовить QR-сессию. Попробуйте обновить код.",
    pairingPending: "Ожидаем подтверждение пациента",
    pairingApproved: "Пациент подтверждён",
    pairingExpired: "QR код истек",
    pairingAutoUpdate: "Статус обновляется автоматически после подтверждения с телефона.",
    directLoginHint: "Если нужно, можно войти прямо на планшете без QR.",
    pairLinkLabel: "Ссылка для пациента",
    pairLinkHint:
      "Токен скрыт в интерфейсе. Полная ссылка есть только внутри QR и кнопки открытия.",
    qrLifetime: "QR действует около 10 минут.",
    devLinkWarning:
      "Сейчас используется localhost. Для телефона пациента это не подойдет вне текущего компьютера. Для реального теста укажи VITE_PUBLIC_APP_URL или открой сайт с домена.",
    readyToMeasure: "Готово к измерению",
    readyToMeasureDesc:
      "Нажми кнопку — сервер создаст измерение как с датчиков, и оно появится в кабинете.",
    startMeasurement: "Начать измерение",
    measuring: "Измеряю...",
    openDashboard: "Открыть кабинет",
    linkedPatient: "Пациент",
    endSession: "Завершить сеанс",
    measurementError:
      "Не получилось создать измерение. Проверь backend и VITE_API_BASE_URL, затем попробуй ещё раз.",
  },
  kk: {
    kicker: "QR → СТАНЦИЯ",
    title: "Өлшеу станциясы",
    device: "Құрылғы",
    waitingPair: "QR кодты сканерлеңіз",
    waitingPairDesc:
      "Пациент телефонмен QR кодты сканерлеп, аккаунтқа кіріп, планшеттегі кіруді растайды.",
    qrRefresh: "Жаңа QR",
    openPairLink: "Сілтемені ашу",
    signInTablet: "Планшетте кіру",
    pairingError: "QR сессиясын дайындау мүмкін болмады. Кодты жаңартып көріңіз.",
    pairingPending: "Пациенттің растауын күтіп тұрмыз",
    pairingApproved: "Пациент расталды",
    pairingExpired: "QR кодтың мерзімі бітті",
    pairingAutoUpdate: "Статус телефоннан расталғаннан кейін автоматты түрде жаңарады.",
    directLoginHint: "Қажет болса, QR-сыз тікелей планшетте кіруге болады.",
    pairLinkLabel: "Пациентке арналған сілтеме",
    pairLinkHint:
      "Интерфейсте токен жасырылған. Толық сілтеме тек QR мен ашу батырмасында бар.",
    qrLifetime: "QR шамамен 10 минут жарамды.",
    devLinkWarning:
      "Қазір localhost қолданылып тұр. Бұл науқастың телефонында ағымдағы компьютерден тыс ашылмайды. Нақты тест үшін VITE_PUBLIC_APP_URL орнатыңыз немесе сайтты доменнен ашыңыз.",
    readyToMeasure: "Өлшеуге дайын",
    readyToMeasureDesc:
      "Батырманы басыңыз — сервер датчиктардан өлшеуді жасайды, ол кабинетте пайда болады.",
    startMeasurement: "Өлшеуді бастау",
    measuring: "Өлшенуде...",
    openDashboard: "Кабинетті ашу",
    linkedPatient: "Пациент",
    endSession: "Сеансты аяқтау",
    measurementError:
      "Өлшеуді жасай алмады. Backend пен VITE_API_BASE_URL тексеріп, қайтадан көріңіз.",
  },
  en: {
    kicker: "QR → STATION",
    title: "Measurement Station",
    device: "Device",
    waitingPair: "Scan the QR code",
    waitingPairDesc:
      "The patient scans the QR with their phone, signs in, and confirms tablet access.",
    qrRefresh: "New QR",
    openPairLink: "Open link",
    signInTablet: "Sign in on tablet",
    pairingError: "Could not prepare the QR session. Try generating a new code.",
    pairingPending: "Waiting for patient confirmation",
    pairingApproved: "Patient confirmed",
    pairingExpired: "QR code expired",
    pairingAutoUpdate: "The status updates automatically after confirmation on the phone.",
    directLoginHint: "If needed, you can sign in directly on this tablet without QR.",
    pairLinkLabel: "Patient link",
    pairLinkHint:
      "The token is masked in the UI. The full link exists only inside the QR and open-link action.",
    qrLifetime: "The QR stays valid for about 10 minutes.",
    devLinkWarning:
      "This currently uses localhost. It will not work on a patient phone outside this computer. For a real test set VITE_PUBLIC_APP_URL or open the site from a domain.",
    readyToMeasure: "Ready to Measure",
    readyToMeasureDesc:
      "Click the button - server will create measurement as from sensors, and it will appear in dashboard.",
    startMeasurement: "Start Measurement",
    measuring: "Measuring...",
    openDashboard: "Open Dashboard",
    linkedPatient: "Patient",
    endSession: "End Session",
    measurementError:
      "Failed to create measurement. Check the backend and VITE_API_BASE_URL, then try again.",
  },
} as const;

function maskToken(token: string) {
  if (token.length <= 12) {
    return token;
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
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
  const [pairingLoading, setPairingLoading] = useState(true);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stationLoginMode =
    new URLSearchParams(location.search).get("stationLogin") === "1";
  const stationLoginNext = `/scan/${deviceId}?stationLogin=1`;
  const stationReady = authed && (stationLoginMode || pairing?.status === "approved");
  const currentUser = useMemo(() => getCurrentUser(), [authed]);
  const patientLabel =
    pairing?.user?.name ||
    pairing?.user?.email ||
    currentUser?.name ||
    currentUser?.email ||
    "HealthAssist";
  const pairUrl = pairing
    ? buildPublicAppUrl(
        `/pair/${encodeURIComponent(deviceId)}/${encodeURIComponent(pairing.pairingToken)}`
      )
    : "";
  const pairUrlDisplay = useMemo(() => {
    if (!pairUrl || !pairing?.pairingToken) {
      return "";
    }

    return pairUrl.replace(pairing.pairingToken, maskToken(pairing.pairingToken));
  }, [pairUrl, pairing?.pairingToken]);
  const usingLocalPublicUrl = isLocalPublicAppUrl();

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

    async function load(forceNew = false) {
      setPairingLoading(true);
      setPairingError(null);

      try {
        const next = await createDevicePairingSession(deviceId, { forceNew });
        if (!cancelled) {
          setPairing(next);
        }
      } catch {
        if (!cancelled) {
          setPairingError(t.pairingError);
        }
      } finally {
        if (!cancelled) {
          setPairingLoading(false);
        }
      }
    }

    void load(false);

    return () => {
      cancelled = true;
    };
  }, [deviceId, t.pairingError]);

  useEffect(() => {
    if (!pairing?.pairingToken || pairing.status !== "waiting") {
      return;
    }

    let cancelled = false;

    const timer = window.setInterval(() => {
      void fetchDevicePairingSession(pairing.pairingToken)
        .then((next) => {
          if (cancelled) return;
          setPairing(next);
          setAuthed(hasSession());
        })
        .catch(() => {});
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pairing?.pairingToken, pairing?.status]);

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
            {pairing ? (
              <div
                className={`badge ${
                  pairing.status === "approved"
                    ? "badge--ok"
                    : pairing.status === "expired"
                      ? "badge--danger"
                      : "badge--warn"
                }`}
                style={{ marginTop: 12 }}
              >
                <span className="badge__dot" />
                {pairing.status === "approved"
                  ? t.pairingApproved
                  : pairing.status === "expired"
                    ? t.pairingExpired
                    : t.pairingPending}
              </div>
            ) : null}
          </div>

          {pairingError ? <div className="alert">{pairingError}</div> : null}

          {pairingLoading ? (
            <div className="muted">{t.pairingPending}...</div>
          ) : stationReady ? (
            <div className="stack station-ready">
              <h2 className="h2" style={{ marginTop: 6 }}>
                {t.readyToMeasure}
              </h2>
              <p className="muted" style={{ marginTop: -6 }}>
                {t.readyToMeasureDesc}
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
                <Button
                  onClick={async () => {
                    setErr(null);
                    setLoading(true);
                    try {
                      await createMeasurement(deviceId);
                      nav("/app");
                    } catch {
                      setErr(t.measurementError);
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading ? t.measuring : t.startMeasurement}
                </Button>

                <Button variant="ghost" onClick={() => nav("/app")}>
                  {t.openDashboard}
                </Button>

                <Button
                  variant="danger"
                  onClick={() => {
                    logout();
                    setAuthed(false);
                    setErr(null);
                    nav(`/scan/${deviceId}`, { replace: true });
                  }}
                >
                  {t.endSession}
                </Button>
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
                  <div className="station-link-card">
                    <div className="muted station-link-card__label">
                      {t.pairLinkLabel}
                    </div>
                    <div className="station-link-card__url">
                      {pairUrlDisplay}
                    </div>
                    <div className="muted station-link-card__hint">
                      {t.pairLinkHint}
                    </div>
                    <div className="muted station-link-card__hint">
                      {t.qrLifetime}
                    </div>
                    {usingLocalPublicUrl ? (
                      <div className="alert station-link-card__warning">
                        {t.devLinkWarning}
                      </div>
                    ) : null}
                  </div>
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
                    onClick={async () => {
                      setPairingError(null);
                      setPairingLoading(true);
                      try {
                        const next = await createDevicePairingSession(deviceId, {
                          forceNew: true,
                        });
                        setPairing(next);
                      } catch {
                        setPairingError(t.pairingError);
                      } finally {
                        setPairingLoading(false);
                      }
                    }}
                  >
                    {t.qrRefresh}
                  </Button>

                  <Button
                    variant="ghost"
                    className="station-actions__button"
                    onClick={() => {
                      if (!pairUrl) return;
                      window.open(pairUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    {t.openPairLink}
                  </Button>
                </div>
              </div>

              <p className="muted station-pairing__hint">
                {t.directLoginHint}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
