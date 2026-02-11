# Image (img) — 图片组件设计文档

## 1. 组件名称和简介

Image（图片）是 LVGL 编辑器中用于显示图像资源的基础组件。在 LVGL 中，图片对象（`lv_image` / `lv_img`）用于显示预编译的 C 数组图像或外部文件系统中的图片。图片组件支持旋转、缩放等变换操作。

图片不是容器组件（`isContainer = false`），不能包含子组件。

## 2. 组件类型标识

```
type: 'img'
```

## 3. 所属分类

| 字段 | 值 |
|---|---|
| 分类 ID | `basic` |
| 分类名称 | 基础 |
| 分类图标 | 📦 |
| 组件图标 | 🖼️ |

## 4. 默认尺寸

| 属性 | 值 |
|---|---|
| defaultWidth | 100 |
| defaultHeight | 100 |

## 5. 是否为容器

```
isContainer: false
```

图片是纯显示组件，不能包含子组件。

## 6. 父子级关系设计

### 可以作为以下组件的子级

- **Screen（屏幕根节点）** — 直接放置在页面上
- **Button (btn)** — 作为按钮内的图标
- **Container (obj)** — 放置在通用容器内
- **Tab View (tabview)** — 放置在标签页内容区
- **Tile View (tileview)** — 放置在瓦片区域内
- **Window (win)** — 放置在窗口内容区

### 可以包含的子组件

无。图片不是容器，不能包含任何子组件。

## 7. 属性设计（props）

| 属性名 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `src` | `string` | `''` | 图片源。可以是资源 ID、资源名称、C 数组名称或 data URL |
| `rotation` | `number` | `0` | 旋转角度（度，代码生成时乘以 10 转换为 LVGL 的 0.1° 单位） |
| `scaleMode` | `string` | `undefined` | 缩放模式：`'cover'` / `'contain'`（需自定义实现） |

### props 类型定义

```typescript
interface ImgProps {
  src: string;
  rotation?: number;
  scaleMode?: 'cover' | 'contain';
}
```

## 8. 样式设计（styles）

### 支持的样式状态

| 状态 | 选择器 | 说明 |
|---|---|---|
| `default` | `LV_STATE_DEFAULT` | 默认/正常状态 |
| `pressed` | `LV_STATE_PRESSED` | 按下状态 |
| `focused` | `LV_STATE_FOCUSED` | 获得焦点状态 |
| `disabled` | `LV_STATE_DISABLED` | 禁用状态 |

### default 状态默认样式

| 样式属性 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `bgColor` | `string` | `'transparent'` | 背景色（透明） |
| `borderColor` | `string` | `'transparent'` | 边框颜色（无边框） |
| `borderWidth` | `number` | `0` | 边框宽度 |
| `borderRadius` | `number` | `0` | 圆角半径 |
| `textColor` | `string` | `'#212121'` | 文本颜色（用于占位符文字） |
| `opacity` | `number` | `1` | 不透明度 |
| `padding` | `number` | `0` | 内边距 |

### 样式来源说明

图片组件在 LVGL 默认主题中没有特殊样式，使用基础对象的默认值：
- 背景透明
- 无边框、无圆角、无内边距

### 扩展样式属性

图片支持以下通用扩展样式（继承自 `StyleProps`）：

- 阴影：`shadowColor`, `shadowWidth`, `shadowOffsetX`, `shadowOffsetY`, `shadowSpread`, `shadowOpacity`
- 轮廓：`outlineColor`, `outlineWidth`, `outlinePad`
- 变换：`transformAngle`, `transformZoomX`, `transformZoomY`, `transformPivotX`, `transformPivotY`
- 混合模式：`blendMode`

## 9. 事件支持

图片支持以下 LVGL 事件类型：

