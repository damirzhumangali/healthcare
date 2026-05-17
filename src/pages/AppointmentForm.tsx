import type { FormEvent } from "react";
import { useState } from "react";
import { ArrowLeft, House, Sparkles } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import Input from "../components/Input";
import { AppointmentRequestError, createAppointment } from "../lib/apiAppointments";
import { isAdminAccount } from "../lib/adminAccess";
import { getCurrentUser } from "../lib/authStore";
import { normalizeConsultationMode, type ConsultationMode } from "../lib/consultationMode";
import { APP_LOCALES, readStoredLocale, writeStoredLocale, type AppLocale } from "../lib/locale";
import { usePageSeo } from "../lib/seo";

type Locale = AppLocale;

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

// Keyword → specialty matching (Russian + Kazakh words)
const SYMPTOM_MAP: Array<{ keywords: string[]; specialty: string }> = [
  { keywords: ["голов", "мигрен", "головокружен", "онемен", "судорог", "эпилеп", "памят", "спин", "невролог"], specialty: "Невролог" },
  { keywords: ["сердц", "давлен", "аритми", "кардио", "стенокард", "инфаркт", "тахикард", "пульс", "сосуд"], specialty: "Кардиолог" },
  { keywords: ["зуб", "десн", "рот", "кариес", "стоматолог", "челюст", "зубная"], specialty: "Стоматолог" },
  { keywords: ["глаз", "зрен", "офтальм", "слез", "видени", "слепот", "конъюнктив"], specialty: "Офтальмолог" },
  { keywords: ["ухо", "горл", "нос", "насморк", "лор", "тонзилл", "синусит", "гайморит", "ангин", "слух"], specialty: "ЛОР" },
  { keywords: ["кожа", "кож", "сыпь", "акне", "дерматит", "зуд", "экзем", "псориаз", "угр"], specialty: "Дерматолог" },
  { keywords: ["ребенок", "дет", "малыш", "педиатр", "грудной"], specialty: "Педиатр" },
  { keywords: ["диабет", "щитовидн", "гормон", "эндокрин", "ожирен", "сахар", "инсулин"], specialty: "Эндокринолог" },
  { keywords: ["кост", "сустав", "перелом", "колен", "позвоночник", "ортопед", "артрит", "остеохондроз"], specialty: "Ортопед" },
  { keywords: ["операц", "хирург", "удален", "рана", "разрез", "опухол", "аппендицит"], specialty: "Хирург" },
  { keywords: ["женск", "беремен", "месячн", "гинеколог", "матк", "яичник", "климакс"], specialty: "Гинеколог" },
  { keywords: ["почк", "моч", "мочевой", "простат", "уролог", "цистит", "пиелонефрит"], specialty: "Уролог" },
];

function detectSpecialty(text: string): string | null {
  if (!text || text.trim().length < 3) return null;
  const lower = text.toLowerCase();
  for (const entry of SYMPTOM_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.specialty;
    }
  }
  return null;
}

