// ui/ui_events.lisp generator: one handler function per event binding

import type { Page, LvglComponent, BuiltinAction } from '../../types';
import type { LispGenOptions } from './types';
import type { NameResolver } from './names';
import { lstr, lcolor, indent, comment, banner, userCode, shift } from './sexp';

function getAllEvents(pages: Page[]) {
  const out: Array<{ comp: LvglComponent; page: string; ev: LvglComponent['events'][number] }> = [];
  const walk = (cs: LvglComponent[], page: string) => {
    for (const c of cs) {
      for (const ev of c.events) out.push({ comp: c, page, ev });
      walk(c.children, page);
    }
  };
  pages.forEach(p => walk(p.components, p.name));
  return out;
}

const SCREEN_ANIM: Record<string, string> = {
  fade: 'LV_SCREEN_LOAD_ANIM_FADE_IN', move_left: 'LV_SCREEN_LOAD_ANIM_MOVE_LEFT', move_right: 'LV_SCREEN_LOAD_ANIM_MOVE_RIGHT',
  move_top: 'LV_SCREEN_LOAD_ANIM_MOVE_TOP', move_bottom: 'LV_SCREEN_LOAD_ANIM_MOVE_BOTTOM',
  over_left: 'LV_SCREEN_LOAD_ANIM_OVER_LEFT', over_right: 'LV_SCREEN_LOAD_ANIM_OVER_RIGHT',
  over_top: 'LV_SCREEN_LOAD_ANIM_OVER_TOP', over_bottom: 'LV_SCREEN_LOAD_ANIM_OVER_BOTTOM',
};

const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

