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
import { type TargetId, type CIntegrationProfileId } from '../../output';
import { t } from '../../i18n';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

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
      modal.confirm(t("发现旧版自动保存数据，是否导入为新项目？")).then(async (yes) => {
        if (yes) {
          try {
            const id = await importProject(autoSaved, autoSaved.name || t('Migrated project'));
            clearAutoSave();
            toast.success(t("旧数据已导入为新项目"));
            handleOpenProject(id);
          } catch (err) {
            toast.error(t('Import failed: {0}', String(err)));
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
      if (!config) { toast.error(t("项目不存在")); return; }

      const { data, images, fonts } = await loadProjectData(id);
      setPages(data.pages as Page[]);
      setCanvasSize(config.display.width, config.display.height);
      importResources({ images, fonts });
      if (data.logicGraphs) {
        useLogicEditorStore.getState().setGraphs(data.logicGraphs);
      }
      openProject(id, config.outputTarget, config.cIntegrationProfile);
    } catch (err) {
      toast.error(t('Open project failed: {0}', String(err)));
    }
  };

  const handleCreate = async (name: string, display: DisplayConfig, lvglConfig: LvglConfig, target: TargetId, cIntegrationProfile: CIntegrationProfileId) => {
    try {
      const id = await createProject(name, display, lvglConfig, target, cIntegrationProfile);
      setShowNewDialog(false);
      await handleOpenProject(id);
    } catch (err) {
      console.error('Create project failed:', err);
      toast.error(t('Create project failed: {0}', String(err)));
    }
  };

  const handleDelete = async (id: string) => {
    const config = await getProjectConfig(id);
    const confirmed = await modal.confirm(t('Delete project "{0}"? This cannot be undone.', config?.name || id));
    if (confirmed) {
      await deleteProject(id);
      toast.success(t("项目已删除"));
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const project = await loadProjectFromFile(file);
      const id = await importProject(project, project.name);
      toast.success(t('Project "{0}" imported successfully', project.name));
      handleOpenProject(id);
    } catch (err) {
      toast.error(t('Import failed: {0}', String(err)));
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
        <LanguageSwitcher />
      </div>

      <div className="plp-content">
        <div className="plp-toolbar">
          <input
            className="plp-search"
            type="text"
            placeholder={t('Search projects...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="plp-actions">
            <button className="plp-btn plp-btn-primary" onClick={() => setShowNewDialog(true)}>
              {t("＋ 新建项目")}</button>
            <button className="plp-btn" onClick={() => fileInputRef.current?.click()}>
              {t("📂 导入项目")}</button>
          </div>
        </div>

        {loading ? (
          <div className="plp-empty">{t("加载中...")}</div>
        ) : filtered.length === 0 ? (
          <div className="plp-empty">
            {t(search ? '没有匹配的项目' : '还没有项目，点击「新建项目」开始')}
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
