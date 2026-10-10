import { comment } from '../../sexp';
import type { PropsArgs } from '../context';
import { num } from '../util';

export function objForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.scrollDir) {
        const m: Record<string, string> = { none: 'LV_DIR_NONE', hor: 'LV_DIR_HOR', ver: 'LV_DIR_VER', all: 'LV_DIR_ALL' };
        out.push(`(lv-obj-set-scroll-dir ${v} ${m[props.scrollDir] || 'LV_DIR_NONE'})`);
      }
      if (props.layout === 'flex') {
        out.push(`(lv-obj-set-layout ${v} LV_LAYOUT_FLEX)`);
        const dir = props.flexDirection || 'row';
        const wrap = props.flexWrap === true || props.flexWrap === 'wrap';
        const flow: Record<string, string> = {
          row: wrap ? 'LV_FLEX_FLOW_ROW_WRAP' : 'LV_FLEX_FLOW_ROW',
          column: wrap ? 'LV_FLEX_FLOW_COLUMN_WRAP' : 'LV_FLEX_FLOW_COLUMN',
          'row-reverse': wrap ? 'LV_FLEX_FLOW_ROW_WRAP_REVERSE' : 'LV_FLEX_FLOW_ROW_REVERSE',
          'column-reverse': wrap ? 'LV_FLEX_FLOW_COLUMN_WRAP_REVERSE' : 'LV_FLEX_FLOW_COLUMN_REVERSE',
        };
        out.push(`(lv-obj-set-flex-flow ${v} ${flow[dir] || 'LV_FLEX_FLOW_ROW'})`);
        if (props.justifyContent || props.alignItems || props.alignContent) {
          const main: Record<string, string> = {
            'flex-start': 'LV_FLEX_ALIGN_START', 'flex-end': 'LV_FLEX_ALIGN_END', center: 'LV_FLEX_ALIGN_CENTER',
            'space-between': 'LV_FLEX_ALIGN_SPACE_BETWEEN', 'space-around': 'LV_FLEX_ALIGN_SPACE_AROUND', 'space-evenly': 'LV_FLEX_ALIGN_SPACE_EVENLY',
          };
          const cross: Record<string, string> = {
            'flex-start': 'LV_FLEX_ALIGN_START', 'flex-end': 'LV_FLEX_ALIGN_END', center: 'LV_FLEX_ALIGN_CENTER', stretch: 'LV_FLEX_ALIGN_START',
          };
          out.push(`(lv-obj-set-flex-align ${v} ${main[props.justifyContent] || 'LV_FLEX_ALIGN_START'} ${cross[props.alignItems] || 'LV_FLEX_ALIGN_START'} ${cross[props.alignContent] || 'LV_FLEX_ALIGN_START'})`);
        }
        const gap = num(props.gap);
        out.push(`(lv-obj-set-style-pad-row ${v} ${gap} LV_PART_MAIN)`);
        out.push(`(lv-obj-set-style-pad-column ${v} ${gap} LV_PART_MAIN)`);
      } else if (props.layout === 'grid') {
        out.push(comment('grid track descriptors are not exposed by the LVGL bridge: children keep their absolute positions'));
        out.push(`(lv-obj-set-style-pad-column ${v} ${num(props.gridColumnGap)} LV_PART_MAIN)`);
        out.push(`(lv-obj-set-style-pad-row ${v} ${num(props.gridRowGap)} LV_PART_MAIN)`);
      }
  return out;
}
