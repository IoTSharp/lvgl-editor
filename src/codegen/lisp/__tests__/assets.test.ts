import { describe, it, expect } from 'vitest';
import { float32Auto, decodeFloat32Auto, encodeVescImage, rgbaToVescImage, encodeVescFont } from '../assets/vescFormat';
import { generateCode } from '../index';
import { createPage, createComponent, createImageResource } from '../../__tests__/helpers';

const be32 = (d: Uint8Array, p: number) => ((d[p] << 24) | (d[p + 1] << 16) | (d[p + 2] << 8) | d[p + 3]) >>> 0;

/** Mirror of img_header() + vimg_render() in bridge/lvbr_assets.c */
function decodeImage(d: Uint8Array) {
  const w = (d[0] << 8) | d[1];
  const h = (d[2] << 8) | d[3];
  const bpp = d[4];
  expect([1, 2, 4]).toContain(bpp);
  const stride = Math.ceil((w * bpp) / 8);
  expect(d.length).toBeGreaterThanOrEqual(5 + stride * h);
  const px: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const bit = x * bpp;
      px.push((d[5 + y * stride + (bit >> 3)] >> (8 - bpp - (bit & 7))) & ((1 << bpp) - 1));
    }
  }
  return { w, h, bpp, px };
}

/** Mirror of font_create() in bridge/lvbr_assets.c */
function decodeFont(d: Uint8Array) {
  expect(String.fromCharCode(...d.slice(4, 8))).toBe('font');
  expect(d[8]).toBe(0);
  let p = 9;
  let asc = 0, desc = 0, gap = 0, gOff = 0, gEnd = 0;
  while (p < d.length) {
    let e = p;
    while (e < d.length && d[e]) e++;
    const name = String.fromCharCode(...d.slice(p, e));
    const size = be32(d, e + 1);
    const b = e + 5;
    expect(size).toBeLessThanOrEqual(d.length - b);
    if (name === 'lmtx') { asc = decodeFloat32Auto(be32(d, b)); desc = decodeFloat32Auto(be32(d, b + 4)); gap = decodeFloat32Auto(be32(d, b + 8)); }
    if (name === 'glyphs') { gOff = b; gEnd = b + size; }
    p = b + size;
  }
  const n = be32(d, gOff);
  const bpp = be32(d, gOff + 4);
  let q = gOff + 8;
  const glyphs: Array<{ code: number; adv: number; ofsX: number; top: number; w: number; h: number; a: number[] }> = [];
  for (let i = 0; i < n; i++) {
    const code = be32(d, q);
    const adv = decodeFloat32Auto(be32(d, q + 4));
    const ofsX = decodeFloat32Auto(be32(d, q + 8));
    const top = be32(d, q + 12) | 0;
    const w = be32(d, q + 16) | 0;
    const h = be32(d, q + 20) | 0;
    const mask = (1 << bpp) - 1;
    const a: number[] = [];
    let bit = 0;
    for (let k = 0; k < w * h; k++, bit += bpp) a.push(((d[q + 24 + (bit >> 3)] >> (8 - bpp - (bit & 7))) & mask) * Math.floor(255 / mask));
    q += 24 + Math.ceil((w * h * bpp) / 8);
    glyphs.push({ code, adv, ofsX, top, w, h, a });
  }
  expect(q).toBe(gEnd);
  return { asc, desc, gap, bpp, glyphs };
}

describe('float32Auto', () => {
  it('round-trips with the bridge decoder', () => {
    for (const v of [0, 1, -1, 0.5, 7.25, -13.75, 100.125, 0.001, 1234.5]) {
      const back = decodeFloat32Auto(float32Auto(v));
      expect(back).toBeCloseTo(v, 4);
    }
  });
  it('matches the VESC layout for a known value', () => {
    // 1.0 = 0.5 * 2^1 -> sig 0.5 => mantissa 0, exponent 1 + 126
    expect(float32Auto(1)).toBe(127 << 23);
    expect(float32Auto(0)).toBe(0);
  });
});

