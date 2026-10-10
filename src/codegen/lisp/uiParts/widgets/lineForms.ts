import { lcolor } from '../../sexp';
import type { PropsArgs } from '../context';
import { num } from '../util';

export function lineForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      const pts = Array.isArray(props.points) ? props.points : [];
      if (pts.length >= 2) {
        const flat = pts.slice(0, 64).flatMap((p: number[]) => [Math.round(num(p?.[0])), Math.round(num(p?.[1]))]);
        out.push(`(lv-line-set-points ${v} (list ${flat.join(' ')}))`);
      }
      if (props.lineWidth && props.lineWidth !== 2) out.push(`(lv-obj-set-style-line-width ${v} ${num(props.lineWidth)} LV_PART_MAIN)`);
      if (props.lineColor) out.push(`(lv-obj-set-style-line-color ${v} ${lcolor(props.lineColor)} LV_PART_MAIN)`);
      if (props.yInvert === true) out.push(`(lv-line-set-y-invert ${v} t)`);
      if (props.rounded === false) out.push(`(lv-obj-set-style-line-rounded ${v} nil LV_PART_MAIN)`);
      if (num(props.dashWidth) > 0) {
        out.push(`(lv-obj-set-style-line-dash-width ${v} ${Math.round(num(props.dashWidth))} LV_PART_MAIN)`);
        out.push(`(lv-obj-set-style-line-dash-gap ${v} ${Math.round(num(props.dashGap, 4))} LV_PART_MAIN)`);
      }
  return out;
}
