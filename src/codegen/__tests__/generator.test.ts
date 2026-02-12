import { describe, it, expect } from 'vitest';
import { generateCode, generateSingleFile, getGeneratedFileNames } from '../generator';
import { defaultOptions, createPage, createComponent, createEvent, createBuiltinAction, createFontResource } from './helpers';
import type { GeneratedCode } from '../types';

describe('getGeneratedFileNames', () => {
  it('returns all 6 file names', () => {
    const names = getGeneratedFileNames();
    expect(names).toEqual(['ui.h', 'ui.c', 'ui_events.h', 'ui_events.c', 'ui_logic.h', 'ui_logic.c']);
  });

  it('returns the correct length', () => {
    expect(getGeneratedFileNames()).toHaveLength(6);
  });
});

describe('generateCode', () => {
  it('returns an object with all 6 file keys', () => {
    const code = generateCode([]);
    const keys = Object.keys(code) as (keyof GeneratedCode)[];
    expect(keys).toEqual(['ui.h', 'ui.c', 'ui_events.h', 'ui_events.c', 'ui_logic.h', 'ui_logic.c']);
  });

  it('all values are non-empty strings', () => {
    const code = generateCode([createPage({ name: 'main' })]);
    for (const content of Object.values(code)) {
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('generates correct ui.h content', () => {
    const pages = [createPage({ name: 'home' })];
    const code = generateCode(pages);
    expect(code['ui.h']).toContain('#ifndef UI_H');
    expect(code['ui.h']).toContain('extern lv_obj_t *ui_screen_home;');
    expect(code['ui.h']).toContain('void ui_init(void);');
  });

  it('generates correct ui_events.h content', () => {
    const btn = createComponent('btn', {
      name: 'myBtn',
      events: [createEvent({ eventType: 'LV_EVENT_CLICKED' })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const code = generateCode(pages);
    expect(code['ui_events.h']).toContain('#ifndef UI_EVENTS_H');
    expect(code['ui_events.h']).toContain('ui_event_my_btn_clicked');
  });

  it('generates correct ui_events.c content', () => {
    const btn = createComponent('btn', {
      name: 'myBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'show', targetComponent: 'panel' }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const code = generateCode(pages);
    expect(code['ui_events.c']).toContain('#include "ui.h"');
    expect(code['ui_events.c']).toContain('lv_obj_clear_flag(ui_panel, LV_OBJ_FLAG_HIDDEN)');
  });

  it('handles empty pages', () => {
    const code = generateCode([]);
    expect(code['ui.h']).toContain('#ifndef UI_H');
    expect(code['ui_events.h']).toContain('#ifndef UI_EVENTS_H');
  });

  it('applies custom options', () => {
    const btn = createComponent('btn', { name: 'my_button' });
    const pages = [createPage({ name: 'main_page', components: [btn] })];
    const code = generateCode(pages, { namingStyle: 'camelCase', generateComments: false });
    expect(code['ui.h']).toContain('ui_screen_mainPage');
    expect(code['ui.h']).toContain('ui_myButton');
    expect(code['ui.h']).not.toContain('Screen Declarations');
  });

  it('passes font resources to ui.h', () => {
    const font = createFontResource({ cFontName: 'font_custom', sizes: [12] });
    const code = generateCode([], {}, [], undefined, [], [font]);
    expect(code['ui.h']).toContain('LV_FONT_DECLARE(font_custom_12);');
  });

  it('uses default options when none provided', () => {
    const code = generateCode([createPage({ name: 'test' })]);
    // Default has generateComments: true
    expect(code['ui.h']).toContain('Screen Declarations');
  });
});

describe('generateSingleFile', () => {
  it('returns ui.h content', () => {
    const pages = [createPage({ name: 'main' })];
    const content = generateSingleFile(pages, 'ui.h');
    expect(content).toContain('#ifndef UI_H');
    expect(content).toContain('extern lv_obj_t *ui_screen_main;');
  });

  it('returns ui.c content', () => {
    const pages = [createPage({ name: 'main' })];
    const content = generateSingleFile(pages, 'ui.c');
    expect(content).toContain('#include "ui.h"');
  });

  it('returns ui_events.h content', () => {
    const content = generateSingleFile([], 'ui_events.h');
    expect(content).toContain('#ifndef UI_EVENTS_H');
  });

  it('returns ui_events.c content', () => {
    const content = generateSingleFile([], 'ui_events.c');
    expect(content).toContain('#include "ui_events.h"');
  });

  it('returns ui_logic.h content', () => {
    const content = generateSingleFile([], 'ui_logic.h');
    expect(content).toContain('#ifndef UI_LOGIC_H');
  });

  it('returns ui_logic.c content', () => {
    const content = generateSingleFile([], 'ui_logic.c');
    expect(content).toContain('#include "ui_logic.h"');
  });

  it('applies custom options', () => {
    const btn = createComponent('btn', { name: 'my_button' });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const content = generateSingleFile(pages, 'ui.h', { namingStyle: 'camelCase' });
    expect(content).toContain('ui_myButton');
  });

  it('matches corresponding generateCode output', () => {
    const pages = [createPage({ name: 'main' })];
    const opts = { generateComments: true };
    const allCode = generateCode(pages, opts);
    const single = generateSingleFile(pages, 'ui.h', opts);
    expect(single).toBe(allCode['ui.h']);
  });
});
