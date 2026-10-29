// 运行官方构建的纯模块。 / Execute the pure module from the official build.
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const file = resolve(root, "build/web-desktop/src/chunks/bundle.js");
if (!existsSync(file)) {
  console.error("请先执行官方 Web 构建。 / Run the official Web build first.");
  process.exit(1);
}
const source = readFileSync(file, "utf8");
assert.ok(
  !/\.concat\(\s*new Set\b/.test(source),
  "Cocos loose spread must not concatenate a Set",
);
assert.ok(
  !/\.concat\([^)]*\.values\(\)/.test(source),
  "Cocos loose spread must not concatenate an iterator",
);
const registry = new Map(),
  anonymous = [];
const System = {
  register(name, deps, factory) {
    if (typeof name === "string") registry.set(name, { deps, factory });
    else anonymous.push({ deps: name, factory: deps });
  },
};
vm.runInNewContext(
  source,
  { System, console },
  { filename: file, timeout: 1000 },
);
for (const record of anonymous) {
  assert.equal(record.deps.length, 0);
  record.factory(() => {}, {}).execute();
}
// 递归执行官方产物及其真实Babel辅助模块。 / Execute compiled modules with their actual Babel helpers.
const moduleCache = new Map();
function loadCompiled(name) {
  if (name === "cc") return { cclegacy: { _RF: { push() {}, pop() {} } } };
  if (moduleCache.has(name)) return moduleCache.get(name);
  const record = registry.get(name);
  assert.ok(record, `Compiled module must exist: ${name}`);
  const exports = {};
  moduleCache.set(name, exports);
  const instance = record.factory((key, value) => {
    if (typeof key === "string") {
      exports[key] = value;
      return value;
    }
    Object.assign(exports, key);
    return key;
  }, {});
  for (let i = 0; i < record.deps.length; i++) {
    const dependency = record.deps[i];
    const resolved =
      dependency === "cc" ? dependency : new URL(dependency, name).href;
    instance.setters[i](loadCompiled(resolved));
  }
  instance.execute();
  return exports;
}
const exports = loadCompiled("chunks:///_virtual/learning.ts");
assert.equal(typeof exports.matchLearningEntry, "function");
const catalog = JSON.parse(
    readFileSync(resolve(root, "../models/learning.json")),
  ),
  manifest = JSON.parse(readFileSync(resolve(root, "../models/manifest.json")));
const loaded = new Set(manifest.structures.map((s) => s.id));
const match = (ids) =>
  exports.matchLearningEntry({ groupIds: ids }, catalog.groups, loaded);
const biceps = match(["biceps-brachii"]);
assert.equal(biceps.ids.length, 4);
assert.ok(
  Array.from(biceps.ids).every(
    (id) => typeof id === "string" && loaded.has(id),
  ),
);
const calf = match(["gastrocnemius", "soleus"]);
assert.equal(calf.ids.length, 6);
const entry = catalog.entries.find((e) => e.id === "pull-up");
assert.ok(entry);
const pullup = exports.matchLearningEntry(entry, catalog.groups, loaded);
assert.ok(pullup.ids.length > 0);
assert.equal(pullup.coverage, "partial");
assert.ok(
  Array.from(pullup.incompleteGroups).some((g) => g.id === "latissimus-dorsi"),
);
console.log(
  `官方构建检查通过 / Official bundle check passed: biceps=${biceps.ids.length}, calf=${calf.ids.length}, pull-up=${pullup.ids.length} (partial).`,
);

const surfaceExports = loadCompiled("chunks:///_virtual/acupuncture.ts");
const surfaceCatalog = JSON.parse(
  readFileSync(resolve(root, "../models/acupuncture.json")),
);
surfaceExports.validateAcupuncture(surfaceCatalog);
assert.equal(surfaceCatalog.meridians.length, 14);
const representative = surfaceCatalog.points[0];
assert.ok(
  surfaceExports
    .queryPoints(surfaceCatalog, representative.code, representative.meridianId)
    .some((p) => p.id === representative.id),
);
assert.equal(
  surfaceExports.pickSurfacePoint(
    [{ point: representative, x: 0, y: 0, depth: 1 }],
    0,
    0,
    () => false,
  ),
  null,
);
const skin = JSON.parse(readFileSync(resolve(root, "../models/skin.json")));
const skinChunks = surfaceExports.splitSurfaceMesh(skin);
assert.equal(
  skinChunks.reduce((sum, chunk) => sum + chunk.indices.length, 0),
  skin.indices.length,
);
assert.ok(
  skinChunks.every(
    (chunk) =>
      chunk.positions.length / 3 <= 60000 &&
      chunk.indices.every((index) => index < 65536),
  ),
);
for (const meridian of surfaceCatalog.meridians) {
  const route = surfaceExports.routeMesh(
    meridian.paths.map((path) => path.points),
  );
  assert.ok(route.positions.length && route.positions.every(Number.isFinite));
  const chunks = surfaceExports.splitSurfaceMesh(route);
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
}
const view = surfaceExports.surfaceView(skin, representative.position);
assert.ok(Number.isFinite(view.yaw) && Number.isFinite(view.pitch));
assert.ok(surfaceExports.pointMesh().positions.every(Number.isFinite));
assert.ok(
  moduleCache.has("chunks:///_virtual/rollupPluginModLoBabelHelpers.js"),
  "Execute real Babel helpers for the surface module",
);
console.log(
  `穴位经络官方构建检查通过 / Official surface bundle check passed: meridians=${surfaceCatalog.meridians.length}, points=${surfaceCatalog.points.length}, skinChunks=${skinChunks.length}.`,
);
