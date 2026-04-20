import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Brain, Globe, Moon, Sparkles, Sun } from "lucide-react";
import { Link } from "react-router-dom";

type Locale = "ru" | "kk" | "en";
type Theme = "dark" | "light";

type BodyPartKey =
  | "head"
  | "neck"
  | "chest"
  | "belly"
  | "back"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";

const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:4000";

const copy = {
  ru: {
    title: "Где у вас болит?",
    subtitle: "Нажмите на часть тела и опишите симптомы.",
    back: "Назад",
    lang: "Язык",
    theme: "Тема",
    aiTitle: "AI‑подсказка (демо)",
    aiHint:
      "Это не диагноз. При серьёзных симптомах вызывайте скорую или обратитесь к врачу.",
    selectPart: "Выберите часть тела",
    symptomsLabel: "Симптомы (необязательно)",
    painLabel: "Уровень боли",
    symptomsPh: "Например: боль острая, температура 38, тошнота…",
    askBtn: "Спросить",
    loading: "Думаю…",
    parts: {
      head: "Голова",
      neck: "Шея",
      chest: "Грудь",
      belly: "Живот",
      back: "Спина",
      leftArm: "Левая рука",
      rightArm: "Правая рука",
      leftLeg: "Левая нога",
      rightLeg: "Правая нога",
    },
  },
  kk: {
    title: "Қай жеріңіз ауырады?",
    subtitle: "Дене бөлігін таңдаңыз және симптомдарды жазыңыз.",
    back: "Артқа",
    lang: "Тіл",
    theme: "Тақырып",
    aiTitle: "AI‑кеңес (демо)",
    aiHint:
      "Бұл диагноз емес. Қауіпті белгілер болса — жедел жәрдем шақырыңыз немесе дәрігерге көрініңіз.",
    selectPart: "Дене бөлігін таңдаңыз",
    symptomsLabel: "Симптомдар (міндетті емес)",
    painLabel: "Ауырсыну деңгейі",
    symptomsPh: "Мысалы: өткір ауырсыну, температура 38, жүрек айну…",
    askBtn: "Сұрау",
    loading: "Ойлануда…",
    parts: {
      head: "Бас",
      neck: "Мойын",
      chest: "Кеуде",
      belly: "Іш",
      back: "Арқа",
      leftArm: "Сол қол",
      rightArm: "Оң қол",
      leftLeg: "Сол аяқ",
      rightLeg: "Оң аяқ",
    },
  },
  en: {
    title: "Where does it hurt?",
    subtitle: "Tap a body part and describe symptoms.",
    back: "Back",
    lang: "Language",
    theme: "Theme",
    aiTitle: "AI guidance (demo)",
    aiHint:
      "Not a diagnosis. If symptoms are severe, seek urgent medical care.",
    selectPart: "Select a body part",
    symptomsLabel: "Symptoms (optional)",
    painLabel: "Pain level",
    symptomsPh: "Example: sharp pain, fever 38C, nausea…",
    askBtn: "Ask",
    loading: "Thinking…",
    parts: {
      head: "Head",
      neck: "Neck",
      chest: "Chest",
      belly: "Belly",
      back: "Back",
      leftArm: "Left arm",
      rightArm: "Right arm",
      leftLeg: "Left leg",
      rightLeg: "Right leg",
    },
  },
} as const;

type Hotspot = {
  id: string;
  key: BodyPartKey;
  position: string;
  normal: string;
};

const hotspots: Hotspot[] = [
  { id: "hotspot-1", key: "head", position: "0m 1.75m 0.02m", normal: "0 1 0" },
  { id: "hotspot-2", key: "neck", position: "0m 1.55m 0.02m", normal: "0 1 0" },
  { id: "hotspot-3", key: "chest", position: "0m 1.35m 0.05m", normal: "0 1 0" },
  { id: "hotspot-4", key: "belly", position: "0m 1.05m 0.05m", normal: "0 1 0" },
  { id: "hotspot-5", key: "back", position: "0m 1.2m -0.25m", normal: "0 0 -1" },
  { id: "hotspot-6", key: "leftArm", position: "-0.45m 1.25m 0.02m", normal: "-1 0 0" },
  { id: "hotspot-7", key: "rightArm", position: "0.45m 1.25m 0.02m", normal: "1 0 0" },
  { id: "hotspot-8", key: "leftLeg", position: "-0.22m 0.45m 0m", normal: "-1 0 0" },
  { id: "hotspot-9", key: "rightLeg", position: "0.22m 0.45m 0m", normal: "1 0 0" },
];

