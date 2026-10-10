# LvglEditor 路线图：统一设计与三种输出

[English](ROADMAP.md) · [简体中文](ROADMAP.zh-CN.md)

<!-- docs-sync: family=roadmap revision=2026-10-11.4 -->

更新：2026-10-11。用户已确认：LvglEditor 同时负责可视化设计和 C/LVGL、LispBM/VESC、BASIC/IoTEmbedded 三种输出。宿主应用（例如 HmiCraft）在初始化编辑器时指定输出目标，消费编辑器生成的产物。用户已授权修订并合并 PR #3，保留 C/LVGL 并增加 BASIC。首批实施基础 BASIC 布局/事件生成、包合同和新建/设置目标切换；实现、验证与远端合并结果分别记录。后续设备链路尚未验收。

状态：`planned` 表示未实现；`partial` 表示已有部分能力、仍有明确缺口；`done-doc` 只表示方案完成，不能代表可运行或设备验收。

## 所有权与依赖

| 归属 | 负责内容 |
|---|---|
| LvglEditor 公共内核 | 画布/属性/资源/事件/逻辑工作台、版本化工程模型、初始化配置、目标注册、能力检查、诊断、用户代码保护、导出结果合同 |
| LvglEditor 三个输出后端 | 各自的代码生成、事件/逻辑转换、资源转换、文件/清单打包和生成器测试；全部在本仓规划和维护 |
| HmiCraft 等宿主 | 初始化时选择目标及允许范围，提供匹配的设备/API/profile 描述、接入已有工程，消费生成结果；实现产品管理、传输下载、设备调试和验收 |
| 目标固件/运行时 | C 的 LVGL/BSP；VESC 的 LispBM/LVGL 桥接；IoTEmbedded + HmiCraft 的 BASIC/HMI API、驱动和包加载 |

编辑器可独立运行，保持现有 C 工作流的兼容性。BASIC/VESC 后端依据版本化目标合同生成，不导入宿主源码，不依赖 HmiCraft 服务在线，也不在生成过程中连接或控制真实设备。宿主不另写一套 UI 源码生成器。

## 初始化与持久化合同（设计草案）

以下是初始化合同的设计形状；实际导出/初始化入口及本批支持范围以源码和本轮验证回执为准，GEN-01/10 跟踪宿主挂载。

```ts
const editorOptions = {
  output: {
    defaultTarget: "basic-iotembedded",
    allowedTargets: ["basic-iotembedded"],
    allowTargetSwitch: false,
    profile: basicDeviceProfile, // 宿主传入已选择且带版本的设备/API能力描述
  },
};
```

- 三个稳定目标 ID 为 `c-lvgl`、`lispbm-vesc`、`basic-iotembedded`；独立编辑器可提供三种选择，宿主可限制为一种或数种，HmiCraft 首个自有设备入口初始化为 BASIC 目标。新建项目与项目设置使用同一目标配置；独立编辑器默认 C。
- 初始化校验 defaultTarget 属于非空 allowedTargets，目标已注册且可用，profile 与目标/LVGL/runtime API 版本匹配。不认识或尚未实现的目标应返回明确错误，不能静默改成 C。
- 未提供目标配置的旧入口保留 C 默认行为。目标列表必须区分可用、未实现和不匹配，不能仅有选项就声称支持。
- 工程保存目标 ID、profile 标识与版本、编辑 schema 和各语言用户代码。重新打开以保存的目标为请求，再检查宿主允许范围；发生冲突时保留原文档并提示，禁止在自动恢复时覆盖目标或代码。
- 只有宿主允许切换且用户明确操作时才变更当前目标；列出不支持的控件、事件和手写代码，保留其他目标模块。手写 C/Lisp/BASIC 不自动互译。
- 配置贯穿新建、导入、自动恢复、代码预览、下载和批量导出。不能只改变代码面板标签，或让某条导出路径仍调用固定 C 生成器。
- 返回结果建议包含目标/profile/schema/生成器版本、文本与二进制文件、资源清单、诊断和 source map。错误不得生成可部署的成功结果；诊断可保留用于编辑，不作为完整产物交给宿主下载。
- 导出负责生成/打包；目标编译、物理传输和运行结果由明确的适配器/宿主完成，并分别报告。

## 三目标输出合同

