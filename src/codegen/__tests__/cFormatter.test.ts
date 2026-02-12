import { describe, it, expect } from 'vitest';
import {
  getIndent,
  formatBlock,
  generateComment,
  generateSectionHeader,
  generateUserCodeMarker,
  generateUserCodeSection,
  formatFunction,
  formatExtern,
  formatVarDef,
  formatFuncDecl,
  wrapInIncludeGuard,
  generateInclude,
} from '../formatters/cFormatter';
import { defaultOptions } from './helpers';

describe('cFormatter', () => {
  // ─── getIndent ───
  describe('getIndent', () => {
    it('returns 4 spaces by default (level 1)', () => {
      expect(getIndent(defaultOptions())).toBe('    ');
    });

    it('returns 8 spaces for level 2', () => {
      expect(getIndent(defaultOptions(), 2)).toBe('        ');
    });

    it('returns empty string for level 0', () => {
      expect(getIndent(defaultOptions(), 0)).toBe('');
    });

    it('uses tabs when indentStyle is tabs', () => {
      expect(getIndent(defaultOptions({ indentStyle: 'tabs' }))).toBe('\t');
      expect(getIndent(defaultOptions({ indentStyle: 'tabs' }), 3)).toBe('\t\t\t');
    });

    it('respects custom indentSize', () => {
      expect(getIndent(defaultOptions({ indentSize: 2 }))).toBe('  ');
      expect(getIndent(defaultOptions({ indentSize: 2 }), 2)).toBe('    ');
    });
  });

  // ─── formatBlock ───
  describe('formatBlock', () => {
    it('does not indent at base level 0', () => {
      const result = formatBlock('line1\nline2', defaultOptions(), 0);
      expect(result).toBe('line1\nline2');
    });

    it('leaves empty lines empty', () => {
      const result = formatBlock('line1\n\nline2', defaultOptions(), 1);
      expect(result).toBe('    line1\n\n    line2');
    });

    it('applies base level indentation', () => {
      const result = formatBlock('code', defaultOptions(), 2);
      expect(result).toBe('        code');
    });
  });

  // ─── generateComment ───
  describe('generateComment', () => {
    it('generates single-line comment', () => {
      expect(generateComment('hello', defaultOptions())).toBe('// hello');
    });

    it('generates multi-line comment', () => {
      const result = generateComment('line1\nline2', defaultOptions(), true);
      expect(result).toBe('/*\n * line1\n * line2\n */');
    });

    it('returns empty string when generateComments is false', () => {
      expect(generateComment('hello', defaultOptions({ generateComments: false }))).toBe('');
    });

    it('returns empty string for multiline when generateComments is false', () => {
      expect(generateComment('hello', defaultOptions({ generateComments: false }), true)).toBe('');
    });
  });

  // ─── generateSectionHeader ───
  describe('generateSectionHeader', () => {
    it('generates section header with dashes', () => {
      const result = generateSectionHeader('Test Section', defaultOptions());
      expect(result).toContain('Test Section');
      expect(result).toContain('/*');
      expect(result).toContain('*/');
      expect(result.split('\n')).toHaveLength(3);
    });

    it('returns empty string when generateComments is false', () => {
      expect(generateSectionHeader('Test', defaultOptions({ generateComments: false }))).toBe('');
    });
  });

  // ─── generateUserCodeMarker ───
  describe('generateUserCodeMarker', () => {
    it('generates start marker', () => {
      expect(generateUserCodeMarker('init', defaultOptions(), true)).toBe('/* USER_CODE_START: init */');
    });

    it('generates end marker', () => {
      expect(generateUserCodeMarker('init', defaultOptions(), false)).toBe('/* USER_CODE_END: init */');
    });

    it('returns empty string when userCodeMarkers is false', () => {
      expect(generateUserCodeMarker('init', defaultOptions({ userCodeMarkers: false }), true)).toBe('');
    });
  });

  // ─── generateUserCodeSection ───
  describe('generateUserCodeSection', () => {
    it('wraps content with start and end markers', () => {
      const result = generateUserCodeSection('section1', defaultOptions(), 'int x = 0;');
      expect(result).toContain('USER_CODE_START: section1');
      expect(result).toContain('int x = 0;');
      expect(result).toContain('USER_CODE_END: section1');
    });

    it('works with empty default content', () => {
      const result = generateUserCodeSection('section1', defaultOptions());
      expect(result).toContain('USER_CODE_START: section1');
      expect(result).toContain('USER_CODE_END: section1');
    });

    it('returns default content when userCodeMarkers is false', () => {
      const result = generateUserCodeSection('section1', defaultOptions({ userCodeMarkers: false }), 'int x = 0;');
      expect(result).toBe('int x = 0;');
    });

    it('returns empty string when userCodeMarkers is false and no default content', () => {
      const result = generateUserCodeSection('section1', defaultOptions({ userCodeMarkers: false }));
      expect(result).toBe('');
    });
  });

  // ─── formatFunction ───
  describe('formatFunction', () => {
    it('formats a simple function', () => {
      const result = formatFunction('void', 'my_func', [], 'return;', defaultOptions());
      expect(result).toBe('void my_func(void) {\n    return;\n}');
    });

    it('formats function with parameters', () => {
      const result = formatFunction('int', 'add', ['int a', 'int b'], 'return a + b;', defaultOptions());
      expect(result).toContain('int add(int a, int b)');
      expect(result).toContain('    return a + b;');
    });

    it('formats static function', () => {
      const result = formatFunction('void', 'helper', [], '', defaultOptions(), true);
      expect(result).toMatch(/^static void helper\(void\)/);
    });

    it('indents multi-line body', () => {
      const result = formatFunction('void', 'f', [], 'int x = 0;\nreturn;', defaultOptions());
      expect(result).toContain('    int x = 0;');
      expect(result).toContain('    return;');
    });
  });

  // ─── formatExtern ───
  describe('formatExtern', () => {
    it('formats extern declaration', () => {
      expect(formatExtern('lv_obj_t', 'ui_btn1')).toBe('extern lv_obj_t *ui_btn1;');
    });
  });

  // ─── formatVarDef ───
  describe('formatVarDef', () => {
    it('formats variable definition', () => {
      expect(formatVarDef('lv_obj_t', 'ui_btn1')).toBe('lv_obj_t *ui_btn1;');
    });

    it('formats static variable definition', () => {
      expect(formatVarDef('lv_obj_t', 'ui_btn1', true)).toBe('static lv_obj_t *ui_btn1;');
    });
  });

  // ─── formatFuncDecl ───
  describe('formatFuncDecl', () => {
    it('formats function declaration with void params', () => {
      expect(formatFuncDecl('void', 'ui_init', [])).toBe('void ui_init(void);');
    });

    it('formats function declaration with params', () => {
      expect(formatFuncDecl('void', 'handler', ['lv_event_t *e'])).toBe('void handler(lv_event_t *e);');
    });
  });

  // ─── wrapInIncludeGuard ───
  describe('wrapInIncludeGuard', () => {
    it('wraps code in include guard', () => {
      const result = wrapInIncludeGuard('int x;', 'MY_HEADER_H');
      expect(result).toContain('#ifndef MY_HEADER_H');
      expect(result).toContain('#define MY_HEADER_H');
      expect(result).toContain('int x;');
      expect(result).toContain('#endif /* MY_HEADER_H */');
    });

    it('has correct ordering', () => {
      const result = wrapInIncludeGuard('content', 'GUARD');
      const lines = result.split('\n');
      expect(lines[0]).toBe('#ifndef GUARD');
      expect(lines[1]).toBe('#define GUARD');
      expect(lines[lines.length - 1]).toBe('#endif /* GUARD */');
    });
  });

  // ─── generateInclude ───
  describe('generateInclude', () => {
    it('generates user include with quotes', () => {
      expect(generateInclude('ui.h')).toBe('#include "ui.h"');
    });

    it('generates system include with angle brackets', () => {
      expect(generateInclude('stdio.h', true)).toBe('#include <stdio.h>');
    });
  });
});
