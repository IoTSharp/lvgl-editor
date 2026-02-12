/**
 * Compile verification tests for codegen module.
 * Generates C code via generateCode(), writes to a temp dir, and compiles with emcc + LVGL.
 * This validates that the generated code is syntactically and semantically correct C.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateCode } from '../generator';
import {
  defaultOptions,
  createComponent,
  createPage,
  createEvent,
  createBuiltinAction,
  createAnimation,
  createTheme,
  createImageResource,
  createLogicGraph,
  createLogicNode,
  createLogicVariable,
  createLogicConnection,
  createLogicPort,
  resetIdCounter,
} from './helpers';

// Paths
const EMSDK_ENV = '/home/xcssa/.openclaw/workspace/tools/emsdk/emsdk_env.sh';
const LVGL_ROOT = '/home/xcssa/.openclaw/workspace/tools/lvgl';
const LVGL_LIB = '/home/xcssa/.openclaw/workspace/projects/lvgl-editor/wasm/build/liblvgl_emcc.a';
const LV_CONF_DIR = '/home/xcssa/.openclaw/workspace/projects/lvgl-editor/wasm';

const MAIN_C = `
#include "ui.h"
#include "ui_events.h"
#include "ui_logic.h"
int main(void) {
    lv_init();
    ui_init();
    ui_logic_init();
    return 0;
}
`;

/**
 * Write generated code files + main.c to a temp dir and compile with emcc.
 * Returns { success, stderr } for assertion.
 */
