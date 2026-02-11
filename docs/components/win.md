# Window (win) — 窗口容器组件

## 1. 组件名称和简介

Window 是 LVGL 编辑器中的窗口容器组件，对应 LVGL 的 `lv_win`。它提供一个带有标题栏（header）和内容区域（content）的窗口结构，标题栏可包含标题文字和操作按钮（如关闭按钮）。适用于对话框、设置面板、弹出窗口、信息卡片等场景。

Window 的子组件挂载机制的特殊之处在于：子组件不是直接挂在 win 对象上，而是挂到 `lv_win_get_content()` 返回的 content 区域。

## 2. 组件类型标识

```
type: 'win'
```

## 3. 所属分类

```
category: 'container'  // 容器分类，图标: 📁
```

在组件面板中显示名称为 **Window**，图标为 🪟。

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 250 |
| defaultHeight | 200 |

## 5. 是否为容器

```
isContainer: true
```

Window 是容器组件，子组件挂载到其内部的 content 区域。

## 6. 父子级关系设计

### 可以作为哪些组件的子级

- 可以作为 **Screen（页面根节点）** 的直接子级
- 可以作为任何 `isContainer=true` 的组件的子级，包括：
  - Container (obj)
  - Button (btn)
  - Tab View (tabview) — 挂载到对应 tab page
  - Tile View (tileview) — 挂载到对应 tile
  - 另一个 Window（嵌套，不推荐）

### 可以包含哪些子组件

Window 可以包含 **所有类型** 的组件。子组件在运行时会被放置到 Window 的 content 区域。

### 子组件挂载机制（核心设计）

Window 采用 **content 区域挂载机制**：

```
子组件 → lv_win_get_content(win) → content 区域
```

#### 挂载原理

LVGL 的 `lv_win` 内部结构分为两部分：
- **header**：标题栏，包含标题文字和按钮，由 `lv_win_add_title()` 和 `lv_win_add_btn()` 管理
- **content**：内容区域，由 `lv_win_get_content()` 获取，子组件应创建在此区域

在编辑器中，Window 的 `children[]` 数组存储所有子组件，但在代码生成和 WASM 预览时，这些子组件的 parent 不是 win 对象本身，而是 win 的 content 区域。

#### 挂载流程

1. **添加子组件时**（`addComponent`）：
   - 新组件添加到 win 的 `children[]` 数组
   - `parentId` 设为 win 的 ID
   - Window 不需要额外的 childMap（不像 tabview/tileview），因为所有子组件都属于同一个 content 区域

   ```typescript
   // editorStore.ts - addComponent
   // Window 走通用逻辑，无需特殊处理
   addComponentToTree(page.components, newComponent, parentId)
   ```

2. **重新挂载时**（`reparentComponent`）：
   - 通用逻辑，从旧 parent 移除，添加到 win 的 children
   - 如果旧 parent 是 tabview/tileview，需要清理对应的 childMap

3. **删除子组件时**（`deleteComponents`）：
   - 通用逻辑，从 win 的 children 中移除

#### 与 Container (obj) 的区别

虽然 Window 的 Store 层操作与 Container 类似（都是直接操作 children 数组），但在代码生成和 WASM 预览层面有本质区别：

| 层面 | Container (obj) | Window (win) |
|------|-----------------|--------------|
| Store 层 | 子组件在 `children[]` 中 | 子组件在 `children[]` 中 |
| 代码生成 | `lv_xxx_create(container)` | `lv_xxx_create(win_content)` |
| WASM 预览 | parent = container_id | parent = `{win_id}__win_content` |

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| title | `string` | `'Window'` | 窗口标题文字，显示在标题栏中 |
| headerHeight | `number` | `40` | 标题栏高度（像素） |
| showCloseBtn | `boolean` | `true` | 是否显示关闭按钮（使用 LV_SYMBOL_CLOSE 图标） |
| headerButtons | `Array<{icon: string, width: number}>` | `[]` | 额外的标题栏按钮列表 |

### title 属性说明

- 通过 `lv_win_add_title(win, title)` 设置
- 显示在标题栏的左侧（或按添加顺序排列）

### headerHeight 属性说明

- 控制标题栏的高度
- LVGL v9 中通过 `lv_win_create(parent)` 创建后单独设置
- LVGL v8 中在 `lv_win_create(parent, headerHeight)` 时指定

### showCloseBtn 属性说明

- 为 `true` 时，在标题栏添加一个关闭按钮
- 生成代码：`lv_win_add_btn(win, LV_SYMBOL_CLOSE, 40)`
- 关闭按钮的实际行为需要通过事件绑定实现

### headerButtons 属性说明

- 额外的标题栏按钮数组
- 每个按钮包含 `icon`（LVGL 符号常量，如 `LV_SYMBOL_SETTINGS`）和 `width`（按钮宽度）
- 按钮按数组顺序添加到标题栏

