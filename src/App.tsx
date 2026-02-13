import React, { useCallback, useState, useRef, useEffect } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import ComponentPanel from './components/ComponentPanel';
import Canvas from './components/Canvas';
import PropertyEditor from './components/PropertyEditor';
import EventPanel from './components/EventPanel';
import AnimationPanel from './components/AnimationPanel';
import PageManager from './components/PageManager';
import StatusBar from './components/StatusBar';
import AlignToolbar from './components/AlignToolbar';
import HelpPanel from './components/HelpPanel';
import Toast, { useToast } from './components/Toast';
import Modal, { modal } from './components/Modal';
import CodePreview from './components/CodePreview';
import { LogicEditor } from './components/LogicEditor';
import PreviewPanel from './components/Preview';
import WasmPreview from './components/WasmPreview';
import CompilePreview from './components/CompilePreview';
import { HierarchyPanel } from './components/HierarchyPanel';
import { ThemeSelector } from './components/ThemeSelector';
import { ResourcePanel, useResourceStore } from './resources';
import { useLogicEditorStore } from './components/LogicEditor';
import { ProjectListPage } from './components/ProjectManager';
import { ProjectSettings } from './components/ProjectSettings';
import {
  downloadProject,
  loadProjectFromFile,
} from './resources/projectManager';
import { useEditorStore } from './store/editorStore';
import { useAppStore, parseFontSize } from './store/appStore';
import { useProjectStore } from './store/projectStore';
import type { Page } from './types';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getComponentDefinition } from './utils/componentDefinitions';
import './App.css';

type TabType = 'design' | 'logic' | 'code' | 'preview';

