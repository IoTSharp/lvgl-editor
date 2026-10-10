// Convert the images and fonts used by a project into the .bin files the generated code imports

import type { Page } from '../../../types';
import type { ImageResource, FontResource } from '../../../resources/types';
import { collectUsedImages, collectUsedCustomFonts } from '../ui';
import { imageToVesc, fontToVesc } from './rasterize';

export interface ConvertedAssets {
  /** project path (`assets/x.bin`, `font/y_16.bin`) -> bytes */
  files: Record<string, Uint8Array>;
  /** image resource id -> palette for lv-image-set-vesc */
  imagePalettes: Record<string, Array<number | null>>;
  /** problems that did not stop the conversion */
  errors: string[];
}

const cache = new Map<string, Promise<unknown>>();

/** Memoise conversions: the key changes whenever the resource data changes. */
function cached<T>(key: string, make: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    // Conversion results are bounded; never retain an entire editing session's
    // replaced image/font payloads indefinitely.
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
    p = make();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

async function fingerprint(s: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function convertAssets(
  pages: Page[],
  images: ImageResource[],
  fonts: FontResource[],
  defaultFont?: string,
  defaultFontSize?: number
): Promise<ConvertedAssets> {
  const result: ConvertedAssets = { files: {}, imagePalettes: {}, errors: [] };

  for (const img of collectUsedImages(pages, images)) {
    try {
      const v = await cached(`img:${img.id}:${await fingerprint(img.data)}`, () => imageToVesc(img));
      result.files[`assets/${img.cArrayName}.bin`] = v.bin;
      result.imagePalettes[img.id] = v.palette;
    } catch (e) {
      result.errors.push(`${img.name}: ${(e as Error).message}`);
    }
  }

  for (const [name, sizes] of collectUsedCustomFonts(pages, fonts, defaultFont, defaultFontSize)) {
    const res = fonts.find(f => f.cFontName === name);
    if (!res) continue;
    for (const size of [...sizes].sort((a, b) => a - b)) {
      try {
        const bin = await cached(
          `font:${res.id}:${size}:${res.bpp}:${res.charset}:${res.customChars ?? ''}:${await fingerprint(res.data)}`,
          () => fontToVesc(res, size)
        );
        result.files[`font/${name}_${size}.bin`] = bin;
      } catch (e) {
        result.errors.push(`${res.name} ${size}px: ${(e as Error).message}`);
      }
    }
  }
  return result;
}
