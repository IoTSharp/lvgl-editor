import type { PropsArgs } from '../context';
import { num } from '../util';

export function spinnerForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      out.push(`(lv-spinner-set-anim-params ${v} ${num(props.speed, 1000)} ${num(props.arcLength, 60)})`);
  return out;
}
