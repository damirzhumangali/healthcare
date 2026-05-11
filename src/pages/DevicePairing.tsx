import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import {
  approveDevicePairingSession,
  type DevicePairingSession,
} from "../lib/devicePairing";
import { getCurrentUser, hasSession } from "../lib/auth";

type Locale = "ru" | "kk" | "en";

const copy = {
  ru: {
    kicker: "QR -> ТЕЛЕФОН",
    title: "Подтверждение входа на станции",
    loading: "Проверяем QR-сессию...",
    redirecting: "Перенаправляем на вход...",
    redirectingDesc: "После авторизации вы вернетесь к подтверждению станции автоматически.",
    invalid: "Не удалось открыть QR-сессию. Попросите станцию показать новый QR-код.",
    expired: "Этот QR-код уже истек. Вернитесь к планшету и создайте новый.",
    device: "Станция",
    loginNeeded: "Нужен вход в аккаунт",
    loginNeededDesc:
      "Чтобы войти на планшете от имени пациента, сначала авторизуйтесь на телефоне.",
    signIn: "Войти",
    ready: "Готово к подтверждению",
    readyDesc:
      "После подтверждения станция привяжет текущий аккаунт пациента и сможет принимать измерения с датчиков.",
    account: "Аккаунт",
    confirm: "Подтвердить вход на планшете",
    confirming: "Подтверждаем...",
    success: "Планшет подтвержден",
    successDesc:
      "Возвращайтесь к станции. После синхронизации там можно будет ждать измерения от ESP32.",
    alreadyApproved: "Эта станция уже связана с аккаунтом пациента.",
    openStation: "Открыть станцию",
    approveError: "Не получилось подтвердить вход. Попробуйте еще раз.",
  },
  kk: {
    kicker: "QR -> ТЕЛЕФОН",
    title: "Станцияға кіруді растау",
    loading: "QR сессиясын тексеріп жатырмыз...",
    redirecting: "Кіру бетіне жіберіп жатырмыз...",
    redirectingDesc: "Авторизациядан кейін станцияны растау бетіне автоматты түрде қайтасыз.",
    invalid: "QR сессиясын ашу мүмкін болмады. Планшеттен жаңа QR код сұраңыз.",
    expired: "Бұл QR кодтың мерзімі бітті. Планшетке оралып, жаңасын жасаңыз.",
    device: "Станция",
    loginNeeded: "Аккаунтқа кіру керек",
    loginNeededDesc:
      "Планшетке науқас атынан кіру үшін алдымен телефонда авторизациядан өтіңіз.",
    signIn: "Кіру",
    ready: "Растауға дайын",
    readyDesc:
      "Растағаннан кейін станция ағымдағы пациент аккаунтын байланыстырып, датчик өлшемдерін қабылдай алады.",
    account: "Аккаунт",
    confirm: "Планшетке кіруді растау",
    confirming: "Расталуда...",
    success: "Планшет расталды",
    successDesc:
      "Станцияға қайта оралыңыз. Синхрондаудан кейін ESP32 өлшеулерін күтуге болады.",
    alreadyApproved: "Бұл станция пациент аккаунтымен әлдеқашан байланыстырылған.",
    openStation: "Станцияны ашу",
    approveError: "Кіруді растау мүмкін болмады. Қайта көріңіз.",
  },
  en: {
    kicker: "QR -> PHONE",
    title: "Confirm station sign-in",
    loading: "Checking the QR session...",
    redirecting: "Redirecting to sign in...",
    redirectingDesc: "After authentication you will be returned to station confirmation automatically.",
    invalid: "Could not open the QR session. Ask the station to show a new QR code.",
    expired: "This QR code has expired. Go back to the tablet and generate a new one.",
    device: "Station",
    loginNeeded: "Sign in required",
    loginNeededDesc:
      "To sign the tablet in as the patient, first authenticate on your phone.",
    signIn: "Sign In",
    ready: "Ready to confirm",
    readyDesc:
      "After confirmation the station will link the current patient account and can accept sensor measurements.",
    account: "Account",
    confirm: "Confirm sign-in on tablet",
    confirming: "Confirming...",
    success: "Tablet confirmed",
    successDesc:
      "Return to the station. Once it syncs, it can wait for incoming ESP32 measurements.",
    alreadyApproved: "This station is already linked to a patient account.",
    openStation: "Open station",
    approveError: "Failed to confirm sign-in. Try again.",
  },
} as const;

