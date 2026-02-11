// Node Edit Dialog - Edit node parameters

import React, { useState, useCallback, useEffect } from 'react';
import { useLogicEditorStore } from './logicEditorStore';
import { useEditorStore } from '../../store/editorStore';
import type { CompareOperator, LogicOperator, MathOperator, StringOperation } from './types';
import { LVGL_EVENTS } from '../EventPanel/EventPanel';
import './NodeEditDialog.css';

interface NodeEditDialogProps {
  nodeId: string;
  onClose: () => void;
}

const COMPARE_OPERATORS: { value: CompareOperator; label: string }[] = [
  { value: '==', label: '等于 (==)' },
  { value: '!=', label: '不等于 (!=)' },
  { value: '>', label: '大于 (>)' },
  { value: '<', label: '小于 (<)' },
  { value: '>=', label: '大于等于 (>=)' },
  { value: '<=', label: '小于等于 (<=)' },
];

const LOGIC_OPERATORS: { value: LogicOperator; label: string }[] = [
  { value: 'AND', label: '与 (AND)' },
  { value: 'OR', label: '或 (OR)' },
  { value: 'NOT', label: '非 (NOT)' },
];

const MATH_OPERATORS: { value: MathOperator; label: string }[] = [
  { value: '+', label: '加 (+)' },
  { value: '-', label: '减 (-)' },
  { value: '*', label: '乘 (*)' },
  { value: '/', label: '除 (/)' },
  { value: '%', label: '取模 (%)' },
];

const STRING_OPERATIONS: { value: StringOperation; label: string }[] = [
  { value: 'concat', label: '拼接' },
  { value: 'format', label: '格式化' },
  { value: 'substring', label: '截取' },
  { value: 'length', label: '长度' },
];

