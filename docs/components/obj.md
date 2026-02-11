# Container (obj) — 通用容器组件

## 1. 组件名称和简介

Container 是 LVGL 编辑器中最基础的容器组件，对应 LVGL 的 `lv_obj`（基础对象）。它是所有 LVGL 组件的基类，作为容器使用时提供一个可包含任意子组件的矩形区域。默认采用卡片样式（card style），带有白色背景、灰色边框和圆角，适合用于布局分组、面板、卡片等场景。

## 2. 组件类型标识

```
type: 'obj'
```

## 3. 所属分类

```
category: 'container'  // 容器分类，图标: 📁
```

在组件面板中显示名称为 **Container**，图标为 📦。

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 200 |
| defaultHeight | 150 |

## 5. 是否为容器

```
isContainer: true
```

Container 是容器组件，可以包含子组件。

## 6. 父子级关系设计

### 可以作为哪些组件的子级

- 可以作为 **Screen（页面根节点）** 的直接子级
- 可以作为任何 `isContainer=true` 的组件的子级，包括：
  - 另一个 Container (obj)
  - Button (btn)
  - Tab View (tabview) — 挂载到对应 tab page
  - Tile View (tileview) — 挂载到对应 tile
  - Window (win) — 挂载到 content 区域

### 可以包含哪些子组件

Container 可以包含 **所有类型** 的组件，包括：
- 基础组件：Button、Label、Image、Line
- 输入组件：Textarea、Dropdown、Checkbox、Switch、Slider
- 容器组件：Container（嵌套）、Tab View、Tile View、Window
- 显示组件：Progress Bar、Arc、Spinner、Chart、Table、Calendar

### 子组件挂载机制

Container 的子组件挂载机制是最简单的 **直接挂载**：

```
子组件直接挂在 Container 自身上（lv_obj_create(container)）
```

具体流程：

1. **添加子组件时**：`addComponent(type, x, y, containerId)` → 新组件的 `parentId` 设为 Container 的 ID，组件被添加到 Container 的 `children[]` 数组中。
2. **重新挂载时**：`reparentComponent(childId, containerId)` → 从旧 parent 的 `children[]` 中移除，添加到 Container 的 `children[]` 中，更新 `parentId`。
3. **删除子组件时**：`deleteComponents([childId])` → 从 Container 的 `children[]` 中移除。

Container 不需要额外的 childMap 映射（不像 tabview 的 `tabChildMap` 或 tileview 的 `tileChildMap`），因为所有子组件都直接属于同一个容器空间。

**Store 层操作**（`editorStore.ts`）：

```typescript
// addComponent: 直接添加到 parent 的 children
addComponentToTree(page.components, newComponent, parentId)

// reparentComponent: 移动到新 parent
moveComponentToParent(page.components, id, newParentId)

// deleteComponents: 从树中删除
deleteComponentFromTree(page.components, ids)
```

## 7. 属性设计（props）

Container 的 `defaultProps` 为空对象 `{}`，没有组件特有的属性。但支持以下可选的布局属性：

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| layout | `'flex' \| 'grid'` | 无（自由定位） | 布局模式。设为 `'flex'` 启用 Flex 布局，设为 `'grid'` 启用 Grid 布局 |
| scrollDir | `'none' \| 'hor' \| 'ver' \| 'all'` | 无 | 滚动方向限制 |

### Flex 布局属性（当 `layout='flex'` 时）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| flexDirection | `'row' \| 'column' \| 'row-reverse' \| 'column-reverse'` | `'row'` | Flex 主轴方向 |
| flexWrap | `boolean` | `false` | 是否换行 |
| justifyContent | `string` | `'flex-start'` | 主轴对齐方式 |
| alignItems | `string` | `'flex-start'` | 交叉轴对齐方式 |
| alignContent | `string` | `'flex-start'` | 多行对齐方式 |
| gap | `number` | 无 | 子组件间距（同时设置 row gap 和 column gap） |

### Grid 布局属性（当 `layout='grid'` 时）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| gridColumns | `string` | 无 | 列定义，如 `"1fr 1fr"` 或 `"100 200"` |
| gridRows | `string` | 无 | 行定义，如 `"1fr 1fr"` |
| gridColumnGap | `number` | 无 | 列间距 |
| gridRowGap | `number` | 无 | 行间距 |

## 8. 样式设计（styles）

### 默认样式状态（default）

