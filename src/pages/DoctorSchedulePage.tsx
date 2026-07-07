import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  BedDouble,
  CalendarClock,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  LayoutGrid,
  MonitorSmartphone,
  Users,
} from "lucide-react";
import AdminMobileNav from "../components/AdminMobileNav";
import AvatarCircle from "../components/AvatarCircle";
import DayDateNavigator, { getTodayDateInput } from "../components/DayDateNavigator";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { fetchAppointments, type Appointment } from "../lib/apiAppointments";
import { fetchAdminDoctors, type DoctorOption } from "../lib/apiAdmin";
import { resolveAvatarUrl } from "../lib/avatar";
import { readBedLabel, readRoomLabel, readWardLabel } from "../lib/consultationMode";
import { type AppLocale } from "../lib/locale";
import {
  readActiveScheduleTarget,
  readScheduleSelection,
  saveScheduleSelection,
  type ScheduleSelection,
} from "../lib/requestScheduleSelection";
import {
  doctorMatchesRecommendedSpecialty,
  recommendSpecialist,
} from "../lib/specialistRecommendation";
import { usePageSeo } from "../lib/seo";
import { listAllBedsideConsultations, type BedsideConsultationView } from "../lib/onlineConsultations";
import { resolvePatientDisplayName } from "../lib/patientName";
import { useSyncedLocale } from "../lib/useSyncedLocale";

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 17; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}
TIME_SLOTS.push("18:00");

function today() {
  return getTodayDateInput();
}

function normalizeTime(value?: string) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  return `${String(parseInt(hours, 10)).padStart(2, "0")}:${(minutes ?? "00").padStart(2, "0")}`;
}

function fmtDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return value;
  }
}

function parseSlotDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map((value) => parseInt(value, 10));
  const [hours, minutes] = time.split(":").map((value) => parseInt(value, 10));

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function isPastSlot(date: string, time: string, now = new Date()) {
  const slotDateTime = parseSlotDateTime(date, time);
  if (!slotDateTime) return false;
  return slotDateTime.getTime() < now.getTime();
}

function statusColor(status: string) {
  if (status === "active") return "#22d3ee";
  if (status === "done") return "rgba(255,255,255,0.3)";
  return "#f59e0b";
}

function statusBg(status: string) {
  if (status === "active") return "rgba(34,211,238,0.12)";
  if (status === "done") return "rgba(255,255,255,0.04)";
  return "rgba(251,191,36,0.12)";
}

function statusLabel(status: string) {
  if (status === "active") return "На приёме";
  if (status === "done") return "Завершён";
  return "Ожидает";
}

function patientLabel(item: Appointment | null | undefined) {
  return resolvePatientDisplayName({
    names: [item?.patientName, item?.patient_name],
    source: item?.patient_id || item?.patientId || item?.patient_email || item?.patientEmail || item?.id,
    fallback: "Пациент",
    requireFullName: false,
  });
}

function wardPatientLabel(item: BedsideConsultationView | null | undefined) {
  return resolvePatientDisplayName({
    names: [item?.patientName],
    source: item?.patientId || item?.patientEmail || item?.appointmentId || item?.id,
    fallback: "Пациент",
    requireFullName: true,
  });
}

function selectionFromAppointment(
  request: Appointment | null,
  doctors: DoctorOption[],
  requestId: string,
): ScheduleSelection | null {
  if (!request) return null;

  const doctorId = request.doctor_id || request.doctorId || "";
  const time = normalizeTime(request.time);

  if (!doctorId || !request.date || !time || time === "00:00") {
    return null;
  }

  const doctor = doctors.find((item) => item.id === doctorId);

  return {
    requestId,
    doctorId,
    doctorName: doctor?.name || request.doctorName || doctorId,
    specialty:
      doctor?.specialty ||
      request.specialty_request ||
      request.specialtyRequest ||
      "Специалист",
    date: request.date,
    time,
    contextType: "appointment",
  };
}

