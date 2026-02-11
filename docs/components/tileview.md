# Tile View (tileview) — 瓦片视图容器组件

## 1. 组件名称和简介

Tile View 是 LVGL 编辑器中的瓦片视图容器组件，对应 LVGL 的 `lv_tileview`。它提供一个二维网格布局，每个网格单元（tile）是一个独立的全屏内容区域，用户可以通过滑动手势在 tile 之间切换。适用于智能手表界面、多屏仪表盘、滑动导航页面等场景。

Tile View 的子组件挂载机制与 Tab View 类似，通过 `tileChildMap` 将子组件映射到不同的 tile，但使用二维坐标（row-col）作为 key。

## 2. 组件类型标识

```
type: 'tileview'
```

## 3. 所属分类

```
category: 'container'  // 容器分类，图标: 📁
```

在组件面板中显示名称为 **Tile View**，图标为 🔲。

## 4. 默认尺寸

| 属性 | 值 |
|------|-----|
| defaultWidth | 200 |
| defaultHeight | 200 |

## 5. 是否为容器

```
isContainer: true
```

Tile View 是容器组件，子组件通过 tileChildMap 分配到各个 tile。

## 6. 父子级关系设计

### 可以作为哪些组件的子级

- 可以作为 **Screen（页面根节点）** 的直接子级
- 可以作为任何 `isContainer=true` 的组件的子级，包括：
  - Container (obj)
  - Button (btn)
  - Tab View (tabview) — 挂载到对应 tab page
  - 另一个 Tile View（嵌套，不推荐）
  - Window (win) — 挂载到 content 区域

### 可以包含哪些子组件

Tile View 可以包含 **所有类型** 的组件。子组件在逻辑上属于某个 tile，通过 `tileChildMap` 进行映射。

### 子组件挂载机制（核心设计）

Tile View 采用 **tileChildMap 映射机制**，与 Tab View 的 tabChildMap 设计思路一致，但使用二维坐标作为 key：

```
子组件 → tileChildMap 映射 → 对应的 tile (row-col)
```

#### tileChildMap 数据结构

```typescript
tileChildMap: Record<string, string[]>
// key: "row-col" 格式的字符串（如 "0-0", "0-1", "1-0", "1-1"）
// value: 子组件 ID 数组
```

示例（2×2 网格）：

```typescript
{
  tileChildMap: {
    "0-0": ["comp_id_1", "comp_id_2"],  // 第 0 行第 0 列的子组件
    "0-1": ["comp_id_3"],                // 第 0 行第 1 列的子组件
    "1-0": [],                            // 第 1 行第 0 列无子组件
    "1-1": ["comp_id_4"]                 // 第 1 行第 1 列的子组件
  }
}
```

#### 挂载流程

1. **添加子组件时**（`addComponent`）：
   - 新组件添加到 tileview 的 `children[]` 数组
   - Store 自动将新组件 ID 添加到 `tileChildMap[currentRow-currentCol]`
   - 即：新组件默认添加到当前显示的 tile

   ```typescript
   // editorStore.ts - addComponent
   if (parent?.type === 'tileview') {
     const tileChildMap = { ...(parent.props?.tileChildMap || {}) };
     const key = `${parent.props?.currentRow || 0}-${parent.props?.currentCol || 0}`;
     if (!tileChildMap[key]) tileChildMap[key] = [];
     tileChildMap[key] = [...tileChildMap[key], id];
     get().updateComponent(parentId, { props: { ...parent.props, tileChildMap } });
   }
   ```

2. **重新挂载时**（`reparentComponent`）：
   - 从旧 parent 的 tileChildMap 所有 tile 中移除映射
   - 添加到新 parent（如果是 tileview）的 `tileChildMap[currentRow-currentCol]`

   ```typescript
   // editorStore.ts - reparentComponent
   // 移除旧映射
   if (oldParent?.type === 'tileview') {
     const tileChildMap = { ...(oldParent.props?.tileChildMap || {}) };
     for (const key of Object.keys(tileChildMap)) {
       tileChildMap[key] = tileChildMap[key].filter(cid => cid !== id);
     }
     get().updateComponent(comp.parentId, { props: { ...oldParent.props, tileChildMap } });
   }
   // 添加新映射
   if (newParent?.type === 'tileview') {
     const tileChildMap = { ...(newParent.props?.tileChildMap || {}) };
     const key = `${newParent.props?.currentRow || 0}-${newParent.props?.currentCol || 0}`;
     if (!tileChildMap[key]) tileChildMap[key] = [];
     tileChildMap[key] = [...tileChildMap[key], id];
     get().updateComponent(newParentId, { props: { ...newParent.props, tileChildMap } });
   }
   ```

