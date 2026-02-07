// ui.c template generator

import type { Page, LvglComponent, StyleProps } from '../../types';
import type { CodeGenOptions } from '../types';
import {
  getScreenVarName,
  getComponentVarName,
  getScreenInitFuncName,
  getScreenLoadFuncName,
  getEventHandlerName,
  colorToLvgl,
  opacityToLvgl,
} from '../utils/nameUtils';
import {
  generateInclude,
  generateSectionHeader,
  getIndent,
  generateComment,
  generateUserCodeSection,
} from '../formatters/cFormatter';

/**
 * Get LVGL create function for component type
 */
function getCreateFunction(type: string, parentVar: string, props?: Record<string, any>): string {
  const createFuncs: Record<string, string> = {
    btn: 'lv_btn_create',
    label: 'lv_label_create',
    img: 'lv_img_create',
    line: 'lv_line_create',
    textarea: 'lv_textarea_create',
    dropdown: 'lv_dropdown_create',
    checkbox: 'lv_checkbox_create',
    switch: 'lv_switch_create',
    slider: 'lv_slider_create',
    obj: 'lv_obj_create',
    tabview: 'lv_tabview_create',
    tileview: 'lv_tileview_create',
    win: 'lv_win_create',
    bar: 'lv_bar_create',
    arc: 'lv_arc_create',
    spinner: 'lv_spinner_create',
    chart: 'lv_chart_create',
    table: 'lv_table_create',
    calendar: 'lv_calendar_create',
  };
  
  const func = createFuncs[type] || 'lv_obj_create';
  
  // Special cases for LVGL v8
  if (type === 'tabview') {
    const position = props?.tabPosition || 'top';
    const dirMap: Record<string, string> = {
      'top': 'LV_DIR_TOP',
      'bottom': 'LV_DIR_BOTTOM',
      'left': 'LV_DIR_LEFT',
      'right': 'LV_DIR_RIGHT',
    };
    return `lv_tabview_create(${parentVar}, ${dirMap[position] || 'LV_DIR_TOP'}, 50)`;
  }
  if (type === 'spinner') {
    const speed = props?.speed || 1000;
    const arcLength = props?.arcLength || 60;
    return `lv_spinner_create(${parentVar}, ${speed}, ${arcLength})`;
  }
  if (type === 'win') {
    return `lv_win_create(${parentVar}, 40)`;
  }
  
  return `${func}(${parentVar})`;
}

/**
 * Generate style code for a component
 */
function generateStyleCode(
  varName: string,
  styles: StyleProps,
  options: CodeGenOptions,
  selector: string = '0'
): string[] {
  const lines: string[] = [];
  const indent = getIndent(options);
  
  if (styles.bgColor) {
    lines.push(`${indent}lv_obj_set_style_bg_color(${varName}, ${colorToLvgl(styles.bgColor)}, ${selector});`);
    lines.push(`${indent}lv_obj_set_style_bg_opa(${varName}, LV_OPA_COVER, ${selector});`);
  }
  
  if (styles.borderColor) {
    lines.push(`${indent}lv_obj_set_style_border_color(${varName}, ${colorToLvgl(styles.borderColor)}, ${selector});`);
  }
  
  if (styles.borderWidth !== undefined) {
    lines.push(`${indent}lv_obj_set_style_border_width(${varName}, ${styles.borderWidth}, ${selector});`);
  }
  
  if (styles.borderRadius !== undefined) {
    lines.push(`${indent}lv_obj_set_style_radius(${varName}, ${styles.borderRadius}, ${selector});`);
  }
  
  if (styles.textColor) {
    lines.push(`${indent}lv_obj_set_style_text_color(${varName}, ${colorToLvgl(styles.textColor)}, ${selector});`);
  }
  
  if (styles.opacity !== undefined && styles.opacity < 1) {
    lines.push(`${indent}lv_obj_set_style_opa(${varName}, ${opacityToLvgl(styles.opacity)}, ${selector});`);
  }
  
  if (styles.padding !== undefined) {
    lines.push(`${indent}lv_obj_set_style_pad_all(${varName}, ${styles.padding}, ${selector});`);
  }
  
  return lines;
}

/**
 * Generate component-specific property code
 */
