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
});