3. **删除子组件时**（`deleteComponents`）：
   - 从 parent 的 `tileChildMap` 所有 tile 中清理被删除的组件 ID

   ```typescript
   // editorStore.ts - deleteComponents
   if (parent?.type === 'tileview') {
     const tileChildMap = { ...(parent.props?.tileChildMap || {}) };
     for (const key of Object.keys(tileChildMap)) {
       tileChildMap[key] = tileChildMap[key].filter(cid => cid !== id);
     }
     get().updateComponent(comp.parentId, { props: { ...parent.props, tileChildMap } });
   }
   ```

4. **Fallback 机制**：未在 `tileChildMap` 中映射的子组件，默认 fallback 到 `tile_0_0`（第 0 行第 0 列）。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| rows | `number` | `2` | 行数，决定垂直方向的 tile 数量 |
| cols | `number` | `2` | 列数，决定水平方向的 tile 数量 |
| currentRow | `number` | `0` | 当前显示的 tile 行索引（从 0 开始） |
| currentCol | `number` | `0` | 当前显示的 tile 列索引（从 0 开始） |
| tileChildMap | `Record<string, string[]>` | `{}` | tile 到子组件的映射关系，key 为 "row-col" 格式，value 为子组件 ID 数组 |

### rows / cols 属性说明

- `rows × cols` 决定总的 tile 数量（如 2×2 = 4 个 tile）
- 修改 rows/cols 时需同步更新 `tileChildMap`，清理超出范围的映射
- 每个 tile 的尺寸等于 tileview 的尺寸（全屏 tile）

### tileChildMap 属性说明

- key 格式为 `"row-col"`，如 `"0-0"`, `"0-1"`, `"1-0"`, `"1-1"`
- 由 Store 层自动维护，用户一般不需要手动编辑
- 未映射的子组件 fallback 到 `tile_0_0`

### currentRow / currentCol 属性说明

- 决定编辑器中当前显示哪个 tile 的内容
- 设计时可通过切换 currentRow/currentCol 来编辑不同 tile 的子组件
- 运行时对应 `lv_obj_set_tile_id()` 的初始位置

## 8. 样式设计（styles）

### 默认样式状态（default）

Tile View 采用 LVGL 默认主题的 **scr style**（屏幕样式）：

| 样式属性 | 类型 | 默认值 | 说明 |
|----------|------|--------|------|
| bgColor | `string` | `'#F5F5F5'` | 背景色，浅灰色（LVGL color_scr） |
| borderColor | `string` | `'transparent'` | 无边框 |
| borderWidth | `number` | `0` | 边框宽度为 0 |
| borderRadius | `number` | `0` | 无圆角 |
| textColor | `string` | `'#212121'` | 文字颜色 |
| opacity | `number` | `1` | 完全不透明 |
| padding | `number` | `0` | 无内边距 |

### 支持的样式状态

| 状态 | 说明 |
|------|------|
| `default` | 默认状态，必须存在 |
| `pressed` | 按下状态（可选） |
| `focused` | 聚焦状态（可选） |
| `disabled` | 禁用状态（可选） |

注意：Tile View 的样式作用于整体容器。各个 tile 的样式由 LVGL 内部控制，编辑器当前不单独暴露 tile 样式。

## 9. 事件支持

