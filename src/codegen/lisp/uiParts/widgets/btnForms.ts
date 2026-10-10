import { lstr } from '../../sexp';
import type { PropsArgs } from '../context';
import { textProps } from '../textProps';

export function btnForms({ comp, v, ctx }: PropsArgs): string[] {
  const o = ctx.options;
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.text) {
        const l = `${v}${o.namingStyle === 'snake_case' ? '_' : '-'}label`;
        out.push(`(def ${l} (lv-label-create ${v}))`);
        out.push(`(lv-label-set-text ${l} ${lstr(props.text)})`);
        out.push(`(lv-obj-center ${l})`);
        out.push(...textProps(l, props, ctx));
      }
  return out;
}
