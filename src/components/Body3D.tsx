import { useEffect, useRef } from "react";

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

const zoneButtons: Array<{
  zone: Zone;
  label: string;
}> = [
  { zone: "head", label: "Голова" },
  { zone: "chest", label: "Грудь" },
  { zone: "abdomen", label: "Живот" },
  { zone: "back", label: "Спина" },
  { zone: "leftArm", label: "Левая рука" },
  { zone: "rightArm", label: "Правая рука" },
  { zone: "leftLeg", label: "Левая нога" },
  { zone: "rightLeg", label: "Правая нога" },
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
        }}
      />

      <div
        style={{
          position: "absolute",
          insetInline: 16,
          bottom: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {zoneButtons.map((button) => (
          <button
            key={button.zone}
            type="button"
            onClick={() => onPick(button.zone)}
            style={{
              pointerEvents: "auto",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 8,
              padding: "7px 10px",
              background:
                theme === "dark"
                  ? "rgba(2,6,23,0.72)"
                  : "rgba(255,255,255,0.78)",
              color: theme === "dark" ? "#f8fafc" : "#0f172a",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              boxShadow: "0 12px 28px rgba(0,0,0,0.2)",
              backdropFilter: "blur(10px)",
            }}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}
