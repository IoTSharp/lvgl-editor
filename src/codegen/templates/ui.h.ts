// ui.h template generator

import type { Page, LvglComponent } from '../../types';
import type { FontResource } from '../../resources/types';
import type { CodeGenOptions } from '../types';
import {
  getScreenVarName,
  getComponentVarName,
  getScreenLoadFuncName,
} from '../utils/nameUtils';
import {
  wrapInIncludeGuard,
  generateInclude,
  formatExtern,
  formatFuncDecl,
  generateSectionHeader,
} from '../formatters/cFormatter';

/**
 * Flatten all components from all pages
 */
function getAllComponents(pages: Page[]): { component: LvglComponent; pageName: string }[] {
  const result: { component: LvglComponent; pageName: string }[] = [];
  
  const flatten = (components: LvglComponent[], pageName: string) => {
    for (const comp of components) {
      result.push({ component: comp, pageName });
      flatten(comp.children, pageName);
    }
  };
  
  for (const page of pages) {
    flatten(page.components, page.name);
  }
  
  return result;
}

/**
 * Generate ui.h header file
 */
export function generateUiHeader(pages: Page[], options: CodeGenOptions, fonts: FontResource[] = []): string {
  const lines: string[] = [];
  
  // Includes
  lines.push(generateInclude('lvgl.h'));
  lines.push('');

  // Font declarations
  if (fonts.length > 0) {
    if (options.generateComments) {
      lines.push(generateSectionHeader('Font Declarations', options));
      lines.push('');
    }

    for (const font of fonts) {
      for (const size of font.sizes) {
        lines.push(`LV_FONT_DECLARE(${font.cFontName}_${size});`);
      }
    }
    lines.push('');
  }
  
  // Screen declarations
  if (options.generateComments) {
    lines.push(generateSectionHeader('Screen Declarations', options));
    lines.push('');
  }
  
  for (const page of pages) {
    const varName = getScreenVarName(page.name, options);
    lines.push(formatExtern('lv_obj_t', varName));
  }
  lines.push('');
  
  // Component declarations — detect cross-page name collisions
  const allComponents = getAllComponents(pages);
  const componentsByName = new Map<string, { component: LvglComponent; pageName: string }[]>();
  for (const entry of allComponents) {
    const existing = componentsByName.get(entry.component.name) || [];
    existing.push(entry);
    componentsByName.set(entry.component.name, existing);
  }
  const needsPagePrefix = new Set<string>();
  for (const [, entries] of componentsByName) {
    if (entries.length > 1) {
      const uniquePages = new Set(entries.map(e => e.pageName));
      if (uniquePages.size > 1) {
        for (const entry of entries) {
          needsPagePrefix.add(entry.component.id);
        }
      }
    }
  }

  if (allComponents.length > 0) {
    if (options.generateComments) {
      lines.push(generateSectionHeader('Component Declarations', options));
      lines.push('');
    }

    for (const { component, pageName } of allComponents) {
      const varName = needsPagePrefix.has(component.id)
        ? getComponentVarName(`${pageName}_${component.name}`, options)
        : getComponentVarName(component.name, options);
      lines.push(formatExtern('lv_obj_t', varName));
    }
    lines.push('');
  }
  
  // Function declarations
  if (options.generateComments) {
    lines.push(generateSectionHeader('Function Declarations', options));
    lines.push('');
  }
  
  // Main init function
  lines.push(formatFuncDecl('void', 'ui_init', []));
  lines.push('');
  
  // Screen load functions
  for (const page of pages) {
    const funcName = getScreenLoadFuncName(page.name, options);
    lines.push(formatFuncDecl('void', funcName, []));
  }
  
  const content = lines.join('\n');
  return wrapInIncludeGuard(content, 'UI_H');
}
