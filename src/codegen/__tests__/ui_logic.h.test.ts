import { describe, it, expect } from 'vitest';
import { generateLogicHeader } from '../templates/ui_logic.h';
import { defaultOptions, createLogicGraph } from './helpers';

describe('generateLogicHeader', () => {
  it('generates include guard', () => {
    const result = generateLogicHeader(defaultOptions(), []);
    expect(result).toContain('#ifndef UI_LOGIC_H');
    expect(result).toContain('#define UI_LOGIC_H');
    expect(result).toContain('#endif /* UI_LOGIC_H */');
  });

  it('includes lvgl.h', () => {
    const result = generateLogicHeader(defaultOptions(), []);
    expect(result).toContain('#include "lvgl.h"');
  });

  it('includes stdbool.h and stdint.h as system headers', () => {
    const result = generateLogicHeader(defaultOptions(), []);
    expect(result).toContain('#include <stdbool.h>');
    expect(result).toContain('#include <stdint.h>');
  });

  it('declares ui_logic_init when no graphs', () => {
    const result = generateLogicHeader(defaultOptions(), []);
    expect(result).toContain('void ui_logic_init(void);');
  });

  it('outputs "No logic graphs defined" comment when empty and comments on', () => {
    const result = generateLogicHeader(defaultOptions({ generateComments: true }), []);
    expect(result).toContain('// No logic graphs defined');
  });

  it('omits "No logic graphs" comment when comments off', () => {
    const result = generateLogicHeader(defaultOptions({ generateComments: false }), []);
    expect(result).not.toContain('// No logic graphs defined');
    // Still declares init
    expect(result).toContain('void ui_logic_init(void);');
  });

  it('declares logic function for a single graph', () => {
    const graph = createLogicGraph({ name: 'button_click' });
    const result = generateLogicHeader(defaultOptions(), [graph]);
    expect(result).toContain('void logic_button_click(void);');
    expect(result).toContain('void ui_logic_init(void);');
  });

  it('declares logic functions for multiple graphs', () => {
    const g1 = createLogicGraph({ name: 'button_click' });
    const g2 = createLogicGraph({ name: 'slider_change' });
    const result = generateLogicHeader(defaultOptions(), [g1, g2]);
    expect(result).toContain('void logic_button_click(void);');
    expect(result).toContain('void logic_slider_change(void);');
    expect(result).toContain('void ui_logic_init(void);');
  });

  it('generates description comment when graph has description', () => {
    const graph = createLogicGraph({
      name: 'my_logic',
      description: 'Handles button press',
    });
    const result = generateLogicHeader(defaultOptions({ generateComments: true }), [graph]);
    expect(result).toContain('// Handles button press');
    expect(result).toContain('void logic_my_logic(void);');
  });

  it('omits description comment when comments off', () => {
    const graph = createLogicGraph({
      name: 'my_logic',
      description: 'Handles button press',
    });
    const result = generateLogicHeader(defaultOptions({ generateComments: false }), [graph]);
    expect(result).not.toContain('// Handles button press');
    expect(result).toContain('void logic_my_logic(void);');
  });

  it('generates section header when comments on', () => {
    const result = generateLogicHeader(defaultOptions({ generateComments: true }), []);
    expect(result).toContain('Logic Function Declarations');
  });

  it('omits section header when comments off', () => {
    const result = generateLogicHeader(defaultOptions({ generateComments: false }), []);
    expect(result).not.toContain('Logic Function Declarations');
  });

  it('generates "Initialize all logic graphs" comment with graphs present', () => {
    const graph = createLogicGraph({ name: 'test' });
    const result = generateLogicHeader(defaultOptions({ generateComments: true }), [graph]);
    expect(result).toContain('// Initialize all logic graphs');
  });

  it('converts camelCase graph names to snake_case', () => {
    const graph = createLogicGraph({ name: 'MyButtonLogic' });
    const result = generateLogicHeader(defaultOptions(), [graph]);
    expect(result).toContain('void logic_my_button_logic(void);');
  });
});