## 8. 样式设计（styles）

### 默认样式状态（default）

Window 采用 LVGL 默认主题的 **clip_corner** 样式，header 使用灰色背景，content 使用屏幕样式：

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| bgColor | `string` | `'#F5F5F5'` | 背景色，浅灰色（LVGL color_scr，作用于 content 区域） |
| borderColor | `string` | `'#E0E0E0'` | 边框色，浅灰色 |
| borderWidth | `number` | `2` | 边框宽度 |
| borderRadius | `number` | `8` | 圆角半径（clip_corner 效果） |
| textColor | `string` | `'#212121'` | 文字颜色 |
| opacity | `number` | `1` | 完全不透明 |
| padding | `number` | `0` | 无内边距（content 区域有自己的 padding） |

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，必须存在 |
| `pressed` | 按下状态（可选） |
| `focused` | 聚焦状态（可选） |
| `disabled` | 禁用状态（可选） |

注意：Window 的样式主要作用于整体容器。标题栏（header）的背景色由 LVGL 主题控制（默认为 `color_grey = #E0E0E0`），编辑器当前不单独暴露 header 样式。

## 9. 事件支持

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

对于 Window 组件，最常用的事件场景是关闭按钮的点击事件。关闭按钮是通过 `lv_win_add_btn()` 添加的独立按钮对象，其事件需要单独绑定。

## 10. UI 层设计

### 编辑器画布渲染（Canvas）

在画布中，Window 渲染为：

```
┌─────────────────────────────┐
│ Window Title          [✕]   │  ← header 区域（灰色背景）
├─────────────────────────────┤
│                             │
│   子组件内容区域             │  ← content 区域
│                             │
│                             │
└─────────────────────────────┘
```

- header 区域显示标题文字和按钮图标
- content 区域显示子组件
- header 高度由 `headerHeight` 属性控制
- 子组件的 y 坐标相对于 content 区域顶部（不包含 header）

### 简易预览渲染（PreviewPanel）

与画布渲染类似，但去除编辑交互。显示完整的窗口结构（header + content），子组件在 content 区域内渲染。

### LVGL WASM 预览渲染

在 `editorStateToJson.ts` 中，Window 的子组件通过虚拟 ID 映射到 content 区域：

```typescript
// 虚拟 parent ID 格式: {win_id}__win_content
// 例如: "abc123__win_content"

// 所有子组件都映射到同一个 content 虚拟 ID
for (const comp of components) {
  childToVirtualParent[comp.id] = `${parentComp.id}__win_content`;
}
```

序列化后的 JSON 中，子组件的 `parent` 字段指向虚拟 ID：

```json
[
  {
    "type": "win",
    "id": "abc123",
    "parent": null,
    "props": { "title": "Window", "headerHeight": 40, "showCloseBtn": true, "headerButtons": [] }
  },
  {
    "type": "label",
    "id": "child1",
    "parent": "abc123__win_content",
    "props": { "text": "Content" }
  }
]
```

在 WASM 端（`ui_from_json.c`）：
1. 创建 win：`lv_win_create(parent)`
2. 添加标题：`lv_win_add_title(win, "Window")`
3. 添加按钮：`lv_win_add_btn(win, LV_SYMBOL_CLOSE, 40)`
4. 获取 content：`lv_win_get_content(win)` 返回 content 对象
5. 将 content 以虚拟 ID（`id__win_content`）注册到 `id_map`
6. 子组件创建时，通过虚拟 ID 在 `id_map` 中找到 content 作为 parent

### 代码生成输出（codegen）

在 `ui.c.ts` 中，Window 生成如下 C 代码：

```c
// Create win: Window_xxxx
Window_xxxx = lv_win_create(parent);
lv_obj_set_pos(Window_xxxx, 0, 0);
lv_obj_set_size(Window_xxxx, 250, 200);

// 样式设置
lv_obj_set_style_bg_color(Window_xxxx, lv_color_hex(0xF5F5F5), 0);
lv_obj_set_style_bg_opa(Window_xxxx, LV_OPA_COVER, 0);
lv_obj_set_style_border_color(Window_xxxx, lv_color_hex(0xE0E0E0), 0);
lv_obj_set_style_border_width(Window_xxxx, 2, 0);
lv_obj_set_style_radius(Window_xxxx, 8, 0);

// 添加标题
lv_win_add_title(Window_xxxx, "Window");

// 添加关闭按钮
lv_win_add_btn(Window_xxxx, LV_SYMBOL_CLOSE, 40);

// 获取 content 区域，子组件创建到 content 上
lv_obj_t * Window_xxxx_content = lv_win_get_content(Window_xxxx);

// 子组件以 content 为 parent
child_1 = lv_label_create(Window_xxxx_content);
child_2 = lv_btn_create(Window_xxxx_content);
```

