# LVGL 编辑器 — 组件设计文档目录

本目录包含 LVGL 编辑器中所有组件的详细设计文档。每个组件文档涵盖属性设计、样式系统、父子关系、UI 渲染层、代码生成和 LVGL API 映射等内容。

---

## 组件总览

编辑器共支持 **19 个组件**，分为 4 个类别：

| 类别 | 图标 | 组件数 | 说明 |
|------|------|--------|------|
| 基础 (basic) | 📦 | 5 | 构建界面的基本元素 |
| 输入 (input) | ✏️ | 5 | 用户交互输入控件 |
| 容器 (container) | 📁 | 4 | 可包含子组件的布局容器 |
| 显示 (display) | 📊 | 5 | 数据展示和可视化组件 |

---

## 基础组件 (Basic)

| 组件 | 类型 | 图标 | 默认尺寸 | 容器 | 说明 | 文档 |
|------|------|------|----------|------|------|------|
| Button | `btn` | 🔘 | 100×40 | ✅ | 按钮，内部自动创建 Label 子组件显示文本。支持点击交互，是唯一一个 isContainer=true 的基础组件 | [btn.md](btn.md) |
| Label | `label` | 🏷️ | 80×24 | ❌ | 文本标签，用于显示静态或动态文本。透明背景，继承父级文本颜色 | [label.md](label.md) |
| Image | `img` | 🖼️ | 100×100 | ❌ | 图片显示组件。v9 使用 `lv_image_create`，v8 使用 `lv_img_create` | [img.md](img.md) |
| Line | `line` | 📏 | 100×4 | ❌ | 线条绘制组件，通过坐标点数组定义线段 | [line.md](line.md) |
| Spinner | `spinner` | ⏳ | 50×50 | ❌ | 旋转加载动画，基于 Arc 组件实现，支持自定义转速 | [spinner.md](spinner.md) |

---

## 输入组件 (Input)

| 组件 | 类型 | 图标 | 默认尺寸 | 容器 | 说明 | 文档 |
|------|------|------|----------|------|------|------|
| Textarea | `textarea` | 📝 | 150×80 | ❌ | 多行文本输入区域，支持占位符文本。采用 card 样式（白底灰边框） | [textarea.md](textarea.md) |
| Dropdown | `dropdown` | 📋 | 120×36 | ❌ | 下拉选择框，支持多选项配置和默认选中项 | [dropdown.md](dropdown.md) |
| Checkbox | `checkbox` | ☑️ | 120×28 | ❌ | 复选框，包含勾选标记和文本标签。选中状态通过 `LV_STATE_CHECKED` 控制 | [checkbox.md](checkbox.md) |
| Switch | `switch` | 🔀 | 50×26 | ❌ | 开关切换控件，圆角胶囊造型。选中状态通过 `LV_STATE_CHECKED` 控制 | [switch.md](switch.md) |
| Slider | `slider` | 🎚️ | 150×20 | ❌ | 滑块控件，支持最小值、最大值和当前值设置 | [slider.md](slider.md) |

---

## 容器组件 (Container)

容器组件是编辑器中最复杂的部分，核心在于**子组件挂载机制**的设计。

| 组件 | 类型 | 图标 | 默认尺寸 | 子组件挂载方式 | 说明 | 文档 |
|------|------|------|----------|----------------|------|------|
| Container | `obj` | 📦 | 200×150 | 直接挂载 | 通用容器，子组件直接 create 到自身。最基础的容器类型 | [obj.md](obj.md) |
| Tab View | `tabview` | 📑 | 250×200 | tabChildMap 映射 | 标签视图，子组件通过 `tabChildMap` 映射到对应 tab page | [tabview.md](tabview.md) |
| Tile View | `tileview` | 🔲 | 200×200 | tileChildMap 映射 | 瓦片视图，子组件通过 `tileChildMap` 映射到对应 tile（key 格式 `"row-col"`） | [tileview.md](tileview.md) |
| Window | `win` | 🪟 | 250×200 | content 区域 | 窗口容器，子组件挂载到 `lv_win_get_content()` 返回的内容区域 | [win.md](win.md) |

### 容器子组件挂载机制

编辑器的 Store 层（`editorStore.ts`）自动维护容器的 childMap：

- **addComponent** — 添加组件到 tabview/tileview 时，自动将子组件 ID 加入当前 activeTab/currentTile 对应的 childMap 条目
- **reparentComponent** — 移动组件时，从旧 parent 的 childMap 中移除，添加到新 parent 的 childMap
- **deleteComponents** — 删除组件时，从 parent 的 childMap 中清理对应 ID

代码生成和 WASM 预览中，使用**虚拟 ID** 机制将子组件正确挂载到内部容器：
- Tab View: `{parentId}__tab__{tabIndex}`
- Tile View: `{parentId}__tile__{row}-{col}`
- Window: `{parentId}__win_content`

---

## 显示组件 (Display)

