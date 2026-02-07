import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useResourceStore } from '../../resources/resourceStore';
import type { LvglComponent } from '../../types';
import './PreviewPanel.css';

// Image cache to avoid reloading images
const imageCache = new Map<string, HTMLImageElement>();

const PreviewPanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { pages, currentPageId, canvas } = useEditorStore();
  const { images } = useResourceStore();
  const [scale, setScale] = useState(1);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  const currentPage = pages.find(p => p.id === currentPageId);
  const components = currentPage?.components || [];
  const bgColor = currentPage?.backgroundColor || '#ffffff';

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

  // Render components to canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render each component
    const renderComponent = (comp: LvglComponent, offsetX = 0, offsetY = 0) => {
      const x = comp.x + offsetX;
      const y = comp.y + offsetY;
      const isHovered = hoveredComponent === comp.id;

      // Get styles
      const styles = comp.styles.default;
      const bgColorStyle = styles.bgColor || '#e0e0e0';
      const borderColor = styles.borderColor || '#cccccc';
      const borderWidth = styles.borderWidth || 1;
      const borderRadius = styles.borderRadius || 4;
      const textColor = styles.textColor || '#333333';

      // Draw based on component type
      switch (comp.type) {
        case 'btn':
          drawButton(ctx, x, y, comp.width, comp.height, {
            bgColor: isHovered ? lightenColor(bgColorStyle, 20) : bgColorStyle,
            borderColor,
            borderWidth,
            borderRadius,
            text: comp.props.text || 'Button',
            textColor,
          });
          break;

        case 'label':
          drawLabel(ctx, x, y, comp.width, comp.height, {
            text: comp.props.text || 'Label',
            textColor,
            fontSize: comp.props.fontSize || 14,
          });
          break;

        case 'slider':
          drawSlider(ctx, x, y, comp.width, comp.height, {
            value: comp.props.value || 50,
            min: comp.props.min || 0,
            max: comp.props.max || 100,
            bgColor: bgColorStyle,
          });
          break;

        case 'checkbox':
          drawCheckbox(ctx, x, y, comp.width, comp.height, {
            checked: comp.props.checked || false,
            text: comp.props.text || 'Checkbox',
            textColor,
          });
          break;

        case 'switch':
          drawSwitch(ctx, x, y, comp.width, comp.height, {
            checked: comp.props.checked || false,
          });
          break;

        case 'bar':
          drawBar(ctx, x, y, comp.width, comp.height, {
            value: comp.props.value || 50,
            min: comp.props.min || 0,
            max: comp.props.max || 100,
            bgColor: bgColorStyle,
          });
          break;

        case 'arc':
          drawArc(ctx, x, y, comp.width, comp.height, {
            value: comp.props.value || 75,
            min: comp.props.min || 0,
            max: comp.props.max || 100,
            bgColor: bgColorStyle,
          });
          break;

        case 'textarea':
          drawTextarea(ctx, x, y, comp.width, comp.height, {
            text: comp.props.text || '',
            placeholder: comp.props.placeholder || 'Enter text...',
            bgColor: bgColorStyle,
            borderColor,
            borderRadius,
            textColor,
          });
          break;

        case 'dropdown':
          drawDropdown(ctx, x, y, comp.width, comp.height, {
            options: comp.props.options || ['Option 1', 'Option 2', 'Option 3'],
            selected: comp.props.selected || 0,
            bgColor: bgColorStyle,
            borderColor,
            borderRadius,
            textColor,
          });
          break;

        case 'img':
          drawImage(ctx, x, y, comp.width, comp.height, {
            src: comp.props.src,
            loadImage,
          });
          break;

        case 'panel':
        case 'container':
          drawPanel(ctx, x, y, comp.width, comp.height, {
            bgColor: bgColorStyle,
            borderColor,
            borderWidth,
            borderRadius,
          });
          break;

        default:
          // Generic rectangle for unknown types
          drawGeneric(ctx, x, y, comp.width, comp.height, {
            bgColor: bgColorStyle,
            borderColor,
            borderWidth,
            borderRadius,
            label: comp.type,
          });
      }

      // Render children
      comp.children.forEach(child => renderComponent(child, x, y));
    };

    components.forEach(comp => renderComponent(comp));
  }, [components, canvas, bgColor, hoveredComponent, loadImage]);

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
            style={{ cursor: hoveredComponent ? 'pointer' : 'default' }}
          />
        </div>
      </div>
      <div className="preview-footer">
        <span>{canvas.width} × {canvas.height}</span>
        {hoveredComponent && <span>悬停: {hoveredComponent.slice(0, 8)}...</span>}
      </div>
    </div>
  );
};

// Drawing helper functions
function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opts: { bgColor: string; borderColor: string; borderWidth: number; borderRadius: number; text: string; textColor: string }
) {
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = opts.borderWidth;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = opts.textColor;
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(opts.text, x + w / 2, y + h / 2);
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, _w: number, _h: number,
  opts: { text: string; textColor: string; fontSize: number }
) {
  ctx.fillStyle = opts.textColor;
  ctx.font = `${opts.fontSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(opts.text, x, y);
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
  opts: { checked: boolean; text: string; textColor: string }
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
  ctx.fillText(opts.text, x + boxSize + 8, y + h / 2);
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
  opts: { text: string; placeholder: string; bgColor: string; borderColor: string; borderRadius: number; textColor: string }
) {
  ctx.fillStyle = opts.bgColor;
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
  opts: { options: string[]; selected: number; bgColor: string; borderColor: string; borderRadius: number; textColor: string }
) {
  ctx.fillStyle = opts.bgColor;
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
  opts: { bgColor: string; borderColor: string; borderWidth: number; borderRadius: number }
) {
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = opts.borderWidth;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();
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

export default PreviewPanel;
