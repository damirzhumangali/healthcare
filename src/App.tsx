import { useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  Globe,
  HeartPulse,
  Menu,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { OverlayContent, ScrollAnimationSection } from "./components/ScrollAnimation";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import BodyMap from "./pages/BodyMap";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ScanDevice from "./pages/ScanDevice";
import MeasurementDetails from "./pages/MeasurementDetails";
import AppointmentForm from "./pages/AppointmentForm";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AppLayout from "./layouts/AppLayout";
import RequireAuth from "./lib/RequireAuth";
import { getGoogleAuthUrl } from "./lib/apiAuth";
import { getToken, logout } from "./lib/auth";
import { isAdminAccount } from "./lib/adminAccess";
import { APP_LOCALES, readStoredLocale, writeStoredLocale, type AppLocale } from "./lib/locale";

type Locale = AppLocale;
type Theme = "dark" | "light";

type StoredUser = {
  email?: string;
  name?: string;
  role?: string;
};

const imageFrames = Object.values(
  import.meta.glob("./images2/ezgif-frame-*.jpg", {
    eager: true,
    import: "default",
  })
).map((v) => String(v));
imageFrames.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

const text = {
  ru: {
    navFeatures: "Пациентам",
    navStory: "Симптомы",
    navFaq: "Вопросы",
    navMap: "Клиники",
    navBody: "3D тело",
    navAppointment: "Записаться",
    navCabinet: "Кабинет пациента",
    navAdmin: "Админка",
    navLogin: "Войти",
    navGoogle: "Войти через Google",
    navLogout: "Выйти",
    navRegister: "Регистрация",
    heroKicker: "Digital Healthcare Platform",
    heroTitle: "Практические советы по здоровью на каждый день",
    heroSub:
      "Проверяй симптомы, получай базовые рекомендации по самопомощи и понимай, когда нужно обратиться к врачу без промедления.",
    heroCta: "Проверить симптомы",
    heroCta2: "Полезные материалы",
    featuresTitle: "Полезная информация",
    featuresSub: "Коротко и по делу: что делать дома, что взять на прием и когда нужна срочная помощь.",
    f1: "Когда нужно срочно к врачу",
    f1d: "Красные флаги: сильная боль в груди, одышка, потеря сознания, высокая температура более 3 дней.",
    f2: "Как подготовиться к приему",
    f2d: "Запиши симптомы, время их появления, лекарства и вопросы - это ускорит диагностику.",
    f3: "Безопасная самопомощь дома",
    f3d: "Покой, вода, контроль температуры и давления, а при ухудшении состояния - обращение за помощью.",
    story1: "Пользователь скроллит — таймлайн анимации управляется вручную.",
    story2: "Sticky-canvas удерживает фокус на ключевом визуале.",
    story3: "Батч-предзагрузка кадров даёт плавную работу даже на слабых устройствах.",
    faqTitle: "Частые вопросы",
    q1: "Когда нужно срочно обратиться за медицинской помощью?",
    a1: "Срочно обращайтесь при боли в груди, затрудненном дыхании, внезапной слабости, потере сознания или очень высокой температуре, которая не снижается.",
    q2: "Можно ли полагаться только на онлайн-оценку симптомов?",
    a2: "Онлайн-оценка помогает сориентироваться, но не заменяет очный осмотр врача и анализы. При ухудшении состояния обращайтесь в клинику.",
    q3: "Что подготовить перед приемом у врача?",
    a3: "Запишите симптомы и когда они начались, список лекарств, хронические заболевания, аллергии и вопросы, которые хотите обсудить.",
    mapTitle: "Поликлиники в Астане",
    mapSub: "Найдите ближайшую поликлинику и постройте маршрут.",
    mapHint: "Карта показывает результаты по запросу «поликлиники в Астане».",
    footer: "Готово к адаптации под твой бренд и контент.",
  },
  kk: {
    navFeatures: "Пациенттерге",
    navStory: "Белгілер",
    navFaq: "Сұрақтар",
    navMap: "Емханалар",
    navBody: "3D дене",
    navAppointment: "Жазылу",
    navCabinet: "Кабинет",
    navAdmin: "Админка",
    navLogin: "Кіру",
    navGoogle: "Google арқылы кіру",
    navLogout: "Шығу",
    navRegister: "Тіркелу",
    heroKicker: "Digital Healthcare Platform",
    heroTitle: "Күнделікті денсаулыққа пайдалы нұсқаулық",
    heroSub:
      "Белгілерді тексеріп, алғашқы көмек бойынша ұсыныс алып, дәрігерге қашан шұғыл қаралу керегін біліңіз.",
    heroCta: "Белгілерді тексеру",
    heroCta2: "Пайдалы материалдар",
    featuresTitle: "Пайдалы ақпарат",
    featuresSub: "Қысқа әрі нақты: үйде не істеу керек, қабылдауға не алу керек, қашан жедел көмек қажет.",
    f1: "Дәрігерге қашан шұғыл бару керек",
    f1d: "Қауіпті белгілер: кеуде ауыруы, ентігу, есінен тану, 3 күннен ұзақ жоғары температура.",
    f2: "Қабылдауға қалай дайындалу керек",
    f2d: "Белгілерді, басталу уақытын, қабылдап жүрген дәрілерді және сұрақтарыңызды алдын ала жазып алыңыз.",
    f3: "Үйдегі қауіпсіз алғашқы көмек",
    f3d: "Тынығу, су ішу, температура мен қысымды бақылау, жағдай нашарласа дереу көмекке жүгіну.",
    story1: "Пайдаланушы скролл жасайды — анимация таймлайны қолмен басқарылады.",
    story2: "Sticky-canvas негізгі визуалға назарды ұстап тұрады.",
    story3: "Batch preload әлсіз құрылғыларда да тегіс жұмыс береді.",
    faqTitle: "Жиі сұрақтар",
    q1: "Қашан шұғыл медициналық көмекке жүгіну керек?",
    a1: "Кеуде тұсы ауырса, тыныс алу қиындаса, кенет әлсіздік болса, есінен танса немесе өте жоғары қызу түспесе, дереу дәрігерге көрініңіз.",
    q2: "Тек онлайн-бағалауға сенуге бола ма?",
    a2: "Онлайн-бағалау бағыт береді, бірақ дәрігердің қарауын және талдауды алмастырмайды. Жағдай нашарласа, клиникаға барыңыз.",
    q3: "Дәрігер қабылдауына не дайындау керек?",
    a3: "Белгілерді және басталу уақытын, қабылдап жүрген дәрілерді, созылмалы аурулар мен аллергияны және дәрігерге қоятын сұрақтарды жазып алыңыз.",
    mapTitle: "Астанадағы емханалар",
    mapSub: "Ең жақын емхананы тауып, маршрут құрыңыз.",
    mapHint: "Карта «Астанадағы емханалар» сұрауы бойынша нәтижелерді көрсетеді.",
    footer: "Сенің бренд пен контентке бейімдеуге дайын.",
  },
  en: {
    navFeatures: "For Patients",
    navStory: "Symptoms",
    navFaq: "Questions",
    navMap: "Clinics",
    navBody: "3D Body",
    navAppointment: "Book Visit",
    navCabinet: "Dashboard",
    navAdmin: "Admin",
    navLogin: "Sign in",
    navGoogle: "Sign in with Google",
    navLogout: "Sign out",
    navRegister: "Register",
    heroKicker: "Digital Healthcare Platform",
    heroTitle: "Practical health guidance for daily life",
    heroSub:
      "Check symptoms, get basic self-care recommendations, and understand when urgent medical help is needed.",
    heroCta: "Check symptoms",
    heroCta2: "Helpful guides",
    featuresTitle: "Useful information",
    featuresSub: "Clear and practical: what to do at home, what to bring to a visit, and when to seek urgent care.",
    f1: "When to seek urgent care",
    f1d: "Red flags include severe chest pain, shortness of breath, fainting, and fever lasting more than 3 days.",
    f2: "How to prepare for a visit",
    f2d: "Write down symptoms, when they started, current medications, and key questions for your doctor.",
    f3: "Safe self-care at home",
    f3d: "Rest, hydration, and monitoring temperature and blood pressure; seek help if symptoms worsen.",
    story1: "User scroll directly controls the animation timeline.",
    story2: "Sticky canvas keeps focus on the main visual narrative.",
    story3: "Batch preloading keeps interaction smooth on slower devices.",
    faqTitle: "Frequently asked questions",
    q1: "When should I seek urgent medical care?",
    a1: "Seek urgent care for chest pain, breathing difficulty, sudden weakness, fainting, or very high fever that does not improve.",
    q2: "Can I rely only on online symptom checks?",
    a2: "Online checks are for guidance and do not replace an in-person doctor exam or tests. If symptoms worsen, contact a clinic.",
    q3: "What should I prepare before a doctor visit?",
    a3: "Write down your symptoms and start time, current medications, chronic conditions, allergies, and key questions for your doctor.",
    mapTitle: "Clinics in Astana",
    mapSub: "Find a nearby clinic and build directions.",
    mapHint: "The map shows search results for “clinics in Astana”.",
    footer: "Ready to be adapted to your brand and content.",
  },
} as const;

function readStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function Landing() {
  const nav = useNavigate();
  const [theme, setTheme] = useState<Theme>("dark");
  const [locale, setLocale] = useState<Locale>(() => readStoredLocale());
  const [mobileMenu, setMobileMenu] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [isAuthed, setIsAuthed] = useState(() => Boolean(getToken()));
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    const user = readStoredUser();
    return user?.name || user?.email || "";
  });
  const [currentUserRole, setCurrentUserRole] = useState<string>(() => readStoredUser()?.role || "");

  const t = text[locale];
  const isAdminUser = currentUserRole === "admin" || isAdminAccount(readStoredUser());

  function handleLocaleChange(nextLocale: Locale) {
    setLocale(nextLocale);
    writeStoredLocale(nextLocale);
  }

  function openUserArea() {
    const token = getToken();

    if (!token) {
      setIsAuthed(false);
      nav("/login");
      return;
    }

    setMobileMenu(false);
    nav(isAdminUser ? "/admin" : "/app");
  }

  const rootClass =
    theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900";
  const surfaceClass =
    theme === "dark" ? "bg-slate-900/70 border-white/10" : "bg-white/90 border-slate-200";
  const mutedClass = theme === "dark" ? "text-slate-300" : "text-slate-600";

  const features = useMemo(
    () => [
      {
        icon: <Activity className="h-5 w-5 text-cyan-400" />,
        title: t.f1,
        desc: t.f1d,
      },
      {
        icon: <Moon className="h-5 w-5 text-indigo-400" />,
        title: t.f2,
        desc: t.f2d,
      },
      {
        icon: <Globe className="h-5 w-5 text-emerald-400" />,
        title: t.f3,
        desc: t.f3d,
      },
    ],
    [t]
  );

  const faqs = useMemo(
    () => [
      { q: t.q1, a: t.a1 },
      { q: t.q2, a: t.a2 },
      { q: t.q3, a: t.a3 },
    ],
    [t]
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${rootClass}`}>
      <style>{`html { scroll-behavior: smooth; }`}</style>

      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          theme === "dark"
            ? "border-white/10 bg-slate-950/75"
            : "border-slate-200 bg-white/80"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-2">
            <img src="/icon-192.png" alt="HealthAssist" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-semibold">HealthAssist</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#features">{t.navFeatures}</a>
            <a href="#story">{t.navStory}</a>
            <a href="#faq">{t.navFaq}</a>
            <a href="#map">{t.navMap}</a>
            <Link to="/body" className="inline-flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t.navBody}
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <div className="flex rounded-full border border-white/20 overflow-hidden">
              {APP_LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => handleLocaleChange(l)}
                  className={`px-2.5 py-1 text-xs font-medium ${
                    locale === l
                      ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                      : ""
                  }`}
                >
                  {l === "kk" ? "KZ" : l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
              className={`h-9 w-9 rounded-xl border flex items-center justify-center ${
                theme === "dark" ? "border-white/20" : "border-slate-300"
              }`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {isAuthed ? (
              <>
                <span className={`text-xs ${mutedClass}`}>
                  {currentUserName || "Google user"}
                </span>
                <button
                  onClick={openUserArea}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 disabled:opacity-60"
                >
                  {isAdminUser ? t.navAdmin : t.navCabinet}
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsAuthed(false);
                    setCurrentUserName("");
                    setCurrentUserRole("");
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs border ${
                    theme === "dark" ? "border-white/20" : "border-slate-300"
                  }`}
                >
                  {t.navLogout}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/appointments/new"
                  className={`rounded-full px-3 py-1.5 text-xs border ${
                    theme === "dark" ? "border-white/20" : "border-slate-300"
                  }`}
                >
                  {t.navAppointment}
                </Link>
                <button
                  onClick={async () => {
                    const url = await getGoogleAuthUrl();
                    window.location.href = url;
                  }}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                >
                  {t.navGoogle}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileMenu((v) => !v)}
            className="md:hidden h-9 w-9 rounded-xl border border-white/20 flex items-center justify-center"
          >
            {mobileMenu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {mobileMenu && (
        <div className={`md:hidden px-4 py-3 border-b ${theme === "dark" ? "border-white/10" : "border-slate-200"}`}>
          <nav className="flex flex-col gap-2 text-sm">
            <a href="#features" onClick={() => setMobileMenu(false)}>
              {t.navFeatures}
            </a>
            <a href="#story" onClick={() => setMobileMenu(false)}>
              {t.navStory}
            </a>
            <a href="#faq" onClick={() => setMobileMenu(false)}>
              {t.navFaq}
            </a>
            <a href="#map" onClick={() => setMobileMenu(false)}>
              {t.navMap}
            </a>
            <Link to="/body" onClick={() => setMobileMenu(false)} className="inline-flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t.navBody}
            </Link>
            {!isAuthed && (
              <>
                <Link to="/appointments/new" onClick={() => setMobileMenu(false)}>
                  {t.navAppointment}
                </Link>
                <Link to="/register" onClick={() => setMobileMenu(false)}>
                  {t.navRegister}
                </Link>
              </>
            )}
          </nav>
          
          <div className={`flex items-center justify-between gap-2 mt-4 pt-3 border-t ${theme === "dark" ? "border-white/10" : "border-slate-200"}`}>
            <div className="flex rounded-full border border-white/20 overflow-hidden">
              {APP_LOCALES.map((l) => (
                <button
                  key={l}
                  onClick={() => handleLocaleChange(l)}
                  className={`px-2.5 py-1 text-xs font-medium ${
                    locale === l
                      ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                      : ""
                  }`}
                >
                  {l === "kk" ? "KZ" : l.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
              className={`h-9 w-9 rounded-xl border flex items-center justify-center ${
                theme === "dark" ? "border-white/20" : "border-slate-300"
              }`}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
          
          {!isAuthed && (
            <div className="flex flex-col gap-2 mt-4">
              <Link 
                to="/appointments/new" 
                onClick={() => setMobileMenu(false)}
                className={`rounded-full px-4 py-2 text-sm font-medium border ${
                  theme === "dark" ? "border-white/20" : "border-slate-300"
                }`}
              >
                {t.navAppointment}
              </Link>
              <button
                onClick={async () => {
                  const url = await getGoogleAuthUrl();
                  window.location.href = url;
                }}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
              >
                {t.navGoogle}
              </button>
            </div>
          )}
          {isAuthed && (
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={openUserArea}
                className="rounded-full px-4 py-2 text-sm font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 disabled:opacity-60"
              >
                {isAdminUser ? t.navAdmin : t.navCabinet}
              </button>
            </div>
          )}
        </div>
      )}

      <main id="top">
        <section className="max-w-7xl mx-auto px-4 pt-16 pb-14">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-400">
            <Sparkles className="h-3.5 w-3.5" />
            {t.heroKicker}
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold max-w-5xl leading-tight">
            {t.heroTitle}
          </h1>
          <p className={`mt-4 max-w-3xl ${mutedClass}`}>{t.heroSub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#story"
              className="rounded-full px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
            >
              {t.heroCta}
            </a>
            <a
              href="#features"
              className={`rounded-full px-5 py-2.5 text-sm border ${theme === "dark" ? "border-white/20" : "border-slate-300"}`}
            >
              {t.heroCta2}
            </a>
            <Link
              to="/body"
              className={`rounded-full px-5 py-2.5 text-sm border inline-flex items-center gap-2 ${
                theme === "dark" ? "border-white/20" : "border-slate-300"
              }`}
            >
              <HeartPulse className="h-4 w-4 text-emerald-400" />
              3D Body
            </Link>
          </div>
        </section>

        <section id="features" className="max-w-7xl mx-auto px-4 pb-16">
          <h2 className="text-2xl md:text-3xl font-semibold">{t.featuresTitle}</h2>
          <p className={`mt-2 ${mutedClass}`}>{t.featuresSub}</p>
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {features.map((item) => (
              <article
                key={item.title}
                className={`rounded-2xl border p-5 transition-transform hover:-translate-y-1 ${surfaceClass}`}
              >
                {item.icon}
                <h3 className="mt-3 font-semibold">{item.title}</h3>
                <p className={`mt-2 text-sm ${mutedClass}`}>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="story" className="pb-16">
          <ScrollAnimationSection
            frameUrls={imageFrames}
            sectionHeightVh={400}
            maxCanvasHeightVh={80}
            className="relative"
          >
            <OverlayContent start={0.08} end={0.25} position="left">
              <div className="p-5">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                  <HeartPulse className="h-3.5 w-3.5" />
                  Story 01
                </div>
                <p className="mt-2 text-sm text-slate-100">{t.story1}</p>
              </div>
            </OverlayContent>

            <OverlayContent start={0.36} end={0.56} position="right">
              <div className="p-5">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Story 02
                </div>
                <p className="mt-2 text-sm text-slate-100">{t.story2}</p>
              </div>
            </OverlayContent>

            <OverlayContent start={0.74} end={0.95} position="center">
              <div className="p-5 text-center">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-sky-200">
                  <Activity className="h-3.5 w-3.5" />
                  Story 03
                </div>
                <p className="mt-2 text-sm text-slate-100">{t.story3}</p>
              </div>
            </OverlayContent>
          </ScrollAnimationSection>
        </section>

        <section id="faq" className="max-w-5xl mx-auto px-4 pb-24">
          <h2 className="text-2xl md:text-3xl font-semibold">{t.faqTitle}</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {faqs.map((item, idx) => {
              const open = faqOpen === idx;
              return (
                <div key={item.q} className={`rounded-2xl border ${surfaceClass}`}>
                  <button
                    onClick={() => setFaqOpen(open ? null : idx)}
                    className="w-full px-4 py-4 flex items-center justify-between text-left"
                  >
                    <span className="font-medium">{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                  {open && <p className={`px-4 pb-4 text-sm ${mutedClass}`}>{item.a}</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section id="map" className="max-w-7xl mx-auto px-4 pb-24">
          <h2 className="text-2xl md:text-3xl font-semibold">{t.mapTitle}</h2>
          <p className={`mt-2 ${mutedClass}`}>{t.mapSub}</p>

          <div className={`mt-6 rounded-2xl border p-3 ${surfaceClass}`}>
            <iframe
              title="Astana clinics map"
              src="https://www.google.com/maps?q=%D0%BF%D0%BE%D0%BB%D0%B8%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B8%20%D0%B2%20%D0%90%D1%81%D1%82%D0%B0%D0%BD%D0%B5&output=embed"
              className="w-full h-[420px] rounded-xl border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
          <p className={`mt-3 text-sm ${mutedClass}`}>{t.mapHint}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <a
              className={`rounded-full px-4 py-2 border ${theme === "dark" ? "border-white/20" : "border-slate-300"}`}
              href="https://www.google.com/maps/search/%D0%93%D0%BE%D1%80%D0%BE%D0%B4%D1%81%D0%BA%D0%B0%D1%8F+%D0%BF%D0%BE%D0%BB%D0%B8%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0+%E2%84%961+%D0%90%D1%81%D1%82%D0%B0%D0%BD%D0%B0/"
              target="_blank"
              rel="noreferrer"
            >
              Поликлиника №1
            </a>
            <a
              className={`rounded-full px-4 py-2 border ${theme === "dark" ? "border-white/20" : "border-slate-300"}`}
              href="https://www.google.com/maps/search/%D0%93%D0%BE%D1%80%D0%BE%D0%B4%D1%81%D0%BA%D0%B0%D1%8F+%D0%BF%D0%BE%D0%BB%D0%B8%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0+%E2%84%965+%D0%90%D1%81%D1%82%D0%B0%D0%BD%D0%B0/"
              target="_blank"
              rel="noreferrer"
            >
              Поликлиника №5
            </a>
            <a
              className={`rounded-full px-4 py-2 border ${theme === "dark" ? "border-white/20" : "border-slate-300"}`}
              href="https://www.google.com/maps/search/%D0%93%D0%BE%D1%80%D0%BE%D0%B4%D1%81%D0%BA%D0%B0%D1%8F+%D0%BF%D0%BE%D0%BB%D0%B8%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0+%E2%84%967+%D0%90%D1%81%D1%82%D0%B0%D0%BD%D0%B0/"
              target="_blank"
              rel="noreferrer"
            >
              Поликлиника №7
            </a>
            <a
              className={`rounded-full px-4 py-2 border ${theme === "dark" ? "border-white/20" : "border-slate-300"}`}
              href="https://www.google.com/maps/search/%D0%93%D0%BE%D1%80%D0%BE%D0%B4%D1%81%D0%BA%D0%B0%D1%8F+%D0%BF%D0%BE%D0%BB%D0%B8%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0+%E2%84%969+%D0%90%D1%81%D1%82%D0%B0%D0%BD%D0%B0/"
              target="_blank"
              rel="noreferrer"
            >
              Поликлиника №9
            </a>
          </div>
        </section>
      </main>

      <footer className={`border-t py-8 ${theme === "dark" ? "border-white/10" : "border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-4 text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span>© {new Date().getFullYear()} HealthAssist</span>
          <span className={mutedClass}>{t.footer}</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/body" element={<BodyMap />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/appointments/new"
        element={
          <RequireAuth>
            <AppointmentForm />
          </RequireAuth>
        }
      />
      <Route path="/doctor" element={<DoctorDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="measurements/:id" element={<MeasurementDetails />} />
      </Route>
      <Route path="/scan/:deviceId" element={<ScanDevice />} />
    </Routes>
  );
}
