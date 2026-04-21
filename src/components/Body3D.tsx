import { useEffect, useRef, useState } from "react";

type Zone =
  | "head"
  | "chest"
  | "abdomen"
  | "back"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";
type Body3DTheme = "dark" | "light";
type Vec3 = [number, number, number];

type SketchfabApi = {
  start: (callback?: () => void) => void;
  stop: (callback?: () => void) => void;
  addEventListener: (event: "viewerready", callback: () => void) => void;
  setBackground: (
    options: { color: Vec3 },
    callback?: (error?: unknown) => void,
  ) => void;
  setUserInteraction: (
    enable: boolean,
    callback?: (error?: unknown) => void,
  ) => void;
};

type SketchfabClient = {
  init: (uid: string, options: SketchfabInitOptions) => void;
};

type SketchfabInitOptions = {
  success: (api: SketchfabApi) => void;
  error: () => void;
  autostart: number;
  preload: number;
  ui_theme: Body3DTheme;
  ui_infos: number;
  ui_controls: number;
  ui_stop: number;
  ui_watermark: number;
  ui_watermark_link: number;
  ui_hint: number;
  ui_annotations?: number;
  ui_ar?: number;
  ui_fullscreen?: number;
  ui_general_controls?: number;
  ui_help?: number;
  ui_loading?: number;
  ui_settings?: number;
  ui_vr?: number;
};

type SketchfabConstructor = new (
  version: string,
  iframe: HTMLIFrameElement,
) => SketchfabClient;

declare global {
  interface Window {
    Sketchfab?: SketchfabConstructor;
  }
}

const SKETCHFAB_MODEL_UID = "33162ec759e04d2985dbbdf4ec908d66";
const SKETCHFAB_SCRIPT_URL =
  "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
const SKETCHFAB_FALLBACK_URL =
  "https://sketchfab.com/models/33162ec759e04d2985dbbdf4ec908d66/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_controls=0&ui_stop=0&ui_watermark=0&ui_watermark_link=0&ui_hint=0&ui_annotations=0&ui_ar=0&ui_fullscreen=0&ui_general_controls=0&ui_help=0&ui_loading=0&ui_settings=0&ui_vr=0";

const themeBackgrounds: Record<
  Body3DTheme,
  { css: string; sketchfab: Vec3 }
> = {
  dark: { css: "#0b1220", sketchfab: [0.043, 0.071, 0.125] },
  light: { css: "#f8fafc", sketchfab: [0.973, 0.984, 0.996] },
};

const zoneDots: Array<{
  zone: Zone;
  label: string;
  top: number;
  left: number;
  width: number;
  height: number;
  radius: string;
  rotate?: number;
}> = [
  {
    zone: "head",
    label: "Голова",
    top: 7,
    left: 43,
    width: 15,
    height: 13,
    radius: "999px",
  },
  {
    zone: "chest",
    label: "Грудь",
    top: 23,
    left: 33,
    width: 30,
    height: 17,
    radius: "36% 36% 22% 22%",
  },
  {
    zone: "abdomen",
    label: "Живот",
    top: 40,
    left: 37,
    width: 22,
    height: 20,
    radius: "34% 34% 46% 46%",
  },
  {
    zone: "back",
    label: "Спина",
    top: 24,
    left: 55,
    width: 15,
    height: 27,
    radius: "38%",
  },
  {
    zone: "leftArm",
    label: "Левая рука",
    top: 29,
    left: 7,
    width: 23,
    height: 35,
    radius: "999px",
    rotate: 16,
  },
  {
    zone: "rightArm",
    label: "Правая рука",
    top: 28,
    left: 67,
    width: 23,
    height: 35,
    radius: "999px",
    rotate: -16,
  },
  {
    zone: "leftLeg",
    label: "Левая нога",
    top: 59,
    left: 28,
    width: 18,
    height: 37,
    radius: "999px",
    rotate: 5,
  },
  {
    zone: "rightLeg",
    label: "Правая нога",
    top: 59,
    left: 52,
    width: 18,
    height: 37,
    radius: "999px",
    rotate: -5,
  },
];

let sketchfabScriptPromise: Promise<void> | null = null;

