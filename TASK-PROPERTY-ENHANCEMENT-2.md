# LVGL Editor 属性编辑增强 — 第二轮

## 项目路径
`/home/xcssa/.openclaw/workspace/projects/lvgl-editor`

## 批次 A: StyleProps 扩展（padding四方向、边框四边、圆角四角、渐变、outline、border side、text decoration、blend mode）

### A.1 类型扩展 (`src/types/index.ts`)
扩展 StyleProps：
```typescript
// 四方向 padding（保留原 padding 作为统一值）
paddingTop?: number;
paddingBottom?: number;
paddingLeft?: number;
paddingRight?: number;

// 四角独立圆角
borderRadiusTopLeft?: number;
borderRadiusTopRight?: number;
borderRadiusBottomLeft?: number;
borderRadiusBottomRight?: number;

// 边框显示边
borderSide?: 'full' | 'top' | 'bottom' | 'left' | 'right' | 'top_bottom' | 'left_right' | 'none';

// 背景渐变
bgGradColor?: string;
bgGradDir?: 'none' | 'hor' | 'ver';
bgGradStop?: number;  // 0-255

// Outline
outlineColor?: string;
outlineWidth?: number;
outlinePad?: number;

// Text decoration
textDecor?: 'none' | 'underline' | 'strikethrough';

// Blend mode
blendMode?: 'normal' | 'additive' | 'subtractive' | 'multiply';
```

### A.2 PropertyEditor 样式区块增强
- **内边距**：添加"统一/分别"切换按钮。统一模式用现有的单值 padding；分别模式显示 top/bottom/left/right 四个输入（2x2 grid）
- **圆角**：同上，统一/分别切换。分别模式显示四角输入
- **边框**：添加 border side 选择器（用图标按钮组，类似对齐9宫格但是4边+组合）
- **渐变**（新折叠区块）：渐变方向下拉、渐变颜色选择器、渐变停止点滑块(0-255)
- **Outline**（新折叠区块）：颜色、宽度、间距
- **文本装饰**：在文本折叠区块中添加 text-decor 下拉
- **混合模式**：在样式区块底部添加 blend mode 下拉

---

## 批次 B: Size 百分比/内容自适应 + 代码生成联动

### B.1 Size 扩展
在 LvglComponent 中添加尺寸模式：
```typescript
widthMode?: 'px' | 'percent' | 'content';  // 默认 px
heightMode?: 'px' | 'percent' | 'content';
```

PropertyEditor 尺寸区块改造：
- 每个维度（宽/高）添加模式切换按钮组（px / % / 内容自适应）
- px 模式：现有数值输入
- percent 模式：数值输入 + % 后缀（1-100）
- content 模式：显示 "LV_SIZE_CONTENT"，禁用数值输入

### B.2 代码生成联动 (`src/codegen/templates/ui.c.ts`)
在 generatePropsCode 或相关函数中，为以下新属性生成对应的 LVGL C 代码：

**通用属性：**
- align → `lv_obj_align(obj, LV_ALIGN_xxx, offsetX, offsetY)`
- flags → `lv_obj_add_flag(obj, LV_OBJ_FLAG_xxx)` / `lv_obj_clear_flag` / `lv_obj_add_state(obj, LV_STATE_DISABLED)`
- widthMode/heightMode → `lv_obj_set_width(obj, lv_pct(50))` 或 `lv_obj_set_width(obj, LV_SIZE_CONTENT)`

**样式属性（在 generateStyleCode 中）：**
- shadow → `lv_obj_set_style_shadow_color/width/ofs_x/ofs_y/spread/opa`
- transform → `lv_obj_set_style_transform_angle/zoom/pivot_x/pivot_y`（v8）或 `transform_rotation/scale_x/scale_y`（v9）
- scrollbar → `lv_obj_set_style_scrollbar_mode` (注意这是 flag 不是 style)
- font → `lv_obj_set_style_text_font(obj, &lv_font_montserrat_14, 0)` 或自定义字体
- padding 四方向 → `lv_obj_set_style_pad_top/bottom/left/right`
- 圆角四角 → `lv_obj_set_style_radius` (LVGL 不支持四角独立，只生成统一值或注释)
- border side → `lv_obj_set_style_border_side(obj, LV_BORDER_SIDE_xxx, 0)`
- 渐变 → `lv_obj_set_style_bg_grad_color/dir/stop`
- outline → `lv_obj_set_style_outline_color/width/pad`
- text decor → `lv_obj_set_style_text_decor(obj, LV_TEXT_DECOR_xxx, 0)`
- blend mode → `lv_obj_set_style_blend_mode(obj, LV_BLEND_MODE_xxx, 0)`

**Flex/Grid 布局：**
- flex 属性 → `lv_obj_set_flex_flow/flex_align/flex_grow`
- grid 属性 → `lv_obj_set_grid_dsc_array/grid_align/grid_cell`

**组件特有属性：**
- table cellData → `lv_table_set_cell_value(obj, row, col, "text")`
- table columnWidths → `lv_table_set_col_width(obj, col, width)`
- chart series → `lv_chart_add_series` + `lv_chart_set_next_value` 循环
- chart yAxis → `lv_chart_set_range(obj, LV_CHART_AXIS_PRIMARY_Y, min, max)`
- calendar highlightedDates → `lv_calendar_set_highlighted_dates(obj, dates, count)`
- calendar showToday → `lv_calendar_set_today_date(obj, year, month, day)`
- tabview tabChildMap → 注释说明子组件分配
- tileview tileChildMap → 注释说明
- win headerHeight/headerButtons → `lv_win_add_btn` 调用

---

## 批次 C: Canvas 渲染联动 + Preview 联动

### C.1 Canvas 渲染 (`src/components/Canvas/CanvasComponent.tsx`)
让画布上的组件视觉效果反映新属性：

- **align** — 在画布中根据 align 值调整组件在父容器中的视觉位置（可以用 CSS transform 或计算偏移）
- **shadow** — 用 CSS box-shadow 渲染阴影效果
- **transform** — 用 CSS transform: rotate() scale() 渲染变换
- **渐变** — 用 CSS linear-gradient 渲染背景渐变
- **outline** — 用 CSS outline 渲染
- **border side** — 用 CSS border-top/bottom/left/right 分别控制
- **opacity/blend** — 用 CSS opacity 和 mix-blend-mode
- **text decoration** — 用 CSS text-decoration
- **padding 四方向** — 用 CSS padding 分别设置
- **size content/percent** — percent 模式用 CSS 百分比宽高，content 模式用 fit-content

### C.2 Preview 渲染 (`src/components/Preview/PreviewPanel.tsx`)
在预览面板的 Canvas 2D 渲染中也反映新属性（尽可能）：
- shadow → Canvas shadowColor/shadowBlur/shadowOffsetX/shadowOffsetY
- transform → Canvas rotate/scale
- 渐变 → Canvas createLinearGradient
- 其他属性在 Preview 中尽量体现

注意：Preview 是用 HTML5 Canvas 2D API 渲染的，不是 DOM，所以有些效果需要用 Canvas API 实现。

---

## 约束
- UI 全部中文
- 不新增 npm 依赖
- 保持现有代码风格
- 修改前先 build 确认当前通过
- 完成后 build 验证
- 先读 CLAUDE.md 了解架构
- 先读最新的源文件再改（之前已被大幅修改）
