import { describe, it, expect } from 'vitest';
import {
  toSnakeCase,
  toCamelCase,
  toPascalCase,
  convertName,
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
import { defaultOptions } from './helpers';

describe('nameUtils', () => {
  // ─── toSnakeCase ───
  describe('toSnakeCase', () => {
    it('converts camelCase', () => {
      expect(toSnakeCase('myButton')).toBe('my_button');
    });

    it('converts PascalCase', () => {
      expect(toSnakeCase('MyButton')).toBe('my_button');
    });

    it('keeps already snake_case', () => {
      expect(toSnakeCase('my_button')).toBe('my_button');
    });

    it('handles spaces and special chars', () => {
      expect(toSnakeCase('my button!')).toBe('my_button_');
    });

    it('collapses multiple underscores', () => {
      expect(toSnakeCase('my__button')).toBe('my_button');
    });

    it('handles empty string', () => {
      expect(toSnakeCase('')).toBe('');
    });

    it('handles single character', () => {
      expect(toSnakeCase('A')).toBe('a');
    });

    it('handles consecutive uppercase', () => {
      expect(toSnakeCase('HTMLParser')).toBe('h_t_m_l_parser');
    });
  });

  // ─── toCamelCase ───
  describe('toCamelCase', () => {
    it('converts snake_case', () => {
      expect(toCamelCase('my_button')).toBe('myButton');
    });

    it('converts space-separated', () => {
      expect(toCamelCase('my button')).toBe('myButton');
    });

    it('handles single word', () => {
      expect(toCamelCase('button')).toBe('button');
    });

    it('handles empty string', () => {
      expect(toCamelCase('')).toBe('');
    });

    it('lowercases first word', () => {
      expect(toCamelCase('My_Button')).toBe('myButton');
    });
  });

  // ─── toPascalCase ───
  describe('toPascalCase', () => {
    it('converts snake_case', () => {
      expect(toPascalCase('my_button')).toBe('MyButton');
    });

    it('converts space-separated', () => {
      expect(toPascalCase('my button')).toBe('MyButton');
    });

    it('capitalizes single word', () => {
      expect(toPascalCase('button')).toBe('Button');
    });

    it('handles empty string', () => {
      expect(toPascalCase('')).toBe('');
    });
  });

  // ─── convertName ───
  describe('convertName', () => {
    it('uses snake_case when namingStyle is snake_case', () => {
      expect(convertName('myButton', defaultOptions({ namingStyle: 'snake_case' }))).toBe('my_button');
    });

    it('uses camelCase when namingStyle is camelCase', () => {
      expect(convertName('my_button', defaultOptions({ namingStyle: 'camelCase' }))).toBe('myButton');
    });
  });

  // ─── toValidCIdentifier ───
  describe('toValidCIdentifier', () => {
    it('replaces invalid characters with underscore', () => {
      expect(toValidCIdentifier('my-button!')).toBe('my_button_');
    });

    it('prepends underscore if starts with digit', () => {
      expect(toValidCIdentifier('1button')).toBe('_1button');
    });

    it('keeps valid identifiers unchanged', () => {
      expect(toValidCIdentifier('my_button_1')).toBe('my_button_1');
    });

    it('handles empty string', () => {
      expect(toValidCIdentifier('')).toBe('');
    });
  });

  // ─── getComponentVarName ───
  describe('getComponentVarName', () => {
    it('generates snake_case var name', () => {
      expect(getComponentVarName('myButton', defaultOptions())).toBe('ui_my_button');
    });

    it('generates camelCase var name', () => {
      expect(getComponentVarName('my_button', defaultOptions({ namingStyle: 'camelCase' }))).toBe('ui_myButton');
    });
  });

  // ─── getScreenVarName ───
  describe('getScreenVarName', () => {
    it('generates snake_case screen var', () => {
      expect(getScreenVarName('MainPage', defaultOptions())).toBe('ui_screen_main_page');
    });

    it('generates camelCase screen var', () => {
      expect(getScreenVarName('main_page', defaultOptions({ namingStyle: 'camelCase' }))).toBe('ui_screen_mainPage');
    });
  });

  // ─── getEventHandlerName ───
  describe('getEventHandlerName', () => {
    it('generates event handler name', () => {
      const result = getEventHandlerName('myButton', 'LV_EVENT_CLICKED', defaultOptions());
      expect(result).toBe('ui_event_my_button_clicked');
    });

    it('strips LV_EVENT_ prefix', () => {
      const result = getEventHandlerName('btn', 'LV_EVENT_VALUE_CHANGED', defaultOptions());
      expect(result).toBe('ui_event_btn_value_changed');
    });

    it('generates camelCase handler name', () => {
      const result = getEventHandlerName('btn', 'LV_EVENT_CLICKED', defaultOptions({ namingStyle: 'camelCase' }));
      expect(result).toBe('ui_event_btnClicked');
    });
  });

  // ─── getScreenInitFuncName ───
  describe('getScreenInitFuncName', () => {
    it('generates init function name', () => {
      expect(getScreenInitFuncName('main', defaultOptions())).toBe('ui_screen_main_init');
    });

    it('generates camelCase init function name', () => {
      expect(getScreenInitFuncName('main_page', defaultOptions({ namingStyle: 'camelCase' }))).toBe('ui_screen_mainPage_init');
    });
  });

  // ─── getScreenLoadFuncName ───
  describe('getScreenLoadFuncName', () => {
    it('generates load function name', () => {
      expect(getScreenLoadFuncName('main', defaultOptions())).toBe('ui_load_screen_main');
    });

    it('generates camelCase load function name', () => {
      expect(getScreenLoadFuncName('main_page', defaultOptions({ namingStyle: 'camelCase' }))).toBe('ui_load_screen_mainPage');
    });
  });

  // ─── colorToLvgl ───
  describe('colorToLvgl', () => {
    it('converts hex color with #', () => {
      expect(colorToLvgl('#FF0000')).toBe('lv_color_hex(0xFF0000)');
    });

    it('converts hex color without #', () => {
      expect(colorToLvgl('00FF00')).toBe('lv_color_hex(0x00FF00)');
    });

    it('handles 3-char hex', () => {
      expect(colorToLvgl('#FFF')).toBe('lv_color_hex(0xFFF)');
    });

    it('handles 8-char hex (with alpha), takes first 6', () => {
      expect(colorToLvgl('#FF000080')).toBe('lv_color_hex(0xFF0000)');
    });

    it('returns black for transparent', () => {
      expect(colorToLvgl('transparent')).toBe('lv_color_hex(0x000000)');
    });

    it('returns black for empty string', () => {
      expect(colorToLvgl('')).toBe('lv_color_hex(0x000000)');
    });

    it('returns black for invalid color', () => {
      expect(colorToLvgl('not-a-color')).toBe('lv_color_hex(0x000000)');
    });

    it('uppercases hex digits', () => {
      expect(colorToLvgl('#abcdef')).toBe('lv_color_hex(0xABCDEF)');
    });
  });

  // ─── opacityToLvgl ───
  describe('opacityToLvgl', () => {
    it('converts 1.0 to 255', () => {
      expect(opacityToLvgl(1.0)).toBe(255);
    });

    it('converts 0.0 to 0', () => {
      expect(opacityToLvgl(0.0)).toBe(0);
    });

    it('converts 0.5 to 128', () => {
      expect(opacityToLvgl(0.5)).toBe(128);
    });

    it('rounds correctly', () => {
      expect(opacityToLvgl(0.1)).toBe(26);
    });
  });

  // ─── escapeCString ───
  describe('escapeCString', () => {
    it('escapes backslash', () => {
      expect(escapeCString('a\\b')).toBe('a\\\\b');
    });

    it('escapes double quotes', () => {
      expect(escapeCString('say "hello"')).toBe('say \\"hello\\"');
    });

    it('escapes newline', () => {
      expect(escapeCString('line1\nline2')).toBe('line1\\nline2');
    });

    it('escapes carriage return', () => {
      expect(escapeCString('a\rb')).toBe('a\\rb');
    });

    it('escapes tab', () => {
      expect(escapeCString('a\tb')).toBe('a\\tb');
    });

    it('handles empty string', () => {
      expect(escapeCString('')).toBe('');
    });

    it('handles string with no special chars', () => {
      expect(escapeCString('hello world')).toBe('hello world');
    });

    it('handles multiple escapes', () => {
      expect(escapeCString('"a\nb\\"')).toBe('\\"a\\nb\\\\\\"');
    });
  });
});
