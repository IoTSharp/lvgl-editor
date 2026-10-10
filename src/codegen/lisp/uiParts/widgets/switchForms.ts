import type { PropsArgs } from '../context';

export function switchForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.checked) out.push(`(lv-obj-add-state ${v} LV_STATE_CHECKED)`);
      if (props.orientation === 'horizontal' || props.orientation === 'vertical') {
        out.push(`(lv-switch-set-orientation ${v} LV_SWITCH_ORIENTATION_${props.orientation.toUpperCase()})`);
      }
  return out;
}
