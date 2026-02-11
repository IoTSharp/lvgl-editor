# Line (line) — 线条组件设计文档

## 1. 组件名称和简介

Line（线条）是 LVGL 编辑器中用于绘制直线段的基础组件。在 LVGL 中，线条对象（`lv_line`）通过一组点坐标来定义线段的形状，支持设置线宽、线色等属性。线条常用于界面中的分隔线、装饰线等场景。

线条不是容器组件（`isContainer = false`），不能包含子组件。

## 2. 组件类型标识

```
type: 'line'
```

## 3. 所属分类

| 字段 | 值 |
|---|---|
| 分类 ID | `basic` |
| 分类名称 | 基础 |
| 分类图标 | 📦 |
| 组件图标 | 📏 |

## 4. 默认尺寸

| 属性 | 值 |
|---|---|
| defaultWidth | 100 |
| defaultHeight | 4 |

> 注意：线条的默认高度为 4px，这是为了在编辑器中提供足够的可交互区域。实际 LVGL 渲染时，线条的视觉高度由 `lineWidth`（线宽）决定。

## 5. 是否为容器

```
isContainer: false
```

线条是纯显示组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Button (btn)** — 作为按钮内的装饰线
- **Container (obj)** — 放置在通用容器内
- **Tab View (tabview)** — 放置在标签页内容区
- **Tile View (tileview)** — 放置在瓦片区域内
- **Window (win)** — 放置在窗口内容区

### 可以包含的子组件

无。线条不是容器，不能包含任何子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `points` | `number[][]` | `[[0,0],[100,0]]` | 线段的点坐标数组，每个点为 `[x, y]` |
| `lineWidth` | `number` | `2` | 线宽（像素），映射到 LVGL 的 `line_width` 样式 |
| `lineColor` | `string` | `undefined` | 线条颜色（可选，覆盖样式中的 `borderColor`） |

### props 类型定义

```typescript
interface LineProps {
  points: number[][];  // [[x1,y1], [x2,y2], ...]
  lineWidth?: number;
  lineColor?: string;
}
```

### points 说明

- 默认值 `[[0,0],[100,0]]` 表示一条从左到右的水平线
- 坐标相对于线条对象自身的原点
- 支持多个点（折线），但编辑器默认只使用两个点（直线段）
- WASM 预览中最多支持 2 个点

## 8. 样式设计（styles）

### 支持的样式状态

| 状态 | 选择器 | 说明 |
|---|---|---|
| `default` | `LV_STATE_DEFAULT` | 默认/正常状态 |
| `pressed` | `LV_STATE_PRESSED` | 按下状态 |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态 |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

### default 状态默认样式

| 样式属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `bgColor` | `string` | `'transparent'` | 背景色（透明） |
| `borderColor` | `string` | `'#212121'` | 边框颜色（用作线条颜色的参考，LVGL 主题 `color_text`） |
| `borderWidth` | `number` | `1` | 边框宽度（映射为 LVGL 的 `line_width`） |
| `borderRadius` | `number` | `0` | 圆角半径（线条不使用） |
| `textColor` | `string` | `'#212121'` | 文本颜色 |
| `opacity` | `number` | `1` | 不透明度 |
| `padding` | `number` | `0` | 内边距 |

### 样式来源说明

线条的默认样式来自 LVGL 默认主题：
- 线条颜色（`line_color`）使用 `color_text`（`#212121`）
- 线宽（`line_width`）默认为 1
- 背景透明

> 注意：在编辑器的样式系统中，线条的颜色和宽度通过 `borderColor` 和 `borderWidth` 字段存储，但在 LVGL 中实际映射到 `line_color` 和 `line_width` 样式属性。`props.lineColor` 和 `props.lineWidth` 提供了更直接的控制方式。

### 扩展样式属性

线条支持以下通用扩展样式：

