import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAppStore } from '../../store/appStore';
import { getComponentDefinition } from '../../utils/componentDefinitions';
import './StatusBar.css';

const StatusBar: React.FC = () => {
  const { canvas, selection, components, getComponentById, setZoom, toggleGrid, setSnapToGrid } = useEditorStore();
  const { lastSaveTime } = useAppStore();
  
  const selectedCount = selection.selectedIds.length;
  const selectedComponent = selectedCount === 1 ? getComponentById(selection.selectedIds[0]) : undefined;
  const definition = selectedComponent ? getComponentDefinition(selectedComponent.type) : undefined;

  // Count total components recursively
  const countComponents = (comps: typeof components): number => {
    return comps.reduce((acc, comp) => acc + 1 + countComponents(comp.children), 0);
  };
  const totalComponents = countComponents(components);

  const handleZoomIn = () => setZoom(canvas.zoom + 0.1);
  const handleZoomOut = () => setZoom(canvas.zoom - 0.1);
  const handleZoomReset = () => setZoom(1);

  const formatSaveTime = (ts: number | null): string => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <div className="status-bar">
      <div className="status-left">
        {/* Selection info */}
        <div className="status-item">
          {selectedCount === 0 && (
            <span className="status-text">未选中</span>
          )}
          {selectedCount === 1 && selectedComponent && (
            <span className="status-text">
              <span className="component-icon">{definition?.icon}</span>
              {selectedComponent.name}
              <span className="component-size">
                ({selectedComponent.x}, {selectedComponent.y}) - {selectedComponent.width} × {selectedComponent.height}
              </span>
            </span>
          )}
          {selectedCount > 1 && (
            <span className="status-text">已选中 {selectedCount} 个组件</span>
          )}
        </div>
        
        <div className="status-divider" />
        
        {/* Component count */}
        <div className="status-item">
          <span className="status-text">组件: {totalComponents}</span>
        </div>

        {lastSaveTime && (
          <>
            <div className="status-divider" />
            <div className="status-item">
              <span className="status-text status-save-time">已保存 {formatSaveTime(lastSaveTime)}</span>
            </div>
          </>
        )}
      </div>

      <div className="status-right">
        {/* Canvas size */}
        <div className="status-item">
          <span className="status-text">画布: {canvas.width} × {canvas.height}</span>
        </div>
        
        <div className="status-divider" />
        
        {/* Grid toggle */}
        <button
          className={`status-button ${canvas.showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
          title="显示/隐藏网格"
        >
          <span className="icon">⊞</span>
          网格
        </button>
        
        {/* Snap toggle */}
        <button
          className={`status-button ${canvas.snapToGrid ? 'active' : ''}`}
          onClick={() => setSnapToGrid(!canvas.snapToGrid)}
          title="吸附到网格"
        >
          <span className="icon">⊡</span>
          吸附
        </button>
        
        <div className="status-divider" />
        
        {/* Zoom controls */}
        <div className="zoom-controls">
          <button onClick={handleZoomOut} title="缩小">−</button>
          <button className="zoom-level" onClick={handleZoomReset} title="重置缩放">
            {Math.round(canvas.zoom * 100)}%
          </button>
          <button onClick={handleZoomIn} title="放大">+</button>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
