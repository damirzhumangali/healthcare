import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  CircleHelp,
  Globe,
  PersonStanding,
  HeartPulse,
  LogOut,
  MapPinned,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import CinematicHero from "./components/CinematicHero";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import BodyMap from "./pages/BodyMap";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ScanDevice from "./pages/ScanDevice";
import DevicePairing from "./pages/DevicePairing";
import MeasurementDetails from "./pages/MeasurementDetails";
import AppointmentForm from "./pages/AppointmentForm";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AimarControl from "./pages/AimarControl";
import LegalDocumentPage from "./pages/LegalDocumentPage";
import VkAuthCallback from "./pages/VkAuthCallback";
import NotFound from "./pages/NotFound";
import AppLayout from "./layouts/AppLayout";
import RequireAuth from "./lib/RequireAuth";
import { hasSession, logout, requiresServerSessionValidation, syncSessionFromServer } from "./lib/auth";
import { isAdminAccount } from "./lib/adminAccess";
import { APP_LOCALES, readStoredLocale, writeStoredLocale, type AppLocale } from "./lib/locale";
import { getPublicSeo } from "./lib/publicSeo";
import { usePageSeo } from "./lib/seo";

type Locale = AppLocale;
type Theme = "dark" | "light";

type StoredUser = {
  email?: string;
  name?: string;
  role?: string;
};


