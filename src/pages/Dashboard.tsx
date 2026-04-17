import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { fetchMyMeasurements, createMeasurement } from "../lib/apiMeasurements";
import { createNewMyTicket, getMyTicket, getOrCreateMyTicket, type OnlineTicketView } from "../lib/onlineTicket";

type Locale = "ru" | "kk" | "en";

const copy = {
  ru: {
    title: "Кабинет пациента",
    subtitle: "Данные приходят с backend (симуляция машинки).",
    newMeasurement: "Новое измерение",
    qrStation: "К QR-станции",
    onlineTicket: "Онлайн-талон",
    refresh: "Обновить",
    noTicket: "У вас пока нет активного талона.",
    takeNewTicket: "Взять новый талон",
    yourNumber: "Ваш номер",
    nowCalling: "Сейчас вызывают",
    ahead: "Перед вами",
    waiting: "Ожидание",
    minutes: "мин",
    invited: "Ваш номер вызывают",
    waitForCall: "Ожидайте вызова",
    ticketMissed: "Талон пропущен",
    issued: "Выдан",
    history: "История",
    loading: "Загрузка...",
    noMeasurements: "Пока нет измерений. Нажми Новое измерение или зайди на QR-станцию.",
    pressure: "Давление",
    temp: "Темп",
    pulse: "Пульс",
    spo2: "SpO₂",
    device: "device",
    measurementError: "Не удалось загрузить измерения. Проверь backend :4000.",
    createMeasurementError: "Не получилось создать измерение. Проверь backend :4000.",
  },
  kk: {
    title: "Науқас кабинеты",
    subtitle: "Деректер backend-тен келеді (машина симуляциясы).",
    newMeasurement: "Жаңа өлшеу",
    qrStation: "QR-станциясына",
    onlineTicket: "Онлайн-талон",
    refresh: "Жаңарту",
    noTicket: "Сізде әлі белсенді талон жоқ.",
    takeNewTicket: "Жаңа талон алу",
    yourNumber: "Сіздің нөміріңіз",
    nowCalling: "Қазір шақырады",
    ahead: "Алдыңызда",
    waiting: "Күту",
    minutes: "мин",
    invited: "Сіздің нөміріңізді шақырады",
    waitForCall: "Шақыруды күтіңіз",
    ticketMissed: "Талон өткізіп алды",
    issued: "Шығарылған",
    history: "Тарих",
    loading: "Жүктелуде...",
    noMeasurements: "Әлі өлшеулер жоқ. Жаңа өлшеу батырмасын басыңыз немесе QR-станциясына кіріңіз.",
    pressure: "Қысым",
    temp: "Темп",
    pulse: "Пульс",
    spo2: "SpO₂",
    device: "device",
    measurementError: "Өлшеулерді жүктей алмады. Backend-ті тексеріңіз :4000.",
    createMeasurementError: "Өлшеуді жасай алмады. Backend-ті тексеріңіз :4000.",
  },
  en: {
    title: "Patient Dashboard",
    subtitle: "Data comes from backend (simulation of device).",
    newMeasurement: "New Measurement",
    qrStation: "To QR Station",
    onlineTicket: "Online Ticket",
    refresh: "Refresh",
    noTicket: "You don't have an active ticket yet.",
    takeNewTicket: "Take New Ticket",
    yourNumber: "Your Number",
    nowCalling: "Now Calling",
    ahead: "Ahead",
    waiting: "Waiting",
    minutes: "min",
    invited: "Your number is being called",
    waitForCall: "Wait for call",
    ticketMissed: "Ticket missed",
    issued: "Issued",
    history: "History",
    loading: "Loading...",
    noMeasurements: "No measurements yet. Click New Measurement or go to QR Station.",
    pressure: "Pressure",
    temp: "Temp",
    pulse: "Pulse",
    spo2: "SpO₂",
    device: "device",
    measurementError: "Failed to load measurements. Check backend :4000.",
    createMeasurementError: "Failed to create measurement. Check backend :4000.",
  },
} as const;

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const nav = useNavigate();
  const [locale, setLocale] = useState<Locale>(() => {
    const v = window.localStorage.getItem("ha_locale");
    if (v === "en" || v === "kk" || v === "ru") return v;
    return "ru";
  });

  const t = copy[locale];

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ticket, setTicket] = useState<OnlineTicketView | null>(null);

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  function refreshTicket() {
    setTicket(getMyTicket());
  }

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await fetchMyMeasurements();
      setItems(data.items ?? []);
    } catch {
      setErr("Не удалось загрузить измерения. Проверь backend :4000.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    refreshTicket();

    const timer = window.setInterval(() => {
      refreshTicket();
    }, 15000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="container relative">
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

      <div className="stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>{t.title}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {t.subtitle}
            </p>
          </div>

          <div className="row">
            <Button variant="ghost" onClick={() => nav("/appointments/new")}>
              Записаться к врачу
            </Button>

            <Button
              onClick={async () => {
                setErr(null);
                try {
                  await createMeasurement("device-001");
                  await load();
                } catch {
                  setErr(t.createMeasurementError);
                }
              }}
            >
              {t.newMeasurement}
            </Button>

            <Button variant="ghost" onClick={() => nav("/scan/device-001")}>
              {t.qrStation}
            </Button>
          </div>
        </div>

        {err ? <div className="alert">{err}</div> : null}

        <Card>
          <div className="stack">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>{t.onlineTicket}</h2>
              <Button variant="ghost" onClick={refreshTicket}>
                {t.refresh}
              </Button>
            </div>

            {!ticket ? (
              <div className="stack">
                <p className="muted" style={{ margin: 0 }}>
                  {t.noTicket}
                </p>
                <div className="row">
                  <Button
                    onClick={() => {
                      const created = getOrCreateMyTicket();
                      setTicket(created);
                    }}
                  >
                    {t.takeNewTicket}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="stack">
                <div className="grid">
                  <div className="metric">
                    <div className="metric__label">{t.yourNumber}</div>
                    <div className="metric__value">A-{ticket.ticketNumber}</div>
                  </div>
                  <div className="metric">
                    <div className="metric__label">{t.nowCalling}</div>
                    <div className="metric__value">A-{ticket.servingNow}</div>
                  </div>
                  <div className="metric">
                    <div className="metric__label">{t.ahead}</div>
                    <div className="metric__value">{ticket.peopleAhead}</div>
                  </div>
                  <div className="metric">
                    <div className="metric__label">{t.waiting}</div>
                    <div className="metric__value">~{ticket.etaMinutes} {t.minutes}</div>
                  </div>
                </div>

                <div className="row">
                  <Button
                    onClick={() => {
                      const next = createNewMyTicket();
                      setTicket(next);
                    }}
                  >
                    {t.takeNewTicket}
                  </Button>
                  <span className={`badge ${
                    ticket.status === "invited"
                      ? "badge--ok"
                      : ticket.status === "waiting"
                        ? "badge--warn"
                        : "badge--danger"
                  }`}>
                    <span className="badge__dot" />
                    {ticket.status === "invited"
                      ? t.invited
                      : ticket.status === "waiting"
                        ? t.waitForCall
                        : t.ticketMissed}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {t.issued}: {fmtDate(ticket.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="stack">
            <h2 className="h2" style={{ margin: 0 }}>{t.history}</h2>

            {loading ? (
              <p className="muted" style={{ margin: 0 }}>{t.loading}</p>
            ) : items.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {t.noMeasurements}
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((m) => (
                  <Link
                    key={m.id}
                    to={`/app/measurements/${m.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div className="muted" style={{ fontSize: 13 }}>
                            {fmtDate(m.createdAt)} • {t.device}: {m.deviceId}
                          </div>
                          <div style={{ fontWeight: 700, marginTop: 2 }}>
                            {t.pressure}: {m.systolic}/{m.diastolic} • {t.temp}: {m.tempC}°C
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {t.pulse} {m.hr} • {t.spo2} {m.spo2}%
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
