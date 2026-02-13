# 画布性能优化设计文档

## 1. 问题背景

设计画布上拖拽组件时出现明显卡顿，原因是每次 mousemove 事件触发多次 zustand state 更新，导致整个组件树频繁重渲染。

## 2. 性能瓶颈分析

### 2.1 原始问题

每次 mousemove 触发 3 次 zustand `set()` 调用：
1. `updateDrag()` — 更新 drag.currentX/Y
2. `moveComponent()` — 深拷贝整个 pages 数组 + 递归遍历组件树
3. `startDrag()` — 更新 drag.startX/Y

每次 `set()` 都触发所有订阅组件重渲染。

### 2.2 Store 订阅粒度过粗

Canvas 组件通过解构 `useEditorStore()` 订阅了整个 store：

```typescript
const { canvas, selection, drag, pages, ... } = useEditorStore();
```

store 中任何字段变化（包括高频的 drag state）都会导致 Canvas 重渲染，进而递归重渲染所有 CanvasComponent。

### 2.3 React.memo 失效

- `isSelected` 和 `isHovered` 作为 props 由 Canvas 内联计算传入，每次 Canvas 重渲染都会重新计算
- 即使值没变，React.memo 的浅比较无法判断（因为 Canvas 本身在重渲染）

### 2.4 组件树引用不稳定

`updateComponentInTree` 递归更新时，即使子树未被修改，也会创建新的对象引用，导致 React.memo 比较失败。

## 3. 优化方案

### 3.1 合并 State 更新

**editorStore.ts**

新增合并方法，将 move/resize + drag 更新合并为单次 `set()` 调用：

- `moveComponentAndUpdateDrag(id, x, y, dragStartX, dragStartY)` — 一次 set 同时更新组件位置和 drag state
- `resizeComponentAndUpdateDrag(id, w, h, x, y, dragStartX, dragStartY)` — 同理

移除拖拽路径中多余的 `updateDrag()` 调用。

### 3.2 组件树引用稳定性

**editorStore.ts — `updateComponentInTree`**

优化为只在实际修改的路径上创建新对象，未修改的子树返回原引用：

```typescript
function updateComponentInTree(components, id, updates) {
  let changed = false;
  const result = components.map(comp => {
    if (comp.id === id) {
      changed = true;
      return { ...comp, ...updates };
    }
    if (comp.children.length > 0) {
      const newChildren = updateComponentInTree(comp.children, id, updates);
      if (newChildren !== comp.children) {
        changed = true;
        return { ...comp, children: newChildren };
      }
    }
    return comp; // 原引用不变
  });
  return changed ? result : components;
}
```

### 3.3 细粒度 Store 订阅

**Canvas.tsx**

用 zustand selector 模式替代整体解构，按需订阅：

```typescript
const canvasState = useEditorStore(s => s.canvas);
const selectedIds = useEditorStore(s => s.selection.selectedIds);
const pages = useEditorStore(s => s.pages);
// ...

// 关键：不订阅 drag state！
// drag 在事件处理器中通过 getState() 读取
```

`drag` 是变化最频繁的 state（每帧都变），不订阅它意味着拖拽时 Canvas 不会重渲染。

### 3.4 组件自订阅 Selection

**CanvasComponent.tsx**

`isSelected` 和 `isHovered` 不再由 Canvas 作为 props 传入，改为组件自己从 store 订阅：

```typescript
const isSelected = useEditorStore(
  useCallback(s => s.selection.selectedIds.includes(component.id), [component.id])
);
const isHovered = useEditorStore(
  useCallback(s => s.selection.hoveredId === component.id, [component.id])
);
```

效果：selection 变化时，只有实际受影响的组件重渲染，而不是所有组件。

### 3.5 稳定事件回调

**Canvas.tsx**

所有 `useCallback` handler 通过 ref 或 `getState()` 读取瞬态 state，最小化依赖项数组：

```typescript
// 用 ref 存储频繁变化的本地 state
const isPanningRef = useRef(false);
const panStartRef = useRef({ x: 0, y: 0 });
const boxSelectionRef = useRef<BoxSelection>(...);

const handleMouseMove = useCallback((e: React.MouseEvent) => {
  // 通过 ref 和 getState() 读取，不依赖闭包
  const drag = useEditorStore.getState().drag;
  const zoom = useEditorStore.getState().canvas.zoom;
  // ...
}, []); // 依赖项为空或极少，回调引用稳定
```

### 3.6 requestAnimationFrame 节流

**Canvas.tsx**

mousemove handler 中使用 RAF 节流，确保每帧最多一次 state 更新：

```typescript
if (rafRef.current) cancelAnimationFrame(rafRef.current);
rafRef.current = requestAnimationFrame(() => {
  // 实际的 move/resize 逻辑
});
```

### 3.7 React.memo

**CanvasComponent.tsx**

用 `React.memo` 包裹组件，配合上述引用稳定性优化，确保未变化的组件跳过重渲染：

```typescript
export default React.memo(CanvasComponent);
```

## 4. 优化效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 每次 mousemove 的 set() 调用 | 3 次 | 1 次 |
| Canvas 重渲染频率（拖拽时） | 每次 set | 不重渲染 |
| CanvasComponent 重渲染范围 | 所有组件 | 仅被拖拽的组件 |
| mousemove 处理频率 | 每个事件 | 每帧（RAF 节流） |
| 事件回调引用 | 频繁变化 | 稳定 |

## 5. 关键文件

| 文件 | 改动 |
|------|------|
| `src/store/editorStore.ts` | 合并更新方法、组件树引用稳定性 |
| `src/components/Canvas/Canvas.tsx` | 细粒度订阅、稳定回调、RAF 节流 |
| `src/components/Canvas/CanvasComponent.tsx` | 自订阅 selection、React.memo |

## 6. 设计原则

1. **最小订阅原则**：组件只订阅自己需要的 state slice，避免无关更新触发重渲染
2. **高频 state 不订阅**：拖拽坐标等每帧变化的 state 通过 `getState()` 在事件处理器中读取
3. **引用稳定性**：事件回调通过 ref/getState 读取 state，保持引用稳定；组件树更新时保持未修改节点的引用
4. **批量更新**：将同一操作的多次 state 更新合并为单次 `set()` 调用
5. **帧节流**：高频事件（mousemove）通过 RAF 节流，每帧最多处理一次
