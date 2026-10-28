import { useEffect, useMemo, useState } from "react";
import type {
  Acupuncture,
  Catalog,
  Group,
  Learning,
  LearningEntry,
  Locale,
  Point,
  Structure,
  User,
} from "./types";
import { errorText, initialLocale, sourceLabel, t, text } from "./i18n";
import type { MessageKey } from "./i18n";
import { learningIds, planResources } from "./planner";
import { request } from "./api";
import { useResources } from "./resources";
import { Scene } from "./Scene";
import type { View } from "./Scene";
import { Records } from "./Records";
import { LearningNotice } from "./LearningNotice";
type Tab = "atlas" | "learning" | "records" | "acupuncture";
const emptyAcupuncture: Acupuncture = {
  reviewStatus: "",
  sources: [],
  meridians: [],
  points: [],
};
const icons: Record<Tab, string> = {
  atlas: "◉",
  learning: "◇",
  records: "▤",
  acupuncture: "✧",
};
export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [catalog, setCatalog] = useState<Catalog>();
  const [learning, setLearning] = useState<Learning>();
  const [acupuncture, setAcupuncture] = useState<Acupuncture>(emptyAcupuncture);
  const [loadError, setLoadError] = useState(false);
  const [loadTick, setLoadTick] = useState(0);
  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = t(locale, "brand");
    try {
      localStorage.setItem("anatomy-motion-locale", locale);
    } catch {
      /* Storage may be disabled. */
    }
  }, [locale]);
  useEffect(() => {
    const abort = new AbortController();
    setLoadError(false);
    void Promise.all([
      request<Catalog>("/models/web/catalog.json", { signal: abort.signal }),
      request<Learning>("/models/learning.json", { signal: abort.signal }),
      request<Acupuncture>("/models/acupuncture.json", {
        signal: abort.signal,
      }),
    ])
      .then(([c, l, a]) => {
        setCatalog(c);
        setLearning(l);
        setAcupuncture(a);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(true);
      });
    return () => abort.abort();
  }, [loadTick]);
  if (!catalog || !learning)
    return (
      <main className="boot">
        <span className="brand-icon">A</span>
        <h1>{t(locale, "brand")}</h1>
        <p role="status">{t(locale, loadError ? "loadError" : "loading")}</p>
        {loadError && (
          <button onClick={() => setLoadTick((x) => x + 1)}>
            {t(locale, "retry")}
          </button>
        )}
        <button
          className="text-button"
          onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
        >
          {locale === "zh" ? "English" : "中文"}
        </button>
      </main>
    );
  return (
    <Atlas
      catalog={catalog}
      learning={learning}
      acupuncture={acupuncture}
      locale={locale}
      setLocale={setLocale}
    />
  );
}
function Atlas({
  catalog,
  learning,
  acupuncture,
  locale,
  setLocale,
}: {
  catalog: Catalog;
  learning: Learning;
  acupuncture: Acupuncture;
  locale: Locale;
  setLocale: (value: Locale) => void;
}) {
  const [tab, setTab] = useState<Tab>("atlas");
  const [panel, setPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [superficial, setSuperficial] = useState(true);
  const [deep, setDeep] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group>();
  const [selectedId, setSelectedId] = useState<string>();
  const [entry, setEntry] = useState<LearningEntry>();
  const [learningKind, setLearningKind] = useState<"exercise" | "condition">(
    "exercise",
  );
  const [structureKind, setStructureKind] = useState<"muscle" | "tendon">(
    "muscle",
  );
  const [showSkin, setShowSkin] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showMeridians, setShowMeridians] = useState(true);
  const [meridianId, setMeridianId] = useState("all");
  const [pointId, setPointId] = useState<string>();
  const [view, setView] = useState<View>("front");
  const [viewTick, setViewTick] = useState(0);
  const [retry, setRetry] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    void request<{ user: User }>("/api/auth/me", { signal: abort.signal })
      .then((data) => setUser(data.user))
      .catch(() => {});
    return () => abort.abort();
  }, []);
  const acuMode = tab === "acupuncture";
  const highlighted = useMemo(
    () =>
      entry && tab === "learning" ? learningIds(catalog, learning, entry) : [],
    [entry, tab, catalog, learning],
  );
  const ids = useMemo(
    () =>
      planResources(catalog, {
        mode: acuMode ? "acupuncture" : "muscles",
        region,
        superficial,
        deep,
        groupIds: selectedGroup ? [selectedGroup.id] : undefined,
        selectedId,
        learningEntry: tab === "learning" ? entry : undefined,
        learning,
      }),
    [
      catalog,
      acuMode,
      region,
      superficial,
      deep,
      selectedGroup,
      selectedId,
      entry,
      tab,
      learning,
    ],
  );
  const resources = useResources(catalog, ids, acuMode && showSkin, retry);
  const selected = selectedId ? catalog.structures[selectedId] : undefined;
  const normalized = search.trim().toLocaleLowerCase();
  const match = (name: { zh: string; en: string }, id = "") =>
    `${name.zh} ${name.en} ${id}`.toLocaleLowerCase().includes(normalized);
  const point = acupuncture.points.find((p) => p.id === pointId);
  const points = useMemo(
    () =>
      acupuncture.points.filter(
        (p) =>
          (meridianId === "all" || p.meridianId === meridianId) &&
          (tab !== "acupuncture" ||
            `${p.name.zh} ${p.name.en} ${p.code}`
              .toLocaleLowerCase()
              .includes(normalized)),
      ),
    [acupuncture, meridianId, normalized, tab],
  );
  function selectTab(next: Tab) {
    setPanel(tab === next ? !panel : true);
    setTab(next);
    setSearch("");
    if (next === "learning" && !entry) {
      setEntry(learning.entries.find((e) => e.kind === learningKind));
      setSelectedId(undefined);
    }
  }
  function chooseGroup(group: Group) {
    setSelectedGroup(group);
    const structure = catalog.structures[group.structureIds[0]];
    setSelectedId(structure?.id);
    const selectedRegion = group.region ?? structure?.region;
    if (selectedRegion) setRegion(selectedRegion);
    if (group.layer === "deep" || structure?.layer === "deep") setDeep(true);
    else setSuperficial(true);
  }
  function chooseStructure(id: string) {
    const structure = catalog.structures[id];
    if (!structure) return;
    setSelectedId(id);
    if (structure.layer === "deep") {
      setRegion(structure.region);
      setDeep(true);
    }
  }
  function choosePoint(id: string) {
    setPointId(id);
  }
  const visibleGroups = (
    structureKind === "muscle" ? catalog.groups : catalog.tendons
  ).filter(
    (g) =>
      (region === "all" || !g.region || g.region === region) && match(g.name),
  );
  const visibleEntries = learning.entries.filter(
    (e) => e.kind === learningKind && match(e.name),
  );
  return (
    <main className={`app ${panel ? "panel-open" : ""}`}>
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">A</span>
          <div>
            <h1>{t(locale, "brand")}</h1>
            <span className="brand-caption">{t(locale, "explore")}</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            className="language"
            title={t(locale, "language")}
            onClick={() => setLocale(locale === "zh" ? "en" : "zh")}
          >
            {locale === "zh" ? "EN" : "中"}
          </button>
          <button
            className="panel-toggle"
            aria-expanded={panel}
            aria-label={t(locale, panel ? "closePanel" : "openPanel")}
            onClick={() => setPanel(!panel)}
          >
            {panel ? "×" : "☰"}
          </button>
        </div>
      </header>
      <section className="stage" aria-label={t(locale, "explore")}>
        <div className="stage-heading">
          <span className="eyebrow">
            {t(locale, acuMode ? "acupuncture" : "atlas")}
          </span>
          <p>{t(locale, "subtitle")}</p>
        </div>
        <Scene
          catalog={catalog}
          resources={resources}
          acupuncture={acupuncture}
          acuMode={acuMode}
          showSkin={showSkin}
          showPoints={showPoints}
          showMeridians={showMeridians}
          points={points}
          meridianId={meridianId}
          selectedId={selectedId}
          selectedPointId={pointId}
          highlighted={highlighted}
          onStructure={chooseStructure}
          onPoint={choosePoint}
          view={view}
          viewTick={viewTick}
          locale={locale}
        />
        <div
          className="view-controls"
          role="group"
          aria-label={t(locale, "fit")}
        >
          {(["front", "back", "leftView", "rightView", "fit"] as View[]).map(
            (value) => (
              <button
                key={value}
                className={view === value ? "active" : ""}
                onClick={() => {
                  setView(value);
                  setViewTick((x) => x + 1);
                }}
              >
                {t(locale, value)}
              </button>
            ),
          )}
        </div>
        {resources.loading > 0 && (
          <div className="load-status" role="status">
            <span className="spinner" />
            {t(locale, resources.body ? "loadingStructures" : "loading")}
            {resources.body && ` · ${resources.loading}`}
          </div>
        )}
        {resources.errors > 0 && (
          <div className="load-error" role="alert">
            {t(locale, "loadError")}{" "}
            <button onClick={() => setRetry((x) => x + 1)}>
              {t(locale, "retry")}
            </button>
          </div>
        )}
        {(acuMode ? point : selected) && (
          <button className="selection-chip" onClick={() => setPanel(true)}>
            <span className="selection-dot" />
            <span>
              {acuMode
                ? `${point!.code} · ${text(locale, point!.name)}`
                : text(locale, selected!.name)}
            </span>
            <span>↗</span>
          </button>
        )}
      </section>
      <nav className="main-nav" aria-label={t(locale, "mode")}>
        {(["atlas", "learning", "records", "acupuncture"] as Tab[]).map(
          (value) => (
            <button
              key={value}
              aria-current={tab === value ? "page" : undefined}
              className={tab === value ? "active" : ""}
              onClick={() => selectTab(value)}
            >
              <span className="nav-icon" aria-hidden="true">
                {icons[value]}
              </span>
              <span>{t(locale, value)}</span>
            </button>
          ),
        )}
      </nav>
      {panel && (
        <aside className="panel" aria-label={t(locale, tab)}>
          <div className="panel-heading">
            <h2>{t(locale, tab)}</h2>
            <button
              aria-label={t(locale, "closePanel")}
              className="icon-button"
              onClick={() => setPanel(false)}
            >
              ×
            </button>
          </div>
          <div className="panel-content">
            {tab !== "records" && (
              <label className="search">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder={t(locale, "search")}
                  aria-label={t(locale, "search")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            )}
            {tab === "atlas" && (
              <>
                <div className="segmented">
                  <button
                    className={structureKind === "muscle" ? "active" : ""}
                    onClick={() => {
                      setStructureKind("muscle");
                      setSelectedGroup(undefined);
                    }}
                  >
                    {t(locale, "groups")}
                  </button>
                  <button
                    className={structureKind === "tendon" ? "active" : ""}
                    onClick={() => {
                      setStructureKind("tendon");
                      setSelectedGroup(undefined);
                    }}
                  >
                    {t(locale, "tendons")}
                  </button>
                </div>
                <label className="field">
                  <span>{t(locale, "region")}</span>
                  <select
                    value={region}
                    onChange={(event) => {
                      setRegion(event.target.value);
                      setSelectedGroup(undefined);
                      setSelectedId(undefined);
                    }}
                  >
                    <option value="all">{t(locale, "all")}</option>
                    {catalog.regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {text(locale, r.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="toggles">
                  <Toggle
                    checked={superficial}
                    onChange={(value) => {
                      setSuperficial(value);
                      setSelectedId(undefined);
                    }}
                    label={t(locale, "superficial")}
                  />
                  <Toggle
                    checked={deep}
                    disabled={region === "all"}
                    onChange={(value) => {
                      setDeep(value);
                      setSelectedId(undefined);
                    }}
                    label={t(locale, "deep")}
                  />
                </div>
                {region === "all" && (
                  <p className="hint">{t(locale, "deepHint")}</p>
                )}
                <div className="item-list">
                  {visibleGroups.map((group) => (
                    <div key={group.id}>
                      <button
                        className={`list-item ${selectedGroup?.id === group.id ? "selected" : ""}`}
                        onClick={() => chooseGroup(group)}
                      >
                        <span>{text(locale, group.name)}</span>
                        <span className="count">
                          {group.structureIds.length || "—"}
                        </span>
                      </button>
                      {group.missing && (
                        <p className="missing">{text(locale, group.missing)}</p>
                      )}
                      {selectedGroup?.id === group.id &&
                        group.structureIds
                          .map((id) => catalog.structures[id])
                          .filter(Boolean)
                          .map((s) => (
                            <button
                              key={s.id}
                              className={`structure-item ${selectedId === s.id ? "selected" : ""}`}
                              onClick={() => chooseStructure(s.id)}
                            >
                              <span>{text(locale, s.name)}</span>
                              <span className="tag">{t(locale, s.side)}</span>
                            </button>
                          ))}
                    </div>
                  ))}
                  {!visibleGroups.length && (
                    <p className="empty">{t(locale, "noResults")}</p>
                  )}
                </div>
                {selected && (
                  <StructureDetails
                    structure={selected}
                    locale={locale}
                    onRecord={() => {
                      setTab("records");
                      setSearch("");
                    }}
                  />
                )}
              </>
            )}
            {tab === "learning" && (
              <>
                <div className="segmented">
                  <button
                    className={learningKind === "exercise" ? "active" : ""}
                    onClick={() => setLearningKind("exercise")}
                  >
                    {t(locale, "exercises")}
                  </button>
                  <button
                    className={learningKind === "condition" ? "active" : ""}
                    onClick={() => setLearningKind("condition")}
                  >
                    {t(locale, "conditions")}
                  </button>
                </div>
                <p className="hint">{t(locale, "learningHint")}</p>
                {entry && (
                  <article className="detail-card learning-detail">
                    <span className="eyebrow">{t(locale, "selected")}</span>
                    <h3>{text(locale, entry.name)}</h3>
                    <p>{text(locale, entry.summary)}</p>
                    <h4>{t(locale, "affected")}</h4>
                    <div className="tags">
                      {entry.groupIds
                        .map((id) => learning.groups.find((g) => g.id === id))
                        .filter(Boolean)
                        .map((group) => (
                          <span className="tag" key={group!.id}>
                            {text(locale, group!.name)}
                          </span>
                        ))}
                    </div>
                    <LearningNotice
                      catalog={catalog}
                      learning={learning}
                      entry={entry}
                      locale={locale}
                    />
                    {!highlighted.length && (
                      <p className="missing">{t(locale, "noGeometry")}</p>
                    )}
                    <Sources
                      locale={locale}
                      sources={entry.sources.map((s) => ({
                        title: s.label ? text(locale, s.label) : s.title,
                        url: s.url,
                      }))}
                    />
                  </article>
                )}
                <div className="item-list">
                  {visibleEntries.map((item) => (
                    <button
                      key={item.id}
                      className={`list-item ${entry?.id === item.id ? "selected" : ""}`}
                      onClick={() => {
                        setEntry(item);
                        setSelectedId(undefined);
                      }}
                    >
                      <span>{text(locale, item.name)}</span>
                      <span>↗</span>
                    </button>
                  ))}
                  {!visibleEntries.length && (
                    <p className="empty">{t(locale, "noResults")}</p>
                  )}
                </div>
              </>
            )}
            {tab === "acupuncture" && (
              <>
                <p className="notice">{t(locale, "sourceNotice")}</p>
                <div className="toggles">
                  <Toggle
                    checked={showSkin}
                    onChange={setShowSkin}
                    label={t(locale, "body")}
                  />
                  <Toggle
                    checked={showPoints}
                    onChange={setShowPoints}
                    label={t(locale, "points")}
                  />
                  <Toggle
                    checked={showMeridians}
                    onChange={setShowMeridians}
                    label={t(locale, "meridians")}
                  />
                </div>
                <label className="field">
                  <span>{t(locale, "meridian")}</span>
                  <select
                    value={meridianId}
                    onChange={(event) => setMeridianId(event.target.value)}
                  >
                    <option value="all">{t(locale, "all")}</option>
                    {acupuncture.meridians.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id} · {text(locale, m.name)}
                      </option>
                    ))}
                  </select>
                </label>
                {point && (
                  <PointDetails
                    point={point}
                    acupuncture={acupuncture}
                    locale={locale}
                  />
                )}
                <p className="hint">
                  {points.length} {t(locale, "pointsCount")}
                </p>
                <div className="item-list">
                  {points.map((p) => (
                    <button
                      key={p.id}
                      className={`list-item ${pointId === p.id ? "selected" : ""}`}
                      onClick={() => choosePoint(p.id)}
                    >
                      <span>
                        <b className="point-code">{p.code}</b>{" "}
                        {text(locale, p.name)}
                      </span>
                      <span className="tag">{t(locale, p.side)}</span>
                    </button>
                  ))}
                  {!points.length && (
                    <p className="empty">{t(locale, "noResults")}</p>
                  )}
                </div>
              </>
            )}
            {tab === "records" && (
              <Records
                catalog={catalog}
                locale={locale}
                user={user}
                setUser={setUser}
                selected={selected}
                onSelect={(id) => {
                  if (catalog.structures[id]) chooseStructure(id);
                }}
              />
            )}
            <footer className="attribution">
              <a
                href="https://lifesciencedb.jp/bp3d/"
                target="_blank"
                rel="noreferrer"
              >
                {t(locale, "sourceModel")}
              </a>
              <p>{t(locale, "modelUnreviewed")}</p>
              {tab === "acupuncture" && (
                <Sources
                  locale={locale}
                  sources={acupuncture.sources.map((s) => ({
                    title: sourceLabel(locale, s.id, s.title),
                    url: s.url,
                  }))}
                />
              )}
            </footer>
          </div>
        </aside>
      )}
    </main>
  );
}
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`toggle ${disabled ? "disabled" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
function Sources({
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
