# Label (label) — 标签组件设计文档

## 1. 组件名称和简介

Label（标签）是 LVGL 编辑器中最基础的文本显示组件。标签用于在界面上显示静态或动态文本内容，是构建 UI 的核心元素之一。在 LVGL 中，标签对象（`lv_label`）默认背景透明，仅显示文本，支持长文本模式（换行、滚动、省略号、裁剪）。

标签不是容器组件（`isContainer = false`），不能包含子组件。

## 2. 组件类型标识

```
type: 'label'
```

## 3. 所属分类

| 字段 | 值 |
|---|---|
| 分类 ID | `basic` |
| 分类名称 | 基础 |
| 分类图标 | 📦 |
| 组件图标 | 🏷️ |

## 4. 默认尺寸

| 属性 | 值 |
|---|---|
| defaultWidth | 80 |
| defaultHeight | 24 |

## 5. 是否为容器

```
isContainer: false
```

标签是纯显示组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Button (btn)** — 作为按钮的额外文本（按钮已有内置 label）
- **Container (obj)** — 放置在通用容器内
- **Tab View (tabview)** — 放置在标签页内容区
- **Tile View (tileview)** — 放置在瓦片区域内
- **Window (win)** — 放置在窗口内容区

### 可以包含的子组件

无。标签不是容器，不能包含任何子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `text` | `string` | `'Label'` | 标签显示的文本内容 |
| `longMode` | `string` | `undefined` | 长文本模式：`'wrap'`（换行）/ `'scroll'`（滚动）/ `'dot'`（省略号）/ `'clip'`（裁剪） |
| `fontSize` | `number` | `14` | 文本字号（可选） |
| `textAlign` | `string` | `undefined` | 文本对齐方式：`'left'` / `'center'` / `'right'` |
| `fontResource` | `string` | `undefined` | 自定义字体资源名称（可选，优先级高于 fontSize）。需要先在资源管理器中上传字体并配置 sizes |

### 字体选择说明

属性面板中提供字体选择下拉框，支持：
- **默认**：使用 LVGL 默认字体
- **内置字体**：montserrat_14 ~ montserrat_32 等内置 Montserrat 字体
- **已上传字体**：用户在资源管理器中上传的自定义字体（TTF/OTF）

选择自定义字体时，字体大小下拉框仅显示该字体已配置的 sizes（因为自定义字体按 size 编译）。选择内置字体时，显示所有可用的内置字体大小。

当 `fontResource` 存在时，代码生成器输出 `lv_obj_set_style_text_font(obj, &{fontResource}_{fontSize}, 0)`；否则使用内置 `lv_font_montserrat_{fontSize}`。

### props 类型定义

```typescript
interface LabelProps {
  text: string;
  longMode?: 'wrap' | 'scroll' | 'dot' | 'clip';
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontResource?: string;
}
```

## 8. 样式设计（styles）

### 支持的样式状态

| 状态 | 选择器 | 说明 |
|---|---|---|
| `default` | `LV_STATE_DEFAULT` | 默认/正常状态 |
| `pressed` | `LV_STATE_PRESSED` | 按下状态（标签通常不响应按下，但可设置） |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态 |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

### default 状态默认样式

| 样式属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `bgColor` | `string` | `'transparent'` | 背景色（透明，LVGL 中 `bg_opa = LV_OPA_TRANSP`） |
| `borderColor` | `string` | `'transparent'` | 边框颜色（无边框） |
| `borderWidth` | `number` | `0` | 边框宽度 |
| `borderRadius` | `number` | `0` | 圆角半径 |
| `textColor` | `string` | `'#212121'` | 文本颜色（LVGL 主题 `color_text` = `lv_palette_darken(GREY, 4)`） |
| `opacity` | `number` | `1` | 不透明度 |
| `padding` | `number` | `0` | 内边距 |

### 样式来源说明

标签的默认样式来自 LVGL 默认主题：
- 背景透明（`bg_opa = LV_OPA_TRANSP`）
- 文本颜色继承自父级或使用 `color_text`（`#212121`）
- 无边框、无圆角、无内边距