function selectionFromWardConsultation(
  consult: BedsideConsultationView | null,
  doctors: DoctorOption[],
  consultId: string,
): ScheduleSelection | null {
  if (!consult) return null;

  const doctorId = consult.doctorId || "";
  const time = normalizeTime(consult.time);

  if (!doctorId || !consult.date || !time) {
    return null;
  }

  const doctor = doctors.find((item) => item.id === doctorId);

  return {
    requestId: consultId,
    doctorId,
    doctorName: doctor?.name || consult.doctorName || doctorId,
    specialty: doctor?.specialty || consult.specialty || "Специалист",
    date: consult.date,
    time,
    contextType: "wardConsult",
  };
}

export default function DoctorSchedulePage() {
  const [locale, setLocale] = useSyncedLocale();
  usePageSeo({
    title: "График врачей — HealthAssist",
    description: "Расписание и свободные окна врачей.",
    path: "/admin/doctor-schedule",
    locale,
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const location = useLocation();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const explicitRequestId = query.get("requestId") || "";
  const explicitWardConsultId = query.get("wardConsultId") || "";
  const activeTarget = useMemo(
    () => (!explicitRequestId && !explicitWardConsultId ? readActiveScheduleTarget() : null),
    [explicitRequestId, explicitWardConsultId],
  );
  const requestId =
    explicitRequestId || (activeTarget?.contextType === "appointment" ? activeTarget.requestId : "");
  const wardConsultId =
    explicitWardConsultId || (activeTarget?.contextType === "wardConsult" ? activeTarget.requestId : "");
  const dateFromQuery = query.get("date") || "";
  const routeState =
    (location.state as {
      appointment?: Appointment;
      wardConsult?: BedsideConsultationView;
      selectedSchedule?: ScheduleSelection;
      selectedWardSchedule?: ScheduleSelection;
    } | null) ?? null;
  const requestFromState = routeState?.appointment ?? null;
  const wardConsultFromState = routeState?.wardConsult ?? null;
  const selectionOwnerId = requestId || wardConsultId;
  const selectionContext: "appointment" | "wardConsult" = wardConsultId ? "wardConsult" : "appointment";

  const [date, setDate] = useState(() => dateFromQuery || activeTarget?.date || today());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false,
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const firstAvailableSlotRef = useRef<HTMLElement | null>(null);
  const isSelectionMode = Boolean(selectionOwnerId);
  const now = new Date();
  const selectedDateIsPast = date < today();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobileLayout(window.innerWidth <= 820);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (dateFromQuery) {
      setDate(dateFromQuery);
    }
  }, [dateFromQuery]);

  useEffect(() => {
    if (dateFromQuery || !activeTarget?.date) return;
    setDate(activeTarget.date);
  }, [activeTarget?.date, dateFromQuery]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppointments(date);
      setAppointments(data.items ?? []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAdminDoctors()
      .then((data) => setDoctors(data.items.filter((doctor) => doctor.active !== false)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const linkedRequest = useMemo(() => {
    if (!requestId) return null;
    if (requestFromState?.id === requestId) return requestFromState;
    return appointments.find((item) => item.id === requestId) ?? requestFromState ?? null;
  }, [appointments, requestFromState, requestId]);

  const linkedWardConsult = useMemo(() => {
    if (!wardConsultId) return null;
    if (wardConsultFromState?.id === wardConsultId) return wardConsultFromState;
    return listAllBedsideConsultations().find((item) => item.id === wardConsultId) ?? wardConsultFromState ?? null;
  }, [wardConsultFromState, wardConsultId]);

  const recommended = useMemo(
    () =>
      wardConsultId
        ? recommendSpecialist(linkedWardConsult?.notes || linkedWardConsult?.specialty)
        : recommendSpecialist(linkedRequest?.reason),
    [linkedRequest?.reason, linkedWardConsult?.notes, linkedWardConsult?.specialty, wardConsultId],
  );
  const highlightedSpecialty = wardConsultId
    ? linkedWardConsult?.specialty || recommended.specialty
    : recommended.specialty;
  const selectedSlot = useMemo(() => {
    if (!selectionOwnerId) return null;

    const stateSelection = wardConsultId ? routeState?.selectedWardSchedule : routeState?.selectedSchedule;
    if (stateSelection && stateSelection.requestId === selectionOwnerId) {
      return stateSelection;
    }

    const storedSelection = readScheduleSelection(selectionOwnerId);
    if (storedSelection && (storedSelection.contextType ?? "appointment") === selectionContext) {
      return storedSelection;
    }

    return wardConsultId
      ? selectionFromWardConsultation(linkedWardConsult, doctors, wardConsultId)
      : selectionFromAppointment(linkedRequest, doctors, requestId);
  }, [
    doctors,
    linkedRequest,
    linkedWardConsult,
    requestId,
    routeState,
    selectionContext,
    selectionOwnerId,
    wardConsultId,
  ]);

  useEffect(() => {
    if (doctors.length === 0) {
      setSelectedDoctorId("");
      return;
    }

    const recommendedDoctor =
      doctors.find((doctor) => doctorMatchesRecommendedSpecialty(doctor.specialty, highlightedSpecialty)) ?? null;

    if (selectedSlot?.doctorId && doctors.some((doctor) => doctor.id === selectedSlot.doctorId)) {
      setSelectedDoctorId((current) => (current === selectedSlot.doctorId ? current : selectedSlot.doctorId));
      return;
    }

    if (selectedDoctorId && doctors.some((doctor) => doctor.id === selectedDoctorId)) {
      return;
    }

    setSelectedDoctorId(recommendedDoctor?.id || doctors[0]?.id || "");
  }, [doctors, highlightedSpecialty, selectedDoctorId, selectedSlot?.doctorId]);

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => doctor.id === selectedDoctorId) ?? doctors[0] ?? null,
    [doctors, selectedDoctorId],
  );
  const firstSelectableSlot = useMemo(() => {
    if (!selectedDoctor || !isSelectionMode || selectedDateIsPast) return "";

    return (
      TIME_SLOTS.find((slot) => {
        const appointment = getSlot(selectedDoctor.id, slot);
        return !appointment && !isPastSlot(date, slot, new Date());
      }) || ""
    );
  }, [date, isSelectionMode, selectedDateIsPast, selectedDoctor, appointments, requestId, linkedWardConsult?.appointmentId]);

  useEffect(() => {
    if (!isMobileLayout || !isSelectionMode || !firstSelectableSlot || selectedSlot) return;
    if (date !== today()) return;

    const timer = window.setTimeout(() => {
      firstAvailableSlotRef.current?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 180);

    return () => window.clearTimeout(timer);
  }, [date, firstSelectableSlot, isMobileLayout, isSelectionMode, selectedSlot]);

  const handleBack = useCallback(() => {
    if (!selectionOwnerId) {
      nav("/admin");
      return;
    }

    if (wardConsultId) {
      nav(`/admin/ward-consults?wardConsultId=${wardConsultId}`, {
        state: {
          wardConsult: linkedWardConsult ?? wardConsultFromState ?? undefined,
          selectedWardSchedule: selectedSlot ?? undefined,
        },
      });
      return;
    }

    nav(`/admin/request/${requestId}`, {
      state: {
        appointment: linkedRequest ?? requestFromState ?? undefined,
        selectedSchedule: selectedSlot ?? undefined,
      },
    });
  }, [
    linkedRequest,
    linkedWardConsult,
    nav,
    requestFromState,
    requestId,
    selectedSlot,
    selectionOwnerId,
    wardConsultFromState,
    wardConsultId,
  ]);

  const handleSelectSlot = useCallback(
    (doctor: DoctorOption, slotTime: string) => {
      if (!selectionOwnerId) return;

      const selection: ScheduleSelection = {
        requestId: selectionOwnerId,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        date,
        time: slotTime,
        contextType: selectionContext,
      };

      saveScheduleSelection(selection);

      if (wardConsultId) {
        nav(`/admin/ward-consults?wardConsultId=${wardConsultId}`, {
          state: {
            wardConsult: linkedWardConsult ?? wardConsultFromState ?? undefined,
            selectedWardSchedule: selection,
          },
        });
        return;
      }

      nav(`/admin/request/${requestId}`, {
        state: {
          appointment: linkedRequest ?? requestFromState ?? undefined,
          selectedSchedule: selection,
        },
      });
    },
    [
      date,
      linkedRequest,
      linkedWardConsult,
      nav,
      requestFromState,
      requestId,
      selectionContext,
      selectionOwnerId,
      wardConsultFromState,
      wardConsultId,
    ],
  );

  function getSlot(doctorId: string, slotTime: string): Appointment | undefined {
    return appointments.find((item) => {
      const ignoredAppointmentId = requestId || linkedWardConsult?.appointmentId || "";
      if (ignoredAppointmentId && item.id === ignoredAppointmentId) {
        return false;
      }

      const itemDoctorId = item.doctor_id ?? item.doctorId ?? "";
      return itemDoctorId === doctorId && normalizeTime(item.time) === slotTime;
    });
  }

  const navItems = [
    { label: "Дашборд", icon: <LayoutDashboard size={18} />, path: "/admin#overview" },
    { label: "Расписание", icon: <CalendarClock size={18} />, path: "/admin#schedule" },
    { label: "Записи", icon: <ClipboardList size={18} />, path: "/admin#records" },
    { label: "Пациенты", icon: <Users size={18} />, path: "/admin#patients" },
  ];

  return (
    <div className="doctor-admin">
      <aside className="doctor-admin__sidebar">
        <div className="doctor-admin__brand">
          <strong>HealthAssist</strong>
          <span>Админ-панель</span>
        </div>
        <nav className="doctor-admin__nav">
          {navItems.map((item) => (
            <button
              key={item.label}
              className="doctor-admin__nav-item"
              type="button"
              onClick={() => nav(item.path)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button className="doctor-admin__nav-item doctor-admin__nav-item--active" type="button">
            <BedDouble size={18} />
            График врачей
          </button>
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin/ward-consults")}>
            <MonitorSmartphone size={18} />
            Палатные консультации
          </button>
          <button className="doctor-admin__nav-item" type="button" onClick={() => nav("/admin/analytics")}>
            <BarChart3 size={18} />
            Аналитика
          </button>
        </nav>
      </aside>

      <main className="doctor-admin__main">
        <header className="doctor-admin__topbar doctor-admin__topbar--schedule">
          <div className="doctor-schedule__topbar-row">
            <div className="doctor-admin__topbar-copy">
              <h1>График врачей</h1>
              <p>
                {isSelectionMode
                  ? `Выберите свободную ячейку для заявки на ${fmtDate(date)}`
                  : `Свободные и занятые окна на ${fmtDate(date)}`}
              </p>
            </div>
            <LanguageSwitcher
              locale={locale as AppLocale}
              onChange={setLocale}
              variant="segmented"
              ariaLabel="Язык интерфейса"
              title="Язык интерфейса"
            />
          </div>
          <DayDateNavigator
            date={date}
            onChange={setDate}
            className="doctor-admin__date-nav doctor-admin__date-nav--schedule"
          />
          <button
            type="button"
            onClick={handleBack}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 13,
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            <ArrowLeft size={14} />
            {wardConsultId ? "К палатной заявке" : requestId ? "К заявке" : "Назад"}
          </button>
        </header>

        <div style={{ padding: "24px" }}>
          {isSelectionMode ? (
            <div
              style={{
                borderRadius: 16,
                padding: "18px 20px",
                marginBottom: 20,
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.18)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.42)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                Заявка для назначения
              </div>
              <div style={{ display: "flex", gap: 18, justifyContent: "space-between", flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 360px", minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 20 }}>
                    {wardConsultId ? wardPatientLabel(linkedWardConsult) : patientLabel(linkedRequest)}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.72)" }}>
                    {wardConsultId
                      ? linkedWardConsult?.specialty || "Специалист не указан"
                      : linkedRequest?.specialty_request || linkedRequest?.specialtyRequest || "Специалист не указан"}
                  </div>
                  {(wardConsultId ? linkedWardConsult?.notes : linkedRequest?.reason) ? (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 14,
                        color: "rgba(255,255,255,0.78)",
                      }}
                    >
                      {wardConsultId ? linkedWardConsult?.notes : linkedRequest?.reason}
                    </div>
                  ) : null}
                </div>

                <div
                  style={{
                    flex: "0 1 300px",
                    minWidth: 260,
                    display: "grid",
                    gap: 10,
                    alignContent: "start",
                  }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                      Рекомендуемый специалист
                    </div>
                    <div style={{ fontWeight: 800, color: "#6ee7b7" }}>{highlightedSpecialty}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                      Подсказка по жалобе: {recommended.reason}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                      Дата заявки: {(wardConsultId ? linkedWardConsult?.date : linkedRequest?.date) || date}
                    </div>
                    {readWardLabel(wardConsultId ? linkedWardConsult : linkedRequest) ? (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)" }}>
                        {readWardLabel(wardConsultId ? linkedWardConsult : linkedRequest)}
                        {readBedLabel(wardConsultId ? linkedWardConsult : linkedRequest)
                          ? ` · ${readBedLabel(wardConsultId ? linkedWardConsult : linkedRequest)}`
                          : ""}
                      </div>
                    ) : null}
                    {selectedSlot ? (
                      <div style={{ fontSize: 12, color: "#22d3ee", fontWeight: 700 }}>
                        Выбрано: {selectedSlot.doctorName}, {selectedSlot.date} {selectedSlot.time}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#fbbf24" }}>
                        Нажмите на свободную ячейку, чтобы вернуться к заявке с выбранным слотом.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isMobileLayout ? (
            <>
              <div className="doctor-schedule-mobile__doctors">
                {doctors.map((doctor) => {
                  const doctorAppointments = appointments.filter((item) => {
                    const itemDoctorId = item.doctor_id ?? item.doctorId;
                    return itemDoctorId === doctor.id && item.id !== (requestId || linkedWardConsult?.appointmentId);
                  });
                  const freeCount = Math.max(TIME_SLOTS.length - doctorAppointments.length, 0);
                  const isRecommended = isSelectionMode
                    ? doctorMatchesRecommendedSpecialty(doctor.specialty, highlightedSpecialty)
                    : false;
                  const isSelectedDoctor = selectedDoctor?.id === doctor.id;

                  return (
                    <button
                      key={doctor.id}
                      type="button"
                      className={`doctor-schedule-mobile__doctor ${
                        isSelectedDoctor ? "doctor-schedule-mobile__doctor--active" : ""
                      } ${isRecommended ? "doctor-schedule-mobile__doctor--recommended" : ""}`}
                      onClick={() => setSelectedDoctorId(doctor.id)}
                    >
                      <div className="doctor-schedule-mobile__doctor-head">
                        <strong>{doctor.name}</strong>
                        {isRecommended ? <span>Реком.</span> : null}
                      </div>
                      <small>{doctor.specialty}</small>
                      <div className="doctor-schedule-mobile__doctor-stats">
                        <span><strong>{freeCount}</strong> свободно</span>
                        <span><strong>{doctorAppointments.length}</strong> записей</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDoctor ? (
                <div className="doctor-schedule-mobile__slots">
                  <div className="doctor-schedule-mobile__selected">
                    <div>
                      <strong>{selectedDoctor.name}</strong>
                      <span>{selectedDoctor.specialty}</span>
                    </div>
                    {selectedDateIsPast ? (
                      <em>Только история</em>
                    ) : (
                      <em>Выберите время</em>
                    )}
                  </div>

                  {isSelectionMode ? (
                    selectedDateIsPast ? (
                      <div className="doctor-schedule-mobile__hint">
                        Эта дата уже прошла. Прошедшие слоты доступны только для просмотра истории.
                      </div>
                    ) : firstSelectableSlot ? (
                      <div className="doctor-schedule-mobile__hint">
                        Прошедшие слоты заблокированы. Ближайшее доступное время: <strong>{firstSelectableSlot}</strong>
                      </div>
                    ) : (
                      <div className="doctor-schedule-mobile__hint">
                        На выбранную дату свободных будущих окон больше нет. Выберите другую дату.
                      </div>
                    )
                  ) : null}

                  {loading ? (
                    <div className="doctor-schedule-mobile__empty">Загрузка расписания...</div>
                  ) : (
                    TIME_SLOTS.map((slot) => {
                      const appointment = getSlot(selectedDoctor.id, slot);
                      const slotIsPast = isPastSlot(date, slot, now);
                      const isRecommended = isSelectionMode
                        ? doctorMatchesRecommendedSpecialty(selectedDoctor.specialty, highlightedSpecialty)
                        : false;
                      const isSelected =
                        selectedSlot?.doctorId === selectedDoctor.id &&
                        selectedSlot?.date === date &&
                        selectedSlot?.time === slot;
                      const canSelectSlot = isSelectionMode && !appointment && !slotIsPast;

                      return (
                        <article
                          key={`${selectedDoctor.id}-${slot}`}
                          className="doctor-schedule-mobile__slot"
                          ref={(node) => {
                            if (slot === firstSelectableSlot) {
                              firstAvailableSlotRef.current = node;
                            }
                          }}
                        >
                          <div className="doctor-schedule-mobile__slot-time">{slot}</div>
                          <div className="doctor-schedule-mobile__slot-body">
                            {appointment ? (
                              <div
                                className="doctor-schedule-mobile__slot-card"
                                style={{
                                  background: statusBg(appointment.status),
                                  borderColor: `${statusColor(appointment.status)}35`,
                                }}
                              >
                                <div className="doctor-schedule-mobile__slot-person">
                                  <AvatarCircle
                                    name={patientLabel(appointment)}
                                    src={resolveAvatarUrl(
                                      {
                                        id: appointment.patient_id || appointment.patientId || null,
                                        email: appointment.patient_email || appointment.patientEmail || null,
                                        role: "patient",
                                      },
                                      { patientFallback: true },
                                    )}
                                    size={28}
                                    alt={patientLabel(appointment)}
                                  />
                                  <div>
                                    <strong style={{ color: statusColor(appointment.status) }}>{patientLabel(appointment)}</strong>
                                    {appointment.reason ? <span>{appointment.reason}</span> : null}
                                  </div>
                                </div>
                                <div className="doctor-schedule-mobile__slot-footer">
                                  {readRoomLabel(appointment) ? <small>{readRoomLabel(appointment)}</small> : <small>Занято</small>}
                                  <em style={{ color: statusColor(appointment.status) }}>{statusLabel(appointment.status)}</em>
                                </div>
                              </div>
                            ) : canSelectSlot ? (
                              <button
                                type="button"
                                className={`doctor-schedule-mobile__slot-card doctor-schedule-mobile__slot-card--button ${
                                  isSelected ? "doctor-schedule-mobile__slot-card--selected" : ""
                                }`}
                                onClick={() => handleSelectSlot(selectedDoctor, slot)}
                              >
                                <strong>{isSelected ? "Выбрано" : "Свободно"}</strong>
                                <span>Нажмите, чтобы назначить</span>
                              </button>
                            ) : slotIsPast ? (
                              <div className="doctor-schedule-mobile__slot-card doctor-schedule-mobile__slot-card--past">
                                <strong>Время прошло</strong>
                                <span>Назначение недоступно</span>
                              </div>
                            ) : (
                              <div
                                className={`doctor-schedule-mobile__slot-card ${
                                  isRecommended ? "doctor-schedule-mobile__slot-card--recommended" : ""
                                }`}
                              >
                                <strong>Свободно</strong>
                                <span>{isSelectionMode ? "Доступно для назначения" : "Окно свободно"}</span>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  marginBottom: 24,
                  overflowX: "auto",
                  paddingBottom: 4,
                }}
              >
                {doctors.map((doctor) => {
                  const doctorAppointments = appointments.filter((item) => {
                    const itemDoctorId = item.doctor_id ?? item.doctorId;
                    return itemDoctorId === doctor.id && item.id !== (requestId || linkedWardConsult?.appointmentId);
                  });
                  const freeCount = Math.max(TIME_SLOTS.length - doctorAppointments.length, 0);
                  const isRecommended = isSelectionMode
                    ? doctorMatchesRecommendedSpecialty(doctor.specialty, highlightedSpecialty)
                    : false;
                  const isSelectedDoctor =
                    selectedSlot?.doctorId === doctor.id && selectedSlot?.date === date;

                  return (
                    <div
                      key={doctor.id}
                      style={{
                        borderRadius: 16,
                        padding: "18px 20px",
                        background: isSelectedDoctor
                          ? "rgba(34,211,238,0.1)"
                          : isRecommended
                            ? "rgba(52,211,153,0.08)"
                            : "rgba(255,255,255,0.04)",
                        border: isSelectedDoctor
                          ? "1px solid rgba(34,211,238,0.35)"
                          : isRecommended
                            ? "1px solid rgba(52,211,153,0.28)"
                            : "1px solid rgba(255,255,255,0.09)",
                        minWidth: 160,
                        flexShrink: 0,
                        boxShadow: isRecommended ? "0 0 0 1px rgba(52,211,153,0.08)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15 }}>{doctor.name}</div>
                          <div style={{ fontSize: 12, color: isRecommended ? "#6ee7b7" : "rgba(255,255,255,0.4)", marginTop: 2 }}>
                            {doctor.specialty}
                          </div>
                        </div>
                        {isRecommended ? (
                          <span
                            style={{
                              borderRadius: 999,
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#052e2b",
                              background: "#6ee7b7",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Рекомендуем
                          </span>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "#34d399" }}>
                            {freeCount}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>свободно</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>
                            {doctorAppointments.length}
                          </div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>записей</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                style={{
                  borderRadius: 16,
                  overflow: "auto",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}
              >
                <div style={{ minWidth: `${72 + doctors.length * 180}px` }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `72px repeat(${doctors.length}, minmax(180px, 1fr))`,
                      background: "rgba(255,255,255,0.06)",
                      borderBottom: "1px solid rgba(255,255,255,0.09)",
                    }}
                  >
                    <div
                      style={{
                        padding: "12px 14px",
                        fontSize: 11,
                        color: "rgba(255,255,255,0.35)",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                      }}
                    >
                      Время
                    </div>
                    {doctors.map((doctor) => {
                      const isRecommended = isSelectionMode
                        ? doctorMatchesRecommendedSpecialty(doctor.specialty, highlightedSpecialty)
                        : false;
                      const isSelectedDoctor =
                        selectedSlot?.doctorId === doctor.id && selectedSlot?.date === date;

                      return (
                        <div
                          key={doctor.id}
                          style={{
                            padding: "12px 14px",
                            borderLeft: "1px solid rgba(255,255,255,0.07)",
                            background: isSelectedDoctor
                              ? "rgba(34,211,238,0.12)"
                              : isRecommended
                                ? "rgba(52,211,153,0.08)"
                                : "transparent",
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: 14 }}>{doctor.name}</div>
                          <div style={{ fontSize: 12, color: isRecommended ? "#6ee7b7" : "rgba(255,255,255,0.4)" }}>
                            {doctor.specialty}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {loading ? (
                    <div
                      style={{
                        padding: "32px",
                        textAlign: "center",
                        color: "rgba(255,255,255,0.4)",
                      }}
                    >
                      Загрузка расписания...
                    </div>
                  ) : (
                    TIME_SLOTS.map((slot, index) => {
                      const isHour = slot.endsWith(":00");

                      return (
                        <div
                          key={slot}
                          style={{
                            display: "grid",
                            gridTemplateColumns: `72px repeat(${doctors.length}, minmax(180px, 1fr))`,
                            borderBottom:
                              index < TIME_SLOTS.length - 1
                                ? `1px solid rgba(255,255,255,${isHour ? "0.07" : "0.03"})`
                                : "none",
                            background: isHour ? "rgba(255,255,255,0.015)" : "transparent",
                          }}
                        >
                          <div
                            style={{
                              padding: "8px 14px",
                              fontSize: 13,
                              fontWeight: isHour ? 700 : 400,
                              color: isHour ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.35)",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {slot}
                          </div>

                          {doctors.map((doctor) => {
                            const appointment = getSlot(doctor.id, slot);
                            const slotIsPast = isPastSlot(date, slot, now);
                            const isRecommended = isSelectionMode
                              ? doctorMatchesRecommendedSpecialty(doctor.specialty, highlightedSpecialty)
                              : false;
                            const isSelected =
                              selectedSlot?.doctorId === doctor.id &&
                              selectedSlot?.date === date &&
                              selectedSlot?.time === slot;
                            const canSelectSlot = isSelectionMode && !appointment && !slotIsPast;

                            return (
                              <div
                                key={doctor.id}
                                style={{
                                  padding: "5px 8px",
                                  borderLeft: "1px solid rgba(255,255,255,0.05)",
                                }}
                              >
                                {appointment ? (
                                  <div
                                    style={{
                                      borderRadius: 8,
                                      padding: "6px 10px",
                                      background: statusBg(appointment.status),
                                      border: `1px solid ${statusColor(appointment.status)}35`,
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                                      <AvatarCircle
                                        name={patientLabel(appointment)}
                                        src={resolveAvatarUrl(
                                          {
                                            id: appointment.patient_id || appointment.patientId || null,
                                            email: appointment.patient_email || appointment.patientEmail || null,
                                            role: "patient",
                                          },
                                          { patientFallback: true },
                                        )}
                                        size={24}
                                        alt={patientLabel(appointment)}
                                      />
                                      <div
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 700,
                                          color: statusColor(appointment.status),
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                          minWidth: 0,
                                        }}
                                      >
                                        {patientLabel(appointment)}
                                      </div>
                                    </div>
                                    {appointment.reason ? (
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: "rgba(255,255,255,0.4)",
                                          marginTop: 1,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {appointment.reason}
                                      </div>
                                    ) : null}
                                    {readRoomLabel(appointment) ? (
                                      <div
                                        style={{
                                          fontSize: 10,
                                          color: "rgba(255,255,255,0.35)",
                                          marginTop: 1,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {readRoomLabel(appointment)}
                                      </div>
                                    ) : null}
                                    <div
                                      style={{
                                        fontSize: 10,
                                        color: statusColor(appointment.status),
                                        marginTop: 2,
                                        opacity: 0.8,
                                      }}
                                    >
                                      {statusLabel(appointment.status)}
                                    </div>
                                  </div>
                                ) : canSelectSlot ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectSlot(doctor, slot)}
                                    style={{
                                      width: "100%",
                                      borderRadius: 8,
                                      padding: "8px 10px",
                                      border: isSelected
                                        ? "1px solid rgba(34,211,238,0.4)"
                                        : isRecommended
                                          ? "1px solid rgba(52,211,153,0.22)"
                                          : "1px solid rgba(52,211,153,0.12)",
                                      background: isSelected
                                        ? "rgba(34,211,238,0.12)"
                                        : isRecommended
                                          ? "rgba(52,211,153,0.08)"
                                          : "rgba(52,211,153,0.04)",
                                      color: isSelected ? "#22d3ee" : "rgba(52,211,153,0.72)",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                      textAlign: "left",
                                    }}
                                  >
                                    {isSelected ? "Выбрано" : "Свободно"}
                                  </button>
                                ) : slotIsPast ? (
                                  <div
                                    style={{
                                      borderRadius: 8,
                                      padding: "6px 10px",
                                      background: "rgba(255,255,255,0.03)",
                                      border: "1px solid rgba(255,255,255,0.08)",
                                      color: "rgba(255,255,255,0.28)",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "not-allowed",
                                    }}
                                    title="Это время уже прошло"
                                  >
                                    Время прошло
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      borderRadius: 8,
                                      padding: "6px 10px",
                                      background: "rgba(52,211,153,0.04)",
                                      border: isRecommended
                                        ? "1px solid rgba(52,211,153,0.22)"
                                        : "1px solid rgba(52,211,153,0.12)",
                                      color: isRecommended
                                        ? "rgba(110,231,183,0.92)"
                                        : "rgba(52,211,153,0.5)",
                                      fontSize: 12,
                                    }}
                                  >
                                    Свободно
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
            {[
              { color: "rgba(52,211,153,0.5)", bg: "rgba(52,211,153,0.07)", label: "Свободно" },
              { color: "#f59e0b", bg: "rgba(251,191,36,0.12)", label: "Ожидает приёма" },
              { color: "#22d3ee", bg: "rgba(34,211,238,0.12)", label: "На приёме" },
              { color: "rgba(255,255,255,0.3)", bg: "rgba(255,255,255,0.04)", label: "Завершён" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: item.bg,
                    border: `1px solid ${item.color}60`,
                  }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
              </div>
            ))}
            {isSelectionMode ? (
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: "rgba(34,211,238,0.12)",
                    border: "1px solid rgba(34,211,238,0.4)",
                  }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                  Выбранный слот для текущей заявки
                </span>
              </div>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                {selectedDateIsPast ? "Прошедшая дата — только история" : "Прошедшее время недоступно для назначения"}
              </span>
            </div>
          </div>
        </div>
      </main>
      <AdminMobileNav activeItem="schedule-page" />
    </div>
  );
}
