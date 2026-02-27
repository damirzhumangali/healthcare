import React, { useEffect, useRef, useState } from "react";
import {
  Stethoscope,
  HeartPulse,
  Activity,
  ShieldCheck,
  Brain,
  Bot,
  Sparkles,
  Star,
  Check,
  ChevronDown,
  Github,
  Twitter,
  Linkedin,
  Instagram,
  Menu,
  X,
  LogIn,
  UserPlus,
  ArrowRight,
  Mail,
} from "lucide-react";

const API_BASE = "http://localhost:4000";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

const HealthcareLandingPage: React.FC = () => {
  // Navbar scroll state
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth panel mode
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [, setAuthToken] = useState<string | null>(null);

  // Section refs for scroll + animations
  const heroRef = useRef<HTMLDivElement | null>(null);
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const howItWorksRef = useRef<HTMLDivElement | null>(null);
  const testimonialsRef = useRef<HTMLDivElement | null>(null);
  const pricingRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  const sectionRefs: React.RefObject<HTMLDivElement | null>[] = [
    heroRef,
    featuresRef,
    statsRef,
    howItWorksRef,
    testimonialsRef,
    pricingRef,
    faqRef,
    ctaRef,
  ];

  // Track which sections are visible for fadeInUp on scroll
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>(
    {}
  );

  // Stats animation
  const [patientsHelped, setPatientsHelped] = useState(0);
  const [responseTime, setResponseTime] = useState(0);
  const [clinics, setClinics] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [statsAnimated, setStatsAnimated] = useState(false);

  // Smooth scroll helper
  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileOpen(false);
    }
  };

  // Navbar scroll listener
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // IntersectionObserver for sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const updated: Record<string, boolean> = {};
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("data-section-id");
          if (!id) return;
          if (entry.isIntersecting) {
            updated[id] = true;
          }
        });
        if (Object.keys(updated).length) {
          setVisibleSections((prev) => ({ ...prev, ...updated }));
        }
      },
      {
        threshold: 0.18,
      }
    );

    sectionRefs.forEach((ref, idx) => {
      if (ref.current) {
        ref.current.setAttribute("data-section-id", `section-${idx}`);
        observer.observe(ref.current);
      }
    });

    return () => {
      sectionRefs.forEach((ref) => {
        if (ref.current) observer.unobserve(ref.current);
      });
    };
  }, []);

  // Stats counters animation
  useEffect(() => {
    if (!statsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !statsAnimated) {
          setStatsAnimated(true);

          const duration = 2000;
          const start = performance.now();

          const targetPatients = 120_000;
          const targetResponse = 45; // seconds
          const targetClinics = 850;
          const targetAccuracy = 98;

          const animate = (time: number) => {
            const progress = Math.min((time - start) / duration, 1);

            setPatientsHelped(Math.floor(targetPatients * progress));
            setResponseTime(Math.floor(targetResponse * progress));
            setClinics(Math.floor(targetClinics * progress));
            setAccuracy(Math.floor(targetAccuracy * progress));

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(statsRef.current);

    return () => observer.disconnect();
  }, [statsAnimated]);

  // Format numbers with suffix
  const formatNumber = (value: number): string => {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + "M";
    if (value >= 1_000) return Math.floor(value / 1_000) + "K";
    return value.toString();
  };

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqItems = [
    {
      q: "Как HealthAssist помогает врачам и пациентам?",
      a: "Платформа объединяет данные из устройств, ЭМК и опросов, применяет AI‑анализ и показывает понятные инсайты и приоритеты действий для врачей и пациентов.",
    },
    {
      q: "Безопасны ли мои данные?",
      a: "Мы шифруем данные в покое и при передаче, используем строгую роль‑базированную модель доступа и соответствуем лучшим практикам безопасности.",
    },
    {
      q: "Можно ли интегрировать HealthAssist с существующей системой клиники?",
      a: "Да, у нас есть API и готовые коннекторы для популярных ЭМК и лабораторных систем.",
    },
    {
      q: "Поддерживаете ли вы wearables и домашние устройства?",
      a: "Да, мы интегрируемся с популярными фитнес‑браслетами, тонометрами, глюкометрами и другими IoT‑устройствами.",
    },
    {
      q: "Как быстро можно запустить пилот?",
      a: "Первые пилотные проекты запускаются за 2–4 недели с минимальной нагрузкой на ИТ‑отдел.",
    },
    {
      q: "Какая модель оплаты?",
      a: "Сейчас HealthAssist доступен бесплатно для команд здравоохранения — без подписки и ограничений по времени.",
    },
  ];

  const testimonials = [
    {
      name: "Д-р Анна К.",
      role: "Кардиолог, частная клиника",
      quote:
        "HealthAssist стал нашим цифровым ассистентом: пациенты приходят подготовленными, а рисковые случаи мы видим заранее.",
      color: "from-cyan-400 to-emerald-400",
      initials: "АК",
    },
    {
      name: "Игорь М.",
      role: "Руководитель сети клиник",
      quote:
        "Мы сократили время обработки обращений и наконец получили цельную картину по всем филиалам.",
      color: "from-blue-400 to-indigo-400",
      initials: "ИМ",
    },
    {
      name: "Мария П.",
      role: "Пациентка с хроническим заболеванием",
      quote:
        "Теперь я точно знаю, что происходит с моим здоровьем, и всегда на связи со своим врачом.",
      color: "from-emerald-400 to-teal-400",
      initials: "МП",
    },
  ];

  const pricingPlans = [
    {
      name: "HealthAssist Free",
      priceMonthly: 0,
      highlight: true,
      badge: "Всегда бесплатно",
      description: "Полный функционал платформы без подписки и скрытых платежей.",
      features: [
        "Неограниченное количество пациентов в одной команде",
        "Все основные дашборды и AI‑рекомендации",
        "Интеграция с wearables и ЭМК",
        "Поддержка по email для клиник и врачей",
      ],
    },
  ];

  // Load auth state from localStorage
  useEffect(() => {
    try {
      const storedToken = window.localStorage.getItem("ha_token");
      const storedUser = window.localStorage.getItem("ha_user");
      if (storedToken && storedUser) {
        setAuthToken(storedToken);
        setAuthUser(JSON.parse(storedUser));
      }
    } catch {
      // ignore
    }
  }, []);

  // Handle Google OAuth callback: /auth/callback?code=...
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.pathname !== "/auth/callback") return;

    const code = url.searchParams.get("code");
    if (!code) return;

    setAuthLoading(true);
    setAuthError(null);

    fetch(`${API_BASE}/auth/google/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Auth failed");
        }
        return res.json();
      })
      .then((data: { token: string; user: AuthUser }) => {
        setAuthToken(data.token);
        setAuthUser(data.user);
        try {
          window.localStorage.setItem("ha_token", data.token);
          window.localStorage.setItem("ha_user", JSON.stringify(data.user));
        } catch {
          // ignore
        }
        // Clean URL back to root
        window.history.replaceState({}, "", "/");
      })
      .catch(() => {
        setAuthError("Не удалось выполнить вход через Google. Попробуйте ещё раз.");
      })
      .finally(() => {
        setAuthLoading(false);
      });
  }, []);

  const startGoogleLogin = () => {
    setAuthError(null);
    setAuthLoading(true);
    fetch(`${API_BASE}/auth/google/url`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to get URL");
        return res.json();
      })
      .then((data: { url: string }) => {
        window.location.href = data.url;
      })
      .catch(() => {
        setAuthLoading(false);
        setAuthError("Не удалось получить ссылку Google OAuth.");
      });
  };

  const handleLogout = () => {
    setAuthUser(null);
    setAuthToken(null);
    setAuthMode("login");
    try {
      window.localStorage.removeItem("ha_token");
      window.localStorage.removeItem("ha_user");
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-x-hidden">
      {/* Inline styles with keyframes and custom animations */}
      <style>{`
        :root {
          --bg-primary: #050816;
          --accent-from: #38bdf8;   /* sky-400 */
          --accent-to: #22c55e;     /* emerald-500 */
          --card-bg: rgba(15, 23, 42, 0.9);
          --border-subtle: rgba(148, 163, 184, 0.25);
        }

        .bg-grid {
          background-image:
            linear-gradient(to right, rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        .animate-fadeInUp-delayed {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-fadeInUp-slow {
          animation: fadeInUp 0.9s ease-out forwards;
        }

        .hover-glow {
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }
        .hover-glow:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.9);
          border-color: rgba(148, 163, 184, 0.6);
        }

        .btn-glow {
          transition: transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease, color 0.16s ease;
        }
        .btn-glow:hover {
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 16px 38px rgba(56, 189, 248, 0.35);
        }

        .auth-card {
          backdrop-filter: blur(18px);
          background:
            radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 55%),
            radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.12), transparent 55%),
            rgba(15, 23, 42, 0.96);
        }

        .glass-panel {
          backdrop-filter: blur(18px);
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(148, 163, 184, 0.4);
        }

        .glass-card {
          backdrop-filter: blur(14px);
          background:
            linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0.9));
          border: 1px solid rgba(51, 65, 85, 0.85);
        }

        .blur-nav {
          backdrop-filter: blur(22px);
        }

        .section-hidden {
          opacity: 0;
          transform: translateY(12px);
        }
        .section-visible {
          opacity: 1;
          transform: translateY(0);
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        }
        .transition-opacity-transform {
          transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        }

        .faq-body {
          transition: max-height 0.24s ease, opacity 0.24s ease, transform 0.24s ease;
        }
        .faq-body-open {
          opacity: 1;
          transform: translateY(0);
        }
        .faq-body-closed {
          opacity: 0;
          transform: translateY(-4px);
        }

        .chevron-rotate {
          transition: transform 0.2s ease;
        }
        .chevron-rotate-open {
          transform: rotate(180deg);
        }

        .scroll-smooth {
          scroll-behavior: smooth;
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(18px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

            {/* Background elements */}
            <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617] via-[#020617] to-slate-950" />
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-sky-500/20 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-emerald-500/15 via-transparent to-transparent" />
      </div>

      {/* Navbar */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        <div
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between rounded-2xl border ${
            scrolled
              ? "bg-slate-950/80 blur-nav border-slate-800/60 shadow-[0_18px_60px_rgba(15,23,42,0.95)]"
              : "bg-slate-950/40 blur-nav border-slate-800/40"
          }`}
        >
          {/* Logo */}
          <button
            type="button"
            onClick={() => scrollToSection(heroRef)}
            className="flex items-center gap-2 py-2 group"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-400 via-emerald-400 to-sky-500 shadow-[0_0_40px_rgba(45,212,191,0.45)]">
              <Stethoscope className="h-5 w-5 text-slate-950" />
              <span className="absolute -bottom-1 right-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-950/95 text-[9px] font-semibold text-emerald-400 border border-emerald-300/50">
                AI
              </span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold tracking-tight text-slate-50">
                HealthAssist
              </span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Intelligent Care Platform
              </span>
            </div>
          </button>

          {/* Nav links (desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection(featuresRef)}
              className="hover:text-slate-50 transition-colors"
            >
              Возможности
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(howItWorksRef)}
              className="hover:text-slate-50 transition-colors"
            >
              Как это работает
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(pricingRef)}
              className="hover:text-slate-50 transition-colors"
            >
              Тарифы
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(faqRef)}
              className="hover:text-slate-50 transition-colors"
            >
              FAQ
            </button>
          </nav>

          {/* Right side: CTA + auth corner entry */}
          <div className="hidden md:flex items-center gap-3">
            {authUser ? (
              <>
                <div className="flex items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1.5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center text-[10px] font-semibold text-slate-950">
                    {authUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-50">
                      {authUser.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {authUser.email}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-400/80 hover:text-slate-50 transition-colors"
                >
                  Выйти
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-400/80 hover:text-slate-50 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Войти
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection(ctaRef)}
                  className="btn-glow inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-sky-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-[0_14px_35px_rgba(34,211,238,0.4)]"
                >
                  Запросить демо
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/70 text-slate-200"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden mt-2 mx-4 rounded-2xl border border-slate-800/70 bg-slate-950/95 blur-nav shadow-[0_18px_60px_rgba(15,23,42,0.95)] p-4 space-y-4">
            <nav className="flex flex-col gap-3 text-sm text-slate-200">
              <button
                type="button"
                onClick={() => scrollToSection(featuresRef)}
                className="text-left py-1"
              >
                Возможности
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(howItWorksRef)}
                className="text-left py-1"
              >
                Как это работает
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(pricingRef)}
                className="text-left py-1"
              >
                Тарифы
              </button>
              <button
                type="button"
                onClick={() => scrollToSection(faqRef)}
                className="text-left py-1"
              >
                FAQ
              </button>
            </nav>
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-200"
              >
                <LogIn className="h-3.5 w-3.5" />
                Войти
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  scrollToSection(ctaRef);
                }}
                className="btn-glow inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-sky-500 px-4 py-1.5 text-xs font-semibold text-slate-950"
              >
                Начать
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Fixed auth card in corner */}
      <aside className="fixed right-4 top-24 z-30 w-[320px] max-w-full hidden lg:block">
        <div className="auth-card rounded-2xl border border-slate-700/80 shadow-[0_22px_70px_rgba(15,23,42,0.95)] p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.15em] text-emerald-300/80">
                {authUser ? "Вы вошли как" : "Доступ в платформу"}
              </span>
              <span className="text-sm font-semibold text-slate-50">
                {authUser ? authUser.name : "Войдите или создайте аккаунт"}
              </span>
            </div>
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>

          <div className="flex rounded-full bg-slate-900/80 border border-slate-700/80 p-0.5 text-xs font-medium text-slate-200">
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 transition-all ${
                authMode === "login"
                  ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.4)]"
                  : "text-slate-300"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Войти
            </button>
            <button
              type="button"
              onClick={() => setAuthMode("register")}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full py-1.5 transition-all ${
                authMode === "register"
                  ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 shadow-[0_10px_30px_rgba(16,185,129,0.45)]"
                  : "text-slate-300"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Регистрация
            </button>
          </div>

          {authUser ? (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-300">
                Вы авторизованы через Google. Используйте тот же аккаунт для
                доступа к данным в HealthAssist.
              </p>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-slate-400/80"
              >
                Выйти
              </button>
            </div>
          ) : (
            <>
              <form className="space-y-2.5">
                {authMode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300">Имя</label>
                    <input
                      className="w-full rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                      placeholder="Например, Д-р Анна"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300">Рабочий email</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/60"
                    placeholder="you@clinic.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300">Пароль</label>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-xs text-slate-50 placeholder:text-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/60"
                    placeholder="Минимум 8 символов"
                  />
                </div>
                <button
                  type="button"
                  className="btn-glow mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 shadow-[0_16px_45px_rgba(34,211,238,0.45)]"
                >
                  {authMode === "login"
                    ? "Войти (демо, без сервера)"
                    : "Создать аккаунт (демо)"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              <div className="flex items-center gap-2 pt-1">
                <div className="h-px flex-1 bg-slate-700/70" />
                <span className="text-[10px] text-slate-500 uppercase tracking-[0.18em]">
                  или
                </span>
                <div className="h-px flex-1 bg-slate-700/70" />
              </div>

              <button
                type="button"
                onClick={startGoogleLogin}
                disabled={authLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-slate-400/80 btn-glow disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="h-4 w-4 rounded-full bg-white flex items-center justify-center text-[11px] font-bold text-slate-900">
                  G
                </span>
                {authLoading ? "Перенаправляем в Google..." : "Войти через Google"}
              </button>

              {authError && (
                <p className="text-[10px] text-rose-300 mt-1">{authError}</p>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Продолжая, вы соглашаетесь с{" "}
                <span className="text-emerald-300/90 underline underline-offset-2">
                  условиями
                </span>{" "}
                и{" "}
                <span className="text-emerald-300/90 underline underline-offset-2">
                  политикой конфиденциальности
                </span>
                .
              </p>
            </>
          )}
        </div>
      </aside>

      <main className="scroll-smooth">
        {/* HERO */}
        <section
          ref={heroRef}
          className="relative pt-32 md:pt-36 pb-20 md:pb-28 lg:pb-32"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
            {/* Left side */}
            <div className="max-w-xl lg:max-w-2xl space-y-8 section-hidden animate-fadeInUp">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-slate-900/70 px-2.5 py-1 text-[11px] text-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.45)]">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="uppercase tracking-[0.2em]">
                  DIGITAL HEALTH · AI
                </span>
                <span className="h-4 w-px bg-emerald-400/40" />
                <span className="text-slate-200">
                  Умный ассистент для команд здравоохранения
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight leading-tight">
                  <span className="block text-slate-50">
                    Клиника,
                    <span className="hidden sm:inline"> которая видит</span>
                  </span>
                  <span className="block bg-gradient-to-r from-cyan-400 via-emerald-400 to-sky-500 bg-clip-text text-transparent">
                    здоровье пациентов наперёд
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-300 max-w-xl">
                  HealthAssist — платформа, которая объединяет данные устройств,
                  ЭМК и AI‑аналитику, чтобы команды врачей принимали решения
                  быстрее, точнее и с меньшей нагрузкой.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <button
                  type="button"
                  onClick={() => scrollToSection(pricingRef)}
                  className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_18px_60px_rgba(34,211,238,0.5)]"
                >
                  Запросить пилот
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection(howItWorksRef)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/60 px-6 py-2.5 text-sm font-medium text-slate-100 hover:border-slate-300/80 hover:bg-slate-900/80 btn-glow"
                >
                  Посмотреть как это работает
                  <Activity className="h-4 w-4 text-emerald-300" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 flex items-center justify-center text-[11px] font-semibold text-slate-950 border border-slate-950/60">
                      DR
                    </div>
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-indigo-400 to-sky-500 flex items-center justify-center text-[11px] font-semibold text-slate-950 border border-slate-950/60">
                      CX
                    </div>
                    <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-emerald-400 to-lime-400 flex items-center justify-center text-[11px] font-semibold text-slate-950 border border-slate-950/60">
                      IT
                    </div>
                  </div>
                  <span className="text-slate-300">
                    200+ команд уже доверяют HealthAssist
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Данные медицинского уровня безопасности
                </span>
              </div>
            </div>

            {/* Right side: Hero visualization */}
            <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl section-hidden animate-fadeInUp-delayed">
              <div className="glass-panel rounded-3xl p-5 sm:p-6 lg:p-7 hover-glow">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5 text-emerald-300" />
                    <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      Live Patient Overview
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-2 py-1 text-[10px] text-emerald-300 border border-emerald-400/40">
                    <Sparkles className="h-3 w-3" />
                    AI triage on
                  </span>
                </div>

                {/* Vitals cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="glass-card rounded-2xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Систолическое</span>
                      <span className="text-[10px] text-emerald-300/90 uppercase tracking-[0.12em]">
                        Норма
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-slate-50">
                        118
                      </span>
                      <span className="text-[11px] text-slate-500">
                        mmHg
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-gradient-to-r from-emerald-400 to-cyan-400" />
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Пульс</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">
                        Стабильно
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-slate-50">
                        72
                      </span>
                      <span className="text-[11px] text-slate-500">
                        bpm
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-300/90">
                      <Activity className="h-3 w-3" />
                      В пределах целевого диапазона
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-3 flex flex-col gap-2 col-span-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-cyan-300" />
                        <span className="text-[11px] text-slate-300">
                          AI‑оценка риска 30 дней
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-300">
                        Низкий
                      </span>
                    </div>
                    <div className="mt-1 h-20 rounded-xl bg-slate-950/70 border border-slate-800/70 flex items-center justify-between px-3 text-[11px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-400">Ключевые сигналы</span>
                        <span className="text-slate-50">
                          Сон ↑, активность стабильна, пульс в норме.
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300 border border-emerald-400/40">
                          <ShieldCheck className="h-3 w-3" />
                          92% уверенность
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Обновлено 2 мин назад
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline mini */}
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Приоритет: стабильный пациент</span>
                  <span className="inline-flex items-center gap-1 text-emerald-300">
                    <Bot className="h-3.5 w-3.5" />
                    AI triage
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section
          ref={featuresRef}
          className="relative py-14 md:py-18 lg:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className={`max-w-2xl mb-8 md:mb-10 transition-opacity-transform ${
                visibleSections["section-1"] ? "section-visible" : "section-hidden"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 mb-2">
                Возможности
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-50 mb-3">
                Всё, что нужно цифровой клинике
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                От потоков данных устройств до понятных приоритетов для врача —
                HealthAssist закрывает полный путь пациента в одной платформе.
              </p>
            </div>

            <div
              className={`grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 transition-opacity-transform ${
                visibleSections["section-1"] ? "section-visible" : "section-hidden"
              }`}
            >
              {[
                {
                  icon: <HeartPulse className="h-5 w-5 text-emerald-300" />,
                  title: "Мониторинг в реальном времени",
                  text: "Данные из wearables, домашних устройств и ЭМК собираются в единое живое полотно.",
                },
                {
                  icon: <Brain className="h-5 w-5 text-cyan-300" />,
                  title: "AI‑стратификация риска",
                  text: "Модели автоматически подсвечивают пациентов с высоким риском осложнений.",
                },
                {
                  icon: <ShieldCheck className="h-5 w-5 text-emerald-300" />,
                  title: "Клиническая безопасность",
                  text: "Полный трек аудита и гибкие права доступа для команд различного профиля.",
                },
                {
                  icon: <Activity className="h-5 w-5 text-sky-300" />,
                  title: "Умные оповещения",
                  text: "Аллерт‑система без шума — только клинически значимые события.",
                },
                {
                  icon: <Stethoscope className="h-5 w-5 text-teal-300" />,
                  title: "Ассистент приёмов",
                  text: "Визуальные подсказки и резюме перед приёмом пациента.",
                },
                {
                  icon: <Sparkles className="h-5 w-5 text-indigo-300" />,
                  title: "Персонализируемые дашборды",
                  text: "Настраиваемые панели для врачей, руководителей и ИТ.",
                },
              ].map((f, idx) => (
                <div
                  key={f.title}
                  style={{ animationDelay: `${0.08 * idx}s` }}
                  className="glass-card hover-glow rounded-3xl p-5 sm:p-6 flex flex-col gap-3 animate-fadeInUp-slow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900/80 border border-slate-700/80">
                      {f.icon}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      FEATURE {idx + 1}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-slate-50">
                    {f.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section
          ref={statsRef}
          className="relative py-12 md:py-16 lg:py-18"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className={`glass-panel rounded-3xl px-5 sm:px-6 lg:px-8 py-6 sm:py-7 lg:py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between hover-glow transition-opacity-transform ${
                visibleSections["section-2"] ? "section-visible" : "section-hidden"
              }`}
            >
              <div className="max-w-md space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Цифры
                </p>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-50">
                  Измеримый эффект для пациентов и клиник
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  HealthAssist помогает снижать нагрузку на врачей, ускорять
                  принятие решений и повышать качество лечения, сохраняя при этом
                  человеческий фокус.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs sm:text-sm">
                <div className="flex flex-col gap-1">
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    {formatNumber(patientsHelped)}+
                  </div>
                  <div className="text-[11px] text-slate-400">
                    пациентов под умным мониторингом
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    {responseTime}s
                  </div>
                  <div className="text-[11px] text-slate-400">
                    среднее время до реакции
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    {clinics}+
                  </div>
                  <div className="text-[11px] text-slate-400">
                    клиник в единой системе
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-2xl sm:text-3xl font-semibold text-slate-50">
                    {accuracy}%
                  </div>
                  <div className="text-[11px] text-slate-400">
                    точность AI‑классификации
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section
          ref={howItWorksRef}
          className="relative py-14 md:py-18 lg:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className={`max-w-2xl mb-10 transition-opacity-transform ${
                visibleSections["section-3"] ? "section-visible" : "section-hidden"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 mb-2">
                Как это работает
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-50 mb-3">
                От сигнала устройства до действия врача
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                HealthAssist строит понятный путь: данные собираются, AI
                обрабатывает, команда получает приоритеты и рекомендации.
              </p>
            </div>

            <div
              className={`flex flex-col lg:flex-row items-stretch gap-6 lg:gap-8 transition-opacity-transform ${
                visibleSections["section-3"] ? "section-visible" : "section-hidden"
              }`}
            >
              {[
                {
                  title: "Data In · Сбор сигналов",
                  text: "Устройства, ЭМК, опросы и лаборатории — всё аккуратно собирается и приводится к единому стандарту.",
                  icon: <Activity className="h-4 w-4 text-cyan-300" />,
                },
                {
                  title: "AI Engine · Аналитика",
                  text: "Модели выявляют риски, тренды и аномалии, обучаясь на обогащённой клинической истории.",
                  icon: <Brain className="h-4 w-4 text-emerald-300" />,
                },
                {
                  title: "Care Actions · Действия",
                  text: "Врачи и команды получают прозрачные приоритеты, чек‑листы и рекомендации по следующему шагу.",
                  icon: <ShieldCheck className="h-4 w-4 text-sky-300" />,
                },
              ].map((step, idx) => (
                <div
                  key={step.title}
                  className="flex-1 relative"
                >
                  <div className="glass-card rounded-3xl p-5 sm:p-6 hover-glow h-full flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 text-slate-950 text-xs font-semibold shadow-[0_10px_30px_rgba(34,211,238,0.45)]">
                        {idx + 1}
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-slate-400">
                        <span>{step.icon}</span>
                        <span className="uppercase tracking-[0.16em]">
                          STEP {idx + 1}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-sm sm:text-base font-semibold text-slate-50">
                      {step.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 flex-1">
                      {step.text}
                    </p>
                  </div>

                  {/* Connecting lines for desktop */}
                  {idx < 2 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-px bg-gradient-to-r from-slate-700/70 via-emerald-400/60 to-transparent" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section
          ref={testimonialsRef}
          className="relative py-14 md:py-18 lg:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              className={`flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 transition-opacity-transform ${
                visibleSections["section-4"] ? "section-visible" : "section-hidden"
              }`}
            >
              <div className="max-w-xl space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Отзывы
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-50">
                  Что говорят врачи и пациенты
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md">
                Мы проектируем HealthAssist вместе с реальными пользователями —
                поэтому интерфейсы «дышат», а данные говорят понятным языком.
              </p>
            </div>

            <div
              className={`flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible transition-opacity-transform ${
                visibleSections["section-4"] ? "section-visible" : "section-hidden"
              }`}
            >
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="min-w-[260px] md:min-w-0 glass-card rounded-3xl p-5 sm:p-6 hover-glow flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-full bg-gradient-to-tr ${t.color} flex items-center justify-center text-xs font-semibold text-slate-950`}
                      >
                        {t.initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-50">
                          {t.name}
                        </p>
                        <p className="text-[11px] text-slate-400">{t.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-300">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-3.5 w-3.5 fill-amber-400/90 text-amber-400"
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-4">
                    “{t.quote}”
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Используют HealthAssist более 12 месяцев</span>
                    <span className="inline-flex items-center gap-1 text-emerald-300/90">
                      <ShieldCheck className="h-3 w-3" />
                      Проверенный отзыв
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section
          ref={pricingRef}
          className="relative py-14 md:py-18 lg:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8 transition-opacity-transform ${
                visibleSections["section-5"] ? "section-visible" : "section-hidden"
              }`}
            >
              <div className="space-y-2 max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Доступ
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-50">
                  Один прозрачный план — бесплатно
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  HealthAssist доступен без подписки и тарифных границ: просто
                  подключайтесь и работайте с пациентами.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-400/40">
                  Бесплатно для клиник и врачей
                </span>
              </div>
            </div>

            <div
              className={`grid gap-4 sm:gap-5 md:grid-cols-3 transition-opacity-transform ${
                visibleSections["section-5"] ? "section-visible" : "section-hidden"
              }`}
            >
              {pricingPlans.map((plan) => {
                const isPopular = plan.highlight;
                return (
                  <div
                    key={plan.name}
                    className={`glass-card rounded-3xl p-5 sm:p-6 flex flex-col gap-4 hover-glow ${
                      isPopular
                        ? "border-emerald-400/60 shadow-[0_24px_80px_rgba(16,185,129,0.55)] scale-[1.01]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-50">
                          {plan.name}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {plan.description}
                        </p>
                      </div>
                      {isPopular && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold text-emerald-300 border border-emerald-400/40">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1">
                      {plan.priceMonthly === 0 ? (
                        <>
                          <span className="text-2xl sm:text-3xl font-semibold text-slate-50">
                            Бесплатно
                          </span>
                          <span className="text-xs text-slate-400">
                            без подписки и ограничений по времени
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl sm:text-3xl font-semibold text-slate-50">
                            ${plan.priceMonthly}
                          </span>
                          <span className="text-xs text-slate-400">/ месяц</span>
                        </>
                      )}
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-200">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-300" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => scrollToSection(ctaRef)}
                      className={`mt-2 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-semibold btn-glow ${
                        isPopular
                          ? "bg-gradient-to-r from-cyan-400 via-emerald-400 to-sky-500 text-slate-950"
                          : "border border-slate-700/80 bg-slate-950/60 text-slate-100"
                      }`}
                    >
                      Выбрать план
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          ref={faqRef}
          className="relative py-14 md:py-18 lg:py-20"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className={`max-w-2xl mb-8 transition-opacity-transform ${
                visibleSections["section-6"] ? "section-visible" : "section-hidden"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300 mb-2">
                FAQ
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-50 mb-3">
                Часто задаваемые вопросы
              </h2>
              <p className="text-sm sm:text-base text-slate-300">
                Если остались вопросы — просто запросите демо, и мы покажем, как
                HealthAssist работает в вашей реальности.
              </p>
            </div>

            <div
              className={`grid gap-4 md:grid-cols-2 transition-opacity-transform ${
                visibleSections["section-6"] ? "section-visible" : "section-hidden"
              }`}
            >
              {faqItems.map((item, idx) => {
                const open = openFaq === idx;
                return (
                  <div
                    key={item.q}
                    className="glass-card rounded-2xl p-4 sm:p-5 hover-glow"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : idx)}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-slate-50">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 chevron-rotate ${
                          open ? "chevron-rotate-open" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`faq-body mt-2 overflow-hidden ${
                        open ? "faq-body-open max-h-40" : "faq-body-closed max-h-0"
                      }`}
                    >
                      <p className="text-[11px] sm:text-xs text-slate-300 pt-1.5">
                        {item.a}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section
          ref={ctaRef}
          className="relative py-12 md:py-16 lg:py-18"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div
              className={`relative overflow-hidden rounded-3xl border border-emerald-400/40 bg-gradient-to-r from-cyan-500/25 via-emerald-500/25 to-sky-500/25 px-5 sm:px-7 lg:px-10 py-7 sm:py-8 lg:py-9 hover-glow transition-opacity-transform ${
                visibleSections["section-7"] ? "section-visible" : "section-hidden"
              }`}
            >
              <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-tr from-emerald-400/50 to-cyan-400/40 blur-2xl" />
              <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-gradient-to-tr from-sky-400/50 to-emerald-400/40 blur-2xl" />

              <div className="relative flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
                <div className="flex-1 space-y-2 sm:space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                    Готовы к новому уровню digital‑care?
                  </p>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-slate-50">
                    Запланируйте демо и посмотрите HealthAssist на ваших данных
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-100/90 max-w-xl">
                    Оставьте рабочий email — наша команда вернётся с персональным
                    сценарием пилота и примером дашбордов под ваши KPI.
                  </p>
                </div>

                <div className="w-full max-w-md flex flex-col gap-2.5">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative flex-1 w-full">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                      <input
                        type="email"
                        placeholder="you@clinic.com"
                        className="w-full rounded-full bg-slate-950/80 border border-slate-100/40 pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-50 placeholder:text-slate-200/80 outline-none focus:ring-2 focus:ring-emerald-400/80 focus:border-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      className="btn-glow inline-flex items-center justify-center gap-2 rounded-full bg-slate-950/90 border border-emerald-300/80 px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-emerald-200"
                    >
                      Запросить демо
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-100/80">
                    Никакого спама — только релевантные материалы и сценарии
                    развёртывания.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="relative border-t border-slate-800/80 bg-slate-950/80">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 justify-between">
              <div className="max-w-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-400 via-emerald-400 to-sky-500 shadow-[0_0_40px_rgba(45,212,191,0.45)]">
                    <Stethoscope className="h-5 w-5 text-slate-950" />
                  </div>
                  <span className="text-sm font-semibold text-slate-50">
                    HealthAssist
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  Цифровой ассистент, который помогает командам здравоохранения
                  видеть пациентов целостно и действовать вовремя.
                </p>
                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Платформа развивается вместе с вашими потребностями.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs sm:text-sm">
                <div className="space-y-2">
                  <p className="font-semibold text-slate-100">Продукт</p>
                  <ul className="space-y-1 text-slate-400">
                    <li>Обзор</li>
                    <li>Интеграции</li>
                    <li>Безопасность</li>
                    <li>Roadmap</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-100">Решения</p>
                  <ul className="space-y-1 text-slate-400">
                    <li>Клиники</li>
                    <li>Госпитали</li>
                    <li>Телемедицина</li>
                    <li>Страховые</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-100">Ресурсы</p>
                  <ul className="space-y-1 text-slate-400">
                    <li>Блог</li>
                    <li>Кейсы</li>
                    <li>Документация API</li>
                    <li>Поддержка</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-slate-100">Компания</p>
                  <ul className="space-y-1 text-slate-400">
                    <li>О нас</li>
                    <li>Карьера</li>
                    <li>Партнёры</li>
                    <li>Контакты</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
              <div className="flex items-center gap-4 text-slate-400 text-xs">
                <span>© {new Date().getFullYear()} HealthAssist.</span>
                <span>Все права защищены.</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="h-8 w-8 rounded-full border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-slate-50 hover:border-slate-300/80"
                >
                  <Github className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-slate-50 hover:border-slate-300/80"
                >
                  <Twitter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-slate-50 hover:border-slate-300/80"
                >
                  <Linkedin className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-slate-50 hover:border-slate-300/80"
                >
                  <Instagram className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default HealthcareLandingPage;