/** 体表探索数据与可测几何辅助。 / Surface exploration data and testable geometry helpers. */
export type SurfaceName = { zh: string; en: string };
export type SurfacePoint = {
  id: string;
  code: string;
  name: SurfaceName;
  meridianId: string;
  side: "left" | "right" | "midline";
  position: number[];
  region: SurfaceName;
  landmark?: SurfaceName;
  sourceIds: string[];
  reviewStatus: "illustrative-unreviewed";
};
export type Meridian = {
  id: string;
  name: SurfaceName;
  color: string;
  paths: { side: string; points: number[][] }[];
};
export type AcupunctureData = {
  version: 1;
  coordinateSpace: "bodyparts3d-v1";
  reviewStatus: "illustrative-unreviewed";
  skin: {
    file: string;
    sourceElement: string;
    sha256: string;
    source: string;
    license: string;
    attribution: string;
  };
  sources: { id: string; title: string; url: string }[];
  meridians: Meridian[];
  points: SurfacePoint[];
};
export type SurfaceMesh = {
  positions: number[];
  normals: number[];
  indices: number[];
};
const coordinate = (p: number[]) =>
  Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
export function validateAcupuncture(data: AcupunctureData): AcupunctureData {
  if (
    data?.version !== 1 ||
    data.coordinateSpace !== "bodyparts3d-v1" ||
    data.reviewStatus !== "illustrative-unreviewed" ||
    data.skin?.file !== "skin.json" ||
    !Array.isArray(data.sources) ||
    !Array.isArray(data.meridians) ||
    !data.meridians.length ||
    !Array.isArray(data.points) ||
    !data.points.length
  )
    throw new Error("Invalid surface atlas");
  const ids = new Set(data.meridians.map((m) => m.id));
  if (ids.size !== data.meridians.length) throw new Error("Duplicate meridian");
  for (const m of data.meridians) {
    if (
      !m.name?.zh ||
      !m.name?.en ||
      !/^#[0-9a-f]{6}$/i.test(m.color) ||
      !m.paths?.length ||
      m.paths.some((p) => !p.points?.length || !p.points.every(coordinate))
    )
      throw new Error("Invalid route");
  }
  const pointIds = new Set<string>();
  for (const p of data.points) {
    if (
      pointIds.has(p.id) ||
      !p.id ||
      !p.code ||
      !ids.has(p.meridianId) ||
      !coordinate(p.position) ||
      !p.name?.zh ||
      !p.name?.en ||
      !p.region?.zh ||
      !p.region?.en ||
      !["left", "right", "midline"].includes(p.side) ||
      p.reviewStatus !== "illustrative-unreviewed"
    )
      throw new Error("Invalid surface point");
    pointIds.add(p.id);
  }
  return data;
}
export function queryPoints(
  data: AcupunctureData,
  search: string,
  meridian = "",
): SurfacePoint[] {
  const query = search.trim().toLowerCase();
  return data.points.filter(
    (p) =>
      (!meridian || p.meridianId === meridian) &&
      `${p.code} ${p.name.zh} ${p.name.en} ${p.region.zh} ${p.region.en} ${p.meridianId}`
        .toLowerCase()
        .includes(query),
  );
}
/** 像素触控半径与遮挡分别验证，背面候选不能截获点击。 / Check touch radius and occlusion separately. */
export function pickSurfacePoint<T extends { id: string }>(
  candidates: { point: T; x: number; y: number; depth: number }[],
  x: number,
  y: number,
  visible: (point: T) => boolean,
  radius = 22,
): T | null {
  const near = candidates
    .map((c) => ({ ...c, distance: Math.hypot(c.x - x, c.y - y) }))
    .filter((c) => c.depth > 0 && c.distance <= radius)
    .sort((a, b) => a.distance - b.distance || a.depth - b.depth);
  return near.find((c) => visible(c.point))?.point || null;
}
/** 管状三维路径使用普通深度测试材质。 / Solid route tubes use normal depth testing. */
export function routeMesh(paths: number[][][], radius = 0.0018): SurfaceMesh {
  const positions: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  const sides = 6;
  for (const path of paths)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i],
        d = b.map((v, j) => v - a[j]);
      const length = Math.hypot(...d);
      if (length < 1e-8) continue;
      const n = d.map((v) => v / length),
        ref = Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      let u = [
        n[1] * ref[2] - n[2] * ref[1],
        n[2] * ref[0] - n[0] * ref[2],
        n[0] * ref[1] - n[1] * ref[0],
      ];
      const ul = Math.hypot(...u);
      u = u.map((v) => v / ul);
      const v = [
        n[1] * u[2] - n[2] * u[1],
        n[2] * u[0] - n[0] * u[2],
        n[0] * u[1] - n[1] * u[0],
      ];
      const base = positions.length / 3;
      for (const center of [a, b])
        for (let j = 0; j < sides; j++) {
          const angle = (j * Math.PI * 2) / sides;
          const normal = u.map(
            (value, k) => value * Math.cos(angle) + v[k] * Math.sin(angle),
          );
          positions.push(
            ...center.map((value, k) => value + normal[k] * radius),
          );
          normals.push(...normal);
        }
      for (let j = 0; j < sides; j++) {
        const k = (j + 1) % sides;
        indices.push(
          base + j,
          base + k,
          base + sides + j,
          base + k,
          base + sides + k,
          base + sides + j,
        );
      }
    }
  return { positions, normals, indices };
}
/** 小球网格，点标记保留可见体积。 / Sphere mesh gives surface markers visible volume. */
export function pointMesh(radius = 0.0045): SurfaceMesh {
  const positions: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  const rows = 8,
    cols = 12;
  for (let i = 0; i <= rows; i++)
    for (let j = 0; j <= cols; j++) {
      const phi = (i * Math.PI) / rows,
        theta = (j * Math.PI * 2) / cols;
      const n = [
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      ];
      normals.push(...n);
      positions.push(...n.map((v) => v * radius));
    }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++) {
      const a = i * (cols + 1) + j,
        b = a + cols + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  return { positions, normals, indices };
}