const appointmentText = {
  ru: {
    title: "Записаться к врачу",
    subtitle: "Опишите симптомы — система подберёт специалиста. Время назначит администратор.",
    back: "Назад",
    home: "На главную",
    specialty: "Нужный специалист",
    date: "Желаемая дата",
    symptoms: "Симптомы / Причина обращения",
    symptomsPlaceholder: "Например: головная боль, высокая температура, боль в груди...",
    symptomsHint: "Минимум 10 символов. Опишите жалобы как можно точнее.",
    suggestion: "Рекомендуем специалиста:",
    applySuggestion: "Выбрать",
    consultationType: "Формат консультации",
    visitInClinic: "Очный приём",
    visitOnlineHome: "Онлайн из дома",
    consultationHintClinic: "Пациент приедет в клинику, а время назначит администратор.",
    consultationHintOnlineHome: "После подтверждения администратор сразу создаст ссылку и отправит её пациенту и врачу.",
    fillAllError: "Заполните дату и опишите симптомы.",
    tooShortError: "Опишите симптомы подробнее — минимум 10 символов.",
    spamError: "Пожалуйста, опишите ваши реальные симптомы медицинскими словами.",
    offensiveError: "Пожалуйста, используйте корректные медицинские термины.",
    created: "Заявка отправлена. Администратор назначит врача и время.",
    createError: "Не удалось создать заявку. Попробуйте ещё раз чуть позже.",
    createAuthError: "Сессия истекла. Войдите снова, чтобы заявка дошла врачу и в админку.",
    creating: "Отправляем...",
    submit: "Отправить заявку",
    cancel: "Отмена",
  },
  kk: {
    title: "Дәрігерге жазылу",
    subtitle: "Симптомдарды сипаттаңыз — жүйе маман ұсынады. Уақытты әкімші тағайындайды.",
    back: "Артқа",
    home: "Басты бетке",
    specialty: "Қажетті маман",
    date: "Қалаулы күн",
    symptoms: "Симптомдар / Өтініш себебі",
    symptomsPlaceholder: "Мысалы: бас ауруы, жоғары температура, кеуде ауруы...",
    symptomsHint: "Кем дегенде 10 таңба. Шағымдарыңызды мүмкіндігінше нақты сипаттаңыз.",
    suggestion: "Маман ұсынылады:",
    applySuggestion: "Таңдау",
    consultationType: "Кеңес форматы",
    visitInClinic: "Клиникада қабылдау",
    visitOnlineHome: "Үйден онлайн",
    consultationHintClinic: "Пациент клиникаға келеді, ал уақытты әкімші тағайындайды.",
    consultationHintOnlineHome: "Расталғаннан кейін әкімші сілтемені бірден жасап, пациент пен дәрігерге жібереді.",
    fillAllError: "Күнді толтырыңыз және симптомдарды сипаттаңыз.",
    tooShortError: "Симптомдарды толығырақ сипаттаңыз — кем дегенде 10 таңба.",
    spamError: "Нақты симптомдарыңызды медициналық сөздермен сипаттаңыз.",
    offensiveError: "Дұрыс медициналық терминдерді қолданыңыз.",
    created: "Өтінім жіберілді. Әкімші дәрігер мен уақытты тағайындайды.",
    createError: "Өтінімді жасау мүмкін болмады. Сәл кейінірек қайта көріңіз.",
    createAuthError: "Сессия аяқталды. Өтінім дәрігер мен әкімшіге жетуі үшін қайта кіріңіз.",
    creating: "Жіберілуде...",
    submit: "Өтінім жіберу",
    cancel: "Бас тарту",
  },
  en: {
    title: "Request a Doctor Visit",
    subtitle: "Describe your symptoms — we'll suggest a specialist. Admin will set the time.",
    back: "Back",
    home: "Home",
    specialty: "Specialist needed",
    date: "Preferred date",
    symptoms: "Symptoms / Reason for visit",
    symptomsPlaceholder: "For example: headache, high fever, chest pain...",
    symptomsHint: "At least 10 characters. Describe your complaint as precisely as possible.",
    suggestion: "Recommended specialist:",
    applySuggestion: "Select",
    consultationType: "Consultation type",
    visitInClinic: "Clinic visit",
    visitOnlineHome: "Online from home",
    consultationHintClinic: "The patient will come to the clinic and the admin will assign the time.",
    consultationHintOnlineHome: "After approval, the admin will immediately create the meeting link and send it to both patient and doctor.",
    fillAllError: "Please fill in the date and describe your symptoms.",
    tooShortError: "Please describe your symptoms in more detail — at least 10 characters.",
    spamError: "Please describe your real symptoms using medical terms.",
    offensiveError: "Please use appropriate medical terminology.",
    created: "Request sent. An admin will assign a doctor and time.",
    createError: "Could not create the request. Please try again a little later.",
    createAuthError: "Your session expired. Sign in again so the request reaches the doctor and admin.",
    creating: "Sending...",
    submit: "Send request",
    cancel: "Cancel",
  },
} as const;

const BAD_WORDS = ["хуй", "пизд", "еба", "бляд", "ёба", "блят", "сука", "пиздец", "нахуй", "ёбан", "залуп", "мудак", "мудил", "ублюд"];

