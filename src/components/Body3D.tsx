import { useEffect } from "react";

export type Body3DTheme = "dark" | "light";

type Body3DProps = {
  theme?: Body3DTheme;
  hint?: string;
  selectedPart?: string | null;
  onSelectPart?: (part: string) => void;
  labels?: Readonly<Record<string, string>>;
};

type HotspotConfig = {
  part: string;
  position: string;
  normal: string;
};

const MODEL_VIEWER_SCRIPT_URL =
  "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";
const BODY_MODEL_URL =
  "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Xbot.glb";

const HOTSPOTS: HotspotConfig[] = [
  { part: "head", position: "0m 1.75m 0.02m", normal: "0 1 0" },
  { part: "neck", position: "0m 1.55m 0.02m", normal: "0 1 0" },
  { part: "chest", position: "0m 1.35m 0.05m", normal: "0 1 0" },
  { part: "belly", position: "0m 1.05m 0.05m", normal: "0 1 0" },
  { part: "back", position: "0m 1.2m -0.25m", normal: "0 0 -1" },
  { part: "leftArm", position: "-0.45m 1.25m 0.02m", normal: "-1 0 0" },
  { part: "rightArm", position: "0.45m 1.25m 0.02m", normal: "1 0 0" },
  { part: "leftLeg", position: "-0.22m 0.45m 0m", normal: "-1 0 0" },
  { part: "rightLeg", position: "0.22m 0.45m 0m", normal: "1 0 0" },
];

const themeStyles: Record<
  Body3DTheme,
  {
    surface: string;
    hintBackground: string;
    hintColor: string;
    dotBackground: string;
    dotBorder: string;
    dotShadow: string;
    activeBackground: string;
    activeShadow: string;
  }
> = {
  dark: {
    surface: "#02050c",
    hintBackground: "rgba(2, 6, 23, 0.78)",
    hintColor: "#e2e8f0",
    dotBackground: "#0ea5e9",
    dotBorder: "rgba(255,255,255,0.95)",
    dotShadow: "0 0 0 4px rgba(14, 165, 233, 0.18), 0 0 24px rgba(14, 165, 233, 0.5)",
    activeBackground: "#34d399",
    activeShadow: "0 0 0 4px rgba(52, 211, 153, 0.24), 0 0 30px rgba(52, 211, 153, 0.58)",
  },
  light: {
    surface: "#ffffff",
    hintBackground: "rgba(255, 255, 255, 0.82)",
    hintColor: "#334155",
    dotBackground: "#0ea5e9",
    dotBorder: "rgba(255,255,255,1)",
    dotShadow: "0 0 0 4px rgba(14, 165, 233, 0.16), 0 0 20px rgba(14, 165, 233, 0.32)",
    activeBackground: "#10b981",
    activeShadow: "0 0 0 4px rgba(16, 185, 129, 0.22), 0 0 26px rgba(16, 185, 129, 0.44)",
  },
};

let modelViewerScriptPromise: Promise<void> | null = null;

function loadModelViewerScript() {
  if (customElements.get("model-viewer")) return Promise.resolve();

  if (!modelViewerScriptPromise) {
    modelViewerScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${MODEL_VIEWER_SCRIPT_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("model-viewer")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_SCRIPT_URL;
      script.async = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error("model-viewer")), {
        once: true,
      });
      document.head.appendChild(script);
    });
  }

  return modelViewerScriptPromise;
}

export default function Body3D({
  theme = "dark",
  hint,
  selectedPart,
  onSelectPart,
  labels,
}: Body3DProps) {
  const styles = themeStyles[theme];

  useEffect(() => {
    void loadModelViewerScript();
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(520px, 70vh, 760px)",
        minHeight: 520,
        overflow: "hidden",
        background: styles.surface,
      }}
    >
      <model-viewer
        src={BODY_MODEL_URL}
        alt="3D human model"
        auto-rotate
        rotation-per-second="25%"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="1.8"
        exposure="1"
        camera-orbit="0deg 80deg 130%"
        field-of-view="30deg"
        interaction-prompt="none"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          background: styles.surface,
        }}
      >
        {HOTSPOTS.map(({ part, position, normal }) => {
          const active = selectedPart === part;
          const label = labels?.[part] ?? part;

          return (
            <button
              key={part}
              type="button"
              slot={`hotspot-${part}`}
              data-position={position}
              data-normal={normal}
              aria-label={label}
              title={label}
              onClick={() => onSelectPart?.(part)}
              style={{
                width: active ? 22 : 18,
                height: active ? 22 : 18,
                borderRadius: 999,
                border: `2px solid ${styles.dotBorder}`,
                background: active ? styles.activeBackground : styles.dotBackground,
                boxShadow: active ? styles.activeShadow : styles.dotShadow,
                cursor: "pointer",
                transition: "transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
                transform: active ? "scale(1.15)" : "scale(1)",
              }}
            />
          );
        })}
      </model-viewer>

      {hint && (
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 14,
            borderRadius: 12,
            border: "1px solid rgba(148, 163, 184, 0.2)",
            padding: "10px 14px",
            background: styles.hintBackground,
            color: styles.hintColor,
            fontSize: 12,
            fontWeight: 700,
            boxShadow: "0 14px 30px rgba(0,0,0,0.2)",
            backdropFilter: "blur(10px)",
            pointerEvents: "none",
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
