# Button (btn) — 按钮组件设计文档

## 1. 组件名称和简介

Button（按钮）是 LVGL 编辑器中最基础的交互组件之一。按钮用于触发用户操作，内部自动包含一个居中的文本标签。在 LVGL 中，按钮是一个特殊的容器对象（`lv_button`），默认具有可点击属性，并自带按下状态的视觉反馈。

按钮是一个容器组件（`isContainer = true`），除了内置的文本标签外，还可以包含其他子组件（如图标、额外标签等），以实现更复杂的按钮布局。

## 2. 组件类型标识

```
type: 'btn'
```

## 3. 所属分类

| 字段 | 值 |
|---|---|
| 分类 ID | `basic` |
| 分类名称 | 基础 |
| 分类图标 | 📦 |
| 组件图标 | 🔘 |

## 4. 默认尺寸

| 属性 | 值 |
|---|---|
| defaultWidth | 100 |
| defaultHeight | 40 |

## 5. 是否为容器

```
isContainer: true
```

按钮是容器组件。虽然创建时会自动生成一个内部 `lv_label`，但用户可以向按钮内部拖入其他子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Container (obj)** — 放置在通用容器内
- **Tab View (tabview)** — 放置在标签页内容区
- **Tile View (tileview)** — 放置在瓦片区域内
- **Window (win)** — 放置在窗口内容区

### 可以包含的子组件

作为容器，按钮可以包含以下子组件：

- **Label (label)** — 额外的文本标签
- **Image (img)** — 图标/图片
- **Line (line)** — 装饰线条
- **Spinner (spinner)** — 加载状态指示

> 注意：按钮创建时会自动生成一个居中的内部标签用于显示 `props.text`，该标签由代码生成器自动管理，不出现在组件树中。用户手动添加的子组件会叠加在按钮内部。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `text` | `string` | `'Button'` | 按钮内部标签显示的文本内容 |
| `fontSize` | `number` | `14` | 文本字号（可选，映射到内部 label 的字体大小） |
| `textAlign` | `string` | `'center'` | 文本对齐方式：`'left'` / `'center'` / `'right'` |
| `fontResource` | `string` | `undefined` | 自定义字体资源名称（可选，优先级高于 fontSize） |

### props 类型定义

```typescript
interface BtnProps {
  text: string;
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
| `pressed` | `LV_STATE_PRESSED` | 按下状态 |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态（键盘/编码器导航） |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

### default 状态默认样式

| 样式属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `bgColor` | `string` | `'#2196F3'` | 背景色（Material Blue 500，LVGL 主题 primary 色） |
| `borderColor` | `string` | `'transparent'` | 边框颜色（默认无边框） |
| `borderWidth` | `number` | `0` | 边框宽度 |
| `borderRadius` | `number` | `8` | 圆角半径 |
| `textColor` | `string` | `'#ffffff'` | 文本颜色（白色） |
| `opacity` | `number` | `1` | 不透明度（0~1） |
| `padding` | `number` | `10` | 内边距（四方向统一） |

### 样式来源说明

按钮的默认样式来自 LVGL 默认主题（`lv_theme_default.c`）：
- 背景色使用 `color_primary`（`lv_palette_main(LV_PALETTE_BLUE)` = `#2196F3`）
- 文本色使用白色（`lv_color_white()`）
- 无边框（`border_width = 0`）
- 圆角 8px

### 扩展样式属性

按钮还支持以下通用扩展样式（继承自 `StyleProps`）：

