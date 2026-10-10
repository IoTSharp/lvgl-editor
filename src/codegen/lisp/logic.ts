// ui/ui_logic.lisp generator: logic graphs -> Lisp functions, triggers and a tick function

import { generateBindings } from './bindings';
import type { Page } from '../../types';
import type { LogicGraph, LogicNode, LogicPort, LogicVariable } from '../../components/LogicEditor/types';
import type { LispGenOptions } from './types';
import type { NameResolver } from './names';
import { lstr, sym, indent, comment, banner, userCode, shift } from './sexp';

interface Ctx {
  graph: LogicGraph;
  names: NameResolver;
  options: LispGenOptions;
  pageHint?: string;
}

const num = (x: unknown, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);

/** Wrap forms in a progn that always has a value. */
function progn(lines: string[]): string[] {
  return ['(progn', ...shift(lines, 2), '  nil)'];
}

function closeLast(lines: string[]): string[] {
  const out = [...lines];
  out[out.length - 1] += ')';
  return out;
}

function lispLiteral(type: string | undefined, value: unknown): string {
  switch (type) {
    case 'string': {
      const s = value === undefined || value === null ? '' : String(value);
      return /^".*"$/s.test(s) ? s : lstr(s);
    }
    case 'bool':
      return value === true || value === 'true' ? 't' : 'nil';
    case 'float': {
      const n = Number(value) || 0;
      return Number.isInteger(n) ? n.toFixed(1) : String(n);
    }
    default:
      return String(num(value));
  }
}

function portDefault(port: LogicPort): string {
  if (port.defaultValue === undefined) return port.type === 'string' ? '""' : port.type === 'bool' ? 'nil' : '0';
  return lispLiteral(port.type === 'any' ? (typeof port.defaultValue === 'string' ? 'string' : typeof port.defaultValue === 'boolean' ? 'bool' : 'int') : port.type, port.defaultValue);
}

// ---------------------------------------------------------------- graph walking

function nextExecNode(node: LogicNode, g: LogicGraph): string | null {
  const out = node.outputs.find(o => o.type === 'execution');
  if (!out) return null;
  return g.connections.find(c => c.sourceNode === node.id && c.sourceOutput === out.id)?.targetNode ?? null;
}

function outputTarget(node: LogicNode, name: string, g: LogicGraph): string | null {
  const out = node.outputs.find(o => o.name === name);
  if (!out) return null;
  return g.connections.find(c => c.sourceNode === node.id && c.sourceOutput === out.id)?.targetNode ?? null;
}

function inputValue(node: LogicNode, name: string, c: Ctx): string {
  const port = node.inputs.find(i => i.name === name);
  if (!port) return '0';
  const conn = c.graph.connections.find(k => k.targetNode === node.id && k.targetInput === port.id);
  if (!conn) return portDefault(port);
  const src = c.graph.nodes.find(n => n.id === conn.sourceNode);
  return src ? expression(src, c) : portDefault(port);
}

function varSym(name: string, c: Ctx): string {
  return sym(c.options, 'var', name);
}

