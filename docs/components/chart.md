# Chart (chart) — 图表组件设计文档

## 1. 组件名称和简介

Chart（图表）是一个数据可视化显示组件，支持折线图（line）、柱状图（bar）和散点图（scatter）三种类型。它可以展示一个或多个数据系列，并支持网格线、图例、坐标轴范围等配置。在嵌入式 UI 中常用于传感器数据展示、统计信息可视化、趋势分析等场景。

## 2. 组件类型标识

```
type: 'chart'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| display | 显示 | 📈 |

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 200 |
| defaultHeight | 150 |

## 5. 是否为容器

```
isContainer: false
```

Chart 是纯显示组件，不可包含子组件。

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

### 主要属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `type` | `'line' \| 'bar' \| 'scatter'` | `'line'` | 图表类型 |
| `series` | `ChartSeries[]` | 见下方 | 数据系列数组（新版多系列） |
| `yAxisMin` | `number` | `0` | Y 轴最小值 |
| `yAxisMax` | `number` | `100` | Y 轴最大值 |
| `xLabels` | `string[]` | `[]` | X 轴标签（可选） |
| `showLegend` | `boolean` | `false` | 是否显示图例 |
| `showGrid` | `boolean` | `true` | 是否显示网格线 |
| `data` | `number[]` | `[10, 20, 30, 25, 40]` | 旧版单系列数据（向后兼容） |
| `lineColor` | `string` | `'#2196F3'` | 旧版线条颜色（向后兼容） |

### ChartSeries 类型定义

```typescript
interface ChartSeries {
  name: string;       // 系列名称
  data: number[];     // 数据点数组
  color: string;      // 系列颜色（十六进制）
  lineWidth: number;  // 线条宽度（px）
  pointSize: number;  // 数据点大小（px）
}
```

### 默认 series 值

```typescript
series: [
  {
    name: '系列1',
    data: [10, 20, 30, 25, 40],
    color: '#2196F3',
    lineWidth: 2,
    pointSize: 4
  }
]
```

### 向后兼容说明

`data` 和 `lineColor` 是旧版单系列字段。当 `series` 数组为空或不存在时，回退使用 `data` + `lineColor` 构建单系列。代码生成和渲染层均支持这两种数据格式。

## 8. 样式设计（styles）

### 默认样式（default state）— Card Style

| 样式属性 | 默认值 | 说明 |
|----------|--------|------|
| `bgColor` | `#ffffff` | 白色背景（card style） |
| `borderColor` | `#E0E0E0` | 灰色边框（color_grey） |
| `borderWidth` | `2` | 边框宽度 |
| `borderRadius` | `8` | 圆角 |
| `textColor` | `#212121` | 文本颜色（坐标轴标签等） |
| `opacity` | `1` | 完全不透明 |
| `padding` | `10` | 内边距（图表绘制区域与边框的间距） |

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，始终应用 |
| `pressed` | 按下状态 |
| `focused` | 聚焦状态 |
| `disabled` | 禁用状态 |

## 9. 事件支持

| 事件类型 | 说明 |
|----------|------|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | 值变化事件（数据更新时） |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

```tsx
// 兼容新旧数据格式
const series = props.series || (props.data
  ? [{ data: props.data, color: props.lineColor || '#2196F3' }]
  : [{ data: [10, 20, 30, 25, 40], color: '#2196F3' }]);
const chartData = series[0]?.data || [10, 20, 30, 25, 40];
const chartColor = series[0]?.color || '#2196F3';
const maxVal = Math.max(...chartData, 1);

<div className="lvgl-chart" style={{
  width: '100%', height: '100%',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
  padding: '8px',
  boxSizing: 'border-box',
}}>
  {chartData.map((val, i) => (
    <div key={i} style={{
      width: `${Math.max(8, 80 / chartData.length)}%`,
      height: `${Math.max(2, (val / maxVal) * 100)}%`,
      backgroundColor: chartColor,
      borderRadius: '2px 2px 0 0',
    }} />
  ))}
</div>
```

关键点：
- 画布中统一以柱状图形式简化渲染（不区分 line/bar/scatter）
- 使用 flex 布局，每个数据点渲染为一个柱子
- 柱子高度按数据值与最大值的比例计算
- 仅渲染第一个系列的数据（简化展示）

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

