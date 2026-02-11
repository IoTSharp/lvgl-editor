# Arc (arc) — 弧形/圆弧组件设计文档

## 1. 组件名称和简介

Arc（弧形/圆弧）是一个环形显示组件，通过弧线的角度范围来展示数值进度。它由一个背景弧线和一个前景指示器弧线组成，常用于仪表盘、旋钮指示、环形进度等场景。与 Bar 的线性进度不同，Arc 以圆弧形式呈现数据，视觉上更加紧凑和美观。

## 2. 组件类型标识

```
type: 'arc'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| display | 显示 | 🔄 |

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 100 |
| defaultHeight | 100 |

Arc 通常为正方形，以确保圆弧居中且不变形。

## 5. 是否为容器

```
isContainer: false
```

Arc 是纯显示组件，不可包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- `obj`（Container）
- `btn`（Button）
- `tabview`（Tab View，放置在某个 tab 页内）
- `tileview`（Tile View，放置在某个 tile 内）
- `win`（Window，放置在 content 区域内）
- 屏幕根节点（Screen）

### 可以包含的子组件

无。`isContainer: false`，不接受任何子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `startAngle` | `number` | `135` | 背景弧线起始角度（度），0° 为 3 点钟方向，顺时针增加 |
| `endAngle` | `number` | `45` | 背景弧线结束角度（度） |
| `value` | `number` | `60` | 当前值，范围 [min, max] |
| `min` | `number` | `0` | 最小值（可选，默认 0） |
| `max` | `number` | `100` | 最大值（可选，默认 100） |
| `mode` | `'normal' \| 'symmetrical' \| 'reverse'` | `'normal'` | 弧线模式（可选扩展） |

### 属性约束

- `startAngle` 和 `endAngle` 的范围为 0-360，当 `startAngle > endAngle` 时弧线跨越 0° 位置
- 默认角度 135°→45° 形成一个约 270° 的弧线（从左下方到右下方，经过顶部），这是 LVGL arc 的经典外观
- `value` 会被 clamp 到 `[min, max]` 范围内

### 角度说明

```
         270° (12点)
          |
180° ----+---- 0° (3点)
(9点)     |
          90° (6点)

默认: startAngle=135 → endAngle=45
弧线从左下 135° 经过 180°→270°→0° 到右下 45°
总弧度 = 360 - 135 + 45 = 270°
```

## 8. 样式设计（styles）

### 默认样式（default state）

| 样式属性 | 默认值 | 说明 |
|----------|--------|------|
| `bgColor` | `transparent` | 背景透明（arc 不需要矩形背景填充） |
| `borderColor` | `#2196F3` | 在编辑器中复用为弧线指示器颜色 |
| `borderWidth` | `15` | 在编辑器中复用为弧线宽度 |
| `borderRadius` | `0` | 不适用（圆弧形状由 SVG/Canvas 绘制） |
| `textColor` | `#212121` | 中心数值文本颜色 |
| `opacity` | `1` | 完全不透明 |
| `padding` | `0` | 无内边距 |

### LVGL Parts 样式映射

| Part | 编辑器样式映射 | LVGL 默认值 |
|------|---------------|-------------|
| `LV_PART_MAIN` | bgColor → bg_opa=TRANSP | 无背景填充 |
| `LV_PART_INDICATOR` | borderColor → arc_color | `#2196F3`（color_primary） |
| `LV_PART_MAIN`（arc） | — | `#E0E0E0`（color_grey）作为背景弧线 |
| `LV_PART_KNOB` | — | 可选旋钮（默认不显示） |

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，始终应用 |
| `pressed` | 按下状态（arc 可配置为可交互） |
| `focused` | 聚焦状态 |
| `disabled` | 禁用状态 |

## 9. 事件支持

| 事件类型 | 说明 |
|----------|------|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | 值变化事件（用户拖动或代码设置时触发） |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

> 注意：LVGL 的 arc 默认是可交互的（用户可以拖动改变值）。在编辑器中作为"显示"分类组件，主要用于只读展示，但不限制用户添加交互事件。

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

```tsx
<div className="lvgl-arc" style={{
  width: '100%', height: '100%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}}>
  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
    {/* 背景弧线 */}
    <circle cx="50" cy="50" r="40" fill="none"
      stroke="#e0e0e0" strokeWidth="8" />
    {/* 指示器弧线 */}
    <circle cx="50" cy="50" r="40" fill="none"
      stroke={defaultStyle.borderColor || '#2196F3'}
      strokeWidth="8"
      strokeDasharray={`${(props.value || 60) * 2.51} 251`}
      strokeLinecap="round"
      transform="rotate(-90 50 50)" />
  </svg>
</div>
```

关键点：
- 使用 SVG `<circle>` + `strokeDasharray` 模拟弧线进度
- 背景圆使用 `#e0e0e0` 灰色
- 指示器颜色取自 `defaultStyle.borderColor`（默认 `#2196F3`）
- `strokeDasharray` 计算：圆周长 ≈ 2π×40 ≈ 251，`value * 2.51` 为填充长度
- `rotate(-90)` 使起点从 12 点钟方向开始

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

