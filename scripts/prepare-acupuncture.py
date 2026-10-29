#!/usr/bin/env python3
"""生成独立皮肤与原创穴位示意 / Generate separate skin and original acupoint illustrations."""
import csv
import hashlib
import heapq
import importlib.util
import json
import math
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"
OFFSET = 0.002
ARCHIVE_SHA256 = "40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e"
STATUS = "illustrative-unreviewed"

# 原创种子仅表达大致体表区域，不是 WHO 提供的坐标或临床定位。
# Original seeds describe approximate surface regions, not WHO coordinates or clinical locations.
# code, Chinese name, pinyin, seed, broad region, anatomical landmark, printed WHO page.
CATALOG = [
 ("LU", "手太阴肺经", "Lung", "#e9bb57", [
  ("LU1","中府","Zhongfu",(0.13, 0.51, 0.07),"胸部","Chest","锁骨下外侧","Infraclavicular area",26),
  ("LU5","尺泽","Chize",(0.235, 0.25, 0.005),"肘部","Elbow","肱二头肌腱桡侧","Biceps tendon, radial side",28),
  ("LU7","列缺","Lieque",(0.27, 0.04, 0.015),"前臂","Forearm","桡骨茎突附近","Radial styloid area",29),
  ("LU9","太渊","Taiyuan",(0.275, 0.005, 0.03),"腕部","Wrist","掌侧桡侧腕横纹","Radial palmar crease",30)]),
 ("LI","手阳明大肠经","Large Intestine","#f29b54",[
  ("LI4","合谷","Hegu",(0.287, -0.025, 0.015),"手部","Hand","第二掌骨桡侧","Second metacarpal, radial side",35),
  ("LI10","手三里","Shousanli",(0.26, 0.2, -0.04),"前臂","Forearm","肘横纹下方桡侧","Proximal radial forearm",38),
  ("LI11","曲池","Quchi",(0.27, 0.265, -0.04),"肘部","Elbow","肘外侧横纹端","Lateral elbow crease",39),
  ("LI15","肩髃","Jianyu",(0.22, 0.51, -0.005),"肩部","Shoulder","肩峰前外侧","Anterior acromial area",41)]),
 ("ST","足阳明胃经","Stomach","#e6c748",[
  ("ST2","四白","Sibai",(0.032, 0.715, 0.08),"面部","Face","眶下孔附近","Infraorbital area",46),
  ("ST25","天枢","Tianshu",(0.045, 0.22, 0.105),"腹部","Abdomen","脐旁","Beside umbilicus",58),
  ("ST36","足三里","Zusanli",(0.105, -0.435, 0.035),"小腿","Leg","胫骨前肌近端","Proximal tibialis anterior",64),
  ("ST44","内庭","Neiting",(0.138, -0.83, 0.09),"足部","Foot","第二三趾间","Second/third toe web",68)]),
 ("SP","足太阴脾经","Spleen","#d4a04a",[
  ("SP6","三阴交","Sanyinjiao",(0.035, -0.66, -0.045),"小腿","Leg","内踝上方胫骨后缘","Medial tibial border",72),
  ("SP9","阴陵泉","Yinlingquan",(0.035, -0.385, -0.025),"膝部","Knee","胫骨内侧髁下方","Medial tibial condyle",74),
  ("SP10","血海","Xuehai",(0.05, -0.28, 0.04),"大腿","Thigh","股内侧肌隆起","Vastus medialis area",74),
  ("SP15","大横","Daheng",(0.095, 0.22, 0.095),"腹部","Abdomen","脐外侧","Lateral umbilical area",77)]),
 ("HT","手少阴心经","Heart","#ef6a72",[
  ("HT3","少海","Shaohai",(0.2, 0.255, 0.005),"肘部","Elbow","肱骨内上髁前方","Anterior medial epicondyle",83),
  ("HT5","通里","Tongli",(0.235, 0.045, 0.02),"前臂","Forearm","尺侧腕屈肌腱桡侧","Flexor carpi ulnaris border",84),
  ("HT7","神门","Shenmen",(0.24, 0.005, 0.035),"腕部","Wrist","豌豆骨桡侧","Pisiform, radial side",85),
  ("HT9","少冲","Shaochong",(0.224, -0.105, 0.07),"手指","Finger","小指桡侧甲角","Little fingernail, radial corner",86)]),
 ("SI","手太阳小肠经","Small Intestine","#e17b95",[
  ("SI3","后溪","Houxi",(0.223, -0.05, 0.035),"手部","Hand","第五掌指关节尺侧","Fifth knuckle, ulnar side",89),
  ("SI8","小海","Xiaohai",(0.205, 0.265, -0.085),"肘部","Elbow","鹰嘴与内上髁之间","Olecranon/medial epicondyle gap",91),
  ("SI11","天宗","Tianzong",(0.1, 0.455, -0.145),"肩胛部","Scapula","肩胛冈下窝","Infraspinous fossa",93),
  ("SI19","听宫","Tinggong",(0.075, 0.72, -0.005),"耳前","Preauricular","耳屏前方","Anterior tragus",97)]),
 ("BL","足太阳膀胱经","Bladder","#6ba8eb",[
  ("BL10","天柱","Tianzhu",(0.035, 0.63, -0.11),"颈后","Neck","枕下斜方肌外缘","Suboccipital trapezius border",104),
  ("BL23","肾俞","Shenshu",(0.035, 0.235, -0.105),"腰部","Lumbar","第二腰椎旁","Beside L2",111),
  ("BL40","委中","Weizhong",(0.08, -0.37, -0.085),"膝后","Knee","腘横纹中部","Popliteal crease",119),
  ("BL60","昆仑","Kunlun",(0.12, -0.745, -0.045),"踝部","Ankle","外踝与跟腱之间","Lateral malleolus/Achilles gap",129)]),
 ("KI","足少阴肾经","Kidney","#8f91e9",[
  ("KI1","涌泉","Yongquan",(0.11, -0.855, 0.055),"足底","Sole","足底前部凹陷","Anterior plantar hollow",136),
  ("KI3","太溪","Taixi",(0.035, -0.745, -0.045),"踝部","Ankle","内踝与跟腱之间","Medial malleolus/Achilles gap",137),
  ("KI7","复溜","Fuliu",(0.035, -0.69, -0.06),"小腿","Leg","跟腱前缘上方","Proximal Achilles border",139),
  ("KI27","俞府","Shufu",(0.045, 0.54, 0.05),"胸部","Chest","锁骨内侧下方","Inferior medial clavicle",149)]),
 ("PC","手厥阴心包经","Pericardium","#d278d8",[
  ("PC3","曲泽","Quze",(0.22, 0.255, 0.005),"肘部","Elbow","肱二头肌腱尺侧","Biceps tendon, ulnar side",153),
  ("PC6","内关","Neiguan",(0.25, 0.065, 0.025),"前臂","Forearm","掌长肌与桡侧腕屈肌腱间","Palmar flexor tendon interval",154),
  ("PC7","大陵","Daling",(0.255, 0.005, 0.04),"腕部","Wrist","掌侧腕横纹中部","Central palmar crease",155),
  ("PC8","劳宫","Laogong",(0.267, -0.035, 0.05),"掌部","Palm","第二三掌骨间","Second/third metacarpal interval",155)]),
 ("TE","手少阳三焦经","Triple Energizer","#56c8ca",[
  ("TE4","阳池","Yangchi",(0.26, 0.005, -0.005),"腕部","Wrist","腕背横纹","Dorsal wrist crease",159),
  ("TE5","外关","Waiguan",(0.245, 0.065, -0.025),"前臂","Forearm","桡尺骨背侧间隙","Dorsal radioulnar interval",160),
  ("TE10","天井","Tianjing",(0.235, 0.29, -0.09),"肘部","Elbow","鹰嘴上方","Above olecranon",162),
  ("TE17","翳风","Yifeng",(0.075, 0.69, -0.05),"耳后","Retroauricular","耳垂后下颌与乳突间","Mandible/mastoid interval",165)]),
 ("GB","足少阳胆经","Gallbladder","#6bc880",[
  ("GB20","风池","Fengchi",(0.05, 0.65, -0.105),"枕部","Occiput","胸锁乳突肌与斜方肌之间","Suboccipital muscle interval",181),
  ("GB21","肩井","Jianjing",(0.13, 0.56, -0.075),"肩部","Shoulder","颈后与肩峰之间","Neck/acromion interval",182),
  ("GB34","阳陵泉","Yanglingquan",(0.135, -0.4, -0.02),"小腿","Leg","腓骨头前下方","Anterior fibular head",188),
  ("GB40","丘墟","Qiuxu",(0.125, -0.765, 0.005),"踝部","Ankle","外踝前下方","Anterior lateral malleolus",191)]),
 ("LR","足厥阴肝经","Liver","#93bf56",[
  ("LR2","行间","Xingjian",(0.125, -0.835, 0.105),"足部","Foot","第一二趾间","First/second toe web",196),
  ("LR3","太冲","Taichong",(0.104, -0.81, 0.055),"足部","Foot","第一二跖骨间","First/second metatarsal interval",197),
  ("LR8","曲泉","Ququan",(0.035, -0.35, -0.05),"膝部","Knee","膝内侧横纹端","Medial knee crease",199),
  ("LR14","期门","Qimen",(0.09, 0.4, 0.115),"胸部","Chest","第六肋间隙附近","Sixth intercostal area",201)]),
 ("GV","督脉","Governor Vessel","#c499f2",[
  ("GV4","命门","Mingmen",(0, 0.235, -0.105),"腰部","Lumbar","第二腰椎下方正中","L2 posterior midline",205),
  ("GV14","大椎","Dazhui",(0, 0.58, -0.1),"颈后","Neck","第七颈椎下方正中","C7 posterior midline",210),
  ("GV20","百会","Baihui",(0, 0.85, -0.025),"头顶","Vertex","头顶正中","Cranial midline",213),
  ("GV24","神庭","Shenting",(0, 0.8, 0.055),"前额","Forehead","前发际正中上方","Anterior hairline midline",215)]),
 ("CV","任脉","Conception Vessel","#f38fb2",[
  ("CV4","关元","Guanyuan",(0, 0.13, 0.09),"下腹","Abdomen","脐与耻骨之间","Infraumbilical midline",221),
  ("CV6","气海","Qihai",(0, 0.18, 0.1),"下腹","Abdomen","脐下正中","Below umbilicus",222),
  ("CV12","中脘","Zhongwan",(0, 0.32, 0.11),"上腹","Abdomen","脐与胸骨之间","Supraumbilical midline",225),
  ("CV17","膻中","Danzhong",(0, 0.45, 0.12),"前胸","Chest","胸骨第四肋间水平","Sternal fourth-interspace level",228)]),
]

