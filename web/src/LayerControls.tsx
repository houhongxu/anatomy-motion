import { useId } from "react";
import type { AtlasPreset } from "./planner";
import type { Locale } from "./types";
import { t } from "./i18n";
export type LayerVisibility = {
  skin: boolean;
  superficial: boolean;
  deep: boolean;
  points: boolean;
  meridians: boolean;
};
export type LayerControlsProps = {
  locale: Locale;
  preset: AtlasPreset;
  layers: LayerVisibility;
  skinOpacity: number;
  onPreset: (preset: AtlasPreset) => void;
  onLayer: (layer: keyof LayerVisibility, checked: boolean) => void;
  onOpacity: (value: number) => void;
};
export function LayerControls({
  locale,
  preset,
  layers,
  skinOpacity,
  onPreset,
  onLayer,
  onOpacity,
}: LayerControlsProps) {
  const titleId = useId();
  const switches = [
    { id: "skin", label: "body" },
    { id: "superficial", label: "layerSuperficial" },
    { id: "deep", label: "layerDeep" },
    { id: "points", label: "points" },
    { id: "meridians", label: "meridians" },
  ] as const;
  return (
    <section className="layer-controls" role="group" aria-labelledby={titleId}>
      <h2 className="layer-title" id={titleId}>
        {t(locale, "layers")}
      </h2>
      <div
        className="layer-presets"
        role="group"
        aria-label={t(locale, "mode")}
      >
        {(["muscles", "acupuncture", "overlay"] as const).map((value) => (
          <button
            key={value}
            aria-pressed={preset === value}
            className={preset === value ? "active" : ""}
            onClick={() => onPreset(value)}
          >
            {t(locale, value)}
          </button>
        ))}
      </div>
      <div className="layer-switches">
        {switches.map((layer) => (
          <label className="toggle" key={layer.id}>
            <input
              type="checkbox"
              checked={layers[layer.id]}
              onChange={(event) => onLayer(layer.id, event.target.checked)}
            />
            <span>{t(locale, layer.label)}</span>
          </label>
        ))}
      </div>
      {layers.skin && (
        <label className="layer-opacity">
          <span>
            {t(locale, "skinOpacity")} · {Math.round(skinOpacity * 100)}%
          </span>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={skinOpacity}
            onChange={(event) => onOpacity(Number(event.target.value))}
          />
        </label>
      )}
    </section>
  );
}
