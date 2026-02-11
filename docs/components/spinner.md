# Spinner (spinner) — 加载动画组件设计文档

## 1. 组件名称和简介

Spinner（加载动画）是 LVGL 编辑器中用于显示加载/等待状态的显示组件。在 LVGL 中，Spinner 是基于 Arc（弧形）的特殊组件，通过持续旋转的弧形动画来指示后台操作正在进行。Spinner 的旋转速度和弧形长度可以通过属性配置。

Spinner 不是容器组件（`isContainer = false`），不能包含子组件。

## 2. 组件类型标识

```
type: 'spinner'
```

## 3. 所属分类

| 字段 | 值 |
|---|---|
| 分类 ID | `display` |
| 分类名称 | 显示 |
| 分类图标 | 📊 |
| 组件图标 | ⏳ |

## 4. 默认尺寸

| 属性 | 值 |
|---|---|
| defaultWidth | 50 |
| defaultHeight | 50 |

> Spinner 通常为正方形，宽高相等，以确保圆形旋转动画的正确显示。

## 5. 是否为容器

```
isContainer: false
```

Spinner 是纯显示组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Button (btn)** — 作为按钮内的加载状态指示
- **Container (obj)** — 放置在通用容器内
- **Tab View (tabview)** — 放置在标签页内容区
- **Tile View (tileview)** — 放置在瓦片区域内
- **Window (win)** — 放置在窗口内容区

### 可以包含的子组件

无。Spinner 不是容器，不能包含任何子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `speed` | `number` | `1000` | 旋转一圈的时间（毫秒） |
| `arcLength` | `number` | `60` | 旋转弧形的角度长度（度） |

### props 类型定义

```typescript
interface SpinnerProps {
  speed: number;
  arcLength?: number;
}
```

### 属性说明

- `speed`：控制 Spinner 旋转速度。值越小旋转越快。1000ms 表示 1 秒转一圈。
- `arcLength`：控制旋转弧形的可见长度。60° 表示弧形占圆周的 1/6。值越大弧形越长。

这两个属性在 LVGL 中通过 `lv_spinner_create(parent, speed, arcLength)` 的创建函数参数传入，创建后不可动态修改。

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
| `borderColor` | `string` | `'#2196F3'` | 边框颜色（用作弧形指示器颜色，LVGL 主题 primary 色） |
| `borderWidth` | `number` | `15` | 边框宽度（映射为弧形线宽） |
| `borderRadius` | `number` | `0` | 圆角半径（不使用） |
| `textColor` | `string` | `'#212121'` | 文本颜色 |
| `opacity` | `number` | `1` | 不透明度 |
| `padding` | `number` | `0` | 内边距 |

### 样式来源说明

Spinner 的默认样式与 Arc 组件相同，来自 LVGL 默认主题：
- 弧形背景轨道颜色：`#E0E0E0`（`color_grey`）
- 弧形指示器颜色：`#2196F3`（`color_primary`）
- 弧形线宽：15px

> 注意：在编辑器样式系统中，`borderColor` 用于存储弧形指示器颜色，`borderWidth` 用于存储弧形线宽。这是一种映射约定，实际 LVGL 中使用 `arc_color`（`LV_PART_INDICATOR`）和 `arc_width` 样式属性。

### 扩展样式属性

Spinner 支持以下通用扩展样式：

- 变换：`transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- 混合模式：`blendMode`

## 9. 事件支持

Spinner 支持以下 LVGL 事件类型：

| 事件类型 | 说明 |
|---|---|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

> 注意：Spinner 通常不需要绑定事件，它是一个纯粹的视觉反馈组件。默认不可点击。

## 10. UI 层设计

### 10.1 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，Spinner 使用 React DOM + CSS 动画渲染：

```tsx
<div className="lvgl-spinner" style={{
  width: '100%', height: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}}>
  <div style={{
    width: '80%', height: '80%',
    border: '4px solid #e0e0e0',
    borderTopColor: defaultStyle.borderColor || '#2196F3',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  }} />
