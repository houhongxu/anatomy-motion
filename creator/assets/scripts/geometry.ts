/** 双面精确射线三角形检测。 / Exact double-sided ray-triangle intersection. */
export function rayTriangle(
  o: readonly number[],
  d: readonly number[],
  a: readonly number[],
  b: readonly number[],
  c: readonly number[],
): number | null {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p = [
    d[1] * e2[2] - d[2] * e2[1],
    d[2] * e2[0] - d[0] * e2[2],
    d[0] * e2[1] - d[1] * e2[0],
  ];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-10) return null;
  const inv = 1 / det,
    t = [o[0] - a[0], o[1] - a[1], o[2] - a[2]],
    u = (t[0] * p[0] + t[1] * p[1] + t[2] * p[2]) * inv;
  if (u < 0 || u > 1) return null;
  const q = [
      t[1] * e1[2] - t[2] * e1[1],
      t[2] * e1[0] - t[0] * e1[2],
      t[0] * e1[1] - t[1] * e1[0],
    ],
    v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
  if (v < 0 || u + v > 1) return null;
  const distance = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return distance > 1e-7 ? distance : null;
}
/** 射线包围盒初筛；命中后仍逐三角形验证。 / Broad phase only; triangles still determine hits. */
export function rayBounds(
  o: readonly number[],
  d: readonly number[],
  min: readonly number[],
  max: readonly number[],
): boolean {
  let near = 0,
    far = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-10) {
      if (o[i] < min[i] || o[i] > max[i]) return false;
      continue;
    }
    let a = (min[i] - o[i]) / d[i],
      b = (max[i] - o[i]) / d[i];
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a);
    far = Math.min(far, b);
    if (far < near) return false;
  }
  return true;
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function canRecord(kind: string): boolean {
  return kind === "muscle" || kind === "tendon";
}

/** 按相机空间八个边界点计算透视取景距离。 / Fit all eight bounds corners in camera space. */
export function fitPerspectiveBounds(
  min: readonly number[],
  max: readonly number[],
  yaw: number,
  pitch: number,
  verticalFov: number,
  aspect: number,
  occupancy = 0.92,
): number {
  const back = [
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ];
  const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const up = [
    -Math.sin(pitch) * Math.sin(yaw),
    Math.cos(pitch),
    -Math.sin(pitch) * Math.cos(yaw),
  ];
  const center = min.map((n, i) => (n + max[i]) / 2);
  const tan = Math.tan((verticalFov * Math.PI) / 360) * occupancy;
  let distance = 0.08;
  for (const x of [min[0], max[0]])
    for (const y of [min[1], max[1]])
      for (const z of [min[2], max[2]]) {
        const delta = [x - center[0], y - center[1], z - center[2]];
        const dot = (axis: number[]) =>
          delta.reduce((sum, n, i) => sum + n * axis[i], 0);
        distance = Math.max(
          distance,
          dot(back) + Math.abs(dot(right)) / (tan * Math.max(0.1, aspect)),
          dot(back) + Math.abs(dot(up)) / tan,
        );
      }
  return distance;
}