- 变换：`transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- 混合模式：`blendMode`

## 9. 事件支持

线条支持以下 LVGL 事件类型：

| 事件类型 | 说明 |
|---|---|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

> 注意：线条默认不可点击。由于线条的可交互区域很小，实际使用中很少为线条绑定事件。

## 10. UI 层设计

### 10.1 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，线条使用 React DOM 渲染：

```tsx
<div className="lvgl-line" style={{
  width: '100%',
  height: '2px',
  backgroundColor: defaultStyle.borderColor || defaultStyle.textColor || '#333',
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
}} />
```

关键行为：
- 使用 `div` 元素模拟线条，固定高度 2px
- 垂直居中于组件区域（`top: 50%` + `translateY(-50%)`）
- 颜色取自 `borderColor` 或 `textColor`
- 始终渲染为水平线（不根据 `points` 计算角度）
- 支持选中高亮、悬停效果、拖拽、缩放手柄

### 10.2 简易预览渲染（PreviewPanel.tsx）

在 Canvas 2D 简易预览中，线条使用 `drawLine()` 函数绘制：

```typescript
drawLine(ctx, x, y, w, h, {
  lineColor: comp.props.lineColor || bgColorStyle,
  lineWidth: comp.props.lineWidth || 2,
});
```

绘制实现：

```typescript
function drawLine(ctx, x, y, w, h, opts) {
  ctx.strokeStyle = opts.lineColor;
  ctx.lineWidth = opts.lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}
