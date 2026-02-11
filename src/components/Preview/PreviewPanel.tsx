import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useResourceStore } from '../../resources/resourceStore';
import type { LvglComponent, Animation } from '../../types';
import './PreviewPanel.css';

// Image cache to avoid reloading images
const imageCache = new Map<string, HTMLImageElement>();

// Easing functions
function easingLinear(t: number): number { return t; }
function easingEaseIn(t: number): number { return t * t; }
function easingEaseOut(t: number): number { return t * (2 - t); }
function easingEaseInOut(t: number): number { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function easingOvershoot(t: number): number { const s = 1.70158; return t * t * ((s + 1) * t - s); }
function easingBounce(t: number): number {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) { const t2 = t - 1.5 / 2.75; return 7.5625 * t2 * t2 + 0.75; }
  if (t < 2.5 / 2.75) { const t2 = t - 2.25 / 2.75; return 7.5625 * t2 * t2 + 0.9375; }
  const t2 = t - 2.625 / 2.75; return 7.5625 * t2 * t2 + 0.984375;
}

function getEasingFn(easing: string): (t: number) => number {
  switch (easing) {
    case 'ease_in': return easingEaseIn;
    case 'ease_out': return easingEaseOut;
    case 'ease_in_out': return easingEaseInOut;
    case 'overshoot': return easingOvershoot;
    case 'bounce': return easingBounce;
    default: return easingLinear;
  }
}

interface AnimState {
  compId: string;
  anim: Animation;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
}

function computeAnimState(anim: Animation, progress: number): Partial<AnimState> {
  const easeFn = getEasingFn(anim.easing);
  const t = easeFn(Math.max(0, Math.min(1, progress)));
  const start = Number(anim.startValue) || 0;
  const end = Number(anim.endValue) || 0;
  const val = start + (end - start) * t;

  switch (anim.type) {
    case 'fade_in': return { opacity: t };
    case 'fade_out': return { opacity: 1 - t };
    case 'slide_left': return { offsetX: (1 - t) * (start || 100) * -1 };
    case 'slide_right': return { offsetX: (1 - t) * (start || 100) };
    case 'slide_up': return { offsetY: (1 - t) * (start || 100) * -1 };
    case 'slide_down': return { offsetY: (1 - t) * (start || 100) };
    case 'zoom_in': return { scaleX: t, scaleY: t };
    case 'zoom_out': return { scaleX: 1 - t, scaleY: 1 - t };
    case 'custom': {
      // Use property + start/end for custom
      if (anim.property === 'x') return { offsetX: val };
      if (anim.property === 'y') return { offsetY: val };
      if (anim.property === 'opacity') return { opacity: val / 255 };
      if (anim.property === 'width') return { scaleX: val / 100 };
      if (anim.property === 'height') return { scaleY: val / 100 };
      return {};
    }
    default: return {};
  }
}

const PreviewPanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const { pages, currentPageId, canvas } = useEditorStore();
  const { images } = useResourceStore();
  const [scale, setScale] = useState(1);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);
  const [previewPageId, setPreviewPageId] = useState<string>(currentPageId);
  const [animPlaying, setAnimPlaying] = useState(false);
  const [animPaused, setAnimPaused] = useState(false);
  const animStartRef = useRef<number>(0);
  const animPausedAtRef = useRef<number>(0);
  const [animStates, setAnimStates] = useState<Map<string, Partial<AnimState>>>(new Map());

  // Sync preview page with editor when not playing
  useEffect(() => {
    if (!animPlaying) setPreviewPageId(currentPageId);
  }, [currentPageId, animPlaying]);

  const previewPage = pages.find(p => p.id === previewPageId) || pages.find(p => p.id === currentPageId);
  const components = useMemo(() => previewPage?.components || [], [previewPage?.components]);
  const bgColor = previewPage?.backgroundColor || '#ffffff';

  // Load image from resource store or URL
  const loadImage = useCallback((src: string): HTMLImageElement | null => {
    // Check cache first
    if (imageCache.has(src)) {
      const cached = imageCache.get(src)!;
      if (cached.complete) {
        return cached;
      }
    }

    // Try to find in resource store by name or id
    let imageData: string | null = null;
    
    // Check if src is a resource ID or name
    const resource = images.find(img => img.id === src || img.name === src || img.cArrayName === src);
    if (resource) {
      imageData = resource.data;
    } else if (src.startsWith('data:') || src.startsWith('http')) {
      // Direct URL or data URL
      imageData = src;
    }

    if (!imageData) {
      return null;
    }

    // Create new image
    const img = new Image();
    img.src = imageData;
    imageCache.set(src, img);

    // Trigger re-render when image loads
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        // Force re-render
        setHoveredComponent(prev => prev);
      }
    };

    return img.complete ? img : null;
  }, [images]);

  // Collect all animations from all components
  const collectAnimations = useCallback((comps: LvglComponent[]): { compId: string; anim: Animation }[] => {
    const result: { compId: string; anim: Animation }[] = [];
    for (const comp of comps) {
      if (comp.animations && comp.animations.length > 0) {
        for (const anim of comp.animations) {
          result.push({ compId: comp.id, anim });
        }
      }
      if (comp.children.length > 0) {
        result.push(...collectAnimations(comp.children));
      }
    }
    return result;
  }, []);

  // Animation playback
  const startAnimation = useCallback(() => {
    const allAnims = collectAnimations(components);
    if (allAnims.length === 0) return;

    setAnimPlaying(true);
    setAnimPaused(false);
    animStartRef.current = performance.now();
    animPausedAtRef.current = 0;

    const maxEnd = Math.max(...allAnims.map(a => (a.anim.delay || 0) + (a.anim.duration || 300)));

    const tick = (now: number) => {
      const elapsed = now - animStartRef.current;
      const newStates = new Map<string, Partial<AnimState>>();

      for (const { compId, anim } of allAnims) {
        const delay = anim.delay || 0;
        const duration = anim.duration || 300;
        const localTime = elapsed - delay;

        if (localTime < 0) continue;

        let progress = Math.min(1, localTime / duration);

        // Handle repeat
        if (anim.repeat && anim.repeat > 1 && progress >= 1) {
          const totalDuration = duration * anim.repeat;
          const totalLocal = elapsed - delay;
          if (totalLocal < totalDuration) {
            progress = (totalLocal % duration) / duration;
          }
        }

        const state = computeAnimState(anim, progress);
        const existing = newStates.get(compId) || {};
        newStates.set(compId, {
          offsetX: (existing.offsetX || 0) + (state.offsetX || 0),
          offsetY: (existing.offsetY || 0) + (state.offsetY || 0),
          scaleX: (existing.scaleX ?? 1) * (state.scaleX ?? 1),
          scaleY: (existing.scaleY ?? 1) * (state.scaleY ?? 1),
          opacity: Math.min(existing.opacity ?? 1, state.opacity ?? 1),
        });
      }

      setAnimStates(newStates);

      if (elapsed < maxEnd * (Math.max(...allAnims.map(a => a.anim.repeat || 1)))) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setAnimPlaying(false);
        setAnimStates(new Map());
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [components, collectAnimations]);

  const pauseAnimation = useCallback(() => {
    if (animPlaying && !animPaused) {
      cancelAnimationFrame(animFrameRef.current);
      animPausedAtRef.current = performance.now();
      setAnimPaused(true);
    }
  }, [animPlaying, animPaused]);

  const resumeAnimation = useCallback(() => {
    if (animPlaying && animPaused) {
      const pauseDuration = performance.now() - animPausedAtRef.current;
      animStartRef.current += pauseDuration;
      setAnimPaused(false);

      // Restart the tick loop
      const allAnims = collectAnimations(components);
      const maxEnd = Math.max(...allAnims.map(a => (a.anim.delay || 0) + (a.anim.duration || 300)));

      const tick = (now: number) => {
        const elapsed = now - animStartRef.current;
        const newStates = new Map<string, Partial<AnimState>>();

        for (const { compId, anim } of allAnims) {
          const delay = anim.delay || 0;
          const duration = anim.duration || 300;
          const localTime = elapsed - delay;
          if (localTime < 0) continue;
          let progress = Math.min(1, localTime / duration);
          if (anim.repeat && anim.repeat > 1 && progress >= 1) {
            const totalLocal = elapsed - delay;
            if (totalLocal < duration * anim.repeat) {
              progress = (totalLocal % duration) / duration;
            }
          }
          const state = computeAnimState(anim, progress);
          const existing = newStates.get(compId) || {};
          newStates.set(compId, {
            offsetX: (existing.offsetX || 0) + (state.offsetX || 0),
            offsetY: (existing.offsetY || 0) + (state.offsetY || 0),
            scaleX: (existing.scaleX ?? 1) * (state.scaleX ?? 1),
            scaleY: (existing.scaleY ?? 1) * (state.scaleY ?? 1),
            opacity: Math.min(existing.opacity ?? 1, state.opacity ?? 1),
          });
        }
        setAnimStates(newStates);
        if (elapsed < maxEnd * (Math.max(...allAnims.map(a => a.anim.repeat || 1)))) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          setAnimPlaying(false);
          setAnimStates(new Map());
        }
      };
      animFrameRef.current = requestAnimationFrame(tick);
    }
  }, [animPlaying, animPaused, components, collectAnimations]);

  const resetAnimation = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    setAnimPlaying(false);
    setAnimPaused(false);
    setAnimStates(new Map());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  // Handle click for navigation
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const findAtPoint = (comps: LvglComponent[], ox = 0, oy = 0): LvglComponent | null => {
      for (let i = comps.length - 1; i >= 0; i--) {
        const comp = comps[i];
        const cx = comp.x + ox;
        const cy = comp.y + oy;
        if (x >= cx && x <= cx + comp.width && y >= cy && y <= cy + comp.height) {
          const child = findAtPoint(comp.children, cx, cy);
          return child || comp;
        }
      }
      return null;
    };

    const hit = findAtPoint(components);
    if (hit && hit.events) {
      for (const ev of hit.events) {
        if (ev.action?.type === 'navigate' && ev.action.targetPage) {
          const targetPage = pages.find(p => p.name === ev.action!.targetPage || p.id === ev.action!.targetPage);
          if (targetPage) {
            setPreviewPageId(targetPage.id);
            return;
          }
        }
      }
    }
  }, [components, pages, scale]);

  // Render components to canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render each component
    const renderComponent = (comp: LvglComponent, offsetX = 0, offsetY = 0) => {
      let x = comp.x + offsetX;
      let y = comp.y + offsetY;
      let w = comp.width;
      let h = comp.height;
      const isHovered = hoveredComponent === comp.id;

      // Apply animation state
      const aState = animStates.get(comp.id);
      if (aState) {
        x += aState.offsetX || 0;
        y += aState.offsetY || 0;
        if (aState.scaleX !== undefined && aState.scaleX !== 1) {
          const newW = w * aState.scaleX;
          x += (w - newW) / 2;
          w = newW;
        }
        if (aState.scaleY !== undefined && aState.scaleY !== 1) {
          const newH = h * aState.scaleY;
          y += (h - newH) / 2;
          h = newH;
        }
        if (aState.opacity !== undefined) {
          ctx.save();
          ctx.globalAlpha = aState.opacity;
        }
      }

      // Get styles
      const styles = comp.styles.default;
      const bgColorStyle = styles.bgColor || '#e0e0e0';
      const borderColor = styles.borderColor || '#cccccc';
      const borderWidth = styles.borderWidth || 1;
      const borderRadius = styles.borderRadius || 4;
      const textColor = styles.textColor || '#333333';

      // --- Transform support ---
      const hasTransform = styles.transformAngle || styles.transformZoomX !== undefined || styles.transformZoomY !== undefined;
      if (hasTransform) {
        ctx.save();
        const cx = x + w / 2;
        const cy = y + h / 2;
        const pivotX = styles.transformPivotX !== undefined ? x + styles.transformPivotX : cx;
        const pivotY = styles.transformPivotY !== undefined ? y + styles.transformPivotY : cy;
        ctx.translate(pivotX, pivotY);
        if (styles.transformAngle) {
          // LVGL uses 0.1 degree units
          ctx.rotate((styles.transformAngle / 10) * Math.PI / 180);
        }
        if (styles.transformZoomX !== undefined || styles.transformZoomY !== undefined) {
          const sx = styles.transformZoomX !== undefined ? styles.transformZoomX / 256 : 1;
          const sy = styles.transformZoomY !== undefined ? styles.transformZoomY / 256 : 1;
          ctx.scale(sx, sy);
        }
        ctx.translate(-pivotX, -pivotY);
      }

      // --- Shadow support ---
      const hasShadow = styles.shadowWidth || styles.shadowOffsetX || styles.shadowOffsetY;
      if (hasShadow) {
        ctx.save();
        if (styles.shadowColor) {
          const hex = styles.shadowColor.replace('#', '');
          const sr = parseInt(hex.substring(0, 2), 16) || 0;
          const sg = parseInt(hex.substring(2, 4), 16) || 0;
          const sb = parseInt(hex.substring(4, 6), 16) || 0;
          const sa = styles.shadowOpacity !== undefined ? Math.max(0, Math.min(1, styles.shadowOpacity / 255)) : 1;
          ctx.shadowColor = `rgba(${sr},${sg},${sb},${sa})`;
        } else {
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
        }
        ctx.shadowBlur = styles.shadowWidth || 0;
        ctx.shadowOffsetX = styles.shadowOffsetX || 0;
        ctx.shadowOffsetY = styles.shadowOffsetY || 0;
      }

      // --- Gradient helper ---
      const getGradientFill = (): string | CanvasGradient => {
        if (styles.bgGradDir && styles.bgGradDir !== 'none' && styles.bgGradColor) {
          const stop = styles.bgGradStop !== undefined ? styles.bgGradStop / 255 : 1;
          let grad: CanvasGradient;
          if (styles.bgGradDir === 'hor') {
            grad = ctx.createLinearGradient(x, y, x + w, y);
          } else {
            grad = ctx.createLinearGradient(x, y, x, y + h);
          }
          grad.addColorStop(0, bgColorStyle);
          grad.addColorStop(stop, styles.bgGradColor);
          return grad;
        }
        return bgColorStyle;
      };

      // Draw based on component type
      switch (comp.type) {
        case 'btn':
          drawButton(ctx, x, y, w, h, {
            bgColor: isHovered ? lightenColor(bgColorStyle, 20) : bgColorStyle,
            borderColor,
            borderWidth,
            borderRadius,
            text: comp.props.text || 'Button',
            textColor,
            gradientFill: isHovered ? undefined : getGradientFill(),
            textDecor: styles.textDecor,
            borderSide: styles.borderSide,
          });
          break;

        case 'label':
          drawLabel(ctx, x, y, w, h, {
            text: comp.props.text || 'Label',
            textColor,
            fontSize: comp.props.fontSize || 14,
            textDecor: styles.textDecor,
          });
          break;

        case 'slider':
          drawSlider(ctx, x, y, w, h, {
            value: comp.props.value || 50,
            min: comp.props.min || 0,
            max: comp.props.max || 100,
            bgColor: bgColorStyle,
          });
          break;

        case 'checkbox':
          drawCheckbox(ctx, x, y, w, h, {
            checked: comp.props.checked || false,
            text: comp.props.text || 'Checkbox',
            textColor,
            textDecor: styles.textDecor,
          });
          break;

        case 'switch':
          drawSwitch(ctx, x, y, w, h, {
            checked: comp.props.checked || false,
          });
          break;

        case 'bar':
          drawBar(ctx, x, y, w, h, {
            value: comp.props.value || 50,
            min: comp.props.min || 0,
            max: comp.props.max || 100,
            bgColor: bgColorStyle,
          });
          break;

        case 'arc':
          drawArc(ctx, x, y, w, h, {
            value: comp.props.value || 75,
            min: comp.props.min || 0,
            max: comp.props.max || 100,
            bgColor: bgColorStyle,
          });
          break;

        case 'textarea':
          drawTextarea(ctx, x, y, w, h, {
            text: comp.props.text || '',
            placeholder: comp.props.placeholder || 'Enter text...',
            bgColor: bgColorStyle,
            borderColor,
            borderRadius,
            textColor,
            gradientFill: getGradientFill(),
          });
          break;

        case 'dropdown':
          drawDropdown(ctx, x, y, w, h, {
            options: comp.props.options || ['Option 1', 'Option 2', 'Option 3'],
            selected: comp.props.selected || 0,
            bgColor: bgColorStyle,
            borderColor,
            borderRadius,
            textColor,
            gradientFill: getGradientFill(),
          });
          break;

        case 'img':
          drawImage(ctx, x, y, w, h, {
            src: comp.props.src,
            loadImage,
          });
          break;

        case 'obj':
        case 'panel':
        case 'container':
          drawPanel(ctx, x, y, w, h, {
            bgColor: bgColorStyle,
            borderColor,
            borderWidth,
            borderRadius,
            gradientFill: getGradientFill(),
            borderSide: styles.borderSide,
          });
          break;

        case 'line':
          drawLine(ctx, x, y, w, h, {
            lineColor: comp.props.lineColor || bgColorStyle,
            lineWidth: comp.props.lineWidth || 2,
          });
          break;

        case 'spinner':
          drawSpinner(ctx, x, y, w, h, {
            borderColor: styles.borderColor || '#2196F3',
          });
          break;

        case 'chart':
          drawChart(ctx, x, y, w, h, {
            type: comp.props.type || 'line',
            data: comp.props.data || [10, 20, 30, 25, 40],
            lineColor: comp.props.lineColor || '#2196F3',
            bgColor: bgColorStyle,
            borderColor,
            borderRadius,
            showGrid: comp.props.showGrid !== false,
          });
          break;

        case 'table':
          drawTable(ctx, x, y, w, h, {
            rows: comp.props.rows || 3,
            cols: comp.props.cols || 3,
            bgColor: bgColorStyle,
            borderColor,
            textColor,
          });
          break;

        case 'calendar':
          drawCalendar(ctx, x, y, w, h, {
            year: comp.props.year || new Date().getFullYear(),
            month: comp.props.month || 1,
            bgColor: bgColorStyle,
            borderColor,
            textColor,
          });
          break;

        case 'tabview':
          drawTabview(ctx, x, y, w, h, {
            tabs: comp.props.tabs || ['Tab 1', 'Tab 2'],
            activeTab: comp.props.activeTab || 0,
            bgColor: bgColorStyle,
            borderColor,
            textColor,
          });
          break;

        case 'tileview':
          drawTileview(ctx, x, y, w, h, {
            rows: comp.props.rows || 2,
            cols: comp.props.cols || 2,
            currentRow: comp.props.currentRow || 0,
            currentCol: comp.props.currentCol || 0,
            bgColor: bgColorStyle,
            borderColor,
          });
          break;

        case 'win':
          drawWindow(ctx, x, y, w, h, {
            title: comp.props.title || 'Window',
            bgColor: bgColorStyle,
            borderColor,
            borderRadius,
            textColor,
          });
          break;

        default:
          // Generic rectangle for unknown types
          drawGeneric(ctx, x, y, w, h, {
            bgColor: bgColorStyle,
            borderColor,
            borderWidth,
            borderRadius,
            label: comp.type,
          });
      }

      // Reset shadow after drawing the main shape
      if (hasShadow) {
        ctx.restore();
      }

      // --- Outline support (draw after shadow restore so outline isn't shadowed) ---
      if (styles.outlineWidth) {
        const olColor = styles.outlineColor || '#000';
        const olWidth = styles.outlineWidth;
        const olPad = styles.outlinePad || 0;
        ctx.strokeStyle = olColor;
        ctx.lineWidth = olWidth;
        roundRect(ctx, x - olPad - olWidth / 2, y - olPad - olWidth / 2, w + (olPad + olWidth / 2) * 2, h + (olPad + olWidth / 2) * 2, borderRadius + olPad);
        ctx.stroke();
      }

      // Render children (apply padding offset)
      const padTop = styles.paddingTop ?? styles.padding ?? 0;
      const padLeft = styles.paddingLeft ?? styles.padding ?? 0;
      comp.children.forEach(child => renderComponent(child, x + padLeft, y + padTop));

      // Restore transform if applied
      if (hasTransform) {
        ctx.restore();
      }

      // Restore alpha if animation changed it
      if (aState?.opacity !== undefined) {
        ctx.restore();
      }
    };

    components.forEach(comp => renderComponent(comp));
  }, [components, canvas, bgColor, hoveredComponent, loadImage, animStates]);

  // Handle mouse move for hover effects
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    // Find component at point
    const findAtPoint = (comps: LvglComponent[], offsetX = 0, offsetY = 0): string | null => {
      for (let i = comps.length - 1; i >= 0; i--) {
        const comp = comps[i];
        const compX = comp.x + offsetX;
        const compY = comp.y + offsetY;

        if (x >= compX && x <= compX + comp.width && y >= compY && y <= compY + comp.height) {
          const childHit = findAtPoint(comp.children, compX, compY);
          return childHit || comp.id;
        }
      }
      return null;
    };

    setHoveredComponent(findAtPoint(components));
  };

  const handleMouseLeave = () => {
    setHoveredComponent(null);
  };

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <h3>📱 实时预览</h3>
        <div className="preview-controls">
          {!animPlaying ? (
            <button className="preview-btn" onClick={startAnimation} title="播放动画">▶</button>
          ) : animPaused ? (
            <button className="preview-btn" onClick={resumeAnimation} title="继续">▶</button>
          ) : (
            <button className="preview-btn" onClick={pauseAnimation} title="暂停">⏸</button>
          )}
          <button className="preview-btn" onClick={resetAnimation} title="重置" disabled={!animPlaying && animStates.size === 0}>⏹</button>
          <span className="preview-divider" />
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))}>−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2, s + 0.25))}>+</button>
        </div>
      </div>
      <div className="preview-content">
        <div 
          className="preview-canvas-wrapper"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <canvas
            ref={canvasRef}
            width={canvas.width}
            height={canvas.height}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleCanvasClick}
            style={{ cursor: hoveredComponent ? 'pointer' : 'default' }}
          />
        </div>
      </div>
      <div className="preview-footer">
        <div className="preview-pages">
          {pages.map(p => (
            <button
              key={p.id}
              className={`preview-page-btn ${p.id === previewPageId ? 'active' : ''}`}
              onClick={() => setPreviewPageId(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <span>{canvas.width} × {canvas.height}</span>
        {hoveredComponent && <span>悬停: {hoveredComponent.slice(0, 8)}...</span>}
      </div>
    </div>
  );
};

// Drawing helper functions

// Helper: draw text decoration (underline / strikethrough)
function drawTextDecoration(
  ctx: CanvasRenderingContext2D,
  textX: number, textY: number, textWidth: number, fontSize: number,
  decor?: string, color?: string
) {
  if (!decor || decor === 'none') return;
  ctx.strokeStyle = color || ctx.fillStyle;
  ctx.lineWidth = Math.max(1, fontSize / 12);
  ctx.beginPath();
  if (decor === 'underline') {
    const lineY = textY + fontSize * 0.15;
    ctx.moveTo(textX, lineY);
    ctx.lineTo(textX + textWidth, lineY);
  } else if (decor === 'strikethrough') {
    const lineY = textY - fontSize * 0.3;
    ctx.moveTo(textX, lineY);
    ctx.lineTo(textX + textWidth, lineY);
  }
  ctx.stroke();
}

// Helper: draw border with side support
function drawBorderWithSide(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  borderColor: string, borderWidth: number, borderRadius: number,
  borderSide?: string
) {
  if (!borderWidth) return;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;

  const side = borderSide || 'full';
  if (side === 'none') return;

  if (side === 'full') {
    roundRect(ctx, x, y, w, h, borderRadius);
    ctx.stroke();
    return;
  }

  // Individual sides (no border-radius for partial borders)
  const drawTop = side === 'top' || side === 'top_bottom';
  const drawBottom = side === 'bottom' || side === 'top_bottom';
  const drawLeft = side === 'left' || side === 'left_right';
  const drawRight = side === 'right' || side === 'left_right';

  if (drawTop) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();
  }
  if (drawBottom) {
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  }
  if (drawLeft) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.stroke();
  }
  if (drawRight) {
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  }
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { bgColor: string; borderColor: string; borderWidth: number; borderRadius: number; text: string; textColor: string; gradientFill?: string | CanvasGradient; textDecor?: string; borderSide?: string }
) {
  ctx.fillStyle = opts.gradientFill || opts.bgColor;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  drawBorderWithSide(ctx, x, y, w, h, opts.borderColor, opts.borderWidth, opts.borderRadius, opts.borderSide);

  ctx.fillStyle = opts.textColor;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const textX = x + w / 2;
  const textY = y + h / 2;
  ctx.fillText(opts.text, textX, textY);

  // Text decoration
  if (opts.textDecor && opts.textDecor !== 'none') {
    const metrics = ctx.measureText(opts.text);
    drawTextDecoration(ctx, textX - metrics.width / 2, textY, metrics.width, 14, opts.textDecor, opts.textColor);
  }
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, _w: number, _h: number,
  opts: { text: string; textColor: string; fontSize: number; textDecor?: string }
) {
  ctx.fillStyle = opts.textColor;
  ctx.font = `${opts.fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(opts.text, x, y);

  // Text decoration
  if (opts.textDecor && opts.textDecor !== 'none') {
    const metrics = ctx.measureText(opts.text);
    drawTextDecoration(ctx, x, y + opts.fontSize, metrics.width, opts.fontSize, opts.textDecor, opts.textColor);
  }
}

function drawSlider(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { value: number; min: number; max: number; bgColor: string }
) {
  const trackHeight = 6;
  const trackY = y + (h - trackHeight) / 2;
  const progress = (opts.value - opts.min) / (opts.max - opts.min);
  const knobX = x + progress * w;

  // Track background
  ctx.fillStyle = '#e0e0e0';
  roundRect(ctx, x, trackY, w, trackHeight, 3);
  ctx.fill();

  // Track fill
  ctx.fillStyle = '#2196f3';
  roundRect(ctx, x, trackY, w * progress, trackHeight, 3);
  ctx.fill();

  // Knob
  ctx.fillStyle = '#2196f3';
  ctx.beginPath();
  ctx.arc(knobX, y + h / 2, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawCheckbox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, _w: number, h: number,
  opts: { checked: boolean; text: string; textColor: string; textDecor?: string }
) {
  const boxSize = 18;
  const boxY = y + (h - boxSize) / 2;

  // Box
  ctx.strokeStyle = opts.checked ? '#2196f3' : '#999';
  ctx.lineWidth = 2;
  ctx.fillStyle = opts.checked ? '#2196f3' : '#fff';
  roundRect(ctx, x, boxY, boxSize, boxSize, 3);
  ctx.fill();
  ctx.stroke();

  // Checkmark
  if (opts.checked) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, boxY + boxSize / 2);
    ctx.lineTo(x + boxSize / 2 - 1, boxY + boxSize - 5);
    ctx.lineTo(x + boxSize - 4, boxY + 5);
    ctx.stroke();
  }

  // Text
  ctx.fillStyle = opts.textColor;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const textStartX = x + boxSize + 8;
  const textCenterY = y + h / 2;
  ctx.fillText(opts.text, textStartX, textCenterY);

  // Text decoration
  if (opts.textDecor && opts.textDecor !== 'none') {
    const metrics = ctx.measureText(opts.text);
    drawTextDecoration(ctx, textStartX, textCenterY, metrics.width, 14, opts.textDecor, opts.textColor);
  }
}

function drawSwitch(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { checked: boolean }
) {
  const trackWidth = Math.min(w, 50);
  const trackHeight = 24;
  const trackX = x + (w - trackWidth) / 2;
  const trackY = y + (h - trackHeight) / 2;

  // Track
  ctx.fillStyle = opts.checked ? '#4caf50' : '#ccc';
  roundRect(ctx, trackX, trackY, trackWidth, trackHeight, trackHeight / 2);
  ctx.fill();

  // Knob
  const knobRadius = trackHeight / 2 - 2;
  const knobX = opts.checked ? trackX + trackWidth - knobRadius - 2 : trackX + knobRadius + 2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(knobX, trackY + trackHeight / 2, knobRadius, 0, Math.PI * 2);
  ctx.fill();
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { value: number; min: number; max: number; bgColor: string }
) {
  const progress = (opts.value - opts.min) / (opts.max - opts.min);

  // Background
  ctx.fillStyle = '#e0e0e0';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();

  // Fill
  ctx.fillStyle = '#2196f3';
  roundRect(ctx, x, y, w * progress, h, 4);
  ctx.fill();
}

function drawArc(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { value: number; min: number; max: number; bgColor: string }
) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 - 5;
  const progress = (opts.value - opts.min) / (opts.max - opts.min);
  const startAngle = -Math.PI * 0.75;
  const endAngle = Math.PI * 0.75;
  const currentAngle = startAngle + (endAngle - startAngle) * progress;

  // Background arc
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.stroke();

  // Progress arc
  ctx.strokeStyle = '#2196f3';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
  ctx.stroke();

  // Value text
  ctx.fillStyle = '#333';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${opts.value}`, centerX, centerY);
}

