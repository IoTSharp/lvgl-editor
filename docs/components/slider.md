# Slider — 滑块

## 1. 组件名称和简介

**Slider** 是一个滑块组件，对应 LVGL 的 `lv_slider` 控件。用户通过拖动旋钮在指定范围内选择一个数值。在嵌入式 UI 中常用于音量调节、亮度控制、参数设置等场景。

## 2. 组件类型标识

```
type: 'slider'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| `input` | 输入 | ✏️ |

组件面板图标：🎚️

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 150 |
| defaultHeight | 20 |

## 5. 是否为容器

```
isContainer: false
```

Slider 不是容器组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Container (obj)** — 放置在通用容器内（常见用法：与 Label 配合显示当前值）
- **Tab View (tabview)** — 放置在标签页内容区域
- **Tile View (tileview)** — 放置在瓦片区域
- **Window (win)** — 放置在窗口内容区域

### 可以包含的子组件

无。Slider 是叶子节点组件，不支持嵌套子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `min` | `number` | `0` | 最小值 |
| `max` | `number` | `100` | 最大值 |
| `value` | `number` | `50` | 当前值，必须在 [min, max] 范围内 |
| `step` | `number` | `undefined` | 步进值，不设置则连续滑动 |
| `orientation` | `string` | `undefined` | 方向：默认水平，设为 `'vertical'` 时垂直显示 |

### 属性定义（componentDefinitions.ts）

```typescript
defaultProps: { min: 0, max: 100, value: 50 }
```

## 8. 样式设计（styles）

### 支持的样式状态

| 状态 | 选择器 | 说明 |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | 默认状态 |
| `pressed` | `LV_STATE_PRESSED` | 拖动旋钮时的状态 |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态 |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

### 默认样式（default 状态）

Slider 轨道使用 LVGL 主题的 `color_primary_muted`（主题色 20% 透明度叠加白色），全圆角设计。

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| `bgColor` | `string` | `'#D3EAFD'` | 轨道背景色，LVGL color_primary_muted |
| `borderColor` | `string` | `'transparent'` | 边框颜色，默认无边框 |
| `borderWidth` | `number` | `0` | 边框宽度 |
| `borderRadius` | `number` | `9999` | 圆角半径，9999 表示全圆角 |
| `textColor` | `string` | `'#212121'` | 文本颜色（Slider 本身无文本，保留用于一致性） |
| `opacity` | `number` | `1` | 不透明度 |
| `padding` | `number` | `0` | 内边距 |

### LVGL 主题中的部件样式

在 LVGL 默认主题中：
- **轨道（MAIN）**：`bgColor = #D3EAFD`（primary_muted），全圆角
- **指示器（INDICATOR）**：`bgColor = #2196F3`（primary），全圆角，表示已选择的范围
- **旋钮（KNOB）**：`bgColor = #2196F3`（primary），圆形，带阴影

### 建议的 disabled 状态样式

```typescript
disabled: {
  bgColor: '#E0E0E0',
  opacity: 0.5,
}
```

## 9. 事件支持

| LVGL 事件类型 | 说明 |
|--------------|------|
| `LV_EVENT_VALUE_CHANGED` | 值发生变化时触发（拖动过程中持续触发，最常用） |
| `LV_EVENT_PRESSED` | 按下旋钮时触发 |
| `LV_EVENT_RELEASED` | 释放旋钮时触发 |
| `LV_EVENT_CLICKED` | 点击时触发 |
| `LV_EVENT_FOCUSED` | 获得焦点时触发 |
| `LV_EVENT_DEFOCUSED` | 失去焦点时触发 |

最常用的事件是 `LV_EVENT_VALUE_CHANGED`，在用户拖动滑块时持续触发。可通过 `lv_slider_get_value(slider)` 获取当前值。

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，Slider 渲染为一个水平轨道 + 填充条 + 圆形旋钮：

```tsx
<div className="lvgl-slider" style={{
  width: '100%',
  height: '100%',
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
}}>
  {/* 轨道 */}
  <div style={{
    width: '100%',
    height: '4px',
    backgroundColor: '#e0e0e0',
    borderRadius: '2px',
    position: 'relative',
  }}>
    {/* 填充条（已选择范围） */}
    <div style={{
      width: `${percentage}%`,
      height: '100%',
      backgroundColor: '#2196F3',
      borderRadius: '2px',
    }} />
  </div>
  {/* 旋钮 */}
  <div style={{
    position: 'absolute',
    left: `calc(${percentage}% - 8px)`,
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    backgroundColor: '#2196F3',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  }} />
</div>
```

其中 `percentage` 的计算公式：
```
percentage = ((value - min) / (max - min)) * 100
```

- 轨道高度固定 4px，居中显示
- 填充条从左侧到旋钮位置，颜色为主题蓝色
- 旋钮为 16px 圆形，带阴影效果

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

使用 `drawSlider` 函数在 Canvas 2D 上绘制：

```typescript
function drawSlider(ctx, x, y, w, h, opts) {
  const trackHeight = 6;
  const trackY = y + (h - trackHeight) / 2;
  const progress = (opts.value - opts.min) / (opts.max - opts.min);
  const knobX = x + progress * w;

  // 1. 绘制轨道背景
  ctx.fillStyle = '#e0e0e0';
  roundRect(ctx, x, trackY, w, trackHeight, 3);
  ctx.fill();

  // 2. 绘制填充条
  ctx.fillStyle = '#2196f3';
  roundRect(ctx, x, trackY, w * progress, trackHeight, 3);
  ctx.fill();

  // 3. 绘制旋钮
  ctx.fillStyle = '#2196f3';
  ctx.beginPath();
  ctx.arc(knobX, y + h / 2, 8, 0, Math.PI * 2);
  ctx.fill();
}
```

