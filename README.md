# 人体运动图谱 / Anatomy Motion

面向手机浏览器优先设计的亮色三维肌肉／肌腱图谱，使用 Cocos Creator 3.8.8，附带私人每日酸痛记录；同时支持 PC。

A light, mobile-first 3D muscle/tendon atlas built with Cocos Creator 3.8.8, with private daily soreness journals and desktop support.

## 功能 / Features

- 界面使用中英文切换，同一时刻只展示一种语言；文档仍保留双语。
- 手机和 PC 均优先保留模型空间，目录与记录面板按需打开。
- 动作与运动损伤目录保留完整人体并高亮相关肌群，附来源及模型覆盖说明；损伤关联只用于学习解剖位置，不用于自我诊断。

- The interface switches between Chinese and English, displaying one language at a time; documentation remains bilingual.
- Both phone and desktop prioritize model space with on-demand explorer and journal panels.
- Exercise and sports-injury entries retain the whole body and highlight related muscle groups with sources and coverage notes; injury associations explain anatomy and are not a self-diagnosis tool.

- 鼠标／触摸旋转、缩放和平移；正面、背面、侧面与适应视图。
- 搜索、三角形精确点击、选中高亮、聚焦、隐藏与独显。
- 肌肉表层／深层显示分组、肌腱及骨骼开关。
- 真实皮肤网格、十四经络体表示意与代表穴位；支持独立图层、经络筛选、中英文名称／编码搜索和点击定位。
- 用户名密码注册登录；按本地日期记录肌肉或肌腱、侧别、0–10 酸痛程度和备注，支持历史筛选、编辑、删除。
- 服务端 SQLite 持久化、账号数据隔离、scrypt 密码哈希、HttpOnly 会话及请求来源检查。

- Mouse/touch orbit, zoom and pan; front, back, side and fit views.
- Search, triangle-accurate selection, highlighting, focus, hide and isolate.
- Superficial/deep muscle display groups, tendon and bone toggles.
- A real skin mesh, fourteen surface-meridian diagrams and representative acupoints, with independent layers, meridian filtering, localized name/code search and selection.
- Username/password registration and login; local-date records of muscle/tendon, side, 0–10 soreness and notes, with history filters, editing and deletion.
- Server-side SQLite persistence, account isolation, scrypt password hashes, HttpOnly sessions and request-origin checks.

## 使用端与界面 / Platforms and interface

手机浏览器是主要使用端，PC 同样采用模型优先的布局。亮色界面优先保留模型视区，结构选择和日志通过底部入口打开。当前交付为 Web 应用，不包含原生安装包。模型数据仍较大，尚未进行真实手机的帧率、内存或蜂窝网络加载测试。

Phone browsers are the primary platform; desktop also prioritizes the model viewport. A light interface prioritizes the model viewport, with bottom navigation for structure selection and the journal. This delivery is a web app, not a native installable package. Model data remains substantial; real-device frame rate, memory and cellular-load testing has not yet been performed.

首批目录包含25个动作、10类损伤与劳损，来源及维护方法见 [资料说明 / Sources](docs/LEARNING_SOURCES.md)。

The initial catalog includes 25 exercises and 10 injury/overuse conditions; see [sources and maintenance](docs/LEARNING_SOURCES.md).

## 模型覆盖 / Model coverage

当前包含 617 个独立网格：407 肌肉、8 肌腱、202 骨结构，来自 DBCLS BodyParts3D 4.0。网格数量不等于独立解剖器官数量。模型不是完整肌腱全集，显示分组未经过临床审核；常用肌肉提供中文标注，未审核的条目保留来源英文名称。另提供独立皮肤网格及穴位经络示意层；体表坐标和路径尚未专业校核，不代表完整穴位集或临床定位。动作动画单独维护。

Contains 617 meshes: 407 muscle, 8 tendon and 202 bone meshes from DBCLS BodyParts3D 4.0. Mesh count is not a count of distinct anatomical organs. Tendon coverage is incomplete and display categories are not clinically reviewed; common muscles have Chinese labels, while unreviewed entries retain their source English names. A separate skin mesh and illustrative acupoint/meridian layer are also provided. Surface coordinates and paths are not professionally reviewed and do not represent a complete point set or clinical localization. Motion animation is maintained separately.

