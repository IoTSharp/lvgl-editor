import React, { useState, useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { EventBinding, LvglEventType } from '../../types';
import EventEditDialog from './EventEditDialog';
import './EventPanel.css';

// LVGL Event type definitions
// eslint-disable-next-line react-refresh/only-export-components
export const LVGL_EVENTS: { type: LvglEventType; label: string; description: string }[] = [
  { type: 'LV_EVENT_CLICKED', label: '点击', description: '组件被点击时触发' },
  { type: 'LV_EVENT_PRESSED', label: '按下', description: '组件被按下时触发' },
  { type: 'LV_EVENT_RELEASED', label: '释放', description: '组件被释放时触发' },
  { type: 'LV_EVENT_LONG_PRESSED', label: '长按', description: '组件被长按时触发' },
  { type: 'LV_EVENT_VALUE_CHANGED', label: '值改变', description: '组件值改变时触发' },
  { type: 'LV_EVENT_FOCUSED', label: '获得焦点', description: '组件获得焦点时触发' },
  { type: 'LV_EVENT_DEFOCUSED', label: '失去焦点', description: '组件失去焦点时触发' },
  { type: 'LV_EVENT_READY', label: '就绪', description: '组件准备就绪时触发' },
  { type: 'LV_EVENT_CANCEL', label: '取消', description: '操作被取消时触发' },
];

const EventPanel: React.FC = () => {
  const { selection, getComponentById, updateComponent } = useEditorStore();
  const [editingEvent, setEditingEvent] = useState<EventBinding | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const selectedId = selection.selectedIds[0];
  const component = selectedId ? getComponentById(selectedId) : undefined;

  const handleAddEvent = useCallback(() => {
    setEditingEvent(null);
    setIsCreating(true);
    setIsDialogOpen(true);
  }, []);

  const handleEditEvent = useCallback((event: EventBinding) => {
    setEditingEvent(event);
    setIsCreating(false);
    setIsDialogOpen(true);
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    if (!selectedId || !component) return;
    const newEvents = component.events.filter(e => e.id !== eventId);
    updateComponent(selectedId, { events: newEvents });
  }, [selectedId, component, updateComponent]);

  const handleSaveEvent = useCallback((event: EventBinding) => {
    if (!selectedId || !component) return;
    
    if (isCreating) {
      // Add new event
      updateComponent(selectedId, { 
        events: [...component.events, event] 
      });
    } else {
      // Update existing event
      const newEvents = component.events.map(e => 
        e.id === event.id ? event : e
      );
      updateComponent(selectedId, { events: newEvents });
    }
    
    setIsDialogOpen(false);
    setEditingEvent(null);
  }, [selectedId, component, updateComponent, isCreating]);

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setEditingEvent(null);
  }, []);

  const getEventLabel = (eventType: LvglEventType): string => {
    const event = LVGL_EVENTS.find(e => e.type === eventType);
    return event?.label || eventType;
  };

  const getHandlerDescription = (event: EventBinding): string => {
    if (event.handlerType === 'custom') {
      return '自定义代码';
    }
    if (event.action) {
      switch (event.action.type) {
        case 'navigate':
          return `导航到: ${event.action.targetPage || '未设置'}`;
        case 'setProperty':
          return `设置属性: ${event.action.property || '未设置'}`;
        case 'show':
          return `显示: ${event.action.targetComponent || '未设置'}`;
        case 'hide':
          return `隐藏: ${event.action.targetComponent || '未设置'}`;
        case 'enable':
          return `启用: ${event.action.targetComponent || '未设置'}`;
        case 'disable':
          return `禁用: ${event.action.targetComponent || '未设置'}`;
        case 'setText':
          return `设置文本: "${event.action.value || ''}"`;
        case 'setValue':
          return `设置数值: ${event.action.value ?? '未设置'}`;
        default:
          return '内置动作';
      }
    }
    return '未配置';
  };

  if (!component) {
    return (
      <div className="event-panel">
        <div className="panel-header">
          <h3>事件</h3>
        </div>
        <div className="no-selection">
          <p>未选中组件</p>
          <p className="hint">选择组件后可添加事件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="event-panel">
      <div className="panel-header">
        <h3>事件</h3>
        <button className="add-event-btn" onClick={handleAddEvent} title="添加事件">
          <span>+</span>
        </button>
      </div>

      <div className="event-list">
        {component.events.length === 0 ? (
          <div className="no-events">
            <p>暂无事件绑定</p>
            <button className="add-first-event" onClick={handleAddEvent}>
              + 添加事件
            </button>
          </div>
        ) : (
          component.events.map(event => (
            <div key={event.id} className="event-item">
              <div className="event-info" onClick={() => handleEditEvent(event)}>
                <div className="event-type">
                  <span className="event-icon">⚡</span>
                  {getEventLabel(event.eventType)}
                </div>
                <div className="event-handler">
                  {getHandlerDescription(event)}
                </div>
              </div>
              <div className="event-actions">
                <button 
                  className="event-edit-btn" 
                  onClick={() => handleEditEvent(event)}
                  title="编辑"
                >
                  ✏️
                </button>
                <button 
                  className="event-delete-btn" 
                  onClick={() => handleDeleteEvent(event.id)}
                  title="删除"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isDialogOpen && (
        <EventEditDialog
          event={editingEvent}
          isCreating={isCreating}
          onSave={handleSaveEvent}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  );
};

export default EventPanel;
