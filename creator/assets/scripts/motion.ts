/** 未绑定骨骼模型的近似关节示意，不模拟负重或生理变形。 / Approximate joint illustration, not loaded mechanics or physiological deformation. */
export type MotionMode = "squat" | "curl";
export type Point3 = readonly [number, number, number];
export type MotionZone = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MotionPart = { zone: MotionZone; rigid: boolean; side: number };
export const JOINTS = {
  ankleY: -0.78,
  kneeY: -0.405,
  hipY: 0.035,
  elbowY: 0.255,
  shoulderY: 0.535,
  z: -0.025,
} as const;
export function motionForEntry(id: string): MotionMode | null {
  return id === "goblet-squat"
    ? "squat"
    : id === "barbell-bicep-curl"
      ? "curl"
      : null;
}
export function cycleAmount(progress: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * 2 * Math.max(0, Math.min(1, progress)));
}
export function advanceProgress(
  progress: number,
  dt: number,
  duration = 5,
): number {
  return (((progress + Math.max(0, Math.min(0.1, dt)) / duration) % 1) + 1) % 1;
}
export function rotateX(
  point: Point3,
  angle: number,
): [number, number, number] {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [point[0], point[1] * c - point[2] * s, point[1] * s + point[2] * c];
}
export function motionPose(mode: MotionMode, progress: number) {
  const amount = cycleAmount(progress),
    shank = 0.45 * amount,
    thigh = -1.1 * amount,
    torso = 0.28 * amount,
    arm = -1.35 * amount,
    curl = -2.05 * amount;
  const knee = rotateX([0, JOINTS.kneeY - JOINTS.ankleY, 0], shank);
  knee[1] += JOINTS.ankleY;
  knee[2] += JOINTS.z;
  const hip = rotateX([0, JOINTS.hipY - JOINTS.kneeY, 0], thigh);
  hip[1] += knee[1];
  hip[2] += knee[2];
  return {
    amount,
    angles: [shank, thigh, torso, curl] as const,
    joints: [knee[1], knee[2], hip[1], hip[2]] as const,
    state: [mode === "squat" ? 1 : 2, amount, arm, 0] as const,
  };
}
export function classifyMotionPart(
  info: { name: string; nameEn?: string; kind: string; side: string },
  min: readonly number[],
  max: readonly number[],
): MotionPart {
  const name = (info.nameEn || info.name).toLowerCase(),
    center = min.map((v, i) => (v + max[i]) / 2),
    rigid = info.kind === "bone";
  let zone: MotionZone = 3;
  if (/patella/.test(name)) zone = 6;
  else if (/humerus/.test(name)) zone = 4;
  else if (/ulna|radius|carpal|metacarpal/.test(name) && center[1] > -0.35)
    zone = 5;
  else if (/femur/.test(name)) zone = 2;
  else if (/tibia|fibula/.test(name)) zone = 1;
  else if (center[1] < -0.745) zone = 0;
  else if (Math.abs(center[0]) > 0.17 && center[1] > -0.3) {
    zone = center[1] > 0.31 ? 4 : 5;
  } else if (center[1] < -0.405) zone = 1;
  else if (center[1] < 0.025 && !/hip bone|pelvis|sacrum|coccyx/.test(name))
    zone = 2;
  if (!rigid && /deltoid|biceps brachii|triceps brachii|brachialis/.test(name))
    zone = 4;
  return {
    zone,
    rigid,
    side: info.side === "left" ? 1 : info.side === "right" ? -1 : 0,
  };
}
function smooth(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
function mix(a: Point3, b: Point3, w: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * w,
    a[1] + (b[1] - a[1]) * w,
    a[2] + (b[2] - a[2]) * w,
  ];
}
/** 与着色器一致的关节函数，仅用于测试与边界分析。 / Shader-equivalent transforms for tests and bounds analysis only. */
export function posePoint(
  point: Point3,
  part: MotionPart,
  mode: MotionMode,
  progress: number,
): [number, number, number] {
  const p = motionPose(mode, progress),
    a = p.angles,
    j = p.joints;
  const pivot = (
    q: Point3,
    y: number,
    z: number,
    angle: number,
    newY = y,
    newZ = z,
  ) => {
    const r = rotateX([q[0], q[1] - y, q[2] - z], angle);
    return [r[0], r[1] + newY, r[2] + newZ] as [number, number, number];
  };
  if (mode === "curl") {
    if (part.zone !== 4 && part.zone !== 5) return [...point];
    const moved = pivot(point, JOINTS.elbowY, JOINTS.z, a[3]);
    const w = part.rigid
      ? part.zone === 5
        ? 1
        : 0
      : part.zone === 5
        ? 1 - smooth(0.23, 0.29, point[1])
        : 1 - smooth(0.205, 0.33, point[1]);
    return mix(point, moved, w);
  }
  const foot = [...point] as [number, number, number],
    shank = pivot(point, JOINTS.ankleY, JOINTS.z, a[0]),
    thigh = pivot(point, JOINTS.kneeY, JOINTS.z, a[1], j[0], j[1]),
    trunk = pivot(point, JOINTS.hipY, JOINTS.z, a[2], j[2], j[3]);
  const balanced = pivot(point, JOINTS.shoulderY, JOINTS.z, p.state[2]);
  const arm = pivot(balanced, JOINTS.hipY, JOINTS.z, a[2], j[2], j[3]);
  if (part.rigid)
    return part.zone === 0
      ? foot
      : part.zone === 1
        ? shank
        : part.zone === 2
          ? thigh
          : part.zone === 4 || part.zone === 5
            ? arm
            : part.zone === 6
              ? pivot(
                  point,
                  JOINTS.kneeY,
                  JOINTS.z,
                  (a[0] + a[1]) / 2,
                  j[0],
                  j[1],
                )
              : trunk;
  if (part.zone === 4 || part.zone === 5)
    return mix(trunk, arm, smooth(0.12, 0.19, Math.abs(point[0])));
  const leg = mix(shank, thigh, smooth(-0.45, -0.36, point[1]));
  const body = mix(leg, trunk, smooth(-0.055, 0.085, point[1]));
  return mix(foot, body, smooth(-0.8, -0.73, point[1]));
}
export const MOTION_BOUNDS = {
  min: [-0.45, -0.92, -0.65] as Point3,
  max: [0.45, 0.92, 0.85] as Point3,
};

/** 真实617结构、21个下蹲/抬升相位采样外扩约4厘米；只用于首次动作取景。 / Real-model 21-phase bounds plus ~4cm margin, for initial motion framing only. */
export const MOTION_FIT_BOUNDS = {
  squat: {
    min: [-0.35, -0.88, -0.39] as Point3,
    max: [0.35, 0.9, 0.56] as Point3,
  },
  curl: {
    min: [-0.35, -0.88, -0.17] as Point3,
    max: [0.35, 0.9, 0.42] as Point3,
  },
};
