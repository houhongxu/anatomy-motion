#!/usr/bin/env python3
"""验证提交的皮肤/经络资产，不依赖下载缓存 / Validate committed skin/meridian assets without downloads."""
import hashlib
import importlib.util
import json
import math
import re
import unittest
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("prepare_acupuncture", ROOT/"scripts/prepare-acupuncture.py")
GEN = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GEN)

def dot(a,b):
    return sum(x*y for x,y in zip(a,b))

def sub(a,b):
    return tuple(x-y for x,y in zip(a,b))

def add_scaled(a,b,t):
    return tuple(x+t*y for x,y in zip(a,b))

def closest_segment(point,a,b):
    edge = sub(b,a)
    t = max(0,min(1,dot(sub(point,a),edge)/(dot(edge,edge) or 1)))
    return add_scaled(a,edge,t)

def closest_triangle(point,a,b,c):
    """面内正交投影或最近边 / Orthogonal interior projection or nearest edge."""
    ab,ac = sub(b,a),sub(c,a)
    ap = sub(point,a)
    aa,bb,cc = dot(ab,ab),dot(ab,ac),dot(ac,ac)
    denominator = aa*cc-bb*bb
    if denominator > 1e-24:
        u = (dot(ap,ab)*cc-dot(ap,ac)*bb)/denominator
        v = (dot(ap,ac)*aa-dot(ap,ab)*bb)/denominator
        if u >= 0 and v >= 0 and u+v <= 1:
            return tuple(a[i]+u*ab[i]+v*ac[i] for i in range(3))
    candidates = [closest_segment(point,a,b),closest_segment(point,b,c),closest_segment(point,c,a)]
    return min(candidates,key=lambda p:dot(sub(point,p),sub(point,p)))

