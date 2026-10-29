import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Acupuncture,
  Catalog,
  Group,
  Learning,
  LearningEntry,
  LearningCategory,
  Locale,
  Point,
  Structure,
  User,
} from "./types";
import { errorText, initialLocale, sourceLabel, t, text } from "./i18n";
import type { MessageKey } from "./i18n";
import { learningIds, planResources, presetLayers } from "./planner";
import {
  entryCategory,
  entryPoints,
  filterEntries,
  relatedEntries,
} from "./relations";
import { request } from "./api";
import { useResources } from "./resources";
import { Scene } from "./Scene";
import type { View } from "./Scene";
import { Records } from "./Records";
import { LearningNotice } from "./LearningNotice";
import { RelatedLearning } from "./RelatedLearning";
type Tab = "atlas" | "learning" | "records";
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
  const panelContent = useRef<HTMLDivElement>(null);
  const selectionDetails = useRef<HTMLElement>(null);
  const [selectionTick, setSelectionTick] = useState(0);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [superficial, setSuperficial] = useState(true);
  const [deep, setDeep] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group>();
  const [selectionKind, setSelectionKind] = useState<
    "group" | "structure" | "point"
  >("structure");
  const [selectedId, setSelectedId] = useState<string>();
  const [entry, setEntry] = useState<LearningEntry>();
  const [learningKind, setLearningKind] = useState<"exercise" | "condition">(
    "exercise",
  );
  const [structureKind, setStructureKind] = useState<"muscle" | "tendon">(
    "muscle",
  );
  const [preset, setPreset] = useState<"muscles" | "acupuncture" | "overlay">(
    "muscles",
  );
  const [category, setCategory] = useState<LearningCategory | "all">("all");
  const [showSkin, setShowSkin] = useState(false);
  const [skinOpacity, setSkinOpacity] = useState(0.3);
  const [showPoints, setShowPoints] = useState(false);
  const [showMeridians, setShowMeridians] = useState(false);
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

  useEffect(() => {
    if (!panel || tab !== "atlas") return;
    if (panelContent.current) panelContent.current.scrollTop = 0;
    selectionDetails.current?.focus({ preventScroll: true });
  }, [panel, tab, selectedId, selectedGroup, pointId, selectionTick]);

  const highlighted = useMemo(
    () =>
      entry && tab === "learning" ? learningIds(catalog, learning, entry) : [],
    [entry, tab, catalog, learning],
  );
  const ids = useMemo(
    () =>
      planResources(catalog, {
        mode: "muscles",
        region,
        superficial,
        deep,
        structureIds: selectedGroup?.structureIds,
        selectedId,
        learningEntry: tab === "learning" ? entry : undefined,
        learning,
      }),
    [
      catalog,
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
  const resources = useResources(catalog, ids, showSkin, retry);
  const selected = selectedId ? catalog.structures[selectedId] : undefined;
  const normalized = search.trim().toLocaleLowerCase();
  const match = (name: { zh: string; en: string }, id = "") =>
    `${name.zh} ${name.en} ${id}`.toLocaleLowerCase().includes(normalized);
  const point = acupuncture.points.find((p) => p.id === pointId);
  const points = useMemo(
    () =>
      acupuncture.points.filter(
        (p) =>
          (normalized || meridianId === "all" || p.meridianId === meridianId) &&
          (tab !== "atlas" ||
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
      const first = learning.entries.find((e) => e.kind === learningKind);
      if (first) chooseEntry(first);
    }
  }
  function chooseGroup(group: Group) {
    setSelectionTick((value) => value + 1);
    setSelectionKind("group");
    setPointId(undefined);
    setSelectedGroup(group);
    setStructureKind(
      catalog.tendons.some((item) => item.id === group.id)
        ? "tendon"
        : "muscle",
    );
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
    setSelectionTick((value) => value + 1);
    setSelectionKind("structure");
    setPointId(undefined);
    setSelectedGroup(
      catalog.groups
        .concat(catalog.tendons)
        .find((group) => group.structureIds.includes(id)),
    );
    setSelectedId(id);
    setRegion(structure.region);
    if (structure.layer === "deep") {
      setDeep(true);
    } else setSuperficial(true);
  }
  function choosePoint(id: string) {
    const nextPoint = acupuncture.points.find((item) => item.id === id);
    if (!nextPoint) return;
    setSelectionTick((value) => value + 1);
    setSelectionKind("point");
    setPointId(id);
    setSelectedId(undefined);
    setSelectedGroup(undefined);
    setShowPoints(true);
    setMeridianId("all");
  }
  function chooseEntry(item: LearningEntry) {
    setEntry(item);
    setLearningKind(item.kind);
    setCategory(entryCategory(item));
    setSearch("");
    setMeridianId("all");
    const structures = learningIds(catalog, learning, item).map(
      (id) => catalog.structures[id],
    );
    if (structures.some((structure) => structure.layer === "superficial"))
      setSuperficial(true);
    if (structures.some((structure) => structure.layer === "deep"))
      setDeep(true);
    if (item.acupointCodes?.length) setShowPoints(true);
    setTab("learning");
    setPanel(true);
  }
  function applyPreset(next: typeof preset) {
    const selectionIds =
      tab === "learning" && entry
        ? learningIds(catalog, learning, entry)
        : (selectedGroup?.structureIds ?? (selectedId ? [selectedId] : []));
    const layers = presetLayers(
      next,
      selectionIds.map((id) => catalog.structures[id]).filter(Boolean),
    );
    setPreset(next);
    setSuperficial(layers.superficial);
    setDeep(layers.deep);
    setShowSkin(layers.showSkin);
    setSkinOpacity(layers.skinOpacity);
    setShowPoints(layers.showPoints);
    setShowMeridians(layers.showMeridians);
  }
  const related = relatedEntries(
    learning,
    point
      ? { pointCode: point.code }
      : {
          structureIds:
            selectionKind === "group"
              ? selectedGroup?.structureIds
              : selectedId
                ? [selectedId]
                : [],
        },
  );
  const relatedPoints = entry ? entryPoints(entry, acupuncture.points) : [];
  const scenePoints =
    tab === "learning" && relatedPoints.length ? acupuncture.points : points;
  function backToAtlas() {
    setSelectionTick((value) => value + 1);
    setTab("atlas");
    setSearch("");
    setMeridianId("all");
    setPanel(true);
  }

  const categoryOptions: (LearningCategory | "all")[] = [
    "all",
    ...(learningKind === "exercise"
      ? (["fitness", "stretching"] as const)
      : (["western", "tcm"] as const)),
  ];
  const visibleGroups = (
    normalized
      ? catalog.groups.concat(catalog.tendons)
      : structureKind === "muscle"
        ? catalog.groups
        : catalog.tendons
  ).filter(
    (g) =>
      (normalized || region === "all" || !g.region || g.region === region) &&
      match(g.name, g.id),
  );
  const visibleEntries = filterEntries(
    learning.entries,
    learningKind,
    category,
    search,
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
          <span className="eyebrow">{t(locale, "atlas")}</span>
          <p>{t(locale, "subtitle")}</p>
        </div>
        <Scene
          catalog={catalog}
          resources={resources}
          acupuncture={acupuncture}
          showSkin={showSkin}
          skinOpacity={skinOpacity}
          highlightedPointIds={
            tab === "learning" ? relatedPoints.map((item) => item.id) : []
          }
          showPoints={showPoints}
          showMeridians={showMeridians}
          points={scenePoints}
          meridianId={meridianId}
          selectedId={selectedId}
          selectedPointId={pointId}
          highlighted={highlighted}
          onStructure={(id) => {
            chooseStructure(id);
            backToAtlas();
          }}
          onPoint={(id) => {
            choosePoint(id);
            backToAtlas();
          }}
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
        {(point || selected) && (
          <button className="selection-chip" onClick={backToAtlas}>
            <span className="selection-dot" />
            <span>
              {point
                ? `${point.code} · ${text(locale, point.name)}`
                : text(locale, selected!.name)}
            </span>
            <span>↗</span>
          </button>
        )}
      </section>
      <nav className="main-nav" aria-label={t(locale, "mode")}>
        {(["atlas", "learning", "records"] as Tab[]).map((value) => (
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
        ))}
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
          <div className="panel-content" ref={panelContent}>
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
            {tab === "atlas" && (point || selected || selectedGroup) && (
              <section
                ref={selectionDetails}
                tabIndex={-1}
                className="selected-details"
                aria-label={t(locale, "details")}
              >
                {point ? (
                  <PointDetails
                    point={point}
                    acupuncture={acupuncture}
                    locale={locale}
                  />
                ) : selected ? (
                  <StructureDetails
                    structure={selected}
                    locale={locale}
                    onRecord={() => {
                      setTab("records");
                      setSearch("");
                    }}
                  />
                ) : selectedGroup ? (
                  <article className="detail-card">
                    <span className="eyebrow">{t(locale, "details")}</span>
                    <h3>{text(locale, selectedGroup.name)}</h3>
                    {selectedGroup.missing && (
                      <p className="missing">
                        {text(locale, selectedGroup.missing)}
                      </p>
                    )}
                  </article>
                ) : null}
                <RelatedLearning
                  entries={related}
                  locale={locale}
                  onSelect={chooseEntry}
                />
              </section>
            )}
            {tab !== "records" && (
              <details
                className="layer-controls"
                open={tab === "atlas" ? true : undefined}
              >
                <summary>{t(locale, "layers")}</summary>
                <div className="segmented" aria-label={t(locale, "mode")}>
                  {(["muscles", "acupuncture", "overlay"] as const).map(
                    (value) => (
                      <button
                        key={value}
                        className={preset === value ? "active" : ""}
                        onClick={() => applyPreset(value)}
                      >
                        {t(locale, value)}
                      </button>
                    ),
                  )}
                </div>
                <div className="toggles">
                  <Toggle
                    checked={showSkin}
                    onChange={setShowSkin}
                    label={t(locale, "body")}
                  />
                  <Toggle
                    checked={superficial}
                    onChange={setSuperficial}
                    label={t(locale, "superficial")}
                  />
                  <Toggle
                    checked={deep}
                    disabled={
                      region === "all" && !(tab === "learning" && entry)
                    }
                    onChange={setDeep}
                    label={t(locale, "deep")}
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
                {showSkin && (
                  <label className="field opacity-field">
                    <span>
                      {t(locale, "skinOpacity")} ·{" "}
                      {Math.round(skinOpacity * 100)}%
                    </span>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={skinOpacity}
                      onChange={(event) =>
                        setSkinOpacity(Number(event.target.value))
                      }
                    />
                  </label>
                )}
              </details>
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
              </>
            )}
            {tab === "learning" && (
              <>
                <div className="segmented">
                  <button
                    className={learningKind === "exercise" ? "active" : ""}
                    onClick={() => {
                      setLearningKind("exercise");
                      setCategory("all");
                      setSearch("");
                      setEntry(undefined);
                    }}
                  >
                    {t(locale, "exercises")} (
                    {
                      learning.entries.filter(
                        (item) => item.kind === "exercise",
                      ).length
                    }
                    )
                  </button>
                  <button
                    className={learningKind === "condition" ? "active" : ""}
                    onClick={() => {
                      setLearningKind("condition");
                      setCategory("all");
                      setSearch("");
                      setEntry(undefined);
                    }}
                  >
                    {t(locale, "conditions")} (
                    {
                      learning.entries.filter(
                        (item) => item.kind === "condition",
                      ).length
                    }
                    )
                  </button>
                </div>
                <div
                  className="category-filters"
                  role="group"
                  aria-label={t(locale, "filter")}
                >
                  {categoryOptions.map((value) => (
                    <button
                      key={value}
                      className={category === value ? "active" : ""}
                      onClick={() => {
                        setCategory(value);
                        if (
                          entry &&
                          value !== "all" &&
                          entryCategory(entry) !== value
                        )
                          setEntry(undefined);
                      }}
                    >
                      {t(locale, value)} (
                      {
                        filterEntries(learning.entries, learningKind, value)
                          .length
                      }
                      )
                    </button>
                  ))}
                </div>
                <p className="hint">{t(locale, "learningHint")}</p>
                {(selected || selectedGroup || point) && (
                  <button className="text-button" onClick={backToAtlas}>
                    ← {t(locale, "backSelection")}
                  </button>
                )}
                {entry && (
                  <article className="detail-card learning-detail">
                    <span className="eyebrow">{t(locale, "selected")}</span>
                    <h3>{text(locale, entry.name)}</h3>
                    <p>{text(locale, entry.summary)}</p>
                    <h4>{t(locale, "affected")}</h4>
                    {!entry.groupIds.length && (
                      <p className="hint">{t(locale, "noRelations")}</p>
                    )}
                    <div className="tags">
                      {entry.groupIds
                        .map((id) => learning.groups.find((g) => g.id === id))
                        .filter(Boolean)
                        .map((group) => (
                          <button
                            className="tag"
                            key={group!.id}
                            onClick={() => {
                              chooseGroup(group!);
                              backToAtlas();
                            }}
                          >
                            {text(locale, group!.name)}
                          </button>
                        ))}
                    </div>
                    <h4>{t(locale, "relatedPoints")}</h4>
                    <div className="tags">
                      {relatedPoints.map((item) => (
                        <button
                          className="tag"
                          key={item.id}
                          onClick={() => {
                            choosePoint(item.id);
                            backToAtlas();
                          }}
                        >
                          {item.code} · {text(locale, item.name)} ·{" "}
                          {t(locale, item.side)}
                        </button>
                      ))}
                    </div>
                    {!relatedPoints.length && (
                      <p className="hint">{t(locale, "noRelations")}</p>
                    )}
                    {entryCategory(entry) === "tcm" && (
                      <p className="notice">{t(locale, "traditionalNotice")}</p>
                    )}
                    <LearningNotice
                      catalog={catalog}
                      learning={learning}
                      entry={entry}
                      locale={locale}
                    />
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
                      onClick={() => chooseEntry(item)}
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
            {tab === "atlas" && (
              <>
                <p className="notice">{t(locale, "sourceNotice")}</p>
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
              {tab === "atlas" && (
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
