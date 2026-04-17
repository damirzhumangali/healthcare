import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import {
  DOCTORS,
  fetchAppointments,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentStatus,
} from "../lib/apiAppointments";
import { getToken } from "../lib/auth";

type StoredUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readCurrentUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("healthassist_current_user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

function patientLabel(item: Appointment) {
  return item.patientName || item.patient_email || item.patientEmail || item.patient_id || item.patientId || "Пациент";
}

function doctorLabel(item: Appointment) {
  const doctorId = item.doctor_id || item.doctorId;
  const doctor = DOCTORS.find((d) => d.id === doctorId);
  return item.doctorName || doctor?.name || doctorId || "Врач";
}

function statusLabel(status: AppointmentStatus) {
  if (status === "active") return "На приеме";
  if (status === "done") return "Завершен";
  return "Ожидает";
}

function statusClass(status: AppointmentStatus) {
  if (status === "active") return "badge--warn";
  if (status === "done") return "badge--ok";
  return "badge--danger";
}

export default function DoctorDashboard() {
  const user = useMemo(() => readCurrentUser(), []);
  const role = user?.role;
  const allowed = role === "doctor" || role === "admin";
  const [date, setDate] = useState(today());
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const data = await fetchAppointments(date);
      setItems(data.items ?? []);
    } catch {
      setErr("Не удалось загрузить записи. Проверь backend :4000.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  async function setStatus(id: string, status: AppointmentStatus) {
    setErr(null);
    try {
      await updateAppointmentStatus(id, status);
      await load();
    } catch {
      setErr("Не удалось изменить статус записи.");
    }
  }

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  if (!allowed) {
    return (
      <div className="container">
        <Card>
          <div className="stack">
            <h1 className="h2">Нет доступа</h1>
            <p className="muted" style={{ margin: 0 }}>
              Для кабинета врача нужна роль doctor или admin.
            </p>
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
            <h1 className="h1" style={{ marginBottom: 4 }}>Кабинет врача</h1>
            <p className="muted" style={{ margin: 0 }}>
              Записи пациентов на выбранную дату.
            </p>
          </div>
          <label className="field" style={{ minWidth: 180 }}>
            <span className="field__label">Дата</span>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>

        {err ? <div className="alert">{err}</div> : null}

        <Card>
          <div className="stack">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <h2 className="h2" style={{ margin: 0 }}>Пациенты сегодня</h2>
              <Button variant="ghost" onClick={load} disabled={loading}>
                {loading ? "Загрузка..." : "Обновить"}
              </Button>
            </div>

            {loading ? (
              <p className="muted" style={{ margin: 0 }}>Загрузка...</p>
            ) : items.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>На эту дату записей нет.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                    }}
                  >
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {item.time} - {patientLabel(item)}
                        </div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {doctorLabel(item)} • {item.reason}
                        </div>
                      </div>
                      <div className="row">
                        <span className={`badge ${statusClass(item.status)}`}>
                          <span className="badge__dot" />
                          {statusLabel(item.status)}
                        </span>
                        <Button
                          variant="ghost"
                          disabled={item.status === "active"}
                          onClick={() => setStatus(item.id, "active")}
                        >
                          Принять
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={item.status === "done"}
                          onClick={() => setStatus(item.id, "done")}
                        >
                          Завершить
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