参见 [模型来源与许可 / Model provenance](docs/MODELS.md) 和 [动作与损伤资料 / Exercise and condition sources](docs/LEARNING_SOURCES.md)。穴位数据与维护方法见 [穴位与经络 / Acupoints and meridians](docs/ACUPUNCTURE.md)。

## 本地运行 / Local setup

源码、Node、依赖、测试、Git 均在 WSL Ubuntu 中执行。Windows Cocos 编辑器仅作为官方资源导入／网页构建工具，通过 UNC 路径访问同一份 WSL 源码，不共享两侧 node_modules。

Keep source, Node, dependencies, tests and Git in WSL Ubuntu. The Windows Cocos editor is used only for official asset import/web building against the same WSL source via UNC; do not share node_modules between environments.

```bash
cd /home/houhongxu/workspace/hhx/anatomy-motion
# Node.js 20+
npm run setup
npm test
```

安装官方 Cocos Creator 3.8.8，然后在 Windows PowerShell 直接运行官方编辑器命令，将可执行文件路径替换为实际安装路径。构建产物不提交 Git。

Install official Cocos Creator 3.8.8, then invoke the official editor directly in Windows PowerShell, replacing the executable path with its installed location. Generated builds are not committed.

```powershell
& 'C:\path\to\CocosCreator.exe' --project '\\wsl.localhost\Ubuntu\home\houhongxu\workspace\hhx\anatomy-motion\creator' --build 'platform=web-desktop'
```

也可以在编辑器打开 `creator` 目录并构建 Web Desktop。完成后回到 WSL：

Alternatively, open `creator` in the editor and build Web Desktop. Then return to WSL:

```bash
npm start
# http://localhost:3000
```

首次使用自行注册账号（用户名 3–32 位英文、数字或下划线，密码 10–128 字符）。未预置共享密码或管理员后门。默认数据库 `server/data/anatomy.sqlite`，已忽略于 Git。开发服务默认仅监听回环地址。

Register your own account (username: 3–32 letters, digits or underscores; password: 10–128 characters). No shared password or admin backdoor is provisioned. The default database is `server/data/anatomy.sqlite`, ignored by Git. The development service binds to loopback by default.

环境变量、接口及 HTTPS 配置见 [后端文档 / Server documentation](server/README.md)。本项目不自动部署公网服务；生产环境需 HTTPS 与匹配的 APP_ORIGIN。

See [server documentation](server/README.md) for environment variables, API and HTTPS settings. No public deployment is automated; production requires HTTPS and a matching APP_ORIGIN.

## 开发与验证 / Development and verification

`npm test` 执行后端集成测试、前端几何／日期／界面逻辑测试、全部模型哈希与网格校验及目录关联校验。Cocos 严格类型检查见 [前端说明 / Creator guide](creator/README.md)。GitHub Actions 验证这些自动化检查；官方编辑器构建和浏览器交互验收属于本地检查，不假称已在无编辑器的 Linux CI 中完成。

`npm test` runs backend integration tests, frontend geometry/date/interface tests, model digest/geometry checks and catalog-reference validation. See the [Creator guide](creator/README.md) for strict Cocos typechecking. GitHub Actions runs automated checks; the official editor build and browser acceptance are local checks, not claimed as Linux CI checks without an editor.

## 许可 / Licensing

应用代码 MIT。模型 CC BY 4.0，保留署名：BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International。用户记录不属于开源仓库内容。

Application code: MIT. Models: CC BY 4.0 with attribution: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. Private user records are not part of the open-source repository.

## K3s 预览部署 / K3s preview deployment

部署配置与维护流程见 [部署说明 / Deployment guide](docs/DEPLOYMENT.md)。预览使用独立 Namespace 和单一域名 `preview.anatomy-motion.zeropress.site`，与生产环境分离。

See the [deployment guide](docs/DEPLOYMENT.md) for configuration and maintenance. Preview uses a dedicated namespace and the single host `preview.anatomy-motion.zeropress.site`, separate from production.
