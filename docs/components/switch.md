# Switch — 开关

## 1. 组件名称和简介

**Switch** 是一个开关切换组件，对应 LVGL 的 `lv_switch` 控件。提供一个滑动式的开/关切换控件，用户点击或滑动可切换状态。在嵌入式 UI 中常用于功能开关、模式切换、WiFi/蓝牙开关等场景。

## 2. 组件类型标识

```
type: 'switch'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| `input` | 输入 | ✏️ |

组件面板图标：🔀

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 50 |
| defaultHeight | 26 |

## 5. 是否为容器

```
isContainer: false
```

Switch 不是容器组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Container (obj)** — 放置在通用容器内（常见用法：与 Label 配合组成设置项）
- **Tab View (tabview)** — 放置在标签页内容区域
- **Tile View (tileview)** — 放置在瓦片区域
- **Window (win)** — 放置在窗口内容区域

### 可以包含的子组件

无。Switch 是叶子节点组件，不支持嵌套子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `checked` | `boolean` | `false` | 是否为开启状态。开启时旋钮滑到右侧，轨道变为主题色 |

### 属性定义（componentDefinitions.ts）

```typescript
defaultProps: { checked: false }
```

## 8. 样式设计（styles）

### 支持的样式状态

| 状态 | 选择器 | 说明 |
|------|--------|------|
| `default` | `LV_STATE_DEFAULT` | 默认关闭状态 |
| `pressed` | `LV_STATE_PRESSED` | 按下状态 |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态 |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

注意：`LV_STATE_CHECKED` 是 LVGL 内置状态，开启时自动应用。

### 默认样式（default 状态）

Switch 关闭时轨道为灰色，使用全圆角（pill 形状）。

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| `bgColor` | `string` | `'#E0E0E0'` | 轨道背景色（关闭状态），LVGL color_grey |
| `borderColor` | `string` | `'transparent'` | 边框颜色，默认无边框 |
| `borderWidth` | `number` | `0` | 边框宽度 |
| `borderRadius` | `number` | `9999` | 圆角半径，9999 表示全圆角（pill 形状） |
| `textColor` | `string` | `'#212121'` | 文本颜色（Switch 本身无文本，保留用于一致性） |
| `opacity` | `number` | `1` | 不透明度 |
| `padding` | `number` | `0` | 内边距 |

### LVGL 主题中的 checked 状态

在 LVGL 默认主题中，Switch 开启时：
- 轨道背景色变为 `color_primary`（`#2196F3`）
- 旋钮保持白色

编辑器画布中通过 `props.checked` 动态切换颜色来模拟此行为。

### 建议的 disabled 状态样式

```typescript
disabled: {
  bgColor: '#F5F5F5',
  opacity: 0.5,
}
```

## 9. 事件支持

| LVGL 事件类型 | 说明 |
|--------------|------|
| `LV_EVENT_VALUE_CHANGED` | 开关状态发生变化时触发（最常用） |
| `LV_EVENT_CLICKED` | 点击时触发 |
| `LV_EVENT_PRESSED` | 按下时触发 |
| `LV_EVENT_RELEASED` | 释放时触发 |
| `LV_EVENT_FOCUSED` | 获得焦点时触发 |
| `LV_EVENT_DEFOCUSED` | 失去焦点时触发 |

最常用的事件是 `LV_EVENT_VALUE_CHANGED`，在用户切换开关后触发。可通过 `lv_obj_has_state(sw, LV_STATE_CHECKED)` 获取当前状态。

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，Switch 渲染为一个圆角轨道 + 圆形旋钮：

```tsx
<div className="lvgl-switch" style={{
  width: '100%',
  height: '100%',
  borderRadius: defaultStyle.borderRadius || 13,
  backgroundColor: props.checked ? '#2196F3' : '#ccc',
  position: 'relative',
  minHeight: '20px',
}}>
  <div style={{
    position: 'absolute',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    top: '50%',
    marginTop: '-10px',
    left: props.checked ? 'calc(100% - 23px)' : '3px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
    transition: 'left 0.2s',
  }} />
</div>
```

- 开启时轨道为蓝色 `#2196F3`，旋钮滑到右侧
- 关闭时轨道为灰色 `#ccc`，旋钮在左侧
- 旋钮带有阴影效果，增强立体感
- 支持 CSS transition 动画（仅在编辑器中可见）

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

使用 `drawSwitch` 函数在 Canvas 2D 上绘制：

