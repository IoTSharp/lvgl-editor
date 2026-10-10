// Checks that logic, events and bindings point at things that exist, so the board code does not hit
// "variable_not_bound" at start-up. Run before every export.

import type { Page, LvglComponent } from '../../types';
import type { LogicGraph } from '../../components/LogicEditor/types';
// Diagnostics are language-neutral source messages; the host translates them.
const t = (message: string, ...args: string[]) => message.replace(/\{(\d+)\}/g, (_, i: string) => args[Number(i)] ?? '');

export interface LinkIssue {
  where: string;   // "Logic «Max speed bar»", "Button «next»"
  message: string; // what is wrong
}

const COMPONENT_NODES = ['set_property', 'set_text', 'set_value', 'show_hide', 'get_property', 'event_trigger'];

function walk(cs: LvglComponent[], f: (c: LvglComponent, page?: string) => void, page?: string) {
  for (const c of cs) { f(c, page); walk(c.children, f, page); }
}

export function validateLinks(pages: Page[], graphs: LogicGraph[]): LinkIssue[] {
  const issues: LinkIssue[] = [];
  const comps = new Set<string>();
  const pageNames = new Set(pages.map(p => p.name));
  for (const p of pages) walk(p.components, c => { comps.add(c.id); comps.add(c.name); });
  const vars = new Set(graphs.flatMap(g => g.variables.map(v => v.name)));
  const has = (ref: unknown) => typeof ref === 'string' && ref !== '' && comps.has(ref);

  for (const g of graphs) {
    for (const n of g.nodes) {
      const p = n.params || {};
      const where = t('Logic "{0}", node "{1}"', g.name, n.label || n.subType);
      if (COMPONENT_NODES.includes(n.subType)) {
        if (!p.targetComponent) issues.push({ where, message: t('no component selected') });
        else if (!has(p.targetComponent)) issues.push({ where, message: t('the component "{0}" does not exist in the UI (deleted or renamed)', String(p.targetComponent)) });
      }
      if (n.subType === 'navigate_page' && p.targetPage && !pageNames.has(p.targetPage)) {
        issues.push({ where, message: t('the screen "{0}" does not exist', String(p.targetPage)) });
      }
      if ((n.subType === 'var_read' || n.subType === 'var_write') && !vars.has(p.variableName || p.variableId)) {
        issues.push({ where, message: t('the variable "{0}" is not defined', String(p.variableName || p.variableId || '')) });
      }
    }
  }

  for (const page of pages) {
    const seen = new Set<string>();
    walk(page.components, (c) => {
      if (seen.has(c.name)) issues.push({ where: t('Screen "{0}"', page.name), message: t('two components are named "{0}"; logic and events find components by name', c.name) });
      seen.add(c.name);
    });
    walk(page.components, (c) => {
      for (const ev of c.events || []) {
        const a = ev.action;
        if (ev.handlerType !== 'builtin' || !a) continue;
        const where = t('Event of "{0}" ({1})', c.name, page.name);
        if (a.type === 'navigate') {
          if (!a.targetPage || !pageNames.has(a.targetPage)) issues.push({ where, message: t('the screen "{0}" does not exist', String(a.targetPage || '')) });
        } else if (!a.targetComponent || !has(a.targetComponent)) {
          issues.push({ where, message: t('the component "{0}" does not exist in the UI (deleted or renamed)', String(a.targetComponent || '')) });
        }
      }
      for (const b of c.bindings || []) {
        if (!vars.has(b.variable)) issues.push({ where: t('Binding of "{0}" ({1})', c.name, page.name), message: t('the variable "{0}" is not defined', b.variable) });
      }
      if (c.type === 'keyboard' && c.props.textarea && !has(c.props.textarea)) {
        issues.push({ where: t('Keyboard "{0}" ({1})', c.name, page.name), message: t('the text area "{0}" does not exist', String(c.props.textarea)) });
      }
    }, page.name);
  }
  return issues;
}
