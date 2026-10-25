# Anatomy Motion · Cocos Creator 前端 / Cocos Creator frontend

## 中文

使用 **Cocos Creator 3.8.8** 打开本目录。入口场景为 `assets/scenes/Atlas.scene`，`AtlasBootstrap` 组件创建三维相机、灯光、解剖网格和中英双语 DOM 界面。三维渲染使用 Cocos；DOM 用于搜索、账户和疼痛记录表单。

场景必须保留对 `assets/materials/Tissue.mtl` 的显式引用。该材质引用官方 `builtin-standard` effect，确保编辑器构建包含所需着色器；仅在代码中使用 effect 名称无法保证其进入构建。每个结构复制基础材质，并通过 `mainColor` 设置颜色。

模型由后端同源提供：`/models/manifest.json` 包含 `structures` 数组，每项的 `file` 相对 `/models/` 解析。网格 JSON 包含 `positions`、`normals` 和 `indices`，使用 Y 向上、原点居中、全身约 1.7 米的坐标。账户和记录接口位于 `/api/`。请通过项目后端访问构建产物，以便使用同源模型和会话 cookie。

在 WSL/Linux 中运行：

```bash
cd creator
npm ci
npm test
COCOS_CC_DECLARATION=/path/to/Cocos/engine/bin/.declarations/cc.d.ts npm run typecheck
npm run format:check
```

`COCOS_CC_DECLARATION` 必须指向官方 3.8.8 引擎声明文件。也可以设置 `COCOS_ENGINE_ROOT` 为引擎目录；编辑器已生成本项目 `temp/declarations/cc.d.ts` 时，脚本会自动使用它。缺少声明时类型检查会明确失败，不使用伪造引擎类型替代。

Linux CI 可运行精确射线拾取、包围盒、本地日期及透视取景的纯逻辑测试；这些测试不启动 Cocos 编辑器，也不证明 WebGL 渲染成功。类型检查需要另外提供官方声明。完整交付仍需使用 Cocos Creator 3.8.8 构建 `web-desktop`，并验证实际模型、取景、交互和账户记录流程。不要跨 Windows/WSL 共用 `node_modules`。

模型来源为 DBCLS BodyParts3D；当前来源许可为 CC BY 4.0。显示层级用于组织筛选，未经临床验证；本应用用于学习和个人记录。

## English

Open this directory with **Cocos Creator 3.8.8**. The entry scene is `assets/scenes/Atlas.scene`. Its `AtlasBootstrap` component creates the camera, lights, anatomy meshes and bilingual DOM interface. Cocos handles 3D rendering; the DOM provides search, account and pain-record forms.

Keep the scene's explicit reference to `assets/materials/Tissue.mtl`. This material references the official `builtin-standard` effect so editor builds include its shaders. Referring to an effect only by name in runtime code does not guarantee inclusion. Each structure copies the base material and sets its color through `mainColor`.

The backend serves models from the same origin. `/models/manifest.json` contains a `structures` array; each entry's `file` resolves relative to `/models/`. Mesh JSON contains `positions`, `normals` and `indices`, with Y up, the body centered at the origin and a full-body height of approximately 1.7 meters. Account and record endpoints use `/api/`. Serve the build through the project backend for same-origin models and session cookies.

Run the commands above in WSL/Linux. `COCOS_CC_DECLARATION` must point to the official 3.8.8 engine declaration file. Alternatively, set `COCOS_ENGINE_ROOT` to the engine directory. The script also detects this project's editor-generated `temp/declarations/cc.d.ts`. Typechecking fails explicitly when declarations are unavailable; it does not substitute fabricated engine types.

Linux CI can run the pure logic tests for exact ray picking, bounds, local dates and perspective framing. These tests do not launch the editor or establish that WebGL rendering works. Typechecking additionally requires the official declarations. Complete delivery requires a Cocos Creator 3.8.8 `web-desktop` build and verification of the actual model, framing, interaction and account-record flows. Do not share `node_modules` between Windows and WSL.

Models come from DBCLS BodyParts3D; the current source uses CC BY 4.0. Display layers are organizational filters and are not clinically validated. This application supports learning and personal tracking.

## 手机优先界面 / Mobile-first interface

宽度不超过 1024 CSS 像素时使用紧凑界面，包括手机横屏、平板和较窄的应用面板。模型保持全屏主体，底部“模型／结构／记录”导航打开可关闭、可滚动的底部面板；从结构目录选择后返回模型，通过“记录”进入表单。更宽的桌面视图使用三栏浅色布局。界面采用动态视口高度、安全区间距、至少 44 像素触控目标和 16 像素表单文字；登录框可滚动。视口、可视视口和方向变化会重算取景，短横屏将视角控件移至侧边。单指旋转、双指缩放和平移保持可用，多指或取消的手势不会在结束时触发选取。

紧凑界面的实际渲染缓冲区使用 `floor(CSS 尺寸 × min(引擎 DPR, 1.5))`；DPR 下限为 1。实现通过官方 `director.root.resize` 调整交换链，并继续使用实际画布缓冲区尺寸换算选取射线。桌面保留引擎 DPR。模型请求并发仍限制为 6。降低像素数没有减少约 533 个网格、260 万个三角形或 JSON 模型的下载与解析成本；真实手机的帧率、内存、发热、触控和软键盘行为仍需设备验收。本次纯逻辑检查不代表真实手机已测试。

At widths of 1024 CSS pixels or less, the compact interface covers phones in either orientation, tablets and narrow app panels. The model remains the primary full-height view. Bottom Model / Structures / Journal navigation opens dismissible, scrollable sheets; selecting a structure returns to the model, and Journal opens its record form. Wider desktops retain a light three-column layout. The interface uses dynamic viewport height, safe-area spacing, touch targets of at least 44 pixels and 16-pixel form text. The sign-in dialog scrolls. Window, visual-viewport and orientation changes recompute framing; short landscape views move view controls to the side. Single-finger orbit and two-finger pinch/pan remain available, and multi-touch or canceled gestures do not become selections on release.

The compact rendering buffer uses `floor(CSS size × min(engine DPR, 1.5))`, with a minimum DPR of 1. The official `director.root.resize` API resizes the swapchain; picking still converts coordinates using the actual canvas buffer dimensions. Desktop keeps the engine DPR. Model request concurrency remains capped at 6. Fewer pixels do not reduce the download and parsing cost of approximately 533 meshes, 2.6 million triangles or JSON model data. Real-phone frame rate, memory, heat, touch and software-keyboard behavior still require device acceptance. Pure logic checks do not establish that real phones have been tested.
