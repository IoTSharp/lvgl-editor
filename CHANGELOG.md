# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-11

### Added
- **层级面板接入设计视图** — HierarchyPanel 挂载到左侧面板，与组件面板上下分栏，支持树形结构浏览、拖拽排序、重命名、锁定/可见性切换
- **样式状态编辑** — PropertyEditor 新增默认/按下/聚焦/禁用四种状态切换，支持独立样式覆盖和清除，蓝色圆点标记已覆盖状态
- **预览面板组件渲染补全** — 新增 line、spinner、chart（折线/柱状）、table、calendar、tabview、tileview、window、obj(container) 共 9 种组件的专用 Canvas 渲染
- **画布 visible/locked 视觉反馈** — 隐藏组件半透明+虚线边框，锁定组件禁止拖拽/调整大小且隐藏手柄
- **动画编辑器** — Animation 类型定义、AnimationPanel 面板 UI（添加/编辑/删除动画）、AnimationEditDialog 编辑对话框、代码生成 lv_anim_t 初始化 + easing 映射
- **主题系统** — Theme 类型、themeStore（light/dark 预设）、ThemeSelector 工具栏组件、代码生成 lv_theme_default_init()
- **图片资源联动** — PropertyEditor 图片选择器带缩略图、画布显示实际图片、代码生成引用 C 数组名、ZIP 导出包含图片 C 数组文件
- **字体转换完善** — TTF/OTF name table 真实解析、浏览器内字体预览、BPP 选择器、lv_font_conv 命令生成、头文件/源文件模板生成、代码生成集成自定义字体 LV_FONT_DECLARE
- **预览面板动画播放** — requestAnimationFrame 动画模拟（fade/slide/zoom + easing）、播放/暂停/重置控制
- **预览面板多页面切换** — 底部页面标签栏、点击切换预览页面、组件 navigate 事件点击导航

### Fixed
- **逻辑代码生成重写** — if/else 和 switch 递归生成完整分支体；init 函数注册事件回调和定时器；set_value 按组件类型选择正确 API；定时器生成实际 lv_timer_create 回调
- **代码生成补全 focused/disabled 状态** — ui.c 现在输出 LV_STATE_FOCUSED 和 LV_STATE_DISABLED 样式代码
- **CodePreview/CodePanel 传入 logicGraphs** — 代码预览和导出现在正确包含逻辑图生成的代码

## [1.0.0] - 2026-02-07 🎉 Production Ready

### 🎨 Phase 1 - 基础框架
- **项目搭建**: Vite + React 19 + TypeScript
- **基础布局**: 组件面板、画布、属性编辑器三栏布局
- **组件面板**: 16 种 LVGL 组件，分类显示，搜索过滤
- **拖拽系统**: 基于 @dnd-kit 实现拖拽放置
- **画布系统**: 缩放（0.1x-3x）、平移、网格显示
- **选择系统**: 单选、Ctrl 多选、8 向调整大小手柄
- **属性编辑器**: 基础属性、样式属性、组件特有属性
- **状态管理**: Zustand 集中管理
- **撤销/重做**: 50 步历史记录

### ✏️ Phase 2 - 高级编辑功能
- **组件嵌套**: 支持容器内嵌套子组件
- **框选功能**: 鼠标拖拽矩形选择多个组件
- **复制/粘贴**: Ctrl+C / Ctrl+V 完整支持
- **剪切**: Ctrl+X 支持
- **全选**: Ctrl+A 选择当前页面所有组件
- **快速复制**: Ctrl+D 复制并粘贴
- **右键菜单**: 复制、粘贴、删除、层级调整
- **对齐工具栏**: 
  - 左对齐、水平居中、右对齐
  - 顶对齐、垂直居中、底对齐
  - 水平分布、垂直分布

