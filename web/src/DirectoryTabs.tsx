import type { Acupuncture, Catalog, Learning, Locale } from "./types";
import { t } from "./i18n";
import type { DirectoryKind } from "./atlas-state";
export function DirectoryTabs({
  directory,
  learning,
  catalog,
  acupuncture,
  locale,
  onChange,
}: {
  directory: DirectoryKind;
  learning: Learning;
  catalog: Catalog;
  acupuncture: Acupuncture;
  locale: Locale;
  onChange: (value: DirectoryKind) => void;
}) {
  const items = [
    {
      id: "exercise",
      label: "exercises",
      count: learning.entries.filter((entry) => entry.kind === "exercise")
        .length,
    },
    {
      id: "condition",
      label: "conditions",
      count: learning.entries.filter((entry) => entry.kind === "condition")
        .length,
    },
    {
      id: "structures",
      label: "structureDirectory",
      count: catalog.groups.length + catalog.tendons.length,
    },
    { id: "points", label: "points", count: acupuncture.points.length },
  ] as const;
  return (
    <div
      className="directory-tabs"
      role="group"
      aria-label={t(locale, "directory")}
    >
      {items.map((item) => (
        <button
          key={item.id}
          aria-pressed={directory === item.id}
          className={directory === item.id ? "active" : ""}
          onClick={() => onChange(item.id)}
        >
          {t(locale, item.label)} ({item.count})
        </button>
      ))}
    </div>
  );
}