function expression(node: LogicNode, c: Ctx): string {
  const p = node.params;
  switch (node.subType) {
    case 'var_read':
      return varSym(p.variableName || p.variableId || 'unknown', c);
    case 'math_op': {
      const a = inputValue(node, 'A', c);
      const b = inputValue(node, 'B', c);
      const op = p.operator || '+';
      if (op === '%') return `(mod ${a} ${b})`;
      if (op === 'min') return `(if (< ${a} ${b}) ${a} ${b})`;
      if (op === 'max') return `(if (> ${a} ${b}) ${a} ${b})`;
      if (op === 'pow') return `(pow ${a} ${b})`;
      return `(${['+', '-', '*', '/'].includes(op) ? op : '+'} ${a} ${b})`;
    }
    case 'map_range': {
      const v = inputValue(node, 'Value', c);
      const i0 = inputValue(node, 'In min', c), i1 = inputValue(node, 'In max', c);
      const o0 = inputValue(node, 'Out min', c), o1 = inputValue(node, 'Out max', c);
      return `(+ ${o0} (/ (* (- ${v} ${i0}) (- ${o1} ${o0})) (if (= ${i1} ${i0}) 1 (- ${i1} ${i0}))))`;
    }
    case 'clamp': {
      const v = inputValue(node, 'Value', c);
      const lo = inputValue(node, 'Min', c), hi = inputValue(node, 'Max', c);
      return `(if (< ${v} ${lo}) ${lo} (if (> ${v} ${hi}) ${hi} ${v}))`;
    }
    case 'math_func': {
      const a = inputValue(node, 'A', c);
      const f = ['abs', 'sqrt', 'floor', 'ceil', 'round', 'sin', 'cos'].includes(p.func) ? p.func : 'abs';
      return `(${f} ${a})`;
    }
    case 'to_string':
      return `(str-from-n ${inputValue(node, 'Value', c)} ${lstr(String(p.format || '%d'))})`;
    case 'random': {
      const lo = inputValue(node, 'Min', c), hi = inputValue(node, 'Max', c);
      return `(+ ${lo} (mod (abs (rand)) (+ 1 (- ${hi} ${lo}))))`;
    }
    case 'for_loop':
      return 'loop-i';
    case 'compare': {
      const a = inputValue(node, 'A', c);
      const b = inputValue(node, 'B', c);
      const op = p.operator || '==';
      if (op === '==') return `(= ${a} ${b})`;
      if (op === '!=') return `(not (= ${a} ${b}))`;
      return `(${['>', '<', '>=', '<='].includes(op) ? op : '='} ${a} ${b})`;
    }
    case 'logic_op': {
      const a = inputValue(node, 'A', c);
      const op = p.operator || 'AND';
      if (op === 'NOT') return `(not ${a})`;
      return `(${op === 'OR' ? 'or' : 'and'} ${a} ${inputValue(node, 'B', c)})`;
    }
    case 'string_op': {
      const a = inputValue(node, 'A', c);
      const b = inputValue(node, 'B', c);
      const op = p.operation || 'concat';
      if (op === 'length') return `(str-len ${a})`;
      if (op === 'concat') return `(str-merge ${a} ${b})`;
      return a;
    }
    case 'get_property': {
      const t = c.names.varByName(p.targetComponent || 'obj', c.pageHint);
      switch (p.property || 'x') {
        case 'x': return `(lv-obj-get-x ${t})`;
        case 'y': return `(lv-obj-get-y ${t})`;
        case 'width': return `(lv-obj-get-width ${t})`;
        case 'height': return `(lv-obj-get-height ${t})`;
        case 'opacity': return `(lv-obj-get-style-opa ${t} LV_PART_MAIN)`;
        case 'visible': return `(not (lv-obj-has-flag ${t} LV_OBJ_FLAG_HIDDEN))`;
        case 'checked': return `(lv-obj-has-state ${t} LV_STATE_CHECKED)`;
        case 'value': {
          const type = c.names.compByName(p.targetComponent || '', c.pageHint)?.type;
          switch (type) {
            case 'bar': return `(lv-bar-get-value ${t})`;
            case 'arc': return `(lv-arc-get-value ${t})`;
            case 'dropdown': return `(lv-dropdown-get-selected ${t})`;
            case 'roller': return `(lv-roller-get-selected ${t})`;
            case 'spinbox': return `(lv-spinbox-get-value ${t})`;
            case 'switch':
            case 'checkbox': return `(if (lv-obj-has-state ${t} LV_STATE_CHECKED) 1 0)`;
            default: return `(lv-slider-get-value ${t})`;
          }
        }
        case 'text': {
          const type = c.names.compByName(p.targetComponent || '', c.pageHint)?.type;
          return type === 'textarea' ? `(lv-textarea-get-text ${t})` : `(lv-label-get-text ${t})`;
        }
        default: return '0';
      }
    }
    default:
      return '0';
  }
}

/** Moves the needle of a scale (the needle line is created with the scale when its "Needle" option is on). */
function scaleNeedle(c: Ctx, p: Record<string, unknown>, target: string, value: string): string {
  const comp = c.names.compByName(String(p.targetComponent || ''), c.pageHint);
  const len = Number(comp?.props.needleLength) || 60;
  return `(lv-scale-set-line-needle-value ${target} ${sym(c.options, target, 'needle')} ${len} ${value})`;
}

