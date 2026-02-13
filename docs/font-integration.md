# 字体引入设计文档

## 1. 整体架构

LVGL 编辑器的字体系统支持内置字体和用户上传的自定义字体（TTF/OTF）。字体大小在组件级别按需选择，编译时动态收集所有实际用到的字体+字号组合，通过 `lv_font_conv` 转换为 LVGL C 源文件。

```
用户上传字体 (TTF/OTF)
       │
       ▼
  ResourceStore (前端状态管理)
  ├── 解析字体元数据 (family, style)
  ├── 存储 base64 数据
  └── 生成 cFontName (如 ui_font_noto)
       │
       ▼
  项目设置
  ├── 选择默认字体（内置或自定义）
  └── 自定义默认字体时，选择默认字体大小
       │
       ▼
  组件属性面板
  ├── 选择字体（默认 / 内置 / 自定义）
  ├── 内置字体：大小固定（名字自带，如 montserrat_14）
  └── 自定义字体：可选 8-48px 字体大小
       │
       ▼
  代码生成 (codegen)
  ├── 扫描所有组件，收集实际用到的字体+字号组合
  ├── ui.h: LV_FONT_DECLARE(ui_font_noto_16)
  ├── ui.c: 每个 screen 设置默认字体
  └── ui.c: 仅对字体/字号与默认不同的组件生成设置代码
       │
       ▼
  编译预览 (CompilePreview)
  ├── 动态收集所有用到的自定义字体+字号组合
  ├── 构建 FontCompileRequest (base64 + 转换参数)
  └── POST /api/compile (files + fonts)
       │
       ▼
  服务端 (vite-plugin-compile)
  ├── 解码 base64 → 临时 .ttf/.otf 文件
  ├── 对每个字号调用 lv_font_conv 生成 .c 文件
  └── 与 UI 代码一起 emcc 编译 → WASM
```

## 2. 字体类型

### 2.1 内置字体

LVGL 内置的 Montserrat 字体，大小固定在名字中：

- `montserrat_8` ~ `montserrat_48`（偶数大小）
- 默认字体：`montserrat_14`
- 选择内置字体时**不能单独设置字体大小**（大小由字体名决定）

### 2.2 自定义字体

用户上传的 TTF/OTF 字体文件：

- 上传时只需配置：名称、C 变量名、字符集、BPP
- **不需要在上传时选择字号**——字号在组件属性面板中按需选择
- 编译时根据实际使用情况动态生成所需的所有字号

## 3. 默认字体机制

### 3.1 项目设置

在项目设置（`ProjectSettings`）中配置：

- **默认字体**：可选内置字体或已上传的自定义字体
- **默认字体大小**：仅当默认字体为自定义字体时显示，可选 8-48px

配置存储在 `ProjectConfig.lvglConfig` 中：

```typescript
interface LvglConfig {
  defaultFont: string;        // 如 "montserrat_14" 或 "ui_font_noto"
  defaultFontSize?: number;   // 仅自定义字体需要，如 16
  // ...
}
```

### 3.2 继承规则

- 每个 screen（页面）在初始化时设置默认字体
- 组件默认继承所在 screen 的字体设置
- 只有字体或字号与默认不同的组件才会生成单独的字体设置代码

## 4. 组件字体选择

### 4.1 属性面板行为

`ComponentFontSelector` 组件提供三种选择：

| 选择 | 字体大小选择器 | 行为 |
|------|--------------|------|
| **默认** | 自定义默认字体时显示，内置默认字体时隐藏 | 继承项目默认字体；可选不同字号 |
| **内置字体** | 隐藏 | 使用指定的内置字体（大小固定） |
| **自定义字体** | 显示（8-48px） | 使用指定的自定义字体+选定大小 |

### 4.2 代码生成判断逻辑

对每个组件，代码生成器执行以下判断：

