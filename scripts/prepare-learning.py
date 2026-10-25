#!/usr/bin/env python3
"""生成有来源的学习目录 / Generate the source-backed learning catalog."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def pair(*ids):
    return [item for fid in ids for item in (fid, fid + "M")]

# 明确的源元素交叉表，禁止以邻近肌肉替代 / Exact source crosswalk; no nearby-muscle substitutions.
GROUP_SPECS = [
 ("pectoralis-major","胸大肌","Pectoralis major",pair("FJ1446","FJ1447","FJ1464")),
 ("deltoid-anterior","三角肌前部（锁骨部）","Anterior deltoid (clavicular part)",pair("FJ1468")),
 ("deltoid-posterior","三角肌后部（肩胛冈部）","Posterior deltoid (spinal part)",pair("FJ1513")),
 ("biceps-brachii","肱二头肌","Biceps brachii",pair("FJ1478","FJ1512")),
 ("biceps-long-head-muscle","肱二头肌长头肌腹","Long-head biceps muscle belly",pair("FJ1478")),
 ("infraspinatus-muscle","冈下肌","Infraspinatus muscle",pair("FJ1500")),
 ("triceps-brachii","肱三头肌","Triceps brachii",pair("FJ1477","FJ1479","FJ1480")),
 ("rhomboids","菱形肌群","Rhomboids",pair("FJ1536","FJ1537")),
 ("trapezius","斜方肌","Trapezius",pair("FJ1554","FJ1520","FJ1521")),
 ("trapezius-middle","斜方肌横部","Middle trapezius (transverse part)",pair("FJ1554")),
 ("latissimus-dorsi","背阔肌","Latissimus dorsi",[]),
 ("quadriceps","股四头肌群","Quadriceps",pair("FJ1433","FJ1441","FJ1442","FJ1443")),
 ("gluteus-maximus","臀大肌","Gluteus maximus",pair("FJ1418")),
 ("hamstrings","腘绳肌群","Hamstrings",pair("FJ1395","FJ1444","FJ1435","FJ1436")),
 ("hip-adductors","髋内收肌群","Hip adductors",pair("FJ1401","FJ1402","FJ1403","FJ1421","FJ1427")),
 ("gastrocnemius","腓肠肌","Gastrocnemius",pair("FJ1394","FJ1397")),
 ("soleus","比目鱼肌","Soleus",pair("FJ1437")),
 ("rectus-abdominis","腹直肌","Rectus abdominis",[]),
 ("transversus-abdominis","腹横肌","Transversus abdominis",[]),
 ("obliques","腹斜肌群（仅腹外斜肌网格）","Obliques (external oblique mesh only)",pair("FJ1452")),
 ("erector-spinae","竖脊肌群","Erector spinae",pair("FJ1526","FJ1527","FJ1528","FJ1533","FJ1534","FJ1535","FJ1543","FJ1544")),
 ("multifidus","多裂肌","Multifidus",[]),
 ("quadratus-lumborum","腰方肌","Quadratus lumborum",[]),
 ("rotator-cuff-muscles","肩袖肌群","Rotator cuff muscles",pair("FJ1506","FJ1500","FJ1504","FJ1508")),
 ("ecrb-muscle","桡侧腕短伸肌","Extensor carpi radialis brevis muscle",pair("FJ1489")),
 ("flexor-pronator-muscles","屈肌旋前肌群","Flexor-pronator muscles",pair("FJ1474","FJ1516","FJ1496","FJ1502","FJ1475","FJ1499","FJ1473","FJ1518")),
 ("achilles-tendon","跟腱","Achilles tendon",pair("FJ1405")),
 ("patellar-tendon","髌腱","Patellar tendon",[]),
 ("biceps-long-head-tendon","肱二头肌长头腱","Long-head biceps tendon",[]),
 ("rotator-cuff-tendons","肩袖肌腱","Rotator cuff tendons",[]),
 ("ecrb-tendon","桡侧腕短伸肌腱（肘外侧）","ECRB tendon at lateral elbow",[]),
 ("common-flexor-tendon","共同屈肌腱（肘内侧）","Common flexor tendon at medial elbow",[]),
]
MISSING = {
 "latissimus-dorsi": ("来源元素清单未提供背阔肌网格，不能高亮。","The source element table provides no latissimus dorsi mesh; highlighting is unavailable."),
 "rectus-abdominis": ("来源元素清单未提供腹直肌网格，不能高亮。","The source element table provides no rectus abdominis mesh; highlighting is unavailable."),
 "transversus-abdominis": ("来源元素清单未提供腹横肌网格，不能高亮。","The source element table provides no transversus abdominis mesh; highlighting is unavailable."),
 "multifidus": ("来源元素清单未提供多裂肌网格，不能高亮。","The source element table provides no multifidus mesh; highlighting is unavailable."),
 "quadratus-lumborum": ("来源元素清单未提供腰方肌网格，不能高亮。","The source element table provides no quadratus lumborum mesh; highlighting is unavailable."),
 "obliques": ("仅腹外斜肌有网格，腹内斜肌缺失。","Only external oblique meshes are available; internal oblique is absent."),
}
EXERCISES = [
 ("push-up","俯卧撑","Push-Up","胸部推举与肘伸展配合，躯干同时保持稳定。","A bodyweight press combining chest work, elbow extension and trunk stability.",["pectoralis-major","deltoid-anterior","triceps-brachii"]),
 ("barbell-bench-press","杠铃卧推","Barbell Bench Press","卧位水平推举，涉及胸大肌、肱三头肌和三角肌前部。","A horizontal press involving pectoralis major, triceps and anterior deltoid.",["pectoralis-major","triceps-brachii","deltoid-anterior"]),
 ("cable-crossover","绳索夹胸","Cable Crossover","绳索阻力下的肩水平内收，主要关联胸大肌。","Cable-resisted horizontal shoulder adduction, centered on pectoralis major.",["pectoralis-major","deltoid-anterior"]),
 ("chest-press-machine","器械推胸","Chest Press Machine","沿器械轨迹进行推胸，关联胸部与伸肘肌群。","A guided pressing movement involving chest and elbow-extensor muscles.",["pectoralis-major","deltoid-anterior","triceps-brachii"]),
 ("close-grip-bench-press","窄握卧推","Close Grip Bench Press","较窄握距的推举变式，突出肱三头肌的伸肘作用。","A narrower-grip press emphasizing the triceps' elbow-extension role.",["triceps-brachii","deltoid-anterior","pectoralis-major"]),
 ("barbell-bicep-curl","杠铃弯举","Barbell Bicep Curl","以屈肘为主要动作，重点关联肱二头肌。","An elbow-flexion exercise centered on the biceps brachii.",["biceps-brachii"]),
 ("pike-push-up","折刀俯卧撑","Pike Push-Up","髋部抬高的自重推举，肩部与肱三头肌共同参与。","A raised-hip bodyweight press involving the deltoids and triceps.",["deltoid-anterior","pectoralis-major","triceps-brachii"]),
 ("face-pull","绳索面拉","Face Pull","向面部方向拉动绳索，关联三角肌后部与肩胛后缩肌。","A cable pull involving posterior deltoids and scapular retractors.",["deltoid-posterior","rhomboids","trapezius-middle","infraspinatus-muscle"]),
 ("pull-up","引体向上","Pull-Up","垂直拉动身体，背阔肌与屈肘肌共同参与。","A vertical bodyweight pull involving latissimus dorsi and elbow flexors.",["latissimus-dorsi","biceps-brachii","rhomboids","trapezius-middle","deltoid-posterior"]),
 ("seated-machine-row-close-grip","器械窄握坐姿划船","Seated Machine Row Close Grip","水平拉动器械，关联背阔肌、菱形肌与上肢屈肌。","A horizontal machine pull involving lats, rhomboids and arm flexors.",["latissimus-dorsi","rhomboids","trapezius-middle","deltoid-posterior","biceps-brachii"]),
 ("goblet-squat","高脚杯深蹲","Goblet Squat","负重置于身前的深蹲，关联股四头肌与臀大肌。","A front-held squat involving knee extensors and gluteus maximus.",["quadriceps","gluteus-maximus","hip-adductors"]),
 ("dumbbell-front-squat","哑铃前蹲","Dumbbell Front Squat","哑铃置于肩前的深蹲，同时需要躯干稳定。","A dumbbell front-loaded squat combining leg work and trunk stabilization.",["quadriceps","gluteus-maximus","rectus-abdominis","transversus-abdominis"]),
 ("bulgarian-split-squat","保加利亚分腿蹲","Bulgarian Split Squat","后脚抬高的分腿蹲，前腿承担主要髋膝伸展任务。","A rear-foot-elevated split squat with most hip and knee work in the front leg.",["quadriceps","gluteus-maximus","hip-adductors"]),
 ("leg-press","腿举","Leg Press","器械支撑下的髋膝伸展，关联股四头肌与臀肌。","A supported machine movement using hip and knee extension.",["quadriceps","gluteus-maximus","hamstrings"]),
 ("barbell-deadlift","杠铃硬拉","Barbell Deadlift","从地面提起杠铃，髋膝伸肌发力，背部肌群参与稳定。","A floor-to-standing lift using hip and knee extensors with back stabilization.",["gluteus-maximus","quadriceps","hamstrings","erector-spinae","trapezius","latissimus-dorsi"]),
 ("dumbbell-romanian-deadlift","哑铃罗马尼亚硬拉","Dumbbell Romanian Deadlift","以髋铰链为主的负重动作，关联腘绳肌与臀大肌。","A loaded hip hinge involving hamstrings and gluteus maximus.",["hamstrings","gluteus-maximus","erector-spinae"]),
 ("lying-leg-curl","俯卧腿弯举","Lying Leg Curl","器械阻力下屈膝，重点关联腘绳肌，小腿肌也参与。","Resisted knee flexion centered on hamstrings, with calf involvement.",["hamstrings","gastrocnemius"]),
 ("floor-bridge","地面臀桥","Floor Bridge","仰卧抬髋的髋伸展动作，重点关联臀大肌。","A supine hip-extension movement centered on gluteus maximus.",["gluteus-maximus","hamstrings","erector-spinae"]),
 ("good-mornings","早安式","Good Mornings","肩背负重的髋铰链动作，关联腘绳肌、臀肌与竖脊肌。","A shoulder-loaded hip hinge involving hamstrings, glutes and spinal extensors.",["hamstrings","gluteus-maximus","erector-spinae"]),
 ("leg-press-calf-raise","腿举机提踵","Leg Press Calf Raise","器械上以踝跖屈移动阻力，关联腓肠肌与比目鱼肌。","Machine-resisted ankle plantarflexion involving gastrocnemius and soleus.",["gastrocnemius","soleus"]),
 ("plank","平板支撑","Plank","前臂支撑下抵抗躯干过度伸展，主要关联腹部稳定肌。","An isometric hold resisting trunk extension through abdominal stabilization.",["rectus-abdominis","transversus-abdominis","obliques","erector-spinae"]),
 ("side-plank","侧平板支撑","Side Plank","侧向支撑下抵抗躯干侧屈，关联腹斜肌与腰方肌。","A lateral isometric hold involving obliques and quadratus lumborum.",["obliques","quadratus-lumborum"]),
 ("bird-dog","鸟狗式","Bird Dog","四点跪姿交替伸展对侧肢体，训练躯干抗旋转控制。","Opposite-limb reaches from quadruped challenge trunk control against rotation.",["erector-spinae","multifidus","gluteus-maximus","rectus-abdominis","transversus-abdominis"]),
 ("dead-bug","死虫式","Dead Bug","仰卧交替移动四肢，同时以腹肌维持躯干稳定。","Alternating supine limb movements while abdominal muscles stabilize the trunk.",["rectus-abdominis","transversus-abdominis","obliques"]),
 ("russian-twist","俄罗斯转体","Russian Twist","躯干旋转动作，重点关联腹斜肌并需要腹部控制。","A trunk-rotation movement involving obliques and abdominal control.",["rectus-abdominis","transversus-abdominis","obliques"]),
]
CONDITIONS = [
 ("hamstring-strain","腘绳肌拉伤","Hamstring strain","大腿后侧腘绳肌群的肌纤维损伤，可与高速跑动有关。","A strain affects posterior-thigh hamstring fibers and can occur during fast running.",["hamstrings"],"AAOS — Hamstring Muscle Injuries","https://www.orthoinfo.org/diseases--conditions/hamstring-muscle-injuries/"),
 ("quadriceps-strain","股四头肌拉伤","Quadriceps strain","大腿前侧股四头肌群的肌纤维损伤，属于肌肉拉伤。","A muscle-fiber strain in the quadriceps at the front of the thigh.",["quadriceps"],"AAOS — Muscle Strains in the Thigh","https://www.orthoinfo.org/diseases--conditions/muscle-strains-in-the-thigh"),
 ("groin-adductor-strain","腹股沟内收肌拉伤","Groin adductor strain","大腿内侧内收肌群的拉伤；并非所有腹股沟疼痛都是肌肉拉伤。","A strain of inner-thigh adductors; groin pain alone does not identify this condition.",["hip-adductors"],"Health New Zealand — Groin strains","https://www.healthnz.govt.nz/health-topics/conditions-treatments/bones-and-joints/groin-strains"),
 ("calf-strain","小腿后侧肌群拉伤","Calf strain","涉及腓肠肌或比目鱼肌部分肌纤维的撕裂。","A strain can tear fibers of the gastrocnemius or soleus.",["gastrocnemius","soleus"],"Hull NHS — Soft Tissue Injury: Calf Strain","https://www.hey.nhs.uk/patient-leaflet/soft-tissue-injury-calf-strain/"),
 ("achilles-tendinopathy","跟腱病","Achilles tendinopathy","跟腱承受重复负荷相关的问题，属于肌腱而非小腿肌腹。","A load-related tendon condition involving the Achilles, distinct from the calf muscle bellies.",["achilles-tendon"],"AAOS — Achilles Tendinitis","https://www.orthoinfo.org/diseases--conditions/achilles-tendinitis"),
 ("patellar-tendinopathy","髌腱病","Patellar tendinopathy","位于髌骨下方肌腱的负荷相关问题，常见于跑跳活动。","A load-related problem of the tendon below the kneecap, associated with running and jumping.",["patellar-tendon","quadriceps"],"Kingston and Richmond NHS — Patellar tendinopathy","https://www.kingstonandrichmond.nhs.uk/patients-and-families/patient-leaflets/patellar-tendinopathy"),
 ("biceps-tendinitis","肱二头肌长头腱炎","Long-head biceps tendinitis","肩前方肱二头肌长头腱的刺激或炎症，与肱二头肌肌腹不同。","Irritation or inflammation of the proximal long-head biceps tendon, distinct from its muscle belly.",["biceps-long-head-tendon","biceps-long-head-muscle"],"AAOS — Biceps Tendinitis","https://www.orthoinfo.org/diseases--conditions/biceps-tendinitis/"),
 ("rotator-cuff-tendinitis","肩袖肌腱炎","Rotator cuff tendinitis","肩袖肌腱的炎症；与滑囊问题或肌腱撕裂属于不同概念。","Inflammation of rotator cuff tendons, distinct from bursitis or a tendon tear.",["rotator-cuff-tendons","rotator-cuff-muscles"],"AAOS — Shoulder Impingement / Rotator Cuff Tendinitis","https://www.orthoinfo.org/diseases--conditions/shoulder-impingementrotator-cuff-tendinitis/"),
 ("tennis-elbow","网球肘（肱骨外上髁病）","Tennis elbow (lateral epicondylitis)","肘外侧伸肌腱相关问题，桡侧腕短伸肌及其肌腱常被累及。","A lateral-elbow extensor-tendon condition commonly involving the ECRB muscle-tendon unit.",["ecrb-tendon","ecrb-muscle"],"AAOS — Tennis Elbow (Lateral Epicondylitis)","https://www.orthoinfo.org/diseases--conditions/tennis-elbow-lateral-epicondylitis/"),
 ("golfers-elbow","高尔夫球肘（肱骨内上髁病）","Golfer's elbow (medial epicondylitis)","肘内侧屈肌旋前肌起点相关问题，并不限于高尔夫运动者。","A medial-elbow flexor-pronator tendon-origin condition that also occurs outside golf.",["common-flexor-tendon","flexor-pronator-muscles"],"AAOS — Medial Epicondylitis (Golfer's Elbow)","https://www.orthoinfo.org/diseases--conditions/medial-epicondylitis-golfers-elbow/"),
]
def bilingual(zh, en):
    return {"zh": zh, "en": en}
def main():
    manifest = json.loads((ROOT / "models/manifest.json").read_text())
    available = {s["id"]: s for s in manifest["structures"]}
    groups = []
    for group_id, zh, en, ids in GROUP_SPECS:
        unknown = set(ids) - available.keys()
        if unknown:
            raise ValueError(f"Missing exact source IDs in {group_id}: {sorted(unknown)}")
        group = {"id": group_id, "name": bilingual(zh, en), "structureIds": ids}
        if group_id in MISSING:
            group["missing"] = bilingual(*MISSING[group_id])
        elif not ids:
            group["missing"] = bilingual(
                "来源没有该肌腱的独立网格，无法单独高亮。",
                "The source has no separate mesh for this tendon; it cannot be highlighted.",
            )
        groups.append(group)
    missing_groups = {g["id"] for g in groups if "missing" in g}
    entries = []
    for entry_id, zh, en, summary_zh, summary_en, group_ids in EXERCISES:
        entry = {"id": entry_id, "kind": "exercise", "name": bilingual(zh,en),
                 "summary": bilingual(summary_zh,summary_en), "groupIds": group_ids,
                 "sources": [{"title": f"NASM — {en}", "label": bilingual("NASM：" + zh, "NASM: " + en),
                              "url": "https://www.nasm.org/resource-center/exercise-library/" + entry_id}]}
        if missing_groups.intersection(group_ids):
            entry["notice"] = bilingual(
                "部分相关结构缺少来源网格；高亮仅展示已有结构，不能代表完整肌肉参与情况。",
                "Some involved structures lack source meshes. Highlights show available structures, not complete muscle involvement.",
            )
        if entry_id == "bird-dog":
            entry["sources"].append({"title": "NASM Exercise Library", "label": bilingual("NASM 动作库", "NASM Exercise Library"), "url": "https://www.nasm.org/workout-exercise-guidance"})
        entries.append(entry)
    for entry_id, zh, en, summary_zh, summary_en, group_ids, title, url in CONDITIONS:
        entry = {"id": entry_id, "kind": "condition", "name": bilingual(zh,en),
                 "summary": bilingual(summary_zh,summary_en), "groupIds": group_ids,
                 "sources": [{"title": title, "label": bilingual("来源：" + zh, title), "url": url}],
                 "notice": bilingual(
                    "用于解剖学习，不据酸痛位置诊断。若肌腱网格缺失，相关肌肉高亮仅作解剖背景。",
                    "For anatomy learning, not diagnosis from soreness location. If a tendon mesh is absent, muscle highlights provide anatomical context only.",
                 )}
        entries.append(entry)
    result = {"version": 1, "groups": groups, "entries": entries}
    (ROOT / "models/learning.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
    print(f"Learning catalog: {len(groups)} groups, {len(EXERCISES)} exercises, {len(CONDITIONS)} conditions.")
if __name__ == "__main__":
    main()
