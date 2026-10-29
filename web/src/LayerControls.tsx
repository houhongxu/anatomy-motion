import { useId } from "react";
import type { Locale } from "./types";
import { t } from "./i18n";
export type LayerVisibility = {
  skin: boolean;
  superficial: boolean;
  deep: boolean;
  points: boolean;
  meridians: boolean;
};
export function muscleLayers(
  checked: boolean,
): Pick<LayerVisibility, "superficial" | "deep"> {
  return { superficial: checked, deep: false };
}
export type LayerControlsProps = {
  locale: Locale;
  layers: LayerVisibility;
  skinOpacity: number;
  onMuscles: (checked: boolean) => void;
  onLayer: (layer: keyof LayerVisibility, checked: boolean) => void;
  onOpacity: (value: number) => void;
};
export function LayerControls({
  locale,
  layers,
  skinOpacity,
  onMuscles,
  onLayer,
  onOpacity,
}: LayerControlsProps) {
  const titleId = useId();
  const switches = [
    { id: "skin", label: "body" },
    { id: "points", label: "points" },
    { id: "meridians", label: "meridians" },
  ] as const;
  return (
    <section className="layer-controls" role="group" aria-labelledby={titleId}>
      <h2 className="layer-title" id={titleId}>
        {t(locale, "layers")}
      </h2>
      <div className="layer-switches">
        <label className="toggle">
          <input
            type="checkbox"
            checked={layers.superficial || layers.deep}
            onChange={(event) => onMuscles(event.target.checked)}
          />
          <span>{t(locale, "muscles")}</span>
        </label>
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
      {(layers.superficial || layers.deep) && (
        <div
          className="muscle-sublayers"
          role="group"
          aria-label={t(locale, "muscles")}
        >
          {(
            [
              { id: "superficial", label: "layerSuperficial" },
              { id: "deep", label: "layerDeep" },
            ] as const
          ).map((layer) => (
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
      )}
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