</div>
```

关键行为：
- 使用 CSS `border` 技巧模拟旋转弧形：灰色圆环 + 彩色顶部边框
- 通过 CSS `animation: spin 1s linear infinite` 实现持续旋转
- 弧形颜色取自 `borderColor`（默认 `#2196F3`）
- 背景轨道颜色固定为 `#e0e0e0`
- 内部圆环尺寸为组件的 80%
- 透明背景（`resolvedBgColor` 对 spinner 类型返回 `'transparent'`）
- 支持选中高亮、悬停效果、拖拽、缩放手柄

> 需要在 CSS 中定义 `@keyframes spin { to { transform: rotate(360deg); } }`

### 10.2 简易预览渲染（PreviewPanel.tsx）

在 Canvas 2D 简易预览中，Spinner 使用 `drawSpinner()` 函数绘制：

```typescript
drawSpinner(ctx, x, y, w, h, {
  borderColor: styles.borderColor || '#2196F3',
});
```

绘制实现：

```typescript
function drawSpinner(ctx, x, y, w, h, opts) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 - 4;

  // 背景圆环
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 旋转弧形（静态快照）
  ctx.strokeStyle = opts.borderColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, Math.PI / 3);
  ctx.stroke();
}
```

关键行为：
- 绘制完整的灰色背景圆环
- 在其上绘制一段彩色弧形（从 -90° 到 60°，约 150° 弧长）
- 弧形端点为圆头（`lineCap = 'round'`）
- 简易预览中 Spinner 是静态的（不旋转），仅显示一个快照状态
- 线宽固定为 4px（简化渲染）
- 支持动画状态叠加

### 10.3 LVGL WASM 预览渲染

#### JSON 序列化（editorStateToJson.ts）

Spinner 被序列化为扁平化的 JSON 组件节点：

```json
{
  "type": "spinner",
  "id": "comp-xxx",
  "parent": null,
  "x": 100, "y": 100,
  "width": 50, "height": 50,
  "props": { "speed": 1000 },
  "styles": {
    "default": {
      "bgColor": "transparent",
      "borderColor": "#2196F3",
      "borderWidth": 15,
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
static lv_obj_t *create_spinner(lv_obj_t *parent, const cJSON *comp) {
    (void)comp;
    return lv_spinner_create(parent);
}
```

关键行为：
- 调用 `lv_spinner_create(parent)` 创建 Spinner（v9 简化签名）
- 当前 WASM 预览未传递 `speed` 和 `arcLength` 参数（使用 LVGL 默认值）
- LVGL 内部自动启动旋转动画
- 应用位置、尺寸、样式

> 注意：WASM 预览中 Spinner 会真正旋转（由 LVGL 内部动画驱动），这是与编辑器画布和简易预览的主要区别。

### 10.4 代码生成输出（ui.c.ts）

```c
// Create spinner: my_spinner
my_spinner = lv_spinner_create(parent, 1000, 60);
lv_obj_set_pos(my_spinner, 100, 100);
lv_obj_set_size(my_spinner, 50, 50);
lv_obj_set_style_bg_opa(my_spinner, LV_OPA_TRANSP, 0);
lv_obj_set_style_border_color(my_spinner, lv_color_hex(0x2196F3), 0);
lv_obj_set_style_border_width(my_spinner, 15, 0);
```

关键行为：
- 创建函数使用特殊签名：`lv_spinner_create(parent, speed, arcLength)`
- `speed` 和 `arcLength` 作为创建参数传入（不是后续设置的属性）
- 如果 `speed` 或 `arcLength` 为非默认值，代码生成器会输出注释说明
- Spinner 的属性在创建后不可通过 API 修改（LVGL 限制）

代码生成器中的特殊处理（`getCreateFunction`）：

```typescript
if (type === 'spinner') {
  const speed = props?.speed || 1000;
  const arcLength = props?.arcLength || 60;
  return `lv_spinner_create(${parentVar}, ${speed}, ${arcLength})`;
}
```

属性代码生成（`generatePropsCode`）：