| 组件 | 类型 | 图标 | 默认尺寸 | 容器 | 说明 | 文档 |
|------|------|------|----------|------|------|------|
| Progress Bar | `bar` | 📊 | 150×20 | ❌ | 进度条，支持范围和当前值设置。圆角胶囊造型 | [bar.md](bar.md) |
| Arc | `arc` | 🔄 | 100×100 | ❌ | 弧形/圆弧控件，支持起止角度和当前值 | [arc.md](arc.md) |
| Chart | `chart` | 📈 | 200×150 | ❌ | 图表组件，支持折线图和柱状图。多系列数据，可配置坐标轴和网格 | [chart.md](chart.md) |
| Table | `table` | 📋 | 200×150 | ❌ | 表格组件，支持行列配置、单元格数据、列宽和对齐方式 | [table.md](table.md) |
| Calendar | `calendar` | 📅 | 220×220 | ❌ | 日历组件，支持年月显示、今日标记、日期高亮和范围选择 | [calendar.md](calendar.md) |

---

## 通用设计

### 样式系统

所有组件支持 4 种样式状态：

| 状态 | LVGL 选择器 | 说明 |
|------|-------------|------|
| `default` | `LV_PART_MAIN \| LV_STATE_DEFAULT` | 默认状态样式 |
| `pressed` | `LV_PART_MAIN \| LV_STATE_PRESSED` | 按下状态样式 |
| `focused` | `LV_PART_MAIN \| LV_STATE_FOCUSED` | 聚焦状态样式 |
| `disabled` | `LV_PART_MAIN \| LV_STATE_DISABLED` | 禁用状态样式 |

通用样式属性（`StyleProps`）包括：背景色、边框、圆角、文本颜色、透明度、内边距、阴影、渐变、轮廓、变换等。详见各组件文档。

### 事件系统

编辑器支持的 LVGL 事件类型：

| 事件 | 说明 | 典型组件 |
|------|------|----------|
| `LV_EVENT_CLICKED` | 点击 | btn, checkbox, switch |
| `LV_EVENT_PRESSED` | 按下 | btn |
| `LV_EVENT_RELEASED` | 释放 | btn |
| `LV_EVENT_LONG_PRESSED` | 长按 | btn |
| `LV_EVENT_VALUE_CHANGED` | 值变化 | slider, arc, dropdown, switch, checkbox, tabview |
| `LV_EVENT_FOCUSED` | 获得焦点 | textarea, dropdown |
| `LV_EVENT_DEFOCUSED` | 失去焦点 | textarea, dropdown |
| `LV_EVENT_READY` | 就绪 | textarea |
| `LV_EVENT_CANCEL` | 取消 | textarea |

### UI 渲染层

每个组件在编辑器中有 4 层渲染实现：

1. **编辑器画布** (`CanvasComponent.tsx`) — React/HTML 模拟渲染，支持拖拽、选中、调整大小
2. **简易预览** (`PreviewPanel.tsx`) — Canvas 2D 绘制，轻量级预览
3. **LVGL WASM 预览** (`ui_from_json.c`) — 真实 LVGL 运行时渲染，通过 JSON 传递组件树
4. **代码生成** (`ui.c.ts`) — 生成可编译的 C 代码，支持 LVGL v8/v9

### LVGL 版本兼容

编辑器默认使用 LVGL v9 API。主要版本差异：

| 功能 | v8 | v9 |
|------|----|----|
| 图片创建 | `lv_img_create` | `lv_image_create` |
| 图片设置源 | `lv_img_set_src` | `lv_image_set_src` |
| Tabview 创建 | `lv_tabview_create(parent, dir, size)` | `lv_tabview_create(parent)` |
| Tabview 设置活动 | `lv_tabview_set_act` | `lv_tabview_set_active` |
| Window 创建 | `lv_win_create(parent, height)` | `lv_win_create(parent)` |
| 坐标类型 | `lv_coord_t` | `int32_t` |
| 旋转属性 | `transform_angle` | `transform_rotation` |

---

## 文件结构

```
docs/components/
├── README.md          ← 本文件（组件目录）
├── btn.md             ← Button 按钮
├── label.md           ← Label 标签
├── img.md             ← Image 图片
├── line.md            ← Line 线条
├── spinner.md         ← Spinner 加载动画
├── textarea.md        ← Textarea 文本输入
├── dropdown.md        ← Dropdown 下拉选择
├── checkbox.md        ← Checkbox 复选框
├── switch.md          ← Switch 开关
├── slider.md          ← Slider 滑块
├── obj.md             ← Container 通用容器
├── tabview.md         ← Tab View 标签视图
├── tileview.md        ← Tile View 瓦片视图
├── win.md             ← Window 窗口
├── bar.md             ← Progress Bar 进度条
├── arc.md             ← Arc 弧形
├── chart.md           ← Chart 图表
├── table.md           ← Table 表格
└── calendar.md        ← Calendar 日历
```
