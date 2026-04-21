import { useEffect, useRef, useState } from "react";

type Zone = "head" | "chest" | "abdomen" | "back" | "arm" | "leg";
type Vec2 = [number, number];
type Vec3 = [number, number, number];

type SketchfabPick = {
  position3D?: Vec3;
  instanceID?: number;
};

type SketchfabProjection = {
  canvasCoord?: Vec2;
};

type SketchfabApi = {
  start: (callback?: () => void) => void;
  stop: (callback?: () => void) => void;
  addEventListener: (event: "viewerready", callback: () => void) => void;
  pickFromScreen: (
    position2D: Vec2,
    callback: (error: unknown, coordinates?: SketchfabPick) => void,
  ) => void;
  getWorldToScreenCoordinates: (
    worldCoordinates: Vec3,
    callback: (coordinates?: SketchfabProjection) => void,
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
  ui_theme: "dark";
  ui_infos: number;
  ui_controls: number;
  ui_stop: number;
  ui_watermark: number;
  ui_watermark_link: number;
  ui_hint: number;
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
  "https://sketchfab.com/models/33162ec759e04d2985dbbdf4ec908d66/embed?autostart=1&ui_theme=dark&ui_infos=0&ui_controls=0&ui_stop=0&ui_watermark=0&ui_watermark_link=0&ui_hint=0";

const zoneDots: Array<{
  zone: Zone;
  label: string;
  top: number;
  left: number;
}> = [
  { zone: "head", label: "Голова", top: 33, left: 50 },
  { zone: "chest", label: "Грудь", top: 47, left: 50 },
  { zone: "abdomen", label: "Живот", top: 57, left: 50 },
  { zone: "back", label: "Спина", top: 43, left: 58 },
  { zone: "arm", label: "Рука", top: 44, left: 39 },
  { zone: "arm", label: "Рука", top: 44, left: 61 },
  { zone: "leg", label: "Нога", top: 69, left: 45 },
  { zone: "leg", label: "Нога", top: 69, left: 55 },
];

type DotPosition = {
  top: number | string;
  left: number | string;
  visible: boolean;
};

let sketchfabScriptPromise: Promise<void> | null = null;

function getFallbackPositions(): DotPosition[] {
  return zoneDots.map((dot) => ({
    top: `${dot.top}%`,
    left: `${dot.left}%`,
    visible: true,
  }));
}

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

export default function Body3D({ onPick }: { onPick: (zone: Zone) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const anchorsRef = useRef<Array<Vec3 | null>>(zoneDots.map(() => null));
  const [dotPositions, setDotPositions] = useState<DotPosition[]>(() =>
    getFallbackPositions(),
  );

  useEffect(() => {
    const container = containerRef.current;
    const iframe = iframeRef.current;
    if (!container || !iframe) return undefined;

    let apiRef: SketchfabApi | null = null;
    let intervalId = 0;
    let cancelled = false;

    function getPickCoordinates(dot: (typeof zoneDots)[number]): Vec2 {
      const iframeHeight = iframe.clientHeight;
      const containerX = (container.clientWidth * dot.left) / 100;
      const containerY = (container.clientHeight * dot.top) / 100;
      const iframeX = containerX - iframe.offsetLeft;
      const iframeY = containerY - iframe.offsetTop;
      const pixelRatio = window.devicePixelRatio || 1;

      return [iframeX * pixelRatio, (iframeHeight - iframeY) * pixelRatio];
    }

    function projectAnchors(api: SketchfabApi) {
      const anchors = anchorsRef.current;
      let pending = 0;
      const nextPositions = getFallbackPositions();

      anchors.forEach((anchor, index) => {
        if (!anchor) return;
        pending += 1;

        api.getWorldToScreenCoordinates(anchor, (coordinates) => {
          const canvasCoordinates = coordinates?.canvasCoord;

          if (canvasCoordinates) {
            const left = iframe.offsetLeft + canvasCoordinates[0];
            const top = iframe.offsetTop + canvasCoordinates[1];
            nextPositions[index] = {
              left,
              top,
              visible:
                left > -24 &&
                top > -24 &&
                left < container.clientWidth + 24 &&
                top < container.clientHeight + 24,
            };
          }

          pending -= 1;
          if (pending === 0 && !cancelled) {
            setDotPositions(nextPositions);
          }
        });
      });
    }

    function calibrateAnchors(api: SketchfabApi) {
      zoneDots.forEach((dot, index) => {
        api.pickFromScreen(getPickCoordinates(dot), (error, coordinates) => {
          if (!error && coordinates?.position3D) {
            anchorsRef.current[index] = coordinates.position3D;
          }
        });
      });
    }

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
          success(api) {
            apiRef = api;
            api.start();
            api.addEventListener("viewerready", () => {
              if (cancelled) return;
              window.setTimeout(() => {
                if (cancelled) return;
                calibrateAnchors(api);
                projectAnchors(api);
                intervalId = window.setInterval(() => projectAnchors(api), 50);
              }, 650);
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
      window.clearInterval(intervalId);
      apiRef?.stop();
    };
  }, []);

  return (
    <div
      ref={containerRef}
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
              top: dotPositions[index]?.top ?? `${dot.top}%`,
              left: dotPositions[index]?.left ?? `${dot.left}%`,
              transform: "translate(-50%, -50%)",
              display: dotPositions[index]?.visible === false ? "none" : "block",
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
