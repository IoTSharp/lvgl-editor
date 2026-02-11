# LVGL Editor 属性编辑增强任务

## 项目路径
`/home/xcssa/.openclaw/workspace/projects/lvgl-editor`

## 重要约束
- UI 全部使用中文
- 先读 CLAUDE.md 了解项目架构
- 修改前先 `npm run build` 确认当前能编译通过
- 每个批次完成后 `npm run build` 验证无编译错误
- 不要新增依赖包，用现有技术栈（React 19 + TypeScript + Zustand + CSS）
- 所有新增 CSS 写在对应组件的 CSS 文件中（PropertyEditor.css）
- 保持现有代码风格和模式

## 架构要点
- 类型定义: `src/types/index.ts`
- 组件定义: `src/utils/componentDefinitions.ts`
- 属性编辑器: `src/components/PropertyEditor/PropertyEditor.tsx`
- 编辑器 Store: `src/store/editorStore.ts`
- 画布渲染: `src/components/Canvas/CanvasComponent.tsx`
- 代码生成: `src/codegen/templates/ui.c.ts`

## 批次 1: 通用属性 — 对齐、Flags、Disabled 状态

### 1.1 类型扩展 (`src/types/index.ts`)
在 `LvglComponent` 接口中新增字段：
```typescript
// 在 LvglComponent 接口中添加
align?: 'default' | 'center' | 'top_left' | 'top_mid' | 'top_right' | 'bottom_left' | 'bottom_mid' | 'bottom_right' | 'left_mid' | 'right_mid';
alignOffsetX?: number;
alignOffsetY?: number;
flags?: {
  clickable?: boolean;
  checkable?: boolean;
  scrollable?: boolean;
  scrollElastic?: boolean;
  scrollMomentum?: boolean;
  scrollOnFocus?: boolean;
  snappable?: boolean;
  pressLock?: boolean;
  eventBubble?: boolean;
  gesturesBubble?: boolean;
  hidden?: boolean;
  disabled?: boolean;  // 对应 LV_STATE_DISABLED
};
```

### 1.2 属性编辑器 — 通用属性区块
在 PropertyEditor.tsx 的"尺寸"区块之后、"样式"区块之前，添加两个新区块：

**对齐区块：**
- 9 宫格按钮选择对齐方式（不是下拉框！用 3x3 grid 的按钮组）
- 对齐偏移 X/Y 数值输入

**Flags 区块：**
- 用 checkbox 开关列表显示各 flag
- 分组显示：交互（clickable, checkable, disabled）、滚动（scrollable 等）、行为（hidden, snappable 等）

### 1.3 组件定义更新
在 `componentDefinitions.ts` 中，给所有组件的 defaultProps 不需要改（flags 默认 undefined 即可，编辑器按 LVGL 默认值显示）。

---

## 批次 2: StyleProps 扩展 — Shadow、Transform、滚动条、字体

### 2.1 类型扩展 (`src/types/index.ts`)
扩展 `StyleProps` 接口：
```typescript
export interface StyleProps {
  // 现有
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  textColor?: string;
  opacity?: number;
  padding?: number;
  // 新增
  shadowColor?: string;
  shadowWidth?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowSpread?: number;
  shadowOpacity?: number;
  transformAngle?: number;    // 旋转角度 (0.1度单位)
  transformZoomX?: number;    // X缩放 (256 = 100%)
  transformZoomY?: number;    // Y缩放 (256 = 100%)
  transformPivotX?: number;   // 旋转中心X
  transformPivotY?: number;   // 旋转中心Y
  scrollbarMode?: 'off' | 'on' | 'active' | 'auto';
  scrollbarWidth?: number;
  scrollbarColor?: string;
  textFont?: string;          // 字体名称，关联资源
  textFontSize?: number;      // 字体大小
  textLetterSpace?: number;   // 字间距
  textLineSpace?: number;     // 行间距
}
```

### 2.2 属性编辑器 — 样式区块增强
在现有样式区块中，按折叠分组添加：

