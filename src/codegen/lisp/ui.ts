// ui/ui.lisp generator: screens, widgets, styles and animations (the pieces live in uiParts/)

import { getArcStyle, isArcLike } from '../../utils/arcStyle';
import { isDarkTheme } from '../../utils/isDarkTheme';
import { styleSelector } from '../../utils/styleKeys';
import { EXTRA_CREATE_FN } from './extraWidgets';
import { banner, comment, indent, lcolor, shift, sym, userCode } from './sexp';
import { ANIM_RUNTIME, animForms, hasAnimations } from './uiParts/animations';
import type { UiContext } from './uiParts/context';
import { propsForms } from './uiParts/propsForms';
import { collectUsedCustomFonts, fontDataSym, fontSym } from './uiParts/resources';
import { styleForms } from './uiParts/styles';
import type { LvglComponent, Page, Theme } from '../../types';
import type { LispGenOptions } from './types';

export type { UiContext } from './uiParts/context';
export { findImage, imageDataSym, fontDataSym, collectUsedImages, collectUsedCustomFonts } from './uiParts/resources';
export { hasAnimations } from './uiParts/animations';

const CREATE_FN: Record<string, string> = {
  btn: 'lv-button-create',
  label: 'lv-label-create',
  img: 'lv-image-create',
  line: 'lv-line-create',
  textarea: 'lv-textarea-create',
  dropdown: 'lv-dropdown-create',
  checkbox: 'lv-checkbox-create',
  switch: 'lv-switch-create',
  slider: 'lv-slider-create',
  obj: 'lv-obj-create',
  tabview: 'lv-tabview-create',
  tileview: 'lv-tileview-create',
  win: 'lv-win-create',
  bar: 'lv-bar-create',
  led: 'lv-led-create',
  arc: 'lv-arc-create',
  spinner: 'lv-spinner-create',
  chart: 'lv-chart-create',
  table: 'lv-table-create',
  calendar: 'lv-calendar-create',
};


/** Text-related props shared by label-like widgets. */

const ALIGN: Record<string, string> = {
  center: 'LV_ALIGN_CENTER', top_left: 'LV_ALIGN_TOP_LEFT', top_mid: 'LV_ALIGN_TOP_MID', top_right: 'LV_ALIGN_TOP_RIGHT',
  bottom_left: 'LV_ALIGN_BOTTOM_LEFT', bottom_mid: 'LV_ALIGN_BOTTOM_MID', bottom_right: 'LV_ALIGN_BOTTOM_RIGHT',
  left_mid: 'LV_ALIGN_LEFT_MID', right_mid: 'LV_ALIGN_RIGHT_MID',
};

