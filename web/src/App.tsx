import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type {
  Acupuncture,
  Catalog,
  Group,
  Learning,
  LearningEntry,
  LearningCategory,
  Locale,
  User,
} from "./types";
import { initialLocale, t, text } from "./i18n";
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
import { AtlasSelectionDetails, Sources } from "./AnatomyDetails";
import { DirectoryTabs } from "./DirectoryTabs";
import { LayerControls } from "./LayerControls";
import type { DirectoryKind, SelectionAction } from "./atlas-state";
import {
  explorerReducer,
  initialExplorerState,
  selectionStructureIds,
  wholeBodyScope,
} from "./atlas-state";
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
  const [navigation, dispatchNavigation] = useReducer(
    explorerReducer,
    initialExplorerState,
  );
  const { tab, directory, selection } = navigation;
  const setTab = (tab: Tab) => dispatchNavigation({ type: "tab", tab });
  const setDirectory = (directory: DirectoryKind) =>
    dispatchNavigation({ type: "directory", directory });
  const dispatchSelection = (action: SelectionAction, openAtlas = false) =>
    dispatchNavigation({ type: "selection", action, openAtlas });
  const [panel, setPanel] = useState(false);
  const panelContent = useRef<HTMLDivElement>(null);
  const selectionDetails = useRef<HTMLElement>(null);
  const [selectionTick, setSelectionTick] = useState(0);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [superficial, setSuperficial] = useState(true);
  const [deep, setDeep] = useState(false);
  const selectedIds = selectionStructureIds(selection);
  const selectedId = selectedIds.find((id) => catalog.structures[id]);
  const selectedGroup =
    selection?.kind === "group" ? selection.group : undefined;
  const pointId = selection?.kind === "point" ? selection.id : undefined;
  const [entry, setEntry] = useState<LearningEntry>();
  const learningKind = directory === "condition" ? "condition" : "exercise";
  const activeEntry =
    tab === "learning" &&
    (directory === "exercise" || directory === "condition")
      ? entry
      : undefined;
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
    () => (activeEntry ? learningIds(catalog, learning, activeEntry) : []),
    [activeEntry, catalog, learning],
  );
  const ids = useMemo(
    () =>
      planResources(catalog, {
        mode: "muscles",
        region,
        superficial,
        deep,
        structureIds: selectionStructureIds(selection),
        selectedId,
        learningEntry: activeEntry,
        learning,
      }),
    [
      catalog,
      region,
      superficial,
      deep,
      selection,
      selectedId,
      activeEntry,
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
        (item) => meridianId === "all" || item.meridianId === meridianId,
      ),
    [acupuncture, meridianId],
  );
  const visiblePoints = acupuncture.points.filter(
    (item) =>
      (normalized || meridianId === "all" || item.meridianId === meridianId) &&
      match(item.name, item.code),
  );
  function selectTab(next: Tab) {
    setPanel(tab === next ? !panel : true);
    setTab(next);
    setSearch("");
  }
  function clearSelection() {
    dispatchSelection({ type: "clear" });
    setSelectionTick((value) => value + 1);
  }
  function restoreWholeBody() {
    clearSelection();
    setRegion(wholeBodyScope.region);
    setSuperficial(wholeBodyScope.superficial);
    setDeep(wholeBodyScope.deep);
    setView("fit");
    setViewTick((value) => value + 1);
    backToAtlas();
  }
  function chooseGroup(group: Group) {
    setSelectionTick((value) => value + 1);
    dispatchSelection({ type: "group", group }, true);
    const structures = group.structureIds
      .map((id) => catalog.structures[id])
      .filter(Boolean);
    if (structures.some((structure) => structure.layer === "deep"))
      setDeep(true);
    if (structures.some((structure) => structure.layer === "superficial"))
      setSuperficial(true);
  }
  function chooseStructure(id: string, toggle = false, openAtlas = false) {
    const structure = catalog.structures[id];
    if (!structure) return;
    setSelectionTick((value) => value + 1);
    dispatchSelection({ type: "structure", id, toggle }, openAtlas);
    if (toggle && selection?.kind === "structure" && selection.id === id)
      return;
    if (structure.layer === "deep") setDeep(true);
    else setSuperficial(true);
  }
  function choosePoint(id: string) {
    if (!acupuncture.points.some((item) => item.id === id)) return;
    setSelectionTick((value) => value + 1);
    dispatchSelection({ type: "point", id }, true);
    setShowPoints(true);
    setMeridianId("all");
  }
  function chooseEntry(item: LearningEntry) {
    setEntry(item);
    setDirectory(item.kind);
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
    const selectionIds = activeEntry
      ? learningIds(catalog, learning, activeEntry)
      : selectedIds;
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
          structureIds: selectedIds,
        },
  );
  const relatedPoints = activeEntry
    ? entryPoints(activeEntry, acupuncture.points)
    : [];
  const scenePoints =
    activeEntry && relatedPoints.length ? acupuncture.points : points;
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
        <div className="scene-viewport">
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
              chooseStructure(id, true, true);
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
                    if (value === "fit") restoreWholeBody();
                    else {
                      setView(value);
                      setViewTick((x) => x + 1);
                    }
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
        </div>
        <LayerControls
          locale={locale}
          preset={preset}
          layers={{
            skin: showSkin,
            superficial,
            deep,
            points: showPoints,
            meridians: showMeridians,
          }}
          skinOpacity={skinOpacity}
          onPreset={applyPreset}
          onLayer={(layer, value) =>
            ({
              skin: setShowSkin,
              superficial: setSuperficial,
              deep: setDeep,
              points: setShowPoints,
              meridians: setShowMeridians,
            })[layer](value)
          }
          onOpacity={setSkinOpacity}
        />
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
            {tab === "learning" && (
              <DirectoryTabs
                directory={directory}
                learning={learning}
                catalog={catalog}
                acupuncture={acupuncture}
                locale={locale}
                onChange={(value) => {
                  setDirectory(value);
                  setCategory("all");
                  setSearch("");
                  setEntry(undefined);
                }}
              />
            )}
            {tab === "learning" && (
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
              <section
                ref={selectionDetails}
                tabIndex={-1}
                className="selected-details"
                aria-label={t(locale, "details")}
              >
                <AtlasSelectionDetails
                  structure={selected}
                  group={selectedGroup}
                  groupStructures={selectedGroup?.structureIds
                    .map((id) => catalog.structures[id])
                    .filter(Boolean)}
                  point={point}
                  acupuncture={acupuncture}
                  locale={locale}
                  related={related}
                  onEntry={chooseEntry}
                  onStructure={(id) => {
                    chooseStructure(id, false, true);
                    backToAtlas();
                  }}
                  onRecord={() => {
                    setTab("records");
                    setSearch("");
                  }}
                  onClear={clearSelection}
                  onWholeBody={restoreWholeBody}
                />
              </section>
            )}
            {tab === "learning" && directory === "structures" && (
              <>
                <div className="segmented">
                  <button
                    className={structureKind === "muscle" ? "active" : ""}
                    onClick={() => {
                      setStructureKind("muscle");
                    }}
                  >
                    {t(locale, "groups")}
                  </button>
                  <button
                    className={structureKind === "tendon" ? "active" : ""}
                    onClick={() => {
                      setStructureKind("tendon");
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
                        onClick={() => {
                          chooseGroup(group);
                          backToAtlas();
                        }}
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
                              onClick={() => {
                                chooseStructure(s.id, false, true);
                                backToAtlas();
                              }}
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
            {tab === "learning" &&
              (directory === "exercise" || directory === "condition") && (
                <>
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
                        <p className="notice">
                          {t(locale, "traditionalNotice")}
                        </p>
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
            {tab === "learning" && directory === "points" && (
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
                  {visiblePoints.length} {t(locale, "pointsCount")}
                </p>
                <div className="item-list">
                  {visiblePoints.map((p) => (
                    <button
                      key={p.id}
                      className={`list-item ${pointId === p.id ? "selected" : ""}`}
                      onClick={() => {
                        choosePoint(p.id);
                        backToAtlas();
                      }}
                    >
                      <span>
                        <b className="point-code">{p.code}</b>{" "}
                        {text(locale, p.name)}
                      </span>
                      <span className="tag">{t(locale, p.side)}</span>
                    </button>
                  ))}
                  {!visiblePoints.length && (
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
                selected={
                  selection?.kind === "structure" ? selected : undefined
                }
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
            </footer>
          </div>
        </aside>
      )}
    </main>
  );
}
