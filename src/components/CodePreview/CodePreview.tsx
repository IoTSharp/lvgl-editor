import React, { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../store/editorStore';
import { useThemeStore } from '../../store/themeStore';
import { useLogicEditorStore } from '../LogicEditor';
import { useResourceStore } from '../../resources/resourceStore';
import { useAppStore } from '../../store/appStore';
import { useProjectStore, type ProjectConfig } from '../../store/projectStore';
import { TARGETS, generateTargetSource, generateTargetProject, type OutputInput, type OutputBundle } from '../../output';
import type { CodeGenOptions } from '../../codegen/types';
import { describeOutputError, downloadBlob, downloadOutputZip } from '../../utils/outputDownload';
import { toast } from '../Toast';
import { t } from '../../i18n';
import './CodePreview.css';

const CodePreview: React.FC = () => {
  const pages = useEditorStore(s => s.pages);
  const logicGraphs = useLogicEditorStore(s => s.graphs);
  const currentTheme = useThemeStore(s => s.currentTheme);
  const images = useResourceStore(s => s.images);
  const fonts = useResourceStore(s => s.fonts);
  const { currentProjectId, outputTarget, cIntegrationProfile } = useAppStore();
  const { getProjectConfig, projects } = useProjectStore();
  const configRevision = projects.find(p => p.config.id === currentProjectId)?.config.updatedAt;
  const [config, setConfig] = useState<ProjectConfig>();
  const [selectedFile, setSelectedFile] = useState('ui.c');
  const [lvglVersion, setLvglVersion] = useState<CodeGenOptions['lvglVersion']>('9');
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<{ input: OutputInput; bundle: OutputBundle | null; error: string }>();

  useEffect(() => {
    let cancelled = false;
    if (currentProjectId) getProjectConfig(currentProjectId)
      .then(cfg => { if (!cancelled) setConfig(cfg); })
      .catch(error => { if (!cancelled) toast.error(describeOutputError(error)); });
    return () => { cancelled = true; };
  }, [currentProjectId, configRevision, getProjectConfig]);

  const input = useMemo<OutputInput>(() => ({
    target: outputTarget, cIntegrationProfile, pages, logicGraphs, theme: currentTheme, images, fonts,
    options: { lvglVersion }, defaultFont: config?.lvglConfig.defaultFont,
    defaultFontSize: config?.lvglConfig.defaultFontSize,
    useBuiltinSymbols: config?.lvglConfig.useBuiltinSymbols,
    symbolFont: config?.lvglConfig.symbolFont,
  }), [outputTarget, cIntegrationProfile, pages, logicGraphs, currentTheme, images, fonts, lvglVersion, config]);

  const source = useMemo(() => {
    try { return { bundle: generateTargetSource(input), error: '' }; }
    catch (error) { return { bundle: null, error: describeOutputError(error) }; }
  }, [input]);
  useEffect(() => {
    let cancelled = false;
    generateTargetProject(input)
      .then(bundle => { if (!cancelled) setPrepared({ input, bundle, error: '' }); })
      .catch(error => { if (!cancelled) setPrepared({ input, bundle: null, error: describeOutputError(error) }); });
    return () => { cancelled = true; };
  }, [input]);
  const result = prepared?.input === input ? prepared : source;
  const preparing = prepared?.input !== input || (currentProjectId !== null && config?.id !== currentProjectId);
  const files = result.bundle?.files ?? {};
  const fileNames = Object.keys(files).filter(name => typeof files[name] === 'string');
  const activeFile = fileNames.includes(selectedFile) ? selectedFile : fileNames[0] ?? '';
  const currentCode = activeFile ? String(files[activeFile]) : '';
  const target = TARGETS.find(candidate => candidate.id === outputTarget)!;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(currentCode); toast.success(t('Code copied to clipboard')); }
    catch { toast.error(t('Copy failed')); }
  };
  const handleDownload = () => {
    if (!result.bundle || !activeFile || preparing) return;
    downloadBlob(new Blob([currentCode], { type: 'text/plain' }), activeFile.split('/').pop() || activeFile);
  };
  const handleDownloadAll = async () => {
    if (busy || preparing || !result.bundle) return;
    setBusy(true);
    try {
      const name = (config?.name || 'lvgl_ui').replace(/[^\p{L}\p{N}._-]+/gu, '_');
      await downloadOutputZip(result.bundle, `${name}-${outputTarget}.zip`);
      toast.success(t('ZIP downloaded'));
    } catch (error) { toast.error(describeOutputError(error)); }
    finally { setBusy(false); }
  };

  return <div className="code-preview">
    <div className="code-preview-header">
      <div className="code-preview-tabs">
        {fileNames.map(fileName => <button key={fileName} className={`code-tab ${activeFile === fileName ? 'active' : ''}`} onClick={() => setSelectedFile(fileName)}>{fileName}</button>)}
      </div>
      <div className="code-preview-actions">
        <span>{target.label}</span>
        {outputTarget === 'c-lvgl' && <select className="code-version-select" value={lvglVersion} onChange={e => setLvglVersion(e.target.value as CodeGenOptions['lvglVersion'])} title={t('LVGL version')}>
          <option value="8">LVGL v8</option><option value="9">LVGL v9</option>
        </select>}
        <button className="code-action-btn" onClick={handleCopy} disabled={!activeFile || preparing}>{t('Copy')}</button>
        <button className="code-action-btn" onClick={handleDownload} disabled={!activeFile || busy || preparing}>{t('Download')}</button>
        <button className="code-action-btn primary" onClick={handleDownloadAll} disabled={!result.bundle || busy || preparing}>{busy ? t('Exporting...') : t('Download ZIP')}</button>
      </div>
    </div>
    {result.error && <pre role="alert">{result.error}</pre>}
    {preparing && !result.error && <p role="status">{t('Preparing output resources...')}</p>}
    {result.bundle && !result.bundle.deployable && <p role="status">{t('Contract preview only. This target is not verified for deployment.')}</p>}
    <div className="code-preview-editor"><div className="code-preview-editor-inner">
      <Editor width="100%" height="100%" language={target.language} theme="vs-light" value={currentCode}
        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'off', automaticLayout: true, folding: true }}
        loading={<div className="code-preview-loading">{t('Loading editor...')}</div>} />
    </div></div>
    <div className="code-preview-footer"><span className="code-stats">{currentCode.split('\n').length} {t('lines |')} {new Blob([currentCode]).size} {t('bytes')}</span></div>
  </div>;
};

export default CodePreview;
