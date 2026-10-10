import { lcolor } from '../../sexp';
import type { PropsArgs } from '../context';
import { num } from '../util';

export function sliderBarForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      const p = comp.type === 'slider' ? 'slider' : 'bar';
      if (props.min !== undefined || props.max !== undefined) out.push(`(lv-${p}-set-range ${v} ${num(props.min)} ${num(props.max, 100)})`);
      if (props.mode && props.mode !== 'normal') {
        out.push(`(lv-${p}-set-mode ${v} LV_${p.toUpperCase()}_MODE_${props.mode === 'range' ? 'RANGE' : 'SYMMETRICAL'})`);
      }
      if (props.mode === 'range' && props.startValue !== undefined) out.push(`(lv-${p}-set-start-value ${v} ${num(props.startValue)} LV_ANIM_OFF)`);
      if (props.value !== undefined) out.push(`(lv-${p}-set-value ${v} ${num(props.value)} LV_ANIM_OFF)`);
      if (props.orientation === 'vertical') out.push(`(lv-obj-set-style-transform-rotation ${v} 900 LV_PART_MAIN)`);
      if (props.indicatorColor) {
        out.push(`(lv-obj-set-style-bg-color ${v} ${lcolor(props.indicatorColor)} LV_PART_INDICATOR)`);
        out.push(`(lv-obj-set-style-bg-opa ${v} LV_OPA_COVER LV_PART_INDICATOR)`);
        if (comp.type === 'slider') out.push(`(lv-obj-set-style-bg-color ${v} ${lcolor(props.indicatorColor)} LV_PART_KNOB)`);
      }
  return out;
}
