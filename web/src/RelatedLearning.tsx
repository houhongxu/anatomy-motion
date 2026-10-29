import type { LearningEntry, Locale } from "./types";
import { categories, entryCategory } from "./relations";
import { t, text } from "./i18n";
export function RelatedLearning({
  entries,
  locale,
  onSelect,
}: {
  entries: LearningEntry[];
  locale: Locale;
  onSelect: (entry: LearningEntry) => void;
}) {
  return (
    <section className="related-learning">
      <h4>{t(locale, "relatedLearning")}</h4>
      {categories.map((category) => {
        const items = entries.filter(
          (item) => entryCategory(item) === category,
        );
        return (
          <div key={category}>
            <h4>
              {t(locale, category)} · {items.length}
            </h4>
            {items.length ? (
              items.map((item) => (
                <button
                  className="list-item"
                  key={item.id}
                  onClick={() => onSelect(item)}
                >
                  {text(locale, item.name)} <span>↗</span>
                </button>
              ))
            ) : (
              <p className="hint">{t(locale, "noRelations")}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
