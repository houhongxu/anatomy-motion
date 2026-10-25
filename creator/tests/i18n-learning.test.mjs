import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
async function sourceModule(name) {
  const source = readFileSync(
    new URL(`../assets/scripts/${name}.ts`, import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2020,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
  );
}
const { dictionary, getLocale, setLocale, t, localized, apiErrorMessage } =
  await sourceModule("i18n");
const { matchLearningEntry } = await sourceModule("learning");
test("单语言词典、插值和错误均随语言切换 / Dictionary, interpolation and errors use one locale", () => {
  assert.equal(getLocale(), "zh");
  assert.equal(t("signIn"), "登录");
  assert.equal(localized({ zh: "胸大肌", en: "Pectoralis major" }), "胸大肌");
  for (const [key, value] of Object.entries(dictionary)) {
    assert.equal(typeof value.zh, "string", key);
    assert.equal(typeof value.en, "string", key);
    assert.ok(value.zh.length && value.en.length, key);
  }
  setLocale("en");
  assert.equal(t("signIn"), "Sign in");
  assert.equal(
    t("coveragePartial", { count: 4 }),
    "Partial coverage: 4 structures matched",
  );
  assert.equal(
    apiErrorMessage("USERNAME_TAKEN", 409),
    "This username is already taken.",
  );
  assert.equal(
    apiErrorMessage("UNKNOWN", 500),
    "The service is temporarily unavailable. Please retry later.",
  );
  setLocale("zh");
  assert.equal(apiErrorMessage("USERNAME_TAKEN", 409), "用户名已被使用。");
});
const group = (id, ids, missing) => ({
  id,
  name: { zh: id, en: id },
  structureIds: ids,
  ...(missing ? { missing: { zh: "来源缺失", en: "Absent from source" } } : {}),
});
const entry = {
  id: "pull-up",
  kind: "exercise",
  name: { zh: "引体向上", en: "Pull-up" },
  summary: { zh: "相关肌群", en: "Related muscles" },
  groupIds: ["biceps", "lats"],
  sources: [],
};
test("肌群匹配去重且明确缺失，不用无关结构替代 / Exact group IDs deduplicate and disclose absent prime movers", () => {
  const groups = [group("biceps", ["b1", "b1", "b2"]), group("lats", [], true)];
  const result = matchLearningEntry(
    entry,
    groups,
    new Set(["b1", "unrelated"]),
  );
  assert.deepEqual(result.ids, ["b1"]);
  assert.deepEqual(result.missingIds, ["b2"]);
  assert.equal(result.coverage, "partial");
  assert.deepEqual(
    result.incompleteGroups.map((g) => g.id),
    ["lats"],
  );
  assert.ok(!result.ids.includes("unrelated"));
});
test("零覆盖和未知肌群不会制造匹配 / Zero coverage and unknown groups do not fabricate matches", () => {
  const result = matchLearningEntry(
    entry,
    [group("biceps", [])],
    new Set(["unrelated"]),
  );
  assert.equal(result.coverage, "none");
  assert.deepEqual(result.ids, []);
  assert.deepEqual(result.missingGroups, ["lats"]);
  const complete = matchLearningEntry(
    { ...entry, groupIds: ["biceps"] },
    [group("biceps", ["b1"])],
    new Set(["b1"]),
  );
  assert.equal(complete.coverage, "complete");
  assert.deepEqual(complete.ids, ["b1"]);
});