class AcupunctureAssets(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT/"models/acupuncture.json").read_text())
        cls.mesh = json.loads((ROOT/"models/skin.json").read_text())
        cls.surface = GEN.Surface(cls.mesh)
        cls.vertices = cls.surface.vertices
        cls.triangles = []
        cls.cells = defaultdict(list)
        cls.cell_size = .01
        indices = cls.mesh["indices"]
        for a,b,c in zip(indices[::3],indices[1::3],indices[2::3]):
            if a not in cls.surface.outer:
                continue
            triangle = (cls.vertices[a],cls.vertices[b],cls.vertices[c])
            index = len(cls.triangles)
            cls.triangles.append(triangle)
            low = [math.floor((min(p[k] for p in triangle)-.0023)/cls.cell_size) for k in range(3)]
            high = [math.floor((max(p[k] for p in triangle)+.0023)/cls.cell_size) for k in range(3)]
            for x in range(low[0],high[0]+1):
                for y in range(low[1],high[1]+1):
                    for z in range(low[2],high[2]+1):
                        cls.cells[x,y,z].append(index)

    def surface_distance(self, point):
        cell = tuple(math.floor(x/self.cell_size) for x in point)
        candidates = self.cells.get(cell,())
        self.assertTrue(candidates,"No outer-surface triangles near position")
        closest, triangle = min(((closest_triangle(point,*self.triangles[i]),self.triangles[i])
                                 for i in candidates),key=lambda pair:GEN.distance(point,pair[0]))
        ab,ac = sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0])
        normal = (ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])
        length = math.sqrt(dot(normal,normal)) or 1
        signed = dot(sub(point,closest),normal)/length
        self.assertGreaterEqual(signed,-.0001,f"Position penetrates outer skin: {point}")
        return GEN.distance(point,closest)

    def test_geometry_and_hash(self):
        m = self.mesh
        self.assertEqual(set(m),{"positions","normals","indices"})
        self.assertEqual(len(m["positions"]),len(m["normals"]))
        self.assertEqual(len(m["positions"])%3,0)
        self.assertEqual(len(m["indices"])%3,0)
        self.assertTrue(all(math.isfinite(x) for x in m["positions"]+m["normals"]))
        count = len(m["positions"])//3
        self.assertTrue(all(type(i) is int and 0 <= i < count for i in m["indices"]))
        self.assertEqual(count,102467)
        self.assertEqual(len(m["indices"])//3,203382)
        self.assertEqual(self.data["skin"]["vertexCount"],count)
        self.assertEqual(self.data["skin"]["triangleCount"],len(m["indices"])//3)
        self.assertEqual(self.data["skin"]["outerVertexCount"],len(self.surface.outer))
        self.assertEqual(GEN.digest(ROOT/"models/skin.json"),self.data["skin"]["sha256"])
        for normal in zip(*[iter(m["normals"])]*3):
            self.assertAlmostEqual(dot(normal,normal),1,delta=.00001)
        self.assertEqual(self.data["skin"]["coordinateTransform"],
                         json.loads((ROOT/"models/manifest.json").read_text())["coordinateTransform"])
        for axis,(lo,hi) in enumerate([(-.333,.332),(-.856,.856),(-.153,.139)]):
            values = m["positions"][axis::3]
            self.assertGreaterEqual(min(values),lo)
            self.assertLessEqual(max(values),hi)

    def test_provenance_and_optional_source_cache(self):
        skin = self.data["skin"]
        self.assertEqual(skin["sourceElement"],"FJ2810")
        self.assertEqual(skin["file"],"skin.json")
        self.assertEqual(skin["license"],"CC BY 4.0")
        self.assertIn("Database Center for Life Science",skin["attribution"])
        self.assertEqual(skin["sourceArchiveSha256"],GEN.ARCHIVE_SHA256)
        self.assertEqual(skin["sourceObjSha256"],"682f402206f15592acdeaae8ffb6b34c3e5c3267fa4685e63d2e4920ef2a80e0")
        archive_path = ROOT/".cache/bodyparts3d-complete.zip"
        if archive_path.exists():
            self.assertEqual(GEN.digest(archive_path),skin["sourceArchiveSha256"])
            with zipfile.ZipFile(archive_path) as archive:
                raw = archive.read(next(p for p in archive.namelist() if p.endswith("/FJ2810.obj")))
            self.assertEqual(hashlib.sha256(raw).hexdigest(),skin["sourceObjSha256"])
        sources = self.data["sources"]
        self.assertEqual(len({s["id"] for s in sources}),len(sources))
        self.assertTrue(all(s["title"] and s["url"].startswith("https://") for s in sources))
        self.assertTrue({"who2008","who2009copy","bodyparts3d"} <= {s["id"] for s in sources})

    def test_point_contract_and_reviewed_names(self):
        data = self.data
        self.assertEqual(data["version"],1)
        self.assertEqual(data["coordinateSpace"],"bodyparts3d-v1")
        self.assertEqual(data["reviewStatus"],"illustrative-unreviewed")
        ids = [p["id"] for p in data["points"]]
        self.assertEqual(len(ids),len(set(ids)))
        expected = {e[0]:(mid,e) for mid,_,_,_,entries in GEN.CATALOG for e in entries}
        self.assertEqual({p["code"] for p in data["points"]},set(expected))
        sources = {s["id"] for s in data["sources"]}
        instances = Counter()
        for point in data["points"]:
            mid,entry = expected[point["code"]]
            self.assertEqual(point["id"],point["code"]+"-"+point["side"])
            self.assertEqual(point["meridianId"],mid)
            self.assertEqual(point["name"],GEN.pair(entry[1],entry[2]))
            self.assertEqual(point["reviewStatus"],GEN.STATUS)
            self.assertTrue(point["sourceIds"] and set(point["sourceIds"]) <= sources)
            self.assertEqual(point["sourcePages"],[entry[-1]])
            for field in ("name","region","landmark"):
                self.assertTrue(all(isinstance(point[field].get(lang),str) and point[field][lang]
                                    for lang in ("zh","en")))
            self.check_position(point["position"],point["side"])
            self.assertLessEqual(self.surface_distance(point["position"]),.00201)
            instances[point["code"]] += 1
        for code,(mid,_) in expected.items():
            self.assertEqual(instances[code],1 if mid in ("GV","CV") else 2)

    def check_position(self, point, side):
        self.assertEqual(len(point),3)
        self.assertTrue(all(isinstance(v,(int,float)) and math.isfinite(v) for v in point))
        for value,limit in zip(point,(.335,.86,.156)):
            self.assertLessEqual(abs(value),limit)
        if side == "left": self.assertGreater(point[0],0)
        elif side == "right": self.assertLess(point[0],0)
        elif side == "midline": self.assertLess(abs(point[0]),.0021)
        else: self.fail("Unknown anatomical side")

    def test_routes_are_separate_and_on_outer_skin(self):
        meridians = self.data["meridians"]
        expected = {"LU","LI","ST","SP","HT","SI","BL","KI","PC","TE","GB","LR","GV","CV"}
        self.assertEqual({m["id"] for m in meridians},expected)
        self.assertEqual(len(meridians),14)
        samples = 0
        maximum_error = 0.
        for meridian in meridians:
            mid = meridian["id"]
            self.assertRegex(meridian["color"],r"^#[0-9a-fA-F]{6}$")
            self.assertTrue(meridian["name"]["zh"] and meridian["name"]["en"])
            sides = ["midline"] if mid in ("GV","CV") else ["left","right"]
            self.assertEqual([b["side"] for b in meridian["paths"]],sides)
            for branch in meridian["paths"]:
                positions = branch["points"]
                self.assertGreater(len(positions),2)
                for point in positions:
                    self.check_position(point,branch["side"])
                    error = self.surface_distance(point)
                    maximum_error = max(maximum_error,error)
                    self.assertLessEqual(error,.00201)
                for a,b in zip(positions,positions[1:]):
                    self.assertLessEqual(GEN.distance(a,b),.006)
                    # 检查线段中点，避免采样端点贴肤但弦线穿体。
                    # Check segment midpoints as well as endpoints.
                    midpoint = [(x+y)/2 for x,y in zip(a,b)]
                    self.assertLessEqual(self.surface_distance(midpoint),.0023)
                anchors = [p for p in self.data["points"] if p["meridianId"] == mid and p["side"] == branch["side"]]
                for anchor in anchors:
                    self.assertLessEqual(min(GEN.distance(anchor["position"],p) for p in positions),.004)
                samples += len(positions)
        print(f"Outer-skin route samples: {samples}; maximum surface distance: {maximum_error:.7f}")
        self.assertLess(samples,20000)

    def test_front_back_and_hand_foot_landmarks(self):
        points = {p["id"]:p["position"] for p in self.data["points"]}
        for code in ("ST2","ST25","ST36","CV4","CV12","CV17"):
            side = "midline" if code.startswith("CV") else "left"
            self.assertGreater(points[f"{code}-{side}"][2],0,code)
        for code in ("SI11","BL10","BL23","BL40","GV4","GV14"):
            side = "midline" if code.startswith("GV") else "left"
            self.assertLess(points[f"{code}-{side}"][2],0,code)
        self.assertGreater(points["ST44-left"][2],.05)
        self.assertGreater(points["LR2-left"][2],.05)
        self.assertLess(GEN.distance(points["HT9-left"],(.2213,-.0983,.0676)),.025)
        self.assertGreater(points["PC7-left"][2],points["TE4-left"][2])
        self.assertGreater(points["PC8-left"][2],points["LI4-left"][2])
        self.assertGreater(points["LU5-left"][2],points["SI8-left"][2])
        self.assertGreater(points["SP10-left"][2],0)
        self.assertLess(GEN.distance(points["LI4-left"],(.274,-.0224,.0209)),.04)

    def test_existing_record_catalog_is_separate(self):
        main = json.loads((ROOT/"models/manifest.json").read_text())
        shared = json.loads((ROOT/"shared/anatomy-manifest.json").read_text())
        self.assertEqual(main,shared)
        existing = {s["id"] for s in main["structures"]}
        self.assertNotIn("FJ2810",existing)
        self.assertFalse(existing & {p["id"] for p in self.data["points"]})
        self.assertTrue(all(s["kind"] in ("muscle","tendon","bone") for s in main["structures"]))

if __name__ == "__main__":
    unittest.main(verbosity=2)
