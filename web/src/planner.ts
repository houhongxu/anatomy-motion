import type {
  Catalog,
  Learning,
  LearningEntry,
  Side,
  SorenessRecord,
  Structure,
} from "./types";
export type AtlasPreset = "muscles" | "acupuncture" | "overlay";
export function presetLayers(
  preset: AtlasPreset,
  selection: Pick<Structure, "layer">[] = [],
) {
  const muscles = preset !== "acupuncture";
  return {
    superficial: muscles,
    deep: muscles && selection.some((structure) => structure.layer === "deep"),
    showSkin: preset !== "muscles",
    skinOpacity: preset === "acupuncture" ? 0.65 : 0.3,
    showPoints: preset !== "muscles",
    showMeridians: preset !== "muscles",
  };
}
export type PlanInput = {
  mode: "muscles" | "acupuncture";
  region: string;
  superficial: boolean;
  deep: boolean;
  groupIds?: string[];
  structureIds?: string[];
  selectedId?: string;
  learningEntry?: LearningEntry;
  learning?: Learning;
};
export function allowedIds(catalog: Catalog, ids: Iterable<string>): string[] {
  return [...new Set(ids)].filter((id) => {
    const s = catalog.structures[id];
    return (
      !!s &&
      s.id === id &&
      s.asset === `/models/web/structures/${id}.glb` &&
      /^[A-Za-z0-9_-]+$/.test(id)
    );
  });
}
export function learningIds(
  catalog: Catalog,
  learning: Learning,
  entry: LearningEntry,
): string[] {
  return allowedIds(
    catalog,
    learning.groups
      .filter((g) => entry.groupIds.includes(g.id))
      .flatMap((g) => g.structureIds),
  );
}
export function learningCoverage(
  catalog: Catalog,
  learning: Learning,
  entry: LearningEntry,
) {
  return entry.groupIds.flatMap((id) => {
    const group = learning.groups.find((item) => item.id === id);
    if (!group)
      return [
        {
          id,
          name: { zh: id, en: id },
          missing: undefined,
          unavailableIds: [],
          availableCount: 0,
        },
      ];
    const available = new Set(allowedIds(catalog, group.structureIds));
    const unavailableIds = group.structureIds.filter(
      (structureId) => !available.has(structureId),
    );
    if (!group.missing && group.structureIds.length && !unavailableIds.length)
      return [];
    return [
      {
        id,
        name: group.name,
        missing: group.missing,
        unavailableIds,
        availableCount: available.size,
      },
    ];
  });
}
export function planResources(catalog: Catalog, input: PlanInput): string[] {
  const visibleLayer = (id: string) =>
    catalog.structures[id].layer === "deep" ? input.deep : input.superficial;
  const baseline = allowedIds(
    catalog,
    input.region === "all"
      ? catalog.initialStructureIds
      : Object.values(catalog.structures)
          .filter((structure) => structure.region === input.region)
          .map((structure) => structure.id),
  ).filter(
    (id) =>
      visibleLayer(id) &&
      (catalog.structures[id].layer !== "deep" || input.region !== "all"),
  );
  const groups = catalog.groups
    .concat(catalog.tendons)
    .filter((group) => input.groupIds?.includes(group.id))
    .flatMap((group) => group.structureIds);
  const learning =
    input.learningEntry && input.learning
      ? learningIds(catalog, input.learning, input.learningEntry)
      : [];
  const selection = allowedIds(catalog, [
    ...groups,
    ...(input.structureIds ?? []),
    ...(input.selectedId ? [input.selectedId] : []),
    ...learning,
  ]).filter(visibleLayer);
  return allowedIds(catalog, [...baseline, ...selection]);
}
export function recordPayload(
  record: Pick<
    SorenessRecord,
    "date" | "structureId" | "side" | "intensity" | "note"
  >,
  catalog: Catalog,
) {
  const side: Side =
    catalog.structures[record.structureId]?.side ?? record.side;
  return {
    date: record.date,
    structureId: record.structureId,
    side,
    intensity: Number(record.intensity),
    note: record.note,
  };
}
export function localDate(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