const text = {
  ru: {
    navFeatures: "Пациентам",
    navStory: "Симптомы",
    navStoryMobile: "AIMAR",
    navFaq: "Вопросы",
    navMap: "Клиники",
    navBody: "3D тело",
    navAppointment: "Записаться",
    navCabinet: "Кабинет пациента",
    navAdmin: "Админка",
    navLogin: "Войти",
    navGoogle: "Войти через Google",
    navLogout: "Выйти",
    navLoginMobile: "Вход",
    navAdminMobile: "Админ",
    navCabinetMobile: "Каб.",
    heroKicker: "Digital Healthcare Platform",
    heroTitle: "Практические советы по здоровью на каждый день",
    heroSub:
      "Проверяй симптомы, получай базовые рекомендации по самопомощи и понимай, когда нужно обратиться к врачу без промедления.",
    heroStudioLine1: "AI-powered",
    heroStudioLine2: "healthcare",
    heroStudioLine3: "assistant",
    heroStudioSub:
      "Интеллектуальная диагностика и клиническая поддержка на базе современного медицинского AI.",
    heroStudioLabel1: "Medical AI Platform",
    heroStudioLabel2: "Software + Robotics",
    heroStudioLabel3: "Clinical Support",
    featuresTitle: "Полезная информация",
    featuresSub: "Коротко и по делу: что делать дома, что взять на прием и когда нужна срочная помощь.",
    f1: "Когда нужно срочно к врачу",
    f1d: "Красные флаги: сильная боль в груди, одышка, потеря сознания, высокая температура более 3 дней.",
    f2: "Как подготовиться к приему",
    f2d: "Запиши симптомы, время их появления, лекарства и вопросы - это ускорит диагностику.",
    f3: "Безопасная самопомощь дома",
    f3d: "Покой, вода, контроль температуры и давления, а при ухудшении состояния - обращение за помощью.",
    robotKicker: "AIMAR",
    robotTitle: "Автономный медицинский ассистент",
    robotSub: "Студенческий прототип медицинского робота для больниц Казахстана. AI-диагностика по QR, Bluetooth-навигация и защищённый отсек для медикаментов на базе Arduino Uno и ESP32.",
    robotF1: "AI-диагностика симптомов через QR-код",
    robotF2: "Bluetooth-навигация (HC-05 + Arduino Uno)",
    robotF3: "RFID / Wi-Fi отсек для медикаментов",
    robotF4: "Открытый прототип — Arduino Uno + ESP32",
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
    footerNavTitle: "Навигация",
    footerAbout: "О сервисе",
    footerHowItWorks: "Как это работает",
    footerForDoctors: "Для врачей",
    footerForPatients: "Для пациентов",
    footerSupportTitle: "Поддержка",
    footerFaq: "Часто задаваемые вопросы",
    footerContactUs: "Связаться с нами",
    footerTechSupport: "Техподдержка",
    footerContactsTitle: "Контакты",
    footerPhoneLabel: "Телефон",
    footerPhoneValue: "+7 (700) 000-00-00",
    footerEmailLabel: "Email",
    footerEmailValue: "support@healthassist.kz",
    footerCityLabel: "Город",
    footerCityValue: "Астана, Казахстан",
    footerSocialTitle: "Соцсети",
    footerTelegram: "@telehealth_assist_bot",
    footerTelegramHref: "https://t.me/telehealth_assist_bot",
    footerPrivacyPolicy: "Политика конфиденциальности",
    footerTerms: "Пользовательское соглашение",
    footerMedicalDisclaimer: "Отказ от медицинской ответственности",
    footerBottom: "Цифровая медицинская платформа для пациентов и врачей.",
  },
  kk: {
    navFeatures: "Пациенттерге",
    navStory: "Белгілер",
    navStoryMobile: "AIMAR",
    navFaq: "Сұрақтар",
    navMap: "Емханалар",
    navBody: "3D дене",
    navAppointment: "Жазылу",
    navCabinet: "Кабинет",
    navAdmin: "Админка",
    navLogin: "Кіру",
    navGoogle: "Google арқылы кіру",
    navLogout: "Шығу",
    navLoginMobile: "Кіру",
    navAdminMobile: "Админ",
    navCabinetMobile: "Каб.",
    heroKicker: "Digital Healthcare Platform",
    heroTitle: "Күнделікті денсаулыққа пайдалы нұсқаулық",
    heroSub:
      "Белгілерді тексеріп, алғашқы көмек бойынша ұсыныс алып, дәрігерге қашан шұғыл қаралу керегін біліңіз.",
    heroStudioLine1: "AI-powered",
    heroStudioLine2: "healthcare",
    heroStudioLine3: "assistant",
    heroStudioSub:
      "Заманауи медициналық AI негізіндегі интеллектуалды диагностика және клиникалық қолдау.",
    heroStudioLabel1: "Medical AI Platform",
    heroStudioLabel2: "Software + Robotics",
    heroStudioLabel3: "Clinical Support",
    featuresTitle: "Пайдалы ақпарат",
    featuresSub: "Қысқа әрі нақты: үйде не істеу керек, қабылдауға не алу керек, қашан жедел көмек қажет.",
    f1: "Дәрігерге қашан шұғыл бару керек",
    f1d: "Қауіпті белгілер: кеуде ауыруы, ентігу, есінен тану, 3 күннен ұзақ жоғары температура.",
    f2: "Қабылдауға қалай дайындалу керек",
    f2d: "Белгілерді, басталу уақытын, қабылдап жүрген дәрілерді және сұрақтарыңызды алдын ала жазып алыңыз.",
    f3: "Үйдегі қауіпсіз алғашқы көмек",
    f3d: "Тынығу, су ішу, температура мен қысымды бақылау, жағдай нашарласа дереу көмекке жүгіну.",
    robotKicker: "AIMAR",
    robotTitle: "Автономды медициналық ассистент",
    robotSub: "Қазақстан ауруханаларына арналған студенттік медициналық робот прототипі. QR арқылы AI-диагностика, Bluetooth навигация және RFID/Wi-Fi дәрі бөлімі — Arduino Uno мен ESP32 негізінде.",
    robotF1: "QR код арқылы AI белгілерін диагностикалау",
    robotF2: "Bluetooth навигация (HC-05 + Arduino Uno)",
    robotF3: "RFID / Wi-Fi дәрі бөлімі",
    robotF4: "Ашық прототип — Arduino Uno + ESP32",
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
    footerNavTitle: "Навигация",
    footerAbout: "Сервис туралы",
    footerHowItWorks: "Қалай жұмыс істейді",
    footerForDoctors: "Дәрігерлерге",
    footerForPatients: "Пациенттерге",
    footerSupportTitle: "Қолдау",
    footerFaq: "Жиі қойылатын сұрақтар",
    footerContactUs: "Бізбен байланысу",
    footerTechSupport: "Техқолдау",
    footerContactsTitle: "Байланыс",
    footerPhoneLabel: "Телефон",
    footerPhoneValue: "+7 (700) 000-00-00",
    footerEmailLabel: "Email",
    footerEmailValue: "support@healthassist.kz",
    footerCityLabel: "Қала",
    footerCityValue: "Астана, Қазақстан",
    footerSocialTitle: "Әлеуметтік желі",
    footerTelegram: "@telehealth_assist_bot",
    footerTelegramHref: "https://t.me/telehealth_assist_bot",
    footerPrivacyPolicy: "Құпиялық саясаты",
    footerTerms: "Пайдаланушы келісімі",
    footerMedicalDisclaimer: "Медициналық жауапкершіліктен бас тарту",
    footerBottom: "Пациенттер мен дәрігерлерге арналған цифрлық медициналық платформа.",
  },
  en: {
    navFeatures: "For Patients",
    navStory: "Symptoms",
    navStoryMobile: "AIMAR",
    navFaq: "Questions",
    navMap: "Clinics",
    navBody: "3D Body",
    navAppointment: "Book Visit",
    navCabinet: "Dashboard",
    navAdmin: "Admin",
    navLogin: "Sign in",
    navGoogle: "Sign in with Google",
    navLogout: "Sign out",
    navLoginMobile: "Login",
    navAdminMobile: "Admin",
    navCabinetMobile: "Home",
    heroKicker: "Digital Healthcare Platform",
    heroTitle: "Practical health guidance for daily life",
    heroSub:
      "Check symptoms, get basic self-care recommendations, and understand when urgent medical help is needed.",
    heroStudioLine1: "AI-powered",
    heroStudioLine2: "healthcare",
    heroStudioLine3: "assistant",
    heroStudioSub:
      "Intelligent diagnostics and clinical support through modern medical AI.",
    heroStudioLabel1: "Medical AI Platform",
    heroStudioLabel2: "Software + Robotics",
    heroStudioLabel3: "Clinical Support",
    featuresTitle: "Useful information",
    featuresSub: "Clear and practical: what to do at home, what to bring to a visit, and when to seek urgent care.",
    f1: "When to seek urgent care",
    f1d: "Red flags include severe chest pain, shortness of breath, fainting, and fever lasting more than 3 days.",
    f2: "How to prepare for a visit",
    f2d: "Write down symptoms, when they started, current medications, and key questions for your doctor.",
    f3: "Safe self-care at home",
    f3d: "Rest, hydration, and monitoring temperature and blood pressure; seek help if symptoms worsen.",
    robotKicker: "AIMAR",
    robotTitle: "Autonomous Medical Assistant",
    robotSub: "A student-developed hospital robot prototype for Kazakhstan. QR-accessible AI symptom triage, Bluetooth navigation, and a secure RFID/Wi-Fi medication compartment — built on Arduino Uno and ESP32.",
    robotF1: "AI symptom triage via QR code",
    robotF2: "Bluetooth navigation (HC-05 + Arduino Uno)",
    robotF3: "RFID / Wi-Fi medication compartment",
    robotF4: "Open-source prototype — Arduino Uno + ESP32",
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
    footerNavTitle: "Navigation",
    footerAbout: "About",
    footerHowItWorks: "How it works",
    footerForDoctors: "For doctors",
    footerForPatients: "For patients",
    footerSupportTitle: "Support",
    footerFaq: "Frequently asked questions",
    footerContactUs: "Contact us",
    footerTechSupport: "Technical support",
    footerContactsTitle: "Contacts",
    footerPhoneLabel: "Phone",
    footerPhoneValue: "+7 (700) 000-00-00",
    footerEmailLabel: "Email",
    footerEmailValue: "support@healthassist.kz",
    footerCityLabel: "City",
    footerCityValue: "Astana, Kazakhstan",
    footerSocialTitle: "Social",
    footerTelegram: "@telehealth_assist_bot",
    footerTelegramHref: "https://t.me/telehealth_assist_bot",
    footerPrivacyPolicy: "Privacy Policy",
    footerTerms: "Terms of Use",
    footerMedicalDisclaimer: "Medical Disclaimer",
    footerBottom: "Digital healthcare platform for patients and doctors.",
  },
} as const;

