import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import vm from "node:vm";
const source = readFileSync(
  new URL("../assets/scripts/acupuncture.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const {
  validateAcupuncture,
  queryPoints,
  pickSurfacePoint,
  routeMesh,
  pointMesh,
  splitSurfaceMesh,
  surfaceView,
} = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
const point = (id, code, zh, en, meridianId = "LU") => ({
  id,
  code,
  name: { zh, en },
  meridianId,
  side: "left",
  position: [0, 1, 0.2],
  region: { zh: "上肢", en: "Upper limb" },
  sourceIds: ["who2008"],
  reviewStatus: "illustrative-unreviewed",
});
const fixture = () => ({
  version: 1,
  coordinateSpace: "bodyparts3d-v1",
  reviewStatus: "illustrative-unreviewed",
  skin: { file: "skin.json" },
  sources: [],
  meridians: [
    {
      id: "LU",
      name: { zh: "肺经", en: "Lung" },
      color: "#a85d42",
      paths: [
        {
          side: "left",
          points: [
            [0, 1, 0],
            [0, 2, 0],
          ],
        },
      ],
    },
    {
      id: "LI",
      name: { zh: "大肠经", en: "Large intestine" },
      color: "#526fa0",
      paths: [
        {
          side: "left",
          points: [
            [0, 1, 0],
            [0, 2, 0],
          ],
        },
      ],
    },
  ],
  points: [
    point("LU1-left", "LU1", "中府", "Zhongfu"),
    point("LI4-left", "LI4", "合谷", "Hegu", "LI"),
  ],
});
test("中英文名、编号与经络组合搜索 / Names, codes and meridian filter combine", () => {
  const data = validateAcupuncture(fixture());
  assert.equal(queryPoints(data, "中府")[0].id, "LU1-left");
  assert.equal(queryPoints(data, "ZHONGFU")[0].code, "LU1");
  assert.equal(queryPoints(data, "li4", "LI")[0].name.en, "Hegu");
  assert.equal(queryPoints(data, "合谷", "LU").length, 0);
});
test("拒绝错位坐标、重复编号与未知经络 / Reject incompatible coordinates, duplicate IDs and missing meridians", () => {
  const wrong = fixture();
  wrong.coordinateSpace = "other";
  assert.throws(() => validateAcupuncture(wrong));
  const duplicate = fixture();
  duplicate.points.push(duplicate.points[0]);
  assert.throws(() => validateAcupuncture(duplicate));
  const invalid = fixture();
  invalid.points[0].position[0] = NaN;
  assert.throws(() => validateAcupuncture(invalid));
  const missing = fixture();
  missing.points[0].meridianId = "XX";
  assert.throws(() => validateAcupuncture(missing));
});
test("触控容差不选背面或相机后方穴位 / Touch tolerance excludes occluded and behind-camera points", () => {
  const front = { id: "front" },
    back = { id: "back" },
    behind = { id: "behind" };
  const candidates = [
    { point: back, x: 100, y: 100, depth: 3 },
    { point: front, x: 119, y: 100, depth: 2 },
    { point: behind, x: 100, y: 100, depth: -1 },
  ];
  assert.equal(
    pickSurfacePoint(candidates, 100, 100, (p) => p.id !== "back"),
    front,
  );
  assert.equal(
    pickSurfacePoint(candidates, 150, 150, () => true),
    null,
  );
  assert.equal(
    pickSurfacePoint(candidates, 100, 100, () => false),
    null,
  );
});
test("路径不跨接左右分段且球面朝外 / Routes preserve separate sides and sphere faces point outward", () => {
  const mesh = routeMesh([
    [
      [0, 0, 0],
      [0, 1, 0],
    ],
    [
      [3, 0, 0],
      [3, 1, 0],
    ],
  ]);
  assert.equal(mesh.positions.length / 3, 24);
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const group = mesh.indices.slice(i, i + 3).map((n) => n < 12);
    assert.ok(group.every((v) => v === group[0]));
  }
  const sphere = pointMesh();
  for (let i = 0; i < sphere.indices.length; i += 3) {
    const [a, b, c] = sphere.indices
      .slice(i, i + 3)
      .map((n) => sphere.positions.slice(n * 3, n * 3 + 3));
    const u = b.map((n, j) => n - a[j]),
      v = c.map((n, j) => n - a[j]);
    const cross = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    assert.ok(cross.reduce((sum, n, j) => sum + n * a[j], 0) >= -1e-15);
  }
});

test("大皮肤网格无损分块并限制16位索引 / Large skin meshes split losslessly within 16-bit indices", () => {
  const mesh = { positions: [], normals: [], indices: [] };
  for (let i = 0; i < 70002; i++) {
    mesh.positions.push(i, i + 1, i + 2);
    mesh.normals.push(0, 1, 0);
    mesh.indices.push(i);
  }
  const chunks = splitSurfaceMesh(mesh);
  assert.equal(chunks.length, 2);
  assert.equal(
    chunks.reduce((sum, c) => sum + c.indices.length, 0),
    mesh.indices.length,
  );
  const original = mesh.indices.map((index) => mesh.positions[index * 3]);
  const reconstructed = chunks.flatMap((chunk) => {
    assert.ok(chunk.positions.length / 3 <= 60000);
    assert.ok(chunk.indices.every((index) => index < 65536));
    return chunk.indices.map((index) => chunk.positions[index * 3]);
  });
  assert.deepEqual(reconstructed, original);
});