- 阴影：`shadowColor`, `shadowWidth`, `shadowOffsetX`, `shadowOffsetY`, `shadowSpread`, `shadowOpacity`
- 渐变：`bgGradColor`, `bgGradDir`, `bgGradStop`
- 轮廓：`outlineColor`, `outlineWidth`, `outlinePad`
- 变换：`transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- 四方向内边距：`paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`
- 四角圆角：`borderRadiusTopLeft`, `borderRadiusTopRight`, `borderRadiusBottomLeft`, `borderRadiusBottomRight`
- 边框方向：`borderSide`（`'full'` / `'top'` / `'bottom'` / `'left'` / `'right'` / `'top_bottom'` / `'left_right'` / `'none'`）
- 文本装饰：`textDecor`（`'none'` / `'underline'` / `'strikethrough'`）
- 混合模式：`blendMode`（`'normal'` / `'additive'` / `'subtractive'` / `'multiply'`）
- 字体：`textFont`, `textFontSize`, `textLetterSpace`, `textLineSpace`

## 9. 事件支持

按钮支持以下 LVGL 事件类型：

| 事件类型 | 说明 |
|---|---|
| `LV_EVENT_CLICKED` | 点击事件（按下并释放） |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | 值变化事件（当按钮设置为 checkable 时） |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

### 事件处理器类型

- **builtin（内置动作）**：支持 `navigate`（页面跳转）、`show`/`hide`（显示/隐藏组件）、`enable`/`disable`（启用/禁用组件）、`setText`、`setValue`、`setProperty`
- **custom（自定义代码）**：用户编写自定义 C 代码

## 10. UI 层设计

### 10.1 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，按钮使用 React DOM 渲染：

```tsx
<div className="lvgl-btn" style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  color: defaultStyle.textColor || '#ffffff',
  fontSize: props.fontSize || 13,
}}>
  {props.text || 'Button'}
</div>
```

关键行为：
- 使用 `div` + flexbox 居中显示文本
- 背景色直接映射到外层容器的 `backgroundColor`
- 支持选中高亮、悬停效果、拖拽、缩放手柄
- 透明背景时自动回退为 `#2196F3`（确保在画布中可见）
- 支持 `borderSide` 部分边框渲染
- 支持 `textDecor` 文本装饰

### 10.2 简易预览渲染（PreviewPanel.tsx）

在 Canvas 2D 简易预览中，按钮使用 `drawButton()` 函数绘制：

```typescript
drawButton(ctx, x, y, w, h, {
  bgColor: isHovered ? lightenColor(bgColorStyle, 20) : bgColorStyle,
  borderColor, borderWidth, borderRadius,
  text: comp.props.text || 'Button',
  textColor,
  gradientFill: isHovered ? undefined : getGradientFill(),
  textDecor: styles.textDecor,
  borderSide: styles.borderSide,
});
```

关键行为：
- 使用 Canvas 2D `roundRect` 绘制圆角矩形背景
- 文本居中绘制（`textAlign: 'center'`, `textBaseline: 'middle'`）
- 悬停时背景色自动变亮 20%
- 支持渐变填充、文本装饰、部分边框
- 支持动画状态叠加（位移、缩放、透明度）
- 支持阴影、变换（旋转/缩放）、轮廓

### 10.3 LVGL WASM 预览渲染

#### JSON 序列化（editorStateToJson.ts）

按钮被序列化为扁平化的 JSON 组件节点：

```json
{
  "type": "btn",
  "id": "comp-xxx",
  "parent": null,
  "x": 50, "y": 50,
  "width": 100, "height": 40,
  "props": { "text": "Button" },
  "styles": {
    "default": {
      "bgColor": "#2196F3",
      "borderColor": "transparent",
      "borderWidth": 0,
      "borderRadius": 8,
      "textColor": "#ffffff",
      "opacity": 1,
      "padding": 10
    }
  }
}
```

#### C 端创建（ui_from_json.c）

```c
static lv_obj_t *create_btn(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *btn = lv_button_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) {
            lv_obj_t *lbl = lv_label_create(btn);
            lv_label_set_text(lbl, text);
            lv_obj_center(lbl);
        }
    }
    return btn;
}
```

关键行为：
- 调用 `lv_button_create()` 创建按钮
- 读取 `props.text`，自动创建内部 `lv_label` 并居中
- 应用位置、尺寸、样式（含多状态）
- 应用 flags（hidden, clickable, scrollable）

### 10.4 代码生成输出（ui.c.ts）

