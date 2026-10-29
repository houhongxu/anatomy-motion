import { describe, expect, it } from "vitest";
import {
  allowedIds,
  learningIds,
  planResources,
  recordPayload,
} from "../src/planner";
import type { Catalog, Learning, LearningEntry, Structure } from "../src/types";
const structure = (
  id: string,
  layer: "superficial" | "deep",
  region = "arm",
  side: "left" | "right" = "left",
): Structure => ({
  id,
  name: { zh: id, en: id },
  kind: "muscle",
  side,
  region,
  layer,
  asset: `/models/web/structures/${id}.glb`,
  bounds: { min: [0, 0, 0], max: [1, 1, 1] },
});
const catalog: Catalog = {
  version: 1,
  groups: [
    {
      id: "arm",
      name: { zh: "手臂", en: "Arm" },
      structureIds: ["surface", "deep", "outside"],
    },
  ],
  regions: [],
  structures: {
    surface: structure("surface", "superficial"),
    deep: structure("deep", "deep"),
    right: structure("right", "superficial", "leg", "right"),
    unsafe: {
      ...structure("unsafe", "deep"),
      asset: "/models/meshes/unsafe.json",
    },
  },
  initialStructureIds: ["surface", "deep", "outside", "unsafe"],
  tendons: [],
  assets: {
    body: { url: "/models/web/body.glb" },
    skin: { url: "/models/web/skin.glb" },
  },
};
const base = {
  mode: "muscles" as const,
  region: "all",
  superficial: true,
  deep: false,
};
describe("按需资源规划 / on-demand resource planning", () => {
  it("初始仅允许白名单浅层 / initial plan contains only allowed superficial geometry", () => {
    expect(planResources(catalog, base)).toEqual(["surface"]);
  });
  it("穴位模式不加载任何内部模型 / acupuncture never loads internal models", () => {
    expect(
      planResources(catalog, {
        ...base,
        mode: "acupuncture",
        deep: true,
        selectedId: "deep",
      }),
    ).toEqual([]);
  });
  it("深层必须在选择区域后开启 / deep geometry requires its active region", () => {
    expect(planResources(catalog, { ...base, deep: true })).toEqual([
      "surface",
    ]);
    expect(
      planResources(catalog, { ...base, region: "arm", deep: true }),
    ).toEqual(["surface", "deep"]);
    expect(
      planResources(catalog, { ...base, region: "leg", deep: true }),
    ).toEqual(["right"]);
  });
  it("不存在和旧路径永不下载 / unknown IDs and old asset paths cannot enter plans", () => {
    expect(
      allowedIds(catalog, [
        "surface",
        "outside",
        "unsafe",
        "../../secret",
        "surface",
      ]),
    ).toEqual(["surface"]);
  });
  it("动作取学习映射与白名单交集，背景单独加载 / learning intersects the whitelist and leaves background independent", () => {
    const learning: Learning = {
      groups: [
        {
          id: "movement",
          name: { zh: "动作", en: "Movement" },
          structureIds: ["deep", "old-manifest-only", "unsafe"],
        },
      ],
      entries: [],
    };
    const entry: LearningEntry = {
      id: "a",
      kind: "exercise",
      name: { zh: "动作", en: "Movement" },
      summary: { zh: "", en: "" },
      groupIds: ["movement"],
      sources: [],
    };
    expect(learningIds(catalog, learning, entry)).toEqual(["deep"]);
    expect(
      planResources(catalog, { ...base, learning, learningEntry: entry }),
    ).toEqual(["deep"]);
    expect(catalog.assets.body.url).toBe("/models/web/body.glb");
  });
  it("关闭浅层不残留浅层计划 / disabling superficial removes its geometry", () => {
    expect(planResources(catalog, { ...base, superficial: false })).toEqual([]);
  });
});
describe("记录兼容 / record compatibility", () => {
  it("结构匹配原侧别并仅发送原API字段 / structure owns side and payload keeps only API fields", () => {
    expect(
      recordPayload(
        {
          date: "2026-10-28",
          structureId: "right",
          side: "left",
          intensity: 4,
          note: "note",
        },
        catalog,
      ),
    ).toEqual({
      date: "2026-10-28",
      structureId: "right",
      side: "right",
      intensity: 4,
      note: "note",
    });
  });
  it("历史非白名单结构仍可原样编辑 / historical records preserve their ID and side", () => {
    expect(
      recordPayload(
        {
          date: "2026-10-28",
          structureId: "old",
          side: "left",
          intensity: 0,
          note: "保留 / preserved",
        },
        catalog,
      ),
    ).toEqual({
      date: "2026-10-28",
      structureId: "old",
      side: "left",
      intensity: 0,
      note: "保留 / preserved",
    });
  });
});
