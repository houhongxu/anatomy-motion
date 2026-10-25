#!/usr/bin/env python3
"""验证学习目录与精确解剖映射 / Validate learning data and exact anatomical mappings."""
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_NAMES = {
 "pectoralis-major": ("pectoralis major",), "deltoid-anterior": ("clavicular part of deltoid",),
 "deltoid-posterior": ("spinal part of deltoid",),
 "biceps-brachii": ("long head of biceps brachii","short head of biceps brachii"),
 "biceps-long-head-muscle": ("long head of biceps brachii",),
 "infraspinatus-muscle": ("infraspinatus muscle",),
 "triceps-brachii": ("lateral head of triceps brachii","long head of triceps brachii","medial head of triceps brachii"),
 "rhomboids": ("rhomboid major","rhomboid minor"),
 "trapezius": ("transverse part of trapezius","ascending part of trapezius","descending part of trapezius"),
 "trapezius-middle": ("transverse part of trapezius",),
 "quadriceps": ("rectus femoris","vastus intermedius","vastus lateralis","vastus medialis"),
 "gluteus-maximus": ("gluteus maximus",),
 "hamstrings": ("long head of biceps femoris","short head of biceps femoris","semitendinosus","semimembranosus"),
 "hip-adductors": ("adductor brevis","adductor longus","adductor magnus","gracilis","pectineus"),
 "gastrocnemius": ("lateral head of gastrocnemius","medial head of gastrocnemius"),
 "soleus": ("soleus",), "obliques": ("external oblique",),
 "erector-spinae": ("iliocostalis cervicis","iliocostalis lumborum","iliocostalis thoracis","longissimus capitis","longissimus cervicis","longissimus thoracis","spinalis","spinalis thoracis"),
 "rotator-cuff-muscles": ("supraspinatus","infraspinatus muscle","subscapularis","teres minor"),
 "ecrb-muscle": ("extensor carpi radialis brevis",),
 "flexor-pronator-muscles": ("humeral head of pronator teres","ulnar head of pronator teres","flexor carpi radialis","palmaris longus","flexor digitorum superficialis","humeral head of flexor carpi ulnaris","ulnar head of flexor carpi ulnaris"),
 "achilles-tendon": ("calcaneal tendon",),
}
MISSING_ONLY = {"latissimus-dorsi","rectus-abdominis","transversus-abdominis","multifidus","quadratus-lumborum","patellar-tendon","biceps-long-head-tendon","rotator-cuff-tendons","ecrb-tendon","common-flexor-tendon"}

def require(condition, message):
    if not condition:
        raise ValueError(message)

def bilingual(value, context):
    require(isinstance(value, dict), context + " must be bilingual")
    for lang in ("zh", "en"):
        require(isinstance(value.get(lang),str) and bool(value[lang].strip()), context + "." + lang + " is missing")