| 事件类型 | 说明 |
|----------|------|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_VALUE_CHANGED` | **tile 切换时触发**，最常用的事件 |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |
| `LV_EVENT_READY` | 就绪事件 |
| `LV_EVENT_CANCEL` | 取消事件 |

`LV_EVENT_VALUE_CHANGED` 是 Tile View 最重要的事件，在用户滑动切换 tile 时触发。

## 10. UI 层设计

### 编辑器画布渲染（Canvas）

在画布中，Tile View 渲染为：

```
┌─────────────────────────────┐
│                             │
│  当前 tile (currentRow,     │
│  currentCol) 的子组件       │
│                             │
│  [0,0] [0,1]               │  ← tile 导航指示器（可选）
│  [1,0] [1,1]               │
└─────────────────────────────┘
```

- 只显示当前 `currentRow`-`currentCol` 对应 tile 的子组件
- 子组件的可见性由 `tileChildMap[currentRow-currentCol]` 决定
- 设计时可通过修改 currentRow/currentCol 切换编辑不同的 tile
- 不属于当前 tile 的子组件在画布中隐藏

### 简易预览渲染（PreviewPanel）

与画布渲染类似，但去除编辑交互。显示当前 tile 的子组件，可通过交互切换 tile。

### LVGL WASM 预览渲染

在 `editorStateToJson.ts` 中，Tile View 的子组件通过虚拟 ID 映射到 tile：

```typescript
// 虚拟 parent ID 格式: {tileview_id}__tile__{row-col}
// 例如: "abc123__tile__0-0", "abc123__tile__0-1", "abc123__tile__1-0"

childToVirtualParent[childId] = `${parentComp.id}__tile__${tileKey}`;
```

序列化后的 JSON 中，子组件的 `parent` 字段指向虚拟 ID：

```json
[
  {
    "type": "tileview",
    "id": "abc123",
    "parent": null,
    "props": { "rows": 2, "cols": 2, "currentRow": 0, "currentCol": 0, "tileChildMap": {"0-0": ["child1"], "1-0": ["child2"]} }
  },
  {
    "type": "label",
    "id": "child1",
    "parent": "abc123__tile__0-0",
    "props": { "text": "Tile 0,0 Content" }
  },
  {
    "type": "label",
    "id": "child2",
    "parent": "abc123__tile__1-0",
    "props": { "text": "Tile 1,0 Content" }
  }
]
```

在 WASM 端（`ui_from_json.c`）：
1. 创建 tileview：`lv_tileview_create(parent)`
2. 添加 tile：`lv_tileview_add_tile(tileview, col, row, LV_DIR_ALL)` 返回 tile 对象
3. 将 tile 以虚拟 ID（`id__tile__R-C`）注册到 `id_map`
4. 子组件创建时，通过虚拟 ID 在 `id_map` 中找到对应的 tile 作为 parent

### 代码生成输出（codegen）

在 `ui.c.ts` 中，Tile View 生成如下 C 代码：

```c
// Create tileview: TileView_xxxx
TileView_xxxx = lv_tileview_create(parent);
lv_obj_set_pos(TileView_xxxx, 0, 0);
lv_obj_set_size(TileView_xxxx, 200, 200);

// 添加所有 tile（遍历 rows × cols）
lv_obj_t * TileView_xxxx_tile_0_0 = lv_tileview_add_tile(TileView_xxxx, 0, 0, LV_DIR_ALL);
lv_obj_t * TileView_xxxx_tile_0_1 = lv_tileview_add_tile(TileView_xxxx, 1, 0, LV_DIR_ALL);
lv_obj_t * TileView_xxxx_tile_1_0 = lv_tileview_add_tile(TileView_xxxx, 0, 1, LV_DIR_ALL);
lv_obj_t * TileView_xxxx_tile_1_1 = lv_tileview_add_tile(TileView_xxxx, 1, 1, LV_DIR_ALL);

// 设置初始 tile 位置
lv_obj_set_tile_id(TileView_xxxx, 0, 0, LV_ANIM_OFF);