function ledType(c: Ctx, p: Record<string, unknown>): boolean {
  return c.names.compByName(String(p.targetComponent || ''), c.pageHint)?.type === 'led';
}

function chain(nodeId: string, c: Ctx, visited: Set<string>): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  const node = c.graph.nodes.find(n => n.id === nodeId);
  if (!node) return [];
  if (node.subType === 'delay') {
    // never block the main loop: the rest of the chain is scheduled and runs from ui-logic-tick
    const next = nextExecNode(node, c.graph);
    const rest = next ? chain(next, c, visited) : [];
    if (rest.length === 0) return [];
    const secs = num(node.params.duration, 1000) / 1000;
    return closeLast([`(ui-defer ${Number.isInteger(secs) ? secs.toFixed(1) : String(secs)} (lambda ()`, ...shift(progn(rest), 2)]).map((l, idx, arr) => (idx === arr.length - 1 ? l + ')' : l));
  }
  if (node.subType === 'for_loop') {
    const bId = outputTarget(node, 'Body', c.graph);
    const body = bId ? chain(bId, c, new Set(visited)) : [];
    const lines = closeLast([`(looprange loop-i 0 ${inputValue(node, 'Count', c)}`, ...shift(progn(body.length ? body : [comment('Body')]), 2)]);
    const dId = outputTarget(node, 'Done', c.graph);
    return [...lines, ...(dId ? chain(dId, c, visited) : [])];
  }
  const out = [...nodeForms(node, c)];
  if (node.subType !== 'if_else' && node.subType !== 'switch') {
    const next = nextExecNode(node, c.graph);
    if (next) out.push(...chain(next, c, visited));
  }
  return out;
}

