// Code Preview Panel Component

import React, { useState, useMemo, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../store/editorStore';
import { generateCode, getGeneratedFileNames, downloadAsZip } from '../../codegen';
import type { CodeGenOptions, GeneratedCode } from '../../codegen/types';
import { DEFAULT_CODEGEN_OPTIONS } from '../../codegen/types';
import { toast } from '../Toast';
import './CodePanel.css';

type FileName = keyof GeneratedCode;

const CodePanel: React.FC = () => {
  const { pages } = useEditorStore();
  
  // Selected file
  const [selectedFile, setSelectedFile] = useState<FileName>('ui.h');
  
  // Code generation options
  const [options, setOptions] = useState<CodeGenOptions>(DEFAULT_CODEGEN_OPTIONS);
  
  // Show options panel
  const [showOptions, setShowOptions] = useState(false);
  
  // Exporting state
  const [isExporting, setIsExporting] = useState(false);
  
  // Generate code
  const generatedCode = useMemo(() => {
    return generateCode(pages, options);
  }, [pages, options]);
  
  // Current file content
  const currentContent = generatedCode[selectedFile];
  
  // File names
  const fileNames = getGeneratedFileNames();
  
  // Handle option change
  const handleOptionChange = useCallback(<K extends keyof CodeGenOptions>(
    key: K,
    value: CodeGenOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      await downloadAsZip(pages, options, [], 'lvgl_ui.zip');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [pages, options]);
  
  // Handle copy
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(currentContent).then(() => {
      // Could show a toast notification here
    }).catch(err => {
      console.error('Copy failed:', err);
    });
  }, [currentContent]);
  
  return (
    <div className="code-panel">
      {/* Toolbar */}
      <div className="code-panel-toolbar">
        <div className="toolbar-left">
          {/* File selector */}
          <select 
            value={selectedFile}
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
            title="复制代码"
          >
            📋 复制
          </button>
          
          <button 
            className="toolbar-btn"
            onClick={() => setShowOptions(!showOptions)}
            title="代码生成选项"
          >
            ⚙️ 选项
          </button>
          
          <button 
            className="toolbar-btn export-btn"
            onClick={handleExport}
            disabled={isExporting}
            title="导出为 ZIP"
          >
            {isExporting ? '导出中...' : '📦 导出 ZIP'}
          </button>
        </div>
      </div>
      
      {/* Options Panel */}
      {showOptions && (
        <div className="options-panel">
          <div className="options-grid">
            <div className="option-item">
              <label>LVGL 版本</label>
              <select 
                value={options.lvglVersion}
                onChange={(e) => handleOptionChange('lvglVersion', e.target.value as '8' | '9')}
              >
                <option value="8">v8.x</option>
                <option value="9">v9.x</option>
              </select>
            </div>
            
            <div className="option-item">
              <label>命名风格</label>
              <select 
                value={options.namingStyle}
                onChange={(e) => handleOptionChange('namingStyle', e.target.value as 'snake_case' | 'camelCase')}
              >
                <option value="snake_case">snake_case</option>
                <option value="camelCase">camelCase</option>
              </select>
            </div>
            
            <div className="option-item">
              <label>缩进风格</label>
              <select 
                value={options.indentStyle}
                onChange={(e) => handleOptionChange('indentStyle', e.target.value as 'spaces' | 'tabs')}
              >
                <option value="spaces">空格</option>
                <option value="tabs">Tab</option>
              </select>
            </div>
            
            <div className="option-item">
              <label>缩进大小</label>
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
                生成注释
              </label>
            </div>
            
            <div className="option-item checkbox-item">
              <label>
                <input 
                  type="checkbox"
                  checked={options.userCodeMarkers}
                  onChange={(e) => handleOptionChange('userCodeMarkers', e.target.checked)}
                />
                用户代码标记
              </label>
            </div>
          </div>
        </div>
      )}
      
      {/* Code Editor */}
      <div className="code-editor-container">
        <Editor
          height="100%"
          language="c"
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
