import { afterEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createComponent, createPage } from '../../codegen/__tests__/helpers';
import { generateTargetProject, generateTargetSource, resolveCIntegrationProfile, applyCIntegration } from '../index';

afterEach(() => vi.unstubAllGlobals());
const pages = [createPage({ id: 'screen', components: [createComponent('label', { id: 'label', props: { text: 'Hello' } })] })];
it('preserves the legacy generic C directory layout', () => {
  expect(resolveCIntegrationProfile()).toBe('generic');
  const bundle = generateTargetSource({ target: 'c-lvgl', pages });
  expect(bundle.files['ui.c']).toContain('ui_init');
  expect(bundle.manifest.cIntegrationProfile).toBe('generic');
  expect(bundle.files['integration-contract.json']).toBeUndefined();
});
it.each(['stm32cube-hal', 'rt-thread-scons'] as const)('exports %s adaptation paths and a truthful contract', async profile => {
  vi.stubGlobal('crypto', webcrypto);
  const bundle = await generateTargetProject({ target: 'c-lvgl', cIntegrationProfile: profile, pages });
  expect(bundle.files[profile === 'stm32cube-hal' ? 'Core/Src/hmi/ui.c' : 'applications/hmi/ui.c']).toContain('ui_init');
  expect(bundle.files[profile === 'stm32cube-hal' ? 'Core/Inc/hmi/ui.h' : 'applications/hmi/ui.h']).toContain('void ui_init');
  const contract = JSON.parse(String(bundle.files['integration-contract.json']));
  expect(contract.deployable).toBe(false);
  expect(contract.board).toBeNull();
  expect(contract.lvglVersion).toBe('9');
  expect(bundle.manifest.cIntegrationProfile).toBe(profile);
  expect(bundle.manifest.files.every(f => f.sha256?.length === 64)).toBe(true);
  if (profile === 'rt-thread-scons') expect(bundle.files['applications/hmi/SConscript']).toContain('DefineGroup');
});
it('remaps source map paths with profile source paths', () => {
  const bundle = generateTargetSource({ target: 'c-lvgl', pages });
  bundle.sourceMap = [{ file: 'ui.c', line: 1, componentId: 'label' }];
  applyCIntegration(bundle, 'stm32cube-hal');
  expect(bundle.sourceMap[0].file).toBe('Core/Src/hmi/ui.c');
});
it('preserves an unrelated stored C profile when generating a script target', () => {
  const bundle = generateTargetSource({ target: 'lispbm-vesc', cIntegrationProfile: 'stm32cube-hal', pages });
  expect(bundle.files['main.lisp']).toBeDefined();
  expect(bundle.manifest.cIntegrationProfile).toBeUndefined();
});
it('rejects unknown profiles explicitly', () => {
  for (const profile of [null, '', 'future-board']) expect(() => resolveCIntegrationProfile(profile)).toThrow();
});