```

关键行为：
- 使用 Canvas 2D `stroke` 绘制线段
- 线条垂直居中于组件区域
- 线端样式为圆头（`lineCap = 'round'`）
- 颜色取自 `props.lineColor`，回退到样式 `bgColor`
- 线宽取自 `props.lineWidth`，默认 2px
- 支持动画状态叠加

### 10.3 LVGL WASM 预览渲染

#### JSON 序列化（editorStateToJson.ts）

线条被序列化为扁平化的 JSON 组件节点：

```json
{
  "type": "line",
  "id": "comp-xxx",
  "parent": null,
  "x": 10, "y": 50,
  "width": 100, "height": 4,
  "props": { "points": [[0,0],[100,0]] },
  "styles": {
    "default": {
      "bgColor": "transparent",
      "borderColor": "#212121",
      "borderWidth": 1,
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
static lv_obj_t *create_line(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *line = lv_line_create(parent);
    static lv_point_precise_t line_points[2];
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    int w = cjson_get_int(comp, "width", 100);
    line_points[0].x = 0; line_points[0].y = 0;
    line_points[1].x = w; line_points[1].y = 0;

    if (props) {
        cJSON *pts = cJSON_GetObjectItemCaseSensitive(props, "points");
        if (cJSON_IsArray(pts) && cJSON_GetArraySize(pts) >= 2) {
            cJSON *p0 = cJSON_GetArrayItem(pts, 0);
            cJSON *p1 = cJSON_GetArrayItem(pts, 1);
            if (cJSON_IsArray(p0) && cJSON_IsArray(p1)) {
                line_points[0].x = cJSON_GetArrayItem(p0, 0)->valueint;
                line_points[0].y = cJSON_GetArrayItem(p0, 1)->valueint;
                line_points[1].x = cJSON_GetArrayItem(p1, 0)->valueint;
                line_points[1].y = cJSON_GetArrayItem(p1, 1)->valueint;
            }
        }
    }
    lv_line_set_points(line, line_points, 2);
    return line;
}
```

关键行为：
- 调用 `lv_line_create()` 创建线条
- 解析 `props.points` 数组获取两个端点坐标
- 使用 `static` 点数组（LVGL 要求点数据在线条生命周期内有效）
- 默认回退为水平线（`[0,0]` 到 `[width,0]`）
- 调用 `lv_line_set_points()` 设置点坐标
- 应用位置、尺寸、样式

### 10.4 代码生成输出（ui.c.ts）

```c
// Create line: my_line
my_line = lv_line_create(parent);
lv_obj_set_pos(my_line, 10, 50);
lv_obj_set_size(my_line, 100, 4);
lv_obj_set_style_bg_opa(my_line, LV_OPA_TRANSP, 0);
lv_obj_set_style_border_color(my_line, lv_color_hex(0x212121), 0);
lv_obj_set_style_border_width(my_line, 1, 0);

// 自定义线宽（如果 props.lineWidth 非默认值）
lv_obj_set_style_line_width(my_line, 3, 0);

// 自定义线色（如果设置了 props.lineColor）
lv_obj_set_style_line_color(my_line, lv_color_hex(0xFF0000), 0);
```

关键行为：
- 创建函数使用 `lv_line_create`
- `props.lineWidth` 映射到 `lv_obj_set_style_line_width`（仅在非默认值 2 时生成）
- `props.lineColor` 映射到 `lv_obj_set_style_line_color`
- 点坐标数据需要在代码中以 `static` 数组形式存在（当前代码生成器未直接输出点数组，依赖默认行为）

> 注意：当前代码生成器（`generatePropsCode`）中线条的 `points` 属性未生成对应的 `lv_line_set_points` 代码。这是一个已知的简化处理，线条使用默认的水平线行为。

## 11. LVGL API 映射

### 创建函数

| 版本 | API |
|---|---|
| LVGL v9 | `lv_line_create(parent)` |
| LVGL v8 | `lv_line_create(parent)` |

### 关键 API

| API | 说明 |
|---|---|
| `lv_line_create(parent)` | 创建线条对象 |
| `lv_line_set_points(line, points, count)` | 设置线段点坐标数组 |
| `lv_obj_set_style_line_width(line, width, sel)` | 设置线宽 |
| `lv_obj_set_style_line_color(line, color, sel)` | 设置线条颜色 |
| `lv_obj_set_style_line_rounded(line, en, sel)` | 设置线端是否圆头 |
| `lv_obj_set_style_line_dash_width(line, w, sel)` | 设置虚线段宽度 |
| `lv_obj_set_style_line_dash_gap(line, gap, sel)` | 设置虚线间隔 |
| `lv_obj_set_pos(line, x, y)` | 设置位置 |
| `lv_obj_set_size(line, w, h)` | 设置尺寸 |

### 点坐标类型

| 版本 | 类型 | 说明 |
|---|---|---|
| LVGL v9 | `lv_point_precise_t` | 精确点坐标（支持浮点） |
| LVGL v8 | `lv_point_t` | 整数点坐标 |

## 12. 设计注意事项

1. **点数据生命周期**：LVGL 的 `lv_line_set_points` 不会复制点数据，而是保存指针引用。因此点数组必须是 `static` 或全局变量，在线条对象的整个生命周期内保持有效。WASM 预览中使用 `static lv_point_precise_t line_points[2]` 实现。

2. **编辑器简化**：编辑器画布和简易预览中，线条始终渲染为水平线（忽略 `points` 中的实际坐标）。这是一个设计简化，因为在可视化编辑器中精确编辑线段端点需要更复杂的交互设计。

3. **样式映射差异**：线条的颜色和宽度在编辑器样式系统中存储为 `borderColor` 和 `borderWidth`，但在 LVGL 中实际使用 `line_color` 和 `line_width` 样式属性。`props.lineColor` 和 `props.lineWidth` 提供了更精确的控制，优先级高于样式字段。

4. **默认高度**：线条的默认高度为 4px（而非 1px），这是为了在编辑器中提供足够的鼠标交互区域（选中、拖拽、缩放）。实际渲染时线条的视觉高度由线宽决定。

5. **代码生成不完整**：当前代码生成器未输出 `lv_line_set_points` 调用和对应的 `static` 点数组声明。这意味着生成的代码中线条不会显示任何线段，需要用户手动补充点数据。这是一个待改进的功能点。

6. **多点折线**：虽然 `points` 属性支持多个点（折线），但编辑器 UI 目前只支持两点直线段的编辑。WASM 预览也只处理前两个点。

7. **v8/v9 点类型差异**：v9 使用 `lv_point_precise_t`（支持浮点坐标），v8 使用 `lv_point_t`（整数坐标）。代码生成时需要根据版本选择正确的类型。
