import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import {
  fetchMyMeasurements,
  getCachedMeasurementById,
  type MeasurementItem,
} from "../lib/apiMeasurements";
import { useAppPreferences } from "../lib/appPreferences";
import { getCurrentUser } from "../lib/auth";
import { usePageSeo } from "../lib/seo";

const copy = {
  ru: {
    title: "Детали измерения",
    notFound: "Измерение не найдено",
    loadError: "Не удалось загрузить данные измерения.",
    loading: "Загрузка измерения...",
    back: "Назад",
    indicators: "Показатели",
    pressure: "Давление",
    temperature: "Температура",
    pulse: "Пульс",
    spo2: "SpO₂",
    note: "Заметка",
    device: "Устройство",
  },
  kk: {
    title: "Өлшеу деректері",
    notFound: "Өлшеу табылмады",
    loadError: "Өлшеу деректерін жүктеу мүмкін болмады.",
    loading: "Өлшеу жүктелуде...",
    back: "Артқа",
    indicators: "Көрсеткіштер",
    pressure: "Қысым",
    temperature: "Температура",
    pulse: "Пульс",
    spo2: "SpO₂",
    note: "Ескерту",
    device: "Құрылғы",
  },
  en: {
    title: "Measurement Details",
    notFound: "Measurement not found",
    loadError: "Could not load measurement details.",
    loading: "Loading measurement...",
    back: "Back",
    indicators: "Indicators",
    pressure: "Pressure",
    temperature: "Temperature",
    pulse: "Pulse",
    spo2: "SpO₂",
    note: "Note",
    device: "Device",
  },
} as const;

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
      {label}: <b>{value}</b>
    </div>
  );
}

export default function MeasurementDetails() {
  const { id } = useParams();
  const { locale } = useAppPreferences();
  const t = copy[locale];
  const currentUserId = getCurrentUser()?.id ?? null;
  const [measurement, setMeasurement] = useState<MeasurementItem | null>(() =>
    id ? getCachedMeasurementById(id, currentUserId) : null
  );
  const [loading, setLoading] = useState(() => Boolean(id) && !getCachedMeasurementById(id, currentUserId));
  const [error, setError] = useState<string | null>(null);

  const seoDescription = useMemo(() => {
    if (!measurement) {
      return locale === "kk"
        ? "HealthAssist ішіндегі өлшеу нәтижесінің жабық беті."
        : locale === "en"
          ? "Private HealthAssist page with a single measurement result."
          : "Приватная страница результата одного измерения в HealthAssist.";
    }

    return locale === "kk"
      ? `${measurement.tempC}°C, пульс ${measurement.hr}, SpO₂ ${measurement.spo2}%.`
      : locale === "en"
        ? `${measurement.tempC}°C, pulse ${measurement.hr}, SpO₂ ${measurement.spo2}%.`
        : `${measurement.tempC}°C, пульс ${measurement.hr}, SpO₂ ${measurement.spo2}%.`;
  }, [locale, measurement]);

  usePageSeo({
    title: `${t.title} — HealthAssist`,
    description: seoDescription,
    path: `/app/measurements/${id ?? ""}`,
    locale,
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    if (!id) {
      setMeasurement(null);
      setLoading(false);
      return;
    }

    const cached = getCachedMeasurementById(id, currentUserId);
    if (cached) {
      setMeasurement(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMyMeasurements()
      .then((data) => {
        if (cancelled) return;
        const found = (data.items ?? []).find((item) => item.id === id) ?? null;
        setMeasurement(found);
      })
      .catch(() => {
        if (cancelled) return;
        setError(t.loadError);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, id, t.loadError]);

  if (loading) {
    return (
      <div className="container">
        <Card>
          <div className="stack">
            <h1 className="h2">{t.title}</h1>
            <p className="muted" style={{ margin: 0 }}>{t.loading}</p>
          </div>
        </Card>
      </div>
    );
  }

  if (!measurement) {
    return (
      <div className="container">
        <Card>
          <div className="stack">
            <h1 className="h2">{t.notFound}</h1>
            {error ? <div className="alert">{error}</div> : null}
            <Link to="/app">
              <Button variant="ghost">{t.back}</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>{t.title}</h1>
            <p className="muted" style={{ margin: 0 }}>{fmtDate(measurement.createdAt)}</p>
          </div>
          <Link to="/app">
            <Button variant="ghost">{t.back}</Button>
          </Link>
        </div>

        <Card>
          <div className="stack">
            <div style={{ fontWeight: 700 }}>{t.indicators}</div>

            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <Metric label={t.pressure} value={`${measurement.systolic}/${measurement.diastolic}`} />
              <Metric label={t.temperature} value={`${measurement.tempC}°C`} />
              <Metric label={t.pulse} value={`${measurement.hr}`} />
              <Metric label={t.spo2} value={`${measurement.spo2}%`} />
              <Metric label={t.device} value={measurement.deviceId} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
