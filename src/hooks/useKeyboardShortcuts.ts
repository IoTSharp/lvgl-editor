import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../store/editorStore';
import type { LvglComponent } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Clipboard storage (in-memory for now)
let clipboard: { components: LvglComponent[]; type: 'copy' | 'cut' } | null = null;

/**
 * Deep clone a component with new IDs
 */
function cloneComponentWithNewIds(comp: LvglComponent, parentId: string | null = null): LvglComponent {
  const newId = uuidv4();
  return {
    ...comp,
    id: newId,
    name: `${comp.name}_copy`,
    parentId,
    props: { ...comp.props },
    styles: {
      default: { ...comp.styles.default },
      pressed: comp.styles.pressed ? { ...comp.styles.pressed } : undefined,
      focused: comp.styles.focused ? { ...comp.styles.focused } : undefined,
      disabled: comp.styles.disabled ? { ...comp.styles.disabled } : undefined,
    },
    events: comp.events.map(e => ({ ...e, id: uuidv4() })),
    children: comp.children.map(child => cloneComponentWithNewIds(child, newId)),
  };
}

/**
 * Hook to handle keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const { 
    selection, 
    deleteComponents, 
    undo, 
    redo,
    clearSelection,
    selectComponents,
    pages,
    currentPageId,
    saveToHistory,
  } = useEditorStore();

  // Get all components from current page (flattened)
  const getAllComponentIds = useCallback(() => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return [];
    
    const flatten = (comps: LvglComponent[]): string[] => {
      const result: string[] = [];
      for (const comp of comps) {
        result.push(comp.id);
        result.push(...flatten(comp.children));
      }
      return result;
    };
    
    return flatten(currentPage.components);
  }, [pages, currentPageId]);

  // Get selected components
  const getSelectedComponents = useCallback(() => {
    const currentPage = pages.find(p => p.id === currentPageId);
    if (!currentPage) return [];
    
    const findComponents = (comps: LvglComponent[]): LvglComponent[] => {
      const result: LvglComponent[] = [];
      for (const comp of comps) {
        if (selection.selectedIds.includes(comp.id)) {
          result.push(comp);
        }
        result.push(...findComponents(comp.children));
      }
      return result;
    };
    
    return findComponents(currentPage.components);
  }, [pages, currentPageId, selection.selectedIds]);

  // Copy selected components
  const copyComponents = useCallback(() => {
    const components = getSelectedComponents();
    if (components.length === 0) return;
    
    clipboard = {
      components: components.map(c => cloneComponentWithNewIds(c)),
      type: 'copy',
    };
    
    // Show feedback (could use toast here)
    console.log(`Copied ${components.length} component(s)`);
  }, [getSelectedComponents]);

  // Cut selected components
  const cutComponents = useCallback(() => {
    const components = getSelectedComponents();
    if (components.length === 0) return;
    
    clipboard = {
      components: components.map(c => cloneComponentWithNewIds(c)),
      type: 'cut',
    };
    
    // Delete original components
    saveToHistory();
    deleteComponents(selection.selectedIds);
    
    console.log(`Cut ${components.length} component(s)`);
  }, [getSelectedComponents, selection.selectedIds, deleteComponents, saveToHistory]);

  // Paste components
  const pasteComponents = useCallback(() => {
    if (!clipboard || clipboard.components.length === 0) return;
    
    const store = useEditorStore.getState();
    const currentPage = store.pages.find(p => p.id === store.currentPageId);
    if (!currentPage) return;
    
    saveToHistory();
    
    // Clone with new IDs and offset position
    const newComponents = clipboard.components.map(comp => {
      const cloned = cloneComponentWithNewIds(comp);
      // Offset position slightly so pasted components are visible
      cloned.x += 20;
      cloned.y += 20;
      return cloned;
    });
    
    // Add to current page
    const newPages = store.pages.map(page => {
      if (page.id === store.currentPageId) {
        return {
          ...page,
          components: [...page.components, ...newComponents],
        };
      }
      return page;
    });
    
    useEditorStore.setState({ pages: newPages });
    
    // Select pasted components
    selectComponents(newComponents.map(c => c.id));
    
    console.log(`Pasted ${newComponents.length} component(s)`);
  }, [saveToHistory, selectComponents]);

  // Duplicate (copy + paste in one action)
  const duplicateComponents = useCallback(() => {
    copyComponents();
    pasteComponents();
  }, [copyComponents, pasteComponents]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const isMod = e.ctrlKey || e.metaKey;

    // Delete selected components
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selection.selectedIds.length > 0) {
        e.preventDefault();
        saveToHistory();
        deleteComponents(selection.selectedIds);
      }
    }

    // Undo: Ctrl+Z
    if (isMod && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if (isMod && ((e.key === 'Z' && e.shiftKey) || e.key === 'y')) {
      e.preventDefault();
      redo();
    }

    // Escape: Clear selection
    if (e.key === 'Escape') {
      clearSelection();
    }

    // Select all: Ctrl+A
    if (isMod && e.key === 'a') {
      e.preventDefault();
      const allIds = getAllComponentIds();
      selectComponents(allIds);
    }

    // Copy: Ctrl+C
    if (isMod && e.key === 'c') {
      e.preventDefault();
      copyComponents();
    }

    // Cut: Ctrl+X
    if (isMod && e.key === 'x') {
      e.preventDefault();
      cutComponents();
    }

    // Paste: Ctrl+V
    if (isMod && e.key === 'v') {
      e.preventDefault();
      pasteComponents();
    }

    // Duplicate: Ctrl+D
    if (isMod && e.key === 'd') {
      e.preventDefault();
      duplicateComponents();
    }

    // Help: F1 or ?
    if (e.key === 'F1' || (e.key === '?' && !isMod)) {
      e.preventDefault();
      // Dispatch custom event for help panel
      window.dispatchEvent(new CustomEvent('toggle-help-panel'));
    }

    // Save: Ctrl+S
    if (isMod && e.key === 's') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('save-project'));
    }

    // Open: Ctrl+O
    if (isMod && e.key === 'o') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('open-project'));
    }

    // New: Ctrl+N
    if (isMod && e.key === 'n') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('new-project'));
    }
  }, [
    selection.selectedIds, 
    deleteComponents, 
    undo, 
    redo, 
    clearSelection,
    getAllComponentIds,
    selectComponents,
    copyComponents,
    cutComponents,
    pasteComponents,
    duplicateComponents,
    saveToHistory,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;

// Export clipboard check for context menu
export function hasClipboard(): boolean {
  return clipboard !== null && clipboard.components.length > 0;
}

// Export for external use
export function getClipboard() {
  return clipboard;
}
