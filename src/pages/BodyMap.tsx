import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Brain, Moon, PersonStanding, Sparkles, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import Body3D from "../components/Body3D";
import { API_URL } from "../lib/apiBase";
import { getPublicSeo } from "../lib/publicSeo";
import { usePageSeo } from "../lib/seo";

type Locale = "ru" | "kk" | "en";
type Theme = "dark" | "light";
type BodySex = "male" | "female";

type BodyPartKey =
  | "head"
  | "neck"
  | "chest"
  | "breasts"
  | "belly"
  | "maleGroin"
  | "femalePelvis"
  | "back"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";

type RecommendationCopy = {
  readonly specialists: {
    readonly urologist: string;
    readonly mammologistGynecologist: string;
    readonly gynecologist: string;
    readonly obstetricGynecologist: string;
  };
  readonly recommendationReasons: {
    readonly pregnancy: string;
    readonly maleGroin: string;
    readonly breasts: string;
    readonly femalePelvis: string;
  };
};

type AnswerSection = {
  title?: string;
  content: string;
};

const MALE_PARTS: BodyPartKey[] = [
  "head",
  "neck",
  "chest",
  "belly",
  "maleGroin",
  "back",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
];

const FEMALE_PARTS: BodyPartKey[] = [
  "head",
  "neck",
  "chest",
  "breasts",
  "belly",
  "femalePelvis",
  "back",
  "leftArm",
  "rightArm",
  "leftLeg",
  "rightLeg",
];

