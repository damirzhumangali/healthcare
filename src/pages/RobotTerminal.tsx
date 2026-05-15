import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BedDouble,
  CheckCircle,
  Loader2,
  MonitorSmartphone,
  Pill,
  Video,
  WifiOff,
} from "lucide-react";
import {
  getActiveLiveConsultation,
  listAllBedsideConsultations,
  type BedsideConsultationView,
  type MedicationSlot,
} from "../lib/onlineConsultations";

type Phase = "waiting" | "bedside" | "live" | "done";

function getPhase(consult: BedsideConsultationView | null): Phase {
  if (!consult) return "waiting";
  if (consult.stage === "completed") return "done";
  if (consult.stage === "live") return "live";
  if (consult.stage === "bedside_ready" || consult.stage === "robot_en_route") return "bedside";
  return "waiting";
}

function JitsiCall({ roomId, displayName }: { roomId: string; displayName: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const apiRef = useRef<unknown>(null);

  useEffect(() => {
    if (!ref.current) return;

    function initJitsi() {
      if (!(window as Record<string, unknown>).JitsiMeetExternalAPI) return;
      const JitsiAPI = (window as Record<string, unknown>).JitsiMeetExternalAPI as new (
        domain: string,
        opts: Record<string, unknown>
      ) => { dispose(): void };

      if (apiRef.current) {
        (apiRef.current as { dispose(): void }).dispose();
      }

      apiRef.current = new JitsiAPI("meet.jit.si", {
        roomName: roomId,
        parentNode: ref.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableDeepLinking: true,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableInviteFunctions: true,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: ["microphone", "camera", "hangup", "fullscreen"],
        },
      });
    }

    if ((window as Record<string, unknown>).JitsiMeetExternalAPI) {
      initJitsi();
    } else {
      const script = document.createElement("script");
      script.src = "https://meet.jit.si/external_api.js";
      script.onload = initJitsi;
      document.head.appendChild(script);
    }

    return () => {
      if (apiRef.current) {
        (apiRef.current as { dispose(): void }).dispose();
        apiRef.current = null;
      }
    };
  }, [roomId, displayName]);

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}

function VitalsBar({ consult }: { consult: BedsideConsultationView }) {
  return (
    <div className="rt-vitals">
      <div className="rt-vital">
        <span className="rt-vital__label">Температура</span>
        <span className="rt-vital__value">{consult.vitals.tempC}°C</span>
      </div>
      <div className="rt-vital">
        <span className="rt-vital__label">Пульс</span>
        <span className="rt-vital__value">{consult.vitals.pulseBpm} <small>уд/мин</small></span>
      </div>
      <div className="rt-vital">
        <span className="rt-vital__label">Давление</span>
        <span className="rt-vital__value">{consult.vitals.systolic}/{consult.vitals.diastolic}</span>
      </div>
      <div className="rt-vital">
        <span className="rt-vital__label">SpO₂</span>
        <span className="rt-vital__value">{consult.vitals.spo2}<small>%</small></span>
      </div>
    </div>
  );
}

