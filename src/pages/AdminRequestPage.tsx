import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Check, Clock, Video } from "lucide-react";
import {
  DOCTORS,
  assignDoctorToAppointment,
  updateAppointmentStatus,
  fetchAppointments,
  type Appointment,
} from "../lib/apiAppointments";
import { fetchAdminDoctors, notifyOnlineMeeting } from "../lib/apiAdmin";
import { usePageSeo } from "../lib/seo";

type DoctorRow = { id: string; name: string; specialty: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function jitsiRoomUrl(appointmentId: string) {
  return `https://meet.jit.si/healthassist-${appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

function getBusyDoctorIds(date: string, appointments: Appointment[], excludeId: string): Set<string> {
  return new Set(
    appointments
      .filter((a) =>
        a.date === date &&
        a.id !== excludeId &&
        a.status === "active" &&
        (a.doctor_id || a.doctorId)
      )
      .map((a) => (a.doctor_id || a.doctorId) as string)
  );
}

export default function AdminRequestPage() {
  usePageSeo({
    title: "Принять заявку — HealthAssist",
    description: "Назначение врача и времени для заявки пациента.",
    path: "/admin/request",
    locale: "ru",
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [request, setRequest] = useState<Appointment | null>(
    (location.state as { appointment?: Appointment } | null)?.appointment ?? null
  );
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>(DOCTORS);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    fetchAppointments().then((d) => setAllAppointments(d.items ?? [])).catch(() => {});
    fetchAdminDoctors()
      .then((d) => { if (d.items.length > 0) setDoctors(d.items); })
      .catch(() => {});
  }, []);

  // If request not passed via state, try to find it in allAppointments
  useEffect(() => {
    if (!request && id && allAppointments.length > 0) {
      const found = allAppointments.find((a) => a.id === id);
      if (found) setRequest(found);
    }
  }, [id, request, allAppointments]);

  const date = request?.date || today();
  const busyIds = getBusyDoctorIds(date, allAppointments, id ?? "");
  const isOnline = request?.wants_online || request?.wantsOnline;
  const jitsiUrl = request ? jitsiRoomUrl(request.id) : "";
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  // specialty matching — highlight matching doctors first
  const specialtyNeeded = request?.specialty_request || request?.specialtyRequest;
  const sortedDoctors = [...doctors].sort((a, b) => {
    const aMatch = specialtyNeeded && a.specialty === specialtyNeeded ? -1 : 0;
    const bMatch = specialtyNeeded && b.specialty === specialtyNeeded ? -1 : 0;
    const aFree = !busyIds.has(a.id) ? -1 : 1;
    const bFree = !busyIds.has(b.id) ? -1 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return aFree - bFree;
  });

  async function handleAssign() {
    if (!request || !selectedDoctorId || !time) return;
    setSaving(true);
    try {
      const meetingUrl = isOnline && jitsiUrl ? jitsiUrl : undefined;
      await assignDoctorToAppointment(request.id, selectedDoctorId, time, meetingUrl);
      await updateAppointmentStatus(request.id, "active");

      if (isOnline && jitsiUrl) {
        setNotifyStatus("sending");
        const meetingAt = `${date}T${time}:00`;
        const { notified } = await notifyOnlineMeeting(request.id, jitsiUrl, meetingAt);
        setNotifyStatus(notified ? "sent" : "failed");
      }

      setDone(true);
      window.setTimeout(() => nav("/admin"), 2500);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0b0f14 0%, #111827 100%)",
      color: "white",
      fontFamily: "inherit",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "16px 28px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}>
        <button
          type="button"
          onClick={() => nav("/admin")}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8, fontSize: 13,
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "white", cursor: "pointer",
          }}
        >
          <ArrowLeft size={14} /> Назад
        </button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17 }}>Назначить врача</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Выберите свободного врача и укажите время</div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "28px 24px" }}>

        {/* Patient card */}
        {request && (
          <div style={{
            borderRadius: 16, padding: "18px 22px", marginBottom: 28,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Заявка пациента
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              {request.patientName || request.patient_name || request.patient_email || "Пациент"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {specialtyNeeded && (
                <span style={{ background: "rgba(99,102,241,0.18)", color: "#a5b4fc", borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>
                  {specialtyNeeded}
                </span>
              )}
              {isOnline && (
                <span style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee", borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>
                  🎥 Онлайн консультация
                </span>
              )}
              <span style={{ background: "rgba(251,191,36,0.12)", color: "#f59e0b", borderRadius: 7, padding: "3px 12px", fontSize: 13 }}>
                📅 {request.date || "дата не указана"}
              </span>
            </div>
            {request.reason && (
              <div style={{
                marginTop: 12, fontSize: 14, color: "rgba(255,255,255,0.55)",
                fontStyle: "italic", background: "rgba(255,255,255,0.03)",
                borderRadius: 8, padding: "10px 14px",
              }}>
                «{request.reason}»
              </div>
            )}
          </div>
        )}

        {/* Step 1: Doctor selection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            Шаг 1 — Выберите врача
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {sortedDoctors.map((doc) => {
              const isBusy = busyIds.has(doc.id);
              const isSelected = selectedDoctorId === doc.id;
              const isMatch = specialtyNeeded && doc.specialty === specialtyNeeded;

              return (
                <div
                  key={doc.id}
                  style={{
                    borderRadius: 14, padding: "16px 18px",
                    border: isSelected
                      ? "2px solid #34d399"
                      : isMatch
                        ? "1px solid rgba(52,211,153,0.35)"
                        : "1px solid rgba(255,255,255,0.08)",
                    background: isSelected
                      ? "rgba(52,211,153,0.1)"
                      : "rgba(255,255,255,0.04)",
                    opacity: 1,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    position: "relative",
                  }}
                  onClick={() => setSelectedDoctorId(doc.id)}
                >
                  {isMatch && !isSelected && (
                    <div style={{
                      position: "absolute", top: 10, right: 12,
                      fontSize: 10, fontWeight: 700, color: "#34d399",
                      background: "rgba(52,211,153,0.12)",
                      borderRadius: 5, padding: "2px 7px",
                    }}>
                      Подходит
                    </div>
                  )}
                  {isSelected && (
                    <div style={{ position: "absolute", top: 10, right: 12 }}>
                      <Check size={16} color="#34d399" />
                    </div>
                  )}

                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: "rgba(99,102,241,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 800, marginBottom: 10,
                    color: "#a5b4fc",
                  }}>
                    {doc.name.charAt(0)}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "white" }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
                    {doc.specialty}
                  </div>

                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700,
                    background: isSelected
                      ? "rgba(52,211,153,0.2)"
                      : isBusy
                        ? "rgba(251,191,36,0.1)"
                        : "rgba(52,211,153,0.12)",
                    color: isSelected ? "#34d399" : isBusy ? "#f59e0b" : "#34d399",
                    border: isSelected
                      ? "1px solid rgba(52,211,153,0.3)"
                      : isBusy
                        ? "1px solid rgba(251,191,36,0.25)"
                        : "1px solid rgba(52,211,153,0.3)",
                  }}>
                    {isSelected ? "✓ Выбран" : isBusy ? "⚠ Занят (активный приём)" : "Свободен"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Time selection — appears after doctor selected */}
        {selectedDoctorId && (
          <div style={{
            borderRadius: 16, padding: "20px 22px", marginBottom: 24,
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.2)",
          }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              Шаг 2 — Укажите время приёма
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Врач</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedDoctor?.name} · {selectedDoctor?.specialty}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Дата</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{date}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} /> Время приёма
                </div>
                <input
                  type="time"
                  className="input"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{ minWidth: 120, fontSize: 15, fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Online consultation preview */}
            {isOnline && jitsiUrl && (
              <div style={{
                marginTop: 16, borderRadius: 10, padding: "12px 16px",
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.2)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <Video size={16} style={{ color: "#22d3ee", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#22d3ee", fontWeight: 700 }}>Ссылка на онлайн встречу будет отправлена автоматически</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2, wordBreak: "break-all" }}>{jitsiUrl}</div>
                </div>
                <a
                  href={jitsiUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "rgba(34,211,238,0.15)", color: "#22d3ee",
                    border: "1px solid rgba(34,211,238,0.3)",
                    borderRadius: 7, padding: "5px 12px",
                    fontSize: 12, fontWeight: 700, textDecoration: "none",
                  }}
                >
                  Открыть
                </a>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        {selectedDoctorId && (
          done ? (
            <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#34d399", fontWeight: 700, fontSize: 16 }}>
                <Check size={20} />
                Заявка принята! Возвращаемся...
              </div>
              {isOnline && (
                <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  {notifyStatus === "sending" && (
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>⏳ Отправляем ссылку...</span>
                  )}
                  {notifyStatus === "sent" && (
                    <span style={{ color: "#22d3ee" }}>✓ Ссылка отправлена пациенту и врачу</span>
                  )}
                  {notifyStatus === "failed" && (
                    <span style={{ color: "#6ee7b7" }}>✓ Ссылка доступна в кабинете пациента автоматически</span>
                  )}
                </div>
              )}
              {isOnline && jitsiUrl && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", wordBreak: "break-all", flex: 1 }}>{jitsiUrl}</div>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(jitsiUrl)}
                    style={{
                      padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.3)", color: "#22d3ee",
                    }}
                  >
                    📋 Скопировать
                  </button>
                  <a
                    href={jitsiUrl} target="_blank" rel="noreferrer"
                    style={{
                      padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700, textDecoration: "none",
                      background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)", color: "#34d399",
                    }}
                  >
                    Открыть
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                disabled={saving || !time}
                onClick={handleAssign}
                style={{
                  padding: "13px 32px", borderRadius: 12, fontSize: 15, fontWeight: 800,
                  background: !time
                    ? "rgba(255,255,255,0.07)"
                    : "linear-gradient(135deg, #34d399, #22d3ee)",
                  color: !time ? "rgba(255,255,255,0.3)" : "#0a1628",
                  border: "none",
                  cursor: !time ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {saving
                  ? "Отправляем..."
                  : `Назначить ${selectedDoctor?.name ?? ""} · ${date} ${time || "— укажите время"}`
                }
              </button>
              {!time && (
                <span style={{ fontSize: 13, color: "#f59e0b" }}>⚠ Укажите время приёма</span>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
