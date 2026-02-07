// ui_logic.c template generator
// Generates C code from logic orchestration graphs

import type { CodeGenOptions } from '../types';
import type {
  LogicGraph,
  LogicNode,
  LogicVariable,
  LogicNodeSubType,
} from '../../components/LogicEditor/types';
import {
  generateInclude,
  generateSectionHeader,
  generateUserCodeSection,
  getIndent,
} from '../formatters/cFormatter';

/**
 * Generate ui_logic.c source file from logic graphs
 */
export function generateLogicSource(
  options: CodeGenOptions,
  graphs: LogicGraph[] = []
): string {
  const lines: string[] = [];
  
  // Includes
  lines.push(generateInclude('ui.h'));
  lines.push(generateInclude('ui_logic.h'));
  lines.push(generateInclude('string.h', true));
  lines.push(generateInclude('stdio.h', true));
  lines.push('');
  
  // Collect all variables from all graphs
  const allVariables = collectAllVariables(graphs);
  
  // Generate variable declarations
  if (options.generateComments) {
    lines.push(generateSectionHeader('Logic Variables', options));
  }
  lines.push('');
  
  if (allVariables.length > 0) {
    for (const variable of allVariables) {
      lines.push(generateVariableDeclaration(variable));
    }
    lines.push('');
  } else {
    if (options.generateComments) {
      lines.push('// No variables defined');
      lines.push('');
    }
  }
  
  // Generate logic functions for each graph
  if (options.generateComments) {
    lines.push(generateSectionHeader('Logic Functions', options));
  }
  lines.push('');
  
  if (graphs.length > 0) {
    for (const graph of graphs) {
      const functionCode = generateLogicFunction(graph, options);
      lines.push(functionCode);
      lines.push('');
    }
    
    // Generate init function
    lines.push(generateInitFunction(graphs, options));
    lines.push('');
  } else {
    if (options.generateComments) {
      lines.push('// No logic graphs defined');
      lines.push('');
    }
    lines.push('void ui_logic_init(void) {');
    lines.push(getIndent(options) + '// No logic to initialize');
    lines.push('}');
    lines.push('');
  }
  
  // User code section
  if (options.userCodeMarkers) {
    lines.push(generateUserCodeSection('logic_custom', options));
  }
  
  return lines.join('\n');
}

/**
 * Generate init function
 */
function generateInitFunction(graphs: LogicGraph[], options: CodeGenOptions): string {
  const lines: string[] = [];
  const indent = getIndent(options);
  
  if (options.generateComments) {
    lines.push('/**');
    lines.push(' * Initialize logic system');
    lines.push(' */');
  }
  lines.push('void ui_logic_init(void) {');
  
  if (graphs.length > 0) {
    lines.push(indent + '// Logic graphs initialized');
    for (const graph of graphs) {
      const functionName = toSnakeCase(`logic_${graph.name}`);
      lines.push(indent + `// - ${functionName}`);
    }
  } else {
    lines.push(indent + '// No logic graphs');
  }
  
  lines.push('}');
  return lines.join('\n');
}

/**
 * Collect all unique variables from all graphs
 */
function collectAllVariables(graphs: LogicGraph[]): LogicVariable[] {
  const variableMap = new Map<string, LogicVariable>();
  
  for (const graph of graphs) {
    for (const variable of graph.variables) {
      // Use name as key to avoid duplicates
      if (!variableMap.has(variable.name)) {
        variableMap.set(variable.name, variable);
      }
    }
  }
  
  return Array.from(variableMap.values());
}

/**
 * Generate C variable declaration
 */
function generateVariableDeclaration(variable: LogicVariable): string {
  const cType = getCType(variable.type);
  const defaultValue = formatDefaultValue(variable.type, variable.defaultValue);
  const varName = toSnakeCase(`var_${variable.name}`);
  
  return `static ${cType} ${varName} = ${defaultValue};`;
}

/**
 * Get C type from variable type
 */
function getCType(type: string): string {
  switch (type) {
    case 'int':
      return 'int32_t';
    case 'float':
      return 'float';
    case 'string':
      return 'char*';
    case 'bool':
      return 'bool';
    default:
      return 'int32_t';
  }
}

/**
 * Format default value for C
 */
