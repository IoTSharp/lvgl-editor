import React from 'react';
import type { LvglComponent, ResizeHandle } from '../../types';
import { useEditorStore } from '../../store/editorStore';
import { useAppStore } from '../../store/appStore';
import { useResourceStore } from '../../resources/resourceStore';
import './CanvasComponent.css';

interface CanvasComponentProps {
  component: LvglComponent;
  offsetX?: number;
  offsetY?: number;
  isSelected: boolean;
  isHovered: boolean;
  onClick: (e: React.MouseEvent, id: string) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string, handle: ResizeHandle) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}

const resizeHandles: ResizeHandle[] = [
  'top-left', 'top', 'top-right',
  'left', 'right',
  'bottom-left', 'bottom', 'bottom-right',
];

const CanvasComponent: React.FC<CanvasComponentProps> = ({
  component,
  isSelected,
  isHovered,
  onClick,
  onDragStart,
  onResizeStart,
  onContextMenu,
  children,
}) => {
  const setHoveredComponent = useEditorStore(state => state.setHoveredComponent);
  const updateComponent = useEditorStore(state => state.updateComponent);
  const defaultFontSize = useAppStore(state => state.defaultFontSize);
  const { styles, props, type } = component;
  const defaultStyle = styles.default;

  // Helper: apply shadow opacity to shadow color
  const buildShadowColor = (color?: string, opacity?: number): string => {
    if (!color) return 'rgba(0,0,0,0.3)';
    if (opacity === undefined || opacity === null) return color;
    // Parse hex color and apply alpha
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, opacity / 255))})`;
  };

  // Build box-shadow from shadow properties
  const buildBoxShadow = (): string | undefined => {
    if (!defaultStyle.shadowWidth && !defaultStyle.shadowOffsetX && !defaultStyle.shadowOffsetY) return undefined;
    const offX = defaultStyle.shadowOffsetX || 0;
    const offY = defaultStyle.shadowOffsetY || 0;
    const blur = defaultStyle.shadowWidth || 0;
    const spread = defaultStyle.shadowSpread || 0;
    const color = buildShadowColor(defaultStyle.shadowColor, defaultStyle.shadowOpacity);
    return `${offX}px ${offY}px ${blur}px ${spread}px ${color}`;
  };

  // Build transform from transform properties
  const buildTransform = (): string | undefined => {
    const parts: string[] = [];
    if (defaultStyle.transformAngle) {
      // LVGL uses 0.1 degree units
      parts.push(`rotate(${defaultStyle.transformAngle / 10}deg)`);
    }
    if (defaultStyle.transformZoomX !== undefined || defaultStyle.transformZoomY !== undefined) {
      // LVGL 256 = 100%
      const sx = defaultStyle.transformZoomX !== undefined ? defaultStyle.transformZoomX / 256 : 1;
      const sy = defaultStyle.transformZoomY !== undefined ? defaultStyle.transformZoomY / 256 : 1;
      parts.push(`scaleX(${sx}) scaleY(${sy})`);
    }
    return parts.length > 0 ? parts.join(' ') : undefined;
  };

  // Build transform-origin from pivot properties
  const buildTransformOrigin = (): string | undefined => {
    if (defaultStyle.transformPivotX !== undefined || defaultStyle.transformPivotY !== undefined) {
      const px = defaultStyle.transformPivotX ?? component.width / 2;
      const py = defaultStyle.transformPivotY ?? component.height / 2;
      return `${px}px ${py}px`;
    }
    return undefined;
  };

  // Build background with gradient support
  const buildBackground = (): string | undefined => {
    if (defaultStyle.bgGradDir && defaultStyle.bgGradDir !== 'none' && defaultStyle.bgGradColor) {
      const baseColor = defaultStyle.bgColor || '#e0e0e0';
      const gradColor = defaultStyle.bgGradColor;
      const stop = defaultStyle.bgGradStop !== undefined ? Math.round((defaultStyle.bgGradStop / 255) * 100) : 100;
      const dir = defaultStyle.bgGradDir === 'hor' ? 'to right' : 'to bottom';
      return `linear-gradient(${dir}, ${baseColor} 0%, ${gradColor} ${stop}%)`;
    }
    return undefined;
  };

  // Build outline
  const buildOutline = (): React.CSSProperties => {
    const result: React.CSSProperties = {};
    if (defaultStyle.outlineWidth) {
      result.outline = `${defaultStyle.outlineWidth}px solid ${defaultStyle.outlineColor || '#000'}`;
      if (defaultStyle.outlinePad !== undefined) {
        result.outlineOffset = `${defaultStyle.outlinePad}px`;
      }
    }
    return result;
  };

  // Build border styles with borderSide support
  const buildBorderStyles = (): React.CSSProperties => {
    const bw = defaultStyle.borderWidth;
    const bc = defaultStyle.borderColor;
    const side = defaultStyle.borderSide || 'full';

    if (!bw) return { borderStyle: 'none' };

    const borderVal = `${bw}px solid ${bc || '#ccc'}`;
    const noBorder = 'none';

    switch (side) {
      case 'top':
        return { borderTop: borderVal, borderBottom: noBorder, borderLeft: noBorder, borderRight: noBorder };
      case 'bottom':
        return { borderTop: noBorder, borderBottom: borderVal, borderLeft: noBorder, borderRight: noBorder };
      case 'left':
        return { borderTop: noBorder, borderBottom: noBorder, borderLeft: borderVal, borderRight: noBorder };
      case 'right':
        return { borderTop: noBorder, borderBottom: noBorder, borderLeft: noBorder, borderRight: borderVal };
      case 'top_bottom':
        return { borderTop: borderVal, borderBottom: borderVal, borderLeft: noBorder, borderRight: noBorder };
      case 'left_right':
        return { borderTop: noBorder, borderBottom: noBorder, borderLeft: borderVal, borderRight: borderVal };
      case 'none':
        return { borderStyle: 'none' };
      default: // 'full'
        return { borderColor: bc, borderWidth: bw, borderStyle: 'solid' };
    }
  };

  // Build padding with four-direction support
  const buildPadding = (): React.CSSProperties => {
    const result: React.CSSProperties = {};
    const base = defaultStyle.padding;
    if (base !== undefined) result.padding = base;
    if (defaultStyle.paddingTop !== undefined) result.paddingTop = defaultStyle.paddingTop;
    if (defaultStyle.paddingBottom !== undefined) result.paddingBottom = defaultStyle.paddingBottom;
    if (defaultStyle.paddingLeft !== undefined) result.paddingLeft = defaultStyle.paddingLeft;
    if (defaultStyle.paddingRight !== undefined) result.paddingRight = defaultStyle.paddingRight;
    return result;
  };

  // Build border-radius with four-corner support
  const buildBorderRadius = (): string | number | undefined => {
    if (
      defaultStyle.borderRadiusTopLeft !== undefined ||
      defaultStyle.borderRadiusTopRight !== undefined ||
      defaultStyle.borderRadiusBottomLeft !== undefined ||
      defaultStyle.borderRadiusBottomRight !== undefined
    ) {
      const tl = defaultStyle.borderRadiusTopLeft ?? defaultStyle.borderRadius ?? 0;
      const tr = defaultStyle.borderRadiusTopRight ?? defaultStyle.borderRadius ?? 0;
      const br = defaultStyle.borderRadiusBottomRight ?? defaultStyle.borderRadius ?? 0;
      const bl = defaultStyle.borderRadiusBottomLeft ?? defaultStyle.borderRadius ?? 0;
      return `${tl}px ${tr}px ${br}px ${bl}px`;
    }
    return defaultStyle.borderRadius;
  };

  // Build blend mode
  const buildMixBlendMode = (): React.CSSProperties['mixBlendMode'] => {
    switch (defaultStyle.blendMode) {
      case 'additive': return 'screen';
      case 'subtractive': return 'difference';
      case 'multiply': return 'multiply';
      default: return undefined; // 'normal' is default, no need to set
    }
  };

  // Build text-decoration
  const buildTextDecoration = (): string | undefined => {
    switch (defaultStyle.textDecor) {
      case 'underline': return 'underline';
      case 'strikethrough': return 'line-through';
      default: return undefined;
    }
  };

  // Build width/height with mode support
  const buildDimension = (value: number, mode?: string): string | number => {
    switch (mode) {
      case 'percent': return `${value}%`;
      case 'content': return 'fit-content';
      default: return value;
    }
  };

  const background = buildBackground();
  const outlineStyles = buildOutline();
  const borderStyles = buildBorderStyles();
  const paddingStyles = buildPadding();

  // Resolve effective background color: ensure components are never accidentally invisible
  // in the design canvas. Components with transparent bg are correct for LVGL, but need
  // a visible fallback in the designer so users can see and interact with them.
  const resolvedBgColor = (() => {
    const bg = defaultStyle.bgColor;
    const isMissing = !bg || bg === '';
    const isTransparent = bg?.toLowerCase() === 'transparent';

    if (isMissing || isTransparent) {
      switch (type) {
        case 'btn': return '#2196F3';
        case 'obj': return '#fafafa';
        case 'textarea': return '#ffffff';
        case 'dropdown': return '#ffffff';
        case 'img': return '#f0f0f0';
        case 'table': return '#ffffff';
        case 'chart': return '#ffffff';
        case 'calendar': return '#ffffff';
        case 'tabview': return '#ffffff';
        case 'tileview': return '#ffffff';
        case 'win': return '#ffffff';
        // These types are legitimately transparent — keep them that way
        case 'label': return 'transparent';
        case 'arc': return 'transparent';
        case 'spinner': return 'transparent';
        case 'checkbox': return 'transparent';
        default: return bg || 'transparent';
      }
    }
    return bg;
  })();

  // Build inline styles from component styles
  const componentStyle: React.CSSProperties = {
    position: 'absolute',
    left: component.x,
    top: component.y,
    width: buildDimension(component.width, (component as unknown as Record<string, unknown>).widthMode as string | undefined),
    height: buildDimension(component.height, (component as unknown as Record<string, unknown>).heightMode as string | undefined),
    backgroundColor: background ? undefined : resolvedBgColor,
    ...(background ? { background } : {}),
    ...borderStyles,
    borderRadius: buildBorderRadius(),
    color: defaultStyle.textColor,
    opacity: component.visible === false ? 0.3 : (defaultStyle.opacity !== undefined ? defaultStyle.opacity : 1),
    ...paddingStyles,
    boxSizing: 'border-box',
    overflow: 'hidden',
    pointerEvents: component.visible === false ? 'none' : undefined,
    // Shadow
    boxShadow: buildBoxShadow(),
    // Transform
    transform: buildTransform(),
    transformOrigin: buildTransformOrigin(),
    // Outline
    ...outlineStyles,
    // Blend mode
    mixBlendMode: buildMixBlendMode(),
    // Text decoration
    textDecoration: buildTextDecoration(),
  };

  // Render component content based on type
  const renderContent = () => {
    switch (type) {
      case 'btn':
        return (
          <div className="lvgl-btn" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            color: defaultStyle.textColor || '#ffffff',
            fontSize: props.fontSize || defaultFontSize,
          }}>
            {props.text || 'Button'}
          </div>
        );
      
      case 'label':
        return (
          <span className="lvgl-label" style={{
            color: defaultStyle.textColor || '#333333',
            fontSize: props.fontSize || defaultFontSize,
          }}>{props.text || 'Label'}</span>
        );
      
      case 'img':
        return <CanvasImageContent src={props.src} />;
      
      case 'line':
        return (
          <div className="lvgl-line" style={{
            width: '100%',
            height: '2px',
            backgroundColor: defaultStyle.borderColor || defaultStyle.textColor || '#333',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
          }} />
        );
      
      case 'textarea':
        return (
          <div className="lvgl-textarea" style={{
            width: '100%',
            height: '100%',
            fontSize: '12px',
            color: '#999',
            backgroundColor: resolvedBgColor === 'transparent' ? '#ffffff' : undefined,
            border: !defaultStyle.borderWidth ? '1px solid #cccccc' : undefined,
            borderRadius: defaultStyle.borderRadius || 4,
            padding: '6px 8px',
            boxSizing: 'border-box',
          }}>
            {props.text || props.placeholder || 'Enter text...'}
          </div>
        );
      
      case 'dropdown':
        return (
          <div className="lvgl-dropdown" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '0 8px',
            backgroundColor: resolvedBgColor === 'transparent' ? '#ffffff' : undefined,
            border: !defaultStyle.borderWidth ? '1px solid #cccccc' : undefined,
            borderRadius: defaultStyle.borderRadius || 4,
            boxSizing: 'border-box',
            color: defaultStyle.textColor || '#333',
          }}>
            <span>{props.options?.[props.selected || 0] || 'Select...'}</span>
            <span style={{ color: '#999', fontSize: '10px' }}>▼</span>
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="lvgl-checkbox" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: defaultStyle.textColor || '#333',
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #666',
              borderRadius: '2px',
              backgroundColor: props.checked ? '#2196F3' : '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {props.checked && <span style={{ color: '#fff', fontSize: '12px', lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: defaultFontSize }}>{props.text || 'Checkbox'}</span>
          </div>
        );
      
      case 'switch':
        return (
          <div className="lvgl-switch" style={{
            width: '100%',
            height: '100%',
            borderRadius: defaultStyle.borderRadius || 13,
            backgroundColor: props.checked ? '#2196F3' : '#ccc',
            position: 'relative',
            minHeight: '20px',
          }}>
            <div style={{
              position: 'absolute',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              top: '50%',
              marginTop: '-10px',
              left: props.checked ? 'calc(100% - 23px)' : '3px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              transition: 'left 0.2s',
            }} />
          </div>
        );
      
      case 'slider':
        return (
          <div className="lvgl-slider" style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}>
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e0e0e0',
              borderRadius: '2px',
              position: 'relative',
            }}>
              <div style={{
                width: `${Math.max(0, Math.min(100, ((props.value ?? 50) - (props.min ?? 0)) / ((props.max ?? 100) - (props.min ?? 0)) * 100))}%`,
                height: '100%',
                backgroundColor: '#2196F3',
                borderRadius: '2px',
              }} />
            </div>
            <div style={{
              position: 'absolute',
              left: `calc(${Math.max(0, Math.min(100, ((props.value ?? 50) - (props.min ?? 0)) / ((props.max ?? 100) - (props.min ?? 0)) * 100))}% - 8px)`,
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#2196F3',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          </div>
        );
      
      case 'obj':
        return (
          <div className="lvgl-obj" style={{
            width: '100%',
            height: '100%',
            border: !defaultStyle.borderWidth ? '1px solid #e0e0e0' : undefined,
          }}>
            {children}
          </div>
        );
      
      case 'tabview':
        return (
          <div className="lvgl-tabview" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex',
              borderBottom: '2px solid #e0e0e0',
              backgroundColor: '#f5f5f5',
              flexShrink: 0,
            }}>
              {(props.tabs || ['Tab 1', 'Tab 2']).map((tab: string, i: number) => (
                <div key={i} style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  borderBottom: i === (props.activeTab || 0) ? '2px solid #2196F3' : '2px solid transparent',
                  color: i === (props.activeTab || 0) ? '#2196F3' : '#666',
                  fontWeight: i === (props.activeTab || 0) ? 600 : 400,
                  marginBottom: '-2px',
                }} onClick={(e) => {
                  e.stopPropagation();
                  updateComponent(component.id, { props: { ...props, activeTab: i } });
                }}>
                  {tab}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: '8px', overflow: 'hidden' }}>{children}</div>
          </div>
        );
      
      case 'win':
        return (
          <div className="lvgl-win" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#e8e8e8',
              borderBottom: '1px solid #ccc',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span>{props.title || 'Window'}</span>
              {props.showCloseBtn !== false && <span style={{ color: '#999', cursor: 'pointer' }}>✕</span>}
            </div>
            <div style={{ flex: 1, padding: '8px', overflow: 'hidden' }}>{children}</div>
          </div>
        );
      
      case 'bar': {
        const barMin = props.min ?? 0;
        const barMax = props.max ?? 100;
        const barVal = props.value ?? 60;
        const barPercent = barMax > barMin ? Math.max(0, Math.min(100, (barVal - barMin) / (barMax - barMin) * 100)) : 0;
        return (
          <div className="lvgl-bar" style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#e0e0e0',
            borderRadius: defaultStyle.borderRadius,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${barPercent}%`,
              height: '100%',
              backgroundColor: '#2196F3',
              borderRadius: defaultStyle.borderRadius,
              transition: 'width 0.15s',
            }} />
          </div>
        );
      }
      
      case 'arc':
        return (
          <div className="lvgl-arc" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#e0e0e0"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={defaultStyle.borderColor || '#2196F3'}
                strokeWidth="8"
                strokeDasharray={`${(props.value || 60) * 2.51} 251`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>
        );
      
      case 'spinner':
        return (
          <div className="lvgl-spinner" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{
              width: '80%',
              height: '80%',
              border: '4px solid #e0e0e0',
              borderTopColor: defaultStyle.borderColor || '#2196F3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        );
      
      case 'chart': {
        const series = props.series || (props.data ? [{ data: props.data, color: props.lineColor || '#2196F3' }] : [{ data: [10, 20, 30, 25, 40], color: '#2196F3' }]);
        const chartData = series[0]?.data || [10, 20, 30, 25, 40];
        const chartColor = series[0]?.color || '#2196F3';
        const maxVal = Math.max(...chartData, 1);
        return (
          <div className="lvgl-chart" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            padding: '8px',
            backgroundColor: resolvedBgColor === 'transparent' ? '#ffffff' : undefined,
            border: !defaultStyle.borderWidth ? '1px solid #e0e0e0' : undefined,
            borderRadius: defaultStyle.borderRadius || 4,
            boxSizing: 'border-box',
          }}>
            {chartData.map((val: number, i: number) => (
              <div
                key={i}
                style={{
                  width: `${Math.max(8, 80 / chartData.length)}%`,
                  height: `${Math.max(2, (val / maxVal) * 100)}%`,
                  backgroundColor: chartColor,
                  borderRadius: '2px 2px 0 0',
                }}
              />
            ))}
          </div>
        );
      }
      
      case 'table':
        return (
          <div className="lvgl-table" style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${props.cols || 3}, 1fr)`,
            gridTemplateRows: `repeat(${props.rows || 3}, 1fr)`,
            gap: '1px',
            backgroundColor: '#ccc',
            border: '1px solid #ccc',
            borderRadius: defaultStyle.borderRadius || 4,
            overflow: 'hidden',
          }}>
            {Array.from({ length: (props.rows || 3) * (props.cols || 3) }).map((_, i) => (
              <div key={i} style={{
                backgroundColor: i < (props.cols || 3) && props.headerRow !== false ? '#f0f0f0' : '#fff',
                padding: '4px',
                fontSize: '10px',
                fontWeight: i < (props.cols || 3) && props.headerRow !== false ? 600 : 400,
                color: '#333',
              }}>
                {props.cellData?.[Math.floor(i / (props.cols || 3))]?.[i % (props.cols || 3)] || (i + 1)}
              </div>
            ))}
          </div>
        );
      
      case 'calendar':
        return (
          <div className="lvgl-calendar" style={{
            width: '100%',
            height: '100%',
            fontSize: '10px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: resolvedBgColor === 'transparent' ? '#ffffff' : undefined,
            border: !defaultStyle.borderWidth ? '1px solid #ddd' : undefined,
            borderRadius: defaultStyle.borderRadius || 4,
            boxSizing: 'border-box',
            overflow: 'hidden',
            color: '#333',
          }}>
            <div style={{ textAlign: 'center', padding: '6px 4px', fontWeight: 'bold', borderBottom: '1px solid #eee', backgroundColor: '#f8f8f8' }}>
              {props.year || 2024} / {props.month || 1}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', flex: 1, padding: '2px' }}>
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontWeight: 'bold', color: '#666', padding: '2px 0' }}>{d}</div>
              ))}
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '1px 0' }}>{i + 1}</div>
              ))}
            </div>
          </div>
        );
      
      case 'tileview':
        return (
          <div className="lvgl-tileview" style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${props.cols || 2}, 1fr)`,
            gridTemplateRows: `repeat(${props.rows || 2}, 1fr)`,
            gap: '2px',
            backgroundColor: '#e0e0e0',
            border: !defaultStyle.borderWidth ? '1px solid #ccc' : undefined,
            borderRadius: defaultStyle.borderRadius || 4,
            overflow: 'hidden',
          }}>
            {Array.from({ length: (props.rows || 2) * (props.cols || 2) }).map((_, i) => (
              <div key={i} style={{ backgroundColor: '#f8f8f8', border: '1px dashed #bbb' }} />
            ))}
          </div>
        );
      
      default:
        return <div>{type}</div>;
    }
  };

  return (
    <div
      className={`canvas-component ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''} ${component.locked ? 'locked' : ''} ${component.visible === false ? 'hidden-component' : ''}`}
      style={componentStyle}
      onClick={(e) => onClick(e, component.id)}
      onMouseDown={(e) => onDragStart(e, component.id)}
      onMouseEnter={() => setHoveredComponent(component.id)}
      onMouseLeave={() => setHoveredComponent(null)}
      onContextMenu={onContextMenu}
    >
      {renderContent()}
      
      {/* Align badge */}
      {component.align && component.align !== 'default' && (
        <div className="align-badge" title={`对齐: ${component.align}`}>
          {component.align === 'center' ? '⊕' :
           component.align === 'top_mid' ? '⬆' :
           component.align === 'bottom_mid' ? '⬇' :
           component.align === 'left_mid' ? '⬅' :
           component.align === 'right_mid' ? '➡' :
           component.align === 'top_left' ? '↖' :
           component.align === 'top_right' ? '↗' :
           component.align === 'bottom_left' ? '↙' :
           component.align === 'bottom_right' ? '↘' : '⊕'}
        </div>
      )}

      {/* Selection overlay with resize handles */}
      {isSelected && (
        <div className="selection-overlay">
          {resizeHandles.map(handle => (
            <div
              key={handle}
              className={`resize-handle ${handle}`}
              onMouseDown={(e) => onResizeStart(e, component.id, handle)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Separate component to subscribe to resource store only for img type
const CanvasImageContent: React.FC<{ src?: string }> = ({ src }) => {
  const images = useResourceStore((s) => s.images);
  const matched = src
    ? images.find((img) => img.id === src || img.name === src)
    : undefined;

  if (matched) {
    return (
      <div
        className="lvgl-img"
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: `url(${matched.data})`,
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      />
    );
  }

  return (
    <div
      className="lvgl-img"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        fontSize: '24px',
      }}
    >
      🖼️
    </div>
  );
};

export default CanvasComponent;
