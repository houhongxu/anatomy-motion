# 验证记录 / Validation record

## Cocos 历史基线 / Historical Cocos baseline

以下为重构前证据，当前 React 验收见文末。/ The following evidence predates the refactor; current React acceptance is recorded below.

### 自动检查 / Automated checks

- 官方 Cocos Creator 3.8.8 Web Desktop 构建成功（退出码36），官方声明文件严格类型检查通过。/ Official Cocos Creator 3.8.8 Web Desktop build succeeded (exit 36), with strict checking against official declarations.
- 后端6项、前端10项、学习目录8项测试通过；617个网格、2,865,336个三角形通过模型校验。/ Six backend, ten frontend and eight learning-data tests passed;617 meshes and2,865,336 triangles passed model validation.
- 学习目录32组、25动作、10类损伤，精确关联110个结构；来源、组织类型、稳定ID和缺失说明通过校验。/ The catalog has 32 groups,25 exercises and 10 conditions mapping 110 structures; sources, tissue types, stable IDs and missing-coverage notes passed validation.
- 原有533个网格文件逐字节保持不变；扩充肌头和肌肉分区时固定v1坐标系，避免重新居中导致整体偏移。/ All original 533 mesh files remain byte-identical; the fixed v1 frame prevents recentering shifts when adding muscle heads/zones.
- `npm run check:built --prefix creator`运行实际官方构建中的纯目录模块，验证二头肌4个、小腿6个、引体向上12个且部分覆盖。该检查捕获并修复了Cocos宽松编译将Set展开转换为concat的缺陷；双指迭代器也改为Array.from。/ `npm run check:built --prefix creator` executes the pure catalog module from the official bundle, checking biceps 4, calf 6 and pull-up 12 with partial coverage. It caught and fixed Cocos loose spread compiling Set spread as concat; two-finger iterators also use Array.from.

## 浏览器验收 / Browser acceptance

- 手机390×844和桌面1280×800采用全幅模型及按需抽屉，默认不展示并排翻译。控件移至边缘，模型使用窄边距取景。/ At 390×844 phone and1280×800 desktop, the model uses the full view with on-demand drawers and no parallel translations. Controls sit at the edges and framing uses narrow margins.
- 中英文切换保留当前结构、目录项及未保存备注；中文肌肉名和英文源名随语言显示，未核对名称保留单个源英文名。/ Switching language preserves the structure, catalog entry and unsaved notes; reviewed Chinese labels and English source names follow locale, while unreviewed names retain one English source label.
- 实际点击“杠铃弯举”保留完整人体并高亮4个结构；“小腿后侧肌群拉伤”匹配6个并展示NHS来源；“引体向上”匹配12个并明确标出背阔肌缺失。/ Clicking Barbell Bicep Curl retained the whole body and highlighted 4 structures; Calf Strain matched 6 and showed its NHS source; Pull-Up matched 12 and explicitly disclosed missing latissimus dorsi.
- 前一轮已验证账户注册、肌肉／肌腱日志创建、编辑、确认删除和刷新持久化；几何点击、旋转和缩放已通过。测试使用独立端口与数据库。/ Previous acceptance confirmed registration, muscle/tendon record creation, editing, confirmed deletion and reload persistence, plus mesh picking, orbit and zoom. Tests use a separate port and database.

## 限制 / Limits

以上为桌面浏览器及手机尺寸模拟，不等于iOS／Android真机认证。真实多点触摸、软键盘、安全区、帧率、峰值内存及蜂窝网络仍需真机验证。部分肌肉与肌腱缺少来源网格，条目会显示部分覆盖；关联仅用于解剖学习，不提供诊断或治疗建议。

These are desktop browser and phone-sized checks, not physical iOS/Android certification. Hardware multi-touch, keyboards, safe areas, frame rate, peak memory and cellular loading still need device testing. Some muscles/tendons lack source meshes and are explicitly marked as partial coverage; associations teach anatomy and do not provide diagnosis or treatment advice.

## 皮肤穴位经络增量 / Skin and meridian increment (2026-10-28)

