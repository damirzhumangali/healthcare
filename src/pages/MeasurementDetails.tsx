import { useMemo, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { getMeasurementById } from "../lib/measurementsStore";

type Locale = "ru" | "kk" | "en";

const copy = {
  ru: {
    title: "Детали измерения",
    notFound: "Измерение не найдено",
    back: "Назад",
 indicators: "Показатели",
    pressure: "Давление",
    temperature: "Температура",
    pulse: "Пульс",
    spo2: "SpO₂",
    note: "Заметка",
  },
  kk: {
    title: "Өлшеу деректері",
    notFound: "Өлшеу табылмады",
    back: "Артқа",
    indicators: "Көрсеткіштер",
    pressure: "Қысым",
    temperature: "Температура",
    pulse: "Пульс",
    spo2: "SpO₂",
    note: "Ескерту",
  },
  en: {
    title: "Measurement Details",
    notFound: "Measurement Not Found",
    back: "Back",
    indicators: "Indicators",
    pressure: "Pressure",
    temperature: "Temperature",
    pulse: "Pulse",
    spo2: "SpO₂",
    note: "Note",
  },
} as const;

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function MeasurementDetails() {
  const { id } = useParams();
  
  const [locale, setLocale] = useState<Locale>(() => {
    const v = window.localStorage.getItem("ha_locale");
    if (v === "en" || v === "kk" || v === "ru") return v;
    return "ru";
  });

  const t = copy[locale];

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  const m = useMemo(() => {
    if (!id) return null;
    return getMeasurementById(id);
  }, [id]);

  if (!m) {
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

        <Card>
          <div className="stack">
            <h1 className="h2">{t.notFound}</h1>
            <Link to="/app">
              <Button variant="ghost">{t.back}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

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
            <p className="muted" style={{ margin: 0 }}>{fmtDate(m.createdAt)}</p>
          </div>
          <Link to="/app">
            <Button variant="ghost">{t.back}</Button>
          </Link>
        </div>

        <Card>
          <div className="stack">
            <div style={{ fontWeight: 700 }}>{t.indicators}</div>

            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
                {t.pressure}: <b>{m.systolic}/{m.diastolic}</b>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
                {t.temperature}: <b>{m.tempC}°C</b>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
                {t.pulse}: <b>{m.hr}</b>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
                {t.spo2}: <b>{m.spo2}%</b>
              </div>
            </div>

            {m.note ? <p className="muted" style={{ margin: 0 }}>{t.note}: {m.note}</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
