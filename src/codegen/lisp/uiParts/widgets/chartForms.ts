import { lcolor } from '../../sexp';
import type { PropsArgs } from '../context';
import { num } from '../util';

export function chartForms({ comp, v, ctx }: PropsArgs): string[] {
  const o = ctx.options;
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.type) {
        const m: Record<string, string> = { line: 'LV_CHART_TYPE_LINE', bar: 'LV_CHART_TYPE_BAR', scatter: 'LV_CHART_TYPE_SCATTER', curve: 'LV_CHART_TYPE_CURVE', stacked: 'LV_CHART_TYPE_STACKED' };
        out.push(`(lv-chart-set-type ${v} ${m[props.type] || 'LV_CHART_TYPE_LINE'})`);
      }
      if (props.yAxisMin !== undefined || props.yAxisMax !== undefined) {
        out.push(`(lv-chart-set-axis-range ${v} LV_CHART_AXIS_PRIMARY_Y ${num(props.yAxisMin)} ${num(props.yAxisMax, 100)})`);
      }
      if (props.y2AxisMin !== undefined || props.y2AxisMax !== undefined) {
        out.push(`(lv-chart-set-axis-range ${v} LV_CHART_AXIS_SECONDARY_Y ${num(props.y2AxisMin)} ${num(props.y2AxisMax, 100)})`);
      }
      if (props.updateMode === 'circular') out.push(`(lv-chart-set-update-mode ${v} LV_CHART_UPDATE_MODE_CIRCULAR)`);
      const series: Array<{ color?: string; data?: number[]; axis?: string }> =
        Array.isArray(props.series) && props.series.length > 0
          ? props.series
          : Array.isArray(props.data) && props.data.length > 0
            ? [{ color: props.lineColor, data: props.data }]
            : [];
      if (series.length > 0) {
        const dataCount = Math.max(...series.map(s => (Array.isArray(s.data) ? s.data.length : 0)), 1);
        const count = props.pointCount ? Math.max(dataCount, Math.round(num(props.pointCount))) : dataCount;
        out.push(`(lv-chart-set-point-count ${v} ${count})`);
        series.forEach((s, i) => {
          const sv = `${v}${o.namingStyle === 'snake_case' ? '_' : '-'}ser${o.namingStyle === 'snake_case' ? '_' : '-'}${i}`;
          out.push(`(def ${sv} (lv-chart-add-series ${v} ${lcolor(s.color || '#2196F3')} ${s.axis === 'secondary' ? 'LV_CHART_AXIS_SECONDARY_Y' : 'LV_CHART_AXIS_PRIMARY_Y'}))`);
          if (Array.isArray(s.data) && s.data.length > 0) {
            out.push(`(lv-chart-set-series-values ${v} ${sv} (list ${s.data.map(n => num(n)).join(' ')}))`);
          }
        });
      }
      if (props.horDivs !== undefined || props.verDivs !== undefined) {
        out.push(`(lv-chart-set-div-line-count ${v} ${Math.max(0, Math.round(num(props.horDivs, 3)))} ${Math.max(0, Math.round(num(props.verDivs, 5)))})`);
      } else if (props.showGrid === false) out.push(`(lv-chart-set-div-line-count ${v} 0 0)`);
  return out;
}
