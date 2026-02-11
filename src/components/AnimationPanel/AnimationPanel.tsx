import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { Animation, AnimationType } from '../../types';
import AnimationEditDialog from './AnimationEditDialog';
import './AnimationPanel.css';

const ANIM_TYPE_LABELS: Record<AnimationType, string> = {
  fade_in: '淡入',
  fade_out: '淡出',
  slide_left: '左滑入',
  slide_right: '右滑入',
  slide_up: '上滑入',
  slide_down: '下滑入',
  zoom_in: '放大',
  zoom_out: '缩小',
  custom: '自定义',
};

const ANIM_TYPE_ICONS: Record<AnimationType, string> = {
  fade_in: '🌅',
  fade_out: '🌇',
  slide_left: '⬅️',
  slide_right: '➡️',
  slide_up: '⬆️',
  slide_down: '⬇️',
  zoom_in: '🔍',
  zoom_out: '🔎',
  custom: '⚙️',
};

const AnimationPanel: React.FC = () => {
  const { selection, getComponentById, updateComponent } = useEditorStore();
  const [editingAnim, setEditingAnim] = useState<Animation | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedId = selection.selectedIds[0];
  const component = selectedId ? getComponentById(selectedId) : undefined;
  const animations = component?.animations || [];

  const handleAddAnim = useCallback(() => {
    setEditingAnim(null);
    setIsCreating(true);
    setIsDialogOpen(true);
  }, []);

  const handleEditAnim = useCallback((anim: Animation) => {
    setEditingAnim(anim);
    setIsCreating(false);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteAnim = useCallback((animId: string) => {
    if (!selectedId || !component) return;
    const newAnims = animations.filter(a => a.id !== animId);
    updateComponent(selectedId, { animations: newAnims });
  }, [selectedId, component, animations, updateComponent]);

  const handleSaveAnim = useCallback((anim: Animation) => {
    if (!selectedId || !component) return;
    if (isCreating) {
      updateComponent(selectedId, { animations: [...animations, anim] });
    } else {
      updateComponent(selectedId, {
        animations: animations.map(a => a.id === anim.id ? anim : a),
      });
    }
    setIsDialogOpen(false);
  }, [selectedId, component, animations, isCreating, updateComponent]);

  if (!component) {
    return (
      <div className="animation-panel">
        <div className="panel-header">
          <h3>🎬 动画</h3>
        </div>
        <div className="anim-no-selection">
          <p>请选择一个组件</p>
          <p className="hint">选中组件后可添加动画</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animation-panel">
      <div className="panel-header">
        <h3>🎬 动画</h3>
        <button className="add-anim-btn" onClick={handleAddAnim} title="添加动画">+</button>
      </div>
      <div className="anim-list">
        {animations.length === 0 ? (
          <div className="no-anims">
            <p>暂无动画</p>
            <button className="add-first-anim" onClick={handleAddAnim}>
              + 添加第一个动画
            </button>
          </div>
        ) : (
          animations.map(anim => (
            <div key={anim.id} className="anim-item">
              <div className="anim-info" onClick={() => handleEditAnim(anim)}>
                <div className="anim-type">
                  <span className="anim-icon">{ANIM_TYPE_ICONS[anim.type] || '⚙️'}</span>
                  {anim.name || ANIM_TYPE_LABELS[anim.type] || anim.type}
                </div>
                <div className="anim-detail">
                  {anim.duration}ms · {anim.easing} · {anim.property}: {anim.startValue}→{anim.endValue}
                </div>
              </div>
              <div className="anim-actions">
                <button className="anim-edit-btn" onClick={() => handleEditAnim(anim)} title="编辑">✏️</button>
                <button className="anim-delete-btn" onClick={() => handleDeleteAnim(anim.id)} title="删除">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
      {isDialogOpen && (
        <AnimationEditDialog
          animation={editingAnim}
          isCreating={isCreating}
          targetComponentId={selectedId}
          onSave={handleSaveAnim}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default AnimationPanel;