/** Forms for a built-in action; `page` is the page of the component that owns the event. */
function actionForms(action: BuiltinAction, page: string, names: NameResolver, options: LispGenOptions): string[] {
  const out: string[] = [];
  const target = action.targetComponent ? names.varByName(action.targetComponent, page) : '';
  const note = (text: string) => { if (options.generateComments) out.push(comment(text)); };

  switch (action.type) {
    case 'navigate': {
      if (action.targetPage && names.hasScreen(action.targetPage)) {
        note(`Navigate to: ${action.targetPage}`);
        const anim = action.animation ? SCREEN_ANIM[action.animation] : undefined;
        if (anim) out.push(`(${names.loadFn(action.targetPage)}${options.namingStyle === 'snake_case' ? '_anim' : '-anim'} ${anim} ${Math.max(0, Math.round(num(action.duration, 300)))})`);
        else out.push(`(${names.loadFn(action.targetPage)})`);
      }
      break;
    }
    case 'setProperty': {
      if (!target || !action.property) break;
      note(`Set property: ${action.property}`);
      const v = action.value;
      switch (action.property) {
        case 'bg_color': out.push(`(lv-obj-set-style-bg-color ${target} ${lcolor(String(v || '#000000'))} LV_PART_MAIN)`); break;
        case 'border_color': out.push(`(lv-obj-set-style-border-color ${target} ${lcolor(String(v || '#000000'))} LV_PART_MAIN)`); break;
        case 'border_width': out.push(`(lv-obj-set-style-border-width ${target} ${num(v)} LV_PART_MAIN)`); break;
        case 'radius': out.push(`(lv-obj-set-style-radius ${target} ${num(v)} LV_PART_MAIN)`); break;
        case 'opa': out.push(`(lv-obj-set-style-opa ${target} ${num(v, 255)} LV_PART_MAIN)`); break;
        case 'text_color': out.push(`(lv-obj-set-style-text-color ${target} ${lcolor(String(v || '#000000'))} LV_PART_MAIN)`); break;
        case 'bg_opa': out.push(`(lv-obj-set-style-bg-opa ${target} ${Math.max(0, Math.min(255, num(v, 255)))} LV_PART_MAIN)`); break;
        case 'translate_x': out.push(`(lv-obj-set-style-translate-x ${target} ${num(v)} LV_PART_MAIN)`); break;
        case 'translate_y': out.push(`(lv-obj-set-style-translate-y ${target} ${num(v)} LV_PART_MAIN)`); break;
        case 'x': out.push(`(lv-obj-set-x ${target} ${num(v)})`); break;
        case 'y': out.push(`(lv-obj-set-y ${target} ${num(v)})`); break;
        case 'width': out.push(`(lv-obj-set-width ${target} ${num(v, 100)})`); break;
        case 'height': out.push(`(lv-obj-set-height ${target} ${num(v, 100)})`); break;
        default: out.push(comment(`Unknown property: ${action.property}`));
      }
      break;
    }
    case 'show':
      if (target) { note(`Show component: ${action.targetComponent}`); out.push(`(lv-obj-remove-flag ${target} LV_OBJ_FLAG_HIDDEN)`); }
      break;
    case 'hide':
      if (target) { note(`Hide component: ${action.targetComponent}`); out.push(`(lv-obj-add-flag ${target} LV_OBJ_FLAG_HIDDEN)`); }
      break;
    case 'enable':
      if (target) { note(`Enable component: ${action.targetComponent}`); out.push(`(lv-obj-remove-state ${target} LV_STATE_DISABLED)`); }
      break;
    case 'disable':
      if (target) { note(`Disable component: ${action.targetComponent}`); out.push(`(lv-obj-add-state ${target} LV_STATE_DISABLED)`); }
      break;
    case 'setText': {
      if (!target) break;
      const type = names.compByName(action.targetComponent!, page)?.type || 'label';
      const text = lstr(String(action.value ?? ''));
      note(`Set text: ${String(action.value ?? '')}`);
      if (type === 'textarea') out.push(`(lv-textarea-set-text ${target} ${text})`);
      else if (type === 'btn') out.push(`(lv-label-set-text (lv-obj-get-child ${target} 0) ${text})`);
      else if (type === 'checkbox') out.push(`(lv-checkbox-set-text ${target} ${text})`);
      else if (type === 'dropdown') out.push(comment('dropdown caption cannot be changed through the LVGL bridge'));
      else out.push(`(lv-label-set-text ${target} ${text})`);
      break;
    }
    case 'setState': {
      if (!target || !action.property) break;
      const st = `LV_STATE_${String(action.property).toUpperCase()}`;
      note(`${action.value || 'on'} state: ${action.property}`);
      if (action.value === 'off') out.push(`(lv-obj-remove-state ${target} ${st})`);
      else if (action.value === 'toggle') out.push(`(lv-obj-set-state ${target} ${st} (not (lv-obj-has-state ${target} ${st})))`);
      else out.push(`(lv-obj-add-state ${target} ${st})`);
      break;
    }
    case 'setFlag': {
      if (!target || !action.property) break;
      const fl = `LV_OBJ_FLAG_${String(action.property).toUpperCase()}`;
      note(`${action.value || 'on'} flag: ${action.property}`);
      if (action.value === 'off') out.push(`(lv-obj-remove-flag ${target} ${fl})`);
      else if (action.value === 'toggle') out.push(`(if (lv-obj-has-flag ${target} ${fl}) (lv-obj-remove-flag ${target} ${fl}) (lv-obj-add-flag ${target} ${fl}))`);
      else out.push(`(lv-obj-add-flag ${target} ${fl})`);
      break;
    }
    case 'setValue': {
      if (!target) break;
      const type = names.compByName(action.targetComponent!, page)?.type || 'slider';
      note(`Set value: ${String(action.value ?? '')}`);
      const n = num(action.value);
      if (type === 'bar') out.push(`(lv-bar-set-value ${target} ${n} LV_ANIM_ON)`);
      else if (type === 'arc') out.push(`(lv-arc-set-value ${target} ${n})`);
      else if (type === 'roller') out.push(`(lv-roller-set-selected ${target} ${n} LV_ANIM_ON)`);
      else if (type === 'spinbox') out.push(`(lv-spinbox-set-value ${target} ${n})`);
      else if (type === 'led') out.push(`(lv-led-set-brightness ${target} ${n})`);
      else out.push(`(lv-slider-set-value ${target} ${n} LV_ANIM_ON)`);
      break;
    }
  }
  return out;
}

export function generateEventsLisp(pages: Page[], names: NameResolver, options: LispGenOptions): string {
  const L: string[] = [];
  L.push(...banner('ui_events.lisp - event handlers (generated by LVGL UI Editor)'));
  L.push(comment('Handlers are registered in ui.lisp with lv-obj-add-event-cb and called from the main loop.'));
  L.push('');

  const events = getAllEvents(pages);
  if (events.length === 0) {
    L.push(comment('No events defined'));
    L.push('');
  }
  for (const { comp, page, ev } of events) {
    const name = names.eventHandler(comp, ev);
    const i = indent(options);
    L.push(`(defun ${name} (e)`);
    L.push(`${i}(progn`);
    let body: string[] = [];
    if (ev.handlerType === 'builtin' && ev.action) {
      body = actionForms(ev.action, page, names, options);
    } else if (ev.handlerType === 'custom' && ev.customCode) {
      body = ev.customCode.split('\n');
    } else {
      body = userCode(`${comp.name}_${ev.eventType}`, options);
    }
    L.push(...shift(body, options.indentSize * 2));
    L.push(`${i}${i}nil))`, '');
  }

  L.push(...userCode('events_custom', options));
  return L.join('\n') + '\n';
}
