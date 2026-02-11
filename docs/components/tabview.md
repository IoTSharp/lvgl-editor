# Tab View (tabview) — 标签视图容器组件

## 1. 组件名称和简介

Tab View 是 LVGL 编辑器中的标签视图容器组件，对应 LVGL 的 `lv_tabview`。它提供一组可切换的标签页（tab），每个标签页是一个独立的内容区域，用户可以通过点击标签栏切换显示不同的内容。适用于设置页面、多功能面板、分步向导等场景。

Tab View 是容器组件中子组件挂载机制最复杂的之一，子组件通过 `tabChildMap` 映射到不同的 tab page，而非直接挂在 tabview 自身上。

## 2. 组件类型标识

```
type: 'tabview'
```

## 3. 所属分类

```
category: 'container'  // 容器分类，图标: 📁
```

在组件面板中显示名称为 **Tab View**，图标为 📑。

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 250 |
| defaultHeight | 200 |

## 5. 是否为容器

```
isContainer: true
```

Tab View 是容器组件，子组件通过 tabChildMap 分配到各个 tab page。

## 6. 父子级关系设计

### 可以作为哪些组件的子级

- 可以作为 **Screen（页面根节点）** 的直接子级
- 可以作为任何 `isContainer=true` 的组件的子级，包括：
  - Container (obj)
  - Button (btn)
  - 另一个 Tab View（嵌套，不推荐）
  - Tile View (tileview) — 挂载到对应 tile
  - Window (win) — 挂载到 content 区域

### 可以包含哪些子组件

Tab View 可以包含 **所有类型** 的组件。子组件在逻辑上属于某个 tab page，通过 `tabChildMap` 进行映射。

### 子组件挂载机制（核心设计）

Tab View 的子组件挂载是编辑器中最核心的设计之一，采用 **tabChildMap 映射机制**：

```
子组件 → tabChildMap 映射 → 对应的 tab page
```

#### tabChildMap 数据结构

```typescript
tabChildMap: Record<string, string[]>
// key: tab 索引字符串（如 "0", "1", "2"）
// value: 子组件 ID 数组
```

示例：

```typescript
{
  tabChildMap: {
    "0": ["comp_id_1", "comp_id_2"],  // Tab 1 的子组件
    "1": ["comp_id_3"],                // Tab 2 的子组件
    "2": []                            // Tab 3 无子组件
  }
}
```

#### 挂载流程

1. **添加子组件时**（`addComponent`）：
   - 新组件添加到 tabview 的 `children[]` 数组
   - Store 自动将新组件 ID 添加到 `tabChildMap[activeTab]`
   - 即：新组件默认添加到当前激活的 tab page

   ```typescript
   // editorStore.ts - addComponent
   if (parent?.type === 'tabview') {
     const tabChildMap = { ...(parent.props?.tabChildMap || {}) };
     const activeTab = String(parent.props?.activeTab || 0);
     if (!tabChildMap[activeTab]) tabChildMap[activeTab] = [];
     tabChildMap[activeTab] = [...tabChildMap[activeTab], id];
     get().updateComponent(parentId, { props: { ...parent.props, tabChildMap } });
   }
   ```

2. **重新挂载时**（`reparentComponent`）：
   - 从旧 parent 的 childMap 中移除映射
   - 添加到新 parent（如果是 tabview）的 `tabChildMap[activeTab]`

   ```typescript
   // editorStore.ts - reparentComponent
   // 移除旧映射
   if (oldParent?.type === 'tabview') {
     const tabChildMap = { ...(oldParent.props?.tabChildMap || {}) };
     for (const key of Object.keys(tabChildMap)) {
       tabChildMap[key] = tabChildMap[key].filter(cid => cid !== id);
     }
     get().updateComponent(comp.parentId, { props: { ...oldParent.props, tabChildMap } });
   }
   // 添加新映射
   if (newParent?.type === 'tabview') {
     const tabChildMap = { ...(newParent.props?.tabChildMap || {}) };
     const activeTab = String(newParent.props?.activeTab || 0);
     if (!tabChildMap[activeTab]) tabChildMap[activeTab] = [];
     tabChildMap[activeTab] = [...tabChildMap[activeTab], id];
     get().updateComponent(newParentId, { props: { ...newParent.props, tabChildMap } });
   }
   ```