describe('VESC image encoding', () => {
  it('packs rows to a byte boundary, MSB first', () => {
    const idx = [1, 2, 3, 0, 1, 2]; // 3x2 at 2 bpp
    const bin = encodeVescImage(3, 2, 2, idx);
    expect([...bin.slice(0, 5)]).toEqual([0, 3, 0, 2, 2]);
    expect(decodeImage(bin).px).toEqual(idx);
    expect(bin.length).toBe(5 + 1 * 2); // 3 px * 2 bit = 6 bit -> 1 byte per row
  });

  it('quantises RGBA to a palette with transparent index 0', () => {
    // 4x1: transparent, red, green, red
    const rgba = [0, 0, 0, 0, 255, 0, 0, 255, 0, 255, 0, 255, 250, 5, 5, 255];
    const img = rgbaToVescImage(rgba, 4, 1);
    expect(img.palette[0]).toBeNull();
    expect(img.palette.length - 1).toBe(3);
    expect(img.bpp).toBe(2);
    const dec = decodeImage(img.bin);
    expect(dec.px[0]).toBe(0);
    expect(dec.px[1]).not.toBe(0);
    expect(dec.px[2]).not.toBe(dec.px[1]);
    // all non-transparent pixels resolve to real palette entries
    for (const p of dec.px.slice(1)) expect(img.palette[p]).not.toBeUndefined();
  });

  it('reduces many colors to at most 15', () => {
    const rgba: number[] = [];
    for (let i = 0; i < 64; i++) rgba.push((i * 4) & 255, (255 - i * 3) & 255, (i * 7) & 255, 255);
    const img = rgbaToVescImage(rgba, 8, 8);
    expect(img.bpp).toBe(4);
    expect(img.palette.length).toBeLessThanOrEqual(16);
    expect(decodeImage(img.bin).px.every(p => p < 16 && p > 0)).toBe(true);
  });

  it('uses 1 bpp for a single color', () => {
    const img = rgbaToVescImage([255, 255, 255, 255, 0, 0, 0, 0], 2, 1);
    expect(img.bpp).toBe(1);
    expect(img.palette).toEqual([null, 0xffffff]);
  });
});

describe('VESC font encoding', () => {
  const glyphA = { code: 65, advance: 9.5, offsetX: 1, top: -10, width: 3, height: 2, alpha: [0, 255, 128, 64, 255, 0] };
  const space = { code: 32, advance: 4, offsetX: 0, top: 0, width: 0, height: 0, alpha: [] };
  const bin = encodeVescFont({ ascent: 12, descent: -4, lineGap: 1, bpp: 4, glyphs: [glyphA, space] });
  const font = decodeFont(bin);

  it('writes metrics and sorted glyphs the bridge can parse', () => {
    expect(font.asc).toBeCloseTo(12);
    expect(font.desc).toBeCloseTo(-4);
    expect(font.gap).toBeCloseTo(1);
    expect(font.bpp).toBe(4);
    expect(font.glyphs.map(g => g.code)).toEqual([32, 65]);
  });
  it('keeps glyph geometry and coverage', () => {
    const g = font.glyphs[1];
    expect([g.w, g.h, g.top]).toEqual([3, 2, -10]);
    expect(g.adv).toBeCloseTo(9.5);
    expect(g.ofsX).toBeCloseTo(1);
    // 4 bpp -> values 0..15 -> *17
    expect(g.a).toEqual([0, 255, 136, 68, 255, 0]);
  });
  it('supports 1 and 2 bpp', () => {
    for (const bpp of [1, 2] as const) {
      const f = decodeFont(encodeVescFont({ ascent: 8, descent: -2, lineGap: 0, bpp, glyphs: [glyphA] }));
      expect(f.bpp).toBe(bpp);
      expect(f.glyphs[0].a.length).toBe(6);
    }
  });
});

describe('palette in ui.lisp', () => {
  it('passes the palette to lv-image-set-vesc when known', () => {
    const img = createImageResource({ id: 'i1', name: 'logo', cArrayName: 'img_logo' });
    const pages = [createPage({ components: [createComponent('img', { id: 'c1', name: 'pic', props: { src: 'i1' } })] })];
    const withPal = generateCode(pages, {}, [], undefined, [img], [], undefined, undefined, { i1: [null, 0xff0000, 0x00ff00] });
    expect(withPal['ui/ui.lisp']).toContain('(lv-image-set-vesc ui-pic ui-img-img-logo (list nil 0xFF0000 0x00FF00))');
    const without = generateCode(pages, {}, [], undefined, [img], []);
    expect(without['ui/ui.lisp']).toContain('(lv-image-set-vesc ui-pic ui-img-img-logo)');
  });
});
