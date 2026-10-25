# 模型来源与边界 / Model provenance and limits

本项目仅从 DBCLS 官方 BodyParts3D 4.0 IS-A 低多边形模型提取肌肉、肌腱和骨结构；没有用基础几何体伪造解剖结构。

This project extracts muscles, tendons and bones from the official DBCLS BodyParts3D 4.0 IS-A reduced polygon dataset. No anatomical structures are fabricated from primitives.

- 数据下载 / Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- 许可 / License: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html
- 署名 / Attribution: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International.
- 许可文本 / License terms: https://creativecommons.org/licenses/by/4.0/

## 转换 / Transformations

原始 OBJ 网格按 FJ 元素 ID 保留，使用官方 IS-A 关系映射 FMA 概念名，优先选择最小范围且包含侧别的概念。一个概念可能由多个网格组成，每个网格分别保留，不重复叠加组合模型。原始坐标统一变换为 Y 向上、中心在原点、总高 1.7 单位，重新计算面积加权顶点法线。未进行进一步简化。每个网格及原始压缩包均记录 SHA256。

Original OBJ meshes retain FJ element IDs. Official IS-A mappings select the narrowest available concept, preferring sided names. A concept may contain several separately retained meshes; aggregate models are not duplicated. Coordinates are transformed to Y-up, centered at the origin, with a total height of 1.7 units. Area-weighted vertex normals are recalculated, without further decimation. SHA256 digests cover each mesh and the source archive.

## 已知限制 / Known limits

- 来源是成年男性参考人体，不能代表不同性别、年龄或个体差异。原始带 M 后缀的镜像结构保留来源标记，不作为独立测量结果。
- 肌腱覆盖有限，不能宣称包含所有肌腱；没有独立网格的肌腱不能单独点击。
- 表层／深层是本项目维护的近似显示分组，并非经专业校核的完整解剖分层。可通过搜索、隐藏和独显查看任意已有结构。
- 源模型低多边形化会损失细节，首版没有皮肤、运动变形或临床定位功能。
- 名称保留来源英文术语，避免未经审核的中文翻译。酸痛记录只记录用户自述，不自动诊断。

- The source is an adult male reference body, not a representation of individual, sex or age differences. Source-mirrored elements ending in M retain their provenance and are not independent measurements.
- Tendon coverage is limited; tendons without separate meshes cannot be selected individually. This is not an atlas of every tendon.
- Superficial/deep categories are approximate editorial display groups, not a professionally reviewed complete dissection taxonomy. Search, hide and isolate expose any available structure.
- Reduced polygon source data loses detail. P0 has no skin, motion deformation or clinical localization.
- Source English terminology is retained instead of unreviewed translations. Soreness records are self-reports, not automatic diagnoses.

## 复现 / Reproduce

在 WSL 项目根目录运行 `bash scripts/fetch-models.sh`。下载缓存不提交，转换后的模型及清单随仓库发布。清单中的哈希校验防止上游更新被静默引入。

Run `bash scripts/fetch-models.sh` from the WSL project root. Download caches are excluded; converted meshes and manifests are distributed with the repository. Manifest hashes prevent silently incorporating upstream archive changes.

## 侧别与去重 / Side labels and deduplication

源名称缺少侧别且网格明确处于单侧时，依据参考模型左右坐标推导侧别，并在清单 sideSource 中标记为待专业审核。跨中线结构不据重心强行分类。源数据中完全相同的舌骨网格去重，保留 sourceAliases。

For unnamed sides whose geometry lies clearly on one side, reference coordinates infer the side, with sideSource marking the inference for professional review. Structures spanning the midline are not classified by centroid alone. Identical source hyoid meshes are deduplicated with sourceAliases retained.
