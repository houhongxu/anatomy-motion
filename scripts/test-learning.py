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
        self.assert_invalid(lambda c:next(e for e in c["entries"] if e["id"]=="pull-up").pop("notice"))
    def test_reject_tendon_substitution(self):
        self.assert_invalid(lambda c:next(g for g in c["groups"] if g["id"]=="patellar-tendon").update(structureIds=["FJ1433"]))
if __name__ == "__main__":
    unittest.main()
