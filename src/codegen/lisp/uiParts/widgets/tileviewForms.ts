import { sym } from '../../sexp';
import type { PropsArgs } from '../context';
import { num } from '../util';

export function tileviewForms({ comp, v, ctx }: PropsArgs): string[] {
  const o = ctx.options;
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.rows !== undefined && props.cols !== undefined) {
        for (let r = 0; r < props.rows; r++) {
          for (let c = 0; c < props.cols; c++) {
            out.push(`(def ${sym(o, v, 'tile', r, c)} (lv-tileview-add-tile ${v} ${c} ${r} LV_DIR_ALL))`);
          }
        }
        if (props.currentRow || props.currentCol) {
          out.push(`(lv-tileview-set-tile ${v} ${sym(o, v, 'tile', num(props.currentRow), num(props.currentCol))} LV_ANIM_OFF)`);
        }
      }
  return out;
}
