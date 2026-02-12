import { describe, it, expect } from 'vitest';
import { generateEventsSource } from '../templates/ui_events.c';
import {
  defaultOptions,
  createPage,
  createComponent,
  createEvent,
  createBuiltinAction,
} from './helpers';

describe('generateEventsSource', () => {
  it('includes ui.h and ui_events.h', () => {
    const result = generateEventsSource([], defaultOptions());
    expect(result).toContain('#include "ui.h"');
    expect(result).toContain('#include "ui_events.h"');
  });

  it('shows no events comment when empty and comments enabled', () => {
    const result = generateEventsSource([], defaultOptions({ generateComments: true }));
    expect(result).toContain('// No events defined');
  });

  it('omits no events comment when comments disabled', () => {
    const result = generateEventsSource([], defaultOptions({ generateComments: false }));
    expect(result).not.toContain('// No events defined');
  });

  it('generates user code section at the end', () => {
    const result = generateEventsSource([], defaultOptions({ userCodeMarkers: true }));
    expect(result).toContain('USER_CODE_START: events_custom');
    expect(result).toContain('USER_CODE_END: events_custom');
  });

  it('omits user code markers when disabled', () => {
    const result = generateEventsSource([], defaultOptions({ userCodeMarkers: false }));
    expect(result).not.toContain('USER_CODE_START');
  });

  it('generates event handler function with lv_event_get_code', () => {
    const btn = createComponent('btn', {
      name: 'myBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'show', targetComponent: 'label1' }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('void ui_event_my_btn_clicked(lv_event_t *e)');
    expect(result).toContain('lv_event_code_t code = lv_event_get_code(e);');
    expect(result).toContain('if (code == LV_EVENT_CLICKED)');
  });

  it('generates section header when comments enabled', () => {
    const btn = createComponent('btn', {
      name: 'b',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'show', targetComponent: 'x' }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions({ generateComments: true }));
    expect(result).toContain('Event Handlers');
  });

  // --- Builtin action: navigate ---
  it('generates navigate action', () => {
    const btn = createComponent('btn', {
      name: 'navBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'navigate', targetPage: 'settings' }),
      })],
    });
    const pages = [
      createPage({ name: 'main', components: [btn] }),
      createPage({ name: 'settings' }),
    ];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('ui_load_screen_settings();');
  });

  // --- Builtin action: setProperty ---
  it('generates setProperty action for bg_color', () => {
    const btn = createComponent('btn', {
      name: 'colorBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setProperty',
          targetComponent: 'box1',
          property: 'bg_color',
          value: '#FF0000',
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_obj_set_style_bg_color(ui_box1');
    expect(result).toContain('lv_color_hex(0xFF0000)');
  });

  // --- Builtin action: show ---
  it('generates show action', () => {
    const btn = createComponent('btn', {
      name: 'showBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'show', targetComponent: 'panel' }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_obj_clear_flag(ui_panel, LV_OBJ_FLAG_HIDDEN);');
  });

  // --- Builtin action: hide ---
  it('generates hide action', () => {
    const btn = createComponent('btn', {
      name: 'hideBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'hide', targetComponent: 'panel' }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_obj_add_flag(ui_panel, LV_OBJ_FLAG_HIDDEN);');
  });

  // --- Builtin action: enable ---
  it('generates enable action', () => {
    const btn = createComponent('btn', {
      name: 'enBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'enable', targetComponent: 'input1' }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_obj_clear_state(ui_input1, LV_STATE_DISABLED);');
  });

  // --- Builtin action: disable ---
  it('generates disable action', () => {
    const btn = createComponent('btn', {
      name: 'disBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'disable', targetComponent: 'input1' }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_obj_add_state(ui_input1, LV_STATE_DISABLED);');
  });

  // --- Builtin action: setText for different component types ---
  it('generates setText for label (default)', () => {
    const label = createComponent('label', { name: 'myLabel' });
    const btn = createComponent('btn', {
      name: 'trigBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setText',
          targetComponent: 'myLabel',
          value: 'Hello',
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [label, btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_label_set_text(ui_my_label, "Hello");');
  });

  it('generates setText for textarea', () => {
    const ta = createComponent('textarea', { name: 'myTa' });
    const btn = createComponent('btn', {
      name: 'trigBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setText',
          targetComponent: 'myTa',
          value: 'typed text',
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [ta, btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_textarea_set_text(ui_my_ta, "typed text");');
  });

  it('generates setText for btn (child label)', () => {
    const target = createComponent('btn', { name: 'myBtn' });
    const trigger = createComponent('btn', {
      name: 'trigBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setText',
          targetComponent: 'myBtn',
          value: 'Click me',
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [target, trigger] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_label_set_text(lv_obj_get_child(ui_my_btn, 0), "Click me");');
  });

  it('generates setText for checkbox', () => {
    const cb = createComponent('checkbox', { name: 'myCb' });
    const btn = createComponent('btn', {
      name: 'trigBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setText',
          targetComponent: 'myCb',
          value: 'Agree',
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [cb, btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_checkbox_set_text(ui_my_cb, "Agree");');
  });

  it('generates setText for dropdown', () => {
    const dd = createComponent('dropdown', { name: 'myDd' });
    const btn = createComponent('btn', {
      name: 'trigBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setText',
          targetComponent: 'myDd',
          value: 'Option A',
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [dd, btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_dropdown_set_text(ui_my_dd, "Option A");');
  });

  // --- Builtin action: setValue for different component types ---
  it('generates setValue for slider (default)', () => {
    const slider = createComponent('slider', { name: 'mySlider' });
    const btn = createComponent('btn', {
      name: 'trigBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setValue',
          targetComponent: 'mySlider',
          value: 50,
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [slider, btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_slider_set_value(ui_my_slider, 50, LV_ANIM_ON);');
  });

  it('generates setValue for bar', () => {
    const bar = createComponent('bar', { name: 'myBar' });
    const btn = createComponent('btn', {
      name: 'trigBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setValue',
          targetComponent: 'myBar',
          value: 75,
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [bar, btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_bar_set_value(ui_my_bar, 75, LV_ANIM_ON);');
  });

  it('generates setValue for arc', () => {
    const arc = createComponent('arc', { name: 'myArc' });
    const btn = createComponent('btn', {
      name: 'trigBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({
          type: 'setValue',
          targetComponent: 'myArc',
          value: 120,
        }),
      })],
    });
    const pages = [createPage({ name: 'main', components: [arc, btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('lv_arc_set_value(ui_my_arc, 120);');
  });

  // --- Custom code event ---
  it('generates custom code event handler', () => {
    const btn = createComponent('btn', {
      name: 'customBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'custom',
        customCode: 'printf("clicked!");',
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('printf("clicked!");');
  });

  // --- Empty handler with user code markers ---
  it('generates empty handler with user code markers', () => {
    const btn = createComponent('btn', {
      name: 'emptyBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        // no action
      })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsSource(pages, defaultOptions({ userCodeMarkers: true }));
    expect(result).toContain('USER_CODE_START: emptyBtn_LV_EVENT_CLICKED');
    expect(result).toContain('USER_CODE_END: emptyBtn_LV_EVENT_CLICKED');
  });

  // --- Navigate comment ---
  it('generates navigate comment when comments enabled', () => {
    const btn = createComponent('btn', {
      name: 'navBtn',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'navigate', targetPage: 'settings' }),
      })],
    });
    const pages = [
      createPage({ name: 'main', components: [btn] }),
      createPage({ name: 'settings' }),
    ];
    const result = generateEventsSource(pages, defaultOptions({ generateComments: true }));
    expect(result).toContain('Navigate to: settings');
  });

  // --- Multiple events from multiple pages ---
  it('generates handlers from multiple pages', () => {
    const btn1 = createComponent('btn', {
      name: 'btn1',
      events: [createEvent({
        eventType: 'LV_EVENT_CLICKED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'show', targetComponent: 'x' }),
      })],
    });
    const btn2 = createComponent('btn', {
      name: 'btn2',
      events: [createEvent({
        eventType: 'LV_EVENT_PRESSED',
        handlerType: 'builtin',
        action: createBuiltinAction({ type: 'hide', targetComponent: 'y' }),
      })],
    });
    const pages = [
      createPage({ name: 'page1', components: [btn1] }),
      createPage({ name: 'page2', components: [btn2] }),
    ];
    const result = generateEventsSource(pages, defaultOptions());
    expect(result).toContain('void ui_event_btn1_clicked(lv_event_t *e)');
    expect(result).toContain('void ui_event_btn2_pressed(lv_event_t *e)');
  });
});
