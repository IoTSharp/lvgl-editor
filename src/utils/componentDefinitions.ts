import type { ComponentDefinition, ComponentCategory } from '../types';

// Component Categories
export const componentCategories: ComponentCategory[] = [
  { id: 'basic', name: '基础', icon: '📦', collapsed: false },
  { id: 'input', name: '输入', icon: '✏️', collapsed: false },
  { id: 'container', name: '容器', icon: '📁', collapsed: false },
  { id: 'display', name: '显示', icon: '📊', collapsed: false },
];

// LVGL default theme colors (Light mode)
// Source: lv_theme_default.c + lv_palette.c
// color_scr = lv_palette_lighten(GREY, 4) = #F5F5F5
// color_card = white = #FFFFFF
// color_text = lv_palette_darken(GREY, 4) = #212121
// color_grey = lv_palette_lighten(GREY, 2) = #E0E0E0
// color_primary = lv_palette_main(BLUE) = #2196F3
// color_primary_muted = #2196F3 @ 20% over white ≈ #D3EAFD
//
// Card style (obj, textarea, dropdown, chart, table, calendar):
//   bgColor=#FFFFFF, borderColor=#E0E0E0, borderWidth=2, borderRadius=8, textColor=#212121

// Component Definitions
export const componentDefinitions: ComponentDefinition[] = [
  // Basic Components
  {
    type: 'btn',
    name: 'Button',
    icon: '🔘',
    category: 'basic',
    defaultWidth: 100,
    defaultHeight: 40,
    defaultProps: { text: 'Button' },
    defaultStyles: {
      default: {
        // btn style + bg_color_primary: primary bg, white text, no border
        bgColor: '#2196F3',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 8,
        textColor: '#ffffff',
        opacity: 1,
        padding: 10,
      },
    },
    isContainer: true,
  },
  {
    type: 'label',
    name: 'Label',
    icon: '🏷️',
    category: 'basic',
    defaultWidth: 80,
    defaultHeight: 24,
    defaultProps: { text: 'Label' },
    defaultStyles: {
      default: {
        // label: no background (bg_opa=0), inherits text color from parent
        bgColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },
  {
    type: 'img',
    name: 'Image',
    icon: '🖼️',
    category: 'basic',
    defaultWidth: 100,
    defaultHeight: 100,
    defaultProps: { src: '' },
    defaultStyles: {
      default: {
        // img: no special theme style, transparent bg
        bgColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },
  {
    type: 'line',
    name: 'Line',
    icon: '📏',
    category: 'basic',
    defaultWidth: 100,
    defaultHeight: 4,
    defaultProps: { points: [[0, 0], [100, 0]] },
    defaultStyles: {
      default: {
        // line: line_color = color_text, line_width = 1
        bgColor: 'transparent',
        borderColor: '#212121',
        borderWidth: 1,
        borderRadius: 0,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },

  // Input Components
  {
    type: 'textarea',
    name: 'Textarea',
    icon: '📝',
    category: 'input',
    defaultWidth: 150,
    defaultHeight: 80,
    defaultProps: { text: '', placeholder: 'Enter text...' },
    defaultStyles: {
      default: {
        // textarea: card style + pad_small
        bgColor: '#ffffff',
        borderColor: '#E0E0E0',
        borderWidth: 2,
        borderRadius: 8,
        textColor: '#212121',
        opacity: 1,
        padding: 10,
      },
    },
    isContainer: false,
  },
  {
    type: 'dropdown',
    name: 'Dropdown',
    icon: '📋',
    category: 'input',
    defaultWidth: 120,
    defaultHeight: 36,
    defaultProps: { options: ['Option 1', 'Option 2', 'Option 3'], selected: 0 },
    defaultStyles: {
      default: {
        // dropdown: card style + pad_small
        bgColor: '#ffffff',
        borderColor: '#E0E0E0',
        borderWidth: 2,
        borderRadius: 8,
        textColor: '#212121',
        opacity: 1,
        padding: 10,
      },
    },
    isContainer: false,
  },
  {
    type: 'checkbox',
    name: 'Checkbox',
    icon: '☑️',
    category: 'input',
    defaultWidth: 120,
    defaultHeight: 28,
    defaultProps: { text: 'Checkbox', checked: false },
    defaultStyles: {
      default: {
        // checkbox: no bg, pad_gap; marker has primary border + card bg
        bgColor: 'transparent',
        borderColor: '#2196F3',
        borderWidth: 2,
        borderRadius: 4,
        textColor: '#212121',
        opacity: 1,
        padding: 10,
      },
    },
    isContainer: false,
  },
  {
    type: 'switch',
    name: 'Switch',
    icon: '🔀',
    category: 'input',
    defaultWidth: 50,
    defaultHeight: 26,
    defaultProps: { checked: false },
    defaultStyles: {
      default: {
        // switch: bg_color_grey + circle; knob is white with primary color
        bgColor: '#E0E0E0',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 9999,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },
  {
    type: 'slider',
    name: 'Slider',
    icon: '🎚️',
    category: 'input',
    defaultWidth: 150,
    defaultHeight: 20,
    defaultProps: { min: 0, max: 100, value: 50 },
    defaultStyles: {
      default: {
        // slider: bg_color_primary_muted (primary@20%) + circle
        bgColor: '#D3EAFD',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 9999,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },

  // Container Components
  {
    type: 'obj',
    name: 'Container',
    icon: '📦',
    category: 'container',
    defaultWidth: 200,
    defaultHeight: 150,
    defaultProps: {},
    defaultStyles: {
      default: {
        // obj: card style — white bg, grey border
        bgColor: '#ffffff',
        borderColor: '#E0E0E0',
        borderWidth: 2,
        borderRadius: 8,
        textColor: '#212121',
        opacity: 1,
        padding: 16,
      },
    },
    isContainer: true,
  },
  {
    type: 'tabview',
    name: 'Tab View',
    icon: '📑',
    category: 'container',
    defaultWidth: 250,
    defaultHeight: 200,
    defaultProps: { 
      tabs: ['Tab 1', 'Tab 2'], 
      activeTab: 0, 
      tabPosition: 'top',
      tabChildMap: {}
    },
    defaultStyles: {
      default: {
        // tabview: scr style + pad_zero
        bgColor: '#F5F5F5',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: true,
  },
  {
    type: 'tileview',
    name: 'Tile View',
    icon: '🔲',
    category: 'container',
    defaultWidth: 200,
    defaultHeight: 200,
    defaultProps: { 
      rows: 2, 
      cols: 2, 
      currentRow: 0, 
      currentCol: 0,
      tileChildMap: {}
    },
    defaultStyles: {
      default: {
        // tileview: scr style
        bgColor: '#F5F5F5',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: true,
  },
  {
    type: 'win',
    name: 'Window',
    icon: '🪟',
    category: 'container',
    defaultWidth: 250,
    defaultHeight: 200,
    defaultProps: { 
      title: 'Window',
      headerHeight: 40,
      showCloseBtn: true,
      headerButtons: []
    },
    defaultStyles: {
      default: {
        // win: clip_corner; header=bg_color_grey, content=scr style
        bgColor: '#F5F5F5',
        borderColor: '#E0E0E0',
        borderWidth: 2,
        borderRadius: 8,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: true,
  },

  // Display Components
  {
    type: 'bar',
    name: 'Progress Bar',
    icon: '📊',
    category: 'display',
    defaultWidth: 150,
    defaultHeight: 20,
    defaultProps: { min: 0, max: 100, value: 60 },
    defaultStyles: {
      default: {
        // bar: bg_color_primary_muted (primary@20%) + circle
        bgColor: '#D3EAFD',
        borderColor: 'transparent',
        borderWidth: 0,
        borderRadius: 9999,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },
  {
    type: 'arc',
    name: 'Arc',
    icon: '🔄',
    category: 'display',
    defaultWidth: 100,
    defaultHeight: 100,
    defaultProps: { startAngle: 135, endAngle: 45, value: 60 },
    defaultStyles: {
      default: {
        // arc: arc_indic bg=#E0E0E0, indicator=#2196F3, no bg fill
        bgColor: 'transparent',
        borderColor: '#2196F3',
        borderWidth: 15,
        borderRadius: 0,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },
  {
    type: 'spinner',
    name: 'Spinner',
    icon: '⏳',
    category: 'display',
    defaultWidth: 50,
    defaultHeight: 50,
    defaultProps: { speed: 1000 },
    defaultStyles: {
      default: {
        // spinner: same as arc — arc_indic bg=#E0E0E0, indicator=#2196F3
        bgColor: 'transparent',
        borderColor: '#2196F3',
        borderWidth: 15,
        borderRadius: 0,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },
  {
    type: 'chart',
    name: 'Chart',
    icon: '📈',
    category: 'display',
    defaultWidth: 200,
    defaultHeight: 150,
    defaultProps: { 
      type: 'line', 
      series: [
        { name: '系列1', data: [10, 20, 30, 25, 40], color: '#2196F3', lineWidth: 2, pointSize: 4 }
      ],
      yAxisMin: 0,
      yAxisMax: 100,
      xLabels: [],
      showLegend: false,
      showGrid: true,
      // 保留旧字段向后兼容
      data: [10, 20, 30, 25, 40],
      lineColor: '#2196F3'
    },
    defaultStyles: {
      default: {
        // chart: card style + pad_small
        bgColor: '#ffffff',
        borderColor: '#E0E0E0',
        borderWidth: 2,
        borderRadius: 8,
        textColor: '#212121',
        opacity: 1,
        padding: 10,
      },
    },
    isContainer: false,
  },
  {
    type: 'table',
    name: 'Table',
    icon: '📋',
    category: 'display',
    defaultWidth: 200,
    defaultHeight: 150,
    defaultProps: { 
      rows: 3, 
      cols: 3, 
      cellData: [['', '', ''], ['', '', ''], ['', '', '']], 
      columnWidths: [60, 60, 60],
      headerRow: true,
      cellAligns: [['left','left','left'],['left','left','left'],['left','left','left']]
    },
    defaultStyles: {
      default: {
        // table: card + pad_zero + no_radius
        bgColor: '#ffffff',
        borderColor: '#E0E0E0',
        borderWidth: 2,
        borderRadius: 0,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },
  {
    type: 'calendar',
    name: 'Calendar',
    icon: '📅',
    category: 'display',
    defaultWidth: 220,
    defaultHeight: 220,
    defaultProps: { 
      year: 2024, 
      month: 1, 
      showDayNames: true,
      showToday: true,
      highlightedDates: [],
      dateRangeMode: false,
      rangeStart: '',
      rangeEnd: ''
    },
    defaultStyles: {
      default: {
        // calendar: card + pad_zero
        bgColor: '#ffffff',
        borderColor: '#E0E0E0',
        borderWidth: 2,
        borderRadius: 8,
        textColor: '#212121',
        opacity: 1,
        padding: 0,
      },
    },
    isContainer: false,
  },
];

// Helper function to get component definition by type
export function getComponentDefinition(type: string): ComponentDefinition | undefined {
  return componentDefinitions.find(def => def.type === type);
}

// Helper function to get components by category
export function getComponentsByCategory(categoryId: string): ComponentDefinition[] {
  return componentDefinitions.filter(def => def.category === categoryId);
}