const copy = {
  ru: {
    title: "Где у вас болит?",
    subtitle: "Вращайте модель и отметьте, где болит.",
    back: "Назад",
    lang: "Язык",
    theme: "Тема",
    rotateHint: "Вращайте 3D модель",
    aiTitle: "AI‑подсказка",
    aiHint:
      "Это не диагноз. При серьёзных симптомах вызывайте скорую или обратитесь к врачу.",
    sexLabel: "Пол",
    maleLabel: "Мужской",
    femaleLabel: "Женский",
    pregnancyLabel: "Беременна",
    pregnancyHint: "Если отмечено, рекомендация врача смещается к акушеру-гинекологу.",
    recommendationTitle: "Рекомендуемый специалист",
    recommendationHint: "Автоподбор учитывает выбранную анатомическую зону.",
    symptomsLabel: "Симптомы (необязательно)",
    painLabel: "Уровень боли",
    symptomsPh: "Например: боль острая, температура 38, тошнота…",
    askBtn: "Спросить",
    loading: "Думаю…",
    requestError: "AI временно недоступен. Попробуйте чуть позже.",
    specialists: {
      urologist: "Уролог",
      mammologistGynecologist: "Маммолог / Гинеколог",
      gynecologist: "Гинеколог",
      obstetricGynecologist: "Акушер-гинеколог",
    },
    recommendationReasons: {
      pregnancy: "беременность требует учёта акушерско-гинекологического профиля",
      maleGroin: "жалобы в паховой области и мочеполовой системе чаще относятся к урологии",
      breasts: "жалобы по молочным железам лучше оценивать у маммолога или гинеколога",
      femalePelvis: "жалобы в области малого таза чаще относятся к гинекологии",
    },
    parts: {
      head: "Голова",
      neck: "Шея",
      chest: "Грудь",
      breasts: "Молочные железы",
      belly: "Живот",
      maleGroin: "Паховая область",
      femalePelvis: "Малый таз / гинекология",
      back: "Спина",
      leftArm: "Левая рука",
      rightArm: "Правая рука",
      leftLeg: "Левая нога",
      rightLeg: "Правая нога",
    },
  },
  kk: {
    title: "Қай жеріңіз ауырады?",
    subtitle: "Модельді айналдырып, қай жеріңіз ауыратынын белгілеңіз.",
    back: "Артқа",
    lang: "Тіл",
    theme: "Тақырып",
    rotateHint: "3D модельді айналдырыңыз",
    aiTitle: "AI‑кеңес",
    aiHint:
      "Бұл диагноз емес. Қауіпті белгілер болса — жедел жәрдем шақырыңыз немесе дәрігерге көрініңіз.",
    sexLabel: "Жынысы",
    maleLabel: "Ер",
    femaleLabel: "Әйел",
    pregnancyLabel: "Жүкті",
    pregnancyHint: "Белгіленсе, маман ұсынысы акушер-гинекологқа ауысады.",
    recommendationTitle: "Ұсынылатын маман",
    recommendationHint: "Автоұсыныс таңдалған анатомиялық аймаққа сүйенеді.",
    symptomsLabel: "Симптомдар (міндетті емес)",
    painLabel: "Ауырсыну деңгейі",
    symptomsPh: "Мысалы: өткір ауырсыну, температура 38, жүрек айну…",
    askBtn: "Сұрау",
    loading: "Ойлануда…",
    requestError: "AI уақытша қолжетімсіз. Сәл кейінірек қайталап көріңіз.",
    specialists: {
      urologist: "Уролог",
      mammologistGynecologist: "Маммолог / Гинеколог",
      gynecologist: "Гинеколог",
      obstetricGynecologist: "Акушер-гинеколог",
    },
    recommendationReasons: {
      pregnancy: "жүктілік кезінде акушер-гинеколог профилін ескеру қажет",
      maleGroin: "шат аймағы мен несеп-жыныс шағымдары көбіне урологияға жатады",
      breasts: "сүт безі бойынша шағымдарды маммолог не гинеколог қарағаны дұрыс",
      femalePelvis: "кіші жамбас аймағындағы шағымдар көбіне гинекологияға жатады",
    },
    parts: {
      head: "Бас",
      neck: "Мойын",
      chest: "Кеуде",
      breasts: "Сүт бездері",
      belly: "Іш",
      maleGroin: "Шат аймағы",
      femalePelvis: "Кіші жамбас / гинекология",
      back: "Арқа",
      leftArm: "Сол қол",
      rightArm: "Оң қол",
      leftLeg: "Сол аяқ",
      rightLeg: "Оң аяқ",
    },
  },
  en: {
    title: "Where does it hurt?",
    subtitle: "Rotate the model and mark where it hurts.",
    back: "Back",
    lang: "Language",
    theme: "Theme",
    rotateHint: "Rotate the 3D model",
    aiTitle: "AI guidance",
    aiHint:
      "Not a diagnosis. If symptoms are severe, seek urgent medical care.",
    sexLabel: "Sex",
    maleLabel: "Male",
    femaleLabel: "Female",
    pregnancyLabel: "Pregnant",
    pregnancyHint: "If checked, the specialist recommendation shifts to obstetric gynecology.",
    recommendationTitle: "Suggested specialist",
    recommendationHint: "Autopick follows the selected anatomical zone.",
    symptomsLabel: "Symptoms (optional)",
    painLabel: "Pain level",
    symptomsPh: "Example: sharp pain, fever 38C, nausea…",
    askBtn: "Ask",
    loading: "Thinking…",
    requestError: "AI is temporarily unavailable. Please try again a bit later.",
    specialists: {
      urologist: "Urologist",
      mammologistGynecologist: "Mammologist / Gynecologist",
      gynecologist: "Gynecologist",
      obstetricGynecologist: "Obstetric gynecologist",
    },
    recommendationReasons: {
      pregnancy: "pregnancy should be reviewed with an obstetric gynecology specialist",
      maleGroin: "groin and genitourinary complaints usually point to urology",
      breasts: "breast complaints are best reviewed by a mammologist or gynecologist",
      femalePelvis: "pelvic complaints usually point to gynecology",
    },
    parts: {
      head: "Head",
      neck: "Neck",
      chest: "Chest",
      breasts: "Breasts",
      belly: "Belly",
      maleGroin: "Groin / genitals",
      femalePelvis: "Pelvis / gynecology",
      back: "Back",
      leftArm: "Left arm",
      rightArm: "Right arm",
      leftLeg: "Left leg",
      rightLeg: "Right leg",
    },
  },
} as const;