function nodeForms(node: LogicNode, c: Ctx): string[] {
  const p = node.params;
  const g = c.graph;
  const gen = c.options.generateComments;
  const t = () => c.names.varByName(p.targetComponent || 'obj', c.pageHint);

  switch (node.subType) {
    case 'event_trigger':
      return gen ? [comment(`Event: ${p.eventType || 'LV_EVENT_CLICKED'} on ${p.targetComponent || '?'}`)] : [];
    case 'timer_trigger':
      return gen ? [comment(`Timer: ${p.mode || 'repeat'}, ${p.duration || 1000}ms`)] : [];
    case 'if_else': {
      const cond = inputValue(node, 'Condition', c);
      const tId = outputTarget(node, 'True', g);
      const fId = outputTarget(node, 'False', g);
      const tLines = tId ? chain(tId, c, new Set()) : [];
      const fLines = fId ? chain(fId, c, new Set()) : [];
      if (!fId) return closeLast([`(if ${cond}`, ...shift(progn(tLines.length ? tLines : [comment('True branch')]), 4), '    nil']);
      return closeLast([`(if ${cond}`, ...shift(progn(tLines.length ? tLines : [comment('True branch')]), 4), ...shift(progn(fLines), 4)]);
    }
    case 'switch': {
      const value = inputValue(node, 'Value', c);
      const cases: unknown[] = p.cases || [0, 1, 2];
      const lines: string[] = ['(cond'];
      for (const cv of cases) {
        const id = outputTarget(node, `Case ${cv}`, g) || outputTarget(node, String(cv), g);
        const body = id ? chain(id, c, new Set()) : [];
        lines.push(`  ((= ${value} ${num(cv)})`, ...closeLast(shift(progn(body), 3)));
      }
      const dId = outputTarget(node, 'Default', g);
      lines.push('  (t', ...closeLast(shift(progn(dId ? chain(dId, c, new Set()) : []), 3)));
      return closeLast(lines);
    }
    case 'compare':
    case 'logic_op':
    case 'var_read':
    case 'math_op':
    case 'string_op':
    case 'get_property':
      return []; // pure expressions, inlined where they are used
    case 'set_property': {
      const prop = p.property || 'x';
      const target = t();
      // the Value input wins when it is wired; otherwise the literal typed in the node
      const port = node.inputs.find(i => i.name === 'Value');
      const wired = !!port && c.graph.connections.some(k => k.targetNode === node.id && k.targetInput === port.id);
      const literal = p.value !== undefined ? p.value : 0;
      const expr = wired ? inputValue(node, 'Value', c) : null;
      const val = expr ?? String(num(literal));
      // LispBM: only nil is false, so 0 has to be tested explicitly
      const flag = (on: string, off: string) => (expr ? `(let ((v ${expr})) (if (and v (not (eq v 0))) ${on} ${off}))` : literal ? on : off);
      const hidden = 'LV_OBJ_FLAG_HIDDEN';
      const setters: Record<string, string> = {
        x: `(lv-obj-set-x ${target} ${val})`,
        y: `(lv-obj-set-y ${target} ${val})`,
        width: `(lv-obj-set-width ${target} ${val})`,
        height: `(lv-obj-set-height ${target} ${val})`,
        opacity: `(lv-obj-set-style-opa ${target} ${expr ?? String(num(literal, 255))} LV_PART_MAIN)`,
        visible: flag(`(lv-obj-remove-flag ${target} ${hidden})`, `(lv-obj-add-flag ${target} ${hidden})`),
        checked: ledType(c, p)
          ? flag(`(lv-led-on ${target})`, `(lv-led-off ${target})`)
          : flag(`(lv-obj-add-state ${target} LV_STATE_CHECKED)`, `(lv-obj-remove-state ${target} LV_STATE_CHECKED)`),
        text: (() => {
          const tv = expr ?? lstr(String(literal));
          switch (c.names.compByName(p.targetComponent || '', c.pageHint)?.type) {
            case 'textarea': return `(lv-textarea-set-text ${target} ${tv})`;
            case 'btn': return `(lv-label-set-text (lv-obj-get-child ${target} 0) ${tv})`;
            case 'checkbox': return `(lv-checkbox-set-text ${target} ${tv})`;
            default: return `(lv-label-set-text ${target} ${tv})`;
          }
        })(),
        value: (() => {
          switch (c.names.compByName(p.targetComponent || '', c.pageHint)?.type) {
            case 'led': return `(lv-led-set-brightness ${target} ${val})`;
            case 'roller': return `(lv-roller-set-selected ${target} ${val} LV_ANIM_ON)`;
            case 'spinbox': return `(lv-spinbox-set-value ${target} ${val})`;
            case 'scale': return scaleNeedle(c, p, target, val);
            case 'bar': return `(lv-bar-set-value ${target} ${val} LV_ANIM_ON)`;
            case 'arc': return `(lv-arc-set-value ${target} ${val})`;
            default: return `(lv-slider-set-value ${target} ${val} LV_ANIM_ON)`;
          }
        })(),
      };
      return [setters[prop] || comment(`Set property: ${prop} on ${target}`)];
    }
    case 'navigate_page': {
      const page = p.targetPage || '';
      if (!c.names.hasScreen(page)) return [comment(`Unknown page: ${page}`)];
      const screen = c.names.screenVar(page);
      const anim = p.animation || 'none';
      if (anim === 'none') return [`(lv-screen-load ${screen})`];
      const m: Record<string, string> = {
        fade: 'LV_SCREEN_LOAD_ANIM_FADE_IN', slide_left: 'LV_SCREEN_LOAD_ANIM_MOVE_LEFT',
        slide_right: 'LV_SCREEN_LOAD_ANIM_MOVE_RIGHT', slide_up: 'LV_SCREEN_LOAD_ANIM_MOVE_TOP',
        slide_down: 'LV_SCREEN_LOAD_ANIM_MOVE_BOTTOM',
      };
      return [`(lv-screen-load-anim ${screen} ${m[anim] || 'LV_SCREEN_LOAD_ANIM_FADE_IN'} 300 0 nil)`];
    }
    case 'show_hide': {
      const target = t();
      switch (p.action || 'toggle') {
        case 'show': return [`(lv-obj-remove-flag ${target} LV_OBJ_FLAG_HIDDEN)`];
        case 'hide': return [`(lv-obj-add-flag ${target} LV_OBJ_FLAG_HIDDEN)`];
        case 'toggle':
          return [
            `(if (lv-obj-has-flag ${target} LV_OBJ_FLAG_HIDDEN)`,
            `    (lv-obj-remove-flag ${target} LV_OBJ_FLAG_HIDDEN)`,
            `    (lv-obj-add-flag ${target} LV_OBJ_FLAG_HIDDEN))`,
          ];
        default: return [comment(`Unknown show/hide action: ${p.action}`)];
      }
    }
    case 'set_text': {
      const target = c.names.varByName(p.targetComponent || 'label', c.pageHint);
      const text = inputValue(node, 'Text', c);
      // like the event action: the setter depends on the widget (a button keeps its text in a child label)
      switch (c.names.compByName(p.targetComponent || '', c.pageHint)?.type) {
        case 'textarea': return [`(lv-textarea-set-text ${target} ${text})`];
        case 'btn': return [`(lv-label-set-text (lv-obj-get-child ${target} 0) ${text})`];
        case 'checkbox': return [`(lv-checkbox-set-text ${target} ${text})`];
        case 'dropdown': return [comment('dropdown caption cannot be changed through the LVGL bridge')];
        default: return [`(lv-label-set-text ${target} ${text})`];
      }
    }
    case 'set_value': {
      const target = c.names.varByName(p.targetComponent || 'slider', c.pageHint);
      const value = inputValue(node, 'Number', c);
      // the setter follows the real type of the target (the node itself has no type setting)
      const type = c.names.compByName(p.targetComponent || '', c.pageHint)?.type ?? p.componentType ?? 'slider';
      switch (type) {
        case 'led': return [`(lv-led-set-brightness ${target} ${value})`];
        case 'roller': return [`(lv-roller-set-selected ${target} ${value} LV_ANIM_ON)`];
        case 'spinbox': return [`(lv-spinbox-set-value ${target} ${value})`];
        case 'scale': return [scaleNeedle(c, p, target, value)];
        case 'bar': return [`(lv-bar-set-value ${target} ${value} LV_ANIM_ON)`];
        case 'arc': return [`(lv-arc-set-value ${target} ${value})`];
        case 'dropdown': return [`(lv-dropdown-set-selected ${target} ${value})`];
        case 'switch':
        case 'checkbox': return [`(if (and ${value} (not (eq ${value} 0))) (lv-obj-add-state ${target} LV_STATE_CHECKED) (lv-obj-remove-state ${target} LV_STATE_CHECKED))`];
        case 'spinner': return [comment('A spinner value cannot be set directly')];
        default: return [`(lv-slider-set-value ${target} ${value} LV_ANIM_ON)`];
      }
    }
    case 'call_function': {
      const fn = p.functionName || 'custom-function';
      const args: unknown[] = Array.isArray(p.arguments) ? p.arguments : [];
      return [`(${[fn, ...args.map(String)].join(' ')})`];
    }
    case 'delay':
      return []; // handled by chain(): the rest of the chain is deferred
    case 'var_write':
      return [`(setq ${varSym(p.variableName || p.variableId || 'unknown', c)} ${inputValue(node, 'Value', c)})`];
    case 'c_code_block': {
      // the node type keeps its historic name; its body is now Lisp
      const code = String(p.code || ';; Custom code').trim();
      return code.split('\n');
    }
    default:
      return gen ? [comment(`Unknown node type: ${node.subType}`)] : [];
  }
}

