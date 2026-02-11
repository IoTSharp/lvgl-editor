import { describe, it, expect } from 'vitest';
import { generateCode, getGeneratedFileNames } from '../generator';
import type { Page } from '../../types';

function createTestPage(overrides: Partial<Page> = {}): Page {
  return {
    id: 'page-1',
    name: 'Main',
    components: [],
    backgroundColor: '#ffffff',
    ...overrides,
  };
}

function createTestComponent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comp-1',
    type: 'btn',
    name: 'MyButton',
    x: 10,
    y: 20,
    width: 100,
    height: 40,
    children: [],
    props: { text: 'Click Me' },
    styles: {
      default: {
        bgColor: '#2196F3',
        borderColor: '#1976D2',
        borderWidth: 0,
        borderRadius: 4,
        textColor: '#ffffff',
        opacity: 1,
        padding: 8,
      },
    },
    events: [],
    animations: [],
    parentId: null,
    locked: false,
    visible: true,
    ...overrides,
  };
}

describe('generateCode', () => {
  it('should return all 6 generated files', () => {
    const pages = [createTestPage()];
    const code = generateCode(pages);
    const expectedFiles = getGeneratedFileNames();
    expect(Object.keys(code)).toHaveLength(6);
    for (const file of expectedFiles) {
      expect(code).toHaveProperty(file);
      expect(typeof code[file]).toBe('string');
      expect(code[file].length).toBeGreaterThan(0);
    }
  });

  it('should generate ui.c with correct component creation code', () => {
    const btn = createTestComponent();
    const pages = [createTestPage({ components: [btn] })];
    const code = generateCode(pages);
    const uiC = code['ui.c'];

    // Should contain the button create call
    expect(uiC).toContain('lv_btn_create');
    // Should contain position setting
    expect(uiC).toContain('lv_obj_set_pos');
    // Should contain size setting
    expect(uiC).toContain('lv_obj_set_size');
    // Should contain the button text
    expect(uiC).toContain('Click Me');
  });

  it('should generate ui.h with correct declarations', () => {
    const btn = createTestComponent();
    const pages = [createTestPage({ components: [btn] })];
    const code = generateCode(pages);
    const uiH = code['ui.h'];

    // Should have include guard
    expect(uiH).toContain('#ifndef UI_H');
    expect(uiH).toContain('#define UI_H');
    expect(uiH).toContain('#endif');
    // Should include lvgl.h
    expect(uiH).toContain('#include "lvgl.h"');
    // Should declare screen variable
    expect(uiH).toContain('extern lv_obj_t *ui_screen_');
    // Should declare component variable
    expect(uiH).toContain('extern lv_obj_t *ui_');
    // Should declare ui_init
    expect(uiH).toContain('void ui_init(void);');
  });

  it('should generate event callback registration for components with events', () => {
    const btnWithEvent = createTestComponent({
      events: [
        {
          id: 'evt-1',
          eventType: 'LV_EVENT_CLICKED',
          handlerType: 'builtin' as const,
          action: {
            type: 'navigate' as const,
            targetPage: 'Settings',
          },
        },
      ],
    });
    const pages = [
      createTestPage({ components: [btnWithEvent] }),
      createTestPage({ id: 'page-2', name: 'Settings' }),
    ];
    const code = generateCode(pages);
    const uiC = code['ui.c'];

    // Should contain event callback registration
    expect(uiC).toContain('lv_obj_add_event_cb');
    expect(uiC).toContain('LV_EVENT_CLICKED');

    // Events header should declare the handler
    const eventsH = code['ui_events.h'];
    expect(eventsH).toContain('ui_event_');
    expect(eventsH).toContain('lv_event_t *e');

    // Events source should contain the handler implementation
    const eventsC = code['ui_events.c'];
    expect(eventsC).toContain('lv_event_get_code');
  });

  it('should generate multiple screens for multiple pages', () => {
    const pages = [
      createTestPage({ id: 'p1', name: 'Home' }),
      createTestPage({ id: 'p2', name: 'Settings' }),
      createTestPage({ id: 'p3', name: 'About' }),
    ];
    const code = generateCode(pages);
    const uiC = code['ui.c'];
    const uiH = code['ui.h'];

    // Each page should have a screen variable
    expect(uiC).toContain('ui_screen_home');
    expect(uiC).toContain('ui_screen_settings');
    expect(uiC).toContain('ui_screen_about');

    // Each page should have init and load functions
    expect(uiC).toContain('ui_screen_home_init');
    expect(uiC).toContain('ui_screen_settings_init');
    expect(uiC).toContain('ui_screen_about_init');

    // Header should declare all screens
    expect(uiH).toContain('ui_screen_home');
    expect(uiH).toContain('ui_screen_settings');
    expect(uiH).toContain('ui_screen_about');

    // ui_init should call all init functions
    expect(uiC).toContain('ui_screen_home_init()');
    expect(uiC).toContain('ui_screen_settings_init()');
    expect(uiC).toContain('ui_screen_about_init()');
  });

  it('should generate correct code for label component', () => {
    const label = createTestComponent({
      id: 'comp-label',
      type: 'label',
      name: 'StatusLabel',
      props: { text: 'Hello World' },
    });
    const pages = [createTestPage({ components: [label] })];
    const code = generateCode(pages);
    const uiC = code['ui.c'];

    expect(uiC).toContain('lv_label_create');
    expect(uiC).toContain('lv_label_set_text');
    expect(uiC).toContain('Hello World');
  });

  it('should respect codegen options for naming style', () => {
    const btn = createTestComponent({ name: 'MyButton' });
    const pages = [createTestPage({ components: [btn] })];

    const snakeCode = generateCode(pages, { namingStyle: 'snake_case' });
    const camelCode = generateCode(pages, { namingStyle: 'camelCase' });

    // snake_case should produce underscored names
    expect(snakeCode['ui.c']).toContain('ui_my_button');
    // camelCase should produce camelCased names
    expect(camelCode['ui.c']).toContain('ui_mybutton');
  });

  it('should generate slider with range and value', () => {
    const slider = createTestComponent({
      id: 'comp-slider',
      type: 'slider',
      name: 'VolumeSlider',
      props: { min: 0, max: 100, value: 50 },
    });
    const pages = [createTestPage({ components: [slider] })];
    const code = generateCode(pages);
    const uiC = code['ui.c'];

    expect(uiC).toContain('lv_slider_create');
    expect(uiC).toContain('lv_slider_set_range');
    expect(uiC).toContain('lv_slider_set_value');
  });

  it('should generate nested children correctly', () => {
    const child = createTestComponent({
      id: 'child-1',
      type: 'label',
      name: 'ChildLabel',
      props: { text: 'Nested' },
      parentId: 'comp-container',
    });
    const container = createTestComponent({
      id: 'comp-container',
      type: 'obj',
      name: 'Container',
      props: {},
      children: [child],
    });
    const pages = [createTestPage({ components: [container] })];
    const code = generateCode(pages);
    const uiC = code['ui.c'];

    expect(uiC).toContain('lv_obj_create');
    expect(uiC).toContain('lv_label_create');
    expect(uiC).toContain('Nested');
  });

  it('should load first screen in ui_init', () => {
    const pages = [
      createTestPage({ name: 'Home' }),
      createTestPage({ id: 'p2', name: 'Settings' }),
    ];
    const code = generateCode(pages);
    const uiC = code['ui.c'];

    // Should load the first screen
    expect(uiC).toContain('ui_load_screen_home()');
  });
});