```typescript
function drawChart(ctx, x, y, w, h, opts) {
  // 背景（card style）
  ctx.fillStyle = opts.bgColor;
  ctx.strokeStyle = opts.borderColor;
  roundRect(ctx, x, y, w, h, opts.borderRadius);
  ctx.fill(); ctx.stroke();

  const pad = 10;
  const chartX = x + pad, chartY = y + pad;
  const chartW = w - pad * 2, chartH = h - pad * 2;
  const maxVal = Math.max(...opts.data, 1);
  const minVal = Math.min(...opts.data, 0);
  const range = maxVal - minVal || 1;

  // 网格线
  if (opts.showGrid) {
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) { /* 水平网格 */ }
  }

  if (opts.type === 'bar') {
    // 柱状图：每个数据点一个矩形
  } else {
    // 折线图：连线 + 数据点圆点
    ctx.strokeStyle = opts.lineColor; ctx.lineWidth = 2;
    // ... 绘制折线和圆点
  }
}
```

关键点：
- 区分 `bar` 和 `line` 两种渲染模式
- 折线图绘制连线和数据点圆点
- 柱状图绘制等宽矩形
- 支持网格线开关
- 使用旧版 `data` + `lineColor` 字段

### LVGL WASM 预览渲染

**editorStateToJson.ts**：props 完整序列化，包括 series 数组和旧版 data 字段。

**ui_from_json.c**：

```c
static lv_obj_t *create_chart(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *chart = lv_chart_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        // 图表类型
        const char *type_str = cjson_get_string(props, "type");
        if (type_str && strcmp(type_str, "bar") == 0)
            lv_chart_set_type(chart, LV_CHART_TYPE_BAR);
        else
            lv_chart_set_type(chart, LV_CHART_TYPE_LINE);

        // 旧版 data 字段
        cJSON *data = cJSON_GetObjectItemCaseSensitive(props, "data");
        if (cJSON_IsArray(data)) {
            int cnt = cJSON_GetArraySize(data);
            lv_chart_set_point_count(chart, cnt);
            lv_chart_series_t *ser = lv_chart_add_series(chart,
                lv_color_hex(0x2196F3), LV_CHART_AXIS_PRIMARY_Y);
            cJSON *val;
            cJSON_ArrayForEach(val, data) {
                if (cJSON_IsNumber(val))
                    lv_chart_set_next_value(chart, ser, val->valueint);
            }
        }
    }
    return chart;
}
```

关键点：
- 当前 WASM 实现仅支持旧版 `data` 字段的单系列
- 多系列 `series` 数组的 WASM 支持待扩展
- 图表类型支持 line 和 bar

### 代码生成输出（ui.c.ts）

**多系列模式（series 数组）：**

```c
// 创建
lv_obj_t *chart_1 = lv_chart_create(parent);
lv_obj_set_pos(chart_1, 10, 10);
lv_obj_set_size(chart_1, 200, 150);

// 样式（card style）
lv_obj_set_style_bg_color(chart_1, lv_color_hex(0xFFFFFF), 0);
lv_obj_set_style_bg_opa(chart_1, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(chart_1, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(chart_1, 2, 0);
lv_obj_set_style_radius(chart_1, 8, 0);
lv_obj_set_style_pad_all(chart_1, 10, 0);

// 图表类型
lv_chart_set_type(chart_1, LV_CHART_TYPE_LINE);

// Y 轴范围
lv_chart_set_range(chart_1, LV_CHART_AXIS_PRIMARY_Y, 0, 100);

// 系列 0
lv_chart_series_t *chart_1_ser_0 = lv_chart_add_series(chart_1,
    lv_color_hex(0x2196F3), LV_CHART_AXIS_PRIMARY_Y);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 10);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 20);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 30);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 25);
lv_chart_set_next_value(chart_1, chart_1_ser_0, 40);
```

**旧版单系列模式（data 数组）：**

