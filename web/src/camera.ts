import type { Vec3 } from "./types";
export type CameraView = "front" | "back" | "leftView" | "rightView" | "reset";
export function cameraFit(
  bounds: { min: Vec3; max: Vec3 },
  view: CameraView,
  fov: number,
  width: number,
  height: number,
) {
  const center = bounds.min.map(
    (value, axis) => (value + bounds.max[axis]) / 2,
  ) as Vec3;
  const extent = bounds.max.map(
    (value, axis) => value - bounds.min[axis],
  ) as Vec3;
  const side = view === "leftView" || view === "rightView";
  const verticalTangent = Math.tan((fov * Math.PI) / 360);
  const horizontalTangent =
    (verticalTangent * Math.max(1, width)) / Math.max(1, height);
  const distance =
    Math.max(
      extent[1] / (2 * verticalTangent),
      extent[side ? 2 : 0] / (2 * horizontalTangent),
    ) *
      1.12 +
    extent[side ? 0 : 2] / 2;
  const direction: Vec3 =
    view === "back"
      ? [0, 0, -1]
      : view === "leftView"
        ? [1, 0, 0]
        : view === "rightView"
          ? [-1, 0, 0]
          : [0, 0, 1];
  const position = center.map(
    (value, axis) => value + direction[axis] * distance,
  ) as Vec3;
  return { center, position };
}
