import React, { useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore } from '../../store/editorStore';
import { useThemeStore } from '../../store/themeStore';
import { useLogicEditorStore } from '../LogicEditor';
import { useResourceStore } from '../../resources/resourceStore';
import { useAppStore } from '../../store/appStore';
import { useProjectStore } from '../../store/projectStore';
import { generateCode, getGeneratedFileNames } from '../../codegen/generator';
import type { CodeGenOptions, GeneratedCode } from '../../codegen/types';
import { toast } from '../Toast';
import './CodePreview.css';

const CodePreview: React.FC = () => {
  const { pages } = useEditorStore();
  const { graphs: logicGraphs } = useLogicEditorStore();
  const { currentTheme } = useThemeStore();
  const imageResources = useResourceStore((s) => s.images);
  const fontResources = useResourceStore((s) => s.fonts);
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const getProjectConfig = useProjectStore((s) => s.getProjectConfig);
  const [selectedFile, setSelectedFile] = useState<keyof GeneratedCode>('ui.c');
  const [isLoading, setIsLoading] = useState(true);
  const [lvglVersion, setLvglVersion] = useState<CodeGenOptions['lvglVersion']>('9');
  const [projectDefaultFont, setProjectDefaultFont] = useState<string | undefined>();
  const [projectDefaultFontSize, setProjectDefaultFontSize] = useState<number | undefined>();

  useEffect(() => {
    if (!currentProjectId) return;
    getProjectConfig(currentProjectId).then(cfg => {
      if (cfg) {
        setProjectDefaultFont(cfg.lvglConfig.defaultFont);
        setProjectDefaultFontSize(cfg.lvglConfig.defaultFontSize);
      }
    });
  }, [currentProjectId, getProjectConfig]);

  const fileNames = getGeneratedFileNames();

  const codeGenOptions: Partial<CodeGenOptions> = useMemo(() => ({
    lvglVersion,
  }), [lvglVersion]);

  const generatedCode = useMemo(() => {
    try {
      return generateCode(pages, codeGenOptions, logicGraphs, currentTheme, imageResources, fontResources, projectDefaultFont, projectDefaultFontSize);
    } catch {
      console.error('Code generation error');
      return null;
    }
  }, [pages, codeGenOptions, logicGraphs, currentTheme, imageResources, fontResources, projectDefaultFont, projectDefaultFontSize]);

  const currentCode = generatedCode?.[selectedFile] || '// 代码生成失败';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      toast.success('代码已复制到剪贴板');
    } catch {
      toast.error('复制失败');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${selectedFile} 已下载`);
  };

  const handleDownloadAll = async () => {
    if (!generatedCode) return;
    
    try {
      // Create a simple zip-like download by downloading each file
      for (const [fileName, content] of Object.entries(generatedCode)) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      toast.success('所有文件已下载');
    } catch {
      toast.error('下载失败');
    }
  };

  return (
    <div className="code-preview">
      <div className="code-preview-header">
        <div className="code-preview-tabs">
          {fileNames.map(fileName => (
            <button
              key={fileName}
              className={`code-tab ${selectedFile === fileName ? 'active' : ''}`}
              onClick={() => setSelectedFile(fileName)}
            >
              {fileName}
            </button>
          ))}
        </div>
        <div className="code-preview-actions">
          <select
            className="code-version-select"
            value={lvglVersion}
            onChange={(e) => setLvglVersion(e.target.value as CodeGenOptions['lvglVersion'])}
            title="LVGL 版本"
          >
            <option value="8">LVGL v8</option>
            <option value="9">LVGL v9</option>
          </select>
          <button className="code-action-btn" onClick={handleCopy} title="复制代码">
            📋 复制
          </button>
          <button className="code-action-btn" onClick={handleDownload} title="下载当前文件">
            💾 下载
          </button>
          <button className="code-action-btn primary" onClick={handleDownloadAll} title="下载所有文件">
            📦 全部下载
          </button>
        </div>
      </div>
      <div className="code-preview-editor">
        <div className="code-preview-editor-inner">
          <Editor
            width="100%"
            height="100%"
            language="c"
            theme="vs-light"
            value={currentCode}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'off',
              automaticLayout: true,
              folding: true,
              renderLineHighlight: 'line',
              scrollbar: {
                verticalScrollbarSize: 10,
                horizontalScrollbarSize: 10,
              },
            }}
            onMount={() => setIsLoading(false)}
            loading={
              <div className="code-preview-loading">
                <span>加载编辑器...</span>
              </div>
            }
          />
        </div>
        {isLoading && (
          <div className="code-preview-loading">
            <span>加载编辑器...</span>
          </div>
        )}
      </div>
      <div className="code-preview-footer">
        <span className="code-stats">
          {currentCode.split('\n').length} 行 | {new Blob([currentCode]).size} 字节
        </span>
      </div>
    </div>
  );
};

export default CodePreview;
