import { lstr } from '../../sexp';
import type { PropsArgs } from '../context';
import { num } from '../util';

export function tableForms({ comp, v }: PropsArgs): string[] {
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const out: string[] = [];
      if (props.rows !== undefined) out.push(`(lv-table-set-row-count ${v} ${num(props.rows)})`);
      if (props.cols !== undefined) out.push(`(lv-table-set-column-count ${v} ${num(props.cols)})`);
      if (Array.isArray(props.columnWidths)) {
        props.columnWidths.forEach((w: unknown, i: number) => {
          if (w !== undefined) out.push(`(lv-table-set-column-width ${v} ${i} ${num(w)})`);
        });
      }
      if (Array.isArray(props.mergeRight)) {
        for (const cell of props.mergeRight as string[]) {
          const m = /^\s*(\d+)\s*,\s*(\d+)\s*$/.exec(String(cell));
          if (m) out.push(`(lv-table-set-cell-ctrl ${v} ${m[1]} ${m[2]} LV_TABLE_CELL_CTRL_MERGE_RIGHT)`);
        }
      }
      if (props.textCrop === true) {
        for (let r = 0; r < num(props.rows, 3); r++) for (let c = 0; c < num(props.cols, 3); c++) out.push(`(lv-table-set-cell-ctrl ${v} ${r} ${c} LV_TABLE_CELL_CTRL_TEXT_CROP)`);
      }
      if (Array.isArray(props.cellData)) {
        props.cellData.forEach((row: unknown, r: number) => {
          if (!Array.isArray(row)) return;
          row.forEach((cell: unknown, c: number) => {
            if (cell !== undefined && cell !== '') out.push(`(lv-table-set-cell-value ${v} ${r} ${c} ${lstr(String(cell))})`);
          });
        });
      }
  return out;
}
