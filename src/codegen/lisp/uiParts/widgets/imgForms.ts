import { comment, lcolor } from '../../sexp';
import type { PropsArgs } from '../context';
import { findImage, imageDataSym } from '../resources';
import { num } from '../util';

export function imgForms({ comp, v, ctx }: PropsArgs): string[] {
  const o = ctx.options;
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      const img = findImage(props.src, ctx.imageResources);
      if (img) {
        const pal = ctx.imagePalettes?.[img.id];
        const colors = pal ? ` (list ${pal.map(c => (c === null ? 'nil' : '0x' + c.toString(16).toUpperCase().padStart(6, '0'))).join(' ')})` : '';
        out.push(`(lv-image-set-vesc ${v} ${imageDataSym(img, o)}${colors})`);
      } else if (props.src) {
        out.push(comment(`image "${String(props.src).replace(/\n/g, ' ')}" is not a project resource; add it in Resources`));
      }
      if (img && img.originalName.startsWith('icon_') && ctx.iconColor && !comp.styles.default.imageRecolor) {
        out.push(`(lv-obj-set-style-image-recolor ${v} ${lcolor(ctx.iconColor)} LV_PART_MAIN)`);
        out.push(`(lv-obj-set-style-image-recolor-opa ${v} LV_OPA_COVER LV_PART_MAIN)`);
      }
      const ia: Record<string, string> = {
        stretch: 'STRETCH', contain: 'CONTAIN', cover: 'COVER', center: 'CENTER', tile: 'TILE', top_left: 'TOP_LEFT', default: 'DEFAULT',
      };
      out.push(`(lv-image-set-inner-align ${v} LV_IMAGE_ALIGN_${ia[props.innerAlign] || 'STRETCH'})`);
      if (props.pivotX !== undefined || props.pivotY !== undefined) out.push(`(lv-image-set-pivot ${v} ${Math.round(num(props.pivotX))} ${Math.round(num(props.pivotY))})`);
      if (props.scaleX !== undefined && num(props.scaleX) !== 256) out.push(`(lv-image-set-scale-x ${v} ${Math.max(0, Math.round(num(props.scaleX)))})`);
      if (props.scaleY !== undefined && num(props.scaleY) !== 256) out.push(`(lv-image-set-scale-y ${v} ${Math.max(0, Math.round(num(props.scaleY)))})`);
      if (props.rotation) out.push(`(lv-image-set-rotation ${v} ${Math.round(num(props.rotation) * 10)})`);
  return out;
}
