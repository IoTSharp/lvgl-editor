import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '../../store/editorStore';
import type { EventBinding, LvglEventType, BuiltinActionType, BuiltinAction } from '../../types';
import { LVGL_EVENTS } from './EventPanel';
import CodeEditor from './CodeEditor';
import './EventEditDialog.css';

interface EventEditDialogProps {
  event: EventBinding | null;
  isCreating: boolean;
  onSave: (event: EventBinding) => void;
  onClose: () => void;
}

const BUILTIN_ACTIONS: { type: BuiltinActionType; label: string; description: string }[] = [
  { type: 'navigate', label: '导航到页面', description: '切换到指定页面' },
  { type: 'setProperty', label: '设置属性', description: '设置组件的属性值' },
  { type: 'show', label: '显示组件', description: '显示指定组件' },
  { type: 'hide', label: '隐藏组件', description: '隐藏指定组件' },
  { type: 'enable', label: '启用组件', description: '启用指定组件' },
  { type: 'disable', label: '禁用组件', description: '禁用指定组件' },
  { type: 'setText', label: '设置文本', description: '设置组件的文本内容' },
  { type: 'setValue', label: '设置数值', description: '设置组件的数值' },
];

const CODE_TEMPLATE = `// 事件处理代码
// 可用变量: e (lv_event_t*), obj (触发事件的对象)

// 示例: 打印日志
// LV_LOG_USER("Button clicked!");

// 示例: 修改标签文本
// lv_label_set_text(my_label, "Clicked!");

`;

