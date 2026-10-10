# LvglEditor

[English](README.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md)

<!-- docs-sync: family=readme revision=2026-10-11.4 -->
<!-- output-status: c-lvgl=partial;lispbm-vesc=partial;basic-iotembedded=partial;device=unverified -->

可视化 LVGL 界面编辑器，共用工程模型，维护 **C/LVGL**、**LispBM/VESC**、**BASIC/IoTEmbedded** 三种输出。编辑器负责设计、生成、资源转换、目标校验和导出打包；HmiCraft 等宿主选择目标/设备/API profile 并消费产物。

PR [#3](https://github.com/IoTSharp/lvgl-editor/pull/3) 提供 LispBM/VESC 路线。整合保留 C 工作流及测试并增加 BASIC；工作正在推进，源码整合、生成、编译、脚本执行和真实设备分别验收。见[英文路线图](ROADMAP.md)、[中文路线图](ROADMAP.zh-CN.md)和[项目约束](AGENTS.md)。

## 输出目标

| 目标 ID | 产物 | 验收边界 |
|---|---|---|
| `c-lvgl` | C 头/源文件、事件/逻辑和目标资源 | 保留生成器，统一源码合同已本地验证；目标编译仍未验 |
| `lispbm-vesc` | 面向版本化 VESC/LVGL 桥接的 Lisp 布局/事件及资源 | 整合 PR #3；并非任意 VESC 固件都具有所需 API |
| `basic-iotembedded` | 生成 BASIC 布局、独立用户事件模块、资源和包清单 | 首批基础布局/事件生成及包合同；HmiCraft runtime 消费与单板验收另行推进 |

在**新建项目**选择目标，宿主允许时可在**项目设置**修改。独立编辑器默认 C；HmiCraft 自有设备入口默认 BASIC。保存工程必须保留目标/profile 和各语言用户模块；手写 C/Lisp/BASIC 不自动互译。切换、重生成、改名、保存/重开和恢复不得覆盖用户逻辑。不支持的功能或不兼容 profile 给定位诊断并阻止导出，空实现不算成功。实施状态由 GEN-01/02/07/09/10 跟踪。

React/TypeScript 工作台提供控件面板、画布、层级/属性、页面、事件、React Flow 图、Monaco、资源和工程持久化。Canvas 是视觉预览，C/WASM 和脚本执行需要匹配适配器。HmiCraft 负责 profile、HMI runtime、加载/部署和设备验收；IoTEmbedded 负责通用 MCU/RTOS/BSP、驱动和 BASIC。生成器须独立于 HmiCraft 源码/服务，不连接设备、烧录或写 PLC。

## 开发和验证

使用锁文件与兼容的 Node.js/npm：先 `npm ci`，再 `npm run dev`，Vite 输出本地地址。验证执行 `npm run build`、`npm test`、`node scripts/check-docs-sync.mjs`。`build` 先检查 TypeScript 再调用 Vite；`build:web` 只打包，不能替代。静态部署设置 `VITE_ENABLE_COMPILE_PREVIEW=false` 和对应 `VITE_BASE_PATH`，不直接公开开发编译服务。依赖工具链的 C 测试须配置 LVGL/编译器路径，跳过须明确记录。

历史 **2026-10-10** 基线为打包成功、TypeScript 检查失败、Vitest **386 通过/4 失败**，特定环境 C 编译测试未运行。保留失败及后续修复回执，记录在[CHANGELOG](CHANGELOG.md)和路线图；构建徽章不代表生产或硬件通过。

LVGL、runtime API、资源格式、board/profile、编辑 schema 和包格式分别管理版本；字体转换和打包匹配目标，Web 构建不证明 ABI 兼容。UI 要求默认英文并支持中文/俄语切换；GEN-12 独立跟踪实现与完整 UI 验证，不用文档翻译替代。

## 文档与分发

英文为门面，三份 README 共享 revision/状态，英中路线共享全部任务 ID/状态。每次修改在同一变更同步所有语言并运行检查。源码公开、取得许可、发布和设备通过分别记录。

原 README 声明 MIT，但固定基线缺少全仓 LICENSE。源码/资源/WASM 权属与第三方 notice 需核查，本变更不新增许可。保留归属，客户凭据、私有工业逻辑和未授权资源不进入公共仓库。

## 首批 BASIC 范围与 API

[src/output/index.ts](src/output/index.ts) 提供 `generateTargetSource(input)` 同步源码预览、`generateTargetProject(input)` 异步资源/摘要/清单生成；[types.ts](src/output/types.ts) 的 `OutputBundle` 带 target/files/issues/manifest/sourceMap 和 `deployable=false`，是源码合同产物。

BASIC 当前支持 `obj`、`btn`、`label`、`slider`、`bar`、`switch`、`checkbox` 的绝对像素布局、基本 default 样式、`navigate/show/hide/enable/disable/setText/setValue` 和用户事件模块。图、绑定、动画、图片/字体及不支持的高级样式阻止导出。文件包括 `main.bas`、`generated/layout.bas`、`generated/events.bas`、`user/events.bas`、`api-contract.json`、`source-map.json`、`manifest.json`。`hmicraft-hmi-basic/1-draft` 未在 IoTEmbedded 注册，nested import 需要未来 HmiCraft 加载器；生成不完成 runtime/设备验收。

C/LVGL 的 GEN-13 已确认集成 profile：`cIntegrationProfile` 默认 `generic` 兼容旧工程，可选 `stm32cube-hal`（STM32CubeMX/CubeIDE HAL）或 `rt-thread-scons`（标准 RT-Thread BSP/SCons）；保存/重开/导出保留选择。首批合同组织 STM32 `Core/Src/hmi` / `Core/Inc/hmi` 或 RT-Thread `applications/hmi` 加 `SConscript`，输出 `integration-contract.json`；不含具体 .ioc/BSP，不声明目标构建或板卡通过。它们是 `c-lvgl` 内部配置轴，不增加输出语言。BASIC 有首批定位 source map，C/Lisp 当前为空，完整映射后验。

### 2026-10-11 本地验证快照

Vitest **509项通过/48项C编译测试跳过**；实际 `npm run build`（TypeScript `tsc -b` 加 Vite）退出 **0**。含两控件、内置事件和各语言独立代码slot的小样例，C/LispBM/BASIC三目标ZIP与工程JSON导出通过；英中俄无reload切换、BASIC保存/reload恢复通过。六个ZIP的路径、字节长度和SHA256独立检查均通过。远端PR正式合并仍待回读；GEN-09保留partial，这只是小样例源码包证据，资源广样例、目标runtime与硬件仍未验。

见[验证报告](docs/verification-pr3-2026-10-11.md)和[共同样例](samples/three-targets.lvgl.json)。固定LVGL/.ioc/BSP构建、LispBM桥接/脚本执行、IoTEmbedded BASIC消费、设备传输与工业验收仍未完成；历史失败保留。
