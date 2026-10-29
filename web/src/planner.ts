import type {
  Catalog,
  Learning,
  LearningEntry,
  Side,
  SorenessRecord,
} from "./types";
export type PlanInput = {
  mode: "muscles" | "acupuncture";
  region: string;
  superficial: boolean;
  deep: boolean;
  groupIds?: string[];
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
  if (input.mode === "acupuncture") return [];
  if (input.learningEntry && input.learning)
    return learningIds(catalog, input.learning, input.learningEntry);
  const explicit = input.groupIds?.length
    ? catalog.groups
        .concat(catalog.tendons)
        .filter((g) => input.groupIds!.includes(g.id))
        .flatMap((g) => g.structureIds)
    : [];
  const ids = input.groupIds?.length
    ? explicit
    : input.region === "all"
      ? catalog.initialStructureIds
      : Object.values(catalog.structures)
          .filter((s) => s.region === input.region)
          .map((s) => s.id);
  const selected = input.selectedId && catalog.structures[input.selectedId];
  const matching = allowedIds(catalog, ids).filter((id) => {
    const s = catalog.structures[id];
    return s.layer === "deep"
      ? input.deep && input.region !== "all" && s.region === input.region
      : input.superficial;
  });
  return allowedIds(catalog, selected ? [...matching, selected.id] : matching);
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
