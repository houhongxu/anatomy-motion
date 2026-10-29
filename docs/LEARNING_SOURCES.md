# 学习目录来源与映射边界 / Learning sources and mapping limits

中文：目录提供 29 个健身动作、10 个拉伸动作、14 个西医损伤概念及 6 个传统/补充医学症状穴位条目，供解剖学习与记录时参考。动作说明是独立撰写的简述；没有复制训练计划、动作图片、治疗方案、用药建议或诊断规则。每个条目均链接具体来源页面。既有来源核查日期：2026-10-25；新增来源核查日期：2026-10-29。

English: The catalog contains 29 fitness exercises, 10 stretches, 14 Western injury concepts and 6 traditional/complementary symptom-to-point references. It supports anatomy learning and recording. Descriptions are original short paraphrases; no routines, exercise images, treatment plans, medication guidance or diagnostic rules are reproduced. Every entry links its specific source page. Existing sources were reviewed on 2026-10-25; added sources were reviewed on 2026-10-29.

## 资料与语义依据 / Evidence and anatomical semantics

- 中文：动作及关联肌肉依据 NASM 的单独动作页面，而非把一个动作库页面扩写为大量内容。鸟狗式的多裂肌关联补充引用 NASM 动作库的明确列项。高亮是经过筛选的结构集合，不是全部肌肉募集清单，也不表示激活强度或个体适用性。
- English: Exercise associations use individual NASM exercise pages. Bird Dog additionally cites the library's explicit multifidi listing. Highlights are a curated structure set, not a complete recruitment list, an activation measurement or an individual suitability assessment.
- 中文：肌肉拉伤与肌腱问题分别参考 AAOS、NHS 和新西兰卫生机构的对应资料。疾病名称不是根据用户酸痛记录自动推断；目录不提供诊断或治疗建议。
- English: Strains and tendon conditions use corresponding AAOS, NHS and Health New Zealand materials. Conditions are not inferred from soreness records, and the catalog does not provide diagnosis or treatment advice.
- 中文：源网格 ID、概念名及侧别来自 [BodyParts3D 官方下载与 IS-A 表](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)。每个结构保留 conceptId、nameEn、sourceElement。下表是人工限定的交叉表；不使用关键词相近的肌肉替代缺失结构。
- English: Mesh IDs, concept names and sides come from the [official BodyParts3D downloads and IS-A tables](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html). Structures retain conceptId, nameEn and sourceElement. The crosswalk below is curated; similarly named muscles never substitute for absent structures.
- 中文：肩袖四块肌肉的分组依据 [美国国家医学图书馆 MeSH Rotator Cuff 定义](https://meshb.nlm.nih.gov/record/ui?name=Rotator+Cuff)。竖脊肌的髂肋肌、最长肌和棘肌分组依据 [UAMS 背部肌肉解剖表](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-back-region/)。网格代表来源分类中的各分部；不能据此推断每个动作对每一分部的相同负荷。
- English: The four rotator cuff muscles follow the [NLM MeSH Rotator Cuff definition](https://meshb.nlm.nih.gov/record/ui?name=Rotator+Cuff). Erector spinae's iliocostalis, longissimus and spinalis columns follow the [UAMS back-muscle anatomy table](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-back-region/). Source meshes represent named portions; this does not imply equal loading of every portion during an exercise.

## 缺失与显示 / Missing coverage and display

中文：来源没有背阔肌、腹直肌、腹横肌、多裂肌、腰方肌的独立元素，不能高亮这些结构。腹斜肌组当前只有腹外斜肌网格。平板支撑、鸟狗式、死虫式等动作的主要腹部结构因此存在缺口；条目与组均显示缺失说明，不以邻近肌肉填补。

English: The source has no independent elements for latissimus dorsi, rectus abdominis, transversus abdominis, multifidus or quadratus lumborum. These structures cannot be highlighted. The oblique group currently has external oblique meshes only. Major abdominal structures for plank, bird dog, dead bug and related exercises are therefore missing; groups and entries disclose the gaps without nearby-muscle substitutions.

中文：跟腱有独立来源网格。髌腱、肱二头肌长头腱、肩袖肌腱、桡侧腕短伸肌腱及共同屈肌腱没有独立网格。有关疾病可显示准确关联的肌肉作解剖背景，并另列空的肌腱组与缺失说明；肌肉高亮不代表肌腱位置、受损位置或组织诊断。左右两侧源网格均保留，但源镜像与侧别推断的限制仍见 [MODELS.md](MODELS.md)。

English: The Achilles tendon has separate source meshes. The patellar tendon, long-head biceps tendon, rotator cuff tendons, ECRB tendon and common flexor tendon do not. Related conditions may show their accurately associated muscles as anatomical context, with separate empty tendon groups and missing notes. Muscle highlights do not locate the tendon, an injury or a diagnosis. Both source sides are retained; source mirroring and inferred-side limitations remain documented in [MODELS.md](MODELS.md).

## 数据契约与复现 / Data contract and reproduction

中文：`models/learning.json` 使用 `version:1`、`groups` 和 `entries`。组包含 `id,name:{zh,en},structureIds`，覆盖不足时增加 `missing:{zh,en}`。条目包含 `kind,category,name,summary,groupIds,acupointCodes,sources`，必要时含 `notice`。来源的 `title` 保留机构与官方英文标题；可选的 `label:{zh,en}` 用于界面按所选语言显示单一来源标签。

English: `models/learning.json` contains `version:1`, `groups` and `entries`. Groups contain `id,name:{zh,en},structureIds`, with `missing:{zh,en}` for incomplete coverage. Entries contain `kind,category,name,summary,groupIds,acupointCodes,sources` and a `notice` where needed. Source `title` retains the organization and official English title; optional `label:{zh,en}` supports displaying one source label in the selected UI language.

```sh
python3 scripts/prepare-models.py
python3 scripts/prepare-learning.py
python3 scripts/validate-models.py
python3 scripts/validate-learning.py
python3 scripts/test-learning.py
```

中文：首次获取来源时运行 `bash scripts/fetch-models.sh`；该脚本也重新生成并验证学习目录。生成器只使用已核实的源元素 ID，找不到 ID 就失败。验证器检查唯一 ID、双语字段、已知组和结构、组织类型、准确英文概念名、来源 HTTPS、缺失说明、已映射结构的中文名、文件与哈希；反例测试验证错配肌肉和把肌肉当肌腱的情况会被拒绝。

English: For the first source download, run `bash scripts/fetch-models.sh`; it also rebuilds and validates learning data. Generation uses verified source element IDs and fails if an ID is absent. Validation checks unique IDs, bilingual fields, known groups and structures, tissue types, exact English concept names, HTTPS sources, missing notes, Chinese names for mapped structures, files and hashes. Negative tests reject known-but-wrong muscles and substitution of muscle for tendon.

## 精确交叉表 / Exact crosswalk

中文：下列 ID 均是元素 ID；带 M 的元素是来源提供的镜像版本。空列表明确表示缺失，部分覆盖说明见 `missing` 字段。

English: IDs below are source element IDs; M-suffixed elements are source-provided mirrored versions. Empty lists explicitly represent missing coverage. Partial-coverage notes are in each group's `missing` field.

| 组 / Group | 名称 / Name | 源网格 ID / Source mesh IDs |
| --- | --- | --- |
| pectoralis-major | 胸大肌 / Pectoralis major | FJ1446, FJ1446M, FJ1447, FJ1447M, FJ1464, FJ1464M |
| deltoid-anterior | 三角肌前部（锁骨部） / Anterior deltoid (clavicular part) | FJ1468, FJ1468M |
| deltoid-posterior | 三角肌后部（肩胛冈部） / Posterior deltoid (spinal part) | FJ1513, FJ1513M |
| biceps-brachii | 肱二头肌 / Biceps brachii | FJ1478, FJ1478M, FJ1512, FJ1512M |
| biceps-long-head-muscle | 肱二头肌长头肌腹 / Long-head biceps muscle belly | FJ1478, FJ1478M |
| infraspinatus-muscle | 冈下肌 / Infraspinatus muscle | FJ1500, FJ1500M |
| triceps-brachii | 肱三头肌 / Triceps brachii | FJ1477, FJ1477M, FJ1479, FJ1479M, FJ1480, FJ1480M |
| rhomboids | 菱形肌群 / Rhomboids | FJ1536, FJ1536M, FJ1537, FJ1537M |
| trapezius | 斜方肌 / Trapezius | FJ1554, FJ1554M, FJ1520, FJ1520M, FJ1521, FJ1521M |
| trapezius-middle | 斜方肌横部 / Middle trapezius (transverse part) | FJ1554, FJ1554M |
| latissimus-dorsi | 背阔肌 / Latissimus dorsi | 缺失 / Missing |
| quadriceps | 股四头肌群 / Quadriceps | FJ1433, FJ1433M, FJ1441, FJ1441M, FJ1442, FJ1442M, FJ1443, FJ1443M |
| gluteus-maximus | 臀大肌 / Gluteus maximus | FJ1418, FJ1418M |
| hamstrings | 腘绳肌群 / Hamstrings | FJ1395, FJ1395M, FJ1444, FJ1444M, FJ1435, FJ1435M, FJ1436, FJ1436M |
| hip-adductors | 髋内收肌群 / Hip adductors | FJ1401, FJ1401M, FJ1402, FJ1402M, FJ1403, FJ1403M, FJ1421, FJ1421M, FJ1427, FJ1427M |
| gastrocnemius | 腓肠肌 / Gastrocnemius | FJ1394, FJ1394M, FJ1397, FJ1397M |
| soleus | 比目鱼肌 / Soleus | FJ1437, FJ1437M |
| rectus-abdominis | 腹直肌 / Rectus abdominis | 缺失 / Missing |
| transversus-abdominis | 腹横肌 / Transversus abdominis | 缺失 / Missing |
| obliques | 腹斜肌群（仅腹外斜肌网格） / Obliques (external oblique mesh only) | FJ1452, FJ1452M |
| erector-spinae | 竖脊肌群 / Erector spinae | FJ1526, FJ1526M, FJ1527, FJ1527M, FJ1528, FJ1528M, FJ1533, FJ1533M, FJ1534, FJ1534M, FJ1535, FJ1535M, FJ1543, FJ1543M, FJ1544, FJ1544M |
| multifidus | 多裂肌 / Multifidus | 缺失 / Missing |
| quadratus-lumborum | 腰方肌 / Quadratus lumborum | 缺失 / Missing |
| rotator-cuff-muscles | 肩袖肌群 / Rotator cuff muscles | FJ1506, FJ1506M, FJ1500, FJ1500M, FJ1504, FJ1504M, FJ1508, FJ1508M |
| ecrb-muscle | 桡侧腕短伸肌 / Extensor carpi radialis brevis muscle | FJ1489, FJ1489M |
| flexor-pronator-muscles | 屈肌旋前肌群 / Flexor-pronator muscles | FJ1474, FJ1474M, FJ1516, FJ1516M, FJ1496, FJ1496M, FJ1502, FJ1502M, FJ1475, FJ1475M, FJ1499, FJ1499M, FJ1473, FJ1473M, FJ1518, FJ1518M |
| achilles-tendon | 跟腱 / Achilles tendon | FJ1405, FJ1405M |
| patellar-tendon | 髌腱 / Patellar tendon | 缺失 / Missing |
| biceps-long-head-tendon | 肱二头肌长头腱 / Long-head biceps tendon | 缺失 / Missing |
| rotator-cuff-tendons | 肩袖肌腱 / Rotator cuff tendons | 缺失 / Missing |
| ecrb-tendon | 桡侧腕短伸肌腱（肘外侧） / ECRB tendon at lateral elbow | 缺失 / Missing |
| common-flexor-tendon | 共同屈肌腱（肘内侧） / Common flexor tendon at medial elbow | 缺失 / Missing |

## 条目来源 / Entry sources

| 条目 / Entry | 类型 / Type | 来源 / Sources |
| --- | --- | --- |
| 俯卧撑 / Push-Up | 动作 / Exercise | [NASM — Push-Up](https://www.nasm.org/resource-center/exercise-library/push-up) |
| 杠铃卧推 / Barbell Bench Press | 动作 / Exercise | [NASM — Barbell Bench Press](https://www.nasm.org/resource-center/exercise-library/barbell-bench-press) |
| 绳索夹胸 / Cable Crossover | 动作 / Exercise | [NASM — Cable Crossover](https://www.nasm.org/resource-center/exercise-library/cable-crossover) |
| 器械推胸 / Chest Press Machine | 动作 / Exercise | [NASM — Chest Press Machine](https://www.nasm.org/resource-center/exercise-library/chest-press-machine) |
| 窄握卧推 / Close Grip Bench Press | 动作 / Exercise | [NASM — Close Grip Bench Press](https://www.nasm.org/resource-center/exercise-library/close-grip-bench-press) |
| 杠铃弯举 / Barbell Bicep Curl | 动作 / Exercise | [NASM — Barbell Bicep Curl](https://www.nasm.org/resource-center/exercise-library/barbell-bicep-curl) |
| 折刀俯卧撑 / Pike Push-Up | 动作 / Exercise | [NASM — Pike Push-Up](https://www.nasm.org/resource-center/exercise-library/pike-push-up) |
| 绳索面拉 / Face Pull | 动作 / Exercise | [NASM — Face Pull](https://www.nasm.org/resource-center/exercise-library/face-pull) |
| 引体向上 / Pull-Up | 动作 / Exercise | [NASM — Pull-Up](https://www.nasm.org/resource-center/exercise-library/pull-up) |
| 器械窄握坐姿划船 / Seated Machine Row Close Grip | 动作 / Exercise | [NASM — Seated Machine Row Close Grip](https://www.nasm.org/resource-center/exercise-library/seated-machine-row-close-grip) |
| 高脚杯深蹲 / Goblet Squat | 动作 / Exercise | [NASM — Goblet Squat](https://www.nasm.org/resource-center/exercise-library/goblet-squat) |
| 哑铃前蹲 / Dumbbell Front Squat | 动作 / Exercise | [NASM — Dumbbell Front Squat](https://www.nasm.org/resource-center/exercise-library/dumbbell-front-squat) |
| 保加利亚分腿蹲 / Bulgarian Split Squat | 动作 / Exercise | [NASM — Bulgarian Split Squat](https://www.nasm.org/resource-center/exercise-library/bulgarian-split-squat) |
| 腿举 / Leg Press | 动作 / Exercise | [NASM — Leg Press](https://www.nasm.org/resource-center/exercise-library/leg-press) |
| 杠铃硬拉 / Barbell Deadlift | 动作 / Exercise | [NASM — Barbell Deadlift](https://www.nasm.org/resource-center/exercise-library/barbell-deadlift) |
| 哑铃罗马尼亚硬拉 / Dumbbell Romanian Deadlift | 动作 / Exercise | [NASM — Dumbbell Romanian Deadlift](https://www.nasm.org/resource-center/exercise-library/dumbbell-romanian-deadlift) |
| 俯卧腿弯举 / Lying Leg Curl | 动作 / Exercise | [NASM — Lying Leg Curl](https://www.nasm.org/resource-center/exercise-library/lying-leg-curl) |
| 地面臀桥 / Floor Bridge | 动作 / Exercise | [NASM — Floor Bridge](https://www.nasm.org/resource-center/exercise-library/floor-bridge) |
| 早安式 / Good Mornings | 动作 / Exercise | [NASM — Good Mornings](https://www.nasm.org/resource-center/exercise-library/good-mornings) |
| 腿举机提踵 / Leg Press Calf Raise | 动作 / Exercise | [NASM — Leg Press Calf Raise](https://www.nasm.org/resource-center/exercise-library/leg-press-calf-raise) |
| 平板支撑 / Plank | 动作 / Exercise | [NASM — Plank](https://www.nasm.org/resource-center/exercise-library/plank) |
| 侧平板支撑 / Side Plank | 动作 / Exercise | [NASM — Side Plank](https://www.nasm.org/resource-center/exercise-library/side-plank) |
| 鸟狗式 / Bird Dog | 动作 / Exercise | [NASM — Bird Dog](https://www.nasm.org/resource-center/exercise-library/bird-dog), [NASM Exercise Library](https://www.nasm.org/workout-exercise-guidance) |
| 死虫式 / Dead Bug | 动作 / Exercise | [NASM — Dead Bug](https://www.nasm.org/resource-center/exercise-library/dead-bug) |
| 俄罗斯转体 / Russian Twist | 动作 / Exercise | [NASM — Russian Twist](https://www.nasm.org/resource-center/exercise-library/russian-twist) |
| 腘绳肌拉伤 / Hamstring strain | 损伤概念 / Condition | [AAOS — Hamstring Muscle Injuries](https://www.orthoinfo.org/diseases--conditions/hamstring-muscle-injuries/) |
| 股四头肌拉伤 / Quadriceps strain | 损伤概念 / Condition | [AAOS — Muscle Strains in the Thigh](https://www.orthoinfo.org/diseases--conditions/muscle-strains-in-the-thigh) |
| 腹股沟内收肌拉伤 / Groin adductor strain | 损伤概念 / Condition | [Health New Zealand — Groin strains](https://www.healthnz.govt.nz/health-topics/conditions-treatments/bones-and-joints/groin-strains) |
| 小腿后侧肌群拉伤 / Calf strain | 损伤概念 / Condition | [Hull NHS — Soft Tissue Injury: Calf Strain](https://www.hey.nhs.uk/patient-leaflet/soft-tissue-injury-calf-strain/) |
| 跟腱病 / Achilles tendinopathy | 损伤概念 / Condition | [AAOS — Achilles Tendinitis](https://www.orthoinfo.org/diseases--conditions/achilles-tendinitis) |
| 髌腱病 / Patellar tendinopathy | 损伤概念 / Condition | [Kingston and Richmond NHS — Patellar tendinopathy](https://www.kingstonandrichmond.nhs.uk/patients-and-families/patient-leaflets/patellar-tendinopathy) |
| 肱二头肌长头腱炎 / Long-head biceps tendinitis | 损伤概念 / Condition | [AAOS — Biceps Tendinitis](https://www.orthoinfo.org/diseases--conditions/biceps-tendinitis/) |
| 肩袖肌腱炎 / Rotator cuff tendinitis | 损伤概念 / Condition | [AAOS — Shoulder Impingement / Rotator Cuff Tendinitis](https://www.orthoinfo.org/diseases--conditions/shoulder-impingementrotator-cuff-tendinitis/) |
| 网球肘（肱骨外上髁病） / Tennis elbow (lateral epicondylitis) | 损伤概念 / Condition | [AAOS — Tennis Elbow (Lateral Epicondylitis)](https://www.orthoinfo.org/diseases--conditions/tennis-elbow-lateral-epicondylitis/) |
| 高尔夫球肘（肱骨内上髁病） / Golfer's elbow (medial epicondylitis) | 损伤概念 / Condition | [AAOS — Medial Epicondylitis (Golfer's Elbow)](https://www.orthoinfo.org/diseases--conditions/medial-epicondylitis-golfers-elbow/) |

## React 目录补齐 / React catalog supplementation

BodyParts3D3.0的独立左右网格补齐背阔肌、腹直肌、腹内斜肌和腰方肌后，学习映射引用BP3D3_FMA稳定ID；腹斜肌群现在同时包含腹内外斜肌。此前“缺少这些网格”的覆盖统计属于历史Cocos版本。新40条目白名单外的关联结构不会下载，仍须显示部分覆盖，不将缺失肌腱用肌腹替代。来源及许可见WEB_ASSETS.md。

Independent sided BodyParts3D3.0 meshes now supply latissimus dorsi, rectus abdominis, internal oblique and quadratus lumborum through stable BP3D3_FMA IDs. The oblique group includes both internal/external obliques. Earlier missing-mesh statistics describe historical Cocos versions. Linked structures outside the40-entry whitelist are not downloaded and remain disclosed as partial coverage; muscle bellies do not substitute for absent tendons. See WEB_ASSETS.md for provenance/licensing.


## 四类关系目录 / Four-category relation catalog

中文：版本仍为 `1`，既有条目 ID、`kind` 与分组 ID 保持稳定。`fitness`、`stretching` 对应 `exercise`；`western`、`tcm` 对应 `condition`。`tcm` 表示资料采用传统或补充医学框架，并不意味着头痛、恶心等症状仅属于中医。每个条目显式列出 `groupIds` 与 `acupointCodes`，正反向检索读取同一关系；没有另外维护反向映射，也不根据三维距离生成关系。

English: Version remains `1`, preserving existing entry IDs, kinds and group IDs. `fitness` and `stretching` use kind `exercise`; `western` and `tcm` use `condition`. `tcm` identifies a traditional/complementary reference framework, not an exclusive medical ownership of symptoms. Both directions use the same explicit `groupIds` and `acupointCodes`; no separate reverse map or spatial inference is maintained.

中文：穴位代码按 `models/acupuncture.json` 核验；左右侧实例共用代码。当前 6 个穴位条目均为 `groupIds:[]`，有 11 个不同代码；未推断穴位对应肌肉、肌肉病因或疾病诊断。穴位位置仍是原有未审校示意坐标；来源对穴位名称的提及不能验证三维定位。本轮没有改动坐标、网格、人体比例或参考资产。

English: Point codes are checked against `models/acupuncture.json`; bilateral instances share a code. The six point-reference entries have `groupIds:[]` and 11 distinct codes. No point-to-muscle mapping, muscular cause or diagnosis is inferred. Existing point positions remain unreviewed illustrations: a source naming a point does not validate its 3D placement. This change does not alter coordinates, meshes, proportions or reference assets.

中文：新增精确组复用已有网格：臀中肌 `FJ1419/FJ1419M`、梨状肌 `FJ1428/FJ1428M`、小圆肌 `FJ1508/FJ1508M`。校验器按去除左右侧前缀后的完整概念名审核，分别为 `gluteus medius`、`piriformis`、`teres minor`；未以整个肩袖代替单独小圆肌。

English: Added precise groups reuse existing meshes: gluteus medius `FJ1419/FJ1419M`, piriformis `FJ1428/FJ1428M`, and teres minor `FJ1508/FJ1508M`. The validator checks these exact concept names after removing side prefixes; the entire rotator cuff is not substituted for teres minor.

### 2026-10-29 新增来源对应 / Added source mapping

| 条目 ID / Entry IDs | 依据与映射 / Evidence and mapping |
|---|---|
| `crossover-arm-stretch`; `passive-shoulder-external-rotation-stretch`; `sleeper-stretch`; `overhead-elbow-extension` | [AAOS 肩部训练 / Shoulder conditioning](https://www.orthoinfo.org/recovery/rotator-cuff-and-shoulder-conditioning-program/)：依次对应三角肌后束；冈下肌与小圆肌（两种拉伸）；肱三头肌。 / Respectively posterior deltoid; infraspinatus and teres minor (both stretches); triceps. |
| `knee-to-chest-stretch`; `supine-hamstring-stretch`; `seated-hip-rotation-stretch`; `side-lying-hip-adduction` | [AAOS 髋部训练 / Hip conditioning](https://www.orthoinfo.org/recovery/hip-conditioning-program)：臀大肌与臀中肌；腘绳肌；梨状肌；内收肌。 / Gluteus maximus and medius; hamstrings; piriformis; adductors. |
| `straight-knee-heel-cord-stretch`; `bent-knee-heel-cord-stretch`; `towel-calf-stretch`; `standing-calf-raise` | [AAOS 足踝训练 / Foot and ankle conditioning](https://www.orthoinfo.org/recovery/foot-and-ankle-conditioning-program/)：直膝、毛巾拉伸及提踵的来源均列腓肠肌–比目鱼肌复合体；屈膝版本仅列比目鱼肌。 / The straight-knee, towel and raise entries name the gastrocnemius–soleus complex; the bent-knee version names soleus. |
| `standing-quadriceps-stretch`; `seated-leg-extension` | [AAOS 膝部训练 / Knee conditioning](https://www.orthoinfo.org/recovery/knee-conditioning-program/)：股四头肌。 / Quadriceps. |
| `rotator-cuff-tear` | [AAOS 肩袖撕裂 / Rotator cuff tears](https://www.orthoinfo.org/diseases--conditions/rotator-cuff-tears/)：肌腱损伤，肌肉仅作解剖背景；肌腱未覆盖。 / Tendon injury, muscle context only; tendon coverage remains absent. |
| `biceps-long-head-tendon-tear` | [AAOS 肩部肱二头肌腱撕裂 / Biceps tendon tear at the shoulder](https://www.orthoinfo.org/diseases--conditions/biceps-tendon-tear-at-the-shoulder/)：长头腱与长头肌腹分开，未用肌腹替代缺失肌腱。 / Long-head tendon and muscle belly remain distinct; the belly does not replace the absent tendon. |
| `pectoralis-tendon-tear` | [AAOS 胸大肌腱撕裂 / Pectoralis tendon tear](https://www.orthoinfo.org/diseases--conditions/pectoralis-tendon-tear/)：肌腱未建模，仅显示胸大肌背景。 / Tendon unmodeled; pectoralis major provides background only. |
| `low-back-strain` | [AANS 腰背拉伤与扭伤 / Low back strain and sprain](https://www.aans.org/patients/conditions-treatments/low-back-strain-and-sprain/)：文中脊柱支持肌群作背景，不声称个人的竖脊肌、腹直肌或腹斜肌已受伤。 / Spinal-support muscle context does not identify an individual's injured erectors, rectus abdominis or obliques. |
| `tcm-headache` | [MSK 头痛穴位资料 / Headache acupressure](https://www.mskcc.org/cancer-care/patient-education/acupressure-pain-and-headaches)：合谷 / Hegu `LI4`。保留孕期及皮肤破损、炎症禁忌。 / Pregnancy and damaged/inflamed-skin restrictions retained. |
| `tcm-nausea` | [MedlinePlus 恶心 / Nausea](https://www.medlineplus.gov/ency/article/002117.htm)、[MSK 恶心与呕吐 / Nausea and vomiting](https://www.mskcc.org/pdf/cancer-care/patient-education/acupressure-nausea-and-vomiting)：内关 / Neiguan `PC6`，保留 MSK 皮肤禁忌。 / MSK skin restrictions retained. |
| `tcm-sleep-difficulty` | [香港浸会大学 失眠资料 / HKBU sleep reference](https://embracehealth.hkbu.edu.hk/html/eclassroom_book_detail.php?bookid=13&id=715&sectionid=76)：神门、内关、百会 / Shenmen, Neiguan, Baihui `HT7,PC6,GV20`。 |
| `tcm-low-back-discomfort` | [清华大学医院 六个中医护腰法 / Tsinghua University Hospital back-care reference](https://xyy.tsinghua.edu.cn/info/1045/5937.htm)：肾俞、委中 / Shenshu, Weizhong `BL23,BL40`。采用正文同时明确列出两穴的院内重复页；最初的 `/info/1084/5936.htm` 提取正文未呈现委中段落。 / Uses the hospital duplicate page that explicitly includes both points; the initially inspected `/info/1084/5936.htm` extraction omitted the Weizhong section. |
| `tcm-neck-discomfort` | [香港浸会大学 颈椎病穴位资料 / HKBU cervical reference](https://embracehealth.hkbu.edu.hk/html/eclassroom_book_detail.php?bookid=28&id=1363&sectionid=193)：风池、肩井 / Fengchi, Jianjing `GB20,GB21`；不把定位描述中的斜方肌当作病因证据。 / A trapezius landmark is not evidence of muscular disease cause. |
| `tcm-constipation` | [中国医药大学附设医院 排便训练 / CMUH bowel training](https://www.cmuh.cmu.edu.tw/HealthEdus/Detail?no=5479)：足三里、天枢、中脘 / Zusanli, Tianshu, Zhongwan `ST36,ST25,CV12`。 |

中文：香港浸会大学两页正文在直接网页提取中未显示，核查使用同一官方 URL 的搜索索引正文；记录的是索引中明确列出的名称，没有补写未见内容。全部新条目采用简短独立释义，不复制操作剂量、针刺步骤、训练次数、疗程、配方或图片；新增条目不构成完整训练库、疾病库或临床等价关系。

English: Direct extraction omitted the two HKBU article bodies; verification used indexed body text for the same official URLs. Only explicitly listed names were retained. New entries use short original paraphrases without copied dosing, needling, repetitions, treatment courses, formulas or images. This is not a complete exercise/condition library or a claim of clinical equivalence.

中文：[NCCIH 针灸效果与安全概览](https://www.nccih.nih.gov/health/acupuncture-effectiveness-and-safety)仅用于说明证据与安全边界：不能把针灸试验结果当作穴位按压疗效证明，也不能因来源声称传统用途就判定疗效成立。目录记录文献关联，不给个人治疗建议；不应以此延误医疗评估。

English: The [NCCIH acupuncture effectiveness and safety overview](https://www.nccih.nih.gov/health/acupuncture-effectiveness-and-safety) informs evidence and safety limits. Acupuncture trials do not establish acupressure efficacy, and a traditional-use statement does not prove benefit. Catalog associations are educational references, not individual treatment recommendations, and must not delay clinical assessment.

中文：校验要求有效分类与 `kind` 匹配、组及穴位代码已存在且不重复、双语字段完整、来源为 HTTPS。条目须有实际网格或有效穴位；纯穴位条目可无肌肉组，缺失肌腱本身不算实际覆盖。定向反例测试覆盖未知/重复穴位、分类错配、空关系、错误解剖交叉表与左右侧共用代码。

English: Validation checks category/kind compatibility, unique known groups and point codes, bilingual fields and HTTPS sources. Each entry needs an actual mesh or valid point; point-only entries may omit muscle groups, while a missing tendon is not actual coverage. Focused negative tests cover unknown/duplicate points, category mismatch, empty relations, wrong anatomical crosswalks and bilateral shared codes.


中文：原始 manifest 中 `FJ1428/FJ1428M` 未包含中文名；保留原文件完整性，以 `tools/models/names.mjs` 与网页目录中已审核的右侧/左侧梨状肌标签补足校验。这个回退只接受这两个 ID 且要求完整英文名分别为 `right piriformis`、`left piriformis`；其他结构缺失中文名仍会失败。目录组名为双语，回退不修改源元数据。

English: The original manifest lacks Chinese labels for `FJ1428/FJ1428M`. Its integrity is preserved; validation uses the reviewed right/left piriformis labels already present in `tools/models/names.mjs` and the web catalog. The fallback accepts only those two IDs with exact full English names `right piriformis` and `left piriformis`. Missing Chinese labels on other structures still fail. The learning group is bilingual, and the fallback does not mutate source metadata.
