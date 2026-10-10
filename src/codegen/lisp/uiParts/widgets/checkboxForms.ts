import { lstr } from '../../sexp';
import type { PropsArgs } from '../context';
import { textProps } from '../textProps';

export function checkboxForms({ comp, v, ctx }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.text) out.push(`(lv-checkbox-set-text ${v} ${lstr(props.text)})`);
      if (props.checked) out.push(`(lv-obj-add-state ${v} LV_STATE_CHECKED)`);
      out.push(...textProps(v, props, ctx));
  return out;
}
