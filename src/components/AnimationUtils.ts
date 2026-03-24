// Frame loading utilities
export class FrameLoader {
  private frames: Map<number, HTMLImageElement> = new Map();
  private loadingPromises: Map<number, Promise<HTMLImageElement>> = new Map();
  private baseUrl: string;

  constructor(baseUrl: string = '/frames') {
    this.baseUrl = baseUrl;
  }

  async loadFrame(frameNumber: number): Promise<HTMLImageElement> {
    if (this.frames.has(frameNumber)) {
      return this.frames.get(frameNumber)!;
    }

    if (this.loadingPromises.has(frameNumber)) {
      return this.loadingPromises.get(frameNumber)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.frames.set(frameNumber, img);
        resolve(img);
      };
      img.onerror = () => {
        console.error(`Failed to load frame ${frameNumber}`);
        reject(new Error(`Frame ${frameNumber} failed to load`));
      };
      img.src = `${this.baseUrl}/frame-${frameNumber.toString().padStart(4, '0')}.webp`;
    });

    this.loadingPromises.set(frameNumber, promise);
    return promise;
  }

  async loadFrames(start: number, end: number, batchSize: number = 5): Promise<HTMLImageElement[]> {
    const frames: HTMLImageElement[] = [];
    
    for (let i = start; i <= end; i += batchSize) {
      const batchEnd = Math.min(i + batchSize - 1, end);
      const batchPromises: Promise<HTMLImageElement>[] = [];
      
      for (let j = i; j <= batchEnd; j++) {
        batchPromises.push(this.loadFrame(j));
      }
      
      const batchFrames = await Promise.all(batchPromises);
      frames.push(...batchFrames);
    }
    
    return frames;
  }

  getFrame(frameNumber: number): HTMLImageElement | undefined {
    return this.frames.get(frameNumber);
  }

  getLoadedCount(): number {
    return this.frames.size;
  }

  clear(): void {
    this.frames.clear();
    this.loadingPromises.clear();
  }
}

// Scroll utilities
export class ScrollController {
  private element: HTMLElement;
  private onScrollCallback?: (progress: number) => void;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  setScrollCallback(callback: (progress: number) => void): void {
    this.onScrollCallback = callback;
  }

  getScrollProgress(): number {
    const scrollTop = window.scrollY - this.element.offsetTop;
    const scrollHeight = this.element.scrollHeight - window.innerHeight;
    return Math.max(0, Math.min(1, scrollTop / scrollHeight));
  }

  scrollToProgress(progress: number): void {
    const scrollHeight = this.element.scrollHeight - window.innerHeight;
    const scrollTop = progress * scrollHeight + this.element.offsetTop;
    window.scrollTo({ top: scrollTop, behavior: 'smooth' });
  }

  start(): void {
    const handleScroll = () => {
      if (this.onScrollCallback) {
        this.onScrollCallback(this.getScrollProgress());
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial call
    handleScroll();
  }

  stop(): void {
    window.removeEventListener('scroll', () => {});
  }
}

// Canvas rendering utilities
export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationFrameId?: number;
  private lastFrameIndex: number = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawFrame(image: HTMLImageElement, options?: {
    scale?: number;
    rotation?: number;
    opacity?: number;
    softEdges?: boolean;
  }): void {
    if (this.lastFrameIndex === -1) {
      this.clear();
    }

    const {
      scale = 1,
      rotation = 0,
      opacity = 1,
      softEdges = true
    } = options || {};

    this.ctx.save();
    
    // Apply transformations
    this.ctx.globalAlpha = opacity;
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(scale, scale);
    this.ctx.rotate((rotation * Math.PI) / 180);
    this.ctx.translate(-this.canvas.width / 2, -this.canvas.height / 2);

    // Draw image
    this.ctx.drawImage(image, 0, 0, this.canvas.width, this.canvas.height);

    // Apply soft edge mask if requested
    if (softEdges) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(
        this.canvas.width / 2, this.canvas.height / 2, 0,
        this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.ctx.restore();
  }

  startRenderLoop(renderCallback: () => number): void {
    const animate = () => {
      const frameIndex = renderCallback();
      
      if (frameIndex !== this.lastFrameIndex) {
        this.lastFrameIndex = frameIndex;
      }
      
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }
}

// Performance utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startFrame(): void {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
  }

  getFPS(): number {
    return this.fps;
  }

  getMemoryUsage(): number {
    // @ts-ignore - performance.memory is not in TypeScript types but exists in browsers
    return (performance as any).memory ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 : 0;
  }
}

// Animation utilities
export class AnimationUtils {
  static easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  static easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  static lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  static map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }
}
