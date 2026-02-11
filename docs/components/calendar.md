# Calendar (calendar) — 日历组件设计文档

## 1. 组件名称和简介

Calendar（日历）是一个日期展示与选择组件，以月视图形式呈现日期网格。它支持设置当前显示的年月、高亮今日日期、标记特定日期、日期范围选择等功能。在嵌入式 UI 中常用于日期选择器、日程管理、倒计时界面、智能家居定时设置等场景。

## 2. 组件类型标识

```
type: 'calendar'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| display | 显示 | 📅 |

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 220 |
| defaultHeight | 220 |

日历需要较大的尺寸以容纳月份标题、星期标题行和 6 行日期网格。

## 5. 是否为容器

```
isContainer: false
```

Calendar 是纯显示组件，不可包含子组件。

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
| `year` | `number` | `2024` | 当前显示的年份 |
| `month` | `number` | `1` | 当前显示的月份（1-12） |
| `showDayNames` | `boolean` | `true` | 是否显示星期标题行（日、一、二...六） |
| `showToday` | `boolean` | `true` | 是否高亮显示今日日期 |
| `highlightedDates` | `HighlightedDate[]` | `[]` | 需要高亮标记的日期列表 |
| `dateRangeMode` | `boolean` | `false` | 是否启用日期范围选择模式 |
| `rangeStart` | `string` | `''` | 范围起始日期（格式：`'YYYY-MM-DD'`） |
| `rangeEnd` | `string` | `''` | 范围结束日期（格式：`'YYYY-MM-DD'`） |

### HighlightedDate 类型定义

```typescript
interface HighlightedDate {
  year: number;
  month: number;
  day: number;
}
```

### 属性约束

- `month` 范围为 1-12
- `year` 应为合理年份（如 1970-2099）
- `highlightedDates` 中的日期应为有效日期
- `rangeStart` 和 `rangeEnd` 仅在 `dateRangeMode: true` 时生效
- `rangeStart` 应早于或等于 `rangeEnd`

## 8. 样式设计（styles）

### 默认样式（default state）— Card Style

| 样式属性 | 默认值 | 说明 |
|----------|--------|------|
| `bgColor` | `#ffffff` | 白色背景（card style） |
| `borderColor` | `#E0E0E0` | 灰色边框（color_grey） |
| `borderWidth` | `2` | 边框宽度 |
| `borderRadius` | `8` | 圆角 |
| `textColor` | `#212121` | 日期数字文本颜色 |
| `opacity` | `1` | 完全不透明 |
| `padding` | `0` | 无外层内边距（内部布局自行管理间距） |

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，始终应用 |
| `pressed` | 按下状态（日期被点击时） |
| `focused` | 聚焦状态 |
| `disabled` | 禁用状态 |

### 内部区域样式

| 区域 | 编辑器渲染 | LVGL Part |
|------|-----------|-----------|
| 月份标题栏 | 蓝色背景 `#2196F3`，白色文字 | `LV_PART_MAIN`（calendar header） |
| 星期标题行 | 灰色文字 `#666`，10px 字号 | day names area |
| 日期网格 | 黑色文字 `#212121`，10px 字号 | `LV_PART_ITEMS` |
| 今日日期 | LVGL 默认高亮 | `lv_calendar_set_today_date` |
| 高亮日期 | LVGL 默认标记样式 | `lv_calendar_set_highlighted_dates` |

## 9. 事件支持

| 事件类型 | 说明 |
|----------|------|
| `LV_EVENT_CLICKED` | 点击事件（日期被点击） |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | 值变化事件（选中日期变化时触发） |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

### 日期选择

LVGL calendar 支持通过 `lv_calendar_get_pressed_date(calendar, &date)` 获取被点击的日期，可在 `LV_EVENT_VALUE_CHANGED` 回调中使用。

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

