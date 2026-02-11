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
import {
  createProjectFile,
  downloadProject,
  loadProjectFromFile,
  autoSaveProject,
  loadAutoSavedProject,
} from './resources/projectManager';
import { useEditorStore } from './store/editorStore';
import type { Page } from './types';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getComponentDefinition } from './utils/componentDefinitions';
import './App.css';

type TabType = 'design' | 'logic' | 'code' | 'preview';

const App: React.FC = () => {
  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const { addComponent, canvas, pages, clearComponents, setPages } = useEditorStore();
  const { images, fonts, importResources, clearAllResources } = useResourceStore();
  const { messages, removeToast, success, error, info } = useToast();
  
  // UI State
  const [showResourcePanel, setShowResourcePanel] = useState(false);
  const [showHelpPanel, setShowHelpPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('design');
  const [previewMode, setPreviewMode] = useState<'simple' | 'wasm' | 'compile'>('simple');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configure drag sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const sensors = useSensors(mouseSensor);

  // Track dragging state for overlay
  const [activeDragType, setActiveDragType] = React.useState<string | null>(null);

  // Auto-save effect
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const logicGraphs = useLogicEditorStore.getState().graphs;
      const project = createProjectFile(
        'autosave',
        pages,
        canvas,
        images,
        fonts,
        logicGraphs
      );
      autoSaveProject(project);
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [pages, canvas, images, fonts]);

  // Load auto-saved project on mount
  useEffect(() => {
    const autoSaved = loadAutoSavedProject();
    if (autoSaved && autoSaved.pages && autoSaved.pages.length > 0) {
      // Ask user if they want to restore
      modal.confirm('发现自动保存的项目，是否恢复？').then(shouldRestore => {
        if (shouldRestore) {
          setPages(autoSaved.pages as Page[]);
          if (autoSaved.resources) {
            importResources(autoSaved.resources);
          }
          if (autoSaved.logicGraphs) {
            useLogicEditorStore.getState().setGraphs(autoSaved.logicGraphs);
          }
          info('已恢复自动保存的项目');
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Project management handlers
  const handleNewProjectClick = useCallback(async () => {
    if (await modal.confirm('创建新项目将清除当前所有内容，确定继续吗？')) {
      clearComponents();
      clearAllResources();
      useLogicEditorStore.getState().setGraphs([]);
      success('已创建新项目');
    }
  }, [clearComponents, clearAllResources, success]);

  const handleSaveProjectClick = useCallback(async () => {
    const projectName = await modal.prompt('请输入项目名称:', 'my-project');
    if (!projectName) return;

    const logicGraphs = useLogicEditorStore.getState().graphs;
    const project = createProjectFile(
      projectName,
      pages,
      canvas,
      images,
      fonts,
      logicGraphs
    );
    downloadProject(project);
    success(`项目 "${projectName}" 已保存`);
  }, [pages, canvas, images, fonts, success]);

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleToggleHelp = () => setShowHelpPanel(prev => !prev);
    const handleSaveProject = () => handleSaveProjectClick();
    const handleOpenProject = () => fileInputRef.current?.click();
    const handleNewProject = () => handleNewProjectClick();

    window.addEventListener('toggle-help-panel', handleToggleHelp);
    window.addEventListener('save-project', handleSaveProject);
    window.addEventListener('open-project', handleOpenProject);
    window.addEventListener('new-project', handleNewProject);

    return () => {
      window.removeEventListener('toggle-help-panel', handleToggleHelp);
      window.removeEventListener('save-project', handleSaveProject);
      window.removeEventListener('open-project', handleOpenProject);
      window.removeEventListener('new-project', handleNewProject);
    };
  }, [handleSaveProjectClick, handleNewProjectClick]);

  const handleLoadProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const project = await loadProjectFromFile(file);

      // Load all pages
      if (project.pages && project.pages.length > 0) {
        setPages(project.pages as Page[]);
      }

      // Load resources
      if (project.resources) {
        importResources(project.resources);
      }

      // Load logic graphs
      if (project.logicGraphs) {
        useLogicEditorStore.getState().setGraphs(project.logicGraphs);
      }

      success(`项目 "${project.name}" 加载成功！`);
    } catch (err) {
      console.error('Failed to load project:', err);
      error('加载项目失败：' + (err as Error).message);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === 'new-component') {
      setActiveDragType(active.data.current.componentType);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragType(null);

    // Check if dropped on canvas
    if (over?.id === 'canvas-drop-area' && active.data.current?.type === 'new-component') {
      const componentType = active.data.current.componentType;
      
      // Get drop position relative to canvas
      // The delta gives us the movement from the drag start
      const canvasElement = document.querySelector('.canvas');
      if (canvasElement) {
        const rect = canvasElement.getBoundingClientRect();
        const dropX = (event.activatorEvent as MouseEvent).clientX;
        const dropY = (event.activatorEvent as MouseEvent).clientY;
        
        // Calculate position relative to canvas, accounting for zoom and pan
        let x = (dropX - rect.left) / canvas.zoom;
        let y = (dropY - rect.top) / canvas.zoom;
        
        // Add the delta from dragging
        if (event.delta) {
          x += event.delta.x / canvas.zoom;
          y += event.delta.y / canvas.zoom;
        }
        
        // Ensure position is within canvas bounds
        x = Math.max(0, Math.min(x, canvas.width - 50));
        y = Math.max(0, Math.min(y, canvas.height - 50));
        
        addComponent(componentType, x, y);
      }
    }
  }, [addComponent, canvas]);

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
          <span className="logo-icon">📐</span>
          <span className="logo-text">LVGL UI Editor</span>
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
          <ToolbarButton icon="📄" label="新建" onClick={handleNewProjectClick} shortcut="Ctrl+N" />
          <ToolbarButton icon="📂" label="打开" onClick={handleLoadProject} shortcut="Ctrl+O" />
          <ToolbarButton icon="💾" label="保存" onClick={handleSaveProjectClick} shortcut="Ctrl+S" />
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
