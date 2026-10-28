import type { Catalog, Learning, LearningEntry, Locale } from "./types";
import { learningCoverage, learningIds } from "./planner";
import { t, text } from "./i18n";
export function LearningNotice({
  catalog,
  learning,
  entry,
  locale,
}: {
  catalog: Catalog;
  learning: Learning;
  entry: LearningEntry;
  locale: Locale;
}) {
  const gaps = learningCoverage(catalog, learning, entry);
  const hasAvailable = learningIds(catalog, learning, entry).length > 0;
  return (
    <>
      {entry.notice && <p className="notice">{text(locale, entry.notice)}</p>}
      {gaps.length > 0 && (
        <div className="coverage-notice">
          {hasAvailable && (
            <p className="notice">{t(locale, "coveragePartial")}</p>
          )}
          {gaps.map((group) => (
            <div key={group.id} className="missing">
              <strong>{text(locale, group.name)}</strong>
              {(group.missing || !group.unavailableIds.length) && (
                <p>
                  {group.missing
                    ? text(locale, group.missing)
                    : t(locale, "coverageMissing")}
                </p>
              )}
              {group.unavailableIds.length > 0 && (
                <p>
                  {t(locale, "coverageExcluded")}:{" "}
                  {group.unavailableIds.join(", ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
