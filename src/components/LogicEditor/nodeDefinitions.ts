// Logic Node Definitions - All available node types

import type { LogicNodeDefinition } from './types';

// Color scheme for node categories
export const NODE_COLORS = {
  trigger: '#4CAF50',   // Green
  condition: '#FFC107', // Yellow/Amber
  action: '#2196F3',    // Blue
  data: '#9C27B0',      // Purple
  custom: '#607D8B',    // Gray
};

// All node definitions
export const NODE_DEFINITIONS: LogicNodeDefinition[] = [
  // ============ TRIGGER NODES (Green) ============
  {
    type: 'trigger',
    subType: 'event_trigger',
    label: '事件触发',
    description: '接收来自组件的事件',
    icon: '⚡',
    color: NODE_COLORS.trigger,
    defaultParams: {
      eventType: 'LV_EVENT_CLICKED',
    },
    inputs: [],
    outputs: [
      { name: '执行', type: 'execution' },
      { name: '事件对象', type: 'any' },
    ],
  },
  {
    type: 'trigger',
    subType: 'timer_trigger',
    label: '定时器触发',
    description: '延时或周期执行',
    icon: '⏱️',
    color: NODE_COLORS.trigger,
    defaultParams: {
      mode: 'delay', // 'delay' | 'interval'
      duration: 1000, // ms
    },
    inputs: [
      { name: '启动', type: 'execution' },
    ],
    outputs: [
      { name: '执行', type: 'execution' },
      { name: '计数', type: 'int' },
    ],
  },

  // ============ CONDITION NODES (Yellow) ============
  {
    type: 'condition',
    subType: 'if_else',
    label: 'If/Else',
    description: '条件分支',
    icon: '🔀',
    color: NODE_COLORS.condition,
    defaultParams: {},
    inputs: [
      { name: '执行', type: 'execution' },
      { name: '条件', type: 'bool' },
    ],
    outputs: [
      { name: 'True', type: 'execution' },
      { name: 'False', type: 'execution' },
    ],
  },
  {
    type: 'condition',
    subType: 'switch',
    label: 'Switch',
    description: '多分支选择',
    icon: '🔃',
    color: NODE_COLORS.condition,
    defaultParams: {
      cases: [0, 1, 2],
    },
    inputs: [
      { name: '执行', type: 'execution' },
      { name: '值', type: 'int' },
    ],
    outputs: [
      { name: 'Case 0', type: 'execution' },
      { name: 'Case 1', type: 'execution' },
      { name: 'Case 2', type: 'execution' },
      { name: 'Default', type: 'execution' },
    ],
  },
  {
    type: 'condition',
    subType: 'compare',
    label: '比较',
    description: '比较两个值',
    icon: '⚖️',
    color: NODE_COLORS.condition,
    defaultParams: {
      operator: '==',
    },
    inputs: [
      { name: 'A', type: 'any' },
      { name: 'B', type: 'any' },
    ],
    outputs: [
      { name: '结果', type: 'bool' },
    ],
  },
  {
    type: 'condition',
    subType: 'logic_op',
    label: '逻辑运算',
    description: 'AND, OR, NOT',
    icon: '🔗',
    color: NODE_COLORS.condition,
    defaultParams: {
      operator: 'AND',
    },
    inputs: [
      { name: 'A', type: 'bool' },
      { name: 'B', type: 'bool' },
    ],
    outputs: [
      { name: '结果', type: 'bool' },
    ],
  },

  // ============ ACTION NODES (Blue) ============
  {
    type: 'action',
    subType: 'set_property',
    label: '设置属性',
    description: '修改组件属性',
    icon: '🎨',
    color: NODE_COLORS.action,
    defaultParams: {
      targetComponent: '',
      property: '',
    },
    inputs: [
      { name: '执行', type: 'execution' },
      { name: '值', type: 'any' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
    ],
  },
  {
    type: 'action',
    subType: 'navigate_page',
    label: '导航页面',
    description: '切换到指定页面',
    icon: '📄',
    color: NODE_COLORS.action,
    defaultParams: {
      targetPage: '',
      animation: 'none',
    },
    inputs: [
      { name: '执行', type: 'execution' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
    ],
  },
  {
    type: 'action',
    subType: 'show_hide',
    label: '显示/隐藏',
    description: '控制组件可见性',
    icon: '👁️',
    color: NODE_COLORS.action,
    defaultParams: {
      targetComponent: '',
      action: 'toggle', // 'show' | 'hide' | 'toggle'
    },
    inputs: [
      { name: '执行', type: 'execution' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
    ],
  },
  {
    type: 'action',
    subType: 'set_text',
    label: '设置文本',
    description: '修改文本内容',
    icon: '📝',
    color: NODE_COLORS.action,
    defaultParams: {
      targetComponent: '',
    },
    inputs: [
      { name: '执行', type: 'execution' },
      { name: '文本', type: 'string' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
    ],
  },
  {
    type: 'action',
    subType: 'set_value',
    label: '设置数值',
    description: '修改数值属性',
    icon: '🔢',
    color: NODE_COLORS.action,
    defaultParams: {
      targetComponent: '',
    },
    inputs: [
      { name: '执行', type: 'execution' },
      { name: '数值', type: 'int' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
    ],
  },
  {
    type: 'action',
    subType: 'call_function',
    label: '调用函数',
    description: '调用自定义 C 函数',
    icon: '📞',
    color: NODE_COLORS.action,
    defaultParams: {
      functionName: '',
      arguments: [],
    },
    inputs: [
      { name: '执行', type: 'execution' },
      { name: '参数1', type: 'any' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
      { name: '返回值', type: 'any' },
    ],
  },
  {
    type: 'action',
    subType: 'delay',
    label: '延时',
    description: '等待指定时间',
    icon: '⏳',
    color: NODE_COLORS.action,
    defaultParams: {
      duration: 1000, // ms
    },
    inputs: [
      { name: '执行', type: 'execution' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
    ],
  },

  // ============ DATA NODES (Purple) ============
  {
    type: 'data',
    subType: 'var_read',
    label: '读取变量',
    description: '读取全局/局部变量',
    icon: '📖',
    color: NODE_COLORS.data,
    defaultParams: {
      variableId: '',
    },
    inputs: [],
    outputs: [
      { name: '值', type: 'any' },
    ],
  },
  {
    type: 'data',
    subType: 'var_write',
    label: '写入变量',
    description: '设置变量值',
    icon: '✏️',
    color: NODE_COLORS.data,
    defaultParams: {
      variableId: '',
    },
    inputs: [
      { name: '执行', type: 'execution' },
      { name: '值', type: 'any' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
    ],
  },
  {
    type: 'data',
    subType: 'math_op',
    label: '数学运算',
    description: '加减乘除取模',
    icon: '🧮',
    color: NODE_COLORS.data,
    defaultParams: {
      operator: '+',
    },
    inputs: [
      { name: 'A', type: 'float' },
      { name: 'B', type: 'float' },
    ],
    outputs: [
      { name: '结果', type: 'float' },
    ],
  },
  {
    type: 'data',
    subType: 'string_op',
    label: '字符串操作',
    description: '拼接、格式化',
    icon: '🔤',
    color: NODE_COLORS.data,
    defaultParams: {
      operation: 'concat',
    },
    inputs: [
      { name: 'A', type: 'string' },
      { name: 'B', type: 'string' },
    ],
    outputs: [
      { name: '结果', type: 'string' },
    ],
  },
  {
    type: 'data',
    subType: 'get_property',
    label: '获取属性',
    description: '读取组件当前属性值',
    icon: '🔍',
    color: NODE_COLORS.data,
    defaultParams: {
      targetComponent: '',
      property: '',
    },
    inputs: [],
    outputs: [
      { name: '值', type: 'any' },
    ],
  },

  // ============ CUSTOM NODES (Gray) ============
  {
    type: 'custom',
    subType: 'c_code_block',
    label: 'C 代码块',
    description: '嵌入自定义 C 代码',
    icon: '💻',
    color: NODE_COLORS.custom,
    defaultParams: {
      code: '// 自定义代码\n',
    },
    inputs: [
      { name: '执行', type: 'execution' },
      { name: '输入1', type: 'any' },
    ],
    outputs: [
      { name: '完成', type: 'execution' },
      { name: '输出1', type: 'any' },
    ],
  },
];

// Get node definition by subType
export function getNodeDefinition(subType: string): LogicNodeDefinition | undefined {
  return NODE_DEFINITIONS.find(def => def.subType === subType);
}

// Get nodes by category
export function getNodesByCategory(category: string): LogicNodeDefinition[] {
  return NODE_DEFINITIONS.filter(def => def.type === category);
}

// Node categories for palette
export const NODE_CATEGORIES = [
  { id: 'trigger', name: '触发', icon: '⚡', color: NODE_COLORS.trigger },
  { id: 'condition', name: '条件', icon: '🔀', color: NODE_COLORS.condition },
  { id: 'action', name: '动作', icon: '🎬', color: NODE_COLORS.action },
  { id: 'data', name: '数据', icon: '📊', color: NODE_COLORS.data },
  { id: 'custom', name: '自定义', icon: '💻', color: NODE_COLORS.custom },
];
