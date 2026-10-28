# 网页三维资源 / Web 3D assets

## 范围与来源 / Scope and source

`models/web/catalog.json` 是网页目录的唯一入口。40 个肌群以人工审核的原始 ID 白名单映射，左右合组；每个现有结构对应一个独立 GLB，节点名保持原 ID。只包含目录肌群与跟腱，不引入骨骼、面肌、手足细肌或动画。网页只加载低模全身皮肤及目录指定的 56 个主要浅层结构；完整皮肤和其余白名单结构按需加载。

`models/web/catalog.json` is the single entry point for the web atlas. Forty muscle groups use manually reviewed original-ID allowlists, grouping both sides. Each available structure has an independent GLB with its original ID as the node name. The output includes catalog muscles and Achilles tendons, with no bones, fine facial/hand/foot muscles, or animation. The initial view loads the low-poly full-body skin and 56 major superficial structures; full skin and other allowlisted structures load on demand.

来源为 BodyParts3D 4.0，署名：**BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International**。来源地址：https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html 。原有 v4 派生资源使用 CC BY 4.0；补充的 v3 网格使用独立的 CC BY-SA 2.1 JP 许可。输出 GLB 中保留各自版权，目录保存各自来源。

Source: BodyParts3D 4.0. Attribution: **BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International**. Source URL: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html . Existing v4-derived assets use CC BY 4.0; supplemental v3 meshes carry separate CC BY-SA 2.1 JP terms. GLBs retain their respective copyright, and the catalog records each source.

## 准确性与缺失 / Accuracy and missing structures

原始 `bodyparts3d-v1` 坐标直接保留，+Z 为前方；不会为了展示将左右结构移开。`layer` 是本网页的产品分类，独立于旧 manifest 的近似显示层次，不作为临床解剖认证。肩袖、竖脊肌、髂腰肌、梨状肌、股中间肌等深层结构不在初始加载中；浅层组中被覆盖的肱三头肌内侧头和股二头肌短头也按需加载。腕屈伸只含屈腕桡/尺肌、掌长肌、伸腕桡长/短肌、伸腕尺肌；不扩大到手指细肌。来源中两对均标为尺侧腕伸肌的结构保留各自原 ID，并用“来源网格1/2”区分；来源未指明其解剖细分，编号不代表临床分部。个体中文名称明确区分髂肌/腰大肌及腓骨长/短/第三肌，不以肌群名替代；未知译名直接保留原英文。目录显示名为准，GLB内原导出标签保持不变。

Original `bodyparts3d-v1` coordinates are preserved, with +Z anterior; left/right structures are not moved apart for display. `layer` is this web product's classification, independent of the legacy manifest's approximate display grouping, and is not clinical certification. Rotator cuff, erector spinae, iliopsoas, piriformis, vastus intermedius, and other deep structures are excluded from the initial load; the covered medial triceps heads and short biceps femoris heads within superficial groups also load on demand. Wrist groups include only flexor carpi radialis/ulnaris, palmaris longus, extensor carpi radialis longus/brevis, and extensor carpi ulnaris, without fine finger muscles. Both source pairs labelled extensor carpi ulnaris retain their own IDs and are distinguished as source meshes 1/2. The source does not specify anatomical subdivisions, and these numbers do not represent clinical parts. Individual Chinese names distinguish iliacus/psoas major and fibularis longus/brevis/tertius instead of substituting group names; unknown translations retain the original English. Catalog display names are authoritative; original labels embedded in existing GLBs remain unchanged.

原始 617 个结构中没有背阔肌、腹直肌、腹内斜肌和腰方肌；本次从官方 BodyParts3D 3.0 的 OBJ 99% 档案补齐这四组、左右共八个真实网格。新增稳定 ID 使用 `BP3D3_FMAxxxxx` 前缀，避免与旧 ID 冲突；原 OBJ、逐文件 SHA256、ZIP 条目 CRC、官方 URL 与 HTTP ETag 保存在 `tools/models/supplemental`。分段提取不能验证整个 ZIP 的 SHA256，因此不声称拥有完整档案哈希。补充资源署名 BodyParts3D / The Database Center for Life Science，官方许可说明见 [v3 README](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README.html)，并按 [CC BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/) 保留许可；不能将其标成 v4 的 CC BY 4.0。

