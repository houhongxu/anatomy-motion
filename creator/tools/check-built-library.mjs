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
const record = registry.get("chunks:///_virtual/learning.ts");
assert.ok(record, "Compiled learning.ts module must exist");
const exports = {};
const instance = record.factory((name, value) => {
  if (typeof name === "string") exports[name] = value;
  else Object.assign(exports, name);
}, {});
for (let i = 0; i < record.deps.length; i++) {
  assert.equal(record.deps[i], "cc");
  instance.setters[i]({ cclegacy: { _RF: { push() {}, pop() {} } } });
}
instance.execute();
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
