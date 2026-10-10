import { sym } from '../sexp';
import type { FontResource, ImageResource } from '../../../resources/types';
import type { LvglComponent, Page, StyleProps } from '../../../types';
import type { LispGenOptions } from '../types';

/** Built-in Montserrat sizes available on the P4 board */
export const BUILTIN_SIZES = [14, 16, 20, 24, 32, 48];

export const isBuiltinFont = (name: string) => /^montserrat_\d+$/.test(name);

// ---------------------------------------------------------------- resources

export function findImage(src: string | undefined, images: ImageResource[]): ImageResource | undefined {
  if (!src) return undefined;
  return images.find(i => i.id === src || i.name === src);
}

/** Symbol bound by `(import ...)` in main.lisp to the raw bytes of an image. */
export function imageDataSym(img: ImageResource, o: LispGenOptions): string {
  return sym(o, 'ui', 'img', img.cArrayName);
}

export function fontDataSym(fontName: string, size: number, o: LispGenOptions): string {
  return sym(o, 'ui', 'fontdata', fontName, size);
}

export function fontSym(fontName: string, size: number, o: LispGenOptions): string {
  return sym(o, 'ui', 'font', fontName, size);
}

export function collectUsedImages(pages: Page[], images: ImageResource[]): ImageResource[] {
  const used = new Set<string>();
  const walk = (cs: LvglComponent[]) => {
    for (const c of cs) {
      if (c.type === 'img') {
        const m = findImage(c.props.src, images);
        if (m) used.add(m.id);
      }
      walk(c.children);
    }
  };
  pages.forEach(p => walk(p.components));
  return images.filter(i => used.has(i.id));
}

/** Custom font + size combinations that are referenced by components (or the project default). */
export function collectUsedCustomFonts(
  pages: Page[],
  fonts: FontResource[],
  defaultFont?: string,
  defaultFontSize?: number
): Map<string, Set<number>> {
  const used = new Map<string, Set<number>>();
  const custom = new Set(fonts.map(f => f.cFontName));
  const add = (name: string, size: number) => {
    if (!used.has(name)) used.set(name, new Set());
    used.get(name)!.add(size);
  };
  const walk = (cs: LvglComponent[]) => {
    for (const c of cs) {
      if (c.props.fontResource) {
        const n = c.props.fontResource as string;
        if (!isBuiltinFont(n) && custom.has(n)) add(n, (c.props.fontSize as number) || 16);
      } else if (c.props.fontSize !== undefined && defaultFont && !isBuiltinFont(defaultFont) && custom.has(defaultFont)) {
        const s = c.props.fontSize as number;
        if (s !== (defaultFontSize || 16)) add(defaultFont, s);
      }
      const states: Array<StyleProps | undefined> = Object.values(c.styles);
      for (const st of states) {
        if (st?.textFont && !isBuiltinFont(st.textFont) && custom.has(st.textFont)) add(st.textFont, st.textFontSize || 16);
      }
      walk(c.children);
    }
  };
  pages.forEach(p => walk(p.components));
  if (defaultFont && !isBuiltinFont(defaultFont) && custom.has(defaultFont)) add(defaultFont, defaultFontSize || 16);
  return used;
}