```c
lv_chart_set_point_count(chart_1, 5);
lv_chart_series_t *chart_1_ser = lv_chart_add_series(chart_1,
    lv_color_hex(0x2196F3), LV_CHART_AXIS_PRIMARY_Y);
lv_chart_set_ext_y_array(chart_1, chart_1_ser,
    (int32_t[]){10, 20, 30, 25, 40});  // v9: int32_t, v8: lv_coord_t
```

**隐藏网格线：**

```c
// showGrid === false
lv_obj_set_style_line_opa(chart_1, LV_OPA_TRANSP, LV_PART_MAIN);
```

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_chart_create(parent)` |

### 关键 API

| API | 说明 |
|-----|------|
| `lv_chart_set_type(chart, type)` | 设置图表类型：`LV_CHART_TYPE_LINE` / `LV_CHART_TYPE_BAR` / `LV_CHART_TYPE_SCATTER` |
| `lv_chart_set_point_count(chart, cnt)` | 设置数据点数量 |
| `lv_chart_add_series(chart, color, axis)` | 添加数据系列 |
| `lv_chart_set_next_value(chart, ser, val)` | 逐个添加数据点 |
| `lv_chart_set_ext_y_array(chart, ser, arr)` | 设置外部 Y 数据数组 |
| `lv_chart_set_range(chart, axis, min, max)` | 设置坐标轴范围 |
| `lv_chart_refresh(chart)` | 刷新图表显示 |
| `lv_chart_set_div_line_count(chart, hdiv, vdiv)` | 设置网格线数量 |
| `lv_chart_set_zoom_x(chart, zoom)` | X 轴缩放 |
| `lv_chart_set_zoom_y(chart, zoom)` | Y 轴缩放 |

### LVGL Parts

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 图表背景和网格线 |
| `LV_PART_ITEMS` | 数据点（折线图的圆点、柱状图的柱子） |
| `LV_PART_INDICATOR` | 光标/十字线 |
| `LV_PART_CURSOR` | 游标 |
| `LV_PART_TICKS` | 坐标轴刻度 |

### 默认主题样式（lv_theme_default）

- **MAIN part**：card style — `bg_color=#FFFFFF, border_color=#E0E0E0, border_width=2, radius=8, pad=10`
- **ITEMS part**：`bg_color=color_primary`（数据点颜色）
- **TICKS part**：`text_color=color_text, line_color=color_grey`

## 12. 设计注意事项

1. **多系列 vs 旧版兼容**：`series` 数组是新版多系列数据格式，`data` + `lineColor` 是旧版单系列格式。两者共存以保证向后兼容。代码生成时优先使用 `series`，回退到 `data`。编辑器属性面板应引导用户使用 `series` 格式。

2. **画布渲染简化**：编辑器画布中的 chart 渲染是高度简化的（仅柱状图形式），不完全反映 LVGL 的真实渲染效果。真实效果需要在 WASM 预览中查看。

3. **数据点数量**：LVGL chart 需要预先设置 `point_count`。使用 `lv_chart_set_next_value` 时会自动循环覆盖旧数据。使用 `lv_chart_set_ext_y_array` 时需要确保数组长度与 `point_count` 一致。

4. **性能考虑**：在嵌入式设备上，大量数据点（>100）可能导致渲染性能下降。编辑器属性面板可以提示用户合理控制数据点数量。

5. **散点图支持**：代码生成支持 `LV_CHART_TYPE_SCATTER`，但编辑器画布和简易预览中未实现散点图渲染，统一回退为折线图渲染。

6. **网格线控制**：`showGrid` 属性通过设置 `line_opa = LV_OPA_TRANSP` 来隐藏网格线。更精细的网格控制（水平/垂直分割线数量）可通过 `lv_chart_set_div_line_count` 实现，当前未暴露为编辑器属性。

7. **WASM 预览扩展**：当前 `ui_from_json.c` 仅支持旧版 `data` 字段。要完整支持多系列，需要扩展 C 端解析 `series` JSON 数组，为每个系列调用 `lv_chart_add_series` 和 `lv_chart_set_next_value`。

8. **Card Style 一致性**：Chart 使用 card style（白色背景 + 灰色边框），与 Table、Calendar、Textarea、Dropdown 等组件保持视觉一致性，这是 LVGL 默认主题的设计规范。
