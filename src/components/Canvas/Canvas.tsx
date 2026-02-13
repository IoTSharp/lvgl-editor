import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '../../store/editorStore';
import type { LvglComponent, ResizeHandle } from '../../types';
import CanvasComponent from './CanvasComponent';
import AlignmentGuides from './AlignmentGuides';
import ContextMenu, { type ContextMenuItem } from '../ContextMenu';
import {
  hasClipboard,
  copySelectedComponents,
  cutSelectedComponents,
  pasteClipboardComponents,
  duplicateSelectedComponents,
  selectAllComponents,
} from '../../hooks/useKeyboardShortcuts';
import './Canvas.css';

interface BoxSelection {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

// Flatten components for box selection
function flattenComponents(comps: LvglComponent[], offsetX = 0, offsetY = 0): Array<{ comp: LvglComponent; absX: number; absY: number }> {
  const result: Array<{ comp: LvglComponent; absX: number; absY: number }> = [];
  for (const comp of comps) {
    const absX = comp.x + offsetX;
    const absY = comp.y + offsetY;
    result.push({ comp, absX, absY });
    result.push(...flattenComponents(comp.children, absX, absY));
  }
  return result;
}

const Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const rafRef = useRef<number>(0);

  // Use refs for values that handlers need but shouldn't trigger re-creation
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const spacePressedRef = useRef(false);

  // Keep refs in sync
  isPanningRef.current = isPanning;
  panStartRef.current = panStart;
  spacePressedRef.current = spacePressed;
  
