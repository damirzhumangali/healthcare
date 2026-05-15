import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Bot,
  CalendarClock,
  HeartPulse,
  Mic,
  Package,
  Stethoscope,
  Video,
} from "lucide-react";
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
import { hasSession } from "../lib/auth";
import {
  syncBedsideConsultations,
  updateBedsideConsultationStage,
  type BedsideConsultationView,
  type ConsultationStage,
} from "../lib/onlineConsultations";
import { usePageSeo } from "../lib/seo";

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

function consultationStatusLabel(stage: ConsultationStage) {
  if (stage === "robot_en_route") return "Робот в пути";
  if (stage === "bedside_ready") return "У кровати";
  if (stage === "live") return "Связь активна";
  if (stage === "completed") return "Сохранено";
  return "Назначено";
}

function consultationStatusClass(stage: ConsultationStage) {
  if (stage === "live" || stage === "completed" || stage === "bedside_ready") return "badge--ok";
  return "badge--warn";
}

export default function DoctorDashboard() {
  usePageSeo({
    title: "Кабинет врача — HealthAssist",
    description: "Служебный кабинет врача в системе HealthAssist.",
    path: "/doctor",
    locale: "ru",
    robots: "noindex, nofollow",
  });

  const user = useMemo(() => readCurrentUser(), []);
  const role = user?.role;
  const allowed = role === "doctor" || role === "admin";
  const [date, setDate] = useState(today());
  const [items, setItems] = useState<Appointment[]>([]);
  const [consultations, setConsultations] = useState<BedsideConsultationView[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const data = await fetchAppointments(date);
      const appointmentItems = data.items ?? [];
      setItems(appointmentItems);
      setConsultations(syncBedsideConsultations(appointmentItems));
    } catch {
      setErr("Не удалось загрузить записи. Проверь backend и VITE_API_BASE_URL.");
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

  async function setConsultationStage(session: BedsideConsultationView, stage: ConsultationStage) {
    setErr(null);
    try {
      updateBedsideConsultationStage(session.id, stage);
      if (stage === "live") {
        await updateAppointmentStatus(session.appointmentId, "active");
      }
      if (stage === "completed") {
        await updateAppointmentStatus(session.appointmentId, "done");
      }
      await load();
    } catch {
      setErr("Не удалось изменить статус онлайн-консультации.");
    }
  }

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (!hasSession()) {
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
          <div className="stack telemed-card">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 className="h2" style={{ margin: 0 }}>Онлайн-консультации в палатах</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  Один поток для врача: время, палата, робот, разговор и телеметрия пациента.
                </p>
              </div>
              <Button variant="ghost" onClick={load} disabled={loading}>
                {loading ? "Загрузка..." : "Обновить"}
              </Button>
            </div>

            {loading ? (
              <p className="muted" style={{ margin: 0 }}>Загрузка...</p>
            ) : consultations.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                На эту дату нет палатных онлайн-консультаций.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {consultations.map((session) => (
                  <div key={session.id} className="dashboard-list-item telemed-session">
                    <div className="telemed-session__top">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>
                          {session.time} - {session.patientName}
                        </div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {session.doctorName} • {session.notes}
                        </div>
                      </div>
                      <span className={`badge ${consultationStatusClass(session.stage)}`}>
                        <span className="badge__dot" />
                        {consultationStatusLabel(session.stage)}
                      </span>
                    </div>

                    <div className="telemed-grid telemed-grid--compact">
                      <div className="telemed-stat telemed-stat--compact">
                        <div className="telemed-stat__icon"><CalendarClock size={18} /></div>
                        <span className="telemed-stat__label">Время</span>
                        <strong className="telemed-stat__value">{session.date} • {session.time}</strong>
                        <span className="telemed-stat__meta">Назначение врача</span>
                      </div>
                      <div className="telemed-stat telemed-stat--compact">
                        <div className="telemed-stat__icon"><BedDouble size={18} /></div>
                        <span className="telemed-stat__label">Палата</span>
                        <strong className="telemed-stat__value">{session.wardLabel}</strong>
                        <span className="telemed-stat__meta">{session.bedLabel}</span>
                      </div>
                      <div className="telemed-stat telemed-stat--compact">
                        <div className="telemed-stat__icon"><Bot size={18} /></div>
                        <span className="telemed-stat__label">Терминал</span>
                        <strong className="telemed-stat__value">{session.robotUnit}</strong>
                        <span className="telemed-stat__meta">
                          {session.devices.robotLinked ? "маршрут активен" : "ожидает команды"}
                        </span>
                      </div>
                      <div className="telemed-stat telemed-stat--compact">
                        <div className="telemed-stat__icon"><Stethoscope size={18} /></div>
                        <span className="telemed-stat__label">Врач</span>
                        <strong className="telemed-stat__value">{session.doctorName}</strong>
                        <span className="telemed-stat__meta">{session.specialty}</span>
                      </div>
                    </div>

                    <div className="telemed-body telemed-body--doctor">
                      <div className="telemed-panel">
                        <div className="telemed-panel__title">Готовность канала связи</div>
                        <div className="telemed-device-grid">
                          {[
                            {
                              key: "video",
                              label: "Камера",
                              icon: <Video size={16} />,
                              ready: session.devices.cameraReady,
                            },
                            {
                              key: "audio",
                              label: "Микрофон",
                              icon: <Mic size={16} />,
                              ready: session.devices.audioReady,
                            },
                            {
                              key: "monitor",
                              label: "Показатели",
                              icon: <HeartPulse size={16} />,
                              ready: session.devices.monitoringReady,
                            },
                            {
                              key: "meds",
                              label: "Лекарства",
                              icon: <Package size={16} />,
                              ready: session.devices.medicationReady,
                            },
                          ].map((device) => (
                            <div
                              key={device.key}
                              className={`telemed-device ${device.ready ? "telemed-device--ready" : "telemed-device--pending"}`}
                            >
                              <span className="telemed-device__icon">{device.icon}</span>
                              <span>
                                <strong>{device.label}</strong>
                                <small>{device.ready ? "готово" : "ожидает"}</small>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="telemed-panel">
                        <div className="telemed-panel__title">Показатели пациента</div>
                        <div className="telemed-vitals">
                          <div className="telemed-vital">
                            <span>Темп</span>
                            <strong>{session.vitals.tempC}°C</strong>
                          </div>
                          <div className="telemed-vital">
                            <span>Пульс</span>
                            <strong>{session.vitals.pulseBpm}</strong>
                          </div>
                          <div className="telemed-vital">
                            <span>Давление</span>
                            <strong>{session.vitals.systolic}/{session.vitals.diastolic}</strong>
                          </div>
                          <div className="telemed-vital">
                            <span>SpO₂</span>
                            <strong>{session.vitals.spo2}%</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="row telemed-session__actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
                      <span className="muted" style={{ fontSize: 13 }}>
                        После завершения звонка итог и назначение автоматически сохраняются в историю пациента.
                      </span>
                      <div className="row" style={{ gap: 8 }}>
                        {session.stage === "scheduled" ? (
                          <Button variant="ghost" onClick={() => void setConsultationStage(session, "robot_en_route")}>
                            Отправить робота
                          </Button>
                        ) : null}
                        {session.stage === "robot_en_route" ? (
                          <Button variant="ghost" onClick={() => void setConsultationStage(session, "bedside_ready")}>
                            У кровати
                          </Button>
                        ) : null}
                        {session.stage === "bedside_ready" ? (
                          <Button onClick={() => void setConsultationStage(session, "live")}>
                            Начать связь
                          </Button>
                        ) : null}
                        {session.stage === "live" ? (
                          <Button onClick={() => void setConsultationStage(session, "completed")}>
                            Завершить и сохранить
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

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