Container 采用 LVGL 默认主题的 **card style**：

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| bgColor | `string` | `'#ffffff'` | 背景色，白色（LVGL color_card） |
| borderColor | `string` | `'#E0E0E0'` | 边框色，浅灰色（LVGL color_grey） |
| borderWidth | `number` | `2` | 边框宽度 |
| borderRadius | `number` | `8` | 圆角半径 |
| textColor | `string` | `'#212121'` | 文字颜色（LVGL color_text） |
| opacity | `number` | `1` | 不透明度（1=完全不透明） |
| padding | `number` | `16` | 内边距 |

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，必须存在 |
| `pressed` | 按下状态（可选），对应 `LV_STATE_PRESSED` |
| `focused` | 聚焦状态（可选），对应 `LV_STATE_FOCUSED` |
| `disabled` | 禁用状态（可选），对应 `LV_STATE_DISABLED` |

### 完整样式属性列表

每个样式状态都支持以下属性（定义在 `StyleProps` 类型中）：

| 分类 | 属性 | 说明 |
|------|------|------|
| 基础 | bgColor, borderColor, borderWidth, borderRadius, textColor, opacity, padding | 基础外观 |
| 边距 | paddingTop, paddingBottom, paddingLeft, paddingRight | 四方向内边距 |
| 圆角 | borderRadiusTopLeft, borderRadiusTopRight, borderRadiusBottomLeft, borderRadiusBottomRight | 四角圆角 |
| 边框 | borderSide | 边框显示方向（full/top/bottom/left/right/top_bottom/left_right/none） |
| 渐变 | bgGradColor, bgGradDir, bgGradStop | 背景渐变 |
| 轮廓 | outlineColor, outlineWidth, outlinePad | 外轮廓 |
| 阴影 | shadowColor, shadowWidth, shadowOffsetX, shadowOffsetY, shadowSpread, shadowOpacity | 阴影效果 |
| 变换 | transformAngle, transformZoomX, transformZoomY, transformPivotX, transformPivotY | 旋转和缩放 |
| 文字 | textFont, textFontSize, textLetterSpace, textLineSpace, textDecor | 文字样式 |
| 滚动条 | scrollbarMode, scrollbarWidth, scrollbarColor | 滚动条样式 |
| 混合 | blendMode | 混合模式 |

## 9. 事件支持

Container 支持所有 LVGL 事件类型（定义在 `LvglEventType` 中）：

| 事件类型 | 说明 |
|----------|------|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | 值变化事件 |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |
| `LV_EVENT_READY` | 就绪事件 |
| `LV_EVENT_CANCEL` | 取消事件 |

事件绑定支持两种处理方式：
- **builtin**：内置动作（navigate、setProperty、show、hide、enable、disable、setText、setValue）
- **custom**：自定义 C 代码

## 10. UI 层设计

### 编辑器画布渲染（Canvas）

在 `CanvasComponent.tsx` 中，Container 渲染为一个 `<div>`，样式直接映射：

```
- 背景色 → CSS background-color（支持渐变时使用 linear-gradient）
- 边框 → CSS border
- 圆角 → CSS border-radius
- 内边距 → CSS padding
- 阴影 → CSS box-shadow
- 变换 → CSS transform（rotate + scale）
- 子组件 → 递归渲染为嵌套的 <div>
```

Container 在画布中显示为白色卡片区域，子组件以绝对定位方式放置在其内部。选中时显示蓝色边框和 8 个 resize handle。

### 简易预览渲染（PreviewPanel）

在 `PreviewPanel.tsx` 中，Container 渲染逻辑与画布类似，但去除了编辑交互（选中框、拖拽手柄等），仅保留视觉呈现。子组件递归渲染。

### LVGL WASM 预览渲染

在 `editorStateToJson.ts` 中，Container 被序列化为 JSON：

```json
{
  "type": "obj",
  "id": "xxx",
  "parent": "screen 或 parent_id",
  "x": 0, "y": 0,
  "width": 200, "height": 150,
  "props": {},
  "styles": { "default": { "bgColor": "#ffffff", ... } }
}
```

在 WASM 端（`ui_from_json.c`），通过 `lv_obj_create(parent)` 创建，然后应用位置、尺寸和样式。子组件的 `parent` 字段直接指向 Container 的 ID。

### 代码生成输出（codegen）

在 `ui.c.ts` 中，Container 生成如下 C 代码：

```c
// Create obj: Container_xxxx
Container_xxxx = lv_obj_create(parent);
lv_obj_set_pos(Container_xxxx, 0, 0);
lv_obj_set_size(Container_xxxx, 200, 150);
lv_obj_set_style_bg_color(Container_xxxx, lv_color_hex(0xffffff), 0);
lv_obj_set_style_bg_opa(Container_xxxx, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(Container_xxxx, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(Container_xxxx, 2, 0);
lv_obj_set_style_radius(Container_xxxx, 8, 0);
lv_obj_set_style_pad_all(Container_xxxx, 16, 0);

// 子组件直接以 Container_xxxx 为 parent 创建
child_xxxx = lv_label_create(Container_xxxx);
```