  // Box selection state
  const [boxSelection, setBoxSelection] = useState<BoxSelection>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const boxSelectionRef = useRef(boxSelection);
  boxSelectionRef.current = boxSelection;
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string | null } | null>(null);

  // === Fine-grained store subscriptions ===
  // State that affects rendering
  const canvas = useEditorStore(s => s.canvas);
  const selectedIds = useEditorStore(s => s.selection.selectedIds);
  const hoveredId = useEditorStore(s => s.selection.hoveredId);
  const alignmentGuides = useEditorStore(s => s.alignmentGuides);
  const pages = useEditorStore(s => s.pages);
  const currentPageId = useEditorStore(s => s.currentPageId);

  // DO NOT subscribe to drag — it changes every frame during drag.
  // Read it via getState() inside event handlers.

  // Actions — stable references from zustand
  const setZoom = useEditorStore(s => s.setZoom);
  const setPan = useEditorStore(s => s.setPan);
  const selectComponent = useEditorStore(s => s.selectComponent);
  const selectComponents = useEditorStore(s => s.selectComponents);
  const clearSelection = useEditorStore(s => s.clearSelection);
  const startDrag = useEditorStore(s => s.startDrag);
  const endDrag = useEditorStore(s => s.endDrag);
  const saveToHistory = useEditorStore(s => s.saveToHistory);
  const deleteComponents = useEditorStore(s => s.deleteComponents);
  const bringToFront = useEditorStore(s => s.bringToFront);
  const sendToBack = useEditorStore(s => s.sendToBack);
  const bringForward = useEditorStore(s => s.bringForward);
  const sendBackward = useEditorStore(s => s.sendBackward);
  const moveComponentAndUpdateDrag = useEditorStore(s => s.moveComponentAndUpdateDrag);
  const resizeComponentAndUpdateDrag = useEditorStore(s => s.resizeComponentAndUpdateDrag);

  // Get current page and its components
  const currentPage = pages.find(p => p.id === currentPageId);
  const components = useMemo(() => currentPage?.components || [], [currentPage?.components]);
  const pageBackgroundColor = currentPage?.backgroundColor || '#ffffff';

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-area',
  });

  // Handle keyboard events for space key (panning)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        // Don't block space in input/textarea/contenteditable elements
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target instanceof HTMLElement && e.target.isContentEditable)
        ) {
          return;
        }
        setSpacePressed(true);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle wheel zoom — read canvas.zoom from getState to avoid dep
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const { canvas: c } = useEditorStore.getState();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(c.zoom + delta);
      }
    },
    [setZoom]
  );

  // Handle mouse down for panning, selection, or box selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Close context menu
      setContextMenu(null);
      
      const { canvas: c } = useEditorStore.getState();

      // Middle mouse button or space + left click for panning
      if (e.button === 1 || (spacePressedRef.current && e.button === 0)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - c.panX, y: e.clientY - c.panY });
        e.preventDefault();
        return;
      }

      // Left click on canvas background - start box selection or clear selection
      if (e.button === 0 && e.target === canvasRef.current) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left) / c.zoom;
          const y = (e.clientY - rect.top) / c.zoom;
          
          // Start box selection
          setBoxSelection({
            isSelecting: true,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y,
          });
          
          // Clear selection unless Ctrl/Cmd is held
          if (!e.ctrlKey && !e.metaKey) {
            clearSelection();
          }
        }
      }
    },
    [clearSelection]
  );

  // Handle resize logic
  const handleResize = useCallback(
    (componentId: string, handle: ResizeHandle, mouseX: number, mouseY: number) => {
      const state = useEditorStore.getState();
      const comp = state.getComponentById(componentId);
      if (!comp) return;

      const currentDrag = state.drag;
      let newX = comp.x;
      let newY = comp.y;
      let newWidth = comp.width;
      let newHeight = comp.height;

      const deltaX = mouseX - currentDrag.startX;
      const deltaY = mouseY - currentDrag.startY;

      switch (handle) {
        case 'top-left':
          newX = comp.x + deltaX;
          newY = comp.y + deltaY;
          newWidth = comp.width - deltaX;
          newHeight = comp.height - deltaY;
          break;
        case 'top':
          newY = comp.y + deltaY;
          newHeight = comp.height - deltaY;
          break;
        case 'top-right':
          newY = comp.y + deltaY;
          newWidth = comp.width + deltaX;
          newHeight = comp.height - deltaY;
          break;
        case 'left':
          newX = comp.x + deltaX;
          newWidth = comp.width - deltaX;
          break;
        case 'right':
          newWidth = comp.width + deltaX;
          break;
        case 'bottom-left':
          newX = comp.x + deltaX;
          newWidth = comp.width - deltaX;
          newHeight = comp.height + deltaY;
          break;
        case 'bottom':
          newHeight = comp.height + deltaY;
          break;
        case 'bottom-right':
          newWidth = comp.width + deltaX;
          newHeight = comp.height + deltaY;
          break;
      }

      // Ensure minimum size
      if (newWidth < 10) {
        newWidth = 10;
        if (handle.includes('left')) newX = comp.x + comp.width - 10;
      }
      if (newHeight < 10) {
        newHeight = 10;
        if (handle.includes('top')) newY = comp.y + comp.height - 10;
      }

      resizeComponentAndUpdateDrag(componentId, newWidth, newHeight, mouseX, mouseY, newX, newY);
    },
    [resizeComponentAndUpdateDrag]
  );

  // Handle mouse move — all state read via refs or getState(), zero reactive deps
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const ps = panStartRef.current;
        setPan(e.clientX - ps.x, e.clientY - ps.y);
        return;
      }

      // Box selection
      if (boxSelectionRef.current.isSelecting) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const { canvas: c } = useEditorStore.getState();
          const x = (e.clientX - rect.left) / c.zoom;
          const y = (e.clientY - rect.top) / c.zoom;
          setBoxSelection(prev => ({
            ...prev,
            currentX: x,
            currentY: y,
          }));
        }
        return;
      }

      const drag = useEditorStore.getState().drag;
      if (drag.isDragging) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const { canvas: c } = useEditorStore.getState();
        const x = (e.clientX - rect.left) / c.zoom;
        const y = (e.clientY - rect.top) / c.zoom;

        // Throttle with requestAnimationFrame
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = 0;
          const currentDrag = useEditorStore.getState().drag;
          if (!currentDrag.isDragging) return;

          // Handle component move
          if (currentDrag.dragType === 'move' && currentDrag.draggedComponentId) {
            const deltaX = x - currentDrag.startX;
            const deltaY = y - currentDrag.startY;
            const comp = useEditorStore.getState().getComponentById(currentDrag.draggedComponentId);
            if (comp) {
              moveComponentAndUpdateDrag(
                currentDrag.draggedComponentId,
                comp.x + deltaX,
                comp.y + deltaY,
                x,
                y
              );
            }
          }

          // Handle resize
          if (currentDrag.dragType === 'resize' && currentDrag.draggedComponentId && currentDrag.resizeHandle) {
            handleResize(currentDrag.draggedComponentId, currentDrag.resizeHandle, x, y);
          }
        });
      }
    },
    [setPan, moveComponentAndUpdateDrag, handleResize]
  );

  // Handle mouse up — read all transient state from refs/getState
  const handleMouseUp = useCallback(() => {
    // Clean up any pending RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    
    if (isPanningRef.current) {
      setIsPanning(false);
    }
    
    // Finish box selection
    const bs = boxSelectionRef.current;
    if (bs.isSelecting) {
      const minX = Math.min(bs.startX, bs.currentX);
      const maxX = Math.max(bs.startX, bs.currentX);
      const minY = Math.min(bs.startY, bs.currentY);
      const maxY = Math.max(bs.startY, bs.currentY);
      
      // Find components within the box
      const { pages: p, currentPageId: cpId } = useEditorStore.getState();
      const cp = p.find(pg => pg.id === cpId);
      const comps = cp?.components || [];
      const flatComps = flattenComponents(comps);
      const ids = flatComps
        .filter(({ comp, absX, absY }) => {
          const compRight = absX + comp.width;
          const compBottom = absY + comp.height;
          return absX < maxX && compRight > minX && absY < maxY && compBottom > minY;
        })
        .map(({ comp }) => comp.id);
      
      if (ids.length > 0) {
        selectComponents(ids);
      }
      
      setBoxSelection({
        isSelecting: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
    }
    
    const drag = useEditorStore.getState().drag;
    if (drag.isDragging) {
      if (drag.dragType === 'move' || drag.dragType === 'resize') {
        saveToHistory();
      }
      endDrag();
    }
  }, [selectComponents, saveToHistory, endDrag]);

  // Handle component selection
  const handleComponentClick = useCallback(
    (e: React.MouseEvent, componentId: string) => {
      e.stopPropagation();
      // Ctrl/Cmd+click multi-select is handled in mousedown (handleComponentDragStart).
      // If we handle it again here, the toggle fires twice and cancels itself out.
      if (e.ctrlKey || e.metaKey) return;
      selectComponent(componentId, false);
    },
    [selectComponent]
  );

  // Handle component drag start — read transient state from getState
  const handleComponentDragStart = useCallback(
    (e: React.MouseEvent, componentId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const state = useEditorStore.getState();

      // Don't allow dragging locked components
      const comp = state.getComponentById(componentId);
      if (comp?.locked) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / state.canvas.zoom;
        const y = (e.clientY - rect.top) / state.canvas.zoom;

        // Handle selection on mousedown (Ctrl/Cmd multi-select lives here)
        if (e.ctrlKey || e.metaKey) {
          const wasSelected = state.selection.selectedIds.includes(componentId);
          // Toggle: add if not selected, remove if already selected
          selectComponent(componentId, true);
          // Don't start drag if we just deselected the component
          if (wasSelected) return;
        } else if (!state.selection.selectedIds.includes(componentId)) {
          // Single select only if not already selected (avoid clearing multi-select before drag)
          selectComponent(componentId, false);
        }

        startDrag('move', {
          draggedComponentId: componentId,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
        });
      }
    },
    [selectComponent, startDrag]
  );

  // Handle resize handle drag start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, componentId: string, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();

      const state = useEditorStore.getState();

      // Don't allow resizing locked components
      const comp = state.getComponentById(componentId);
      if (comp?.locked) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / state.canvas.zoom;
        const y = (e.clientY - rect.top) / state.canvas.zoom;

        startDrag('resize', {
          draggedComponentId: componentId,
          resizeHandle: handle,
          startX: x,
          startY: y,
          currentX: x,
          currentY: y,
        });
      }
    },
    [startDrag]
  );

  // Handle context menu — read selection from getState
  const handleContextMenu = useCallback((e: React.MouseEvent, componentId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const state = useEditorStore.getState();
    // If right-clicking on a component that's not selected, select it
    if (componentId && !state.selection.selectedIds.includes(componentId)) {
      selectComponent(componentId);
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetId: componentId || null,
    });
  }, [selectComponent]);

  // Context menu items — read selection from getState inside onClick handlers
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    const state = useEditorStore.getState();
    const sIds = state.selection.selectedIds;
    const hasSelection = sIds.length > 0;
    const hasMultiple = sIds.length > 1;
    
    const items: ContextMenuItem[] = [
      {
        id: 'copy',
        label: '复制',
        icon: '📋',
        shortcut: 'Ctrl+C',
        disabled: !hasSelection,
        onClick: () => {
          copySelectedComponents();
        },
      },
      {
        id: 'cut',
        label: '剪切',
        icon: '✂️',
        shortcut: 'Ctrl+X',
        disabled: !hasSelection,
        onClick: () => {
          cutSelectedComponents();
        },
      },
      {
        id: 'paste',
        label: '粘贴',
        icon: '📄',
        shortcut: 'Ctrl+V',
        disabled: !hasClipboard(),
        onClick: () => {
          pasteClipboardComponents();
        },
      },
      {
        id: 'duplicate',
        label: '复制并粘贴',
        icon: '⧉',
        shortcut: 'Ctrl+D',
        disabled: !hasSelection,
        onClick: () => {
          duplicateSelectedComponents();
        },
      },
      { id: 'divider1', label: '', divider: true },
      {
        id: 'delete',
        label: '删除',
        icon: '🗑️',
        shortcut: 'Delete',
        disabled: !hasSelection,
        onClick: () => {
          const s = useEditorStore.getState();
          saveToHistory();
          deleteComponents(s.selection.selectedIds);
        },
      },
      { id: 'divider2', label: '', divider: true },
      {
        id: 'bring-front',
        label: '置于顶层',
        icon: '⬆️',
        disabled: !hasSelection || hasMultiple,
        onClick: () => {
          const s = useEditorStore.getState();
          if (s.selection.selectedIds.length === 1) {
            bringToFront(s.selection.selectedIds[0]);
          }
        },
      },
      {
        id: 'bring-forward',
        label: '上移一层',
        icon: '↑',
        disabled: !hasSelection || hasMultiple,
        onClick: () => {
          const s = useEditorStore.getState();
          if (s.selection.selectedIds.length === 1) {
            bringForward(s.selection.selectedIds[0]);
          }
        },
      },
      {
        id: 'send-backward',
        label: '下移一层',
        icon: '↓',
        disabled: !hasSelection || hasMultiple,
        onClick: () => {
          const s = useEditorStore.getState();
          if (s.selection.selectedIds.length === 1) {
            sendBackward(s.selection.selectedIds[0]);
          }
        },
      },
      {
        id: 'send-back',
        label: '置于底层',
        icon: '⬇️',
        disabled: !hasSelection || hasMultiple,
        onClick: () => {
          const s = useEditorStore.getState();
          if (s.selection.selectedIds.length === 1) {
            sendToBack(s.selection.selectedIds[0]);
          }
        },
      },
      { id: 'divider3', label: '', divider: true },
      {
        id: 'select-all',
        label: '全选',
        icon: '☑️',
        shortcut: 'Ctrl+A',
        onClick: () => {
          selectAllComponents();
        },
      },
    ];
    
    return items;
  }, [saveToHistory, deleteComponents, bringToFront, bringForward, sendBackward, sendToBack]);

  // Render grid
  const renderGrid = () => {
    if (!canvas.showGrid) return null;

    const gridSize = canvas.gridSize;
    const pattern = `
      <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
        <path d="M ${gridSize} 0 L 0 0 0 ${gridSize}" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
      </pattern>
    `;

    return (
      <svg
        className="canvas-grid"
        width={canvas.width}
        height={canvas.height}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs dangerouslySetInnerHTML={{ __html: pattern }} />
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    );
  };

  // Render box selection
  const renderBoxSelection = () => {
    if (!boxSelection.isSelecting) return null;
    
    const minX = Math.min(boxSelection.startX, boxSelection.currentX);
    const minY = Math.min(boxSelection.startY, boxSelection.currentY);
    const width = Math.abs(boxSelection.currentX - boxSelection.startX);
    const height = Math.abs(boxSelection.currentY - boxSelection.startY);
    
    return (
      <div
        className="box-selection"
        style={{
          left: minX,
          top: minY,
          width,
          height,
        }}
      />
    );
  };

  // Stable callback ref for context menu per-component
  const handleComponentContextMenu = useCallback(
    (e: React.MouseEvent, compId: string) => handleContextMenu(e, compId),
    [handleContextMenu]
  );

  // Render components recursively
  const renderComponents = (comps: LvglComponent[], offsetX = 0, offsetY = 0, parentComp?: LvglComponent) => {
    // Filter children for tabview/tileview based on active tab/tile
    let visibleComps = comps;
    if (parentComp?.type === 'tabview') {
      const tabChildMap: Record<string, string[]> = parentComp.props?.tabChildMap || {};
      const activeTab = String(parentComp.props?.activeTab || 0);
      const activeChildIds = tabChildMap[activeTab] || [];
      // If tabChildMap is empty, show all children (backward compat); otherwise filter
      if (Object.keys(tabChildMap).length > 0) {
        visibleComps = comps.filter(c => activeChildIds.includes(c.id));
      }
    } else if (parentComp?.type === 'tileview') {
      const tileChildMap: Record<string, string[]> = parentComp.props?.tileChildMap || {};
      const activeKey = `${parentComp.props?.currentRow || 0}-${parentComp.props?.currentCol || 0}`;
      const activeChildIds = tileChildMap[activeKey] || [];
      if (Object.keys(tileChildMap).length > 0) {
        visibleComps = comps.filter(c => activeChildIds.includes(c.id));
      }
    }

    // Parent dimensions: use parent component size, or canvas (screen) size for top-level
    const pw = parentComp ? parentComp.width : canvas.width;
    const ph = parentComp ? parentComp.height : canvas.height;

    return visibleComps.map(comp => (
      <CanvasComponent
        key={comp.id}
        component={comp}
        offsetX={offsetX}
        offsetY={offsetY}
        parentWidth={pw}
        parentHeight={ph}
        parentLayout={parentComp?.props?.layout || undefined}
        parentFlexDirection={parentComp?.props?.flexDirection || undefined}
        onClick={handleComponentClick}
        onDragStart={handleComponentDragStart}
        onResizeStart={handleResizeStart}
        onContextMenu={handleComponentContextMenu}
      >
        {comp.children.length > 0 &&
          renderComponents(comp.children, offsetX + comp.x, offsetY + comp.y, comp)}
      </CanvasComponent>
    ));
  };

  return (
    <div
      ref={containerRef}
      className={`canvas-container ${spacePressed ? 'panning-mode' : ''} ${isOver ? 'drop-target' : ''}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => handleContextMenu(e)}
    >
      <div
        className="canvas-viewport"
        style={{
          transform: `translate(${canvas.panX}px, ${canvas.panY}px)`,
        }}
      >
        <div
          ref={(node) => {
            canvasRef.current = node as HTMLDivElement;
            setNodeRef(node);
          }}
          className="canvas"
          style={{
            width: canvas.width,
            height: canvas.height,
            transform: `scale(${canvas.zoom})`,
            transformOrigin: 'top left',
            backgroundColor: pageBackgroundColor,
          }}
        >
          {renderGrid()}
          {renderComponents(components)}
          {renderBoxSelection()}
          <AlignmentGuides guides={alignmentGuides} />
        </div>
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default Canvas;
