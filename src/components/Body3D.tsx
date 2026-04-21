type Zone = "head" | "chest" | "abdomen" | "back" | "arm" | "leg";

const SKETCHFAB_MODEL_URL =
  "https://sketchfab.com/models/0954aa04666d45aab9633009318f7b66/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_controls=1&ui_stop=0&ui_watermark=1";

const zoneButtons: Array<{
  zone: Zone;
  label: string;
  top: string;
  left: string;
}> = [
  { zone: "head", label: "Голова", top: "15%", left: "50%" },
  { zone: "chest", label: "Грудь", top: "31%", left: "50%" },
  { zone: "abdomen", label: "Живот", top: "47%", left: "50%" },
  { zone: "back", label: "Спина", top: "39%", left: "60%" },
  { zone: "arm", label: "Рука", top: "39%", left: "31%" },
  { zone: "arm", label: "Рука", top: "39%", left: "69%" },
  { zone: "leg", label: "Нога", top: "69%", left: "43%" },
  { zone: "leg", label: "Нога", top: "69%", left: "57%" },
];

export default function Body3D({ onPick }: { onPick: (zone: Zone) => void }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "min(74vh, 720px)",
        minHeight: 520,
        overflow: "hidden",
        background: "#0b1220",
      }}
    >
      <iframe
        title="Male base muscular anatomy by CharacterZone on Sketchfab"
        src={SKETCHFAB_MODEL_URL}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        allowFullScreen
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
          background: "#0b1220",
        }}
      />

      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {zoneButtons.map((button, index) => (
          <button
            key={`${button.zone}-${index}`}
            type="button"
            onClick={() => onPick(button.zone)}
            style={{
              position: "absolute",
              top: button.top,
              left: button.left,
              transform: "translate(-50%, -50%)",
              pointerEvents: "auto",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: 8,
              padding: "6px 10px",
              background: "rgba(2,6,23,0.78)",
              color: "white",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 12px 28px rgba(0,0,0,0.32)",
            }}
          >
            {button.label}
          </button>
        ))}
      </div>

      <a
        href="https://sketchfab.com/3d-models/male-base-muscular-anatomy-0954aa04666d45aab9633009318f7b66"
        target="_blank"
        rel="noreferrer"
        style={{
          position: "absolute",
          right: 12,
          bottom: 10,
          borderRadius: 8,
          padding: "6px 9px",
          background: "rgba(2,6,23,0.72)",
          color: "#cbd5e1",
          fontSize: 11,
          textDecoration: "none",
        }}
      >
        Model: CharacterZone, CC BY
      </a>
    </div>
  );
}
