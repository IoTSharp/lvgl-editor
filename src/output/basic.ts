import type { LvglComponent } from '../types';
import type { OutputInput, SourceMapEntry } from './types';

// Proposed HmiCraft product API, not an existing IoTEmbedded registration.
export const BASIC_API = 'hmicraft-hmi-basic/1-draft';
export const BASIC_WIDGETS = ['obj', 'btn', 'label', 'slider', 'bar', 'switch', 'checkbox'];
export const BASIC_STYLES = ['bgColor', 'textColor', 'borderColor', 'borderWidth', 'borderRadius', 'padding', 'opacity'];
export const BASIC_ACTIONS = ['navigate', 'show', 'hide', 'enable', 'disable', 'setText', 'setValue'];
export const BASIC_PROPS: Record<string, string[]> = {
  obj: [], btn: ['text'], label: ['text'], slider: ['min', 'max', 'value'], bar: ['min', 'max', 'value'],
  switch: ['checked'], checkbox: ['text', 'checked'],
};
// IoTEmbedded MY-BASIC _PS_STRING accepts these Core Profile escapes.
const quote = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}"`;
const literal = (v: unknown) => typeof v === 'string' ? quote(v) : typeof v === 'boolean' ? (v ? '1' : '0') : String(v ?? 0);
function name(id: string) { return `h_${Array.from(id).map(c => c.codePointAt(0)!.toString(16)).join('_')}`; }