function readStoredUser(): StoredUser | null {
  if (typeof localStorage === "undefined") {
    return null;
  }

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
  const [activeMobileSection, setActiveMobileSection] = useState(() =>
    typeof window === "undefined" ? "features" : window.location.hash.replace("#", "") || "features"
  );
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [isAuthed, setIsAuthed] = useState(() => hasSession());
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(() => readStoredUser());
  const t = text[locale];
  const currentUserName = currentUser?.name || currentUser?.email || "";
  const isAdminUser = isAdminAccount(currentUser);
  const mobileNavItems = [
    { id: "features", label: t.navFeatures, href: "#features", icon: Users },
    { id: "story", label: t.navStoryMobile, href: "#story", icon: HeartPulse },
    { id: "faq", label: t.navFaq, href: "#faq", icon: CircleHelp },
    { id: "map", label: t.navMap, href: "#map", icon: MapPinned },
    { id: "body", label: t.navBody, to: "/body", icon: PersonStanding },
  ] as const;

  function handleLocaleChange(nextLocale: Locale) {
    setLocale(nextLocale);
    writeStoredLocale(nextLocale);
  }

  function openUserArea() {
    if (!hasSession()) {
      setIsAuthed(false);
      setCurrentUser(null);
      nav("/login");
      return;
    }

    nav(isAdminUser ? "/admin" : "/app");
  }

  useEffect(() => {
    if (!requiresServerSessionValidation()) {
      return;
    }

    let cancelled = false;

    syncSessionFromServer()
      .then((user) => {
        if (cancelled) return;
        setCurrentUser(user);
        setIsAuthed(Boolean(user));
      })
      .catch(() => {
        if (cancelled) return;
        setCurrentUser(null);
        setIsAuthed(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncActiveSection = () => {
      setActiveMobileSection(window.location.hash.replace("#", "") || "features");
    };

    syncActiveSection();
    window.addEventListener("hashchange", syncActiveSection);

    return () => {
      window.removeEventListener("hashchange", syncActiveSection);
    };
  }, []);

  const pageBackgroundClass = theme === "dark" ? "bg-[#02050c]" : "bg-white";
  const rootClass = `${pageBackgroundClass} ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`;
  const surfaceClass =
    theme === "dark" ? "bg-slate-900/70 border-white/10" : "bg-white border-slate-200";
  const mutedClass = theme === "dark" ? "text-slate-300" : "text-slate-600";
  const footerLabelClass = theme === "dark" ? "text-slate-100" : "text-slate-900";
  const seo = getPublicSeo("/", locale);

  usePageSeo({
    title: seo.title,
    description: seo.description,
    path: "/",
    locale,
  });

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

  const footerNavigationLinks = useMemo(
    () => [
      { label: t.footerAbout, href: "#top", onClick: () => setActiveMobileSection("features") },
      { label: t.footerHowItWorks, href: "#story", onClick: () => setActiveMobileSection("story") },
    ],
    [t]
  );

  const footerSupportLinks = useMemo(
    () => [
      { label: t.footerContactUs, href: `mailto:${t.footerEmailValue}` },
    ],
    [t]
  );

  const footerLegalLinks = useMemo(
    () => [
      { label: t.footerPrivacyPolicy, to: "/privacy" },
      { label: t.footerTerms, to: "/terms" },
      { label: t.footerMedicalDisclaimer, to: "/medical-disclaimer" },
    ],
    [t]
  );

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors duration-300 ${rootClass}`}>
      <style>{`html { scroll-behavior: smooth; }`}</style>

      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          theme === "dark"
            ? "border-white/10 bg-[#02050c]/80"
            : "border-slate-200 bg-white/80"
        }`}
      >
        <div className="mx-auto max-w-7xl px-2 py-2.5 md:px-3 md:py-3 xl:px-4">
          <div className="flex items-center justify-between gap-1.5 md:gap-4">
            <a
              href="#top"
              className="flex shrink-0 items-center gap-2"
              onClick={() => setActiveMobileSection("features")}
            >
              <img
                src="/icon-192.png"
                alt="HealthAssist"
                className="h-7 w-7 rounded-xl object-cover md:h-9 md:w-9"
              />
              <span className="hidden font-semibold sm:inline">HealthAssist</span>
            </a>

            <nav className="hidden xl:flex items-center gap-4 text-sm 2xl:gap-6">
              <a href="#features">{t.navFeatures}</a>
              <a href="#story">{t.navStory}</a>
              <a href="#faq">{t.navFaq}</a>
              <a href="#map">{t.navMap}</a>
              <Link to="/body" className="inline-flex items-center gap-1">
                <PersonStanding className="h-4 w-4" />
                {t.navBody}
              </Link>
            </nav>

            <div className="hidden xl:flex items-center gap-2">
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
                      setCurrentUser(null);
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
                    to="/login"
                    className="rounded-full px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                  >
                    {t.navLogin}
                  </Link>
                </>
              )}
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-1 overflow-hidden xl:hidden">
              <div
                className={`flex h-8 w-[96px] shrink-0 rounded-full border overflow-hidden md:h-9 md:w-[118px] ${
                  theme === "dark" ? "border-white/20" : "border-slate-300"
                }`}
              >
                {APP_LOCALES.map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLocaleChange(l)}
                    className={`flex-1 min-w-0 px-0.5 py-1 text-[10px] font-medium md:text-xs ${
                      locale === l
                        ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950"
                        : ""
                    }`}
                  >
                    {l === "kk" ? "KZ" : l.toUpperCase()}
                  </button>
                ))}
              </div>

              {isAuthed ? (
                <>
                  <button
                    onClick={openUserArea}
                    className="inline-flex h-8 min-w-[70px] items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-2.5 text-[11px] font-semibold text-slate-950 md:h-9 md:min-w-[86px] md:px-3 md:text-xs"
                  >
                    {isAdminUser ? t.navAdminMobile : t.navCabinetMobile}
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setIsAuthed(false);
                      setCurrentUser(null);
                    }}
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border md:h-9 md:w-9 ${
                      theme === "dark" ? "border-white/20" : "border-slate-300"
                    }`}
                    aria-label={t.navLogout}
                    title={t.navLogout}
                  >
                    <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex h-8 min-w-[70px] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-2.5 text-[11px] font-semibold text-slate-950 md:h-9 md:min-w-[84px] md:px-3 md:text-xs"
                  >
                    {t.navLoginMobile}
                  </Link>
                </>
              )}

              <button
                onClick={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
                className={`landing-mobile-theme-toggle inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border md:h-9 md:w-9 ${
                  theme === "dark" ? "border-white/20" : "border-slate-300"
                }`}
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              >
                {theme === "dark" ? <Sun className="h-3.5 w-3.5 md:h-4 md:w-4" /> : <Moon className="h-3.5 w-3.5 md:h-4 md:w-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="top" className={`${pageBackgroundClass} pb-24 xl:pb-0`}>
        <CinematicHero
          kicker={t.heroKicker}
          lines={[t.heroStudioLine1, t.heroStudioLine2, t.heroStudioLine3]}
          subtitle={t.heroStudioSub}
          labels={[t.heroStudioLabel1, t.heroStudioLabel2, t.heroStudioLabel3]}
          ctaLabel={t.navBody}
          ctaTo="/body"
          theme={theme}
        />

        <section id="features" className="scroll-mt-28">
          <div className="max-w-7xl mx-auto px-4 pt-20 pb-16 md:pt-24">
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
          </div>
        </section>

        <section id="story" className="scroll-mt-28 pb-16">
          <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="flex justify-center">
                <img
                  src="/images/robot-aimar.png"
                  alt="AIMAR Robot"
                  className="max-h-[480px] w-auto object-contain"
                  style={{ filter: theme === "dark" ? "drop-shadow(0 24px 48px rgba(34,211,238,0.18))" : "drop-shadow(0 24px 48px rgba(0,0,0,0.12))" }}
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400 mb-3">{t.robotKicker}</p>
                <h2 className={`text-3xl md:text-4xl font-bold mb-5 ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}>{t.robotTitle}</h2>
                <p className={`text-base leading-relaxed mb-8 ${mutedClass}`}>{t.robotSub}</p>
                <ul className="space-y-3">
                  {[t.robotF1, t.robotF2, t.robotF3, t.robotF4].map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400" />
                      <span className={`text-sm ${mutedClass}`}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-28 max-w-5xl mx-auto px-4 pb-24">
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

        <section id="map" className="scroll-mt-28 max-w-7xl mx-auto px-4 pb-24">
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

      <nav
        className={`fixed bottom-3 left-1/2 z-50 w-[min(calc(100%-1.5rem),44rem)] -translate-x-1/2 rounded-[26px] border p-2 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl xl:hidden ${
          theme === "dark"
            ? "border-white/10 bg-slate-950/90"
            : "border-slate-200 bg-white/92"
        }`}
        aria-label="Mobile navigation"
      >
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMobileSection === item.id;
            const itemClass = `flex min-w-0 flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-2 text-center text-[11px] font-semibold leading-tight transition ${
              isActive
                ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-lg shadow-cyan-500/20"
                : theme === "dark"
                  ? "text-slate-300"
                  : "text-slate-600"
            }`;

            if ("to" in item) {
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  onClick={() => setActiveMobileSection(item.id)}
                  className={itemClass}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <a
                key={item.id}
                href={item.href}
                onClick={() => setActiveMobileSection(item.id)}
                className={itemClass}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </div>
      </nav>

      <footer
        className={`border-t py-8 pb-28 xl:pb-8 ${pageBackgroundClass} ${
          theme === "dark" ? "border-white/10" : "border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid gap-8 border-b pb-8 md:grid-cols-2 xl:grid-cols-4 xl:gap-10">
            <div className="hidden md:block">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                {t.footerNavTitle}
              </h2>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                {footerNavigationLinks.map((item) =>
                  "to" in item ? (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={`transition-colors hover:text-cyan-300 ${mutedClass}`}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={item.onClick}
                      className={`transition-colors hover:text-cyan-300 ${mutedClass}`}
                    >
                      {item.label}
                    </a>
                  )
                )}
              </div>
            </div>

            <div className="hidden md:block">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                {t.footerSupportTitle}
              </h2>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                {footerSupportLinks.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={item.onClick}
                    className={`transition-colors hover:text-cyan-300 ${mutedClass}`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                {t.footerSocialTitle}
              </h2>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                <a
                  href={t.footerTelegramHref}
                  target="_blank"
                  rel="noreferrer"
                  className={`transition-colors hover:text-cyan-300 ${mutedClass}`}
                >
                  {t.footerTelegram}
                </a>
              </div>
            </div>
          </div>

          <div className={`flex flex-col gap-2 pt-5 text-sm md:flex-row md:items-center md:justify-between ${mutedClass}`}>
            <span>© 2026 HealthAssist</span>
            <span className="hidden md:inline">{t.footerBottom}</span>
          </div>

          <div className="mt-4 flex flex-col gap-3 text-sm md:flex-row md:flex-wrap">
            {footerLegalLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`transition-colors hover:text-cyan-300 ${mutedClass}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
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
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/body" element={<BodyMap />} />
      <Route path="/privacy" element={<LegalDocumentPage documentId="privacy" />} />
      <Route path="/terms" element={<LegalDocumentPage documentId="terms" />} />
      <Route
        path="/medical-disclaimer"
        element={<LegalDocumentPage documentId="medical-disclaimer" />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/vk/callback" element={<VkAuthCallback />} />
      <Route
        path="/appointments/new"
        element={
          <RequireAuth>
            <AppointmentForm />
          </RequireAuth>
        }
      />
      <Route
        path="/doctor"
        element={
          <RequireAuth>
            <DoctorDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/aimar"
        element={
          <RequireAuth>
            <AimarControl />
          </RequireAuth>
        }
      />
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
      <Route path="/pair" element={<DevicePairing />} />
      <Route path="/pair/:deviceId/:pairingToken" element={<DevicePairing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
