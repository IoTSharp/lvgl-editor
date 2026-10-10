import type { LvglComponent } from '../types';

export interface ArcStyle {
  /** thickness of the arc in px */
  width: number;
  /** colour of the indicator arc */
  color: string;
  /** colour of the background track */
  track: string;
}

/**
 * Arcs and spinners have no box border in LVGL: their look is the arc itself.
 * Projects created before the dedicated props existed stored the arc in the border style, so fall back to it.
 */
export function getArcStyle(comp: Pick<LvglComponent, 'props' | 'styles'>): ArcStyle {
  const props = comp.props ?? {};
  const legacy = comp.styles?.default ?? {};
  return {
    width: Math.max(1, Number(props.arcWidth ?? (legacy.borderWidth || 10))),
    color: String(props.arcColor ?? legacy.borderColor ?? '#2196F3'),
    track: String(props.arcTrackColor ?? '#e0e0e0'),
  };
}

export const isArcLike = (type: string) => type === 'arc' || type === 'spinner';
