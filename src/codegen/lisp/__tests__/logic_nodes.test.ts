import { it, expect } from 'vitest'
import { generateCode } from '../index'
import { createComponent, createPage, createAnimation, createLogicNode, createLogicPort, createLogicGraph, createLogicConnection, createLogicVariable } from '../../__tests__/helpers'

const ex = (id: string, name = 'Exec') => createLogicPort({ id, name, type: 'execution' })
const val = (id: string, name: string, type = 'any', d?: unknown) => createLogicPort({ id, name, type, defaultValue: d } as never)
const conn = (a: string, ao: string, b: string, bi: string, type?: string) => createLogicConnection({ sourceNode: a, sourceOutput: ao, targetNode: b, targetInput: bi, ...(type ? { type } : {}) } as never)

it('every logic node type generates the expected Lisp', () => {
  const pages = [createPage({ id: 'p1', name: 'main', components: [createComponent('slider', { id: 's1', name: 'lvl' }), createComponent('label', { id: 'l1', name: 'txt' }), createComponent('bar', { id: 'b1', name: 'prog' })] }), createPage({ id: 'p2', name: 'second', components: [] })]
  const nodes = [
    createLogicNode('timer_trigger', { id: 'tm', params: { mode: 'repeat', duration: 500 }, outputs: [ex('tmo')] }),
    createLogicNode('switch', { id: 'sw', params: { cases: [0, 1] }, inputs: [ex('swi'), val('swv', 'Value', 'int', 1)], outputs: [ex('swc0', 'Case 0'), ex('swc1', 'Case 1'), ex('swd', 'Default')] }),
    createLogicNode('set_value', { id: 'sv', params: { targetComponent: 'b1', componentType: 'bar' }, inputs: [ex('svi'), val('svn', 'Number', 'int', 50)], outputs: [ex('svo', 'Done')] }),
    createLogicNode('navigate_page', { id: 'nv', params: { targetPage: 'second', animation: 'fade' }, inputs: [ex('nvi')], outputs: [ex('nvo', 'Done')] }),
    createLogicNode('delay', { id: 'dl', params: { duration: 250 }, inputs: [ex('dli')], outputs: [ex('dlo', 'Done')] }),
    createLogicNode('call_function', { id: 'cf', params: { functionName: 'my-fn', arguments: [1, 2] }, inputs: [ex('cfi')], outputs: [ex('cfo', 'Done')] }),
    createLogicNode('math_op', { id: 'mt', params: { operator: '+' }, inputs: [val('mta', 'A', 'int', 1), val('mtb', 'B', 'int', 2)], outputs: [val('mto', 'Result', 'int')] }),
    createLogicNode('string_op', { id: 'st', params: { operation: 'concat' }, inputs: [val('sta', 'A', 'string', 'a'), val('stb', 'B', 'string', 'b')], outputs: [val('sto', 'Result', 'string')] }),
    createLogicNode('logic_op', { id: 'lo', params: { operator: 'OR' }, inputs: [val('loa', 'A', 'bool', true), val('lob', 'B', 'bool', false)], outputs: [val('loo', 'Result', 'bool')] }),
    createLogicNode('set_text', { id: 'tx', params: { targetComponent: 'l1' }, inputs: [ex('txi'), val('txt', 'Text', 'string')], outputs: [ex('txo', 'Done')] }),
    createLogicNode('c_code_block', { id: 'cc', params: { code: '(print "hi")' }, inputs: [ex('cci')], outputs: [ex('cco', 'Done')] }),
  ]
  const g = createLogicGraph({ id: 'g', name: 'all', nodes, variables: [createLogicVariable({ name: 'n', type: 'int', defaultValue: 0 })], connections: [
    conn('tm', 'tmo', 'sw', 'swi'),
    conn('sw', 'swc0', 'sv', 'svi'),
    conn('sw', 'swc1', 'nv', 'nvi'),
    conn('sv', 'svo', 'dl', 'dli'),
    conn('dl', 'dlo', 'cf', 'cfi'),
    conn('cf', 'cfo', 'tx', 'txi'),
    conn('mt', 'mto', 'sv', 'svn', 'data'),
    conn('st', 'sto', 'tx', 'txt', 'data'),
    conn('tx', 'txo', 'cc', 'cci'),
  ] })
  const out = generateCode(pages, undefined, [g], undefined, [], [], '', 14)
  const src = out['ui/ui_logic.lisp']
  // timer trigger -> periodic call from the main loop
  expect(src).toContain('(secs-since logic-all-timer0) 0.5')
  // switch -> cond over the wired value with the case bodies
  expect(src).toContain('((= 1 0)')
  expect(src).toContain('((= 1 1)')
  // set_value (bar) takes the wired math result
  expect(src).toContain('(lv-bar-set-value ui-prog (+ 1 2) LV_ANIM_ON)')
  // navigate, delay, call_function, set_text with string_op, custom code
  expect(src).toContain('(lv-screen-load-anim ui-screen-second LV_SCREEN_LOAD_ANIM_FADE_IN 300 0 nil)')
  // delay never blocks: everything after it is deferred
  expect(src).not.toContain('(sleep')
  expect(src).toContain('(ui-defer 0.25 (lambda ()')
  expect(src.indexOf('(ui-defer 0.25')).toBeLessThan(src.indexOf('(my-fn 1 2)'))
  expect(src).toContain('(my-fn 1 2)')
  expect(src).toContain('(lv-label-set-text ui-txt (str-merge "a" "b"))')
  expect(src).toContain('(print "hi")')
  expect(src).toContain('(defun ui-defer-tick ()')
  expect(src).toContain('(ui-defer-tick)')
  // parentheses balance
  let d = 0, str = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (str) { if (c === '\\') i++; else if (c === '"') str = false; continue }
    if (c === '"') str = true
    else if (c === ';') while (i < src.length && src[i] !== '\n') i++
    else if (c === '(') d++
    else if (c === ')') d--
  }
  expect(d).toBe(0)
})

