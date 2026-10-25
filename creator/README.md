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

所有屏幕宽度均以全屏模型为主，底部“模型／探索／记录”导航打开可关闭、可滚动的抽屉；从结构目录选择后返回模型，通过“记录”进入表单。宽屏将探索和记录抽屉分别收窄到侧边，关闭后恢复完整模型空间。界面采用动态视口高度、安全区间距、至少 44 像素触控目标和 16 像素表单文字；登录框可滚动。视口、可视视口和方向变化会重算取景，短横屏将视角控件移至侧边。单指旋转、双指缩放和平移保持可用，多指或取消的手势不会在结束时触发选取。

紧凑界面的实际渲染缓冲区使用 `floor(CSS 尺寸 × min(引擎 DPR, 1.5))`；DPR 下限为 1。实现通过官方 `director.root.resize` 调整交换链，并继续使用实际画布缓冲区尺寸换算选取射线。桌面保留引擎 DPR。模型请求并发仍限制为 6。降低像素数没有减少完整解剖网格、三角形和 JSON 模型的下载与解析成本；真实手机的帧率、内存、发热、触控和软键盘行为仍需设备验收。本次纯逻辑检查不代表真实手机已测试。

Every screen width keeps the full-height model as its primary view. Bottom Model / Explore / Journal navigation opens dismissible, scrollable drawers; selecting a structure returns to the model, and Journal opens its record form. Wide screens narrow the Explore and Journal drawers to the sides; dismissing them restores the full model space. The interface uses dynamic viewport height, safe-area spacing, touch targets of at least 44 pixels and 16-pixel form text. The sign-in dialog scrolls. Window, visual-viewport and orientation changes recompute framing; short landscape views move view controls to the side. Single-finger orbit and two-finger pinch/pan remain available, and multi-touch or canceled gestures do not become selections on release.

The compact rendering buffer uses `floor(CSS size × min(engine DPR, 1.5))`, with a minimum DPR of 1. The official `director.root.resize` API resizes the swapchain; picking still converts coordinates using the actual canvas buffer dimensions. Desktop keeps the engine DPR. Model request concurrency remains capped at 6. Fewer pixels do not reduce the download and parsing cost of the complete anatomy meshes, triangle counts or JSON model data. Real-phone frame rate, memory, heat, touch and software-keyboard behavior still require device acceptance. Pure logic checks do not establish that real phones have been tested.

## 单语言与学习目录 / Single-locale UI and learning library

界面默认中文，可通过页头或登录框内的语言按钮切换英文；偏好保存在当前浏览器的本地存储中，每次只显示一种界面语言。切换时会清理旧界面的事件和样式，保留登录状态、选中结构、相机位置与缩放、面板状态和未提交的记录／登录表单值，不会自动提交表单。未经翻译复核的解剖名称保留来源英文名称和稳定 ID。

所有屏幕宽度均以模型为主，探索和记录使用可关闭抽屉。探索包含结构、动作与病症目录，数据来自同源 `/models/learning.json`。选择动作或病症仅按数据中的稳定结构 ID 匹配，保留完整人体并高亮全部已匹配结构，按全身边界取景；详情提供相关肌群、来源、部分或零覆盖提示及缺失原因。“显示全身”清除目录高亮并重置视图。学习目录选择与可记录的单个组织选择分开，不批量写入疼痛记录。病症目录只提供相关解剖背景，不提供诊断、治疗或康复建议。目录缺失时，结构浏览仍可使用。

The interface defaults to Chinese. The header and sign-in dialog provide an English/Chinese switch, persisted in browser local storage; only one interface locale is displayed at a time. Switching disposes the previous UI events and styles while preserving the session, selected structure, camera position and zoom, panel state and unsent journal/sign-in values. It does not submit forms. Anatomy names without reviewed translations retain their source English names and stable IDs.

Every screen width prioritizes the model, with dismissible Explore and Journal drawers. Explore contains Structures, Exercises and Conditions, loaded from same-origin `/models/learning.json`. Selecting an exercise or condition matches only its declared stable structure IDs, retains the whole body, highlights all available matches, and frames the full body. Details show related groups, sources, partial/zero coverage and reasons for missing coverage. Show whole body clears catalog highlighting and resets the view. Learning selections remain separate from individually recordable tissues and never create bulk pain records. Conditions provide related anatomy only, not diagnosis, treatment or rehabilitation advice. Structure browsing remains available if the learning library cannot load.

官方 Web 构建后运行 `npm run check:built`：该检查在 Node VM 中仅执行产物的纯学习目录模块，不启动引擎；使用真实目录验证肱二头肌 4 个、腓肠肌与比目鱼肌合计 6 个匹配及引体向上的部分覆盖，同时拒绝 Cocos 宽松编译器将 Set／迭代器展开错误转换为数组拼接的产物。源码 TypeScript 测试不能替代此产物检查。

After the official Web build, run `npm run check:built`. It executes only the built pure learning module in a Node VM, without starting the engine. Real catalog checks cover four biceps matches, six combined gastrocnemius/soleus matches and partial pull-up coverage. It also rejects artifacts where the Cocos loose compiler incorrectly concatenates a Set or iterator instead of expanding it. Source TypeScript tests do not replace this artifact check.