/** Cocos createMesh 固定16位索引；按三角形无损分块。 / Cocos createMesh uses 16-bit indices; split without losing triangles. */
export function splitSurfaceMesh(
  mesh: SurfaceMesh,
  maxVertices = 60000,
): SurfaceMesh[] {
  if (maxVertices < 3 || maxVertices > 65535)
    throw new Error("Invalid vertex limit");
  if (mesh.positions.length / 3 <= maxVertices) return [mesh];
  const chunks: SurfaceMesh[] = [];
  let chunk: SurfaceMesh = { positions: [], normals: [], indices: [] },
    remap = new Map<number, number>();
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const triangle = mesh.indices.slice(i, i + 3);
    if (
      remap.size + triangle.filter((index) => !remap.has(index)).length >
      maxVertices
    ) {
      chunks.push(chunk);
      chunk = { positions: [], normals: [], indices: [] };
      remap = new Map();
    }
    for (const index of triangle) {
      if (!remap.has(index)) {
        remap.set(index, remap.size);
        chunk.positions.push(...mesh.positions.slice(index * 3, index * 3 + 3));
        chunk.normals.push(...mesh.normals.slice(index * 3, index * 3 + 3));
      }
      chunk.indices.push(remap.get(index)!);
    }
  }
  if (chunk.indices.length) chunks.push(chunk);
  return chunks;
}

/** 按最近皮肤顶点法线定位，手腕等远离躯干处仍区分掌背。 / Skin normals distinguish palm/dorsum away from the torso. */
export function surfaceView(
  mesh: SurfaceMesh,
  position: readonly number[],
): { yaw: number; pitch: number } {
  let nearest = Infinity,
    index = 0;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const distance =
      (mesh.positions[i] - position[0]) ** 2 +
      (mesh.positions[i + 1] - position[1]) ** 2 +
      (mesh.positions[i + 2] - position[2]) ** 2;
    if (distance < nearest) {
      nearest = distance;
      index = i;
    }
  }
  const normal = mesh.normals.slice(index, index + 3);
  const [x, y, z] =
    normal.length === 3 && normal.every(Number.isFinite) ? normal : [0, 0, 1];
  return {
    yaw: Math.atan2(x, z),
    pitch: Math.max(-1.1, Math.min(1.1, Math.atan2(y, Math.hypot(x, z)))),
  };
}
