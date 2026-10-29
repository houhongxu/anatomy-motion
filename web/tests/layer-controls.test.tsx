import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LayerControls } from "../src/LayerControls";
import type { LayerControlsProps } from "../src/LayerControls";
const base: LayerControlsProps = {
  locale: "zh",
  preset: "muscles",
  layers: {
    skin: false,
    superficial: true,
    deep: false,
    points: false,
    meridians: false,
  },
  skinOpacity: 0.3,
  onPreset: () => {},
  onLayer: () => {},
  onOpacity: () => {},
};
describe("常驻图层控制 / persistent layer controls", () => {
  it("独立呈现三个预设和五个图层，分组有可访问名称 / independently renders named groups, three presets and five native layer switches", () => {
    const html = renderToStaticMarkup(<LayerControls {...base} />);
    const groupName = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(groupName).toBeTruthy();
    expect(html).toContain(`id="${groupName}"`);
    expect(html).toContain(">图层</h2>");
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html.match(/type="checkbox"/g)).toHaveLength(5);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain("浅层");
    expect(html).toContain("深层");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
    expect(html).not.toContain('type="range"');
  });
  it("保留每个独立开关和预设状态，皮肤开启才显示不透明度 / preserves independent checked and pressed states and shows opacity only with skin", () => {
    const html = renderToStaticMarkup(
      <LayerControls
        {...base}
        preset="overlay"
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
    expect(html.match(/checked=""/g)).toHaveLength(4);
    expect(html).toMatch(/aria-pressed="true"[^>]*>叠加<\/button>/);
    expect(html).toContain("皮肤不透明度");
    expect(html).toContain("65%");
    expect(html).toMatch(
      /type="range"[^>]*min="0.05"[^>]*max="1"[^>]*step="0.05"[^>]*value="0.65"/,
    );
    expect(html).not.toContain("disabled");
  });
  it("不依赖详情或目录并遵循单语言 / does not depend on details or directories and uses a single locale", () => {
    const html = renderToStaticMarkup(<LayerControls {...base} locale="en" />);
    for (const label of [
      "Layers",
      "Muscles",
      "Acupoints",
      "Overlay",
      "Skin",
      "Superficial",
      "Deep",
      "Points",
      "Meridians",
    ])
      expect(html).toContain(label);
    expect(html).not.toContain("图层");
    expect(html).not.toContain("肌肉");
    expect(html).not.toContain("aria-expanded");
  });
});
