import { t } from '../../i18n';
import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import { useAppStore } from '../../store/appStore';
import { getComponentDefinition } from '../../utils/componentDefinitions';
import './StatusBar.css';

const StatusBar: React.FC = () => {
  const { canvas, selection, pages, currentPageId, getComponentById, toggleGrid, setSnapToGrid } = useEditorStore();
  const components = pages.find(page => page.id === currentPageId)?.components ?? [];
  const { lastSaveTime } = useAppStore();
  
  const selectedCount = selection.selectedIds.length;
  const selectedComponent = selectedCount === 1 ? getComponentById(selection.selectedIds[0]) : undefined;
  const definition = selectedComponent ? getComponentDefinition(selectedComponent.type) : undefined;

  // Count total components recursively
  const countComponents = (comps: typeof components): number => {
    return comps.reduce((acc, comp) => acc + 1 + countComponents(comp.children), 0);
  };
  const totalComponents = countComponents(components);

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
            <span className="status-text">{t("未选中")}</span>
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
            <span className="status-text">{t("已选中")}{selectedCount} {t("个组件")}</span>
          )}
        </div>
        
        <div className="status-divider" />
        
        {/* Component count */}
        <div className="status-item">
          <span className="status-text">{t("组件:")}{totalComponents}</span>
        </div>

        {lastSaveTime && (
          <>
            <div className="status-divider" />
            <div className="status-item">
              <span className="status-text status-save-time">{t("已保存")}{formatSaveTime(lastSaveTime)}</span>
            </div>
          </>
        )}
      </div>

      <div className="status-right">
        {/* Canvas size */}
        <div className="status-item">
          <span className="status-text">{t("画布:")}{canvas.width} × {canvas.height}</span>
        </div>
        
        <div className="status-divider" />
        
        {/* Grid toggle */}
        <button
          className={`status-button ${canvas.showGrid ? 'active' : ''}`}
          onClick={toggleGrid}
          title={t("显示/隐藏网格")}
        >
          <span className="icon">⊞</span>
          {t("网格")}</button>
        
        {/* Snap toggle */}
        <button
          className={`status-button ${canvas.snapToGrid ? 'active' : ''}`}
          onClick={() => setSnapToGrid(!canvas.snapToGrid)}
          title={t("吸附到网格")}
        >
          <span className="icon">⊡</span>
          {t("吸附")}</button>
      </div>
    </div>
  );
};

export default StatusBar;