// 子组件创建到对应的 tile 上
// tileChildMap["0-0"] 中的子组件 → parent 为 TileView_xxxx_tile_0_0
child_1 = lv_label_create(TileView_xxxx_tile_0_0);
// tileChildMap["1-0"] 中的子组件 → parent 为 TileView_xxxx_tile_1_0
child_2 = lv_btn_create(TileView_xxxx_tile_1_0);
```

代码生成中子组件的 parent 分配逻辑（`ui.c.ts`）：

```typescript
// 构建 child → tile 变量名的映射
const childToTile: Record<string, string> = {};
for (const [tileKey, childIds] of Object.entries(tileChildMap)) {
  const [r, c] = tileKey.split('-');
  for (const childId of childIds) {
    childToTile[childId] = `${varName}_tile_${r}_${c}`;
  }
}
// 未映射的 fallback 到 tile_0_0
const defaultTile = `${varName}_tile_0_0`;
for (const child of component.children) {
  const tileParent = childToTile[child.id] || defaultTile;
  generateComponentCode(child, tileParent, ...);
}
```

## 11. LVGL API 映射

### 对应 LVGL v9 创建函数

```c
lv_obj_t * lv_tileview_create(lv_obj_t * parent);
```

### 关键 API

| API | 说明 |
|-----|------|
| `lv_tileview_create(parent)` | 创建 tileview |
| `lv_tileview_add_tile(tileview, col, row, dir)` | 添加一个 tile，返回 tile 对象（`lv_obj_t *`）。`col` 为列索引，`row` 为行索引，`dir` 为允许的滑动方向 |
| `lv_obj_set_tile_id(tileview, col, row, anim)` | 设置当前显示的 tile（通过列/行索引） |
| `lv_obj_set_tile(tileview, tile_obj, anim)` | 设置当前显示的 tile（通过 tile 对象） |
| `lv_tileview_get_tile_active(tileview)` | 获取当前激活的 tile 对象 |

### lv_tileview_add_tile 参数说明

```c
lv_obj_t * lv_tileview_add_tile(
    lv_obj_t * tv,    // tileview 对象
    uint8_t col,       // 列索引（水平位置）
    uint8_t row,       // 行索引（垂直位置）
    lv_dir_t dir       // 允许从此 tile 滑动的方向
);
```

`dir` 参数控制从该 tile 可以滑动到哪些方向：
- `LV_DIR_ALL` — 所有方向
- `LV_DIR_HOR` — 仅水平
- `LV_DIR_VER` — 仅垂直
- `LV_DIR_LEFT | LV_DIR_RIGHT` — 组合方向

### LVGL 内部结构

```
tileview (lv_obj, 可滚动容器)
├── tile_0_0 (lv_obj, 位于 col=0, row=0)
├── tile_0_1 (lv_obj, 位于 col=1, row=0)
├── tile_1_0 (lv_obj, 位于 col=0, row=1)
└── tile_1_1 (lv_obj, 位于 col=1, row=1)
```

Tileview 本质上是一个可滚动的容器，每个 tile 是一个与 tileview 同尺寸的子对象，通过 snap 机制实现页面级滑动。

## 12. 设计注意事项

1. **tileChildMap 是核心**：与 Tab View 的 tabChildMap 类似，Tile View 的子组件挂载完全依赖 `tileChildMap`。Store 层在 `addComponent`、`reparentComponent`、`deleteComponents` 三个操作中自动维护此映射。

2. **二维坐标 key**：tileChildMap 的 key 格式为 `"row-col"`（如 `"0-0"`, `"1-2"`），注意是 **row 在前，col 在后**。而 LVGL API `lv_tileview_add_tile(tv, col, row, dir)` 的参数顺序是 **col 在前，row 在后**，代码生成时需注意转换。

3. **设计时 tile 切换**：在编辑器中，通过修改 `currentRow` 和 `currentCol` 属性来切换当前编辑的 tile。新添加的子组件会自动归属到当前 tile。

4. **rows/cols 修改**：修改行列数时需要注意：
   - 增加行/列：新 tile 的 tileChildMap 条目为空
   - 减少行/列：需要处理被移除 tile 上的子组件（迁移或删除）

5. **滑动方向**：当前编辑器生成代码时，所有 tile 的滑动方向默认为 `LV_DIR_ALL`。未来可考虑为每个 tile 单独配置允许的滑动方向。

6. **Fallback 到 tile_0_0**：未映射的子组件默认 fallback 到第一个 tile（0-0），而非当前 tile。这与 Tab View fallback 到 activeTab 的行为不同。

7. **全屏 tile**：每个 tile 的尺寸等于 tileview 的尺寸。LVGL 通过 snap 滚动实现 tile 切换效果，不支持部分可见的 tile。

8. **性能考虑**：`rows × cols` 个 tile 都会被创建并占用内存。对于大型网格（如 5×5 = 25 个 tile），需注意内存和渲染性能。

9. **与 Tab View 的对比**：
   - Tab View：一维切换（tab 索引），通过标签栏点击切换
   - Tile View：二维切换（row, col），通过滑动手势切换
   - 两者的 childMap 机制设计一致，仅 key 格式不同
