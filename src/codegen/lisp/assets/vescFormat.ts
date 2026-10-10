// Binary formats read by the P4 Dashboard LVGL bridge (bridge/lvbr_assets.c)
//
//  image : u16 w, u16 h, u8 bpp (1/2/4), then w*h indexed pixels, rows padded to a byte, MSB first.
//          The palette is not stored: it is passed from Lisp, (lv-image-set-vesc img data (list nil 0xRRGGBB ...)).
//  font  : 4 unused bytes, "font\0", then sections (name\0, u32 size, payload):
//          "lmtx"   3 x float32_auto (ascent, descent (negative), line gap)
//          "glyphs" u32 count, u32 bpp, per glyph: u32 code, f32a advance, f32a x offset, i32 top, i32 w, i32 h,
//                   then w*h pixels of bpp bits, packed continuously, MSB first.
//  All multi-byte values are big endian.

/** VESC `buffer_append_float32_auto`: 23 bit mantissa, 8 bit exponent, sign bit; 0 is all zeros. */
export function float32Auto(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const abs = Math.abs(value);
  // frexp: abs = sig * 2^e with sig in [0.5, 1)
  let e = Math.max(-1074, Math.floor(Math.log2(abs)) + 1);
  let sig = abs / Math.pow(2, e);
  while (sig >= 1) { sig /= 2; e++; }
  while (sig < 0.5) { sig *= 2; e--; }
  let sigI = 0;
  let exp = e;
  if (sig >= 0.5) {
    sigI = Math.floor((sig - 0.5) * 2 * 8388608);
    exp += 126;
  }
  let res = (((exp & 0xff) << 23) | (sigI & 0x7fffff)) >>> 0;
  if (value < 0) res = (res | 0x80000000) >>> 0;
  return res;
}

/** Inverse of `float32Auto` (mirrors `f32_auto` in lvbr_assets.c). */
export function decodeFloat32Auto(r: number): number {
  const e = (r >>> 23) & 0xff;
  let v = 0;
  if ((r & 0x7fffffff) !== 0) {
    const sig = (r & 0x7fffff) / (8388608 * 2) + 0.5;
    v = sig * Math.pow(2, e - 126);
  }
  return (r & 0x80000000) !== 0 ? -v : v;
}

class ByteWriter {
  private bytes: number[] = [];
  u8(v: number) { this.bytes.push(v & 0xff); }
  u16(v: number) { this.u8(v >> 8); this.u8(v); }
  u32(v: number) { this.u8(v >>> 24); this.u8(v >>> 16); this.u8(v >>> 8); this.u8(v); }
  i32(v: number) { this.u32(v >>> 0); }
  str0(s: string) { for (let i = 0; i < s.length; i++) this.u8(s.charCodeAt(i)); this.u8(0); }
  raw(b: ArrayLike<number>) { for (let i = 0; i < b.length; i++) this.bytes.push(b[i] & 0xff); }
  get length() { return this.bytes.length; }
  toBytes(): Uint8Array { return Uint8Array.from(this.bytes); }
}

// ------------------------------------------------------------------ images

export interface VescImage {
  bin: Uint8Array;
  /** Palette for `lv-image-set-vesc`: index 0 is transparent (null), others are 0xRRGGBB. */
  palette: Array<number | null>;
  width: number;
  height: number;
  bpp: 1 | 2 | 4;
}

/** Pack palette indices (one per pixel, row-major) into the VESC image layout. */
export function encodeVescImage(width: number, height: number, bpp: 1 | 2 | 4, indices: ArrayLike<number>): Uint8Array {
  const stride = Math.ceil((width * bpp) / 8);
  const out = new Uint8Array(5 + stride * height);
  out[0] = width >> 8; out[1] = width & 0xff;
  out[2] = height >> 8; out[3] = height & 0xff;
  out[4] = bpp;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const bit = x * bpp;
      const v = indices[y * width + x] & ((1 << bpp) - 1);
      out[5 + y * stride + (bit >> 3)] |= v << (8 - bpp - (bit & 7));
    }
  }
  return out;
}

interface Box { colors: Array<{ rgb: number; n: number }>; }

function channel(rgb: number, c: 0 | 1 | 2): number {
  return c === 0 ? (rgb >> 16) & 0xff : c === 1 ? (rgb >> 8) & 0xff : rgb & 0xff;
}

