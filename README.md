# 人体运动图谱 / Anatomy Motion

手机浏览器优先的 React + Three.js / React Three Fiber 三维图谱。以完整人体为中心，提供40个肌肉／肌群目录、相关肌腱、动作与病症定位、皮肤穴位经络和私人酸痛记录。

A mobile-first React + Three.js / React Three Fiber atlas centered on a complete body, with40 muscle/group entries, associated tendons, exercise/condition localization, surface points/meridians and private soreness records.

## 浏览与加载 / Viewing and loading

- 先显示低精度完整人体，随后渐进加载主要浅层肌肉；区域和深层结构按需下载独立压缩GLB，不预取目录外精细肌肉。
- 点击动作或病症只加载关联白名单结构，始终保留全身背景；关联用于解剖学习，不能判断疼痛病因。
- 肌肉与穴位合并为“人体图谱”，支持常驻的肌肉／穴位／叠加预设、独立图层及皮肤透明度（桌面侧栏、手机横栏，关闭详情仍可操作）；皮肤仍按需加载。“动作与病症”集中提供动作、病症、肌肉/肌腱和穴位目录；人体图谱侧栏显示当前选择的详情与关联项目。选择不缩小浏览范围，并支持取消选择、返回全身。14类经络、56穴位代码／104侧别点仍未经专业审核。
- 学习目录区分健身／拉伸、西医／中医。肌肉与穴位详情反查有来源的相关条目，条目可返回对应结构或穴位；没有依据的关联明确留空，中医分类表示传统或补充医学资料，不代表病症只属于某一医学体系。
- 旋转、缩放、点选高亮及正背侧视图；静止时按需渲染。亮色布局，手机与PC尽量保留模型空间，中英文单语言切换。
- 注册／登录、肌肉和肌腱左右侧每日酸痛记录、历史日期筛选、编辑、确认删除。复用原Express/SQLite API、会话和稳定结构ID；旧目录外记录可管理，但不会因此下载其模型。

- Show a low-detail whole body first, then progressively load major superficial muscles. Download independent compressed GLBs for requested regions/depths, without prefetching out-of-scope fine muscles.
- Exercise/condition selection loads only mapped whitelist structures while retaining whole-body context. Associations explain anatomy, not pain causes.
- Muscles and acupoints share one atlas with persistent muscle/point/overlay presets, independent layers and skin opacity (a desktop side toolbar and mobile horizontal bar, available even with details closed). Skin still loads on demand. The Actions & Conditions section contains exercise, condition, muscle/tendon and acupoint directories; the atlas sidebar shows only current details and related entries. Selection preserves the browsing scope, with clear-selection and full-body controls. The14 meridian categories and56 point codes/104 sided instances remain professionally unreviewed.
- Learning separates fitness/stretching and Western/TCM references. Muscle and point details show sourced related entries, with links back to anatomy or points. Unsupported associations remain empty; TCM identifies a traditional/complementary framework, not exclusive ownership of a symptom.
- Orbit, zoom, selection, highlights and front/back/side views; demand rendering while idle. Light model-first layouts and one UI language at a time on phone and desktop.
- Account authentication, side-specific daily muscle/tendon journals, date filters, editing and confirmed deletion reuse Express/SQLite APIs, sessions and stable IDs. Older out-of-scope records stay manageable without downloading their models.

## 数据边界 / Data boundaries

40个条目不等于40个文件，左右侧及肌群内部分肌肉保持独立ID。新增网格、分包、压缩统计与再生成见 [Web资源说明 / Web assets](docs/WEB_ASSETS.md)。原617网格保留为来源和历史兼容资料，不随新运行时发布。基础全身轮廓保留，脸部、手指、足趾等精细肌肉不进入新加载白名单。缺少独立资产的肌腱明确标注，不能用肌腹冒充。

Forty catalog entries are not forty files: sides and component muscles retain distinct IDs. See [Web assets](docs/WEB_ASSETS.md) for provenance, packaging, measured sizes and regeneration. Original617 meshes remain source/history material and are excluded from the new runtime image. Whole-body context stays; fine face/finger/toe muscles are outside the whitelist. Missing independent tendon meshes are disclosed rather than substituted with muscle bellies.

当前目录含29个健身动作、10个拉伸动作、14个西医病症和6个中医／补充医学症状条目。各分类条目与关联依据见 [来源 / Sources](docs/LEARNING_SOURCES.md)；穴位方法见 [穴位与经络 / Surface layer](docs/ACUPUNCTURE.md)。学习资料直接维护 `models/learning.json`，`scripts/prepare-learning.py` 仅校验、不再覆盖目录。动作动画继续单独维护，本次不将静态模型宣称为骨骼绑定动画。

The catalog contains29 fitness exercises,10 stretches,14 Western conditions and6 TCM/complementary symptom entries. Category entries and associations retain their [sources](docs/LEARNING_SOURCES.md). See the [surface-layer guide](docs/ACUPUNCTURE.md) for points/meridians. Maintain learning data directly in `models/learning.json`; `scripts/prepare-learning.py` only validates and never overwrites it. Animation remains separate; static anatomy meshes are not presented as rigged animated assets.

## 本地开发 / Local development

在WSL Ubuntu的项目目录运行，推荐Node22；不再需要Windows Cocos编辑器构建网页。/ Run in the WSL Ubuntu project directory, preferably with Node22. Web builds no longer require the Windows Cocos editor.

```bash
npm run setup
npm run typecheck
npm test
npm run build
npm start
# http://localhost:3000
```

开发热更新可另开终端运行 `npm run dev`；后端仍需运行，APP_ORIGIN应与浏览器访问地址一致。生产默认静态目录是 `web/dist`，可用WEB_ROOT覆盖。数据库为 `server/data/anatomy.sqlite`，不入Git。/ Run `npm run dev` in another terminal for hot reload, with the backend running and APP_ORIGIN matching the browser origin. Static output defaults to `web/dist`, overridable by WEB_ROOT. The private SQLite database is excluded from Git.

## 许可和维护 / Licensing and maintenance

代码MIT；BodyParts3D4.0派生模型CC BY4.0，新增3.0派生模型遵循其CC BY-SA2.1JP，分别保留署名及来源。用户记录不是开源数据。/ Code is MIT; BodyParts3D4.0 derivatives retain CC BY4.0 and3.0 supplements retain CC BY-SA2.1JP, with distinct attribution and provenance. Private journals are not open-source data.

[Cocos旧实现 / Legacy Cocos](creator/README.md)保留供对照，不再作为默认构建；旧Release校验脚本保留用于旧版本恢复。当前预览仍使用独立Namespace、固定提交镜像digest及原受限部署通道。见 [部署说明 / Deployment](docs/DEPLOYMENT.md) 与 [验证记录 / Validation](docs/VALIDATION.md)。

The [legacy Cocos implementation](creator/README.md) remains for comparison, outside the default build; its release verifier is retained for historical recovery. Preview retains namespace isolation, fixed commit/image digests and the restricted deployment bridge. See [deployment](docs/DEPLOYMENT.md) and [validation](docs/VALIDATION.md).