function drawTextarea(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { text: string; placeholder: string; bgColor: string; borderColor: string; borderRadius: number; textColor: string; gradientFill?: string | CanvasGradient }
) {
  ctx.fillStyle = opts.gradientFill || opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  const displayText = opts.text || opts.placeholder;
  ctx.fillStyle = opts.text ? opts.textColor : '#999';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(displayText, x + 8, y + 8);
}

function drawDropdown(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { options: string[]; selected: number; bgColor: string; borderColor: string; borderRadius: number; textColor: string; gradientFill?: string | CanvasGradient }
) {
  ctx.fillStyle = opts.gradientFill || opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  const selectedText = opts.options[opts.selected] || opts.options[0] || 'Select...';
  ctx.fillStyle = opts.textColor;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(selectedText, x + 10, y + h / 2);

  // Arrow
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(x + w - 20, y + h / 2 - 3);
  ctx.lineTo(x + w - 10, y + h / 2 - 3);
  ctx.lineTo(x + w - 15, y + h / 2 + 3);
  ctx.closePath();
  ctx.fill();
}

function drawImage(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { src?: string; loadImage: (src: string) => HTMLImageElement | null }
) {
  // Try to load and draw the image
  if (opts.src) {
    const img = opts.loadImage(opts.src);
    if (img && img.complete && img.naturalWidth > 0) {
      // Draw the actual image
      ctx.drawImage(img, x, y, w, h);
      return;
    }
  }

  // Placeholder for image (when no src or image not loaded)
  ctx.fillStyle = '#f0f0f0';
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  // Image icon
  ctx.fillStyle = '#999';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🖼️', x + w / 2, y + h / 2);
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { bgColor: string; borderColor: string; borderWidth: number; borderRadius: number; gradientFill?: string | CanvasGradient; borderSide?: string }
) {
  ctx.fillStyle = opts.gradientFill || opts.bgColor;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  drawBorderWithSide(ctx, x, y, w, h, opts.borderColor, opts.borderWidth, opts.borderRadius, opts.borderSide);
}

