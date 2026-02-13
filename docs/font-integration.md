# 字体引入设计文档

## 1. 整体架构

LVGL 编辑器的字体系统支持用户上传 TTF/OTF 字体文件，在编译预览时通过 `lv_font_conv` 工具将其转换为 LVGL 可用的 C 源文件，最终与 UI 代码一起编译为 WASM 运行。

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
  代码生成 (codegen)
  ├── ui.h: LV_FONT_DECLARE(ui_font_noto_16)
  └── ui.c: 组件中引用 &ui_font_noto_16
       │
       ▼
  编译预览 (CompilePreview)
  ├── 构建 FontCompileRequest (base64 + 转换参数)
  └── POST /api/compile (files + fonts)
       │
       ▼
  服务端 (vite-plugin-compile)
  ├── 解码 base64 → 临时 .ttf/.otf 文件
  ├── 调用 lv_font_conv 生成 .c 文件
  └── 与 UI 代码一起 emcc 编译 → WASM
```

## 2. 完整链路

### 2.1 字体上传

用户通过资源管理面板上传 TTF/OTF 文件，前端执行：

1. `fontFileToBase64()` 将文件转为 base64 data URI
2. `parseFontMetadata()` 解析字体的 name 表，提取 family 和 style
3. 生成 `cFontName`（格式：`ui_font_<sanitized_name>`）
4. 存入 `ResourceStore.fonts` 数组

### 2.2 代码生成

`generateCode()` 被调用时，`fontResources` 参与以下生成：

- **ui.h**：为每个字体的每个 size 生成 `LV_FONT_DECLARE(cFontName_size)`
- **ui.c**：组件通过 `styles.textFont` 或 `props.fontResource` 引用字体变量

### 2.3 编译预览

`CompilePreview.handleCompile()` 执行：

1. 调用 `generateCode()` 生成 C 源文件
2. 将 `fontResources` 转换为 `FontCompileRequest[]`，包含：
   - `data`：字体文件的 base64 data URI
   - `cFontName`：C 变量名前缀
   - `sizes`：需要生成的字号数组
   - `ranges`：Unicode 字符范围（由 `getCharsetRanges()` 计算）
   - `bpp`：抗锯齿位深度
3. 调用 `compileCode(userFiles, width, height, onStatus, fontRequests)`

### 2.4 服务端字体转换

`vite-plugin-compile.ts` 的 `/api/compile` 端点：

1. 接收 `fonts` 数组
2. 对每个字体：
   - 解码 base64 写入临时文件
   - 对每个 size 调用 `lv_font_conv` 生成 `.c` 文件
   - 读取生成的 C 源文件内容
3. 将字体 `.c` 文件加入 emcc 编译源文件列表

### 2.5 编译输出

emcc 将所有 `.c` 文件（UI 代码 + 字体 C 数组）编译为 `output.js` + `output.wasm`，在浏览器中运行。

## 3. 关键文件

| 文件 | 职责 |
|------|------|
| `src/resources/types.ts` | `FontResource` 类型定义 |
| `src/resources/converters/fontConverter.ts` | 字体元数据解析、字符集范围计算、lv_font_conv 命令生成 |
| `src/codegen/templates/ui.h.ts` | 生成 `LV_FONT_DECLARE` 声明 |
| `src/codegen/templates/ui.c.ts` | 组件中引用字体变量 |
| `src/codegen/generator.ts` | 代码生成入口，传递 fontResources |
| `src/components/CompilePreview/CompilePreview.tsx` | 编译预览 UI，构建字体请求 |
| `src/components/CompilePreview/compilerService.ts` | 编译服务客户端，发送字体数据 |
| `vite-plugin-compile.ts` | 服务端编译插件，调用 lv_font_conv 并编译 |

## 4. lv_font_conv 使用方式

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

## 5. 字体变量命名规范

| 层级 | 格式 | 示例 |
|------|------|------|
| cFontName | `ui_font_<name>` | `ui_font_noto` |
| 带 size 的变量名 | `<cFontName>_<size>` | `ui_font_noto_16` |
| ui.h 声明 | `LV_FONT_DECLARE(<var>)` | `LV_FONT_DECLARE(ui_font_noto_16)` |
| ui.c 引用 | `&<var>` | `&ui_font_noto_16` |
| lv_font_conv 输出 | `--output=<var>.c` | `--output=ui_font_noto_16.c` |

`LV_FONT_DECLARE(x)` 宏展开为 `extern const lv_font_t x;`，与 `lv_font_conv` 生成的全局变量声明匹配。

## 6. 支持的字符集和配置选项

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

- `sizes: number[]`：需要生成的字号列表
- `charset: CharsetType`：字符集类型
- `customChars?: string`：自定义字符集时的字符列表
- `bpp: 1 | 2 | 4 | 8`：抗锯齿位深度
- `compress: boolean`：是否压缩（当前编译预览使用 `--no-compress`）

## 7. 已知限制和未来改进

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