| 目标 | 生成内容 | 运行依赖 | 首个闭环 |
|---|---|---|---|
| C/LVGL | C/头文件、事件/逻辑代码、图片/字体资源、集成清单 | 固定 LVGL 版本及目标 BSP/工具链 | 保留现有 C 工作流，编译生成代码并验证界面与事件 |
| LispBM/VESC | Lisp 布局/事件/逻辑、资源文件、目标清单 | 固定 LispBM、VESC 固件及 LVGL 桥接 API/资源格式 | 选择性提取 PR #3 后端，加载脚本/资源并记录目标设备证明 |
| BASIC/IoTEmbedded | BASIC 布局、用户事件模块、资源/索引、设计包清单 | IoTEmbedded BASIC + HmiCraft HMI API/包加载协议 | 对版本化 API/profile 生成，再由 HmiCraft 主机 runtime 与单板消费 |

共同模型记录稳定对象 ID、层级/布局/样式、变量、基础动作、事件及资源。公共动作逐目标转换；目标特有能力显式标记。生成布局与用户模块分开，重生成、控件重命名和目标切换均不得覆盖用户逻辑。没有匹配能力或资源超预算时应明确诊断。

## 任务与验收

| ID | 主归属 | 交付 | 状态 | 验收/依赖 |
|---|---|---|---|---|
| GEN-00 | LvglEditor 基线维护 | 类型/字体回归与可执行测试基线 | partial | 已有外部验证记录类型失败、4项字体断言失败和静态打包成功；先在本仓复现并修复；参数化 C 编译环境；不能靠跳过类型检查通过 |
| GEN-01 | LvglEditor 公共 API | 初始化配置、目标注册与一致出口 | partial | 默认 C 兼容；三目标请求及未知/禁用/profile冲突均有合同用例；新建/打开/恢复/预览/导出使用同一配置 |
| GEN-02 | LvglEditor 工程模型 | 语言独立模型和版本化目标 profile | partial | 稳定 ID、事件/变量/资源、能力查询；schema迁移与未知项诊断；多个编辑器实例不串用配置；GEN-01 |
| GEN-03 | LvglEditor C 后端 | 保持 C 行为并接统一生成接口 | partial | 原C已接统一backend，本地测试/类型/构建及三个Cprofile浏览器ZIP下载通过；48项依赖工具链的C编译测试跳过，固定LVGL/目标构建和硬件仍未验；GEN-00/01/02 |
| GEN-04 | LvglEditor LispBM 后端 | LispBM/VESC 生成与资源打包 | partial | 重新固定 PR #3 head，提取后端与必要依赖，保留 C 测试/中文/其他目标；固定桥接/API/资源格式；脚本与指定设备分别验证；GEN-01/02/06/07 |
| GEN-05 | LvglEditor BASIC 后端 | BASIC/IoTEmbedded 生成与设计包 | partial | 冻结 HmiCraft HMI API/包/profile 合同；布局、事件接线、用户脚本与资源包重复生成一致；主机 runtime/设备验证由 HmiCraft 对接；GEN-01/02/06/07 |
| GEN-06 | LvglEditor 资源与产物 | 共享资源处理和目标打包接口 | partial | 每目标图片/字体/动画格式及预算、清单/版本/摘要/相对路径/source map；错误不返回可部署成功包；固定输入输出可重复；GEN-02 |
| GEN-07 | LvglEditor 代码与事件编辑 | 按目标配置语言和用户模块 | partial | C/Lisp/BASIC 编辑语言与目标一致；基础动作映射；保存/重开/切换/重生成不丢用户代码；不支持节点产生定位诊断；GEN-02 |
| GEN-08 | LvglEditor 预览适配 | 目标对应的预览合同 | planned | Canvas视觉、C/WASM运行、脚本runtime和实板区分；缺目标runtime时只报告已验证层；事件/资源使用目标相符的产物；GEN-03/04/05 |
| GEN-09 | LvglEditor 验证 | 三目标共同样例与能力矩阵 | partial | 509通过/48 C编译跳过；两控件/内置事件/各语言slot样例三目标ZIP/JSON、三语切换/BASIC恢复及六ZIP元数据检查通过；资源广样例、目标runtime/事件轨迹和实板未验，见verification-pr3-2026-10-11；GEN-03/04/05/08 |
| GEN-10 | LvglEditor 宿主接口 | 可嵌入入口与 HmiCraft 初始化合同 | partial | 模拟宿主可配置任一已实现目标并取得产物/诊断；HmiCraft 提供 BASIC profile 和接收回执；编辑器独立运行无需导入 HmiCraft 源码；GEN-01/02/06 |
| GEN-11 | LvglEditor 合并维护 | PR #3 修订、来源和正式合并回执 | partial | 已固定 head `3647ce025bc65cd14c968c1d329dc40d593f7e51`、base `0d0d62f655442dd5624a00390b7652222a7b3fc8`；用户授权修订后正式合并；保留 C 代码/测试、加入 BASIC，各项验证、可获取提交和 GitHub 合并状态分别回读；GEN-00/01/03/04/05 |
| GEN-12 | LvglEditor 文档/UI | 三语门面、双语路线与三语界面 | partial | README 英/中/俄、ROADMAP 英/中共享 revision 和能力边界；脚本检查 ID/状态/链接；UI 默认英文，中文/俄语切换、持久化、目标新建/设置/诊断/导出文案另行验证；文档通过不代表 UI 全覆盖 |
| GEN-13 | C 后端/profile | STM32CubeMX/CubeIDE HAL 与 RT-Thread BSP/SCons profile | partial | 统一 C backend，保存/重开/导出 `cIntegrationProfile`：默认 `generic`、`stm32cube-hal`、`rt-thread-scons`；STM32 Core/Src/hmi/Core/Inc/hmi、RT applications/hmi+SConscript 和 integration-contract.json。profile持久化/目录/导出合同已实现，本地检查及三个Cprofile浏览器ZIP下载通过；具体 .ioc/BSP/工具链构建与板卡未验；GEN-01/02/03/06/09 |

