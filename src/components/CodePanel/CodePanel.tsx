// Code Preview Panel Component

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../store/editorStore';
import { useLogicEditorStore } from '../LogicEditor';
import { useResourceStore } from '../../resources/resourceStore';
import { TARGETS, generateTargetSource, generateTargetProject, type OutputInput, type OutputBundle } from '../../output';
import type { CodeGenOptions } from '../../codegen/types';
import { useAppStore } from '../../store/appStore';
import { describeOutputError, downloadOutputZip } from '../../utils/outputDownload';
import { t } from '../../i18n';
import { DEFAULT_CODEGEN_OPTIONS } from '../../codegen/types';
import { toast } from '../Toast';
import './CodePanel.css';

type FileName = string;

const CodePanel: React.FC = () => {
  const { pages } = useEditorStore();
  const { graphs: logicGraphs } = useLogicEditorStore();
  const imageResources = useResourceStore((s) => s.images);
  const fontResources = useResourceStore((s) => s.fonts);
  const outputTarget = useAppStore(s => s.outputTarget);
  const cIntegrationProfile = useAppStore(s => s.cIntegrationProfile);
  const target = TARGETS.find(candidate => candidate.id === outputTarget)!;
  
  // Selected file
  const [selectedFile, setSelectedFile] = useState<FileName>('ui.h');
  
  // Code generation options
  const [options, setOptions] = useState<CodeGenOptions>(DEFAULT_CODEGEN_OPTIONS);
  
  // Show options panel
  const [showOptions, setShowOptions] = useState(false);
  
  // Exporting state
  const [isExporting, setIsExporting] = useState(false);
  const [prepared, setPrepared] = useState<{ input: OutputInput; bundle: OutputBundle | null; error: string }>();
  const input = useMemo<OutputInput>(() => ({ target: outputTarget, cIntegrationProfile, pages, options, logicGraphs, images: imageResources, fonts: fontResources }), [outputTarget, cIntegrationProfile, pages, options, logicGraphs, imageResources, fontResources]);
  
  // Generate code
  const source = useMemo(() => {
    try {
      return { bundle: generateTargetSource(input), error: '' };
    } catch (error) { return { bundle: null, error: describeOutputError(error) }; }
  }, [input]);
  useEffect(() => {
    let cancelled = false;
    generateTargetProject(input)
      .then(bundle => { if (!cancelled) setPrepared({ input, bundle, error: '' }); })
      .catch(error => { if (!cancelled) setPrepared({ input, bundle: null, error: describeOutputError(error) }); });
    return () => { cancelled = true; };
  }, [input]);
  const generatedCode = prepared?.input === input ? prepared : source;
  const preparing = prepared?.input !== input;
  
  // Current file content
  const files = generatedCode.bundle?.files ?? {};
  
  // File names
  const fileNames = Object.keys(files).filter(name => typeof files[name] === 'string');
  const activeFile = fileNames.includes(selectedFile) ? selectedFile : fileNames[0] ?? '';
  const currentContent = activeFile ? String(files[activeFile]) : '';
  
  // Handle option change
  const handleOptionChange = useCallback(<K extends keyof CodeGenOptions>(
    key: K,
    value: CodeGenOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Handle export
  const handleExport = useCallback(async () => {
    if (preparing || !generatedCode.bundle) return;
    setIsExporting(true);
    try {
      await downloadOutputZip(generatedCode.bundle, `lvgl_ui-${outputTarget}.zip`);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(describeOutputError(error));
    } finally {
      setIsExporting(false);
    }
  }, [outputTarget, generatedCode, preparing]);
  
  // Handle copy
  const handleCopy = useCallback(() => {
    if (preparing || !generatedCode.bundle) return;
    navigator.clipboard.writeText(currentContent).then(() => {
      // Could show a toast notification here
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }, [currentContent, preparing, generatedCode]);
  
  return (
    <div className="code-panel">
      {/* Toolbar */}
      <div className="code-panel-toolbar">
        <div className="toolbar-left">
          {/* File selector */}
          <select 
            value={activeFile}
            onChange={(e) => setSelectedFile(e.target.value as FileName)}
            className="file-selector"
          >
            {fileNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        
        <div className="toolbar-right">
          <button 
            className="toolbar-btn"
            onClick={handleCopy}
            disabled={!activeFile || preparing}
            title={t("复制代码")}
          >
            {t("📋 复制")}</button>
          
          <button 
            className="toolbar-btn"
            onClick={() => setShowOptions(!showOptions)}
            title={t("代码生成选项")}
          >
            {t("⚙️ 选项")}</button>
          
          <button 
            className="toolbar-btn export-btn"
            onClick={handleExport}
            disabled={isExporting || !generatedCode.bundle || preparing}
            title={t("导出为 ZIP")}
          >
            {isExporting ? '导出中...' : '📦 导出 ZIP'}
          </button>
        </div>
      </div>
      
      {/* Options Panel */}
      {showOptions && outputTarget === 'c-lvgl' && (
        <div className="options-panel">
          <div className="options-grid">
            <div className="option-item">
              <label>{t("LVGL 版本")}</label>
              <select 
                value={options.lvglVersion}
                onChange={(e) => handleOptionChange('lvglVersion', e.target.value as '8' | '9')}
              >
                <option value="8">v8.x</option>
                <option value="9">v9.x</option>
              </select>
            </div>
            
            <div className="option-item">
              <label>{t("命名风格")}</label>
              <select 
                value={options.namingStyle}
                onChange={(e) => handleOptionChange('namingStyle', e.target.value as 'snake_case' | 'camelCase')}
              >
                <option value="snake_case">snake_case</option>
                <option value="camelCase">camelCase</option>
              </select>
            </div>
            
            <div className="option-item">
              <label>{t("缩进风格")}</label>
              <select 
                value={options.indentStyle}
                onChange={(e) => handleOptionChange('indentStyle', e.target.value as 'spaces' | 'tabs')}
              >
                <option value="spaces">{t("空格")}</option>
                <option value="tabs">Tab</option>
              </select>
            </div>
            
            <div className="option-item">
              <label>{t("缩进大小")}</label>
              <select 
                value={options.indentSize}
                onChange={(e) => handleOptionChange('indentSize', parseInt(e.target.value))}
                disabled={options.indentStyle === 'tabs'}
              >
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
              </select>
            </div>
            
            <div className="option-item checkbox-item">
              <label>
                <input 
                  type="checkbox"
                  checked={options.generateComments}
                  onChange={(e) => handleOptionChange('generateComments', e.target.checked)}
                />
                {t("生成注释")}</label>
            </div>
            
            <div className="option-item checkbox-item">
              <label>
                <input 
                  type="checkbox"
                  checked={options.userCodeMarkers}
                  onChange={(e) => handleOptionChange('userCodeMarkers', e.target.checked)}
                />
                {t("用户代码标记")}</label>
            </div>
          </div>
        </div>
      )}
      
      {/* Code Editor */}
      {generatedCode.error && <pre role="alert">{generatedCode.error}</pre>}
      {preparing && !generatedCode.error && <p role="status">{t('Preparing output resources...')}</p>}
      {generatedCode.bundle && !generatedCode.bundle.deployable && <p role="status">{t('Contract preview only. This target is not verified for deployment.')}</p>}
      <div className="code-editor-container">
        <Editor
          height="100%"
          language={target.language}
          value={currentContent}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default CodePanel;
