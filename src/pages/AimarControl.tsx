import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DoorOpen, DoorClosed, Loader2, Wifi, WifiOff } from "lucide-react";
import { fetchServoState, sendServoCommand, type ServoDeviceState } from "../lib/apiAdmin";
import { hasSession } from "../lib/auth";

const DEVICE_ID = "aimar";

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AimarControl() {
  const nav = useNavigate();
  const [state, setState] = useState<ServoDeviceState | null>(null);
  const [sending, setSending] = useState<"open" | "close" | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSession()) {
      nav("/login", { replace: true });
      return;
    }

    const poll = () => {
      fetchServoState()
        .then((states) => {
          const s = states[DEVICE_ID] ?? null;
          setState(s);
          setConnected(true);
        })
        .catch(() => setConnected(false));
    };

    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [nav]);

  async function handleCommand(command: "open" | "close") {
    if (sending) return;
    setSending(command);
    setFeedback(null);
    try {
      await sendServoCommand(DEVICE_ID, command);
      setFeedback(command === "open" ? "Команда «Открыть» отправлена" : "Команда «Закрыть» отправлена");
    } catch {
      setFeedback("Ошибка отправки команды");
    } finally {
      setSending(null);
    }
  }

  const isOpen = state?.isOpen ?? null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#161b22",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "32px 28px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <button
            type="button"
            onClick={() => nav("/admin")}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: 10,
              padding: "8px 10px",
              cursor: "pointer",
              color: "#e6edf3",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e6edf3" }}>Aimar</h1>
            <p style={{ margin: 0, fontSize: 13, color: "#8b949e" }}>Управление замком двери</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: connected ? "#3fb950" : "#8b949e" }}>
            {connected === null ? null : connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected === null ? null : connected ? "Online" : "Offline"}
          </div>
        </div>

        {/* Status indicator */}
        <div
          style={{
            background: "#0d1117",
            borderRadius: 16,
            border: `2px solid ${isOpen === null ? "rgba(255,255,255,0.08)" : isOpen ? "#3fb950" : "#484f58"}`,
            padding: "32px 24px",
            textAlign: "center",
            marginBottom: 28,
            transition: "border-color 0.3s",
          }}
        >
          <div style={{ marginBottom: 16 }}>
            {isOpen === null ? (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.06)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <WifiOff size={28} color="#8b949e" />
              </div>
            ) : isOpen ? (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(63,185,80,0.15)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DoorOpen size={32} color="#3fb950" />
              </div>
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.06)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DoorClosed size={32} color="#8b949e" />
              </div>
            )}
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              color: isOpen === null ? "#8b949e" : isOpen ? "#3fb950" : "#e6edf3",
            }}
          >
            {isOpen === null ? "Нет данных" : isOpen ? "Открыто" : "Закрыто"}
          </p>
          {state?.updatedAt ? (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#8b949e" }}>
              Обновлено в {formatTime(state.updatedAt)}
            </p>
          ) : null}
        </div>

        {/* Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            type="button"
            disabled={sending !== null}
            onClick={() => void handleCommand("open")}
            style={{
              padding: "16px 12px",
              borderRadius: 14,
              border: "none",
              background: sending === "open" ? "#238636" : "#2ea043",
              color: "#fff",
              fontSize: 16,
              fontWeight: 700,
              cursor: sending !== null ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: sending !== null && sending !== "open" ? 0.5 : 1,
              transition: "opacity 0.2s, background 0.2s",
            }}
          >
            {sending === "open" ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <DoorOpen size={18} />}
            Открыть
          </button>
          <button
            type="button"
            disabled={sending !== null}
            onClick={() => void handleCommand("close")}
            style={{
              padding: "16px 12px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background: sending === "close" ? "#30363d" : "#21262d",
              color: "#e6edf3",
              fontSize: 16,
              fontWeight: 700,
              cursor: sending !== null ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: sending !== null && sending !== "close" ? 0.5 : 1,
              transition: "opacity 0.2s, background 0.2s",
            }}
          >
            {sending === "close" ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <DoorClosed size={18} />}
            Закрыть
          </button>
        </div>

        {/* Feedback */}
        {feedback ? (
          <p
            style={{
              margin: "16px 0 0",
              textAlign: "center",
              fontSize: 13,
              color: feedback.startsWith("Ошибка") ? "#f85149" : "#3fb950",
            }}
          >
            {feedback}
          </p>
        ) : null}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