```tsx
<div className="lvgl-calendar" style={{
  width: '100%', height: '100%',
  fontSize: '10px',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden', color: '#333',
}}>
  {/* 月份标题栏 */}
  <div style={{
    textAlign: 'center', padding: '6px 4px',
    fontWeight: 'bold', borderBottom: '1px solid #eee',
    backgroundColor: '#f8f8f8',
  }}>
    {props.year || 2024} / {props.month || 1}
  </div>

  {/* 日期网格 */}
  <div style={{
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px', flex: 1, padding: '2px',
  }}>
    {/* 星期标题 */}
    {['日', '一', '二', '三', '四', '五', '六'].map(d => (
      <div key={d} style={{
        textAlign: 'center', fontWeight: 'bold',
        color: '#666', padding: '2px 0',
      }}>{d}</div>
    ))}
    {/* 日期数字（简化为 1-28） */}
    {Array.from({ length: 28 }).map((_, i) => (
      <div key={i} style={{ textAlign: 'center', padding: '1px 0' }}>
        {i + 1}
      </div>
    ))}
  </div>
</div>
```

关键点：
- 使用 flex 纵向布局：标题栏 + 日期网格
- 日期网格使用 CSS Grid 7 列布局
- 简化渲染：固定显示 1-28 日，不计算实际月份天数和起始星期
- 标题栏显示 `年/月` 格式

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

```typescript
function drawCalendar(ctx, x, y, w, h, opts) {
  // 背景（card style）
  ctx.fillStyle = opts.bgColor;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill(); ctx.stroke();

  const headerH = 30;
  const dayHeaderH = 20;

  // 月份标题栏（蓝色背景）
  ctx.fillStyle = '#2196F3';
  roundRect(ctx, x, y, w, headerH, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${opts.year}年 ${monthNames[opts.month - 1]}`,
    x + w / 2, y + headerH / 2);

  // 星期标题行
  const cellW = w / 7;
  ctx.fillStyle = '#666';
  ctx.font = '10px sans-serif';
  for (let i = 0; i < 7; i++) {
    ctx.fillText(days[i], x + cellW * i + cellW / 2,
      y + headerH + dayHeaderH / 2);
  }

  // 日期数字（计算实际月份）
  const firstDay = new Date(opts.year, opts.month - 1, 1).getDay();
  const daysInMonth = new Date(opts.year, opts.month, 0).getDate();
  const cellH = Math.min(18, (h - headerH - dayHeaderH) / 6);
  let day = 1;
  for (let row = 0; row < 6 && day <= daysInMonth; row++) {
    for (let col = 0; col < 7 && day <= daysInMonth; col++) {
      if (row === 0 && col < firstDay) continue;
      ctx.fillText(`${day}`,
        x + cellW * col + cellW / 2,
        y + headerH + dayHeaderH + cellH * row + cellH / 2);
      day++;
    }
  }
}
```

关键点：
- 蓝色标题栏显示年月
- 计算实际月份的天数和起始星期
- 最多渲染 6 行日期
- 单元格大小自适应组件高度

### LVGL WASM 预览渲染

**editorStateToJson.ts**：props（year、month、showDayNames、showToday、highlightedDates 等）完整序列化。

**ui_from_json.c**：

```c
static lv_obj_t *create_calendar(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *cal = lv_calendar_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int year = cjson_get_int(props, "year", 2026);
        int month = cjson_get_int(props, "month", 1);
        lv_calendar_set_today_date(cal, year, month, 1);
        lv_calendar_set_showed_date(cal, year, month);
    }
    return cal;
}
```

关键点：
- 使用 `lv_calendar_create` 创建真实 LVGL calendar
- 设置今日日期和显示月份
- 当前 WASM 实现未处理 `highlightedDates`（可扩展）

### 代码生成输出（ui.c.ts）

```c
// 创建
lv_obj_t *calendar_1 = lv_calendar_create(parent);
lv_obj_set_pos(calendar_1, 10, 10);
lv_obj_set_size(calendar_1, 220, 220);

