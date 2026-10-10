import { describe, it, expect } from 'vitest';
import { validateLinks } from '../validate';
import { createPage, createComponent, createEvent, createBuiltinAction, createLogicNode, createLogicGraph, createLogicVariable } from '../../__tests__/helpers';

describe('validateLinks', () => {
  const sl = createComponent('slider', { id: 's', name: 'sl' } as never);
  const pages = [createPage({ name: 'one', components: [sl] } as never)];

  it('is clean when everything exists', () => {
    const node = createLogicNode('set_value', { id: 'v', params: { targetComponent: 's' } });
    const g = createLogicGraph({ id: 'g', name: 'g', nodes: [node] });
    expect(validateLinks(pages, [g])).toEqual([]);
  });

  it('reports logic nodes, events, bindings and variables that point at nothing', () => {
    const bad = createLogicNode('set_value', { id: 'v', params: { targetComponent: 'bar-62' } });
    const nav = createLogicNode('navigate_page', { id: 'n', params: { targetPage: 'gone' } });
    const rd = createLogicNode('var_read', { id: 'r', params: { variableName: 'ghost' } });
    const g = createLogicGraph({ id: 'g', name: 'live', nodes: [bad, nav, rd], variables: [createLogicVariable({ id: 'x', name: 'speed' } as never)] } as never);
    const btn = createComponent('btn', {
      id: 'b', name: 'go', events: [createEvent({ action: createBuiltinAction({ type: 'show', targetComponent: 'missing' }) })],
      bindings: [{ id: 'bb', kind: 'text', variable: 'nope' }],
    } as never);
    const issues = validateLinks([createPage({ name: 'one', components: [sl, btn] } as never)], [g]);
    const text = issues.map(i => `${i.where} ${i.message}`).join('\n');
    expect(issues.length).toBe(5);
    expect(text).toContain('bar-62');
    expect(text).toContain('gone');
    expect(text).toContain('ghost');
    expect(text).toContain('missing');
    expect(text).toContain('nope');
  });

  it('reports two components with the same name on one screen', () => {
    const a = createComponent('btn', { id: 'a', name: 'dup' } as never);
    const b = createComponent('label', { id: 'b', name: 'dup' } as never);
    const other = createPage({ name: 'two', components: [createComponent('btn', { id: 'c', name: 'dup' } as never)] } as never);
    const issues = validateLinks([createPage({ name: 'one', components: [a, b] } as never), other], []);
    expect(issues.length).toBe(1);
    expect(issues[0].message).toContain('dup');
  });
});