function MedSlots({ slots }: { slots: MedicationSlot[] }) {
  if (slots.length === 0) return null;
  return (
    <div className="rt-meds">
      <div className="rt-meds__title">
        <Pill size={16} />
        Лекарства
      </div>
      <div className="rt-meds__grid">
        {slots.map((slot) => (
          <div className="rt-med-slot" key={slot.compartment}>
            <div className="rt-med-slot__label">Ячейка {slot.compartment}</div>
            <div className="rt-med-slot__drug">{slot.drug}</div>
            <div className="rt-med-slot__dosage">{slot.dosage}</div>
            {slot.instruction ? (
              <div className="rt-med-slot__instr">{slot.instruction}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RobotTerminal() {
  const [consult, setConsult] = useState<BedsideConsultationView | null>(null);
  const [showMeds, setShowMeds] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    document.title = "AIMAR — Терминал палаты";
  }, []);

  useEffect(() => {
    function refresh() {
      const live = getActiveLiveConsultation();
      if (live) {
        setConsult(live);
        return;
      }
      const all = listAllBedsideConsultations();
      const soon = all.find(
        (c) =>
          c.stage !== "completed" &&
          c.stage !== "scheduled" ||
          (() => {
            const ms = Date.parse(`${c.date}T${c.time}:00`) - Date.now();
            return c.stage === "scheduled" && ms <= 10 * 60_000 && ms >= -5 * 60_000;
          })()
      );
      setConsult(soon ?? null);
    }
    refresh();
    const id = setInterval(() => {
      refresh();
      setTick((t) => t + 1);
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  const phase = getPhase(consult);
  const meds: MedicationSlot[] = consult?.medication ?? [];

  if (phase === "waiting") {
    return (
      <div className="rt rt--waiting">
        <div className="rt__brand">
          <MonitorSmartphone size={40} />
          <span>AIMAR</span>
        </div>
        <div className="rt__waiting-body">
          <Loader2 className="rt__spin" size={52} />
          <h1>Ожидание назначения</h1>
          <p>Когда врач назначит консультацию, экран обновится автоматически.</p>
          <div className="rt__clock">{new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={{ display: "none" }}>{tick}</div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rt rt--done">
        <CheckCircle size={64} color="#4ade80" />
        <h1>Консультация завершена</h1>
        {consult ? <p>Пациент: <strong>{consult.patientName}</strong></p> : null}
        <p style={{ color: "#6b7280" }}>Результаты сохранены в истории болезни.</p>
      </div>
    );
  }

  if (phase === "bedside") {
    return (
      <div className="rt rt--bedside">
        <div className="rt__topbar">
          <div className="rt__brand-sm"><MonitorSmartphone size={20} /> AIMAR</div>
          <span className="rt__badge rt__badge--blue">У кровати · ожидание звонка</span>
        </div>
        {consult ? (
          <>
            <div className="rt__patient-card">
              <BedDouble size={24} style={{ color: "#60a5fa" }} />
              <div>
                <h2>{consult.patientName}</h2>
                <p>{consult.wardLabel} · {consult.bedLabel}</p>
              </div>
            </div>
            <div className="rt__info-row">
              <span>Врач: <strong>{consult.doctorName}</strong></span>
              <span>{consult.specialty}</span>
              <span>Время: <strong>{consult.time}</strong></span>
            </div>
            <VitalsBar consult={consult} />
            <div className="rt__waiting-call">
              <Activity size={28} className="rt__pulse-icon" />
              <p>Ожидание видеозвонка от врача...</p>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // phase === "live"
  return (
    <div className="rt rt--live">
      <div className="rt__live-layout">
        {/* Video panel */}
        <div className="rt__video-panel">
          <div className="rt__video-topbar">
            <span className="rt__live-dot" />
            <span>Онлайн-консультация</span>
            {consult ? <span style={{ marginLeft: "auto", color: "#9ca3af" }}>{consult.doctorName}</span> : null}
          </div>
          {consult?.meetRoomId ? (
            <JitsiCall
              roomId={consult.meetRoomId}
              displayName={consult ? `Пациент: ${consult.patientName}` : "Пациент"}
            />
          ) : (
            <div className="rt__no-call">
              <WifiOff size={40} />
              <p>Нет идентификатора комнаты</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="rt__side-panel">
          {consult ? (
            <>
              <div className="rt__patient-mini">
                <strong>{consult.patientName}</strong>
                <span>{consult.wardLabel} · {consult.bedLabel}</span>
              </div>
              <VitalsBar consult={consult} />
              {meds.length > 0 ? (
                <button
                  className={`rt__meds-toggle ${showMeds ? "rt__meds-toggle--active" : ""}`}
                  type="button"
                  onClick={() => setShowMeds((v) => !v)}
                >
                  <Pill size={18} />
                  {showMeds ? "Скрыть лекарства" : `Показать лекарства (${meds.length})`}
                </button>
              ) : null}
              {showMeds ? <MedSlots slots={meds} /> : null}
              <div className="rt__notes">
                <span>Примечание:</span>
                <p>{consult.notes}</p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