/** Forms (one per line, no indentation) that build `comp` and its subtree under `parent`. */
function componentForms(comp: LvglComponent, parent: string, pageName: string, ctx: UiContext): string[] {
  const o = ctx.options;
  const v = ctx.names.varOf(comp);
  const out: string[] = [];
  if (o.generateComments) out.push(comment(`Create ${comp.type}: ${comp.name}`));

  out.push(`(def ${v} (${CREATE_FN[comp.type] || EXTRA_CREATE_FN[comp.type] || 'lv-obj-create'} ${parent}))`);
  // keyboard and message box come centred / bottom-aligned from LVGL: pin them to the top left like every other widget
  if (comp.type === 'keyboard' || comp.type === 'msgbox') out.push(`(lv-obj-set-align ${v} LV_ALIGN_TOP_LEFT)`);
  out.push(`(lv-obj-set-pos ${v} ${Math.round(comp.x)} ${Math.round(comp.y)})`);

  const w = comp.widthMode === 'content' ? 'LV_SIZE_CONTENT' : comp.widthMode === 'percent' ? `(lv-pct ${comp.width})` : String(Math.round(comp.width));
  const h = comp.heightMode === 'content' ? 'LV_SIZE_CONTENT' : comp.heightMode === 'percent' ? `(lv-pct ${comp.height})` : String(Math.round(comp.height));
  if (w === String(Math.round(comp.width)) && h === String(Math.round(comp.height))) {
    out.push(`(lv-obj-set-size ${v} ${w} ${h})`);
  } else {
    out.push(`(lv-obj-set-width ${v} ${w})`);
    out.push(`(lv-obj-set-height ${v} ${h})`);
  }

  if (comp.align && comp.align !== 'default' && ALIGN[comp.align]) {
    out.push(`(lv-obj-align ${v} ${ALIGN[comp.align]} ${comp.alignOffsetX || 0} ${comp.alignOffsetY || 0})`);
  }

  const f = comp.flags;
  if (f) {
    if (f.hidden) out.push(`(lv-obj-add-flag ${v} LV_OBJ_FLAG_HIDDEN)`);
    if (f.disabled) out.push(`(lv-obj-add-state ${v} LV_STATE_DISABLED)`);
    if (f.clickable === false) out.push(`(lv-obj-remove-flag ${v} LV_OBJ_FLAG_CLICKABLE)`);
    if (f.checkable) out.push(`(lv-obj-add-flag ${v} LV_OBJ_FLAG_CHECKABLE)`);
    if (f.scrollable === false) out.push(`(lv-obj-remove-flag ${v} LV_OBJ_FLAG_SCROLLABLE)`);
    if (f.scrollElastic === false) out.push(`(lv-obj-remove-flag ${v} LV_OBJ_FLAG_SCROLL_ELASTIC)`);
    if (f.scrollMomentum === false) out.push(`(lv-obj-remove-flag ${v} LV_OBJ_FLAG_SCROLL_MOMENTUM)`);
    if (f.scrollOnFocus === false) out.push(`(lv-obj-remove-flag ${v} LV_OBJ_FLAG_SCROLL_ON_FOCUS)`);
    if (f.snappable) out.push(`(lv-obj-add-flag ${v} LV_OBJ_FLAG_SNAPPABLE)`);
    if (f.pressLock) out.push(`(lv-obj-add-flag ${v} LV_OBJ_FLAG_PRESS_LOCK)`);
    if (f.eventBubble) out.push(`(lv-obj-add-flag ${v} LV_OBJ_FLAG_EVENT_BUBBLE)`);
    if (f.gesturesBubble) out.push(`(lv-obj-add-flag ${v} LV_OBJ_FLAG_GESTURE_BUBBLE)`);
    if (f.clickFocusable === false) out.push(`(lv-obj-remove-flag ${v} LV_OBJ_FLAG_CLICK_FOCUSABLE)`);
    const extra: Array<[boolean | undefined, string]> = [
      [f.scrollOne, 'SCROLL_ONE'], [f.scrollChainHor, 'SCROLL_CHAIN_HOR'], [f.scrollChainVer, 'SCROLL_CHAIN_VER'],
      [f.scrollWithArrow, 'SCROLL_WITH_ARROW'], [f.eventTrickle, 'EVENT_TRICKLE'], [f.stateTrickle, 'STATE_TRICKLE'],
      [f.advHittest, 'ADV_HITTEST'], [f.floating, 'FLOATING'], [f.ignoreLayout, 'IGNORE_LAYOUT'],
      [f.overflowVisible, 'OVERFLOW_VISIBLE'], [f.flexInNewTrack, 'FLEX_IN_NEW_TRACK'],
    ];
    for (const [on, name] of extra) if (on) out.push(`(lv-obj-add-flag ${v} LV_OBJ_FLAG_${name})`);
  }

  const sb = comp.styles.default.scrollbarMode;
  if (sb && sb !== 'auto') {
    const m: Record<string, string> = { off: 'LV_SCROLLBAR_MODE_OFF', on: 'LV_SCROLLBAR_MODE_ON', active: 'LV_SCROLLBAR_MODE_ACTIVE' };
    if (m[sb]) out.push(`(lv-obj-set-scrollbar-mode ${v} ${m[sb]})`);
  }

  const arcLike = isArcLike(comp.type);
  // arcs and spinners have no box border: their border style only ever described the arc
  const defaultStyle = arcLike ? { ...comp.styles.default, borderWidth: 0, borderColor: undefined, borderRadius: undefined } : comp.styles.default;
  out.push(...styleForms(v, defaultStyle, 'LV_PART_MAIN', ctx));
  if (arcLike) {
    const arc = getArcStyle(comp);
    out.push(`(lv-obj-set-style-arc-width ${v} ${arc.width} LV_PART_MAIN)`);
    out.push(`(lv-obj-set-style-arc-color ${v} ${lcolor(arc.track)} LV_PART_MAIN)`);
    out.push(`(lv-obj-set-style-arc-width ${v} ${arc.width} LV_PART_INDICATOR)`);
    out.push(`(lv-obj-set-style-arc-color ${v} ${lcolor(arc.color)} LV_PART_INDICATOR)`);
  }
  for (const [key, st] of Object.entries(comp.styles)) {
    const sel = styleSelector(key);
    if (st && sel) out.push(...styleForms(v, st, sel, ctx));
  }

  out.push(...propsForms(comp, v, ctx));

  for (const ev of comp.events) {
    // screen events are only sent to screen objects: register them on the screen the component is on
    const evTarget = ev.eventType.startsWith('LV_EVENT_SCREEN_') ? ctx.names.screenVar(pageName) : v;
    out.push(`(lv-obj-add-event-cb ${evTarget} '${ctx.names.eventHandler(comp, ev)} ${ev.eventType})`);
  }

  out.push(...animForms(v, comp.animations || [], ctx));
  if (!comp.visible) out.push(`(lv-obj-add-flag ${v} LV_OBJ_FLAG_HIDDEN)`);
  out.push('');

  // children
  const sep = o.namingStyle === 'snake_case' ? '_' : '-';
  if (comp.type === 'tabview' && Array.isArray(comp.props?.tabs) && comp.props.tabs.length > 0) {
    const map: Record<string, string[]> = comp.props.tabChildMap || {};
    const childTab: Record<string, string> = {};
    for (const [idx, ids] of Object.entries(map)) {
      if (Array.isArray(ids)) for (const id of ids) childTab[id] = sym(o, v, 'tab', Number(idx));
    }
    const fallback = sym(o, v, 'tab', comp.props.activeTab || 0);
    for (const c of comp.children) out.push(...componentForms(c, childTab[c.id] || fallback, pageName, ctx));
  } else if (comp.type === 'tileview' && comp.props?.rows !== undefined && comp.props?.cols !== undefined) {
    const map: Record<string, string[]> = comp.props.tileChildMap || {};
    const childTile: Record<string, string> = {};
    for (const [key, ids] of Object.entries(map)) {
      const [r, c] = key.split('-');
      if (Array.isArray(ids)) for (const id of ids) childTile[id] = sym(o, v, 'tile', Number(r), Number(c));
    }
    const fallback = sym(o, v, 'tile', 0, 0);
    for (const c of comp.children) out.push(...componentForms(c, childTile[c.id] || fallback, pageName, ctx));
  } else if (comp.type === 'win') {
    if (comp.children.length > 0) {
      const content = `${v}${sep}content`;
      out.push(`(def ${content} (lv-win-get-content ${v}))`);
      for (const c of comp.children) out.push(...componentForms(c, content, pageName, ctx));
    }
  } else {
    for (const c of comp.children) out.push(...componentForms(c, v, pageName, ctx));
  }
  return out;
}

