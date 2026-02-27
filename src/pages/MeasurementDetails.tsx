import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { getMeasurementById } from "../lib/measurementsStore";

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

export default function MeasurementDetails() {
  const { id } = useParams();

  const m = useMemo(() => {
    if (!id) return null;
    return getMeasurementById(id);
  }, [id]);

  if (!m) {
    return (
      <div className="container">
        <Card>
          <div className="stack">
            <h1 className="h2">Измерение не найдено</h1>
            <Link to="/app">
              <Button variant="ghost">Назад</Button>
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
            <h1 className="h1" style={{ marginBottom: 4 }}>Детали измерения</h1>
            <p className="muted" style={{ margin: 0 }}>{fmtDate(m.createdAt)}</p>
          </div>
          <Link to="/app">
            <Button variant="ghost">Назад</Button>
          </Link>
        </div>

        <Card>
          <div className="stack">
            <div style={{ fontWeight: 700 }}>Показатели</div>

            <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
                Давление: <b>{m.systolic}/{m.diastolic}</b>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
                Температура: <b>{m.tempC}°C</b>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
                Пульс: <b>{m.hr}</b>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,0.10)" }}>
                SpO₂: <b>{m.spo2}%</b>
              </div>
            </div>

            {m.note ? <p className="muted" style={{ margin: 0 }}>Заметка: {m.note}</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
