// Project management store — zustand + IndexedDB via idb

import { create } from 'zustand';
import { openDB, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { ProjectFile, CodeGenOptions, ImageResource, FontResource } from '../resources/types';
import type { Page } from '../types';
import type { LogicGraph } from '../components/LogicEditor/types';

// ---------------------------------------------------------------------------
// Project config type
// ---------------------------------------------------------------------------

export interface DisplayConfig {
  width: number;
  height: number;
  colorDepth: 16 | 24 | 32;
  rotation: 0 | 90 | 180 | 270;
}

export interface LvglConfig {
  version: '9';
  colorFormat: 'RGB565' | 'RGB888' | 'ARGB8888';
  fontLarge: boolean;
  defaultFont: string;
  defaultFontSize?: number; // Only used when defaultFont is a custom font
  memSize: number; // KB
}

export interface ProjectConfig {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  display: DisplayConfig;
  lvglConfig: LvglConfig;
  codeGenOptions: CodeGenOptions;
}

export interface ProjectData {
  projectId: string;
  pages: Page[];
  logicGraphs: LogicGraph[];
  variables: { id: string; name: string; type: string; defaultValue: string }[];
}

export interface ProjectResource {
  id: string; // resourceId
  projectId: string;
  type: 'image' | 'font';
  data: ImageResource | FontResource;
}

export interface ProjectListItem {
  config: ProjectConfig;
  size: number; // approximate bytes
}

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

export const DEFAULT_DISPLAY: DisplayConfig = {
  width: 480,
  height: 320,
  colorDepth: 32,
  rotation: 0,
};

export const DEFAULT_LVGL_CONFIG: LvglConfig = {
  version: '9',
  colorFormat: 'ARGB8888',
  fontLarge: true,
  defaultFont: 'montserrat_14',
  memSize: 64,
};

export const DEFAULT_CODEGEN_OPTIONS: CodeGenOptions = {
  outputFormat: 'single-file',
  includeComments: true,
  useStaticAllocation: true,
  prefix: 'ui',
  indentSize: 4,
  indentStyle: 'spaces',
};

// ---------------------------------------------------------------------------
// IndexedDB helpers
// ---------------------------------------------------------------------------

const DB_NAME = 'lvgl-editor-projects';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('projectData')) {
          db.createObjectStore('projectData', { keyPath: 'projectId' });
        }
        if (!db.objectStoreNames.contains('projectResources')) {
          const store = db.createObjectStore('projectResources', { keyPath: 'id' });
          store.createIndex('byProject', 'projectId');
        }
      },
    });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// CRUD operations (raw IndexedDB)
// ---------------------------------------------------------------------------

async function dbCreateProject(config: ProjectConfig): Promise<void> {
  const db = await getDB();
  await db.put('projects', config);
  await db.put('projectData', {
    projectId: config.id,
    pages: [{ id: uuidv4(), name: 'Page 1', components: [], backgroundColor: '#F5F5F5' }],
    logicGraphs: [],
    variables: [],
  } satisfies ProjectData);
}

async function dbGetProjectConfig(id: string): Promise<ProjectConfig | undefined> {
  const db = await getDB();
  return db.get('projects', id);
}

async function dbGetProjectData(id: string): Promise<ProjectData | undefined> {
  const db = await getDB();
  return db.get('projectData', id);
}

async function dbGetProjectResources(projectId: string): Promise<ProjectResource[]> {
  const db = await getDB();
  return db.getAllFromIndex('projectResources', 'byProject', projectId);
}

async function dbUpdateProjectConfig(config: ProjectConfig): Promise<void> {
  const db = await getDB();
  await db.put('projects', config);
}

async function dbUpdateProjectData(data: ProjectData): Promise<void> {
  const db = await getDB();
  await db.put('projectData', data);
}

async function dbPutResource(resource: ProjectResource): Promise<void> {
  const db = await getDB();
  await db.put('projectResources', resource);
}

async function dbDeleteResource(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projectResources', id);
}

async function dbDeleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('projects', id);
  await db.delete('projectData', id);
  // Delete all resources for this project
  const resources = await db.getAllFromIndex('projectResources', 'byProject', id);
  const tx = db.transaction('projectResources', 'readwrite');
  for (const r of resources) {
    await tx.store.delete(r.id);
  }
  await tx.done;
}

