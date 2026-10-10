// Lisp for the widgets of the extra set: roller, spinbox, keyboard, list, message box, scale.
import type { LvglComponent } from '../../types';
import type { LispGenOptions } from './types';
import type { NameResolver } from './names';
import { lstr, lcolor, sym } from './sexp';

/** Constructor of every extra widget (anything else falls back to lv-obj-create). */
export const EXTRA_CREATE_FN: Record<string, string> = {
  roller: 'lv-roller-create',
  spinbox: 'lv-spinbox-create',
  keyboard: 'lv-keyboard-create',
  list: 'lv-list-create',
  msgbox: 'lv-msgbox-create',
  scale: 'lv-scale-create',
};

const ROLLER_MODE: Record<string, string> = { normal: 'LV_ROLLER_MODE_NORMAL', infinite: 'LV_ROLLER_MODE_INFINITE' };
const KEYBOARD_MODE: Record<string, string> = {
  text_lower: 'LV_KEYBOARD_MODE_TEXT_LOWER', text_upper: 'LV_KEYBOARD_MODE_TEXT_UPPER',
  special: 'LV_KEYBOARD_MODE_SPECIAL', number: 'LV_KEYBOARD_MODE_NUMBER',
};
const SCALE_MODE: Record<string, string> = {
  horizontal_bottom: 'LV_SCALE_MODE_HORIZONTAL_BOTTOM', horizontal_top: 'LV_SCALE_MODE_HORIZONTAL_TOP',
  vertical_left: 'LV_SCALE_MODE_VERTICAL_LEFT', vertical_right: 'LV_SCALE_MODE_VERTICAL_RIGHT',
  round_inner: 'LV_SCALE_MODE_ROUND_INNER', round_outer: 'LV_SCALE_MODE_ROUND_OUTER',
};

const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const strings = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : []);

export function extraPropsForms(comp: LvglComponent, v: string, options: LispGenOptions, names: NameResolver): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
  switch (comp.type) {
    case 'roller': {
      const opts = strings(props.options);
      out.push(`(lv-roller-set-options ${v} ${lstr(opts.join('\n'))} ${ROLLER_MODE[props.mode] || ROLLER_MODE.normal})`);
      if (props.visibleRows) out.push(`(lv-roller-set-visible-row-count ${v} ${Math.max(1, num(props.visibleRows, 3))})`);
      if (props.selected) out.push(`(lv-roller-set-selected ${v} ${num(props.selected)} LV_ANIM_OFF)`);
      break;
    }
    case 'spinbox': {
      out.push(`(lv-spinbox-set-range ${v} ${num(props.min)} ${num(props.max, 100)})`);
      out.push(`(lv-spinbox-set-digit-format ${v} ${Math.max(1, num(props.digitCount, 4))} ${Math.max(0, num(props.decimalPos))})`);
      out.push(`(lv-spinbox-set-step ${v} ${Math.max(1, num(props.step, 1))})`);
      if (props.rollover === true) out.push(`(lv-spinbox-set-rollover ${v} t)`);
      out.push(`(lv-spinbox-set-value ${v} ${num(props.value)})`);
      break;
    }
    case 'keyboard': {
      out.push(`(lv-keyboard-set-mode ${v} ${KEYBOARD_MODE[props.mode] || KEYBOARD_MODE.text_lower})`);
      if (props.textarea && names.compByName(String(props.textarea))) out.push(`(lv-keyboard-set-textarea ${v} ${names.varByName(String(props.textarea))})`);
      break;
    }
    case 'list': {
      strings(props.items).forEach((item, i) => {
        out.push(`(def ${sym(options, v, 'item', i)} (lv-list-add-button ${v} nil ${lstr(item)}))`);
      });
      break;
    }
    case 'msgbox': {
      if (props.title) out.push(`(lv-msgbox-add-title ${v} ${lstr(String(props.title))})`);
      if (props.text) out.push(`(lv-msgbox-add-text ${v} ${lstr(String(props.text))})`);
      strings(props.buttons).forEach((b, i) => {
        out.push(`(def ${sym(options, v, 'btn', i)} (lv-msgbox-add-footer-button ${v} ${lstr(b)}))`);
      });
      if (props.showClose !== false) out.push(`(lv-msgbox-add-close-button ${v})`);
      break;
    }
    case 'scale': {
      out.push(`(lv-scale-set-mode ${v} ${SCALE_MODE[props.mode] || SCALE_MODE.horizontal_bottom})`);
      out.push(`(lv-scale-set-range ${v} ${num(props.min)} ${num(props.max, 100)})`);
      out.push(`(lv-scale-set-total-tick-count ${v} ${Math.max(2, num(props.totalTicks, 11))})`);
      out.push(`(lv-scale-set-major-tick-every ${v} ${Math.max(1, num(props.majorEvery, 5))})`);
      out.push(`(lv-scale-set-label-show ${v} ${props.showLabels === false ? 'nil' : 't'})`);
      if (String(props.mode || '').startsWith('round')) {
        out.push(`(lv-scale-set-angle-range ${v} ${num(props.angleRange, 270)})`);
        out.push(`(lv-scale-set-rotation ${v} ${num(props.rotation, 135)})`);
      }
      if (props.needle === true) {
        const needle = sym(options, v, 'needle');
        out.push(`(def ${needle} (lv-line-create ${v}))`);
        out.push(`(lv-obj-set-style-line-width ${needle} ${Math.max(1, num(props.needleWidth, 3))} LV_PART_MAIN)`);
        out.push(`(lv-obj-set-style-line-color ${needle} ${lcolor(props.needleColor || '#EF4444')} LV_PART_MAIN)`);
        out.push(`(lv-obj-set-style-line-rounded ${needle} t LV_PART_MAIN)`);
        out.push(`(lv-scale-set-line-needle-value ${v} ${needle} ${num(props.needleLength, 60)} ${num(props.needleValue)})`);
      }
      break;
    }
  }
  return out;
}
