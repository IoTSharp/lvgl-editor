import type { PropsArgs } from '../context';
import { num } from '../util';

export function arcForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.startAngle !== undefined || props.endAngle !== undefined) {
        out.push(`(lv-arc-set-bg-angles ${v} ${num(props.startAngle, 135)} ${num(props.endAngle, 45)})`);
      }
      if (props.min !== undefined || props.max !== undefined) out.push(`(lv-arc-set-range ${v} ${num(props.min)} ${num(props.max, 100)})`);
      if (props.value !== undefined) out.push(`(lv-arc-set-value ${v} ${num(props.value)})`);
      if (props.rotation) out.push(`(lv-arc-set-rotation ${v} ${Math.round(num(props.rotation))})`);
      if (props.changeRate !== undefined && num(props.changeRate) !== 720) out.push(`(lv-arc-set-change-rate ${v} ${Math.max(0, Math.round(num(props.changeRate)))})`);
      if (props.rounded !== undefined) {
        const r = props.rounded === false ? 'nil' : 't';
        out.push(`(lv-obj-set-style-arc-rounded ${v} ${r} LV_PART_MAIN)`, `(lv-obj-set-style-arc-rounded ${v} ${r} LV_PART_INDICATOR)`);
      }
      if (props.hideKnob === true) out.push(`(lv-obj-set-style-bg-opa ${v} LV_OPA_TRANSP LV_PART_KNOB)`);
      if (props.mode) {
        const m: Record<string, string> = { normal: 'LV_ARC_MODE_NORMAL', symmetrical: 'LV_ARC_MODE_SYMMETRICAL', reverse: 'LV_ARC_MODE_REVERSE' };
        out.push(`(lv-arc-set-mode ${v} ${m[props.mode] || 'LV_ARC_MODE_NORMAL'})`);
      }
  return out;
}
