import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createProjectFile, parseProject, serializeProject, autoSaveProject, loadAutoSavedProject } from '../projectManager';
import { DEFAULT_DISPLAY, DEFAULT_LVGL_CONFIG, useProjectStore } from '../../store/projectStore';

const memory = vi.hoisted(() => new Map<string, Map<string, unknown>>());
vi.mock('idb', () => ({ openDB: async () => {
  const table = (name: string) => {
    if (!memory.has(name)) memory.set(name, new Map());
    return memory.get(name)!;
  };
  const put = async (name: string, value: unknown) => {
    const row = value as { id?: string; projectId?: string };
    table(name).set(row.id ?? row.projectId!, structuredClone(value));
  };
  return {
    put, get: async (name: string, id: string) => structuredClone(table(name).get(id)),
    getAll: async (name: string) => [...table(name).values()].map(value => structuredClone(value)),
    getAllFromIndex: async (name: string, _index: string, id: string) => [...table(name).values()].filter(value => (value as { projectId: string }).projectId === id).map(value => structuredClone(value)),
    delete: async (name: string, id: string) => { table(name).delete(id); },
    transaction: (name: string) => ({ store: {
      get: async (id: string) => structuredClone(table(name).get(id)),
      put: (value: unknown) => put(name, value), delete: async (id: string) => { table(name).delete(id); },
    }, done: Promise.resolve() }),
  };
} }));

const project = (target: 'c-lvgl' | 'lispbm-vesc' | 'basic-iotembedded' = 'c-lvgl') => createProjectFile('Round trip', [], { width: 480, height: 320 } as Parameters<typeof createProjectFile>[2], [], [], [], target);

beforeEach(() => { delete window.LVGL_EDITOR_OPTIONS; memory.clear(); useProjectStore.setState({ projects: [], initialized: false, loading: false }); });

