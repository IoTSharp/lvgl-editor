import React, { useEffect, useState, useRef } from 'react';
import { useProjectStore } from '../../store/projectStore';
import type { DisplayConfig, LvglConfig } from '../../store/projectStore';
import { useAppStore } from '../../store/appStore';
import { useEditorStore } from '../../store/editorStore';
import { useResourceStore } from '../../resources';
import { useLogicEditorStore } from '../LogicEditor';
import { loadProjectFromFile, loadAutoSavedProject, clearAutoSave } from '../../resources/projectManager';
import { modal } from '../Modal';
import { toast } from '../Toast';
import ProjectCard from './ProjectCard';
import NewProjectDialog from './NewProjectDialog';
import type { Page } from '../../types';
import './ProjectListPage.css';

const ProjectListPage: React.FC = () => {
  const { projects, loading, init, createProject, deleteProject, importProject, loadProjectData, getProjectConfig } = useProjectStore();
  const { openProject } = useAppStore();
  const { setPages, setCanvasSize } = useEditorStore();
  const { importResources } = useResourceStore();

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [search, setSearch] = useState('');
  const [migrationChecked, setMigrationChecked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize store
  useEffect(() => {
    init();
  }, [init]);

  // Check for legacy localStorage data migration
  useEffect(() => {
    if (migrationChecked) return;
    setMigrationChecked(true);

    const autoSaved = loadAutoSavedProject();
    if (autoSaved && autoSaved.pages && autoSaved.pages.length > 0) {
      modal.confirm('发现旧版自动保存数据，是否导入为新项目？').then(async (yes) => {
        if (yes) {
          try {
            const id = await importProject(autoSaved, autoSaved.name || '迁移项目');
            clearAutoSave();
            toast.success('旧数据已导入为新项目');
            handleOpenProject(id);
          } catch (err) {
            toast.error('导入失败: ' + String(err));
          }
        } else {
          clearAutoSave();
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenProject = async (id: string) => {
    try {
      const config = await getProjectConfig(id);
      if (!config) { toast.error('项目不存在'); return; }

      const { data, images, fonts } = await loadProjectData(id);
      setPages(data.pages as Page[]);
      setCanvasSize(config.display.width, config.display.height);
      importResources({ images, fonts });
      if (data.logicGraphs) {
        useLogicEditorStore.getState().setGraphs(data.logicGraphs);
      }
      openProject(id);
    } catch (err) {
      toast.error('打开项目失败: ' + String(err));
    }
  };

  const handleCreate = async (name: string, display: DisplayConfig, lvglConfig: LvglConfig) => {
    try {
      const id = await createProject(name, display, lvglConfig);
      setShowNewDialog(false);
      await handleOpenProject(id);
    } catch (err) {
      console.error('创建项目失败:', err);
      toast.error('创建项目失败: ' + String(err));
    }
  };

  const handleDelete = async (id: string) => {
    const config = await getProjectConfig(id);
    const confirmed = await modal.confirm(`确定删除项目「${config?.name || id}」吗？此操作不可恢复。`);
    if (confirmed) {
      await deleteProject(id);
      toast.success('项目已删除');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = await loadProjectFromFile(file);
      const id = await importProject(project, project.name);
      toast.success(`项目「${project.name}」导入成功`);
      handleOpenProject(id);
    } catch (err) {
      toast.error('导入失败: ' + String(err));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = search
    ? projects.filter(p => p.config.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div className="project-list-page">
      <div className="plp-header">
        <div className="plp-logo">
          <span className="plp-logo-icon">📐</span>
          <span className="plp-logo-text">LVGL UI Editor</span>
        </div>
      </div>

      <div className="plp-content">
        <div className="plp-toolbar">
          <input
            className="plp-search"
            type="text"
            placeholder="搜索项目..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="plp-actions">
            <button className="plp-btn plp-btn-primary" onClick={() => setShowNewDialog(true)}>
              ＋ 新建项目
            </button>
            <button className="plp-btn" onClick={() => fileInputRef.current?.click()}>
              📂 导入项目
            </button>
          </div>
        </div>

        {loading ? (
          <div className="plp-empty">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="plp-empty">
            {search ? '没有匹配的项目' : '还没有项目，点击「新建项目」开始'}
          </div>
        ) : (
          <div className="plp-grid">
            {filtered.map(item => (
              <ProjectCard
                key={item.config.id}
                item={item}
                onOpen={handleOpenProject}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.lvgl.json"
        onChange={handleImportFile}
        style={{ display: 'none' }}
      />

      {showNewDialog && (
        <NewProjectDialog
          onClose={() => setShowNewDialog(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
};

export default ProjectListPage;
