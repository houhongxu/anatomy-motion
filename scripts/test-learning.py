#!/usr/bin/env python3
"""学习目录反例测试 / Negative tests for learning catalog invariants."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("learning_validator",ROOT/"scripts/validate-learning.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class LearningValidationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads((ROOT/"models/learning.json").read_text())
        cls.manifest = json.loads((ROOT/"models/manifest.json").read_text())
        cls.manifest["structures"] += json.loads((ROOT/"shared/supplemental-manifest.json").read_text())["structures"]
    def assert_invalid(self, mutate):
        catalog = copy.deepcopy(self.catalog)
        mutate(catalog)
        with self.assertRaises(ValueError):
            module.validate(catalog,self.manifest)
    def test_v1_reference_frame_stays_fixed(self):
        self.assertEqual(self.manifest["coordinateTransform"], {"sourceCenter":[0.010500000000007503,-108.08885000000001,781.72995],"scale":0.0009946871419309136,"mapping":"(x,z,-y)"})
    def test_valid_catalog(self):
        self.assertGreater(module.validate(self.catalog,self.manifest)["conditions"],0)
    def test_reject_unknown_mesh(self):
        self.assert_invalid(lambda c:c["groups"][0]["structureIds"].append("FJ-unknown"))
    def test_reject_wrong_known_muscle(self):
        self.assert_invalid(lambda c:c["groups"][0].update(structureIds=["FJ1489"]))
    def test_reject_missing_bilingual_summary(self):
        self.assert_invalid(lambda c:c["entries"][0]["summary"].pop("zh"))
    def test_reject_http_source(self):
        self.assert_invalid(lambda c:c["entries"][0]["sources"][0].update(url="http://example.com"))
    def test_reject_missing_coverage_notice(self):
        self.assert_invalid(lambda c:next(e for e in c["entries"] if e["id"]=="plank").pop("notice"))
    def test_reject_tendon_substitution(self):
        self.assert_invalid(lambda c:next(g for g in c["groups"] if g["id"]=="patellar-tendon").update(structureIds=["FJ1433"]))
    def test_reject_unknown_category(self):
        self.assert_invalid(lambda c:c["entries"][0].update(category="other"))
    def test_reject_category_kind_mismatch(self):
        self.assert_invalid(lambda c:c["entries"][0].update(category="tcm"))
    def test_reject_missing_acupoint_list(self):
        self.assert_invalid(lambda c:c["entries"][0].pop("acupointCodes"))
    def test_reject_unknown_acupoint(self):
        self.assert_invalid(lambda c:c["entries"][0].update(acupointCodes=["LI999"]))
    def test_reject_duplicate_acupoint(self):
        self.assert_invalid(lambda c:c["entries"][0].update(acupointCodes=["LI4","LI4"]))
    def test_reject_unknown_group_even_with_valid_point(self):
        self.assert_invalid(lambda c:c["entries"][0].update(groupIds=["unknown"],acupointCodes=["LI4"]))
    def test_reject_unmapped_entry(self):
        self.assert_invalid(lambda c:c["entries"][0].update(groupIds=[],acupointCodes=[]))
    def test_reject_missing_only_group_without_point(self):
        self.assert_invalid(lambda c:c["entries"][0].update(groupIds=["multifidus"],acupointCodes=[]))
    def test_point_only_entries_need_no_invented_muscle_link(self):
        entries = [e for e in self.catalog["entries"] if e["category"] == "tcm"]
        self.assertEqual(len(entries),6)
        self.assertTrue(all(e["groupIds"] == [] and e["acupointCodes"] for e in entries))
        self.assertEqual(module.validate(self.catalog,self.manifest)["linkedAcupointCodes"],11)
    def test_bilateral_point_reference_uses_one_code(self):
        catalog = copy.deepcopy(self.catalog)
        catalog["entries"][0]["acupointCodes"] = ["LI4"]
        codes = {code for entry in self.catalog["entries"] for code in entry["acupointCodes"]}
        reference = {"points":[{"code":code} for code in codes] + [{"code":"LI4"}]}
        module.validate(catalog,self.manifest,acupuncture=reference)
    def test_new_stretch_targets_match_reviewed_source(self):
        entries = {e["id"]:e for e in self.catalog["entries"]}
        expected = {
            "straight-knee-heel-cord-stretch": ["gastrocnemius","soleus"],
            "bent-knee-heel-cord-stretch": ["soleus"],
            "knee-to-chest-stretch": ["gluteus-maximus","gluteus-medius"],
            "seated-hip-rotation-stretch": ["piriformis"],
            "passive-shoulder-external-rotation-stretch": ["infraspinatus-muscle","teres-minor"],
        }
        for eid,groups in expected.items():
            with self.subTest(entry=eid): self.assertEqual(entries[eid]["groupIds"],groups)
    def test_reject_wrong_new_group_crosswalk(self):
        self.assert_invalid(lambda c:next(g for g in c["groups"] if g["id"]=="teres-minor").update(structureIds=["FJ1419"]))
    def test_reviewed_piriformis_label_fallback(self):
        manifest = copy.deepcopy(self.manifest)
        for structure in manifest["structures"]:
            if structure["id"] in {"FJ1428","FJ1428M"}: structure.pop("nameZh",None)
        module.validate(self.catalog,manifest)
    def test_reject_unreviewed_missing_chinese_label(self):
        manifest = copy.deepcopy(self.manifest)
        next(s for s in manifest["structures"] if s["id"]=="FJ1419").pop("nameZh")
        with self.assertRaisesRegex(ValueError,"lacks reviewed Chinese name"):
            module.validate(self.catalog,manifest)
    def test_reject_piriformis_fallback_wrong_side(self):
        manifest = copy.deepcopy(self.manifest)
        structure = next(s for s in manifest["structures"] if s["id"]=="FJ1428")
        structure.pop("nameZh",None)
        structure["nameEn"] = "left piriformis"
        with self.assertRaisesRegex(ValueError,"fallback English mismatch"):
            module.validate(self.catalog,manifest)
if __name__ == "__main__":
    unittest.main()