- Cocos Creator 3.8.8 官方构建退出码36，官方声明类型检查与37项部署回归通过。实际官方 bundle 检查执行皮肤分块、十四条经络生成和穴位选择辅助逻辑；不将构建成功等同于视觉验收。/ The official Cocos Creator 3.8.8 build exited36; official declaration checking and37 deployment regression tests passed. Bundle checks execute skin partitioning, all fourteen route meshes and selection helpers; build success does not imply visual acceptance.
- 浏览器交互验证了ST36左右检索、LI经络筛选、LI4定位、独立皮肤／经络开关、详情来源、中英文切换，以及返回杠铃弯举仍匹配4个结构。390×844和1280×800尺寸下检查了对应交互。/ Browser interactions verified ST36 side-specific search, LI filtering, LI4 selection, independent skin/meridian toggles, detail sources, locale switching and returning to the biceps curl with4 matches, at390×844 and1280×800 viewport sizes.
- 本轮浏览器截图接口不可用，因此尚未完成三维覆盖层的像素级视觉验收、直接点选画布或真机验证；列表交互和官方编译模块检查不替代这些检查。/ The browser screenshot interface was unavailable, so pixel-level3D overlay inspection, direct canvas picking and physical-device validation remain unverified; list interactions and compiled-module checks do not replace them.

- 最终测试：后端6项、前端19项、学习映射8项、穴位数据6项全部通过；617个原解剖网格校验通过，8674个经络采样点与线段中点通过贴肤及外侧检查。/ Final tests passed:6 backend,19 frontend,8 learning-mapping and6 acupuncture-data checks, plus617 original anatomy meshes and surface/outward checks of8674 route samples and their segment midpoints.

## React 重构验收 / React refactor acceptance (2026-10-28)

- 最终检查：后端8项、React逻辑22项、学习映射8项、穴位6项、部署37项通过，TypeScript与生产构建通过。40组资源验收检查148个结构、原620个文件完整性、精确白名单、GLB压缩及稳定坐标；生成两次结果一致。/ Final checks passed: 8 backend, 22 React logic, 8 learning, 6 acupuncture and 37 deployment tests, TypeScript checking and production build. Asset acceptance verifies 40 groups/148 structures, 620 original file hashes, the exact allowlist, compressed GLBs and stable coordinates; repeated generation is deterministic.
- 低模人体49,776字节、10,000三角形；首屏低模加56个浅层结构共3,648,000字节（逐文件gzip共2,878,589字节）。全部新几何7,158,528字节。上述统计不含JavaScript、目录及协议开销，不代表真机加载耗时。/ Low-poly body: 49,776 bytes and 10,000 triangles. Initial body plus 56 superficial structures: 3,648,000 bytes (2,878,589 bytes summed per-file gzip); all new geometry: 7,158,528 bytes. These exclude JavaScript, catalogs and transport overhead and are not device timing measurements.
- 手机尺寸390×844交互检查：新背阔肌选择、注册登录、记录创建/修改/刷新持久化、删除确认取消、中英文切换保留未保存备注、引体向上关联、肩袖病症、LI经络筛选/LI4左侧详情、独立皮肤开关，以及腰方肌自动选择躯干并启用深层。使用隔离端口3001及临时SQLite，不改预览用户记录。/ At 390×844, UI checks covered new latissimus selection, registration/sign-in, record creation/edit/reload persistence, cancellation of deletion confirmation, locale changes preserving unsaved notes, pull-up associations, a rotator-cuff condition, LI filtering/left LI4 details, independent skin toggle and quadratus-lumborum selection enabling the torso deep layer. Tests used isolated port3001 and temporary SQLite, without modifying preview user records.
- 桌面1280×800打开侧栏时画布为928×646，无横向溢出；手机390×844打开抽屉时画布为390×356。/ With panels open, the canvas measured928×646 at1280×800 desktop and390×356 at390×844 phone size, without horizontal overflow.
- 浏览器截图接口不可用，未完成像素级三维视觉、画布直接点选及真实手机触控/帧率/峰值内存验收；列表交互、几何解析及自动测试不替代这些检查。Three.js独立包仍约939kB（gzip254kB），需继续关注低端手机解析成本。/ Browser screenshots were unavailable, so pixel-level 3D inspection, direct canvas picking and physical-device touch/frame-rate/peak-memory acceptance remain unverified. List interactions, geometry parsing and automated checks are not substitutes. The separate Three.js chunk remains about939kB (254kB gzip), leaving low-end-device parsing cost to measure.
- 全部40个肌肉组已有真实模型；独立肩袖肌腱、肱二头肌长头腱及股四头肌腱仍缺来源资产。左腰方肌源网格少量顶点跨中线，保持原几何并记录于资源说明；不声称临床校核。动作播放保持独立PR，不混入本次重构。/ All 40 muscle groups have real geometry. Separate rotator-cuff, long-head-biceps and quadriceps tendon meshes remain unavailable. A few source left-quadratus-lumborum vertices cross the midline; original geometry is preserved and disclosed in asset documentation, without claiming clinical review. Animation playback remains a separate PR.

