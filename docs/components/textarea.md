# Textarea — 文本输入区域

## 1. 组件名称和简介

**Textarea** 是一个多行文本输入组件，对应 LVGL 的 `lv_textarea` 控件。用户可以在其中输入和编辑文本内容，支持占位符提示文字。在嵌入式 UI 中常用于表单输入、文本编辑、搜索框等场景。

## 2. 组件类型标识

```
type: 'textarea'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| `input` | 输入 | ✏️ |

组件面板图标：📝

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 150 |
| defaultHeight | 80 |

## 5. 是否为容器

```
isContainer: false
```

Textarea 不是容器组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Container (obj)** — 放置在通用容器内
- **Tab View (tabview)** — 放置在标签页内容区域
- **Tile View (tileview)** — 放置在瓦片区域
- **Window (win)** — 放置在窗口内容区域
- **Button (btn)** — 技术上可行但不推荐

### 可以包含的子组件

无。Textarea 是叶子节点组件，不支持嵌套子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `text` | `string` | `''` | 文本框中的文本内容。为空时显示 placeholder |
| `placeholder` | `string` | `'Enter text...'` | 占位符提示文字，当 text 为空时以灰色显示 |
| `maxLength` | `number` | `undefined` | 最大输入字符数限制，不设置则无限制 |
| `password` | `boolean` | `false` | 是否为密码模式，开启后输入内容显示为圆点 |
| `oneLine` | `boolean` | `false` | 是否为单行模式，开启后禁止换行 |

### 属性定义（componentDefinitions.ts）

```typescript
defaultProps: { text: '', placeholder: 'Enter text...' }
```

## 8. 样式设计（styles）

### 支持的样式状态

| 状态 | 选择器 | 说明 |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | 默认状态 |
| `pressed` | `LV_STATE_PRESSED` | 按下状态（触摸/点击时） |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态（键盘导航或点击激活） |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

### 默认样式（default 状态）

采用 LVGL 默认主题的 **card style**（白色背景 + 灰色边框），与 dropdown、chart、table 等组件风格一致。

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| `bgColor` | `string` | `'#ffffff'` | 背景色，card 风格白色 |
| `borderColor` | `string` | `'#E0E0E0'` | 边框颜色，LVGL color_grey |
| `borderWidth` | `number` | `2` | 边框宽度 |
| `borderRadius` | `number` | `8` | 圆角半径 |
| `textColor` | `string` | `'#212121'` | 文本颜色，LVGL color_text |
| `opacity` | `number` | `1` | 不透明度（0~1） |
| `padding` | `number` | `10` | 内边距，对应 LVGL pad_small |

### 建议的 focused 状态样式

```typescript
focused: {
  borderColor: '#2196F3',  // 聚焦时边框变为主题色
  borderWidth: 2,
}
```

### 建议的 disabled 状态样式

```typescript
disabled: {
  bgColor: '#F5F5F5',
  textColor: '#9E9E9E',
  opacity: 0.6,
}
```

## 9. 事件支持

| LVGL 事件类型 | 说明 |
|--------------|------|
| `LV_EVENT_VALUE_CHANGED` | 文本内容发生变化时触发 |
| `LV_EVENT_FOCUSED` | 获得焦点时触发 |
| `LV_EVENT_DEFOCUSED` | 失去焦点时触发 |
| `LV_EVENT_READY` | 用户按下回车/确认键时触发（单行模式下常用） |
| `LV_EVENT_CANCEL` | 用户取消输入时触发 |
| `LV_EVENT_CLICKED` | 点击时触发 |
| `LV_EVENT_PRESSED` | 按下时触发 |
| `LV_EVENT_RELEASED` | 释放时触发 |

最常用的事件是 `LV_EVENT_VALUE_CHANGED`（监听文本变化）和 `LV_EVENT_READY`（监听输入完成）。

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，Textarea 渲染为一个带边框的矩形区域，内部显示文本或占位符：

```tsx
<div className="lvgl-textarea" style={{
  width: '100%',
  height: '100%',
  fontSize: '12px',
  color: '#999',
  backgroundColor: resolvedBgColor,
  border: !defaultStyle.borderWidth ? '1px solid #cccccc' : undefined,
  borderRadius: defaultStyle.borderRadius || 4,
  padding: '6px 8px',
  boxSizing: 'border-box',
}}>
  {props.text || props.placeholder || 'Enter text...'}
</div>
```

- 当 `text` 为空时显示 `placeholder`，文字颜色为灰色 `#999`
- 背景色使用 `resolvedBgColor`，确保在画布中可见（透明时回退为 `#ffffff`）
- 不可交互编辑，仅作为视觉预览

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

使用 `drawTextarea` 函数在 Canvas 2D 上绘制：