function compileGenerated(
  files: Record<string, string>,
  extraCFiles: string[] = [],
  extraFlags: string[] = [],
): { success: boolean; stderr: string } {
  const tmpDir = mkdtempSync(join(tmpdir(), 'lvgl-compile-'));
  try {
    // Write generated files
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(tmpDir, name), content, 'utf-8');
    }
    // Write main.c
    writeFileSync(join(tmpDir, 'main.c'), MAIN_C, 'utf-8');

    const sourceFiles = ['main.c', 'ui.c', 'ui_events.c', 'ui_logic.c', ...extraCFiles];

    const cmd = [
      `source ${EMSDK_ENV} 2>/dev/null &&`,
      `emcc ${sourceFiles.join(' ')}`,
      `-O0 -DLV_CONF_INCLUDE_SIMPLE`,
      `-I/home/xcssa/.openclaw/workspace/tools`,
      `-I${LVGL_ROOT}`,
      `-I${LVGL_ROOT}/src`,
      `-I${LV_CONF_DIR}`,
      `-I.`,
      LVGL_LIB,
      `-sALLOW_MEMORY_GROWTH=1`,
      `-Wno-unused-function`,
      `-Wno-implicit-function-declaration`,
      `-Wno-unused-variable`,
      ...extraFlags,
      `-o output.js`,
    ].join(' ');

    execSync(cmd, {
      cwd: tmpDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60_000,
      shell: '/bin/bash',
    });
    return { success: true, stderr: '' };
  } catch (err: any) {
    return {
      success: false,
      stderr: err.stderr?.toString() ?? err.message,
    };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('Compile verification', { timeout: 300_000 }, () => {
  // ── 1. Empty project (no pages) ──
  it('compiles empty project', { timeout: 30_000 }, () => {
    const code = generateCode([], defaultOptions());
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 2. Single page + basic components (label, btn) ──
  it('compiles single page with label and button', { timeout: 30_000 }, () => {
    const label = createComponent('label', {
      name: 'title_label',
      props: { text: 'Hello World' },
    });
    const btn = createComponent('btn', {
      name: 'ok_btn',
      props: { text: 'OK' },
    });
    const page = createPage({ name: 'main', components: [label, btn] });
    const code = generateCode([page], defaultOptions());
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 3. Multiple pages + various components ──
  it('compiles multi-page with slider, arc, checkbox, switch, textarea, dropdown, bar', { timeout: 30_000 }, () => {
    const page1 = createPage({
      name: 'home',
      components: [
        createComponent('slider', { name: 'vol_slider', props: { min: 0, max: 100, value: 50 } }),
        createComponent('arc', { name: 'temp_arc', props: { min: 0, max: 360, value: 90 } }),
        createComponent('checkbox', { name: 'agree_cb', props: { text: 'I agree' } }),
      ],
    });
    const page2 = createPage({
      name: 'settings',
      components: [
        createComponent('switch', { name: 'dark_sw' }),
        createComponent('textarea', { name: 'notes_ta', props: { placeholder: 'Enter notes...' } }),
        createComponent('dropdown', { name: 'lang_dd', props: { options: 'English\nChinese\nJapanese' } }),
        createComponent('bar', { name: 'progress_bar', props: { min: 0, max: 100, value: 30 } }),
        createComponent('spinner', { name: 'loading_sp', props: { speed: 1000, arcLength: 60 } }),
      ],
    });
    const code = generateCode([page1, page2], defaultOptions());
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 4. Components with events (builtin + custom) ──
  it('compiles components with events', { timeout: 30_000 }, () => {
    const page2Name = 'settings';
    const btnNav = createComponent('btn', {
      name: 'nav_btn',
      events: [
        createEvent({
          eventType: 'LV_EVENT_CLICKED',
          handlerType: 'builtin',
          action: createBuiltinAction({ type: 'navigate', targetPage: page2Name }),
        }),
      ],
    });
    const btnShow = createComponent('btn', {
      name: 'show_btn',
      events: [
        createEvent({
          eventType: 'LV_EVENT_CLICKED',
          handlerType: 'builtin',
          action: createBuiltinAction({ type: 'show', targetComponent: 'panel1' }),
        }),
      ],
    });
    const btnHide = createComponent('btn', {
      name: 'hide_btn',
      events: [
        createEvent({
          eventType: 'LV_EVENT_CLICKED',
          handlerType: 'builtin',
          action: createBuiltinAction({ type: 'hide', targetComponent: 'panel1' }),
        }),
      ],
    });
    const panel = createComponent('obj', { name: 'panel1' });
    const labelTarget = createComponent('label', { name: 'info_label', props: { text: 'Info' } });
    const btnSetText = createComponent('btn', {
      name: 'set_text_btn',
      events: [
        createEvent({
          eventType: 'LV_EVENT_CLICKED',
          handlerType: 'builtin',
          action: createBuiltinAction({ type: 'setText', targetComponent: 'info_label', value: 'Updated!' }),
        }),
      ],
    });
    const slider = createComponent('slider', { name: 'val_slider', props: { min: 0, max: 100, value: 50 } });
    const btnSetVal = createComponent('btn', {
      name: 'set_val_btn',
      events: [
        createEvent({
          eventType: 'LV_EVENT_CLICKED',
          handlerType: 'builtin',
          action: createBuiltinAction({ type: 'setValue', targetComponent: 'val_slider', value: '75' }),
        }),
      ],
    });
    const btnSetProp = createComponent('btn', {
      name: 'set_prop_btn',
      events: [
        createEvent({
          eventType: 'LV_EVENT_CLICKED',
          handlerType: 'builtin',
          action: createBuiltinAction({
            type: 'setProperty',
            targetComponent: 'panel1',
            property: 'bg_color',
            value: '#FF0000',
          }),
        }),
      ],
    });
    const btnCustom = createComponent('btn', {
      name: 'custom_btn',
      events: [
        createEvent({
          eventType: 'LV_EVENT_CLICKED',
          handlerType: 'custom',
          customCode: 'printf("clicked\\n");',
        }),
      ],
    });

    const page1 = createPage({
      name: 'main',
      components: [btnNav, btnShow, btnHide, panel, labelTarget, btnSetText, slider, btnSetVal, btnSetProp, btnCustom],
    });
    const page2 = createPage({ name: page2Name, components: [] });
    const code = generateCode([page1, page2], defaultOptions());
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 5. Components with styles ──
  it('compiles components with styles', { timeout: 30_000 }, () => {
    const styledObj = createComponent('obj', {
      name: 'styled_panel',
      styles: {
        default: {
          bgColor: '#336699',
          borderColor: '#000000',
          borderWidth: 2,
          borderRadius: 10,
          textColor: '#FFFFFF',
          opacity: 0.8,
          padding: 10,
          bgGradDir: 'ver',
          bgGradColor: '#003366',
          bgGradStop: 200,
        },
      },
    });
    const styledLabel = createComponent('label', {
      name: 'styled_label',
      props: { text: 'Styled' },
      styles: {
        default: {
          textColor: '#FF5500',
          fontSize: 24,
          shadowColor: '#000000',
          shadowWidth: 5,
          shadowOffsetX: 2,
          shadowOffsetY: 2,
          shadowSpread: 1,
        },
      },
    });
    const page = createPage({ name: 'main', components: [styledObj, styledLabel] });
    const code = generateCode([page], defaultOptions());
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 6. Logic graphs (variables, if_else, set_property, navigate_page, timer_trigger) ──
  it('compiles project with logic graphs', { timeout: 30_000 }, () => {
    const triggerNode = createLogicNode('event_trigger', {
      id: 'trigger1',
      label: 'On Click',
      params: { eventType: 'LV_EVENT_CLICKED', componentName: 'my_btn' },
      outputs: [createLogicPort({ id: 'trigger1_out', name: 'exec', type: 'execution' })],
    });
    const ifNode = createLogicNode('if_else', {
      id: 'if1',
      label: 'If counter > 5',
      params: { condition: 'var_counter > 5' },
      inputs: [createLogicPort({ id: 'if1_in', name: 'exec', type: 'execution' })],
      outputs: [
        createLogicPort({ id: 'if1_true', name: 'true', type: 'execution' }),
        createLogicPort({ id: 'if1_false', name: 'false', type: 'execution' }),
      ],
    });
    const setPropNode = createLogicNode('set_property', {
      id: 'sp1',
      label: 'Set bg color',
      params: { componentName: 'my_panel', property: 'bg_color', value: '#00FF00' },
      inputs: [createLogicPort({ id: 'sp1_in', name: 'exec', type: 'execution' })],
    });
    const navNode = createLogicNode('navigate_page', {
      id: 'nav1',
      label: 'Go to settings',
      params: { pageName: 'settings' },
      inputs: [createLogicPort({ id: 'nav1_in', name: 'exec', type: 'execution' })],
    });
    const timerNode = createLogicNode('timer_trigger', {
      id: 'timer1',
      label: 'Every 1s',
      params: { interval: 1000, repeat: true },
      outputs: [createLogicPort({ id: 'timer1_out', name: 'exec', type: 'execution' })],
    });
    const varWriteNode = createLogicNode('var_write', {
      id: 'vw1',
      label: 'Increment counter',
      params: { variableName: 'counter', expression: 'var_counter + 1' },
      inputs: [createLogicPort({ id: 'vw1_in', name: 'exec', type: 'execution' })],
    });

    const graph = createLogicGraph({
      name: 'main_logic',
      variables: [
        createLogicVariable({ name: 'counter', type: 'int', defaultValue: 0 }),
        createLogicVariable({ name: 'is_active', type: 'bool', defaultValue: false }),
      ],
      nodes: [triggerNode, ifNode, setPropNode, navNode, timerNode, varWriteNode],
      connections: [
        createLogicConnection({ sourceNode: 'trigger1', sourceOutput: 'trigger1_out', targetNode: 'if1', targetInput: 'if1_in', type: 'execution' }),
        createLogicConnection({ sourceNode: 'if1', sourceOutput: 'if1_true', targetNode: 'sp1', targetInput: 'sp1_in', type: 'execution' }),
        createLogicConnection({ sourceNode: 'if1', sourceOutput: 'if1_false', targetNode: 'nav1', targetInput: 'nav1_in', type: 'execution' }),
        createLogicConnection({ sourceNode: 'timer1', sourceOutput: 'timer1_out', targetNode: 'vw1', targetInput: 'vw1_in', type: 'execution' }),
      ],
    });

    const btn = createComponent('btn', { name: 'my_btn', props: { text: 'Click' } });
    const panel = createComponent('obj', { name: 'my_panel' });
    const page1 = createPage({ name: 'main', components: [btn, panel] });
    const page2 = createPage({ name: 'settings', components: [] });
    const code = generateCode([page1, page2], defaultOptions(), [graph]);
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 7. Container components (obj with flex, tabview, win) ──
  it('compiles container components', { timeout: 30_000 }, () => {
    const flexChild1 = createComponent('label', { name: 'flex_label', props: { text: 'Item 1' } });
    const flexChild2 = createComponent('btn', { name: 'flex_btn', props: { text: 'Item 2' } });
    const flexContainer = createComponent('obj', {
      name: 'flex_box',
      props: { layout: 'flex', flexDirection: 'row', flexWrap: true },
      children: [flexChild1, flexChild2],
    });

    const tabview = createComponent('tabview', {
      name: 'my_tabs',
      props: { tabs: ['Tab A', 'Tab B', 'Tab C'], tabBarPosition: 'top', tabBarSize: 40, activeTab: 0 },
    });

    const win = createComponent('win', {
      name: 'my_win',
      props: { title: 'My Window', headerHeight: 40, showCloseBtn: true },
    });

    const page = createPage({ name: 'main', components: [flexContainer, tabview, win] });
    const code = generateCode([page], defaultOptions());
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 8. Image component (with stub) ──
  it('compiles image component with stub', { timeout: 30_000 }, () => {
    const imgRes = createImageResource({
      name: 'test_image',
      cArrayName: 'img_test_image',
    });
    const imgComp = createComponent('img', {
      name: 'my_image',
      props: { src: imgRes.name, rotation: 45 },
    });
    const page = createPage({ name: 'main', components: [imgComp] });
    const code = generateCode([page], defaultOptions(), [], undefined, [imgRes]);

    // Add a stub C file providing the image symbol
    const imgStub = `#include "lvgl/lvgl.h"\nconst lv_image_dsc_t img_test_image = {0};\n`;
    code['img_stub.c'] = imgStub;

    const result = compileGenerated(code, ['img_stub.c']);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 9. Components with animations ──
  it('compiles components with animations', { timeout: 30_000 }, () => {
    const label = createComponent('label', {
      name: 'anim_label',
      props: { text: 'Animated' },
      animations: [
        createAnimation({
          name: 'fade_in',
          targetComponentId: 'anim_label',
          type: 'fade_in',
          property: 'opa',
          startValue: 0,
          endValue: 255,
          duration: 500,
          delay: 0,
          easing: 'ease_in_out',
          repeat: 0,
        }),
      ],
    });
    const btn = createComponent('btn', {
      name: 'move_btn',
      props: { text: 'Move' },
      animations: [
        createAnimation({
          name: 'slide_x',
          targetComponentId: 'move_btn',
          type: 'custom',
          property: 'x',
          startValue: 0,
          endValue: 200,
          duration: 1000,
          delay: 100,
          easing: 'bounce',
          repeat: 3,
        }),
      ],
    });
    const page = createPage({ name: 'main', components: [label, btn] });
    const code = generateCode([page], defaultOptions());
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ── 10. v8 mode ──
  // LVGL source is v9, so v8-generated code may not compile. Skip if it fails.
  it.skip('compiles in v8 mode (skipped: LVGL source is v9, v8 API names differ)', { timeout: 30_000 }, () => {
    const label = createComponent('label', { name: 'v8_label', props: { text: 'V8' } });
    const btn = createComponent('btn', { name: 'v8_btn', props: { text: 'OK' } });
    const page = createPage({ name: 'main', components: [label, btn] });
    const code = generateCode([page], defaultOptions({ lvglVersion: '8' }));
    const result = compileGenerated(code);
    expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════
  // A. Component properties coverage
  // ═══════════════════════════════════════════════════════════════════
  describe('Component properties coverage', () => {
    it('compiles line with lineWidth and lineColor', { timeout: 30_000 }, () => {
      const line = createComponent('line', {
        name: 'my_line',
        props: { lineWidth: 5, lineColor: '#FF0000' },
      });
      const page = createPage({ name: 'main', components: [line] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles table with rows, cols, columnWidths, cellData', { timeout: 30_000 }, () => {
      const table = createComponent('table', {
        name: 'my_table',
        props: {
          rows: 3,
          cols: 2,
          columnWidths: [120, 180],
          cellData: [
            ['Name', 'Value'],
            ['Temp', '25°C'],
            ['Hum', '60%'],
          ],
        },
      });
      const page = createPage({ name: 'main', components: [table] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles calendar with year, month, showToday, highlightedDates', { timeout: 30_000 }, () => {
      const cal = createComponent('calendar', {
        name: 'my_cal',
        props: {
          year: 2025,
          month: 6,
          showToday: true,
          highlightedDates: [
            { year: 2025, month: 6, day: 15 },
            { year: 2025, month: 6, day: 20 },
          ],
        },
      });
      const page = createPage({ name: 'main', components: [cal] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles chart with type, yAxis range, series, showGrid=false', { timeout: 30_000 }, () => {
      const chart = createComponent('chart', {
        name: 'my_chart',
        props: {
          type: 'line',
          yAxisMin: -10,
          yAxisMax: 110,
          series: [
            { color: '#FF0000', data: [10, 20, 30, 40, 50] },
            { color: '#00FF00', data: [50, 40, 30, 20, 10] },
          ],
          showGrid: false,
        },
      });
      const page = createPage({ name: 'main', components: [chart] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles chart bar and scatter types', { timeout: 30_000 }, () => {
      const barChart = createComponent('chart', {
        name: 'bar_chart',
        props: { type: 'bar', yAxisMin: 0, yAxisMax: 100, series: [{ color: '#2196F3', data: [30, 60, 90] }] },
      });
      const scatterChart = createComponent('chart', {
        name: 'scatter_chart',
        props: { type: 'scatter', yAxisMin: 0, yAxisMax: 50, series: [{ color: '#FF9800', data: [5, 15, 25, 35] }] },
      });
      const page = createPage({ name: 'main', components: [barChart, scatterChart] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles tileview with rows, cols, currentRow, currentCol', { timeout: 30_000 }, () => {
      const tv = createComponent('tileview', {
        name: 'my_tv',
        props: { rows: 2, cols: 3, currentRow: 1, currentCol: 2 },
      });
      const page = createPage({ name: 'main', components: [tv] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // B. Already-covered components — untested properties
  // ═══════════════════════════════════════════════════════════════════
  describe('Existing component untested properties', () => {
    it('compiles label longMode variants', { timeout: 30_000 }, () => {
      const modes = ['wrap', 'scroll', 'dot', 'clip'] as const;
      const comps = modes.map((m, i) =>
        createComponent('label', { name: `lbl_${m}`, props: { text: `Mode ${m}`, longMode: m } }),
      );
      const page = createPage({ name: 'main', components: comps });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles slider step and vertical orientation', { timeout: 30_000 }, () => {
      const slider = createComponent('slider', {
        name: 'vert_slider',
        props: { min: 0, max: 200, value: 100, step: 10, orientation: 'vertical' },
      });
      const page = createPage({ name: 'main', components: [slider] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles bar vertical orientation', { timeout: 30_000 }, () => {
      const bar = createComponent('bar', {
        name: 'vert_bar',
        props: { min: 0, max: 100, value: 60, orientation: 'vertical' },
      });
      const page = createPage({ name: 'main', components: [bar] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles arc startAngle, endAngle, mode variants', { timeout: 30_000 }, () => {
      const arcNormal = createComponent('arc', {
        name: 'arc_normal',
        props: { startAngle: 0, endAngle: 270, min: 0, max: 100, value: 50, mode: 'normal' },
      });
      const arcSym = createComponent('arc', {
        name: 'arc_sym',
        props: { startAngle: 135, endAngle: 45, min: -50, max: 50, value: 0, mode: 'symmetrical' },
      });
      const arcRev = createComponent('arc', {
        name: 'arc_rev',
        props: { startAngle: 180, endAngle: 360, min: 0, max: 100, value: 75, mode: 'reverse' },
      });
      const page = createPage({ name: 'main', components: [arcNormal, arcSym, arcRev] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles textarea text, maxLength, password, oneLine', { timeout: 30_000 }, () => {
      const ta = createComponent('textarea', {
        name: 'pw_ta',
        props: { text: 'secret', maxLength: 32, password: true, oneLine: true },
      });
      const page = createPage({ name: 'main', components: [ta] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles dropdown selected and direction=up', { timeout: 30_000 }, () => {
      const dd = createComponent('dropdown', {
        name: 'up_dd',
        props: { options: 'A\nB\nC', selected: 2, direction: 'up' },
      });
      const page = createPage({ name: 'main', components: [dd] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles img with non-zero rotation', { timeout: 30_000 }, () => {
      const imgRes = createImageResource({ name: 'rot_img', cArrayName: 'img_rot_img' });
      const img = createComponent('img', {
        name: 'rotated_img',
        props: { src: 'rot_img', rotation: 90 },
      });
      const page = createPage({ name: 'main', components: [img] });
      const code = generateCode([page], defaultOptions(), [], undefined, [imgRes]);
      const imgStub = `#include "lvgl/lvgl.h"\nconst lv_image_dsc_t img_rot_img = {0};\n`;
      code['img_stub.c'] = imgStub;
      const result = compileGenerated(code, ['img_stub.c']);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles tabview with activeTab and tabBarSize', { timeout: 30_000 }, () => {
      const tv = createComponent('tabview', {
        name: 'sized_tabs',
        props: { tabs: ['Home', 'Profile', 'Settings'], tabBarPosition: 'top', tabBarSize: 60, activeTab: 2 },
      });
      const page = createPage({ name: 'main', components: [tv] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles win with headerButtons', { timeout: 30_000 }, () => {
      const win = createComponent('win', {
        name: 'btn_win',
        props: {
          title: 'Settings',
          headerHeight: 50,
          showCloseBtn: true,
          headerButtons: [
            { icon: 'LV_SYMBOL_SETTINGS', width: 40 },
            { icon: 'LV_SYMBOL_HOME', width: 40 },
          ],
        },
      });
      const page = createPage({ name: 'main', components: [win] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles obj with grid layout and child gridCell placement', { timeout: 30_000 }, () => {
      const child1 = createComponent('label', {
        name: 'grid_lbl',
        props: { text: 'Cell 0,0', gridColumn: 0, gridRow: 0, gridColumnSpan: 1, gridRowSpan: 1 },
      });
      const child2 = createComponent('btn', {
        name: 'grid_btn',
        props: { text: 'Cell 1,1', gridColumn: 1, gridRow: 1 },
      });
      const gridObj = createComponent('obj', {
        name: 'grid_container',
        props: {
          layout: 'grid',
          gridColumns: '1fr 1fr',
          gridRows: '50 50',
          gridColumnGap: 10,
          gridRowGap: 5,
        },
        children: [child1, child2],
      });
      const page = createPage({ name: 'main', components: [gridObj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles obj with scrollDir, flexGrow on children, gap', { timeout: 30_000 }, () => {
      const c1 = createComponent('label', { name: 'fg_lbl', props: { text: 'Grow 1', flexGrow: 1 } });
      const c2 = createComponent('btn', { name: 'fg_btn', props: { text: 'Grow 2', flexGrow: 2 } });
      const flexObj = createComponent('obj', {
        name: 'scroll_flex',
        props: { layout: 'flex', flexDirection: 'row', gap: 8, scrollDir: 'ver' },
        children: [c1, c2],
      });
      const page = createPage({ name: 'main', components: [flexObj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // C. Style properties coverage
  // ═══════════════════════════════════════════════════════════════════
  describe('Style properties coverage', () => {
    it('compiles transform styles', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'transform_obj',
        styles: {
          default: {
            transformAngle: 450,
            transformZoomX: 512,
            transformZoomY: 128,
            transformPivotX: 50,
            transformPivotY: 25,
          },
        },
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles outline styles', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'outline_obj',
        styles: {
          default: {
            outlineWidth: 3,
            outlineColor: '#00FF00',
            outlinePad: 5,
          },
        },
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles borderSide variants', { timeout: 30_000 }, () => {
      const top = createComponent('obj', {
        name: 'bs_top',
        styles: { default: { borderWidth: 2, borderColor: '#000', borderSide: 'top' } },
      });
      const bottom = createComponent('obj', {
        name: 'bs_bottom',
        styles: { default: { borderWidth: 2, borderColor: '#000', borderSide: 'bottom' } },
      });
      const lr = createComponent('obj', {
        name: 'bs_lr',
        styles: { default: { borderWidth: 2, borderColor: '#000', borderSide: 'left_right' } },
      });
      const page = createPage({ name: 'main', components: [top, bottom, lr] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles textDecor underline and strikethrough', { timeout: 30_000 }, () => {
      const ul = createComponent('label', {
        name: 'ul_lbl',
        props: { text: 'Underline' },
        styles: { default: { textDecor: 'underline' } },
      });
      const st = createComponent('label', {
        name: 'st_lbl',
        props: { text: 'Strike' },
        styles: { default: { textDecor: 'strikethrough' } },
      });
      const page = createPage({ name: 'main', components: [ul, st] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles blendMode additive and subtractive', { timeout: 30_000 }, () => {
      const add = createComponent('obj', {
        name: 'blend_add',
        styles: { default: { blendMode: 'additive' } },
      });
      const sub = createComponent('obj', {
        name: 'blend_sub',
        styles: { default: { blendMode: 'subtractive' } },
      });
      const page = createPage({ name: 'main', components: [add, sub] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles textFont builtin montserrat_20', { timeout: 30_000 }, () => {
      const lbl = createComponent('label', {
        name: 'font_lbl',
        props: { text: 'Big Font' },
        styles: { default: { textFont: 'montserrat_20' } },
      });
      const page = createPage({ name: 'main', components: [lbl] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles textLetterSpace and textLineSpace', { timeout: 30_000 }, () => {
      const lbl = createComponent('label', {
        name: 'space_lbl',
        props: { text: 'Spaced text' },
        styles: { default: { textLetterSpace: 3, textLineSpace: 8 } },
      });
      const page = createPage({ name: 'main', components: [lbl] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles four-direction independent padding', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'pad_obj',
        styles: { default: { paddingTop: 10, paddingBottom: 20, paddingLeft: 15, paddingRight: 25 } },
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles pressed/focused/disabled state styles', { timeout: 30_000 }, () => {
      const btn = createComponent('btn', {
        name: 'state_btn',
        props: { text: 'States' },
        styles: {
          default: { bgColor: '#2196F3' },
          pressed: { bgColor: '#1565C0', opacity: 0.9 },
          focused: { bgColor: '#42A5F5', borderColor: '#FFFF00', borderWidth: 2 },
          disabled: { bgColor: '#9E9E9E', opacity: 0.5 },
        },
      });
      const page = createPage({ name: 'main', components: [btn] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles scrollbarMode off, on, active', { timeout: 30_000 }, () => {
      const off = createComponent('obj', {
        name: 'sb_off',
        styles: { default: { scrollbarMode: 'off' } },
      });
      const on = createComponent('obj', {
        name: 'sb_on',
        styles: { default: { scrollbarMode: 'on' } },
      });
      const active = createComponent('obj', {
        name: 'sb_active',
        styles: { default: { scrollbarMode: 'active' } },
      });
      const page = createPage({ name: 'main', components: [off, on, active] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles bgGradDir + bgGradColor + bgGradStop', { timeout: 30_000 }, () => {
      const hor = createComponent('obj', {
        name: 'grad_hor',
        styles: { default: { bgColor: '#FF0000', bgGradDir: 'hor', bgGradColor: '#0000FF', bgGradStop: 200 } },
      });
      const ver = createComponent('obj', {
        name: 'grad_ver',
        styles: { default: { bgColor: '#00FF00', bgGradDir: 'ver', bgGradColor: '#FFFF00', bgGradStop: 128 } },
      });
      const page = createPage({ name: 'main', components: [hor, ver] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles shadow full properties', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'shadow_obj',
        styles: {
          default: {
            shadowWidth: 10,
            shadowColor: '#000000',
            shadowOffsetX: 5,
            shadowOffsetY: 5,
            shadowSpread: 3,
            shadowOpacity: 200,
          },
        },
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // D. Flags coverage
  // ═══════════════════════════════════════════════════════════════════
  describe('Flags coverage', () => {
    it('compiles all flag combinations', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'flagged_obj',
        flags: {
          hidden: true,
          disabled: true,
          clickable: false,
          checkable: true,
          scrollable: false,
          scrollElastic: false,
          scrollMomentum: false,
          scrollOnFocus: false,
          snappable: true,
          pressLock: true,
          eventBubble: true,
          gesturesBubble: true,
        },
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // E. Size modes and alignment
  // ═══════════════════════════════════════════════════════════════════
  describe('Size modes and alignment', () => {
    it('compiles widthMode=percent, heightMode=content', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'pct_content',
        width: 80,
        height: 50,
        widthMode: 'percent',
        heightMode: 'content',
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles widthMode=content, heightMode=percent', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'content_pct',
        width: 100,
        height: 50,
        widthMode: 'content',
        heightMode: 'percent',
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles align center, top_mid, bottom_right with offsets', { timeout: 30_000 }, () => {
      const c = createComponent('label', {
        name: 'align_center',
        props: { text: 'Center' },
        align: 'center',
        alignOffsetX: 10,
        alignOffsetY: -5,
      });
      const tm = createComponent('label', {
        name: 'align_top_mid',
        props: { text: 'Top Mid' },
        align: 'top_mid',
        alignOffsetX: 0,
        alignOffsetY: 20,
      });
      const br = createComponent('label', {
        name: 'align_bottom_right',
        props: { text: 'Bottom Right' },
        align: 'bottom_right',
        alignOffsetX: -10,
        alignOffsetY: -10,
      });
      const page = createPage({ name: 'main', components: [c, tm, br] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // F. Additional events
  // ═══════════════════════════════════════════════════════════════════
  describe('Additional events', () => {
    it('compiles enable/disable actions', { timeout: 30_000 }, () => {
      const target = createComponent('btn', { name: 'target_btn', props: { text: 'Target' } });
      const enableBtn = createComponent('btn', {
        name: 'enable_btn',
        props: { text: 'Enable' },
        events: [
          createEvent({
            eventType: 'LV_EVENT_CLICKED',
            handlerType: 'builtin',
            action: createBuiltinAction({ type: 'enable', targetComponent: 'target_btn' }),
          }),
        ],
      });
      const disableBtn = createComponent('btn', {
        name: 'disable_btn',
        props: { text: 'Disable' },
        events: [
          createEvent({
            eventType: 'LV_EVENT_CLICKED',
            handlerType: 'builtin',
            action: createBuiltinAction({ type: 'disable', targetComponent: 'target_btn' }),
          }),
        ],
      });
      const page = createPage({ name: 'main', components: [target, enableBtn, disableBtn] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles setValue for bar and arc', { timeout: 30_000 }, () => {
      const bar = createComponent('bar', { name: 'ev_bar', props: { min: 0, max: 100, value: 0 } });
      const arc = createComponent('arc', { name: 'ev_arc', props: { min: 0, max: 100, value: 0 } });
      const setBarBtn = createComponent('btn', {
        name: 'set_bar_btn',
        props: { text: 'Set Bar' },
        events: [
          createEvent({
            eventType: 'LV_EVENT_CLICKED',
            handlerType: 'builtin',
            action: createBuiltinAction({ type: 'setValue', targetComponent: 'ev_bar', value: '80' }),
          }),
        ],
      });
      const setArcBtn = createComponent('btn', {
        name: 'set_arc_btn',
        props: { text: 'Set Arc' },
        events: [
          createEvent({
            eventType: 'LV_EVENT_CLICKED',
            handlerType: 'builtin',
            action: createBuiltinAction({ type: 'setValue', targetComponent: 'ev_arc', value: '60' }),
          }),
        ],
      });
      const page = createPage({ name: 'main', components: [bar, arc, setBarBtn, setArcBtn] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // G. Animation properties
  // ═══════════════════════════════════════════════════════════════════
  describe('Animation properties', () => {
    it('compiles animations with y, width, height properties', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'anim_obj',
        animations: [
          createAnimation({ name: 'move_y', property: 'y', startValue: 0, endValue: 100, duration: 800, easing: 'linear' }),
          createAnimation({ name: 'grow_w', property: 'width', startValue: 50, endValue: 200, duration: 600, easing: 'ease_in' }),
          createAnimation({ name: 'grow_h', property: 'height', startValue: 30, endValue: 150, duration: 600, easing: 'ease_out' }),
        ],
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles animations with opa, transform_zoom, transform_angle', { timeout: 30_000 }, () => {
      const obj = createComponent('obj', {
        name: 'anim_obj2',
        animations: [
          createAnimation({ name: 'fade', property: 'opa', startValue: 0, endValue: 255, duration: 500, easing: 'ease_in_out' }),
          createAnimation({ name: 'zoom', property: 'transform_zoom', startValue: 128, endValue: 512, duration: 700, easing: 'overshoot' }),
          createAnimation({ name: 'rotate', property: 'transform_angle', startValue: 0, endValue: 3600, duration: 1000, easing: 'bounce' }),
        ],
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });

    it('compiles all easing types', { timeout: 30_000 }, () => {
      const easings = ['linear', 'ease_in', 'ease_out', 'ease_in_out', 'overshoot', 'bounce'] as const;
      const obj = createComponent('obj', {
        name: 'easing_obj',
        animations: easings.map((e, i) =>
          createAnimation({
            name: `anim_${e}`,
            property: 'x',
            startValue: 0,
            endValue: 100 + i * 10,
            duration: 500 + i * 100,
            easing: e,
          }),
        ),
      });
      const page = createPage({ name: 'main', components: [obj] });
      const code = generateCode([page], defaultOptions());
      const result = compileGenerated(code);
      expect(result.success, `emcc failed:\n${result.stderr}`).toBe(true);
    });
  });
});