| 事件类型 | 说明 |
|---|---|
| `LV_EVENT_CLICKED` | 点击事件 |
| `LV_EVENT_PRESSED` | 按下事件 |
| `LV_EVENT_RELEASED` | 释放事件 |
| `LV_EVENT_LONG_PRESSED` | 长按事件 |
| `LV_EVENT_FOCUSED` | 获得焦点 |
| `LV_EVENT_DEFOCUSED` | 失去焦点 |

> 注意：图片默认不可点击。如需响应事件，需要通过 flags 设置 `clickable = true`。

## 10. UI 层设计

### 10.1 编辑器画布渲染（CanvasComponent.tsx）

在编辑器画布中，图片使用 `CanvasImageContent` 子组件渲染：

```tsx
// 有图片资源时
<div className="lvgl-img" style={{
  width: '100%', height: '100%',
  backgroundImage: `url(${matched.data})`,
  backgroundSize: 'contain',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center',
}} />

// 无图片资源时（占位符）
<div className="lvgl-img" style={{
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '100%', height: '100%', fontSize: '24px',
}}>
  🖼️
</div>
```

关键行为：
- 通过 `useResourceStore` 查找图片资源（按 ID、名称或 C 数组名匹配）
- 找到资源时使用 `backgroundImage` 显示实际图片（`contain` 模式）
- 未找到资源时显示 🖼️ 占位符图标
- 透明背景时自动回退为 `#f0f0f0`（浅灰色），确保在画布中可见
- 支持选中高亮、悬停效果、拖拽、缩放手柄

### 10.2 简易预览渲染（PreviewPanel.tsx）

在 Canvas 2D 简易预览中，图片使用 `drawImage()` 函数绘制：

```typescript
drawImage(ctx, x, y, w, h, {
  src: comp.props.src,
  loadImage,
});
```

关键行为：
- 通过 `loadImage()` 回调加载图片（支持资源 ID、名称、data URL、HTTP URL）
- 使用内存缓存（`imageCache`）避免重复加载
- 图片加载完成后使用 `ctx.drawImage()` 绘制
- 图片未加载或无 src 时绘制灰色占位矩形 + 🖼️ 图标
- 图片加载完成后自动触发重绘

### 10.3 LVGL WASM 预览渲染

#### JSON 序列化（editorStateToJson.ts）

图片被序列化为扁平化的 JSON 组件节点：

```json
{
  "type": "img",
  "id": "comp-xxx",
  "parent": null,
  "x": 20, "y": 20,
  "width": 100, "height": 100,
  "props": { "src": "" },
  "styles": {
    "default": {
      "bgColor": "transparent",
      "borderColor": "transparent",
      "borderWidth": 0,
      "borderRadius": 0,
      "textColor": "#212121",
      "opacity": 1,
      "padding": 0
    }
  }
}
```

#### C 端创建（ui_from_json.c）

```c
static lv_obj_t *create_img(lv_obj_t *parent, const cJSON *comp) {
    (void)comp;
    /* Image source handling would require asset management;
       for now just create the widget */
    return lv_image_create(parent);
}
```

关键行为：
- 调用 `lv_image_create()` 创建图片对象（v9 API）
- 当前 WASM 预览不处理图片源（需要资产管理系统支持）
- 仅创建空的图片 widget，应用位置、尺寸、样式

### 10.4 代码生成输出（ui.c.ts）

```c
// Create img: my_image
my_image = lv_image_create(parent);  // v9
// my_image = lv_img_create(parent); // v8
lv_obj_set_pos(my_image, 20, 20);
lv_obj_set_size(my_image, 100, 100);
lv_obj_set_style_bg_opa(my_image, LV_OPA_TRANSP, 0);

// 设置图片源（匹配资源时使用 C 数组名）
lv_image_set_src(my_image, &my_icon);  // v9
// lv_img_set_src(my_image, &my_icon); // v8

// 旋转（如果设置了 rotation）
lv_image_set_rotation(my_image, 450);  // v9, 45° × 10
// lv_img_set_angle(my_image, 450);    // v8
```