// ---------------------------------------------------------------- file

function graphFn(g: LogicGraph, o: LispGenOptions): string {
  return sym(o, 'logic', g.name);
}

function collectVariables(graphs: LogicGraph[]): LogicVariable[] {
  const map = new Map<string, LogicVariable>();
  for (const g of graphs) for (const v of g.variables) if (!map.has(v.name)) map.set(v.name, v);
  return [...map.values()];
}

function functionBody(g: LogicGraph, c: Ctx): string[] {
  const triggers = g.nodes.filter(n => n.type === 'trigger');
  if (triggers.length === 0) {
    const lines: string[] = [];
    for (const n of g.nodes) {
      if (n.type === 'action' || n.type === 'custom') lines.push(...nodeForms(n, c));
    }
    return lines;
  }
  const visited = new Set<string>();
  const lines: string[] = [];
  for (const t of triggers) lines.push(...chain(t.id, c, visited));
  return lines;
}

/** Graphs without any trigger node run "live": started once and re-run whenever a wired value changes. */
function isLiveGraph(g: LogicGraph): boolean {
  return !g.nodes.some(n => n.type === 'trigger') && g.nodes.some(n => n.type === 'action' || n.type === 'custom');
}

/** Expressions of every wired data input of the graph's action nodes (what the live graph reacts to). */
function liveSources(g: LogicGraph, c: Ctx): string[] {
  const out: string[] = [];
  for (const n of g.nodes) {
    if (n.type !== 'action' && n.type !== 'custom') continue;
    for (const port of n.inputs) {
      if (port.type === 'execution') continue;
      if (c.graph.connections.some(k => k.targetNode === n.id && k.targetInput === port.id)) out.push(inputValue(n, port.name, c));
    }
  }
  return out;
}