3. **删除子组件时**（`deleteComponents`）：
   - 从 parent 的 `tabChildMap` 所有 tab 中清理被删除的组件 ID

   ```typescript
   // editorStore.ts - deleteComponents
   if (parent?.type === 'tabview') {
     const tabChildMap = { ...(parent.props?.tabChildMap || {}) };
     for (const key of Object.keys(tabChildMap)) {
       tabChildMap[key] = tabChildMap[key].filter(cid => cid !== id);
     }
     get().updateComponent(comp.parentId, { props: { ...parent.props, tabChildMap } });
   }
   ```

4. **Fallback 机制**：未在 `tabChildMap` 中映射的子组件，默认 fallback 到 `activeTab` 对应的 tab page。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| tabs | `string[]` | `['Tab 1', 'Tab 2']` | 标签页名称数组，每个元素是一个 tab 的标题文字 |
| activeTab | `number` | `0` | 当前激活的 tab 索引（从 0 开始） |
| tabPosition | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | 标签栏位置 |
| tabChildMap | `Record<string, string[]>` | `{}` | tab 到子组件的映射关系，key 为 tab 索引字符串，value 为子组件 ID 数组 |
| tabBarSize | `number` | `50` | 标签栏高度/宽度（取决于 tabPosition） |

### tabs 属性说明

- 数组长度决定 tab 数量
- 每个元素是 tab 标签的显示文字
- 添加/删除 tab 时需同步更新 `tabChildMap`

### tabChildMap 属性说明

- 这是 Tab View 最核心的属性，维护子组件与 tab page 的映射关系
- 由 Store 层自动维护，用户一般不需要手动编辑
- key 是 tab 索引的字符串形式（`"0"`, `"1"`, ...）
- value 是该 tab 下所有子组件的 ID 数组
- 未映射的子组件 fallback 到 activeTab

## 8. 样式设计（styles）

### 默认样式状态（default）

Tab View 采用 LVGL 默认主题的 **scr style**（屏幕样式）+ 无内边距：

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| bgColor | `string` | `'#F5F5F5'` | 背景色，浅灰色（LVGL color_scr） |
| borderColor | `string` | `'transparent'` | 无边框 |
| borderWidth | `number` | `0` | 边框宽度为 0 |
| borderRadius | `number` | `0` | 无圆角 |
| textColor | `string` | `'#212121'` | 文字颜色 |
| opacity | `number` | `1` | 完全不透明 |
| padding | `number` | `0` | 无内边距（pad_zero） |

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，必须存在 |
| `pressed` | 按下状态（可选） |
| `focused` | 聚焦状态（可选） |
| `disabled` | 禁用状态（可选） |

注意：Tab View 的样式主要作用于整体容器。标签栏（tab bar）和各个标签按钮的样式由 LVGL 内部主题控制，编辑器当前不单独暴露标签栏样式。

## 9. 事件支持

| 事件类型 | 说明 |
|----------|------|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | **tab 切换时触发**，最常用的事件 |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |
| `LV_EVENT_READY` | 就绪事件 |
| `LV_EVENT_CANCEL` | 取消事件 |

`LV_EVENT_VALUE_CHANGED` 是 Tab View 最重要的事件，在用户切换 tab 时触发。

## 10. UI 层设计

### 编辑器画布渲染（Canvas）

在画布中，Tab View 渲染为：

```
┌─────────────────────────────┐
│ [Tab 1] [Tab 2] [Tab 3]    │  ← 标签栏（根据 tabPosition 决定位置）
├─────────────────────────────┤
│                             │
│   当前 activeTab 的子组件    │  ← 内容区域
│                             │
└─────────────────────────────┘
```

