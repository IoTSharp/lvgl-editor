// Main code generator

import type { Page } from '../types';
import type { LogicGraph } from '../components/LogicEditor/types';
import type { CodeGenOptions, GeneratedCode } from './types';
import { DEFAULT_CODEGEN_OPTIONS } from './types';
import { generateUiHeader } from './templates/ui.h';
import { generateUiSource } from './templates/ui.c';
import { generateEventsHeader } from './templates/ui_events.h';
import { generateEventsSource } from './templates/ui_events.c';
import { generateLogicHeader } from './templates/ui_logic.h';
import { generateLogicSource } from './templates/ui_logic.c';

/**
 * Generate all LVGL C code files from pages and logic graphs
 */
export function generateCode(
  pages: Page[],
  options: Partial<CodeGenOptions> = {},
  logicGraphs: LogicGraph[] = []
): GeneratedCode {
  const opts: CodeGenOptions = { ...DEFAULT_CODEGEN_OPTIONS, ...options };
  
  return {
    'ui.h': generateUiHeader(pages, opts),
    'ui.c': generateUiSource(pages, opts),
    'ui_events.h': generateEventsHeader(pages, opts),
    'ui_events.c': generateEventsSource(pages, opts),
    'ui_logic.h': generateLogicHeader(opts, logicGraphs),
    'ui_logic.c': generateLogicSource(opts, logicGraphs),
  };
}

/**
 * Generate a single file
 */
export function generateSingleFile(
  pages: Page[],
  fileName: keyof GeneratedCode,
  options: Partial<CodeGenOptions> = {},
  logicGraphs: LogicGraph[] = []
): string {
  const opts: CodeGenOptions = { ...DEFAULT_CODEGEN_OPTIONS, ...options };
  
  switch (fileName) {
    case 'ui.h':
      return generateUiHeader(pages, opts);
    case 'ui.c':
      return generateUiSource(pages, opts);
    case 'ui_events.h':
      return generateEventsHeader(pages, opts);
    case 'ui_events.c':
      return generateEventsSource(pages, opts);
    case 'ui_logic.h':
      return generateLogicHeader(opts, logicGraphs);
    case 'ui_logic.c':
      return generateLogicSource(opts, logicGraphs);
    default:
      throw new Error(`Unknown file: ${fileName}`);
  }
}

/**
 * Get list of generated file names
 */
export function getGeneratedFileNames(): (keyof GeneratedCode)[] {
  return ['ui.h', 'ui.c', 'ui_events.h', 'ui_events.c', 'ui_logic.h', 'ui_logic.c'];
}

/**
 * Create a ZIP blob containing all generated files
 * Note: This requires JSZip library to be installed
 */
export async function generateZipBlob(
  pages: Page[],
  options: Partial<CodeGenOptions> = {},
  logicGraphs: LogicGraph[] = []
): Promise<Blob> {
  // Dynamic import to avoid bundling JSZip if not needed
  const JSZip = (await import('jszip')).default;
  
  const code = generateCode(pages, options, logicGraphs);
  const zip = new JSZip();
  
  // Add all files to zip
  for (const [fileName, content] of Object.entries(code)) {
    zip.file(fileName, content);
  }
  
  return zip.generateAsync({ type: 'blob' });
}

/**
 * Download generated code as ZIP file
 */
export async function downloadAsZip(
  pages: Page[],
  options: Partial<CodeGenOptions> = {},
  logicGraphs: LogicGraph[] = [],
  zipFileName: string = 'lvgl_ui.zip'
): Promise<void> {
  const blob = await generateZipBlob(pages, options, logicGraphs);
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