# 路径控制点是原创布局，不补造未纳入的穴位。长段增加解剖区域约束。
# Original route guides are not additional acupoints; they keep long spans in the intended region.
GUIDES = {
 "LU": {0:[(.19,.44,-.005),(.22,.34,-.01)]},
 "ST": {0:[(.035,.62,.015),(.05,.51,.07),(.045,.38,.11)],
        1:[(.045,.05,.08),(.075,-.15,.065),(.095,-.34,.035)]},
 "SP": {2:[(.035,-.13,.025),(.075,.03,.08)]},
 "SI": {2:[(.10,.54,-.11),(.065,.61,-.10)]},
 "BL": {1:[(.04,.05,-.14),(.07,-.12,-.10),(.08,-.25,-.08)]},
 "KI": {2:[(.035,-.43,-.055),(.035,-.2,-.01),(.035,.03,.08),(.025,.22,.10),(.03,.4,.115)]},
 "TE": {2:[(.20,.48,-.09),(.13,.55,-.075),(.07,.62,-.09)]},
 "GB": {1:[(.16,.44,-.10),(.145,.25,-.05),(.14,.05,-.06),(.145,-.15,-.03)]},
 "LR": {2:[(.045,-.12,.015),(.055,.04,.08),(.075,.24,.10)]},
 "GV": {1:[(0,.64,-.11),(0,.74,-.13)]},
}