function controller() {
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.dataset = {};
      this.style = {};
    }
    append(...children) {
      this.children.push(...children);
    }
    replaceChildren(...children) {
      this.children = children;
    }
    querySelectorAll() {
      return [];
    }
  }
  const raw = readFileSync(
    new URL("../assets/scripts/AtlasBootstrap.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(raw, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      experimentalDecorators: true,
    },
  }).outputText;
  const exports = {};
  const cc = {
    _decorator: { ccclass: () => (target) => target, property: () => () => {} },
    Component: class {},
    Material: class {},
    Vec3: class {
      constructor(x = 0, y = 0, z = 0) {
        Object.assign(this, { x, y, z });
      }
    },
  };
  const context = {
    exports,
    console,
    document: { createElement: (tag) => new Element(tag) },
    require: (name) => {
      if (name === "cc") return cc;
      if (name === "./geometry") return { localDate: () => "2026-10-28" };
      if (name === "./i18n")
        return { t: (key) => key, localized: (value) => value.en };
      if (name === "./acupuncture") return { surfaceView };
      return {};
    },
  };
  vm.runInNewContext(compiled, context);
  const atlas = new exports.AtlasBootstrap();
  atlas.acupuncture = fixture();
  atlas.surfaceControls = new Element("div");
  atlas.detail = new Element("section");
  atlas.fit = () => {};
  atlas.setMobilePane = () => {};
  atlas.applyVisibility = () => {};
  return atlas;
}
test("列表穴位选择不会创建肌肉酸痛表单且保留已有记录 / Point list selection cannot create a soreness form and preserves records", () => {
  const atlas = controller();
  atlas.explorerTab = "acupuncture";
  atlas.skinData = {
    positions: [-1, 0, -1, 1, 2, 1],
    normals: [0, 0, -1, 0, 0, 1],
  };
  atlas.selected = { info: { kind: "muscle" } };
  atlas.editing = "existing";
  const records = [{ id: "record", structureId: "muscle", intensity: 3 }];
  atlas.records = records;
  atlas.selectSurfacePoint(atlas.acupuncture.points[0]);
  assert.equal(atlas.selected, null);
  assert.equal(atlas.editing, null);
  assert.equal(atlas.records, records);
  assert.equal(atlas.surfaceSelection.code, "LU1");
  const flatten = (element) => [
    element.tag,
    element.textContent || "",
    ...element.children.flatMap(flatten),
  ];
  const contents = flatten(atlas.detail);
  assert.ok(contents.includes("acupunctureRecordNotice"));
  assert.ok(
    !contents.includes("form") &&
      !contents.includes("input") &&
      !contents.includes("textarea"),
  );
});
test("进入体表探索绕过旧独显，退出恢复原组织筛选 / Surface view bypasses prior isolation and restores tissue filters on exit", () => {
  const atlas = controller();
  atlas.overlay = { querySelector: () => null };
  atlas.renderDetail = () => {};
  atlas.hidden = new Set(["hidden-muscle"]);
  atlas.isolated = "isolated-muscle";
  atlas.enabledLayers = new Set(["superficial"]);
  atlas.parts = [
    { info: { id: "hidden-muscle", kind: "muscle", layer: "superficial" } },
  ];
  atlas.colorPart = () => {};
  atlas.skinRenderer = {};
  atlas.switchExplorer("acupuncture");
  assert.equal(atlas.visible(atlas.parts[0]), false);
  atlas.surfaceLayers.delete("skin");
  assert.equal(atlas.visible(atlas.parts[0]), true);
  atlas.switchExplorer("structures");
  assert.equal(atlas.visible(atlas.parts[0]), false);
  assert.equal(atlas.isolated, "isolated-muscle");
  assert.ok(atlas.hidden.has("hidden-muscle"));
  assert.deepEqual(Array.from(atlas.enabledLayers), ["superficial"]);
});

test("腕掌背按局部皮肤法线取向，头顶俯仰有界 / Wrist palm/dorsum use local normals and crown pitch stays bounded", () => {
  const mesh = {
    positions: [0.7, 0.9, 0.1, 0.7, 0.9, -0.1, 0, 2, 0],
    normals: [0, 0, 1, 0, 0, -1, 0, 1, 0],
    indices: [0, 1, 2],
  };
  assert.equal(surfaceView(mesh, [0.7, 0.9, 0.102]).yaw, 0);
  assert.equal(Math.abs(surfaceView(mesh, [0.7, 0.9, -0.102]).yaw), Math.PI);
  assert.equal(surfaceView(mesh, [0, 2.002, 0]).pitch, 1.1);
});

test("高密度经络也分块避免16位截断 / Dense meridian routes also split before 16-bit mesh creation", () => {
  const path = Array.from({ length: 6002 }, (_, i) => [0, i * 0.003, 0]);
  const route = routeMesh([path]);
  assert.ok(route.positions.length / 3 > 65535);
  const chunks = splitSurfaceMesh(route);
  assert.ok(chunks.length > 1);
  assert.equal(
    chunks.reduce((sum, chunk) => sum + chunk.indices.length, 0),
    route.indices.length,
  );
  assert.ok(
    chunks.every(
      (chunk) =>
        chunk.positions.length / 3 <= 60000 &&
        chunk.indices.every((index) => index < 65536),
    ),
  );
});
