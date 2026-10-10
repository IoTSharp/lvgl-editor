import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { generateCode, getGeneratedFileNames } from '../index';
import type { LispGenOptions } from '../types';
import { lstr, lcolor, symbolBody } from '../sexp';
import {
  createPage, createComponent, createEvent, createBuiltinAction, createAnimation,
  createLogicNode, createLogicPort, createLogicGraph, createLogicConnection, createLogicVariable,
  createImageResource, createFontResource, createTheme,
} from '../../__tests__/helpers';

/** Checks that parentheses/strings are balanced; returns an error message or null. */
function checkSyntax(src: string): string | null {
  let depth = 0;
  let line = 1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\n') line++;
    else if (ch === ';') { while (i < src.length && src[i] !== '\n') i++; line++; }
    else if (ch === '"') {
      i++;
      while (i < src.length && src[i] !== '"') { if (src[i] === '\\') i++; if (src[i] === '\n') line++; i++; }
      if (i >= src.length) return `unterminated string (line ${line})`;
    } else if (ch === '(') depth++;
    else if (ch === ')') { depth--; if (depth < 0) return `extra ')' at line ${line}`; }
  }
  return depth === 0 ? null : `${depth} unclosed '('`;
}

function expectValid(files: object) {
  for (const [name, text] of Object.entries(files) as Array<[string, string]>) {
    expect(checkSyntax(text), name).toBeNull();
  }
}

const exec = (id: string, name = 'Exec') => createLogicPort({ id, name, type: 'execution' });

function sampleProject(opts: Partial<LispGenOptions> = {}) {
  const img = createImageResource({ id: 'img1', name: 'logo', cArrayName: 'img_logo' });
  const font = createFontResource({ cFontName: 'font_roboto' });
  const btn = createComponent('btn', {
    id: 'b1', name: 'start_btn', x: 10, y: 20, width: 120, height: 40,
    props: { text: 'Start "now"', fontResource: 'font_roboto', fontSize: 24 },
    styles: {
      default: { bgColor: '#2196F3', borderRadius: 8, padding: 4, borderSide: 'top_bottom' },
      pressed: { bgColor: '#1976D2' },
    },
    events: [
      createEvent({ id: 'e1', action: createBuiltinAction({ type: 'navigate', targetPage: 'settings' }) }),
      createEvent({ id: 'e2', eventType: 'LV_EVENT_LONG_PRESSED', handlerType: 'custom', customCode: '(print "long")\n;; trailing comment' }),
    ],
    animations: [createAnimation({ id: 'a1', property: 'x', startValue: 0, endValue: 100, easing: 'ease_in_out', repeat: 2 })],
  });
  const label = createComponent('label', { id: 'l1', name: 'status', props: { text: 'Hello\nWorld', longMode: 'wrap' } });
  const slider = createComponent('slider', { id: 's1', name: 'level', props: { min: 0, max: 10, value: 5 } });
  const chart = createComponent('chart', {
    id: 'c1', name: 'plot',
    props: { type: 'line', yAxisMin: 0, yAxisMax: 50, showGrid: false, series: [{ color: '#ff0000', data: [1, 2, 3] }, { data: [3, 2, 1, 0] }] },
  });
  const tabs = createComponent('tabview', { id: 't1', name: 'tabs', props: { tabs: ['A', 'B'], activeTab: 1 }, children: [
    createComponent('label', { id: 'l2', name: 'in_tab', parentId: 't1' }),
  ] });
  const image = createComponent('img', { id: 'i1', name: 'logo_img', props: { src: 'img1' } });
  const back = createComponent('btn', {
    id: 'b2', name: 'back', events: [createEvent({ id: 'e3', action: createBuiltinAction({ type: 'show', targetComponent: 'status' }) }),
      createEvent({ id: 'e4', eventType: 'LV_EVENT_VALUE_CHANGED', action: createBuiltinAction({ type: 'setValue', targetComponent: 'level', value: 7 }) })],
  });
  const pages = [
    createPage({ id: 'p1', name: 'main', backgroundColor: '#101010', components: [btn, label, slider, chart, tabs, image] }),
    createPage({ id: 'p2', name: 'settings', components: [back] }),
  ];

  const trig = createLogicNode('event_trigger', { id: 'n1', params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'start_btn' }, outputs: [exec('n1o')] });
  const cmp = createLogicNode('compare', { id: 'n2', params: { operator: '>' }, inputs: [createLogicPort({ id: 'n2a', name: 'A', type: 'int' }), createLogicPort({ id: 'n2b', name: 'B', type: 'int', defaultValue: 3 })], outputs: [createLogicPort({ id: 'n2o', name: 'Result', type: 'bool' })] });
  const read = createLogicNode('var_read', { id: 'n3', params: { variableName: 'Counter' }, outputs: [createLogicPort({ id: 'n3o', name: 'Value', type: 'int' })] });
  const ifelse = createLogicNode('if_else', { id: 'n4', inputs: [exec('n4i'), createLogicPort({ id: 'n4c', name: 'Condition', type: 'bool' })], outputs: [exec('n4t', 'True'), exec('n4f', 'False')] });
  const hide = createLogicNode('show_hide', { id: 'n5', params: { targetComponent: 'status', action: 'toggle' }, inputs: [exec('n5i')], outputs: [exec('n5o', 'Done')] });
  const write = createLogicNode('var_write', { id: 'n6', params: { variableName: 'Counter' }, inputs: [exec('n6i'), createLogicPort({ id: 'n6v', name: 'Value', type: 'int', defaultValue: 1 })], outputs: [exec('n6o', 'Done')] });
  const timer = createLogicNode('timer_trigger', { id: 'n7', params: { mode: 'repeat', duration: 500 }, outputs: [exec('n7o')] });
  const text = createLogicNode('set_text', { id: 'n8', params: { targetComponent: 'status' }, inputs: [exec('n8i'), createLogicPort({ id: 'n8t', name: 'Text', type: 'string', defaultValue: 'tick' })], outputs: [exec('n8o', 'Done')] });
  const g1 = createLogicGraph({
    id: 'g1', name: 'On Click',
    nodes: [trig, read, cmp, ifelse, hide, write],
    connections: [
      createLogicConnection({ sourceNode: 'n1', sourceOutput: 'n1o', targetNode: 'n4', targetInput: 'n4i' }),
      createLogicConnection({ sourceNode: 'n3', sourceOutput: 'n3o', targetNode: 'n2', targetInput: 'n2a', type: 'data' }),
      createLogicConnection({ sourceNode: 'n2', sourceOutput: 'n2o', targetNode: 'n4', targetInput: 'n4c', type: 'data' }),
      createLogicConnection({ sourceNode: 'n4', sourceOutput: 'n4t', targetNode: 'n5', targetInput: 'n5i' }),
      createLogicConnection({ sourceNode: 'n4', sourceOutput: 'n4f', targetNode: 'n6', targetInput: 'n6i' }),
    ],
    variables: [createLogicVariable({ name: 'Counter', type: 'int', defaultValue: 2 })],
  });
  const g2 = createLogicGraph({ id: 'g2', name: 'Blink', nodes: [timer, text], connections: [createLogicConnection({ sourceNode: 'n7', sourceOutput: 'n7o', targetNode: 'n8', targetInput: 'n8i' })] });
  return generateCode(pages, opts, [g1, g2], undefined, [img], [font], 'font_roboto', 16);
}