- 标签栏根据 `tabPosition` 显示在顶部/底部/左侧/右侧
- 点击标签可切换 `activeTab`，切换后只显示对应 tab 的子组件
- 子组件的可见性由 `tabChildMap[activeTab]` 决定
- 不属于当前 activeTab 的子组件在画布中隐藏

### 简易预览渲染（PreviewPanel）

与画布渲染类似，但去除编辑交互。标签栏可点击切换，显示对应 tab 的子组件。

### LVGL WASM 预览渲染

在 `editorStateToJson.ts` 中，Tab View 的子组件通过虚拟 ID 映射到 tab page：

```typescript
// 虚拟 parent ID 格式: {tabview_id}__tab__{tabIndex}
// 例如: "abc123__tab__0", "abc123__tab__1"

childToVirtualParent[childId] = `${parentComp.id}__tab__${tabIndex}`;
```

序列化后的 JSON 中，子组件的 `parent` 字段指向虚拟 ID：

```json
[
  {
    "type": "tabview",
    "id": "abc123",
    "parent": null,
    "props": { "tabs": ["Tab 1", "Tab 2"], "activeTab": 0, "tabPosition": "top", "tabChildMap": {"0": ["child1"], "1": ["child2"]} }
  },
  {
    "type": "label",
    "id": "child1",
    "parent": "abc123__tab__0",
    "props": { "text": "Content 1" }
  },
  {
    "type": "label",
    "id": "child2",
    "parent": "abc123__tab__1",
    "props": { "text": "Content 2" }
  }
]
```

在 WASM 端（`ui_from_json.c`）：
1. 创建 tabview：`lv_tabview_create(parent)`
2. 添加 tab page：`lv_tabview_add_tab(tabview, "Tab 1")` 返回 tab page 对象
3. 将 tab page 以虚拟 ID（`id__tab__N`）注册到 `id_map`
4. 子组件创建时，通过虚拟 ID 在 `id_map` 中找到对应的 tab page 作为 parent

### 代码生成输出（codegen）

在 `ui.c.ts` 中，Tab View 生成如下 C 代码：

```c
// Create tabview: TabView_xxxx
TabView_xxxx = lv_tabview_create(parent);
lv_obj_set_pos(TabView_xxxx, 0, 0);
lv_obj_set_size(TabView_xxxx, 250, 200);

// 设置标签栏位置和大小（LVGL v9）
lv_tabview_set_tab_bar_position(TabView_xxxx, LV_DIR_TOP);
lv_tabview_set_tab_bar_size(TabView_xxxx, 50);

// 添加 tab page
lv_obj_t * TabView_xxxx_tab_0 = lv_tabview_add_tab(TabView_xxxx, "Tab 1");
lv_obj_t * TabView_xxxx_tab_1 = lv_tabview_add_tab(TabView_xxxx, "Tab 2");

// 子组件创建到对应的 tab page 上
// tabChildMap["0"] 中的子组件 → parent 为 TabView_xxxx_tab_0
child_1 = lv_label_create(TabView_xxxx_tab_0);
// tabChildMap["1"] 中的子组件 → parent 为 TabView_xxxx_tab_1
child_2 = lv_btn_create(TabView_xxxx_tab_1);

// 设置激活的 tab（如果不是第一个）
lv_tabview_set_active(TabView_xxxx, 1, LV_ANIM_OFF);
```

代码生成中子组件的 parent 分配逻辑（`ui.c.ts`）：

```typescript
// 构建 child → tab page 变量名的映射
const childToTab: Record<string, string> = {};
for (const [tabIndex, childIds] of Object.entries(tabChildMap)) {
  for (const childId of childIds) {
    childToTab[childId] = `${varName}_tab_${tabIndex}`;
  }
}
// 未映射的 fallback 到 activeTab
const defaultTab = `${varName}_tab_${component.props.activeTab || 0}`;
for (const child of component.children) {
  const tabParent = childToTab[child.id] || defaultTab;
  generateComponentCode(child, tabParent, ...);
}
```