def pair(zh, en):
    return {"zh": zh, "en": en}

def distance(a, b):
    return math.sqrt(sum((a[i] - b[i]) ** 2 for i in range(3)))

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def load_importer():
    spec = importlib.util.spec_from_file_location("prepare_models", ROOT / "scripts/prepare-models.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def make_skin():
    source = ROOT / ".cache/bodyparts3d-complete.zip"
    if digest(source) != ARCHIVE_SHA256:
        raise ValueError("Unexpected BodyParts3D source archive hash")
    with (ROOT / ".cache/isa_element_parts.txt").open(encoding="utf-8-sig") as stream:
        ids = {row["element file id"] for row in csv.DictReader(stream, delimiter="\t")
               if row["concept id"] == "FMA7163"}
    if ids != {"FJ2810"}:
        raise ValueError("Skin taxonomy no longer resolves uniquely to FJ2810")
    importer = load_importer()
    with zipfile.ZipFile(source) as archive:
        member = next(p for p in archive.namelist() if p.endswith("/FJ2810.obj"))
        raw = archive.read(member)
    vertices, indices = importer.obj_geometry(raw.decode())
    center, scale = importer.REFERENCE_CENTER, importer.REFERENCE_SCALE
    vertices = [((v[0]-center[0])*scale, (v[2]-center[2])*scale, -(v[1]-center[1])*scale)
                for v in vertices]
    # 闭合皮肤源的有向体积核对朝外绕序 / Check outward winding by signed volume.
    volume = sum(vertices[a][0]*(vertices[b][1]*vertices[c][2]-vertices[b][2]*vertices[c][1])
                 +vertices[a][1]*(vertices[b][2]*vertices[c][0]-vertices[b][0]*vertices[c][2])
                 +vertices[a][2]*(vertices[b][0]*vertices[c][1]-vertices[b][1]*vertices[c][0])
                 for a,b,c in zip(indices[::3],indices[1::3],indices[2::3])) / 6
    if volume < 0:
        indices = [i for a,b,c in zip(indices[::3],indices[1::3],indices[2::3]) for i in (a,c,b)]
    normals = [[0.,0.,0.] for _ in vertices]
    for a,b,c in zip(indices[::3],indices[1::3],indices[2::3]):
        u = [vertices[b][i]-vertices[a][i] for i in range(3)]
        v = [vertices[c][i]-vertices[a][i] for i in range(3)]
        n = (u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
        for index in (a,b,c):
            for axis in range(3):
                normals[index][axis] += n[axis]
    normals = [[v / (math.sqrt(sum(x*x for x in n)) or 1) for v in n] for n in normals]
    mesh = {"positions":[round(x,7) for p in vertices for x in p],
            "normals":[round(x,6) for n in normals for x in n], "indices":indices}
    return mesh, hashlib.sha256(raw).hexdigest(), abs(volume)

def dot(a,b):
    return sum(x*y for x,y in zip(a,b))

def sub(a,b):
    return tuple(x-y for x,y in zip(a,b))

def closest_triangle(point,a,b,c):
    """最近面内投影或边点 / Nearest interior projection or edge point."""
    ab,ac,ap = sub(b,a),sub(c,a),sub(point,a)
    aa,bb,cc = dot(ab,ab),dot(ab,ac),dot(ac,ac)
    denominator = aa*cc-bb*bb
    if denominator > 1e-24:
        u = (dot(ap,ab)*cc-dot(ap,ac)*bb)/denominator
        v = (dot(ap,ac)*aa-dot(ap,ab)*bb)/denominator
        if u >= 0 and v >= 0 and u+v <= 1:
            return tuple(a[i]+u*ab[i]+v*ac[i] for i in range(3))
    candidates = []
    for start,end in ((a,b),(b,c),(c,a)):
        edge = sub(end,start)
        t = max(0,min(1,dot(sub(point,start),edge)/(dot(edge,edge) or 1)))
        candidates.append(tuple(x+t*y for x,y in zip(start,edge)))
    return min(candidates,key=lambda candidate:distance(point,candidate))

class Surface:
    """皮肤局部检索与网格边路径 / Local skin lookup and mesh-edge routes."""
    def __init__(self, mesh):
        self.vertices = list(zip(*[iter(mesh["positions"])]*3))
        self.normals = list(zip(*[iter(mesh["normals"])]*3))
        self.cells = defaultdict(list)
        self.cell_size = .02
        for i,p in enumerate(self.vertices):
            self.cells[self.cell(p)].append(i)
        edges = [set() for _ in self.vertices]
        ids = mesh["indices"]
        for a,b,c in zip(ids[::3],ids[1::3],ids[2::3]):
            edges[a].update((b,c)); edges[b].update((a,c)); edges[c].update((a,b))
        # 来源包含外层与内层皮肤壳；只在最大外表面组件上定位，保留完整渲染网格。
        # The source has outer/inner skin shells; locate only on the largest outer component.
        components, seen = [], set()
        for index in range(len(self.vertices)):
            if index in seen: continue
            pending, component = [index], set([index])
            seen.add(index)
            while pending:
                current = pending.pop()
                for neighbor in edges[current]:
                    if neighbor not in seen:
                        seen.add(neighbor); component.add(neighbor); pending.append(neighbor)
            components.append(component)
        self.outer = max(components,key=len)
        self.cells.clear()
        for index in sorted(self.outer):
            self.cells[self.cell(self.vertices[index])].append(index)
        # OBJ 分块可能在同一坐标复制边界顶点；仅在路径图焊接精确重合点，源网格保持不变。
        # OBJ chunks duplicate seam vertices; weld exact positions in the route graph only.
        seams = defaultdict(list)
        for index, vertex in enumerate(self.vertices):
            seams[vertex].append(index)
        for group in seams.values():
            if len(group) > 1:
                for index in group:
                    edges[index].update(other for other in group if other != index)
        # 任督只走皮肤与矢状中面的交线，而不是偏离中线的原网格边。
        # Ren/Du follow the skin intersection with the midsagittal plane.
        self.midline_ids = set()
        plane_nodes = {}
        def plane_node(position, normal):
            key = tuple(round(x,6) for x in position)
            if key not in plane_nodes:
                index = len(self.vertices)
                plane_nodes[key] = index
                self.vertices.append(tuple(position))
                length = math.sqrt(sum(x*x for x in normal)) or 1
                self.normals.append(tuple(x/length for x in normal))
                edges.append(set())
                self.cells[self.cell(position)].append(index)
                self.midline_ids.add(index)
            return plane_nodes[key]
        for triangle in zip(ids[::3],ids[1::3],ids[2::3]):
            if triangle[0] not in self.outer: continue
            intersections = []
            for a,b in zip(triangle,triangle[1:]+triangle[:1]):
                va,vb = self.vertices[a],self.vertices[b]
                if va[0]*vb[0] < 0:
                    t = -va[0]/(vb[0]-va[0])
                    position = [0., va[1]+t*(vb[1]-va[1]), va[2]+t*(vb[2]-va[2])]
                    normal = [x+t*(y-x) for x,y in zip(self.normals[a],self.normals[b])]
                    intersections.append(plane_node(position,normal))
                elif va[0] == 0:
                    intersections.append(plane_node(va,self.normals[a]))
            intersections = list(dict.fromkeys(intersections))
            if len(intersections) == 2:
                a,b = intersections
                edges[a].add(b); edges[b].add(a)
        self.edges = [[(j,distance(p,self.vertices[j])) for j in sorted(edges[i])]
                      for i,p in enumerate(self.vertices)]
        self.triangles, self.triangle_cells = [], defaultdict(list)
        self.corrections = 0
        for a,b,c in zip(ids[::3],ids[1::3],ids[2::3]):
            if a not in self.outer: continue
            triangle = (self.vertices[a],self.vertices[b],self.vertices[c])
            index = len(self.triangles)
            self.triangles.append(triangle)
            low = [math.floor((min(p[k] for p in triangle)-.003)/.01) for k in range(3)]
            high = [math.floor((max(p[k] for p in triangle)+.003)/.01) for k in range(3)]
            for x in range(low[0],high[0]+1):
                for y in range(low[1],high[1]+1):
                    for z in range(low[2],high[2]+1):
                        self.triangle_cells[x,y,z].append(index)

    def cell(self, p):
        return tuple(math.floor(v/self.cell_size) for v in p)

    def nearest(self, p, side):
        origin = self.cell(p)
        best, best_d = None, float("inf")
        for radius in range(30):
            for x in range(-radius,radius+1):
                for y in range(-radius,radius+1):
                    for z in range(-radius,radius+1):
                        if max(abs(x),abs(y),abs(z)) != radius:
                            continue
                        for index in self.cells.get((origin[0]+x,origin[1]+y,origin[2]+z),()):
                            v = self.vertices[index]
                            if side == "left" and v[0] <= .002: continue
                            if side == "right" and v[0] >= -.002: continue
                            if side == "midline" and index not in self.midline_ids: continue
                            d = distance(p,v)
                            if (d,index) < (best_d,best if best is not None else len(self.vertices)):
                                best,best_d = index,d
            if best is not None and best_d < max(0,radius-1)*self.cell_size:
                return best
        raise ValueError("No surface projection for seed")

    def route(self, start, end, side):
        queue = [(distance(self.vertices[start],self.vertices[end]),0.,start)]
        costs, previous = {start:0.}, {}
        while queue:
            _, cost, index = heapq.heappop(queue)
            if cost != costs[index]: continue
            if index == end:
                path = [end]
                while path[-1] != start:
                    path.append(previous[path[-1]])
                return list(reversed(path))
            for neighbor,length in self.edges[index]:
                if side != "midline" and neighbor not in self.outer: continue
                x = self.vertices[neighbor][0]
                if side == "left" and x <= .001: continue
                if side == "right" and x >= -.001: continue
                if side == "midline" and abs(x) > .015: continue
                penalty = 1 + (abs(x)*300 if side == "midline" else 0)
                new_cost = cost + length*penalty
                if new_cost < costs.get(neighbor,float("inf")):
                    costs[neighbor] = new_cost
                    previous[neighbor] = index
                    heuristic = distance(self.vertices[neighbor],self.vertices[end])
                    heapq.heappush(queue,(new_cost+heuristic,new_cost,neighbor))
        raise ValueError(f"No connected skin path: {side} {start} -> {end}")

    def outside(self, position):
        # 腋下等凹折处，顶点平均法线可能进入邻近面；仅对此做局部面投影校正。
        # Averaged normals can enter an adjacent fold; correct only those local cases.
        for _ in range(8):
            cell = tuple(math.floor(x/.01) for x in position)
            candidates = self.triangle_cells.get(cell,())
            if not candidates: raise ValueError("Missing local outer skin triangles")
            q,triangle = min(((closest_triangle(position,*self.triangles[i]),self.triangles[i])
                              for i in candidates),key=lambda pair:distance(position,pair[0]))
            ab,ac = sub(triangle[1],triangle[0]),sub(triangle[2],triangle[0])
            normal = (ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])
            length = math.sqrt(dot(normal,normal)) or 1
            if dot(sub(position,q),normal)/length >= -.000001:
                return [round(x,7) for x in position]
            position = [q[i]+OFFSET*normal[i]/length for i in range(3)]
            self.corrections += 1
        raise ValueError("Could not offset outside a local skin fold")

    def offset(self, index):
        return self.outside([v+OFFSET*n for v,n in zip(self.vertices[index],self.normals[index])])

    def sample_route(self, ids):
        points = [self.offset(ids[0])]
        remaining = .003
        for a,b in zip(ids,ids[1:]):
            length = distance(self.vertices[a],self.vertices[b])
            consumed = 0.
            while remaining <= length-consumed:
                consumed += remaining
                t = consumed/length
                p = [(1-t)*x+t*y for x,y in zip(self.vertices[a],self.vertices[b])]
                n = [(1-t)*x+t*y for x,y in zip(self.normals[a],self.normals[b])]
                magnitude = math.sqrt(sum(x*x for x in n)) or 1
                points.append(self.outside([v+OFFSET*n[i]/magnitude for i,v in enumerate(p)]))
                remaining = .003
            remaining -= length-consumed
        if distance(points[-1],self.offset(ids[-1])) > .00001:
            points.append(self.offset(ids[-1]))
        return points

def original_assets():
    paths = [MODELS/"manifest.json", ROOT/"shared/anatomy-manifest.json"]
    manifest = json.loads(paths[0].read_text())
    paths += [MODELS/s["file"] for s in manifest["structures"]]
    return {str(p):digest(p) for p in paths}

def main():
    before = original_assets()
    mesh, obj_hash, volume = make_skin()
    target = MODELS/"skin.json"
    target.write_text(json.dumps(mesh,separators=(",",":"))+"\n")
    surface = Surface(mesh)
    meridians, points = [], []
    for mid,zh,en,color,entries in CATALOG:
        branches = []
        sides = ("midline",) if mid in ("GV","CV") else ("left","right")
        for side in sides:
            sign = -1 if side == "right" else 1
            anchors = []
            for number,entry in enumerate(entries):
                code,name,pinyin,seed,region_zh,region_en,landmark_zh,landmark_en,page = entry
                seed = (sign*seed[0],seed[1],seed[2])
                index = surface.nearest(seed,side)
                anchors.append(index)
                points.append({"id":f"{code}-{side}","code":code,"name":pair(name,pinyin),
                    "meridianId":mid,"side":side,"position":surface.offset(index),
                    "region":pair(region_zh,region_en),"landmark":pair(landmark_zh,landmark_en),
                    "sourceIds":["who2008","who2009copy"],"sourcePages":[page],
                    "reviewStatus":STATUS})
                for guide in GUIDES.get(mid,{}).get(number,[]):
                    anchors.append(surface.nearest((sign*guide[0],guide[1],guide[2]),side))
            path = [anchors[0]]
            for a,b in zip(anchors,anchors[1:]):
                path.extend(surface.route(a,b,side)[1:])
            branches.append({"side":side,"points":surface.sample_route(path)})
        meridians.append({"id":mid,"name":pair(zh,en),"color":color,"paths":branches})
        print(f"{mid}: {sum(len(p['points']) for p in branches)} surface samples")
    manifest = json.loads((MODELS/"manifest.json").read_text())
    result = {"version":1,"coordinateSpace":"bodyparts3d-v1","reviewStatus":STATUS,
        "sources":[
            {"id":"who2008","title":"WHO Standard Acupuncture Point Locations in the Western Pacific Region (2008)",
             "url":"https://library.wpro.who.int/cgi-bin/koha/opac-detail.pl?biblionumber=11227"},
            {"id":"who2009copy","title":"WHO Standard Acupuncture Point Locations (updated and reprinted 2009; MEDBOX copy)",
             "url":"https://www.medbox.org/dl/627a4de115110145a1723f64"},
            {"id":"bodyparts3d","title":"BodyParts3D 4.0 — Database Center for Life Science",
             "url":manifest["sourceUrl"]}],
        "skin":{"file":"skin.json","sourceElement":"FJ2810","sha256":digest(target),
                "source":manifest["source"],"license":manifest["license"],
                "attribution":manifest["attribution"],"sourceArchiveSha256":ARCHIVE_SHA256,
                "sourceObjSha256":obj_hash,"vertexCount":len(mesh["positions"])//3,
                "triangleCount":len(mesh["indices"])//3,"outerVertexCount":len(surface.outer),"surfaceOffset":OFFSET,
                "coordinateTransform":manifest["coordinateTransform"]},
        "meridians":meridians,"points":points}
    (MODELS/"acupuncture.json").write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n")
    if before != original_assets():
        raise RuntimeError("Existing anatomy assets changed")
    print(f"Generated {len(points)} instances / {len({p['code'] for p in points})} codes; skin {target.stat().st_size} bytes; volume {volume:.6f}")
    print(f"Existing anatomy files unchanged: {len(before)}; local fold corrections: {surface.corrections}")

if __name__ == "__main__":
    main()
