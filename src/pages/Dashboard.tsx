import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { fetchMyMeasurements, createMeasurement } from "../lib/apiMeasurements";
import { createNewMyTicket, getMyTicket, getOrCreateMyTicket, type OnlineTicketView } from "../lib/onlineTicket";

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
  const [ticket, setTicket] = useState<OnlineTicketView | null>(null);

  function refreshTicket() {
    setTicket(getMyTicket());
  }

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
    refreshTicket();

    const timer = window.setInterval(() => {
      refreshTicket();
    }, 15000);

    return () => window.clearInterval(timer);
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
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Онлайн-талон</h2>
              <Button variant="ghost" onClick={refreshTicket}>
                Обновить
              </Button>
            </div>

            {!ticket ? (
              <div className="stack">
                <p className="muted" style={{ margin: 0 }}>
                  У вас пока нет активного талона.
                </p>
                <div className="row">
                  <Button
                    onClick={() => {
                      const created = getOrCreateMyTicket();
                      setTicket(created);
                    }}
                  >
                    Взять новый талон
                  </Button>
                </div>
              </div>
            ) : (
              <div className="stack">
                <div className="grid">
                  <div className="metric">
                    <div className="metric__label">Ваш номер</div>
                    <div className="metric__value">A-{ticket.ticketNumber}</div>
                  </div>
                  <div className="metric">
                    <div className="metric__label">Сейчас вызывают</div>
                    <div className="metric__value">A-{ticket.servingNow}</div>
                  </div>
                  <div className="metric">
                    <div className="metric__label">Перед вами</div>
                    <div className="metric__value">{ticket.peopleAhead}</div>
                  </div>
                  <div className="metric">
                    <div className="metric__label">Ожидание</div>
                    <div className="metric__value">~{ticket.etaMinutes} мин</div>
                  </div>
                </div>

                <div className="row">
                  <Button
                    onClick={() => {
                      const next = createNewMyTicket();
                      setTicket(next);
                    }}
                  >
                    Взять новый талон
                  </Button>
                  <span className={`badge ${
                    ticket.status === "invited"
                      ? "badge--ok"
                      : ticket.status === "waiting"
                        ? "badge--warn"
                        : "badge--danger"
                  }`}>
                    <span className="badge__dot" />
                    {ticket.status === "invited"
                      ? "Ваш номер вызывают"
                      : ticket.status === "waiting"
                        ? "Ожидайте вызова"
                        : "Талон пропущен"}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Выдан: {fmtDate(ticket.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

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