function validateSymptoms(text: string): "ok" | "short" | "spam" | "offensive" {
  const trimmed = text.trim();
  if (trimmed.length < 10) return "short";

  const lower = trimmed.toLowerCase();
  if (BAD_WORDS.some((w) => lower.includes(w))) return "offensive";

  // Detect spam: repeated chars (ааааа), or less than 50% actual letters
  if (/(.)\1{4,}/.test(trimmed)) return "spam";
  const letters = (trimmed.match(/[а-яёa-zәіңғүұқөһ]/gi) ?? []).length;
  if (letters / trimmed.length < 0.45) return "spam";

  return "ok";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AppointmentForm() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = getCurrentUser();
  const requestedMode = normalizeConsultationMode(searchParams.get("mode"));
  const [locale, setLocale] = useState<Locale>(() => readStoredLocale());
  const [specialty, setSpecialty] = useState(SPECIALTIES[0] ?? "");
  const [date, setDate] = useState(today());
  const [symptoms, setSymptoms] = useState("");
  const [suggested, setSuggested] = useState<string | null>(null);
  const [consultationMode, setConsultationMode] = useState<ConsultationMode>(
    requestedMode === "online_home" ? "online_home" : "in_person",
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const t = appointmentText[locale];

  usePageSeo({
    title: locale === "kk" ? "Дәрігерге жазылу — HealthAssist" : locale === "en" ? "Doctor appointment — HealthAssist" : "Запись к врачу — HealthAssist",
    description: locale === "kk" ? "HealthAssist жеке кабинетінде дәрігерге жазылуға арналған қызметтік бет." : locale === "en" ? "Internal HealthAssist page for booking a doctor appointment." : "Служебная страница записи к врачу в личном кабинете HealthAssist.",
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

  function handleSymptomsChange(text: string) {
    setSymptoms(text);
    const match = detectSpecialty(text);
    setSuggested(match && match !== specialty ? match : null);
  }

  function applySuggestion() {
    if (suggested) {
      setSpecialty(suggested);
      setSuggested(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!date || !symptoms.trim()) {
      setErr(t.fillAllError);
      return;
    }

    const check = validateSymptoms(symptoms);
    if (check === "short") { setErr(t.tooShortError); return; }
    if (check === "spam") { setErr(t.spamError); return; }
    if (check === "offensive") { setErr(t.offensiveError); return; }

    setLoading(true);
    try {
      await createAppointment({
        date,
        time: "",
        reason: symptoms.trim(),
        specialtyRequest: specialty,
        wantsOnline: consultationMode !== "in_person",
        consultationMode,
      });
      setOk(t.created);
      window.setTimeout(() => nav("/app"), 1500);
    } catch (error) {
      setErr(error instanceof AppointmentRequestError && error.code === "auth_required" ? t.createAuthError : t.createError);
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
            <p className="muted" style={{ margin: 0 }}>{t.subtitle}</p>
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
                  className={`appointment-form__locale-item ${locale === lang ? "appointment-form__locale-item--active" : ""}`}
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

            {/* Symptoms first — drives specialty suggestion */}
            <label className="field">
              <span className="field__label">{t.symptoms}</span>
              <textarea
                className="input appointment-form__textarea"
                rows={4}
                value={symptoms}
                onChange={(e) => handleSymptomsChange(e.target.value)}
                placeholder={t.symptomsPlaceholder}
                style={{ height: "auto", resize: "vertical" }}
              />
              <span style={{
                fontSize: 11, marginTop: 4, display: "block",
                color: symptoms.trim().length >= 10 ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.3)",
              }}>
                {symptoms.trim().length}/10 — {t.symptomsHint}
              </span>
            </label>

            {/* Smart suggestion chip */}
            {suggested ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 10,
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.35)",
              }}>
                <Sparkles size={15} style={{ color: "#818cf8", flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", flex: 1 }}>
                  {t.suggestion} <strong style={{ color: "#a5b4fc" }}>{suggested}</strong>
                </span>
                <button
                  type="button"
                  onClick={applySuggestion}
                  style={{
                    background: "rgba(99,102,241,0.25)", color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.5)",
                    borderRadius: 7, padding: "4px 12px",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {t.applySuggestion}
                </button>
              </div>
            ) : null}

            {/* Specialty dropdown */}
            <label className="field">
              <span className="field__label">{t.specialty}</span>
              <select
                className="input"
                value={specialty}
                onChange={(e) => { setSpecialty(e.target.value); setSuggested(null); }}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            {/* Preferred date only — time set by admin */}
            <Input
              label={t.date}
              type="date"
              min={today()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            {/* Consultation type */}
            <div className="field">
              <span className="field__label">{t.consultationType}</span>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                {[
                  { value: "in_person" as const, label: t.visitInClinic },
                  { value: "online_home" as const, label: t.visitOnlineHome },
                ].map((option) => {
                  const active = consultationMode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setConsultationMode(option.value)}
                      style={{
                        padding: "8px 28px", borderRadius: 8, fontSize: 14,
                        cursor: "pointer", transition: "all 0.15s",
                        fontWeight: active ? 700 : 400,
                        border: active
                          ? "1.5px solid var(--color-primary, #38bdf8)"
                          : "1.5px solid rgba(255,255,255,0.15)",
                        background: active ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.04)",
                        color: active ? "var(--color-primary, #38bdf8)" : "inherit",
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <span
                style={{
                  fontSize: 12,
                  marginTop: 8,
                  display: "block",
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.5,
                }}
              >
                {consultationMode === "online_home"
                  ? t.consultationHintOnlineHome
                  : t.consultationHintClinic}
              </span>
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
