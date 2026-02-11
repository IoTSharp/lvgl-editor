import { describe, it, expect } from 'vitest';
import {
  toSnakeCase,
  toCamelCase,
  toPascalCase,
  toValidCIdentifier,
  getComponentVarName,
  getScreenVarName,
  getEventHandlerName,
  getScreenInitFuncName,
  getScreenLoadFuncName,
  colorToLvgl,
  opacityToLvgl,
  escapeCString,
} from '../utils/nameUtils';
import type { CodeGenOptions } from '../types';

const snakeOpts: CodeGenOptions = {
  lvglVersion: '8',
  namingStyle: 'snake_case',
  indentStyle: 'spaces',
  indentSize: 4,
  generateComments: true,
  userCodeMarkers: true,
};

const camelOpts: CodeGenOptions = {
  ...snakeOpts,
  namingStyle: 'camelCase',
};

describe('nameUtils', () => {
  // --- toSnakeCase ---
  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('myButton')).toBe('my_button');
    });

    it('should convert PascalCase to snake_case', () => {
      expect(toSnakeCase('MyButton')).toBe('my_button');
    });

    it('should handle already snake_case', () => {
      expect(toSnakeCase('my_button')).toBe('my_button');
    });

    it('should replace special characters with underscores', () => {
      expect(toSnakeCase('my-button.test')).toBe('my_button_test');
    });

    it('should collapse multiple underscores', () => {
      expect(toSnakeCase('my__button')).toBe('my_button');
    });
  });

  // --- toCamelCase ---
  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(toCamelCase('my_button')).toBe('myButton');
    });

    it('should handle single word', () => {
      expect(toCamelCase('button')).toBe('button');
    });

    it('should handle special characters', () => {
      expect(toCamelCase('my-button')).toBe('myButton');
    });

    it('should handle multiple segments', () => {
      expect(toCamelCase('my_cool_button_text')).toBe('myCoolButtonText');
    });

    it('should handle PascalCase input', () => {
      expect(toCamelCase('MyButton')).toBe('mybutton');
    });
  });

  // --- toPascalCase ---
  describe('toPascalCase', () => {
    it('should convert snake_case to PascalCase', () => {
      expect(toPascalCase('my_button')).toBe('MyButton');
    });

    it('should capitalize single word', () => {
      expect(toPascalCase('button')).toBe('Button');
    });

    it('should handle special characters', () => {
      expect(toPascalCase('my-button')).toBe('MyButton');
    });

    it('should handle multiple segments', () => {
      expect(toPascalCase('my_cool_button')).toBe('MyCoolButton');
    });

    it('should handle already PascalCase', () => {
      expect(toPascalCase('MyButton')).toBe('Mybutton');
    });
  });

  // --- toValidCIdentifier ---
  describe('toValidCIdentifier', () => {
    it('should keep valid identifiers unchanged', () => {
      expect(toValidCIdentifier('my_button')).toBe('my_button');
    });

    it('should replace invalid characters with underscores', () => {
      expect(toValidCIdentifier('my-button.test')).toBe('my_button_test');
    });

    it('should prefix with underscore if starts with digit', () => {
      expect(toValidCIdentifier('123abc')).toBe('_123abc');
    });

    it('should handle empty-ish names', () => {
      expect(toValidCIdentifier('---')).toBe('___');
    });

    it('should keep underscores and alphanumerics', () => {
      expect(toValidCIdentifier('btn_1_ok')).toBe('btn_1_ok');
    });
  });

  // --- getComponentVarName ---
  describe('getComponentVarName', () => {
    it('should generate snake_case variable name with ui_ prefix', () => {
      expect(getComponentVarName('MyButton', snakeOpts)).toBe('ui_my_button');
    });

    it('should generate camelCase variable name with ui_ prefix', () => {
      expect(getComponentVarName('my_button', camelOpts)).toBe('ui_myButton');
    });

    it('should handle component names with special chars', () => {
      const name = getComponentVarName('Button-1', snakeOpts);
      expect(name).toMatch(/^ui_/);
      expect(name).not.toContain('-');
    });

    it('should handle names starting with numbers', () => {
      const name = getComponentVarName('1button', snakeOpts);
      expect(name).toMatch(/^ui_/);
    });

    it('should produce different results for different naming styles', () => {
      const snake = getComponentVarName('MyButton', snakeOpts);
      const camel = getComponentVarName('MyButton', camelOpts);
      expect(snake).not.toBe(camel);
    });
  });

  // --- getScreenVarName ---
  describe('getScreenVarName', () => {
    it('should generate screen variable with ui_screen_ prefix (snake)', () => {
      expect(getScreenVarName('Page 1', snakeOpts)).toMatch(/^ui_screen_/);
    });

    it('should generate screen variable with ui_screen_ prefix (camel)', () => {
      expect(getScreenVarName('Page 1', camelOpts)).toMatch(/^ui_screen_/);
    });

    it('should handle page names with spaces', () => {
      const name = getScreenVarName('Main Screen', snakeOpts);
      expect(name).not.toContain(' ');
    });

    it('should produce valid C identifiers', () => {
      const name = getScreenVarName('Page-1', snakeOpts);
      expect(name).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/);
    });

    it('should differentiate pages by name', () => {
      const name1 = getScreenVarName('Page 1', snakeOpts);
      const name2 = getScreenVarName('Page 2', snakeOpts);
      expect(name1).not.toBe(name2);
    });
  });

  // --- getEventHandlerName ---
  describe('getEventHandlerName', () => {
    it('should generate event handler name', () => {
      const name = getEventHandlerName('MyButton', 'LV_EVENT_CLICKED', snakeOpts);
      expect(name).toMatch(/^ui_event_/);
      expect(name).toContain('clicked');
    });

    it('should strip LV_EVENT_ prefix from event type', () => {
      const name = getEventHandlerName('btn', 'LV_EVENT_VALUE_CHANGED', snakeOpts);
      expect(name).toContain('value_changed');
    });
  });

  // --- getScreenInitFuncName / getScreenLoadFuncName ---
  describe('screen function names', () => {
    it('should generate init function name', () => {
      const name = getScreenInitFuncName('Page 1', snakeOpts);
      expect(name).toMatch(/^ui_screen_.*_init$/);
    });

    it('should generate load function name', () => {
      const name = getScreenLoadFuncName('Page 1', snakeOpts);
      expect(name).toMatch(/^ui_load_screen_/);
    });
  });

  // --- colorToLvgl ---
  describe('colorToLvgl', () => {
    it('should convert hex color with #', () => {
      expect(colorToLvgl('#ff0000')).toBe('lv_color_hex(0xFF0000)');
    });

    it('should convert hex color without #', () => {
      expect(colorToLvgl('00ff00')).toBe('lv_color_hex(0x00FF00)');
    });

    it('should handle mixed case', () => {
      expect(colorToLvgl('#aaBBcc')).toBe('lv_color_hex(0xAABBCC)');
    });

    it('should handle white', () => {
      expect(colorToLvgl('#ffffff')).toBe('lv_color_hex(0xFFFFFF)');
    });

    it('should handle black', () => {
      expect(colorToLvgl('#000000')).toBe('lv_color_hex(0x000000)');
    });
  });

  // --- opacityToLvgl ---
  describe('opacityToLvgl', () => {
    it('should convert 1 to 255', () => {
      expect(opacityToLvgl(1)).toBe(255);
    });

    it('should convert 0 to 0', () => {
      expect(opacityToLvgl(0)).toBe(0);
    });

    it('should convert 0.5 to 128', () => {
      expect(opacityToLvgl(0.5)).toBe(128);
    });
  });

  // --- escapeCString ---
  describe('escapeCString', () => {
    it('should escape backslashes', () => {
      expect(escapeCString('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape double quotes', () => {
      expect(escapeCString('say "hello"')).toBe('say \\"hello\\"');
    });

    it('should escape newlines', () => {
      expect(escapeCString('line1\nline2')).toBe('line1\\nline2');
    });

    it('should escape tabs', () => {
      expect(escapeCString('col1\tcol2')).toBe('col1\\tcol2');
    });

    it('should escape carriage returns', () => {
      expect(escapeCString('line1\rline2')).toBe('line1\\rline2');
    });

    it('should handle combined escapes', () => {
      expect(escapeCString('a\\b"c\nd')).toBe('a\\\\b\\"c\\nd');
    });

    it('should leave normal strings unchanged', () => {
      expect(escapeCString('Hello World')).toBe('Hello World');
    });
  });
});
