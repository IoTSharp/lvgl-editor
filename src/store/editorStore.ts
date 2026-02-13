import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  LvglComponent,
  CanvasState,
  SelectionState,
  DragState,
  HistoryEntry,
  AlignmentGuide,
  Page,
} from '../types';
import { getComponentDefinition } from '../utils/componentDefinitions';

// Maximum history entries for undo/redo
const MAX_HISTORY = 50;

// Create default page
function createDefaultPage(): Page {
  return {
    id: uuidv4(),
    name: 'Page 1',
    components: [],
    backgroundColor: '#F5F5F5',
  };
}

interface EditorState {
  // Multi-page support
  pages: Page[];
  currentPageId: string;
  
  // Canvas state
  canvas: CanvasState;
  
  // Selection state
  selection: SelectionState;
  
  // Drag state
  drag: DragState;
  
  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  
  // Alignment guides
  alignmentGuides: AlignmentGuide[];
  
  // Computed - current page components (for backward compatibility)
  components: LvglComponent[];
  
  // Actions - Pages
  addPage: () => string;
  deletePage: (pageId: string) => void;
  renamePage: (pageId: string, name: string) => void;
  setCurrentPage: (pageId: string) => void;
  updatePageBackground: (pageId: string, color: string) => void;
  
  // Actions - Components
  addComponent: (type: string, x: number, y: number, parentId?: string | null) => string;
  updateComponent: (id: string, updates: Partial<LvglComponent>) => void;
  deleteComponents: (ids: string[]) => void;
  moveComponent: (id: string, x: number, y: number) => void;
  resizeComponent: (id: string, width: number, height: number, x?: number, y?: number) => void;
  reparentComponent: (id: string, newParentId: string | null) => void;
  clearComponents: () => void;
  setComponents: (components: LvglComponent[]) => void;
  setPages: (pages: Page[]) => void;
  
  // Actions - Z-order
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  
  // Actions - Selection
  selectComponent: (id: string, addToSelection?: boolean) => void;
  selectComponents: (ids: string[]) => void;
  clearSelection: () => void;
  setHoveredComponent: (id: string | null) => void;
  
  // Actions - Canvas
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  setSnapToGrid: (snap: boolean) => void;
  
  // Actions - Drag
  startDrag: (dragType: DragState['dragType'], data: Partial<DragState>) => void;
  updateDrag: (x: number, y: number) => void;
  endDrag: () => void;
  
  // Combined move/resize + drag update (single set call for performance)
  moveComponentAndUpdateDrag: (id: string, x: number, y: number, dragStartX: number, dragStartY: number) => void;
  resizeComponentAndUpdateDrag: (id: string, width: number, height: number, dragStartX: number, dragStartY: number, x?: number, y?: number) => void;
  
  // Actions - History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // Actions - Alignment
  updateAlignmentGuides: (guides: AlignmentGuide[]) => void;
  clearAlignmentGuides: () => void;
  
  // Helpers
  getComponentById: (id: string) => LvglComponent | undefined;
  getComponentsByParent: (parentId: string | null) => LvglComponent[];
  findComponentAtPoint: (x: number, y: number) => LvglComponent | undefined;
  getAllComponents: () => LvglComponent[];
  getCurrentPage: () => Page | undefined;
}

// Helper to find component in tree
function findComponentInTree(components: LvglComponent[], id: string): LvglComponent | undefined {
  for (const comp of components) {
    if (comp.id === id) return comp;
    const found = findComponentInTree(comp.children, id);
    if (found) return found;
  }
  return undefined;
}

// Helper to flatten component tree
function flattenComponents(components: LvglComponent[]): LvglComponent[] {
  const result: LvglComponent[] = [];
  for (const comp of components) {
    result.push(comp);
    result.push(...flattenComponents(comp.children));
  }
  return result;
}

