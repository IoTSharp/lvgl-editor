# LVGL Editor 第三轮增强

## 项目路径
`/home/xcssa/.openclaw/workspace/projects/lvgl-editor`

## 批次 D: 画布渲染 Bug 修复 + 属性编辑器 UI 优化

### D.1 画布渲染 Bug
问题：按钮等组件拖出来是透明的/看不见。

排查方向：
1. CanvasComponent.tsx 中 `componentStyle` 的 `backgroundColor` 可能被 `background`（渐变）字段覆盖为 undefined
2. 某些组件的 defaultStyles.bgColor 可能是 'transparent' 或空值
3. CSS 可能有覆盖

修复：确保所有组件在画布上都有正确的视觉表现。逐个检查每种组件类型的渲染效果。

### D.2 属性编辑器 — 按组件类型过滤通用属性
当前问题：所有通用属性（对齐、Flags、阴影、变换、渐变、outline 等）对所有组件都显示，但有些属性对某些组件没有意义。

需要一个属性可见性映射：
```typescript
const PROPERTY_VISIBILITY: Record<string, {
  showAlign?: boolean;
  showFlags?: boolean;
  showShadow?: boolean;
  showTransform?: boolean;
  showGradient?: boolean;
  showOutline?: boolean;
  showScrollbar?: boolean;
  showTextStyle?: boolean;
  showBlendMode?: boolean;
}> = {
  btn: { showAlign: true, showFlags: true, showShadow: true, showTransform: true, showGradient: true, showOutline: true, showTextStyle: true, showBlendMode: true },
  label: { showAlign: true, showFlags: true, showTransform: true, showTextStyle: true },
  img: { showAlign: true, showFlags: true, showTransform: true, showBlendMode: true },
  line: { showAlign: true, showFlags: true, showTransform: true },
  // ... 等等，根据组件类型合理配置
};
```

在 PropertyEditor 的通用区块渲染中，根据当前组件类型决定是否显示某个区块。

### D.3 Dropdown 选项编辑器改进
当前用 textarea 每行一个选项，改为列表编辑器：
- 每个选项一行，带序号
- 每行有：文本输入 + 上移/下移按钮 + 删除按钮
- 底部有"添加选项"按钮
- 拖拽排序（简单实现用上下按钮即可）

### D.4 其他组件属性编辑 UI 优化
检查所有组件，确保属性编辑 UI 合理：
- checkbox 的"选中"状态用 toggle switch 而不是 checkbox（更直观）
- switch 的"开启"同上
- textarea 的"最大长度"为 0 时显示"无限制"
- bar/slider 的 min/max 改变时自动 clamp value

---

## 批次 E: LVGL WASM 编译预览系统

这是最大的工程。目标：在浏览器中使用真实的 LVGL 库编译和运行用户设计的 UI。

### 技术方案

LVGL 官方支持通过 Emscripten 编译为 WASM 在浏览器中运行。方案：

1. **预编译 LVGL 为 WASM 库**（离线完成，不在浏览器中编译 C）
   - 使用 Emscripten 将 LVGL 核心 + SDL2 display driver 编译为 .wasm + .js
   - 暴露一个 `init_ui(const char* code)` 入口函数
   - 用户的 UI 代码通过 eval 或预定义的组件创建函数调用

2. **更好的方案：LVGL MicroPython 或 LVGL JS binding**
   - 但这偏离了 C 代码生成的目标

3. **最实际的方案：预编译 LVGL WASM runtime + 动态加载用户 C 代码**
   - 预编译一个 LVGL WASM 模块，包含所有 LVGL API
   - 用户生成的 C 代码通过一个"解释器"或"命令序列"方式执行
   - 将 C 代码转换为一系列 LVGL API 调用的 JSON 命令，WASM 端解析执行

4. **最简单可行方案（推荐）：**
   - 克隆 LVGL 源码
   - 使用 Emscripten 预编译 LVGL + SDL2 backend 为 WASM
   - 编辑器生成的 C 代码转换为一个"UI 描述 JSON"
   - WASM 端有一个通用的 `create_ui_from_json()` 函数，解析 JSON 并调用 LVGL API
   - 这样不需要在浏览器中编译 C 代码

### 实现步骤

#### E.1 LVGL WASM Runtime 构建
- 克隆 lvgl/lvgl 到 `tools/lvgl/`
- 编写 Emscripten 构建脚本
- 编写 C 端的 JSON UI 解析器（`ui_from_json.c`）
- 构建输出 `lvgl_runtime.wasm` + `lvgl_runtime.js`
- 将构建产物放到 `public/wasm/` 目录

#### E.2 JSON UI 描述格式
定义一个 JSON 格式来描述 LVGL UI：
```json
{
  "screen": {
    "width": 480,
    "height": 320,
    "bgColor": "#ffffff"
  },
  "components": [
    {
      "type": "btn",
      "id": "btn1",
      "parent": "screen",
      "x": 10, "y": 10,
      "width": 100, "height": 40,
      "props": { "text": "Hello" },
      "styles": {
        "default": { "bgColor": "#2196F3", ... },
        "pressed": { ... }
      }
    }
  ]
}
```

#### E.3 编辑器集成
- 新建 `src/components/WasmPreview/` 组件
- 加载 WASM 模块
- 将编辑器状态转换为 JSON UI 描述
- 传给 WASM 运行时渲染
- 在 iframe 或 canvas 中显示结果
- 添加到 App.tsx 的 tab 中（或替换现有的 Preview tab）

#### E.4 C 代码编译测试（可选增强）
如果还需要真正编译 C 代码：
- 使用 emscripten 的 wasm 版本（太大，不推荐）
- 或者使用服务端编译（需要后端）
- 或者使用 TCC (Tiny C Compiler) 的 WASM 版本
- 推荐：先实现 JSON 方案，C 编译作为后续增强

---

## 约束
- UI 全部中文
- 不新增不必要的 npm 依赖（WASM 相关的构建工具除外）
- 保持现有代码风格
- WASM 构建使用 Emscripten（需要安装 emsdk）
