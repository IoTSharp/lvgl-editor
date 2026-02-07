import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import './AlignToolbar.css';

type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'distribute-h' | 'distribute-v';

const AlignToolbar: React.FC = () => {
  const { selection, pages, currentPageId, updateComponent, saveToHistory } = useEditorStore();
  
  const selectedIds = selection.selectedIds;
  const hasSelection = selectedIds.length > 0;
  const hasMultipleSelection = selectedIds.length > 1;

  // Get selected components
  const getSelectedComponents = () => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return [];
    
    const findComponents = (components: typeof currentPage.components): typeof currentPage.components => {
      const result: typeof currentPage.components = [];
      for (const comp of components) {
        if (selectedIds.includes(comp.id)) {
          result.push(comp);
        }
        if (comp.children.length > 0) {
          result.push(...findComponents(comp.children));
        }
      }
      return result;
    };
    
    return findComponents(currentPage.components);
  };

  const handleAlign = (type: AlignType) => {
    const components = getSelectedComponents();
    if (components.length === 0) return;

    saveToHistory();

    if (components.length === 1) {
      // Single component - align to canvas
      const comp = components[0];
      const canvas = useEditorStore.getState().canvas;
      
      switch (type) {
        case 'left':
          updateComponent(comp.id, { x: 0 });
          break;
        case 'center-h':
          updateComponent(comp.id, { x: (canvas.width - comp.width) / 2 });
          break;
        case 'right':
          updateComponent(comp.id, { x: canvas.width - comp.width });
          break;
        case 'top':
          updateComponent(comp.id, { y: 0 });
          break;
        case 'center-v':
          updateComponent(comp.id, { y: (canvas.height - comp.height) / 2 });
          break;
        case 'bottom':
          updateComponent(comp.id, { y: canvas.height - comp.height });
          break;
      }
      return;
    }

    // Multiple components - align relative to each other
    const bounds = {
      minX: Math.min(...components.map(c => c.x)),
      maxX: Math.max(...components.map(c => c.x + c.width)),
      minY: Math.min(...components.map(c => c.y)),
      maxY: Math.max(...components.map(c => c.y + c.height)),
    };

    switch (type) {
      case 'left':
        components.forEach(comp => {
          updateComponent(comp.id, { x: bounds.minX });
        });
        break;
      case 'center-h': {
        const centerX = (bounds.minX + bounds.maxX) / 2;
        components.forEach(comp => {
          updateComponent(comp.id, { x: centerX - comp.width / 2 });
        });
        break;
      }
      case 'right':
        components.forEach(comp => {
          updateComponent(comp.id, { x: bounds.maxX - comp.width });
        });
        break;
      case 'top':
        components.forEach(comp => {
          updateComponent(comp.id, { y: bounds.minY });
        });
        break;
      case 'center-v': {
        const centerY = (bounds.minY + bounds.maxY) / 2;
        components.forEach(comp => {
          updateComponent(comp.id, { y: centerY - comp.height / 2 });
        });
        break;
      }
      case 'bottom':
        components.forEach(comp => {
          updateComponent(comp.id, { y: bounds.maxY - comp.height });
        });
        break;
      case 'distribute-h': {
        if (components.length < 3) return;
        const sorted = [...components].sort((a, b) => a.x - b.x);
        const totalWidth = sorted.reduce((sum, c) => sum + c.width, 0);
        const spacing = (bounds.maxX - bounds.minX - totalWidth) / (sorted.length - 1);
        let currentX = bounds.minX;
        sorted.forEach(comp => {
          updateComponent(comp.id, { x: currentX });
          currentX += comp.width + spacing;
        });
        break;
      }
      case 'distribute-v': {
        if (components.length < 3) return;
        const sorted = [...components].sort((a, b) => a.y - b.y);
        const totalHeight = sorted.reduce((sum, c) => sum + c.height, 0);
        const spacing = (bounds.maxY - bounds.minY - totalHeight) / (sorted.length - 1);
        let currentY = bounds.minY;
        sorted.forEach(comp => {
          updateComponent(comp.id, { y: currentY });
          currentY += comp.height + spacing;
        });
        break;
      }
    }
  };

  return (
    <div className="align-toolbar">
      <div className="align-toolbar-group">
        <button
          className="align-btn"
          onClick={() => handleAlign('left')}
          disabled={!hasSelection}
          title="左对齐"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M4 22H2V2h2v20zM22 7H6v3h16V7zm-6 7H6v3h10v-3z"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleAlign('center-h')}
          disabled={!hasSelection}
          title="水平居中"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M11 2h2v5h8v3h-8v4h6v3h-6v5h-2v-5H5v-3h6v-4H3V7h8V2z"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleAlign('right')}
          disabled={!hasSelection}
          title="右对齐"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M20 2h2v20h-2V2zM2 7h16v3H2V7zm6 7h10v3H8v-3z"/>
          </svg>
        </button>
      </div>
      
      <div className="align-toolbar-divider" />
      
      <div className="align-toolbar-group">
        <button
          className="align-btn"
          onClick={() => handleAlign('top')}
          disabled={!hasSelection}
          title="顶对齐"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M22 2v2H2V2h20zM7 22V6h3v16H7zm7-6V6h3v10h-3z"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleAlign('center-v')}
          disabled={!hasSelection}
          title="垂直居中"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M2 11v2h5v8h3v-8h4v6h3v-6h5v-2h-5V5h-3v6h-4V3H7v8H2z"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleAlign('bottom')}
          disabled={!hasSelection}
          title="底对齐"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M22 22v-2H2v2h20zM7 2v16h3V2H7zm7 6v10h3V8h-3z"/>
          </svg>
        </button>
      </div>
      
      <div className="align-toolbar-divider" />
      
      <div className="align-toolbar-group">
        <button
          className="align-btn"
          onClick={() => handleAlign('distribute-h')}
          disabled={!hasMultipleSelection || selectedIds.length < 3}
          title="水平分布"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M4 5v14H2V5h2zm4 2v10h3V7H8zm5 2v6h3V9h-3zm5-2v10h3V7h-3zm4-2v14h-2V5h2z"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleAlign('distribute-v')}
          disabled={!hasMultipleSelection || selectedIds.length < 3}
          title="垂直分布"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M5 2h14v2H5V2zm2 4h10v3H7V6zm2 5h6v3H9v-3zm-2 5h10v3H7v-3zm-2 5h14v2H5v-2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AlignToolbar;