// Helper to update component in tree (reference-stable: unchanged subtrees keep original references)
function updateComponentInTree(
  components: LvglComponent[],
  id: string,
  updates: Partial<LvglComponent>
): LvglComponent[] {
  let changed = false;
  const result = components.map(comp => {
    if (comp.id === id) {
      changed = true;
      return { ...comp, ...updates };
    }
    if (comp.children.length > 0) {
      const newChildren = updateComponentInTree(comp.children, id, updates);
      if (newChildren !== comp.children) {
        changed = true;
        return { ...comp, children: newChildren };
      }
    }
    return comp;
  });
  return changed ? result : components;
}

// Helper to delete component from tree
function deleteComponentFromTree(components: LvglComponent[], ids: string[]): LvglComponent[] {
  return components
    .filter(comp => !ids.includes(comp.id))
    .map(comp => ({
      ...comp,
      children: deleteComponentFromTree(comp.children, ids),
    }));
}

// Helper to add component to tree
function addComponentToTree(
  components: LvglComponent[],
  newComponent: LvglComponent,
  parentId: string | null
): LvglComponent[] {
  if (parentId === null) {
    return [...components, newComponent];
  }
  
  return components.map(comp => {
    if (comp.id === parentId) {
      return {
        ...comp,
        children: [...comp.children, newComponent],
      };
    }
    if (comp.children.length > 0) {
      return {
        ...comp,
        children: addComponentToTree(comp.children, newComponent, parentId),
      };
    }
    return comp;
  });
}

// Helper to change z-order of component in array
function changeZOrder(
  components: LvglComponent[],
  componentId: string,
  operation: 'front' | 'back' | 'forward' | 'backward'
): LvglComponent[] {
  // First check if component is at this level
  const index = components.findIndex(c => c.id === componentId);
  
  if (index !== -1) {
    const newComponents = [...components];
    const [component] = newComponents.splice(index, 1);
    
    switch (operation) {
      case 'front':
        // Move to end (top)
        newComponents.push(component);
        break;
      case 'back':
        // Move to beginning (bottom)
        newComponents.unshift(component);
        break;
      case 'forward':
        // Move up one position (higher index = more on top)
        if (index < components.length - 1) {
          newComponents.splice(index + 1, 0, component);
        } else {
          newComponents.push(component);
        }
        break;
      case 'backward':
        // Move down one position
        if (index > 0) {
          newComponents.splice(index - 1, 0, component);
        } else {
          newComponents.unshift(component);
        }
        break;
    }
    return newComponents;
  }
  
  // Not found at this level, search in children
  return components.map(comp => ({
    ...comp,
    children: changeZOrder(comp.children, componentId, operation),
  }));
}

// Helper to move component to new parent
function moveComponentToParent(
  components: LvglComponent[],
  componentId: string,
  newParentId: string | null
): LvglComponent[] {
  // First, find and remove the component
  let movedComponent: LvglComponent | undefined;
  
  const removeFromTree = (comps: LvglComponent[]): LvglComponent[] => {
    return comps
      .filter(comp => {
        if (comp.id === componentId) {
          movedComponent = comp;
          return false;
        }
        return true;
      })
      .map(comp => ({
        ...comp,
        children: removeFromTree(comp.children),
      }));
  };
  
  const newComponents = removeFromTree(components);
  
  if (!movedComponent) return components;
  
  // Update parent reference
  movedComponent = { ...movedComponent, parentId: newParentId };
  
  // Add to new parent
  return addComponentToTree(newComponents, movedComponent, newParentId);
}

// Deep clone components for history
function cloneComponents(components: LvglComponent[]): LvglComponent[] {
  return components.map(comp => ({
    ...comp,
    props: { ...comp.props },
    styles: {
      default: { ...comp.styles.default },
      pressed: comp.styles.pressed ? { ...comp.styles.pressed } : undefined,
      focused: comp.styles.focused ? { ...comp.styles.focused } : undefined,
      disabled: comp.styles.disabled ? { ...comp.styles.disabled } : undefined,
    },
    events: comp.events.map(e => ({ ...e, action: e.action ? { ...e.action } : undefined })),
    animations: (comp.animations || []).map(a => ({ ...a })),
    children: cloneComponents(comp.children),
  }));
}

