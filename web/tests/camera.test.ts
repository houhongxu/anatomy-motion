import { describe, expect, it } from "vitest";
import { cameraFit } from "../src/camera";
import type { Vec3 } from "../src/types";
const bounds = { min: [-0.3, 1, -0.2] as Vec3, max: [0.4, 2.8, 0.25] as Vec3 };
describe("正面重置视角 / front-facing view reset", () => {
  it("重置固定回正面并以全身包围盒居中 / reset always faces front and centers the whole-body bounds", () => {
    const reset = cameraFit(bounds, "reset", 35, 320, 568);
    const front = cameraFit(bounds, "front", 35, 320, 568);
    expect(reset).toEqual(front);
    expect(reset.center[0]).toBeCloseTo(0.05);
    expect(reset.center[1]).toBeCloseTo(1.9);
    expect(reset.center[2]).toBeCloseTo(0.025);
    expect(reset.position[0]).toBe(reset.center[0]);
    expect(reset.position[1]).toBe(reset.center[1]);
    expect(reset.position[2]).toBeGreaterThan(bounds.max[2]);
  });
  it("按视口重新容纳全身且考虑最近表面的深度 / refits the full body in each viewport including nearest-surface depth", () => {
    for (const [width, height] of [
      [320, 189],
      [320, 568],
      [1024, 600],
    ]) {
      const fit = cameraFit(bounds, "reset", 35, width, height);
      const nearest = fit.position[2] - bounds.max[2];
      const verticalLimit = Math.tan((35 * Math.PI) / 360);
      const horizontalLimit = (verticalLimit * width) / height;
      expect((bounds.max[1] - bounds.min[1]) / 2 / nearest).toBeLessThan(
        verticalLimit,
      );
      expect((bounds.max[0] - bounds.min[0]) / 2 / nearest).toBeLessThan(
        horizontalLimit,
      );
    }
  });
  it("背面和侧面保持各自方向，重置结果不受其影响 / other views keep their directions without influencing reset", () => {
    expect(cameraFit(bounds, "back", 35, 320, 568).position[2]).toBeLessThan(
      bounds.min[2],
    );
    expect(
      cameraFit(bounds, "leftView", 35, 320, 568).position[0],
    ).toBeGreaterThan(bounds.max[0]);
    expect(
      cameraFit(bounds, "rightView", 35, 320, 568).position[0],
    ).toBeLessThan(bounds.min[0]);
    expect(
      cameraFit(bounds, "reset", 35, 320, 568).position[2],
    ).toBeGreaterThan(bounds.max[2]);
  });
});
