import type { Learning, LearningCategory, LearningEntry, Point } from "./types";
export const categories: LearningCategory[] = [
  "fitness",
  "stretching",
  "western",
  "tcm",
];
export function entryCategory(entry: LearningEntry): LearningCategory {
  return entry.category ?? (entry.kind === "exercise" ? "fitness" : "western");
}
export function filterEntries(
  entries: LearningEntry[],
  kind: LearningEntry["kind"],
  category: LearningCategory | "all",
  query = "",
) {
  const search = query.trim().toLocaleLowerCase();
  return entries.filter(
    (entry) =>
      entry.kind === kind &&
      (category === "all" || entryCategory(entry) === category) &&
      `${entry.name.zh} ${entry.name.en} ${entry.id}`
        .toLocaleLowerCase()
        .includes(search),
  );
}
export function relatedEntries(
  learning: Learning,
  selection: { structureIds?: string[]; pointCode?: string },
): LearningEntry[] {
  const ids = new Set(selection.structureIds ?? []);
  const groups = new Set(
    learning.groups
      .filter((group) => group.structureIds.some((id) => ids.has(id)))
      .map((group) => group.id),
  );
  return learning.entries.filter(
    (entry) =>
      entry.groupIds.some((id) => groups.has(id)) ||
      (!!selection.pointCode &&
        (entry.acupointCodes ?? []).includes(selection.pointCode)),
  );
}
export function entryPoints(entry: LearningEntry, points: Point[]): Point[] {
  return points.filter((point) =>
    (entry.acupointCodes ?? []).includes(point.code),
  );
}