const App: React.FC = () => {
  const { currentView, currentProjectId, showProjectSettings, openProject, goToProjectList, setShowProjectSettings, setLastSaveTime, setDefaultFontSize } = useAppStore();
  const { loadProjectData, getProjectConfig, saveProjectData, exportProject, importProject } = useProjectStore();

  // On mount: check lastOpenProjectId
  useEffect(() => {
    const lastId = localStorage.getItem('lastOpenProjectId');
    if (lastId) {
      // Verify project still exists, then open
      getProjectConfig(lastId).then(cfg => {
        if (cfg) {
          // Load project data into stores
          loadProjectData(lastId).then(({ data, images, fonts }) => {
            useEditorStore.getState().setPages(data.pages as Page[]);
            useEditorStore.getState().setCanvasSize(cfg.display.width, cfg.display.height);
            useResourceStore.getState().importResources({ images, fonts });
            if (data.logicGraphs) {
              useLogicEditorStore.getState().setGraphs(data.logicGraphs);
            }
            // Set default font size from project config
            const fontRes = fonts.find(f => f.cFontName === cfg.lvglConfig.defaultFont);
            setDefaultFontSize(parseFontSize(cfg.lvglConfig.defaultFont, fontRes?.sizes, cfg.lvglConfig.defaultFontSize));
            openProject(lastId);
          }).catch(() => {
            // Failed to load, show project list
          });
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toast hook must be called unconditionally (before any early return)
  const { messages: toastMessages, removeToast: removeGlobalToast } = useToast();

  if (currentView === 'projectList') {
    return (
      <div className="app">
        <ProjectListPage />
        <Toast messages={toastMessages} onRemove={removeGlobalToast} />
        <Modal />
      </div>
    );
  }

  return <EditorView
    currentProjectId={currentProjectId}
    showProjectSettings={showProjectSettings}
    setShowProjectSettings={setShowProjectSettings}
    goToProjectList={goToProjectList}
    setLastSaveTime={setLastSaveTime}
    setDefaultFontSize={setDefaultFontSize}
    saveProjectData={saveProjectData}
    exportProject={exportProject}
    importProject={importProject}
    loadProjectData={loadProjectData}
    getProjectConfig={getProjectConfig}
    openProject={openProject}
  />;
};

// Separate editor view to keep hooks stable
interface EditorViewProps {
  currentProjectId: string | null;
  showProjectSettings: boolean;
  setShowProjectSettings: (v: boolean) => void;
  goToProjectList: () => void;
  setLastSaveTime: (t: number) => void;
  setDefaultFontSize: (size: number) => void;
  saveProjectData: (id: string, pages: Page[], logicGraphs: import('./components/LogicEditor/types').LogicGraph[], images: import('./resources/types').ImageResource[], fonts: import('./resources/types').FontResource[]) => Promise<void>;
  exportProject: (id: string) => Promise<import('./resources/types').ProjectFile>;
  importProject: (file: import('./resources/types').ProjectFile, name?: string) => Promise<string>;
  loadProjectData: (id: string) => Promise<{ data: { pages: Page[]; logicGraphs: import('./components/LogicEditor/types').LogicGraph[] }; images: import('./resources/types').ImageResource[]; fonts: import('./resources/types').FontResource[] }>;
  getProjectConfig: (id: string) => Promise<import('./store/projectStore').ProjectConfig | undefined>;
  openProject: (id: string) => void;
}

const EditorView: React.FC<EditorViewProps> = ({
  currentProjectId,
  showProjectSettings,
  setShowProjectSettings,
  goToProjectList,
  setLastSaveTime,
  setDefaultFontSize,
  saveProjectData,
  exportProject,
  importProject,
  loadProjectData,
  getProjectConfig,
  openProject,
}) => {
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const { addComponent, pages, setPages, setCanvasSize } = useEditorStore();
  const { images, fonts, importResources } = useResourceStore();
  const { messages, removeToast, success, error } = useToast();

  // UI State
  const [showResourcePanel, setShowResourcePanel] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('design');
  const [previewMode, setPreviewMode] = useState<'simple' | 'wasm' | 'compile'>('simple');
  const [projectName, setProjectName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project name
  useEffect(() => {
    if (!currentProjectId) return;
    getProjectConfig(currentProjectId).then(cfg => {
      if (cfg) setProjectName(cfg.name);
    });
  }, [currentProjectId, getProjectConfig]);

  // Configure drag sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const sensors = useSensors(mouseSensor);

  // Track dragging state for overlay
  const [activeDragType, setActiveDragType] = React.useState<string | null>(null);

  // Auto-save to IndexedDB
  useEffect(() => {
    if (!currentProjectId) return;

    const doSave = async () => {
      try {
        const logicGraphs = useLogicEditorStore.getState().graphs;
        await saveProjectData(currentProjectId, pages, logicGraphs, images, fonts);
        setLastSaveTime(Date.now());
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    };

    const saveInterval = setInterval(doSave, 30000);

    // Save on beforeunload
    const handleBeforeUnload = () => {
      // Fire-and-forget; IndexedDB transactions may or may not complete
      doSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentProjectId, pages, images, fonts, saveProjectData, setLastSaveTime]);

  // Project management handlers
  const handleSaveProject = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      const logicGraphs = useLogicEditorStore.getState().graphs;
      await saveProjectData(currentProjectId, pages, logicGraphs, images, fonts);
      setLastSaveTime(Date.now());
      success('项目已保存');
    } catch (err) {
      error('保存失败: ' + String(err));
    }
  }, [currentProjectId, pages, images, fonts, saveProjectData, setLastSaveTime, success, error]);

  const handleExportProject = useCallback(async () => {
    if (!currentProjectId) return;
    try {
      // Save first
      const logicGraphs = useLogicEditorStore.getState().graphs;
      await saveProjectData(currentProjectId, pages, logicGraphs, images, fonts);
      const project = await exportProject(currentProjectId);
      downloadProject(project);
      success(`项目已导出`);
    } catch (err) {
      error('导出失败: ' + String(err));
    }
  }, [currentProjectId, pages, images, fonts, saveProjectData, exportProject, success, error]);

  const handleImportProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = await loadProjectFromFile(file);
      const id = await importProject(project, project.name);
      const cfg = await getProjectConfig(id);
      if (cfg) {
        const { data, images: imgs, fonts: fnts } = await loadProjectData(id);
        setPages(data.pages as Page[]);
        setCanvasSize(cfg.display.width, cfg.display.height);
        importResources({ images: imgs, fonts: fnts });
        if (data.logicGraphs) {
          useLogicEditorStore.getState().setGraphs(data.logicGraphs);
        }
        const fontRes = fnts.find(f => f.cFontName === cfg.lvglConfig.defaultFont);
        setDefaultFontSize(parseFontSize(cfg.lvglConfig.defaultFont, fontRes?.sizes, cfg.lvglConfig.defaultFontSize));
        openProject(id);
        setProjectName(cfg.name);
      }
      success(`项目「${project.name}」导入成功`);
    } catch (err) {
      error('导入失败: ' + String(err));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewProjectClick = useCallback(async () => {
    if (await modal.confirm('创建新项目将返回项目列表，当前项目会自动保存。继续吗？')) {
      // Save current project first
      if (currentProjectId) {
        const logicGraphs = useLogicEditorStore.getState().graphs;
        await saveProjectData(currentProjectId, pages, logicGraphs, images, fonts);
      }
      goToProjectList();
    }
  }, [currentProjectId, pages, images, fonts, saveProjectData, goToProjectList]);

  const handleBackToList = useCallback(async () => {
    // Save current project first
    if (currentProjectId) {
      try {
        const logicGraphs = useLogicEditorStore.getState().graphs;
        await saveProjectData(currentProjectId, pages, logicGraphs, images, fonts);
      } catch {
        // ignore
      }
    }
    goToProjectList();
  }, [currentProjectId, pages, images, fonts, saveProjectData, goToProjectList]);

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleToggleHelp = () => setShowHelpPanel(prev => !prev);
    const handleSaveProjectEvt = () => handleSaveProject();
    const handleOpenProject = () => handleImportProject();
    const handleNewProject = () => handleNewProjectClick();

    window.addEventListener('toggle-help-panel', handleToggleHelp);
    window.addEventListener('save-project', handleSaveProjectEvt);
    window.addEventListener('open-project', handleOpenProject);
    window.addEventListener('new-project', handleNewProject);

    return () => {
      window.removeEventListener('toggle-help-panel', handleToggleHelp);
      window.removeEventListener('save-project', handleSaveProjectEvt);
      window.removeEventListener('open-project', handleOpenProject);
      window.removeEventListener('new-project', handleNewProject);
    };
  }, [handleSaveProject, handleNewProjectClick]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'new-component') {
      setActiveDragType(active.data.current.componentType);
    }
  }, []);

  // Track last mouse position for accurate drop placement
  const lastMousePos = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragType(null);

    // Check if dropped on canvas
    if (over?.id === 'canvas-drop-area' && active.data.current?.type === 'new-component') {
      const componentType = active.data.current.componentType;

      const canvasElement = document.querySelector('.canvas');
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const currentCanvas = useEditorStore.getState().canvas;

        // Use tracked mouse position — immune to CSS transform issues with dnd-kit delta
        let x = (lastMousePos.current.x - rect.left) / currentCanvas.zoom;
        let y = (lastMousePos.current.y - rect.top) / currentCanvas.zoom;

        // Center the component on the drop point
        const definition = getComponentDefinition(componentType);
        if (definition) {
          x -= definition.defaultWidth / 2;
          y -= definition.defaultHeight / 2;
        }

        x = Math.max(0, Math.min(x, currentCanvas.width - 50));
        y = Math.max(0, Math.min(y, currentCanvas.height - 50));

        addComponent(componentType, x, y);
      }
    }
  }, [addComponent]);

  // Render drag overlay
  const renderDragOverlay = () => {
    if (!activeDragType) return null;

    const definition = getComponentDefinition(activeDragType);
    if (!definition) return null;

    return (
      <div className="drag-overlay-item">
        <span className="drag-overlay-icon">{definition.icon}</span>
        <span className="drag-overlay-name">{definition.name}</span>
      </div>
    );
  };

  // Render main content based on active tab
  const renderMainContent = () => {
    switch (activeTab) {
      case 'design':
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="app-body">
              <div className="left-panel">
                <ComponentPanel />
                <HierarchyPanel />
              </div>
              <div className="canvas-area">
                <AlignToolbar />
                <Canvas />
                <PageManager />
              </div>
              <div className="right-panel">
                <PropertyEditor />
                <EventPanel />
                <AnimationPanel />
              </div>
              {showResourcePanel && (
                <div className="resource-panel-container">
                  <ResourcePanel />
                </div>
              )}
            </div>
            <DragOverlay dropAnimation={null}>
              {renderDragOverlay()}
            </DragOverlay>
          </DndContext>
        );

      case 'logic':
        return (
          <div className="app-body full-panel">
            <LogicEditor />
          </div>
        );

      case 'code':
        return (
          <div className="app-body full-panel">
            <CodePreview />
          </div>
        );

      case 'preview':
        return (
          <div className="app-body full-panel">
            <div className="preview-sub-tabs">
              <button
                className={`preview-sub-tab ${previewMode === 'simple' ? 'active' : ''}`}
                onClick={() => setPreviewMode('simple')}
              >
                📱 简易预览
              </button>
              <button
                className={`preview-sub-tab ${previewMode === 'wasm' ? 'active' : ''}`}
                onClick={() => setPreviewMode('wasm')}
              >
                🖥️ LVGL 预览
              </button>
              <button
                className={`preview-sub-tab ${previewMode === 'compile' ? 'active' : ''}`}
                onClick={() => setPreviewMode('compile')}
              >
                🔨 编译运行
              </button>
            </div>
            <div className="preview-sub-content">
              {previewMode === 'simple' ? <PreviewPanel /> : previewMode === 'wasm' ? <WasmPreview /> : <CompilePreview />}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-logo">
          <button className="back-to-list-btn" onClick={handleBackToList} title="返回项目列表">
            ◀
          </button>
          <span className="logo-icon">📐</span>
          <span className="logo-text project-name-display">{projectName || 'LVGL UI Editor'}</span>
        </div>

        {/* Main tabs */}
        <div className="app-tabs">
          <button
            className={`tab-btn ${activeTab === 'design' ? 'active' : ''}`}
            onClick={() => setActiveTab('design')}
          >
            🎨 设计
          </button>
          <button
            className={`tab-btn ${activeTab === 'logic' ? 'active' : ''}`}
            onClick={() => setActiveTab('logic')}
          >
            🔗 逻辑
          </button>
          <button
            className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
            onClick={() => setActiveTab('code')}
          >
            💻 代码
          </button>
          <button
            className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            📱 预览
          </button>
        </div>

        <div className="app-toolbar">
          <ToolbarButton icon="💾" label="保存" onClick={handleSaveProject} shortcut="Ctrl+S" />
          <ToolbarButton icon="📤" label="导出" onClick={handleExportProject} />
          <ToolbarButton icon="📥" label="导入" onClick={handleImportProject} />
          <div className="toolbar-divider" />
          <ToolbarButton icon="↩️" label="撤销" onClick={() => useEditorStore.getState().undo()} shortcut="Ctrl+Z" />
          <ToolbarButton icon="↪️" label="重做" onClick={() => useEditorStore.getState().redo()} shortcut="Ctrl+Y" />
          <div className="toolbar-divider" />
          <ToolbarButton
            icon="📦"
            label="资源"
            onClick={() => setShowResourcePanel(!showResourcePanel)}
            active={showResourcePanel}
          />
          <ToolbarButton
            icon="⚙️"
            label="设置"
            onClick={() => setShowProjectSettings(true)}
          />
          <div className="toolbar-divider" />
          <ThemeSelector />
          <div className="toolbar-divider" />
          <ToolbarButton
            icon="❓"
            label="帮助"
            onClick={() => setShowHelpPanel(true)}
            shortcut="F1"
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.lvgl.json"
          onChange={handleFileLoad}
          style={{ display: 'none' }}
        />
      </div>

      {renderMainContent()}

      <StatusBar />

      {/* Help Panel */}
      <HelpPanel isOpen={showHelpPanel} onClose={() => setShowHelpPanel(false)} />

      {/* Project Settings */}
      {showProjectSettings && <ProjectSettings />}

      {/* Toast notifications */}
      <Toast messages={messages} onRemove={removeToast} />

      {/* Global modal dialogs */}
      <Modal />
    </div>
  );
};

// Toolbar button component
interface ToolbarButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  shortcut?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, onClick, disabled, active, shortcut }) => (
  <button
    className={`toolbar-button ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`}
    onClick={onClick}
    disabled={disabled}
    title={shortcut ? `${label} (${shortcut})` : label}
  >
    <span className="toolbar-icon">{icon}</span>
    <span className="toolbar-label">{label}</span>
  </button>
);

export default App;