export default function BodyMap() {
  const [theme, setTheme] = useState<Theme>(() => {
    const v = window.localStorage.getItem("ha_theme");
    return v === "light" ? "light" : "dark";
  });
  const [locale, setLocale] = useState<Locale>(() => {
    const v = window.localStorage.getItem("ha_locale");
    if (v === "en" || v === "kk" || v === "ru") return v;
    return "ru";
  });

  const t = copy[locale];

  const [selected, setSelected] = useState<BodyPartKey | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [painLevel, setPainLevel] = useState(5);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const viewerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem("ha_theme", theme);
  }, [theme]);
  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
    document.documentElement.lang = locale === "kk" ? "kk" : locale;
  }, [locale]);

  const pageBg =
    theme === "dark"
      ? "bg-slate-950 text-slate-100"
      : "bg-sky-50 text-slate-900";
  const panel =
    theme === "dark"
      ? "bg-white/5 border-white/10"
      : "bg-white/85 border-slate-200";
  const muted = theme === "dark" ? "text-slate-300" : "text-slate-600";

  const onAsk = async () => {
    if (!selected) return;
    setLoading(true);
    setAnswer(null);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bodyPart: selected,
          symptoms,
          painLevel,
          locale,
        }),
      });

      const data = (await res.json()) as { answer?: string };
      if (!res.ok || !data?.answer) {
        throw new Error("triage_failed");
      }

      setAnswer(data.answer);
    } catch {
      setError("AI временно недоступен. Попробуйте чуть позже.");
    } finally {
      setLoading(false);
    }
  };

  const modelSrc =
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb";

  const title = useMemo(() => t.title, [t.title]);

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <style>{`
        .hotspot {
          width: 22px;
          height: 22px;
          background: #0ea5e9;
          border: 3px solid rgba(255,255,255,0.95);
          border-radius: 999px;
          box-shadow: 0 0 24px rgba(14,165,233,0.55);
          cursor: pointer;
          transition: transform .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .hotspot:hover {
          transform: scale(1.18);
          background: #22c55e;
          box-shadow: 0 0 28px rgba(34,197,94,0.55);
        }
        .annotation {
          position: absolute;
          background: rgba(2,6,23,0.92);
          color: white;
          padding: 7px 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transform: translate(-50%, -140%);
          transition: opacity .18s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,.35);
        }
        .hotspot:hover + .annotation { opacity: 1; }
      `}</style>

      <div className="fixed inset-x-0 top-4 z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <Link
            to="/"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${panel}`}
          >
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>

          <div className="flex items-center gap-2">
            <div className={`flex items-center rounded-full border p-1 ${panel}`}>
              {(["ru", "kk", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition ${
                    locale === l
                      ? "bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-950"
                      : ""
                  }`}
                  title={`${t.lang}: ${l.toUpperCase()}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
              className={`h-10 w-10 rounded-full border inline-flex items-center justify-center shrink-0 ${panel}`}
              title={t.theme}
            >
              {theme === "dark" ? <Sun className="h-4 w-4 block" /> : <Moon className="h-4 w-4 block" />}
            </button>
          </div>
        </div>
      </div>

      <header className="pt-20 pb-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-sky-400">
            <Globe className="h-3.5 w-3.5" />
            Body Map
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-semibold">{title}</h1>
          <p className={`mt-3 ${muted} max-w-2xl`}>{t.subtitle}</p>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pb-10 grid lg:grid-cols-[1.35fr_.65fr] gap-4">
        <div className={`rounded-3xl border overflow-hidden ${panel}`}>
          <model-viewer
            ref={(el: HTMLElement | null) => {
              viewerRef.current = el;
            }}
            src={modelSrc}
            alt="3D human model"
            auto-rotate
            rotation-per-second="25%"
            camera-controls
            touch-action="pan-y"
            shadow-intensity="2"
            exposure="1"
            camera-orbit="0deg 80deg 130%"
            field-of-view="30deg"
            interaction-prompt="none"
            style={{ width: "100%", height: "min(74vh, 720px)", background: theme === "dark" ? "#0b1220" : "white" }}
          >
            {hotspots.map((h) => (
              <React.Fragment key={h.id}>
                <button
                  className="hotspot"
                  slot={h.id}
                  data-position={h.position}
                  data-normal={h.normal}
                  onClick={() => {
                    setSelected(h.key);
                    setAnswer(null);
                  }}
                />
                <div className="annotation">{t.parts[h.key]}</div>
              </React.Fragment>
            ))}
          </model-viewer>
        </div>

        <aside className={`rounded-3xl border p-5 ${panel}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                {t.aiTitle}
              </div>
              <p className={`mt-2 text-sm ${muted}`}>{t.aiHint}</p>
            </div>
            <Brain className="h-5 w-5 text-sky-400" />
          </div>

          <div className="mt-5 space-y-3">
            <div className={`text-sm font-semibold ${selected ? "" : muted}`}>
              {selected ? t.parts[selected] : t.selectPart}
            </div>

            <label className="block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              {t.symptomsLabel}
            </label>
            <div>
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2">
                <span>{t.painLabel}</span>
                <span className="text-emerald-400">{painLevel}/10</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={4}
              placeholder={t.symptomsPh}
              className={`w-full rounded-2xl border px-3 py-2 text-sm outline-none ${
                theme === "dark"
                  ? "bg-slate-950/50 border-white/10 placeholder:text-slate-500"
                  : "bg-white border-slate-200 placeholder:text-slate-400"
              }`}
            />

            <button
              type="button"
              onClick={onAsk}
              disabled={!selected || loading}
              className="w-full rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-sky-400 to-emerald-400 text-slate-950"
            >
              {loading ? t.loading : t.askBtn}
            </button>

            {error && (
              <div className="mt-3 rounded-2xl border p-3 text-sm bg-red-500/10 border-red-300/30 text-red-200">
                {error}
              </div>
            )}

            {answer && (
              <div
                className={`mt-3 rounded-2xl border p-3 text-sm leading-relaxed ${
                  theme === "dark"
                    ? "bg-slate-950/40 border-white/10 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                {answer}
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

