# LVGL UI Editor

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/status-Production%20Ready-green.svg" alt="Status">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
</p>

一个功能完整的 **LVGL UI 可视化编辑器**，支持拖拽设计、事件绑定、逻辑编排和 C 代码生成。适用于嵌入式 GUI 开发。

## ✨ 功能特性

### 🎨 可视化设计
- **16 种 LVGL 组件**：按钮、标签、图片、滑块、复选框、开关、进度条、弧形、文本框、下拉框、容器、标签页、窗口、图表、表格、日历
- **拖拽放置**：从组件面板拖拽到画布
- **组件嵌套**：支持容器内嵌套子组件
- **可视化调整**：拖拽移动、8 向调整大小
- **网格对齐**：可配置网格大小和吸附

### ✏️ 高级编辑
- **框选多选**：鼠标拖拽矩形选择
- **复制/粘贴/剪切**：完整剪贴板支持
- **对齐工具**：左/中/右对齐、顶/中/底对齐、水平/垂直分布
- **右键菜单**：快捷操作菜单
- **层级调整**：置顶/置底/上移/下移一层
- **层级面板**：树形显示组件结构，支持拖拽调整层级
- **撤销/重做**：50 步历史记录

### 📄 多页面管理
- 创建/删除/重命名页面
- 页面背景色设置
- 快速页面切换

### ⚡ 事件绑定
- **可视化事件编辑器**
- **支持所有 LVGL 事件**：点击、长按、值改变、聚焦等
- **内置动作**：
  - 页面导航
  - 设置属性
  - 显示/隐藏组件
  - 设置文本/数值
- **自定义 C 代码**：Monaco 编辑器支持

### 🔗 逻辑编排器
基于 React Flow 的节点式可视化编程：

| 节点类型 | 功能 |
|---------|------|
| 🟢 触发节点 | 事件触发、定时器触发 |
| 🟡 条件节点 | If/Else、Switch、比较、逻辑运算 |
| 🔵 动作节点 | 设置属性、导航、显示/隐藏、延时、调用函数 |
| 🟣 数据节点 | 变量读写、数学运算、字符串操作、获取属性 |
| ⚫ 自定义节点 | 嵌入 C 代码块 |

- **连线系统**：执行流（白色）+ 数据流（彩色）
- **变量管理**：全局变量面板
- **调试模式**：单步执行、节点高亮

### 💻 代码生成
- **生成文件**：
  - `ui.h` / `ui.c` - UI 初始化代码
  - `ui_events.h` / `ui_events.c` - 事件处理代码
  - `ui_logic.h` / `ui_logic.c` - 逻辑代码（预留）
- **Monaco 编辑器预览**：语法高亮
- **一键复制/下载**
- **批量导出**：下载所有文件

### 📱 实时预览
- Canvas 模拟渲染 LVGL 组件
- 缩放控制（50% - 200%）
- 悬停交互效果

### 📦 资源管理
- 图片上传和管理
- 字体管理
- 图标库

### 💾 项目管理
- JSON 格式保存/加载
- 自动保存（每 30 秒）
- 启动时恢复提示

## 🚀 快速开始

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd lvgl-editor

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173

### 构建生产版本

```bash
npm run build
npm run preview  # 预览构建结果
```

如果需要单独编译一个**不包含**“🔨 编译运行”在线 WASM 编译预览功能的版本，可以在构建时关闭开关：

```bash
VITE_ENABLE_COMPILE_PREVIEW=false npm run build:web
```

部署到 GitHub Pages 时，可以额外指定仓库子路径：

```bash
VITE_BASE_PATH=/lvgl-editor/ VITE_ENABLE_COMPILE_PREVIEW=false npm run build:web
```

仓库内已提供 `.github/workflows/deploy-pages.yml`，默认会在推送到 `main` 时构建并发布到 GitHub Pages，同时关闭在线编译预览功能。

## ⌨️ 快捷键

### 基本操作
| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Z` | 撤销 |
| `Ctrl + Shift + Z` / `Ctrl + Y` | 重做 |
| `Delete` / `Backspace` | 删除选中 |
| `Escape` | 取消选择 |

### 选择与剪贴板
| 快捷键 | 功能 |
|--------|------|
| `Ctrl + A` | 全选 |
| `Ctrl + 点击` | 多选切换 |
| `Ctrl + C` | 复制 |
| `Ctrl + X` | 剪切 |
| `Ctrl + V` | 粘贴 |
| `Ctrl + D` | 快速复制 |

### 画布操作
| 快捷键 | 功能 |
|--------|------|
| `Space + 拖拽` | 平移画布 |
| `鼠标中键拖拽` | 平移画布 |
| `Ctrl + 滚轮` | 缩放画布 |

### 项目操作
| 快捷键 | 功能 |
|--------|------|
| `Ctrl + N` | 新建项目 |
| `Ctrl + O` | 打开项目 |
| `Ctrl + S` | 保存项目 |
| `F1` / `?` | 显示帮助 |

## 🛠️ 技术栈

- **框架**: React 19 + TypeScript
- **构建**: Vite 7
- **状态管理**: Zustand 5
- **拖拽**: @dnd-kit/core
- **逻辑编排**: @xyflow/react 12
- **代码编辑**: Monaco Editor
- **打包**: JSZip

## 📁 项目结构

```
src/
├── components/           # UI 组件
│   ├── AlignToolbar/     # 对齐工具栏
│   ├── Canvas/           # 画布（拖拽、选择、调整大小）
│   ├── CodePreview/      # 代码预览面板
│   ├── ComponentPanel/   # 组件面板
│   ├── ContextMenu/      # 右键菜单
│   ├── EventPanel/       # 事件绑定面板
│   ├── HelpPanel/        # 快捷键帮助
│   ├── LogicEditor/      # 逻辑编排器
│   ├── PageManager/      # 页面管理
│   ├── Preview/          # 实时预览
│   ├── PropertyEditor/   # 属性编辑器
│   ├── StatusBar/        # 状态栏
│   └── Toast/            # 通知提示
├── codegen/              # 代码生成引擎
│   ├── generator.ts      # 主生成器
│   ├── templates/        # 代码模板
│   ├── formatters/       # 格式化工具
│   └── utils/            # 工具函数
├── hooks/                # React Hooks
│   └── useKeyboardShortcuts.ts
├── resources/            # 资源管理
├── store/                # 状态管理
│   └── editorStore.ts    # Zustand Store
├── types/                # TypeScript 类型
└── utils/                # 工具函数
    └── componentDefinitions.ts  # 组件定义
```

## 📊 支持的 LVGL 组件

| 类别 | 组件 |
|------|------|
| **基础** | Button, Label, Image, Line |
| **输入** | Textarea, Dropdown, Checkbox, Switch, Slider |
| **容器** | Container (obj), Tab View, Tile View, Window |
| **显示** | Progress Bar, Arc, Spinner, Chart, Table, Calendar |

## 🔧 已知限制

1. **字体转换**：需要外部 lv_font_conv 工具生成实际位图数据，编辑器内生成模板和命令
2. **LVGL v9**：代码生成目前针对 LVGL v8 API
3. **测试**：尚无单元测试或集成测试

## 📝 更新日志

查看 [CHANGELOG.md](./CHANGELOG.md) 了解完整更新历史。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License - 详见 [LICENSE](./LICENSE) 文件。

---

<p align="center">
  Made with ❤️ for embedded GUI development
</p>