/** Weighted median-cut: reduce `colors` to at most `count` representative colors. */
function medianCut(colors: Array<{ rgb: number; n: number }>, count: number): number[] {
  const boxes: Box[] = [{ colors }];
  while (boxes.length < count) {
    // pick the box with the widest channel range that can still be split
    let best = -1;
    let bestRange = 0;
    let bestChannel: 0 | 1 | 2 = 0;
    boxes.forEach((b, i) => {
      if (b.colors.length < 2) return;
      for (const c of [0, 1, 2] as const) {
        let lo = 255, hi = 0;
        for (const col of b.colors) { const v = channel(col.rgb, c); if (v < lo) lo = v; if (v > hi) hi = v; }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestChannel = c; }
      }
    });
    if (best < 0) break;
    const box = boxes[best];
    const sorted = [...box.colors].sort((a, b) => channel(a.rgb, bestChannel) - channel(b.rgb, bestChannel));
    const total = sorted.reduce((s, c) => s + c.n, 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      acc += sorted[i].n;
      cut = i + 1;
      if (acc >= total / 2) break;
    }
    boxes.splice(best, 1, { colors: sorted.slice(0, cut) }, { colors: sorted.slice(cut) });
  }
  return boxes.map(b => {
    let r = 0, g = 0, bl = 0, n = 0;
    for (const c of b.colors) { r += channel(c.rgb, 0) * c.n; g += channel(c.rgb, 1) * c.n; bl += channel(c.rgb, 2) * c.n; n += c.n; }
    n = n || 1;
    return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(bl / n);
  });
}

/**
 * Convert RGBA pixels to a VESC image: index 0 = transparent, up to 15 opaque colors.
 * The bit depth is the smallest of 1/2/4 that fits.
 */
export function rgbaToVescImage(rgba: ArrayLike<number>, width: number, height: number): VescImage {
  const total = width * height;
  const hist = new Map<number, number>();
  for (let i = 0; i < total; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    const rgb = (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2];
    hist.set(rgb, (hist.get(rgb) || 0) + 1);
  }
  const unique = [...hist.entries()].map(([rgb, n]) => ({ rgb, n }));
  let colors: number[];
  if (unique.length <= 15) colors = unique.sort((a, b) => b.n - a.n).map(c => c.rgb);
  else colors = medianCut(unique, 15).sort((a, b) => a - b);
  const bpp: 1 | 2 | 4 = colors.length + 1 <= 2 ? 1 : colors.length + 1 <= 4 ? 2 : 4;

  const nearest = new Map<number, number>();
  const pick = (rgb: number): number => {
    const cached = nearest.get(rgb);
    if (cached !== undefined) return cached;
    let bi = 0, bd = Infinity;
    const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
    for (let i = 0; i < colors.length; i++) {
      const c = colors[i];
      const dr = r - ((c >> 16) & 0xff), dg = g - ((c >> 8) & 0xff), db = b - (c & 0xff);
      const d = dr * dr * 2 + dg * dg * 4 + db * db * 3; // perceptual-ish weights
      if (d < bd) { bd = d; bi = i; }
    }
    nearest.set(rgb, bi + 1);
    return bi + 1;
  };
  const indices = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (rgba[i * 4 + 3] < 128) continue;
    indices[i] = pick((rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2]);
  }
  return {
    bin: encodeVescImage(width, height, bpp, indices),
    palette: [null, ...colors],
    width,
    height,
    bpp,
  };
}

// ------------------------------------------------------------------ fonts

export interface VescGlyph {
  code: number;
  advance: number;
  /** left side bearing (x offset of the bitmap) */
  offsetX: number;
  /** y of the bitmap's top edge relative to the baseline, y axis pointing down (negative above the baseline) */
  top: number;
  width: number;
  height: number;
  /** coverage per pixel, 0..255, row-major, width*height entries */
  alpha: ArrayLike<number>;
}

export interface VescFontSpec {
  ascent: number;
  /** negative, below the baseline */
  descent: number;
  lineGap: number;
  bpp: 1 | 2 | 4;
  glyphs: VescGlyph[];
}

function section(w: ByteWriter, name: string, payload: ByteWriter) {
  w.str0(name);
  w.u32(payload.length);
  w.raw(payload.toBytes());
}

export function encodeVescFont(spec: VescFontSpec): Uint8Array {
  const out = new ByteWriter();
  out.u32(0);
  out.str0('font');

  const lmtx = new ByteWriter();
  lmtx.u32(float32Auto(spec.ascent));
  lmtx.u32(float32Auto(spec.descent));
  lmtx.u32(float32Auto(spec.lineGap));
  section(out, 'lmtx', lmtx);

  const glyphs = new ByteWriter();
  const glyphList = [...spec.glyphs].sort((a, b) => a.code - b.code);
  glyphs.u32(glyphList.length);
  glyphs.u32(spec.bpp);
  const mask = (1 << spec.bpp) - 1;
  for (const g of glyphList) {
    glyphs.u32(g.code);
    glyphs.u32(float32Auto(g.advance));
    glyphs.u32(float32Auto(g.offsetX));
    glyphs.i32(g.top);
    glyphs.i32(g.width);
    glyphs.i32(g.height);
    const bits = g.width * g.height * spec.bpp;
    const packed = new Uint8Array(Math.ceil(bits / 8));
    let bit = 0;
    for (let i = 0; i < g.width * g.height; i++, bit += spec.bpp) {
      const v = Math.round((g.alpha[i] / 255) * mask);
      packed[bit >> 3] |= v << (8 - spec.bpp - (bit & 7));
    }
    glyphs.raw(packed);
  }
  section(out, 'glyphs', glyphs);
  return out.toBytes();
}