function formatDefaultValue(type: string, value: unknown): string {
  switch (type) {
    case 'int':
      return String(Number(value) || 0);
    case 'float': {
      const floatVal = Number(value) || 0;
      return floatVal.toFixed(1) + 'f';
    }
    case 'string':
      return value ? `"${String(value).replace(/"/g, '\\"')}"` : '""';
    case 'bool':
      return value ? 'true' : 'false';
    default:
      return '0';
  }
}

/**
 * Convert string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/__+/g, '_')
    .replace(/^_/, '');
}

/**
 * Generate a logic function from a graph
 */
function generateLogicFunction(graph: LogicGraph, options: CodeGenOptions): string {
  const lines: string[] = [];
  const functionName = toSnakeCase(`logic_${graph.name}`);
  
  // Function comment
  if (options.generateComments) {
    lines.push(`/**`);
    lines.push(` * Logic: ${graph.name}`);
    if (graph.description) {
      lines.push(` * ${graph.description}`);
    }
    lines.push(` */`);
  }
  
  // Function signature
  lines.push(`void ${functionName}(void) {`);
  
  // Generate function body
  const body = generateFunctionBody(graph, options);
  if (body.trim()) {
    lines.push(body);
  } else {
    lines.push(getIndent(options) + '// Empty logic graph');
  }
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Generate function body from graph nodes
 */
function generateFunctionBody(graph: LogicGraph, options: CodeGenOptions): string {
  const lines: string[] = [];
  const indentStr = getIndent(options);
  
  // Find trigger nodes (entry points)
  const triggerNodes = graph.nodes.filter(n => n.type === 'trigger');
  
  if (triggerNodes.length === 0) {
    // No trigger nodes, generate code for all nodes in order
    for (const node of graph.nodes) {
      const nodeCode = generateNodeCode(node, graph, options);
      if (nodeCode) {
        lines.push(indentStr + nodeCode);
      }
    }
  } else {
    // Start from trigger nodes and follow execution flow
    const visited = new Set<string>();
    
    for (const trigger of triggerNodes) {
      const executionPath = traceExecutionPath(trigger.id, graph, visited);
      
      for (const nodeId of executionPath) {
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node) {
          const nodeCode = generateNodeCode(node, graph, options);
          if (nodeCode) {
            // Handle multi-line code
            const codeLines = nodeCode.split('\n');
            for (const codeLine of codeLines) {
              lines.push(indentStr + codeLine);
            }
          }
        }
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * Trace execution path from a starting node
 */
function traceExecutionPath(
  startNodeId: string,
  graph: LogicGraph,
  visited: Set<string>
): string[] {
  const path: string[] = [];
  let currentNodeId: string | null = startNodeId;
  
  while (currentNodeId && !visited.has(currentNodeId)) {
    visited.add(currentNodeId);
    path.push(currentNodeId);
    
    // Find execution output connection
    const currentNode = graph.nodes.find(n => n.id === currentNodeId);
    if (!currentNode) break;
    
    // Find execution output port
    const execOutput = currentNode.outputs.find(o => o.type === 'execution');
    if (!execOutput) break;
    
    // Find connection from this output
    const connection = graph.connections.find(
      c => c.sourceNode === currentNodeId && c.sourceOutput === execOutput.id
    );
    
    currentNodeId = connection?.targetNode || null;
  }
  
  return path;
}

/**
 * Generate C code for a single node
 */
function generateNodeCode(
  node: LogicNode,
  graph: LogicGraph,
  options: CodeGenOptions
): string {
  const subType = node.subType as LogicNodeSubType;
  
  switch (subType) {
    // Trigger nodes
    case 'event_trigger':
      return generateEventTriggerCode(node, options);
    case 'timer_trigger':
      return generateTimerTriggerCode(node, options);
    
    // Condition nodes
    case 'if_else':
      return generateIfElseCode(node, graph);
    case 'switch':
      return generateSwitchCode(node, graph);
    case 'compare':
    case 'logic_op':
      return ''; // These are inline expression nodes
    
    // Action nodes
    case 'set_property':
      return generateSetPropertyCode(node);
    case 'navigate_page':
      return generateNavigatePageCode(node);
    case 'show_hide':
      return generateShowHideCode(node);
    case 'set_text':
      return generateSetTextCode(node, graph);
    case 'set_value':
      return generateSetValueCode(node, graph);
    case 'call_function':
      return generateCallFunctionCode(node);
    case 'delay':
      return generateDelayCode(node);
    
    // Data nodes
    case 'var_read':
    case 'math_op':
    case 'string_op':
    case 'get_property':
      return ''; // Data nodes don't generate standalone code
    case 'var_write':
      return generateVarWriteCode(node, graph);
    
    // Custom nodes
    case 'c_code_block':
      return generateCustomCodeBlock(node);
    
    default:
      return options.generateComments ? `// Unknown node type: ${subType}` : '';
  }
}

/**
 * Get input value for a node port (traces back through connections)
 */
function getInputValue(
  node: LogicNode,
  inputName: string,
  graph: LogicGraph
): string {
  const inputPort = node.inputs.find(i => i.name === inputName);
  if (!inputPort) return '0';
  
  // Find connection to this input
  const connection = graph.connections.find(
    c => c.targetNode === node.id && c.targetInput === inputPort.id
  );
  
  if (!connection) {
    // No connection, use default value
    return inputPort.defaultValue !== undefined ? String(inputPort.defaultValue) : '0';
  }
  
  // Find source node
  const sourceNode = graph.nodes.find(n => n.id === connection.sourceNode);
  if (!sourceNode) return '0';
  
  // Generate expression based on source node type
  return generateNodeExpression(sourceNode, graph);
}

/**
 * Generate expression for a data node
 */
function generateNodeExpression(
  node: LogicNode,
  graph: LogicGraph
): string {
  switch (node.subType) {
    case 'var_read': {
      const varName = node.params.variableName || node.params.variableId || 'unknown';
      return toSnakeCase(`var_${varName}`);
    }
    
    case 'math_op': {
      const a = getInputValue(node, 'A', graph);
      const b = getInputValue(node, 'B', graph);
      const op = node.params.operator || '+';
      return `(${a} ${op} ${b})`;
    }
    
    case 'compare': {
      const a = getInputValue(node, 'A', graph);
      const b = getInputValue(node, 'B', graph);
      const op = node.params.operator || '==';
      return `(${a} ${op} ${b})`;
    }
    
    case 'logic_op': {
      const a = getInputValue(node, 'A', graph);
      const b = getInputValue(node, 'B', graph);
      const op = node.params.operator || 'AND';
      if (op === 'NOT') {
        return `(!${a})`;
      }
      const cOp = op === 'AND' ? '&&' : '||';
      return `(${a} ${cOp} ${b})`;
    }
    
    case 'string_op': {
      const a = getInputValue(node, 'A', graph);
      const b = getInputValue(node, 'B', graph);
      const operation = node.params.operation || 'concat';
      if (operation === 'concat') {
        return `/* string concat: ${a}, ${b} */`;
      }
      return a;
    }
    
    case 'get_property': {
      const target = node.params.targetComponent || 'obj';
      const prop = node.params.property || 'x';
      return `lv_obj_get_${prop}(ui_${toSnakeCase(target)})`;
    }
    
    default:
      return '0';
  }
}

// ============ Node Code Generators ============

function generateEventTriggerCode(node: LogicNode, options: CodeGenOptions): string {
  if (options.generateComments) {
    const eventType = node.params.eventType || 'LV_EVENT_CLICKED';
    return `// Event trigger: ${eventType}`;
  }
  return '';
}

function generateTimerTriggerCode(node: LogicNode, options: CodeGenOptions): string {
  if (options.generateComments) {
    const mode = node.params.mode || 'delay';
    const duration = node.params.duration || 1000;
    return `// Timer: ${mode}, ${duration}ms`;
  }
  return '';
}

function generateIfElseCode(
  node: LogicNode,
  graph: LogicGraph
): string {
  const condition = getInputValue(node, '条件', graph);
  const lines: string[] = [];
  
  lines.push(`if (${condition}) {`);
  lines.push(`    // True branch`);
  lines.push(`} else {`);
  lines.push(`    // False branch`);
  lines.push(`}`);
  
  return lines.join('\n');
}

function generateSwitchCode(
  node: LogicNode,
  graph: LogicGraph
): string {
  const value = getInputValue(node, '值', graph);
  const cases = node.params.cases || [0, 1, 2];
  const lines: string[] = [];
  
  lines.push(`switch (${value}) {`);
  for (const caseVal of cases) {
    lines.push(`    case ${caseVal}:`);
    lines.push(`        // Case ${caseVal} logic`);
    lines.push(`        break;`);
  }
  lines.push(`    default:`);
  lines.push(`        // Default logic`);
  lines.push(`        break;`);
  lines.push(`}`);
  
  return lines.join('\n');
}

function generateSetPropertyCode(node: LogicNode): string {
  const target = node.params.targetComponent || 'obj';
  const property = node.params.property || 'x';
  const targetName = `ui_${toSnakeCase(target)}`;
  
  // Generate appropriate LVGL function based on property
  switch (property) {
    case 'x':
      return `lv_obj_set_x(${targetName}, value);`;
    case 'y':
      return `lv_obj_set_y(${targetName}, value);`;
    case 'width':
      return `lv_obj_set_width(${targetName}, value);`;
    case 'height':
      return `lv_obj_set_height(${targetName}, value);`;
    case 'opacity':
      return `lv_obj_set_style_opa(${targetName}, value, LV_PART_MAIN);`;
    default:
      return `// Set property: ${property} on ${targetName}`;
  }
}

function generateNavigatePageCode(node: LogicNode): string {
  const targetPage = node.params.targetPage || 'page1';
  const animation = node.params.animation || 'none';
  const pageName = `ui_${toSnakeCase(targetPage)}`;
  
  if (animation === 'none') {
    return `lv_scr_load(${pageName});`;
  } else {
    const animType = animation === 'fade' ? 'LV_SCR_LOAD_ANIM_FADE_IN' : 'LV_SCR_LOAD_ANIM_MOVE_LEFT';
    return `lv_scr_load_anim(${pageName}, ${animType}, 300, 0, false);`;
  }
}

function generateShowHideCode(node: LogicNode): string {
  const target = node.params.targetComponent || 'obj';
  const action = node.params.action || 'toggle';
  const targetName = `ui_${toSnakeCase(target)}`;
  
  switch (action) {
    case 'show':
      return `lv_obj_clear_flag(${targetName}, LV_OBJ_FLAG_HIDDEN);`;
    case 'hide':
      return `lv_obj_add_flag(${targetName}, LV_OBJ_FLAG_HIDDEN);`;
    case 'toggle':
      return `if (lv_obj_has_flag(${targetName}, LV_OBJ_FLAG_HIDDEN)) {\n` +
             `    lv_obj_clear_flag(${targetName}, LV_OBJ_FLAG_HIDDEN);\n` +
             `} else {\n` +
             `    lv_obj_add_flag(${targetName}, LV_OBJ_FLAG_HIDDEN);\n` +
             `}`;
    default:
      return `// Unknown show/hide action: ${action}`;
  }
}

function generateSetTextCode(
  node: LogicNode,
  graph: LogicGraph
): string {
  const target = node.params.targetComponent || 'label';
  const text = getInputValue(node, '文本', graph);
  const targetName = `ui_${toSnakeCase(target)}`;
  
  return `lv_label_set_text(${targetName}, ${text});`;
}

function generateSetValueCode(
  node: LogicNode,
  graph: LogicGraph
): string {
  const target = node.params.targetComponent || 'slider';
  const value = getInputValue(node, '数值', graph);
  const targetName = `ui_${toSnakeCase(target)}`;
  
  // Determine component type and use appropriate function
  return `lv_slider_set_value(${targetName}, ${value}, LV_ANIM_ON);`;
}

function generateCallFunctionCode(node: LogicNode): string {
  const functionName = node.params.functionName || 'custom_function';
  const args = node.params.arguments || [];
  const argsStr = args.length > 0 ? args.join(', ') : '';
  
  return `${functionName}(${argsStr});`;
}

function generateDelayCode(node: LogicNode): string {
  const duration = node.params.duration || 1000;
  
  return `lv_timer_create(delay_callback, ${duration}, NULL);`;
}

function generateVarWriteCode(
  node: LogicNode,
  graph: LogicGraph
): string {
  const varName = node.params.variableName || node.params.variableId || 'unknown';
  const value = getInputValue(node, '值', graph);
  const cVarName = toSnakeCase(`var_${varName}`);
  
  return `${cVarName} = ${value};`;
}

function generateCustomCodeBlock(node: LogicNode): string {
  const code = node.params.code || '// Custom code';
  
  // Return the custom code as-is (user is responsible for correctness)
  return code.trim();
}