如果设置了 Flex 布局：

```c
lv_obj_set_layout(Container_xxxx, LV_LAYOUT_FLEX);
lv_obj_set_flex_flow(Container_xxxx, LV_FLEX_FLOW_ROW);
lv_obj_set_flex_align(Container_xxxx, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START, LV_FLEX_ALIGN_START);
```

如果设置了 Grid 布局：

```c
lv_obj_set_layout(Container_xxxx, LV_LAYOUT_GRID);
static int32_t Container_xxxx_col_dsc[] = {LV_GRID_FR(1), LV_GRID_FR(1), LV_GRID_TEMPLATE_LAST};
static int32_t Container_xxxx_row_dsc[] = {LV_GRID_FR(1), LV_GRID_FR(1), LV_GRID_TEMPLATE_LAST};
lv_obj_set_grid_dsc_array(Container_xxxx, Container_xxxx_col_dsc, Container_xxxx_row_dsc);
```

## 11. LVGL API 映射

### 对应 LVGL v9 创建函数

```c
lv_obj_t * lv_obj_create(lv_obj_t * parent);
```

### 关键 API

| API | 说明 |
|-----|------|
| `lv_obj_create(parent)` | 创建基础对象 |
| `lv_obj_set_pos(obj, x, y)` | 设置位置 |
| `lv_obj_set_size(obj, w, h)` | 设置尺寸 |
| `lv_obj_set_width(obj, w)` / `lv_obj_set_height(obj, h)` | 单独设置宽/高 |
| `lv_obj_set_style_bg_color(obj, color, selector)` | 设置背景色 |
| `lv_obj_set_style_border_color(obj, color, selector)` | 设置边框色 |
| `lv_obj_set_style_border_width(obj, width, selector)` | 设置边框宽度 |
| `lv_obj_set_style_radius(obj, radius, selector)` | 设置圆角 |
| `lv_obj_set_style_pad_all(obj, pad, selector)` | 设置内边距 |
| `lv_obj_set_layout(obj, LV_LAYOUT_FLEX)` | 设置 Flex 布局 |
| `lv_obj_set_layout(obj, LV_LAYOUT_GRID)` | 设置 Grid 布局 |
| `lv_obj_set_flex_flow(obj, flow)` | 设置 Flex 流向 |
| `lv_obj_set_flex_align(obj, main, cross, track)` | 设置 Flex 对齐 |
| `lv_obj_set_grid_dsc_array(obj, col_dsc, row_dsc)` | 设置 Grid 描述 |
| `lv_obj_set_scroll_dir(obj, dir)` | 设置滚动方向 |
| `lv_obj_add_flag(obj, flag)` | 添加标志 |
| `lv_obj_clear_flag(obj, flag)` | 清除标志 |
| `lv_obj_add_event_cb(obj, cb, event, user_data)` | 添加事件回调 |

## 12. 设计注意事项

1. **最基础的容器**：Container (obj) 是 LVGL 中所有组件的基类，作为容器使用时功能最简单、最通用。其他容器组件（tabview、tileview、win）都是在 obj 基础上的特化。

2. **子组件定位**：Container 内的子组件默认使用 **绝对定位**（x, y 相对于 Container 的内容区域）。启用 Flex 或 Grid 布局后，子组件的位置由布局引擎管理。

3. **嵌套深度**：Container 支持无限嵌套，但过深的嵌套会影响 LVGL 的渲染性能。建议嵌套层级不超过 5 层。

4. **滚动行为**：LVGL 的 obj 默认是可滚动的（`LV_OBJ_FLAG_SCROLLABLE`）。当子组件超出 Container 边界时，会自动出现滚动条。可通过 `flags.scrollable = false` 禁用。

5. **Card Style 来源**：默认样式来自 LVGL 默认主题的 card style（`lv_theme_default.c`），这与 textarea、dropdown、chart、table、calendar 等组件共享相同的基础样式。

6. **布局切换**：从自由定位切换到 Flex/Grid 布局时，子组件的 x/y 坐标将被布局引擎忽略。切换回自由定位时，需要重新设置子组件的位置。

7. **与 Button 的区别**：Button (btn) 也是 `isContainer=true`，但 Button 有默认的点击样式（pressed state）和主色调背景。Container 更适合纯布局用途。
