import { afterEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { createComponent, createEvent, createPage, createBuiltinAction, createFontResource, createImageResource, createLogicGraph, createLogicNode } from '../../codegen/__tests__/helpers';
import { componentDefinitions } from '../../utils/componentDefinitions';
import { generateTargetSource, generateTargetProject, resolveTargetId, getInitializationOptions, OutputValidationError, validateTargetProject } from '../index';
import type { OutputInput, TargetId } from '../types';

afterEach(() => vi.unstubAllGlobals());
const input = (target: TargetId, overrides: Partial<OutputInput> = {}): OutputInput => ({ target, pages: [createPage({ id: 'screen', name: 'main', components: [createComponent('label', { id: 'label', name: 'title', props: { text: 'Hello' } })] })], ...overrides });

describe('three target output contract', () => {
  it('rejects unavailable Lisp builtin fonts and sizes before export', () => {
    for (const overrides of [
      { defaultFont: 'montserrat_28' },
      { pages: [createPage({ components: [createComponent('label', { props: { fontResource: 'montserrat_28' } })] })] },
      { pages: [createPage({ components: [createComponent('label', { props: { fontSize: 28 } })] })] },
      { pages: [createPage({ components: [createComponent('label', { styles: { default: {}, pressed: { textFont: 'montserrat_28' } } })] })] },
    ]) expect(() => generateTargetSource(input('lispbm-vesc', overrides))).toThrow(OutputValidationError);
    expect(validateTargetProject(input('lispbm-vesc', { defaultFont: 'montserrat_24', defaultFontSize: 28 }))).toEqual([]);
  });
  it('requires actual custom Lisp font resources for project, prop and style references', () => {
    for (const overrides of [
      { defaultFont: 'font_missing' },
      { pages: [createPage({ components: [createComponent('label', { props: { fontResource: 'font_missing', fontSize: 24 } })] })] },
      { pages: [createPage({ components: [createComponent('label', { styles: { default: { textFont: 'font_missing', textFontSize: 24 } } })] })] },
    ]) expect(validateTargetProject(input('lispbm-vesc', overrides)).map(i => i.code)).toContain('missing-font');
    const data = input('lispbm-vesc', { defaultFont: 'font_roboto', defaultFontSize: 28, fonts: [createFontResource()] });
    expect(validateTargetProject(data)).toEqual([]);
    expect(String(generateTargetSource(data).files['main.lisp'])).toContain('font/font_roboto_28.bin');
  });
  it('rejects explicit Lisp LVGL 8 options rather than silently ignoring them', () => {
    expect(validateTargetProject(input('lispbm-vesc', { options: { lvglVersion: '8' } })).map(i => i.code)).toContain('unsupported-lvgl-version');
    expect(validateTargetProject(input('lispbm-vesc', { options: { lvglVersion: '9' } }))).toEqual([]);
  });
  it.each(['c-lvgl', 'lispbm-vesc'] as const)('rejects duplicate resource symbols before %s conversion', async target => {
    const data = input(target, { images: [createImageResource({ id: 'i1' }), createImageResource({ id: 'i2' })] });
    expect(validateTargetProject(data).map(i => i.code)).toContain('duplicate-resource-symbol');
    await expect(generateTargetProject(data)).rejects.toBeInstanceOf(OutputValidationError);
    expect(validateTargetProject(input(target, { fonts: [createFontResource({ id: 'f1' }), createFontResource({ id: 'f2' })] })).map(i => i.code)).toContain('duplicate-resource-symbol');
  });
  it('rejects unsafe resource paths and case-insensitive artifact collisions', () => {
    expect(validateTargetProject(input('lispbm-vesc', { images: [createImageResource({ cArrayName: '../ui' })] })).map(i => i.code)).toContain('unsafe-resource-symbol');
    expect(validateTargetProject(input('lispbm-vesc', { images: [createImageResource({ id: 'i1', cArrayName: 'Logo' }), createImageResource({ id: 'i2', cArrayName: 'logo' })] })).map(i => i.code)).toContain('resource-path-collision');
    expect(validateTargetProject(input('lispbm-vesc', { fonts: [createFontResource({ id: 'f1', cFontName: 'Font' }), createFontResource({ id: 'f2', cFontName: 'font' })] })).map(i => i.code)).toContain('resource-path-collision');
  });
  it.each(['lispbm-vesc', 'basic-iotembedded'] as const)('rejects cross-screen ambiguous action names for %s and accepts stable IDs', target => {
    const button = createComponent('btn', { id: 'button', events: [createEvent({ action: createBuiltinAction({ type: 'hide', targetComponent: 'shared' }) })] });
    const pages = [createPage({ id: 's1', name: 'one', components: [button, createComponent('label', { id: 'l1', name: 'shared' })] }), createPage({ id: 's2', name: 'two', components: [createComponent('label', { id: 'l2', name: 'shared' })] })];
    expect(validateTargetProject({ target, pages }).map(i => i.code)).toContain('ambiguous-reference');
    button.events[0].action!.targetComponent = 'l2';
    expect(validateTargetProject({ target, pages })).toEqual([]);
  });
  it.each(['snake_case', 'camelCase'] as const)('resolves C stable IDs to matching event and graph declarations with %s', namingStyle => {
    const title = createComponent('label', { id: 'title-label', name: 'my_title' });
    const button = createComponent('btn', { id: 'button-id', name: 'button', events: [createEvent({ action: createBuiltinAction({ type: 'hide', targetComponent: 'title-label' }) })] });
    const graph = createLogicGraph({ nodes: [createLogicNode('event_trigger', { params: { targetComponent: 'title-label' } })] });
    const data: OutputInput = { target: 'c-lvgl', options: { namingStyle }, pages: [createPage({ components: [button, title] })], logicGraphs: [graph] };
    const before = JSON.stringify(data);
    const files = generateTargetSource(data).files;
    const variable = namingStyle === 'snake_case' ? 'ui_my_title' : 'ui_myTitle';
    expect(files['ui.h']).toContain(`lv_obj_t *${variable};`);
    expect(files['ui_events.c']).toContain(`lv_obj_add_flag(${variable}, LV_OBJ_FLAG_HIDDEN);`);
    expect(files['ui_logic.c']).toContain(`lv_obj_add_event_cb(${variable},`);
    expect(files['ui_events.c']).not.toContain('ui_title_label');
    expect(files['ui_logic.c']).not.toContain('ui_title_label');
    expect(JSON.stringify(data)).toBe(before);
  });
  it('rejects C duplicate and normalized colliding names even for explicit stable IDs', () => {
    for (const name of ['shared', 's-hared']) {
      const pages = [createPage({ name: 'one', components: [createComponent('label', { id: 'l1', name: name === 'shared' ? 'shared' : 's_hared' })] }), createPage({ name: 'two', components: [createComponent('label', { id: 'l2', name })] })];
      expect(validateTargetProject({ target: 'c-lvgl', pages }).map(i => i.code)).toContain('c-symbol-collision');
      expect(() => generateTargetSource({ target: 'c-lvgl', pages })).toThrow(OutputValidationError);
    }
  });
  it('rejects ambiguous logic references too', () => {
    const pages = [createPage({ name: 'one', components: [createComponent('label', { name: 'shared' })] }), createPage({ name: 'two', components: [createComponent('label', { name: 'shared' })] })];
    const graph = createLogicGraph({ nodes: [createLogicNode('set_text', { params: { targetComponent: 'shared' } })] });
    expect(validateTargetProject({ target: 'lispbm-vesc', pages, logicGraphs: [graph] }).map(i => i.code)).toContain('ambiguous-reference');
  });
  it('prioritizes BASIC stable IDs over another control name without mutating user data', () => {
    const button = createComponent('btn', { id: 'button', events: [createEvent({ action: createBuiltinAction({ type: 'hide', targetComponent: 'l1' }) })] });
    const pages = [createPage({ components: [button, createComponent('label', { id: 'l1', name: 'first' }), createComponent('label', { id: 'l2', name: 'l1' })] })];
    const before = JSON.stringify(pages);
    expect(generateTargetSource({ target: 'basic-iotembedded', pages }).files['generated/events.bas']).toContain('HMI_SET_VISIBLE("l1", 0)');
    expect(JSON.stringify(pages)).toBe(before);
  });
  it('migrates only absent targets to C and rejects explicit unknown values', () => {
    expect(resolveTargetId()).toBe('c-lvgl');
    for (const value of [null, '', 'future-target', 0]) expect(() => resolveTargetId(value)).toThrow();
  });
  it('validates host defaults and restrictions', () => {
    expect(getInitializationOptions().defaultTarget).toBe('c-lvgl');
    expect(getInitializationOptions({ defaultTarget: 'basic-iotembedded', allowedTargets: ['basic-iotembedded'], allowTargetSwitch: false }).allowTargetSwitch).toBe(false);
    expect(() => getInitializationOptions({ defaultTarget: 'c-lvgl', allowedTargets: ['lispbm-vesc'] })).toThrow();
  });
  it.each(['c-lvgl', 'lispbm-vesc', 'basic-iotembedded'] as const)('generates independent %s source files', target => {
    const result = generateTargetSource(input(target));
    expect(result.target).toBe(target);
    expect(Object.keys(result.files)).toContain(target === 'c-lvgl' ? 'ui.c' : target === 'lispbm-vesc' ? 'main.lisp' : 'main.bas');
    expect(result.deployable).toBe(false);
  });
  it('supports the real default palette styles for BASIC label/button', () => {
    const definitions = componentDefinitions.filter(c => ['btn', 'label'].includes(c.type));
    const components = definitions.map(d => createComponent(d.type, { id: d.type, name: d.type, props: { ...d.defaultProps }, styles: structuredClone(d.defaultStyles) }));
    expect(validateTargetProject(input('basic-iotembedded', { defaultFont: 'montserrat_14', pages: [createPage({ id: 'screen', components })] }))).toEqual([]);
  });
  it('keeps handwritten target slots unchanged across generation', () => {
    const e = createEvent({ id: 'event', handlerType: 'custom', customCode: 'legacy_c();', customCodeByTarget: { 'c-lvgl': 'new_c();', 'lispbm-vesc': '(print "lisp")', 'basic-iotembedded': 'PRINT "basic"' } });
    const pages = [createPage({ components: [createComponent('btn', { events: [e] })] })];
    const before = JSON.stringify(pages);
    for (const target of ['c-lvgl', 'lispbm-vesc', 'basic-iotembedded'] as const) {
      const out = generateTargetSource({ target, pages });
      const all = Object.values(out.files).join('\n');
      expect(all).toContain(e.customCodeByTarget![target]);
      expect(all).not.toContain('legacy_c();');
    }
    expect(JSON.stringify(pages)).toBe(before);
  });
  it('never inserts legacy C into Lisp or BASIC', () => {
    const pages = [createPage({ components: [createComponent('btn', { events: [createEvent({ handlerType: 'custom', customCode: 'c_only();' })] })] })];
    for (const target of ['lispbm-vesc', 'basic-iotembedded'] as const) expect(() => generateTargetSource({ target, pages })).toThrow(OutputValidationError);
  });
  it('uses stable IDs for BASIC creation/event dispatch and separates user code', () => {
    const event = createEvent({ id: 'click', handlerType: 'custom', customCodeByTarget: { 'basic-iotembedded': 'PRINT "OK"' } });
    const pages = [createPage({ id: 'screen', name: 'main', components: [createComponent('btn', { id: 'button', name: 'renamable', events: [event] })] })];
    const first = generateTargetSource({ target: 'basic-iotembedded', pages });
    pages[0].components[0].name = 'renamed';
    const second = generateTargetSource({ target: 'basic-iotembedded', pages });
    expect(second.files['generated/layout.bas']).toBe(first.files['generated/layout.bas']);
    expect(first.files['generated/events.bas']).not.toContain('PRINT "OK"');
    expect(first.files['user/events.bas']).toContain('PRINT "OK"');
    expect(first.sourceMap.some(s => s.eventId === 'click' && s.componentId === 'button')).toBe(true);
  });
  it('escapes strings according to the actual MY-BASIC Core Profile lexer', () => {
    const data = input('basic-iotembedded');
    data.pages[0].components[0].props.text = 'A"B\\C\nD';
    expect(generateTargetSource(data).files['generated/layout.bas']).toContain('"A\\"B\\\\C\\nD"');
  });
  it('blocks unsupported controls, style states and resources before export', () => {
    for (const overrides of [{ pages: [createPage({ components: [createComponent('chart')] })] }, { pages: [createPage({ components: [createComponent('label', { styles: { default: {}, pressed: { bgColor: '#fff' } } })] })] }, { defaultFont: 'custom' }]) {
      expect(() => generateTargetSource(input('basic-iotembedded', overrides))).toThrow(OutputValidationError);
    }
  });
  it('blocks flags and nondefault font requests rather than silently dropping them', () => {
    const data = input('basic-iotembedded');
    data.pages[0].components[0].flags = { clickable: false };
    expect(validateTargetProject(data).some(i => i.code === 'unsupported-flag')).toBe(true);
    delete data.pages[0].components[0].flags;
    data.defaultFont = 'montserrat_24';
    expect(validateTargetProject(data).some(i => i.code === 'unsupported-resources')).toBe(true);
  });
  it('rejects duplicate stable IDs and unknown BASIC events', () => {
    const c = createComponent('btn', { id: 'duplicate', events: [createEvent({ eventType: 'LV_EVENT_GESTURE', action: createBuiltinAction({ type: 'hide', targetComponent: 'duplicate' }) })] });
    expect(validateTargetProject({ target: 'basic-iotembedded', pages: [createPage({ id: 'duplicate', components: [c] })] }).map(i => i.code)).toEqual(expect.arrayContaining(['duplicate-id', 'unsupported-event']));
  });
  it('blocks PR3 features that retained C does not implement', () => {
    const data = input('c-lvgl');
    data.pages[0].components[0].bindings = [{ id: 'binding', kind: 'text', variable: 'v' }];
    expect(() => generateTargetSource(data)).toThrow(OutputValidationError);
  });
  it('refuses host-restricted exports while leaving project data intact', () => {
    vi.stubGlobal('window', { LVGL_EDITOR_OPTIONS: { defaultTarget: 'basic-iotembedded', allowedTargets: ['basic-iotembedded'], allowTargetSwitch: false } });
    const data = input('c-lvgl');
    const before = JSON.stringify(data);
    expect(() => generateTargetSource(data)).toThrow(OutputValidationError);
    expect(JSON.stringify(data)).toBe(before);
  });
  it('writes deterministic package paths, real hashes and the draft runtime boundary', async () => {
    vi.stubGlobal('crypto', webcrypto);
    const data = input('basic-iotembedded');
    const result = await generateTargetProject(data);
    expect(result.manifest.api).toBe('hmicraft-hmi-basic/1-draft');
    expect(result.manifest.deployable).toBe(false);
    expect(result.manifest.files.every(f => /^[0-9a-f]{64}$/.test(f.sha256 ?? ''))).toBe(true);
    expect(result.manifest.files.some(f => f.path === 'user/events.bas' && f.owner === 'user')).toBe(true);
    expect((await generateTargetProject(data)).files['manifest.json']).toBe(result.files['manifest.json']);
    expect(JSON.parse(String(result.files['api-contract.json'])).implemented).toBe(false);
  });
});