function generatePropsCode(
  varName: string,
  type: string,
  props: Record<string, any>,
  options: CodeGenOptions
): string[] {
  const lines: string[] = [];
  const indent = getIndent(options);
  
  // Common text properties for components with text
  const generateTextProps = (labelVar: string) => {
    if (props.fontSize && props.fontSize !== 14) {
      lines.push(`${indent}lv_obj_set_style_text_font(${labelVar}, &lv_font_montserrat_${props.fontSize}, 0);`);
    }
    if (props.textAlign) {
      const alignMap: Record<string, string> = {
        'left': 'LV_TEXT_ALIGN_LEFT',
        'center': 'LV_TEXT_ALIGN_CENTER',
        'right': 'LV_TEXT_ALIGN_RIGHT',
      };
      lines.push(`${indent}lv_obj_set_style_text_align(${labelVar}, ${alignMap[props.textAlign] || 'LV_TEXT_ALIGN_CENTER'}, 0);`);
    }
  };
  
  switch (type) {
    case 'label':
      if (props.text) {
        lines.push(`${indent}lv_label_set_text(${varName}, "${props.text}");`);
      }
      if (props.longMode) {
        const longModeMap: Record<string, string> = {
          'wrap': 'LV_LABEL_LONG_WRAP',
          'scroll': 'LV_LABEL_LONG_SCROLL',
          'dot': 'LV_LABEL_LONG_DOT',
          'clip': 'LV_LABEL_LONG_CLIP',
        };
        lines.push(`${indent}lv_label_set_long_mode(${varName}, ${longModeMap[props.longMode] || 'LV_LABEL_LONG_WRAP'});`);
      }
      generateTextProps(varName);
      break;
      
    case 'btn':
      if (props.text) {
        // Create a label inside the button
        lines.push(`${indent}lv_obj_t *${varName}_label = lv_label_create(${varName});`);
        lines.push(`${indent}lv_label_set_text(${varName}_label, "${props.text}");`);
        lines.push(`${indent}lv_obj_center(${varName}_label);`);
        generateTextProps(`${varName}_label`);
      }
      break;
      
    case 'slider':
      if (props.min !== undefined || props.max !== undefined) {
        lines.push(`${indent}lv_slider_set_range(${varName}, ${props.min ?? 0}, ${props.max ?? 100});`);
      }
      if (props.value !== undefined) {
        lines.push(`${indent}lv_slider_set_value(${varName}, ${props.value}, LV_ANIM_OFF);`);
      }
      if (props.step && props.step > 1) {
        lines.push(`${indent}lv_slider_set_mode(${varName}, LV_SLIDER_MODE_NORMAL);`);
        lines.push(`${indent}// Note: Step size needs custom handling in event callback`);
      }
      if (props.orientation === 'vertical') {
        lines.push(`${indent}lv_obj_set_style_transform_angle(${varName}, 900, 0);`);
      }
      break;
      
    case 'bar':
      if (props.min !== undefined || props.max !== undefined) {
        lines.push(`${indent}lv_bar_set_range(${varName}, ${props.min ?? 0}, ${props.max ?? 100});`);
      }
      if (props.value !== undefined) {
        lines.push(`${indent}lv_bar_set_value(${varName}, ${props.value}, LV_ANIM_OFF);`);
      }
      if (props.orientation === 'vertical') {
        lines.push(`${indent}lv_obj_set_style_transform_angle(${varName}, 900, 0);`);
      }
      break;
      
    case 'arc':
      if (props.startAngle !== undefined || props.endAngle !== undefined) {
        lines.push(`${indent}lv_arc_set_bg_angles(${varName}, ${props.startAngle ?? 135}, ${props.endAngle ?? 45});`);
      }
      if (props.min !== undefined || props.max !== undefined) {
        lines.push(`${indent}lv_arc_set_range(${varName}, ${props.min ?? 0}, ${props.max ?? 100});`);
      }
      if (props.value !== undefined) {
        lines.push(`${indent}lv_arc_set_value(${varName}, ${props.value});`);
      }
      if (props.mode) {
        const modeMap: Record<string, string> = {
          'normal': 'LV_ARC_MODE_NORMAL',
          'symmetrical': 'LV_ARC_MODE_SYMMETRICAL',
          'reverse': 'LV_ARC_MODE_REVERSE',
        };
        lines.push(`${indent}lv_arc_set_mode(${varName}, ${modeMap[props.mode] || 'LV_ARC_MODE_NORMAL'});`);
      }
      break;
      
    case 'checkbox':
      if (props.text) {
        lines.push(`${indent}lv_checkbox_set_text(${varName}, "${props.text}");`);
      }
      if (props.checked) {
        lines.push(`${indent}lv_obj_add_state(${varName}, LV_STATE_CHECKED);`);
      }
      break;
      
    case 'switch':
      if (props.checked) {
        lines.push(`${indent}lv_obj_add_state(${varName}, LV_STATE_CHECKED);`);
      }
      break;
      
    case 'textarea':
      if (props.placeholder) {
        lines.push(`${indent}lv_textarea_set_placeholder_text(${varName}, "${props.placeholder}");`);
      }
      if (props.text) {
        lines.push(`${indent}lv_textarea_set_text(${varName}, "${props.text}");`);
      }
      if (props.maxLength && props.maxLength > 0) {
        lines.push(`${indent}lv_textarea_set_max_length(${varName}, ${props.maxLength});`);
      }
      if (props.password) {
        lines.push(`${indent}lv_textarea_set_password_mode(${varName}, true);`);
      }
      if (props.oneLine) {
        lines.push(`${indent}lv_textarea_set_one_line(${varName}, true);`);
      }
      break;
      
    case 'dropdown':
      if (props.options) {
        const optionsStr = Array.isArray(props.options) 
          ? props.options.join('\\n') 
          : props.options;
        lines.push(`${indent}lv_dropdown_set_options(${varName}, "${optionsStr}");`);
      }
      if (props.selected !== undefined) {
        lines.push(`${indent}lv_dropdown_set_selected(${varName}, ${props.selected});`);
      }
      if (props.direction) {
        const dirMap: Record<string, string> = {
          'down': 'LV_DIR_BOTTOM',
          'up': 'LV_DIR_TOP',
        };
        lines.push(`${indent}lv_dropdown_set_dir(${varName}, ${dirMap[props.direction] || 'LV_DIR_BOTTOM'});`);
      }
      break;
      
    case 'img':
      if (props.src) {
        lines.push(`${indent}lv_img_set_src(${varName}, &${props.src});`);
      }
      if (props.rotation && props.rotation !== 0) {
        lines.push(`${indent}lv_img_set_angle(${varName}, ${props.rotation * 10});`);
      }
      if (props.scaleMode === 'cover' || props.scaleMode === 'contain') {
        lines.push(`${indent}// Note: Scale mode "${props.scaleMode}" needs custom implementation`);
      }
      break;
      
    case 'line':
      if (props.lineWidth && props.lineWidth !== 2) {
        lines.push(`${indent}lv_obj_set_style_line_width(${varName}, ${props.lineWidth}, 0);`);
      }
      if (props.lineColor) {
        lines.push(`${indent}lv_obj_set_style_line_color(${varName}, ${colorToLvgl(props.lineColor)}, 0);`);
      }
      break;
      
    case 'table':
      if (props.rows !== undefined) {
        lines.push(`${indent}lv_table_set_row_cnt(${varName}, ${props.rows});`);
      }
      if (props.cols !== undefined) {
        lines.push(`${indent}lv_table_set_col_cnt(${varName}, ${props.cols});`);
      }
      break;
      
    case 'calendar':
      if (props.year !== undefined && props.month !== undefined) {
        lines.push(`${indent}lv_calendar_set_showed_date(${varName}, ${props.year}, ${props.month});`);
      }
      if (props.showDayNames === false) {
        lines.push(`${indent}// Note: Day names visibility needs custom header configuration`);
      }
      break;
      
    case 'chart':
      if (props.type) {
        const chartTypeMap: Record<string, string> = {
          'line': 'LV_CHART_TYPE_LINE',
          'bar': 'LV_CHART_TYPE_BAR',
          'scatter': 'LV_CHART_TYPE_SCATTER',
        };
        lines.push(`${indent}lv_chart_set_type(${varName}, ${chartTypeMap[props.type] || 'LV_CHART_TYPE_LINE'});`);
      }
      if (props.data && Array.isArray(props.data) && props.data.length > 0) {
        lines.push(`${indent}lv_chart_set_point_count(${varName}, ${props.data.length});`);
        lines.push(`${indent}lv_chart_series_t *${varName}_ser = lv_chart_add_series(${varName}, ${colorToLvgl(props.lineColor || '#2196F3')}, LV_CHART_AXIS_PRIMARY_Y);`);
        lines.push(`${indent}lv_chart_set_ext_y_array(${varName}, ${varName}_ser, (lv_coord_t[]){${props.data.join(', ')}});`);
      }
      if (props.showGrid === false) {
        lines.push(`${indent}lv_obj_set_style_line_opa(${varName}, LV_OPA_TRANSP, LV_PART_MAIN);`);
      }
      break;
      
    case 'spinner':
      // Spinner properties are set in create function
      if (props.speed && props.speed !== 1000) {
        lines.push(`${indent}// Note: Spinner speed ${props.speed}ms set in create function`);
      }
      if (props.arcLength && props.arcLength !== 60) {
        lines.push(`${indent}// Note: Spinner arc length ${props.arcLength}° set in create function`);
      }
      break;
      
    case 'tabview':
      if (props.tabs && Array.isArray(props.tabs)) {
        for (const tab of props.tabs) {
          lines.push(`${indent}lv_tabview_add_tab(${varName}, "${tab}");`);
        }
      }
      if (props.activeTab !== undefined && props.activeTab > 0) {
        lines.push(`${indent}lv_tabview_set_act(${varName}, ${props.activeTab}, LV_ANIM_OFF);`);
      }
      break;
      
    case 'tileview':
      if (props.rows !== undefined && props.cols !== undefined) {
        for (let r = 0; r < props.rows; r++) {
          for (let c = 0; c < props.cols; c++) {
            lines.push(`${indent}lv_tileview_add_tile(${varName}, ${c}, ${r}, LV_DIR_ALL);`);
          }
        }
      }
      if (props.currentRow !== undefined || props.currentCol !== undefined) {
        lines.push(`${indent}lv_obj_set_tile_id(${varName}, ${props.currentCol || 0}, ${props.currentRow || 0}, LV_ANIM_OFF);`);
      }
      break;
      
    case 'win':
      if (props.title) {
        lines.push(`${indent}lv_win_add_title(${varName}, "${props.title}");`);
      }
      break;
      
    case 'obj':
      if (props.scrollDir) {
        const scrollDirMap: Record<string, string> = {
          'none': 'LV_DIR_NONE',
          'hor': 'LV_DIR_HOR',
          'ver': 'LV_DIR_VER',
          'all': 'LV_DIR_ALL',
        };
        lines.push(`${indent}lv_obj_set_scroll_dir(${varName}, ${scrollDirMap[props.scrollDir] || 'LV_DIR_NONE'});`);
      }
      if (props.layout === 'flex') {
        lines.push(`${indent}lv_obj_set_layout(${varName}, LV_LAYOUT_FLEX);`);
        if (props.flexDirection === 'column') {
          lines.push(`${indent}lv_obj_set_flex_flow(${varName}, LV_FLEX_FLOW_COLUMN);`);
        } else {
          lines.push(`${indent}lv_obj_set_flex_flow(${varName}, LV_FLEX_FLOW_ROW);`);
        }
        if (props.gap) {
          lines.push(`${indent}lv_obj_set_style_pad_row(${varName}, ${props.gap}, 0);`);
          lines.push(`${indent}lv_obj_set_style_pad_column(${varName}, ${props.gap}, 0);`);
        }
      } else if (props.layout === 'grid') {
        lines.push(`${indent}lv_obj_set_layout(${varName}, LV_LAYOUT_GRID);`);
        lines.push(`${indent}// Note: Grid layout needs column/row descriptors`);
      }
      break;
  }
  
  return lines;
}