```c
// Create btn: my_button
my_button = lv_btn_create(parent);
lv_obj_set_pos(my_button, 50, 50);
lv_obj_set_size(my_button, 100, 40);
lv_obj_set_style_bg_color(my_button, lv_color_hex(0x2196F3), 0);
lv_obj_set_style_bg_opa(my_button, LV_OPA_COVER, 0);
lv_obj_set_style_radius(my_button, 8, 0);
lv_obj_set_style_text_color(my_button, lv_color_hex(0xFFFFFF), 0);
lv_obj_set_style_pad_all(my_button, 10, 0);

// Create label inside button
lv_obj_t *my_button_label = lv_label_create(my_button);
lv_label_set_text(my_button_label, "Button");
lv_obj_center(my_button_label);
```

关键行为：
- 创建函数使用 `lv_btn_create`（注意：代码生成用 `lv_btn_create`，WASM 预览用 `lv_button_create`，两者在 LVGL v9 中等价）
- 自动生成内部 label 的创建代码
- 内部 label 变量名为 `{varName}_label`
- 支持 `fontSize`、`textAlign`、`fontResource` 属性映射到内部 label
- 支持多状态样式输出（pressed/focused/disabled 使用对应的 `LV_STATE_*` 选择器）
- 支持事件绑定代码生成

## 11. LVGL API 映射

### 创建函数

| 版本 | API |
|---|---|
| LVGL v9 | `lv_button_create(parent)` / `lv_btn_create(parent)` |
| LVGL v8 | `lv_btn_create(parent)` |

### 关键 API

| API | 说明 |
|---|---|
| `lv_label_create(btn)` | 在按钮内部创建文本标签 |
| `lv_label_set_text(label, text)` | 设置标签文本 |
| `lv_obj_center(label)` | 将标签居中于按钮 |
| `lv_obj_set_pos(btn, x, y)` | 设置按钮位置 |
| `lv_obj_set_size(btn, w, h)` | 设置按钮尺寸 |
| `lv_obj_set_style_bg_color(btn, color, sel)` | 设置背景色 |
| `lv_obj_set_style_bg_opa(btn, opa, sel)` | 设置背景不透明度 |
| `lv_obj_set_style_radius(btn, r, sel)` | 设置圆角 |
| `lv_obj_set_style_text_color(btn, color, sel)` | 设置文本颜色 |
| `lv_obj_set_style_pad_all(btn, pad, sel)` | 设置内边距 |
| `lv_obj_set_style_border_width(btn, w, sel)` | 设置边框宽度 |
| `lv_obj_set_style_border_color(btn, color, sel)` | 设置边框颜色 |
| `lv_obj_add_event_cb(btn, handler, event, data)` | 添加事件回调 |
| `lv_obj_add_state(btn, LV_STATE_DISABLED)` | 设置禁用状态 |
| `lv_obj_add_flag(btn, LV_OBJ_FLAG_HIDDEN)` | 设置隐藏 |

## 12. 设计注意事项

1. **内部标签管理**：按钮的 `text` 属性通过自动创建的内部 `lv_label` 实现。在代码生成中，label 变量名为 `{btnVarName}_label`，需要注意命名冲突。

2. **容器特性**：按钮是容器（`isContainer = true`），用户可以向其中添加子组件。子组件在代码生成时会以按钮作为父级创建。但需注意，自动创建的内部 label 不在组件树中，用户添加的子组件可能与之重叠。

3. **透明边框处理**：默认 `borderColor = 'transparent'`，`borderWidth = 0`。在代码生成中，当 `borderColor` 为 transparent 时不生成边框颜色代码。

4. **v8/v9 兼容性**：
   - 代码生成使用 `lv_btn_create`（v8/v9 通用）
   - WASM 预览使用 `lv_button_create`（v9 新名称）
   - 两者在 v9 中等价

5. **画布可见性**：当 `bgColor` 为 transparent 时，编辑器画布自动回退为 `#2196F3`，确保按钮在设计时始终可见可交互。

6. **悬停反馈**：简易预览中，悬停时背景色自动变亮 20%，模拟交互反馈。编辑器画布中通过 CSS hover 类实现。

7. **字体属性传递**：`fontSize`、`textAlign`、`fontResource` 属性在代码生成时应用到内部 label 而非按钮本身。自定义字体资源（`fontResource`）优先级高于 `fontSize`。

8. **跨页面命名冲突**：当多个页面存在同名按钮时，代码生成器会自动添加页面名前缀（如 `page1_my_button`），避免 C 变量名冲突。