function drawGeneric(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { bgColor: string; borderColor: string; borderWidth: number; borderRadius: number; label: string }
) {
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = opts.borderWidth;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#666';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.label, x + w / 2, y + h / 2);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { lineColor: string; lineWidth: number }
) {
  ctx.strokeStyle = opts.lineColor;
  ctx.lineWidth = opts.lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

function drawSpinner(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { borderColor: string }
) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 - 4;

  // Background circle
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Spinner arc (partial)
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, Math.PI / 3);
  ctx.stroke();
}

function drawChart(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { type: string; data: number[]; lineColor: string; bgColor: string; borderColor: string; borderRadius: number; showGrid: boolean }
) {
  // Background
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  const pad = 10;
  const chartX = x + pad;
  const chartY = y + pad;
  const chartW = w - pad * 2;
  const chartH = h - pad * 2;

  if (opts.data.length === 0) return;

  const maxVal = Math.max(...opts.data, 1);
  const minVal = Math.min(...opts.data, 0);
  const range = maxVal - minVal || 1;

  // Grid
  if (opts.showGrid) {
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const gy = chartY + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(chartX, gy);
      ctx.lineTo(chartX + chartW, gy);
      ctx.stroke();
    }
  }

  if (opts.type === 'bar') {
    const barW = chartW / opts.data.length * 0.7;
    const gap = chartW / opts.data.length;
    ctx.fillStyle = opts.lineColor;
    for (let i = 0; i < opts.data.length; i++) {
      const barH = ((opts.data[i] - minVal) / range) * chartH;
      const bx = chartX + gap * i + (gap - barW) / 2;
      const by = chartY + chartH - barH;
      roundRect(ctx, bx, by, barW, barH, 2);
      ctx.fill();
    }
  } else {
    // Line / scatter
    ctx.strokeStyle = opts.lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < opts.data.length; i++) {
      const px = chartX + (chartW / (opts.data.length - 1 || 1)) * i;
      const py = chartY + chartH - ((opts.data[i] - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Dots
    ctx.fillStyle = opts.lineColor;
    for (let i = 0; i < opts.data.length; i++) {
      const px = chartX + (chartW / (opts.data.length - 1 || 1)) * i;
      const py = chartY + chartH - ((opts.data[i] - minVal) / range) * chartH;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTable(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { rows: number; cols: number; bgColor: string; borderColor: string; textColor: string }
) {
  // Background
  ctx.fillStyle = opts.bgColor;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  const cellW = w / opts.cols;
  const cellH = h / opts.rows;

  // Grid lines
  for (let r = 1; r < opts.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(x, y + cellH * r);
    ctx.lineTo(x + w, y + cellH * r);
    ctx.stroke();
  }
  for (let c = 1; c < opts.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(x + cellW * c, y);
    ctx.lineTo(x + cellW * c, y + h);
    ctx.stroke();
  }

  // Header row
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x + 1, y + 1, w - 2, cellH - 1);
  ctx.strokeStyle = opts.borderColor;
  ctx.beginPath();
  ctx.moveTo(x, y + cellH);
  ctx.lineTo(x + w, y + cellH);
  ctx.stroke();

  // Cell text
  ctx.fillStyle = opts.textColor;
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < opts.rows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      const label = r === 0 ? `Col ${c + 1}` : `${r},${c}`;
      ctx.fillText(label, x + cellW * c + cellW / 2, y + cellH * r + cellH / 2);
    }
  }
}

function drawCalendar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { year: number; month: number; bgColor: string; borderColor: string; textColor: string }
) {
  // Background
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();

  const headerH = 30;
  const dayHeaderH = 20;

  // Month header
  ctx.fillStyle = '#2196F3';
  roundRect(ctx, x, y, w, headerH, 4);
  ctx.fill();
  // Fix bottom corners of header
  ctx.fillRect(x, y + headerH - 4, w, 4);

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${opts.year}年 ${monthNames[opts.month - 1] || '1月'}`, x + w / 2, y + headerH / 2);

  // Day headers
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const cellW = w / 7;
  ctx.fillStyle = '#666';
  ctx.font = '10px sans-serif';
  for (let i = 0; i < 7; i++) {
    ctx.fillText(days[i], x + cellW * i + cellW / 2, y + headerH + dayHeaderH / 2);
  }

  // Day numbers
  const firstDay = new Date(opts.year, opts.month - 1, 1).getDay();
  const daysInMonth = new Date(opts.year, opts.month, 0).getDate();
  const cellH = Math.min(18, (h - headerH - dayHeaderH) / 6);
  ctx.fillStyle = opts.textColor;
  ctx.font = '10px sans-serif';

  let day = 1;
  for (let row = 0; row < 6 && day <= daysInMonth; row++) {
    for (let col = 0; col < 7 && day <= daysInMonth; col++) {
      if (row === 0 && col < firstDay) continue;
      const dx = x + cellW * col + cellW / 2;
      const dy = y + headerH + dayHeaderH + cellH * row + cellH / 2;
      ctx.fillText(`${day}`, dx, dy);
      day++;
    }
  }
}

function drawTabview(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { tabs: string[]; activeTab: number; bgColor: string; borderColor: string; textColor: string }
) {
  const tabH = 32;

  // Background
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();

  // Tab bar
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x + 1, y + 1, w - 2, tabH);
  ctx.strokeStyle = opts.borderColor;
  ctx.beginPath();
  ctx.moveTo(x, y + tabH);
  ctx.lineTo(x + w, y + tabH);
  ctx.stroke();

  // Tabs
  const tabW = Math.min(80, w / opts.tabs.length);
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  for (let i = 0; i < opts.tabs.length; i++) {
    const tx = x + tabW * i;
    if (i === opts.activeTab) {
      ctx.fillStyle = opts.bgColor;
      ctx.fillRect(tx, y + 1, tabW, tabH);
      ctx.fillStyle = '#2196F3';
      ctx.fillRect(tx, y + tabH - 2, tabW, 2);
      ctx.fillStyle = '#2196F3';
    } else {
      ctx.fillStyle = '#888';
    }
    ctx.fillText(opts.tabs[i], tx + tabW / 2, y + tabH / 2);
  }

  // Content area hint
  ctx.fillStyle = '#ccc';
  ctx.font = '11px sans-serif';
  ctx.fillText('Tab Content', x + w / 2, y + tabH + (h - tabH) / 2);
}

function drawTileview(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { rows: number; cols: number; currentRow: number; currentCol: number; bgColor: string; borderColor: string }
) {
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  const cellW = w / opts.cols;
  const cellH = h / opts.rows;

  // Grid
  ctx.strokeStyle = '#ddd';
  ctx.setLineDash([4, 4]);
  for (let r = 1; r < opts.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(x, y + cellH * r);
    ctx.lineTo(x + w, y + cellH * r);
    ctx.stroke();
  }
  for (let c = 1; c < opts.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(x + cellW * c, y);
    ctx.lineTo(x + cellW * c, y + h);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Highlight current tile
  const cx = x + cellW * opts.currentCol;
  const cy = y + cellH * opts.currentRow;
  ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
  ctx.fillRect(cx, cy, cellW, cellH);
  ctx.strokeStyle = '#2196F3';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx + 1, cy + 1, cellW - 2, cellH - 2);

  // Labels
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < opts.rows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      ctx.fillText(`${r},${c}`, x + cellW * c + cellW / 2, y + cellH * r + cellH / 2);
    }
  }
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { title: string; bgColor: string; borderColor: string; borderRadius: number; textColor: string }
) {
  const titleH = 36;

  // Window frame
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  // Title bar
  ctx.fillStyle = '#e0e0e0';
  ctx.beginPath();
  const r = opts.borderRadius;
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + titleH);
  ctx.lineTo(x, y + titleH);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();

  // Title bar border
  ctx.strokeStyle = opts.borderColor;
  ctx.beginPath();
  ctx.moveTo(x, y + titleH);
  ctx.lineTo(x + w, y + titleH);
  ctx.stroke();

  // Title text
  ctx.fillStyle = opts.textColor;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.title, x + 12, y + titleH / 2);

  // Close button
  ctx.fillStyle = '#999';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✕', x + w - 18, y + titleH / 2);
}

export default PreviewPanel;
