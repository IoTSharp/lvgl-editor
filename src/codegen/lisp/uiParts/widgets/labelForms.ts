import { lstr } from '../../sexp';
import type { PropsArgs } from '../context';
import { textProps } from '../textProps';

export function labelForms({ comp, v, ctx }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.text) out.push(`(lv-label-set-text ${v} ${lstr(props.text)})`);
      if (props.longMode) {
        const m: Record<string, string> = {
          wrap: 'LV_LABEL_LONG_MODE_WRAP', scroll: 'LV_LABEL_LONG_MODE_SCROLL',
          dot: 'LV_LABEL_LONG_MODE_DOTS', clip: 'LV_LABEL_LONG_MODE_CLIP',
          scroll_circular: 'LV_LABEL_LONG_MODE_SCROLL_CIRCULAR',
        };
        out.push(`(lv-label-set-long-mode ${v} ${m[props.longMode] || 'LV_LABEL_LONG_MODE_WRAP'})`);
      }
      if (props.recolor === true) out.push(`(lv-label-set-recolor ${v} t)`);
      out.push(...textProps(v, props, ctx));
  return out;
}