```typescript
function drawTextarea(ctx, x, y, w, h, opts) {
  // 1. 绘制背景矩形（支持渐变）
  ctx.fillStyle = opts.gradientFill || opts.bgColor;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  // 2. 绘制文本或占位符
  const displayText = opts.text || opts.placeholder;
  ctx.fillStyle = opts.text ? opts.textColor : '#999';
  ctx.fillText(displayText, x + 8, y + 8);
}
```

- 支持背景渐变（bgGradDir / bgGradColor）
- 有文本时用 textColor 渲染，无文本时用灰色渲染 placeholder

### LVGL WASM 预览渲染（ui_from_json.c）

通过 JSON 序列化传递给 WASM 端，由 `create_textarea` 函数创建真实 LVGL 控件：

```c
static lv_obj_t *create_textarea(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *ta = lv_textarea_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text && text[0]) lv_textarea_set_text(ta, text);
        const char *ph = cjson_get_string(props, "placeholder");
        if (ph) lv_textarea_set_placeholder_text(ta, ph);
    }
    return ta;
}
```

JSON 数据由 `editorStateToJson.ts` 的 `flattenTree` 函数生成，将组件树扁平化并保留 parent 引用。

### 代码生成输出（ui.c.ts）

```c
// Create textarea: my_textarea
my_textarea = lv_textarea_create(parent);
lv_obj_set_pos(my_textarea, 10, 20);
lv_obj_set_size(my_textarea, 150, 80);

// Styles
lv_obj_set_style_bg_color(my_textarea, lv_color_hex(0xffffff), 0);
lv_obj_set_style_bg_opa(my_textarea, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(my_textarea, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(my_textarea, 2, 0);
lv_obj_set_style_radius(my_textarea, 8, 0);
lv_obj_set_style_text_color(my_textarea, lv_color_hex(0x212121), 0);
lv_obj_set_style_pad_all(my_textarea, 10, 0);

// Props
lv_textarea_set_placeholder_text(my_textarea, "Enter text...");
lv_textarea_set_text(my_textarea, "Hello");
```

支持的扩展属性代码生成：
- `maxLength` → `lv_textarea_set_max_length()`
- `password` → `lv_textarea_set_password_mode()`
- `oneLine` → `lv_textarea_set_one_line()`（v8）/ `lv_textarea_set_max_line(, 1)`（v9）

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_textarea_create(parent)` |

### 关键 API

| API 函数 | 说明 |
|----------|------|
| `lv_textarea_set_text(ta, text)` | 设置文本内容 |
| `lv_textarea_set_placeholder_text(ta, text)` | 设置占位符文本 |
| `lv_textarea_get_text(ta)` | 获取当前文本 |
| `lv_textarea_set_max_length(ta, len)` | 设置最大字符数 |
| `lv_textarea_set_password_mode(ta, en)` | 设置密码模式 |
| `lv_textarea_set_one_line(ta, en)` | 设置单行模式（v8） |
| `lv_textarea_set_max_line(ta, n)` | 设置最大行数（v9，传 1 即单行） |
| `lv_textarea_add_char(ta, c)` | 追加单个字符 |
| `lv_textarea_add_text(ta, text)` | 追加文本 |
| `lv_textarea_del_char(ta)` | 删除光标前一个字符 |
| `lv_textarea_set_cursor_pos(ta, pos)` | 设置光标位置 |

### 样式部件（Parts）

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 文本区域主体（背景、边框） |
| `LV_PART_TEXTAREA_PLACEHOLDER` | 占位符文本样式 |
| `LV_PART_CURSOR` | 光标样式 |
| `LV_PART_SCROLLBAR` | 滚动条样式 |

## 12. 设计注意事项

1. **键盘集成**：在嵌入式设备上，Textarea 通常需要配合虚拟键盘（`lv_keyboard`）使用。编辑器目前不生成键盘关联代码，用户需在 `ui_events.c` 中手动处理。

2. **占位符颜色**：LVGL 的占位符文本颜色通过 `LV_PART_TEXTAREA_PLACEHOLDER` 部件设置。编辑器画布中固定使用 `#999` 灰色模拟，与 LVGL 默认行为一致。

3. **光标不可见**：在编辑器画布和简易预览中不渲染光标，仅在 WASM 预览中由 LVGL 原生渲染光标。

4. **多行 vs 单行**：默认为多行模式。当 `oneLine` 为 true 时，组件行为类似单行输入框，高度建议调整为 36~40px。

5. **滚动行为**：当文本超出可视区域时，LVGL 会自动启用滚动。编辑器画布中通过 `overflow: hidden` 模拟裁剪效果。

6. **密码模式**：开启密码模式后，LVGL 会将输入字符替换为圆点（`•`）。编辑器画布中暂不模拟此行为，仅在 WASM 预览中可见。

7. **背景色回退**：在编辑器画布中，如果 bgColor 设为 transparent，会自动回退为 `#ffffff`，确保组件在设计画布上可见可交互。

8. **字体限制**：LVGL 字体在编译时确定大小，编辑器中的 fontSize 属性仅作为参考，实际需要在项目中启用对应大小的字体文件。