### ⚡ Phase 3 - 事件绑定与多页面
- **事件绑定系统**:
  - 可视化事件编辑界面
  - 支持所有 LVGL 事件类型（clicked, pressed, value_changed 等）
  - 内置动作：导航页面、设置属性、显示/隐藏、设置文本/数值
  - 自定义 C 代码处理（Monaco 编辑器）
- **多页面支持**:
  - 创建/删除/重命名页面
  - 页面背景色设置
  - 快速切换页面

### 🔗 Phase 4 - 逻辑编排器
- **React Flow 集成**: 节点式可视化编程界面
- **节点类型**:
  - 🟢 触发节点：事件触发、定时器触发
  - 🟡 条件节点：If/Else、Switch、比较、逻辑运算
  - 🔵 动作节点：设置属性、导航、显示/隐藏、设置文本、设置数值、调用函数、延时
  - 🟣 数据节点：变量读写、数学运算、字符串操作、获取属性
  - ⚫ 自定义节点：C 代码块
- **连线系统**: 执行流（白色粗线）+ 数据流（彩色细线）
- **节点编辑**: 双击编辑参数，组件/属性选择器
- **变量管理**: 全局变量面板，支持 int/float/string/bool
- **调试模式**: 模拟执行、单步调试、节点高亮
- **逻辑图管理**: 创建/删除/切换逻辑图

### 💻 Phase 5 - 代码生成引擎
- **代码生成架构**: 模块化生成器、模板系统、格式化工具
- **生成文件**:
  - `ui.h` - 头文件（组件声明、函数声明）
  - `ui.c` - UI 初始化（组件创建、样式设置、事件绑定）
  - `ui_events.h` - 事件处理函数声明
  - `ui_events.c` - 事件处理函数实现
  - `ui_logic.h` - 逻辑函数声明（预留）
  - `ui_logic.c` - 逻辑函数实现（预留）
- **代码预览面板**: Monaco Editor 集成，文件切换，实时更新
- **代码导出**: 复制单文件、下载单文件、批量下载

### 📱 Phase 6 - 实时预览
- **Canvas 模拟渲染**: HTML5 Canvas 模拟 LVGL 组件外观
- **支持组件**: 按钮、标签、滑块、复选框、开关、进度条、弧形、文本框、下拉框、图片、面板
- **缩放控制**: 50% - 200%
- **悬停交互**: 组件悬停高亮效果

### 📦 Phase 7 - 资源管理
- **图片管理**: 上传、预览、删除图片资源
- **字体管理**: 字体资源管理
- **图标库**: 内置图标选择
- **项目管理**:
  - JSON 格式保存/加载
  - 自动保存（每 30 秒）
  - 启动时恢复提示

### 🎯 Phase 8 - 最终打磨
- **UI/UX 优化**:
  - 主标签页导航（设计/逻辑/代码/预览）
  - 快捷键帮助面板（F1/?）
  - Toast 通知系统
  - 统一视觉风格
- **文档完善**: README、CHANGELOG 更新
- **构建验证**: TypeScript 编译无错误，生产构建成功

### Fixed
- 修复组件拖拽时的位置计算问题
- 修复撤销/重做在多页面场景下的问题
- 修复框选在缩放画布时的坐标计算

---

## [0.1.0] - 2026-02-07 (Initial Development)

### Added
- 项目初始化
- 基础框架搭建

---

## 统计

- **总文件数**: 67 个源文件（29 TSX + 38 TS）
- **组件数**: 17 个 UI 组件模块
- **LVGL 组件**: 16 种
- **代码行数**: ~8000+ 行

## 已知限制

1. 逻辑编排器到 C 代码的完整转换尚未实现
2. 图片资源在预览面板显示为占位符
3. 部分高级 LVGL 样式属性尚未支持
4. 动画编辑器尚未实现

## 未来计划

- [ ] 逻辑图完整代码生成
- [ ] 主题系统
- [ ] 动画编辑器
- [ ] 更多 LVGL 组件支持
- [ ] 协作功能