## 统一图谱与双向关联 / Unified atlas and bidirectional links (2026-10-29)

- 全量最终验收通过：后端8项、网页34项、学习资料23项、穴位6项、部署37项；类型检查、生产构建、40肌群/148结构及原620文件完整性通过。`prepare-learning.py` 改为验证入口，执行前后目录字节哈希不变，避免旧生成表覆盖人工维护资料。/ Final acceptance passed:8 backend,34 web,23 learning-data,6 acupuncture and37 deployment tests, type checking, production build,40-group/148-structure and620 original-file integrity checks. `prepare-learning.py` now validates; catalog hashes remain identical before/after execution, preventing legacy generation tables from overwriting curated data.
- 分类共59条：健身29、拉伸10、西医14、中医/补充资料6；35个学习组关联122个源结构、11个穴位代码。反查由同一目录的明确结构ID和穴位代码计算；不以空间相邻猜测关系，不为纯穴位症状编造肌肉关联。/ The59 entries comprise29 fitness,10 stretching,14 Western and6 TCM/complementary entries;35 learning groups reference122 source structures and11 point codes. Reverse links use the same explicit IDs/codes, never spatial-nearness guesses or invented muscle associations for point-only symptoms.
- 390×844集中交互：统一搜索LI4→左合谷详情→头痛条目→右合谷；搜索腓肠肌→健身/拉伸/西医反查→直膝拉伸→比目鱼肌；叠加预设保留所选深层、透明度30%调至35%、手动关闭深层后英文切换仍保留状态。西医筛选显示14条。选中详情位于面板顶部并聚焦；底部仅图谱/学习/记录三栏。1280×800时侧栏打开画布928×646，无横向溢出。/ A concentrated390×844 session verified LI4 search→left Hegu→headache entry→right Hegu; gastrocnemius→fitness/stretching/Western reverse links→straight-knee stretch→soleus; overlay preserving selected deep anatomy, opacity30%→35%, manual deep-layer disabling and English state preservation. Western filtering shows14 entries. Selection details are placed/focused at the panel top, with only Atlas/Learn/Records navigation. At1280×800, canvas size is928×646 with the panel open and no horizontal overflow.
- 浏览器未报告控制台错误；截图仍无法获取，因此未完成叠加层像素视觉、画布直接点选或真机触控/性能验收。测试没有写入正式记录数据库。来源核查边界（包括HKBU搜索索引证据）见学习来源文档。/ No browser console errors were reported. Screenshot capture remained unavailable, so pixel-level overlay inspection, direct canvas picking and physical-device touch/performance are unverified. No production journal data was written. Source-verification limits, including HKBU indexed evidence, are recorded in the learning-source document.

## 选择范围与详情侧栏修复 / Selection scope and detail sidebar fix (2026-10-29)

- 选择只追加结构，不替换当前浏览范围；取消、同结构再次点选、肌群到具体侧别及深层按需加载由实际状态转换与资源规划测试覆盖。全目录移至动作与病症；图谱仅当前详情、关联与折叠图层。肌群必须先选择具体结构才能记录酸痛。 / Selection adds structures without replacing the browsing scope. Actual state-transition and resource-planning tests cover clearing, repeated mesh selection, group-to-sided-structure selection and on-demand deep loading. Complete directories live in Learn; the atlas contains current details, related entries and collapsed layer controls. Recording from a group requires selecting a specific structure first.
- 最终验收：后端8、网页42、学习资料23、穴位6、部署37项测试通过；类型检查、构建及40组/148结构资源验收通过。 / Final acceptance passed: 8 backend, 42 web, 23 learning-data, 6 acupuncture and 37 deployment tests, type checking, build and 40-group/148-structure asset validation.
- 手机390×844验证肌群目录检索、腓肠肌到左侧具体结构、取消选择、LI4目录到左合谷详情与关联、返回全身和英文切换；无横向溢出、无控制台错误。截图接口仍不可用，直接画布点选及像素视觉未验收；网格回调接线经代码审查，选择后保留其他结构由回归测试确认。使用隔离数据库，验收后停止临时服务。 / A 390×844 session verified muscle-directory search, gastrocnemius-to-left-sided structure, clearing, LI4-directory-to-left-Hegu details and relations, full-body restore and English switching, with no horizontal overflow or console errors. Screenshot capture remained unavailable; direct canvas picking and pixel visuals remain unverified. Mesh callback wiring was reviewed and preservation of other structures is covered by regression tests. An isolated database was used and the temporary server was stopped afterward.
