# Progress Bar (bar) — 进度条组件设计文档

## 1. 组件名称和简介

Progress Bar（进度条）是一个只读的显示型组件，用于展示某个数值在给定范围内的进度。它由一个背景轨道和一个填充指示器组成，填充比例由 `value`、`min`、`max` 三个属性决定。在嵌入式 UI 中常用于显示下载进度、电池电量、加载状态等场景。

## 2. 组件类型标识

```
type: 'bar'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| display | 显示 | 📊 |

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 150 |
| defaultHeight | 20 |

## 5. 是否为容器

```
isContainer: false
```

Progress Bar 是纯显示组件，不可包含子组件。

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
| `min` | `number` | `0` | 进度条最小值 |
| `max` | `number` | `100` | 进度条最大值 |
| `value` | `number` | `60` | 当前进度值，范围 [min, max] |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 方向（可选扩展），垂直模式通过旋转 90° 实现 |

### 属性约束

- `min` 必须小于 `max`
- `value` 会被 clamp 到 `[min, max]` 范围内
- 填充百分比计算公式：`percent = (value - min) / (max - min) * 100`

## 8. 样式设计（styles）

### 默认样式（default state）

| 样式属性 | 默认值 | 说明 |
|----------|--------|------|
| `bgColor` | `#D3EAFD` | 背景轨道颜色（LVGL primary muted = primary@20% over white） |
| `borderColor` | `transparent` | 无边框 |
| `borderWidth` | `0` | 无边框 |
| `borderRadius` | `9999` | 完全圆角（胶囊形状），与 LVGL 默认 bar 的 circle 样式一致 |
| `textColor` | `#212121` | 文本颜色（bar 本身不显示文本，但继承给可能的子标签） |
| `opacity` | `1` | 完全不透明 |
| `padding` | `0` | 无内边距 |

### 指示器样式

在 LVGL 中，bar 的填充部分使用 `LV_PART_INDICATOR`，颜色为 `color_primary`（`#2196F3`）。在编辑器画布和预览中，指示器颜色硬编码为 `#2196F3`。

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，始终应用 |
| `pressed` | 按下状态（bar 通常不可交互，但支持样式覆盖） |
| `focused` | 聚焦状态（键盘/编码器导航时） |
| `disabled` | 禁用状态，通常降低透明度 |

每个状态均可覆盖 `StyleProps` 中定义的所有样式属性（bgColor、borderColor、borderWidth、borderRadius、textColor、opacity、padding、shadow*、transform*、outline* 等）。

## 9. 事件支持

Bar 是只读显示组件，支持的 LVGL 事件类型：

| 事件类型 | 说明 |
|----------|------|
| `LV_EVENT_CLICKED` | 点击事件（如果设置了 clickable flag） |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | 值变化事件（通过代码设置 value 时触发） |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

### 内置动作支持

通过 `EventBinding` 可绑定以下内置动作：

- `navigate` — 页面跳转
- `setProperty` — 设置目标组件属性
- `show` / `hide` — 显示/隐藏目标组件
- `enable` / `disable` — 启用/禁用目标组件
- `setText` / `setValue` — 设置目标组件文本/值

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

```tsx
// 计算填充百分比
const barMin = props.min ?? 0;
const barMax = props.max ?? 100;
const barVal = props.value ?? 60;
const barPercent = barMax > barMin
  ? Math.max(0, Math.min(100, (barVal - barMin) / (barMax - barMin) * 100))
  : 0;

// 渲染结构：外层背景轨道 + 内层填充条
<div className="lvgl-bar" style={{
  width: '100%', height: '100%',
  backgroundColor: '#e0e0e0',
  borderRadius: defaultStyle.borderRadius,
  overflow: 'hidden',
}}>
  <div style={{
    width: `${barPercent}%`, height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: defaultStyle.borderRadius,
    transition: 'width 0.15s',
  }} />
</div>
```

关键点：
- 外层 div 作为背景轨道，使用 `#e0e0e0` 灰色
- 内层 div 作为填充指示器，使用 `#2196F3` 主题色
- `borderRadius` 从样式继承，默认 9999 实现胶囊形状
- 添加 `transition` 使属性面板调整 value 时有平滑动画

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

```typescript
function drawBar(ctx, x, y, w, h, opts) {
  const progress = (opts.value - opts.min) / (opts.max - opts.min);
  // 背景轨道
  ctx.fillStyle = '#e0e0e0';
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  // 填充指示器
  ctx.fillStyle = '#2196f3';
  roundRect(ctx, x, y, w * progress, h, 4);
  ctx.fill();
}
```

