import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { getToken } from "../lib/auth";
import { createMeasurement } from "../lib/apiMeasurements";

export default function ScanDevice() {
  const nav = useNavigate();
  const { deviceId = "device-001" } = useParams();
  const authed = !!getToken();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="center" style={{ minHeight: "100vh" }}>
      <Card>
        <div className="stack">
          <div>
            <div className="kicker">QR → СТАНЦИЯ</div>
            <h1 className="h1">Станция измерений</h1>
            <p className="muted" style={{ margin: 0 }}>
              Устройство: <b>{deviceId}</b>
            </p>
          </div>

          {!authed ? (
            <div className="stack">
              <h2 className="h2" style={{ marginTop: 6 }}>Нужен вход</h2>
              <p className="muted" style={{ marginTop: -6 }}>
                Чтобы начать измерение и сохранить результат — войди в аккаунт.
              </p>

              <div className="row">
                <Button onClick={() => nav("/login")}>Войти</Button>
                <Button variant="ghost" onClick={() => nav("/register")}>Регистрация</Button>
              </div>
            </div>
          ) : (
            <div className="stack">
              <h2 className="h2" style={{ marginTop: 6 }}>Готово к измерению</h2>
              <p className="muted" style={{ marginTop: -6 }}>
                Нажми кнопку — сервер создаст измерение “как с датчиков”, и оно появится в кабинете.
              </p>

              {err ? <div className="alert">{err}</div> : null}

              <div className="row">
                <Button
                  onClick={async () => {
                    setErr(null);
                    setLoading(true);
                    try {
                      await createMeasurement(deviceId);
                      nav("/app");
                    } catch {
                      setErr("Не получилось создать измерение. Проверь backend :4000 и попробуй ещё раз.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading ? "Измеряю..." : "Начать измерение"}
                </Button>

                <Button variant="ghost" onClick={() => nav("/app")}>
                  Открыть кабинет
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
