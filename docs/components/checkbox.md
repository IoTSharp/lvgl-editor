# Checkbox — 复选框

## 1. 组件名称和简介

**Checkbox** 是一个复选框组件，对应 LVGL 的 `lv_checkbox` 控件。由一个可勾选的方形标记（marker）和一段文本标签组成，用户点击可切换选中/未选中状态。在嵌入式 UI 中常用于设置开关、多选列表、同意条款等场景。

## 2. 组件类型标识

```
type: 'checkbox'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| `input` | 输入 | ✏️ |

组件面板图标：☑️

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 120 |
| defaultHeight | 28 |

## 5. 是否为容器

```
isContainer: false
```

Checkbox 不是容器组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Container (obj)** — 放置在通用容器内（最常见用法，多个 checkbox 放在容器中组成选项组）
- **Tab View (tabview)** — 放置在标签页内容区域
- **Tile View (tileview)** — 放置在瓦片区域
- **Window (win)** — 放置在窗口内容区域

### 可以包含的子组件

无。Checkbox 是叶子节点组件，不支持嵌套子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `text` | `string` | `'Checkbox'` | 复选框旁边的文本标签 |
| `checked` | `boolean` | `false` | 是否选中。选中时 marker 填充主题色并显示勾号 |
| `fontSize` | `number` | `14` | 文本字号（可选，映射到内置 Montserrat 字体大小） |
| `fontResource` | `string` | `undefined` | 自定义字体资源名称（可选，优先级高于 fontSize）。需要先在资源管理器中上传字体并配置 sizes |

### 字体选择说明

属性面板中提供字体选择下拉框，支持：
- **默认**：使用 LVGL 默认字体
- **内置字体**：montserrat_14 ~ montserrat_32 等内置 Montserrat 字体
- **已上传字体**：用户在资源管理器中上传的自定义字体（TTF/OTF）

选择自定义字体时，字体大小下拉框仅显示该字体已配置的 sizes（因为自定义字体按 size 编译）。选择内置字体时，显示所有可用的内置字体大小。

当 `fontResource` 存在时，代码生成器输出 `lv_obj_set_style_text_font(obj, &{fontResource}_{fontSize}, 0)`；否则使用内置 `lv_font_montserrat_{fontSize}`。

### 属性定义（componentDefinitions.ts）

```typescript
defaultProps: { text: 'Checkbox', checked: false }
```

## 8. 样式设计（styles）

### 支持的样式状态

| 状态 | 选择器 | 说明 |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | 默认未选中状态 |
| `pressed` | `LV_STATE_PRESSED` | 按下状态 |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态 |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

注意：`LV_STATE_CHECKED` 是 LVGL 内置状态，通过 `lv_obj_add_state` 设置，不在编辑器样式面板中单独配置。

### 默认样式（default 状态）

Checkbox 整体背景透明，边框颜色为主题色（用于 marker），与 LVGL 默认主题行为一致。

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| `bgColor` | `string` | `'transparent'` | 整体背景透明 |
| `borderColor` | `string` | `'#2196F3'` | 边框颜色，LVGL color_primary（用于 marker 边框） |
| `borderWidth` | `number` | `2` | 边框宽度 |
| `borderRadius` | `number` | `4` | 圆角半径（marker 的圆角） |
| `textColor` | `string` | `'#212121'` | 文本颜色 |
| `opacity` | `number` | `1` | 不透明度 |
| `padding` | `number` | `10` | 内边距（marker 与文本之间的间距参考） |

### 建议的 disabled 状态样式

```typescript
disabled: {
  textColor: '#9E9E9E',
  borderColor: '#BDBDBD',
  opacity: 0.6,
}
```

## 9. 事件支持

| LVGL 事件类型 | 说明 |
|--------------|------|
| `LV_EVENT_VALUE_CHANGED` | 选中状态发生变化时触发（最常用） |
| `LV_EVENT_CLICKED` | 点击时触发 |
| `LV_EVENT_PRESSED` | 按下时触发 |
| `LV_EVENT_RELEASED` | 释放时触发 |
| `LV_EVENT_FOCUSED` | 获得焦点时触发 |
| `LV_EVENT_DEFOCUSED` | 失去焦点时触发 |

最常用的事件是 `LV_EVENT_VALUE_CHANGED`，在用户切换选中状态后触发。可通过 `lv_obj_has_state(cb, LV_STATE_CHECKED)` 获取当前状态。

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，Checkbox 渲染为一个方形标记 + 文本标签的水平布局：

```tsx
<div className="lvgl-checkbox" style={{
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: defaultStyle.textColor || '#333',
}}>
  <div style={{
    width: '16px',
    height: '16px',
    border: '2px solid #666',
    borderRadius: '2px',
    backgroundColor: props.checked ? '#2196F3' : '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }}>
    {props.checked && <span style={{ color: '#fff', fontSize: '12px' }}>✓</span>}
  </div>
  <span style={{ fontSize: 13 }}>{props.text || 'Checkbox'}</span>
</div>
```

- 选中时 marker 背景变为主题蓝色 `#2196F3`，显示白色勾号 `✓`
- 未选中时 marker 为白色背景 + 灰色边框
- 整体背景透明，在画布中保持透明（不做回退）

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

使用 `drawCheckbox` 函数在 Canvas 2D 上绘制：

```typescript
function drawCheckbox(ctx, x, y, w, h, opts) {
  const boxSize = 18;
  const boxY = y + (h - boxSize) / 2;

  // 1. 绘制方形标记
  ctx.fillStyle = opts.checked ? '#2196f3' : '#fff';
  roundRect(ctx, x, boxY, boxSize, boxSize, 3);
  ctx.fill();
  ctx.stroke();

  // 2. 选中时绘制勾号
  if (opts.checked) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 4, boxY + boxSize / 2);
    ctx.lineTo(x + boxSize / 2 - 1, boxY + boxSize - 5);
    ctx.lineTo(x + boxSize - 4, boxY + 5);
    ctx.stroke();
  }

  // 3. 绘制文本标签
  ctx.fillStyle = opts.textColor;
  ctx.fillText(opts.text, x + boxSize + 8, y + h / 2);
}
```

### LVGL WASM 预览渲染（ui_from_json.c）

通过 JSON 传递给 WASM 端，由 `create_checkbox` 函数创建真实 LVGL 控件：

```c
static lv_obj_t *create_checkbox(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *cb = lv_checkbox_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) lv_checkbox_set_text(cb, text);
        int checked = cjson_get_bool(props, "checked", 0);
        if (checked) lv_obj_add_state(cb, LV_STATE_CHECKED);
    }
    return cb;
}
```

### 代码生成输出（ui.c.ts）

```c
// Create checkbox: my_checkbox
my_checkbox = lv_checkbox_create(parent);
lv_obj_set_pos(my_checkbox, 10, 20);
lv_obj_set_size(my_checkbox, 120, 28);

// Styles
lv_obj_set_style_bg_opa(my_checkbox, LV_OPA_TRANSP, 0);
lv_obj_set_style_border_color(my_checkbox, lv_color_hex(0x2196F3), 0);
lv_obj_set_style_border_width(my_checkbox, 2, 0);
lv_obj_set_style_radius(my_checkbox, 4, 0);
lv_obj_set_style_text_color(my_checkbox, lv_color_hex(0x212121), 0);
lv_obj_set_style_pad_all(my_checkbox, 10, 0);

// Props
lv_checkbox_set_text(my_checkbox, "Checkbox");
lv_obj_add_state(my_checkbox, LV_STATE_CHECKED);  // 仅当 checked=true 时生成
```

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_checkbox_create(parent)` |

### 关键 API

| API 函数 | 说明 |
|----------|------|
| `lv_checkbox_set_text(cb, text)` | 设置文本标签 |
| `lv_checkbox_get_text(cb)` | 获取文本标签 |
| `lv_obj_add_state(cb, LV_STATE_CHECKED)` | 设置为选中状态 |
| `lv_obj_clear_state(cb, LV_STATE_CHECKED)` | 清除选中状态 |
| `lv_obj_has_state(cb, LV_STATE_CHECKED)` | 查询是否选中 |
| `lv_obj_add_state(cb, LV_STATE_DISABLED)` | 设置为禁用状态 |

### 样式部件（Parts）

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 整体区域（背景、文本） |
| `LV_PART_INDICATOR` | 方形标记（marker）区域 |

Marker 的样式（选中时的背景色、边框色等）通过 `LV_PART_INDICATOR` 配合状态选择器控制：
- `LV_PART_INDICATOR | LV_STATE_DEFAULT` — 未选中时的 marker 样式
- `LV_PART_INDICATOR | LV_STATE_CHECKED` — 选中时的 marker 样式

## 12. 设计注意事项

1. **选中状态管理**：Checkbox 的选中状态通过 LVGL 的 `LV_STATE_CHECKED` 状态标志管理，而非独立属性。编辑器中使用 `props.checked` 布尔值映射到此状态。

2. **Marker 样式独立性**：LVGL 中 marker（方形标记）的样式通过 `LV_PART_INDICATOR` 部件控制，与 `LV_PART_MAIN` 独立。编辑器当前的 `borderColor` 和 `borderRadius` 主要影响 marker 的视觉表现。

3. **背景透明**：Checkbox 默认背景透明，这是 LVGL 的标准行为。在编辑器画布中保持透明，不做背景色回退，因此在浅色背景上可能不太显眼。

4. **文本位置**：LVGL 中文本始终在 marker 右侧，不支持自定义位置。编辑器的三个渲染层都遵循此布局。

5. **组合使用**：多个 Checkbox 通常放在一个 Container (obj) 中，配合 Flex 布局实现垂直排列的选项组。编辑器支持此模式但需要用户手动设置容器布局。

6. **尺寸自适应**：Checkbox 的实际宽度取决于文本长度。默认宽度 120px 适合短文本，长文本可能需要手动调整宽度或使用 `widthMode: 'content'`。

7. **触摸区域**：在嵌入式设备上，Checkbox 的整个区域（包括文本）都是可点击的，不仅限于 marker。编辑器画布中点击整个组件区域即可选中。

8. **无 checkable 标志**：与 Button 不同，Checkbox 不需要手动设置 `LV_OBJ_FLAG_CHECKABLE`，LVGL 内部已自动处理。