**阴影（可折叠）：**
- 阴影颜色（颜色选择器）
- 阴影宽度、偏移X、偏移Y、扩展（数值输入）
- 阴影透明度（滑块）

**变换（可折叠）：**
- 旋转角度（滑块 + 数值，0-3600，显示为度）
- X/Y 缩放（滑块 + 数值，百分比显示）
- 旋转中心 X/Y

**滚动条（可折叠）：**
- 模式（下拉选择）
- 宽度、颜色

**文本（可折叠）：**
- 字体选择（下拉，从 resourceStore 读取已上传字体 + 内置字体列表）
- 字体大小、字间距、行间距

### 2.3 折叠组件
实现一个简单的 `CollapsibleSection` 组件用于属性编辑器中的分组折叠，替代现有的纯 `section-header` div。

---

## 批次 3: Flex 布局完善 + Grid 布局

### 3.1 容器 Flex 属性扩展
obj 容器选 Flex 后，当前只有 direction 和 gap。需要添加：
- `flexWrap`: 'nowrap' | 'wrap' | 'wrap-reverse'
- `justifyContent`: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
- `alignItems`: 'flex-start' | 'flex-end' | 'center' | 'stretch'
- `alignContent`: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around'

### 3.2 容器 Grid 属性
obj 容器选 Grid 后，需要：
- `gridColumns`: string (如 "1fr 2fr 1fr"，用文本输入 + 可视化编辑器)
- `gridRows`: string (同上)
- `gridColumnGap`: number
- `gridRowGap`: number

Grid 模板编辑器 UI：
- 显示当前列/行定义的可视化条形图
- 每个轨道可以设置值（fr/px/%）
- 添加/删除轨道按钮

### 3.3 Flex/Grid 子项属性
当组件的父容器是 flex/grid 布局时，在该组件的属性编辑器中显示额外区块：

**Flex 子项：**
- `flexGrow`: number (0-10)
- `flexShrink`: number (0-10)  
- `alignSelf`: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch'

**Grid 子项：**
- `gridColumn`: number (起始列)
- `gridColumnSpan`: number (跨列数)
- `gridRow`: number (起始行)
- `gridRowSpan`: number (跨行数)
- `gridCellAlignX`: 'start' | 'center' | 'end' | 'stretch'
- `gridCellAlignY`: 'start' | 'center' | 'end' | 'stretch'

这些属性存在组件自身的 props 中。需要在 PropertyEditor 中检测父组件的 layout 类型来决定是否显示。

---

## 批次 4: Table 单元格编辑

### 4.1 Table props 扩展
```typescript
// table 组件的 props
{
  rows: number;
  cols: number;
  cellData: string[][];        // 二维数组，cellData[row][col]
  columnWidths: number[];      // 每列宽度
  headerRow: boolean;          // 第一行是否为表头
  cellAligns: ('left' | 'center' | 'right')[][]; // 每个单元格对齐
}
```

### 4.2 Table 编辑器 UI
不要用简单的文本框！需要一个内联的表格编辑器：
- 直接在属性面板中渲染一个可编辑的 HTML table
- 点击单元格可以编辑文本
- 列宽可以拖拽调整（或数值输入）
- 表头行开关
- 右键或按钮添加/删除行列
- 每个单元格可设置对齐方式

### 4.3 componentDefinitions 更新
更新 table 的 defaultProps：
```typescript
defaultProps: { 
  rows: 3, 
  cols: 3, 
  cellData: [['', '', ''], ['', '', ''], ['', '', '']], 
  columnWidths: [60, 60, 60],
  headerRow: true,
  cellAligns: [['left','left','left'],['left','left','left'],['left','left','left']]
}
```

---

## 批次 5: Chart 多系列 + Calendar 高亮日期

### 5.1 Chart props 扩展
```typescript
{
  type: 'line' | 'bar' | 'scatter';
  series: Array<{
    name: string;
    data: number[];
    color: string;
    lineWidth?: number;
    pointSize?: number;
  }>;
  yAxisMin?: number;
  yAxisMax?: number;
  xLabels?: string[];
  yLabels?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  lineColor?: string;  // 保留向后兼容
}
```

