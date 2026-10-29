import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RelatedLearning } from "../src/RelatedLearning";
import {
  categories,
  entryCategory,
  entryPoints,
  filterEntries,
  relatedEntries,
} from "../src/relations";
import type {
  Learning,
  LearningCategory,
  LearningEntry,
  Point,
} from "../src/types";
const entry = (
  id: string,
  category: LearningCategory,
  groupIds: string[] = [],
  acupointCodes: string[] = [],
): LearningEntry => ({
  id,
  category,
  kind:
    category === "fitness" || category === "stretching"
      ? "exercise"
      : "condition",
  name: { zh: `条目${id}`, en: `Entry ${id}` },
  summary: { zh: "学习", en: "Learning" },
  groupIds,
  acupointCodes,
  sources: [{ title: "Source", url: "https://example.org/source" }],
});
const entries = [
  entry("strength", "fitness", ["mapped-arm"]),
  entry("stretch", "stretching", ["mapped-leg"]),
  entry("western", "western", ["mapped-arm"]),
  entry("traditional", "tcm", [], ["LI4"]),
];
const learning: Learning = {
  groups: [
    {
      id: "mapped-arm",
      name: { zh: "手臂", en: "Arm" },
      structureIds: ["arm-left", "arm-right"],
    },
    {
      id: "mapped-leg",
      name: { zh: "腿", en: "Leg" },
      structureIds: ["leg-left"],
    },
  ],
  entries,
};
const point = (id: string, code: string): Point => ({
  id,
  code,
  name: { zh: "穴位", en: "Point" },
  meridianId: "LI",
  side: id.endsWith("right") ? "right" : "left",
  position: [0, 0, 0],
  region: { zh: "手", en: "Hand" },
  landmark: { zh: "定位", en: "Landmark" },
  sourceIds: [],
  reviewStatus: "unreviewed",
});
describe("有来源的双向关联 / sourced bidirectional relations", () => {
  it("按动作与症状及分类过滤且计数来自数据 / filters kinds and categories using actual data", () => {
    expect(
      filterEntries(entries, "exercise", "all").map((item) => item.id),
    ).toEqual(["strength", "stretch"]);
    expect(
      filterEntries(entries, "condition", "tcm", "TRADITIONAL").map(
        (item) => item.id,
      ),
    ).toEqual(["traditional"]);
    expect(filterEntries(entries, "exercise", "western")).toEqual([]);
    expect(categories).toEqual(["fitness", "stretching", "western", "tcm"]);
    expect(entryCategory({ ...entries[0], category: undefined })).toBe(
      "fitness",
    );
  });
  it("由学习肌群结构ID反查，不依赖目录肌群同名或位置 / resolves reverse IDs without matching catalog group names or proximity", () => {
    expect(
      relatedEntries(learning, { structureIds: ["arm-left"] }).map(
        (item) => item.id,
      ),
    ).toEqual(["strength", "western"]);
    expect(
      relatedEntries(learning, { structureIds: ["leg-left"] }).map(
        (item) => item.id,
      ),
    ).toEqual(["stretch"]);
    expect(relatedEntries(learning, { structureIds: ["unknown"] })).toEqual([]);
  });
  it("显式穴位代码关联双侧，近似代码不匹配 / explicit acupoint codes resolve both sides without prefix inference", () => {
    const points = [
      point("li4-left", "LI4"),
      point("li4-right", "LI4"),
      point("li40-left", "LI40"),
    ];
    expect(entryPoints(entries[3], points).map((item) => item.id)).toEqual([
      "li4-left",
      "li4-right",
    ]);
    expect(
      relatedEntries(learning, { pointCode: "LI4" }).map((item) => item.id),
    ).toEqual(["traditional"]);
    expect(relatedEntries(learning, { pointCode: "LI40" })).toEqual([]);
    expect(relatedEntries(learning, { pointCode: "LI4" })[0].groupIds).toEqual(
      [],
    );
  });
  it("空分类明确显示无来源关联，单语言呈现 / empty categories show no sourced association in the selected locale", () => {
    const markup = renderToStaticMarkup(
      <RelatedLearning entries={[]} locale="zh" onSelect={() => {}} />,
    );
    expect(markup.match(/暂无有来源的关联/g)).toHaveLength(4);
    expect(markup).not.toContain("<button");
    const english = renderToStaticMarkup(
      <RelatedLearning
        entries={[entries[3]]}
        locale="en"
        onSelect={() => {}}
      />,
    );
    expect(english).toContain("Entry traditional");
    expect(english).toContain("Traditional Chinese medicine");
    expect(english).not.toContain("条目");
  });
});
