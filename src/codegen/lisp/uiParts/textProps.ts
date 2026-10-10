import type { UiContext } from './context';
import { BUILTIN_SIZES, fontSym, isBuiltinFont } from './resources';
import { fontExpr } from './styles';

export function textProps(v: string, props: Record<string, any>, ctx: UiContext): string[] { // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
  const set = (fn: string, value: string | number) => out.push(`(lv-obj-set-style-${fn} ${v} ${value} LV_PART_MAIN)`);
  if (props.fontResource) {
    const f = fontExpr(props.fontResource as string, props.fontSize as number | undefined, ctx);
    if (f) set('text-font', f);
  } else if (props.fontSize !== undefined && ctx.defaultFont && !isBuiltinFont(ctx.defaultFont)) {
    const s = props.fontSize as number;
    if (s !== (ctx.defaultFontSize || 16)) set('text-font', fontSym(ctx.defaultFont, s, ctx.options));
  } else if (props.fontSize !== undefined && Number.isFinite(Number(props.fontSize))) {
    // built-in Montserrat: the nearest size the board has (the P4 firmware ships 14 16 20 24 32 48)
    const want = Number(props.fontSize);
    const size = BUILTIN_SIZES.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a));
    const def = /^montserrat_(\d+)$/.exec(ctx.defaultFont || '');
    if (size !== (def ? Number(def[1]) : 14)) set('text-font', `font-montserrat-${size}`);
  }
  if (props.textAlign) {
    const al: Record<string, string> = { left: 'LV_TEXT_ALIGN_LEFT', center: 'LV_TEXT_ALIGN_CENTER', right: 'LV_TEXT_ALIGN_RIGHT' };
    set('text-align', al[props.textAlign] || 'LV_TEXT_ALIGN_CENTER');
  }
  return out;
}