export default function DevicePairing() {
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams();
  const search = new URLSearchParams(location.search);

  const tokenFromQuery = search.get("token") || "";
  const tokenFromPath = params.pairingToken || "";
  const pairingToken = tokenFromQuery || tokenFromPath;
  const fallbackDeviceId = params.deviceId || search.get("deviceId") || "";

  const [locale, setLocale] = useState<Locale>(() => {
    const value = window.localStorage.getItem("ha_locale");
    if (value === "en" || value === "kk" || value === "ru") return value;
    return "ru";
  });
  const [session, setSession] = useState<DevicePairingSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(() => !pairingToken);
  const [expired, setExpired] = useState(false);
  const [autoApproveTried, setAutoApproveTried] = useState(false);

  const t = copy[locale];
  const currentUser = useMemo(() => getCurrentUser(), []);
  const authed = hasSession() && Boolean(currentUser);
  const nextUrl = `${location.pathname}${location.search}`;
  const stationDeviceId = session?.deviceId || fallbackDeviceId;

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  useEffect(() => {
    setAutoApproveTried(false);
    setSession(null);
    setErr(null);
    setExpired(false);
    setInvalid(!pairingToken);
  }, [pairingToken]);

  useEffect(() => {
    if (!pairingToken) return;
    if (authed) return;

    nav(`/login?next=${encodeURIComponent(nextUrl)}`, { replace: true });
  }, [authed, nav, nextUrl, pairingToken]);

  useEffect(() => {
    if (!authed || !pairingToken || session?.status === "approved" || expired || invalid) {
      return;
    }

    if (submitting || autoApproveTried) {
      return;
    }

    let cancelled = false;
    setAutoApproveTried(true);
    setSubmitting(true);
    setErr(null);

    void approveDevicePairingSession(pairingToken, currentUser)
      .then((next) => {
        if (cancelled) return;
        setSession(next);
        setTimeout(() => {
          if (!cancelled) nav("/app", { replace: true });
        }, 1500);
      })
      .catch((error) => {
        if (cancelled) return;

        const status =
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          typeof (error as { status?: unknown }).status === "number"
            ? Number((error as { status?: unknown }).status)
            : NaN;

        if (status === 404) {
          setInvalid(true);
          setErr(t.invalid);
        } else if (status === 410 || status === 409) {
          setExpired(true);
          setErr(null);
        } else if (status === 401) {
          setErr(t.loginNeededDesc);
        } else {
          setErr(t.approveError);
        }
      })
      .finally(() => {
        if (cancelled) return;
        setSubmitting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    authed,
    autoApproveTried,
    currentUser,
    expired,
    invalid,
    pairingToken,
    session?.status,
    submitting,
    t.approveError,
    t.invalid,
    t.loginNeededDesc,
  ]);

  if (invalid) {
    return (
      <div className="center min-h-screen">
        <Card>
          <div className="stack">
            <div className="kicker">{t.kicker}</div>
            <h1 className="h2">{t.invalid}</h1>
          </div>
        </Card>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="center min-h-screen">
        <Card>
          <div className="stack">
            <div className="kicker">{t.kicker}</div>
            <h1 className="h2">{t.redirecting}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {t.redirectingDesc}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const accountLabel = currentUser?.name || currentUser?.email || "HealthAssist";
  const approvedLabel = session?.user?.name || session?.user?.email || accountLabel;
  const stationLink = stationDeviceId ? `/scan/${stationDeviceId}` : "/scan/device-001";

  return (
    <div className="center min-h-screen relative">
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
        <div className="stack">
          <div>
            <div className="kicker">{t.kicker}</div>
            <h1 className="h1">{t.title}</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              {t.device}: <b>{stationDeviceId || "device-001"}</b>
            </p>
          </div>

          {err ? <div className="alert">{err}</div> : null}

          {expired || session?.status === "expired" || session?.status === "closed" ? (
            <div className="stack">
              <h2 className="h2">{t.expired}</h2>
              <Link to={stationLink}>
                <Button variant="ghost">{t.openStation}</Button>
              </Link>
            </div>
          ) : session?.status === "approved" ? (
            <div className="stack">
              <h2 className="h2">{t.success}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {t.successDesc}
              </p>
              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.12)",
                }}
              >
                {t.account}: <b>{approvedLabel}</b>
              </div>
              <p className="muted" style={{ margin: 0 }}>
                {t.alreadyApproved}
              </p>
              <Link to={stationLink}>
                <Button>{t.openStation}</Button>
              </Link>
            </div>
          ) : !authed ? (
            <div className="stack">
              <h2 className="h2">{t.loginNeeded}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {t.loginNeededDesc}
              </p>
              <div className="row">
                <Button
                  onClick={() =>
                    nav(`/login?next=${encodeURIComponent(nextUrl)}`)
                  }
                >
                  {t.signIn}
                </Button>
              </div>
            </div>
          ) : (
            <div className="stack">
              <h2 className="h2">{t.ready}</h2>
              <p className="muted" style={{ margin: 0 }}>
                {t.readyDesc}
              </p>

              <div
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.12)",
                }}
              >
                {t.account}: <b>{accountLabel}</b>
              </div>

              <div className="row">
                <Button
                  onClick={async () => {
                    setErr(null);
                    setExpired(false);
                    setInvalid(false);
                    setAutoApproveTried(true);
                    setSubmitting(true);

                    try {
                      const next = await approveDevicePairingSession(
                        pairingToken,
                        currentUser
                      );
                      setSession(next);
                      setTimeout(() => nav("/app", { replace: true }), 1500);
                    } catch (error) {
                      const status =
                        typeof error === "object" &&
                        error !== null &&
                        "status" in error &&
                        typeof (error as { status?: unknown }).status === "number"
                          ? Number((error as { status?: unknown }).status)
                          : NaN;

                      if (status === 404) {
                        setInvalid(true);
                        setErr(t.invalid);
                      } else if (status === 410 || status === 409) {
                        setExpired(true);
                        setErr(null);
                      } else {
                        setErr(t.approveError);
                      }
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {submitting ? t.confirming : t.confirm}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
