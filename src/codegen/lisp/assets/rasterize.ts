// Browser-side conversion of project resources (PNG/JPEG, TTF/OTF) into VESC .bin files

import type { ImageResource, FontResource } from '../../../resources/types';
import { getCharsetRanges } from '../../../resources/converters/fontConverter';
import { loadImageFromBase64 } from '../../../resources/converters/imageConverter';
import { rgbaToVescImage, encodeVescFont } from './vescFormat';
import type { VescImage, VescGlyph } from './vescFormat';

export async function imageToVesc(img: ImageResource): Promise<VescImage> {
  const { imageData, width, height } = await loadImageFromBase64(img.data);
  return rgbaToVescImage(imageData.data, width, height);
}

function base64ToBytes(data: string): Uint8Array {
  const raw = data.startsWith('data:') ? data.slice(data.indexOf(',') + 1) : data;
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function codePoints(font: FontResource): number[] {
  const ranges = getCharsetRanges(font.charset, font.customChars);
  const set = new Set<number>();
  for (const [from, to] of ranges) for (let c = from; c <= to; c++) set.add(c);
  return [...set].sort((a, b) => a - b);
}

type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function makeContext(w: number, h: number): Ctx2D {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true }) as OffscreenCanvasRenderingContext2D;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
}

/** Rasterise a TTF/OTF resource at `size` px into a VESC font file. */
export async function fontToVesc(font: FontResource, size: number): Promise<Uint8Array> {
  const family = `vesc_${font.id}_${size}`;
  const face = new FontFace(family, base64ToBytes(font.data).buffer as ArrayBuffer);
  await face.load();
  document.fonts.add(face);

  try {
    const pad = Math.ceil(size * 0.5) + 2;
    const cw = Math.ceil(size * 3) + pad * 2;
    const ch = Math.ceil(size * 2) + pad * 2;
    const ctx = makeContext(cw, ch);
    ctx.font = `${size}px "${family}"`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';

    const probe = ctx.measureText('Hg');
    const ascent = probe.fontBoundingBoxAscent ?? size * 0.9;
    const descent = probe.fontBoundingBoxDescent ?? size * 0.25;

    const baseX = pad;
    const baseY = pad + Math.ceil(size * 1.2);
    const glyphs: VescGlyph[] = [];
    for (const code of codePoints(font)) {
      const ch1 = String.fromCodePoint(code);
      const m = ctx.measureText(ch1);
      const left = Math.floor(m.actualBoundingBoxLeft);       // pixels left of the origin
      const right = Math.ceil(m.actualBoundingBoxRight);
      const up = Math.ceil(m.actualBoundingBoxAscent);
      const down = Math.ceil(m.actualBoundingBoxDescent);
      const w = Math.max(0, left + right);
      const h = Math.max(0, up + down);
      if (w === 0 || h === 0) {
        glyphs.push({ code, advance: m.width, offsetX: 0, top: 0, width: 0, height: 0, alpha: [] });
        continue;
      }
      ctx.clearRect(0, 0, cw, ch);
      ctx.fillText(ch1, baseX, baseY);
      const x0 = baseX - left;
      const y0 = baseY - up;
      const data = ctx.getImageData(x0, y0, w, h).data;
      const alpha = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3];
      glyphs.push({ code, advance: m.width, offsetX: -left, top: -up, width: w, height: h, alpha });
    }

    return encodeVescFont({
      ascent: Math.round(ascent),
      descent: -Math.round(descent),
      lineGap: 0,
      bpp: font.bpp === 1 || font.bpp === 2 ? font.bpp : 4,
      glyphs,
    });
  } finally {
    document.fonts.delete(face);
  }
}
