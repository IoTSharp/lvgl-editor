import { lstr } from '../../sexp';
import type { PropsArgs } from '../context';
import { textProps } from '../textProps';
import { num } from '../util';

export function dropdownForms({ comp, v, ctx }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.options) {
        const text = Array.isArray(props.options) ? props.options.join('\n') : String(props.options);
        out.push(`(lv-dropdown-set-options ${v} ${lstr(text)})`);
      }
      if (props.selected !== undefined) out.push(`(lv-dropdown-set-selected ${v} ${num(props.selected)})`);
      if (props.direction) out.push(`(lv-dropdown-set-dir ${v} ${props.direction === 'up' ? 'LV_DIR_TOP' : 'LV_DIR_BOTTOM'})`);
      out.push(...textProps(v, props, ctx));
  return out;
}