// 样式（card style）
lv_obj_set_style_bg_color(calendar_1, lv_color_hex(0xFFFFFF), 0);
lv_obj_set_style_bg_opa(calendar_1, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(calendar_1, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(calendar_1, 2, 0);
lv_obj_set_style_radius(calendar_1, 8, 0);

// 显示月份
lv_calendar_set_showed_date(calendar_1, 2024, 1);

// 今日日期
lv_calendar_set_today_date(calendar_1, 2024, 1, 1);
```

**高亮日期：**

```c
// highlightedDates 不为空时
static lv_calendar_date_t calendar_1_hl_dates[] = {
    {.year = 2024, .month = 1, .day = 15},
    {.year = 2024, .month = 1, .day = 20},
};
lv_calendar_set_highlighted_dates(calendar_1, calendar_1_hl_dates, 2);
```

**隐藏星期标题：**

```c
// showDayNames === false
// Note: Day names visibility needs custom header configuration
```

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_calendar_create(parent)` |

### 关键 API

| API | 说明 |
|-----|------|
| `lv_calendar_set_today_date(cal, year, month, day)` | 设置今日日期（高亮显示） |
| `lv_calendar_set_showed_date(cal, year, month)` | 设置当前显示的年月 |
| `lv_calendar_set_highlighted_dates(cal, dates, cnt)` | 设置高亮标记日期列表 |
| `lv_calendar_get_pressed_date(cal, &date)` | 获取被点击的日期 |
| `lv_calendar_header_arrow_create(cal)` | 创建带箭头的月份导航头（v9） |
| `lv_calendar_header_dropdown_create(cal)` | 创建下拉选择的月份导航头（v9） |

### LVGL 日期结构

```c
typedef struct {
    uint32_t year;
    uint32_t month;  // 1-12
    uint32_t day;    // 1-31
} lv_calendar_date_t;
```

### LVGL Parts

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 日历背景 |
| `LV_PART_ITEMS` | 日期单元格 |

### 默认主题样式（lv_theme_default）

- **MAIN part**：card style — `bg_color=#FFFFFF, border_color=#E0E0E0, border_width=2, radius=8, pad=0`
- **ITEMS part**：日期单元格样式
- **Header**：LVGL calendar 可选添加 header 组件（箭头导航或下拉选择）

## 12. 设计注意事项

1. **月份导航头**：LVGL v9 提供 `lv_calendar_header_arrow_create` 和 `lv_calendar_header_dropdown_create` 两种导航头。当前编辑器未将导航头作为可配置选项，代码生成也未自动添加。用户可在自定义代码中添加。

2. **画布渲染简化**：编辑器画布中的日历渲染是简化版（固定 28 天），不计算实际月份天数和起始星期。简易预览（Canvas 2D）则计算了真实日历布局。完整效果需在 WASM 预览中查看。

3. **高亮日期的静态数组**：代码生成中 `highlightedDates` 使用 `static` 数组，因为 `lv_calendar_set_highlighted_dates` 不会复制数据，只保存指针。数组必须在 calendar 生命周期内保持有效。

4. **showDayNames 的实现**：LVGL calendar 默认显示星期标题。隐藏星期标题需要自定义 header 配置，当前代码生成仅输出注释提示，未实现具体隐藏逻辑。

5. **日期范围模式**：`dateRangeMode`、`rangeStart`、`rangeEnd` 是编辑器扩展属性，LVGL 原生不直接支持日期范围选择。实现需要在事件回调中自定义逻辑，结合 `highlightedDates` 标记范围内的日期。

6. **尺寸约束**：LVGL calendar 有最小尺寸要求（需要容纳 7×6 的日期网格 + 标题）。过小的尺寸会导致日期文字重叠。编辑器可以设置最小宽高约束（建议 ≥ 180×180）。

7. **国际化**：当前编辑器画布中星期标题使用中文（日、一、二...六）。LVGL 的星期标题可通过 `lv_calendar_set_day_names` 自定义。代码生成未处理国际化，使用 LVGL 默认的英文缩写。

8. **WASM 预览扩展**：当前 `ui_from_json.c` 未处理 `highlightedDates` 和 `showDayNames`。要完整还原编辑器设计，需要扩展 C 端解析 `highlightedDates` JSON 数组并调用 `lv_calendar_set_highlighted_dates`。

9. **today 日期的动态性**：`showToday` 属性在代码生成时使用 props 中的 `year`/`month` + day=1 作为今日日期。实际应用中应替换为运行时获取的真实日期（如通过 RTC）。代码生成输出注释提醒用户更新。
