# 模型来源与边界 / Model provenance and limits

本项目仅从 DBCLS 官方 BodyParts3D 4.0 IS-A 低多边形模型提取肌肉、肌腱和骨结构；没有用基础几何体伪造解剖结构。

This project extracts muscles, tendons and bones from the official DBCLS BodyParts3D 4.0 IS-A reduced polygon dataset. No anatomical structures are fabricated from primitives.

- 数据下载 / Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- 许可 / License: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- 署名 / Attribution: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.
- 许可文本 / License terms: https://creativecommons.org/licenses/by/4.0/

## 转换 / Transformations

原始 OBJ 网格按 FJ 元素 ID 保留，使用官方 IS-A 关系映射 FMA 概念名，优先选择最小范围且包含侧别的概念。一个概念可能由多个网格组成，每个网格分别保留，不重复叠加组合模型。原始坐标统一变换为 Y 向上，使用固定 v1 参考中心和比例（基准人体总高 1.7 单位），重新计算面积加权顶点法线。未进行进一步简化。每个网格及原始压缩包均记录 SHA256。

Original OBJ meshes retain FJ element IDs. Official IS-A mappings select the narrowest available concept, preferring sided names. A concept may contain several separately retained meshes; aggregate models are not duplicated. Coordinates are transformed to Y-up using a fixed v1 reference center and scale (reference-body height 1.7 units). Area-weighted vertex normals are recalculated, without further decimation. SHA256 digests cover each mesh and the source archive.

## 已知限制 / Known limits

- 来源是成年男性参考人体，不能代表不同性别、年龄或个体差异。原始带 M 后缀的镜像结构保留来源标记，不作为独立测量结果。
- 肌腱覆盖有限，不能宣称包含所有肌腱；没有独立网格的肌腱不能单独点击。
- 表层／深层是本项目维护的近似显示分组，并非经专业校核的完整解剖分层。可通过搜索、隐藏和独显查看任意已有结构。
- 源模型低多边形化会损失细节，首版没有皮肤、运动变形或临床定位功能。
- 名称保留来源英文术语；已核实的常见术语额外提供中文名，未审核术语回退英文。酸痛记录只记录用户自述，不自动诊断。

- The source is an adult male reference body, not a representation of individual, sex or age differences. Source-mirrored elements ending in M retain their provenance and are not independent measurements.
- Tendon coverage is limited; tendons without separate meshes cannot be selected individually. This is not an atlas of every tendon.
- Superficial/deep categories are approximate editorial display groups, not a professionally reviewed complete dissection taxonomy. Search, hide and isolate expose any available structure.
- Reduced polygon source data loses detail. P0 has no skin, motion deformation or clinical localization.
- Source English terminology is retained. Verified common terms additionally have Chinese names; unreviewed terms fall back to English. Soreness records are self-reports, not automatic diagnoses.

## 复现 / Reproduce

在 WSL 项目根目录运行 `bash scripts/fetch-models.sh`。下载缓存不提交，转换后的模型及清单随仓库发布。清单中的哈希校验防止上游更新被静默引入。

Run `bash scripts/fetch-models.sh` from the WSL project root. Download caches are excluded; converted meshes and manifests are distributed with the repository. Manifest hashes prevent silently incorporating upstream archive changes.

## 侧别与去重 / Side labels and deduplication

源名称缺少侧别且网格明确处于单侧时，依据参考模型左右坐标推导侧别，并在清单 sideSource 中标记为待专业审核。跨中线结构不据重心强行分类。源数据中完全相同的舌骨网格去重，保留 sourceAliases。

For unnamed sides whose geometry lies clearly on one side, reference coordinates infer the side, with sideSource marking the inference for professional review. Structures spanning the midline are not classified by centroid alone. Identical source hyoid meshes are deduplicated with sourceAliases retained.

## 肌肉分类补全与中文名 / Muscle taxonomy correction and Chinese names

中文：来源 IS-A 将完整肌器官（FMA5022）、肌区（FMA10474）和肌头（FMA85453）放在不同分支；只导入 FMA5022 会漏掉肱二头肌、股四头肌、三角肌、腓肠肌等已存在的网格。导入器显式合并这三个仅限肌肉的根，并减去肌腱元素。来源的斜方肌升部 FMA32555 与降部 FMA32557 直接归入通用 organ zone，因此只额外纳入这两个已核实概念，不扩展整个通用器官分部分类。

English: The source IS-A hierarchy places whole muscle organs (FMA5022), muscle zones (FMA10474) and muscle heads (FMA85453) in different branches. Importing only FMA5022 omitted existing meshes for biceps brachii, quadriceps, deltoid, gastrocnemius and others. The importer explicitly unions these three muscle-only roots and subtracts tendon elements. Ascending trapezius FMA32555 and descending trapezius FMA32557 attach directly to generic organ zone; only these two verified concepts are additionally included, without expanding the generic organ-part root.

中文：当前清单包含 617 个独立网格：407 肌肉、8 肌腱、202 骨结构。相对于补全前的 533 个结构新增 84 个元素；原有 ID 无丢失，533 个原有网格的 SHA256 全部保持一致，坐标变换完全一致，来源压缩包 SHA256 保持 `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`，没有缺失 OBJ。两个清单同步生成。

English: The current manifest has 617 distinct meshes: 407 muscles, 8 tendons and 202 bones. The correction adds 84 elements to the previous 533 structures. No existing IDs are lost; all 533 existing mesh SHA256 digests and the coordinate transform remain identical. The source archive digest remains `40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e`, with no missing OBJ files. Both manifests are regenerated together.

中文：`scripts/anatomy_names.py` 对常见、已核实术语使用有限中文词表，保持侧别和肌头／分部差异；学习交叉表中所有可映射结构都有 `nameZh`。原始 `nameEn` 不改动。未审阅的罕见术语保持英文回退，不能宣称完整中文图谱。来源缺少背阔肌和若干核心肌群独立元素，详情与学习资料见 [LEARNING_SOURCES.md](LEARNING_SOURCES.md)。

English: `scripts/anatomy_names.py` uses a limited curated Chinese glossary for common verified terms, preserving sides and head/portion distinctions. Every mapped learning structure has `nameZh`, while source `nameEn` remains unchanged. Rare unreviewed terms retain English fallback; this is not a fully translated atlas. The source lacks independent latissimus dorsi and several core-muscle elements; details and learning references are in [LEARNING_SOURCES.md](LEARNING_SOURCES.md).

中文：重新生成需依次运行 `python3 scripts/prepare-models.py`、`python3 scripts/prepare-learning.py`，再运行两个 `validate-*.py` 和 `scripts/test-learning.py`。`scripts/fetch-models.sh` 已包含模型与学习目录的生成和验证。

English: To regenerate, run `python3 scripts/prepare-models.py` followed by `python3 scripts/prepare-learning.py`, then both `validate-*.py` scripts and `scripts/test-learning.py`. The fetch script includes generation and validation for models and learning data.

中文：新增斜方肌分部改变了所选网格的包围盒；若重新计算中心，全部既有网格会产生位移。因此导入器固定 v1 参考中心 `[0.010500000000007503,-108.08885000000001,781.72995]` 和比例 `0.0009946871419309136`，不再从当前导入子集动态计算。新增网格使用同一参考系，原有网格保持逐字节一致。

English: Added trapezius portions change the selected meshes’ bounding box; recomputing its center would shift every existing mesh. The importer therefore freezes the v1 reference center `[0.010500000000007503,-108.08885000000001,781.72995]` and scale `0.0009946871419309136` instead of deriving them from the current subset. New meshes use that same reference frame, preserving existing meshes byte for byte.