关键点：
- 使用 Canvas 2D `roundRect` 辅助函数绘制圆角矩形
- 先绘制灰色背景，再绘制蓝色填充
- 填充宽度 = 总宽度 × progress

### LVGL WASM 预览渲染

**editorStateToJson.ts**：将组件树扁平化为 JSON，bar 组件的 props（min、max、value）直接序列化传递。

**ui_from_json.c**：

```c
static lv_obj_t *create_bar(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *bar = lv_bar_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 50);
        lv_bar_set_range(bar, mn, mx);
        lv_bar_set_value(bar, val, LV_ANIM_OFF);
    }
    return bar;
}
```

关键点：
- 使用 `lv_bar_create` 创建真实 LVGL bar 控件
- 从 JSON props 读取 min/max/value 并设置
- 样式通过通用 `apply_styles` 函数应用

### 代码生成输出（ui.c.ts）

```c
// 创建
lv_obj_t *bar_1 = lv_bar_create(parent);
lv_obj_set_pos(bar_1, 10, 50);
lv_obj_set_size(bar_1, 150, 20);

// 样式
lv_obj_set_style_bg_color(bar_1, lv_color_hex(0xD3EAFD), 0);
lv_obj_set_style_bg_opa(bar_1, LV_OPA_COVER, 0);
lv_obj_set_style_radius(bar_1, 9999, 0);

// 属性
lv_bar_set_range(bar_1, 0, 100);
lv_bar_set_value(bar_1, 60, LV_ANIM_OFF);
```

垂直方向支持：

```c
// orientation === 'vertical' 时
lv_obj_set_style_transform_rotation(bar_1, 900, 0);  // LVGL v9
// 或
lv_obj_set_style_transform_angle(bar_1, 900, 0);     // LVGL v8
```

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_bar_create(parent)` |

### 关键 API

| API | 说明 |
|-----|------|
| `lv_bar_set_range(bar, min, max)` | 设置值范围 |
| `lv_bar_set_value(bar, value, LV_ANIM_OFF)` | 设置当前值 |
| `lv_bar_set_start_value(bar, value, LV_ANIM_OFF)` | 设置起始值（用于范围模式） |
| `lv_bar_set_mode(bar, mode)` | 设置模式：`LV_BAR_MODE_NORMAL` / `LV_BAR_MODE_SYMMETRICAL` / `LV_BAR_MODE_RANGE` |
| `lv_bar_get_value(bar)` | 获取当前值 |
| `lv_bar_get_min_value(bar)` | 获取最小值 |
| `lv_bar_get_max_value(bar)` | 获取最大值 |

### LVGL Parts

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 背景轨道 |
| `LV_PART_INDICATOR` | 填充指示器 |

### 默认主题样式（lv_theme_default）

- **MAIN part**：`bg_color = color_primary_muted`（`#D3EAFD`），`radius = LV_RADIUS_CIRCLE`
- **INDICATOR part**：`bg_color = color_primary`（`#2196F3`），`radius = LV_RADIUS_CIRCLE`

## 12. 设计注意事项

1. **只读 vs 可交互**：Bar 是只读显示组件，与 Slider 不同。Slider 允许用户拖动改变值，Bar 只能通过代码设置值。在编辑器中不需要提供拖动交互。

2. **指示器颜色不可直接配置**：当前编辑器的 `StyleProps` 只作用于 `LV_PART_MAIN`。指示器（`LV_PART_INDICATOR`）的颜色在画布和预览中硬编码为 `#2196F3`。未来可扩展 props 增加 `indicatorColor` 属性。

3. **borderRadius = 9999 的含义**：在 CSS 和 LVGL 中，超大圆角值会自动 clamp 为组件短边的一半，形成胶囊/药丸形状。这是 LVGL bar 的默认外观。

4. **垂直方向**：LVGL 原生不支持垂直 bar，需要通过旋转 90° 实现。代码生成时使用 `transform_rotation`（v9）或 `transform_angle`（v8），值为 900（0.1° 单位）。

5. **动画过渡**：`lv_bar_set_value` 的第三个参数可以是 `LV_ANIM_ON` 来启用平滑过渡动画。编辑器默认生成 `LV_ANIM_OFF`，用户可在自定义代码中修改。

6. **值范围校验**：编辑器属性面板应确保 `min < max`，且 `value` 在 `[min, max]` 范围内。超出范围的值应自动 clamp。

7. **与 Slider 的样式一致性**：Bar 和 Slider 在 LVGL 默认主题中共享相同的背景样式（`color_primary_muted` + circle），保持视觉一致性。