```
组件未设置字体（fontResource 为空）
  → 不生成字体代码（继承默认）

组件字体 == 默认字体 且 字号 == 默认字号
  → 不生成字体代码（继承默认）

组件字体 == 默认字体 但 字号 != 默认字号
  → 生成 lv_obj_set_style_text_font（同字体不同大小）

组件字体 != 默认字体
  → 生成 lv_obj_set_style_text_font（不同字体）
```

## 5. 完整链路

### 5.1 字体上传

用户通过资源管理面板上传 TTF/OTF 文件，前端执行：

1. `fontFileToBase64()` 将文件转为 base64 data URI
2. `parseFontMetadata()` 解析字体的 name 表，提取 family 和 style
3. 生成 `cFontName`（格式：`ui_font_<sanitized_name>`）
4. 存入 `ResourceStore.fonts` 数组

### 5.2 代码生成

`generateCode()` 被调用时：

1. **收集字体使用情况**：`collectUsedCustomFonts()` 遍历所有页面的所有组件，收集实际用到的自定义字体+字号组合
2. **ui.h**：为每个用到的字体+字号组合生成 `LV_FONT_DECLARE(cFontName_size)`
3. **ui.c screen init**：每个 screen 设置项目默认字体
4. **ui.c 组件**：仅对字体/字号与默认不同的组件生成 `lv_obj_set_style_text_font`

### 5.3 编译预览

`CompilePreview.handleCompile()` 执行：

1. `collectUsedCustomFontSizes()` 动态收集所有组件实际用到的自定义字体+字号组合
2. 调用 `generateCode()` 生成 C 源文件
3. 将字体资源转换为 `FontCompileRequest[]`，其中 `sizes` 为动态收集的字号数组
4. 调用 `compileCode(userFiles, width, height, onStatus, fontRequests)`

### 5.4 服务端字体转换

`vite-plugin-compile.ts` 的 `/api/compile` 端点：

1. 接收 `fonts` 数组
2. 对每个字体：
   - 解码 base64 写入临时文件
   - 对每个 size 调用 `lv_font_conv` 生成 `.c` 文件
   - 读取生成的 C 源文件内容
3. 将字体 `.c` 文件加入 emcc 编译源文件列表

### 5.5 编译输出

emcc 将所有 `.c` 文件（UI 代码 + 字体 C 数组）编译为 `output.js` + `output.wasm`，在浏览器中运行。

## 6. 画布预览

设计画布（Canvas）中的组件预览也会反映默认字体大小：

- `appStore.defaultFontSize` 存储当前项目的默认字体大小
- `CanvasComponent` 读取此值作为文本组件（btn、label、checkbox 等）的默认字号
- 组件单独设置了 `fontSize` 时使用组件自身的值

## 7. 关键文件

| 文件 | 职责 |
|------|------|
| `src/store/projectStore.ts` | `LvglConfig` 类型定义（含 `defaultFont`、`defaultFontSize`） |
| `src/store/appStore.ts` | `defaultFontSize` 状态、`parseFontSize()` 工具函数 |
| `src/resources/types.ts` | `FontResource` 类型定义 |
| `src/resources/converters/fontConverter.ts` | 字体元数据解析、字符集范围计算、lv_font_conv 命令生成 |
| `src/components/ProjectSettings/ProjectSettings.tsx` | 项目设置 UI（默认字体 + 默认字体大小） |
| `src/components/PropertyEditor/PropertyEditor.tsx` | 组件字体选择器（`ComponentFontSelector`） |
| `src/components/Canvas/CanvasComponent.tsx` | 画布组件预览（读取 `defaultFontSize`） |
| `src/codegen/templates/ui.h.ts` | 生成 `LV_FONT_DECLARE` 声明（仅实际用到的组合） |
| `src/codegen/templates/ui.c.ts` | 组件字体代码生成（含继承判断逻辑） |
| `src/codegen/generator.ts` | 代码生成入口，传递 `defaultFont` 和 `defaultFontSize` |
| `src/components/CompilePreview/CompilePreview.tsx` | 编译预览，动态收集字号并构建字体请求 |
| `src/components/CompilePreview/compilerService.ts` | 编译服务客户端，发送字体数据 |
| `vite-plugin-compile.ts` | 服务端编译插件，调用 lv_font_conv 并编译 |

