// Style keys of a component: "default" and the state keys ("pressed", ...) style the main part;
// "<part>" and "<part>:<state>" ("knob", "knob:pressed") style a part of the widget.
import type { StyleProps } from '../types';

export const STYLE_PARTS = ['indicator', 'knob', 'items', 'selected', 'cursor', 'scrollbar'] as const;
export const STYLE_STATE_KEYS = ['pressed', 'focused', 'disabled', 'checked', 'hovered', 'edited', 'scrolled'] as const;

/** Parts that exist on each widget type (besides the main part) */
export const PARTS_BY_TYPE: Record<string, readonly string[]> = {
  slider: ['indicator', 'knob'], bar: ['indicator'], arc: ['indicator', 'knob'], switch: ['indicator', 'knob'],
  checkbox: ['indicator'], textarea: ['cursor', 'scrollbar'], dropdown: ['indicator'], roller: ['selected'],
  table: ['items'], chart: ['items', 'indicator', 'cursor'], keyboard: ['items'], spinbox: ['cursor'],
  scale: ['indicator', 'items'], obj: ['scrollbar'], tabview: ['scrollbar'], tileview: ['scrollbar'], win: ['scrollbar'],
  list: ['scrollbar'], label: ['selected'],
};

export function parseStyleKey(key: string): { part: string | null; state: string | null } {
  const [a, b] = key.split(':');
  if ((STYLE_STATE_KEYS as readonly string[]).includes(a)) return { part: null, state: a };
  if ((STYLE_PARTS as readonly string[]).includes(a)) return { part: a, state: b || null };
  return { part: null, state: null };
}

const up = (s: string) => s.toUpperCase();

/** Lisp style selector of a style key, or null for "default" / unknown keys */
export function styleSelector(key: string): string | null {
  if (key === 'default') return null;
  const { part, state } = parseStyleKey(key);
  if (!part && !state) return null;
  if (part && state) return `(bitwise-or LV_PART_${up(part)} LV_STATE_${up(state)})`;
  return part ? `LV_PART_${up(part)}` : `LV_STATE_${up(state as string)}`;
}

export function cloneStyles<T extends { default: StyleProps }>(styles: T): T {
  const out: Record<string, StyleProps> = {};
  for (const [k, v] of Object.entries(styles)) if (v) out[k] = { ...(v as StyleProps) };
  return out as unknown as T;
}
