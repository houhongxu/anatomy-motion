import { describe, expect, it } from "vitest";
import {
  allowedIds,
  learningIds,
  planResources,
  presetLayers,
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
  it("预设不排斥独立肌层 / presets do not exclude independent muscle layers", () => {
    expect(
      planResources(catalog, {
        ...base,
        mode: "acupuncture",
        superficial: false,
        deep: false,
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
      planResources(catalog, {
        ...base,
        deep: true,
        learning,
        learningEntry: entry,
      }),
    ).toEqual(["surface", "deep"]);
    expect(catalog.assets.body.url).toBe("/models/web/body.glb");
  });
  it("叠加穴位不改变按需肌肉计划 / overlay keeps the same lazy muscle plan", () => {
    expect(planResources(catalog, { ...base, mode: "acupuncture" })).toEqual([
      "surface",
    ]);
    expect(
      planResources(catalog, {
        ...base,
        superficial: false,
        selectedId: "surface",
      }),
    ).toEqual([]);
  });
  it("学习中的显式跨区域深层仍受图层开关约束 / explicit learning deep structures respect layer switches", () => {
    const entry: LearningEntry = {
      id: "deep-entry",
      kind: "exercise",
      category: "stretching",
      acupointCodes: [],
      name: { zh: "深层", en: "Deep" },
      summary: { zh: "", en: "" },
      groupIds: ["mapped"],
      sources: [],
    };
    const learning: Learning = {
      groups: [
        { id: "mapped", name: entry.name, structureIds: ["deep", "right"] },
      ],
      entries: [entry],
    };
    expect(
      planResources(catalog, {
        ...base,
        learning,
        learningEntry: entry,
        deep: true,
      }),
    ).toEqual(["surface", "deep", "right"]);
    expect(
      planResources(catalog, { ...base, learning, learningEntry: entry }),
    ).toEqual(["surface", "right"]);
    expect(
      planResources(catalog, {
        ...base,
        learning,
        learningEntry: { ...entry, groupIds: [] },
      }),
    ).toEqual(["surface"]);
  });
  it("学习肌群的显式结构可用于图谱导航 / mapped group IDs navigate through explicit geometry", () => {
    expect(
      planResources(catalog, { ...base, structureIds: ["right"] }),
    ).toEqual(["surface", "right"]);
  });
  it("关闭浅层不残留浅层计划 / disabling superficial removes its geometry", () => {
    expect(planResources(catalog, { ...base, superficial: false })).toEqual([]);
  });
});
describe("保留所选结构的预设 / presets preserve the selected structure", () => {
  it("肌肉和叠加预设保留已选区域深层且不加载全身 / muscle and overlay presets retain selected regional deep geometry", () => {
    for (const preset of ["muscles", "overlay"] as const) {
      const layers = presetLayers(preset, [catalog.structures.deep]);
      expect(layers.deep).toBe(true);
      expect(
        planResources(catalog, {
          ...base,
          ...layers,
          region: "arm",
          structureIds: ["deep"],
          selectedId: "deep",
        }),
      ).toEqual(["surface", "deep"]);
    }
    expect(presetLayers("overlay").deep).toBe(false);
    expect(presetLayers("overlay").skinOpacity).toBe(0.3);
  });
  it("纯穴位预设关闭内部肌层，切换肌肉不会自动开启深层 / point-only preset disables muscle layers without inferring deep anatomy", () => {
    const layers = presetLayers("acupuncture", [catalog.structures.deep]);
    expect(layers.deep).toBe(false);
    expect(layers.superficial).toBe(false);
    expect(layers.showPoints).toBe(true);
    expect(
      planResources(catalog, {
        ...base,
        ...layers,
        region: "arm",
        selectedId: "deep",
      }),
    ).toEqual([]);
    expect(presetLayers("muscles", []).deep).toBe(false);
  });
  it("手动关闭深层优先于所选结构与预设 / manual layer changes override preset visibility and selection", () => {
    const layers = presetLayers("overlay", [catalog.structures.deep]);
    expect(
      planResources(catalog, {
        ...base,
        ...layers,
        deep: false,
        region: "arm",
        structureIds: ["deep"],
        selectedId: "deep",
      }),
    ).toEqual(["surface"]);
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
