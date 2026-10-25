import type { Localized } from "./i18n";
export type LearningGroup = {
  id: string;
  name: Localized;
  structureIds: string[];
  missing?: Localized;
};
export type LearningEntry = {
  id: string;
  kind: "exercise" | "condition";
  name: Localized;
  summary: Localized;
  groupIds: string[];
  sources: { title: string; url: string; label?: Localized }[];
  notice?: Localized;
};
export type LearningData = {
  version: 1;
  groups: LearningGroup[];
  entries: LearningEntry[];
};
export function matchLearningEntry(
  entry: LearningEntry,
  groups: LearningGroup[],
  loadedIds: ReadonlySet<string>,
) {
  const related = entry.groupIds.map((id) =>
    groups.find((group) => group.id === id),
  );
  const expected = Array.from(
    new Set(related.flatMap((group) => group?.structureIds || [])),
  );
  const ids = expected.filter((id) => loadedIds.has(id));
  const missingIds = expected.filter((id) => !loadedIds.has(id));
  const missingGroups = entry.groupIds.filter((_, i) => !related[i]);
  const incompleteGroups = related.filter(
    (group): group is LearningGroup =>
      !!group && (!!group.missing || !group.structureIds.length),
  );
  const coverage = !ids.length
    ? "none"
    : missingIds.length || missingGroups.length || incompleteGroups.length
      ? "partial"
      : "complete";
  return {
    ids,
    missingIds,
    missingGroups,
    incompleteGroups,
    related: related.filter((g): g is LearningGroup => !!g),
    coverage,
  } as const;
}