describe('helpers', () => {
  it('quotes strings', () => {
    expect(lstr('a"b\\c\nd')).toBe('"a\\"b\\\\c\\nd"');
  });
  it('converts colors', () => {
    expect(lcolor('#2196f3')).toBe('0x2196F3');
    expect(lcolor('#fff')).toBe('0xFFFFFF');
    expect(lcolor('nope')).toBe('0x000000');
  });
  it('builds symbols in both styles', () => {
    expect(symbolBody('MyButton_ec0e', { namingStyle: 'kebab-case' })).toBe('my-button-ec0e');
    expect(symbolBody('MyButton 1', { namingStyle: 'snake_case' })).toBe('my_button_1');
    expect(symbolBody('1st', { namingStyle: 'kebab-case' })).toBe('n-1st');
  });
});

describe('project layout', () => {
  it('produces main.lisp plus the ui/ folder', () => {
    expect(getGeneratedFileNames()).toEqual(['main.lisp', 'ui/ui.lisp', 'ui/ui_events.lisp', 'ui/ui_logic.lisp']);
    expect(Object.keys(generateCode([]))).toEqual(getGeneratedFileNames());
  });

  it('every file is balanced Lisp (empty and full project)', () => {
    expectValid(generateCode([]));
    expectValid(generateCode([createPage({ name: 'main' })]));
    expectValid(sampleProject());
    expectValid(sampleProject({ namingStyle: 'snake_case', generateComments: false, userCodeMarkers: false }));
  });

  it('dumps the sample project when LISP_DUMP is set', () => {
    const out = process.env.LISP_DUMP;
    if (!out) return;
    const files = sampleProject();
    for (const [k, v] of Object.entries(files)) writeFileSync(`${out}/${k.replace('/', '__')}`, v);
  });
});

describe('main.lisp', () => {
  const main = sampleProject()['main.lisp'];
  it('imports and evaluates the ui files', () => {
    for (const f of ['ui.lisp', 'ui_events.lisp', 'ui_logic.lisp']) expect(main).toContain(`(import "ui/${f}"`);
    expect(main).toContain('(read-eval-program ui-code)');
    expect(main).toContain('(ui-init)');
    expect(main).toContain('(ui-logic-init)');
    expect(main).toContain('(ui-run)');
  });
  it('imports used images and fonts as .bin resources', () => {
    expect(main).toContain(`(import "assets/img_logo.bin" 'ui-img-img-logo)`);
    expect(main).toContain(`(import "font/font_roboto_24.bin" 'ui-fontdata-font-roboto-24)`);
    expect(main).toContain(`(import "font/font_roboto_16.bin" 'ui-fontdata-font-roboto-16)`);
  });
});