def validate(catalog, manifest, verify_meshes=False):
    require(catalog.get("version") == 1, "Unsupported catalog version")
    structures = {s["id"]:s for s in manifest["structures"]}
    require(len(structures) == len(manifest["structures"]), "Duplicate structure IDs")
    groups = catalog.get("groups",[])
    entries = catalog.get("entries",[])
    require(groups and entries, "Catalog must contain groups and entries")
    group_by_id = {g["id"]:g for g in groups}
    require(len(group_by_id) == len(groups), "Duplicate group IDs")
    require(len({e["id"] for e in entries}) == len(entries), "Duplicate entry IDs")
    referenced = set()
    mapped = set()
    for group in groups:
        gid = group["id"]
        require(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",gid), "Invalid group ID: " + gid)
        bilingual(group.get("name"), gid + ".name")
        ids = group.get("structureIds")
        require(isinstance(ids,list) and len(ids) == len(set(ids)), "Duplicate/invalid structureIds in " + gid)
        if not ids or "missing" in group:
            bilingual(group.get("missing"), gid + ".missing")
        require(gid in EXPECTED_NAMES or gid in MISSING_ONLY, "Group lacks reviewed name crosswalk: " + gid)
        if gid in MISSING_ONLY:
            require(not ids, "Missing-only group silently substituted: " + gid)
        for sid in ids:
            require(sid in structures, "Unknown structure ID: " + sid)
            structure = structures[sid]
            require(structure["kind"] in {"muscle","tendon"}, "Bone in learning group: " + sid)
            require(structure["kind"] == ("tendon" if gid == "achilles-tendon" else "muscle"), "Wrong tissue type: " + gid)
            name = structure["nameEn"].replace("right ","").replace("left ","")
            expected = EXPECTED_NAMES[gid]
            # Pectoralis parts retain their exact part qualifier, while other groups use full reviewed labels.
            require((gid == "pectoralis-major" and name in {"abdominal part of pectoralis major","clavicular part of pectoralis major","sternocostal part of pectoralis major"}) or name in expected, f"Incorrect anatomical crosswalk: {gid} -> {sid} ({name})")
            require(isinstance(structure.get("nameZh"),str) and structure["nameZh"], "Mapped structure lacks reviewed Chinese name: " + sid)
            mapped.add(sid)
    for entry in entries:
        eid = entry["id"]
        require(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*",eid), "Invalid entry ID: " + eid)
        require(entry.get("kind") in {"exercise","condition"}, "Invalid entry kind: " + eid)
        bilingual(entry.get("name"), eid + ".name")
        bilingual(entry.get("summary"), eid + ".summary")
        group_ids = entry.get("groupIds")
        require(isinstance(group_ids,list) and group_ids and len(group_ids) == len(set(group_ids)), "Invalid group IDs: " + eid)
        for gid in group_ids:
            require(gid in group_by_id, "Unknown group: " + gid)
        referenced.update(group_ids)
        if entry["kind"] == "condition" or any("missing" in group_by_id[gid] for gid in group_ids):
            bilingual(entry.get("notice"), eid + ".notice")
        require(any(group_by_id[gid]["structureIds"] for gid in group_ids), "Entry offers no actual mapped structure: " + eid)
        sources = entry.get("sources")
        require(isinstance(sources,list) and sources, "Missing sources: " + eid)
        for source in sources:
            require(isinstance(source.get("title"),str) and source["title"].strip(), "Missing source title: " + eid)
            parsed = urlsplit(source.get("url",""))
            require(parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password, "Source must use HTTPS: " + eid)
            if "label" in source:
                bilingual(source["label"], eid + ".sources.label")
    require(referenced == group_by_id.keys(), "Unreferenced groups: " + ", ".join(sorted(group_by_id.keys()-referenced)))
    counts = Counter(e["kind"] for e in entries)
    require(counts["exercise"] > 0, "Exercise coverage must not be empty")
    require(counts["condition"] > 0, "Condition coverage must not be empty")
    if verify_meshes:
        for sid in mapped:
            item = structures[sid]
            data = ROOT/"models"/item["file"]
            require(data.is_file(), "Missing mesh file: " + str(data))
            require(hashlib.sha256(data.read_bytes()).hexdigest() == item["sha256"], "Mesh hash mismatch: " + sid)
    return {"groups":len(groups),"exercises":counts["exercise"],"conditions":counts["condition"],"mappedStructures":len(mapped),"missingOrPartialGroups":sum("missing" in g for g in groups)}

def main():
    manifest = json.loads((ROOT/"shared/anatomy-manifest.json").read_text())
    require(manifest == json.loads((ROOT/"models/manifest.json").read_text()), "Model/shared manifests differ")
    catalog = json.loads((ROOT/"models/learning.json").read_text())
    print(json.dumps(validate(catalog,manifest,verify_meshes=True),ensure_ascii=False))
if __name__ == "__main__":
    try:
        main()
    except (ValueError,KeyError,TypeError) as error:
        print("Learning validation failed: " + str(error),file=sys.stderr)
        raise SystemExit(1)
