import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = readFileSync(
  new URL("../assets/scripts/geometry.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const { rayTriangle, rayBounds, localDate, canRecord, fitPerspectiveBounds } =
  await import(
    `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
  );
test("射线按真实三角形检测并支持双面 / Exact double-sided triangle picking", () => {
  const a = [0, 0, 0],
    b = [1, 0, 0],
    c = [0, 1, 0];
  assert.equal(rayTriangle([0.2, 0.2, 2], [0, 0, -1], a, b, c), 2);
  assert.equal(rayTriangle([0.2, 0.2, -2], [0, 0, 1], a, b, c), 2);
  assert.equal(rayTriangle([0.8, 0.8, 2], [0, 0, -1], a, b, c), null);
  assert.equal(rayTriangle([0.2, 0.2, 2], [0, 0, 1], a, b, c), null);
  assert.equal(rayTriangle([0.2, 0.2, 2], [1, 0, 0], a, b, c), null);
});
test("包围盒只做初筛，平行射线与盒后目标正确处理 / Bounds handle parallel and behind rays", () => {
  assert.equal(rayBounds([0, 0, 2], [0, 0, -1], [-1, -1, -1], [1, 1, 1]), true);
  assert.equal(
    rayBounds([2, 0, 2], [0, 0, -1], [-1, -1, -1], [1, 1, 1]),
    false,
  );
  assert.equal(rayBounds([0, 0, 2], [0, 0, 1], [-1, -1, -1], [1, 1, 1]), false);
});
test("本地日历日期与可记录组织 / Local dates and recordable tissues", () => {
  assert.equal(localDate(new Date(2026, 9, 25, 23, 59)), "2026-10-25");
  assert.equal(canRecord("muscle"), true);
  assert.equal(canRecord("tendon"), true);
  assert.equal(canRecord("bone"), false);
});

test("全身取景含透视深度且适应窄屏 / Perspective fit includes depth and narrow viewports", () => {
  const min = [-0.6, -0.85, -0.2],
    max = [0.6, 0.85, 0.2],
    fov = 39,
    occupancy = 0.92;
  for (const aspect of [0.45, 1, 1.8])
    for (const yaw of [0, Math.PI / 2, Math.PI]) {
      const distance = fitPerspectiveBounds(
        min,
        max,
        yaw,
        0,
        fov,
        aspect,
        occupancy,
      );
      const tan = Math.tan((fov * Math.PI) / 360);
      for (const x of [min[0], max[0]])
        for (const y of [min[1], max[1]])
          for (const z of [min[2], max[2]]) {
            const depth = distance - (x * Math.sin(yaw) + z * Math.cos(yaw));
            assert.ok(
              Math.abs(x * Math.cos(yaw) - z * Math.sin(yaw)) /
                (depth * tan * aspect) <=
                occupancy + 1e-10,
            );
            assert.ok(Math.abs(y) / (depth * tan) <= occupancy + 1e-10);
          }
    }
});