```typescript
function drawArc(ctx, x, y, w, h, opts) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(w, h) / 2 - 5;
  const progress = (opts.value - opts.min) / (opts.max - opts.min);
  const startAngle = -Math.PI * 0.75;  // 135° 映射
  const endAngle = Math.PI * 0.75;     // 45° 映射
  const currentAngle = startAngle + (endAngle - startAngle) * progress;

  // 背景弧线
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.stroke();

  // 进度弧线
  ctx.strokeStyle = '#2196f3';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, currentAngle);
  ctx.stroke();

  // 中心数值
  ctx.fillStyle = '#333';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${opts.value}`, centerX, centerY);
}
```

关键点：
- 使用 Canvas 2D `arc()` 绘制弧线
- 默认弧线范围 -135°→135°（约 270° 弧度）
- 在弧线中心绘制当前数值文本
- `lineCap = 'round'` 使弧线端点圆润

### LVGL WASM 预览渲染

**editorStateToJson.ts**：props（startAngle、endAngle、value、min、max）直接序列化。

**ui_from_json.c**：

```c
static lv_obj_t *create_arc(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *arc = lv_arc_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 75);
        lv_arc_set_range(arc, mn, mx);
        lv_arc_set_value(arc, val);
    }
    return arc;
}
```

关键点：
- 使用 `lv_arc_create` 创建真实 LVGL arc 控件
- 当前 WASM 实现未设置 `startAngle`/`endAngle`（使用 LVGL 默认值），可扩展
- 样式通过通用 `apply_styles` 函数应用

### 代码生成输出（ui.c.ts）

```c
// 创建
lv_obj_t *arc_1 = lv_arc_create(parent);
lv_obj_set_pos(arc_1, 50, 50);
lv_obj_set_size(arc_1, 100, 100);

// 样式
lv_obj_set_style_bg_opa(arc_1, LV_OPA_TRANSP, 0);
lv_obj_set_style_border_color(arc_1, lv_color_hex(0x2196F3), 0);
lv_obj_set_style_border_width(arc_1, 15, 0);

// 属性
lv_arc_set_bg_angles(arc_1, 135, 45);
lv_arc_set_range(arc_1, 0, 100);
lv_arc_set_value(arc_1, 60);
```

可选模式设置：

```c
// mode 属性
lv_arc_set_mode(arc_1, LV_ARC_MODE_NORMAL);      // 默认
lv_arc_set_mode(arc_1, LV_ARC_MODE_SYMMETRICAL);  // 对称模式
lv_arc_set_mode(arc_1, LV_ARC_MODE_REVERSE);      // 反向模式
```

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_arc_create(parent)` |

### 关键 API

| API | 说明 |
|-----|------|
| `lv_arc_set_range(arc, min, max)` | 设置值范围 |
| `lv_arc_set_value(arc, value)` | 设置当前值 |
| `lv_arc_set_bg_angles(arc, start, end)` | 设置背景弧线的起止角度 |
| `lv_arc_set_angles(arc, start, end)` | 直接设置指示器弧线角度 |
| `lv_arc_set_mode(arc, mode)` | 设置模式：NORMAL / SYMMETRICAL / REVERSE |
| `lv_arc_set_rotation(arc, deg)` | 设置整体旋转偏移 |
| `lv_arc_get_value(arc)` | 获取当前值 |
| `lv_arc_get_angle_start(arc)` | 获取指示器起始角度 |
| `lv_arc_get_angle_end(arc)` | 获取指示器结束角度 |

### LVGL Parts

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 背景弧线（track） |
| `LV_PART_INDICATOR` | 前景指示器弧线 |
| `LV_PART_KNOB` | 旋钮（弧线末端的圆形手柄） |

### 默认主题样式（lv_theme_default）

- **MAIN part（arc track）**：`arc_color = color_grey`（`#E0E0E0`），`arc_width` 由组件大小决定
- **INDICATOR part**：`arc_color = color_primary`（`#2196F3`）
- **KNOB part**：默认不显示，可通过样式启用

## 12. 设计注意事项

1. **角度系统差异**：LVGL 的角度系统以 3 点钟方向为 0°，顺时针增加。编辑器画布使用 SVG/Canvas 渲染时需要做角度转换（Canvas 2D 的 0° 也在 3 点钟方向，但 SVG 的 `rotate(-90)` 将起点移到 12 点钟方向）。

2. **borderColor/borderWidth 的复用**：在编辑器的 `StyleProps` 中没有专门的 `arcColor`/`arcWidth` 属性，因此复用 `borderColor` 和 `borderWidth` 来表示弧线颜色和宽度。这在代码生成时需要特殊处理——不应生成 `lv_obj_set_style_border_*`，而应映射到 `lv_obj_set_style_arc_color` 和 `lv_obj_set_style_arc_width`。

3. **透明背景**：Arc 的 `bgColor` 默认为 `transparent`，这是正确的——arc 不需要矩形背景填充。在编辑器画布中，`resolvedBgColor` 对 arc 类型保持 `transparent`，不做 fallback。

4. **正方形约束**：Arc 在非正方形容器中会变形。编辑器可以在属性面板中提供"保持正方形"的约束选项，或在调整大小时自动保持宽高一致。

5. **可交互性**：LVGL 的 arc 默认是可交互的（用户可以拖动旋钮改变值）。如果仅用于显示，应在代码中移除 `LV_OBJ_FLAG_CLICKABLE` 或使用 `lv_arc_set_mode` 配合适当设置。

6. **Spinner 的关系**：Spinner 组件本质上是一个持续旋转动画的 Arc。它们共享相同的默认样式（`bgColor=transparent, borderColor=#2196F3, borderWidth=15`），但 Spinner 不暴露 value/angle 属性。

7. **WASM 预览的角度设置**：当前 `ui_from_json.c` 中的 `create_arc` 未设置 `startAngle`/`endAngle`，使用 LVGL 默认值。如需完全还原编辑器设计，应扩展 WASM 端读取这两个属性并调用 `lv_arc_set_bg_angles`。
