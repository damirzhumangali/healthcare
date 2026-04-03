import type { FormEvent } from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { register } from "../lib/authStore";

type Locale = "ru" | "kk" | "en";

const copy = {
  ru: {
    title: "Регистрация",
    email: "Email",
    emailPlaceholder: "patient@healthassist.kz",
    password: "Пароль",
    passwordPlaceholder: "Минимум 6 символов",
    password2: "Повтор пароля",
    password2Placeholder: "Ещё раз",
    createAccount: "Создать аккаунт",
    hasAccount: "Уже есть аккаунт",
    backToQR: "Назад к QR",
    passwordMismatch: "Пароли не совпадают",
    registerError: "Ошибка регистрации",
  },
  kk: {
    title: "Тіркелу",
    email: "Email",
    emailPlaceholder: "patient@healthassist.kz",
    password: "Құпиясөз",
    passwordPlaceholder: "Кемінде 6 таңба",
    password2: "Құпиясөзді қайталаңыз",
    password2Placeholder: "Тағы да бір рет",
    createAccount: "Аккаунт жасау",
    hasAccount: "Аккаунт бар",
    backToQR: "QR-ға қайту",
    passwordMismatch: "Құпиясөздер сәйкес келмейді",
    registerError: "Тіркелу қатесі",
  },
  en: {
    title: "Register",
    email: "Email",
    emailPlaceholder: "patient@healthassist.kz",
    password: "Password",
    passwordPlaceholder: "Minimum 6 characters",
    password2: "Confirm Password",
    password2Placeholder: "Again",
    createAccount: "Create Account",
    hasAccount: "Already have an account",
    backToQR: "Back to QR",
    passwordMismatch: "Passwords do not match",
    registerError: "Registration error",
  },
} as const;

export default function Register() {
  const nav = useNavigate();
  const [locale, setLocale] = useState<Locale>(() => {
    const v = window.localStorage.getItem("ha_locale");
    if (v === "en" || v === "kk" || v === "ru") return v;
    return "ru";
  });

  const t = copy[locale];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem("ha_locale", locale);
  }, [locale]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      if (password !== password2) throw new Error(t.passwordMismatch);
      register(email, password);
      nav("/app");
    } catch (e: any) {
      setErr(e?.message ?? t.registerError);
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
              autoComplete="new-password"
            />

            <Input
              label={t.password2}
              type="password"
              placeholder={t.password2Placeholder}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />

            {err ? <div className="alert">{err}</div> : null}

            <div className="row">
              <Button>{t.createAccount}</Button>
              <Button type="button" variant="ghost" onClick={() => nav("/login")}>
                {t.hasAccount}
              </Button>
            </div>

            <Button type="button" variant="ghost" onClick={() => nav("/scan/device-001")}>
              {t.backToQR}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
