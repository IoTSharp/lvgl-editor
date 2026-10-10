import { lcolor } from '../../sexp';
import type { PropsArgs } from '../context';

export function ledForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.color) out.push(`(lv-led-set-color ${v} ${lcolor(props.color)})`);
      out.push(props.checked === false ? `(lv-led-off ${v})` : `(lv-led-on ${v})`);
      const b = Number(props.brightness ?? 255);
      if (Number.isFinite(b) && b !== 255 && props.checked !== false) out.push(`(lv-led-set-brightness ${v} ${Math.max(0, Math.min(255, Math.round(b)))})`);
  return out;
}
