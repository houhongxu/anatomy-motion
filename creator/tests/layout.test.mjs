import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../assets/scripts/layout.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const { renderingSize, sceneFrame, shouldPick } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
const rect = (left, top, width, height) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});
test("紧凑布局实际像素尺寸不超过1.5倍 / Compact backing size stays at or below1.5 DPR", () => {
  for (const [width, height] of [
    [390, 844],
    [360, 640],
    [844, 390],
    [769, 452],
  ]) {
    const r = renderingSize(width, height, 3, true);
    assert.ok(r.width / width <= 1.5);
    assert.ok(r.height / height <= 1.5);
    assert.ok(r.width > 0 && r.height > 0);
  }
  assert.deepEqual(renderingSize(1280, 800, 2, false), {
    width: 2560,
    height: 1600,
    ratio: 2,
  });
  assert.equal(renderingSize(390, 844, 1, true).ratio, 1);
});
test("竖屏避开顶部控件，横屏改用侧边控件空间 / Portrait and landscape framing preserve visible model space", () => {
  const portrait = rect(12, 60, 366, 708),
    controls = rect(55, 118, 280, 52),
    chip = rect(50, 653, 290, 60);
  const p = sceneFrame(portrait, controls, chip, true);
  assert.ok(p.top > controls.bottom);
  assert.ok(p.bottom < chip.top);
  assert.ok(p.left >= portrait.left && p.right <= portrait.right);
  assert.ok(p.height > 400);
  const landscape = rect(12, 52, 820, 272),
    sideControls = rect(14, 60, 86, 188),
    label = rect(620, 275, 205, 40);
  const l = sceneFrame(landscape, sideControls, label, true);
  assert.ok(l.left > sideControls.right);
  assert.ok(l.height >= 250);
  assert.ok(l.top >= landscape.top && l.bottom <= landscape.bottom);
});
test("双指或取消的手势不触发点击选取 / Multi-touch and cancellation never select a mesh", () => {
  assert.equal(shouldPick(false, false, 1, false), true);
  assert.equal(shouldPick(false, true, 1, false), false);
  assert.equal(shouldPick(false, true, 2, false), false);
  assert.equal(shouldPick(true, false, 1, false), false);
  assert.equal(shouldPick(false, false, 1, true), false);
});
