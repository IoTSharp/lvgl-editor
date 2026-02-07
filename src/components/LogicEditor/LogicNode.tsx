// Custom Logic Node Component for React Flow

import React, { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { LogicNode, LogicPort } from './types';
import { NODE_COLORS } from './nodeDefinitions';
import { useLogicEditorStore } from './logicEditorStore';
import './LogicNode.css';

// Port type colors
const PORT_COLORS: Record<string, string> = {
  execution: '#ffffff',
  int: '#00bcd4',
  float: '#8bc34a',
  string: '#ff9800',
  bool: '#e91e63',
  any: '#9e9e9e',
};

interface LogicNodeData {
  logicNode: LogicNode;
  onDoubleClick?: (nodeId: string) => void;
}

const LogicNodeComponent: React.FC<NodeProps> = ({ 
  data, 
  selected,
}) => {
  const nodeData = data as unknown as LogicNodeData;
  const { logicNode, onDoubleClick } = nodeData;
  const { debugState } = useLogicEditorStore();
  
  const nodeColor = NODE_COLORS[logicNode.type as keyof typeof NODE_COLORS] || '#607D8B';
  const isCurrentDebugNode = debugState.currentNodeId === logicNode.id;
  const hasBreakpoint = debugState.breakpoints.includes(logicNode.id);
  const isInExecutionPath = debugState.executionPath.includes(logicNode.id);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick?.(logicNode.id);
  }, [logicNode.id, onDoubleClick]);

  // Get node definition icon
  const getNodeIcon = () => {
    switch (logicNode.subType) {
      case 'event_trigger': return '⚡';
      case 'timer_trigger': return '⏱️';
      case 'if_else': return '🔀';
      case 'switch': return '🔃';
      case 'compare': return '⚖️';
      case 'logic_op': return '🔗';
      case 'set_property': return '🎨';
      case 'navigate_page': return '📄';
      case 'show_hide': return '👁️';
      case 'set_text': return '📝';
      case 'set_value': return '🔢';
      case 'call_function': return '📞';
      case 'delay': return '⏳';
      case 'var_read': return '📖';
      case 'var_write': return '✏️';
      case 'math_op': return '🧮';
      case 'string_op': return '🔤';
      case 'get_property': return '🔍';
      case 'c_code_block': return '💻';
      default: return '📦';
    }
  };

  return (
    <div
      className={`logic-node ${selected ? 'selected' : ''} ${isCurrentDebugNode ? 'debug-current' : ''} ${isInExecutionPath ? 'debug-path' : ''}`}
      style={{ 
        borderColor: nodeColor,
        boxShadow: isCurrentDebugNode ? `0 0 10px ${nodeColor}` : undefined,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Breakpoint indicator */}
      {hasBreakpoint && (
        <div className="breakpoint-indicator">🔴</div>
      )}

      {/* Node Header */}
      <div className="logic-node-header" style={{ backgroundColor: nodeColor }}>
        <span className="logic-node-icon">{getNodeIcon()}</span>
        <span className="logic-node-title">{logicNode.label}</span>
      </div>

      {/* Node Body */}
      <div className="logic-node-body">
        {/* Input Ports */}
        <div className="logic-node-inputs">
          {logicNode.inputs.map((input: LogicPort, index: number) => (
            <div key={input.id} className="logic-port input-port">
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                className={`port-handle ${input.type === 'execution' ? 'execution-port' : 'data-port'}`}
                style={{
                  backgroundColor: PORT_COLORS[input.type] || PORT_COLORS.any,
                  top: `${30 + index * 24}px`,
                }}
              />
              <span className="port-label">{input.name}</span>
              {/* Show debug value */}
              {debugState.isDebugging && debugState.nodeValues[logicNode.id]?.[input.id] !== undefined && (
                <span className="port-value">
                  {JSON.stringify(debugState.nodeValues[logicNode.id][input.id])}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Output Ports */}
        <div className="logic-node-outputs">
          {logicNode.outputs.map((output: LogicPort, index: number) => (
            <div key={output.id} className="logic-port output-port">
              <span className="port-label">{output.name}</span>
              {/* Show debug value */}
              {debugState.isDebugging && debugState.nodeValues[logicNode.id]?.[output.id] !== undefined && (
                <span className="port-value">
                  {JSON.stringify(debugState.nodeValues[logicNode.id][output.id])}
                </span>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                className={`port-handle ${output.type === 'execution' ? 'execution-port' : 'data-port'}`}
                style={{
                  backgroundColor: PORT_COLORS[output.type] || PORT_COLORS.any,
                  top: `${30 + index * 24}px`,
                }}
              />
            </div>
          ))}
        </div>

        {/* Node Parameters Preview */}
        {Object.keys(logicNode.params).length > 0 && (
          <div className="logic-node-params">
            {renderParamsPreview(logicNode)}
          </div>
        )}
      </div>
    </div>
  );
};

// Render a preview of node parameters
function renderParamsPreview(node: LogicNode): React.ReactNode {
  const { params, subType } = node;
  
  switch (subType) {
    case 'event_trigger':
      return <span className="param-preview">事件: {params.eventType?.replace('LV_EVENT_', '')}</span>;
    case 'timer_trigger':
      return <span className="param-preview">{params.mode === 'delay' ? '延时' : '周期'}: {params.duration}ms</span>;
    case 'compare':
      return <span className="param-preview">运算符: {params.operator}</span>;
    case 'logic_op':
      return <span className="param-preview">运算: {params.operator}</span>;
    case 'math_op':
      return <span className="param-preview">运算: {params.operator}</span>;
    case 'string_op':
      return <span className="param-preview">操作: {params.operation}</span>;
    case 'delay':
      return <span className="param-preview">延时: {params.duration}ms</span>;
    case 'show_hide':
      return <span className="param-preview">动作: {params.action}</span>;
    case 'navigate_page':
      return params.targetPage ? <span className="param-preview">页面: {params.targetPage}</span> : null;
    case 'call_function':
      return params.functionName ? <span className="param-preview">函数: {params.functionName}</span> : null;
    default:
      return null;
  }
}

export default memo(LogicNodeComponent);
