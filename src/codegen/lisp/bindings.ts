// ui_logic.lisp part: keeps component properties in sync with logic variables ("Bindings" of a component)

import type { Page, LvglComponent, ComponentBinding } from '../../types';
import type { LogicVariable } from '../../components/LogicEditor/types';
import type { LispGenOptions } from './types';
import type { NameResolver } from './names';
import { lstr, sym, comment, indent } from './sexp';

const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

function walk(cs: LvglComponent[], page: string, f: (c: LvglComponent, page: string) => void) {
  for (const c of cs) { f(c, page); walk(c.children, page, f); }
}

/** Form that puts the number `val` into a widget (the "value" binding) */
function valueForm(comp: LvglComponent, target: string, val: string, o: LispGenOptions): string {
  switch (comp.type) {
    case 'bar': return `(lv-bar-set-value ${target} ${val} LV_ANIM_ON)`;
    case 'arc': return `(lv-arc-set-value ${target} ${val})`;
    case 'roller': return `(lv-roller-set-selected ${target} ${val} LV_ANIM_ON)`;
    case 'spinbox': return `(lv-spinbox-set-value ${target} ${val})`;
    case 'led': return `(lv-led-set-brightness ${target} ${val})`;
    case 'dropdown': return `(lv-dropdown-set-selected ${target} ${val})`;
    case 'scale': return `(lv-scale-set-line-needle-value ${target} ${sym(o, target, 'needle')} ${num(comp.props.needleLength, 60)} ${val})`;
    case 'switch':
    case 'checkbox': return `(if (and ${val} (not (eq ${val} 0))) (lv-obj-add-state ${target} LV_STATE_CHECKED) (lv-obj-remove-state ${target} LV_STATE_CHECKED))`;
    default: return `(lv-slider-set-value ${target} ${val} LV_ANIM_ON)`;
  }
}

function textForm(comp: LvglComponent, target: string, text: string): string {
  switch (comp.type) {
    case 'textarea': return `(lv-textarea-set-text ${target} ${text})`;
    case 'btn': return `(lv-label-set-text (lv-obj-get-child ${target} 0) ${text})`;
    case 'checkbox': return `(lv-checkbox-set-text ${target} ${text})`;
    default: return `(lv-label-set-text ${target} ${text})`;
  }
}

function condition(b: ComponentBinding, val: string): string {
  if (b.op) {
    const op = b.op === '==' ? '=' : b.op === '!=' ? '!=' : b.op;
    return op === '!=' ? `(not (= ${val} ${num(b.compare)}))` : `(${op} ${val} ${num(b.compare)})`;
  }
  return `(and ${val} (not (eq ${val} 0)))`;
}

/** `defs` go to the top level, `update` is the body of ui-bindings-update; both are empty when nothing is bound. */
export function generateBindings(pages: Page[], vars: LogicVariable[], names: NameResolver, o: LispGenOptions): { defs: string[]; update: string[]; count: number } {
  const defs: string[] = [];
  const update: string[] = [];
  let n = 0;
  const i = indent(o);
  for (const page of pages) {
    walk(page.components, page.name, (comp) => {
      for (const b of comp.bindings || []) {
        const v = vars.find(x => x.name === b.variable);
        const target = names.varOf(comp);
        if (!v) { update.push(comment(`Binding of ${comp.name}: variable "${b.variable}" does not exist`)); continue; }
        const last = `ui-bind-${n++}`;
        defs.push(`(def ${last} 'unset)`);
        const val = sym(o, 'var', v.name);
        let apply: string;
        switch (b.kind) {
          case 'text': {
            const fmt = (b.format || '').trim();
            const txt = v.type === 'string' && !fmt ? 'bv' : `(str-from-n bv ${lstr(fmt || (v.type === 'float' ? '%.1f' : '%d'))})`;
            apply = textForm(comp, target, txt);
            break;
          }
          case 'value': apply = valueForm(comp, target, 'bv', o); break;
          case 'hidden': {
            const c = condition(b, 'bv');
            apply = `(if ${c} (lv-obj-add-flag ${target} LV_OBJ_FLAG_HIDDEN) (lv-obj-remove-flag ${target} LV_OBJ_FLAG_HIDDEN))`;
            break;
          }
          case 'disabled': {
            const c = condition(b, 'bv');
            apply = `(if ${c} (lv-obj-add-state ${target} LV_STATE_DISABLED) (lv-obj-remove-state ${target} LV_STATE_DISABLED))`;
            break;
          }
          default: {
            const c = condition(b, 'bv');
            apply = `(if ${c} (lv-obj-add-state ${target} LV_STATE_CHECKED) (lv-obj-remove-state ${target} LV_STATE_CHECKED))`;
          }
        }
        update.push(`(let ((bv ${val}))`, `${i}(if (eq bv ${last})`, `${i}${i}nil`, `${i}${i}(progn (setq ${last} bv) ${apply})))`);
      }
    });
  }
  return { defs, update, count: n };
}
