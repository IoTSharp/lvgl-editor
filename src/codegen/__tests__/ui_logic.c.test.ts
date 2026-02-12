import { describe, it, expect } from 'vitest';
import { generateLogicSource } from '../templates/ui_logic.c';
import {
  defaultOptions,
  createLogicGraph,
  createLogicNode,
  createLogicVariable,
  createLogicConnection,
  createLogicPort,
} from './helpers';

describe('generateLogicSource', () => {
  // ── Includes ──────────────────────────────────────────────
  describe('includes', () => {
    it('includes ui.h and ui_logic.h', () => {
      const result = generateLogicSource(defaultOptions(), []);
      expect(result).toContain('#include "ui.h"');
      expect(result).toContain('#include "ui_logic.h"');
    });

    it('includes string.h and stdio.h as system headers', () => {
      const result = generateLogicSource(defaultOptions(), []);
      expect(result).toContain('#include <string.h>');
      expect(result).toContain('#include <stdio.h>');
    });
  });

  // ── Variables ─────────────────────────────────────────────
  describe('variable declarations', () => {
    it('generates int variable as int32_t', () => {
      const graph = createLogicGraph({
        variables: [createLogicVariable({ name: 'counter', type: 'int', defaultValue: 10 })],
      });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('static int32_t var_counter = 10;');
    });

    it('generates float variable', () => {
      const graph = createLogicGraph({
        variables: [createLogicVariable({ name: 'speed', type: 'float', defaultValue: 3.5 })],
      });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('static float var_speed = 3.5f;');
    });

    it('generates string variable', () => {
      const graph = createLogicGraph({
        variables: [createLogicVariable({ name: 'label', type: 'string', defaultValue: 'hello' })],
      });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('static char* var_label = "hello";');
    });

    it('generates bool variable', () => {
      const graph = createLogicGraph({
        variables: [createLogicVariable({ name: 'active', type: 'bool', defaultValue: true })],
      });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('static bool var_active = true;');
    });

    it('generates bool false variable', () => {
      const graph = createLogicGraph({
        variables: [createLogicVariable({ name: 'done', type: 'bool', defaultValue: false })],
      });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('static bool var_done = false;');
    });

    it('deduplicates variables across graphs', () => {
      const v = createLogicVariable({ name: 'shared', type: 'int', defaultValue: 0 });
      const g1 = createLogicGraph({ name: 'g1', variables: [v] });
      const g2 = createLogicGraph({ name: 'g2', variables: [{ ...v, id: 'other-id' }] });
      const result = generateLogicSource(defaultOptions(), [g1, g2]);
      const matches = result.match(/static int32_t var_shared/g);
      expect(matches).toHaveLength(1);
    });

    it('shows "No variables defined" comment when empty and comments on', () => {
      const result = generateLogicSource(defaultOptions({ generateComments: true }), []);
      expect(result).toContain('// No variables defined');
    });
  });

  // ── Empty graph ───────────────────────────────────────────
  describe('empty graph', () => {
    it('generates empty ui_logic_init with comment', () => {
      const result = generateLogicSource(defaultOptions(), []);
      expect(result).toContain('void ui_logic_init(void) {');
      expect(result).toContain('// No logic to initialize');
    });

    it('shows "No logic graphs defined" comment', () => {
      const result = generateLogicSource(defaultOptions({ generateComments: true }), []);
      expect(result).toContain('// No logic graphs defined');
    });
  });

  // ── event_trigger ─────────────────────────────────────────
  describe('event_trigger node', () => {
    it('generates event comment in function body', () => {
      const node = createLogicNode('event_trigger', {
        id: 'n1',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'myBtn' },
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'click_handler', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: true }), [graph]);
      expect(result).toContain('// Event: LV_EVENT_CLICKED on myBtn');
    });

    it('omits event comment when comments off', () => {
      const node = createLogicNode('event_trigger', {
        id: 'n1',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'myBtn' },
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'click_handler', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).not.toContain('// Event:');
    });
  });

  // ── timer_trigger ─────────────────────────────────────────
  describe('timer_trigger node', () => {
    it('generates timer comment in function body', () => {
      const node = createLogicNode('timer_trigger', {
        id: 'n1',
        params: { mode: 'repeat', duration: 500 },
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'poll', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: true }), [graph]);
      expect(result).toContain('// Timer: repeat, 500ms');
    });

    it('generates timer callback function', () => {
      const node = createLogicNode('timer_trigger', {
        id: 'n1',
        params: { mode: 'repeat', duration: 1000 },
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'poll', nodes: [node] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('static void logic_poll_timer_cb(lv_timer_t *timer)');
      expect(result).toContain('logic_poll();');
    });

    it('generates forward declaration for timer callback', () => {
      const node = createLogicNode('timer_trigger', {
        id: 'n1',
        params: { mode: 'repeat', duration: 1000 },
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'poll', nodes: [node] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      // Forward declaration should appear before the function body
      const fwdIdx = result.indexOf('static void logic_poll_timer_cb(lv_timer_t *timer);');
      expect(fwdIdx).toBeGreaterThan(-1);
    });

    it('generates lv_timer_del for delay (one-shot) mode', () => {
      const node = createLogicNode('timer_trigger', {
        id: 'n1',
        params: { mode: 'delay', duration: 2000 },
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'oneshot', nodes: [node] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('lv_timer_del(timer)');
    });

    it('does not generate lv_timer_del for repeat mode', () => {
      const node = createLogicNode('timer_trigger', {
        id: 'n1',
        params: { mode: 'repeat', duration: 1000 },
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'repeater', nodes: [node] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).not.toContain('lv_timer_del(timer)');
    });
  });

  // ── set_property ──────────────────────────────────────────
  describe('set_property node', () => {
    const props: [string, RegExp][] = [
      ['x', /lv_obj_set_x\(ui_my_btn, 50\)/],
      ['y', /lv_obj_set_y\(ui_my_btn, 100\)/],
      ['width', /lv_obj_set_width\(ui_my_btn, 200\)/],
      ['height', /lv_obj_set_height\(ui_my_btn, 80\)/],
      ['opacity', /lv_obj_set_style_opa\(ui_my_btn, 128, LV_PART_MAIN\)/],
    ];

    for (const [prop, pattern] of props) {
      it(`generates lv_obj_set for property "${prop}"`, () => {
        const node = createLogicNode('set_property', {
          id: 'n1',
          type: 'action',
          params: { targetComponent: 'myBtn', property: prop, value: prop === 'y' ? 100 : prop === 'width' ? 200 : prop === 'height' ? 80 : prop === 'opacity' ? 128 : 50 },
          inputs: [],
          outputs: [],
        });
        const graph = createLogicGraph({ name: 'sp', nodes: [node] });
        const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
        expect(result).toMatch(pattern);
      });
    }
  });

  // ── navigate_page ─────────────────────────────────────────
  describe('navigate_page node', () => {
    it('generates lv_scr_load for no animation', () => {
      const node = createLogicNode('navigate_page', {
        id: 'n1',
        params: { targetPage: 'settings', animation: 'none' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'nav', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_scr_load(ui_settings)');
    });

    it('generates lv_scr_load_anim for fade animation', () => {
      const node = createLogicNode('navigate_page', {
        id: 'n1',
        params: { targetPage: 'home', animation: 'fade' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'nav', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_scr_load_anim(ui_home, LV_SCR_LOAD_ANIM_FADE_IN');
    });

    it('generates lv_scr_load_anim for slide_left', () => {
      const node = createLogicNode('navigate_page', {
        id: 'n1',
        params: { targetPage: 'page2', animation: 'slide_left' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'nav', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('LV_SCR_LOAD_ANIM_MOVE_LEFT');
    });
  });

  // ── show_hide ─────────────────────────────────────────────
  describe('show_hide node', () => {
    it('generates lv_obj_clear_flag for show', () => {
      const node = createLogicNode('show_hide', {
        id: 'n1',
        params: { targetComponent: 'panel', action: 'show' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'sh', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_obj_clear_flag(ui_panel, LV_OBJ_FLAG_HIDDEN)');
    });

    it('generates lv_obj_add_flag for hide', () => {
      const node = createLogicNode('show_hide', {
        id: 'n1',
        params: { targetComponent: 'panel', action: 'hide' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'sh', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_obj_add_flag(ui_panel, LV_OBJ_FLAG_HIDDEN)');
    });

    it('generates toggle code with has_flag check', () => {
      const node = createLogicNode('show_hide', {
        id: 'n1',
        params: { targetComponent: 'panel', action: 'toggle' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'sh', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_obj_has_flag(ui_panel, LV_OBJ_FLAG_HIDDEN)');
      expect(result).toContain('lv_obj_clear_flag(ui_panel, LV_OBJ_FLAG_HIDDEN)');
      expect(result).toContain('lv_obj_add_flag(ui_panel, LV_OBJ_FLAG_HIDDEN)');
    });
  });

  // ── set_text ──────────────────────────────────────────────
  describe('set_text node', () => {
    it('generates lv_label_set_text', () => {
      const node = createLogicNode('set_text', {
        id: 'n1',
        params: { targetComponent: 'myLabel' },
        inputs: [createLogicPort({ id: 'in1', name: '文本', type: 'string', defaultValue: '"Hello"' })],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'st', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_label_set_text(ui_my_label,');
    });
  });

  // ── set_value ─────────────────────────────────────────────
  describe('set_value node', () => {
    it('generates lv_slider_set_value for slider', () => {
      const node = createLogicNode('set_value', {
        id: 'n1',
        params: { targetComponent: 'mySlider', componentType: 'slider' },
        inputs: [createLogicPort({ id: 'in1', name: '数值', type: 'int', defaultValue: 50 })],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'sv', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_slider_set_value(ui_my_slider,');
    });

    it('generates lv_bar_set_value for bar', () => {
      const node = createLogicNode('set_value', {
        id: 'n1',
        params: { targetComponent: 'myBar', componentType: 'bar' },
        inputs: [createLogicPort({ id: 'in1', name: '数值', type: 'int', defaultValue: 75 })],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'sv', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_bar_set_value(ui_my_bar,');
    });

    it('generates lv_arc_set_value for arc', () => {
      const node = createLogicNode('set_value', {
        id: 'n1',
        params: { targetComponent: 'myArc', componentType: 'arc' },
        inputs: [createLogicPort({ id: 'in1', name: '数值', type: 'int', defaultValue: 30 })],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'sv', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('lv_arc_set_value(ui_my_arc,');
    });
  });

  // ── call_function ─────────────────────────────────────────
  describe('call_function node', () => {
    it('generates function call with no args', () => {
      const node = createLogicNode('call_function', {
        id: 'n1',
        params: { functionName: 'my_custom_func', arguments: [] },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'cf', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('my_custom_func();');
    });

    it('generates function call with arguments', () => {
      const node = createLogicNode('call_function', {
        id: 'n1',
        params: { functionName: 'set_brightness', arguments: ['100', 'true'] },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'cf', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('set_brightness(100, true);');
    });
  });

  // ── delay ─────────────────────────────────────────────────
  describe('delay node', () => {
    it('generates delay comment', () => {
      const node = createLogicNode('delay', {
        id: 'n1',
        params: { duration: 500 },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'dl', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: true }), [graph]);
      expect(result).toContain('// Delay 500ms');
    });
  });

  // ── var_write ─────────────────────────────────────────────
  describe('var_write node', () => {
    it('generates variable assignment', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'btn' },
        inputs: [],
        outputs: [createLogicPort({ id: 'trig_out', name: 'exec', type: 'execution' })],
      });
      const node = createLogicNode('var_write', {
        id: 'n1',
        params: { variableName: 'counter' },
        inputs: [createLogicPort({ id: 'in1', name: '值', type: 'int', defaultValue: 42 })],
        outputs: [],
      });
      const conn = createLogicConnection({
        sourceNode: 'trig', sourceOutput: 'trig_out',
        targetNode: 'n1', targetInput: '', type: 'execution',
      });
      const graph = createLogicGraph({ name: 'vw', nodes: [trigger, node], connections: [conn] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('var_counter = 42;');
    });
  });

  // ── c_code_block ──────────────────────────────────────────
  describe('c_code_block node', () => {
    it('generates custom code inline', () => {
      const node = createLogicNode('c_code_block', {
        id: 'n1',
        params: { code: 'printf("hello world");' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'cc', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('printf("hello world");');
    });

    it('indents multi-line custom code', () => {
      const node = createLogicNode('c_code_block', {
        id: 'n1',
        params: { code: 'int x = 1;\nint y = 2;' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'cc', nodes: [node] });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('int x = 1;');
      expect(result).toContain('int y = 2;');
    });
  });

  // ── Expression nodes (var_read, math_op, compare, logic_op, string_op, get_property) ──
  describe('expression nodes', () => {
    // Helper: wrap a data-consuming node in a trigger → node execution chain
    function graphWithTriggerChain(
      name: string,
      nodes: ReturnType<typeof createLogicNode>[],
      dataConnections: ReturnType<typeof createLogicConnection>[],
      consumerNodeId: string,
    ) {
      const trigger = createLogicNode('event_trigger', {
        id: '_trig',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'btn' },
        inputs: [],
        outputs: [createLogicPort({ id: '_trig_out', name: 'exec', type: 'execution' })],
      });
      const execConn = createLogicConnection({
        sourceNode: '_trig', sourceOutput: '_trig_out',
        targetNode: consumerNodeId, targetInput: '', type: 'execution',
      });
      return createLogicGraph({
        name,
        nodes: [trigger, ...nodes],
        connections: [execConn, ...dataConnections],
      });
    }

    it('var_read resolves to variable name', () => {
      const varRead = createLogicNode('var_read', {
        id: 'vr1', type: 'data',
        params: { variableName: 'counter' },
        inputs: [],
        outputs: [createLogicPort({ id: 'vr1_out', name: 'value', type: 'int' })],
      });
      const varWrite = createLogicNode('var_write', {
        id: 'vw1',
        params: { variableName: 'result' },
        inputs: [createLogicPort({ id: 'vw1_in', name: '值', type: 'int' })],
        outputs: [],
      });
      const dataConn = createLogicConnection({
        sourceNode: 'vr1', sourceOutput: 'vr1_out',
        targetNode: 'vw1', targetInput: 'vw1_in', type: 'data',
      });
      const graph = graphWithTriggerChain('expr', [varRead, varWrite], [dataConn], 'vw1');
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('var_result = var_counter;');
    });

    it('math_op generates (a + b) expression', () => {
      const mathNode = createLogicNode('math_op', {
        id: 'm1', type: 'data',
        params: { operator: '+' },
        inputs: [
          createLogicPort({ id: 'm1_a', name: 'A', type: 'int', defaultValue: 10 }),
          createLogicPort({ id: 'm1_b', name: 'B', type: 'int', defaultValue: 20 }),
        ],
        outputs: [createLogicPort({ id: 'm1_out', name: 'result', type: 'int' })],
      });
      const varWrite = createLogicNode('var_write', {
        id: 'vw1',
        params: { variableName: 'sum' },
        inputs: [createLogicPort({ id: 'vw1_in', name: '值', type: 'int' })],
        outputs: [],
      });
      const dataConn = createLogicConnection({
        sourceNode: 'm1', sourceOutput: 'm1_out',
        targetNode: 'vw1', targetInput: 'vw1_in', type: 'data',
      });
      const graph = graphWithTriggerChain('math', [mathNode, varWrite], [dataConn], 'vw1');
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('var_sum = (10 + 20);');
    });

    it('compare generates (a == b) expression', () => {
      const cmpNode = createLogicNode('compare', {
        id: 'c1', type: 'condition',
        params: { operator: '==' },
        inputs: [
          createLogicPort({ id: 'c1_a', name: 'A', type: 'int', defaultValue: 5 }),
          createLogicPort({ id: 'c1_b', name: 'B', type: 'int', defaultValue: 5 }),
        ],
        outputs: [createLogicPort({ id: 'c1_out', name: 'result', type: 'bool' })],
      });
      const ifNode = createLogicNode('if_else', {
        id: 'if1', type: 'condition',
        params: {},
        inputs: [createLogicPort({ id: 'if1_cond', name: '条件', type: 'bool' })],
        outputs: [
          createLogicPort({ id: 'if1_true', name: 'True', type: 'execution' }),
          createLogicPort({ id: 'if1_false', name: 'False', type: 'execution' }),
        ],
      });
      const dataConn = createLogicConnection({
        sourceNode: 'c1', sourceOutput: 'c1_out',
        targetNode: 'if1', targetInput: 'if1_cond', type: 'data',
      });
      const graph = graphWithTriggerChain('cmp', [cmpNode, ifNode], [dataConn], 'if1');
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('if ((5 == 5))');
    });

    it('logic_op AND generates (a && b)', () => {
      const logicNode = createLogicNode('logic_op', {
        id: 'lo1', type: 'condition',
        params: { operator: 'AND' },
        inputs: [
          createLogicPort({ id: 'lo1_a', name: 'A', type: 'bool', defaultValue: 'true' }),
          createLogicPort({ id: 'lo1_b', name: 'B', type: 'bool', defaultValue: 'false' }),
        ],
        outputs: [createLogicPort({ id: 'lo1_out', name: 'result', type: 'bool' })],
      });
      const ifNode = createLogicNode('if_else', {
        id: 'if1', type: 'condition',
        params: {},
        inputs: [createLogicPort({ id: 'if1_cond', name: '条件', type: 'bool' })],
        outputs: [
          createLogicPort({ id: 'if1_true', name: 'True', type: 'execution' }),
          createLogicPort({ id: 'if1_false', name: 'False', type: 'execution' }),
        ],
      });
      const dataConn = createLogicConnection({
        sourceNode: 'lo1', sourceOutput: 'lo1_out',
        targetNode: 'if1', targetInput: 'if1_cond', type: 'data',
      });
      const graph = graphWithTriggerChain('logic_and', [logicNode, ifNode], [dataConn], 'if1');
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('(true && false)');
    });

    it('logic_op NOT generates (!a)', () => {
      const logicNode = createLogicNode('logic_op', {
        id: 'lo1', type: 'condition',
        params: { operator: 'NOT' },
        inputs: [
          createLogicPort({ id: 'lo1_a', name: 'A', type: 'bool', defaultValue: 'true' }),
          createLogicPort({ id: 'lo1_b', name: 'B', type: 'bool' }),
        ],
        outputs: [createLogicPort({ id: 'lo1_out', name: 'result', type: 'bool' })],
      });
      const ifNode = createLogicNode('if_else', {
        id: 'if1', type: 'condition',
        params: {},
        inputs: [createLogicPort({ id: 'if1_cond', name: '条件', type: 'bool' })],
        outputs: [
          createLogicPort({ id: 'if1_true', name: 'True', type: 'execution' }),
          createLogicPort({ id: 'if1_false', name: 'False', type: 'execution' }),
        ],
      });
      const dataConn = createLogicConnection({
        sourceNode: 'lo1', sourceOutput: 'lo1_out',
        targetNode: 'if1', targetInput: 'if1_cond', type: 'data',
      });
      const graph = graphWithTriggerChain('logic_not', [logicNode, ifNode], [dataConn], 'if1');
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('(!true)');
    });

    it('string_op length generates strlen()', () => {
      const strNode = createLogicNode('string_op', {
        id: 's1', type: 'data',
        params: { operation: 'length' },
        inputs: [
          createLogicPort({ id: 's1_a', name: 'A', type: 'string', defaultValue: '"test"' }),
          createLogicPort({ id: 's1_b', name: 'B', type: 'string' }),
        ],
        outputs: [createLogicPort({ id: 's1_out', name: 'result', type: 'int' })],
      });
      const varWrite = createLogicNode('var_write', {
        id: 'vw1',
        params: { variableName: 'len' },
        inputs: [createLogicPort({ id: 'vw1_in', name: '值', type: 'int' })],
        outputs: [],
      });
      const dataConn = createLogicConnection({
        sourceNode: 's1', sourceOutput: 's1_out',
        targetNode: 'vw1', targetInput: 'vw1_in', type: 'data',
      });
      const graph = graphWithTriggerChain('str_len', [strNode, varWrite], [dataConn], 'vw1');
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('var_len = strlen("test");');
    });

    it('string_op concat generates strcat comment', () => {
      const strNode = createLogicNode('string_op', {
        id: 's1', type: 'data',
        params: { operation: 'concat' },
        inputs: [
          createLogicPort({ id: 's1_a', name: 'A', type: 'string', defaultValue: '"hello"' }),
          createLogicPort({ id: 's1_b', name: 'B', type: 'string', defaultValue: '" world"' }),
        ],
        outputs: [createLogicPort({ id: 's1_out', name: 'result', type: 'string' })],
      });
      const varWrite = createLogicNode('var_write', {
        id: 'vw1',
        params: { variableName: 'msg' },
        inputs: [createLogicPort({ id: 'vw1_in', name: '值', type: 'string' })],
        outputs: [],
      });
      const dataConn = createLogicConnection({
        sourceNode: 's1', sourceOutput: 's1_out',
        targetNode: 'vw1', targetInput: 'vw1_in', type: 'data',
      });
      const graph = graphWithTriggerChain('str_cat', [strNode, varWrite], [dataConn], 'vw1');
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('strcat');
    });

    it('get_property generates lv_obj_get_x etc.', () => {
      const getProp = createLogicNode('get_property', {
        id: 'gp1', type: 'data',
        params: { targetComponent: 'myBtn', property: 'x' },
        inputs: [],
        outputs: [createLogicPort({ id: 'gp1_out', name: 'value', type: 'int' })],
      });
      const varWrite = createLogicNode('var_write', {
        id: 'vw1',
        params: { variableName: 'pos_x' },
        inputs: [createLogicPort({ id: 'vw1_in', name: '值', type: 'int' })],
        outputs: [],
      });
      const dataConn = createLogicConnection({
        sourceNode: 'gp1', sourceOutput: 'gp1_out',
        targetNode: 'vw1', targetInput: 'vw1_in', type: 'data',
      });
      const graph = graphWithTriggerChain('get_prop', [getProp, varWrite], [dataConn], 'vw1');
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('var_pos_x = lv_obj_get_x(ui_my_btn);');
    });
  });

  // ── if_else ───────────────────────────────────────────────
  describe('if_else node', () => {
    it('generates if/else with true and false branches', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'btn' },
        inputs: [],
        outputs: [createLogicPort({ id: 'trig_out', name: 'exec', type: 'execution' })],
      });
      const ifNode = createLogicNode('if_else', {
        id: 'if1', type: 'condition',
        params: {},
        inputs: [createLogicPort({ id: 'if1_cond', name: '条件', type: 'bool', defaultValue: 'true' })],
        outputs: [
          createLogicPort({ id: 'if1_true', name: 'True', type: 'execution' }),
          createLogicPort({ id: 'if1_false', name: 'False', type: 'execution' }),
        ],
      });
      const trueAction = createLogicNode('set_property', {
        id: 'act_true',
        params: { targetComponent: 'led', property: 'opacity', value: 255 },
        inputs: [], outputs: [],
      });
      const falseAction = createLogicNode('set_property', {
        id: 'act_false',
        params: { targetComponent: 'led', property: 'opacity', value: 0 },
        inputs: [], outputs: [],
      });
      const execConn = createLogicConnection({
        sourceNode: 'trig', sourceOutput: 'trig_out',
        targetNode: 'if1', targetInput: '', type: 'execution',
      });
      const connTrue = createLogicConnection({
        sourceNode: 'if1', sourceOutput: 'if1_true',
        targetNode: 'act_true', targetInput: '', type: 'execution',
      });
      const connFalse = createLogicConnection({
        sourceNode: 'if1', sourceOutput: 'if1_false',
        targetNode: 'act_false', targetInput: '', type: 'execution',
      });
      const graph = createLogicGraph({
        name: 'branch',
        nodes: [trigger, ifNode, trueAction, falseAction],
        connections: [execConn, connTrue, connFalse],
      });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('if (true)');
      expect(result).toContain('lv_obj_set_style_opa(ui_led, 255, LV_PART_MAIN)');
      expect(result).toContain('} else {');
      expect(result).toContain('lv_obj_set_style_opa(ui_led, 0, LV_PART_MAIN)');
    });

    it('generates if without else when no false branch connected', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'btn' },
        inputs: [],
        outputs: [createLogicPort({ id: 'trig_out', name: 'exec', type: 'execution' })],
      });
      const ifNode = createLogicNode('if_else', {
        id: 'if1', type: 'condition',
        params: {},
        inputs: [createLogicPort({ id: 'if1_cond', name: '条件', type: 'bool', defaultValue: 'true' })],
        outputs: [
          createLogicPort({ id: 'if1_true', name: 'True', type: 'execution' }),
          createLogicPort({ id: 'if1_false', name: 'False', type: 'execution' }),
        ],
      });
      const trueAction = createLogicNode('call_function', {
        id: 'act1',
        params: { functionName: 'do_something', arguments: [] },
        inputs: [], outputs: [],
      });
      const execConn = createLogicConnection({
        sourceNode: 'trig', sourceOutput: 'trig_out',
        targetNode: 'if1', targetInput: '', type: 'execution',
      });
      const connTrue = createLogicConnection({
        sourceNode: 'if1', sourceOutput: 'if1_true',
        targetNode: 'act1', targetInput: '', type: 'execution',
      });
      const graph = createLogicGraph({
        name: 'if_only',
        nodes: [trigger, ifNode, trueAction],
        connections: [execConn, connTrue],
      });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('if (true)');
      expect(result).toContain('do_something()');
      expect(result).not.toContain('} else {');
    });
  });

  // ── switch ────────────────────────────────────────────────
  describe('switch node', () => {
    it('generates switch/case code', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'btn' },
        inputs: [],
        outputs: [createLogicPort({ id: 'trig_out', name: 'exec', type: 'execution' })],
      });
      const switchNode = createLogicNode('switch', {
        id: 'sw1', type: 'condition',
        params: { cases: [0, 1, 2] },
        inputs: [createLogicPort({ id: 'sw1_val', name: '值', type: 'int', defaultValue: 0 })],
        outputs: [
          createLogicPort({ id: 'sw1_c0', name: 'Case 0', type: 'execution' }),
          createLogicPort({ id: 'sw1_c1', name: 'Case 1', type: 'execution' }),
          createLogicPort({ id: 'sw1_c2', name: 'Case 2', type: 'execution' }),
          createLogicPort({ id: 'sw1_def', name: 'Default', type: 'execution' }),
        ],
      });
      const act0 = createLogicNode('call_function', {
        id: 'a0',
        params: { functionName: 'handle_zero', arguments: [] },
        inputs: [], outputs: [],
      });
      const execConn = createLogicConnection({
        sourceNode: 'trig', sourceOutput: 'trig_out',
        targetNode: 'sw1', targetInput: '', type: 'execution',
      });
      const conn0 = createLogicConnection({
        sourceNode: 'sw1', sourceOutput: 'sw1_c0',
        targetNode: 'a0', targetInput: '', type: 'execution',
      });
      const graph = createLogicGraph({
        name: 'sw_test',
        nodes: [trigger, switchNode, act0],
        connections: [execConn, conn0],
      });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      expect(result).toContain('switch (0)');
      expect(result).toContain('case 0:');
      expect(result).toContain('handle_zero()');
      expect(result).toContain('case 1:');
      expect(result).toContain('case 2:');
      expect(result).toContain('default:');
      expect(result).toContain('break;');
    });
  });

  // ── Execution chain tracking ──────────────────────────────
  describe('execution chain', () => {
    it('follows execution connections from trigger to actions', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig1',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'btn1' },
        inputs: [],
        outputs: [createLogicPort({ id: 'trig1_out', name: 'exec', type: 'execution' })],
      });
      const action1 = createLogicNode('set_property', {
        id: 'act1',
        params: { targetComponent: 'led', property: 'x', value: 10 },
        inputs: [],
        outputs: [createLogicPort({ id: 'act1_out', name: 'exec', type: 'execution' })],
      });
      const action2 = createLogicNode('call_function', {
        id: 'act2',
        params: { functionName: 'update_ui', arguments: [] },
        inputs: [],
        outputs: [],
      });
      const conn1 = createLogicConnection({
        sourceNode: 'trig1',
        sourceOutput: 'trig1_out',
        targetNode: 'act1',
        targetInput: '',
        type: 'execution',
      });
      const conn2 = createLogicConnection({
        sourceNode: 'act1',
        sourceOutput: 'act1_out',
        targetNode: 'act2',
        targetInput: '',
        type: 'execution',
      });
      const graph = createLogicGraph({
        name: 'chain',
        nodes: [trigger, action1, action2],
        connections: [conn1, conn2],
      });
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      // Both actions should appear in order
      const setXIdx = result.indexOf('lv_obj_set_x(ui_led, 10)');
      const callIdx = result.indexOf('update_ui()');
      expect(setXIdx).toBeGreaterThan(-1);
      expect(callIdx).toBeGreaterThan(-1);
      expect(setXIdx).toBeLessThan(callIdx);
    });

    it('does not revisit already visited nodes (cycle protection)', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig1',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'btn' },
        inputs: [],
        outputs: [createLogicPort({ id: 'trig1_out', name: 'exec', type: 'execution' })],
      });
      const action = createLogicNode('call_function', {
        id: 'act1',
        params: { functionName: 'loop_func', arguments: [] },
        inputs: [],
        outputs: [createLogicPort({ id: 'act1_out', name: 'exec', type: 'execution' })],
      });
      // Create a cycle: act1 -> act1
      const conn1 = createLogicConnection({
        sourceNode: 'trig1',
        sourceOutput: 'trig1_out',
        targetNode: 'act1',
        targetInput: '',
        type: 'execution',
      });
      const conn2 = createLogicConnection({
        sourceNode: 'act1',
        sourceOutput: 'act1_out',
        targetNode: 'act1',
        targetInput: '',
        type: 'execution',
      });
      const graph = createLogicGraph({
        name: 'cycle',
        nodes: [trigger, action],
        connections: [conn1, conn2],
      });
      // Should not infinite loop — just generates once
      const result = generateLogicSource(defaultOptions({ generateComments: false }), [graph]);
      const matches = result.match(/loop_func\(\)/g);
      expect(matches).toHaveLength(1);
    });
  });

  // ── Init function ─────────────────────────────────────────
  describe('init function', () => {
    it('registers event callback in ui_logic_init', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig1',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'myBtn' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'click', nodes: [trigger] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('lv_obj_add_event_cb(ui_my_btn, logic_click_event_cb, LV_EVENT_CLICKED, NULL)');
    });

    it('registers timer in ui_logic_init', () => {
      const trigger = createLogicNode('timer_trigger', {
        id: 'trig1',
        params: { mode: 'repeat', duration: 2000 },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'poll', nodes: [trigger] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('lv_timer_create(logic_poll_timer_cb, 2000, NULL)');
    });

    it('generates event callback wrapper function', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig1',
        params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'myBtn' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'click', nodes: [trigger] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('static void logic_click_event_cb(lv_event_t *e)');
      expect(result).toContain('(void)e;');
      expect(result).toContain('logic_click();');
    });

    it('generates timer callback with (void)timer', () => {
      const trigger = createLogicNode('timer_trigger', {
        id: 'trig1',
        params: { mode: 'repeat', duration: 1000 },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'tick', nodes: [trigger] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('static void logic_tick_timer_cb(lv_timer_t *timer)');
      expect(result).toContain('(void)timer;');
      expect(result).toContain('logic_tick();');
    });

    it('generates comment for event registration when comments on', () => {
      const trigger = createLogicNode('event_trigger', {
        id: 'trig1',
        params: { eventType: 'LV_EVENT_PRESSED', targetComponent: 'panel' },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'press', nodes: [trigger] });
      const result = generateLogicSource(defaultOptions({ generateComments: true }), [graph]);
      expect(result).toContain('// press: LV_EVENT_PRESSED on panel');
    });

    it('generates comment for timer registration when comments on', () => {
      const trigger = createLogicNode('timer_trigger', {
        id: 'trig1',
        params: { mode: 'repeat', duration: 500 },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'fast_poll', nodes: [trigger] });
      const result = generateLogicSource(defaultOptions({ generateComments: true }), [graph]);
      expect(result).toContain('// fast_poll: timer repeat, 500ms');
    });

    it('shows "No triggers to register" when graph has no triggers', () => {
      const node = createLogicNode('call_function', {
        id: 'n1',
        params: { functionName: 'init_stuff', arguments: [] },
        inputs: [],
        outputs: [],
      });
      const graph = createLogicGraph({ name: 'manual', nodes: [node] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('// No triggers to register');
    });
  });

  // ── User code markers ─────────────────────────────────────
  describe('user code markers', () => {
    it('generates user code section when userCodeMarkers on', () => {
      const result = generateLogicSource(defaultOptions({ userCodeMarkers: true }), []);
      expect(result).toContain('USER_CODE_START: logic_custom');
      expect(result).toContain('USER_CODE_END: logic_custom');
    });

    it('omits user code section when userCodeMarkers off', () => {
      const result = generateLogicSource(defaultOptions({ userCodeMarkers: false }), []);
      expect(result).not.toContain('USER_CODE_START');
      expect(result).not.toContain('USER_CODE_END');
    });
  });

  // ── Logic function structure ──────────────────────────────
  describe('logic function structure', () => {
    it('generates function with graph name', () => {
      const graph = createLogicGraph({ name: 'my_flow' });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('void logic_my_flow(void) {');
    });

    it('generates JSDoc comment with description', () => {
      const graph = createLogicGraph({
        name: 'my_flow',
        description: 'Handles the main flow',
      });
      const result = generateLogicSource(defaultOptions({ generateComments: true }), [graph]);
      expect(result).toContain('* Logic: my_flow');
      expect(result).toContain('* Handles the main flow');
    });

    it('generates "Empty logic graph" comment for graph with no nodes', () => {
      const graph = createLogicGraph({ name: 'empty_flow', nodes: [] });
      const result = generateLogicSource(defaultOptions(), [graph]);
      expect(result).toContain('// Empty logic graph');
    });
  });
});