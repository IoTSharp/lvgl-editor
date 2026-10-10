import { extraPropsForms } from '../extraWidgets';
import type { UiContext } from './context';
import { num } from './util';
import { arcForms } from './widgets/arcForms';
import { btnForms } from './widgets/btnForms';
import { calendarForms } from './widgets/calendarForms';
import { chartForms } from './widgets/chartForms';
import { checkboxForms } from './widgets/checkboxForms';
import { dropdownForms } from './widgets/dropdownForms';
import { imgForms } from './widgets/imgForms';
import { labelForms } from './widgets/labelForms';
import { ledForms } from './widgets/ledForms';
import { lineForms } from './widgets/lineForms';
import { objForms } from './widgets/objForms';
import { sliderBarForms } from './widgets/sliderBarForms';
import { spinnerForms } from './widgets/spinnerForms';
import { switchForms } from './widgets/switchForms';
import { tableForms } from './widgets/tableForms';
import { tabviewForms } from './widgets/tabviewForms';
import { textareaForms } from './widgets/textareaForms';
import { tileviewForms } from './widgets/tileviewForms';
import { winForms } from './widgets/winForms';
import type { LvglComponent } from '../../../types';

export function propsForms(comp: LvglComponent, v: string, ctx: UiContext): string[] {
  const o = ctx.options;
  const props = comp.props as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const args = { comp, v, ctx };
  let out: string[] = [];
  switch (comp.type) {
    case 'label': out = labelForms(args); break;
    case 'btn': out = btnForms(args); break;
    case 'led': out = ledForms(args); break;
    case 'slider': out = sliderBarForms(args); break;
    case 'bar': out = sliderBarForms(args); break;
    case 'arc': out = arcForms(args); break;
    case 'checkbox': out = checkboxForms(args); break;
    case 'switch': out = switchForms(args); break;
    case 'textarea': out = textareaForms(args); break;
    case 'dropdown': out = dropdownForms(args); break;
    case 'img': out = imgForms(args); break;
    case 'line': out = lineForms(args); break;
    case 'table': out = tableForms(args); break;
    case 'calendar': out = calendarForms(args); break;
    case 'chart': out = chartForms(args); break;
    case 'spinner': out = spinnerForms(args); break;
    case 'tabview': out = tabviewForms(args); break;
    case 'tileview': out = tileviewForms(args); break;
    case 'win': out = winForms(args); break;
    case 'obj': out = objForms(args); break;
  }

  out.push(...extraPropsForms(comp, v, o, ctx.names));
  if (props.flexGrow !== undefined && props.flexGrow > 0) out.push(`(lv-obj-set-flex-grow ${v} ${num(props.flexGrow)})`);
  return out;
}