async function dbListProjects(): Promise<ProjectConfig[]> {
  const db = await getDB();
  return db.getAll('projects');
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

interface ProjectStoreState {
  projects: ProjectListItem[];
  loading: boolean;
  initialized: boolean;

  // Actions
  init: () => Promise<void>;
  refreshList: () => Promise<void>;
  createProject: (name: string, display: DisplayConfig, lvglConfig: LvglConfig) => Promise<string>;
  deleteProject: (id: string) => Promise<void>;
  getProjectConfig: (id: string) => Promise<ProjectConfig | undefined>;
  updateProjectConfig: (config: ProjectConfig) => Promise<void>;

  // Load / save project data (pages, logic, resources)
  loadProjectData: (id: string) => Promise<{ data: ProjectData; images: ImageResource[]; fonts: FontResource[] }>;
  saveProjectData: (id: string, pages: Page[], logicGraphs: LogicGraph[], images: ImageResource[], fonts: FontResource[]) => Promise<void>;

  // Import / export
  exportProject: (id: string) => Promise<ProjectFile>;
  importProject: (file: ProjectFile, name?: string) => Promise<string>;

  // Resource sync helpers
  syncResources: (projectId: string, images: ImageResource[], fonts: FontResource[]) => Promise<void>;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  projects: [],
  loading: false,
  initialized: false,

  init: async () => {
    if (get().initialized) return;
    set({ loading: true });
    await get().refreshList();
    set({ initialized: true, loading: false });
  },

  refreshList: async () => {
    const configs = await dbListProjects();
    // Calculate approximate sizes
    const items: ProjectListItem[] = [];
    for (const config of configs) {
      const data = await dbGetProjectData(config.id);
      const resources = await dbGetProjectResources(config.id);
      let size = JSON.stringify(config).length + JSON.stringify(data).length;
      for (const r of resources) {
        size += JSON.stringify(r.data).length;
      }
      items.push({ config, size });
    }
    // Sort by updatedAt descending
    items.sort((a, b) => b.config.updatedAt - a.config.updatedAt);
    set({ projects: items });
  },

  createProject: async (name, display, lvglConfig) => {
    const id = uuidv4();
    const now = Date.now();
    const config: ProjectConfig = {
      id,
      name,
      createdAt: now,
      updatedAt: now,
      display,
      lvglConfig,
      codeGenOptions: { ...DEFAULT_CODEGEN_OPTIONS },
    };
    await dbCreateProject(config);
    await get().refreshList();
    return id;
  },

  deleteProject: async (id) => {
    await dbDeleteProject(id);
    await get().refreshList();
  },

  getProjectConfig: async (id) => {
    return dbGetProjectConfig(id);
  },

  updateProjectConfig: async (config) => {
    await dbUpdateProjectConfig({ ...config, updatedAt: Date.now() });
    await get().refreshList();
  },

  loadProjectData: async (id) => {
    const data = await dbGetProjectData(id);
    if (!data) {
      throw new Error('Project data not found');
    }
    const resources = await dbGetProjectResources(id);
    const images: ImageResource[] = [];
    const fonts: FontResource[] = [];
    for (const r of resources) {
      if (r.type === 'image') images.push(r.data as ImageResource);
      else if (r.type === 'font') fonts.push(r.data as FontResource);
    }
    return { data, images, fonts };
  },

  saveProjectData: async (id, pages, logicGraphs, images, fonts) => {
    const config = await dbGetProjectConfig(id);
    if (config) {
      await dbUpdateProjectConfig({ ...config, updatedAt: Date.now() });
    }
    await dbUpdateProjectData({ projectId: id, pages, logicGraphs, variables: [] });
    await get().syncResources(id, images, fonts);
  },

  syncResources: async (projectId, images, fonts) => {
    // Get existing resources
    const existing = await dbGetProjectResources(projectId);
    const existingIds = new Set(existing.map(r => r.id));
    const newIds = new Set<string>();

    // Upsert images
    for (const img of images) {
      const resId = `${projectId}-img-${img.id}`;
      newIds.add(resId);
      await dbPutResource({ id: resId, projectId, type: 'image', data: img });
    }
    // Upsert fonts
    for (const font of fonts) {
      const resId = `${projectId}-font-${font.id}`;
      newIds.add(resId);
      await dbPutResource({ id: resId, projectId, type: 'font', data: font });
    }
    // Delete removed resources
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        await dbDeleteResource(id);
      }
    }
  },

  exportProject: async (id) => {
    const config = await dbGetProjectConfig(id);
    if (!config) throw new Error('Project not found');
    const { data, images, fonts } = await get().loadProjectData(id);

    const projectFile: ProjectFile = {
      version: '1.0.0',
      name: config.name,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      canvasSize: { width: config.display.width, height: config.display.height },
      pages: data.pages.map(p => ({ id: p.id, name: p.name, components: p.components })),
      resources: { images, fonts },
      variables: data.variables.map(v => ({
        id: v.id,
        name: v.name,
        type: v.type as 'int' | 'string' | 'bool' | 'float',
        defaultValue: v.defaultValue,
      })),
      logicGraphs: data.logicGraphs,
      codeGenOptions: config.codeGenOptions,
      // Extended fields for round-trip
      display: config.display,
      lvglConfig: config.lvglConfig,
    };
    return projectFile;
  },

  importProject: async (file, name) => {
    const id = uuidv4();
    const now = Date.now();
    // Extract display config from file if available
    const display: DisplayConfig = (file as ProjectFile & { display?: DisplayConfig }).display ?? {
      width: file.canvasSize.width,
      height: file.canvasSize.height,
      colorDepth: 32,
      rotation: 0,
    };
    const lvglConfig: LvglConfig = (file as ProjectFile & { lvglConfig?: LvglConfig }).lvglConfig ?? { ...DEFAULT_LVGL_CONFIG };

    const config: ProjectConfig = {
      id,
      name: name || file.name || 'Imported Project',
      createdAt: now,
      updatedAt: now,
      display,
      lvglConfig,
      codeGenOptions: file.codeGenOptions || { ...DEFAULT_CODEGEN_OPTIONS },
    };
    await dbUpdateProjectConfig(config);

    const pages: Page[] = (file.pages || []).map(p => ({
      id: p.id,
      name: p.name,
      components: p.components,
      backgroundColor: '#F5F5F5',
    }));
    await dbUpdateProjectData({
      projectId: id,
      pages,
      logicGraphs: file.logicGraphs || [],
      variables: (file.variables || []).map(v => ({ ...v, type: v.type as string })),
    });

    // Save resources
    const images = file.resources?.images || [];
    const fonts = file.resources?.fonts || [];
    for (const img of images) {
      await dbPutResource({ id: `${id}-img-${img.id}`, projectId: id, type: 'image', data: img });
    }
    for (const font of fonts) {
      await dbPutResource({ id: `${id}-font-${font.id}`, projectId: id, type: 'font', data: font });
    }

    await get().refreshList();
    return id;
  },
}));