关键行为：
- v9 使用 `lv_image_create` / `lv_image_set_src` / `lv_image_set_rotation`
- v8 使用 `lv_img_create` / `lv_img_set_src` / `lv_img_set_angle`
- 图片源匹配逻辑：先在 `imageResources` 中按 ID 或名称查找，找到则使用 `cArrayName`；否则直接使用 `props.src` 作为 C 变量名
- 旋转角度乘以 10（LVGL 使用 0.1° 单位）
- `scaleMode` 需要自定义实现，代码生成时输出注释提示

## 11. LVGL API 映射

### 创建函数

| 版本 | API |
|---|---|
| LVGL v9 | `lv_image_create(parent)` |
| LVGL v8 | `lv_img_create(parent)` |

### 关键 API

| API (v9) | API (v8) | 说明 |
|---|---|---|
| `lv_image_create(parent)` | `lv_img_create(parent)` | 创建图片对象 |
| `lv_image_set_src(img, src)` | `lv_img_set_src(img, src)` | 设置图片源 |
| `lv_image_set_rotation(img, angle)` | `lv_img_set_angle(img, angle)` | 设置旋转角度（0.1° 单位） |
| `lv_image_set_scale(img, zoom)` | `lv_img_set_zoom(img, zoom)` | 设置缩放（256 = 100%） |
| `lv_obj_set_pos(img, x, y)` | 同左 | 设置位置 |
| `lv_obj_set_size(img, w, h)` | 同左 | 设置尺寸 |
| `lv_obj_set_style_bg_opa(img, opa, sel)` | 同左 | 设置背景不透明度 |

### 图片源声明宏

| 版本 | 宏 | 说明 |
|---|---|---|
| LVGL v9 | `LV_IMAGE_DECLARE(var_name)` | 声明外部图片 C 数组 |
| LVGL v8 | `LV_IMG_DECLARE(var_name)` | 声明外部图片 C 数组 |

## 12. 设计注意事项

1. **图片资源管理**：编辑器使用 `resourceStore` 管理图片资源。每个图片资源包含 `id`、`name`、`cArrayName`（C 数组变量名）和 `data`（base64/data URL）。`props.src` 存储的是资源 ID 或名称，代码生成时转换为 C 数组引用。

2. **v8/v9 API 差异**：图片组件是 v8 和 v9 之间 API 差异最大的组件之一。代码生成器通过 `options.lvglVersion` 判断使用哪套 API。关键差异：
   - 创建：`lv_img_create` → `lv_image_create`
   - 设置源：`lv_img_set_src` → `lv_image_set_src`
   - 旋转：`lv_img_set_angle` → `lv_image_set_rotation`
   - 缩放：`lv_img_set_zoom` → `lv_image_set_scale`
   - 声明宏：`LV_IMG_DECLARE` → `LV_IMAGE_DECLARE`

3. **WASM 预览限制**：当前 WASM 预览中图片源处理尚未完全实现（`create_img` 函数中标注了 TODO）。图片在 WASM 预览中仅显示为空的 image widget。

4. **画布可见性**：当 `bgColor` 为 transparent 且无图片源时，编辑器画布自动回退背景为 `#f0f0f0`，确保图片占位区域可见可交互。

5. **图片缓存**：简易预览使用 `imageCache`（Map）缓存已加载的 `HTMLImageElement`，避免每次重绘时重新加载图片。

6. **旋转单位**：LVGL 使用 0.1° 为旋转单位。编辑器中 `rotation` 属性使用度为单位，代码生成时自动乘以 10。

7. **缩放模式**：`scaleMode`（`cover`/`contain`）在 LVGL 中没有直接对应的 API，需要自定义实现。代码生成时输出注释提示用户手动处理。

8. **图片声明**：代码生成时，使用到的图片资源会在文件顶部生成 `LV_IMAGE_DECLARE`（v9）或 `LV_IMG_DECLARE`（v8）声明。只声明实际使用的图片资源（通过 `collectUsedImages` 函数过滤）。
