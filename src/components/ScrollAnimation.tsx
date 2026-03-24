import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ScrollAnimationContextValue = {
  progress01: number; // 0..1
  frameIndex: number; // 0..frameCount-1
  frameCount: number;
};

const ScrollAnimationContext =
  createContext<ScrollAnimationContextValue | null>(null);

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function frameUrl(basePath: string, frameIndex0: number) {
  // frameIndex0: 0..N-1
  // filename: frame-0001.webp, frame-0002.webp ...
  const n1 = frameIndex0 + 1;
  const suffix = n1.toString().padStart(4, "0");
  return `${basePath}/frame-${suffix}.webp`;
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const scale = Math.min(canvasW / iw, canvasH / ih);
  const w = iw * scale;
  const h = ih * scale;
  const x = (canvasW - w) / 2;
  const y = (canvasH - h) / 2;

  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.drawImage(img, x, y, w, h);
}

function SoftMask(props: { ctx: CanvasRenderingContext2D; w: number; h: number }) {
  const { ctx, w, h } = props;
  ctx.globalCompositeOperation = "destination-in";
  const rInner = Math.min(w, h) * 0.06;
  const rOuter = Math.max(w, h) * 0.62;
  const g = ctx.createRadialGradient(w / 2, h / 2, rInner, w / 2, h / 2, rOuter);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.78, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}

type ScrollAnimationSectionProps = {
  frameCount?: number; // ~150
  sectionHeightVh?: number; // ~400
  basePath?: string; // "/frames"
  frameUrls?: string[]; // explicit frame URLs from import.meta.glob
  className?: string;
  maxCanvasHeightVh?: number; // ~80
  batchSize?: number; // preload batch size
  children?: React.ReactNode;
};

