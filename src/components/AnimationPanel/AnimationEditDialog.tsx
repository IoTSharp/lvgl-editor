import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Animation, AnimationType, AnimationEasing } from '../../types';
import './AnimationPanel.css';

interface AnimationEditDialogProps {
  animation: Animation | null;
  isCreating: boolean;
  targetComponentId: string;
  onSave: (animation: Animation) => void;
  onClose: () => void;
}

const ANIMATION_TYPES: { type: AnimationType; label: string }[] = [
  { type: 'fade_in', label: '淡入' },
  { type: 'fade_out', label: '淡出' },
  { type: 'slide_left', label: '左滑入' },
  { type: 'slide_right', label: '右滑入' },
  { type: 'slide_up', label: '上滑入' },
  { type: 'slide_down', label: '下滑入' },
  { type: 'zoom_in', label: '放大' },
  { type: 'zoom_out', label: '缩小' },
  { type: 'custom', label: '自定义' },
];

const EASING_OPTIONS: { type: AnimationEasing; label: string }[] = [
  { type: 'linear', label: '线性' },
  { type: 'ease_in', label: '缓入' },
  { type: 'ease_out', label: '缓出' },
  { type: 'ease_in_out', label: '缓入缓出' },
  { type: 'overshoot', label: '过冲' },
  { type: 'bounce', label: '弹跳' },
];

const PROPERTY_OPTIONS = [
  { value: 'opa', label: '透明度 (opa)' },
  { value: 'x', label: 'X 坐标' },
  { value: 'y', label: 'Y 坐标' },
  { value: 'width', label: '宽度' },
  { value: 'height', label: '高度' },
  { value: 'transform_zoom', label: '缩放 (transform_zoom)' },
  { value: 'transform_angle', label: '旋转角度 (transform_angle)' },
];

function getDefaultsForType(type: AnimationType): { property: string; startValue: number; endValue: number } {
  switch (type) {
    case 'fade_in': return { property: 'opa', startValue: 0, endValue: 255 };
    case 'fade_out': return { property: 'opa', startValue: 255, endValue: 0 };
    case 'slide_left': return { property: 'x', startValue: -100, endValue: 0 };
    case 'slide_right': return { property: 'x', startValue: 100, endValue: 0 };
    case 'slide_up': return { property: 'y', startValue: -100, endValue: 0 };
    case 'slide_down': return { property: 'y', startValue: 100, endValue: 0 };
    case 'zoom_in': return { property: 'transform_zoom', startValue: 128, endValue: 256 };
    case 'zoom_out': return { property: 'transform_zoom', startValue: 256, endValue: 128 };
    case 'custom': return { property: 'opa', startValue: 0, endValue: 255 };
  }
}

const AnimationEditDialog: React.FC<AnimationEditDialogProps> = ({
  animation,
  isCreating,
  targetComponentId,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(animation?.name || '');
  const [type, setType] = useState<AnimationType>(animation?.type || 'fade_in');
  const [easing, setEasing] = useState<AnimationEasing>(animation?.easing || 'ease_in_out');
  const [duration, setDuration] = useState(animation?.duration ?? 300);
  const [delay, setDelay] = useState(animation?.delay ?? 0);
  const [repeat, setRepeat] = useState(animation?.repeat ?? 0);
  const [property, setProperty] = useState(animation?.property || 'opa');
  const [startValue, setStartValue] = useState(animation?.startValue ?? 0);
  const [endValue, setEndValue] = useState(animation?.endValue ?? 255);

  const handleTypeChange = useCallback((newType: AnimationType) => {
    setType(newType);
    if (newType !== 'custom') {
      const defaults = getDefaultsForType(newType);
      setProperty(defaults.property);
      setStartValue(defaults.startValue);
      setEndValue(defaults.endValue);
    }
  }, []);

  const handleSave = useCallback(() => {
    const anim: Animation = {
      id: animation?.id || uuidv4(),
      name: name || ANIMATION_TYPES.find(t => t.type === type)?.label || type,
      targetComponentId,
      type,
      easing,
      duration,
      delay,
      repeat,
      property,
      startValue,
      endValue,
    };
    onSave(anim);
  }, [animation, name, targetComponentId, type, easing, duration, delay, repeat, property, startValue, endValue, onSave]);

  return (
    <div className="anim-dialog-overlay" onClick={onClose}>
      <div className="anim-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{isCreating ? '添加动画' : '编辑动画'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content">
          <div className="form-section">
            <label className="section-label">动画名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="可选，留空使用默认名称"
            />
          </div>

          <div className="form-section">
            <label className="section-label">动画类型</label>
            <select value={type} onChange={(e) => handleTypeChange(e.target.value as AnimationType)}>
              {ANIMATION_TYPES.map(t => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <label className="section-label">缓动函数</label>
            <select value={easing} onChange={(e) => setEasing(e.target.value as AnimationEasing)}>
              {EASING_OPTIONS.map(e => (
                <option key={e.type} value={e.type}>{e.label}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-section">
              <label className="section-label">时长 (ms)</label>
              <input type="number" value={duration} min={0} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div className="form-section">
              <label className="section-label">延迟 (ms)</label>
              <input type="number" value={delay} min={0} onChange={(e) => setDelay(Number(e.target.value))} />
            </div>
            <div className="form-section">
              <label className="section-label">重复次数</label>
              <input type="number" value={repeat} min={0} onChange={(e) => setRepeat(Number(e.target.value))} />
              <p className="field-hint">0 = 不重复</p>
            </div>
          </div>

          <div className="form-section">
            <label className="section-label">动画属性</label>
            <select value={property} onChange={(e) => setProperty(e.target.value)}>
              {PROPERTY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-section">
              <label className="section-label">起始值</label>
              <input type="number" value={startValue} onChange={(e) => setStartValue(Number(e.target.value))} />
            </div>
            <div className="form-section">
              <label className="section-label">结束值</label>
              <input type="number" value={endValue} onChange={(e) => setEndValue(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button className="save-btn" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

export default AnimationEditDialog;
