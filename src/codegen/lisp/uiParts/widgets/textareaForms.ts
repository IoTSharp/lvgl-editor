import { lstr } from '../../sexp';
import type { PropsArgs } from '../context';
import { textProps } from '../textProps';
import { num } from '../util';

export function textareaForms({ comp, v, ctx }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.placeholder) out.push(`(lv-textarea-set-placeholder-text ${v} ${lstr(props.placeholder)})`);
      if (props.text) out.push(`(lv-textarea-set-text ${v} ${lstr(props.text)})`);
      if (props.maxLength && props.maxLength > 0) out.push(`(lv-textarea-set-max-length ${v} ${num(props.maxLength)})`);
      if (props.password) out.push(`(lv-textarea-set-password-mode ${v} t)`);
      if (props.password && props.passwordShowTime !== undefined && num(props.passwordShowTime) !== 1500) out.push(`(lv-textarea-set-password-show-time ${v} ${Math.max(0, Math.round(num(props.passwordShowTime)))})`);
      if (props.oneLine) out.push(`(lv-textarea-set-one-line ${v} t)`);
      out.push(...textProps(v, props, ctx));
  return out;
}
