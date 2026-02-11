# Table (table) — 表格组件设计文档

## 1. 组件名称和简介

Table（表格）是一个结构化数据展示组件，以行列网格形式呈现文本数据。它支持自定义行列数、单元格内容、列宽、表头行和单元格对齐方式。在嵌入式 UI 中常用于参数列表、设备信息展示、配置项管理、日志记录等场景。

## 2. 组件类型标识

```
type: 'table'
```

## 3. 所属分类

| 分类 ID | 分类名称 | 图标 |
|---------|---------|------|
| display | 显示 | 📋 |

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 200 |
| defaultHeight | 150 |

## 5. 是否为容器

```
isContainer: false
```

Table 是纯显示组件，不可包含子组件。

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
| `rows` | `number` | `3` | 行数（包含表头行） |
| `cols` | `number` | `3` | 列数 |
| `cellData` | `string[][]` | `[['','',''],['','',''],['','','']]` | 二维数组，`cellData[row][col]` 为单元格文本 |
| `columnWidths` | `number[]` | `[60, 60, 60]` | 每列宽度（px），数组长度应与 `cols` 一致 |
| `headerRow` | `boolean` | `true` | 是否将第一行作为表头（视觉上加粗、灰色背景） |
| `cellAligns` | `string[][]` | `[['left','left','left'],...]` | 二维数组，每个单元格的对齐方式：`'left'` / `'center'` / `'right'` |

### 属性约束

- `cellData` 的维度应与 `rows × cols` 一致，不足时补空字符串
- `columnWidths` 长度应与 `cols` 一致，不足时使用默认宽度 60
- `cellAligns` 维度应与 `rows × cols` 一致，不足时默认 `'left'`
- 修改 `rows` 或 `cols` 时，编辑器应自动扩展/裁剪 `cellData`、`columnWidths`、`cellAligns`

## 8. 样式设计（styles）

### 默认样式（default state）— Card Style（无圆角）

| 样式属性 | 默认值 | 说明 |
|----------|--------|------|
| `bgColor` | `#ffffff` | 白色背景（card style） |
| `borderColor` | `#E0E0E0` | 灰色边框（color_grey） |
| `borderWidth` | `2` | 边框宽度 |
| `borderRadius` | `0` | 无圆角（表格通常为直角） |
| `textColor` | `#212121` | 单元格文本颜色 |
| `opacity` | `1` | 完全不透明 |
| `padding` | `0` | 无外层内边距（单元格自带内边距） |

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，始终应用 |
| `pressed` | 按下状态（单元格被点击时） |
| `focused` | 聚焦状态 |
| `disabled` | 禁用状态 |

### 表头行样式

表头行（第一行，当 `headerRow: true`）在渲染时使用特殊样式：
- 背景色：`#f0f0f0`（浅灰）
- 字体加粗：`fontWeight: 600`
- 这些样式在编辑器画布和预览中硬编码，LVGL 端通过 `LV_TABLE_CELL_CTRL_MERGE_RIGHT` 等控制标志实现

## 9. 事件支持

| 事件类型 | 说明 |
|----------|------|
| `LV_EVENT_CLICKED` | 点击事件（可获取被点击的单元格行列） |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | 值变化事件（选中单元格变化时） |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

### 单元格点击

LVGL table 支持通过 `lv_table_get_selected_cell(table, &row, &col)` 获取被点击的单元格坐标，可在事件回调中使用。

## 10. UI 层设计

### 编辑器画布渲染（CanvasComponent.tsx）

```tsx
<div className="lvgl-table" style={{
  width: '100%', height: '100%',
  display: 'grid',
  gridTemplateColumns: `repeat(${props.cols || 3}, 1fr)`,
  gridTemplateRows: `repeat(${props.rows || 3}, 1fr)`,
  gap: '1px',
  backgroundColor: '#ccc',  // 网格线颜色
  border: '1px solid #ccc',
  borderRadius: defaultStyle.borderRadius || 4,
  overflow: 'hidden',
}}>
  {Array.from({ length: (props.rows || 3) * (props.cols || 3) }).map((_, i) => {
    const row = Math.floor(i / (props.cols || 3));
    const col = i % (props.cols || 3);
    const isHeader = row === 0 && props.headerRow !== false;
    return (
      <div key={i} style={{
        backgroundColor: isHeader ? '#f0f0f0' : '#fff',
        padding: '4px',
        fontSize: '10px',
        fontWeight: isHeader ? 600 : 400,
        color: '#333',
      }}>
        {props.cellData?.[row]?.[col] || (i + 1)}
      </div>
    );
  })}
</div>
```