// ---------------------------------------------------------------- file


function defun(name: string, params: string, body: string[], options: LispGenOptions): string[] {
  const i = indent(options);
  return [`(defun ${name} (${params})`, `${i}(progn`, ...shift(body, options.indentSize * 2), `${i}${i}nil))`];
}

export function generateUiLisp(pages: Page[], ctx: UiContext, theme?: Theme): string {
  const o = ctx.options;
  if (theme) ctx.iconColor = theme.colors.text;
  const L: string[] = [];
  L.push(...banner('ui.lisp - screens and widgets (generated by LVGL UI Editor)'));
  L.push(comment('Needs the LVGL bridge of the P4 Dashboard firmware (lv-* functions).'));
  if (theme && o.generateComments) {
    L.push(comment(`Project theme "${theme.name}": applied with (lv-theme-set primary secondary dark) in ui-init.`));
  }
  L.push('');

  if (hasAnimations(pages)) {
    if (o.generateComments) L.push(...banner('Animation runtime'));
    L.push(ANIM_RUNTIME);
  } else {
    L.push(comment('no animations in this project'));
    L.push('(defun ui-anim-step () nil)');
  }
  L.push('');

  // fonts
  const fonts = collectUsedCustomFonts(pages, ctx.fontResources, ctx.defaultFont, ctx.defaultFontSize);
  const fontBody: string[] = [];
  for (const [name, sizes] of fonts) {
    for (const s of [...sizes].sort((a, b) => a - b)) {
      fontBody.push(`(def ${fontSym(name, s, o)} (lv-font-load ${fontDataSym(name, s, o)}))`);
    }
  }
  if (o.generateComments) L.push(...banner('Fonts'));
  L.push(...defun('ui-fonts-init', '', fontBody, o), '');

  // defaults
  let defaultFontSetter: string | undefined;
  if (ctx.defaultFont && ctx.defaultFont !== 'montserrat_14') {
    const m = /^montserrat_(\d+)$/.exec(ctx.defaultFont);
    defaultFontSetter = m ? `font-montserrat-${m[1]}` : fontSym(ctx.defaultFont, ctx.defaultFontSize || 16, o);
  }

  if (o.generateComments) L.push(...banner('Screens'));
  for (const page of pages) {
    const sv = ctx.names.screenVar(page.name);
    const body: string[] = [];
    if (o.generateComments) body.push(comment(`Create screen: ${page.name}`));
    body.push(`(def ${sv} (lv-obj-create nil))`);
    if (page.backgroundColor) body.push(`(lv-obj-set-style-bg-color ${sv} ${lcolor(page.backgroundColor)} LV_PART_MAIN)`);
    if (defaultFontSetter) body.push(`(lv-obj-set-style-text-font ${sv} ${defaultFontSetter} LV_PART_MAIN)`);
    body.push('');
    for (const c of page.components) body.push(...componentForms(c, sv, page.name, ctx));
    body.push(...userCode(`${page.name}_init`, o));
    L.push(...defun(ctx.names.initFn(page.name), '', body, o), '');
  }

  if (o.generateComments) L.push(...banner('Screen loading'));
  for (const page of pages) {
    L.push(`(defun ${ctx.names.loadFn(page.name)} ()`);
    L.push(`${indent(o)}(lv-screen-load-anim ${ctx.names.screenVar(page.name)} LV_SCREEN_LOAD_ANIM_FADE_ON 300 0 nil))`, '');
    L.push(`(defun ${ctx.names.loadFn(page.name)}${o.namingStyle === 'snake_case' ? '_anim' : '-anim'} (anim ms)`);
    L.push(`${indent(o)}(lv-screen-load-anim ${ctx.names.screenVar(page.name)} anim ms 0 nil))`, '');
  }

  if (o.generateComments) L.push(...banner('Main init'));
  const initBody: string[] = [];
  if (theme) initBody.push(`(lv-theme-set ${lcolor(theme.colors.primary)} ${lcolor(theme.colors.secondary)} ${isDarkTheme(theme) ? 't' : 'nil'})`);
  initBody.push('(ui-fonts-init)');
  for (const page of pages) initBody.push(`(${ctx.names.initFn(page.name)})`);
  if (pages.length > 0) initBody.push(`(${ctx.names.loadFn(pages[0].name)})`);
  initBody.push(...userCode('ui_init', o));
  L.push(...defun('ui-init', '', initBody, o), '');
  return L.join('\n') + '\n';
}