export function generateLogicLisp(graphs: LogicGraph[], names: NameResolver, options: LispGenOptions, pages: Page[] = []): string {
  const o = options;
  const i = indent(o);
  const L: string[] = [];
  L.push(...banner('ui_logic.lisp - logic graphs (generated by LVGL UI Editor)'));
  L.push(comment('ui-logic-init registers the triggers, ui-logic-tick runs the timers (called from the main loop).'));
  L.push('');

  const vars = collectVariables(graphs);
  if (o.generateComments) L.push(...banner('Logic variables'));
  if (vars.length === 0) L.push(comment('No variables defined'));
  for (const v of vars) L.push(`(def ${sym(o, 'var', v.name)} ${lispLiteral(v.type, v.defaultValue)})`);
  L.push('');

  if (o.generateComments) L.push(...banner('Logic functions'));
  if (graphs.length === 0) L.push(comment('No logic graphs defined'), '');
  for (const g of graphs) {
    const c: Ctx = { graph: g, names, options: o };
    if (o.generateComments) {
      L.push(comment(`Logic: ${g.name}`));
      if (g.description) L.push(comment(g.description));
    }
    L.push(`(defun ${graphFn(g, o)} ()`, `${i}(progn`);
    const body = functionBody(g, c);
    L.push(...shift(body.length ? body : [comment('Empty logic graph')], o.indentSize * 2));
    L.push(`${i}${i}nil))`, '');
  }

  // event wrappers, init and tick
  const eventGraphs = graphs.filter(g => g.nodes.some(n => n.subType === 'event_trigger'));
  const timerGraphs = graphs.filter(g => g.nodes.some(n => n.subType === 'timer_trigger'));

  for (const g of eventGraphs) {
    L.push(`(defun ${graphFn(g, o)}-on-event (e) (${graphFn(g, o)}))`);
  }
  if (eventGraphs.length) L.push('');

  const init: string[] = [];
  for (const g of eventGraphs) {
    for (const t of g.nodes.filter(n => n.subType === 'event_trigger')) {
      if (!t.params.targetComponent) continue;
      const target = names.varByName(t.params.targetComponent);
      init.push(`(lv-obj-add-event-cb ${target} '${graphFn(g, o)}-on-event ${t.params.eventType || 'LV_EVENT_CLICKED'})`);
    }
  }
  const bind = generateBindings(pages, vars, names, o);
  const timers: Array<{ fn: string; clock: string; done: string; seconds: string; once: boolean }> = [];
  for (const g of timerGraphs) {
    g.nodes.filter(n => n.subType === 'timer_trigger').forEach((t, idx) => {
      const base = `${graphFn(g, o)}-timer${idx}`;
      const ms = num(t.params.duration, 1000);
      const secs = ms % 1000 === 0 ? (ms / 1000).toFixed(1) : String(ms / 1000);
      timers.push({ fn: graphFn(g, o), clock: base, done: `${base}-done`, seconds: secs, once: t.params.mode === 'delay' });
      init.push(`(def ${base} (systime))`, `(def ${base}-done nil)`);
    });
  }
  // live graphs: no trigger -> run once at start, then whenever a wired value changes (checked 20x per second)
  const live: string[] = [];
  const liveBlock: string[] = [];
  for (const g of graphs.filter(isLiveGraph)) {
    const c: Ctx = { graph: g, names, options: o };
    const fn = graphFn(g, o);
    const srcs = liveSources(g, c);
    if (srcs.length === 0) {
      init.push(`(${fn})`);
      continue;
    }
    live.push(`(${fn}-live)`);
    liveBlock.push(
      `(def ${fn}-sig nil)`,
      `(defun ${fn}-live ()`,
      `${i}(let ((s (list ${srcs.join(' ')})))`,
      `${i}${i}(if (eq s ${fn}-sig)`,
      `${i}${i}${i}nil`,
      `${i}${i}${i}(progn (setq ${fn}-sig s) (${fn})))))`,
      '',
    );
  }
  if (o.generateComments) L.push(...banner('Init and timers'));
  L.push(`(defun ui-logic-init ()`, `${i}(progn`);
  L.push(...shift(init.length ? init : [comment('No triggers to register')], o.indentSize * 2));
  L.push(`${i}${i}nil))`, '');

  // non-blocking delays: ui-defer queues (start-time seconds fn), ui-defer-tick runs what is due
  if (o.generateComments) L.push(...banner('Deferred calls (Delay nodes)'));
  L.push(
    '(def ui-defer-queue nil)',
    '(def ui-live-t (systime))',
    '',
    '(defun ui-defer (secs f)',
    `${i}(setq ui-defer-queue (cons (list (systime) secs f) ui-defer-queue)))`,
    '',
    '(defun ui-defer-tick ()',
    `${i}(if (eq ui-defer-queue nil)`,
    `${i}${i}nil`,
    `${i}${i}(let ((q ui-defer-queue))`,
    `${i}${i}${i}(progn`,
    `${i}${i}${i}${i}(setq ui-defer-queue nil)`,
    `${i}${i}${i}${i}(map (lambda (d)`,
    `${i}${i}${i}${i}${i}${i}(if (>= (secs-since (ix d 0)) (ix d 1))`,
    `${i}${i}${i}${i}${i}${i}${i}(trap ((ix d 2)))`,
    `${i}${i}${i}${i}${i}${i}${i}(setq ui-defer-queue (cons d ui-defer-queue))))`,
    `${i}${i}${i}${i}${i}q)`,
    `${i}${i}${i}${i}nil))))`,
    '',
  );

  if (bind.count > 0 || bind.update.length > 0) {
    if (o.generateComments) L.push(...banner('Bindings (component <- variable)'));
    L.push(...bind.defs, '(def ui-bind-t (systime))', '', '(defun ui-bindings-update ()', `${i}(progn`, ...shift(bind.update, o.indentSize * 2), `${i}${i}nil))`, '');
  }

  if (liveBlock.length) {
    if (o.generateComments) L.push(...banner('Live graphs (no trigger)'));
    L.push(...liveBlock);
  }
  L.push(`(defun ui-logic-tick ()`, `${i}(progn`);
  const tick: string[] = ['(ui-defer-tick)'];
  if (live.length) {
    tick.push('(if (>= (secs-since ui-live-t) 0.05)', `    (progn (setq ui-live-t (systime)) ${live.join(' ')}))`);
  }
  if (bind.count > 0) tick.push('(if (>= (secs-since ui-bind-t) 0.05)', '    (progn (setq ui-bind-t (systime)) (ui-bindings-update)))');
  for (const t of timers) {
    if (t.once) {
      tick.push(`(if (and (not ${t.done}) (>= (secs-since ${t.clock}) ${t.seconds}))`, `    (progn (setq ${t.done} t) (${t.fn})))`);
    } else {
      tick.push(`(if (>= (secs-since ${t.clock}) ${t.seconds})`, `    (progn (setq ${t.clock} (systime)) (${t.fn})))`);
    }
  }
  L.push(...shift(tick.length ? tick : [comment('No timers')], o.indentSize * 2));
  L.push(`${i}${i}nil))`, '');

  L.push(...userCode('logic_custom', o));
  return L.join('\n') + '\n';
}
