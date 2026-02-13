# 画布渲染架构设计文档

## 1. 概述

设计画布（Canvas）是 LVGL Editor 的核心交互区域，负责组件的可视化渲染、拖拽移动、缩放调整、框选、对齐等操作。架构设计以高性能为核心目标，确保大量组件场景下的流畅交互。

## 2. 组件结构

```
Canvas (画布容器)
├── 视口层 (canvas-viewport) — 平移变换
│   └── 画布层 (canvas) — 缩放变换
│       ├── Grid (网格)
│       ├── CanvasComponent[] (组件渲染)
│       │   └── CanvasComponent[] (递归子组件)
│       ├── BoxSelection (框选矩形)
│       └── AlignmentGuides (对齐辅助线)
└── ContextMenu (右键菜单)
```

## 3. 状态管理

### 3.1 Store 结构（editorStore）

| State | 说明 | 变化频率 |
|-------|------|---------|
| `canvas` | 画布尺寸、缩放、平移、网格配置 | 低 |
| `pages` | 页面列表及组件树 | 中（拖拽时每帧更新被拖拽组件） |
| `selection` | 选中/悬停的组件 ID | 低 |
| `drag` | 拖拽状态（是否拖拽、起始坐标、当前坐标） | 高（拖拽时每帧更新） |
| `alignmentGuides` | 对齐辅助线 | 低 |

### 3.2 订阅策略

Canvas 和 CanvasComponent 采用细粒度 zustand selector 订阅，避免无关 state 变化触发重渲染：

- **Canvas** 订阅：`canvas`、`pages`、`currentPageId`、`alignmentGuides`，以及各 action 函数
- **Canvas 不订阅 `drag`**：拖拽坐标是高频变化的瞬态数据，在事件处理器中通过 `getState()` 读取
- **CanvasComponent** 自行订阅 `selection.selectedIds` 和 `selection.hoveredId`，只有选中/悬停状态实际变化的组件才重渲染

### 3.3 组件树引用稳定性

`updateComponentInTree` 递归更新组件树时，只在实际修改的路径上创建新对象，未修改的子树返回原引用。配合 `React.memo`，确保未变化的组件跳过重渲染。

## 4. 交互处理

### 4.1 拖拽移动

1. `mousedown` → `startDrag('move', ...)` 记录起始位置
2. `mousemove` → RAF 节流 → `moveComponentAndUpdateDrag()` 单次 `set()` 同时更新组件位置和 drag state
3. `mouseup` → `endDrag()` + `saveToHistory()`

### 4.2 缩放调整（Resize）

1. `mousedown` on resize handle → `startDrag('resize', ...)` 记录 handle 方向
2. `mousemove` → RAF 节流 → `resizeComponentAndUpdateDrag()` 单次 `set()` 更新尺寸和 drag state
3. `mouseup` → `endDrag()` + `saveToHistory()`

### 4.3 框选

1. `mousedown` on canvas background → 记录起始坐标
2. `mousemove` → 更新框选矩形（本地 state + ref）
3. `mouseup` → 计算框内组件 → `selectComponents(ids)`

### 4.4 平移与缩放

- 中键拖拽 / Space+左键拖拽 → 平移画布
- Ctrl+滚轮 → 缩放画布

### 4.5 事件回调稳定性

所有事件 handler 通过 `useCallback` 包裹，内部通过 ref 和 `getState()` 读取瞬态 state，依赖项最小化，保持回调引用稳定。

## 5. 渲染优化

| 技术 | 说明 |
|------|------|
| `React.memo` | CanvasComponent 和 CanvasImageContent 使用 memo，跳过未变化组件的重渲染 |
| 细粒度订阅 | zustand selector 模式，组件只订阅自己需要的 state slice |
| 引用稳定性 | 组件树更新保持未修改节点原引用；事件回调依赖项最小化 |
| 批量更新 | move/resize 操作合并为单次 `set()` 调用 |
| RAF 节流 | mousemove 通过 `requestAnimationFrame` 节流，每帧最多处理一次 |
| 高频 state 不订阅 | `drag` state 不通过 selector 订阅，仅在事件处理器中按需读取 |

## 6. 组件渲染

### 6.1 CanvasComponent

每个 LVGL 组件在画布上渲染为一个 `CanvasComponent`，负责：

- 根据组件类型渲染对应的预览内容（按钮、标签、滑块等）
- 应用样式属性（背景色、边框、圆角、阴影、渐变、透明度等）
- 显示选中状态（选中框 + resize handles）
- 递归渲染子组件
- 读取 `appStore.defaultFontSize` 作为文本组件的默认字号

### 6.2 容器组件特殊处理

- **Tabview**：根据 `activeTab` 和 `tabChildMap` 过滤显示当前 tab 的子组件
- **Tileview**：根据 `currentRow/Col` 和 `tileChildMap` 过滤显示当前 tile 的子组件
- **Win**：标题栏 + 内容区域布局

## 7. 关键文件

| 文件 | 职责 |
|------|------|
| `src/components/Canvas/Canvas.tsx` | 画布容器，事件处理，组件递归渲染 |
| `src/components/Canvas/CanvasComponent.tsx` | 单个组件的渲染和交互 |
| `src/components/Canvas/Canvas.css` | 画布样式 |
| `src/components/Canvas/CanvasComponent.css` | 组件样式 |
| `src/components/Canvas/AlignmentGuides.tsx` | 对齐辅助线 |
| `src/store/editorStore.ts` | 编辑器状态管理（组件树、选择、拖拽、历史） |
| `src/store/appStore.ts` | 应用级状态（默认字号等） |
