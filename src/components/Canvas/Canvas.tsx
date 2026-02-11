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
  
  // Box selection state
  const [boxSelection, setBoxSelection] = useState<BoxSelection>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; targetId: string | null } | null>(null);

  const {
    canvas,
    selection,
    drag,
    alignmentGuides,
    pages,
    currentPageId,
    setZoom,
    setPan,
    selectComponent,
    selectComponents,
    clearSelection,
    moveComponent,
    resizeComponent,
    startDrag,
    updateDrag,
    endDrag,
    saveToHistory,
    deleteComponents,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
  } = useEditorStore();

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

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(canvas.zoom + delta);
      }
    },
    [canvas.zoom, setZoom]
  );

  // Handle mouse down for panning, selection, or box selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Close context menu
      setContextMenu(null);
      
      // Middle mouse button or space + left click for panning
      if (e.button === 1 || (spacePressed && e.button === 0)) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - canvas.panX, y: e.clientY - canvas.panY });
        e.preventDefault();
        return;
      }

      // Left click on canvas background - start box selection or clear selection
      if (e.button === 0 && e.target === canvasRef.current) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left) / canvas.zoom;
          const y = (e.clientY - rect.top) / canvas.zoom;
          
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
    [spacePressed, canvas.panX, canvas.panY, canvas.zoom, clearSelection]
  );

  // Handle resize logic
  const handleResize = useCallback(
    (componentId: string, handle: ResizeHandle, mouseX: number, mouseY: number) => {
      const comp = useEditorStore.getState().getComponentById(componentId);
      if (!comp) return;

      let newX = comp.x;
      let newY = comp.y;
      let newWidth = comp.width;
      let newHeight = comp.height;

      const deltaX = mouseX - drag.startX;
      const deltaY = mouseY - drag.startY;

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

      resizeComponent(componentId, newWidth, newHeight, newX, newY);
      startDrag('resize', {
        ...drag,
        startX: mouseX,
        startY: mouseY,
      });
    },
    [drag, resizeComponent, startDrag]
  );

  // Handle mouse move for panning, dragging, or box selection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan(e.clientX - panStart.x, e.clientY - panStart.y);
        return;
      }

      // Box selection
      if (boxSelection.isSelecting) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left) / canvas.zoom;
          const y = (e.clientY - rect.top) / canvas.zoom;
          setBoxSelection(prev => ({
            ...prev,
            currentX: x,
            currentY: y,
          }));
        }
        return;
      }

      if (drag.isDragging) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const x = (e.clientX - rect.left) / canvas.zoom;
          const y = (e.clientY - rect.top) / canvas.zoom;
          updateDrag(x, y);

          // Handle component move
          if (drag.dragType === 'move' && drag.draggedComponentId) {
            const deltaX = x - drag.startX;
            const deltaY = y - drag.startY;
            const comp = useEditorStore.getState().getComponentById(drag.draggedComponentId);
            if (comp) {
              moveComponent(
                drag.draggedComponentId,
                comp.x + deltaX,
                comp.y + deltaY
              );
              startDrag('move', {
                ...drag,
                startX: x,
                startY: y,
              });
            }
          }

          // Handle resize
          if (drag.dragType === 'resize' && drag.draggedComponentId && drag.resizeHandle) {
            handleResize(drag.draggedComponentId, drag.resizeHandle, x, y);
          }
        }
      }
    },
    [isPanning, panStart, boxSelection.isSelecting, drag, canvas.zoom, setPan, updateDrag, moveComponent, startDrag, handleResize]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
    }
    
    // Finish box selection
    if (boxSelection.isSelecting) {
      const minX = Math.min(boxSelection.startX, boxSelection.currentX);
      const maxX = Math.max(boxSelection.startX, boxSelection.currentX);
      const minY = Math.min(boxSelection.startY, boxSelection.currentY);
      const maxY = Math.max(boxSelection.startY, boxSelection.currentY);
      
      // Find components within the box
      const flatComps = flattenComponents(components);
      const selectedIds = flatComps
        .filter(({ comp, absX, absY }) => {
          const compRight = absX + comp.width;
          const compBottom = absY + comp.height;
          // Check if component intersects with selection box
          return absX < maxX && compRight > minX && absY < maxY && compBottom > minY;
        })
        .map(({ comp }) => comp.id);
      
      if (selectedIds.length > 0) {
        selectComponents(selectedIds);
      }
      
      setBoxSelection({
        isSelecting: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
    }
    
    if (drag.isDragging) {
      if (drag.dragType === 'move' || drag.dragType === 'resize') {
        saveToHistory();
      }
      endDrag();
    }
  }, [isPanning, boxSelection, drag, endDrag, saveToHistory, components, selectComponents]);

  // Handle component selection
  const handleComponentClick = useCallback(
    (e: React.MouseEvent, componentId: string) => {
      e.stopPropagation();
      selectComponent(componentId, e.ctrlKey || e.metaKey);
    },
    [selectComponent]
  );

  // Handle component drag start
  const handleComponentDragStart = useCallback(
    (e: React.MouseEvent, componentId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      // Don't allow dragging locked components
      const comp = useEditorStore.getState().getComponentById(componentId);
      if (comp?.locked) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / canvas.zoom;
        const y = (e.clientY - rect.top) / canvas.zoom;

        // Select if not already selected
        if (!selection.selectedIds.includes(componentId)) {
          selectComponent(componentId);
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
    [canvas.zoom, selection.selectedIds, selectComponent, startDrag]
  );

  // Handle resize handle drag start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, componentId: string, handle: ResizeHandle) => {
      e.stopPropagation();
      e.preventDefault();

      // Don't allow resizing locked components
      const comp = useEditorStore.getState().getComponentById(componentId);
      if (comp?.locked) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / canvas.zoom;
        const y = (e.clientY - rect.top) / canvas.zoom;

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
    [canvas.zoom, startDrag]
  );

  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, componentId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // If right-clicking on a component that's not selected, select it
    if (componentId && !selection.selectedIds.includes(componentId)) {
      selectComponent(componentId);
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetId: componentId || null,
    });
  }, [selection.selectedIds, selectComponent]);

  // Context menu items
  const getContextMenuItems = useCallback((): ContextMenuItem[] => {
    const hasSelection = selection.selectedIds.length > 0;
    const hasMultiple = selection.selectedIds.length > 1;
    
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
          saveToHistory();
          deleteComponents(selection.selectedIds);
        },
      },
      { id: 'divider2', label: '', divider: true },
      {
        id: 'bring-front',
        label: '置于顶层',
        icon: '⬆️',
        disabled: !hasSelection || hasMultiple,
        onClick: () => {
          if (selection.selectedIds.length === 1) {
            bringToFront(selection.selectedIds[0]);
          }
        },
      },
      {
        id: 'bring-forward',
        label: '上移一层',
        icon: '↑',
        disabled: !hasSelection || hasMultiple,
        onClick: () => {
          if (selection.selectedIds.length === 1) {
            bringForward(selection.selectedIds[0]);
          }
        },
      },
      {
        id: 'send-backward',
        label: '下移一层',
        icon: '↓',
        disabled: !hasSelection || hasMultiple,
        onClick: () => {
          if (selection.selectedIds.length === 1) {
            sendBackward(selection.selectedIds[0]);
          }
        },
      },
      {
        id: 'send-back',
        label: '置于底层',
        icon: '⬇️',
        disabled: !hasSelection || hasMultiple,
        onClick: () => {
          if (selection.selectedIds.length === 1) {
            sendToBack(selection.selectedIds[0]);
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
  }, [selection.selectedIds, saveToHistory, deleteComponents, bringToFront, bringForward, sendBackward, sendToBack]);

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

    return visibleComps.map(comp => (
      <CanvasComponent
        key={comp.id}
        component={comp}
        offsetX={offsetX}
        offsetY={offsetY}
        isSelected={selection.selectedIds.includes(comp.id)}
        isHovered={selection.hoveredId === comp.id}
        onClick={handleComponentClick}
        onDragStart={handleComponentDragStart}
        onResizeStart={handleResizeStart}
        onContextMenu={(e) => handleContextMenu(e, comp.id)}
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