```typescript
function drawSwitch(ctx, x, y, w, h, opts) {
  const trackWidth = Math.min(w, 50);
  const trackHeight = 24;
  const trackX = x + (w - trackWidth) / 2;
  const trackY = y + (h - trackHeight) / 2;

  // 1. 绘制轨道
  ctx.fillStyle = opts.checked ? '#4caf50' : '#ccc';
  roundRect(ctx, trackX, trackY, trackWidth, trackHeight, trackHeight / 2);
  ctx.fill();

  // 2. 绘制旋钮
  const knobRadius = trackHeight / 2 - 2;
  const knobX = opts.checked
    ? trackX + trackWidth - knobRadius - 2
    : trackX + knobRadius + 2;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(knobX, trackY + trackHeight / 2, knobRadius, 0, Math.PI * 2);
  ctx.fill();
}
```

注意：简易预览中开启状态使用绿色 `#4caf50`（Material Green），与画布渲染的蓝色略有差异。

### LVGL WASM 预览渲染（ui_from_json.c）

通过 JSON 传递给 WASM 端，由 `create_switch` 函数创建真实 LVGL 控件：

```c
static lv_obj_t *create_switch(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *sw = lv_switch_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int checked = cjson_get_bool(props, "checked", 0);
        if (checked) lv_obj_add_state(sw, LV_STATE_CHECKED);
    }
    return sw;
}
```

### 代码生成输出（ui.c.ts）

```c
// Create switch: my_switch
my_switch = lv_switch_create(parent);
lv_obj_set_pos(my_switch, 10, 20);
lv_obj_set_size(my_switch, 50, 26);

// Styles
lv_obj_set_style_bg_color(my_switch, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_bg_opa(my_switch, LV_OPA_COVER, 0);
lv_obj_set_style_radius(my_switch, 9999, 0);

// Props (仅当 checked=true 时生成)
lv_obj_add_state(my_switch, LV_STATE_CHECKED);
```

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_switch_create(parent)` |

### 关键 API

| API 函数 | 说明 |
|----------|------|
| `lv_switch_create(parent)` | 创建开关控件 |
| `lv_obj_add_state(sw, LV_STATE_CHECKED)` | 设置为开启状态 |
| `lv_obj_clear_state(sw, LV_STATE_CHECKED)` | 设置为关闭状态 |
| `lv_obj_has_state(sw, LV_STATE_CHECKED)` | 查询是否开启 |
| `lv_obj_add_state(sw, LV_STATE_DISABLED)` | 设置为禁用状态 |

Switch 没有专属的 set/get 函数，状态完全通过 LVGL 通用的状态管理 API 控制。

### 样式部件（Parts）

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 轨道（track）区域 |
| `LV_PART_INDICATOR` | 填充指示器（开启时的彩色区域） |
| `LV_PART_KNOB` | 旋钮（圆形滑块） |

常用样式组合：
- `LV_PART_MAIN | LV_STATE_DEFAULT` — 关闭时的轨道样式
- `LV_PART_INDICATOR | LV_STATE_CHECKED` — 开启时的指示器颜色
- `LV_PART_KNOB` — 旋钮的大小、颜色、阴影

## 12. 设计注意事项

1. **无文本属性**：与 Checkbox 不同，Switch 本身不包含文本标签。如需在旁边显示说明文字，应配合 Label 组件使用，通常放在同一个 Container 中水平排列。

2. **状态管理**：Switch 的开/关状态与 Checkbox 一样，通过 `LV_STATE_CHECKED` 管理。编辑器中使用 `props.checked` 布尔值映射。

3. **全圆角设计**：`borderRadius: 9999` 确保轨道呈现 pill（胶囊）形状，这是 Switch 的标准视觉风格。修改此值会影响整体外观。

4. **颜色不一致**：三个渲染层的开启状态颜色略有差异：
   - 编辑器画布：`#2196F3`（蓝色）
   - 简易预览：`#4caf50`（绿色）
   - LVGL WASM：取决于主题设置（默认蓝色）
   
   建议统一为主题色 `#2196F3`。

5. **尺寸约束**：Switch 的默认尺寸 50×26 是经过优化的触摸友好尺寸。过小的尺寸会导致旋钮难以辨认，建议宽度不小于 40px，高度不小于 20px。

6. **旋钮阴影**：编辑器画布中旋钮带有 `boxShadow` 增强立体感，LVGL 中可通过 `LV_PART_KNOB` 的 shadow 样式属性实现类似效果。

7. **动画效果**：编辑器画布中使用 CSS `transition` 模拟旋钮滑动动画。LVGL 原生也支持状态切换动画，通过 `lv_obj_set_style_anim_time()` 控制。

8. **无 padding**：Switch 默认 padding 为 0，因为其内部布局由 LVGL 自动管理（轨道 + 旋钮），不需要额外内边距。