关键点：
- 使用 CSS Grid 布局模拟表格
- `gap: '1px'` + 灰色背景色模拟网格线
- 表头行使用浅灰背景和加粗字体
- 单元格内容从 `cellData` 读取，空值显示序号占位

### 简易预览渲染（PreviewPanel.tsx — Canvas 2D）

```typescript
function drawTable(ctx, x, y, w, h, opts) {
  // 白色背景
  ctx.fillStyle = opts.bgColor;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = opts.borderColor;
  ctx.strokeRect(x, y, w, h);

  const cellW = w / opts.cols;
  const cellH = h / opts.rows;

  // 网格线
  for (let r = 1; r < opts.rows; r++) { /* 水平线 */ }
  for (let c = 1; c < opts.cols; c++) { /* 垂直线 */ }

  // 表头行背景
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(x + 1, y + 1, w - 2, cellH - 1);

  // 单元格文本
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let r = 0; r < opts.rows; r++) {
    for (let c = 0; c < opts.cols; c++) {
      const label = r === 0 ? `Col ${c + 1}` : `${r},${c}`;
      ctx.fillText(label, x + cellW * c + cellW / 2, y + cellH * r + cellH / 2);
    }
  }
}
```

关键点：
- 等分行列绘制网格
- 表头行填充浅灰背景
- 单元格文本居中显示
- 预览中使用占位文本（`Col N` / `r,c`）

### LVGL WASM 预览渲染

**editorStateToJson.ts**：props（rows、cols、cellData、columnWidths、headerRow、cellAligns）完整序列化。

**ui_from_json.c**：

```c
static lv_obj_t *create_table(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *tbl = lv_table_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int rows = cjson_get_int(props, "rows", 3);
        int cols = cjson_get_int(props, "cols", 3);
        lv_table_set_row_count(tbl, rows);
        lv_table_set_column_count(tbl, cols);
        // 填充表头占位
        for (int c = 0; c < cols; c++) {
            char hdr[32];
            snprintf(hdr, sizeof(hdr), "Col %d", c + 1);
            lv_table_set_cell_value(tbl, 0, c, hdr);
        }
    }
    return tbl;
}
```

关键点：
- 使用 `lv_table_create` 创建真实 LVGL table
- 设置行列数
- 当前 WASM 实现仅填充表头占位文本，未解析 `cellData`（可扩展）

### 代码生成输出（ui.c.ts）

```c
// 创建
lv_obj_t *table_1 = lv_table_create(parent);
lv_obj_set_pos(table_1, 10, 10);
lv_obj_set_size(table_1, 200, 150);

// 样式（card style，无圆角）
lv_obj_set_style_bg_color(table_1, lv_color_hex(0xFFFFFF), 0);
lv_obj_set_style_bg_opa(table_1, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(table_1, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(table_1, 2, 0);
lv_obj_set_style_radius(table_1, 0, 0);

// 行列数
lv_table_set_row_cnt(table_1, 3);
lv_table_set_col_cnt(table_1, 3);

// 列宽
lv_table_set_col_width(table_1, 0, 60);
lv_table_set_col_width(table_1, 1, 60);
lv_table_set_col_width(table_1, 2, 60);

// 单元格数据（仅非空单元格）
lv_table_set_cell_value(table_1, 0, 0, "Name");
lv_table_set_cell_value(table_1, 0, 1, "Value");
lv_table_set_cell_value(table_1, 1, 0, "Temp");
lv_table_set_cell_value(table_1, 1, 1, "25°C");
```

关键点：
- 代码生成使用 `lv_table_set_row_cnt` / `lv_table_set_col_cnt`（注意 LVGL API 名称）
- 逐列设置列宽
- 仅为非空单元格生成 `lv_table_set_cell_value` 调用
- 空字符串单元格跳过，减少生成代码量