describe('ui/ui.lisp', () => {
  const ui = sampleProject()['ui/ui.lisp'];
  it('creates screens and widgets through the bridge', () => {
    expect(ui).toContain('(def ui-screen-main (lv-obj-create nil))');
    expect(ui).toContain('(lv-obj-set-style-bg-color ui-screen-main 0x101010 LV_PART_MAIN)');
    expect(ui).toContain('(def ui-start-btn (lv-button-create ui-screen-main))');
    expect(ui).toContain('(lv-obj-set-pos ui-start-btn 10 20)');
    expect(ui).toContain('(lv-obj-set-size ui-start-btn 120 40)');
    expect(ui).toContain('(lv-label-set-text ui-start-btn-label "Start \\"now\\"")');
    expect(ui).toContain('(lv-label-set-text ui-status "Hello\\nWorld")');
  });
  it('applies state styles with the right selector', () => {
    expect(ui).toContain('(lv-obj-set-style-bg-color ui-start-btn 0x1976D2 LV_STATE_PRESSED)');
    expect(ui).toContain('(bitwise-or LV_BORDER_SIDE_TOP LV_BORDER_SIDE_BOTTOM)');
    expect(ui).toContain('(lv-obj-set-style-pad-left ui-start-btn 4 LV_PART_MAIN)');
  });
  it('registers event handlers by symbol', () => {
    expect(ui).toContain("(lv-obj-add-event-cb ui-start-btn 'ui-event-start-btn-clicked LV_EVENT_CLICKED)");
    expect(ui).toContain("'ui-event-start-btn-long-pressed LV_EVENT_LONG_PRESSED)");
  });
  it('handles tabs, charts, images and fonts', () => {
    expect(ui).toContain('(def ui-tabs-tab-0 (lv-tabview-add-tab ui-tabs "A"))');
    expect(ui).toContain('(def ui-in-tab (lv-label-create ui-tabs-tab-1))');
    expect(ui).toContain('(lv-chart-set-point-count ui-plot 4)');
    expect(ui).toContain('(lv-chart-set-series-values ui-plot ui-plot-ser-0 (list 1 2 3))');
    expect(ui).toContain('(lv-chart-set-div-line-count ui-plot 0 0)');
    expect(ui).toContain('(lv-image-set-vesc ui-logo-img ui-img-img-logo)');
    expect(ui).toContain('(def ui-font-font-roboto-24 (lv-font-load ui-fontdata-font-roboto-24))');
    expect(ui).toContain('(lv-obj-set-style-text-font ui-start-btn-label ui-font-font-roboto-24 LV_PART_MAIN)');
  });
  it('emits the animation runtime and starts animations', () => {
    expect(ui).toContain('(defun ui-anim-step ()');
    expect(ui).toContain("(ui-anim-add ui-start-btn 'x 0 100 500 0 'ease-in-out 2)");
  });
  it('defines screen loaders and ui-init', () => {
    expect(ui).toContain('(defun ui-load-screen-settings ()');
    expect(ui).toMatch(/\(defun ui-init \(\)[\s\S]*\(ui-init-screen-main\)[\s\S]*\(ui-load-screen-main\)/);
  });
  it('does not emit the runtime when there are no animations', () => {
    const files = generateCode([createPage({ components: [createComponent('btn')] })]);
    expect(files['ui/ui.lisp']).toContain('(defun ui-anim-step () nil)');
    expect(files['ui/ui.lisp']).not.toContain('ui-anim-add');
  });
  it('honours the snake_case style', () => {
    const ui2 = sampleProject({ namingStyle: 'snake_case' })['ui/ui.lisp'];
    expect(ui2).toContain('(def ui_start_btn (lv-button-create ui_screen_main))');
  });
  it('gives colliding names on different pages unique variables', () => {
    const files = generateCode([
      createPage({ name: 'a', components: [createComponent('label', { id: 'x1', name: 'title' })] }),
      createPage({ name: 'b', components: [createComponent('label', { id: 'x2', name: 'title' })] }),
    ]);
    expect(files['ui/ui.lisp']).toContain('(def ui-title (lv-label-create');
    expect(files['ui/ui.lisp']).toContain('(def ui-b-title (lv-label-create');
  });
});

describe('arcs and spinners', () => {
  it('use arc styles instead of a box border', () => {
    const arc = createComponent('arc', {
      name: 'dial',
      props: { arcWidth: 14, arcColor: '#ff0000', arcTrackColor: '#222222' },
      // legacy projects stored the arc in the border style: it must not become a box border
      styles: { default: { borderWidth: 15, borderColor: '#2196F3' } },
    });
    const ui = generateCode([createPage({ components: [arc] })])['ui/ui.lisp'];
    expect(ui).toContain('(lv-obj-set-style-border-width ui-dial 0 LV_PART_MAIN)');
    expect(ui).not.toContain('border-width ui-dial 15');
    expect(ui).toContain('(lv-obj-set-style-arc-width ui-dial 14 LV_PART_INDICATOR)');
    expect(ui).toContain('(lv-obj-set-style-arc-color ui-dial 0xFF0000 LV_PART_INDICATOR)');
    expect(ui).toContain('(lv-obj-set-style-arc-color ui-dial 0x222222 LV_PART_MAIN)');
  });
});

describe('ui/ui_events.lisp', () => {
  const ev = sampleProject()['ui/ui_events.lisp'];
  it('builds navigation, visibility and value actions', () => {
    expect(ev).toContain('(defun ui-event-start-btn-clicked (e)');
    expect(ev).toContain('(ui-load-screen-settings)');
    expect(ev).toContain('(lv-obj-remove-flag ui-status LV_OBJ_FLAG_HIDDEN)');
    expect(ev).toContain('(lv-slider-set-value ui-level 7 LV_ANIM_ON)');
  });
  it('inlines custom Lisp code', () => {
    expect(ev).toContain('(print "long")');
  });
});

describe('ui/ui_logic.lisp', () => {
  const logic = sampleProject()['ui/ui_logic.lisp'];
  it('declares variables and functions', () => {
    expect(logic).toContain('(def var-counter 2)');
    expect(logic).toContain('(defun logic-on-click ()');
    expect(logic).toContain('(defun logic-blink ()');
  });
  it('turns if/else into (if ...) with inlined expressions', () => {
    expect(logic).toContain('(if (> var-counter 3)');
    expect(logic).toContain('(setq var-counter 1)');
    expect(logic).toMatch(/\(if \(lv-obj-has-flag ui-status LV_OBJ_FLAG_HIDDEN\)/);
  });
  it('registers triggers and ticks timers', () => {
    expect(logic).toContain("(lv-obj-add-event-cb ui-start-btn 'logic-on-click-on-event LV_EVENT_CLICKED)");
    expect(logic).toContain('(def logic-blink-timer0 (systime))');
    expect(logic).toContain('(if (>= (secs-since logic-blink-timer0) 0.5)');
    expect(logic).toContain('(lv-label-set-text ui-status "tick")');
  });
  it('generates valid empty logic', () => {
    const empty = generateCode([])['ui/ui_logic.lisp'];
    expect(empty).toContain('(defun ui-logic-init ()');
    expect(empty).toContain('(defun ui-logic-tick ()');
  });
});

describe('theme', () => {
  it('calls lv-theme-set with the project theme', () => {
    const out = generateCode([createPage()], undefined, [], createTheme({ id: 'dark', colors: { primary: '#90CAF9', secondary: '#4FC3F7', background: '#121212', surface: '#1e1e1e', text: '#e0e0e0', border: '#333333' } }), [], [], '', 14)
    expect(out['ui/ui.lisp']).toContain('(lv-theme-set 0x90CAF9 0x4FC3F7 t)')
  })
})

describe('icon recolor', () => {
  it('paints library icons with the theme text color', () => {
    const img = createImageResource({ id: 'i1', name: 'icon_home', originalName: 'icon_home.png' })
    const c = createComponent('img' as never, { id: 'a', name: 'ico', props: { src: 'i1' } } as never)
    const out = generateCode([createPage({ components: [c] } as never)], undefined, [], createTheme({ id: 'dark', colors: { primary: '#90CAF9', secondary: '#4FC3F7', background: '#121212', surface: '#1e1e1e', text: '#E0E0E0', border: '#333333' } }), [img], [], '', 14)
    expect(out['ui/ui.lisp']).toContain('(lv-obj-set-style-image-recolor ui-ico 0xE0E0E0 LV_PART_MAIN)')
  })
})

describe('screen element values in logic', () => {
  it('reads a slider id-bound value and writes a checkbox state', () => {
    const slider = createComponent('slider', { id: 'sl-1', name: 'level' })
    const check = createComponent('checkbox', { id: 'cb-1', name: 'agree' })
    const pages = [createPage({ id: 'p1', name: 'main', components: [slider, check] })]
    const trig = createLogicNode('event_trigger', { id: 't', params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'agree' }, outputs: [createLogicPort({ id: 'to', name: 'Exec', type: 'execution' })] })
    const get = createLogicNode('get_property', { id: 'g', params: { targetComponent: 'sl-1', property: 'value' }, outputs: [createLogicPort({ id: 'go', name: 'Value', type: 'any' })] })
    const set = createLogicNode('set_property', {
      id: 's', params: { targetComponent: 'cb-1', property: 'checked', value: 1 },
      inputs: [createLogicPort({ id: 'si', name: 'Exec', type: 'execution' }), createLogicPort({ id: 'sv', name: 'Value', type: 'any' })],
      outputs: [createLogicPort({ id: 'so', name: 'Done', type: 'execution' })],
    })
    const g = createLogicGraph({
      id: 'g1', name: 'elements', nodes: [trig, get, set],
      connections: [
        createLogicConnection({ sourceNode: 't', sourceOutput: 'to', targetNode: 's', targetInput: 'si' }),
        createLogicConnection({ sourceNode: 'g', sourceOutput: 'go', targetNode: 's', targetInput: 'sv', type: 'data' }),
      ],
    })
    const out = generateCode(pages, undefined, [g], undefined, [], [], '', 14)
    const src = out['ui/ui_logic.lisp']
    expect(src).toContain('(lv-slider-get-value ui-level)')
    expect(src).toContain('(lv-obj-add-state ui-agree LV_STATE_CHECKED)')
  })
})

describe('built-in font sizes', () => {
  it('uses the nearest built-in Montserrat size for a label font size', () => {
    const a = createComponent('label', { id: 'a', name: 'big', props: { text: 'x', fontSize: 48 } })
    const b = createComponent('label', { id: 'b', name: 'small', props: { text: 'y', fontSize: 14 } })
    const c = createComponent('label', { id: 'c', name: 'odd', props: { text: 'z', fontSize: 28 } })
    const out = generateCode([createPage({ components: [a, b, c] } as never)], undefined, [], undefined, [], [], '', 14)['ui/ui.lisp']
    expect(out).toContain('(lv-obj-set-style-text-font ui-big font-montserrat-48 LV_PART_MAIN)')
    expect(out).not.toContain('ui-small font-montserrat')
    expect(out).toContain('(lv-obj-set-style-text-font ui-odd font-montserrat-24 LV_PART_MAIN)')
  })
})

describe('led', () => {
  it('creates an LVGL led with color, state and brightness', () => {
    const a = createComponent('led', { id: 'a', name: 'ok_led', props: { color: '#27AE60', checked: true, brightness: 255 } })
    const b = createComponent('led', { id: 'b', name: 'off_led', props: { color: '', checked: false } })
    const c = createComponent('led', { id: 'c', name: 'dim_led', props: { checked: true, brightness: 120 } })
    const out = generateCode([createPage({ components: [a, b, c] } as never)], undefined, [], undefined, [], [], '', 14)['ui/ui.lisp']
    expect(out).toContain('(lv-led-create ui-screen-main)')
    expect(out).toContain('(lv-led-set-color ui-ok-led 0x27AE60)')
    expect(out).toContain('(lv-led-on ui-ok-led)')
    expect(out).toContain('(lv-led-off ui-off-led)')
    expect(out).toContain('(lv-led-set-brightness ui-dim-led 120)')
  })
})

describe('extra widgets', () => {
  it('generates roller, spinbox, keyboard, list, msgbox and scale (with needle)', () => {
    const ta = createComponent('textarea', { id: 'ta', name: 'input' })
    const comps = [
      createComponent('roller', { id: 'r', name: 'pick', props: { options: ['A', 'B', 'C'], selected: 2, visibleRows: 4, mode: 'infinite' } }),
      createComponent('spinbox', { id: 's', name: 'count', props: { value: 5, min: 0, max: 20, step: 5, digitCount: 3, decimalPos: 1, rollover: true } }),
      ta,
      createComponent('keyboard', { id: 'k', name: 'kb', props: { mode: 'number', textarea: 'input' } }),
      createComponent('list', { id: 'l', name: 'menu', props: { items: ['One', 'Two'] } }),
      createComponent('msgbox', { id: 'm', name: 'dlg', props: { title: 'T', text: 'Body', buttons: ['OK'], showClose: true } }),
      createComponent('scale', { id: 'c', name: 'gauge', props: { mode: 'round_inner', min: 0, max: 200, totalTicks: 21, majorEvery: 5, showLabels: true, angleRange: 240, rotation: 150, needle: true, needleValue: 80, needleLength: 70, needleWidth: 4, needleColor: '#ff0000' } }),
    ]
    const src = generateCode([createPage({ components: comps } as never)], undefined, [], undefined, [], [], '', 14)['ui/ui.lisp']
    expect(src).toContain('(lv-roller-set-options ui-pick "A\\nB\\nC" LV_ROLLER_MODE_INFINITE)')
    expect(src).toContain('(lv-roller-set-visible-row-count ui-pick 4)')
    expect(src).toContain('(lv-roller-set-selected ui-pick 2 LV_ANIM_OFF)')
    expect(src).toContain('(lv-spinbox-set-digit-format ui-count 3 1)')
    expect(src).toContain('(lv-spinbox-set-step ui-count 5)')
    expect(src).toContain('(lv-spinbox-set-rollover ui-count t)')
    expect(src).toContain('(lv-keyboard-set-mode ui-kb LV_KEYBOARD_MODE_NUMBER)')
    expect(src).toContain('(lv-keyboard-set-textarea ui-kb ui-input)')
    expect(src).toContain('(lv-list-add-button ui-menu nil "One")')
    expect(src).toContain('(lv-msgbox-add-footer-button ui-dlg "OK")')
    expect(src).toContain('(lv-msgbox-add-close-button ui-dlg)')
    expect(src).toContain('(lv-scale-set-mode ui-gauge LV_SCALE_MODE_ROUND_INNER)')
    expect(src).toContain('(lv-scale-set-angle-range ui-gauge 240)')
    expect(src).toContain('(lv-scale-set-line-needle-value ui-gauge ui-gauge-needle 70 80)')
  })

  it('logic reads and writes roller / spinbox / scale', () => {
    const roller = createComponent('roller', { id: 'r', name: 'pick' })
    const sb = createComponent('spinbox', { id: 's', name: 'count' })
    const sc = createComponent('scale', { id: 'c', name: 'gauge', props: { needle: true, needleLength: 55 } })
    const pages = [createPage({ components: [roller, sb, sc] } as never)]
    const get = createLogicNode('get_property', { id: 'g', params: { targetComponent: 'r', property: 'value' }, outputs: [createLogicPort({ id: 'go', name: 'Value', type: 'any' })] })
    const set = createLogicNode('set_value', { id: 'v', params: { targetComponent: 'c' }, inputs: [createLogicPort({ id: 'vi', name: 'Exec', type: 'execution' }), createLogicPort({ id: 'vn', name: 'Number', type: 'int', defaultValue: 0 })], outputs: [createLogicPort({ id: 'vo', name: 'Done', type: 'execution' })] })
    const g = createLogicGraph({ id: 'g1', name: 'gauge', nodes: [get, set], connections: [createLogicConnection({ sourceNode: 'g', sourceOutput: 'go', targetNode: 'v', targetInput: 'vn', type: 'data' })] })
    const src = generateCode(pages, undefined, [g], undefined, [], [], '', 14)['ui/ui_logic.lisp']
    expect(src).toContain('(lv-scale-set-line-needle-value ui-gauge ui-gauge-needle 55 (lv-roller-get-selected ui-pick))')
  })

  it('emits advanced common styles', () => {
    const c = createComponent('obj', { id: 'o', name: 'box', styles: { default: { minWidth: 50, marginTop: 4, padRow: 3, translateX: 7, skewX: 2, bgOpa: 128, clipCorner: true, transformWidth: 6, bgMainStop: 40, borderPost: true, blurRadius: 5 } } as never })
    const pages = [createPage({ components: [c] } as never)]
    const src = generateCode(pages, undefined, [], undefined, [], [], '', 14)['ui/ui.lisp']
    expect(src).toContain('(lv-obj-set-style-min-width ui-box 50 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-margin-top ui-box 4 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-pad-row ui-box 3 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-translate-x ui-box 7 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-transform-skew-x ui-box 20 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-bg-opa ui-box 128 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-transform-width ui-box 6 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-bg-main-stop ui-box 40 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-blur-radius ui-box 5 LV_PART_MAIN)')
    expect(src).toContain('(lv-obj-set-style-border-post ui-box t LV_PART_MAIN)')
  })

  it('emits per-widget extra properties', () => {
    const mk = (type: string, name: string, props: Record<string, unknown>) => createComponent(type, { id: name, name, props } as never)
    const pages = [createPage({ components: [
      mk('slider', 's', { mode: 'range', startValue: 20, value: 70 }),
      mk('bar', 'b', { mode: 'symmetrical', min: -50, max: 50, value: 10 }),
      mk('arc', 'a', { rotation: 90, changeRate: 300, rounded: false }),
      mk('img', 'i', { innerAlign: 'cover', scaleX: 128, scaleY: 512, pivotX: 5, pivotY: 6 }),
      mk('line', 'l', { points: [[0, 0], [10, 10], [20, 0]], yInvert: true, rounded: false, dashWidth: 6, dashGap: 3 }),
      mk('label', 't', { text: 'x', longMode: 'scroll_circular', recolor: true }),
      mk('switch', 'w', { orientation: 'vertical' }),
      mk('textarea', 'x', { password: true, passwordShowTime: 500 }),
      mk('chart', 'c', { type: 'stacked', updateMode: 'circular', horDivs: 4, verDivs: 2, y2AxisMin: 0, y2AxisMax: 500, pointCount: 20, series: [{ data: [1, 2], color: '#112233', axis: 'secondary' }] }),
    ] } as never)]
    const src = generateCode(pages, undefined, [], undefined, [], [], '', 14)['ui/ui.lisp']
    for (const frag of [
      '(lv-slider-set-mode ui-s LV_SLIDER_MODE_RANGE)', '(lv-slider-set-start-value ui-s 20 LV_ANIM_OFF)',
      '(lv-bar-set-mode ui-b LV_BAR_MODE_SYMMETRICAL)',
      '(lv-arc-set-rotation ui-a 90)', '(lv-arc-set-change-rate ui-a 300)', '(lv-obj-set-style-arc-rounded ui-a nil LV_PART_MAIN)',
      'LV_IMAGE_ALIGN_COVER', '(lv-image-set-scale-x ui-i 128)', '(lv-image-set-scale-y ui-i 512)', '(lv-image-set-pivot ui-i 5 6)',
      '(lv-line-set-y-invert ui-l t)', '(lv-obj-set-style-line-rounded ui-l nil LV_PART_MAIN)', '(lv-obj-set-style-line-dash-width ui-l 6 LV_PART_MAIN)',
      '(lv-label-set-long-mode ui-t LV_LABEL_LONG_MODE_SCROLL_CIRCULAR)', '(lv-label-set-recolor ui-t t)',
      '(lv-switch-set-orientation ui-w LV_SWITCH_ORIENTATION_VERTICAL)', '(lv-textarea-set-password-show-time ui-x 500)',
      'LV_CHART_TYPE_STACKED', '(lv-chart-set-update-mode ui-c LV_CHART_UPDATE_MODE_CIRCULAR)', '(lv-chart-set-div-line-count ui-c 4 2)',
      '(lv-chart-set-axis-range ui-c LV_CHART_AXIS_SECONDARY_Y 0 500)', 'LV_CHART_AXIS_SECONDARY_Y))', '(lv-chart-set-point-count ui-c 20)',
    ]) expect(src, frag).toContain(frag)
  })

  it('emits states, flags, parts, new events and animated navigation', () => {
    const target = createComponent('obj', { id: 't', name: 'panel' } as never)
    const sl = createComponent('slider', {
      id: 's', name: 'vol',
      styles: { default: {}, knob: { bgColor: '#FF0000' }, 'knob:pressed': { bgColor: '#00FF00' }, checked: { bgColor: '#0000FF' } },
      flags: { floating: true, ignoreLayout: true, scrollChainHor: true },
      events: [
        createEvent({ id: 'a', eventType: 'LV_EVENT_DOUBLE_CLICKED', action: createBuiltinAction({ type: 'setState', targetComponent: 'panel', property: 'checked', value: 'toggle' }) }),
        createEvent({ id: 'b', eventType: 'LV_EVENT_SCREEN_LOADED', action: createBuiltinAction({ type: 'setFlag', targetComponent: 'panel', property: 'hidden', value: 'toggle' }) }),
        createEvent({ id: 'c', action: createBuiltinAction({ type: 'navigate', targetPage: 'two', animation: 'move_left', duration: 250 }) }),
      ],
    } as never)
    const pages = [createPage({ name: 'one', components: [target, sl] } as never), createPage({ name: 'two', components: [] } as never)]
    const files = generateCode(pages, undefined, [], undefined, [], [], '', 14)
    const ui = files['ui/ui.lisp']
    const ev = files['ui/ui_events.lisp']
    expect(ui).toContain('LV_PART_KNOB)')
    expect(ui).toContain('(bitwise-or LV_PART_KNOB LV_STATE_PRESSED)')
    expect(ui).toContain('LV_STATE_CHECKED)')
    expect(ui).toContain('(lv-obj-add-flag ui-vol LV_OBJ_FLAG_FLOATING)')
    expect(ui).toContain('(lv-obj-add-flag ui-vol LV_OBJ_FLAG_IGNORE_LAYOUT)')
    expect(ui).toContain('LV_EVENT_DOUBLE_CLICKED)')
    expect(ui).toMatch(/\(lv-obj-add-event-cb ui-screen-one '\S+ LV_EVENT_SCREEN_LOADED\)/)
    expect(ev).toContain('(lv-obj-set-state ui-panel LV_STATE_CHECKED (not (lv-obj-has-state ui-panel LV_STATE_CHECKED)))')
    expect(ev).toContain('(if (lv-obj-has-flag ui-panel LV_OBJ_FLAG_HIDDEN)')
    expect(ev).toContain('-anim LV_SCREEN_LOAD_ANIM_MOVE_LEFT 250)')
    expect(ui).toContain('-anim (anim ms)')
    expectValid(files)
  })

  it('generates the new logic nodes', () => {
    const lbl = createComponent('label', { id: 'l', name: 'out' } as never)
    const pages = [createPage({ components: [lbl] } as never)]
    const port = (id: string, name: string, type: string, def?: unknown) => createLogicPort({ id, name, type, defaultValue: def } as never)
    const mapN = createLogicNode('map_range', { id: 'm', inputs: [port('a', 'Value', 'float', 5), port('b', 'In min', 'float', 0), port('c', 'In max', 'float', 10), port('d', 'Out min', 'float', 0), port('e', 'Out max', 'float', 100)], outputs: [port('mo', 'Result', 'float')] })
    const str = createLogicNode('to_string', { id: 's', params: { format: '%.1f' }, inputs: [port('sv', 'Value', 'float')], outputs: [port('so', 'Result', 'string')] })
    const setT = createLogicNode('set_text', { id: 't', params: { targetComponent: 'l' }, inputs: [exec('ti'), port('tt', 'Text', 'string')], outputs: [exec('to', 'Done')] })
    const loop = createLogicNode('for_loop', { id: 'f', params: { count: 3 }, inputs: [exec('fi'), port('fc', 'Count', 'int', 3)], outputs: [port('fb', 'Body', 'execution'), port('fd', 'Done', 'execution'), port('fx', 'Index', 'int')] })
    const trig = createLogicNode('timer_trigger', { id: 'g', outputs: [exec('go')] })
    const conn = (a: string, ao: string, b: string, bi: string, type = 'data') => createLogicConnection({ sourceNode: a, sourceOutput: ao, targetNode: b, targetInput: bi, type } as never)
    const g = createLogicGraph({ id: 'g1', name: 'calc', nodes: [trig, loop, mapN, str, setT], connections: [
      conn('g', 'go', 'f', 'fi', 'execution'), conn('f', 'fb', 't', 'ti', 'execution'),
      conn('m', 'mo', 's', 'sv'), conn('s', 'so', 't', 'tt'),
    ] })
    const src = generateCode(pages, undefined, [g], undefined, [], [], '', 14)['ui/ui_logic.lisp']
    expect(src).toContain('(looprange loop-i 0 3')
    expect(src).toContain('(str-from-n')
    expect(src).toContain('"%.1f"')
    expect(src).toContain('(if (= 10.0 0.0) 1 (- 10.0 0.0))')
    expectValid({ 'ui_logic.lisp': src })
  })

  it('generates bindings of components to variables', () => {
    const lbl = createComponent('label', { id: 'l', name: 'speed', bindings: [{ id: 'b1', kind: 'text', variable: 'kmh', format: '%d km/h' }, { id: 'b2', kind: 'hidden', variable: 'kmh', op: '<', compare: 1 }] } as never)
    const bar = createComponent('bar', { id: 'b', name: 'level', bindings: [{ id: 'b3', kind: 'value', variable: 'kmh' }] } as never)
    const pages = [createPage({ components: [lbl, bar] } as never)]
    const g = createLogicGraph({ id: 'g1', name: 'x', nodes: [], connections: [], variables: [createLogicVariable({ id: 'v1', name: 'kmh', type: 'int', defaultValue: 5 } as never)] } as never)
    const src = generateCode(pages, undefined, [g], undefined, [], [], '', 14)['ui/ui_logic.lisp']
    expect(src).toContain("(def ui-bind-0 'unset)")
    expect(src).toContain('(defun ui-bindings-update ()')
    expect(src).toContain('(lv-label-set-text ui-speed (str-from-n bv "%d km/h"))')
    expect(src).toContain('(lv-obj-add-flag ui-speed LV_OBJ_FLAG_HIDDEN)')
    expect(src).toContain('(lv-bar-set-value ui-level bv LV_ANIM_ON)')
    expect(src).toContain('(ui-bindings-update)')
    expectValid({ 'ui_logic.lisp': src })
  })

  it('emits calendar header / shown month and table cell merge', () => {
    const cal = createComponent('calendar', { id: 'c', name: 'cal', props: { year: 2026, month: 3, showToday: true, todayDay: 15, headerMode: 'arrow' } } as never)
    const tbl = createComponent('table', { id: 't', name: 'grid', props: { rows: 2, cols: 3, mergeRight: ['0,0', ' 1 , 1 '], textCrop: true } } as never)
    const src = generateCode([createPage({ components: [cal, tbl] } as never)], undefined, [], undefined, [], [], '', 14)['ui/ui.lisp']
    expect(src).toContain('(lv-calendar-set-today-date ui-cal 2026 3 15)')
    expect(src).toContain('(lv-calendar-set-month-shown ui-cal 2026 3)')
    expect(src).toContain('(lv-calendar-add-header-arrow ui-cal)')
    expect(src).toContain('(lv-table-set-cell-ctrl ui-grid 0 0 LV_TABLE_CELL_CTRL_MERGE_RIGHT)')
    expect(src).toContain('(lv-table-set-cell-ctrl ui-grid 1 1 LV_TABLE_CELL_CTRL_MERGE_RIGHT)')
    expect(src).toContain('(lv-table-set-cell-ctrl ui-grid 1 2 LV_TABLE_CELL_CTRL_TEXT_CROP)')
  })
})
