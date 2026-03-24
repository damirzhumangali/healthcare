# Scroll Animation Setup Guide

This guide will help you prepare your video frames and set up the scroll animation system.

## 🎬 Video to Frames Conversion

### 1. Prepare Your Video
- Duration: ~5 seconds recommended
- Resolution: 1640×1264 pixels (or similar 16:10 ratio)
- Format: MP4, H.264 encoded
- Frame rate: 30fps (150 frames total)

### 2. Extract Frames with FFmpeg

```bash
# Extract frames from video
ffmpeg -i your-video.mp4 -vf "fps=30,scale=1640:1264" frames/frame-%04d.webp

# Alternative: Extract PNG frames (larger file size)
ffmpeg -i your-video.mp4 -vf "fps=30,scale=1640:1264" frames/frame-%04d.png
```

### 3. Optimize Frames

```bash
# Optimize WebP files for better compression
cwebp -q 80 frames/frame-*.webp -o frames/optimized/

# Batch resize if needed
mogrify -resize 1640x1264 frames/*.webp
```

### 4. File Structure

Create this structure in your project:

```
public/
├── frames/
│   ├── frame-0001.webp
│   ├── frame-0002.webp
│   ├── ...
│   └── frame-0150.webp
└── index.html
```

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
npm install react react-dom typescript
```

### 2. Add Files to Your Project

Copy these files to your project:
- `src/components/ScrollAnimation.tsx`
- `src/components/ScrollAnimation.css`
- `src/components/AnimationUtils.ts`
- `src/ScrollAnimationApp.tsx` (example usage)

### 3. Import and Use

```tsx
import { ScrollAnimationSection, OverlayContent } from './components/ScrollAnimation';

function App() {
  return (
    <ScrollAnimationSection frameCount={150}>
      <OverlayContent startProgress={0.1} endProgress={0.3}>
        <div>Your content here</div>
      </OverlayContent>
    </ScrollAnimationSection>
  );
}
```

## ⚙️ Configuration Options

### ScrollAnimationSection Props

| Prop | Type | Default | Description |
|------|------|----------|-------------|
| `frameCount` | `number` | `150` | Total number of frames |
| `sectionHeight` | `string` | `'400vh'` | Height of scroll section |
| `className` | `string` | `''` | Additional CSS classes |

### OverlayContent Props

| Prop | Type | Default | Description |
|------|------|----------|-------------|
| `startProgress` | `number` | `0` | When overlay starts (0-1) |
| `endProgress` | `number` | `1` | When overlay ends (0-1) |
| `position` | `'left' \| 'right' \| 'center'` | `'center'` | Overlay position |
| `className` | `string` | `''` | Additional CSS classes |

## 🎨 Customization

### Canvas Transformations

```tsx
// In ScrollAnimationSection component
const renderFrame = useCallback(() => {
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  
  // Custom transformations
  const progress = currentFrameIndex / (frameCount - 1);
  const scale = 1 + Math.sin(progress * Math.PI) * 0.1; // Scale effect
  const rotation = progress * 360; // Full rotation
  const brightness = 0.8 + Math.sin(progress * Math.PI) * 0.2; // Brightness
  
  ctx.filter = `brightness(${brightness})`;
  // ... apply scale and rotation transforms
}, [currentFrameIndex, frameCount]);
```

### Loading States

```tsx
// Custom loading component
const LoadingIndicator = ({ progress }) => (
  <div className="loading-container">
    <div className="spinner"></div>
    <div className="progress-bar">
      <div style={{ width: `${progress}%` }} />
    </div>
    <p>Loading frames: {Math.round(progress)}%</p>
  </div>
);
```

### Glassmorphism Effects

```css
.glassmorphic-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
```

## 🔧 Performance Optimization

### Frame Loading Strategy

The system loads frames in batches to prevent overwhelming the network:

```typescript
// Default batch size: 5 frames
// Adjustable based on your needs
const BATCH_SIZE = 5;
const TOTAL_FRAMES = 150;
```

### Memory Management

```typescript
// Clear frames when component unmounts
useEffect(() => {
  return () => {
    frames.forEach(frame => {
      frame.image.onload = null;
      frame.image.src = '';
    });
  };
}, []);
```

### Canvas Optimization

```css
.scroll-canvas {
  will-change: transform;
  image-rendering: -webkit-optimize-contrast;
  image-rendering: crisp-edges;
}
```

## 📱 Responsive Design

### Mobile Considerations

```css
@media (max-width: 768px) {
  .glassmorphic-panel {
    margin: 0 1rem;
    max-width: calc(100% - 2rem);
  }
  
  .overlay-content {
    position: fixed;
    bottom: 2rem;
    left: 1rem;
    right: 1rem;
    transform: none;
  }
}
```

### Touch Events

```typescript
// Add touch support for mobile
useEffect(() => {
  const handleTouchMove = (e: TouchEvent) => {
    // Handle touch scroll
  };
  
  element.addEventListener('touchmove', handleTouchMove);
  return () => element.removeEventListener('touchmove', handleTouchMove);
}, []);
```

## 🐛 Troubleshooting

### Common Issues

**Frames not loading:**
- Check file paths in `/frames/` directory
- Verify WebP format support
- Check network tab for failed requests

**Animation not smooth:**
- Ensure requestAnimationFrame is used
- Check for expensive operations in scroll handler
- Monitor FPS with Performance Monitor

**Memory issues:**
- Reduce frame resolution
- Implement frame unloading
- Check for memory leaks

### Debug Tools

```typescript
// Enable performance monitoring
const monitor = PerformanceMonitor.getInstance();

// Log FPS and memory
setInterval(() => {
  console.log(`FPS: ${monitor.getFPS()}`);
  console.log(`Memory: ${monitor.getMemoryUsage()}MB`);
}, 1000);
```

## 📚 Advanced Features

### Multiple Animations

```tsx
return (
  <div>
    <ScrollAnimationSection frameCount={150}>
      {/* First animation */}
    </ScrollAnimationSection>
    
    <ScrollAnimationSection frameCount={100}>
      {/* Second animation */}
    </ScrollAnimationSection>
  </div>
);
```

### Interactive Overlays

```tsx
const [isPaused, setIsPaused] = useState(false);

<OverlayContent startProgress={0.3} endProgress={0.7}>
  <button onClick={() => setIsPaused(!isPaused)}>
    {isPaused ? 'Play' : 'Pause'}
  </button>
</OverlayContent>
```

### Custom Easing Functions

```typescript
const customEasing = (t: number) => {
  // Custom easing function
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
```

## 🎯 Best Practices

1. **Frame Quality**: Use WebP format for optimal size/quality ratio
2. **Loading Strategy**: Load frames in batches, not all at once
3. **Performance**: Use requestAnimationFrame for smooth rendering
4. **Memory**: Clean up resources when component unmounts
5. **Accessibility**: Add keyboard navigation and ARIA labels
6. **SEO**: Ensure content is accessible without JavaScript

## 📄 License

This code is provided as-is for educational and commercial use. Feel free to modify and distribute according to your project needs.
