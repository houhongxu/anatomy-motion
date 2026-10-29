# 皮肤穴位与经络示意 / Skin, acupoints and meridian illustrations

## 中文

此层提供 **14 类经络的部分体表示意**：十二正经各有独立左右分支，任脉、督脉各有一条中线分支，共 26 条分支。首版包含 56 个不同标准穴位代码，展开侧别后为 104 个点实例。它不是 361 穴全量图谱，也不是完整循行、内部通路、个体定位或临床精度模型。坐标与连线由项目原创绘制，**未经针灸或解剖专业人员审核**。不提供针刺、诊断或治疗建议；专业审核事项仍待完成。

### 来源与许可

- 皮肤来自 [BodyParts3D 4.0 官方下载](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)。来源 IS-A 表中 `FMA7163`（skin）唯一对应 `FJ2810`；ZIP 成员为 `isa_BP3D_4.0_obj_99/FJ2810.obj`。保留 CC BY 4.0 许可与署名：BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International。
- 穴位代码、名称与大致解剖区域依据 [WHO 2008 官方书目](https://library.wpro.who.int/cgi-bin/koha/opac-detail.pl?biblionumber=11227)以及实际查阅的 [WHO 原出版物 2009 更新重印副本（MEDBOX）](https://www.medbox.org/dl/627a4de115110145a1723f64)。官方书目用于出版物身份核对；逐点核对来自原书副本的正文，而非仅凭书目。
- 该副本封面注明 updated and reprinted 2009，版权页为 © WHO 2008；缓存 PDF 的 SHA256 为 `c9d4095383c636f85e61b5bc5d7631a658308c0336e8f691b0eb29f517d5bf5b`。不将 WHO PDF、图像或长段定位原文收入仓库，不从其他坐标仓库导入数据。
- `region` 与 `landmark` 是简短原创标签；`name.en` 使用拼音名称。`sourcePages` 记录 2009 副本的**印刷页码**，不是 PDF 文件页序号。`sourceIds` 区分官方书目与实际查阅副本。PC8 采用原书首先列出的第二、三掌骨间区域；书中另列替代位置，此示意不解决专业定位争议。
- 书籍核对只支持命名和区域参考，**不代表 WHO 审核、提供或认可本项目三维坐标**。皮肤与原创示意数据的来源、权利边界不同；皮肤始终保留来源许可和署名。

### 数据、坐标与绘制方法

`models/skin.json` 是独立的 `positions / normals / indices` 网格，包含来源全部 102467 个顶点、203382 个三角面，约 9.68 MB。索引超过 65535，消费端需支持 32 位索引或按三角面无损分块；不能截断为 16 位。法线按三角面积加权计算。JSON SHA256 写入 `acupuncture.skin.sha256`，来源 OBJ 与 ZIP 摘要分别写入 `sourceObjSha256`、`sourceArchiveSha256`。

沿用 `bodyparts3d-v1` 固定参考系：

```text
center = [0.010500000000007503, -108.08885000000001, 781.72995]
scale  = 0.0009946871419309136
[x, y, z] = [(sourceX-centerX)*scale,
             (sourceZ-centerZ)*scale,
            -(sourceY-centerY)*scale]
```

在该真实模型中，**+X 为身体左侧，+Y 向头侧，+Z 为前方**。方向通过现有骨肌网格核实：胸大肌胸肋部中心 z≈+0.0575，斜方肌横部 z≈−0.091；髌骨在膝前，腓肠肌在小腿后侧；趾骨位于足部 +Z 端。手部另核对掌侧拇短展肌与背侧指伸肌，以及第二掌骨、小指远节指骨，避免仅按全身方向猜测局部朝向。

来源包含内外两个主要皮肤壳和小组件。外壳有 54949 个顶点、有向体积为正；内壳约向内偏移 0.002。渲染资产保留完整来源几何，布点与路径仅使用外壳，避免在内外层间切换。约 0.002 是显示单位的外偏量，不能换算为任何人的临床定位误差或针刺深度。

1. 根据原书的大致区域、实际模型姿势与骨肌地标人工选择原创种子；每侧独立投到外壳顶点，不直接复制或镜像最终坐标。
2. 双侧路径沿外壳三角网格边计算 A* 路径；精确重合 OBJ 接缝只在路径图中连接，皮肤网格不改动。原创控制点约束较长路段，避免左右串线或走腿间捷径。
3. 任督从外壳与 x=0 矢状面的精确交线生成。法线外偏可能产生很小的 x 分量，所以最终显示位置近中线而非所有 x 严格等于 0。
4. 沿路线约每 0.003 单位采样，在所在边／面上投影并向外偏移约 0.002。凹折处平均顶点法线可能进入邻近折面，生成器会在局部最近三角面重新外偏；当前有 4 次这种校正。
5. 当前共 8674 个路径采样点，`acupuncture.json` 约 328 KB。连线仅连接这批代表点的大致体表区域，不补造未收录穴位，也不表示经络完整或内部走行。

`models/acupuncture.json` 的主要字段为 `version`、`coordinateSpace`、`reviewStatus`、`sources`、`skin`、`meridians`、`points`。每点包含稳定 `id`、`code`、双语名称／区域／体表标志、`meridianId`、`side`、`position`、`sourceIds`、`sourcePages` 和 `reviewStatus`。全局及逐点状态均为 `illustrative-unreviewed`。

### 生成、验证与兼容性

在仓库根目录运行：

```bash
# 先通过现有模型流程取得 .cache/bodyparts3d-complete.zip 和 isa_element_parts.txt
python3 scripts/prepare-acupuncture.py
python3 scripts/test-acupuncture.py
```

生成器先校验固定上游 ZIP SHA256 及皮肤分类唯一性，只写两个独立资产；并对既有两个 manifest 和 617 份网格做生成前后摘要比较。首版 619 份原文件全部保持不变。穴位与皮肤不加入原肌肉／肌腱／骨骼清单，不改变酸痛记录的结构 ID、服务器允许范围或既有记录。

常规测试只依赖已提交文件，不要求 CI 下载上游缓存。有缓存时额外核对 ZIP 和原始 OBJ 摘要。6 项定向测试覆盖几何与摘要、来源、唯一 ID／引用／名称、14 类与 26 条独立分支、侧别与包围盒、前后／手掌手背／膝前腘窝地标、全部路径节点和线段中点的贴肤与外侧性，以及记录清单隔离。当前最大采样点表面距离约 0.0020001，线段中点容差为 0.0023；这些是显示几何检查，不能证明临床定位正确。

## English

This layer is a **partial surface illustration of 14 meridian categories**: separate left/right branches for the twelve regular meridians and one midline branch each for the Conception and Governor vessels, totalling 26 branches. The initial set has 56 distinct standard point codes and 104 sided instances. It is not a complete 361-point atlas, a full channel course, an internal pathway, an individualized locator or a clinically accurate model. Coordinates and lines are original project illustrations and **have not been reviewed by an acupuncture or anatomy professional**. No needling, diagnosis or treatment instructions are provided. Professional review remains outstanding.

### Sources and licensing

The skin is the real `FJ2810` mesh, uniquely assigned to skin concept `FMA7163` in the source IS-A table, from [BodyParts3D 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html), ZIP member `isa_BP3D_4.0_obj_99/FJ2810.obj`. It retains CC BY 4.0 and the attribution “BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International”.

The [official WHO 2008 catalogue](https://library.wpro.who.int/cgi-bin/koha/opac-detail.pl?biblionumber=11227) verifies publication identity. Point codes, names and broad regions were checked against the text of the [WHO publication, updated and reprinted 2009, available through MEDBOX](https://www.medbox.org/dl/627a4de115110145a1723f64). The consulted copy bears © WHO 2008; its PDF SHA256 is `c9d4095383c636f85e61b5bc5d7631a658308c0336e8f691b0eb29f517d5bf5b`. The repository does not redistribute the book, its illustrations or long location passages, and imports no third-party point coordinates.

`region` and `landmark` are short original labels; English names use pinyin. `sourcePages` refers to **printed page numbers** in the consulted 2009 copy, not PDF page indices. `sourceIds` distinguishes the catalogue from the consulted text. PC8 uses the second/third-metacarpal region listed first in that publication; the book also describes an alternative, and this illustration does not resolve professional location disputes. Source checking does not mean WHO supplied, reviewed or endorsed these 3D coordinates. The skin retains its separate source licence and attribution.

### Geometry and original layout

`models/skin.json` contains the full source geometry with 102467 vertices and 203382 triangles, about 9.68 MB, using `positions / normals / indices` and area-weighted normals. Consumers must support 32-bit indices or split triangles without loss; truncating to 16 bits is invalid. The asset hash is recorded in `skin.sha256`, with separate OBJ and archive hashes.

The fixed `bodyparts3d-v1` transform is shown above. **+X is anatomical left, +Y is superior and +Z is anterior.** Existing meshes corroborate this: the sternocostal pectoralis major centroid has z≈+0.0575 and transverse trapezius z≈−0.091; patella/gastrocnemius distinguish anterior knee/posterior leg, and toes extend toward +Z. Palmar abductor pollicis brevis, dorsal extensor digitorum, the second metacarpal and little-finger distal phalanx provide additional local hand checks.

The source has two major skin shells plus small components. Only the outer shell, with 54949 vertices and positive signed volume, is used for positioning. The inner shell is roughly 0.002 inward. Full source geometry is retained for rendering. The approximately 0.002 outward display offset is neither a clinical location error nor a needling depth.

Original seeds are chosen using the reference regions, actual model posture and bone/muscle landmarks. Each side is independently projected onto the outer shell. Bilateral paths use A* along outer-surface mesh edges, with original intermediate guides and graph-only welding of coincident seams. Ren/Du use the exact outer-surface intersection with x=0. Outward normals can add a small x component to their final display positions.

Paths are sampled at approximately 0.003 units and offset outward by approximately 0.002. Local closest-triangle corrections prevent averaged normals from entering adjacent folds; the current generation performs four corrections. The resulting 8674 route samples occupy about 328 KB. Lines are original surface connections between selected regions; they neither invent omitted points nor represent full or internal channel courses.

Each point has a stable ID/code, bilingual name/region/landmark, meridian and side, position, source references, printed pages and `illustrative-unreviewed` status. The global status is also `illustrative-unreviewed`.

### Regeneration and checks

Run the two commands above after obtaining the existing source ZIP and IS-A cache through the model workflow. The generator checks the fixed archive hash and unique skin classification, writes only the two separate assets, and compares the two existing manifests plus 617 meshes before/after generation. All 619 original files remain unchanged. Skin and point IDs are excluded from the existing record catalogue; soreness-record IDs, server eligibility and existing records remain unchanged.

The six targeted tests require only committed assets. If a source cache exists, they additionally verify archive/OBJ hashes. They cover mesh geometry/hashes, provenance, unique IDs and references, reviewed names, all 14 categories/26 separate branches, sides/bounds, front/back and local hand/knee landmarks, every route sample and segment midpoint against the outer skin, and record-catalogue separation. Current maximum sample-to-surface distance is about 0.0020001; segment midpoints use a 0.0023 tolerance and an outward-side check. These establish display geometry integrity, not clinical point accuracy.