顺序：GEN-00 → GEN-01/02 → GEN-03 保持 C 路径；GEN-06/07 支撑 GEN-04/05，两条脚本线独立推进。GEN-10 验证宿主初始化，GEN-08/09 分目标补齐预览与运行证明。三种输出无需同批交付，均有独立完成条件。

首个共同样例建议包含容器、按钮、文本、数值/进度显示、布尔状态、图片/字体、页面切换、定时或变量事件。各目标选择自己支持的原生控件映射并在能力矩阵记录；能力不足时拒绝相应导出，不能生成空实现并报告成功。

## 跨仓交付规则

- 本路线在 LvglEditor 维护，HmiCraft 的 OUT/LVE/HMI 条目只映射子项目任务与宿主/设备验收，不重复实现生成器。
- 子仓文档、源码和验证单独提交；可获取提交确定后，HmiCraft 才更新固定 gitlink。不把未提交子模块内容称为已固定或已发布依赖。
- PR #3 通用画布/资源改进与 LispBM 后端分别审查，修订后按授权正式合并；未取得远端回读前只记录本地整合。PR #2 桌面宿主独立验证，不因 PR #3 合并而视为已采纳。
- 编辑器构建、产物生成、目标代码编译、脚本执行与设备运行分别记录；现有 README/版本徽章不代替这些结果。

## 本批实施与后续门槛

1. 固定 PR #3 来源；保留原 C 后端、文档与测试，逐项引入 LispBM 与必要依赖。独立默认 C，HmiCraft 自有入口默认 BASIC。
2. 新建/设置共享目标选择，保存/恢复目标与每语言用户代码；基础 BASIC 布局/事件和包合同先行。不支持项有诊断并阻止导出。
3. 三语门面/双语路线/AGENTS 同步；UI 英文默认及中俄切换另验，不将 README 翻译当界面覆盖。
4. 完整类型/测试/构建和浏览器旅程通过后，形成子仓提交/正式合并回执，父仓只固定可获取 SHA。原失败记录仍保留。
5. BASIC API/runtime 消费、资源转换完整性、目标编译/脚本执行、实板与产品交付继续逐目标推进；首批生成不关闭这些任务。
6. 原 C 规范到统一 backend，GEN-13 首批实现 STM32CubeMX/CubeIDE HAL 与 RT-Thread BSP/SCons profile 的持久化/目录/合同；默认 generic 兼容旧工程，具体 .ioc/BSP 构建与板卡另验。

## 2026-10-11 本地验证快照

Vitest **509项通过/48项C编译测试跳过**；实际 `npm run build`（TypeScript `tsc -b` 加 Vite）退出 **0**。含两控件、内置事件和各语言独立代码slot的小样例，C/LispBM/BASIC三目标ZIP与工程JSON导出通过；英中俄无reload切换、BASIC保存/reload恢复通过。六个ZIP的路径、字节长度和SHA256独立检查均通过。远端PR正式合并仍待回读；GEN-09保留partial，这只是小样例源码包证据，资源广样例、目标runtime与硬件仍未验。

见[验证报告](docs/verification-pr3-2026-10-11.md)和[共同样例](samples/three-targets.lvgl.json)。固定LVGL/.ioc/BSP构建、LispBM桥接/脚本执行、IoTEmbedded BASIC消费、设备传输与工业验收仍未完成；历史失败保留。