// Deep clone pages for history
function clonePages(pages: Page[]): Page[] {
  return pages.map(page => ({
    ...page,
    components: cloneComponents(page.components),
  }));
}

// Initial page
const initialPage = createDefaultPage();

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state - Multi-page
  pages: [initialPage],
  currentPageId: initialPage.id,
  
  // Computed components (current page)
  get components() {
    const state = get();
    const currentPage = state.pages.find(p => p.id === state.currentPageId);
    return currentPage?.components || [];
  },
  
  canvas: {
    width: 480,
    height: 320,
    zoom: 1,
    panX: 0,
    panY: 0,
    showGrid: true,
    gridSize: 10,
    snapToGrid: true,
  },
  
  selection: {
    selectedIds: [],
    hoveredId: null,
  },
  
  drag: {
    isDragging: false,
    dragType: null,
    draggedComponentType: null,
    draggedComponentId: null,
    resizeHandle: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  },
  
  history: [],
  historyIndex: -1,
  
  alignmentGuides: [],
  
  // Page Actions
  addPage: () => {
    const id = uuidv4();
    const pageCount = get().pages.length;
    const newPage: Page = {
      id,
      name: `Page ${pageCount + 1}`,
      components: [],
      backgroundColor: '#F5F5F5',
    };
    
    set(state => ({
      pages: [...state.pages, newPage],
      currentPageId: id,
      selection: { ...state.selection, selectedIds: [] },
    }));
    
    return id;
  },
  
  deletePage: (pageId) => {
    const { pages, currentPageId } = get();
    if (pages.length <= 1) return; // Don't delete last page
    
    const newPages = pages.filter(p => p.id !== pageId);
    const newCurrentPageId = pageId === currentPageId 
      ? newPages[0].id 
      : currentPageId;
    
    set({
      pages: newPages,
      currentPageId: newCurrentPageId,
      selection: { selectedIds: [], hoveredId: null },
    });
  },
  
  renamePage: (pageId, name) => {
    set(state => ({
      pages: state.pages.map(p => 
        p.id === pageId ? { ...p, name } : p
      ),
    }));
  },
  
  setCurrentPage: (pageId) => {
    set({
      currentPageId: pageId,
      selection: { selectedIds: [], hoveredId: null },
    });
  },
  
  updatePageBackground: (pageId, color) => {
    set(state => ({
      pages: state.pages.map(p => 
        p.id === pageId ? { ...p, backgroundColor: color } : p
      ),
    }));
  },
  
  // Component Actions
  addComponent: (type, x, y, parentId = null) => {
    const definition = getComponentDefinition(type);
    if (!definition) return '';
    
    const id = uuidv4();
    const { canvas, currentPageId } = get();
    
    // Snap to grid if enabled
    let finalX = x;
    let finalY = y;
    if (canvas.snapToGrid) {
      finalX = Math.round(x / canvas.gridSize) * canvas.gridSize;
      finalY = Math.round(y / canvas.gridSize) * canvas.gridSize;
    }
    
    const newComponent: LvglComponent = {
      id,
      type,
      name: `${definition.name}_${id.slice(0, 4)}`,
      x: finalX,
      y: finalY,
      width: definition.defaultWidth,
      height: definition.defaultHeight,
      children: [],
      props: { ...definition.defaultProps },
      styles: {
        default: { ...definition.defaultStyles.default },
      },
      events: [],
      animations: [],
      parentId,
      locked: false,
      visible: true,
    };
    
    get().saveToHistory();
    
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: addComponentToTree(page.components, newComponent, parentId),
          };
        }
        return page;
      }),
    }));
    
    // Auto-update tabChildMap / tileChildMap when adding to tabview / tileview
    if (parentId) {
      const parent = get().getComponentById(parentId);
      if (parent?.type === 'tabview') {
        const tabChildMap: Record<string, string[]> = { ...(parent.props?.tabChildMap || {}) };
        const activeTab = String(parent.props?.activeTab || 0);
        if (!tabChildMap[activeTab]) tabChildMap[activeTab] = [];
        tabChildMap[activeTab] = [...tabChildMap[activeTab], id];
        get().updateComponent(parentId, { props: { ...parent.props, tabChildMap } });
      } else if (parent?.type === 'tileview') {
        const tileChildMap: Record<string, string[]> = { ...(parent.props?.tileChildMap || {}) };
        const key = `${parent.props?.currentRow || 0}-${parent.props?.currentCol || 0}`;
        if (!tileChildMap[key]) tileChildMap[key] = [];
        tileChildMap[key] = [...tileChildMap[key], id];
        get().updateComponent(parentId, { props: { ...parent.props, tileChildMap } });
      }
    }
    
    return id;
  },
  
  updateComponent: (id, updates) => {
    const { currentPageId } = get();
    get().saveToHistory();
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: updateComponentInTree(page.components, id, updates),
          };
        }
        return page;
      }),
    }));
  },
  
  deleteComponents: (ids) => {
    if (ids.length === 0) return;
    const { currentPageId } = get();
    
    // Remove from parent's childMap before deleting
    for (const id of ids) {
      const comp = get().getComponentById(id);
      if (comp?.parentId) {
        const parent = get().getComponentById(comp.parentId);
        if (parent?.type === 'tabview') {
          const tabChildMap: Record<string, string[]> = { ...(parent.props?.tabChildMap || {}) };
          for (const key of Object.keys(tabChildMap)) {
            tabChildMap[key] = tabChildMap[key].filter((cid: string) => cid !== id);
          }
          get().updateComponent(comp.parentId, { props: { ...parent.props, tabChildMap } });
        } else if (parent?.type === 'tileview') {
          const tileChildMap: Record<string, string[]> = { ...(parent.props?.tileChildMap || {}) };
          for (const key of Object.keys(tileChildMap)) {
            tileChildMap[key] = tileChildMap[key].filter((cid: string) => cid !== id);
          }
          get().updateComponent(comp.parentId, { props: { ...parent.props, tileChildMap } });
        }
      }
    }
    
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: deleteComponentFromTree(page.components, ids),
          };
        }
        return page;
      }),
      selection: {
        ...state.selection,
        selectedIds: state.selection.selectedIds.filter(id => !ids.includes(id)),
      },
    }));
  },
  
  moveComponent: (id, x, y) => {
    const { canvas, currentPageId } = get();
    let finalX = x;
    let finalY = y;
    
    if (canvas.snapToGrid) {
      finalX = Math.round(x / canvas.gridSize) * canvas.gridSize;
      finalY = Math.round(y / canvas.gridSize) * canvas.gridSize;
    }
    
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: updateComponentInTree(page.components, id, { x: finalX, y: finalY }),
          };
        }
        return page;
      }),
    }));
  },
  
  resizeComponent: (id, width, height, x, y) => {
    const { canvas, currentPageId } = get();
    let finalWidth = Math.max(10, width);
    let finalHeight = Math.max(10, height);
    
    if (canvas.snapToGrid) {
      finalWidth = Math.round(width / canvas.gridSize) * canvas.gridSize;
      finalHeight = Math.round(height / canvas.gridSize) * canvas.gridSize;
      finalWidth = Math.max(canvas.gridSize, finalWidth);
      finalHeight = Math.max(canvas.gridSize, finalHeight);
    }
    
    const updates: Partial<LvglComponent> = { width: finalWidth, height: finalHeight };
    if (x !== undefined) {
      updates.x = canvas.snapToGrid ? Math.round(x / canvas.gridSize) * canvas.gridSize : x;
    }
    if (y !== undefined) {
      updates.y = canvas.snapToGrid ? Math.round(y / canvas.gridSize) * canvas.gridSize : y;
    }
    
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: updateComponentInTree(page.components, id, updates),
          };
        }
        return page;
      }),
    }));
  },
  
  reparentComponent: (id, newParentId) => {
    const { currentPageId } = get();
    
    // Remove from old parent's childMap before reparenting
    const comp = get().getComponentById(id);
    if (comp?.parentId) {
      const oldParent = get().getComponentById(comp.parentId);
      if (oldParent?.type === 'tabview') {
        const tabChildMap: Record<string, string[]> = { ...(oldParent.props?.tabChildMap || {}) };
        for (const key of Object.keys(tabChildMap)) {
          tabChildMap[key] = tabChildMap[key].filter((cid: string) => cid !== id);
        }
        get().updateComponent(comp.parentId, { props: { ...oldParent.props, tabChildMap } });
      } else if (oldParent?.type === 'tileview') {
        const tileChildMap: Record<string, string[]> = { ...(oldParent.props?.tileChildMap || {}) };
        for (const key of Object.keys(tileChildMap)) {
          tileChildMap[key] = tileChildMap[key].filter((cid: string) => cid !== id);
        }
        get().updateComponent(comp.parentId, { props: { ...oldParent.props, tileChildMap } });
      }
    }
    
    get().saveToHistory();
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: moveComponentToParent(page.components, id, newParentId),
          };
        }
        return page;
      }),
    }));
    
    // Add to new parent's childMap after reparenting
    if (newParentId) {
      const newParent = get().getComponentById(newParentId);
      if (newParent?.type === 'tabview') {
        const tabChildMap: Record<string, string[]> = { ...(newParent.props?.tabChildMap || {}) };
        const activeTab = String(newParent.props?.activeTab || 0);
        if (!tabChildMap[activeTab]) tabChildMap[activeTab] = [];
        tabChildMap[activeTab] = [...tabChildMap[activeTab], id];
        get().updateComponent(newParentId, { props: { ...newParent.props, tabChildMap } });
      } else if (newParent?.type === 'tileview') {
        const tileChildMap: Record<string, string[]> = { ...(newParent.props?.tileChildMap || {}) };
        const key = `${newParent.props?.currentRow || 0}-${newParent.props?.currentCol || 0}`;
        if (!tileChildMap[key]) tileChildMap[key] = [];
        tileChildMap[key] = [...tileChildMap[key], id];
        get().updateComponent(newParentId, { props: { ...newParent.props, tileChildMap } });
      }
    }
  },
  
  setComponents: (components) => {
    const { currentPageId } = get();
    get().saveToHistory();
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: cloneComponents(components),
          };
        }
        return page;
      }),
      selection: { selectedIds: [], hoveredId: null },
    }));
  },

  setPages: (pages) => {
    get().saveToHistory();
    set({
      pages: clonePages(pages),
      currentPageId: pages.length > 0 ? pages[0].id : get().currentPageId,
      selection: { selectedIds: [], hoveredId: null },
    });
  },
  
  clearComponents: () => {
    const { currentPageId } = get();
    get().saveToHistory();
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: [],
          };
        }
        return page;
      }),
      selection: { selectedIds: [], hoveredId: null },
    }));
  },
  
  // Z-order Actions
  bringToFront: (id) => {
    const { currentPageId } = get();
    get().saveToHistory();
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: changeZOrder(page.components, id, 'front'),
          };
        }
        return page;
      }),
    }));
  },
  
  sendToBack: (id) => {
    const { currentPageId } = get();
    get().saveToHistory();
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: changeZOrder(page.components, id, 'back'),
          };
        }
        return page;
      }),
    }));
  },
  
  bringForward: (id) => {
    const { currentPageId } = get();
    get().saveToHistory();
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: changeZOrder(page.components, id, 'forward'),
          };
        }
        return page;
      }),
    }));
  },
  
  sendBackward: (id) => {
    const { currentPageId } = get();
    get().saveToHistory();
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          return {
            ...page,
            components: changeZOrder(page.components, id, 'backward'),
          };
        }
        return page;
      }),
    }));
  },
  
  // Selection Actions
  selectComponent: (id, addToSelection = false) => {
    set(state => {
      if (addToSelection) {
        const isSelected = state.selection.selectedIds.includes(id);
        return {
          selection: {
            ...state.selection,
            selectedIds: isSelected
              ? state.selection.selectedIds.filter(sid => sid !== id)
              : [...state.selection.selectedIds, id],
          },
        };
      }
      return {
        selection: {
          ...state.selection,
          selectedIds: [id],
        },
      };
    });
  },
  
  selectComponents: (ids) => {
    set(state => ({
      selection: {
        ...state.selection,
        selectedIds: ids,
      },
    }));
  },
  
  clearSelection: () => {
    set(state => ({
      selection: {
        ...state.selection,
        selectedIds: [],
      },
    }));
  },
  
  setHoveredComponent: (id) => {
    set(state => ({
      selection: {
        ...state.selection,
        hoveredId: id,
      },
    }));
  },
  
  // Canvas Actions
  setCanvasSize: (width, height) => {
    set(state => ({
      canvas: { ...state.canvas, width, height },
    }));
  },
  
  setZoom: (zoom) => {
    const clampedZoom = Math.max(0.1, Math.min(3, zoom));
    set(state => ({
      canvas: { ...state.canvas, zoom: clampedZoom },
    }));
  },
  
  setPan: (x, y) => {
    set(state => ({
      canvas: { ...state.canvas, panX: x, panY: y },
    }));
  },
  
  toggleGrid: () => {
    set(state => ({
      canvas: { ...state.canvas, showGrid: !state.canvas.showGrid },
    }));
  },
  
  setSnapToGrid: (snap) => {
    set(state => ({
      canvas: { ...state.canvas, snapToGrid: snap },
    }));
  },
  
  // Drag Actions
  startDrag: (dragType, data) => {
    set(state => ({
      drag: {
        ...state.drag,
        isDragging: true,
        dragType,
        ...data,
      },
    }));
  },
  
  updateDrag: (x, y) => {
    set(state => ({
      drag: {
        ...state.drag,
        currentX: x,
        currentY: y,
      },
    }));
  },
  
  endDrag: () => {
    set(() => ({
      drag: {
        isDragging: false,
        dragType: null,
        draggedComponentType: null,
        draggedComponentId: null,
        resizeHandle: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      },
    }));
  },
  
  // Combined move + drag update in a single set call
  moveComponentAndUpdateDrag: (id, x, y, dragStartX, dragStartY) => {
    const { canvas, currentPageId } = get();
    let finalX = x;
    let finalY = y;
    
    if (canvas.snapToGrid) {
      finalX = Math.round(x / canvas.gridSize) * canvas.gridSize;
      finalY = Math.round(y / canvas.gridSize) * canvas.gridSize;
    }
    
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          const newComponents = updateComponentInTree(page.components, id, { x: finalX, y: finalY });
          if (newComponents === page.components) return page;
          return { ...page, components: newComponents };
        }
        return page;
      }),
      drag: {
        ...state.drag,
        startX: dragStartX,
        startY: dragStartY,
      },
    }));
  },
  
  // Combined resize + drag update in a single set call
  resizeComponentAndUpdateDrag: (id, width, height, dragStartX, dragStartY, x, y) => {
    const { canvas, currentPageId } = get();
    let finalWidth = Math.max(10, width);
    let finalHeight = Math.max(10, height);
    
    if (canvas.snapToGrid) {
      finalWidth = Math.round(width / canvas.gridSize) * canvas.gridSize;
      finalHeight = Math.round(height / canvas.gridSize) * canvas.gridSize;
      finalWidth = Math.max(canvas.gridSize, finalWidth);
      finalHeight = Math.max(canvas.gridSize, finalHeight);
    }
    
    const updates: Partial<LvglComponent> = { width: finalWidth, height: finalHeight };
    if (x !== undefined) {
      updates.x = canvas.snapToGrid ? Math.round(x / canvas.gridSize) * canvas.gridSize : x;
    }
    if (y !== undefined) {
      updates.y = canvas.snapToGrid ? Math.round(y / canvas.gridSize) * canvas.gridSize : y;
    }
    
    set(state => ({
      pages: state.pages.map(page => {
        if (page.id === currentPageId) {
          const newComponents = updateComponentInTree(page.components, id, updates);
          if (newComponents === page.components) return page;
          return { ...page, components: newComponents };
        }
        return page;
      }),
      drag: {
        ...state.drag,
        startX: dragStartX,
        startY: dragStartY,
      },
    }));
  },
  
  // History Actions
  // Model: history is an array of snapshots. historyIndex points to the "current" snapshot.
  // saveToHistory() is called BEFORE a mutation: it saves the current state, truncates future,
  // and then the mutation changes pages (which becomes the "unsaved current" state).
  // undo: save current state as a redo point, restore history[historyIndex], decrement index.
  // redo: increment index, restore history[historyIndex].

  undo: () => {
    const { history, historyIndex, pages } = get();
    if (historyIndex < 0) return;

    const entry = history[historyIndex];

    // Save current state as a redo point (one past historyIndex)
    const newHistory = [...history];
    // If there's no entry after historyIndex, push current state for redo
    if (historyIndex === history.length - 1) {
      newHistory.push({
        pages: clonePages(pages),
        timestamp: Date.now(),
      });
    } else {
      // Replace the entry right after historyIndex with current state
      newHistory[historyIndex + 1] = {
        pages: clonePages(pages),
        timestamp: Date.now(),
      };
    }

    set({
      pages: clonePages(entry.pages || []),
      history: newHistory,
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex + 1 >= history.length) return;

    // The entry at historyIndex + 1 is the state to restore
    // (either a previously saved state or the state saved during undo)
    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];

    set({
      pages: clonePages(entry.pages || []),
      historyIndex: nextIndex,
    });
  },

  saveToHistory: () => {
    const { pages, history, historyIndex } = get();

    // Remove any future history (redo states) beyond current position
    const newHistory = history.slice(0, historyIndex + 1);

    // Add current state as a snapshot we can undo to
    newHistory.push({
      pages: clonePages(pages),
      timestamp: Date.now(),
    });

    // Limit history size
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },
  
  // Alignment Actions
  updateAlignmentGuides: (guides) => {
    set({ alignmentGuides: guides });
  },
  
  clearAlignmentGuides: () => {
    set({ alignmentGuides: [] });
  },
  
  // Helpers
  getComponentById: (id) => {
    const { pages, currentPageId } = get();
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return undefined;
    return findComponentInTree(currentPage.components, id);
  },
  
  getComponentsByParent: (parentId) => {
    const { pages, currentPageId } = get();
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return [];
    
    if (parentId === null) {
      return currentPage.components;
    }
    const parent = findComponentInTree(currentPage.components, parentId);
    return parent?.children || [];
  },
  
  findComponentAtPoint: (x, y) => {
    const { pages, currentPageId } = get();
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return undefined;
    
    // Recursive search, preferring deeper (child) components
    const findAtPoint = (comps: LvglComponent[], offsetX = 0, offsetY = 0): LvglComponent | undefined => {
      // Search in reverse order (top-most first)
      for (let i = comps.length - 1; i >= 0; i--) {
        const comp = comps[i];
        const compX = comp.x + offsetX;
        const compY = comp.y + offsetY;
        
        if (
          x >= compX &&
          x <= compX + comp.width &&
          y >= compY &&
          y <= compY + comp.height
        ) {
          // Check children first
          const childHit = findAtPoint(comp.children, compX, compY);
          if (childHit) return childHit;
          return comp;
        }
      }
      return undefined;
    };
    
    return findAtPoint(currentPage.components);
  },
  
  getAllComponents: () => {
    const { pages, currentPageId } = get();
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return [];
    return flattenComponents(currentPage.components);
  },
  
  getCurrentPage: () => {
    const { pages, currentPageId } = get();
    return pages.find(p => p.id === currentPageId);
  },
}));
