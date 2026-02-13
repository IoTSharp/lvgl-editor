import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useProjectStore } from '../../store/projectStore';
import type { ProjectConfig } from '../../store/projectStore';
import { useEditorStore } from '../../store/editorStore';
import { useResourceStore } from '../../resources/resourceStore';
import { toast } from '../Toast';
import './ProjectSettings.css';

const FONT_OPTIONS = [
  'montserrat_14',
  'montserrat_16',
  'montserrat_20',
  'montserrat_24',
  'montserrat_28',
  'montserrat_32',
];

const ProjectSettings: React.FC = () => {
  const { currentProjectId, setShowProjectSettings } = useAppStore();
  const { getProjectConfig, updateProjectConfig } = useProjectStore();
  const { setCanvasSize } = useEditorStore();
  const fonts = useResourceStore((s) => s.fonts);

  const [config, setConfig] = useState<ProjectConfig | null>(null);
  const [name, setName] = useState('');
  const [width, setWidth] = useState(480);
  const [height, setHeight] = useState(320);
  const [colorDepth, setColorDepth] = useState<16 | 24 | 32>(32);
  const [fontLarge, setFontLarge] = useState(true);
  const [defaultFont, setDefaultFont] = useState('montserrat_14');
  const [memSize, setMemSize] = useState(64);

  useEffect(() => {
    if (!currentProjectId) return;
    getProjectConfig(currentProjectId).then(cfg => {
      if (!cfg) return;
      setConfig(cfg);
      setName(cfg.name);
      setWidth(cfg.display.width);
      setHeight(cfg.display.height);
      setColorDepth(cfg.display.colorDepth);
      setFontLarge(cfg.lvglConfig.fontLarge);
      setDefaultFont(cfg.lvglConfig.defaultFont);
      setMemSize(cfg.lvglConfig.memSize);
    });
  }, [currentProjectId, getProjectConfig]);

  const handleSave = async () => {
    if (!config) return;
    const colorFormat = colorDepth === 16 ? 'RGB565' as const : colorDepth === 24 ? 'RGB888' as const : 'ARGB8888' as const;
    const lvglChanged =
      config.lvglConfig.colorFormat !== colorFormat ||
      config.lvglConfig.fontLarge !== fontLarge ||
      config.lvglConfig.defaultFont !== defaultFont ||
      config.lvglConfig.memSize !== memSize;

    const updated: ProjectConfig = {
      ...config,
      name: name.trim() || config.name,
      display: { ...config.display, width, height, colorDepth },
      lvglConfig: { ...config.lvglConfig, colorFormat, fontLarge, defaultFont, memSize },
    };
    await updateProjectConfig(updated);
    setCanvasSize(width, height);
    setShowProjectSettings(false);
    toast.success('项目设置已保存');
    if (lvglChanged) {
      toast.info('LVGL 配置已更改，编译预览时将使用新配置');
    }
  };

  const handleClose = () => setShowProjectSettings(false);

  if (!config) return null;

  return (
    <div className="modal-global-overlay" onClick={handleClose}>
      <div className="modal-dialog project-settings-dialog" onClick={e => e.stopPropagation()}>
        <div className="ps-title">项目设置</div>
        <div className="ps-body">
          <label className="npd-label">
            项目名称
            <input className="npd-input" type="text" value={name} onChange={e => setName(e.target.value)} />
          </label>

          <div className="npd-section-title">显示配置</div>

          <div className="npd-row">
            <label className="npd-label npd-half">
              宽度
              <input className="npd-input" type="number" min={100} max={2048} value={width} onChange={e => setWidth(Number(e.target.value))} />
            </label>
            <label className="npd-label npd-half">
              高度
              <input className="npd-input" type="number" min={100} max={2048} value={height} onChange={e => setHeight(Number(e.target.value))} />
            </label>
          </div>

          <label className="npd-label">
            色深
            <select className="npd-select" value={colorDepth} onChange={e => setColorDepth(Number(e.target.value) as 16 | 24 | 32)}>
              <option value={16}>16 bit (RGB565)</option>
              <option value={24}>24 bit (RGB888)</option>
              <option value={32}>32 bit (ARGB8888)</option>
            </select>
          </label>

          <div className="npd-section-title">LVGL 配置</div>

          <label className="npd-label npd-checkbox-label">
            <input type="checkbox" checked={fontLarge} onChange={e => setFontLarge(e.target.checked)} />
            LV_FONT_FMT_TXT_LARGE（大字体支持）
          </label>

          <label className="npd-label">
            默认字体
            <select className="npd-select" value={defaultFont} onChange={e => setDefaultFont(e.target.value)}>
              <optgroup label="内置字体">
                {FONT_OPTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </optgroup>
              {fonts.length > 0 && (
                <optgroup label="已上传字体">
                  {fonts.map(f => (
                    <option key={f.id} value={f.cFontName}>{f.name} ({f.family})</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          <label className="npd-label">
            内存大小 (KB)
            <input className="npd-input" type="number" min={16} max={1024} step={8} value={memSize} onChange={e => setMemSize(Number(e.target.value))} />
          </label>
        </div>

        <div className="modal-dialog-footer">
          <button className="modal-dialog-btn modal-btn-cancel" onClick={handleClose}>取消</button>
          <button className="modal-dialog-btn modal-btn-confirm" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettings;
