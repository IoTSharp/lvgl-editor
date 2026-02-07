import React from 'react';
import './HelpPanel.css';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: '基本操作',
    shortcuts: [
      { keys: 'Ctrl + Z', description: '撤销' },
      { keys: 'Ctrl + Shift + Z', description: '重做' },
      { keys: 'Ctrl + Y', description: '重做' },
      { keys: 'Delete / Backspace', description: '删除选中组件' },
      { keys: 'Escape', description: '取消选择' },
    ],
  },
  {
    title: '选择操作',
    shortcuts: [
      { keys: 'Ctrl + A', description: '全选' },
      { keys: 'Ctrl + 点击', description: '多选/切换选择' },
      { keys: '鼠标拖拽', description: '框选多个组件' },
    ],
  },
  {
    title: '剪贴板',
    shortcuts: [
      { keys: 'Ctrl + C', description: '复制' },
      { keys: 'Ctrl + X', description: '剪切' },
      { keys: 'Ctrl + V', description: '粘贴' },
      { keys: 'Ctrl + D', description: '复制并粘贴（快速复制）' },
    ],
  },
  {
    title: '画布操作',
    shortcuts: [
      { keys: 'Space + 拖拽', description: '平移画布' },
      { keys: '鼠标中键拖拽', description: '平移画布' },
      { keys: 'Ctrl + 滚轮', description: '缩放画布' },
    ],
  },
  {
    title: '其他',
    shortcuts: [
      { keys: 'F1 / ?', description: '显示快捷键帮助' },
      { keys: 'Ctrl + S', description: '保存项目' },
      { keys: 'Ctrl + O', description: '打开项目' },
      { keys: 'Ctrl + N', description: '新建项目' },
    ],
  },
];

const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="help-panel-overlay" onClick={onClose}>
      <div className="help-panel" onClick={e => e.stopPropagation()}>
        <div className="help-panel-header">
          <h2>⌨️ 快捷键帮助</h2>
          <button className="help-panel-close" onClick={onClose}>×</button>
        </div>
        <div className="help-panel-content">
          {shortcutGroups.map((group, index) => (
            <div key={index} className="shortcut-group">
              <h3>{group.title}</h3>
              <div className="shortcut-list">
                {group.shortcuts.map((shortcut, idx) => (
                  <div key={idx} className="shortcut-item">
                    <kbd className="shortcut-keys">{shortcut.keys}</kbd>
                    <span className="shortcut-desc">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="help-panel-footer">
          <span>按 Escape 或点击外部关闭</span>
        </div>
      </div>
    </div>
  );
};

export default HelpPanel;
