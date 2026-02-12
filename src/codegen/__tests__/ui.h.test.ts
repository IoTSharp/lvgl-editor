import { describe, it, expect } from 'vitest';
import { generateUiHeader } from '../templates/ui.h';
import { defaultOptions, createPage, createComponent, createFontResource } from './helpers';

describe('generateUiHeader', () => {
  it('generates include guard', () => {
    const result = generateUiHeader([], defaultOptions());
    expect(result).toContain('#ifndef UI_H');
    expect(result).toContain('#define UI_H');
    expect(result).toContain('#endif /* UI_H */');
  });

  it('includes lvgl.h', () => {
    const result = generateUiHeader([], defaultOptions());
    expect(result).toContain('#include "lvgl.h"');
  });

  it('declares ui_init', () => {
    const result = generateUiHeader([], defaultOptions());
    expect(result).toContain('void ui_init(void);');
  });

  it('declares screen extern variables', () => {
    const pages = [createPage({ name: 'main' }), createPage({ name: 'settings' })];
    const result = generateUiHeader(pages, defaultOptions());
    expect(result).toContain('extern lv_obj_t *ui_screen_main;');
    expect(result).toContain('extern lv_obj_t *ui_screen_settings;');
  });

  it('declares screen load functions', () => {
    const pages = [createPage({ name: 'main' })];
    const result = generateUiHeader(pages, defaultOptions());
    expect(result).toContain('void ui_load_screen_main(void);');
  });

  it('declares component extern variables', () => {
    const btn = createComponent('btn', { name: 'myBtn' });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateUiHeader(pages, defaultOptions());
    expect(result).toContain('extern lv_obj_t *ui_my_btn;');
  });

  it('declares nested component variables', () => {
    const label = createComponent('label', { name: 'innerLabel' });
    const container = createComponent('obj', { name: 'container', children: [label] });
    const pages = [createPage({ name: 'main', components: [container] })];
    const result = generateUiHeader(pages, defaultOptions());
    expect(result).toContain('extern lv_obj_t *ui_container;');
    expect(result).toContain('extern lv_obj_t *ui_inner_label;');
  });

  it('handles cross-page same-name components with page prefix', () => {
    const btn1 = createComponent('btn', { id: 'b1', name: 'submit' });
    const btn2 = createComponent('btn', { id: 'b2', name: 'submit' });
    const pages = [
      createPage({ name: 'page1', components: [btn1] }),
      createPage({ name: 'page2', components: [btn2] }),
    ];
    const result = generateUiHeader(pages, defaultOptions());
    expect(result).toContain('extern lv_obj_t *ui_page1_submit;');
    expect(result).toContain('extern lv_obj_t *ui_page2_submit;');
  });

  it('does not prefix same-name components on same page', () => {
    const btn1 = createComponent('btn', { id: 'b1', name: 'submit' });
    const btn2 = createComponent('btn', { id: 'b2', name: 'submit' });
    const pages = [createPage({ name: 'page1', components: [btn1, btn2] })];
    const result = generateUiHeader(pages, defaultOptions());
    // Both on same page, no prefix needed
    expect(result).not.toContain('ui_page1_submit');
  });

  it('generates section headers when comments enabled', () => {
    const pages = [createPage({ name: 'main', components: [createComponent('btn', { name: 'b' })] })];
    const result = generateUiHeader(pages, defaultOptions({ generateComments: true }));
    expect(result).toContain('Screen Declarations');
    expect(result).toContain('Component Declarations');
    expect(result).toContain('Function Declarations');
  });

  it('omits section headers when comments disabled', () => {
    const pages = [createPage({ name: 'main' })];
    const result = generateUiHeader(pages, defaultOptions({ generateComments: false }));
    expect(result).not.toContain('Screen Declarations');
  });

  it('generates font declarations', () => {
    const font = createFontResource({ cFontName: 'font_roboto', sizes: [16, 24] });
    const result = generateUiHeader([], defaultOptions(), [font]);
    expect(result).toContain('LV_FONT_DECLARE(font_roboto_16);');
    expect(result).toContain('LV_FONT_DECLARE(font_roboto_24);');
  });

  it('generates font section header when comments enabled', () => {
    const font = createFontResource();
    const result = generateUiHeader([], defaultOptions({ generateComments: true }), [font]);
    expect(result).toContain('Font Declarations');
  });

  it('handles empty pages array', () => {
    const result = generateUiHeader([], defaultOptions());
    expect(result).toContain('#ifndef UI_H');
    expect(result).toContain('void ui_init(void);');
  });

  it('uses camelCase naming', () => {
    const btn = createComponent('btn', { name: 'my_button' });
    const pages = [createPage({ name: 'main_page', components: [btn] })];
    const result = generateUiHeader(pages, defaultOptions({ namingStyle: 'camelCase' }));
    expect(result).toContain('ui_screen_mainPage');
    expect(result).toContain('ui_myButton');
    expect(result).toContain('ui_load_screen_mainPage');
  });
});
