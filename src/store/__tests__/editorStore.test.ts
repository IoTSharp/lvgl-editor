import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../editorStore';

// Reset store before each test
function resetStore() {
  useEditorStore.getState();
  // Reset to a clean state by replacing pages with a single default page
  useEditorStore.setState({
    pages: [{ id: 'test-page-1', name: 'Page 1', components: [], backgroundColor: '#ffffff' }],
    currentPageId: 'test-page-1',
    selection: { selectedIds: [], hoveredId: null },
    history: [],
    historyIndex: -1,
  });
  return useEditorStore.getState();
}

describe('editorStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // --- addComponent ---
  describe('addComponent', () => {
    it('should add a button component to the current page', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 10, 20);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(id).toBeTruthy();
      expect(page.components).toHaveLength(1);
      expect(page.components[0].type).toBe('btn');
    });

    it('should snap position to grid when snapToGrid is enabled', () => {
      const store = useEditorStore.getState();
      // Default gridSize is 10, snapToGrid is true
      store.addComponent('label', 13, 27);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components[0].x).toBe(10);
      expect(page.components[0].y).toBe(30);
    });

    it('should add a child component to a parent', () => {
      const store = useEditorStore.getState();
      const parentId = store.addComponent('obj', 0, 0);
      store.addComponent('label', 5, 5, parentId);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(1);
      expect(page.components[0].children).toHaveLength(1);
      expect(page.components[0].children[0].type).toBe('label');
    });

    it('should return empty string for unknown component type', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('nonexistent', 0, 0);
      expect(id).toBe('');
    });

    it('should use default props from component definition', () => {
      const store = useEditorStore.getState();
      store.addComponent('slider', 0, 0);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      const slider = page.components[0];
      expect(slider.props.min).toBe(0);
      expect(slider.props.max).toBe(100);
      expect(slider.props.value).toBe(50);
    });
  });

  // --- deleteComponents ---
  describe('deleteComponents', () => {
    it('should delete a component by id', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 0, 0);
      store.deleteComponents([id]);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(0);
    });

    it('should delete multiple components', () => {
      const store = useEditorStore.getState();
      const id1 = store.addComponent('btn', 0, 0);
      const id2 = store.addComponent('label', 50, 50);
      store.deleteComponents([id1, id2]);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(0);
    });

    it('should remove deleted ids from selection', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 0, 0);
      store.selectComponent(id);
      store.deleteComponents([id]);
      const state = useEditorStore.getState();
      expect(state.selection.selectedIds).not.toContain(id);
    });

    it('should delete nested child components', () => {
      const store = useEditorStore.getState();
      const parentId = store.addComponent('obj', 0, 0);
      const childId = store.addComponent('label', 5, 5, parentId);
      store.deleteComponents([childId]);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components[0].children).toHaveLength(0);
    });

    it('should do nothing when deleting empty array', () => {
      const store = useEditorStore.getState();
      store.addComponent('btn', 0, 0);
      store.deleteComponents([]);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(1);
    });
  });

  // --- moveComponent ---
  describe('moveComponent', () => {
    it('should update component position', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 0, 0);
      store.moveComponent(id, 100, 200);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components[0].x).toBe(100);
      expect(page.components[0].y).toBe(200);
    });

    it('should snap to grid when moving', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 0, 0);
      store.moveComponent(id, 13, 27);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components[0].x).toBe(10);
      expect(page.components[0].y).toBe(30);
    });

    it('should not snap when snapToGrid is disabled', () => {
      const store = useEditorStore.getState();
      store.setSnapToGrid(false);
      const id = store.addComponent('btn', 0, 0);
      store.moveComponent(id, 13, 27);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components[0].x).toBe(13);
      expect(page.components[0].y).toBe(27);
    });

    it('should move a nested child component', () => {
      const store = useEditorStore.getState();
      const parentId = store.addComponent('obj', 0, 0);
      const childId = store.addComponent('label', 0, 0, parentId);
      store.moveComponent(childId, 50, 60);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components[0].children[0].x).toBe(50);
      expect(page.components[0].children[0].y).toBe(60);
    });

    it('should handle moving to negative coordinates', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 0, 0);
      store.moveComponent(id, -10, -20);
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components[0].x).toBe(-10);
      expect(page.components[0].y).toBe(-20);
    });
  });

  // --- undo/redo ---
  describe('undo/redo', () => {
    it('should undo adding a component', () => {
      const store = useEditorStore.getState();
      store.addComponent('btn', 0, 0);
      let state = useEditorStore.getState();
      let page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(1);

      store.undo();
      state = useEditorStore.getState();
      page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(0);
    });

    it('should redo after undo', () => {
      const store = useEditorStore.getState();
      store.addComponent('btn', 0, 0);
      // addComponent calls saveToHistory before mutation:
      //   history[0] = empty state, historyIndex = 0, then mutation adds btn
      // undo: restores history[0] (empty), saves current (with btn) at history[1], historyIndex = -1
      // redo: goes to history[0] (empty), historyIndex = 0
      // redo again: goes to history[1] (with btn), historyIndex = 1
      store.undo();
      let state = useEditorStore.getState();
      let page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(0);

      // Two redos needed: first restores the pre-mutation snapshot, second restores post-mutation
      store.redo();
      store.redo();
      state = useEditorStore.getState();
      page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(1);
    });

    it('should do nothing when undo with no history', () => {
      const store = useEditorStore.getState();
      store.undo(); // should not throw
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(0);
    });

    it('should do nothing when redo with no future', () => {
      const store = useEditorStore.getState();
      store.redo(); // should not throw
      const state = useEditorStore.getState();
      const page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(0);
    });

    it('should handle multiple undo/redo cycles', () => {
      const store = useEditorStore.getState();
      store.addComponent('btn', 0, 0);
      store.addComponent('label', 50, 50);

      let state = useEditorStore.getState();
      let page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(2);

      store.undo(); // undo label add → 1 component
      state = useEditorStore.getState();
      page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(1);

      store.undo(); // undo btn add → 0 components
      state = useEditorStore.getState();
      page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(0);

      // Redo twice to get back to 1 component (pre-mutation + post-mutation of first add)
      store.redo();
      store.redo();
      state = useEditorStore.getState();
      page = state.pages.find(p => p.id === state.currentPageId)!;
      expect(page.components).toHaveLength(1);
    });
  });

  // --- addPage/deletePage/renamePage ---
  describe('page management', () => {
    it('should add a new page', () => {
      const store = useEditorStore.getState();
      const newPageId = store.addPage();
      const state = useEditorStore.getState();
      expect(state.pages).toHaveLength(2);
      expect(state.currentPageId).toBe(newPageId);
    });

    it('should delete a page', () => {
      const store = useEditorStore.getState();
      const newPageId = store.addPage();
      store.deletePage(newPageId);
      const state = useEditorStore.getState();
      expect(state.pages).toHaveLength(1);
    });

    it('should not delete the last page', () => {
      const store = useEditorStore.getState();
      const state = useEditorStore.getState();
      store.deletePage(state.currentPageId);
      const afterState = useEditorStore.getState();
      expect(afterState.pages).toHaveLength(1);
    });

    it('should rename a page', () => {
      const store = useEditorStore.getState();
      const state = useEditorStore.getState();
      store.renamePage(state.currentPageId, 'My Screen');
      const afterState = useEditorStore.getState();
      expect(afterState.pages[0].name).toBe('My Screen');
    });

    it('should switch current page when deleting the active page', () => {
      const store = useEditorStore.getState();
      const firstPageId = useEditorStore.getState().currentPageId;
      store.addPage();
      store.deletePage(useEditorStore.getState().currentPageId);
      const state = useEditorStore.getState();
      expect(state.currentPageId).toBe(firstPageId);
    });
  });

  // --- selectComponent/clearSelection ---
  describe('selection', () => {
    it('should select a single component', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 0, 0);
      store.selectComponent(id);
      const state = useEditorStore.getState();
      expect(state.selection.selectedIds).toEqual([id]);
    });

    it('should replace selection when selecting without addToSelection', () => {
      const store = useEditorStore.getState();
      const id1 = store.addComponent('btn', 0, 0);
      const id2 = store.addComponent('label', 50, 50);
      store.selectComponent(id1);
      store.selectComponent(id2);
      const state = useEditorStore.getState();
      expect(state.selection.selectedIds).toEqual([id2]);
    });

    it('should add to selection with addToSelection flag', () => {
      const store = useEditorStore.getState();
      const id1 = store.addComponent('btn', 0, 0);
      const id2 = store.addComponent('label', 50, 50);
      store.selectComponent(id1);
      store.selectComponent(id2, true);
      const state = useEditorStore.getState();
      expect(state.selection.selectedIds).toContain(id1);
      expect(state.selection.selectedIds).toContain(id2);
    });

    it('should toggle off when addToSelection and already selected', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 0, 0);
      store.selectComponent(id);
      store.selectComponent(id, true);
      const state = useEditorStore.getState();
      expect(state.selection.selectedIds).not.toContain(id);
    });

    it('should clear all selection', () => {
      const store = useEditorStore.getState();
      const id = store.addComponent('btn', 0, 0);
      store.selectComponent(id);
      store.clearSelection();
      const state = useEditorStore.getState();
      expect(state.selection.selectedIds).toHaveLength(0);
    });
  });
});
