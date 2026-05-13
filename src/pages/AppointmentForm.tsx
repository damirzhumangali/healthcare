import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { ArrowLeft, House } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Input from "../components/Input";
import { createAppointment, DOCTORS, fetchDoctors, type DoctorOption } from "../lib/apiAppointments";
import { isAdminAccount } from "../lib/adminAccess";
import { getCurrentUser } from "../lib/authStore";
import { APP_LOCALES, readStoredLocale, writeStoredLocale, type AppLocale } from "../lib/locale";
import { usePageSeo } from "../lib/seo";

type Locale = AppLocale;

const appointmentText = {
  ru: {
    title: "Запись к врачу",
    subtitle: "Выберите специалиста и удобное время приема.",
    back: "Назад",
    home: "На главную",
    doctor: "Врач",
    date: "Дата",
    time: "Время",
    reason: "Причина приема",
    reasonPlaceholder: "Например: головная боль, давление, консультация по анализам",
    fillAllError: "Заполните врача, дату, время и причину приема.",
    created: "Запись создана.",
    createError: "Не удалось создать запись. Попробуйте ещё раз чуть позже.",
    creating: "Создаем...",
    submit: "Записаться",
    cancel: "Отмена",
  },
  kk: {
    title: "Дәрігерге жазылу",
    subtitle: "Маманды және қабылдау уақытын таңдаңыз.",
    back: "Артқа",
    home: "Басты бетке",
    doctor: "Дәрігер",
    date: "Күні",
    time: "Уақыты",
    reason: "Қабылдау себебі",
    reasonPlaceholder: "Мысалы: бас ауруы, қысым, талдаулар бойынша кеңес",
    fillAllError: "Дәрігерді, күнді, уақытты және қабылдау себебін толтырыңыз.",
    created: "Жазылу жасалды.",
    createError: "Жазылуды жасау мүмкін болмады. Сәл кейінірек қайта көріңіз.",
    creating: "Жасалуда...",
    submit: "Жазылу",
    cancel: "Бас тарту",
  },
  en: {
    title: "Book a Doctor Visit",
    subtitle: "Choose a specialist and a convenient appointment time.",
    back: "Back",
    home: "Home",
    doctor: "Doctor",
    date: "Date",
    time: "Time",
    reason: "Reason for visit",
    reasonPlaceholder: "For example: headache, blood pressure, lab results consultation",
    fillAllError: "Please fill in doctor, date, time, and reason for visit.",
    created: "Appointment created.",
    createError: "Could not create the appointment. Please try again a little later.",
    creating: "Creating...",
    submit: "Book appointment",
    cancel: "Cancel",
  },
} as const;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cleanDoctorName(name: string) {
  return name.replace(/^(?:Др\.|Dr\.)\s*/i, "").trim();
}

function doctorOptionLabel(doctor: DoctorOption) {
  return `${cleanDoctorName(doctor.name)} — ${doctor.specialty}`;
}

export default function AppointmentForm() {
  const nav = useNavigate();
  const currentUser = getCurrentUser();
  const [locale, setLocale] = useState<Locale>(() => readStoredLocale());
  const [doctors, setDoctors] = useState<DoctorOption[]>(DOCTORS);
  const [doctorId, setDoctorId] = useState(DOCTORS[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
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

  useEffect(() => {
    let cancelled = false;

    fetchDoctors()
      .then((data) => {
        if (cancelled) return;
        const activeDoctors = data.items.filter((doctor) => doctor.active !== false);
        setDoctors(activeDoctors);
        setDoctorId((currentDoctorId) =>
          activeDoctors.some((doctor) => doctor.id === currentDoctorId)
            ? currentDoctorId
            : activeDoctors[0]?.id ?? ""
        );
      })
      .catch(() => {
        if (cancelled) return;
        setDoctors(DOCTORS);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

    if (!doctorId || !date || !time || !reason.trim()) {
      setErr(t.fillAllError);
      return;
    }

    setLoading(true);
    try {
      await createAppointment({
        doctorId,
        date,
        time,
        reason: reason.trim(),
      });
      setOk(t.created);
      window.setTimeout(() => nav("/app"), 650);
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
            <label className="field">
              <span className="field__label">{t.doctor}</span>
              <select
                className="input"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctorOptionLabel(doctor)}
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
              <span className="field__label">{t.reason}</span>
              <textarea
                className="input appointment-form__textarea"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.reasonPlaceholder}
                style={{ height: "auto", resize: "vertical" }}
              />
            </label>

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