## 11. LVGL API 映射

### 创建函数

| LVGL 版本 | 函数 |
|-----------|------|
| v8 / v9 | `lv_table_create(parent)` |

### 关键 API

| API | 说明 |
|-----|------|
| `lv_table_set_row_count(table, cnt)` | 设置行数（v9 为 `lv_table_set_row_cnt`） |
| `lv_table_set_column_count(table, cnt)` | 设置列数（v9 为 `lv_table_set_col_cnt`） |
| `lv_table_set_cell_value(table, row, col, text)` | 设置单元格文本 |
| `lv_table_set_col_width(table, col, width)` | 设置列宽 |
| `lv_table_get_selected_cell(table, &row, &col)` | 获取选中单元格坐标 |
| `lv_table_get_cell_value(table, row, col)` | 获取单元格文本 |
| `lv_table_set_cell_value_fmt(table, row, col, fmt, ...)` | 格式化设置单元格文本 |
| `lv_table_add_cell_ctrl(table, row, col, ctrl)` | 添加单元格控制标志 |

### 单元格控制标志

| 标志 | 说明 |
|------|------|
| `LV_TABLE_CELL_CTRL_MERGE_RIGHT` | 向右合并单元格 |
| `LV_TABLE_CELL_CTRL_TEXT_CROP` | 文本裁剪（不换行） |
| `LV_TABLE_CELL_CTRL_CUSTOM_1` ~ `4` | 自定义标志 |

### LVGL Parts

| Part | 说明 |
|------|------|
| `LV_PART_MAIN` | 表格背景 |
| `LV_PART_ITEMS` | 单元格 |

### 默认主题样式（lv_theme_default）

- **MAIN part**：card style — `bg_color=#FFFFFF, border_color=#E0E0E0, border_width=2, radius=0, pad=0`
- **ITEMS part**：`border_color=color_grey, border_width=1, border_side=BOTTOM|RIGHT, text_color=color_text`

## 12. 设计注意事项

1. **borderRadius = 0**：表格默认无圆角，这与其他 card style 组件（borderRadius=8）不同。这是因为表格的网格线在圆角处会产生视觉问题。LVGL 默认主题也将 table 的 radius 设为 0。

2. **cellData 的动态管理**：当用户在属性面板中修改 `rows` 或 `cols` 时，编辑器 store 应自动调整 `cellData`、`columnWidths`、`cellAligns` 的维度。增加行/列时补充空值，减少时裁剪末尾。

3. **表头行的实现差异**：
   - 编辑器画布/预览：通过 CSS/Canvas 样式区分表头行（灰色背景 + 加粗）
   - LVGL：没有原生"表头"概念，需要通过 `lv_table_add_cell_ctrl` 或自定义样式实现
   - 代码生成：当前未生成表头样式代码，用户需在自定义代码中处理

4. **列宽与总宽度**：`columnWidths` 之和可能不等于组件总宽度。LVGL 会按设定的列宽渲染，超出部分可滚动。编辑器属性面板可以提供"自动均分"按钮。

5. **单元格对齐**：`cellAligns` 属性在代码生成中尚未实现。LVGL 的单元格对齐需要通过在文本前添加控制字符或使用 `lv_table_add_cell_ctrl` 实现。

6. **大数据量性能**：LVGL table 不支持虚拟滚动，所有单元格都会被创建。大量行（>50）可能导致内存和渲染性能问题。编辑器可以在属性面板中提示行数限制。

7. **WASM 预览扩展**：当前 `ui_from_json.c` 未解析 `cellData` 和 `columnWidths`。要完整还原编辑器设计，需要扩展 C 端遍历 `cellData` JSON 二维数组并调用 `lv_table_set_cell_value`，以及遍历 `columnWidths` 调用 `lv_table_set_col_width`。

8. **API 命名差异**：注意 LVGL v8 和 v9 的 API 命名略有不同（如 `set_row_count` vs `set_row_cnt`）。代码生成模板中使用 `lv_table_set_row_cnt` / `lv_table_set_col_cnt`，需确认目标版本。
