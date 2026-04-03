import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { getToken } from "../lib/auth";
import { createMeasurement } from "../lib/apiMeasurements";

type Locale = "ru" | "kk" | "en";

const copy = {
  ru: {
    kicker: "QR → СТАНЦИЯ",
    title: "Станция измерений",
    device: "Устройство",
    needLogin: "Нужен вход",
    needLoginDesc: "Чтобы начать измерение и сохранить результат — войди в аккаунт.",
    signIn: "Войти",
    register: "Регистрация",
    readyToMeasure: "Готово к измерению",
    readyToMeasureDesc: "Нажми кнопку — сервер создаст измерение как с датчиков, и оно появится в кабинете.",
    startMeasurement: "Начать измерение",
    measuring: "Измеряю...",
    openDashboard: "Открыть кабинет",
    measurementError: "Не получилось создать измерение. Проверь backend :4000 и попробуй ещё раз.",
  },
  kk: {
    kicker: "QR → СТАНЦИЯ",
    title: "Өлшеу станциясы",
    device: "Құрылғы",
    needLogin: "Кіру керек",
    needLoginDesc: "Өлшеуді бастау және нәтижені сақтау үшін аккаунтқа кіріңіз.",
    signIn: "Кіру",
    register: "Тіркелу",
    readyToMeasure: "Өлшеуге дайын",
    readyToMeasureDesc: "Батырманы басыңыз — сервер датчиктардан өлшеуді жасайды, ол кабинетте пайда болады.",
    startMeasurement: "Өлшеуді бастау",
    measuring: "Өлшенуде...",
    openDashboard: "Кабинетті ашу",
    measurementError: "Өлшеуді жасай алмады. Backend-ті тексеріңіз :4000 және қайтадан көріңіз.",
  },
  en: {
    kicker: "QR → STATION",
    title: "Measurement Station",
    device: "Device",
    needLogin: "Sign In Required",
    needLoginDesc: "To start measurement and save results - sign in to your account.",
    signIn: "Sign In",
    register: "Register",
    readyToMeasure: "Ready to Measure",
    readyToMeasureDesc: "Click the button - server will create measurement as from sensors, and it will appear in dashboard.",
    startMeasurement: "Start Measurement",
    measuring: "Measuring...",
    openDashboard: "Open Dashboard",
    measurementError: "Failed to create measurement. Check backend :4000 and try again.",
  },
} as const;

export default function ScanDevice() {
  const nav = useNavigate();
  const { deviceId = "device-001" } = useParams();
  const authed = !!getToken();
  
  const [locale, setLocale] = useState<Locale>(() => {
    const v = window.localStorage.getItem("ha_locale");
    if (v === "en" || v === "kk" || v === "ru") return v;
    return "ru";
  });

  const t = copy[locale];

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  return (
    <div className="center min-h-screen relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex rounded-full border border-white/20 overflow-hidden bg-slate-900/50 backdrop-blur-sm">
          {(["ru", "kk", "en"] as Locale[]).map((l) => (
            <button
              key={l}
              onClick={() => setLocale(l)}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                locale === l
                  ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <div className="stack">
          <div>
            <div className="kicker">{t.kicker}</div>
            <h1 className="h1">{t.title}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {t.device}: <b>{deviceId}</b>
            </p>
          </div>

          {!authed ? (
            <div className="stack">
              <h2 className="h2" style={{ marginTop: 6 }}>{t.needLogin}</h2>
              <p className="muted" style={{ marginTop: -6 }}>
                {t.needLoginDesc}
              </p>

              <div className="row">
                <Button onClick={() => nav("/login")}>{t.signIn}</Button>
                <Button variant="ghost" onClick={() => nav("/register")}>{t.register}</Button>
              </div>
            </div>
          ) : (
            <div className="stack">
              <h2 className="h2" style={{ marginTop: 6 }}>{t.readyToMeasure}</h2>
              <p className="muted" style={{ marginTop: -6 }}>
                {t.readyToMeasureDesc}
              </p>

              {err ? <div className="alert">{err}</div> : null}

              <div className="row">
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
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
