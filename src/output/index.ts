import type { LvglComponent, Page } from '../types';
import { generateCode as generateC } from '../codegen/generator';
import { DEFAULT_CODEGEN_OPTIONS } from '../codegen/types';
import { getComponentVarName, getScreenVarName } from '../codegen/utils/nameUtils';
import { generateCode as generateLisp, convertAssets } from '../codegen/lisp';
import { validateLinks } from '../codegen/lisp/validate';
import { BUILTIN_SIZES, collectUsedCustomFonts, isBuiltinFont } from '../codegen/lisp/uiParts/resources';
import { generateImageCCode, loadImageFromBase64, DEFAULT_IMAGE_OPTIONS } from '../resources/converters/imageConverter';
import { BASIC_API, BASIC_ACTIONS, BASIC_PROPS, BASIC_STYLES, BASIC_WIDGETS, generateBasic } from './basic';
import { resolveTargetId, getInitializationOptions, OutputValidationError } from './types';
import type { OutputInput, OutputIssue, OutputBundle, TargetId } from './types';
import { applyCIntegration, cArtifactPath, resolveCIntegrationProfile } from './cIntegration';
export * from './types';
export * from './cIntegration';

function components(pages: Page[]): LvglComponent[] {
  const out: LvglComponent[] = [];
  const walk = (cs: LvglComponent[], depth: number) => {
    if (depth > 64 || out.length + cs.length > 4096) throw new Error('Project exceeds generation limits (4096 controls / 64 levels).');
    for (const c of cs) { out.push(c); walk(c.children, depth + 1); }
  };
  if (pages.length > 128) throw new Error('Project exceeds 128 screens.');
  pages.forEach(p => walk(p.components, 0));
  return out;
}
function hasCode(v: unknown): boolean { return typeof v === 'string' && v.trim().length > 0; }
const C_WIDGETS = ['obj', 'btn', 'label', 'img', 'line', 'textarea', 'dropdown', 'checkbox', 'switch', 'slider', 'tabview', 'tileview', 'win', 'bar', 'arc', 'spinner', 'chart', 'table', 'calendar'];
const C_UNSUPPORTED_STYLES = ['imageRecolor', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'padRow', 'padColumn', 'translateX', 'translateY', 'skewX', 'skewY', 'bgOpa', 'borderOpa', 'outlineOpa', 'textOpa', 'clipCorner', 'transformWidth', 'transformHeight', 'bgMainStop', 'borderPost', 'blurRadius', 'textOutlineWidth', 'textOutlineColor'];
const BASIC_EVENTS = ['LV_EVENT_CLICKED', 'LV_EVENT_PRESSED', 'LV_EVENT_RELEASED', 'LV_EVENT_LONG_PRESSED', 'LV_EVENT_VALUE_CHANGED', 'LV_EVENT_FOCUSED', 'LV_EVENT_DEFOCUSED', 'LV_EVENT_READY', 'LV_EVENT_CANCEL'];
const C_NODES = ['event_trigger', 'timer_trigger', 'if_else', 'switch', 'compare', 'logic_op', 'set_property', 'navigate_page', 'show_hide', 'set_text', 'set_value', 'call_function', 'delay', 'var_read', 'var_write', 'math_op', 'string_op', 'get_property', 'c_code_block'];
const LISP_NODES = [...C_NODES, 'for_loop', 'map_range', 'clamp', 'math_func', 'to_string', 'random'];
const C_FLAGS = ['clickable', 'checkable', 'scrollable', 'scrollElastic', 'scrollMomentum', 'scrollOnFocus', 'snappable', 'pressLock', 'eventBubble', 'gesturesBubble', 'hidden', 'disabled'];
export function validateTargetProject(input: OutputInput): OutputIssue[] {
  const target = resolveTargetId(input.target);
  resolveCIntegrationProfile(input.cIntegrationProfile);
  const all = components(input.pages);
  const issues: OutputIssue[] = [];
  const add = (code: string, message: string, componentId?: string, eventId?: string) => issues.push({ code, message, componentId, eventId });
  const resolveComponent = (ref: unknown) => all.find(c => c.id === ref) ?? all.find(c => c.name === ref);
  const ambiguous = (ref: unknown) => typeof ref === 'string' && !all.some(c => c.id === ref) && all.filter(c => c.name === ref).length > 1;
  const resourceSymbols = new Set<string>();
  const resourcePaths = new Set<string>();
  const checkResource = (symbol: string, paths: string[]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(symbol)) add('unsafe-resource-symbol', `Resource symbol ${symbol} must be an identifier.`);
    if (resourceSymbols.has(symbol)) add('duplicate-resource-symbol', `Duplicate resource symbol: ${symbol}`);
    resourceSymbols.add(symbol);
    for (const path of paths) {
      const key = path.toLowerCase();
      if (resourcePaths.has(key)) add('resource-path-collision', `Resource artifact path collision: ${path}`);
      resourcePaths.add(key);
    }
  };
  for (const image of input.images ?? []) checkResource(image.cArrayName, [`assets/${image.cArrayName}.${target === 'c-lvgl' ? 'c' : 'bin'}`]);
  const fontUses = collectUsedCustomFonts(input.pages, input.fonts ?? [], input.defaultFont, input.defaultFontSize);
  for (const font of input.fonts ?? []) checkResource(font.cFontName, [...(fontUses.get(font.cFontName) ?? font.sizes)].map(size => `font/${font.cFontName}_${size}.bin`));
  const checkFont = (name: unknown, size: unknown, componentId?: string) => {
    if (typeof name !== 'string' || !name) { add('missing-font', `Invalid font reference: ${String(name)}`, componentId); return; }
    if (isBuiltinFont(name)) {
      if (!BUILTIN_SIZES.includes(Number(name.slice('montserrat_'.length)))) add('unsupported-font', `LispBM bridge does not provide ${name}.`, componentId);
    } else {
      if (!(input.fonts ?? []).some(f => f.cFontName === name)) add('missing-font', `Custom font ${name} is missing.`, componentId);
      if (size !== undefined && (typeof size !== 'number' || !Number.isInteger(size) || size <= 0)) add('unsupported-font-size', 'Custom font size must be a positive integer.', componentId);
    }
  };
  if (target === 'lispbm-vesc') {
    if (input.options?.lvglVersion !== undefined && input.options.lvglVersion !== '9') add('unsupported-lvgl-version', 'The PR3 LispBM bridge generator supports LVGL 9 only.');
    if (input.defaultFont) checkFont(input.defaultFont, input.defaultFontSize);
  }
  if (target === 'c-lvgl') {
    const options = { ...DEFAULT_CODEGEN_OPTIONS, ...input.options };
    const generatedSymbols = new Set<string>();
    const register = (symbol: string, componentId?: string) => {
      if (generatedSymbols.has(symbol)) add('c-symbol-collision', `C generated symbol ${symbol} is not unique; rename the conflicting screen/control.`, componentId);
      generatedSymbols.add(symbol);
    };
    input.pages.forEach(p => register(getScreenVarName(p.name, options)));
    all.forEach(c => register(getComponentVarName(c.name, options), c.id));
  }
  const host = getInitializationOptions();
  if (!host.allowedTargets.includes(target) || (!host.allowTargetSwitch && target !== host.defaultTarget)) add('host-target-restriction', `Host configuration does not allow output for ${target}.`);
  if ((input.images?.length ?? 0) > 256 || (input.fonts?.length ?? 0) > 32 || (input.logicGraphs?.length ?? 0) > 128 || (input.logicGraphs ?? []).some(g => g.nodes.length > 4096)) add('generation-limit', 'Project resources or logic graphs exceed generation limits.');
  const ids = new Set<string>();
  for (const p of input.pages) { if (ids.has(p.id)) add('duplicate-id', `Duplicate stable ID: ${p.id}`); ids.add(p.id); }
  for (const c of all) {
    if (!c.id || ids.has(c.id)) add('duplicate-id', `Missing or duplicate stable ID: ${c.id}`, c.id);
    ids.add(c.id);
    if (![c.x, c.y, c.width, c.height].every(Number.isFinite) || c.width < 0 || c.height < 0) add('invalid-geometry', 'Control geometry must be finite with nonnegative size.', c.id);
    for (const e of c.events) {
      if (e.handlerType === 'builtin' && ambiguous(e.action?.targetComponent)) add('ambiguous-reference', `Action reference ${e.action?.targetComponent} matches multiple controls; select a stable ID.`, c.id, e.id);
      if (!e.id || ids.has(e.id)) add('duplicate-id', `Missing or duplicate stable event ID: ${e.id}`, c.id, e.id);
      ids.add(e.id);
      if (e.handlerType === 'builtin' && e.action && !['navigate', 'setProperty', 'show', 'hide', 'enable', 'disable', 'setText', 'setValue', 'setState', 'setFlag'].includes(e.action.type)) add('unsupported-action', `Unknown action ${String(e.action.type)}.`, c.id, e.id);
      if (e.handlerType === 'custom') {
        const current = e.customCodeByTarget?.[target] ?? (target === 'c-lvgl' ? e.customCode : undefined);
        const other = hasCode(e.customCode) || Object.values(e.customCodeByTarget ?? {}).some(hasCode);
        if (!hasCode(current) && other) add('missing-target-code', `Event ${e.id} has no handwritten implementation for ${target}.`, c.id, e.id);
      }
    }
    if (target === 'lispbm-vesc' && ![...C_WIDGETS, 'led', 'roller', 'spinbox', 'keyboard', 'list', 'msgbox', 'scale'].includes(c.type)) add('unsupported-widget', `LispBM backend does not support ${c.type}.`, c.id);
    if (target === 'lispbm-vesc') {
      if (c.props.fontResource) checkFont(c.props.fontResource, c.props.fontSize, c.id);
      else if (c.props.fontSize !== undefined) {
        if (input.defaultFont && !isBuiltinFont(input.defaultFont)) checkFont(input.defaultFont, c.props.fontSize, c.id);
        else if (typeof c.props.fontSize !== 'number' || !BUILTIN_SIZES.includes(c.props.fontSize)) add('unsupported-font-size', `LispBM cannot preserve font size ${String(c.props.fontSize)}.`, c.id);
      }
      for (const style of Object.values(c.styles)) if (style?.textFont) checkFont(style.textFont, style.textFontSize, c.id);
    }
    if (target === 'c-lvgl') {
      if (!C_WIDGETS.includes(c.type)) add('unsupported-widget', `C backend does not support ${c.type}.`, c.id);
      if (c.bindings?.length) add('unsupported-binding', 'C variable bindings are not implemented.', c.id);
      for (const key of Object.keys(c.flags ?? {})) if (!C_FLAGS.includes(key)) add('unsupported-flag', `C flag ${key} is not implemented.`, c.id);
      for (const [state, style] of Object.entries(c.styles)) {
        if (!style) continue;
        if (!['default', 'pressed', 'focused', 'disabled'].includes(state) && Object.keys(style).length) add('unsupported-style-state', `C style state ${state} is not implemented.`, c.id);
        for (const key of Object.keys(style)) if (C_UNSUPPORTED_STYLES.includes(key)) add('unsupported-style', `C style ${key} is not implemented.`, c.id);
      }
      for (const e of c.events) if (e.handlerType === 'builtin' && e.action && ['setState', 'setFlag'].includes(e.action.type)) add('unsupported-action', `C action ${e.action.type} is not implemented.`, c.id, e.id);
    }
    if (target === 'basic-iotembedded') {
      if (!BASIC_WIDGETS.includes(c.type)) add('unsupported-widget', `BASIC draft does not support ${c.type}.`, c.id);
      if (c.animations.length || c.bindings?.length) add('unsupported-behavior', 'BASIC animations and variable bindings are not implemented.', c.id);
      if ((c.widthMode && c.widthMode !== 'px') || (c.heightMode && c.heightMode !== 'px') || (c.align && c.align !== 'default')) add('unsupported-layout', 'BASIC draft supports absolute pixel layout only.', c.id);
      if (![c.x, c.y, c.width, c.height].every(Number.isInteger)) add('unsupported-geometry', 'BASIC draft pixel coordinates and sizes must be integers.', c.id);
      for (const [state, style] of Object.entries(c.styles)) {
        if (!style) continue;
        if (state !== 'default' && Object.keys(style).length) add('unsupported-style-state', `BASIC style state ${state} is not implemented.`, c.id);
        for (const key of Object.keys(style)) if (!BASIC_STYLES.includes(key)) add('unsupported-style', `BASIC style ${key} is not implemented.`, c.id);
      }
      for (const key of Object.keys(c.props)) if (!BASIC_PROPS[c.type]?.includes(key)) add('unsupported-property', `BASIC property ${c.type}.${key} is not implemented.`, c.id);
      for (const key of Object.keys(c.flags ?? {})) if (!['hidden', 'disabled'].includes(key)) add('unsupported-flag', `BASIC flag ${key} is not implemented.`, c.id);
      for (const e of c.events) {
        if (!BASIC_EVENTS.includes(e.eventType)) add('unsupported-event', `BASIC event ${e.eventType} is not implemented.`, c.id, e.id);
        if (e.handlerType === 'builtin' && !e.action) add('missing-action', 'Builtin BASIC event requires an action.', c.id, e.id);
        if (e.handlerType === 'builtin' && e.action && !BASIC_ACTIONS.includes(e.action.type)) add('unsupported-action', `BASIC action ${e.action.type} is not implemented.`, c.id, e.id);
        if (e.action?.type === 'setText' && typeof e.action.value !== 'string') add('invalid-action-value', 'BASIC setText requires a string.', c.id, e.id);
        if (e.action?.type === 'setValue' && (typeof e.action.value !== 'number' || !Number.isFinite(e.action.value))) add('invalid-action-value', 'BASIC setValue requires a finite number.', c.id, e.id);
        const destination = resolveComponent(e.action?.targetComponent);
        if (destination && e.action?.type === 'setText' && !['btn', 'label', 'checkbox'].includes(destination.type)) add('unsupported-action-target', `BASIC setText does not support ${destination.type}.`, c.id, e.id);
        if (destination && e.action?.type === 'setValue' && !['slider', 'bar'].includes(destination.type)) add('unsupported-action-target', `BASIC setValue does not support ${destination.type}.`, c.id, e.id);
        if (e.action?.type === 'navigate' && (e.action.animation && e.action.animation !== 'none')) add('unsupported-animation', 'BASIC screen navigation animation is not implemented.', c.id, e.id);
      }
    }
    if (c.type === 'img' && c.props.src && !(input.images ?? []).some(i => i.id === c.props.src || i.name === c.props.src)) add('missing-image', `Image ${String(c.props.src)} is missing.`, c.id);
  }
  for (const g of input.logicGraphs ?? []) for (const n of g.nodes) {
    if (ambiguous(n.params.targetComponent)) issues.push({ code: 'ambiguous-reference', message: `Logic reference ${n.params.targetComponent} matches multiple controls; select a stable ID.`, nodeId: n.id });
    if (target !== 'basic-iotembedded' && !(target === 'c-lvgl' ? C_NODES : LISP_NODES).includes(n.subType)) issues.push({ code: 'unsupported-logic-node', message: `${target} graph node ${n.subType} is not implemented.`, nodeId: n.id });
    if (n.subType !== 'c_code_block') continue;
    const current = n.params.codeByTarget?.[target] ?? (target === 'c-lvgl' ? n.params.code : undefined);
    if (!hasCode(current) && (hasCode(n.params.code) || Object.values(n.params.codeByTarget ?? {}).some(hasCode))) issues.push({ code: 'missing-target-code', message: `Logic node ${n.id} has no handwritten implementation for ${target}.`, nodeId: n.id });
  }
  if (target === 'basic-iotembedded') {
    if ((input.logicGraphs ?? []).some(g => g.nodes.length || g.variables.length)) add('unsupported-logic', 'BASIC graph generation and variables are not implemented; use BASIC event code.');
    if (input.images?.length || input.fonts?.length || (input.defaultFont && !/^(lv_font_)?montserrat_14$/.test(input.defaultFont)) || (input.defaultFontSize !== undefined && input.defaultFontSize !== 14)) add('unsupported-resources', 'BASIC draft supports only the default Montserrat 14 reference font; image/font resource conversion is not implemented.');
  }
  for (const link of validateLinks(input.pages, input.logicGraphs ?? [])) add('invalid-reference', `${link.where}: ${link.message}`);
  return issues;
}

