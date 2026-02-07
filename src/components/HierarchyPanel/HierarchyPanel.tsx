// Hierarchy Panel - Tree view of component structure

import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { LvglComponent } from '../../types';
import './HierarchyPanel.css';

interface TreeNodeProps {
  component: LvglComponent;
  depth: number;
  onSelect: (id: string, addToSelection: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDrop: (targetId: string) => void;
  selectedIds: string[];
  draggedId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  component,
  depth,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  selectedIds,
  draggedId,
  expandedIds,
  onToggleExpand,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(component.name);
  
  const isSelected = selectedIds.includes(component.id);
  const isExpanded = expandedIds.has(component.id);
  const hasChildren = component.children.length > 0;
  const isDragging = draggedId === component.id;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(component.id, e.ctrlKey || e.metaKey);
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditName(component.name);
  };
  
  const handleRenameSubmit = () => {
    if (editName.trim() && editName !== component.name) {
      onRename(component.id, editName.trim());
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(component.name);
    }
  };
  
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    onDragStart(component.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== component.id) {
      onDragOver(component.id);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedId && draggedId !== component.id) {
      onDrop(component.id);
    }
  };
  
  // Get icon based on component type
  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      btn: '🔘',
      label: '🏷️',
      img: '🖼️',
      slider: '🎚️',
      checkbox: '☑️',
      switch: '🔀',
      bar: '📊',
      arc: '⭕',
      textarea: '📝',
      dropdown: '📋',
      panel: '📦',
      container: '📦',
      tabview: '📑',
      window: '🪟',
      chart: '📈',
      table: '📅',
      calendar: '📆',
    };
    return icons[type] || '⬜';
  };
  
  return (
    <div className="tree-node-wrapper">
      <div
        className={`tree-node ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        draggable={!isEditing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Expand/Collapse button */}
        <span
          className={`expand-btn ${hasChildren ? 'has-children' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggleExpand(component.id);
          }}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </span>
        
        {/* Type icon */}
        <span className="type-icon">{getTypeIcon(component.type)}</span>
        
        {/* Name */}
        {isEditing ? (
          <input
            type="text"
            className="rename-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleKeyDown}
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="node-name">{component.name}</span>
        )}
        
        {/* Status icons */}
        <div className="status-icons">
          <span
            className={`status-icon visibility ${component.visible ? '' : 'off'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(component.id);
            }}
            title={component.visible ? '可见' : '隐藏'}
          >
            {component.visible ? '👁️' : '👁️‍🗨️'}
          </span>
          <span
            className={`status-icon lock ${component.locked ? 'on' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(component.id);
            }}
            title={component.locked ? '已锁定' : '未锁定'}
          >
            {component.locked ? '🔒' : '🔓'}
          </span>
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="tree-children">
          {component.children.map(child => (
            <TreeNode
              key={child.id}
              component={child}
              depth={depth + 1}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onToggleLock={onToggleLock}
              onRename={onRename}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              selectedIds={selectedIds}
              draggedId={draggedId}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HierarchyPanel: React.FC = () => {
  const {
    pages,
    currentPageId,
    selection,
    selectComponent,
    updateComponent,
    reparentComponent,
    saveToHistory,
  } = useEditorStore();
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  const currentPage = pages.find(p => p.id === currentPageId);
  const components = currentPage?.components || [];
  
  const handleSelect = useCallback((id: string, addToSelection: boolean) => {
    selectComponent(id, addToSelection);
  }, [selectComponent]);
  
  const handleToggleVisibility = useCallback((id: string) => {
    const comp = useEditorStore.getState().getComponentById(id);
    if (comp) {
      saveToHistory();
      updateComponent(id, { visible: !comp.visible });
    }
  }, [updateComponent, saveToHistory]);
  
  const handleToggleLock = useCallback((id: string) => {
    const comp = useEditorStore.getState().getComponentById(id);
    if (comp) {
      saveToHistory();
      updateComponent(id, { locked: !comp.locked });
    }
  }, [updateComponent, saveToHistory]);
  
  const handleRename = useCallback((id: string, newName: string) => {
    saveToHistory();
    updateComponent(id, { name: newName });
  }, [updateComponent, saveToHistory]);
  
  const handleDragStart = useCallback((id: string) => {
    setDraggedId(id);
  }, []);
  
  const handleDragOver = useCallback((_id: string) => {
    // Visual feedback could be added here
  }, []);
  
  const handleDrop = useCallback((targetId: string) => {
    if (draggedId && draggedId !== targetId) {
      // Check if target is not a descendant of dragged
      const isDescendant = (parentId: string, childId: string): boolean => {
        const parent = useEditorStore.getState().getComponentById(parentId);
        if (!parent) return false;
        for (const child of parent.children) {
          if (child.id === childId) return true;
          if (isDescendant(child.id, childId)) return true;
        }
        return false;
      };
      
      if (!isDescendant(draggedId, targetId)) {
        saveToHistory();
        reparentComponent(draggedId, targetId);
      }
    }
    setDraggedId(null);
  }, [draggedId, reparentComponent, saveToHistory]);
  
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  
  const handleExpandAll = useCallback(() => {
    const getAllIds = (comps: LvglComponent[]): string[] => {
      const ids: string[] = [];
      for (const comp of comps) {
        if (comp.children.length > 0) {
          ids.push(comp.id);
          ids.push(...getAllIds(comp.children));
        }
      }
      return ids;
    };
    setExpandedIds(new Set(getAllIds(components)));
  }, [components]);
  
  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);
  
  // Handle drop on empty area (move to root)
  const handleDropOnRoot = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedId) {
      saveToHistory();
      reparentComponent(draggedId, null);
      setDraggedId(null);
    }
  }, [draggedId, reparentComponent, saveToHistory]);
  
  const handleDragOverRoot = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  
  return (
    <div className="hierarchy-panel">
      <div className="hierarchy-header">
        <h3>📋 层级</h3>
        <div className="hierarchy-actions">
          <button
            className="hierarchy-btn"
            onClick={handleExpandAll}
            title="展开全部"
          >
            ⊞
          </button>
          <button
            className="hierarchy-btn"
            onClick={handleCollapseAll}
            title="折叠全部"
          >
            ⊟
          </button>
        </div>
      </div>
      
      <div
        className="hierarchy-tree"
        onDragOver={handleDragOverRoot}
        onDrop={handleDropOnRoot}
      >
        {components.length === 0 ? (
          <div className="empty-message">
            暂无组件
          </div>
        ) : (
          components.map(comp => (
            <TreeNode
              key={comp.id}
              component={comp}
              depth={0}
              onSelect={handleSelect}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onRename={handleRename}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              selectedIds={selection.selectedIds}
              draggedId={draggedId}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default HierarchyPanel;