function cleanAnswerText(value: string) {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function parseAnswerSections(answer: string): AnswerSection[] {
  const sectionRegex = /\*\*([^*]+)\*\*\s*[-–—:]\s*/g;
  const sections: AnswerSection[] = [];
  let match: RegExpExecArray | null;
  let lastTitle: string | undefined;
  let lastContentStart = 0;

  while ((match = sectionRegex.exec(answer)) !== null) {
    const prefix = answer.slice(lastContentStart, match.index).trim();
    if (prefix) {
      sections.push({ title: lastTitle, content: prefix });
    }

    lastTitle = cleanAnswerText(match[1]);
    lastContentStart = sectionRegex.lastIndex;
  }

  const tail = answer.slice(lastContentStart).trim();
  if (tail) {
    sections.push({ title: lastTitle, content: tail });
  }

  if (sections.length === 0) return [{ content: answer }];
  return sections;
}

function getLocalSpecialistRecommendation(
  selected: BodyPartKey | null,
  sex: BodySex,
  pregnant: boolean,
  t: RecommendationCopy,
) {
  if (sex === "female" && pregnant) {
    return {
      specialty: t.specialists.obstetricGynecologist,
      reason: t.recommendationReasons.pregnancy,
    };
  }

  if (selected === "maleGroin") {
    return {
      specialty: t.specialists.urologist,
      reason: t.recommendationReasons.maleGroin,
    };
  }

  if (selected === "breasts") {
    return {
      specialty: t.specialists.mammologistGynecologist,
      reason: t.recommendationReasons.breasts,
    };
  }

  if (selected === "femalePelvis") {
    return {
      specialty: t.specialists.gynecologist,
      reason: t.recommendationReasons.femalePelvis,
    };
  }

  return null;
}

function AnswerContent({ answer }: { answer: string }) {
  return (
    <div className="space-y-3">
      {parseAnswerSections(answer).map((section, sectionIndex) => {
        const lines = section.content
          .replace(/\s+-\s+/g, "\n- ")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        return (
          <section key={`${section.title ?? "intro"}-${sectionIndex}`} className="space-y-1.5">
            {section.title && (
              <h3 className="text-sm font-semibold text-emerald-300">
                {section.title}
              </h3>
            )}

            {lines.map((line, lineIndex) => {
              const isBullet = line.startsWith("- ");
              const text = cleanAnswerText(isBullet ? line.slice(2) : line);

              return isBullet ? (
                <div key={lineIndex} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                  <p>{text}</p>
                </div>
              ) : (
                <p key={lineIndex}>{text}</p>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

export default function BodyMap() {
  const [theme, setTheme] = useState<Theme>(() => {
    const v = typeof window === "undefined" ? null : window.localStorage.getItem("ha_theme");
    return v === "light" ? "light" : "dark";
  });
  const [locale, setLocale] = useState<Locale>(() => {
    const v = typeof window === "undefined" ? null : window.localStorage.getItem("ha_locale");
    if (v === "en" || v === "kk" || v === "ru") return v;
    return "ru";
  });
  const [sex, setSex] = useState<BodySex>("male");
  const [pregnant, setPregnant] = useState(false);

  const t = copy[locale];

  const [selected, setSelected] = useState<BodyPartKey | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [painLevel, setPainLevel] = useState(5);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const seo = getPublicSeo("/body", locale);

  usePageSeo({
    title: seo.title,
    description: seo.description,
    path: "/body",
    locale,
  });

  useEffect(() => {
    window.localStorage.setItem("ha_theme", theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  const availableParts = useMemo(
    () => (sex === "female" ? FEMALE_PARTS : MALE_PARTS),
    [sex],
  );

  const localRecommendation = useMemo(
    () => getLocalSpecialistRecommendation(selected, sex, pregnant, t),
    [selected, sex, pregnant, t],
  );

  useEffect(() => {
    if (selected && !availableParts.includes(selected)) {
      setSelected(null);
      setAnswer(null);
      setError(null);
    }
  }, [availableParts, selected]);

  const pageBg =
    theme === "dark"
      ? "bg-[#02050c] text-slate-100"
      : "bg-white text-slate-900";
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
      const res = await fetch(`${API_URL}/api/triage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bodyPart: selected,
          symptoms,
          painLevel,
          locale,
          sex,
          pregnant: sex === "female" ? pregnant : false,
        }),
      });

      const data = (await res.json()) as { answer?: string };
      if (!res.ok || !data?.answer) {
        throw new Error("triage_failed");
      }

      setAnswer(data.answer);
    } catch {
      setError(t.requestError);
    } finally {
      setLoading(false);
    }
  };

  const title = useMemo(() => t.title, [t.title]);
  const recommendationTone = theme === "dark" ? "text-emerald-100" : "text-emerald-900";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageBg}`}>
      <div className="relative z-20 pt-4">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-3">
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

      <header className="pt-8 pb-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-sky-400">
            <PersonStanding className="h-3.5 w-3.5" />
            3D Body
          </div>
          <h1 className="mt-3 text-3xl md:text-5xl font-semibold">{title}</h1>
          <p className={`mt-3 ${muted} max-w-2xl`}>{t.subtitle}</p>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pb-10 grid lg:grid-cols-[1.35fr_.65fr] gap-4">
        <div className={`self-start rounded-3xl border overflow-hidden ${panel}`}>
          <Body3D
            theme={theme}
            hint={t.rotateHint}
            selectedPart={selected}
            onSelectPart={(part) => {
              setSelected(part as BodyPartKey);
              setAnswer(null);
              setError(null);
            }}
            labels={t.parts}
            visibleParts={availableParts}
          />
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

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {t.sexLabel}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "male" as const, label: t.maleLabel },
                  { value: "female" as const, label: t.femaleLabel },
                ]).map((option) => {
                  const active = sex === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setSex(option.value);
                        if (option.value !== "female") {
                          setPregnant(false);
                        }
                        setAnswer(null);
                        setError(null);
                      }}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        active
                          ? theme === "dark"
                            ? "border-sky-300/70 bg-sky-300/15 text-sky-100"
                            : "border-sky-400 bg-sky-100 text-sky-900"
                          : theme === "dark"
                            ? "border-white/10 bg-white/5 text-slate-200 hover:border-sky-300/30 hover:bg-sky-300/10"
                            : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {sex === "female" && (
              <label
                className={`flex items-start gap-3 rounded-2xl border px-3 py-3 ${
                  theme === "dark"
                    ? "border-emerald-300/20 bg-emerald-300/10"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={pregnant}
                  onChange={(e) => {
                    setPregnant(e.target.checked);
                    setAnswer(null);
                    setError(null);
                  }}
                  className="mt-1 h-4 w-4 rounded accent-emerald-400"
                />
                <span>
                  <span className="block text-sm font-semibold">{t.pregnancyLabel}</span>
                  <span className={`mt-1 block text-xs ${muted}`}>{t.pregnancyHint}</span>
                </span>
              </label>
            )}

            {localRecommendation && (
              <div
                className={`rounded-2xl border p-4 ${
                  theme === "dark"
                    ? "border-emerald-300/25 bg-emerald-300/10"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                  {t.recommendationTitle}
                </div>
                <div className={`mt-2 text-base font-semibold sm:text-lg ${recommendationTone}`}>
                  {localRecommendation.specialty}
                </div>
                <p className={`mt-1 text-sm leading-6 ${muted}`}>{localRecommendation.reason}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-sky-400">
                  {t.recommendationHint}
                </p>
              </div>
            )}

            {selected && (
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                {t.parts[selected]}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {availableParts.map((part) => {
                const active = selected === part;

                return (
                  <button
                    key={part}
                    type="button"
                    onClick={() => {
                      setSelected(part);
                      setAnswer(null);
                      setError(null);
                    }}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
                      active
                        ? theme === "dark"
                          ? "border-emerald-300/70 bg-emerald-300/20 text-emerald-100"
                          : "border-emerald-400 bg-emerald-100 text-emerald-900"
                        : theme === "dark"
                          ? "border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/40 hover:bg-emerald-300/10"
                          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    {t.parts[part]}
                  </button>
                );
              })}
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
                className={`mt-3 max-h-[420px] overflow-y-auto rounded-2xl border p-4 pr-3 text-sm leading-6 ${
                  theme === "dark"
                    ? "bg-slate-950/40 border-white/10 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <AnswerContent answer={answer} />
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
