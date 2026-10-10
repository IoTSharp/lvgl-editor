import { lcolor, lopa } from '../sexp';
import type { UiContext } from './context';
import { fontSym } from './resources';
import type { StyleProps } from '../../../types';


/** Lisp expression for a font; undefined when it equals the project default. */
export function fontExpr(name: string, size: number | undefined, ctx: UiContext): string | undefined {
  const m = /^montserrat_(\d+)$/.exec(name);
  if (m) return name === ctx.defaultFont ? undefined : `font-montserrat-${m[1]}`;
  const s = size || 16;
  if (name === ctx.defaultFont && s === (ctx.defaultFontSize || 16)) return undefined;
  return fontSym(name, s, ctx.options);
}

export function styleForms(v: string, st: StyleProps, selector: string, ctx: UiContext): string[] {
  const out: string[] = [];
  const set = (fn: string, value: string | number) => out.push(`(lv-obj-set-style-${fn} ${v} ${value} ${selector})`);

  if (st.bgColor) {
    if (st.bgColor.toLowerCase() === 'transparent') {
      set('bg-opa', 'LV_OPA_TRANSP');
    } else {
      set('bg-color', lcolor(st.bgColor));
      set('bg-opa', 'LV_OPA_COVER');
    }
  }
  if (st.borderColor) set('border-color', lcolor(st.borderColor));
  if (st.borderWidth !== undefined) set('border-width', st.borderWidth);
  if (st.borderRadius !== undefined) set('radius', st.borderRadius);
  if (st.textColor) set('text-color', lcolor(st.textColor));
  if (st.imageRecolor) {
    set('image-recolor', lcolor(st.imageRecolor));
    set('image-recolor-opa', 'LV_OPA_COVER');
  }
  if (st.opacity !== undefined && st.opacity < 1) set('opa', lopa(st.opacity));
  // size limits, margins, gaps, offsets, per-part opacity (all optional)
  const opt: Array<[keyof StyleProps, string, (n: number) => number]> = [
    ['minWidth', 'min-width', n => n], ['maxWidth', 'max-width', n => n], ['minHeight', 'min-height', n => n], ['maxHeight', 'max-height', n => n],
    ['marginTop', 'margin-top', n => n], ['marginBottom', 'margin-bottom', n => n], ['marginLeft', 'margin-left', n => n], ['marginRight', 'margin-right', n => n],
    ['padRow', 'pad-row', n => n], ['padColumn', 'pad-column', n => n],
    ['translateX', 'translate-x', n => n], ['translateY', 'translate-y', n => n],
    ['skewX', 'transform-skew-x', n => Math.round(n * 10)], ['skewY', 'transform-skew-y', n => Math.round(n * 10)],
    ['bgOpa', 'bg-opa', n => Math.max(0, Math.min(255, Math.round(n)))], ['borderOpa', 'border-opa', n => Math.max(0, Math.min(255, Math.round(n)))],
    ['outlineOpa', 'outline-opa', n => Math.max(0, Math.min(255, Math.round(n)))], ['textOpa', 'text-opa', n => Math.max(0, Math.min(255, Math.round(n)))],
    ['textOutlineWidth', 'text-outline-stroke-width', n => n],
    ['transformWidth', 'transform-width', n => n], ['transformHeight', 'transform-height', n => n],
    ['bgMainStop', 'bg-main-stop', n => Math.max(0, Math.min(255, Math.round(n)))], ['blurRadius', 'blur-radius', n => Math.max(0, Math.round(n))],
  ];
  for (const [key, fn, conv] of opt) {
    const val = st[key];
    if (typeof val === 'number' && Number.isFinite(val)) set(fn, conv(val));
  }
  if (st.clipCorner === true) set('clip-corner', 't');
  if (st.borderPost === true) set('border-post', 't');
  if (st.textOutlineWidth && st.textOutlineColor) set('text-outline-stroke-color', lcolor(st.textOutlineColor));
  if (st.padding !== undefined) {
    for (const side of ['top', 'bottom', 'left', 'right']) set(`pad-${side}`, st.padding);
  }
  if (st.paddingTop !== undefined) set('pad-top', st.paddingTop);
  if (st.paddingBottom !== undefined) set('pad-bottom', st.paddingBottom);
  if (st.paddingLeft !== undefined) set('pad-left', st.paddingLeft);
  if (st.paddingRight !== undefined) set('pad-right', st.paddingRight);

  if (st.borderSide && st.borderSide !== 'full') {
    const sides: Record<string, string> = {
      none: 'LV_BORDER_SIDE_NONE',
      top: 'LV_BORDER_SIDE_TOP',
      bottom: 'LV_BORDER_SIDE_BOTTOM',
      left: 'LV_BORDER_SIDE_LEFT',
      right: 'LV_BORDER_SIDE_RIGHT',
      top_bottom: '(bitwise-or LV_BORDER_SIDE_TOP LV_BORDER_SIDE_BOTTOM)',
      left_right: '(bitwise-or LV_BORDER_SIDE_LEFT LV_BORDER_SIDE_RIGHT)',
    };
    if (sides[st.borderSide]) set('border-side', sides[st.borderSide]);
  }

  if (st.bgGradDir && st.bgGradDir !== 'none') {
    set('bg-grad-dir', st.bgGradDir === 'hor' ? 'LV_GRAD_DIR_HOR' : 'LV_GRAD_DIR_VER');
    if (st.bgGradColor) set('bg-grad-color', lcolor(st.bgGradColor));
    if (st.bgGradStop !== undefined) set('bg-grad-stop', st.bgGradStop);
  }

  if (st.outlineWidth !== undefined && st.outlineWidth > 0) {
    set('outline-width', st.outlineWidth);
    if (st.outlineColor) set('outline-color', lcolor(st.outlineColor));
    if (st.outlinePad !== undefined) set('outline-pad', st.outlinePad);
  }

  if (st.shadowWidth !== undefined && st.shadowWidth > 0) {
    set('shadow-width', st.shadowWidth);
    if (st.shadowColor) set('shadow-color', lcolor(st.shadowColor));
    if (st.shadowOffsetX) set('shadow-offset-x', st.shadowOffsetX);
    if (st.shadowOffsetY) set('shadow-offset-y', st.shadowOffsetY);
    if (st.shadowSpread) set('shadow-spread', st.shadowSpread);
    if (st.shadowOpacity !== undefined && st.shadowOpacity < 255) set('shadow-opa', st.shadowOpacity);
  }

  if (st.transformAngle) set('transform-rotation', st.transformAngle);
  if (st.transformZoomX !== undefined && st.transformZoomX !== 256) set('transform-scale-x', st.transformZoomX);
  if (st.transformZoomY !== undefined && st.transformZoomY !== 256) set('transform-scale-y', st.transformZoomY);
  if (st.transformPivotX) set('transform-pivot-x', st.transformPivotX);
  if (st.transformPivotY) set('transform-pivot-y', st.transformPivotY);

  if (st.textFont) {
    const f = fontExpr(st.textFont, st.textFontSize, ctx);
    if (f) set('text-font', f);
  }
  if (st.textLetterSpace) set('text-letter-space', st.textLetterSpace);
  if (st.textLineSpace) set('text-line-space', st.textLineSpace);

  if (st.textDecor && st.textDecor !== 'none') {
    set('text-decor', st.textDecor === 'underline' ? 'LV_TEXT_DECOR_UNDERLINE' : 'LV_TEXT_DECOR_STRIKETHROUGH');
  }
  if (st.blendMode && st.blendMode !== 'normal') {
    const modes: Record<string, string> = {
      additive: 'LV_BLEND_MODE_ADDITIVE',
      subtractive: 'LV_BLEND_MODE_SUBTRACTIVE',
      multiply: 'LV_BLEND_MODE_MULTIPLY',
    };
    if (modes[st.blendMode]) set('blend-mode', modes[st.blendMode]);
  }
  return out;
}
