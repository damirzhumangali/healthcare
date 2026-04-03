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

export default function Login() {
  const nav = useNavigate();
  const [locale, setLocale] = useState<Locale>(() => {
    const v = window.localStorage.getItem("ha_locale");
    if (v === "en" || v === "kk" || v === "ru") return v;
    return "ru";
  });

  const t = copy[locale];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
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
            {t.subtitle}
          </p>

          <form className="stack" onSubmit={onSubmit}>
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
            {err ? <div className="alert">{err}</div> : null}

            <div className="row">
              <Button>{t.loginBtn}</Button>
              <Button type="button" variant="ghost" onClick={() => nav("/register")}>
                {t.registerBtn}
              </Button>
              <Button type="button" variant="ghost" onClick={() => nav("/")}>
                {t.homeBtn}
              </Button>
            </div>
          </form>

          <div className="divider" />

          <Button
            variant="ghost"
            onClick={async () => {
              const url = await getGoogleAuthUrl();
              window.location.href = url;
            }}
          >
            {t.googleBtn}
          </Button>
        </div>
      </Card>
    </div>
  );
}
