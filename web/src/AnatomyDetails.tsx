import type {
  Acupuncture,
  Group,
  LearningEntry,
  Locale,
  Point,
  Structure,
} from "./types";
import { sourceLabel, t, text } from "./i18n";
import { RelatedLearning } from "./RelatedLearning";
export function AtlasSelectionDetails({
  structure,
  group,
  groupStructures = [],
  point,
  acupuncture,
  locale,
  related,
  onEntry,
  onStructure,
  onRecord,
  onClear,
  onWholeBody,
  canRestoreWholeBody,
}: {
  structure?: Structure;
  group?: Group;
  groupStructures?: Structure[];
  point?: Point;
  acupuncture: Acupuncture;
  locale: Locale;
  related: LearningEntry[];
  onEntry: (entry: LearningEntry) => void;
  onStructure: (id: string) => void;
  onRecord: () => void;
  onClear: () => void;
  onWholeBody: () => void;
  canRestoreWholeBody: boolean;
}) {
  const selected = !!(structure || group || point);
  return (
    <>
      <div className="selection-actions">
        {selected && (
          <button onClick={onClear}>{t(locale, "clearSelection")}</button>
        )}
        {canRestoreWholeBody && (
          <button onClick={onWholeBody}>{t(locale, "restoreWholeBody")}</button>
        )}
      </div>
      {!selected ? (
        <p className="notice">{t(locale, "clickModelHint")}</p>
      ) : (
        <>
          {point ? (
            <PointDetails
              point={point}
              acupuncture={acupuncture}
              locale={locale}
            />
          ) : group ? (
            <article className="detail-card">
              <span className="eyebrow">{t(locale, "details")}</span>
              <h3>{text(locale, group.name)}</h3>
              {group.missing && (
                <p className="missing">{text(locale, group.missing)}</p>
              )}
              {groupStructures.length > 0 && <h4>{t(locale, "structure")}</h4>}
              {groupStructures.map((member) => (
                <button
                  key={member.id}
                  className="structure-item"
                  onClick={() => onStructure(member.id)}
                >
                  <span>{text(locale, member.name)}</span>
                  <span className="tag">{t(locale, member.side)}</span>
                </button>
              ))}
            </article>
          ) : structure ? (
            <StructureDetails
              structure={structure}
              locale={locale}
              onRecord={onRecord}
            />
          ) : null}
          <RelatedLearning
            entries={related}
            locale={locale}
            onSelect={onEntry}
          />
        </>
      )}
    </>
  );
}
export function Sources({
  locale,
  sources,
}: {
  locale: Locale;
  sources: { title: string; url: string }[];
}) {
  return (
    <div className="sources">
      <h4>{t(locale, "source")}</h4>
      {sources.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
          {s.title} ↗
        </a>
      ))}
    </div>
  );
}
function StructureDetails({
  structure,
  locale,
  onRecord,
}: {
  structure: Structure;
  locale: Locale;
  onRecord: () => void;
}) {
  return (
    <article className="detail-card">
      <span className="eyebrow">{t(locale, "details")}</span>
      <h3>{text(locale, structure.name)}</h3>
      <div className="tags">
        <span className="tag">{t(locale, structure.side)}</span>
        <span className="tag">
          {t(locale, structure.layer === "deep" ? "deep" : "superficial")}
        </span>
        <span className="tag">{structure.id}</span>
      </div>
      <button className="primary wide" onClick={onRecord}>
        {t(locale, "newRecord")}
      </button>
    </article>
  );
}
function PointDetails({
  point,
  acupuncture,
  locale,
}: {
  point: Point;
  acupuncture: Acupuncture;
  locale: Locale;
}) {
  return (
    <article className="detail-card">
      <span className="badge">{t(locale, "unreviewed")}</span>
      <h3>
        {point.code} · {text(locale, point.name)}
      </h3>
      <p>
        {text(locale, point.region)} · {t(locale, point.side)}
      </p>
      <h4>{t(locale, "landmark")}</h4>
      <p>{text(locale, point.landmark)}</p>
      {point.sourcePages?.length ? (
        <p className="hint">
          {t(locale, "pages")} {point.sourcePages.join(", ")}
        </p>
      ) : null}
      <Sources
        locale={locale}
        sources={acupuncture.sources
          .filter((s) => point.sourceIds.includes(s.id))
          .map((s) => ({
            title: sourceLabel(locale, s.id, s.title),
            url: s.url,
          }))}
      />
    </article>
  );
}
