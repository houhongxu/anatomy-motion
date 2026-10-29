import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AtlasSelectionDetails } from "../src/AnatomyDetails";
import { DirectoryTabs } from "../src/DirectoryTabs";
import {
  explorerReducer,
  initialExplorerState,
  selectionStructureIds,
  wholeBodyScope,
} from "../src/atlas-state";
import { planResources } from "../src/planner";
import { relatedEntries } from "../src/relations";
import type { Acupuncture, Catalog, Learning, Structure } from "../src/types";
const structure = (
  id: string,
  region: string,
  layer: Structure["layer"] = "superficial",
): Structure => ({
  id,
  region,
  layer,
  kind: "muscle",
  side: "left",
  name: { zh: `结构${id}`, en: `Structure ${id}` },
  asset: `/models/web/structures/${id}.glb`,
  bounds: { min: [0, 0, 0], max: [1, 1, 1] },
});
const catalog: Catalog = {
  version: 1,
  groups: [
    {
      id: "arm",
      name: { zh: "手臂组", en: "Arm group" },
      structureIds: ["arm"],
    },
    {
      id: "deep",
      name: { zh: "深层组", en: "Deep group" },
      structureIds: ["deep"],
    },
  ],
  tendons: [],
  regions: [
    { id: "arm", name: { zh: "手臂", en: "Arm" } },
    { id: "leg", name: { zh: "腿", en: "Leg" } },
  ],
  initialStructureIds: ["arm", "leg"],
  structures: {
    arm: structure("arm", "arm"),
    leg: structure("leg", "leg"),
    external: structure("external", "leg"),
    deep: structure("deep", "arm", "deep"),
    otherDeep: structure("otherDeep", "leg", "deep"),
  },
  assets: {
    body: { url: "/models/web/body.glb" },
    skin: { url: "/models/web/skin.glb" },
  },
};
const learning: Learning = {
  groups: [
    {
      id: "learning-arm",
      name: { zh: "手臂", en: "Arm" },
      structureIds: ["arm"],
    },
  ],
  entries: [
    {
      id: "movement",
      kind: "exercise",
      category: "fitness",
      acupointCodes: [],
      name: { zh: "关联动作", en: "Related movement" },
      summary: { zh: "学习", en: "Learning" },
      groupIds: ["learning-arm"],
      sources: [{ title: "Source", url: "https://example.org/source" }],
    },
  ],
};
const acupuncture: Acupuncture = {
  reviewStatus: "unreviewed",
  sources: [],
  meridians: [],
  points: [
    {
      id: "li4-left",
      code: "LI4",
      name: { zh: "合谷", en: "Hegu" },
      side: "left",
      position: [0, 0, 0],
      meridianId: "LI",
      region: { zh: "手", en: "Hand" },
      landmark: { zh: "定位", en: "Landmark" },
      sourceIds: [],
      reviewStatus: "unreviewed",
    },
  ],
};
const scope = { mode: "muscles" as const, ...wholeBodyScope };
const callbacks = {
  onStructure: () => {},
  onEntry: () => {},
  onRecord: () => {},
  onClear: () => {},
  onWholeBody: () => {},
};
describe("连续选择与浏览范围 / continuous selection and browsing scope", () => {
  it("切换肌肉只追加选择，其他baseline肌肉始终可点 / changing muscles appends the selection while retaining the baseline", () => {
    let state = explorerReducer(initialExplorerState, {
      type: "selection",
      action: { type: "structure", id: "external" },
      openAtlas: true,
    });
    expect(
      planResources(catalog, {
        ...scope,
        structureIds: selectionStructureIds(state.selection),
      }),
    ).toEqual(["arm", "leg", "external"]);
    state = explorerReducer(state, {
      type: "selection",
      action: { type: "structure", id: "arm", toggle: true },
      openAtlas: true,
    });
    expect(
      planResources(catalog, {
        ...scope,
        structureIds: selectionStructureIds(state.selection),
      }),
    ).toEqual(["arm", "leg"]);
    expect(selectionStructureIds(state.selection)).toEqual(["arm"]);
    state = explorerReducer(state, {
      type: "selection",
      action: { type: "structure", id: "arm", toggle: true },
      openAtlas: true,
    });
    expect(state.selection).toBeUndefined();
    expect(state.tab).toBe("atlas");
    expect(
      planResources(catalog, {
        ...scope,
        structureIds: selectionStructureIds(state.selection),
      }),
    ).toEqual(["arm", "leg"]);
  });
  it("肌群点击具体网格进入单结构，再点同一结构才取消 / group selection narrows to a mesh and only a repeated mesh click clears", () => {
    let state = explorerReducer(initialExplorerState, {
      type: "selection",
      action: { type: "group", group: catalog.groups[0] },
      openAtlas: true,
    });
    state = explorerReducer(state, {
      type: "selection",
      action: { type: "structure", id: "arm", toggle: true },
      openAtlas: true,
    });
    expect(state.selection).toEqual({ kind: "structure", id: "arm" });
    expect(
      planResources(catalog, {
        ...scope,
        structureIds: selectionStructureIds(state.selection),
      }),
    ).toEqual(["arm", "leg"]);
    state = explorerReducer(state, {
      type: "selection",
      action: { type: "structure", id: "arm", toggle: true },
      openAtlas: true,
    });
    expect(state.selection).toBeUndefined();
    expect(
      planResources(catalog, {
        ...scope,
        structureIds: selectionStructureIds(state.selection),
      }),
    ).toEqual(["arm", "leg"]);
  });
  it("深层仅按明确选择追加，取消与手动关层后移除 / only selected deep structures are appended and can be cleared or hidden", () => {
    let state = explorerReducer(initialExplorerState, {
      type: "selection",
      action: { type: "group", group: catalog.groups[1] },
      openAtlas: true,
    });
    const selected = selectionStructureIds(state.selection);
    expect(
      planResources(catalog, { ...scope, deep: true, structureIds: selected }),
    ).toEqual(["arm", "leg", "deep"]);
    expect(
      planResources(catalog, { ...scope, deep: false, structureIds: selected }),
    ).toEqual(["arm", "leg"]);
    state = explorerReducer(state, {
      type: "selection",
      action: { type: "clear" },
    });
    expect(
      planResources(catalog, {
        ...scope,
        deep: true,
        structureIds: selectionStructureIds(state.selection),
      }),
    ).toEqual(["arm", "leg"]);
  });
  it("区域浏览与选择独立，全身恢复重置浏览范围 / regional browsing is independent and whole-body restore resets the scope", () => {
    const regional = { ...scope, region: "leg", deep: true };
    let state = explorerReducer(initialExplorerState, {
      type: "selection",
      action: { type: "structure", id: "arm" },
      openAtlas: true,
    });
    expect(
      planResources(catalog, {
        ...regional,
        structureIds: selectionStructureIds(state.selection),
      }),
    ).toEqual(["leg", "external", "otherDeep", "arm"]);
    state = explorerReducer(state, {
      type: "selection",
      action: { type: "clear" },
    });
    expect(
      planResources(catalog, {
        ...regional,
        structureIds: selectionStructureIds(state.selection),
      }),
    ).toEqual(["leg", "external", "otherDeep"]);
    expect(
      planResources(catalog, {
        ...regional,
        ...wholeBodyScope,
        structureIds: [],
      }),
    ).toEqual(["arm", "leg"]);
    expect(catalog.assets.body.url).toBe("/models/web/body.glb");
  });
  it("目录项导航atlas并按明确映射显示关联，记录选择保持records / directory items navigate to exact atlas relations while record selection stays in records", () => {
    const directory = explorerReducer(
      explorerReducer(initialExplorerState, { type: "tab", tab: "learning" }),
      { type: "directory", directory: "structures" },
    );
    const selected = explorerReducer(directory, {
      type: "selection",
      action: { type: "group", group: catalog.groups[0] },
      openAtlas: true,
    });
    expect(selected.tab).toBe("atlas");
    expect(selected.directory).toBe("structures");
    expect(
      relatedEntries(learning, {
        structureIds: selectionStructureIds(selected.selection),
      }).map((entry) => entry.id),
    ).toEqual(["movement"]);
    const point = explorerReducer(
      { ...directory, directory: "points" },
      {
        type: "selection",
        action: { type: "point", id: "li4-left" },
        openAtlas: true,
      },
    );
    expect(point.tab).toBe("atlas");
    expect(point.selection).toEqual({ kind: "point", id: "li4-left" });
    const records = explorerReducer(
      { ...selected, tab: "records" },
      { type: "selection", action: { type: "structure", id: "leg" } },
    );
    expect(records.tab).toBe("records");
    expect(selectionStructureIds(records.selection)).toEqual(["leg"]);
  });
});
describe("图谱详情和学习目录边界 / atlas details and learning directory boundary", () => {
  it("图谱详情只有当前结构和关联及取消控制，不包含全目录搜索 / atlas details show the selected structure and relations without a complete search directory", () => {
    const html = renderToStaticMarkup(
      <AtlasSelectionDetails
        structure={catalog.structures.arm}
        locale="zh"
        acupuncture={acupuncture}
        related={learning.entries}
        {...callbacks}
      />,
    );
    expect(html).toContain("结构arm");
    expect(html).toContain("关联动作");
    expect(html).toContain("取消选择");
    expect(html).toContain("返回全身");
    expect(html).not.toContain("结构leg");
    expect(html).not.toContain('type="search"');
    expect(html).not.toContain("<select");
    expect(html).not.toContain("学习目录");
  });
  it("肌群详情需先明确左右结构才可记录 / group details require an explicit sided structure before recording", () => {
    const left = catalog.structures.arm;
    const right: Structure = {
      ...left,
      id: "arm-right",
      side: "right",
      name: { zh: "右侧手臂", en: "Right arm" },
    };
    const group = { ...catalog.groups[0], structureIds: [left.id, right.id] };
    const groupHtml = renderToStaticMarkup(
      <AtlasSelectionDetails
        group={group}
        structure={left}
        groupStructures={[left, right]}
        locale="zh"
        acupuncture={acupuncture}
        related={[]}
        {...callbacks}
      />,
    );
    expect(groupHtml).toContain("手臂组");
    expect(groupHtml).toContain("左侧");
    expect(groupHtml).toContain("右侧");
    expect(groupHtml).not.toContain("新增记录");
    let state = explorerReducer(initialExplorerState, {
      type: "selection",
      action: { type: "group", group },
      openAtlas: true,
    });
    state = explorerReducer(state, {
      type: "selection",
      action: { type: "structure", id: right.id },
      openAtlas: true,
    });
    expect(state.selection).toEqual({ kind: "structure", id: right.id });
    const selected = [left, right].find(
      (member) => member.id === selectionStructureIds(state.selection)[0],
    );
    const detailHtml = renderToStaticMarkup(
      <AtlasSelectionDetails
        structure={selected}
        locale="en"
        acupuncture={acupuncture}
        related={[]}
        {...callbacks}
      />,
    );
    expect(detailHtml).toContain("Right arm");
    expect(detailHtml).toContain(">Right<");
    expect(detailHtml).toContain("New record");
    expect(detailHtml).not.toContain("Arm group");
  });
  it("取消后保留图谱面板提示，全目录入口仅在学习目录组件 / cleared details retain the atlas hint and complete directories belong to the learning navigation", () => {
    const html = renderToStaticMarkup(
      <AtlasSelectionDetails
        locale="en"
        acupuncture={acupuncture}
        related={[]}
        {...callbacks}
      />,
    );
    expect(html).toContain("Select a muscle or acupoint on the model");
    expect(html).not.toContain("Clear selection");
    expect(html).not.toContain("Related movements and symptoms");
    const directory = renderToStaticMarkup(
      <DirectoryTabs
        directory="structures"
        learning={learning}
        catalog={catalog}
        acupuncture={acupuncture}
        locale="en"
        onChange={() => {}}
      />,
    );
    expect(directory).toContain("Movements (1)");
    expect(directory).toContain("Symptoms (0)");
    expect(directory).toContain("Muscles/tendons (2)");
    expect(directory).toContain("Points (1)");
    expect(directory).not.toContain("肌肉");
  });
});