function forTarget(input: OutputInput, target: TargetId): Page[] {
  const all = components(input.pages);
  const cReference = (ref: string | undefined) => (all.find(c => c.id === ref) ?? all.find(c => c.name === ref))?.name ?? ref;
  return input.pages.map(p => ({ ...p, components: p.components.map(function clone(c): LvglComponent {
    return { ...c, events: c.events.map(e => ({ ...e, action: target === 'c-lvgl' && e.action ? { ...e.action, targetComponent: cReference(e.action.targetComponent) } : e.action, customCode: e.customCodeByTarget?.[target] ?? (target === 'c-lvgl' ? e.customCode : undefined) })), children: c.children.map(clone) };
  }) }));
}
function makeBundle(input: OutputInput, files: OutputBundle['files'], sourceMap: OutputBundle['sourceMap'] = []): OutputBundle {
  const target = resolveTargetId(input.target);
  const manifest: OutputBundle['manifest'] = { schemaVersion: 1, target, api: target === 'basic-iotembedded' ? BASIC_API : target === 'c-lvgl' ? `lvgl/${input.options?.lvglVersion ?? '9'}` : 'lispbm-vesc-lvgl-bridge/pr3', status: 'source-contract', deployable: false, files: [] };
  return { target, files, issues: [], deployable: false, manifest, sourceMap };
}
export function generateTargetSource(input: OutputInput): OutputBundle {
  const issues = validateTargetProject(input);
  if (issues.length) throw new OutputValidationError(issues);
  const target = resolveTargetId(input.target);
  if (target === 'basic-iotembedded') {
    const all = components(input.pages);
    const pages = input.pages.map(p => ({ ...p, components: p.components.map(function clone(c): LvglComponent {
      return { ...c, name: c.id, children: c.children.map(clone), events: c.events.map(e => ({ ...e, action: e.action ? { ...e.action, targetComponent: (all.find(item => item.id === e.action?.targetComponent) ?? all.find(item => item.name === e.action?.targetComponent))?.id } : undefined })) };
    }) }));
    const result = generateBasic({ ...input, pages }); return makeBundle(input, result.files, result.sourceMap);
  }
  const pages = forTarget(input, target);
  const all = components(input.pages);
  const graphs = (input.logicGraphs ?? []).map(g => ({ ...g, nodes: g.nodes.map(n => ({ ...n, params: { ...n.params, ...(target === 'c-lvgl' && n.params.targetComponent ? { targetComponent: (all.find(c => c.id === n.params.targetComponent) ?? all.find(c => c.name === n.params.targetComponent))?.name ?? n.params.targetComponent } : {}), code: n.params.codeByTarget?.[target] ?? (target === 'c-lvgl' ? n.params.code : undefined) } })) }));
  const files = target === 'c-lvgl'
    ? generateC(pages, input.options, graphs, input.theme, input.images, input.fonts, input.defaultFont, input.defaultFontSize, input.useBuiltinSymbols, input.symbolFont)
    : generateLisp(pages, {}, graphs, input.theme, input.images, input.fonts, input.defaultFont, input.defaultFontSize);
  const bundle = makeBundle(input, { ...files });
  applyCIntegration(bundle, input.cIntegrationProfile);
  return bundle;
}
export async function generateTargetProject(input: OutputInput): Promise<OutputBundle> {
  const bundle = generateTargetSource(input);
  if (bundle.target === 'lispbm-vesc') {
    const assets = await convertAssets(input.pages, input.images ?? [], input.fonts ?? [], input.defaultFont, input.defaultFontSize);
    if (assets.errors.length) throw new OutputValidationError(assets.errors.map(message => ({ code: 'resource-conversion', message })));
    const pages = forTarget(input, bundle.target);
    const graphs = (input.logicGraphs ?? []).map(g => ({ ...g, nodes: g.nodes.map(n => ({ ...n, params: { ...n.params, code: n.params.codeByTarget?.['lispbm-vesc'] } })) }));
    Object.assign(bundle.files, generateLisp(pages, {}, graphs, input.theme, input.images, input.fonts, input.defaultFont, input.defaultFontSize, assets.imagePalettes), assets.files);
  }
  if (bundle.target === 'c-lvgl') {
    const used = new Set(components(input.pages).filter(c => c.type === 'img').map(c => String(c.props.src)));
    for (const img of input.images ?? []) if (used.has(img.id) || used.has(img.name)) {
      const { imageData } = await loadImageFromBase64(img.data);
      bundle.files[cArtifactPath(`assets/${img.cArrayName}.c`, resolveCIntegrationProfile(input.cIntegrationProfile))] = generateImageCCode(img.cArrayName, imageData, { ...DEFAULT_IMAGE_OPTIONS, format: img.format }, input.options?.lvglVersion).cCode;
    }
    // Existing C generator references fonts; the editor has only placeholder font source templates.
    if ((input.fonts ?? []).length) bundle.files['FONT_BUILD_REQUIRED.txt'] = 'Custom C font bitmaps must be produced with lv_font_conv for the selected LVGL version. This source bundle is not deployable.\n';
    // Refresh the RT SCons source list after image source files have been added.
    if (bundle.manifest.cIntegrationProfile === 'rt-thread-scons') {
      const sources = Object.keys(bundle.files).filter(path => path.endsWith('.c')).map(path => path.replace('applications/hmi/', '')).sort();
      bundle.files['applications/hmi/SConscript'] = ['from building import *', '', 'cwd = GetCurrentDir()', `src = ${JSON.stringify(sources)}`, 'group = DefineGroup("HmiCraft", src, depend = [], CPPPATH = [cwd])', 'Return("group")', ''].join('\n');
    }
  }
  bundle.files['source-map.json'] = JSON.stringify(bundle.sourceMap, null, 2) + '\n';
  for (const [path, content] of Object.entries(bundle.files)) {
    if (!/^[\w./-]+$/.test(path) || path.startsWith('/') || path.split('/').includes('..')) throw new Error(`Unsafe artifact path: ${path}`);
    const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const hash = await crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer);
    bundle.manifest.files.push({ path, bytes: bytes.length, sha256: Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join(''), owner: path.startsWith('user/') ? 'user' : /(^|\/)(assets|font)\//.test(path) ? 'resource' : 'generated' });
  }
  bundle.files['manifest.json'] = JSON.stringify(bundle.manifest, null, 2) + '\n';
  return bundle;
}