const NodeEditDialog: React.FC<NodeEditDialogProps> = ({ nodeId, onClose }) => {
  const { getNode, updateNode, getVariables } = useLogicEditorStore();
  const { pages, getAllComponents } = useEditorStore();
  
  const node = getNode(nodeId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [params, setParams] = useState<Record<string, any>>(node?.params || {});
  const [label, setLabel] = useState(node?.label || '');

  const variables = getVariables();
  const allComponents = getAllComponents();

  useEffect(() => {
    if (node) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local state with node props
      setParams(node.params);
      setLabel(node.label);
    }
  }, [node]);

  const handleSave = useCallback(() => {
    updateNode(nodeId, { params, label });
    onClose();
  }, [nodeId, params, label, updateNode, onClose]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleParamChange = useCallback((key: string, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  if (!node) {
    return null;
  }

  const renderParamEditor = () => {
    switch (node.subType) {
      case 'event_trigger':
        return (
          <div className="param-group">
            <label>事件类型</label>
            <select
              value={params.eventType || 'LV_EVENT_CLICKED'}
              onChange={e => handleParamChange('eventType', e.target.value)}
            >
              {LVGL_EVENTS.map(evt => (
                <option key={evt.type} value={evt.type}>
                  {evt.label} ({evt.type})
                </option>
              ))}
            </select>
          </div>
        );

      case 'timer_trigger':
        return (
          <>
            <div className="param-group">
              <label>模式</label>
              <select
                value={params.mode || 'delay'}
                onChange={e => handleParamChange('mode', e.target.value)}
              >
                <option value="delay">延时执行</option>
                <option value="interval">周期执行</option>
              </select>
            </div>
            <div className="param-group">
              <label>时间 (毫秒)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={params.duration || 1000}
                onChange={e => handleParamChange('duration', parseInt(e.target.value) || 0)}
              />
            </div>
          </>
        );

      case 'compare':
        return (
          <div className="param-group">
            <label>比较运算符</label>
            <select
              value={params.operator || '=='}
              onChange={e => handleParamChange('operator', e.target.value)}
            >
              {COMPARE_OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        );

      case 'logic_op':
        return (
          <div className="param-group">
            <label>逻辑运算符</label>
            <select
              value={params.operator || 'AND'}
              onChange={e => handleParamChange('operator', e.target.value)}
            >
              {LOGIC_OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        );

      case 'math_op':
        return (
          <div className="param-group">
            <label>数学运算符</label>
            <select
              value={params.operator || '+'}
              onChange={e => handleParamChange('operator', e.target.value)}
            >
              {MATH_OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        );

      case 'string_op':
        return (
          <div className="param-group">
            <label>字符串操作</label>
            <select
              value={params.operation || 'concat'}
              onChange={e => handleParamChange('operation', e.target.value)}
            >
              {STRING_OPERATIONS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        );

      case 'delay':
        return (
          <div className="param-group">
            <label>延时 (毫秒)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={params.duration || 1000}
              onChange={e => handleParamChange('duration', parseInt(e.target.value) || 0)}
            />
          </div>
        );

      case 'navigate_page':
        return (
          <>
            <div className="param-group">
              <label>目标页面</label>
              <select
                value={params.targetPage || ''}
                onChange={e => handleParamChange('targetPage', e.target.value)}
              >
                <option value="">选择页面...</option>
                {pages.map(page => (
                  <option key={page.id} value={page.id}>{page.name}</option>
                ))}
              </select>
            </div>
            <div className="param-group">
              <label>动画效果</label>
              <select
                value={params.animation || 'none'}
                onChange={e => handleParamChange('animation', e.target.value)}
              >
                <option value="none">无</option>
                <option value="fade">淡入淡出</option>
                <option value="slide_left">左滑</option>
                <option value="slide_right">右滑</option>
              </select>
            </div>
          </>
        );

      case 'show_hide':
        return (
          <>
            <div className="param-group">
              <label>目标组件</label>
              <select
                value={params.targetComponent || ''}
                onChange={e => handleParamChange('targetComponent', e.target.value)}
              >
                <option value="">选择组件...</option>
                {allComponents.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="param-group">
              <label>动作</label>
              <select
                value={params.action || 'toggle'}
                onChange={e => handleParamChange('action', e.target.value)}
              >
                <option value="show">显示</option>
                <option value="hide">隐藏</option>
                <option value="toggle">切换</option>
              </select>
            </div>
          </>
        );

      case 'set_property':
      case 'get_property':
        return (
          <>
            <div className="param-group">
              <label>目标组件</label>
              <select
                value={params.targetComponent || ''}
                onChange={e => handleParamChange('targetComponent', e.target.value)}
              >
                <option value="">选择组件...</option>
                {allComponents.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name} ({comp.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="param-group">
              <label>属性</label>
              <select
                value={params.property || ''}
                onChange={e => handleParamChange('property', e.target.value)}
              >
                <option value="">选择属性...</option>
                <option value="x">X 位置</option>
                <option value="y">Y 位置</option>
                <option value="width">宽度</option>
                <option value="height">高度</option>
                <option value="visible">可见性</option>
                <option value="opacity">透明度</option>
                <option value="text">文本</option>
                <option value="value">数值</option>
              </select>
            </div>
          </>
        );

      case 'set_text':
      case 'set_value':
        return (
          <div className="param-group">
            <label>目标组件</label>
            <select
              value={params.targetComponent || ''}
              onChange={e => handleParamChange('targetComponent', e.target.value)}
            >
              <option value="">选择组件...</option>
              {allComponents.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} ({comp.type})
                </option>
              ))}
            </select>
          </div>
        );

      case 'var_read':
      case 'var_write':
        return (
          <div className="param-group">
            <label>变量</label>
            <select
              value={params.variableId || ''}
              onChange={e => handleParamChange('variableId', e.target.value)}
            >
              <option value="">选择变量...</option>
              {variables.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.type})
                </option>
              ))}
            </select>
          </div>
        );

      case 'call_function':
        return (
          <>
            <div className="param-group">
              <label>函数名</label>
              <input
                type="text"
                placeholder="my_function"
                value={params.functionName || ''}
                onChange={e => handleParamChange('functionName', e.target.value)}
              />
            </div>
            <div className="param-group">
              <label>参数说明</label>
              <textarea
                placeholder="函数参数说明..."
                value={params.description || ''}
                onChange={e => handleParamChange('description', e.target.value)}
                rows={2}
              />
            </div>
          </>
        );

      case 'c_code_block':
        return (
          <div className="param-group">
            <label>C 代码</label>
            <textarea
              className="code-textarea"
              placeholder="// 自定义 C 代码"
              value={params.code || ''}
              onChange={e => handleParamChange('code', e.target.value)}
              rows={8}
              spellCheck={false}
            />
          </div>
        );

      case 'switch':
        return (
          <div className="param-group">
            <label>分支数量</label>
            <input
              type="number"
              min="2"
              max="10"
              value={params.cases?.length || 3}
              onChange={e => {
                const count = Math.max(2, Math.min(10, parseInt(e.target.value) || 2));
                handleParamChange('cases', Array.from({ length: count }, (_, i) => i));
              }}
            />
          </div>
        );

      default:
        return (
          <div className="no-params">
            <p>此节点没有可配置的参数</p>
          </div>
        );
    }
  };

  return (
    <div className="node-edit-dialog-overlay" onClick={onClose}>
      <div className="node-edit-dialog" onClick={e => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>编辑节点</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="dialog-body">
          {/* Node Label */}
          <div className="param-group">
            <label>节点名称</label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="节点名称"
            />
          </div>

          {/* Node Type Info */}
          <div className="node-type-info">
            <span className="type-badge" style={{ backgroundColor: getNodeColor(node.type) }}>
              {node.type}
            </span>
            <span className="subtype-label">{node.subType}</span>
          </div>

          {/* Parameters */}
          <div className="params-section">
            <h4>参数</h4>
            {renderParamEditor()}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn-cancel" onClick={onClose}>取消</button>
          <button className="btn-save" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

function getNodeColor(type: string): string {
  switch (type) {
    case 'trigger': return '#4CAF50';
    case 'condition': return '#FFC107';
    case 'action': return '#2196F3';
    case 'data': return '#9C27B0';
    case 'custom': return '#607D8B';
    default: return '#666';
  }
}

export default NodeEditDialog;
