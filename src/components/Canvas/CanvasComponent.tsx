import React from 'react';
import type { LvglComponent, ResizeHandle } from '../../types';
import { useEditorStore } from '../../store/editorStore';
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
  const { styles, props, type } = component;
  const defaultStyle = styles.default;

  // Build inline styles from component styles
  const componentStyle: React.CSSProperties = {
    position: 'absolute',
    left: component.x,
    top: component.y,
    width: component.width,
    height: component.height,
    backgroundColor: defaultStyle.bgColor,
    borderColor: defaultStyle.borderColor,
    borderWidth: defaultStyle.borderWidth,
    borderStyle: defaultStyle.borderWidth ? 'solid' : 'none',
    borderRadius: defaultStyle.borderRadius,
    color: defaultStyle.textColor,
    opacity: defaultStyle.opacity,
    padding: defaultStyle.padding,
    boxSizing: 'border-box',
    overflow: 'hidden',
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
          }}>
            {props.text || 'Button'}
          </div>
        );
      
      case 'label':
        return (
          <span className="lvgl-label">{props.text || 'Label'}</span>
        );
      
      case 'img':
        return (
          <div className="lvgl-img" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            fontSize: '24px',
          }}>
            🖼️
          </div>
        );
      
      case 'line':
        return (
          <div className="lvgl-line" style={{
            width: '100%',
            height: '2px',
            backgroundColor: defaultStyle.bgColor || '#333',
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
          }}>
            {props.placeholder || 'Enter text...'}
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
          }}>
            <span>{props.options?.[props.selected || 0] || 'Select...'}</span>
            <span>▼</span>
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="lvgl-checkbox" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #666',
              borderRadius: '2px',
              backgroundColor: props.checked ? '#2196F3' : 'transparent',
            }}>
              {props.checked && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
            </div>
            <span>{props.text || 'Checkbox'}</span>
          </div>
        );
      
      case 'switch':
        return (
          <div className="lvgl-switch" style={{
            width: '100%',
            height: '100%',
            borderRadius: defaultStyle.borderRadius,
            backgroundColor: props.checked ? '#2196F3' : '#ccc',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              top: '3px',
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
            }}>
              <div style={{
                width: `${((props.value || 50) / (props.max || 100)) * 100}%`,
                height: '100%',
                backgroundColor: '#2196F3',
                borderRadius: '2px',
              }} />
            </div>
            <div style={{
              position: 'absolute',
              left: `calc(${((props.value || 50) / (props.max || 100)) * 100}% - 8px)`,
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
          <div className="lvgl-obj" style={{ width: '100%', height: '100%' }}>
            {children}
          </div>
        );
      
      case 'tabview':
        return (
          <div className="lvgl-tabview" style={{ width: '100%', height: '100%' }}>
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #ddd',
              backgroundColor: '#f5f5f5',
            }}>
              {(props.tabs || ['Tab 1', 'Tab 2']).map((tab: string, i: number) => (
                <div key={i} style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  borderBottom: i === (props.activeTab || 0) ? '2px solid #2196F3' : 'none',
                  color: i === (props.activeTab || 0) ? '#2196F3' : '#666',
                }}>
                  {tab}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, padding: '8px' }}>{children}</div>
          </div>
        );
      
      case 'win':
        return (
          <div className="lvgl-win" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#f0f0f0',
              borderBottom: '1px solid #ddd',
              fontSize: '13px',
              fontWeight: 500,
            }}>
              {props.title || 'Window'}
            </div>
            <div style={{ flex: 1, padding: '8px' }}>{children}</div>
          </div>
        );
      
      case 'bar':
        return (
          <div className="lvgl-bar" style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#e0e0e0',
            borderRadius: defaultStyle.borderRadius,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${((props.value || 60) / (props.max || 100)) * 100}%`,
              height: '100%',
              backgroundColor: '#2196F3',
              borderRadius: defaultStyle.borderRadius,
            }} />
          </div>
        );
      
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
                stroke="#2196F3"
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
              borderTopColor: '#2196F3',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        );
      
      case 'chart':
        return (
          <div className="lvgl-chart" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            padding: '8px',
          }}>
            {(props.data || [10, 20, 30, 25, 40]).map((val: number, i: number) => (
              <div
                key={i}
                style={{
                  width: '15%',
                  height: `${val}%`,
                  backgroundColor: '#2196F3',
                  borderRadius: '2px 2px 0 0',
                }}
              />
            ))}
          </div>
        );
      
      case 'table':
        return (
          <div className="lvgl-table" style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: `repeat(${props.cols || 3}, 1fr)`,
            gridTemplateRows: `repeat(${props.rows || 3}, 1fr)`,
            gap: '1px',
            backgroundColor: '#ddd',
          }}>
            {Array.from({ length: (props.rows || 3) * (props.cols || 3) }).map((_, i) => (
              <div key={i} style={{ backgroundColor: '#fff', padding: '4px', fontSize: '10px' }}>
                {i + 1}
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
          }}>
            <div style={{ textAlign: 'center', padding: '4px', fontWeight: 'bold' }}>
              {props.year || 2024} / {props.month || 1}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', flex: 1 }}>
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontWeight: 'bold' }}>{d}</div>
              ))}
              {Array.from({ length: 28 }).map((_, i) => (
                <div key={i} style={{ textAlign: 'center' }}>{i + 1}</div>
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
          }}>
            {Array.from({ length: (props.rows || 2) * (props.cols || 2) }).map((_, i) => (
              <div key={i} style={{ backgroundColor: '#f5f5f5', border: '1px dashed #ccc' }} />
            ))}
          </div>
        );
      
      default:
        return <div>{type}</div>;
    }
  };

  return (
    <div
      className={`canvas-component ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      style={componentStyle}
      onClick={(e) => onClick(e, component.id)}
      onMouseDown={(e) => onDragStart(e, component.id)}
      onMouseEnter={() => setHoveredComponent(component.id)}
      onMouseLeave={() => setHoveredComponent(null)}
      onContextMenu={onContextMenu}
    >
      {renderContent()}
      
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

export default CanvasComponent;