describe('project target persistence contracts', () => {
  it.each(['c-lvgl', 'lispbm-vesc', 'basic-iotembedded'] as const)('retains %s through IndexedDB save/export/import/reopen', async target => {
    const store = useProjectStore.getState();
    const id = await store.createProject('A', DEFAULT_DISPLAY, DEFAULT_LVGL_CONFIG, target);
    await store.saveProjectData(id, [], [], [], []);
    const exported = await store.exportProject(id);
    expect(exported.outputTarget).toBe(target);
    const imported = await store.importProject(parseProject(serializeProject(exported)));
    expect((await store.getProjectConfig(imported))?.outputTarget).toBe(target);
  });
  it('migrates a legacy missing target to C and rejects unknown targets before writing', async () => {
    const legacy = project(); delete legacy.outputTarget;
    expect(parseProject(serializeProject(legacy)).outputTarget).toBe('c-lvgl');
    const store = useProjectStore.getState();
    await expect(store.importProject({ ...legacy, outputTarget: 'unknown' } as never)).rejects.toThrow('Unknown output target');
    expect(memory.get('projects')?.size ?? 0).toBe(0);
  });
  it('retains target edits when autosave updates the project timestamp', async () => {
    const store = useProjectStore.getState();
    const id = await store.createProject('A', DEFAULT_DISPLAY, DEFAULT_LVGL_CONFIG);
    const cfg = (await store.getProjectConfig(id))!;
    await store.updateProjectConfig({ ...cfg, outputTarget: 'lispbm-vesc' });
    await store.saveProjectData(id, [], [], [], []);
    expect((await store.getProjectConfig(id))?.outputTarget).toBe('lispbm-vesc');
  });
  it('keeps all language fields verbatim through serialization and local autosave', () => {
    const local = new Map<string, string>();
    vi.stubGlobal('localStorage', { setItem: (key: string, value: string) => local.set(key, value), getItem: (key: string) => local.get(key) ?? null });
    const file = project('basic-iotembedded');
    file.logicGraphs = [{ id: 'g', name: 'Logic', nodes: [{ id: 'n', type: 'custom', subType: 'c_code_block', label: 'User', position: { x: 0, y: 0 }, params: { code: 'C', codeByTarget: { 'c-lvgl': 'C', 'lispbm-vesc': '(print 1)', 'basic-iotembedded': 'PRINT 1' } }, inputs: [], outputs: [] }], connections: [], variables: [] }];
    autoSaveProject(file);
    expect(loadAutoSavedProject()).toEqual(file);
    vi.unstubAllGlobals();
  });
  it.each(['generic', 'stm32cube-hal', 'rt-thread-scons'] as const)('retains C profile %s through target switching and round trip', async profile => {
    const store = useProjectStore.getState();
    const id = await store.createProject('C profile', DEFAULT_DISPLAY, DEFAULT_LVGL_CONFIG, 'c-lvgl', profile);
    const cfg = (await store.getProjectConfig(id))!;
    await store.updateProjectConfig({ ...cfg, outputTarget: 'lispbm-vesc' });
    await store.saveProjectData(id, [], [], [], []);
    const file = await store.exportProject(id);
    expect(file.cIntegrationProfile).toBe(profile);
    const copy = await store.importProject(parseProject(serializeProject(file)));
    const restored = (await store.getProjectConfig(copy))!;
    await store.updateProjectConfig({ ...restored, outputTarget: 'c-lvgl' });
    expect((await store.getProjectConfig(copy))?.cIntegrationProfile).toBe(profile);
  });
  it('migrates missing C profile to generic and rejects unknown profiles before writing', async () => {
    const file = project(); delete file.cIntegrationProfile;
    expect(parseProject(serializeProject(file)).cIntegrationProfile).toBe('generic');
    await expect(useProjectStore.getState().importProject({ ...file, cIntegrationProfile: 'unknown' } as never)).rejects.toThrow('Unknown C integration profile');
    expect(memory.get('projects')?.size ?? 0).toBe(0);
  });
  it('rejects a future project major version', () => {
    expect(() => parseProject(serializeProject({ ...project(), version: '99.0.0' }))).toThrow('Unsupported project version');
  });
  it('enforces host targets on import, reopen, export and configuration updates without changing records', async () => {
    const store = useProjectStore.getState();
    const id = await store.createProject('C retained', DEFAULT_DISPLAY, DEFAULT_LVGL_CONFIG, 'c-lvgl');
    const file = await store.exportProject(id);
    const cfg = (await store.getProjectConfig(id))!;
    window.LVGL_EDITOR_OPTIONS = { defaultTarget: 'basic-iotembedded', allowedTargets: ['basic-iotembedded'], allowTargetSwitch: false };
    await expect(store.importProject(file)).rejects.toThrow('Host');
    await expect(store.getProjectConfig(id)).rejects.toThrow('Host');
    await expect(store.exportProject(id)).rejects.toThrow('Host');
    await expect(store.updateProjectConfig({ ...cfg, outputTarget: 'basic-iotembedded' })).rejects.toThrow('does not allow changing');
    expect((memory.get('projects')?.get(id) as { outputTarget: string }).outputTarget).toBe('c-lvgl');
    delete window.LVGL_EDITOR_OPTIONS;
  });
  it('rejects unknown top-level project fields before writing', async () => {
    const store = useProjectStore.getState();
    await expect(store.importProject({ ...project(), futureSchemaField: 'keep this' } as never)).rejects.toThrow('Unknown project fields');
    expect(memory.get('projects')?.size ?? 0).toBe(0);
  });
  it('preserves nested page/resource/canvas metadata and variables after import, save and export', async () => {
    const file = { ...project(), canvasSize: { width: 480, height: 320, unit: 'pixel' }, pages: [{ id: 'p', name: 'Page', backgroundColor: '#123456', metadata: { source: 'keep' }, components: [] }], resources: { images: [], fonts: [], packageMeta: { label: 'keep' } }, variables: [{ id: 'v', name: 'counter', type: 'int' as const, defaultValue: '7', unit: 'count' }] };
    const store = useProjectStore.getState();
    const id = await store.importProject(file);
    const { data } = await store.loadProjectData(id);
    await store.saveProjectData(id, data.pages, data.logicGraphs, [], []);
    const saved = await store.exportProject(id);
    expect(saved.canvasSize).toEqual(file.canvasSize);
    expect(saved.resources).toEqual(file.resources);
    expect(saved.pages).toEqual(file.pages);
    expect(saved.variables).toEqual(file.variables);
  });
});
