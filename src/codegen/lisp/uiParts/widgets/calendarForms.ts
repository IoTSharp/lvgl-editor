import { comment } from '../../sexp';
import type { PropsArgs } from '../context';
import { num } from '../util';

export function calendarForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.showToday) out.push(`(lv-calendar-set-today-date ${v} ${num(props.todayYear ?? props.year, 2025)} ${num(props.todayMonth ?? props.month, 1)} ${num(props.todayDay, 1)})`);
      if (props.year !== undefined || props.month !== undefined) out.push(`(lv-calendar-set-month-shown ${v} ${num(props.year, 2025)} ${num(props.month, 1)})`);
      if (props.headerMode === 'arrow') out.push(`(lv-calendar-add-header-arrow ${v})`);
      else if (props.headerMode === 'dropdown') out.push(`(lv-calendar-add-header-dropdown ${v})`);
      if (Array.isArray(props.highlightedDates) && props.highlightedDates.length > 0) {
        out.push(comment('highlighted dates are not exposed by the LVGL bridge'));
      }
  return out;
}
