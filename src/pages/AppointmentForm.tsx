import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import Input from "../components/Input";
import { createAppointment, DOCTORS, fetchDoctors, type DoctorOption } from "../lib/apiAppointments";
import { isAdminAccount } from "../lib/adminAccess";
import { getCurrentUser } from "../lib/authStore";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function AppointmentForm() {
  const nav = useNavigate();
  const currentUser = getCurrentUser();
  const [doctors, setDoctors] = useState<DoctorOption[]>(DOCTORS);
  const [doctorId, setDoctorId] = useState(DOCTORS[0]?.id ?? "");
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!doctorId || !date || !time || !reason.trim()) {
      setErr("Заполните врача, дату, время и причину приема.");
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
      setOk("Запись создана.");
      window.setTimeout(() => nav("/app"), 650);
    } catch {
      setErr("Не удалось создать запись. Проверь backend :4000 и попробуй еще раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="stack">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 4 }}>Запись к врачу</h1>
            <p className="muted" style={{ margin: 0 }}>
              Выберите специалиста и удобное время приема.
            </p>
          </div>
          <Link to="/app">
            <Button variant="ghost">Назад</Button>
          </Link>
        </div>

        <Card>
          <form className="stack" onSubmit={onSubmit}>
            <label className="field">
              <span className="field__label">Врач</span>
              <select
                className="input"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid">
              <Input
                label="Дата"
                type="date"
                min={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Input
                label="Время"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            <label className="field">
              <span className="field__label">Причина приема</span>
              <textarea
                className="input"
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Например: головная боль, давление, консультация по анализам"
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

            <div className="row">
              <Button disabled={loading}>{loading ? "Создаем..." : "Записаться"}</Button>
              <Button type="button" variant="ghost" onClick={() => nav("/app")}>
                Отмена
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
