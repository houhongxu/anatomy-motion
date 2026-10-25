import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
const path = new URL("../assets/scripts/motion.ts", import.meta.url),
  source = readFileSync(path, "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2020,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const {
  cycleAmount,
  advanceProgress,
  motionForEntry,
  motionPose,
  classifyMotionPart,
  posePoint,
  MOTION_BOUNDS,
  MOTION_FIT_BOUNDS,
  JOINTS,
} = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test("循环、支持目录和暂停式进度 / Cycle, supported entries and progress", () => {
  close(cycleAmount(0), 0);
  close(cycleAmount(0.5), 1);
  close(cycleAmount(1), 0);
  close(advanceProgress(0.99, 0.1, 5), 0.01);
  assert.equal(motionForEntry("goblet-squat"), "squat");
  assert.equal(motionForEntry("barbell-bicep-curl"), "curl");
  assert.equal(motionForEntry("pull-up"), null);
});
test("深蹲脚固定且膝前移髋后坐，弯举肩躯干稳定 / Squat chain and stable curl torso", () => {
  const foot = [-0.08, -0.82, 0.03],
    fixed = posePoint(foot, { zone: 0, rigid: true, side: -1 }, "squat", 0.5);
  assert.deepEqual(fixed, foot);
  const pose = motionPose("squat", 0.5);
  assert.ok(pose.joints[1] > JOINTS.z);
  assert.ok(pose.joints[3] < JOINTS.z);
  assert.ok(pose.joints[2] < JOINTS.hipY);
  const shoulder = [-0.16, 0.535, -0.025];
  assert.deepEqual(
    posePoint(shoulder, { zone: 4, rigid: true, side: -1 }, "curl", 0.5),
    shoulder,
  );
  const hand = posePoint(
    [-0.23, -0.04, -0.025],
    { zone: 5, rigid: true, side: -1 },
    "curl",
    0.5,
  );
  assert.ok(hand[1] > 0.255 && hand[2] > 0);
});
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
  manifestPath = resolve(root, "models/manifest.json");
const parts = [];
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath));
  for (const info of manifest.structures) {
    const data = JSON.parse(readFileSync(resolve(root, "models", info.file)));
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < data.positions.length; i++) {
      const axis = i % 3;
      min[axis] = Math.min(min[axis], data.positions[i]);
      max[axis] = Math.max(max[axis], data.positions[i]);
    }
    parts.push({ info, min, max, part: classifyMotionPart(info, min, max) });
  }
}
const corners = (p) => {
  const out = [];
  for (const x of [p.min[0], p.max[0]])
    for (const y of [p.min[1], p.max[1]])
      for (const z of [p.min[2], p.max[2]]) out.push([x, y, z]);
  return out;
};
test(
  "真实骨块的刚性变换保持端点距离 / Real bone transforms preserve endpoint distances",
  { skip: !parts.length },
  () => {
    let bones = 0;
    for (const p of parts.filter((p) => p.info.kind === "bone")) {
      bones++;
      assert.equal(p.part.rigid, true);
      const pts = corners(p),
        a = pts[0],
        b = pts[7],
        distance = Math.hypot(...a.map((v, i) => v - b[i]));
      for (const mode of ["squat", "curl"])
        for (const progress of [0, 0.125, 0.25, 0.375, 0.5, 0.75, 1]) {
          const pa = posePoint(a, p.part, mode, progress),
            pb = posePoint(b, p.part, mode, progress);
          close(Math.hypot(...pa.map((v, i) => v - pb[i])), distance);
        }
    }
    assert.equal(bones, 202);
  },
);
test(
  "真实模型包围盒及关节过渡采样均在动作边界内 / Real bounds and joint-transition samples remain in motion bounds",
  { skip: !parts.length },
  () => {
    for (const p of parts) {
      const pts = corners(p);
      for (const y of [
        -0.8, -0.78, -0.73, -0.45, -0.405, -0.36, -0.055, 0.035, 0.085, 0.205,
        0.23, 0.255, 0.29, 0.33, 0.535,
      ])
        if (y > p.min[1] && y < p.max[1])
          for (const x of [p.min[0], p.max[0]])
            for (const z of [p.min[2], p.max[2]]) pts.push([x, y, z]);
      for (const mode of ["squat", "curl"])
        for (const progress of [0, 0.125, 0.25, 0.375, 0.5, 0.75, 1])
          for (const point of pts) {
            const q = posePoint(point, p.part, mode, progress);
            for (let axis = 0; axis < 3; axis++)
              assert.ok(
                q[axis] >= MOTION_BOUNDS.min[axis] - 1e-8 &&
                  q[axis] <= MOTION_BOUNDS.max[axis] + 1e-8 &&
                  q[axis] >= MOTION_FIT_BOUNDS[mode].min[axis] - 1e-8 &&
                  q[axis] <= MOTION_FIT_BOUNDS[mode].max[axis] + 1e-8,
                `${p.info.id} ${mode} ${progress}: ${q}`,
              );
          }
    }
  },
);
