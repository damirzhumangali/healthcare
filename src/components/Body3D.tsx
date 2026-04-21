import { useEffect, useRef } from "react";

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
  theme = "dark",
  hint,
}: {
  theme?: Body3DTheme;
  hint?: string;
}) {
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
          top: 14,
          left: 14,
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.14)",
          padding: "7px 10px",
          background:
            theme === "dark" ? "rgba(2,6,23,0.66)" : "rgba(255,255,255,0.76)",
          color: theme === "dark" ? "#e2e8f0" : "#334155",
          fontSize: 12,
          fontWeight: 700,
          boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
          backdropFilter: "blur(10px)",
          pointerEvents: "none",
        }}
      >
        {hint}
      </div>
    </div>
  );
}
