import { useEffect, useMemo, useRef, useState } from 'react';
import { isDesktopHostAvailable } from '../../utils/desktopHost';
import './DesktopMenuBar.css';

type EditorTab = 'design' | 'logic' | 'code' | 'preview';

interface MenuAction {
  id: string;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
}

interface DesktopMenuBarProps {
  projectName: string;
  activeTab: EditorTab;
  showResourcePanel: boolean;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onExportProject: () => void;
  onImportProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSelectTab: (tab: EditorTab) => void;
  onToggleResources: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

const DesktopMenuBar = ({
  projectName,
  activeTab,
  showResourcePanel,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onExportProject,
  onImportProject,
  onUndo,
  onRedo,
  onSelectTab,
  onToggleResources,
  onOpenSettings,
  onOpenHelp,
}: DesktopMenuBarProps) => {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const hostMode = isDesktopHostAvailable() ? 'Desktop' : 'Web';
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const menus = useMemo(
    () => [
      {
        id: 'file',
        label: '文件',
        items: [
          { id: 'new', label: '新建项目', shortcut: 'Ctrl+N', onClick: onNewProject },
          { id: 'open', label: '打开项目', shortcut: 'Ctrl+O', onClick: onOpenProject },
          { id: 'save', label: '保存项目', shortcut: 'Ctrl+S', onClick: onSaveProject },
          { id: 'export', label: '导出项目', onClick: onExportProject },
          { id: 'import', label: '导入项目', onClick: onImportProject },
        ] satisfies MenuAction[],
      },
      {
        id: 'edit',
        label: '编辑',
        items: [
          { id: 'undo', label: '撤销', shortcut: 'Ctrl+Z', onClick: onUndo },
          { id: 'redo', label: '重做', shortcut: 'Ctrl+Y', onClick: onRedo },
        ] satisfies MenuAction[],
      },
      {
        id: 'view',
        label: '视图',
        items: [
          { id: 'design', label: '设计视图', active: activeTab === 'design', onClick: () => onSelectTab('design') },
          { id: 'logic', label: '逻辑视图', active: activeTab === 'logic', onClick: () => onSelectTab('logic') },
          { id: 'code', label: '代码视图', active: activeTab === 'code', onClick: () => onSelectTab('code') },
          { id: 'preview', label: '预览视图', active: activeTab === 'preview', onClick: () => onSelectTab('preview') },
          { id: 'resources', label: showResourcePanel ? '隐藏资源面板' : '显示资源面板', active: showResourcePanel, onClick: onToggleResources },
          { id: 'settings', label: '项目设置', onClick: onOpenSettings },
        ] satisfies MenuAction[],
      },
      {
        id: 'help',
        label: '帮助',
        items: [
          { id: 'shortcuts', label: '快捷键帮助', shortcut: 'F1', onClick: onOpenHelp },
        ] satisfies MenuAction[],
      },
    ],
    [
      activeTab,
      onExportProject,
      onImportProject,
      onNewProject,
      onOpenHelp,
      onOpenProject,
      onOpenSettings,
      onRedo,
      onSaveProject,
      onSelectTab,
      onToggleResources,
      onUndo,
      showResourcePanel,
    ],
  );

  const handleMenuAction = (action: MenuAction) => {
    setOpenMenuId(null);
    action.onClick();
  };

  return (
    <div className="desktop-menu-bar" ref={containerRef}>
      <div className="desktop-menu-list">
        {menus.map(menu => (
          <div key={menu.id} className="desktop-menu-group">
            <button
              type="button"
              className={`desktop-menu-trigger ${openMenuId === menu.id ? 'active' : ''}`}
              onClick={() => setOpenMenuId(current => (current === menu.id ? null : menu.id))}
            >
              {menu.label}
            </button>
            {openMenuId === menu.id && (
              <div className="desktop-menu-dropdown">
                {menu.items.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`desktop-menu-item ${item.active ? 'active' : ''}`}
                    onClick={() => handleMenuAction(item)}
                  >
                    <span className="desktop-menu-item-label">{item.label}</span>
                    {item.shortcut && <span className="desktop-menu-shortcut">{item.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="desktop-menu-meta">
        <span className="desktop-menu-project">{projectName || 'LVGL UI Editor'}</span>
        <span className="desktop-menu-badge">{hostMode}</span>
      </div>
    </div>
  );
};

export default DesktopMenuBar;