const EventEditDialog: React.FC<EventEditDialogProps> = ({
  event,
  isCreating,
  onSave,
  onClose,
}) => {
  const { pages, currentPageId, getAllComponents } = useEditorStore();
  
  // Suppress unused variable warning - currentPageId is used for reactivity
  void currentPageId;
  
  // Form state
  const [eventType, setEventType] = useState<LvglEventType>(
    event?.eventType || 'LV_EVENT_CLICKED'
  );
  const [handlerType, setHandlerType] = useState<'builtin' | 'custom'>(
    event?.handlerType || 'builtin'
  );
  const [actionType, setActionType] = useState<BuiltinActionType>(
    event?.action?.type || 'navigate'
  );
  const [targetPage, setTargetPage] = useState(event?.action?.targetPage || '');
  const [targetComponent, setTargetComponent] = useState(event?.action?.targetComponent || '');
  const [property, setProperty] = useState(event?.action?.property || '');
  const [value, setValue] = useState<string>(
    event?.action?.value !== undefined ? String(event.action.value) : ''
  );
  const [customCode, setCustomCode] = useState(event?.customCode || CODE_TEMPLATE);
  const [showCodePreview, setShowCodePreview] = useState(false);

  // Get all components for target selection
  const allComponents = getAllComponents ? getAllComponents() : [];

  // Reset action fields when action type changes
  useEffect(() => {
    if (!event) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset fields when action type changes
      setTargetPage('');
      setTargetComponent('');
      setProperty('');
      setValue('');
    }
  }, [actionType, event]);

  const handleSave = useCallback(() => {
    const newEvent: EventBinding = {
      id: event?.id || uuidv4(),
      eventType,
      handlerType,
    };

    if (handlerType === 'builtin') {
      const action: BuiltinAction = { type: actionType };
      
      switch (actionType) {
        case 'navigate':
          action.targetPage = targetPage;
          break;
        case 'setProperty':
          action.targetComponent = targetComponent;
          action.property = property;
          action.value = value;
          break;
        case 'show':
        case 'hide':
        case 'enable':
        case 'disable':
          action.targetComponent = targetComponent;
          break;
        case 'setText':
          action.targetComponent = targetComponent;
          action.value = value;
          break;
        case 'setValue':
          action.targetComponent = targetComponent;
          action.value = parseFloat(value) || 0;
          break;
      }
      
      newEvent.action = action;
    } else {
      newEvent.customCode = customCode;
    }

    onSave(newEvent);
  }, [
    event, eventType, handlerType, actionType,
    targetPage, targetComponent, property, value, customCode, onSave
  ]);

  const generateCodePreview = (): string => {
    if (handlerType === 'custom') {
      return customCode;
    }

    let code = `static void event_handler(lv_event_t *e) {\n`;
    code += `    lv_obj_t *obj = lv_event_get_target(e);\n`;
    code += `    lv_event_code_t code = lv_event_get_code(e);\n\n`;
    code += `    if (code == ${eventType}) {\n`;

    switch (actionType) {
      case 'navigate':
        code += `        // 导航到页面: ${targetPage || 'page_name'}\n`;
        code += `        lv_scr_load(${targetPage || 'page_name'});\n`;
        break;
      case 'setProperty':
        code += `        // 设置属性: ${property || 'property'} = ${value || 'value'}\n`;
        code += `        lv_obj_set_style_${property || 'bg_color'}(${targetComponent || 'target'}, ${value || '0'}, 0);\n`;
        break;
      case 'show':
        code += `        // 显示组件\n`;
        code += `        lv_obj_clear_flag(${targetComponent || 'target'}, LV_OBJ_FLAG_HIDDEN);\n`;
        break;
      case 'hide':
        code += `        // 隐藏组件\n`;
        code += `        lv_obj_add_flag(${targetComponent || 'target'}, LV_OBJ_FLAG_HIDDEN);\n`;
        break;
      case 'enable':
        code += `        // 启用组件\n`;
        code += `        lv_obj_clear_state(${targetComponent || 'target'}, LV_STATE_DISABLED);\n`;
        break;
      case 'disable':
        code += `        // 禁用组件\n`;
        code += `        lv_obj_add_state(${targetComponent || 'target'}, LV_STATE_DISABLED);\n`;
        break;
      case 'setText':
        code += `        // 设置文本\n`;
        code += `        lv_label_set_text(${targetComponent || 'target'}, "${value || ''}");\n`;
        break;
      case 'setValue':
        code += `        // 设置数值\n`;
        code += `        lv_slider_set_value(${targetComponent || 'target'}, ${value || '0'}, LV_ANIM_ON);\n`;
        break;
    }

    code += `    }\n`;
    code += `}\n`;

    return code;
  };

  const renderActionConfig = () => {
    switch (actionType) {
      case 'navigate':
        return (
          <div className="action-config">
            <div className="config-row">
              <label>目标页面</label>
              <select 
                value={targetPage} 
                onChange={(e) => setTargetPage(e.target.value)}
              >
                <option value="">选择页面...</option>
                {pages?.map(page => (
                  <option key={page.id} value={page.name}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'setProperty':
        return (
          <div className="action-config">
            <div className="config-row">
              <label>目标组件</label>
              <select 
                value={targetComponent} 
                onChange={(e) => setTargetComponent(e.target.value)}
              >
                <option value="">选择组件...</option>
                {allComponents.map(comp => (
                  <option key={comp.id} value={comp.name}>
                    {comp.name} ({comp.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="config-row">
              <label>属性名</label>
              <select 
                value={property} 
                onChange={(e) => setProperty(e.target.value)}
              >
                <option value="">选择属性...</option>
                <option value="bg_color">背景色 (bg_color)</option>
                <option value="border_color">边框色 (border_color)</option>
                <option value="border_width">边框宽度 (border_width)</option>
                <option value="radius">圆角 (radius)</option>
                <option value="opa">透明度 (opa)</option>
                <option value="x">X 坐标 (x)</option>
                <option value="y">Y 坐标 (y)</option>
                <option value="width">宽度 (width)</option>
                <option value="height">高度 (height)</option>
              </select>
            </div>
            <div className="config-row">
              <label>属性值</label>
              <input 
                type="text" 
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                placeholder="输入属性值"
              />
            </div>
          </div>
        );

      case 'show':
      case 'hide':
      case 'enable':
      case 'disable':
        return (
          <div className="action-config">
            <div className="config-row">
              <label>目标组件</label>
              <select 
                value={targetComponent} 
                onChange={(e) => setTargetComponent(e.target.value)}
              >
                <option value="">选择组件...</option>
                {allComponents.map(comp => (
                  <option key={comp.id} value={comp.name}>
                    {comp.name} ({comp.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 'setText':
        return (
          <div className="action-config">
            <div className="config-row">
              <label>目标组件</label>
              <select 
                value={targetComponent} 
                onChange={(e) => setTargetComponent(e.target.value)}
              >
                <option value="">选择组件...</option>
                {allComponents.filter(c => ['label', 'btn', 'textarea'].includes(c.type)).map(comp => (
                  <option key={comp.id} value={comp.name}>
                    {comp.name} ({comp.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="config-row">
              <label>文本内容</label>
              <input 
                type="text" 
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                placeholder="输入文本"
              />
            </div>
          </div>
        );

      case 'setValue':
        return (
          <div className="action-config">
            <div className="config-row">
              <label>目标组件</label>
              <select 
                value={targetComponent} 
                onChange={(e) => setTargetComponent(e.target.value)}
              >
                <option value="">选择组件...</option>
                {allComponents.filter(c => ['slider', 'bar', 'arc'].includes(c.type)).map(comp => (
                  <option key={comp.id} value={comp.name}>
                    {comp.name} ({comp.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="config-row">
              <label>数值</label>
              <input 
                type="number" 
                value={value} 
                onChange={(e) => setValue(e.target.value)}
                placeholder="输入数值"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="event-dialog-overlay" onClick={onClose}>
      <div className="event-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{isCreating ? '添加事件' : '编辑事件'}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content">
          {/* Event Type Selection */}
          <div className="form-section">
            <label className="section-label">事件类型</label>
            <select 
              value={eventType} 
              onChange={(e) => setEventType(e.target.value as LvglEventType)}
              className="event-type-select"
            >
              {LVGL_EVENTS.map(evt => (
                <option key={evt.type} value={evt.type}>
                  {evt.label} ({evt.type})
                </option>
              ))}
            </select>
            <p className="field-hint">
              {LVGL_EVENTS.find(e => e.type === eventType)?.description}
            </p>
          </div>

          {/* Handler Type Selection */}
          <div className="form-section">
            <label className="section-label">处理方式</label>
            <div className="handler-type-tabs">
              <button 
                className={`tab-btn ${handlerType === 'builtin' ? 'active' : ''}`}
                onClick={() => setHandlerType('builtin')}
              >
                内置动作
              </button>
              <button 
                className={`tab-btn ${handlerType === 'custom' ? 'active' : ''}`}
                onClick={() => setHandlerType('custom')}
              >
                自定义代码
              </button>
            </div>
          </div>

          {/* Handler Configuration */}
          {handlerType === 'builtin' ? (
            <div className="form-section">
              <label className="section-label">动作类型</label>
              <select 
                value={actionType} 
                onChange={(e) => setActionType(e.target.value as BuiltinActionType)}
                className="action-type-select"
              >
                {BUILTIN_ACTIONS.map(action => (
                  <option key={action.type} value={action.type}>
                    {action.label}
                  </option>
                ))}
              </select>
              <p className="field-hint">
                {BUILTIN_ACTIONS.find(a => a.type === actionType)?.description}
              </p>
              
              {renderActionConfig()}
            </div>
          ) : (
            <div className="form-section">
              <label className="section-label">C 代码</label>
              <CodeEditor 
                value={customCode}
                onChange={setCustomCode}
                language="c"
              />
            </div>
          )}

          {/* Code Preview */}
          <div className="form-section">
            <div className="preview-header">
              <label className="section-label">代码预览</label>
              <button 
                className="toggle-preview-btn"
                onClick={() => setShowCodePreview(!showCodePreview)}
              >
                {showCodePreview ? '隐藏' : '显示'}
              </button>
            </div>
            {showCodePreview && (
              <pre className="code-preview">
                {generateCodePreview()}
              </pre>
            )}
          </div>
        </div>

        <div className="dialog-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button className="save-btn" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

export default EventEditDialog;