### LVGL WASM 预览渲染（ui_from_json.c）

通过 JSON 传递给 WASM 端，由 `create_slider` 函数创建真实 LVGL 控件：

```c
static lv_obj_t *create_slider(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *slider = lv_slider_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 50);
        lv_slider_set_range(slider, mn, mx);
        lv_slider_set_value(slider, val, LV_ANIM_OFF);
    }
    return slider;
}
```

WASM 预览中 Slider 完全可交互，用户可以拖动旋钮改变值。

### 代码生成输出（ui.c.ts）

```c
// Create slider: my_slider
my_slider = lv_slider_create(parent);
lv_obj_set_pos(my_slider, 10, 20);
lv_obj_set_size(my_slider, 150, 20);

// Styles
lv_obj_set_style_bg_color(my_slider, lv_color_hex(0xD3EAFD), 0);
lv_obj_set_style_bg_opa(my_slider, LV_OPA_COVER, 0);
lv_obj_set_style_radius(my_slider, 9999, 0);

// Props
lv_slider_set_range(my_slider, 0, 100);
lv_slider_set_value(my_slider, 50, LV_ANIM_OFF);
```

支持的扩展属性代码生成：
- `step` → 需要在事件回调中自定义步进逻辑（生成注释提示）
- `orientation: 'vertical'` → `lv_obj_set_style_transform_rotation(slider, 900, 0)`（v9）/ `lv_obj_set_style_transform_angle(slider, 900, 0)`（v8）

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_slider_create(parent)` |

### 关键 API

| API 函数 | 说明 |
|----------|------|
| `lv_slider_set_value(slider, val, anim)` | 设置当前值 |
| `lv_slider_get_value(slider)` | 获取当前值 |
| `lv_slider_set_range(slider, min, max)` | 设置值范围 |
| `lv_slider_set_left_value(slider, val, anim)` | 设置左侧值（范围模式） |
| `lv_slider_get_left_value(slider)` | 获取左侧值（范围模式） |
| `lv_slider_set_mode(slider, mode)` | 设置模式（NORMAL / SYMMETRICAL / RANGE） |
| `lv_slider_is_dragged(slider)` | 查询是否正在拖动 |

### 样式部件（Parts）

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 轨道（track）背景区域 |
| `LV_PART_INDICATOR` | 填充指示器（从最小值到当前值的彩色区域） |
| `LV_PART_KNOB` | 旋钮（可拖动的圆形手柄） |

常用样式组合：
- `LV_PART_MAIN | LV_STATE_DEFAULT` — 轨道背景色、圆角
- `LV_PART_INDICATOR` — 填充条颜色
- `LV_PART_KNOB` — 旋钮大小、颜色、阴影
- `LV_PART_KNOB | LV_STATE_PRESSED` — 拖动时旋钮的样式变化

## 12. 设计注意事项

1. **值范围验证**：编辑器应确保 `value` 始终在 `[min, max]` 范围内。渲染时使用 `Math.max(0, Math.min(100, ...))` 进行百分比裁剪，防止旋钮超出轨道。

2. **与 Bar 的区别**：Slider 和 Bar（进度条）视觉上非常相似，但 Slider 可交互（有旋钮），Bar 仅用于显示。两者共享相同的轨道 + 指示器结构，但 Slider 额外有 `LV_PART_KNOB`。

3. **垂直方向**：LVGL 原生不直接支持垂直 Slider，而是通过旋转 90° 实现。代码生成时使用 `transform_rotation(900)` 或 `transform_angle(900)`。编辑器画布中暂不支持垂直渲染。

4. **步进值**：LVGL 没有内置的步进（step）属性。如需步进效果，需要在 `LV_EVENT_VALUE_CHANGED` 回调中手动将值对齐到步进网格。代码生成时会添加注释提示。

5. **全圆角设计**：`borderRadius: 9999` 确保轨道和指示器呈现圆角胶囊形状。这是 Slider 的标准视觉风格，与 Bar 组件一致。

6. **旋钮大小**：编辑器画布中旋钮固定为 16px 直径。LVGL 中旋钮大小通过 `LV_PART_KNOB` 的 padding 控制（padding 越大旋钮越大）。

7. **拖动交互**：编辑器画布和简易预览中 Slider 不可拖动，仅显示静态状态。WASM 预览中可以完全交互拖动。

8. **高度建议**：默认高度 20px 包含了旋钮的显示空间。轨道本身只有 4~6px 高，旋钮居中显示。如果高度设置过小（< 16px），旋钮可能被裁剪。

9. **颜色层次**：Slider 使用三层颜色：
   - 轨道背景：`#D3EAFD`（浅蓝，primary_muted）
   - 填充指示器：`#2196F3`（主题蓝色）
   - 旋钮：`#2196F3`（主题蓝色）+ 阴影
   
   这种层次感在编辑器画布和简易预览中都有体现。

10. **范围模式**：LVGL 支持 `LV_SLIDER_MODE_RANGE`（双旋钮范围选择），但编辑器当前不支持此模式。如需使用，需在生成代码中手动添加。