The original 617 structures lack latissimus dorsi, rectus abdominis, internal oblique, and quadratus lumborum. Eight real left/right meshes from the official BodyParts3D 3.0 OBJ 99% archive complete these four groups. Stable IDs use the `BP3D3_FMAxxxxx` prefix to avoid collisions. Original OBJs, per-file SHA256, ZIP entry CRC, official URL, and HTTP ETag are retained in `tools/models/supplemental`. Range extraction cannot establish a whole-archive SHA256, so no complete archive hash is claimed. These supplemental assets credit BodyParts3D / The Database Center for Life Science and retain [CC BY-SA 2.1 JP](https://creativecommons.org/licenses/by-sa/2.1/jp/), rather than inheriting the v4 assets' CC BY 4.0 label; see the [official v3 README](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README.html).

源左腰方肌 `FMA22349` 有 30/3447 个顶点跨中线，其平均 X 在左侧；保留来源形状并记录此限制，不擅自删改。左右验收使用完整网格质心和官方 ID，结合前后方向及现有人体范围验证。

The source left quadratus lumborum `FMA22349` has 30 of 3,447 vertices crossing the midline, while its mean X remains left-sided. Its source shape is preserved and this limitation is recorded without deleting geometry. Laterality checks use the complete mesh centroid and official ID, together with anterior/posterior orientation and existing body bounds.

40 个肌群都有实际几何，共 148 个结构（146 个肌肉结构、两个跟腱）。肩袖肌腱、肱二头肌长头腱、股四头肌腱仍没有独立网格，在相关肌腱目录中明确标记缺失，不以肌腹冒充。

All 40 muscle groups have actual geometry: 148 structures in total, comprising 146 muscle structures and two Achilles tendons. Separate rotator cuff, long-head biceps, and quadriceps tendon meshes remain unavailable and explicitly marked missing in the tendon catalog; muscle bellies are not substitutes.

## 生成与验收 / Generate and validate

在 WSL Ubuntu 用户 `houhongxu`、仓库根目录执行，Node >=20：

Run from the repository root as WSL Ubuntu user `houhongxu`, using Node >=20:

```sh
npm ci --prefix tools/models
npm run build --prefix tools/models
node scripts/test-web-assets.mjs
```

依赖独立锁在 `tools/models/package-lock.json`：glTF Transform core/functions/extensions 4.5.1，meshoptimizer 1.3.0。每个 GLB 使用真实且必需的 `EXT_meshopt_compression`，包含内部二进制数据和法线，无外部纹理。Meshopt 量化会带来小范围顶点精度损失；未对肌肉与完整皮肤减面。低模皮肤先焊接，使用 `simplify` 减至 10,000 个三角形，再按面面积重新计算平滑法线；原完整皮肤为 203,382 个三角形。

Dependencies are independently locked in `tools/models/package-lock.json`: glTF Transform core/functions/extensions 4.5.1 and meshoptimizer 1.3.0. Every GLB uses actual, required `EXT_meshopt_compression`, embedded binary data and normals, with no external textures. Meshopt quantization introduces small vertex precision loss; muscle and full-skin triangle counts are unchanged. Low-poly skin is welded, reduced with `simplify` to 10,000 triangles, and receives recomputed area-weighted smooth normals. Full skin has 203,382 triangles.

`source-integrity.json` 固定记录原 617 个 JSON、皮肤、穴位及 manifest 共 620 个文件的 SHA256。定向测试校验原文件未变、40 组精确白名单、无额外结构、稳定节点名、压缩扩展、索引/法线、原坐标边界、完整低模的 20 个高度截面及真实字节统计。工具只生成 `models/web`；已有完整性基线不会自动覆盖，来源网格不重写。学习与共享元数据另行添加八个补充 ID。

`source-integrity.json` pins SHA256 for 620 original files: 617 JSON meshes, skin, acupuncture, and the manifest. Targeted tests check original-file integrity, the exact 40-group allowlist, absence of extra structures, stable node names, compression, indices/normals, original-coordinate bounds, 20 height bands covering the complete low-poly body, and measured byte statistics. The generator writes `models/web`; an existing integrity baseline is not overwritten, and source meshes are not rewritten. Learning and shared metadata separately add the eight supplemental IDs.

参考 API / API references: [Meshopt](https://gltf-transform.dev/modules/functions/functions/meshopt), [simplify](https://gltf-transform.dev/modules/functions/functions/simplify).

## 统计口径 / Measurement boundaries

`catalog.stats` 保存真实磁盘字节及用 Node `gzipSync(..., {level:6})` 对每个文件独立压缩的字节总数。`legacyMeshBytes/legacyMeshGzipBytes` 对照全部原 617 个网格；`legacySkinBytes/legacySkinGzipBytes` 单列原完整皮肤。`selectedStructureJsonBytes/selectedStructureJsonGzipBytes` 只对照原有 140 个白名单结构；补充八个 OBJ 用 `supplementalObjBytes/supplementalObjGzipBytes` 单列。`structureGlbBytes` 是全部 148 个 GLB 的总量。`initialGeometryBytes/initialGzipBytes` 为低模全身加初始 56 个结构；`allGeometryBytes/allGeometryGzipBytes` 含全部 148 个 GLB、低模全身及完整皮肤。

`catalog.stats` records actual file bytes and the sum of per-file Node `gzipSync(..., {level:6})` sizes. `legacyMeshBytes/legacyMeshGzipBytes` cover all original 617 meshes; `legacySkinBytes/legacySkinGzipBytes` separately cover original full skin. `selectedStructureJsonBytes/selectedStructureJsonGzipBytes` compare the original 140 allowlisted structures; `supplementalObjBytes/supplementalObjGzipBytes` separately measure the eight additional OBJs. `structureGlbBytes` totals all 148 GLBs. `initialGeometryBytes/initialGzipBytes` cover low-poly full body plus 56 initial structures; `allGeometryBytes/allGeometryGzipBytes` include all 148 GLBs, low-poly body, and full skin.

这些数字不包含目录、学习/穴位元数据、JavaScript、CSS、HTTP 头或连接开销，也不等于真实网络加载耗时。相对全部旧资源的下降同时包含缩减目录范围、压缩和基础人体减面的收益，不能全部归因于压缩算法。可直接运行生成命令查看当前数值，不用手写易过期的百分比。

These figures exclude catalog, learning/acupuncture metadata, JavaScript, CSS, HTTP headers, and connection overhead; they do not measure actual network loading time. Reduction against all legacy assets combines narrower catalog scope, compression, and body simplification, and must not be attributed entirely to compression. Run the generator for current measured values instead of relying on manually maintained percentages.
