import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LayerControls, muscleLayers } from "../src/LayerControls";
import type { LayerControlsProps } from "../src/LayerControls";
const base: LayerControlsProps = {
  locale: "zh",
  layers: {
    skin: false,
    superficial: true,
    deep: false,
    points: false,
    meridians: false,
  },
  skinOpacity: 0.3,
  onMuscles: () => {},
  onLayer: () => {},
  onOpacity: () => {},
};
describe("四类常驻图层与肌肉子层 / four persistent primary layers and muscle sublayers", () => {
  it("先排列四个一级开关，再显示肌肉子层，分组有可访问名称 / renders four primary switches before named muscle sublayers", () => {
    const html = renderToStaticMarkup(<LayerControls {...base} />);
    const groupName = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(groupName).toBeTruthy();
    expect(html).toContain(`id="${groupName}"`);
    expect(html).toContain(">图层</h2>");
    const primary =
      html.match(/<div class="layer-switches">([\s\S]*?)<\/div>/)?.[1] ?? "";
    expect(
      [...primary.matchAll(/<span>([^<]+)<\/span>/g)].map((match) => match[1]),
    ).toEqual(["肌肉", "皮肤", "穴位", "经络"]);
    expect(primary.match(/type="checkbox"/g)).toHaveLength(4);
    expect(html.match(/type="checkbox"/g)).toHaveLength(6);
    expect(html.match(/checked=""/g)).toHaveLength(2);
    expect(html).toContain("浅层");
    expect(html).toContain("深层");
    expect(html).not.toContain("<button");
    expect(html).not.toContain("aria-pressed");
    expect(html).not.toContain("<details");
    expect(html).not.toContain('type="range"');
  });
  it("肌肉全关时只显示四个一级开关 / hides sublayers when both muscle layers are off", () => {
    const html = renderToStaticMarkup(
      <LayerControls
        {...base}
        layers={{ ...base.layers, superficial: false, deep: false }}
      />,
    );
    expect(html.match(/type="checkbox"/g)).toHaveLength(4);
    expect(html).not.toContain('checked=""');
    expect(html).not.toContain("muscle-sublayers");
  });
  it("仅深层或浅深同开均使肌肉主开关开启 / deep-only and combined superficial/deep visibility enable the parent muscle switch", () => {
    const deep = renderToStaticMarkup(
      <LayerControls
        {...base}
        layers={{ ...base.layers, superficial: false, deep: true }}
      />,
    );
    const both = renderToStaticMarkup(
      <LayerControls
        {...base}
        layers={{ ...base.layers, superficial: true, deep: true }}
      />,
    );
    expect(deep.match(/checked=""/g)).toHaveLength(2);
    expect(both.match(/checked=""/g)).toHaveLength(3);
    expect(deep).toContain("muscle-sublayers");
    expect(both).toContain("muscle-sublayers");
  });
  it("皮肤开启才显示不透明度，其他开关保持独立 / skin gates opacity while other switches stay independent", () => {
    const html = renderToStaticMarkup(
      <LayerControls
        {...base}
        skinOpacity={0.65}
        layers={{
          skin: true,
          superficial: false,
          deep: true,
          points: true,
          meridians: true,
        }}
      />,
    );
    expect(html.match(/checked=""/g)).toHaveLength(5);
    expect(html).toContain("皮肤不透明度");
    expect(html).toContain("65%");
    expect(html).toMatch(
      /type="range"[^>]*min="0.05"[^>]*max="1"[^>]*step="0.05"[^>]*value="0.65"/,
    );
    expect(html).not.toContain("disabled");
  });
  it("主开关关闭两层，重开固定恢复浅层且不改变其他图层 / closing disables both layers and reopening restores only superficial without changing other layers", () => {
    const original = {
      ...base.layers,
      skin: true,
      superficial: true,
      deep: true,
      points: true,
      meridians: true,
    };
    const closed = { ...original, ...muscleLayers(false) };
    expect(closed).toEqual({ ...original, superficial: false, deep: false });
    const reopened = { ...closed, ...muscleLayers(true) };
    expect(reopened).toEqual({ ...original, superficial: true, deep: false });
  });
  it("仅显示所选语言且无预设入口 / uses a single locale without preset controls", () => {
    const html = renderToStaticMarkup(<LayerControls {...base} locale="en" />);
    for (const label of [
      "Layers",
      "Muscles",
      "Skin",
      "Superficial",
      "Deep",
      "Points",
      "Meridians",
    ])
      expect(html).toContain(label);
    expect(html).not.toContain("图层");
    expect(html).not.toContain("肌肉");
    expect(html).not.toContain("Overlay");
    expect(html).not.toContain("Acupoints");
    expect(html).not.toContain("aria-expanded");
  });
});
