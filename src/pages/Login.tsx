import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { getGoogleAuthUrl } from "../lib/apiAuth";
import { login } from "../lib/authStore";

type Locale = "ru" | "kk" | "en";

const copy = {
  ru: {
    title: "Вход",
    subtitle: "Войдите по email/паролю или через Google. Если аккаунта нет - зарегистрируйтесь.",
    email: "Email",
    emailPlaceholder: "patient@healthassist.kz",
    password: "Пароль",
    passwordPlaceholder: "Введите пароль",
    loginBtn: "Войти",
    registerBtn: "Регистрация",
    homeBtn: "На главную",
    googleBtn: "Войти через Google",
    loginError: "Ошибка входа",
  },
  kk: {
    title: "Кіру",
    subtitle: "Email/құпиясөз арқылы немесе Google арқылы кіріңіз. Аккаунт болмаса - тіркеліңіз.",
    email: "Email",
    emailPlaceholder: "patient@healthassist.kz",
    password: "Құпиясөз",
    passwordPlaceholder: "Құпиясөзді енгізіңіз",
    loginBtn: "Кіру",
    registerBtn: "Тіркелу",
    homeBtn: "Басты бетке",
    googleBtn: "Google арқылы кіру",
    loginError: "Кіру қатесі",
  },
  en: {
    title: "Sign In",
    subtitle: "Sign in with email/password or via Google. If you don't have an account - register.",
    email: "Email",
    emailPlaceholder: "patient@healthassist.kz",
    password: "Password",
    passwordPlaceholder: "Enter password",
    loginBtn: "Sign In",
    registerBtn: "Register",
    homeBtn: "Home",
    googleBtn: "Sign in with Google",
    loginError: "Sign in error",
  },
} as const;

function GoogleMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.44a5.5 5.5 0 0 1-2.39 3.61v2.92h3.87c2.26-2.08 3.57-5.13 3.57-8.77Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-2.92c-1.07.72-2.44 1.15-4.08 1.15-3.13 0-5.79-2.11-6.73-4.96H1.28v3.01A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.36A7.2 7.2 0 0 1 4.89 12c0-.82.14-1.61.38-2.36V6.63H1.28A12 12 0 0 0 0 12c0 1.94.46 3.78 1.28 5.37l3.99-3.01Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.13 15.24 0 12 0A12 12 0 0 0 1.28 6.63l3.99 3.01c.94-2.85 3.6-4.87 6.73-4.87Z"
      />
    </svg>
  );
}

export default function Login() {
  const nav = useNavigate();
  const allowLocalCredentials = !import.meta.env.PROD;
  const [locale, setLocale] = useState<Locale>(() => {
    const v = window.localStorage.getItem("ha_locale");
    if (v === "en" || v === "kk" || v === "ru") return v;
    return "ru";
  });

  const t = copy[locale];
  const subtitle = allowLocalCredentials
    ? t.subtitle
    : locale === "kk"
      ? "Қауіпсіздік үшін production-нұсқада email/құпиясөз арқылы кіру өшірілген. Google арқылы кіріңіз."
      : locale === "en"
        ? "For security, email/password sign-in is disabled in production. Use Google Sign-In."
        : "Для безопасности в продакшене вход по email и паролю отключен. Используйте Google.";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!allowLocalCredentials) {
      setErr(subtitle);
      return;
    }

    try {
      login(email, password);
      nav("/app");
    } catch (e: any) {
      setErr(e?.message ?? t.loginError);
    }
  }

  return (
    <div className="center min-h-screen relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4">
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
          <h1 className="h1">{t.title}</h1>
          <p className="muted">
            {subtitle}
          </p>

          <form className="stack" onSubmit={onSubmit}>
            {allowLocalCredentials ? (
              <>
                <Input
                  label={t.email}
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  label={t.password}
                  type="password"
                  placeholder={t.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </>
            ) : null}
            {err ? <div className="alert">{err}</div> : null}

            {allowLocalCredentials ? (
              <div className="auth-actions">
                <Button>{t.loginBtn}</Button>
                <Button type="button" variant="ghost" onClick={() => nav("/register")}>
                  {t.registerBtn}
                </Button>
              </div>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => nav("/")}>
              {t.homeBtn}
            </Button>
          </form>

          <div className="divider" />

          <Button
            variant="ghost"
            className="inline-flex w-full items-center justify-center gap-3"
            onClick={async () => {
              const url = await getGoogleAuthUrl();
              window.location.href = url;
            }}
          >
            <GoogleMark />
            {t.googleBtn}
          </Button>
        </div>
      </Card>
    </div>
  );
}
