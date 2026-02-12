import { describe, it, expect } from 'vitest';
import { generateEventsHeader } from '../templates/ui_events.h';
import { defaultOptions, createPage, createComponent, createEvent } from './helpers';

describe('generateEventsHeader', () => {
  it('generates include guard', () => {
    const result = generateEventsHeader([], defaultOptions());
    expect(result).toContain('#ifndef UI_EVENTS_H');
    expect(result).toContain('#define UI_EVENTS_H');
    expect(result).toContain('#endif /* UI_EVENTS_H */');
  });

  it('includes lvgl.h', () => {
    const result = generateEventsHeader([], defaultOptions());
    expect(result).toContain('#include "lvgl.h"');
  });

  it('shows no events comment when no events defined', () => {
    const result = generateEventsHeader([], defaultOptions({ generateComments: true }));
    expect(result).toContain('// No events defined');
  });

  it('omits no events comment when comments disabled', () => {
    const result = generateEventsHeader([], defaultOptions({ generateComments: false }));
    expect(result).not.toContain('// No events defined');
  });

  it('declares event handler function', () => {
    const btn = createComponent('btn', {
      name: 'myBtn',
      events: [createEvent({ eventType: 'LV_EVENT_CLICKED' })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsHeader(pages, defaultOptions());
    expect(result).toContain('void ui_event_my_btn_clicked(lv_event_t *e);');
  });

  it('declares multiple event handlers', () => {
    const btn = createComponent('btn', {
      name: 'myBtn',
      events: [
        createEvent({ eventType: 'LV_EVENT_CLICKED' }),
        createEvent({ eventType: 'LV_EVENT_PRESSED' }),
      ],
    });
    const slider = createComponent('slider', {
      name: 'mySlider',
      events: [createEvent({ eventType: 'LV_EVENT_VALUE_CHANGED' })],
    });
    const pages = [createPage({ name: 'main', components: [btn, slider] })];
    const result = generateEventsHeader(pages, defaultOptions());
    expect(result).toContain('void ui_event_my_btn_clicked(lv_event_t *e);');
    expect(result).toContain('void ui_event_my_btn_pressed(lv_event_t *e);');
    expect(result).toContain('void ui_event_my_slider_value_changed(lv_event_t *e);');
  });

  it('generates section header when comments enabled', () => {
    const btn = createComponent('btn', {
      name: 'b',
      events: [createEvent({ eventType: 'LV_EVENT_CLICKED' })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsHeader(pages, defaultOptions({ generateComments: true }));
    expect(result).toContain('Event Handler Declarations');
  });

  it('omits section header when comments disabled', () => {
    const btn = createComponent('btn', {
      name: 'b',
      events: [createEvent({ eventType: 'LV_EVENT_CLICKED' })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsHeader(pages, defaultOptions({ generateComments: false }));
    expect(result).not.toContain('Event Handler Declarations');
  });

  it('collects events from nested components', () => {
    const label = createComponent('label', {
      name: 'innerLabel',
      events: [createEvent({ eventType: 'LV_EVENT_CLICKED' })],
    });
    const container = createComponent('obj', { name: 'box', children: [label] });
    const pages = [createPage({ name: 'main', components: [container] })];
    const result = generateEventsHeader(pages, defaultOptions());
    expect(result).toContain('void ui_event_inner_label_clicked(lv_event_t *e);');
  });

  it('collects events from multiple pages', () => {
    const btn1 = createComponent('btn', {
      name: 'btn1',
      events: [createEvent({ eventType: 'LV_EVENT_CLICKED' })],
    });
    const btn2 = createComponent('btn', {
      name: 'btn2',
      events: [createEvent({ eventType: 'LV_EVENT_PRESSED' })],
    });
    const pages = [
      createPage({ name: 'page1', components: [btn1] }),
      createPage({ name: 'page2', components: [btn2] }),
    ];
    const result = generateEventsHeader(pages, defaultOptions());
    expect(result).toContain('void ui_event_btn1_clicked(lv_event_t *e);');
    expect(result).toContain('void ui_event_btn2_pressed(lv_event_t *e);');
  });

  it('uses camelCase naming', () => {
    const btn = createComponent('btn', {
      name: 'my_button',
      events: [createEvent({ eventType: 'LV_EVENT_CLICKED' })],
    });
    const pages = [createPage({ name: 'main', components: [btn] })];
    const result = generateEventsHeader(pages, defaultOptions({ namingStyle: 'camelCase' }));
    expect(result).toContain('ui_event_myButtonClicked');
  });

  it('handles empty pages array', () => {
    const result = generateEventsHeader([], defaultOptions());
    expect(result).toContain('#ifndef UI_EVENTS_H');
    expect(result).toContain('#endif /* UI_EVENTS_H */');
  });
});
