import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LearningNotice } from "../src/LearningNotice";
import { learningCoverage, learningIds } from "../src/planner";
import type { Catalog, Learning, LearningEntry } from "../src/types";
const catalog: Catalog = {
  version: 1,
  groups: [],
  regions: [],
  structures: {
    muscle: {
      id: "muscle",
      name: { zh: "肩袖肌肉", en: "Rotator cuff muscle" },
      kind: "muscle",
      side: "left",
      region: "shoulder",
      layer: "deep",
      asset: "/models/web/structures/muscle.glb",
      bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    },
  },
  initialStructureIds: [],
  tendons: [],
  assets: {
    body: { url: "/models/web/body.glb" },
    skin: { url: "/models/web/skin.glb" },
  },
};
const entry: LearningEntry = {
  id: "rotator-cuff-tendinitis",
  kind: "condition",
  name: { zh: "肩袖肌腱炎", en: "Rotator cuff tendinitis" },
  summary: { zh: "", en: "" },
  notice: {
    zh: "肌腱网格缺失时，相关肌肉高亮仅作解剖背景。",
    en: "When tendon meshes are absent, muscle highlights provide anatomical context only.",
  },
  groupIds: ["tendon", "muscle"],
  sources: [],
};
const learning: Learning = {
  entries: [entry],
  groups: [
    {
      id: "tendon",
      name: { zh: "肩袖肌腱", en: "Rotator cuff tendons" },
      structureIds: [],
      missing: {
        zh: "来源没有该肌腱的独立网格，无法单独高亮。",
        en: "The source has no separate tendon mesh; it cannot be highlighted.",
      },
    },
    {
      id: "muscle",
      name: { zh: "肩袖肌群", en: "Rotator cuff muscles" },
      structureIds: ["muscle"],
    },
  ],
};
describe("教学部分覆盖说明 / learning coverage notice", () => {
  it("肌腱缺失仍保留肌肉且精确报告缺失组 / retains available muscle while identifying missing tendon", () => {
    expect(learningIds(catalog, learning, entry)).toEqual(["muscle"]);
    expect(
      learningCoverage(catalog, learning, entry).map((group) => group.id),
    ).toEqual(["tendon"]);
  });
  it("中文显示原notice、部分覆盖和肌腱缺失原因 / Chinese displays source notice and missing tendon reason", () => {
    const html = renderToStaticMarkup(
      <LearningNotice
        catalog={catalog}
        learning={learning}
        entry={entry}
        locale="zh"
      />,
    );
    expect(html).toContain(entry.notice!.zh);
    expect(html).toContain("部分覆盖");
    expect(html).toContain(learning.groups[0].missing!.zh);
    expect(html).not.toContain(entry.notice!.en);
    expect(html).not.toContain("Rotator cuff tendons");
  });
  it("英文使用一致事实且只显示英文 / English retains the same facts without parallel Chinese", () => {
    const html = renderToStaticMarkup(
      <LearningNotice
        catalog={catalog}
        learning={learning}
        entry={entry}
        locale="en"
      />,
    );
    expect(html).toContain(entry.notice!.en);
    expect(html).toContain("Partial coverage");
    expect(html).toContain(learning.groups[0].missing!.en);
    expect(html).not.toContain(entry.notice!.zh);
  });
  it("非白名单ID逐项说明且不得进入高亮计划 / excluded IDs are explicit and never enter highlighted geometry", () => {
    const narrowed: Learning = {
      entries: [entry],
      groups: [
        {
          id: "muscle",
          name: { zh: "肩袖肌群", en: "Rotator cuff muscles" },
          structureIds: ["muscle", "legacy-tendon"],
        },
      ],
    };
    const narrowedEntry = { ...entry, groupIds: ["muscle"] };
    expect(learningIds(catalog, narrowed, narrowedEntry)).toEqual(["muscle"]);
    expect(
      learningCoverage(catalog, narrowed, narrowedEntry)[0].unavailableIds,
    ).toEqual(["legacy-tendon"]);
    const html = renderToStaticMarkup(
      <LearningNotice
        catalog={catalog}
        learning={narrowed}
        entry={narrowedEntry}
        locale="zh"
      />,
    );
    expect(html).toContain("未包含在当前图谱的结构: legacy-tendon");
  });
  it("完全覆盖条目不会显示部分覆盖 / fully covered entries do not show partial coverage", () => {
    const complete = { ...entry, groupIds: ["muscle"], notice: undefined };
    expect(learningCoverage(catalog, learning, complete)).toEqual([]);
    expect(
      renderToStaticMarkup(
        <LearningNotice
          catalog={catalog}
          learning={learning}
          entry={complete}
          locale="en"
        />,
      ),
    ).not.toContain("Partial coverage");
  });
  it("纯穴位条目不显示肌肉模型缺失警告 / point-only entries do not report missing muscle geometry", () => {
    const pointOnly: LearningEntry = {
      ...entry,
      category: "tcm",
      acupointCodes: ["LI4"],
      groupIds: [],
      notice: undefined,
    };
    const html = renderToStaticMarkup(
      <LearningNotice
        catalog={catalog}
        learning={learning}
        entry={pointOnly}
        locale="zh"
      />,
    );
    expect(html).not.toContain("暂无可用模型");
    expect(html).not.toContain("部分覆盖");
    expect(html).toBe("");
  });
  it("缺失的肌肉关联仍显示几何提示 / missing muscle mappings still show a geometry warning", () => {
    const missing = { ...entry, groupIds: ["tendon"], notice: undefined };
    const html = renderToStaticMarkup(
      <LearningNotice
        catalog={catalog}
        learning={learning}
        entry={missing}
        locale="en"
      />,
    );
    expect(html).toContain("No available geometry for this entry.");
    expect(html).toContain(learning.groups[0].missing!.en);
  });
});
