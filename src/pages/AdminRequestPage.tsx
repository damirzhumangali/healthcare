import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, CalendarClock, Check, Video } from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import {
  DOCTORS,
  assignDoctorToAppointment,
  fetchAppointments,
  type Appointment,
} from "../lib/apiAppointments";
import {
  isHomeOnlineConsultation,
  isWardOnlineConsultation,
  readBedLabel,
  readRoomLabel,
  readWardLabel,
} from "../lib/consultationMode";
import { fetchAdminDoctors, notifyOnlineMeeting } from "../lib/apiAdmin";
import { syncBedsideConsultations } from "../lib/onlineConsultations";
import {
  clearScheduleSelection,
  readScheduleSelection,
  saveActiveScheduleTarget,
  type ScheduleSelection,
} from "../lib/requestScheduleSelection";
import { recommendSpecialist } from "../lib/specialistRecommendation";
import { usePageSeo } from "../lib/seo";
import { resolvePatientDisplayName } from "../lib/patientName";
import { useSyncedLocale } from "../lib/useSyncedLocale";

type DoctorRow = { id: string; name: string; specialty: string };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function jitsiRoomUrl(appointmentId: string) {
  return `https://meet.jit.si/healthassist-${appointmentId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`;
}

export default function AdminRequestPage() {
  const [locale, setLocale] = useSyncedLocale();
  usePageSeo({
    title: "Принять заявку — HealthAssist",
    description: "Назначение врача и времени для заявки пациента.",
    path: "/admin/request",
    locale,
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorRow[]>(DOCTORS);
  const [roomLabelDraft, setRoomLabelDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  useEffect(() => {
    fetchAppointments().then((d) => setAllAppointments(d.items ?? [])).catch(() => {});
    fetchAdminDoctors()
      .then((d) => { if (d.items.length > 0) setDoctors(d.items); })
      .catch(() => {});
  }, []);

  const request = useMemo(
    () =>
      (location.state as { appointment?: Appointment } | null)?.appointment ??
      allAppointments.find((a) => a.id === id) ??
      null,
    [allAppointments, id, location.state],
  );

  const scheduleSelection = useMemo(() => {
    if (!id) return null;
    const stateSelection = (location.state as { selectedSchedule?: ScheduleSelection } | null)?.selectedSchedule;
    const storedSelection = readScheduleSelection(id);
    if (stateSelection?.requestId === id && (stateSelection.contextType ?? "appointment") === "appointment") {
      return stateSelection;
    }
    if (storedSelection && (storedSelection.contextType ?? "appointment") === "appointment") {
      return storedSelection;
    }
    return null;
  }, [id, location.state]);

  const selectedDoctorId = scheduleSelection?.doctorId ?? (request?.doctor_id || request?.doctorId) ?? null;
  const date = scheduleSelection?.date || request?.date || today();
  const time = scheduleSelection?.time || (request?.time && request.time !== "00:00" ? request.time : "");
  const roomLabel = roomLabelDraft || readRoomLabel(request);
  const isHomeOnline = isHomeOnlineConsultation(request);
  const isWardOnline = isWardOnlineConsultation(request);
  const isOfflineVisit = Boolean(request) && !isHomeOnline && !isWardOnline;
  const jitsiUrl = request ? jitsiRoomUrl(request.id) : "";
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const recommendedSpecialty = useMemo(
    () => recommendSpecialist(request?.reason),
    [request?.reason],
  );

  async function handleAssign() {
    if (!request || !selectedDoctorId || !date || !time || (isOfflineVisit && !roomLabel.trim())) return;
    setSaving(true);
    try {
      const meetingAt = `${date}T${time}:00`;
      const meetingUrl = isHomeOnline && jitsiUrl ? jitsiUrl : undefined;
      await assignDoctorToAppointment(request.id, selectedDoctorId, {
        date,
        time,
        roomLabel: isOfflineVisit ? roomLabel.trim() : undefined,
        meetingUrl,
        meetingAt,
      });

      const doctorName = selectedDoctor
        ? `${selectedDoctor.name} — ${selectedDoctor.specialty}`
        : selectedDoctorId;
      const assignedAppointment: Appointment = {
        ...request,
        doctor_id: selectedDoctorId,
        doctorId: selectedDoctorId,
        doctorName,
        date,
        time,
        room_label: isOfflineVisit ? roomLabel.trim() : undefined,
        roomLabel: isOfflineVisit ? roomLabel.trim() : undefined,
        meeting_url: meetingUrl,
        meeting_at: meetingAt,
        meetingAt,
      };

      if (isHomeOnline && jitsiUrl) {
        setNotifyStatus("sending");
        const { notified } = await notifyOnlineMeeting(request.id, jitsiUrl, meetingAt);
        setNotifyStatus(notified ? "sent" : "failed");
      }

      if (isWardOnline) {
        syncBedsideConsultations([assignedAppointment]);
      }

      clearScheduleSelection(request.id);
      setDone(true);
      window.setTimeout(() => nav("/admin"), 2500);
    } catch {
      setSaving(false);
    }
  }

  const openDoctorSchedule = useCallback(() => {
    if (!request) return;
    const params = new URLSearchParams();
    params.set("requestId", request.id);
    params.set("date", date);
    saveActiveScheduleTarget({
      requestId: request.id,
      contextType: "appointment",
      date,
    });

    nav(`/admin/doctor-schedule?${params.toString()}`, {
      state: { appointment: request },
    });
  }, [date, nav, request]);

  useEffect(() => {
    if (!request || selectedDoctorId || done) return;
    openDoctorSchedule();
  }, [done, openDoctorSchedule, request, selectedDoctorId]);

  if (request && !selectedDoctorId && !done) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0b0f14 0%, #111827 100%)",
          color: "white",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "min(560px, 100%)",
            borderRadius: 18,
            padding: "28px 30px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>
            Открываем график врачей
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.5 }}>
            Для этой заявки выбор врача и времени теперь идёт прямо в сетке графика, как на странице
            расписания врачей.
          </div>
        </div>
      </div>
    );
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
        <div style={{ marginLeft: "auto" }}>
          <LanguageSwitcher
            locale={locale}
            onChange={setLocale}
            variant="segmented"
            ariaLabel="Язык интерфейса"
            title="Язык интерфейса"
          />
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
              {resolvePatientDisplayName({
                names: [request.patientName, request.patient_name],
                source: request.patient_id || request.patientId || request.patient_email || request.patientEmail || request.id,
                fallback: "Пациент",
                requireFullName: true,
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(request.specialty_request || request.specialtyRequest) && (
                <span style={{ background: "rgba(99,102,241,0.18)", color: "#a5b4fc", borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>
                  {request.specialty_request || request.specialtyRequest}
                </span>
              )}
              {isHomeOnline && (
                <span style={{ background: "rgba(34,211,238,0.15)", color: "#22d3ee", borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>
                  🎥 Онлайн из дома
                </span>
              )}
              {isWardOnline && (
                <span style={{ background: "rgba(52,211,153,0.15)", color: "#6ee7b7", borderRadius: 7, padding: "3px 12px", fontSize: 13, fontWeight: 700 }}>
                  🛏 Онлайн в палате
                </span>
              )}
              <span style={{ background: "rgba(251,191,36,0.12)", color: "#f59e0b", borderRadius: 7, padding: "3px 12px", fontSize: 13 }}>
                📅 {request.date || "дата не указана"}
              </span>
              {isWardOnline && readWardLabel(request) ? (
                <span style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.75)", borderRadius: 7, padding: "3px 12px", fontSize: 13 }}>
                  {readWardLabel(request)}{readBedLabel(request) ? ` · ${readBedLabel(request)}` : ""}
                </span>
              ) : null}
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
            <div style={{
              marginTop: 12,
              borderRadius: 10,
              padding: "12px 14px",
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.18)",
            }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                Рекомендуемый специалист
              </div>
              <div style={{ fontWeight: 800, color: "#6ee7b7" }}>
                {recommendedSpecialty.specialty}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                Подсказка по жалобе: {recommendedSpecialty.reason}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: open doctor schedule */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
            Шаг 1 — Выберите врача и время в графике
          </div>

          <div style={{
            borderRadius: 16,
            padding: "20px 22px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Использовать страницу «График врачей»</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 6, maxWidth: 560 }}>
                  Откроется сетка с врачами по колонкам и временем по строкам. Нажмите на свободную ячейку, и выбранные врач, дата и время автоматически вернутся в эту заявку.
                </div>
                <div style={{ fontSize: 13, color: "#6ee7b7", marginTop: 10 }}>
                  Подсветим врачей специальности: {recommendedSpecialty.specialty}
                </div>
              </div>
              <button
                type="button"
                onClick={openDoctorSchedule}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 18px",
                  borderRadius: 12,
                  border: "1px solid rgba(34,211,238,0.28)",
                  background: "rgba(34,211,238,0.12)",
                  color: "#22d3ee",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <CalendarClock size={16} />
                Открыть график врачей
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: selected schedule */}
        {selectedDoctorId && (
          <div style={{
            borderRadius: 16, padding: "20px 22px", marginBottom: 24,
            background: "rgba(52,211,153,0.06)",
            border: "1px solid rgba(52,211,153,0.2)",
          }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>
              Шаг 2 — Проверьте выбранный слот и завершите
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
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>Время приёма</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{time}</div>
              </div>
              {isOfflineVisit && (
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                    Кабинет
                  </div>
                  <input
                    type="text"
                    className="input"
                    value={roomLabel}
                    onChange={(e) => setRoomLabelDraft(e.target.value)}
                    placeholder="Например, кабинет 204"
                    style={{ minWidth: 180, fontSize: 15, fontWeight: 700 }}
                  />
                </div>
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={openDoctorSchedule}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.82)",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Изменить выбор в графике
              </button>
            </div>

            {/* Online consultation preview */}
            {isHomeOnline && jitsiUrl && (
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
            {isWardOnline && (
              <div style={{
                marginTop: 16, borderRadius: 10, padding: "12px 16px",
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.2)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: "#6ee7b7", fontWeight: 700 }}>
                    После назначения запись сразу появится в потоке палатных онлайн-консультаций
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                    Врач увидит её в разделе палат, а робот AIMAR сможет подключиться автоматически к указанному времени.
                  </div>
                </div>
              </div>
            )}
            {isOfflineVisit && (
              <div style={{
                marginTop: 16, borderRadius: 10, padding: "12px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: 700 }}>Офлайн-встреча в клинике</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                  После назначения пациент увидит дату, время и кабинет в своём кабинете. Ссылка на звонок не создаётся.
                </div>
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
              {isHomeOnline && (
                <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  {notifyStatus === "sending" && (
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>⏳ Отправляем ссылку...</span>
                  )}
                  {notifyStatus === "sent" && (
                    <span style={{ color: "#22d3ee" }}>✓ Ссылка отправлена пациенту и врачу сразу после назначения времени</span>
                  )}
                  {notifyStatus === "failed" && (
                    <span style={{ color: "#6ee7b7" }}>✓ Ссылка сохранена в системе и видна пациенту и врачу, даже если уведомление не ушло</span>
                  )}
                </div>
              )}
              {isWardOnline && (
                <div style={{ fontSize: 13, color: "#6ee7b7" }}>
                  ✓ Палатная консультация поставлена в очередь, врач увидит её в разделе онлайн-консультаций в палатах
                </div>
              )}
              {isHomeOnline && jitsiUrl && (
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
                disabled={saving || !date || !time || (isOfflineVisit && !roomLabel.trim())}
                onClick={handleAssign}
                style={{
                  padding: "13px 32px", borderRadius: 12, fontSize: 15, fontWeight: 800,
                  background: !date || !time || (isOfflineVisit && !roomLabel.trim())
                    ? "rgba(255,255,255,0.07)"
                    : "linear-gradient(135deg, #34d399, #22d3ee)",
                  color: !date || !time || (isOfflineVisit && !roomLabel.trim()) ? "rgba(255,255,255,0.3)" : "#0a1628",
                  border: "none",
                  cursor: !date || !time || (isOfflineVisit && !roomLabel.trim()) ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {saving ? "Отправляем..." : "Завершить"}
              </button>
              {!selectedDoctorId && (
                <span style={{ fontSize: 13, color: "#f59e0b" }}>⚠ Выберите слот в графике врачей</span>
              )}
              {isOfflineVisit && !roomLabel.trim() && (
                <span style={{ fontSize: 13, color: "#f59e0b" }}>⚠ Укажите кабинет</span>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