/**
 * Generate code for a single component
 */
function generateComponentCode(
  component: LvglComponent,
  parentVar: string,
  options: CodeGenOptions
): string[] {
  const lines: string[] = [];
  const indent = getIndent(options);
  const varName = getComponentVarName(component.name, options);
  
  // Comment
  if (options.generateComments) {
    lines.push(`${indent}${generateComment(`Create ${component.type}: ${component.name}`, options)}`);
  }
  
  // Create component
  lines.push(`${indent}${varName} = ${getCreateFunction(component.type, parentVar, component.props)};`);
  
  // Position and size
  lines.push(`${indent}lv_obj_set_pos(${varName}, ${component.x}, ${component.y});`);
  lines.push(`${indent}lv_obj_set_size(${varName}, ${component.width}, ${component.height});`);
  
  // Styles
  const styleLines = generateStyleCode(varName, component.styles.default, options);
  lines.push(...styleLines);
  
  // Pressed state styles
  if (component.styles.pressed) {
    const pressedLines = generateStyleCode(varName, component.styles.pressed, options, 'LV_STATE_PRESSED');
    lines.push(...pressedLines);
  }
  
  // Component-specific properties
  const propLines = generatePropsCode(varName, component.type, component.props, options);
  lines.push(...propLines);
  
  // Event bindings
  for (const event of component.events) {
    const handlerName = getEventHandlerName(component.name, event.eventType, options);
    lines.push(`${indent}lv_obj_add_event_cb(${varName}, ${handlerName}, ${event.eventType}, NULL);`);
  }
  
  // Visibility
  if (!component.visible) {
    lines.push(`${indent}lv_obj_add_flag(${varName}, LV_OBJ_FLAG_HIDDEN);`);
  }
  
  lines.push('');
  
  // Recursively generate children
  for (const child of component.children) {
    lines.push(...generateComponentCode(child, varName, options));
  }
  
  return lines;
}