## 11. LVGL API 映射

### 对应 LVGL v9 创建函数

```c
lv_obj_t * lv_tabview_create(lv_obj_t * parent);
```

注意：LVGL v8 的签名不同：`lv_tabview_create(parent, dir, tab_size)`，编辑器在 v8 模式下会自动适配。

### 关键 API

| API | 说明 |
|-----|------|
| `lv_tabview_create(parent)` | 创建 tabview（v9） |
| `lv_tabview_add_tab(tabview, name)` | 添加一个 tab page，返回 tab page 对象（`lv_obj_t *`） |
| `lv_tabview_set_active(tabview, index, anim)` | 设置激活的 tab |
| `lv_tabview_set_tab_bar_position(tabview, dir)` | 设置标签栏位置（v9），dir 为 `LV_DIR_TOP/BOTTOM/LEFT/RIGHT` |
| `lv_tabview_set_tab_bar_size(tabview, size)` | 设置标签栏尺寸（v9） |
| `lv_tabview_get_active(tabview)` | 获取当前激活的 tab 索引 |
| `lv_tabview_get_tab_bar(tabview)` | 获取标签栏对象 |
| `lv_tabview_get_content(tabview)` | 获取内容区域对象 |

### LVGL 源码参考

Tab View 的实现位于 `tools/lvgl/src/widgets/tabview/lv_tabview.c`，内部结构：

```
tabview (lv_obj)
├── tab_bar (lv_obj, 包含 tab 按钮)
│   ├── tab_btn_0 (lv_btn)
│   ├── tab_btn_1 (lv_btn)
│   └── ...
└── content (lv_obj, 包含 tab page)
    ├── tab_page_0 (lv_obj)
    ├── tab_page_1 (lv_obj)
    └── ...
```

## 12. 设计注意事项

1. **tabChildMap 是核心**：Tab View 的子组件挂载完全依赖 `tabChildMap`。Store 层在 `addComponent`、`reparentComponent`、`deleteComponents` 三个操作中自动维护此映射，确保数据一致性。

2. **设计时 tab 切换**：在编辑器画布中，点击 tab 标签会更新 `activeTab` 属性，从而切换显示的子组件。这是纯编辑器行为，不影响运行时。

3. **新增子组件默认归属**：通过拖拽添加到 Tab View 的子组件，默认归属到当前 `activeTab`。用户需要先切换到目标 tab，再添加子组件。

4. **tab 增删同步**：添加或删除 tab 时，需要同步更新 `tabChildMap`。删除 tab 时，该 tab 下的子组件需要迁移到其他 tab 或删除。

5. **WASM 预览的虚拟 ID**：WASM 预览使用 `{id}__tab__{N}` 格式的虚拟 ID 来标识 tab page。这些虚拟 ID 不是真实的组件 ID，仅用于 WASM 端的 parent 查找。

6. **v8/v9 API 差异**：
   - v9：`lv_tabview_create(parent)` + `lv_tabview_set_tab_bar_position()` + `lv_tabview_set_tab_bar_size()`
   - v8：`lv_tabview_create(parent, dir, tab_size)` 在创建时指定位置和大小

7. **性能考虑**：每个 tab page 都是一个完整的 lv_obj，即使不可见也会占用内存。tab 数量过多（>10）时需注意内存消耗。

8. **标签栏样式**：当前编辑器不单独暴露标签栏和标签按钮的样式配置。标签栏的外观由 LVGL 默认主题控制。未来可考虑扩展支持自定义标签栏样式。

9. **嵌套容器**：Tab page 内部可以放置其他容器组件（如 Container、另一个 Tab View），形成复杂的嵌套布局。但需注意嵌套 Tab View 的用户体验。