### 5.2 Chart 编辑器 UI
- 系列列表（可添加/删除/重命名）
- 每个系列：名称、颜色选择器、数据点输入
- Y 轴范围（min/max）
- X 轴标签（逗号分隔）
- 图例开关
- 向后兼容：如果 props 中有旧的 `data` 字段，自动迁移为 `series[0].data`

### 5.3 Calendar props 扩展
```typescript
{
  year: number;
  month: number;
  showDayNames?: boolean;
  showToday?: boolean;           // 今日标记
  highlightedDates?: string[];   // 格式 "YYYY-MM-DD"
  dateRangeMode?: boolean;       // 日期范围选择模式
  rangeStart?: string;
  rangeEnd?: string;
}
```

### 5.4 Calendar 编辑器 UI
- 年月选择（已有）
- 今日标记开关
- 高亮日期列表：用 tag 输入方式（输入日期后回车添加，点 x 删除）
- 日期范围模式开关 + 起止日期选择

---

## 批次 6: TabView / TileView / Window 容器子组件管理

### 6.1 TabView 容器模型
这是最复杂的部分。TabView 的每个 tab 需要作为独立容器区域。

**方案：** TabView 的 children 按 tab 分组。在 props 中维护映射：
```typescript
{
  tabs: string[];           // tab 名称列表
  activeTab: number;        // 当前显示的 tab
  tabPosition: 'top' | 'bottom' | 'left' | 'right';
  tabChildMap: Record<string, string[]>;  // tabIndex -> childId[]
}
```

当子组件拖入 TabView 时，自动分配到当前活动的 tab。

**属性编辑器 UI：**
- Tab 列表（可添加/删除/重命名/拖拽排序）
- 每个 tab 显示其包含的子组件数量
- 点击 tab 切换活动 tab（同时画布只显示该 tab 的子组件）

**HierarchyPanel 适配：**
- TabView 下的子组件按 tab 分组显示

### 6.2 TileView 容器模型
类似 TabView，每个 tile 是独立容器：
```typescript
{
  rows: number;
  cols: number;
  currentRow: number;
  currentCol: number;
  tileChildMap: Record<string, string[]>;  // "row-col" -> childId[]
}
```

**属性编辑器 UI：**
- 行列数设置
- 网格可视化（小方格），点击选择当前编辑的 tile
- 每个 tile 显示子组件数量

### 6.3 Window 容器模型
Window 区分标题栏和内容区：
```typescript
{
  title: string;
  headerHeight: number;        // 标题栏高度，默认 40
  showCloseBtn: boolean;       // 关闭按钮
  headerButtons: Array<{       // 标题栏自定义按钮
    icon: string;              // 图标名称
    id: string;
  }>;
  // children 默认都在内容区
}
```

**属性编辑器 UI：**
- 标题文本
- 标题栏高度
- 关闭按钮开关
- 标题栏按钮列表（可添加/删除）

---

## UI 设计规范

### 通用原则
- 属性编辑器宽度有限（约 260px），UI 要紧凑
- 使用折叠分组管理复杂属性
- 颜色选择器统一用 color input + text input 的组合（已有模式）
- 数值输入用 type="number"，带合理的 min/max/step
- 开关用 checkbox
- 枚举选择用 select 下拉框
- 列表编辑（如 chart series、table cells）用专门的内联编辑器，不要只用文本框

### 需要的专用 UI 组件
1. **9 宫格对齐选择器** — 3x3 按钮网格
2. **折叠区块** — 带展开/收起箭头的 section
3. **Tag 输入** — 用于日期列表等（输入 + 回车添加，x 删除）
4. **内联表格编辑器** — 用于 Table 单元格编辑
5. **系列列表编辑器** — 用于 Chart 多系列
6. **Grid 模板编辑器** — 用于 Grid 列/行定义
7. **Tab 管理器** — 用于 TabView 的 tab 列表管理

---

## 执行顺序
按批次 1 → 2 → 3 → 4 → 5 → 6 顺序执行。每个批次完成后 build 验证。