export const ScrollAnimationSection: React.FC<ScrollAnimationSectionProps> = ({
  frameCount = 150,
  sectionHeightVh = 400,
  basePath = "/frames",
  frameUrls,
  className,
  maxCanvasHeightVh = 80,
  batchSize = 6,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const resolvedFrameCount = frameUrls?.length ?? frameCount;
  const imagesRef = useRef<Array<HTMLImageElement | null>>(
    Array.from({ length: resolvedFrameCount }, () => null)
  );
  const loadedCountRef = useRef(0);
  const dprRef = useRef(1);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingPct, setLoadingPct] = useState(0);

  const [progress01, setProgress01] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const progress01Ref = useRef(0);
  const frameIndexRef = useRef(0);

  const lastDrawnFrameRef = useRef(-1);

  const ctxValue = useMemo<ScrollAnimationContextValue>(
    () => ({ progress01, frameIndex, frameCount: resolvedFrameCount }),
    [progress01, frameIndex, resolvedFrameCount]
  );

  const preloadFrame = useCallback(
    (frameIdx0: number) => {
      const url = frameUrls?.[frameIdx0] ?? frameUrl(basePath, frameIdx0);
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load ${url}`));
        img.src = url;
      });
    },
    [basePath, frameUrls]
  );

  // Preload frames in small batches (no video element)
  useEffect(() => {
    let cancelled = false;

    imagesRef.current = Array.from({ length: resolvedFrameCount }, () => null);
    loadedCountRef.current = 0;
    setLoadingPct(0);
    setIsLoading(true);

    const run = async () => {
      const total = resolvedFrameCount;
      const batches = Math.ceil(total / batchSize);

      for (let b = 0; b < batches; b += 1) {
        if (cancelled) return;
        const start = b * batchSize;
        const endExclusive = Math.min(start + batchSize, total);

        const promises: Promise<HTMLImageElement>[] = [];
        for (let i = start; i < endExclusive; i++) promises.push(preloadFrame(i));

        const results = await Promise.allSettled(promises);
        results.forEach((r, idx) => {
          const frameIdx0 = start + idx;
          if (r.status === "fulfilled") {
            imagesRef.current[frameIdx0] = r.value;
          }
          loadedCountRef.current += 1;
          const pct = Math.round((loadedCountRef.current / total) * 100);
          if (!cancelled) setLoadingPct(pct);
        });

        // Yield between batches to keep UI responsive
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }

      if (cancelled) return;
      setIsLoading(false);
    };

    // reset frame pointers for new source list
    frameIndexRef.current = 0;
    setFrameIndex(0);
    progress01Ref.current = 0;
    setProgress01(0);
    lastDrawnFrameRef.current = -1;

    void run();

    return () => {
      cancelled = true;
    };
  }, [resolvedFrameCount, batchSize, preloadFrame]);

  // Resize canvas (DPR-aware)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const aspect = 1640 / 1264;

    const resize = () => {
      const cssW = Math.min(window.innerWidth - 32, 1100);
      const maxH = (window.innerHeight * maxCanvasHeightVh) / 100;
      const cssH = Math.min(cssW / aspect, maxH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      dprRef.current = dpr;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    return () => window.removeEventListener("resize", resize);
  }, [maxCanvasHeightVh]);

  // Scroll controller: only updates state/refs (NO drawing here)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    let ticking = false;

    const update = () => {
      ticking = false;
      if (isLoading) return;

      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const passed = -rect.top;
      const p = total <= 0 ? 0 : clamp01(passed / total);
      const idx = Math.round(p * (resolvedFrameCount - 1));

      // Update state only when changed meaningfully
      if (idx !== frameIndexRef.current) {
        frameIndexRef.current = idx;
        setFrameIndex(idx);
      }
      const pRounded = Number(p.toFixed(4));
      if (Math.abs(pRounded - progress01Ref.current) > 0.0001) {
        progress01Ref.current = pRounded;
        setProgress01(pRounded);
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };

    // Initial
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [resolvedFrameCount, isLoading]);

  // Renderer loop: redraw only when frame changes
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        raf = requestAnimationFrame(draw);
        return;
      }

      if (!isLoading) {
        const idx = frameIndexRef.current;
        if (idx !== lastDrawnFrameRef.current) {
          const img = imagesRef.current[idx];
          if (img) {
            lastDrawnFrameRef.current = idx;

            // Work in physical pixel coordinates
            const w = canvas.width;
            const h = canvas.height;

            ctx.save();

            // Subtle scroll-linked transform
            const p = progress01Ref.current;
            const scale = 1 + Math.sin(p * Math.PI) * 0.012;
            const rot = Math.sin(p * Math.PI * 2) * 0.006;

            ctx.translate(w / 2, h / 2);
            ctx.rotate(rot);
            ctx.scale(scale, scale);
            ctx.translate(-w / 2, -h / 2);

            drawContain(ctx, img, w, h);
            SoftMask({ ctx, w, h });

            ctx.restore();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [isLoading]);

  return (
    <ScrollAnimationContext.Provider value={ctxValue}>
      <div className={className}>
        {/* Progress indicator */}
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/10 pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 transition-[width] duration-75"
            style={{ width: `${Math.round(progress01 * 100)}%` }}
          />
        </div>

        <section
          ref={containerRef}
          style={{ height: `${sectionHeightVh}vh` }}
          className="relative"
        >
          <div className="sticky top-0 h-screen flex items-center justify-center px-4">
            <div className="relative w-full flex items-center justify-center">
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/20 via-slate-950/40 to-slate-950/60 rounded-3xl" />

              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="block rounded-3xl border border-white/10 shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
                />

                {children}

                {isLoading && (
                  <div className="absolute inset-0 rounded-3xl bg-slate-950/75 backdrop-blur-xl border border-white/10 flex items-center justify-center p-6">
                    <div className="w-[min(420px,92vw)] text-center">
                      <div className="mx-auto h-12 w-12 rounded-full border-4 border-sky-400/30 border-t-sky-300 animate-spin" />
                      <div className="mt-4 text-sm font-semibold text-slate-50">
                        Загружаем анимацию
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-[width] duration-200"
                          style={{ width: `${loadingPct}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-300">
                        {loadingPct}% · {resolvedFrameCount} кадров
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </ScrollAnimationContext.Provider>
  );
};

export type OverlayContentProps = {
  start: number; // 0..1
  end: number; // 0..1
  position?: "left" | "right" | "center";
  className?: string;
  children: React.ReactNode;
};

export const OverlayContent: React.FC<OverlayContentProps> = ({
  start,
  end,
  position = "left",
  className,
  children,
}) => {
  const ctx = useContext(ScrollAnimationContext);
  const p = ctx?.progress01 ?? 0;

  const opacity = useMemo(() => {
    if (p < start || p > end) return 0;
    const t = (p - start) / Math.max(0.0001, end - start);
    // fade in then fade out (peaks in the middle of the range)
    const fadeIn = Math.min(1, t * 2);
    const fadeOut = Math.min(1, (1 - t) * 2);
    return Math.min(fadeIn, fadeOut);
  }, [p, start, end]);

  const posClasses =
    position === "right"
      ? "right-5 md:right-10 top-1/2 -translate-y-1/2"
      : position === "center"
        ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        : "left-5 md:left-10 top-1/2 -translate-y-1/2";

  return (
    <div
      className={`pointer-events-none absolute z-20 ${posClasses} transition-opacity duration-300 ${className ?? ""}`}
      style={{ opacity }}
    >
      <div className="pointer-events-auto w-[min(360px,92vw)] rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        {children}
      </div>
    </div>
  );
};

