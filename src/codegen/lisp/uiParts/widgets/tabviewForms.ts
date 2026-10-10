import { lstr, sym } from '../../sexp';
import type { PropsArgs } from '../context';
import { DIR, num } from '../util';

export function tabviewForms({ comp, v, ctx }: PropsArgs): string[] {
  const o = ctx.options;
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (Array.isArray(props.tabs)) {
        out.push(`(lv-tabview-set-tab-bar-position ${v} ${DIR[props.tabPosition] || 'LV_DIR_TOP'})`);
        out.push(`(lv-tabview-set-tab-bar-size ${v} ${num(props.tabBarSize, 50)})`);
        props.tabs.forEach((tab: string, i: number) => {
          out.push(`(def ${sym(o, v, 'tab', i)} (lv-tabview-add-tab ${v} ${lstr(tab)}))`);
        });
      }
      if (props.activeTab !== undefined && props.activeTab > 0) {
        out.push(`(lv-tabview-set-active ${v} ${num(props.activeTab)} LV_ANIM_OFF)`);
      }
  return out;
}