/**
 * Generate screen init function
 */
function generateScreenInitFunc(page: Page, options: CodeGenOptions): string {
  const lines: string[] = [];
  const indent = getIndent(options);
  const screenVar = getScreenVarName(page.name, options);
  const funcName = getScreenInitFuncName(page.name, options);
  
  lines.push(`static void ${funcName}(void) {`);
  
  // Create screen
  if (options.generateComments) {
    lines.push(`${indent}${generateComment(`Create screen: ${page.name}`, options)}`);
  }
  lines.push(`${indent}${screenVar} = lv_obj_create(NULL);`);
  
  // Screen background color
  if (page.backgroundColor) {
    lines.push(`${indent}lv_obj_set_style_bg_color(${screenVar}, ${colorToLvgl(page.backgroundColor)}, 0);`);
  }
  lines.push('');
  
  // Generate components
  for (const component of page.components) {
    lines.push(...generateComponentCode(component, screenVar, options));
  }
  
  // User code section
  if (options.userCodeMarkers) {
    lines.push(`${indent}${generateUserCodeSection(`${page.name}_init`, options)}`);
  }
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Generate screen load function
 */
function generateScreenLoadFunc(page: Page, options: CodeGenOptions): string {
  const indent = getIndent(options);
  const screenVar = getScreenVarName(page.name, options);
  const funcName = getScreenLoadFuncName(page.name, options);
  
  return [
    `void ${funcName}(void) {`,
    `${indent}lv_scr_load_anim(${screenVar}, LV_SCR_LOAD_ANIM_FADE_ON, 300, 0, false);`,
    '}',
  ].join('\n');
}

/**
 * Generate ui.c source file
 */
export function generateUiSource(pages: Page[], options: CodeGenOptions): string {
  const lines: string[] = [];
  
  // Includes
  lines.push(generateInclude('ui.h'));
  lines.push(generateInclude('ui_events.h'));
  lines.push('');
  
  // Screen definitions
  if (options.generateComments) {
    lines.push(generateSectionHeader('Screen Definitions', options));
    lines.push('');
  }
  
  for (const page of pages) {
    const varName = getScreenVarName(page.name, options);
    lines.push(`lv_obj_t *${varName};`);
  }
  lines.push('');
  
  // Component definitions
  const allComponents: LvglComponent[] = [];
  const flatten = (components: LvglComponent[]) => {
    for (const comp of components) {
      allComponents.push(comp);
      flatten(comp.children);
    }
  };
  for (const page of pages) {
    flatten(page.components);
  }
  
  if (allComponents.length > 0) {
    if (options.generateComments) {
      lines.push(generateSectionHeader('Component Definitions', options));
      lines.push('');
    }
    
    for (const component of allComponents) {
      const varName = getComponentVarName(component.name, options);
      lines.push(`lv_obj_t *${varName};`);
    }
    lines.push('');
  }
  
  // Screen init functions (static)
  if (options.generateComments) {
    lines.push(generateSectionHeader('Screen Init Functions', options));
    lines.push('');
  }
  
  for (const page of pages) {
    lines.push(generateScreenInitFunc(page, options));
    lines.push('');
  }
  
  // Screen load functions
  if (options.generateComments) {
    lines.push(generateSectionHeader('Screen Load Functions', options));
    lines.push('');
  }
  
  for (const page of pages) {
    lines.push(generateScreenLoadFunc(page, options));
    lines.push('');
  }
  
  // Main init function
  if (options.generateComments) {
    lines.push(generateSectionHeader('Main Init Function', options));
    lines.push('');
  }
  
  const indent = getIndent(options);
  lines.push('void ui_init(void) {');
  
  // Initialize all screens
  for (const page of pages) {
    const initFunc = getScreenInitFuncName(page.name, options);
    lines.push(`${indent}${initFunc}();`);
  }
  lines.push('');
  
  // Load first screen
  if (pages.length > 0) {
    const loadFunc = getScreenLoadFuncName(pages[0].name, options);
    lines.push(`${indent}${loadFunc}();`);
  }
  
  // User code section
  if (options.userCodeMarkers) {
    lines.push('');
    lines.push(`${indent}${generateUserCodeSection('ui_init', options)}`);
  }
  
  lines.push('}');
  
  return lines.join('\n');
}
