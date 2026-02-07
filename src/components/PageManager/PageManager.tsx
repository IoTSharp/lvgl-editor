import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import './PageManager.css';

const PageManager: React.FC = () => {
  const { 
    pages, 
    currentPageId, 
    addPage, 
    deletePage, 
    renamePage, 
    setCurrentPage,
    updatePageBackground 
  } = useEditorStore();
  
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showContextMenu, setShowContextMenu] = useState<{ pageId: string; x: number; y: number } | null>(null);

  const handleAddPage = useCallback(() => {
    addPage();
  }, [addPage]);

  const handlePageClick = useCallback((pageId: string) => {
    setCurrentPage(pageId);
  }, [setCurrentPage]);

  const handleDoubleClick = useCallback((pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setEditingName(currentName);
  }, []);

  const handleRenameSubmit = useCallback(() => {
    if (editingPageId && editingName.trim()) {
      renamePage(editingPageId, editingName.trim());
    }
    setEditingPageId(null);
    setEditingName('');
  }, [editingPageId, editingName, renamePage]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingPageId(null);
      setEditingName('');
    }
  }, [handleRenameSubmit]);

  const handleContextMenu = useCallback((e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    setShowContextMenu({ pageId, x: e.clientX, y: e.clientY });
  }, []);

  const handleDeletePage = useCallback((pageId: string) => {
    if (pages.length > 1) {
      deletePage(pageId);
    }
    setShowContextMenu(null);
  }, [pages.length, deletePage]);

  // Close context menu when clicking outside
  React.useEffect(() => {
    if (showContextMenu) {
      const handleClick = () => setShowContextMenu(null);
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showContextMenu]);

  const currentPage = pages.find(p => p.id === currentPageId);

  return (
    <div className="page-manager">
      <div className="page-tabs">
        {pages.map(page => (
          <div
            key={page.id}
            className={`page-tab ${page.id === currentPageId ? 'active' : ''}`}
            onClick={() => handlePageClick(page.id)}
            onDoubleClick={() => handleDoubleClick(page.id, page.name)}
            onContextMenu={(e) => handleContextMenu(e, page.id)}
          >
            {editingPageId === page.id ? (
              <input
                type="text"
                className="page-name-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleRenameKeyDown}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="page-icon">📄</span>
                <span className="page-name">{page.name}</span>
              </>
            )}
          </div>
        ))}
        <button className="add-page-btn" onClick={handleAddPage} title="添加页面">
          +
        </button>
      </div>

      {/* Page Properties */}
      {currentPage && (
        <div className="page-properties">
          <div className="page-prop-row">
            <label>背景色</label>
            <input
              type="color"
              value={currentPage.backgroundColor || '#ffffff'}
              onChange={(e) => updatePageBackground(currentPage.id, e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div 
          className="page-context-menu"
          style={{ left: showContextMenu.x, top: showContextMenu.y }}
        >
          <button 
            onClick={() => {
              const page = pages.find(p => p.id === showContextMenu.pageId);
              if (page) {
                handleDoubleClick(page.id, page.name);
              }
              setShowContextMenu(null);
            }}
          >
            重命名
          </button>
          <button 
            onClick={() => handleDeletePage(showContextMenu.pageId)}
            disabled={pages.length <= 1}
            className={pages.length <= 1 ? 'disabled' : ''}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
};

export default PageManager;