function loadSketchfabViewerScript() {
  if (window.Sketchfab) return Promise.resolve();

  if (!sketchfabScriptPromise) {
    sketchfabScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${SKETCHFAB_SCRIPT_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener("error", reject, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = SKETCHFAB_SCRIPT_URL;
      script.async = true;
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", reject, { once: true });
      document.head.appendChild(script);
    });
  }

  return sketchfabScriptPromise;
}

function applySketchfabBackground(api: SketchfabApi | null, theme: Body3DTheme) {
  api?.setBackground({ color: themeBackgrounds[theme].sketchfab });
}

export default function Body3D({
  onPick,
  theme = "dark",
}: {
  onPick: (zone: Zone) => void;
  theme?: Body3DTheme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const apiRef = useRef<SketchfabApi | null>(null);
  const themeRef = useRef(theme);
  const [hoveredZone, setHoveredZone] = useState<Zone | null>(null);
  const background = themeBackgrounds[theme];

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return undefined;

    let cancelled = false;

    loadSketchfabViewerScript()
      .then(() => {
        const Sketchfab = window.Sketchfab;
        if (!Sketchfab || cancelled) return;

        const client = new Sketchfab("1.12.1", iframe);
        client.init(SKETCHFAB_MODEL_UID, {
          autostart: 1,
          preload: 1,
          ui_theme: "dark",
          ui_infos: 0,
          ui_controls: 0,
          ui_stop: 0,
          ui_watermark: 0,
          ui_watermark_link: 0,
          ui_hint: 0,
          ui_annotations: 0,
          ui_ar: 0,
          ui_fullscreen: 0,
          ui_general_controls: 0,
          ui_help: 0,
          ui_loading: 0,
          ui_settings: 0,
          ui_vr: 0,
          success(api) {
            apiRef.current = api;
            api.start();
            api.addEventListener("viewerready", () => {
              if (cancelled) return;
              applySketchfabBackground(api, themeRef.current);
              api.setUserInteraction(false);
            });
          },
          error() {
            iframe.src = SKETCHFAB_FALLBACK_URL;
          },
        });
      })
      .catch(() => {
        iframe.src = SKETCHFAB_FALLBACK_URL;
      });

    return () => {
      cancelled = true;
      apiRef.current?.stop();
      apiRef.current = null;
    };
  }, []);

  useEffect(() => {
    themeRef.current = theme;
    applySketchfabBackground(apiRef.current, theme);
  }, [theme]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "min(74vh, 720px)",
        minHeight: 520,
        overflow: "hidden",
        background: background.css,
      }}
    >
      <iframe
        ref={iframeRef}
        title="Écorché Male Musclenames Anatomy by chrisfischerart on Sketchfab"
        allow="autoplay; fullscreen; xr-spatial-tracking; web-share"
        allowFullScreen
        style={{
          position: "absolute",
          top: -72,
          left: -96,
          width: "calc(100% + 192px)",
          height: "calc(100% + 144px)",
          border: 0,
          display: "block",
          background: background.css,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "52%",
          width: "min(48%, 360px)",
          height: "86%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      >
        {zoneDots.map((dot) => {
          const active = hoveredZone === dot.zone;
          return (
            <button
              key={dot.zone}
              type="button"
              aria-label={dot.label}
              title={dot.label}
              onClick={() => onPick(dot.zone)}
              onPointerEnter={() => setHoveredZone(dot.zone)}
              onPointerLeave={() => setHoveredZone(null)}
              style={{
                position: "absolute",
                top: `${dot.top}%`,
                left: `${dot.left}%`,
                width: `${dot.width}%`,
                height: `${dot.height}%`,
                transform: `rotate(${dot.rotate ?? 0}deg)`,
                transformOrigin: "50% 50%",
                pointerEvents: "auto",
                border: active
                  ? "1px solid rgba(255,255,255,0.74)"
                  : "1px solid transparent",
                borderRadius: dot.radius,
                padding: 0,
                background: active
                  ? "rgba(45,212,191,0.22)"
                  : "rgba(45,212,191,0.02)",
                cursor: "pointer",
                boxShadow: active
                  ? "0 0 0 5px rgba(45,212,191,0.12), 0 16px 34px rgba(0,0,0,0.2)"
                  : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