### 扩展样式属性

标签支持以下通用扩展样式（继承自 `StyleProps`）：

- 阴影：`shadowColor`, `shadowWidth`, `shadowOffsetX`, `shadowOffsetY`, `shadowSpread`, `shadowOpacity`
- 渐变：`bgGradColor`, `bgGradDir`, `bgGradStop`
- 轮廓：`outlineColor`, `outlineWidth`, `outlinePad`
- 变换：`transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- 四方向内边距：`paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`
- 文本装饰：`textDecor`（`'none'` / `'underline'` / `'strikethrough'`）
- 字体：`textFont`, `textFontSize`, `textLetterSpace`, `textLineSpace`
- 混合模式：`blendMode`

## 9. 事件支持

标签支持以下 LVGL 事件类型：

| 事件类型 | 说明 |
|---|---|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

> 注意：标签默认不可点击（`LV_OBJ_FLAG_CLICKABLE` 未设置）。如需响应点击事件，需要通过 flags 设置 `clickable = true`。

## 10. UI 层设计

### 10.1 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，标签使用 React DOM 渲染：

```tsx
<span className="lvgl-label" style={{
  color: defaultStyle.textColor || '#333333',
  fontSize: props.fontSize || 13,
}}>
  {props.text || 'Label'}
</span>
```

关键行为：
- 使用 `<span>` 元素直接显示文本
- 背景保持透明（`resolvedBgColor` 对 label 类型返回 `'transparent'`）
- 文本颜色和字号直接映射
- 支持选中高亮、悬停效果、拖拽、缩放手柄
- 支持 `textDecor` 文本装饰（通过外层 `textDecoration` CSS 属性）

### 10.2 简易预览渲染（PreviewPanel.tsx）

在 Canvas 2D 简易预览中，标签使用 `drawLabel()` 函数绘制：

```typescript
drawLabel(ctx, x, y, w, h, {
  text: comp.props.text || 'Label',
  textColor,
  fontSize: comp.props.fontSize || 14,
  textDecor: styles.textDecor,
});
```

关键行为：
- 使用 Canvas 2D `fillText` 绘制文本
- 文本对齐：`textAlign = 'left'`，`textBaseline = 'top'`
- 不绘制背景矩形（透明背景）
- 支持文本装饰（下划线/删除线）
- 支持动画状态叠加

### 10.3 LVGL WASM 预览渲染

#### JSON 序列化（editorStateToJson.ts）

标签被序列化为扁平化的 JSON 组件节点：

```json
{
  "type": "label",
  "id": "comp-xxx",
  "parent": null,
  "x": 10, "y": 10,
  "width": 80, "height": 24,
  "props": { "text": "Label" },
  "styles": {
    "default": {
      "bgColor": "transparent",
      "borderColor": "transparent",
      "borderWidth": 0,
      "borderRadius": 0,
      "textColor": "#212121",
      "opacity": 1,
      "padding": 0
    }
  }
}
```

#### C 端创建（ui_from_json.c）

```c
static lv_obj_t *create_label(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *lbl = lv_label_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) lv_label_set_text(lbl, text);
    }
    return lbl;
}
```

关键行为：
- 调用 `lv_label_create()` 创建标签
- 读取 `props.text` 并设置文本
- 应用位置、尺寸、样式
- 样式中 `bgColor = "transparent"` 会设置 `lv_obj_set_style_bg_opa(obj, LV_OPA_TRANSP, sel)`

### 10.4 代码生成输出（ui.c.ts）

```c
// Create label: my_label
my_label = lv_label_create(parent);
lv_obj_set_pos(my_label, 10, 10);
lv_obj_set_size(my_label, 80, 24);
lv_obj_set_style_bg_opa(my_label, LV_OPA_TRANSP, 0);
lv_obj_set_style_text_color(my_label, lv_color_hex(0x212121), 0);
lv_label_set_text(my_label, "Label");
```

关键行为：
- 创建函数使用 `lv_label_create`
- 直接在标签对象上设置文本（`lv_label_set_text`）
- 支持 `longMode` 映射到 `lv_label_set_long_mode`
- 支持 `fontSize` 映射到 `lv_obj_set_style_text_font`（使用内置 Montserrat 字体）
- 支持 `textAlign` 映射到 `lv_obj_set_style_text_align`
- 自定义字体资源（`fontResource`）优先级高于 `fontSize`

## 11. LVGL API 映射

### 创建函数

| 版本 | API |
|---|---|
| LVGL v9 | `lv_label_create(parent)` |
| LVGL v8 | `lv_label_create(parent)` |

### 关键 API

| API | 说明 |
|---|---|
| `lv_label_create(parent)` | 创建标签 |
| `lv_label_set_text(label, text)` | 设置文本内容 |
| `lv_label_set_long_mode(label, mode)` | 设置长文本模式 |
| `lv_obj_set_pos(label, x, y)` | 设置位置 |
| `lv_obj_set_size(label, w, h)` | 设置尺寸 |
| `lv_obj_set_style_text_color(label, color, sel)` | 设置文本颜色 |
| `lv_obj_set_style_text_font(label, font, sel)` | 设置字体 |
| `lv_obj_set_style_text_align(label, align, sel)` | 设置文本对齐 |
| `lv_obj_set_style_text_letter_space(label, space, sel)` | 设置字间距 |
| `lv_obj_set_style_text_line_space(label, space, sel)` | 设置行间距 |
| `lv_obj_set_style_text_decor(label, decor, sel)` | 设置文本装饰 |
| `lv_obj_set_style_bg_opa(label, LV_OPA_TRANSP, sel)` | 设置背景透明 |

### 长文本模式常量

| 模式 | LVGL 常量 | 说明 |
|---|---|---|
| `wrap` | `LV_LABEL_LONG_WRAP` | 自动换行 |
| `scroll` | `LV_LABEL_LONG_SCROLL` | 水平滚动 |
| `dot` | `LV_LABEL_LONG_DOT` | 末尾省略号 |
| `clip` | `LV_LABEL_LONG_CLIP` | 裁剪超出部分 |

## 12. 设计注意事项

1. **透明背景**：标签默认背景透明。在 LVGL 中通过 `bg_opa = LV_OPA_TRANSP` 实现。编辑器画布中保持透明渲染，不做可见性回退（与按钮不同）。

2. **文本颜色继承**：在 LVGL 中，标签的文本颜色可以从父级继承。编辑器中默认使用 `#212121`（LVGL 主题的 `color_text`），但实际运行时可能因父级样式而不同。

3. **尺寸与文本关系**：标签的默认尺寸（80×24）是固定值。在实际 LVGL 中，标签尺寸通常由文本内容决定（`LV_SIZE_CONTENT`）。编辑器支持 `widthMode` / `heightMode` 设置为 `'content'` 来模拟此行为。

4. **长文本模式**：当文本超出标签尺寸时，`longMode` 属性决定处理方式。默认不设置（LVGL 默认为 `LV_LABEL_LONG_WRAP`）。代码生成时仅在用户显式设置时输出。

5. **字体大小限制**：LVGL 的字体大小在编译时确定。代码生成时 `fontSize` 映射到内置 Montserrat 字体（如 `lv_font_montserrat_14`）。如果请求的字号没有对应的编译字体，会生成注释提示。

6. **不可点击**：标签默认不可点击。如需响应事件，需要在 flags 中设置 `clickable = true`，代码生成时会输出 `lv_obj_add_flag(label, LV_OBJ_FLAG_CLICKABLE)`。

7. **C 字符串转义**：文本内容在代码生成时会经过 `escapeCString()` 处理，确保特殊字符（引号、反斜杠、换行等）被正确转义。

8. **跨页面命名冲突**：与按钮相同，多页面同名标签会自动添加页面名前缀。