代码生成中子组件的 parent 分配逻辑（`ui.c.ts`）：

```typescript
// Window 的子组件统一挂到 content 区域
if (component.type === 'win') {
  if (component.children.length > 0) {
    lines.push(`${indent}lv_obj_t * ${varName}_content = lv_win_get_content(${varName});`);
    for (const child of component.children) {
      lines.push(...generateComponentCode(child, `${varName}_content`, ...));
    }
  }
}
```

## 11. LVGL API 映射

### 对应 LVGL v9 创建函数

```c
lv_obj_t * lv_win_create(lv_obj_t * parent);
```

注意：LVGL v8 的签名不同：`lv_win_create(parent, header_height)`，编辑器在 v8 模式下会自动适配。

### 关键 API

| API | 说明 |
|-----|------|
| `lv_win_create(parent)` | 创建 window（v9） |
| `lv_win_add_title(win, title)` | 添加标题文字到 header |
| `lv_win_add_btn(win, icon, width)` | 添加按钮到 header，`icon` 为 LVGL 符号（如 `LV_SYMBOL_CLOSE`），`width` 为按钮宽度 |
| `lv_win_get_content(win)` | 获取 content 区域对象（`lv_obj_t *`），子组件应创建在此对象上 |
| `lv_win_get_header(win)` | 获取 header 区域对象 |

### LVGL 内部结构

```
win (lv_obj, 整体容器)
├── header (lv_obj, 标题栏，flex 布局)
│   ├── title (lv_label, 标题文字)
│   ├── btn_close (lv_btn, 关闭按钮)
│   └── btn_xxx (lv_btn, 其他按钮)
└── content (lv_obj, 内容区域)
    ├── child_1 (用户子组件)
    ├── child_2 (用户子组件)
    └── ...
```

Window 内部使用 flex 布局：
- 整体为垂直 flex（header 在上，content 在下）
- header 为水平 flex（标题和按钮水平排列）
- content 区域默认可滚动

### LVGL 符号常量（用于 headerButtons）

| 符号 | 说明 |
|------|------|
| `LV_SYMBOL_CLOSE` | 关闭 ✕ |
| `LV_SYMBOL_SETTINGS` | 设置 ⚙ |
| `LV_SYMBOL_HOME` | 主页 🏠 |
| `LV_SYMBOL_LEFT` | 左箭头 ← |
| `LV_SYMBOL_RIGHT` | 右箭头 → |
| `LV_SYMBOL_REFRESH` | 刷新 🔄 |
| `LV_SYMBOL_EDIT` | 编辑 ✏ |
| `LV_SYMBOL_SAVE` | 保存 💾 |

## 12. 设计注意事项

1. **content 区域是关键**：Window 的子组件必须创建在 `lv_win_get_content()` 返回的 content 区域上，而不是 win 对象本身。这是 Window 与 Container 最大的区别。编辑器在代码生成和 WASM 预览中自动处理这一映射。

2. **Store 层无需特殊 childMap**：与 Tab View 和 Tile View 不同，Window 不需要 childMap 映射，因为所有子组件都属于同一个 content 区域。Store 层的 addComponent/reparentComponent/deleteComponents 走通用逻辑即可。

3. **header 不可编辑子组件**：当前设计中，header 区域的内容（标题和按钮）通过 props 配置，不支持在 header 中放置自定义子组件。所有通过拖拽添加的子组件都进入 content 区域。

4. **headerHeight 的 v8/v9 差异**：
   - v9：`lv_win_create(parent)` 后通过样式或内部机制设置 header 高度
   - v8：`lv_win_create(parent, headerHeight)` 在创建时指定
   - 编辑器在代码生成时自动适配

5. **关闭按钮行为**：`showCloseBtn=true` 只是在 header 添加一个带关闭图标的按钮，不会自动实现关闭/隐藏窗口的逻辑。用户需要通过事件绑定来实现关闭行为（如 `lv_obj_add_flag(win, LV_OBJ_FLAG_HIDDEN)`）。

6. **WASM 预览虚拟 ID**：Window 使用 `{id}__win_content` 格式的单一虚拟 ID（不像 tabview 有多个 tab page 虚拟 ID），因为 Window 只有一个 content 区域。

7. **content 区域可滚动**：Window 的 content 区域默认是可滚动的。当子组件超出 content 区域时，会自动出现滚动条。

8. **样式作用范围**：编辑器中配置的样式主要作用于 win 整体容器。header 的背景色（默认灰色）和 content 的背景色由 LVGL 主题内部控制。未来可考虑分别暴露 header 和 content 的样式配置。

9. **与对话框的关系**：LVGL 没有独立的 dialog 组件，Window 可以配合 `lv_obj_add_flag(win, LV_OBJ_FLAG_FLOATING)` 实现浮动对话框效果。编辑器当前不直接支持 floating 标志的配置，但可通过 flags 属性扩展。