## 8. lv_font_conv 使用方式

### 安装

```bash
npm install -g lv_font_conv
```

### 命令格式

```bash
lv_font_conv \
  --font <input.ttf> \
  --size=<N> \
  --bpp=<1|2|4|8> \
  --range=<start>-<end> \
  --format=lvgl \
  --output=<name>.c \
  --no-compress
```

### 示例

```bash
lv_font_conv \
  --font NotoSansSC-Regular.ttf \
  --size=16 \
  --bpp=4 \
  --range=0x20-0x7e \
  --format=lvgl \
  --output=ui_font_noto_16.c \
  --no-compress
```

生成的 `.c` 文件包含一个全局变量 `lv_font_t ui_font_noto_16`，变量名取自输出文件名（不含 `.c`）。

## 9. 字体变量命名规范

| 层级 | 格式 | 示例 |
|------|------|------|
| cFontName | `ui_font_<name>` | `ui_font_noto` |
| 带 size 的变量名 | `<cFontName>_<size>` | `ui_font_noto_16` |
| ui.h 声明 | `LV_FONT_DECLARE(<var>)` | `LV_FONT_DECLARE(ui_font_noto_16)` |
| ui.c 引用 | `&<var>` | `&ui_font_noto_16` |
| lv_font_conv 输出 | `--output=<var>.c` | `--output=ui_font_noto_16.c` |

`LV_FONT_DECLARE(x)` 宏展开为 `extern const lv_font_t x;`，与 `lv_font_conv` 生成的全局变量声明匹配。

## 10. 支持的字符集和配置选项

### 字符集预设

| ID | 名称 | Unicode 范围 |
|----|------|-------------|
| `ascii` | ASCII | 0x20-0x7E |
| `latin` | Latin Extended | 0x20-0x7E, 0xA0-0x24F |
| `cjk-basic` | CJK 基本 | 0x20-0x7E, 0x4E00-0x9FFF |
| `custom` | 自定义 | 用户指定的字符列表 |

### BPP（抗锯齿位深度）

- **1 bpp**：无抗锯齿，最小体积
- **2 bpp**：4 级灰度
- **4 bpp**：16 级灰度（推荐）
- **8 bpp**：256 级灰度，最佳质量

### 配置选项

- `charset: CharsetType`：字符集类型
- `customChars?: string`：自定义字符集时的字符列表
- `bpp: 1 | 2 | 4 | 8`：抗锯齿位深度
- `compress: boolean`：是否压缩（当前编译预览使用 `--no-compress`）

## 11. 已知限制和未来改进

### 已知限制

- **CJK 字符集体积大**：`cjk-basic` 包含约 20,000 个汉字，生成的 C 文件可能达到数 MB，编译时间较长
- **服务端依赖**：需要全局安装 `lv_font_conv`，如果未安装会报错
- **无字体子集化**：自定义字符集需要用户手动指定字符，没有自动分析 UI 中实际使用的字符
- **无缓存**：每次编译都重新转换字体，没有缓存已转换的结果

### 未来改进方向

1. **字体转换缓存**：基于字体 hash + size + charset + bpp 缓存转换结果，避免重复转换
2. **自动字符集提取**：分析 UI 中所有文本内容，自动生成最小字符集
3. **WASM 版 lv_font_conv**：将 lv_font_conv 编译为 WASM，在浏览器端直接转换，消除服务端依赖
4. **字体预览**：在资源管理面板中使用 CSS @font-face 预览上传的字体效果
5. **字体合并**：支持将多个字体的不同范围合并为一个 LVGL 字体（lv_font_conv 的 `--font` 可多次指定）
6. **进度反馈**：对大字符集的转换提供进度条或预估时间
