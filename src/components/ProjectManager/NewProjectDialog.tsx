import React, { useState } from 'react';
import type { DisplayConfig, LvglConfig } from '../../store/projectStore';
import { DEFAULT_DISPLAY, DEFAULT_LVGL_CONFIG } from '../../store/projectStore';
import './NewProjectDialog.css';

interface NewProjectDialogProps {
  onClose: () => void;
  onCreate: (name: string, display: DisplayConfig, lvglConfig: LvglConfig) => void;
}

const RESOLUTION_PRESETS: { label: string; w: number; h: number }[] = [
  { label: '240×320 (QVGA)', w: 240, h: 320 },
  { label: '320×480 (HVGA)', w: 320, h: 480 },
  { label: '480×320 (TFT)', w: 480, h: 320 },
  { label: '480×272', w: 480, h: 272 },
  { label: '800×480 (WVGA)', w: 800, h: 480 },
  { label: '1024×600', w: 1024, h: 600 },
];

const FONT_OPTIONS = [
  'montserrat_14',
  'montserrat_16',
  'montserrat_20',
  'montserrat_24',
  'montserrat_28',
  'montserrat_32',
];

const NewProjectDialog: React.FC<NewProjectDialogProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [preset, setPreset] = useState('480×320 (TFT)');
  const [customW, setCustomW] = useState(DEFAULT_DISPLAY.width);
  const [customH, setCustomH] = useState(DEFAULT_DISPLAY.height);
  const [colorDepth, setColorDepth] = useState<16 | 24 | 32>(DEFAULT_DISPLAY.colorDepth);
  const [fontLarge, setFontLarge] = useState(DEFAULT_LVGL_CONFIG.fontLarge);
  const [defaultFont, setDefaultFont] = useState(DEFAULT_LVGL_CONFIG.defaultFont);
  const [memSize, setMemSize] = useState(DEFAULT_LVGL_CONFIG.memSize);

  const isCustom = preset === 'custom';

  const getResolution = (): { w: number; h: number } => {
    if (isCustom) return { w: customW, h: customH };
    const found = RESOLUTION_PRESETS.find(p => p.label === preset);
    return found ? { w: found.w, h: found.h } : { w: 480, h: 320 };
  };

  const handlePresetChange = (value: string) => {
    setPreset(value);
    if (value !== 'custom') {
      const found = RESOLUTION_PRESETS.find(p => p.label === value);
      if (found) {
        setCustomW(found.w);
        setCustomH(found.h);
      }
    }
  };

  const handleCreate = () => {
    const projectName = name.trim() || '未命名项目';
    const { w, h } = getResolution();
    const colorFormat = colorDepth === 16 ? 'RGB565' : colorDepth === 24 ? 'RGB888' : 'ARGB8888';
    const display: DisplayConfig = { width: w, height: h, colorDepth, rotation: 0 };
    const lvglConfig: LvglConfig = {
      version: '9',
      colorFormat,
      fontLarge,
      defaultFont,
      memSize,
    };
    onCreate(projectName, display, lvglConfig);
  };

  return (
    <div className="modal-global-overlay" onClick={onClose}>
      <div className="modal-dialog new-project-dialog" onClick={e => e.stopPropagation()}>
        <div className="new-project-title">新建项目</div>
        <div className="new-project-body">
          {/* Name */}
          <label className="npd-label">
            项目名称
            <input
              className="npd-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="未命名项目"
              autoFocus
            />
          </label>

          {/* Resolution */}
          <label className="npd-label">
            画布尺寸
            <select className="npd-select" value={preset} onChange={e => handlePresetChange(e.target.value)}>
              {RESOLUTION_PRESETS.map(p => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
              <option value="custom">自定义</option>
            </select>
          </label>

          {isCustom && (
            <div className="npd-row">
              <label className="npd-label npd-half">
                宽度
                <input className="npd-input" type="number" min={100} max={2048} value={customW} onChange={e => setCustomW(Number(e.target.value))} />
              </label>
              <label className="npd-label npd-half">
                高度
                <input className="npd-input" type="number" min={100} max={2048} value={customH} onChange={e => setCustomH(Number(e.target.value))} />
              </label>
            </div>
          )}

          {/* Color depth */}
          <label className="npd-label">
            色深
            <select className="npd-select" value={colorDepth} onChange={e => setColorDepth(Number(e.target.value) as 16 | 24 | 32)}>
              <option value={16}>16 bit (RGB565)</option>
              <option value={24}>24 bit (RGB888)</option>
              <option value={32}>32 bit (ARGB8888)</option>
            </select>
          </label>

          <div className="npd-section-title">LVGL 配置</div>

          {/* Font large */}
          <label className="npd-label npd-checkbox-label">
            <input type="checkbox" checked={fontLarge} onChange={e => setFontLarge(e.target.checked)} />
            LV_FONT_FMT_TXT_LARGE（大字体支持）
          </label>

          {/* Default font */}
          <label className="npd-label">
            默认字体
            <select className="npd-select" value={defaultFont} onChange={e => setDefaultFont(e.target.value)}>
              {FONT_OPTIONS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          {/* Memory size */}
          <label className="npd-label">
            内存大小 (KB)
            <input className="npd-input" type="number" min={16} max={1024} step={8} value={memSize} onChange={e => setMemSize(Number(e.target.value))} />
          </label>
        </div>

        <div className="modal-dialog-footer">
          <button className="modal-dialog-btn modal-btn-cancel" onClick={onClose}>取消</button>
          <button className="modal-dialog-btn modal-btn-confirm" onClick={handleCreate}>创建</button>
        </div>
      </div>
    </div>
  );
};

export default NewProjectDialog;
