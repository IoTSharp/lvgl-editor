import React, { useCallback } from 'react';
import { useEditorStore } from '../../store/editorStore';
import type { LvglComponent, StyleProps } from '../../types';
import { getComponentDefinition } from '../../utils/componentDefinitions';
import './PropertyEditor.css';

const PropertyEditor: React.FC = () => {
  const { selection, getComponentById, updateComponent } = useEditorStore();
  
  const selectedId = selection.selectedIds[0];
  const component = selectedId ? getComponentById(selectedId) : undefined;
  const definition = component ? getComponentDefinition(component.type) : undefined;

  const handlePropertyChange = useCallback(
    (property: keyof LvglComponent, value: any) => {
      if (!selectedId) return;
      updateComponent(selectedId, { [property]: value });
    },
    [selectedId, updateComponent]
  );

  const handleStyleChange = useCallback(
    (styleKey: keyof StyleProps, value: any) => {
      if (!selectedId || !component) return;
      updateComponent(selectedId, {
        styles: {
          ...component.styles,
          default: {
            ...component.styles.default,
            [styleKey]: value,
          },
        },
      });
    },
    [selectedId, component, updateComponent]
  );

  const handlePropsChange = useCallback(
    (propKey: string, value: any) => {
      if (!selectedId || !component) return;
      updateComponent(selectedId, {
        props: {
          ...component.props,
          [propKey]: value,
        },
      });
    },
    [selectedId, component, updateComponent]
  );

  if (!component) {
    return (
      <div className="property-editor">
        <div className="panel-header">
          <h3>属性</h3>
        </div>
        <div className="no-selection">
          <p>未选中组件</p>
          <p className="hint">点击画布上的组件进行编辑</p>
        </div>
      </div>
    );
  }

  return (
    <div className="property-editor">
      <div className="panel-header">
        <h3>属性</h3>
      </div>
      
      <div className="property-sections">
        {/* Component Info */}
        <div className="property-section">
          <div className="section-header">组件信息</div>
          <div className="property-row">
            <label>类型</label>
            <div className="property-value readonly">
              <span className="component-type-icon">{definition?.icon}</span>
              {definition?.name || component.type}
            </div>
          </div>
          <div className="property-row">
            <label>名称</label>
            <input
              type="text"
              value={component.name}
              onChange={(e) => handlePropertyChange('name', e.target.value)}
            />
          </div>
        </div>

        {/* Position */}
        <div className="property-section">
          <div className="section-header">位置</div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>X</label>
              <input
                type="number"
                value={component.x}
                onChange={(e) => handlePropertyChange('x', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="property-field">
              <label>Y</label>
              <input
                type="number"
                value={component.y}
                onChange={(e) => handlePropertyChange('y', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Size */}
        <div className="property-section">
          <div className="section-header">尺寸</div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>宽度</label>
              <input
                type="number"
                value={component.width}
                min={10}
                onChange={(e) => handlePropertyChange('width', Math.max(10, parseInt(e.target.value) || 10))}
              />
            </div>
            <div className="property-field">
              <label>高度</label>
              <input
                type="number"
                value={component.height}
                min={10}
                onChange={(e) => handlePropertyChange('height', Math.max(10, parseInt(e.target.value) || 10))}
              />
            </div>
          </div>
        </div>

        {/* Styles */}
        <div className="property-section">
          <div className="section-header">样式</div>
          
          <div className="property-row">
            <label>背景色</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={component.styles.default.bgColor || '#ffffff'}
                onChange={(e) => handleStyleChange('bgColor', e.target.value)}
              />
              <input
                type="text"
                value={component.styles.default.bgColor || '#ffffff'}
                onChange={(e) => handleStyleChange('bgColor', e.target.value)}
                className="color-text"
              />
            </div>
          </div>
          
          <div className="property-row">
            <label>边框色</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={component.styles.default.borderColor || '#cccccc'}
                onChange={(e) => handleStyleChange('borderColor', e.target.value)}
              />
              <input
                type="text"
                value={component.styles.default.borderColor || '#cccccc'}
                onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                className="color-text"
              />
            </div>
          </div>
          
          <div className="property-row two-col">
            <div className="property-field">
              <label>边框宽度</label>
              <input
                type="number"
                value={component.styles.default.borderWidth || 0}
                min={0}
                onChange={(e) => handleStyleChange('borderWidth', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="property-field">
              <label>圆角</label>
              <input
                type="number"
                value={component.styles.default.borderRadius || 0}
                min={0}
                onChange={(e) => handleStyleChange('borderRadius', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          
          <div className="property-row">
            <label>透明度</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={component.styles.default.opacity ?? 1}
              onChange={(e) => handleStyleChange('opacity', parseFloat(e.target.value))}
            />
            <span className="range-value">{((component.styles.default.opacity ?? 1) * 100).toFixed(0)}%</span>
          </div>

          <div className="property-row">
            <label>文本颜色</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={component.styles.default.textColor || '#333333'}
                onChange={(e) => handleStyleChange('textColor', e.target.value)}
              />
              <input
                type="text"
                value={component.styles.default.textColor || '#333333'}
                onChange={(e) => handleStyleChange('textColor', e.target.value)}
                className="color-text"
              />
            </div>
          </div>

          <div className="property-row">
            <label>内边距</label>
            <input
              type="number"
              value={component.styles.default.padding || 0}
              min={0}
              onChange={(e) => handleStyleChange('padding', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Component-specific props */}
        {renderComponentProps(component, handlePropsChange)}
      </div>
    </div>
  );
};

// Render component-specific properties
function renderComponentProps(
  component: LvglComponent,
  onChange: (key: string, value: any) => void
): React.ReactNode {
  const { type, props } = component;

  switch (type) {
    case 'btn':
      return (
        <div className="property-section">
          <div className="section-header">按钮</div>
          <div className="property-row">
            <label>文本</label>
            <input
              type="text"
              value={props.text || ''}
              onChange={(e) => onChange('text', e.target.value)}
            />
          </div>
          <div className="property-row">
            <label>字体大小</label>
            <input
              type="number"
              value={props.fontSize || 14}
              min={8}
              max={72}
              onChange={(e) => onChange('fontSize', parseInt(e.target.value) || 14)}
            />
          </div>
          <div className="property-row">
            <label>对齐方式</label>
            <select
              value={props.textAlign || 'center'}
              onChange={(e) => onChange('textAlign', e.target.value)}
            >
              <option value="left">左对齐</option>
              <option value="center">居中</option>
              <option value="right">右对齐</option>
            </select>
          </div>
        </div>
      );

    case 'label':
      return (
        <div className="property-section">
          <div className="section-header">标签</div>
          <div className="property-row">
            <label>文本</label>
            <input
              type="text"
              value={props.text || ''}
              onChange={(e) => onChange('text', e.target.value)}
            />
          </div>
          <div className="property-row">
            <label>字体大小</label>
            <input
              type="number"
              value={props.fontSize || 14}
              min={8}
              max={72}
              onChange={(e) => onChange('fontSize', parseInt(e.target.value) || 14)}
            />
          </div>
          <div className="property-row">
            <label>对齐方式</label>
            <select
              value={props.textAlign || 'left'}
              onChange={(e) => onChange('textAlign', e.target.value)}
            >
              <option value="left">左对齐</option>
              <option value="center">居中</option>
              <option value="right">右对齐</option>
            </select>
          </div>
          <div className="property-row">
            <label>长文本模式</label>
            <select
              value={props.longMode || 'wrap'}
              onChange={(e) => onChange('longMode', e.target.value)}
            >
              <option value="wrap">换行</option>
              <option value="scroll">滚动</option>
              <option value="dot">省略号</option>
              <option value="clip">裁剪</option>
            </select>
          </div>
        </div>
      );

    case 'textarea':
      return (
        <div className="property-section">
          <div className="section-header">文本框</div>
          <div className="property-row">
            <label>内容</label>
            <textarea
              value={props.text || ''}
              onChange={(e) => onChange('text', e.target.value)}
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          <div className="property-row">
            <label>占位符</label>
            <input
              type="text"
              value={props.placeholder || ''}
              onChange={(e) => onChange('placeholder', e.target.value)}
            />
          </div>
          <div className="property-row">
            <label>最大长度</label>
            <input
              type="number"
              value={props.maxLength || 0}
              min={0}
              onChange={(e) => onChange('maxLength', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="property-row">
            <label>密码模式</label>
            <input
              type="checkbox"
              checked={props.password || false}
              onChange={(e) => onChange('password', e.target.checked)}
            />
          </div>
          <div className="property-row">
            <label>单行模式</label>
            <input
              type="checkbox"
              checked={props.oneLine || false}
              onChange={(e) => onChange('oneLine', e.target.checked)}
            />
          </div>
        </div>
      );

    case 'checkbox':
      return (
        <div className="property-section">
          <div className="section-header">复选框</div>
          <div className="property-row">
            <label>文本</label>
            <input
              type="text"
              value={props.text || ''}
              onChange={(e) => onChange('text', e.target.value)}
            />
          </div>
          <div className="property-row">
            <label>选中</label>
            <input
              type="checkbox"
              checked={props.checked || false}
              onChange={(e) => onChange('checked', e.target.checked)}
            />
          </div>
        </div>
      );

    case 'switch':
      return (
        <div className="property-section">
          <div className="section-header">开关</div>
          <div className="property-row">
            <label>开启</label>
            <input
              type="checkbox"
              checked={props.checked || false}
              onChange={(e) => onChange('checked', e.target.checked)}
            />
          </div>
        </div>
      );

    case 'slider':
      return (
        <div className="property-section">
          <div className="section-header">滑块</div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>最小值</label>
              <input
                type="number"
                value={props.min ?? 0}
                onChange={(e) => onChange('min', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="property-field">
              <label>最大值</label>
              <input
                type="number"
                value={props.max ?? 100}
                onChange={(e) => onChange('max', parseInt(e.target.value) || 100)}
              />
            </div>
          </div>
          <div className="property-row">
            <label>当前值</label>
            <input
              type="number"
              value={props.value ?? 50}
              onChange={(e) => onChange('value', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="property-row">
            <label>步长</label>
            <input
              type="number"
              value={props.step || 1}
              min={1}
              onChange={(e) => onChange('step', parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="property-row">
            <label>方向</label>
            <select
              value={props.orientation || 'horizontal'}
              onChange={(e) => onChange('orientation', e.target.value)}
            >
              <option value="horizontal">水平</option>
              <option value="vertical">垂直</option>
            </select>
          </div>
        </div>
      );

    case 'bar':
      return (
        <div className="property-section">
          <div className="section-header">进度条</div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>最小值</label>
              <input
                type="number"
                value={props.min ?? 0}
                onChange={(e) => onChange('min', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="property-field">
              <label>最大值</label>
              <input
                type="number"
                value={props.max ?? 100}
                onChange={(e) => onChange('max', parseInt(e.target.value) || 100)}
              />
            </div>
          </div>
          <div className="property-row">
            <label>当前值</label>
            <input
              type="number"
              value={props.value ?? 50}
              onChange={(e) => onChange('value', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="property-row">
            <label>方向</label>
            <select
              value={props.orientation || 'horizontal'}
              onChange={(e) => onChange('orientation', e.target.value)}
            >
              <option value="horizontal">水平</option>
              <option value="vertical">垂直</option>
            </select>
          </div>
        </div>
      );

    case 'win':
      return (
        <div className="property-section">
          <div className="section-header">窗口</div>
          <div className="property-row">
            <label>标题</label>
            <input
              type="text"
              value={props.title || ''}
              onChange={(e) => onChange('title', e.target.value)}
            />
          </div>
        </div>
      );

    case 'table':
      return (
        <div className="property-section">
          <div className="section-header">表格</div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>行数</label>
              <input
                type="number"
                value={props.rows ?? 3}
                min={1}
                onChange={(e) => onChange('rows', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="property-field">
              <label>列数</label>
              <input
                type="number"
                value={props.cols ?? 3}
                min={1}
                onChange={(e) => onChange('cols', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
        </div>
      );

    case 'img':
      return (
        <div className="property-section">
          <div className="section-header">图片</div>
          <div className="property-row">
            <label>图片源</label>
            <input
              type="text"
              value={props.src || ''}
              onChange={(e) => onChange('src', e.target.value)}
              placeholder="图片URL或资源ID"
            />
          </div>
          <div className="property-row">
            <label>缩放模式</label>
            <select
              value={props.scaleMode || 'none'}
              onChange={(e) => onChange('scaleMode', e.target.value)}
            >
              <option value="none">原始</option>
              <option value="cover">覆盖</option>
              <option value="contain">包含</option>
            </select>
          </div>
          <div className="property-row">
            <label>旋转角度</label>
            <input
              type="number"
              value={props.rotation || 0}
              min={0}
              max={360}
              onChange={(e) => onChange('rotation', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      );

    case 'line':
      return (
        <div className="property-section">
          <div className="section-header">线条</div>
          <div className="property-row">
            <label>线宽</label>
            <input
              type="number"
              value={props.lineWidth || 2}
              min={1}
              onChange={(e) => onChange('lineWidth', parseInt(e.target.value) || 2)}
            />
          </div>
          <div className="property-row">
            <label>线条颜色</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={props.lineColor || '#333333'}
                onChange={(e) => onChange('lineColor', e.target.value)}
              />
              <input
                type="text"
                value={props.lineColor || '#333333'}
                onChange={(e) => onChange('lineColor', e.target.value)}
                className="color-text"
              />
            </div>
          </div>
        </div>
      );

    case 'dropdown':
      return (
        <div className="property-section">
          <div className="section-header">下拉框</div>
          <div className="property-row">
            <label>选项</label>
            <textarea
              value={(props.options || ['Option 1', 'Option 2', 'Option 3']).join('\n')}
              onChange={(e) => onChange('options', e.target.value.split('\n').filter((s: string) => s.trim()))}
              placeholder="每行一个选项"
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          <div className="property-row">
            <label>默认选中</label>
            <input
              type="number"
              value={props.selected || 0}
              min={0}
              onChange={(e) => onChange('selected', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="property-row">
            <label>展开方向</label>
            <select
              value={props.direction || 'down'}
              onChange={(e) => onChange('direction', e.target.value)}
            >
              <option value="down">向下</option>
              <option value="up">向上</option>
            </select>
          </div>
        </div>
      );

    case 'arc':
      return (
        <div className="property-section">
          <div className="section-header">圆弧</div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>起始角度</label>
              <input
                type="number"
                value={props.startAngle || 135}
                min={0}
                max={360}
                onChange={(e) => onChange('startAngle', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="property-field">
              <label>结束角度</label>
              <input
                type="number"
                value={props.endAngle || 45}
                min={0}
                max={360}
                onChange={(e) => onChange('endAngle', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>最小值</label>
              <input
                type="number"
                value={props.min || 0}
                onChange={(e) => onChange('min', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="property-field">
              <label>最大值</label>
              <input
                type="number"
                value={props.max || 100}
                onChange={(e) => onChange('max', parseInt(e.target.value) || 100)}
              />
            </div>
          </div>
          <div className="property-row">
            <label>当前值</label>
            <input
              type="number"
              value={props.value || 0}
              onChange={(e) => onChange('value', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="property-row">
            <label>模式</label>
            <select
              value={props.mode || 'normal'}
              onChange={(e) => onChange('mode', e.target.value)}
            >
              <option value="normal">普通</option>
              <option value="symmetrical">对称</option>
              <option value="reverse">反向</option>
            </select>
          </div>
        </div>
      );

    case 'spinner':
      return (
        <div className="property-section">
          <div className="section-header">加载器</div>
          <div className="property-row">
            <label>旋转速度(ms)</label>
            <input
              type="number"
              value={props.speed || 1000}
              min={100}
              step={100}
              onChange={(e) => onChange('speed', parseInt(e.target.value) || 1000)}
            />
          </div>
          <div className="property-row">
            <label>弧度</label>
            <input
              type="number"
              value={props.arcLength || 60}
              min={10}
              max={360}
              onChange={(e) => onChange('arcLength', parseInt(e.target.value) || 60)}
            />
          </div>
        </div>
      );

    case 'chart':
      return (
        <div className="property-section">
          <div className="section-header">图表</div>
          <div className="property-row">
            <label>类型</label>
            <select
              value={props.type || 'line'}
              onChange={(e) => onChange('type', e.target.value)}
            >
              <option value="line">折线图</option>
              <option value="bar">柱状图</option>
              <option value="scatter">散点图</option>
            </select>
          </div>
          <div className="property-row">
            <label>数据点</label>
            <input
              type="text"
              value={(props.data || [10, 20, 30, 25, 40]).join(', ')}
              onChange={(e) => onChange('data', e.target.value.split(',').map((v: string) => parseInt(v.trim()) || 0))}
              placeholder="10, 20, 30, 40"
            />
          </div>
          <div className="property-row">
            <label>显示网格</label>
            <input
              type="checkbox"
              checked={props.showGrid !== false}
              onChange={(e) => onChange('showGrid', e.target.checked)}
            />
          </div>
          <div className="property-row">
            <label>线条颜色</label>
            <div className="color-input-wrapper">
              <input
                type="color"
                value={props.lineColor || '#2196F3'}
                onChange={(e) => onChange('lineColor', e.target.value)}
              />
              <input
                type="text"
                value={props.lineColor || '#2196F3'}
                onChange={(e) => onChange('lineColor', e.target.value)}
                className="color-text"
              />
            </div>
          </div>
        </div>
      );

    case 'calendar':
      return (
        <div className="property-section">
          <div className="section-header">日历</div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>年份</label>
              <input
                type="number"
                value={props.year || new Date().getFullYear()}
                min={1970}
                max={2100}
                onChange={(e) => onChange('year', parseInt(e.target.value) || 2024)}
              />
            </div>
            <div className="property-field">
              <label>月份</label>
              <input
                type="number"
                value={props.month || 1}
                min={1}
                max={12}
                onChange={(e) => onChange('month', Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>
          </div>
          <div className="property-row">
            <label>显示星期标题</label>
            <input
              type="checkbox"
              checked={props.showDayNames !== false}
              onChange={(e) => onChange('showDayNames', e.target.checked)}
            />
          </div>
        </div>
      );

    case 'tabview':
      return (
        <div className="property-section">
          <div className="section-header">标签视图</div>
          <div className="property-row">
            <label>标签</label>
            <textarea
              value={(props.tabs || ['Tab 1', 'Tab 2']).join('\n')}
              onChange={(e) => onChange('tabs', e.target.value.split('\n').filter((s: string) => s.trim()))}
              placeholder="每行一个标签"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
          <div className="property-row">
            <label>当前标签</label>
            <input
              type="number"
              value={props.activeTab || 0}
              min={0}
              onChange={(e) => onChange('activeTab', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="property-row">
            <label>标签位置</label>
            <select
              value={props.tabPosition || 'top'}
              onChange={(e) => onChange('tabPosition', e.target.value)}
            >
              <option value="top">顶部</option>
              <option value="bottom">底部</option>
              <option value="left">左侧</option>
              <option value="right">右侧</option>
            </select>
          </div>
        </div>
      );

    case 'tileview':
      return (
        <div className="property-section">
          <div className="section-header">瓦片视图</div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>行数</label>
              <input
                type="number"
                value={props.rows || 2}
                min={1}
                onChange={(e) => onChange('rows', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="property-field">
              <label>列数</label>
              <input
                type="number"
                value={props.cols || 2}
                min={1}
                onChange={(e) => onChange('cols', Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
          </div>
          <div className="property-row two-col">
            <div className="property-field">
              <label>当前行</label>
              <input
                type="number"
                value={props.currentRow || 0}
                min={0}
                onChange={(e) => onChange('currentRow', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="property-field">
              <label>当前列</label>
              <input
                type="number"
                value={props.currentCol || 0}
                min={0}
                onChange={(e) => onChange('currentCol', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      );

    case 'obj':
      return (
        <div className="property-section">
          <div className="section-header">容器</div>
          <div className="property-row">
            <label>滚动方向</label>
            <select
              value={props.scrollDir || 'none'}
              onChange={(e) => onChange('scrollDir', e.target.value)}
            >
              <option value="none">不滚动</option>
              <option value="hor">水平</option>
              <option value="ver">垂直</option>
              <option value="all">全方向</option>
            </select>
          </div>
          <div className="property-row">
            <label>布局模式</label>
            <select
              value={props.layout || 'none'}
              onChange={(e) => onChange('layout', e.target.value)}
            >
              <option value="none">无</option>
              <option value="flex">Flex</option>
              <option value="grid">Grid</option>
            </select>
          </div>
          {props.layout === 'flex' && (
            <>
              <div className="property-row">
                <label>方向</label>
                <select
                  value={props.flexDirection || 'row'}
                  onChange={(e) => onChange('flexDirection', e.target.value)}
                >
                  <option value="row">水平</option>
                  <option value="column">垂直</option>
                </select>
              </div>
              <div className="property-row">
                <label>间距</label>
                <input
                  type="number"
                  value={props.gap || 0}
                  min={0}
                  onChange={(e) => onChange('gap', parseInt(e.target.value) || 0)}
                />
              </div>
            </>
          )}
        </div>
      );

    default:
      return null;
  }
}

export default PropertyEditor;
