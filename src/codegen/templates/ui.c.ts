// ui.c template generator

import type { Page, LvglComponent, StyleProps, Theme, Animation, AnimationEasing } from '../../types';
import type { CodeGenOptions } from '../types';
import type { ImageResource, FontResource } from '../../resources/types';
import {
  getScreenVarName,
  getComponentVarName,
  getScreenInitFuncName,
  getScreenLoadFuncName,
  getEventHandlerName,
  colorToLvgl,
  opacityToLvgl,
  escapeCString,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCreateFunction(type: string, parentVar: string, options: CodeGenOptions, props?: Record<string, any>): string {
  const isV9 = options.lvglVersion === '9';

  const createFuncs: Record<string, string> = {
    btn: 'lv_btn_create',
    label: 'lv_label_create',
    img: isV9 ? 'lv_image_create' : 'lv_img_create',
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
  
  // Special cases with version-dependent signatures
  if (type === 'tabview') {
    if (isV9) {
      return `lv_tabview_create(${parentVar})`;
    }
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
    if (isV9) {
      return `lv_spinner_create(${parentVar})`;
    }
    const speed = props?.speed || 1000;
    const arcLength = props?.arcLength || 60;
    return `lv_spinner_create(${parentVar}, ${speed}, ${arcLength})`;
  }
  if (type === 'win') {
    if (isV9) {
      return `lv_win_create(${parentVar})`;
    }
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
  const isV9 = options.lvglVersion === '9';
  
  if (styles.bgColor) {
    if (styles.bgColor.toLowerCase() === 'transparent') {
      lines.push(`${indent}lv_obj_set_style_bg_opa(${varName}, LV_OPA_TRANSP, ${selector});`);
    } else {
      lines.push(`${indent}lv_obj_set_style_bg_color(${varName}, ${colorToLvgl(styles.bgColor)}, ${selector});`);
      lines.push(`${indent}lv_obj_set_style_bg_opa(${varName}, LV_OPA_COVER, ${selector});`);
    }
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

  // Padding four directions
  if (styles.paddingTop !== undefined) {
    lines.push(`${indent}lv_obj_set_style_pad_top(${varName}, ${styles.paddingTop}, ${selector});`);
  }
  if (styles.paddingBottom !== undefined) {
    lines.push(`${indent}lv_obj_set_style_pad_bottom(${varName}, ${styles.paddingBottom}, ${selector});`);
  }
  if (styles.paddingLeft !== undefined) {
    lines.push(`${indent}lv_obj_set_style_pad_left(${varName}, ${styles.paddingLeft}, ${selector});`);
  }
  if (styles.paddingRight !== undefined) {
    lines.push(`${indent}lv_obj_set_style_pad_right(${varName}, ${styles.paddingRight}, ${selector});`);
  }

  // Border side
  if (styles.borderSide && styles.borderSide !== 'full') {
    const borderSideMap: Record<string, string> = {
      'none': 'LV_BORDER_SIDE_NONE',
      'top': 'LV_BORDER_SIDE_TOP',
      'bottom': 'LV_BORDER_SIDE_BOTTOM',
      'left': 'LV_BORDER_SIDE_LEFT',
      'right': 'LV_BORDER_SIDE_RIGHT',
      'top_bottom': 'LV_BORDER_SIDE_TOP | LV_BORDER_SIDE_BOTTOM',
      'left_right': 'LV_BORDER_SIDE_LEFT | LV_BORDER_SIDE_RIGHT',
    };
    const sideVal = borderSideMap[styles.borderSide];
    if (sideVal) {
      lines.push(`${indent}lv_obj_set_style_border_side(${varName}, ${sideVal}, ${selector});`);
    }
  }

  // Background gradient
  if (styles.bgGradDir && styles.bgGradDir !== 'none') {
    const gradDirMap: Record<string, string> = {
      'hor': 'LV_GRAD_DIR_HOR',
      'ver': 'LV_GRAD_DIR_VER',
    };
    lines.push(`${indent}lv_obj_set_style_bg_grad_dir(${varName}, ${gradDirMap[styles.bgGradDir]}, ${selector});`);
    if (styles.bgGradColor) {
      lines.push(`${indent}lv_obj_set_style_bg_grad_color(${varName}, ${colorToLvgl(styles.bgGradColor)}, ${selector});`);
    }
    if (styles.bgGradStop !== undefined) {
      lines.push(`${indent}lv_obj_set_style_bg_grad_stop(${varName}, ${styles.bgGradStop}, ${selector});`);
    }
  }

  // Outline
  if (styles.outlineWidth !== undefined && styles.outlineWidth > 0) {
    lines.push(`${indent}lv_obj_set_style_outline_width(${varName}, ${styles.outlineWidth}, ${selector});`);
    if (styles.outlineColor) {
      lines.push(`${indent}lv_obj_set_style_outline_color(${varName}, ${colorToLvgl(styles.outlineColor)}, ${selector});`);
    }
    if (styles.outlinePad !== undefined) {
      lines.push(`${indent}lv_obj_set_style_outline_pad(${varName}, ${styles.outlinePad}, ${selector});`);
    }
  }

  // Shadow
  if (styles.shadowWidth !== undefined && styles.shadowWidth > 0) {
    lines.push(`${indent}lv_obj_set_style_shadow_width(${varName}, ${styles.shadowWidth}, ${selector});`);
    if (styles.shadowColor) {
      lines.push(`${indent}lv_obj_set_style_shadow_color(${varName}, ${colorToLvgl(styles.shadowColor)}, ${selector});`);
    }
    if (styles.shadowOffsetX !== undefined && styles.shadowOffsetX !== 0) {
      lines.push(`${indent}lv_obj_set_style_shadow_ofs_x(${varName}, ${styles.shadowOffsetX}, ${selector});`);
    }
    if (styles.shadowOffsetY !== undefined && styles.shadowOffsetY !== 0) {
      lines.push(`${indent}lv_obj_set_style_shadow_ofs_y(${varName}, ${styles.shadowOffsetY}, ${selector});`);
    }
    if (styles.shadowSpread !== undefined && styles.shadowSpread !== 0) {
      lines.push(`${indent}lv_obj_set_style_shadow_spread(${varName}, ${styles.shadowSpread}, ${selector});`);
    }
    if (styles.shadowOpacity !== undefined && styles.shadowOpacity < 255) {
      lines.push(`${indent}lv_obj_set_style_shadow_opa(${varName}, ${styles.shadowOpacity}, ${selector});`);
    }
  }

  // Transform
  if (styles.transformAngle !== undefined && styles.transformAngle !== 0) {
    if (isV9) {
      lines.push(`${indent}lv_obj_set_style_transform_rotation(${varName}, ${styles.transformAngle}, ${selector});`);
    } else {
      lines.push(`${indent}lv_obj_set_style_transform_angle(${varName}, ${styles.transformAngle}, ${selector});`);
    }
  }
  if (styles.transformZoomX !== undefined && styles.transformZoomX !== 256) {
    if (isV9) {
      lines.push(`${indent}lv_obj_set_style_transform_scale_x(${varName}, ${styles.transformZoomX}, ${selector});`);
    } else {
      lines.push(`${indent}lv_obj_set_style_transform_zoom(${varName}, ${styles.transformZoomX}, ${selector});`);
    }
  }
  if (styles.transformZoomY !== undefined && styles.transformZoomY !== 256) {
    if (isV9) {
      lines.push(`${indent}lv_obj_set_style_transform_scale_y(${varName}, ${styles.transformZoomY}, ${selector});`);
    } else {
      // v8 only has a single zoom value; use X if Y differs
      if (styles.transformZoomX === undefined || styles.transformZoomX === 256) {
        lines.push(`${indent}lv_obj_set_style_transform_zoom(${varName}, ${styles.transformZoomY}, ${selector});`);
      } else {
        lines.push(`${indent}// Note: LVGL v8 only supports uniform zoom; Y zoom ${styles.transformZoomY} ignored`);
      }
    }
  }
  if (styles.transformPivotX !== undefined && styles.transformPivotX !== 0) {
    lines.push(`${indent}lv_obj_set_style_transform_pivot_x(${varName}, ${styles.transformPivotX}, ${selector});`);
  }
  if (styles.transformPivotY !== undefined && styles.transformPivotY !== 0) {
    lines.push(`${indent}lv_obj_set_style_transform_pivot_y(${varName}, ${styles.transformPivotY}, ${selector});`);
  }

  // Text font
  if (styles.textFont) {
    const builtinMatch = styles.textFont.match(/^montserrat_(\d+)$/);
    if (builtinMatch) {
      lines.push(`${indent}lv_obj_set_style_text_font(${varName}, &lv_font_montserrat_${builtinMatch[1]}, ${selector});`);
    } else {
      // Custom font resource: variable name is cFontName_size (e.g. ui_font_noto_16)
      const fontSize = styles.textFontSize || 16;
      lines.push(`${indent}lv_obj_set_style_text_font(${varName}, &${styles.textFont}_${fontSize}, ${selector});`);
    }
  }
  if (styles.textFontSize !== undefined && styles.textFontSize !== 14) {
    lines.push(`${indent}// Note: LVGL font size is determined at compile time (requested: ${styles.textFontSize}px)`);
  }
  if (styles.textLetterSpace !== undefined && styles.textLetterSpace !== 0) {
    lines.push(`${indent}lv_obj_set_style_text_letter_space(${varName}, ${styles.textLetterSpace}, ${selector});`);
  }
  if (styles.textLineSpace !== undefined && styles.textLineSpace !== 0) {
    lines.push(`${indent}lv_obj_set_style_text_line_space(${varName}, ${styles.textLineSpace}, ${selector});`);
  }

  // Text decoration
  if (styles.textDecor && styles.textDecor !== 'none') {
    const decorMap: Record<string, string> = {
      'underline': 'LV_TEXT_DECOR_UNDERLINE',
      'strikethrough': 'LV_TEXT_DECOR_STRIKETHROUGH',
    };
    const decorVal = decorMap[styles.textDecor];
    if (decorVal) {
      lines.push(`${indent}lv_obj_set_style_text_decor(${varName}, ${decorVal}, ${selector});`);
    }
  }

  // Blend mode
  if (styles.blendMode && styles.blendMode !== 'normal') {
    const blendMap: Record<string, string> = {
      'additive': 'LV_BLEND_MODE_ADDITIVE',
      'subtractive': 'LV_BLEND_MODE_SUBTRACTIVE',
      'multiply': 'LV_BLEND_MODE_MULTIPLY',
    };
    const blendVal = blendMap[styles.blendMode];
    if (blendVal) {
      lines.push(`${indent}lv_obj_set_style_blend_mode(${varName}, ${blendVal}, ${selector});`);
    }
  }
  
  return lines;
}

/**
 * Generate component-specific property code
 */
function generatePropsCode(
  varName: string,
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>,
  options: CodeGenOptions,
  imageResources: ImageResource[] = []
): string[] {
  const lines: string[] = [];
  const indent = getIndent(options);
  const isV9 = options.lvglVersion === '9';
  
  // Common text properties for components with text
  const generateTextProps = (labelVar: string) => {
    if (props.fontResource) {
      const fontName = props.fontResource as string;
      const builtinMatch = fontName.match(/^montserrat_(\d+)$/);
      if (builtinMatch) {
        // Built-in font — use lv_font_montserrat_XX
        lines.push(`${indent}lv_obj_set_style_text_font(${labelVar}, &lv_font_${fontName}, 0);`);
      } else {
        // Custom font — append fontSize suffix
        const fontSize = props.fontSize || 16;
        lines.push(`${indent}lv_obj_set_style_text_font(${labelVar}, &${fontName}_${fontSize}, 0);`);
      }
    }
    // If no fontResource is set, the component inherits the project default font — no code needed
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
        lines.push(`${indent}lv_label_set_text(${varName}, "${escapeCString(props.text)}");`);
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
        lines.push(`${indent}lv_label_set_text(${varName}_label, "${escapeCString(props.text)}");`);
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
        lines.push(`${indent}${isV9 ? 'lv_obj_set_style_transform_rotation' : 'lv_obj_set_style_transform_angle'}(${varName}, 900, 0);`);
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
        lines.push(`${indent}${isV9 ? 'lv_obj_set_style_transform_rotation' : 'lv_obj_set_style_transform_angle'}(${varName}, 900, 0);`);
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
        lines.push(`${indent}lv_checkbox_set_text(${varName}, "${escapeCString(props.text)}");`);
      }
      if (props.checked) {
        lines.push(`${indent}lv_obj_add_state(${varName}, LV_STATE_CHECKED);`);
      }
      generateTextProps(varName);
      break;
      
    case 'switch':
      if (props.checked) {
        lines.push(`${indent}lv_obj_add_state(${varName}, LV_STATE_CHECKED);`);
      }
      break;
      
    case 'textarea':
      if (props.placeholder) {
        lines.push(`${indent}lv_textarea_set_placeholder_text(${varName}, "${escapeCString(props.placeholder)}");`);
      }
      if (props.text) {
        lines.push(`${indent}lv_textarea_set_text(${varName}, "${escapeCString(props.text)}");`);
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
      generateTextProps(varName);
      break;
      
    case 'dropdown':
      if (props.options) {
        const optionsStr = Array.isArray(props.options)
          ? props.options.map((o: string) => escapeCString(o)).join('\\n')
          : escapeCString(props.options);
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
      generateTextProps(varName);
      break;
      
    case 'img':
      if (props.src) {
        const imgSetSrc = isV9 ? 'lv_image_set_src' : 'lv_img_set_src';
        // Check if src matches a resource image (by id or name)
        const matchedImage = imageResources.find(
          (img) => img.id === props.src || img.name === props.src
        );
        if (matchedImage) {
          lines.push(`${indent}${imgSetSrc}(${varName}, &${matchedImage.cArrayName});`);
        } else {
          lines.push(`${indent}${imgSetSrc}(${varName}, &${props.src});`);
        }
      }
      if (props.rotation && props.rotation !== 0) {
        if (isV9) {
          lines.push(`${indent}lv_image_set_rotation(${varName}, ${props.rotation * 10});`);
        } else {
          lines.push(`${indent}lv_img_set_angle(${varName}, ${props.rotation * 10});`);
        }
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
      // Column widths
      if (props.columnWidths && Array.isArray(props.columnWidths)) {
        for (let i = 0; i < props.columnWidths.length; i++) {
          if (props.columnWidths[i] !== undefined) {
            lines.push(`${indent}lv_table_set_col_width(${varName}, ${i}, ${props.columnWidths[i]});`);
          }
        }
      }
      // Cell data
      if (props.cellData && Array.isArray(props.cellData)) {
        for (let r = 0; r < props.cellData.length; r++) {
          const row = props.cellData[r];
          if (Array.isArray(row)) {
            for (let c = 0; c < row.length; c++) {
              if (row[c] !== undefined && row[c] !== '') {
                lines.push(`${indent}lv_table_set_cell_value(${varName}, ${r}, ${c}, "${escapeCString(String(row[c]))}");`);
              }
            }
          }
        }
      }
      break;
      
    case 'calendar':
      if (props.year !== undefined && props.month !== undefined) {
        lines.push(`${indent}lv_calendar_set_showed_date(${varName}, ${props.year}, ${props.month});`);
      }
      if (props.showToday) {
        lines.push(`${indent}// Set today's date — update year/month/day as needed`);
        lines.push(`${indent}lv_calendar_set_today_date(${varName}, ${props.year || 2025}, ${props.month || 1}, 1);`);
      }
      if (props.highlightedDates && Array.isArray(props.highlightedDates) && props.highlightedDates.length > 0) {
        const dates = props.highlightedDates as { year: number; month: number; day: number }[];
        lines.push(`${indent}static lv_calendar_date_t ${varName}_hl_dates[] = {`);
        for (const d of dates) {
          lines.push(`${indent}    {.year = ${d.year}, .month = ${d.month}, .day = ${d.day}},`);
        }
        lines.push(`${indent}};`);
        lines.push(`${indent}lv_calendar_set_highlighted_dates(${varName}, ${varName}_hl_dates, ${dates.length});`);
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
      // Y axis range
      if (props.yAxisMin !== undefined || props.yAxisMax !== undefined) {
        lines.push(`${indent}lv_chart_set_range(${varName}, LV_CHART_AXIS_PRIMARY_Y, ${props.yAxisMin ?? 0}, ${props.yAxisMax ?? 100});`);
      }
      // Series
      if (props.series && Array.isArray(props.series) && props.series.length > 0) {
        for (let si = 0; si < props.series.length; si++) {
          const ser = props.series[si];
          const serVar = `${varName}_ser_${si}`;
          const serColor = ser.color ? colorToLvgl(ser.color) : colorToLvgl('#2196F3');
          lines.push(`${indent}lv_chart_series_t *${serVar} = lv_chart_add_series(${varName}, ${serColor}, LV_CHART_AXIS_PRIMARY_Y);`);
          if (ser.data && Array.isArray(ser.data)) {
            for (const val of ser.data) {
              lines.push(`${indent}lv_chart_set_next_value(${varName}, ${serVar}, ${val});`);
            }
          }
        }
      } else if (props.data && Array.isArray(props.data) && props.data.length > 0) {
        // Legacy single-series data
        lines.push(`${indent}lv_chart_set_point_count(${varName}, ${props.data.length});`);
        lines.push(`${indent}lv_chart_series_t *${varName}_ser = lv_chart_add_series(${varName}, ${colorToLvgl(props.lineColor || '#2196F3')}, LV_CHART_AXIS_PRIMARY_Y);`);
        const coordType = isV9 ? 'int32_t' : 'lv_coord_t';
        lines.push(`${indent}lv_chart_set_ext_y_array(${varName}, ${varName}_ser, (${coordType}[]){${props.data.join(', ')}});`);
      }
      if (props.showGrid === false) {
        lines.push(`${indent}lv_obj_set_style_line_opa(${varName}, LV_OPA_TRANSP, LV_PART_MAIN);`);
      }
      break;
      
    case 'spinner':
      if (isV9) {
        // V9: speed and arc length set via lv_spinner_set_anim_params
        const speed = props.speed || 1000;
        const arcLength = props.arcLength || 60;
        lines.push(`${indent}lv_spinner_set_anim_params(${varName}, ${speed}, ${arcLength});`);
      } else {
        // V8: speed and arc length set in create function
        if (props.speed && props.speed !== 1000) {
          lines.push(`${indent}// Note: Spinner speed ${props.speed}ms set in create function`);
        }
        if (props.arcLength && props.arcLength !== 60) {
          lines.push(`${indent}// Note: Spinner arc length ${props.arcLength}° set in create function`);
        }
      }
      break;
      
    case 'tabview':
      if (props.tabs && Array.isArray(props.tabs)) {
        if (isV9) {
          // V9: set tab bar position and size before adding tabs
          const posMap: Record<string, string> = {
            'top': 'LV_DIR_TOP',
            'bottom': 'LV_DIR_BOTTOM',
            'left': 'LV_DIR_LEFT',
            'right': 'LV_DIR_RIGHT',
          };
          const pos = posMap[props.tabPosition] || 'LV_DIR_TOP';
          lines.push(`${indent}lv_tabview_set_tab_bar_position(${varName}, ${pos});`);
          lines.push(`${indent}lv_tabview_set_tab_bar_size(${varName}, ${props.tabBarSize || 50});`);
        }
        for (let i = 0; i < props.tabs.length; i++) {
          const tab = props.tabs[i];
          if (isV9) {
            lines.push(`${indent}lv_obj_t * ${varName}_tab_${i} = lv_tabview_add_tab(${varName}, "${escapeCString(tab)}");`);
          } else {
            lines.push(`${indent}lv_tabview_add_tab(${varName}, "${escapeCString(tab)}");`);
          }
        }
      }
      if (props.activeTab !== undefined && props.activeTab > 0) {
        if (isV9) {
          lines.push(`${indent}lv_tabview_set_active(${varName}, ${props.activeTab}, LV_ANIM_OFF);`);
        } else {
          lines.push(`${indent}lv_tabview_set_act(${varName}, ${props.activeTab}, LV_ANIM_OFF);`);
        }
      }
      break;
      
    case 'tileview':
      if (props.rows !== undefined && props.cols !== undefined) {
        for (let r = 0; r < props.rows; r++) {
          for (let c = 0; c < props.cols; c++) {
            lines.push(`${indent}lv_obj_t * ${varName}_tile_${r}_${c} = lv_tileview_add_tile(${varName}, ${c}, ${r}, LV_DIR_ALL);`);
          }
        }
      }
      if (props.currentRow !== undefined || props.currentCol !== undefined) {
        lines.push(`${indent}lv_obj_set_tile_id(${varName}, ${props.currentCol || 0}, ${props.currentRow || 0}, LV_ANIM_OFF);`);
      }
      break;
      
    case 'win':
      if (props.title) {
        lines.push(`${indent}lv_win_add_title(${varName}, "${escapeCString(props.title)}");`);
      }
      if (props.headerHeight && props.headerHeight !== 40) {
        lines.push(`${indent}// Note: Window header height ${props.headerHeight}px is set in lv_win_create()`);
      }
      if (props.showCloseBtn) {
        lines.push(`${indent}${isV9 ? 'lv_win_add_button' : 'lv_win_add_btn'}(${varName}, LV_SYMBOL_CLOSE, 40);`);
      }
      if (props.headerButtons && Array.isArray(props.headerButtons)) {
        for (const btn of props.headerButtons) {
          const icon = btn.icon || 'LV_SYMBOL_SETTINGS';
          const width = btn.width || 40;
          lines.push(`${indent}${isV9 ? 'lv_win_add_button' : 'lv_win_add_btn'}(${varName}, ${icon}, ${width});`);
        }
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
        // Determine flex flow from direction + wrap
        const dir = props.flexDirection || 'row';
        const wrap = props.flexWrap === true || props.flexWrap === 'wrap';
        const flowMap: Record<string, string> = {
          'row': wrap ? 'LV_FLEX_FLOW_ROW_WRAP' : 'LV_FLEX_FLOW_ROW',
          'column': wrap ? 'LV_FLEX_FLOW_COLUMN_WRAP' : 'LV_FLEX_FLOW_COLUMN',
          'row-reverse': wrap ? 'LV_FLEX_FLOW_ROW_WRAP_REVERSE' : 'LV_FLEX_FLOW_ROW_REVERSE',
          'column-reverse': wrap ? 'LV_FLEX_FLOW_COLUMN_WRAP_REVERSE' : 'LV_FLEX_FLOW_COLUMN_REVERSE',
        };
        lines.push(`${indent}lv_obj_set_flex_flow(${varName}, ${flowMap[dir] || 'LV_FLEX_FLOW_ROW'});`);
        // Flex align
        if (props.justifyContent || props.alignItems || props.alignContent) {
          const mainMap: Record<string, string> = {
            'flex-start': 'LV_FLEX_ALIGN_START',
            'flex-end': 'LV_FLEX_ALIGN_END',
            'center': 'LV_FLEX_ALIGN_CENTER',
            'space-between': 'LV_FLEX_ALIGN_SPACE_BETWEEN',
            'space-around': 'LV_FLEX_ALIGN_SPACE_AROUND',
            'space-evenly': 'LV_FLEX_ALIGN_SPACE_EVENLY',
          };
          const crossMap: Record<string, string> = {
            'flex-start': 'LV_FLEX_ALIGN_START',
            'flex-end': 'LV_FLEX_ALIGN_END',
            'center': 'LV_FLEX_ALIGN_CENTER',
            'stretch': 'LV_FLEX_ALIGN_START',
          };
          const main = mainMap[props.justifyContent] || 'LV_FLEX_ALIGN_START';
          const cross = crossMap[props.alignItems] || 'LV_FLEX_ALIGN_START';
          const track = crossMap[props.alignContent] || 'LV_FLEX_ALIGN_START';
          lines.push(`${indent}lv_obj_set_flex_align(${varName}, ${main}, ${cross}, ${track});`);
        }
        if (props.gap) {
          lines.push(`${indent}lv_obj_set_style_pad_row(${varName}, ${props.gap}, 0);`);
          lines.push(`${indent}lv_obj_set_style_pad_column(${varName}, ${props.gap}, 0);`);
        }
      } else if (props.layout === 'grid') {
        lines.push(`${indent}lv_obj_set_layout(${varName}, LV_LAYOUT_GRID);`);
        // Parse grid columns/rows descriptors
        const coordType = isV9 ? 'int32_t' : 'lv_coord_t';
        if (props.gridColumns) {
          const cols = String(props.gridColumns).trim().split(/\s+/).filter(Boolean);
          const colValues = cols.map((c: string) => {
            if (c.endsWith('fr')) {
              const n = parseInt(c) || 1;
              return `LV_GRID_FR(${n})`;
            }
            return String(parseInt(c) || 0);
          });
          colValues.push('LV_GRID_TEMPLATE_LAST');
          lines.push(`${indent}static ${coordType} ${varName}_col_dsc[] = {${colValues.join(', ')}};`);
        }
        if (props.gridRows) {
          const rows = String(props.gridRows).trim().split(/\s+/).filter(Boolean);
          const rowValues = rows.map((r: string) => {
            if (r.endsWith('fr')) {
              const n = parseInt(r) || 1;
              return `LV_GRID_FR(${n})`;
            }
            return String(parseInt(r) || 0);
          });
          rowValues.push('LV_GRID_TEMPLATE_LAST');
          lines.push(`${indent}static ${coordType} ${varName}_row_dsc[] = {${rowValues.join(', ')}};`);
        }
        if (props.gridColumns || props.gridRows) {
          const colRef = props.gridColumns ? `${varName}_col_dsc` : 'NULL';
          const rowRef = props.gridRows ? `${varName}_row_dsc` : 'NULL';
          lines.push(`${indent}lv_obj_set_grid_dsc_array(${varName}, ${colRef}, ${rowRef});`);
        }
        if (props.gridColumnGap) {
          lines.push(`${indent}lv_obj_set_style_pad_column(${varName}, ${props.gridColumnGap}, 0);`);
        }
        if (props.gridRowGap) {
          lines.push(`${indent}lv_obj_set_style_pad_row(${varName}, ${props.gridRowGap}, 0);`);
        }
      }
      break;
  }

  // Flex child properties (applicable to any component type)
  if (props.flexGrow !== undefined && props.flexGrow > 0) {
    lines.push(`${indent}lv_obj_set_flex_grow(${varName}, ${props.flexGrow});`);
  }

  // Grid child properties (applicable to any component type)
  if (props.gridColumn !== undefined || props.gridRow !== undefined) {
    const colAlignMap: Record<string, string> = {
      'start': 'LV_GRID_ALIGN_START',
      'center': 'LV_GRID_ALIGN_CENTER',
      'end': 'LV_GRID_ALIGN_END',
      'stretch': 'LV_GRID_ALIGN_STRETCH',
    };
    const rowAlignMap = colAlignMap;
    const col = props.gridColumn ?? 0;
    const colSpan = props.gridColumnSpan ?? 1;
    const row = props.gridRow ?? 0;
    const rowSpan = props.gridRowSpan ?? 1;
    const colAlign = colAlignMap[props.gridCellAlignX] || 'LV_GRID_ALIGN_STRETCH';
    const rowAlign = rowAlignMap[props.gridCellAlignY] || 'LV_GRID_ALIGN_STRETCH';
    lines.push(`${indent}lv_obj_set_grid_cell(${varName}, ${colAlign}, ${col}, ${colSpan}, ${rowAlign}, ${row}, ${rowSpan});`);
  }
  
  return lines;
}

/**
 * Map AnimationEasing to LVGL path callback
 */
function getEasingPath(easing: AnimationEasing): string {
  const map: Record<AnimationEasing, string> = {
    linear: 'lv_anim_path_linear',
    ease_in: 'lv_anim_path_ease_in',
    ease_out: 'lv_anim_path_ease_out',
    ease_in_out: 'lv_anim_path_ease_in_out',
    overshoot: 'lv_anim_path_overshoot',
    bounce: 'lv_anim_path_bounce',
  };
  return map[easing] || 'lv_anim_path_linear';
}

/**
 * Map animation property to LVGL exec callback
 */
function getAnimExecCb(property: string, options: CodeGenOptions): string {
  const isV9 = options.lvglVersion === '9';
  const map: Record<string, string> = {
    x: '(lv_anim_exec_xcb_t)lv_obj_set_x',
    y: '(lv_anim_exec_xcb_t)lv_obj_set_y',
    width: '(lv_anim_exec_xcb_t)lv_obj_set_width',
    height: '(lv_anim_exec_xcb_t)lv_obj_set_height',
    opa: '(lv_anim_exec_xcb_t)lv_obj_set_style_opa',
    transform_zoom: isV9
      ? '(lv_anim_exec_xcb_t)lv_image_set_scale'
      : '(lv_anim_exec_xcb_t)lv_img_set_zoom',
    transform_angle: isV9
      ? '(lv_anim_exec_xcb_t)lv_image_set_rotation'
      : '(lv_anim_exec_xcb_t)lv_img_set_angle',
  };
  return map[property] || `(lv_anim_exec_xcb_t)lv_obj_set_x`;
}

/**
 * Generate animation code for a component
 */
function generateAnimationCode(
  varName: string,
  animations: Animation[],
  options: CodeGenOptions
): string[] {
  const lines: string[] = [];
  if (!animations || animations.length === 0) return lines;

  const indent = getIndent(options);

  for (let i = 0; i < animations.length; i++) {
    const anim = animations[i];
    const animVar = `${varName}_anim_${i}`;

    if (options.generateComments) {
      lines.push(`${indent}${generateComment(`Animation: ${anim.name || anim.type}`, options)}`);
    }

    lines.push(`${indent}lv_anim_t ${animVar};`);
    lines.push(`${indent}lv_anim_init(&${animVar});`);
    lines.push(`${indent}lv_anim_set_var(&${animVar}, ${varName});`);
    lines.push(`${indent}lv_anim_set_exec_cb(&${animVar}, ${getAnimExecCb(anim.property, options)});`);
    lines.push(`${indent}lv_anim_set_values(&${animVar}, ${anim.startValue}, ${anim.endValue});`);
    lines.push(`${indent}lv_anim_set_time(&${animVar}, ${anim.duration});`);

    if (anim.delay > 0) {
      lines.push(`${indent}lv_anim_set_delay(&${animVar}, ${anim.delay});`);
    }

    lines.push(`${indent}lv_anim_set_path_cb(&${animVar}, ${getEasingPath(anim.easing)});`);

    if (anim.repeat > 0) {
      lines.push(`${indent}lv_anim_set_repeat_count(&${animVar}, ${anim.repeat});`);
    }

    lines.push(`${indent}lv_anim_start(&${animVar});`);
  }

  return lines;
}

/**
 * Generate code for a single component
 */
function generateComponentCode(
  component: LvglComponent,
  parentVar: string,
  options: CodeGenOptions,
  pageName: string,
  needsPagePrefix: Set<string>,
  imageResources: ImageResource[] = []
): string[] {
  const lines: string[] = [];
  const indent = getIndent(options);
  const varName = needsPagePrefix.has(component.id)
    ? getComponentVarName(`${pageName}_${component.name}`, options)
    : getComponentVarName(component.name, options);

  // Comment
  if (options.generateComments) {
    lines.push(`${indent}${generateComment(`Create ${component.type}: ${component.name}`, options)}`);
  }

  // Create component
  lines.push(`${indent}${varName} = ${getCreateFunction(component.type, parentVar, options, component.props)};`);

  // Position and size
  lines.push(`${indent}lv_obj_set_pos(${varName}, ${component.x}, ${component.y});`);

  // Width with mode support
  if (component.widthMode === 'content') {
    lines.push(`${indent}lv_obj_set_width(${varName}, LV_SIZE_CONTENT);`);
  } else if (component.widthMode === 'percent') {
    lines.push(`${indent}lv_obj_set_width(${varName}, lv_pct(${component.width}));`);
  } else {
    // Height with mode support — check if we can use set_size for both px
    if (component.heightMode === 'content') {
      lines.push(`${indent}lv_obj_set_width(${varName}, ${component.width});`);
      lines.push(`${indent}lv_obj_set_height(${varName}, LV_SIZE_CONTENT);`);
    } else if (component.heightMode === 'percent') {
      lines.push(`${indent}lv_obj_set_width(${varName}, ${component.width});`);
      lines.push(`${indent}lv_obj_set_height(${varName}, lv_pct(${component.height}));`);
    } else {
      lines.push(`${indent}lv_obj_set_size(${varName}, ${component.width}, ${component.height});`);
    }
  }
  // If width was non-px, still need to emit height separately
  if (component.widthMode === 'content' || component.widthMode === 'percent') {
    if (component.heightMode === 'content') {
      lines.push(`${indent}lv_obj_set_height(${varName}, LV_SIZE_CONTENT);`);
    } else if (component.heightMode === 'percent') {
      lines.push(`${indent}lv_obj_set_height(${varName}, lv_pct(${component.height}));`);
    } else {
      lines.push(`${indent}lv_obj_set_height(${varName}, ${component.height});`);
    }
  }

  // Alignment
  if (component.align && component.align !== 'default') {
    const alignMap: Record<string, string> = {
      'center': 'LV_ALIGN_CENTER',
      'top_left': 'LV_ALIGN_TOP_LEFT',
      'top_mid': 'LV_ALIGN_TOP_MID',
      'top_right': 'LV_ALIGN_TOP_RIGHT',
      'bottom_left': 'LV_ALIGN_BOTTOM_LEFT',
      'bottom_mid': 'LV_ALIGN_BOTTOM_MID',
      'bottom_right': 'LV_ALIGN_BOTTOM_RIGHT',
      'left_mid': 'LV_ALIGN_LEFT_MID',
      'right_mid': 'LV_ALIGN_RIGHT_MID',
    };
    const lvAlign = alignMap[component.align];
    if (lvAlign) {
      const offX = component.alignOffsetX || 0;
      const offY = component.alignOffsetY || 0;
      lines.push(`${indent}lv_obj_align(${varName}, ${lvAlign}, ${offX}, ${offY});`);
    }
  }

  // Flags
  if (component.flags) {
    const f = component.flags;
    if (f.hidden) {
      lines.push(`${indent}lv_obj_add_flag(${varName}, LV_OBJ_FLAG_HIDDEN);`);
    }
    if (f.disabled) {
      lines.push(`${indent}lv_obj_add_state(${varName}, LV_STATE_DISABLED);`);
    }
    if (f.clickable === false) {
      lines.push(`${indent}lv_obj_clear_flag(${varName}, LV_OBJ_FLAG_CLICKABLE);`);
    }
    if (f.checkable) {
      lines.push(`${indent}lv_obj_add_flag(${varName}, LV_OBJ_FLAG_CHECKABLE);`);
    }
    if (f.scrollable === false) {
      lines.push(`${indent}lv_obj_clear_flag(${varName}, LV_OBJ_FLAG_SCROLLABLE);`);
    }
    if (f.scrollElastic === false) {
      lines.push(`${indent}lv_obj_clear_flag(${varName}, LV_OBJ_FLAG_SCROLL_ELASTIC);`);
    }
    if (f.scrollMomentum === false) {
      lines.push(`${indent}lv_obj_clear_flag(${varName}, LV_OBJ_FLAG_SCROLL_MOMENTUM);`);
    }
    if (f.scrollOnFocus === false) {
      lines.push(`${indent}lv_obj_clear_flag(${varName}, LV_OBJ_FLAG_SCROLL_ON_FOCUS);`);
    }
    if (f.snappable) {
      lines.push(`${indent}lv_obj_add_flag(${varName}, LV_OBJ_FLAG_SNAPPABLE);`);
    }
    if (f.pressLock) {
      lines.push(`${indent}lv_obj_add_flag(${varName}, LV_OBJ_FLAG_PRESS_LOCK);`);
    }
    if (f.eventBubble) {
      lines.push(`${indent}lv_obj_add_flag(${varName}, LV_OBJ_FLAG_EVENT_BUBBLE);`);
    }
    if (f.gesturesBubble) {
      lines.push(`${indent}lv_obj_add_flag(${varName}, LV_OBJ_FLAG_GESTURE_BUBBLE);`);
    }
  }

  // Scrollbar mode (not a style API)
  if (component.styles.default.scrollbarMode && component.styles.default.scrollbarMode !== 'auto') {
    const sbMap: Record<string, string> = {
      'off': 'LV_SCROLLBAR_MODE_OFF',
      'on': 'LV_SCROLLBAR_MODE_ON',
      'active': 'LV_SCROLLBAR_MODE_ACTIVE',
    };
    const sbVal = sbMap[component.styles.default.scrollbarMode];
    if (sbVal) {
      lines.push(`${indent}lv_obj_set_scrollbar_mode(${varName}, ${sbVal});`);
    }
  }

  // Styles
  const styleLines = generateStyleCode(varName, component.styles.default, options);
  lines.push(...styleLines);

  // Pressed state styles
  if (component.styles.pressed) {
    const pressedLines = generateStyleCode(varName, component.styles.pressed, options, 'LV_STATE_PRESSED');
    lines.push(...pressedLines);
  }

  // Focused state styles
  if (component.styles.focused) {
    const focusedLines = generateStyleCode(varName, component.styles.focused, options, 'LV_STATE_FOCUSED');
    lines.push(...focusedLines);
  }

  // Disabled state styles
  if (component.styles.disabled) {
    const disabledLines = generateStyleCode(varName, component.styles.disabled, options, 'LV_STATE_DISABLED');
    lines.push(...disabledLines);
  }

  // Component-specific properties
  const propLines = generatePropsCode(varName, component.type, component.props, options, imageResources);
  lines.push(...propLines);

  // Event bindings
  for (const event of component.events) {
    const handlerName = getEventHandlerName(component.name, event.eventType, options);
    lines.push(`${indent}lv_obj_add_event_cb(${varName}, ${handlerName}, ${event.eventType}, NULL);`);
  }

  // Animations
  const animLines = generateAnimationCode(varName, component.animations || [], options);
  lines.push(...animLines);

  // Visibility
  if (!component.visible) {
    lines.push(`${indent}lv_obj_add_flag(${varName}, LV_OBJ_FLAG_HIDDEN);`);
  }

  lines.push('');

  // Recursively generate children
  if (component.type === 'tabview' && component.props?.tabs?.length > 0) {
    const tabChildMap: Record<string, string[]> = component.props.tabChildMap || {};
    const childToTab: Record<string, string> = {};
    for (const [tabIndex, childIds] of Object.entries(tabChildMap)) {
      if (Array.isArray(childIds)) {
        for (const childId of childIds) {
          childToTab[childId] = `${varName}_tab_${tabIndex}`;
        }
      }
    }
    // Default fallback: unmapped children go to activeTab or tab 0
    const defaultTab = `${varName}_tab_${component.props.activeTab || 0}`;
    for (const child of component.children) {
      const tabParent = childToTab[child.id] || defaultTab;
      lines.push(...generateComponentCode(child, tabParent, options, pageName, needsPagePrefix, imageResources));
    }
  } else if (component.type === 'tileview' && component.props?.rows !== undefined && component.props?.cols !== undefined) {
    const tileChildMap: Record<string, string[]> = component.props.tileChildMap || {};
    const childToTile: Record<string, string> = {};
    for (const [tileKey, childIds] of Object.entries(tileChildMap)) {
      if (Array.isArray(childIds)) {
        const [r, c] = tileKey.split('-');
        for (const childId of childIds) {
          childToTile[childId] = `${varName}_tile_${r}_${c}`;
        }
      }
    }
    // Default fallback: unmapped children go to tile 0,0
    const defaultTile = `${varName}_tile_0_0`;
    for (const child of component.children) {
      const tileParent = childToTile[child.id] || defaultTile;
      lines.push(...generateComponentCode(child, tileParent, options, pageName, needsPagePrefix, imageResources));
    }
  } else if (component.type === 'win') {
    // Win children go into the content area
    if (component.children.length > 0) {
      lines.push(`${indent}lv_obj_t * ${varName}_content = lv_win_get_content(${varName});`);
      for (const child of component.children) {
        lines.push(...generateComponentCode(child, `${varName}_content`, options, pageName, needsPagePrefix, imageResources));
      }
    }
  } else {
    for (const child of component.children) {
      lines.push(...generateComponentCode(child, varName, options, pageName, needsPagePrefix, imageResources));
    }
  }

  return lines;
}

/**
 * Generate screen init function
 */
function generateScreenInitFunc(
  page: Page,
  options: CodeGenOptions,
  needsPagePrefix: Set<string>,
  imageResources: ImageResource[] = []
): string {
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
    lines.push(...generateComponentCode(component, screenVar, options, page.name, needsPagePrefix, imageResources));
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
 * Collect image resources that are actually referenced by components
 */
function collectUsedImages(pages: Page[], imageResources: ImageResource[]): ImageResource[] {
  if (imageResources.length === 0) return [];

  const usedIds = new Set<string>();

  const walk = (components: LvglComponent[]) => {
    for (const comp of components) {
      if (comp.type === 'img' && comp.props.src) {
        const matched = imageResources.find(
          (img) => img.id === comp.props.src || img.name === comp.props.src
        );
        if (matched) usedIds.add(matched.id);
      }
      walk(comp.children);
    }
  };

  for (const page of pages) {
    walk(page.components);
  }

  return imageResources.filter((img) => usedIds.has(img.id));
}

/**
 * Generate ui.c source file
 */
export function generateUiSource(pages: Page[], options: CodeGenOptions, theme?: Theme, imageResources: ImageResource[] = [], defaultFont?: string, fontResources: FontResource[] = []): string {
  const lines: string[] = [];
  
  // Includes
  lines.push(generateInclude('ui.h'));
  lines.push(generateInclude('ui_events.h'));

  // Collect used image resources and add extern declarations
  const usedImageResources = collectUsedImages(pages, imageResources);
  if (usedImageResources.length > 0) {
    lines.push('');
    if (options.generateComments) {
      lines.push(generateSectionHeader('Image Resource Declarations', options));
    }
    for (const img of usedImageResources) {
      lines.push(`${options.lvglVersion === '9' ? 'LV_IMAGE_DECLARE' : 'LV_IMG_DECLARE'}(${img.cArrayName});`);
    }
  }
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
  
  // Component definitions — detect cross-page name collisions
  const componentsByName = new Map<string, { comp: LvglComponent; pageName: string }[]>();
  const flatten = (components: LvglComponent[], pageName: string) => {
    for (const comp of components) {
      const existing = componentsByName.get(comp.name) || [];
      existing.push({ comp, pageName });
      componentsByName.set(comp.name, existing);
      flatten(comp.children, pageName);
    }
  };
  for (const page of pages) {
    flatten(page.components, page.name);
  }

  // Build a set of component IDs that need page-prefixed variable names
  const needsPagePrefix = new Set<string>();
  for (const [, entries] of componentsByName) {
    if (entries.length > 1) {
      // Multiple components share the same name — check if they're on different pages
      const uniquePages = new Set(entries.map(e => e.pageName));
      if (uniquePages.size > 1) {
        for (const entry of entries) {
          needsPagePrefix.add(entry.comp.id);
        }
      }
    }
  }

  const allComponents: { comp: LvglComponent; pageName: string }[] = [];
  for (const [, entries] of componentsByName) {
    allComponents.push(...entries);
  }

  if (allComponents.length > 0) {
    if (options.generateComments) {
      lines.push(generateSectionHeader('Component Definitions', options));
      lines.push('');
    }

    for (const { comp, pageName } of allComponents) {
      const varName = needsPagePrefix.has(comp.id)
        ? getComponentVarName(`${pageName}_${comp.name}`, options)
        : getComponentVarName(comp.name, options);
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
    lines.push(generateScreenInitFunc(page, options, needsPagePrefix, imageResources));
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
  
  // Set default font if configured (non-builtin default)
  if (defaultFont && defaultFont !== 'montserrat_14') {
    if (options.generateComments) {
      lines.push(`${indent}${generateComment('Set default font', options)}`);
    }
    const isBuiltin = defaultFont.match(/^montserrat_(\d+)$/);
    if (isBuiltin) {
      lines.push(`${indent}lv_obj_set_style_text_font(lv_screen_active(), &lv_font_${defaultFont}, 0);`);
    } else {
      // Custom font — find the resource to get the first available size
      const fontRes = fontResources.find(f => f.cFontName === defaultFont);
      const size = fontRes?.sizes?.[0] || 16;
      lines.push(`${indent}lv_obj_set_style_text_font(lv_screen_active(), &${defaultFont}_${size}, 0);`);
    }
    lines.push('');
  }

  // Theme initialization
  if (theme) {
    if (options.generateComments) {
      lines.push(`${indent}${generateComment('Initialize theme', options)}`);
    }
    lines.push(`${indent}lv_theme_default_init(NULL, ${colorToLvgl(theme.colors.primary)}, ${colorToLvgl(theme.colors.secondary)}, ${theme.colors.background === '#121212' ? 'true' : 'false'}, LV_FONT_DEFAULT);`);
    lines.push('');
  }
  
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
