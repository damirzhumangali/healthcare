import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { fetchMyMeasurements, createMeasurement } from "../lib/apiMeasurements";

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function Dashboard() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const data = await fetchMyMeasurements();
      setItems(data.items ?? []);
    } catch {
      setErr("Не удалось загрузить измерения. Проверь backend :4000.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container">
      <div className="stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>Кабинет пациента</h1>
            <p className="muted" style={{ margin: 0 }}>
              Данные приходят с backend (симуляция “машинки”).
            </p>
          </div>

          <div className="row">
            <Button
              onClick={async () => {
                setErr(null);
                try {
                  await createMeasurement("device-001");
                  await load();
                } catch {
                  setErr("Не получилось создать измерение. Проверь backend :4000.");
                }
              }}
            >
              Новое измерение
            </Button>

            <Button variant="ghost" onClick={() => nav("/scan/device-001")}>
              К QR-станции
            </Button>
          </div>
        </div>

        {err ? <div className="alert">{err}</div> : null}

        <Card>
          <div className="stack">
            <h2 className="h2" style={{ margin: 0 }}>История</h2>

            {loading ? (
              <p className="muted" style={{ margin: 0 }}>Загрузка...</p>
            ) : items.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Пока нет измерений. Нажми “Новое измерение” или зайди на QR-станцию.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((m) => (
                  <Link
                    key={m.id}
                    to={`/app/measurements/${m.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div className="muted" style={{ fontSize: 13 }}>
                            {fmtDate(m.createdAt)} • device: {m.deviceId}
                          </div>
                          <div style={{ fontWeight: 700, marginTop: 2 }}>
                            Давление: {m.systolic}/{m.diastolic} • Темп: {m.tempC}°C
                          </div>
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          Пульс {m.hr} • SpO₂ {m.spo2}%
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
