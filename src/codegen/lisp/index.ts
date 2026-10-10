// LispBM code generation (VESC Express + LVGL bridge) - main entry point

import type { Page, Theme } from '../../types';
import type { LogicGraph } from '../../components/LogicEditor/types';
import type { ImageResource, FontResource } from '../../resources/types';
import type { LispGenOptions, GeneratedLisp, LispFileName } from './types';
import { DEFAULT_LISP_OPTIONS, LISP_FILE_NAMES } from './types';
import { NameResolver } from './names';
import { generateUiLisp } from './ui';
import { generateEventsLisp } from './events';
import { generateLogicLisp } from './logic';
import { generateMainLisp } from './main';
import { convertAssets } from './assets/convert';

export * from './types';
export { lstr, lcolor } from './sexp';
export { convertAssets } from './assets/convert';
export type { ConvertedAssets } from './assets/convert';

/**
 * Generate the whole project: `main.lisp` plus the `ui/` folder.
 * Argument order matches the former C generator so call sites only change their import.
 */
export function generateCode(
  pages: Page[],
  options: Partial<LispGenOptions> = {},
  logicGraphs: LogicGraph[] = [],
  theme?: Theme,
  imageResources: ImageResource[] = [],
  fontResources: FontResource[] = [],
  defaultFont?: string,
  defaultFontSize?: number,
  imagePalettes?: Record<string, Array<number | null>>
): GeneratedLisp {
  const opts: LispGenOptions = { ...DEFAULT_LISP_OPTIONS, ...options };
  const names = new NameResolver(pages, opts);
  const ctx = { options: opts, names, imageResources, fontResources, defaultFont, defaultFontSize, imagePalettes };
  return {
    'main.lisp': generateMainLisp(pages, opts, imageResources, fontResources, defaultFont, defaultFontSize),
    'ui/ui.lisp': generateUiLisp(pages, ctx, theme),
    'ui/ui_events.lisp': generateEventsLisp(pages, names, opts),
    'ui/ui_logic.lisp': generateLogicLisp(logicGraphs, names, opts, pages),
  };
}

export function getGeneratedFileNames(): LispFileName[] {
  return [...LISP_FILE_NAMES];
}

/** ZIP with the project layout: `main.lisp` and `ui/*.lisp`. */
export async function generateZipBlob(
  pages: Page[],
  options: Partial<LispGenOptions> = {},
  logicGraphs: LogicGraph[] = [],
  theme?: Theme,
  imageResources: ImageResource[] = [],
  fontResources: FontResource[] = [],
  defaultFont?: string,
  defaultFontSize?: number
): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const assets = await convertAssets(pages, imageResources, fontResources, defaultFont, defaultFontSize);
  const files = generateCode(pages, options, logicGraphs, theme, imageResources, fontResources, defaultFont, defaultFontSize, assets.imagePalettes);
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  for (const [path, bytes] of Object.entries(assets.files)) zip.file(path, bytes);
  if (assets.errors.length > 0) zip.file('assets/CONVERSION_ERRORS.txt', assets.errors.join('\n') + '\n');
  return zip.generateAsync({ type: 'blob' });
}

export async function downloadAsZip(
  pages: Page[],
  options: Partial<LispGenOptions> = {},
  logicGraphs: LogicGraph[] = [],
  zipFileName = 'lvgl_ui.zip',
  theme?: Theme,
  imageResources: ImageResource[] = [],
  fontResources: FontResource[] = [],
  defaultFont?: string,
  defaultFontSize?: number
): Promise<void> {
  const blob = await generateZipBlob(pages, options, logicGraphs, theme, imageResources, fontResources, defaultFont, defaultFontSize);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
