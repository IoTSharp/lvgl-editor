import { lstr, sym, symbolText } from '../../sexp';
import type { PropsArgs } from '../context';
import { num } from '../util';

export function winForms({ comp, v, ctx }: PropsArgs): string[] {
  const o = ctx.options;
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.title) out.push(`(lv-win-add-title ${v} ${lstr(props.title)})`);
      const header = `${v}${o.namingStyle === 'snake_case' ? '_' : '-'}header`;
      const btns: Array<{ icon: string; width: number }> = [];
      if (props.showCloseBtn !== false) btns.push({ icon: 'LV_SYMBOL_CLOSE', width: 40 });
      if (Array.isArray(props.headerButtons)) {
        for (const b of props.headerButtons) btns.push({ icon: b.icon || 'LV_SYMBOL_SETTINGS', width: b.width || 40 });
      }
      if ((props.headerHeight && props.headerHeight !== 40) || btns.length > 0) {
        out.push(`(def ${header} (lv-win-get-header ${v}))`);
      }
      if (props.headerHeight && props.headerHeight !== 40) out.push(`(lv-obj-set-height ${header} ${num(props.headerHeight)})`);
      btns.forEach((b, i) => {
        const bv = sym(o, v, 'hbtn', i);
        out.push(`(def ${bv} (lv-button-create ${header}))`);
        out.push(`(lv-obj-set-width ${bv} ${b.width})`);
        out.push(`(def ${bv}${o.namingStyle === 'snake_case' ? '_' : '-'}label (lv-label-create ${bv}))`);
        out.push(`(lv-label-set-text ${bv}${o.namingStyle === 'snake_case' ? '_' : '-'}label ${lstr(symbolText(b.icon))})`);
        out.push(`(lv-obj-center ${bv}${o.namingStyle === 'snake_case' ? '_' : '-'}label)`);
      });
  return out;
}