export function generateBasic(input: OutputInput) {
  const files: Record<string, string> = {};
  const sourceMap: SourceMapEntry[] = [];
  const layout = ['REM Generated layout. HmiCraft HMI API v1 DRAFT; runtime is not implemented.', 'DEF HMI_LAYOUT_INIT()'];
  const events = ['REM Generated event dispatch. User modules are stored separately.', 'DEF HMI_DISPATCH_EVENT(component_id$, event_name$)'];
  const user = ['REM User event module. Re-export preserves the project target slots.'];
  const refs = new Map<string, string>();
  const register = (c: LvglComponent) => { refs.set(c.id, c.id); refs.set(c.name, c.id); c.children.forEach(register); };
  input.pages.forEach(p => p.components.forEach(register));
  input.pages.forEach(p => {
    sourceMap.push({ file: 'generated/layout.bas', line: layout.length + 1, pageId: p.id });
    layout.push(`  HMI_CREATE_SCREEN(${quote(p.id)}, ${quote(p.name)})`);
    if (p.backgroundColor) layout.push(`  HMI_SET_STYLE(${quote(p.id)}, "bgColor", ${quote(p.backgroundColor)})`);
    const emit = (c: LvglComponent, parent: string) => {
      sourceMap.push({ file: 'generated/layout.bas', line: layout.length + 1, componentId: c.id, pageId: p.id });
      layout.push(`  HMI_CREATE_CONTROL(${quote(c.id)}, ${quote(c.type)}, ${quote(parent)}, ${c.x}, ${c.y}, ${c.width}, ${c.height})`);
      for (const [key, value] of Object.entries(c.styles.default)) layout.push(`  HMI_SET_STYLE(${quote(c.id)}, ${quote(key)}, ${literal(value)})`);
      for (const [key, value] of Object.entries(c.props)) layout.push(`  HMI_SET_PROPERTY(${quote(c.id)}, ${quote(key)}, ${literal(value)})`);
      if (!c.visible || c.flags?.hidden) layout.push(`  HMI_SET_VISIBLE(${quote(c.id)}, 0)`);
      if (c.flags?.disabled) layout.push(`  HMI_SET_ENABLED(${quote(c.id)}, 0)`);
      for (const e of c.events) {
        sourceMap.push({ file: 'generated/events.bas', line: events.length + 1, componentId: c.id, eventId: e.id });
        events.push(`  IF component_id$ = ${quote(c.id)} AND event_name$ = ${quote(e.eventType)} THEN`);
        if (e.handlerType === 'custom') {
          const handler = name(e.id);
          events.push(`    ${handler}()`);
          sourceMap.push({ file: 'user/events.bas', line: user.length + 1, componentId: c.id, eventId: e.id });
          user.push(`DEF ${handler}()`, ...(e.customCodeByTarget?.['basic-iotembedded'] ?? '').split('\n').map(s => `  ${s}`), 'ENDDEF', '');
        } else if (e.action) {
          const a = e.action;
          const id = refs.get(a.targetComponent ?? '') ?? '';
          const calls: Record<string, string> = {
            navigate: `HMI_SHOW_SCREEN(${quote(input.pages.find(p => p.id === a.targetPage || p.name === a.targetPage)?.id ?? '')})`,
            show: `HMI_SET_VISIBLE(${quote(id)}, 1)`, hide: `HMI_SET_VISIBLE(${quote(id)}, 0)`,
            enable: `HMI_SET_ENABLED(${quote(id)}, 1)`, disable: `HMI_SET_ENABLED(${quote(id)}, 0)`,
            setText: `HMI_SET_TEXT(${quote(id)}, ${literal(a.value)})`, setValue: `HMI_SET_VALUE(${quote(id)}, ${literal(a.value)})`,
          };
          events.push(`    ${calls[a.type]}`);
        }
        events.push('  ENDIF');
      }
      c.children.forEach(ch => emit(ch, c.id));
    };
    p.components.forEach(c => emit(c, p.id));
  });
  layout.push('ENDDEF', '');
  events.push('ENDDEF', '');
  files['generated/layout.bas'] = layout.join('\n');
  files['generated/events.bas'] = events.join('\n');
  files['user/events.bas'] = user.join('\n') + '\n';
  files['main.bas'] = ['REM Contract artifact only; requires a future matching HmiCraft HMI runtime.', 'IMPORT "generated/layout.bas"', 'IMPORT "user/events.bas"', 'IMPORT "generated/events.bas"', 'HMI_LAYOUT_INIT()', ''].join('\n');
  const signatures = [
    ['HMI_CREATE_SCREEN', '(id:string, name:string)', 'Creates a screen with the reference Montserrat 14 font.'],
    ['HMI_CREATE_CONTROL', '(id:string, kind:string, parent:string, x:int, y:int, width:int, height:int)', 'Stable IDs identify controls; absolute pixel geometry.'],
    ['HMI_SET_STYLE', '(id:string, property:string, value:string|number)', 'Default-state styles only; colors may be transparent or #rrggbb.'],
    ['HMI_SET_PROPERTY', '(id:string, property:string, value:string|number)', 'Only the emitted per-widget property allowlist.'],
    ['HMI_SHOW_SCREEN', '(screen_id:string)', 'Immediate navigation without animation.'],
    ['HMI_SET_VISIBLE', '(id:string, visible:int)', '0 or 1.'], ['HMI_SET_ENABLED', '(id:string, enabled:int)', '0 or 1.'],
    ['HMI_SET_TEXT', '(id:string, text:string)', 'Updates label/button/checkbox text.'], ['HMI_SET_VALUE', '(id:string, value:number)', 'Updates slider/bar values.'],
  ];
  files['api-contract.json'] = JSON.stringify({ id: BASIC_API, implemented: false, interpreter: 'IoTEmbedded MY-BASIC', functionSignatures: signatures.map(([name, parameters, semantics]) => ({ name, parameters, returns: 'int status (1 success, 0 failure)', semantics, ownership: 'Runtime retains IDs and copies strings; no script-owned native handles.', execution: 'UI task only; no peripheral waits.' })), callbacks: [{ name: 'HMI_DISPATCH_EVENT', parameters: '(component_id:string, event_name:string)', budget: 'Future runtime must enforce instruction/time budgets, cancellation and yielding; no such scheduler is present yet.' }], scheduling: 'Future runtime must invoke bounded callbacks on the UI task; no generated polling loop.', importResolution: 'Nested package paths require the future HmiCraft package loader, not the current EEPROM import resolver.' }, null, 2) + '\n';
  return { files, sourceMap };
}
