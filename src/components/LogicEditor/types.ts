// Logic Editor Types for Phase 4

// Node Categories
export type LogicNodeCategory = 'trigger' | 'condition' | 'action' | 'data' | 'custom';

// Trigger Node Types
export type TriggerNodeType = 'event_trigger' | 'timer_trigger';

// Condition Node Types
export type ConditionNodeType = 'if_else' | 'switch' | 'compare' | 'logic_op';

// Action Node Types
export type ActionNodeType = 
  | 'set_property' 
  | 'navigate_page' 
  | 'show_hide' 
  | 'set_text' 
  | 'set_value' 
  | 'call_function' 
  | 'delay';

// Data Node Types
export type DataNodeType = 
  | 'var_read' 
  | 'var_write' 
  | 'math_op' 
  | 'string_op' 
  | 'get_property';

// Custom Node Types
export type CustomNodeType = 'c_code_block';

// All Node SubTypes
export type LogicNodeSubType = 
  | TriggerNodeType 
  | ConditionNodeType 
  | ActionNodeType 
  | DataNodeType 
  | CustomNodeType;

// Port/Pin Types for connections
export type PortDataType = 'execution' | 'int' | 'float' | 'string' | 'bool' | 'any';

// Input/Output Port Definition
export interface LogicPort {
  id: string;
  name: string;
  type: PortDataType;
  defaultValue?: any;
}

// Logic Node Definition
export interface LogicNode {
  id: string;
  type: LogicNodeCategory;
  subType: LogicNodeSubType;
  label: string;
  position: { x: number; y: number };
  params: Record<string, any>;
  inputs: LogicPort[];
  outputs: LogicPort[];
}

// Connection Types
export type ConnectionType = 'execution' | 'data';

// Logic Connection Definition
export interface LogicConnection {
  id: string;
  sourceNode: string;
  sourceOutput: string;
  targetNode: string;
  targetInput: string;
  type: ConnectionType;
}

// Variable Types
export type VariableType = 'int' | 'float' | 'string' | 'bool';

// Variable Definition
export interface LogicVariable {
  id: string;
  name: string;
  type: VariableType;
  defaultValue: any;
  description?: string;
}

// Logic Graph (complete logic flow)
export interface LogicGraph {
  id: string;
  name: string;
  description?: string;
  nodes: LogicNode[];
  connections: LogicConnection[];
  variables: LogicVariable[];
  // Link to event binding
  eventBindingId?: string;
}

// Node Definition (for palette)
export interface LogicNodeDefinition {
  type: LogicNodeCategory;
  subType: LogicNodeSubType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultParams: Record<string, any>;
  inputs: Omit<LogicPort, 'id'>[];
  outputs: Omit<LogicPort, 'id'>[];
}

// Compare Operators
export type CompareOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';

// Logic Operators
export type LogicOperator = 'AND' | 'OR' | 'NOT';

// Math Operators
export type MathOperator = '+' | '-' | '*' | '/' | '%';

// String Operations
export type StringOperation = 'concat' | 'format' | 'substring' | 'length';

// Debug State
export interface DebugState {
  isDebugging: boolean;
  currentNodeId: string | null;
  executionPath: string[];
  nodeValues: Record<string, Record<string, any>>;
  breakpoints: string[];
  isPaused: boolean;
}

// Editor State
export interface LogicEditorState {
  graphs: LogicGraph[];
  currentGraphId: string | null;
  selectedNodeIds: string[];
  clipboard: LogicNode[] | null;
  debugState: DebugState;
}
