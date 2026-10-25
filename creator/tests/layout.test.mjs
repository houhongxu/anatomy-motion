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
test("边缘控件不挤占取景 / Edge controls preserve full framing", () => {
  for (const viewport of [
    rect(12, 60, 366, 708),
    rect(12, 60, 336, 504),
    rect(12, 60, 1256, 650),
    rect(12, 52, 820, 272),
  ]) {
    const frame = sceneFrame(
      viewport,
      rect(14, 68, 76, 190),
      rect(240, 68, 130, 60),
      true,
    );
    assert.equal(frame.height, viewport.height - 12);
    assert.equal(frame.width, viewport.width - 12);
    assert.ok(
      frame.left >= viewport.left &&
        frame.right <= viewport.right &&
        frame.top >= viewport.top &&
        frame.bottom <= viewport.bottom,
    );
  }
});
test("双指或取消的手势不触发点击选取 / Multi-touch and cancellation never select a mesh", () => {
  assert.equal(shouldPick(false, false, 1, false), true);
  assert.equal(shouldPick(false, true, 1, false), false);
  assert.equal(shouldPick(false, true, 2, false), false);
  assert.equal(shouldPick(true, false, 1, false), false);
  assert.equal(shouldPick(false, false, 1, true), false);
});
