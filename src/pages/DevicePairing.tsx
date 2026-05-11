import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import {
  approveDevicePairingSession,
  fetchDevicePairingSession,
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
      "После подтверждения станция привяжет текущий аккаунт пациента и сможет показать измерения.",
    account: "Аккаунт",
    confirm: "Подтвердить вход на планшете",
    confirming: "Подтверждаем...",
    success: "Планшет подтвержден",
    successDesc:
      "Возвращайтесь к станции. После синхронизации там можно будет запускать измерения.",
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
      "Растағаннан кейін станция ағымдағы пациент аккаунтын байланыстырып, өлшеулерді көрсете алады.",
    account: "Аккаунт",
    confirm: "Планшетке кіруді растау",
    confirming: "Расталуда...",
    success: "Планшет расталды",
    successDesc:
      "Станцияға қайта оралыңыз. Синхрондаудан кейін өлшеуді бастауға болады.",
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
      "After confirmation the station will link the current patient account and can show measurements.",
    account: "Account",
    confirm: "Confirm sign-in on tablet",
    confirming: "Confirming...",
    success: "Tablet confirmed",
    successDesc:
      "Return to the station. Once it syncs, measurements can be started there.",
    alreadyApproved: "This station is already linked to a patient account.",
    openStation: "Open station",
    approveError: "Failed to confirm sign-in. Try again.",
  },
} as const;

export default function DevicePairing() {
  const nav = useNavigate();
  const location = useLocation();
  const { deviceId = "", pairingToken = "" } = useParams();

  const [locale, setLocale] = useState<Locale>(() => {
    const value = window.localStorage.getItem("ha_locale");
    if (value === "en" || value === "kk" || value === "ru") return value;
    return "ru";
  });
  const [session, setSession] = useState<DevicePairingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const t = copy[locale];
  const currentUser = useMemo(() => getCurrentUser(), []);
  const authed = hasSession() && Boolean(currentUser);
  const nextUrl = `${location.pathname}${location.search}`;

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  useEffect(() => {
    if (loading) return;
    if (authed) return;
    if (!session || session.status !== "waiting") return;

    nav(`/login?next=${encodeURIComponent(nextUrl)}`, { replace: true });
  }, [authed, loading, nav, nextUrl, session]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      try {
        const next = await fetchDevicePairingSession(pairingToken);
        if (!cancelled) {
          setSession(next);
        }
      } catch {
        if (!cancelled) {
          setErr(t.invalid);
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!deviceId || !pairingToken) {
      setErr(t.invalid);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [deviceId, pairingToken, t.invalid]);

  if (loading) {
    return (
      <div className="center min-h-screen">
        <Card>
          <div className="stack">
            <div className="kicker">{t.kicker}</div>
            <h1 className="h2">{t.loading}</h1>
          </div>
        </Card>
      </div>
    );
  }

  if (!authed && session?.status === "waiting") {
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
              {t.device}: <b>{deviceId}</b>
            </p>
          </div>

          {err ? <div className="alert">{err}</div> : null}

          {session?.status === "expired" ? (
            <div className="stack">
              <h2 className="h2">{t.expired}</h2>
              <Link to={`/scan/${deviceId}`}>
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
              <Link to={`/scan/${deviceId}`}>
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

              {err ? <div className="alert">{err}</div> : null}

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
                    setSubmitting(true);

                    try {
                      const next = await approveDevicePairingSession(
                        pairingToken,
                        deviceId,
                        currentUser
                      );
                      setSession(next);
                    } catch {
                      setErr(t.approveError);
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
