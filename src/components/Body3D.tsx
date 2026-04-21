type Zone = "head" | "chest" | "abdomen" | "back" | "arm" | "leg";

const SKETCHFAB_MODEL_URL =
  "https://sketchfab.com/models/33162ec759e04d2985dbbdf4ec908d66/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_controls=0&ui_stop=0&ui_watermark=0&ui_watermark_link=0&ui_hint=0";

const zoneDots: Array<{
  zone: Zone;
  label: string;
  top: string;
  left: string;
}> = [
  { zone: "head", label: "Голова", top: "23%", left: "50%" },
  { zone: "chest", label: "Грудь", top: "34%", left: "50%" },
  { zone: "abdomen", label: "Живот", top: "48%", left: "50%" },
  { zone: "back", label: "Спина", top: "39%", left: "59%" },
  { zone: "arm", label: "Рука", top: "40%", left: "31%" },
  { zone: "arm", label: "Рука", top: "40%", left: "69%" },
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
        title="Écorché Male Musclenames Anatomy by chrisfischerart on Sketchfab"
        src={SKETCHFAB_MODEL_URL}
        allow="autoplay; fullscreen; xr-spatial-tracking; web-share"
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
        {zoneDots.map((dot, index) => (
          <button
            key={`${dot.zone}-${index}`}
            type="button"
            aria-label={dot.label}
            onClick={() => onPick(dot.zone)}
            style={{
              position: "absolute",
              top: dot.top,
              left: dot.left,
              transform: "translate(-50%, -50%)",
              pointerEvents: "auto",
              width: 18,
              height: 18,
              border: "2px solid rgba(255,255,255,0.92)",
              borderRadius: "999px",
              padding: 0,
              background:
                "radial-gradient(circle at 35% 35%, #f8fafc 0 16%, #34d399 20% 58%, #0f766e 62% 100%)",
              cursor: "pointer",
              boxShadow:
                "0 0 0 7px rgba(45,212,191,0.2), 0 10px 22px rgba(0,0,0,0.34)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