```typescript
case 'spinner':
  if (props.speed && props.speed !== 1000) {
    lines.push(`// Note: Spinner speed ${props.speed}ms set in create function`);
  }
  if (props.arcLength && props.arcLength !== 60) {
    lines.push(`// Note: Spinner arc length ${props.arcLength}° set in create function`);
  }
  break;
```

## 11. LVGL API 映射

### 创建函数

| 版本 | API | 说明 |
|---|---|---|
| LVGL v9 | `lv_spinner_create(parent)` | 简化签名（WASM 预览使用） |
| LVGL v9 | `lv_spinner_create(parent, speed, arcLength)` | 完整签名（代码生成使用） |
| LVGL v8 | `lv_spinner_create(parent, speed, arcLength)` | 完整签名 |

> 注意：LVGL v9 中 `lv_spinner_create` 的签名在不同版本/配置中可能有差异。代码生成器使用带参数的版本以确保兼容性。

### 关键 API

| API | 说明 |
|---|---|
| `lv_spinner_create(parent, speed, arc_length)` | 创建 Spinner 并设置速度和弧长 |
| `lv_obj_set_pos(spinner, x, y)` | 设置位置 |
| `lv_obj_set_size(spinner, w, h)` | 设置尺寸 |
| `lv_obj_set_style_arc_color(spinner, color, LV_PART_INDICATOR)` | 设置弧形指示器颜色 |
| `lv_obj_set_style_arc_width(spinner, width, LV_PART_INDICATOR)` | 设置弧形指示器线宽 |
| `lv_obj_set_style_arc_color(spinner, color, LV_PART_MAIN)` | 设置背景轨道颜色 |
| `lv_obj_set_style_arc_width(spinner, width, LV_PART_MAIN)` | 设置背景轨道线宽 |
| `lv_obj_add_flag(spinner, LV_OBJ_FLAG_HIDDEN)` | 隐藏 Spinner |

### Spinner 与 Arc 的关系

Spinner 是 Arc 的特殊化版本：
- Spinner 内部创建了一个 Arc 对象
- 自动添加旋转动画（`lv_anim`）
- 不支持用户交互（不可拖动弧形）
- 不支持设置 value/range（与 Arc 不同）

## 12. 设计注意事项

1. **创建时参数**：`speed` 和 `arcLength` 是创建时参数，通过 `lv_spinner_create` 传入。创建后无法通过 API 修改这两个值。如需更改，必须销毁并重新创建 Spinner。

2. **三层渲染差异**：
   - 编辑器画布：CSS 动画持续旋转（视觉效果最接近真实）
   - 简易预览：静态弧形快照（不旋转）
   - WASM 预览：LVGL 内部动画驱动旋转（真实 LVGL 行为）

3. **样式映射约定**：编辑器样式系统中 `borderColor` 映射为弧形指示器颜色，`borderWidth` 映射为弧形线宽。在 LVGL 中，这些实际上是 `arc_color` 和 `arc_width` 样式属性，应用于 `LV_PART_INDICATOR`。

4. **背景轨道**：Spinner 的灰色背景轨道颜色（`#E0E0E0`）在编辑器中是硬编码的，不通过样式系统暴露。在 LVGL 中可以通过 `LV_PART_MAIN` 的 `arc_color` 样式修改。

5. **正方形约束**：Spinner 应保持宽高相等以确保圆形外观。编辑器不强制此约束，但建议在 UI 中提示用户保持正方形。

6. **WASM 预览简化**：当前 WASM 预览中 `create_spinner` 未传递 `speed` 和 `arcLength` 参数，使用 LVGL 默认值。这意味着用户在编辑器中修改这两个属性后，WASM 预览不会反映变化。

7. **性能考虑**：Spinner 的旋转动画由 LVGL 内部的 `lv_anim` 系统驱动，会持续触发重绘。在资源受限的嵌入式设备上，多个 Spinner 同时运行可能影响性能。

8. **隐藏/显示**：Spinner 通常在异步操作开始时显示、结束时隐藏。可以通过 `LV_OBJ_FLAG_HIDDEN` flag 控制，或通过事件系统的 `show`/`hide` 内置动作实现。
