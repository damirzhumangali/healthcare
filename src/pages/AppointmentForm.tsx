import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowLeft, House } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Input from "../components/Input";
import { createAppointment } from "../lib/apiAppointments";
import { isAdminAccount } from "../lib/adminAccess";
import { getCurrentUser } from "../lib/authStore";
import { APP_LOCALES, readStoredLocale, writeStoredLocale, type AppLocale } from "../lib/locale";
import { usePageSeo } from "../lib/seo";

type Locale = AppLocale;

// Full specialty list — no doctor names exposed to patient
const SPECIALTIES = [
  "Терапевт",
  "Кардиолог",
  "Невролог",
  "Хирург",
  "Педиатр",
  "ЛОР",
  "Офтальмолог",
  "Стоматолог",
  "Гинеколог",
  "Уролог",
  "Дерматолог",
  "Эндокринолог",
  "Ортопед",
];

const appointmentText = {
  ru: {
    title: "Записаться к врачу",
    subtitle: "Укажите тип специалиста и симптомы. Конкретного врача назначит администратор.",
    back: "Назад",
    home: "На главную",
    specialty: "Специалист",
    date: "Дата",
    time: "Время",
    symptoms: "Симптомы / Причина обращения",
    symptomsPlaceholder: "Например: головная боль, высокая температура, боль в груди",
    onlineConsult: "Хотите онлайн консультацию?",
    onlineYes: "Да",
    onlineNo: "Нет",
    fillAllError: "Заполните специализацию, дату, время и опишите симптомы.",
    created: "Заявка отправлена. Администратор назначит врача.",
    createError: "Не удалось создать заявку. Попробуйте ещё раз чуть позже.",
    creating: "Отправляем...",
    submit: "Отправить заявку",
    cancel: "Отмена",
  },
  kk: {
    title: "Дәрігерге жазылу",
    subtitle: "Маман түрін және симптомдарды көрсетіңіз. Нақты дәрігерді әкімші тағайындайды.",
    back: "Артқа",
    home: "Басты бетке",
    specialty: "Маман",
    date: "Күні",
    time: "Уақыты",
    symptoms: "Симптомдар / Өтініш себебі",
    symptomsPlaceholder: "Мысалы: бас ауруы, жоғары температура, кеуде ауруы",
    onlineConsult: "Онлайн кеңес алғыңыз келе ме?",
    onlineYes: "Иә",
    onlineNo: "Жоқ",
    fillAllError: "Маманды, күнді, уақытты толтырыңыз және симптомдарды сипаттаңыз.",
    created: "Өтінім жіберілді. Әкімші дәрігер тағайындайды.",
    createError: "Өтінімді жасау мүмкін болмады. Сәл кейінірек қайта көріңіз.",
    creating: "Жіберілуде...",
    submit: "Өтінім жіберу",
    cancel: "Бас тарту",
  },
  en: {
    title: "Request a Doctor Visit",
    subtitle: "Choose a specialist type and describe your symptoms. An admin will assign a doctor.",
    back: "Back",
    home: "Home",
    specialty: "Specialist",
    date: "Date",
    time: "Time",
    symptoms: "Symptoms / Reason for visit",
    symptomsPlaceholder: "For example: headache, high fever, chest pain",
    onlineConsult: "Would you like an online consultation?",
    onlineYes: "Yes",
    onlineNo: "No",
    fillAllError: "Please select a specialty, fill in date, time, and describe your symptoms.",
    created: "Request sent. An admin will assign a doctor.",
    createError: "Could not create the request. Please try again a little later.",
    creating: "Sending...",
    submit: "Send request",
    cancel: "Cancel",
  },
} as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AppointmentForm() {
  const nav = useNavigate();
  const currentUser = getCurrentUser();
  const [locale, setLocale] = useState<Locale>(() => readStoredLocale());
  const [specialty, setSpecialty] = useState(SPECIALTIES[0] ?? "");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("09:00");
  const [symptoms, setSymptoms] = useState("");
  const [wantsOnline, setWantsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const t = appointmentText[locale];
  const seoCopy = {
    ru: {
      title: "Запись к врачу — HealthAssist",
      description: "Служебная страница записи к врачу в личном кабинете HealthAssist.",
    },
    kk: {
      title: "Дәрігерге жазылу — HealthAssist",
      description: "HealthAssist жеке кабинетінде дәрігерге жазылуға арналған қызметтік бет.",
    },
    en: {
      title: "Doctor appointment — HealthAssist",
      description: "Internal HealthAssist page for booking a doctor appointment.",
    },
  } as const;
  const seo = seoCopy[locale];

  usePageSeo({
    title: seo.title,
    description: seo.description,
    path: "/appointments/new",
    locale,
    robots: "noindex, nofollow",
  });

  if (isAdminAccount(currentUser)) {
    return <Navigate to="/admin" replace />;
  }

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    writeStoredLocale(nextLocale);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!specialty || !date || !time || !symptoms.trim()) {
      setErr(t.fillAllError);
      return;
    }

    setLoading(true);
    try {
      await createAppointment({
        date,
        time,
        reason: symptoms.trim(),
        specialtyRequest: specialty,
        wantsOnline,
      });
      setOk(t.created);
      window.setTimeout(() => nav("/app"), 1200);
    } catch {
      setErr(t.createError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="appointment-form">
        <div className="appointment-form__hero">
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>{t.title}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {t.subtitle}
            </p>
          </div>
          <div className="appointment-form__toolbar">
            <Link
              to="/app"
              className="btn btn--ghost appointment-form__nav-btn appointment-form__nav-btn--icon"
              aria-label={t.back}
              title={t.back}
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="appointment-form__locale" aria-label="Language switcher">
              {APP_LOCALES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`appointment-form__locale-item ${
                    locale === lang ? "appointment-form__locale-item--active" : ""
                  }`}
                  onClick={() => changeLocale(lang)}
                >
                  {lang === "kk" ? "KZ" : lang.toUpperCase()}
                </button>
              ))}
            </div>
            <Link
              to="/"
              className="btn btn--ghost appointment-form__nav-btn appointment-form__home-btn"
              aria-label={t.home}
              title={t.home}
            >
              <House size={16} />
              <span className="appointment-form__home-label">{t.home}</span>
            </Link>
          </div>
        </div>

        <Card>
          <form className="stack" onSubmit={onSubmit}>
            {/* Specialty — only type shown, no doctor name */}
            <label className="field">
              <span className="field__label">{t.specialty}</span>
              <select
                className="input"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid">
              <Input
                label={t.date}
                type="date"
                min={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                label={t.time}
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <label className="field">
              <span className="field__label">{t.symptoms}</span>
              <textarea
                className="input appointment-form__textarea"
                rows={4}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder={t.symptomsPlaceholder}
                style={{ height: "auto", resize: "vertical" }}
              />
            </label>

            {/* Online consultation toggle */}
            <div className="field">
              <span className="field__label">{t.onlineConsult}</span>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setWantsOnline(true)}
                  style={{
                    padding: "8px 28px",
                    borderRadius: 8,
                    border: wantsOnline
                      ? "1.5px solid var(--color-primary, #38bdf8)"
                      : "1.5px solid rgba(255,255,255,0.15)",
                    background: wantsOnline
                      ? "rgba(56,189,248,0.15)"
                      : "rgba(255,255,255,0.04)",
                    color: wantsOnline ? "var(--color-primary, #38bdf8)" : "inherit",
                    fontWeight: wantsOnline ? 700 : 400,
                    cursor: "pointer",
                    fontSize: 14,
                    transition: "all 0.15s",
                  }}
                >
                  {t.onlineYes}
                </button>
                <button
                  type="button"
                  onClick={() => setWantsOnline(false)}
                  style={{
                    padding: "8px 28px",
                    borderRadius: 8,
                    border: !wantsOnline
                      ? "1.5px solid var(--color-primary, #38bdf8)"
                      : "1.5px solid rgba(255,255,255,0.15)",
                    background: !wantsOnline
                      ? "rgba(56,189,248,0.15)"
                      : "rgba(255,255,255,0.04)",
                    color: !wantsOnline ? "var(--color-primary, #38bdf8)" : "inherit",
                    fontWeight: !wantsOnline ? 700 : 400,
                    cursor: "pointer",
                    fontSize: 14,
                    transition: "all 0.15s",
                  }}
                >
                  {t.onlineNo}
                </button>
              </div>
            </div>

            {err ? <div className="alert">{err}</div> : null}
            {ok ? (
              <div className="badge badge--ok">
                <span className="badge__dot" />
                {ok}
              </div>
            ) : null}

            <div className="appointment-form__actions">
              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? t.creating : t.submit}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => nav("/app")}>
                {t.cancel}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
