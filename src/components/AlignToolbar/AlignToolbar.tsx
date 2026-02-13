import React from 'react';
import { useEditorStore } from '../../store/editorStore';
import './AlignToolbar.css';

type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'distribute-h' | 'distribute-v';
type LayoutType = 'equal-width' | 'equal-height' | 'space-h' | 'space-v' | 'compact-h' | 'compact-v' | 'same-y' | 'same-x' | 'canvas-row' | 'canvas-col';

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

    // Multiple components - align relative to canvas
    const canvas = useEditorStore.getState().canvas;

    switch (type) {
      case 'left':
        components.forEach(comp => {
          updateComponent(comp.id, { x: 0 });
        });
        break;
      case 'center-h':
        components.forEach(comp => {
          updateComponent(comp.id, { x: (canvas.width - comp.width) / 2 });
        });
        break;
      case 'right':
        components.forEach(comp => {
          updateComponent(comp.id, { x: canvas.width - comp.width });
        });
        break;
      case 'top':
        components.forEach(comp => {
          updateComponent(comp.id, { y: 0 });
        });
        break;
      case 'center-v':
        components.forEach(comp => {
          updateComponent(comp.id, { y: (canvas.height - comp.height) / 2 });
        });
        break;
      case 'bottom':
        components.forEach(comp => {
          updateComponent(comp.id, { y: canvas.height - comp.height });
        });
        break;
      case 'distribute-h': {
        if (components.length < 3) return;
        const sorted = [...components].sort((a, b) => a.x - b.x);
        const minX = sorted[0].x;
        const maxX = sorted[sorted.length - 1].x + sorted[sorted.length - 1].width;
        const totalWidth = sorted.reduce((sum, c) => sum + c.width, 0);
        const spacing = (maxX - minX - totalWidth) / (sorted.length - 1);
        let currentX = minX;
        sorted.forEach(comp => {
          updateComponent(comp.id, { x: currentX });
          currentX += comp.width + spacing;
        });
        break;
      }
      case 'distribute-v': {
        if (components.length < 3) return;
        const sorted = [...components].sort((a, b) => a.y - b.y);
        const minY = sorted[0].y;
        const maxY = sorted[sorted.length - 1].y + sorted[sorted.length - 1].height;
        const totalHeight = sorted.reduce((sum, c) => sum + c.height, 0);
        const spacing = (maxY - minY - totalHeight) / (sorted.length - 1);
        let currentY = minY;
        sorted.forEach(comp => {
          updateComponent(comp.id, { y: currentY });
          currentY += comp.height + spacing;
        });
        break;
      }
    }
  };

  const handleLayout = (type: LayoutType) => {
    const components = getSelectedComponents();
    if (components.length < 2) return;

    // Build a map of updates: id -> Partial<LvglComponent>
    const updates: Map<string, Partial<LvglComponent>> = new Map();

    switch (type) {
      case 'equal-width': {
        const maxWidth = Math.max(...components.map(c => c.width));
        components.forEach(comp => updates.set(comp.id, { width: maxWidth }));
        break;
      }
      case 'equal-height': {
        const maxHeight = Math.max(...components.map(c => c.height));
        components.forEach(comp => updates.set(comp.id, { height: maxHeight }));
        break;
      }
      case 'space-h': {
        const sorted = [...components].sort((a, b) => a.x - b.x);
        const totalWidth = sorted.reduce((sum, c) => sum + c.width, 0);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpan = (last.x + last.width) - first.x;
        const gap = (totalSpan - totalWidth) / (sorted.length - 1);
        let currentX = first.x;
        sorted.forEach(comp => {
          updates.set(comp.id, { x: currentX });
          currentX += comp.width + gap;
        });
        break;
      }
      case 'space-v': {
        const sorted = [...components].sort((a, b) => a.y - b.y);
        const totalHeight = sorted.reduce((sum, c) => sum + c.height, 0);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalSpan = (last.y + last.height) - first.y;
        const gap = (totalSpan - totalHeight) / (sorted.length - 1);
        let currentY = first.y;
        sorted.forEach(comp => {
          updates.set(comp.id, { y: currentY });
          currentY += comp.height + gap;
        });
        break;
      }
      case 'compact-h': {
        const sorted = [...components].sort((a, b) => a.x - b.x);
        let currentX = sorted[0].x;
        sorted.forEach(comp => {
          updates.set(comp.id, { x: currentX });
          currentX += comp.width;
        });
        break;
      }
      case 'compact-v': {
        const sorted = [...components].sort((a, b) => a.y - b.y);
        let currentY = sorted[0].y;
        sorted.forEach(comp => {
          updates.set(comp.id, { y: currentY });
          currentY += comp.height;
        });
        break;
      }
      case 'same-y': {
        // 所有选中组件 Y 设为最小 Y（排成一行）
        const minY = Math.min(...components.map(c => c.y));
        components.forEach(comp => updates.set(comp.id, { y: minY }));
        break;
      }
      case 'same-x': {
        // 所有选中组件 X 设为最小 X（排成一列）
        const minX = Math.min(...components.map(c => c.x));
        components.forEach(comp => updates.set(comp.id, { x: minX }));
        break;
      }
      case 'canvas-row': {
        // 针对画布排成一行，只调整位置不改宽高
        const canvas = useEditorStore.getState().canvas;
        const n = components.length;
        const totalWidth = components.reduce((sum, c) => sum + c.width, 0);
        const gap = (canvas.width - totalWidth) / (n + 1);
        const sorted = [...components].sort((a, b) => a.x - b.x);
        let currentX = gap;
        sorted.forEach(comp => {
          updates.set(comp.id, { x: Math.round(currentX) });
          currentX += comp.width + gap;
        });
        break;
      }
      case 'canvas-col': {
        // 针对画布排成一列，只调整位置不改宽高
        const canvas = useEditorStore.getState().canvas;
        const n = components.length;
        const totalHeight = components.reduce((sum, c) => sum + c.height, 0);
        const gap = (canvas.height - totalHeight) / (n + 1);
        const sorted = [...components].sort((a, b) => a.y - b.y);
        let currentY = gap;
        sorted.forEach(comp => {
          updates.set(comp.id, { y: Math.round(currentY) });
          currentY += comp.height + gap;
        });
        break;
      }
    }

    if (updates.size === 0) return;

    // Batch update: single saveToHistory + single set
    saveToHistory();
    const { currentPageId } = useEditorStore.getState();
    useEditorStore.setState(state => {
      const applyUpdates = (comps: LvglComponent[]): LvglComponent[] => {
        let changed = false;
        const result = comps.map(comp => {
          const upd = updates.get(comp.id);
          let newComp = comp;
          if (upd) {
            newComp = { ...comp, ...upd };
            changed = true;
          }
          if (comp.children.length > 0) {
            const newChildren = applyUpdates(comp.children);
            if (newChildren !== comp.children) {
              newComp = newComp === comp ? { ...comp, children: newChildren } : { ...newComp, children: newChildren };
              changed = true;
            }
          }
          return newComp;
        });
        return changed ? result : comps;
      };

      return {
        pages: state.pages.map(page => {
          if (page.id === currentPageId) {
            return { ...page, components: applyUpdates(page.components) };
          }
          return page;
        }),
      };
    });
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

      <div className="align-toolbar-divider" />

      <div className="align-toolbar-group">
        <button
          className="align-btn"
          onClick={() => handleLayout('equal-width')}
          disabled={!hasMultipleSelection}
          title="等宽"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="2" y="6" width="8" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="6" width="8" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M4 20v2M10 20v2M4 22h6M16 20v2M22 20v2M16 22h6" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleLayout('equal-height')}
          disabled={!hasMultipleSelection}
          title="等高"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="2" y="2" width="8" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="2" width="8" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 4h-1v16h1M13 4h-1v16h1" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 1"/>
          </svg>
        </button>
      </div>

      <div className="align-toolbar-divider" />

      <div className="align-toolbar-group">
        <button
          className="align-btn"
          onClick={() => handleLayout('space-h')}
          disabled={!hasMultipleSelection}
          title="等间距水平"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="2" y="7" width="5" height="10" rx="1" fill="currentColor"/>
            <rect x="10" y="7" width="5" height="10" rx="1" fill="currentColor"/>
            <rect x="18" y="7" width="5" height="10" rx="1" fill="currentColor"/>
            <path d="M7.5 12h2M15.5 12h2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 1"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleLayout('space-v')}
          disabled={!hasMultipleSelection}
          title="等间距垂直"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="7" y="2" width="10" height="5" rx="1" fill="currentColor"/>
            <rect x="7" y="10" width="10" height="5" rx="1" fill="currentColor"/>
            <rect x="7" y="18" width="10" height="5" rx="1" fill="currentColor"/>
            <path d="M12 7.5v2M12 15.5v2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1 1"/>
          </svg>
        </button>
      </div>

      <div className="align-toolbar-divider" />

      <div className="align-toolbar-group">
        <button
          className="align-btn"
          onClick={() => handleLayout('compact-h')}
          disabled={!hasMultipleSelection}
          title="紧凑排列水平"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="4" y="6" width="5" height="12" rx="1" fill="currentColor"/>
            <rect x="9" y="6" width="6" height="12" rx="1" fill="currentColor" opacity="0.7"/>
            <rect x="15" y="6" width="5" height="12" rx="1" fill="currentColor" opacity="0.4"/>
            <path d="M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M1 10l2 2-2 2M23 10l-2 2 2 2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleLayout('compact-v')}
          disabled={!hasMultipleSelection}
          title="紧凑排列垂直"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="6" y="4" width="12" height="5" rx="1" fill="currentColor"/>
            <rect x="6" y="9" width="12" height="6" rx="1" fill="currentColor" opacity="0.7"/>
            <rect x="6" y="15" width="12" height="5" rx="1" fill="currentColor" opacity="0.4"/>
            <path d="M12 2v2M12 20v2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 1l2 2 2-2M10 23l2-2 2 2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          </svg>
        </button>
      </div>

      <div className="align-toolbar-divider" />

      <div className="align-toolbar-group">
        <button
          className="align-btn"
          onClick={() => handleLayout('same-y')}
          disabled={!hasMultipleSelection}
          title="Y相同（排成一行）"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="2" y="9" width="5" height="6" rx="1" fill="currentColor"/>
            <rect x="10" y="9" width="5" height="6" rx="1" fill="currentColor"/>
            <rect x="18" y="9" width="5" height="6" rx="1" fill="currentColor"/>
            <path d="M0 8h24" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleLayout('same-x')}
          disabled={!hasMultipleSelection}
          title="X相同（排成一列）"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="9" y="2" width="6" height="5" rx="1" fill="currentColor"/>
            <rect x="9" y="10" width="6" height="5" rx="1" fill="currentColor"/>
            <rect x="9" y="18" width="6" height="5" rx="1" fill="currentColor"/>
            <path d="M8 0v24" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
          </svg>
        </button>
      </div>

      <div className="align-toolbar-divider" />

      <div className="align-toolbar-group">
        <button
          className="align-btn"
          onClick={() => handleLayout('canvas-row')}
          disabled={!hasMultipleSelection}
          title="画布水平平铺（排成一行，自动调整宽度）"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="1" y="1" width="22" height="22" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            <rect x="1" y="1" width="7" height="22" rx="0" fill="currentColor" opacity="0.6"/>
            <rect x="8.5" y="1" width="7" height="22" rx="0" fill="currentColor" opacity="0.4"/>
            <rect x="16" y="1" width="7" height="22" rx="0" fill="currentColor" opacity="0.2"/>
          </svg>
        </button>
        <button
          className="align-btn"
          onClick={() => handleLayout('canvas-col')}
          disabled={!hasMultipleSelection}
          title="画布垂直平铺（排成一列，自动调整高度）"
        >
          <svg viewBox="0 0 24 24" width="16" height="16">
            <rect x="1" y="1" width="22" height="22" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
            <rect x="1" y="1" width="22" height="7" rx="0" fill="currentColor" opacity="0.6"/>
            <rect x="1" y="8.5" width="22" height="7" rx="0" fill="currentColor" opacity="0.4"/>
            <rect x="1" y="16" width="22" height="7" rx="0" fill="currentColor" opacity="0.2"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AlignToolbar;
