import { useCallback, useEffect, useRef, useState } from "react";

export type Body3DZone =
  | "head"
  | "chest"
  | "abdomen"
  | "back"
  | "leftArm"
  | "rightArm"
  | "leftLeg"
  | "rightLeg";

type Body3DTheme = "dark" | "light";
type Vec2 = [number, number];
type Vec3 = [number, number, number];
type PickPoint = { top: number; left: number };
type MarkerPosition = { left: number; top: number };

type BodyMarker = {
  zone: Body3DZone;
  label: string;
  position: MarkerPosition;
  visible: boolean;
};

type BodyMarkerWorld = {
  zone: Body3DZone;
  label: string;
  position: Vec3;
};

type SketchfabPick = {
  position3D?: Vec3;
};

type SketchfabScreenCoordinates = {
  canvasCoord?: Vec2;
  glCoord?: Vec2;
};

type SketchfabApi = {
  start: (callback?: () => void) => void;
  stop: (callback?: () => void) => void;
  addEventListener: (
    event: "viewerready",
    callback: () => void,
  ) => void;
  setBackground: (
    options: { color: Vec3 },
    callback?: (error?: unknown) => void,
  ) => void;
  pickFromScreen: (
    position2D: Vec2,
    callback: (error: unknown, coordinates?: SketchfabPick) => void,
  ) => void;
  getWorldToScreenCoordinates: (
    worldCoord: Vec3,
    callback: (coordinates?: SketchfabScreenCoordinates) => void,
  ) => void;
  recenterCamera?: (callback?: (error?: unknown) => void) => void;
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

const bodyAnnotations: Array<{
  zone: Body3DZone;
  label: string;
  pickPoints: PickPoint[];
}> = [
  {
    zone: "head",
    label: "Голова",
    pickPoints: [
      { top: 18, left: 50 },
      { top: 20, left: 50 },
      { top: 19, left: 47 },
    ],
  },
  {
    zone: "chest",
    label: "Грудь",
    pickPoints: [
      { top: 34, left: 50 },
      { top: 35, left: 47 },
      { top: 35, left: 53 },
    ],
  },
  {
    zone: "abdomen",
    label: "Живот",
    pickPoints: [
      { top: 47, left: 50 },
      { top: 50, left: 50 },
      { top: 44, left: 50 },
    ],
  },
  {
    zone: "back",
    label: "Спина",
    pickPoints: [
      { top: 36, left: 58 },
      { top: 39, left: 59 },
      { top: 33, left: 57 },
    ],
  },
  {
    zone: "leftArm",
    label: "Левая рука",
    pickPoints: [
      { top: 38, left: 35 },
      { top: 43, left: 31 },
      { top: 48, left: 29 },
    ],
  },
  {
    zone: "rightArm",
    label: "Правая рука",
    pickPoints: [
      { top: 38, left: 65 },
      { top: 43, left: 69 },
      { top: 48, left: 71 },
    ],
  },
  {
    zone: "leftLeg",
    label: "Левая нога",
    pickPoints: [
      { top: 64, left: 44 },
      { top: 70, left: 43 },
      { top: 77, left: 43 },
    ],
  },
  {
    zone: "rightLeg",
    label: "Правая нога",
    pickPoints: [
      { top: 64, left: 56 },
      { top: 70, left: 57 },
      { top: 77, left: 57 },
    ],
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
  theme = "dark",
  hint,
  onPick,
}: {
  theme?: Body3DTheme;
  hint?: string;
  onPick?: (zone: Body3DZone) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const apiRef = useRef<SketchfabApi | null>(null);
  const themeRef = useRef(theme);
  const onPickRef = useRef(onPick);
  const markerWorldRef = useRef<BodyMarkerWorld[]>([]);
  const markerTimerRef = useRef<number | null>(null);
  const [markers, setMarkers] = useState<BodyMarker[]>([]);
  const background = themeBackgrounds[theme];

  const getPickCoordinates = useCallback((point: PickPoint): Vec2 | null => {
    const iframe = iframeRef.current;
    if (!iframe) return null;

    const parent = iframe.parentElement;
    if (!parent) return null;

    const iframeHeight = iframe.clientHeight;
    const containerX = (parent.clientWidth * point.left) / 100;
    const containerY = (parent.clientHeight * point.top) / 100;
    const iframeX = containerX - iframe.offsetLeft;
    const iframeY = containerY - iframe.offsetTop;
    const pixelRatio = window.devicePixelRatio || 1;

    return [iframeX * pixelRatio, (iframeHeight - iframeY) * pixelRatio];
  }, []);

  const pickAnnotationPoint = useCallback(
    function pickAnnotationPoint(
      api: SketchfabApi,
      pickPoints: PickPoint[],
      callback: (position?: Vec3) => void,
      index = 0,
    ) {
      const point = pickPoints[index];
      const screenPoint = point ? getPickCoordinates(point) : null;

      if (!point || !screenPoint) {
        callback();
        return;
      }

      api.pickFromScreen(screenPoint, (error, coordinates) => {
        if (!error && coordinates?.position3D) {
          callback(coordinates.position3D);
          return;
        }

        pickAnnotationPoint(api, pickPoints, callback, index + 1);
      });
    },
    [getPickCoordinates],
  );

  const updateMarkerPositions = useCallback((api: SketchfabApi) => {
    const iframe = iframeRef.current;
    const parent = iframe?.parentElement;
    const markerWorld = markerWorldRef.current;

    if (!iframe || !parent || markerWorld.length === 0) return;

    const nextMarkers: BodyMarker[] = [];
    let pending = markerWorld.length;
    const containerWidth = parent.clientWidth;
    const containerHeight = parent.clientHeight;

    markerWorld.forEach((marker, index) => {
      api.getWorldToScreenCoordinates(marker.position, (coordinates) => {
        const canvasCoord = coordinates?.canvasCoord;

        if (!canvasCoord) {
          nextMarkers[index] = {
            zone: marker.zone,
            label: marker.label,
            position: { left: 0, top: 0 },
            visible: false,
          };
        } else {
          const left = iframe.offsetLeft + canvasCoord[0];
          const top = iframe.offsetTop + canvasCoord[1];

          nextMarkers[index] = {
            zone: marker.zone,
            label: marker.label,
            position: { left, top },
            visible:
              left >= -24 &&
              top >= -24 &&
              left <= containerWidth + 24 &&
              top <= containerHeight + 24,
          };
        }

        pending -= 1;
        if (pending === 0) setMarkers(nextMarkers);
      });
    });
  }, []);

  const stopMarkerTracking = useCallback(() => {
    if (markerTimerRef.current !== null) {
      window.clearTimeout(markerTimerRef.current);
      markerTimerRef.current = null;
    }
  }, []);

  const startMarkerTracking = useCallback(
    (api: SketchfabApi) => {
      stopMarkerTracking();

      const tick = () => {
        if (apiRef.current !== api) return;
        updateMarkerPositions(api);
        markerTimerRef.current = window.setTimeout(tick, 80);
      };

      tick();
    },
    [stopMarkerTracking, updateMarkerPositions],
  );

  const createBodyMarkers = useCallback(
    (api: SketchfabApi) => {
      const nextMarkerWorld: BodyMarkerWorld[] = [];

      function createNextMarker(index: number) {
        const marker = bodyAnnotations[index];
        if (!marker) {
          markerWorldRef.current = nextMarkerWorld;
          updateMarkerPositions(api);
          startMarkerTracking(api);
          return;
        }

        pickAnnotationPoint(api, marker.pickPoints, (position) => {
          if (position) {
            nextMarkerWorld.push({
              zone: marker.zone,
              label: marker.label,
              position,
            });
          }

          createNextMarker(index + 1);
        });
      }

      createNextMarker(0);
    },
    [pickAnnotationPoint, startMarkerTracking, updateMarkerPositions],
  );

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
              const createMarkers = () => {
                if (cancelled) return;
                createBodyMarkers(api);
              };

              if (api.recenterCamera) {
                api.recenterCamera(() => {
                  window.setTimeout(createMarkers, 700);
                });
                return;
              }

              window.setTimeout(createMarkers, 900);
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
      stopMarkerTracking();
      markerWorldRef.current = [];
      setMarkers([]);
      apiRef.current?.stop();
      apiRef.current = null;
    };
  }, [createBodyMarkers, stopMarkerTracking]);

  useEffect(() => {
    themeRef.current = theme;
    applySketchfabBackground(apiRef.current, theme);
  }, [theme]);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "clamp(500px, 68vh, 680px)",
        minHeight: 500,
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
          top: -56,
          left: -82,
          width: "calc(100% + 164px)",
          height: "calc(100% + 112px)",
          border: 0,
          display: "block",
          background: background.css,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {markers.map((marker) => (
          <button
            key={marker.zone}
            type="button"
            aria-label={marker.label}
            title={marker.label}
            onClick={(event) => {
              event.stopPropagation();
              onPickRef.current?.(marker.zone);
            }}
            style={{
              position: "absolute",
              left: marker.position.left,
              top: marker.position.top,
              width: 28,
              height: 28,
              display: marker.visible ? "grid" : "none",
              placeItems: "center",
              transform: "translate(-50%, -50%)",
              border: "1px solid rgba(255,255,255,0.72)",
              borderRadius: "999px",
              background: "rgba(15,118,110,0.42)",
              boxShadow:
                "0 0 0 7px rgba(16,185,129,0.22), 0 10px 28px rgba(0,0,0,0.35)",
              cursor: "pointer",
              pointerEvents: "auto",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "999px",
                background: "#f8fafc",
                boxShadow: "0 0 0 4px #34d399",
              }}
            />
          </button>
        ))}
      </div>

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
