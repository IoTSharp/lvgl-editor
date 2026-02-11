# Dropdown — 下拉选择框

## 1. 组件名称和简介

**Dropdown** 是一个下拉选择组件，对应 LVGL 的 `lv_dropdown` 控件。用户点击后展开选项列表，从中选择一个选项。在嵌入式 UI 中常用于设置页面、表单选择、模式切换等场景。

## 2. 组件类型标识

```
type: 'dropdown'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| `input` | 输入 | ✏️ |

组件面板图标：📋

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 120 |
| defaultHeight | 36 |

## 5. 是否为容器

```
isContainer: false
```

Dropdown 不是容器组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Container (obj)** — 放置在通用容器内
- **Tab View (tabview)** — 放置在标签页内容区域
- **Tile View (tileview)** — 放置在瓦片区域
- **Window (win)** — 放置在窗口内容区域
- **Button (btn)** — 技术上可行但不推荐

### 可以包含的子组件

无。Dropdown 是叶子节点组件，不支持嵌套子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `options` | `string[]` | `['Option 1', 'Option 2', 'Option 3']` | 选项列表，每个元素为一个选项文本 |
| `selected` | `number` | `0` | 当前选中项的索引（从 0 开始） |
| `direction` | `string` | `undefined` | 下拉方向：`'down'`（默认）或 `'up'` |

### 属性定义（componentDefinitions.ts）

```typescript
defaultProps: { options: ['Option 1', 'Option 2', 'Option 3'], selected: 0 }
```

## 8. 样式设计（styles）

### 支持的样式状态

| 状态 | 选择器 | 说明 |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | 默认状态 |
| `pressed` | `LV_STATE_PRESSED` | 按下状态 |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态 |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

### 默认样式（default 状态）

采用 LVGL 默认主题的 **card style**，与 textarea、chart、table 等组件风格一致。

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| `bgColor` | `string` | `'#ffffff'` | 背景色，card 风格白色 |
| `borderColor` | `string` | `'#E0E0E0'` | 边框颜色，LVGL color_grey |
| `borderWidth` | `number` | `2` | 边框宽度 |
| `borderRadius` | `number` | `8` | 圆角半径 |
| `textColor` | `string` | `'#212121'` | 文本颜色，LVGL color_text |
| `opacity` | `number` | `1` | 不透明度（0~1） |
| `padding` | `number` | `10` | 内边距 |

### 建议的 focused 状态样式

```typescript
focused: {
  borderColor: '#2196F3',
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
| `LV_EVENT_VALUE_CHANGED` | 选中项发生变化时触发（最常用） |
| `LV_EVENT_CLICKED` | 点击时触发 |
| `LV_EVENT_PRESSED` | 按下时触发 |
| `LV_EVENT_RELEASED` | 释放时触发 |
| `LV_EVENT_FOCUSED` | 获得焦点时触发 |
| `LV_EVENT_DEFOCUSED` | 失去焦点时触发 |
| `LV_EVENT_READY` | 选择完成时触发 |
| `LV_EVENT_CANCEL` | 取消选择时触发 |

最常用的事件是 `LV_EVENT_VALUE_CHANGED`，在用户选择新选项后触发。

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，Dropdown 渲染为一个带下拉箭头的选择框，显示当前选中项文本：

```tsx
<div className="lvgl-dropdown" style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  height: '100%',
  padding: '0 8px',
  backgroundColor: resolvedBgColor,
  border: !defaultStyle.borderWidth ? '1px solid #cccccc' : undefined,
  borderRadius: defaultStyle.borderRadius || 4,
  boxSizing: 'border-box',
  color: defaultStyle.textColor || '#333',
}}>
  <span>{props.options?.[props.selected || 0] || 'Select...'}</span>
  <span style={{ color: '#999', fontSize: '10px' }}>▼</span>
</div>
```

- 左侧显示当前选中项文本
- 右侧显示下拉箭头 `▼`
- 不可交互展开，仅作为视觉预览
- 背景色透明时回退为 `#ffffff`

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

使用 `drawDropdown` 函数在 Canvas 2D 上绘制：

```typescript
function drawDropdown(ctx, x, y, w, h, opts) {
  // 1. 绘制背景矩形（支持渐变）
  ctx.fillStyle = opts.gradientFill || opts.bgColor;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill();
  ctx.stroke();

  // 2. 绘制选中项文本
  const selectedText = opts.options[opts.selected] || 'Select...';
  ctx.fillStyle = opts.textColor;
  ctx.fillText(selectedText, x + 10, y + h / 2);

  // 3. 绘制下拉箭头（三角形）
  ctx.fillStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(x + w - 20, y + h / 2 - 3);
  ctx.lineTo(x + w - 10, y + h / 2 - 3);
  ctx.lineTo(x + w - 15, y + h / 2 + 3);
  ctx.closePath();
  ctx.fill();
}
```

### LVGL WASM 预览渲染（ui_from_json.c）

通过 JSON 传递给 WASM 端，由 `create_dropdown` 函数创建真实 LVGL 控件：

```c
static lv_obj_t *create_dropdown(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *dd = lv_dropdown_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        // 将数组选项拼接为换行分隔的字符串
        cJSON *options = cJSON_GetObjectItemCaseSensitive(props, "options");
        if (cJSON_IsArray(options)) {
            char buf[512] = {0};
            int first = 1;
            cJSON *opt;
            cJSON_ArrayForEach(opt, options) {
                if (cJSON_IsString(opt)) {
                    if (!first) strncat(buf, "\n", sizeof(buf) - strlen(buf) - 1);
                    strncat(buf, opt->valuestring, sizeof(buf) - strlen(buf) - 1);
                    first = 0;
                }
            }
            lv_dropdown_set_options(dd, buf);
        }
        int sel = cjson_get_int(props, "selected", 0);
        lv_dropdown_set_selected(dd, (uint32_t)sel);
    }
    return dd;
}
```

LVGL 的 dropdown 选项使用 `\n` 换行符分隔的单个字符串，WASM 端需要将 JSON 数组转换为此格式。

### 代码生成输出（ui.c.ts）

```c
// Create dropdown: my_dropdown
my_dropdown = lv_dropdown_create(parent);
lv_obj_set_pos(my_dropdown, 10, 20);
lv_obj_set_size(my_dropdown, 120, 36);

// Styles
lv_obj_set_style_bg_color(my_dropdown, lv_color_hex(0xffffff), 0);
lv_obj_set_style_bg_opa(my_dropdown, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(my_dropdown, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(my_dropdown, 2, 0);
lv_obj_set_style_radius(my_dropdown, 8, 0);
lv_obj_set_style_text_color(my_dropdown, lv_color_hex(0x212121), 0);
lv_obj_set_style_pad_all(my_dropdown, 10, 0);

// Props
lv_dropdown_set_options(my_dropdown, "Option 1\nOption 2\nOption 3");
lv_dropdown_set_selected(my_dropdown, 0);
```

选项数组在代码生成时通过 `\n` 拼接为单个 C 字符串。支持的扩展属性：
- `direction` → `lv_dropdown_set_dir()`

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_dropdown_create(parent)` |

### 关键 API

| API 函数 | 说明 |
|----------|------|
| `lv_dropdown_set_options(dd, opts)` | 设置选项列表（`\n` 分隔的字符串） |
| `lv_dropdown_add_option(dd, opt, pos)` | 在指定位置插入选项 |
| `lv_dropdown_set_selected(dd, idx)` | 设置选中项索引 |
| `lv_dropdown_get_selected(dd)` | 获取当前选中项索引 |
| `lv_dropdown_get_selected_str(dd, buf, len)` | 获取当前选中项文本 |
| `lv_dropdown_set_dir(dd, dir)` | 设置下拉方向（LV_DIR_BOTTOM / LV_DIR_TOP） |
| `lv_dropdown_open(dd)` | 程序化打开下拉列表 |
| `lv_dropdown_close(dd)` | 程序化关闭下拉列表 |
| `lv_dropdown_set_text(dd, text)` | 设置固定显示文本（不随选择变化） |

### 样式部件（Parts）

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 下拉框主体（关闭状态的按钮区域） |
| `LV_PART_INDICATOR` | 下拉箭头图标 |
| `LV_PART_ITEMS` | 展开后的选项列表项 |
| `LV_PART_SELECTED` | 展开后当前选中的选项项 |
| `LV_PART_SCROLLBAR` | 选项列表的滚动条 |

## 12. 设计注意事项

1. **选项格式转换**：编辑器内部使用 `string[]` 数组存储选项，但 LVGL API 使用 `\n` 分隔的单个字符串。代码生成和 WASM 预览都需要进行格式转换。

2. **下拉列表层级**：LVGL 的 dropdown 展开时会创建一个浮动列表，该列表在 LVGL 内部作为独立对象管理。编辑器画布和简易预览中不模拟展开状态。

3. **选项数量限制**：WASM 端的选项拼接缓冲区为 512 字节，超长选项列表可能被截断。建议单个选项文本不超过 50 字符，总选项数不超过 20 个。

4. **背景色回退**：在编辑器画布中，如果 bgColor 设为 transparent，会自动回退为 `#ffffff`。

5. **下拉方向**：默认向下展开。当组件位于屏幕底部时，建议设置 `direction: 'up'` 以避免列表被裁剪。

6. **选项列表样式**：展开后的选项列表样式通过 `LV_PART_ITEMS` 和 `LV_PART_SELECTED` 控制，编辑器当前不提供这些部件的样式编辑，需要在生成代码中手动添加。

7. **动态选项**：如果需要在运行时动态更新选项，使用 `lv_dropdown_set_options()` 会替换所有选项，使用 `lv_dropdown_add_option()` 可以逐个添加。

8. **箭头渲染**：编辑器画布使用 Unicode 字符 `▼` 模拟箭头，简易预览使用三角形路径绘制，LVGL 原生使用 `LV_SYMBOL_DOWN` 符号字体。三者视觉略有差异。