it('Set text picks the setter by widget type; animations zoom any widget', () => {
  const btn = createComponent('btn', { id: 'b1', name: 'go', animations: [createAnimation({ id: 'z1', type: 'zoom_in', property: 'transform_zoom', startValue: 128, endValue: 256 })] })
  const area = createComponent('textarea', { id: 'a1', name: 'note' })
  const pages = [createPage({ id: 'p1', name: 'main', components: [btn, area] })]
  const mk = (id: string, target: string) => createLogicNode('set_text', { id, params: { targetComponent: target }, inputs: [ex(`${id}i`), val(`${id}t`, 'Text', 'string', 'x')], outputs: [ex(`${id}o`, 'Done')] })
  const trig = createLogicNode('event_trigger', { id: 't', params: { eventType: 'LV_EVENT_CLICKED', targetComponent: 'b1' }, outputs: [ex('to')] })
  const g = createLogicGraph({ id: 'g1', name: 'texts', nodes: [trig, mk('n1', 'b1'), mk('n2', 'a1')], connections: [conn('t', 'to', 'n1', 'n1i'), conn('n1', 'n1o', 'n2', 'n2i')] })
  const src = generateCode(pages, undefined, [g], undefined, [], [], '', 14)['ui/ui_logic.lisp']
  expect(src).toContain('(lv-label-set-text (lv-obj-get-child ui-go 0) "x")')
  expect(src).toContain('(lv-textarea-set-text ui-note "x")')
  const ui = generateCode(pages, undefined, [], undefined, [], [], '', 14)['ui/ui.lisp']
  expect(ui).toContain('lv-obj-set-style-transform-scale-x')
  expect(ui).not.toContain('lv-image-set-scale')
})

it('Set value uses the real type of the target (arc value -> bar)', () => {
  const arc = createComponent('arc', { id: 'a1', name: 'knob' })
  const bar = createComponent('bar', { id: 'b1', name: 'level' })
  const pages = [createPage({ id: 'p1', name: 'main', components: [arc, bar] })]
  const trig = createLogicNode('event_trigger', { id: 't', params: { eventType: 'LV_EVENT_VALUE_CHANGED', targetComponent: 'a1' }, outputs: [ex('to')] })
  const get = createLogicNode('get_property', { id: 'g', params: { targetComponent: 'a1', property: 'value' }, outputs: [val('go', 'Value')] })
  const set = createLogicNode('set_value', { id: 's', params: { targetComponent: 'b1' }, inputs: [ex('si'), val('sn', 'Number', 'int', 0)], outputs: [ex('so', 'Done')] })
  const g = createLogicGraph({ id: 'g1', name: 'link', nodes: [trig, get, set], connections: [
    conn('t', 'to', 's', 'si'),
    conn('g', 'go', 's', 'sn', 'data'),
  ] })
  const out = generateCode(pages, undefined, [g], undefined, [], [], '', 14)
  expect(out['ui/ui_logic.lisp']).toContain('(lv-bar-set-value ui-level (lv-arc-get-value ui-knob) LV_ANIM_ON)')
})

it('a graph without a trigger runs live: arc value -> bar follows without events', () => {
  const arc = createComponent('arc', { id: 'a1', name: 'knob' })
  const bar = createComponent('bar', { id: 'b1', name: 'level' })
  const pages = [createPage({ id: 'p1', name: 'main', components: [arc, bar] })]
  const get = createLogicNode('get_property', { id: 'g', params: { targetComponent: 'a1', property: 'value' }, outputs: [val('go', 'Value')] })
  const set = createLogicNode('set_value', { id: 's', params: { targetComponent: 'b1' }, inputs: [ex('si'), val('sn', 'Number', 'int', 0)], outputs: [ex('so', 'Done')] })
  const g = createLogicGraph({ id: 'g1', name: 'follow', nodes: [get, set], connections: [conn('g', 'go', 's', 'sn', 'data')] })
  const src = generateCode(pages, undefined, [g], undefined, [], [], '', 14)['ui/ui_logic.lisp']
  expect(src).toContain('(lv-bar-set-value ui-level (lv-arc-get-value ui-knob) LV_ANIM_ON)')
  expect(src).toContain('(defun logic-follow-live ()')
  expect(src).toContain('(list (lv-arc-get-value ui-knob))')
  expect(src).toContain('(logic-follow-live)')
})
