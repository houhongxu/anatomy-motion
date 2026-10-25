import {
  _decorator,
  Component,
  Node,
  Camera,
  Color,
  Vec3,
  Vec4,
  Rect,
  DirectionalLight,
  MeshRenderer,
  Material,
  utils,
  geometry,
  game,
  view,
  ResolutionPolicy,
  director,
  screen,
  Size,
} from "cc";
import {
  rayTriangle,
  rayBounds,
  localDate,
  canRecord,
  fitPerspectiveBounds,
} from "./geometry";
import { renderingSize, sceneFrame, shouldPick } from "./layout";
import {
  t,
  getLocale,
  setLocale,
  localized,
  apiErrorMessage,
  type Localized,
} from "./i18n";
import {
  matchLearningEntry,
  type LearningData,
  type LearningEntry,
} from "./learning";
import {
  classifyMotionPart,
  motionForEntry,
  motionPose,
  advanceProgress,
  MOTION_BOUNDS,
  MOTION_FIT_BOUNDS,
  type MotionMode,
  type MotionPart,
} from "./motion";
const { ccclass, property } = _decorator;
type Structure = {
  id: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  kind: "muscle" | "tendon" | "bone";
  side: "left" | "right" | "midline";
  layer: "superficial" | "deep" | "support";
  file: string;
};
type MeshData = {
  positions: number[];
  normals: number[];
  indices: number[];
};
type Part = {
  info: Structure;
  data: MeshData;
  node: Node;
  renderer: MeshRenderer;
  min: number[];
  max: number[];
  center: Vec3;
  staticMaterial: Material;
  poseMaterial?: Material;
  motionPart: MotionPart;
};
type PainRecord = {
  id: string;
  date: string;
  structureId: string;
  side: string;
  intensity: number;
  note: string;
};
type User = {
  id: string;
  username: string;
};
const sideLabel = (side: string) => t(`side_${side}` as "side_left");
const kindLabel = (kind: string) => t(`kind_${kind}` as "kind_muscle");
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  e.textContent = text;
  return e;
}
function button(
  text: string,
  run: () => void,
  className = "",
): HTMLButtonElement {
  const b = el("button", className, text);
  b.type = "button";
  b.addEventListener("click", run);
  return b;
}
function field(label: string, input: HTMLElement): HTMLElement {
  const l = el("label", "field");
  l.append(el("span", "field-label", label), input);
  return l;
}
function input(type: string, value = "", testId = ""): HTMLInputElement {
  const e = el("input");
  e.type = type;
  e.value = value;
  if (testId) e.dataset.testid = testId;
  return e;
}
function displayError(error: unknown): string {
  return (error as any)?.localized
    ? (error as Error).message
    : t("requestFailed");
}
function title(s: Structure): string {
  return getLocale() === "zh"
    ? s.nameZh || s.nameEn || s.name
    : s.nameEn || s.name;
}
async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    const error = new Error(t("networkError"));
    (error as any).localized = true;
    throw error;
  });
  let data: any = {};
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) {
    const e = new Error(apiErrorMessage(data.error?.code || "", r.status));
    (e as any).status = r.status;
    (e as any).localized = true;
    throw e;
  }
  return data;
}
/** Cocos 负责三维场景；DOM 提供无障碍表单。 / Cocos renders the scene; DOM provides accessible forms. */
@ccclass("AtlasBootstrap")
export class AtlasBootstrap extends Component {
  @property(Material)
  tissueMaterial: Material | null = null;
  @property(Material)
  poseMaterial: Material | null = null;
  private motionMode: MotionMode | null = null;
  private motionProgress = 0;
  private motionPlaying = false;
  private motionActive = false;
  private motionControls!: HTMLElement;
  private motionPlayButton!: HTMLButtonElement;
  private motionRange!: HTMLInputElement;
  private motionValue!: HTMLElement;
  private readonly poseAngles = new Vec4();
  private readonly poseJoints = new Vec4();
  private readonly poseState = new Vec4();
  private camera!: Camera;
  private keyLight!: Node;
  private renderAspect = 1;
  private parts: Part[] = [];
  private selected: Part | null = null;
  private learning: LearningData | null = null;
  private learningFailed = false;
  private modelsReady = false;
  private modelTotal = 0;
  private explorerTab: "structures" | "exercise" | "condition" = "structures";
  private activeLearning: LearningEntry | null = null;
  private highlightedIds = new Set<string>();
  private isolateGroupIds: Set<string> | null = null;
  private learningDetail!: HTMLElement;
  private groupActions!: HTMLElement;
  private authRegister = false;
  private syncViewport: () => void = () => {};

  private hidden = new Set<string>();
  private isolated: string | null = null;
  private enabledLayers = new Set(["superficial", "deep", "tendon", "bone"]);
  private target = new Vec3(0, 0, 0);
  private yaw = 0;
  private pitch = 0.04;
  private distance = 2.65;
  private overlay!: HTMLElement;
  private mobilePane: "model" | "structures" | "journal" = "model";
  private list!: HTMLElement;
  private detail!: HTMLElement;
  private history!: HTMLElement;
  private status!: HTMLElement;
  private toast!: HTMLElement;
  private authButton!: HTMLButtonElement;
  private selectionChip!: HTMLElement;
  private count!: HTMLElement;
  private search = "";
  private user: User | null = null;
  private records: PainRecord[] = [];
  private todayRecords: PainRecord[] = [];
  private editing: string | null = null;
  private dateInput!: HTMLInputElement;
  private painInput!: HTMLInputElement;
  private painLabel!: HTMLElement;
  private noteInput!: HTMLTextAreaElement;
  private formMessage!: HTMLElement;
  private saveButton!: HTMLButtonElement;
  private from = localDate(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  private to = localDate();
  private cleanup: (() => void)[] = [];
  private loadErrors = 0;
  private historyRequest = 0;
  private toastTimer = 0;
  start() {
    this.setupScene();
    this.buildUI();
    this.bindControls();
    this.load();
    this.loadLearning();
    this.loadUser();
  }
  private setupScene() {
    // 先清理整个交换链，避免场景视口外保留默认黑色。 / Clear the entire swapchain before the inset scene viewport.
    const backgroundNode = new Node("Atlas Background Camera");
    this.node.addChild(backgroundNode);
    const background = backgroundNode.addComponent(Camera);
    background.priority = -100;
    background.visibility = 0;
    background.rect = new Rect(0, 0, 1, 1);
    background.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    background.clearColor = new Color(245, 247, 250, 255);
    const c = new Node("Atlas Camera");
    this.node.addChild(c);
    this.camera = c.addComponent(Camera);
    this.camera.near = 0.01;
    this.camera.far = 30;
    this.camera.priority = 0;
    this.camera.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    this.camera.fov = 39;
    this.camera.fovAxis = Camera.FOVAxis.VERTICAL;
    this.camera.clearColor = new Color(245, 247, 250, 255);
    const main = new Node("Clinical Key Light");
    this.keyLight = main;
    this.node.addChild(main);
    main.setRotationFromEuler(-28, -35, 0);
    const light = main.addComponent(DirectionalLight);
    light.color = new Color(255, 244, 234);
    light.illuminance = 105000;
    const fill = new Node("Soft Fill Light");
    this.node.addChild(fill);
    fill.setRotationFromEuler(-15, 145, 0);
    const f = fill.addComponent(DirectionalLight);
    f.color = new Color(227, 235, 244);
    f.illuminance = 23000;
    const globals = this.node.scene?.globals;
    if (globals) {
      globals.ambient.skyIllum = 48000;
      globals.ambient.skyColor = new Vec4(0.76, 0.81, 0.88, 1);
      globals.ambient.groundAlbedo = new Vec4(0.48, 0.51, 0.56, 1);
    }
    this.updateCamera();
  }
  private buildUI() {
    document.title = t("pageTitle");
    document.documentElement.lang = getLocale() === "zh" ? "zh-CN" : "en";
    for (const meta of document.querySelectorAll(
      'meta[name="screen-orientation"],meta[name="x5-orientation"]',
    ))
      meta.remove();
    const viewportMeta = document.querySelector<HTMLMetaElement>(
      'meta[name="viewport"]',
    );
    if (viewportMeta)
      viewportMeta.content =
        "width=device-width, initial-scale=1, viewport-fit=cover";
    const style = el("style");
    style.textContent = STYLE;
    document.head.append(style);
    this.cleanup.push(() => style.remove());
    this.overlay = el("div", "atlas-app");
    this.overlay.dataset.testid = "atlas-app";
    this.overlay.dataset.mobilePane = "model";
    document.body.append(this.overlay);
    const header = el("header", "atlas-header"),
      brand = el("div", "brand");
    brand.append(
      el("span", "brand-mark", "A"),
      el("div", "", "ANATOMY / MOTION"),
    );
    brand.lastElementChild?.append(el("small", "", t("brandSub")));
    const nav = el("div", "header-nav");
    nav.append(
      el("span", "nav-active", t("atlas")),
      el("span", "nav-muted", t("roadmap")),
    );
    this.authButton = button(
      t("signIn"),
      () => (this.user ? this.logout() : this.openAuth()),
      "auth-button",
    );
    this.authButton.dataset.testid = "auth-button";
    const headerActions = el("div", "header-actions");
    const language = button(
      getLocale() === "zh" ? "English" : "中文",
      () => this.changeLocale(),
      "language-button",
    );
    language.dataset.testid = "locale-switch";
    language.setAttribute("aria-label", t("languageLabel"));
    headerActions.append(language, this.authButton);
    if (this.user)
      this.authButton.textContent = t("signOutUser", {
        username: this.user.username,
      });
    header.append(brand, nav, headerActions);
    const left = el("aside", "panel anatomy-panel");
    left.append(
      el("div", "eyebrow", t("exploreEyebrow")),
      el("h1", "", t("structures")),
      el("p", "subheading", t("anatomicalExplorer")),
    );
    const libraryTabs = el("div", "explorer-tabs");
    libraryTabs.setAttribute("role", "tablist");
    libraryTabs.setAttribute("aria-label", t("explorerTabs"));
    for (const [tab, label] of [
      ["structures", t("tabStructures")],
      ["exercise", t("tabExercises")],
      ["condition", t("tabConditions")],
    ] as const) {
      const b = button(label, () => {
        this.explorerTab = tab;
        left.dataset.explorerTab = tab;
        for (const other of libraryTabs.querySelectorAll<HTMLButtonElement>(
          "button",
        ))
          other.setAttribute("aria-selected", String(other === b));
        this.renderList();
      });
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(tab === this.explorerTab));
      b.dataset.testid = `explorer-tab-${tab}`;
      libraryTabs.append(b);
    }
    left.dataset.explorerTab = this.explorerTab;
    left.append(libraryTabs);
    const search = input("search", this.search, "structure-search");
    search.placeholder = t("search");
    search.setAttribute("aria-label", t("searchLabel"));
    search.addEventListener("input", () => {
      this.search = search.value.toLowerCase();
      this.renderList();
    });
    left.append(search);
    const layerTitle = el("div", "section-title", t("tissues")),
      toggles = el("div", "toggles");
    for (const [key, label] of [
      ["superficial", t("surface")],
      ["deep", t("deep")],
      ["tendon", t("tendons")],
      ["bone", t("bones")],
    ]) {
      const row = el("label", "toggle");
      const check = input("checkbox");
      check.checked = true;
      check.dataset.layer = key;
      check.addEventListener("change", () => {
        check.checked
          ? this.enabledLayers.add(key)
          : this.enabledLayers.delete(key);
        this.applyVisibility();
      });
      row.append(check, el("span", "", label));
      toggles.append(row);
    }
    left.append(layerTitle, toggles);
    const disclaimer = el("p", "taxonomy-note", t("layerNotice"));
    left.append(disclaimer);
    this.learningDetail = el("section", "learning-detail");
    this.learningDetail.dataset.testid = "learning-detail";
    left.append(this.learningDetail);
    const listHead = el("div", "list-heading");
    this.count = el("span", "muted", "0");
    listHead.append(el("span", "", t("structureDirectory")), this.count);
    this.list = el("div", "structure-list");
    this.list.dataset.testid = "structure-list";
    left.append(listHead, this.list);
    const structuresSheetHeader = el("div", "sheet-header");
    const closeStructures = button(
      t("close"),
      () => this.setMobilePane("model"),
      "sheet-close",
    );
    closeStructures.dataset.testid = "close-structures-sheet";
    structuresSheetHeader.append(
      el("strong", "", t("explorer")),
      closeStructures,
    );
    left.prepend(structuresSheetHeader);
    left.dataset.testid = "structures-sheet";
    left.id = "structures-sheet";
    left.append(el("p", "model-credit", t("modelCredit")));
    const viewport = el("main", "viewport");
    viewport.setAttribute("aria-label", t("viewportLabel"));
    viewport.dataset.testid = "viewport";
    viewport.tabIndex = 0;
    viewport.id = "atlas-viewport";
    const viewportTop = el("div", "viewport-top");
    viewportTop.append(
      el("span", "live-dot", "●"),
      el("span", "", t("atlas3d")),
      el("span", "model-badge", "BODYPARTS3D"),
    );
    this.status = el("div", "load-status", t("loadingAnatomy"));
    this.status.setAttribute("role", "status");
    const controls = el("div", "view-controls");
    for (const [label, fn] of [
      [t("front"), () => this.preset(0)],
      [t("back"), () => this.preset(Math.PI)],
      [t("side"), () => this.preset(Math.PI / 2)],
      [t("fit"), () => this.fit()],
    ] as [string, () => void][]) {
      const b = button(label, fn);
      if (label !== t("fit")) {
        b.dataset.viewYaw = String(
          label === t("front")
            ? 0
            : label === t("back")
              ? Math.PI
              : Math.PI / 2,
        );
        b.setAttribute("aria-pressed", String(label === t("front")));
      }
      controls.append(b);
    }
    const gizmo = el("div", "orientation", "Y ↑\nZ ⊙  X →");
    this.selectionChip = el("div", "selection-chip", t("selectHint"));
    const instructions = el("div", "viewport-instructions", t("gestureHint"));
    this.groupActions = el("div", "group-actions");
    this.groupActions.append(
      button(t("entryDetails"), () => {
        if (this.activeLearning) {
          this.explorerTab = this.activeLearning.kind;
          this.setMobilePane("structures");
          this.overlay.querySelector<HTMLElement>(
            ".anatomy-panel",
          )!.dataset.explorerTab = this.explorerTab;
          for (const tab of this.overlay.querySelectorAll<HTMLButtonElement>(
            ".explorer-tabs button",
          ))
            tab.setAttribute(
              "aria-selected",
              String(tab.dataset.testid === `explorer-tab-${this.explorerTab}`),
            );
          this.renderList();
        }
      }),
      button(t("wholeBody"), () => this.resetVisibility()),
    );
    this.motionControls = el("section", "motion-controls");
    this.motionControls.dataset.testid = "motion-controls";
    viewport.append(
      this.motionControls,
      this.groupActions,
      viewportTop,
      this.status,
      controls,
      gizmo,
      this.selectionChip,
      instructions,
    );
    const right = el("aside", "panel record-panel");
    right.dataset.testid = "journal-sheet";
    right.id = "journal-sheet";
    const journalSheetHeader = el("div", "sheet-header");
    const closeJournal = button(
      t("close"),
      () => this.setMobilePane("model"),
      "sheet-close",
    );
    closeJournal.dataset.testid = "close-journal-sheet";
    journalSheetHeader.append(
      el("strong", "", t("journalTitle")),
      closeJournal,
    );
    right.append(journalSheetHeader);
    this.detail = el("section", "selection-detail");
    right.append(this.detail);
    const historyTitle = el("div", "history-heading");
    historyTitle.append(
      el("h2", "", t("myJournal")),
      el("span", "private-tag", t("private")),
    );
    right.append(historyTitle);
    const dateFilters = el("div", "date-filters");
    const from = input("date", this.from, "history-from"),
      to = input("date", this.to, "history-to");
    from.setAttribute("aria-label", t("from"));
    to.setAttribute("aria-label", t("to"));
    from.addEventListener("change", () => {
      this.from = from.value;
      this.loadRecords();
    });
    to.addEventListener("change", () => {
      this.to = to.value;
      this.loadRecords();
    });
    dateFilters.append(from, el("span", "", "—"), to);
    right.append(dateFilters);
    this.history = el("div", "history-list");
    this.history.dataset.testid = "history-list";
    right.append(this.history, el("p", "medical-note", t("medicalNotice")));
    const footer = el("footer", "atlas-footer");
    footer.append(
      el("span", "", t("footer")),
      el("span", "", t("sourceCredit")),
    );
    this.toast = el("div", "toast");
    this.toast.setAttribute("role", "status");
    const scrim = button("", () => this.setMobilePane("model"), "sheet-scrim");
    scrim.setAttribute("aria-label", t("closeSheet"));
    scrim.tabIndex = -1;
    const mobileNav = el("nav", "mobile-nav");
    mobileNav.setAttribute("aria-label", t("navLabel"));
    for (const [pane, label] of [
      ["model", t("model")],
      ["structures", t("explore")],
      ["journal", t("journal")],
    ] as const) {
      const item = button(
        "",
        () => {
          if (pane === "model" && this.motionActive) {
            this.restoreStaticMotion(false);
            this.fit();
          }
          this.setMobilePane(pane);
        },
        "mobile-nav-item",
      );
      item.dataset.testid = `mobile-nav-${pane}`;
      item.dataset.mobileTarget = pane;
      item.setAttribute(
        "aria-controls",
        pane === "model"
          ? "atlas-viewport"
          : `${pane === "journal" ? "journal" : "structures"}-sheet`,
      );
      item.setAttribute("aria-pressed", String(pane === "model"));
      item.append(el("strong", "", label));
      mobileNav.append(item);
    }
    this.overlay.append(
      header,
      scrim,
      left,
      viewport,
      right,
      footer,
      this.toast,
      mobileNav,
    );
    this.renderDetail();
    this.renderHistory();
    this.renderMotionControls();
  }
  update(dt: number) {
    if (!this.motionPlaying || !this.motionMode || !this.motionActive) return;
    this.motionProgress = advanceProgress(this.motionProgress, dt);
    this.updatePoseUniforms();
    this.updateMotionLabels();
  }
  private renderMotionControls() {
    if (!this.motionControls) return;
    this.motionControls.replaceChildren();
    this.motionControls.style.display = this.motionMode ? "block" : "none";
    const viewport = this.overlay.querySelector<HTMLElement>(".viewport");
    if (viewport) {
      viewport.dataset.motionActive = String(this.motionActive);
      viewport.setAttribute(
        "aria-label",
        t(this.motionActive ? "poseViewportLabel" : "viewportLabel"),
      );
    }
    if (!this.motionMode) return;
    const notice = el("p", "motion-notice", t("motionNoticeShort"));
    notice.title = t("motionDisclaimer");
    this.motionPlayButton = button(
      t(this.motionPlaying ? "motionPause" : "motionPlay"),
      () => {
        if (this.motionPlaying) {
          this.motionPlaying = false;
          this.updateMotionLabels();
          return;
        }
        if (this.activateMotion()) {
          this.motionPlaying = true;
          this.updateMotionLabels();
        }
      },
      "motion-play",
    );
    this.motionPlayButton.dataset.testid = "motion-play";
    this.motionRange = input(
      "range",
      String(this.motionProgress),
      "motion-progress",
    );
    this.motionRange.min = "0";
    this.motionRange.max = "1";
    this.motionRange.step = "0.001";
    this.motionRange.setAttribute("aria-label", t("motionProgress"));
    this.motionRange.addEventListener("input", () => {
      this.motionPlaying = false;
      this.motionProgress = Number(this.motionRange.value);
      if (this.activateMotion()) {
        this.updatePoseUniforms();
        this.updateMotionLabels();
      }
    });
    this.motionValue = el(
      "span",
      "motion-value",
      `${Math.round(this.motionProgress * 100)}%`,
    );
    const progress = el("label", "motion-progress");
    progress.append(
      el("span", "", t("motionProgress")),
      this.motionValue,
      this.motionRange,
    );
    const rest = button(
      t("motionReturnStatic"),
      () => {
        this.restoreStaticMotion(false);
        this.fit();
      },
      "motion-rest",
    );
    rest.dataset.testid = "motion-rest";
    rest.hidden = !this.motionActive;
    this.motionControls.append(notice, this.motionPlayButton, progress, rest);
    this.updateMotionLabels();
  }
  private updateMotionLabels() {
    if (this.motionPlayButton) {
      this.motionPlayButton.textContent = t(
        this.motionPlaying ? "motionPause" : "motionPlay",
      );
      this.motionPlayButton.setAttribute(
        "aria-pressed",
        String(this.motionPlaying),
      );
    }
    if (this.motionRange) {
      this.motionRange.value = String(this.motionProgress);
      this.motionRange.setAttribute(
        "aria-valuetext",
        `${Math.round(this.motionProgress * 100)}%`,
      );
    }
    if (this.motionValue)
      this.motionValue.textContent = `${Math.round(this.motionProgress * 100)}%`;
  }
  private activateMotion(): boolean {
    if (this.motionActive) return true;
    if (!this.motionMode || !this.poseMaterial?.passes.length) {
      this.notify(t("motionUnavailable"));
      return false;
    }
    this.motionActive = true;
    for (const p of this.parts) {
      if (!p.poseMaterial) {
        p.poseMaterial = new Material();
        p.poseMaterial.copy(this.poseMaterial);
        p.poseMaterial.setProperty(
          "partParams",
          new Vec4(
            p.motionPart.zone,
            p.motionPart.rigid ? 1 : 0,
            p.motionPart.side,
            0,
          ),
        );
      }
      p.renderer.setSharedMaterial(p.poseMaterial, 0);
      p.renderer.model?.createBoundingShape(
        new Vec3(...MOTION_BOUNDS.min),
        new Vec3(...MOTION_BOUNDS.max),
      );
      p.renderer.model?.updateWorldBound();
      this.colorPart(p);
    }
    this.updatePoseUniforms();
    this.yaw = 0.6;
    this.pitch = 0.04;
    this.fitMotion();
    const viewport = this.overlay.querySelector<HTMLElement>(".viewport");
    if (viewport) {
      viewport.dataset.motionActive = "true";
      viewport.setAttribute("aria-label", t("poseViewportLabel"));
    }
    const rest = this.motionControls.querySelector<HTMLButtonElement>(
      '[data-testid="motion-rest"]',
    );
    if (rest) rest.hidden = false;
    this.updateMotionLabels();
    return true;
  }
  private updatePoseUniforms() {
    if (!this.motionMode) return;
    const pose = motionPose(this.motionMode, this.motionProgress);
    this.poseAngles.set(...pose.angles);
    this.poseJoints.set(...pose.joints);
    this.poseState.set(...pose.state);
    for (const p of this.parts)
      if (p.poseMaterial) {
        p.poseMaterial.setProperty("poseAngles", this.poseAngles);
        p.poseMaterial.setProperty("poseJoints", this.poseJoints);
        p.poseMaterial.setProperty("poseState", this.poseState);
      }
  }
  private restoreStaticMotion(clearMode: boolean) {
    const wasActive = this.motionActive;
    this.motionPlaying = false;
    this.motionActive = false;
    this.motionProgress = 0;
    if (clearMode) this.motionMode = null;
    if (wasActive)
      for (const p of this.parts) {
        p.renderer.setSharedMaterial(p.staticMaterial, 0);
        p.renderer.model?.createBoundingShape(
          new Vec3(p.min[0], p.min[1], p.min[2]),
          new Vec3(p.max[0], p.max[1], p.max[2]),
        );
        p.renderer.model?.updateWorldBound();
      }
    this.renderMotionControls();
  }
  private fitMotion() {
    const bounds = MOTION_FIT_BOUNDS[this.motionMode || "squat"];
    const min = bounds.min,
      max = bounds.max;
    this.target.set(
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    );
    this.distance = fitPerspectiveBounds(
      min,
      max,
      this.yaw,
      this.pitch,
      this.camera.fov,
      this.renderAspect,
      0.94,
    );
    this.updateCamera();
  }
  private changeLocale() {
    const fields = new Map<string, { value: string; disabled: boolean }>();
    for (const field of this.overlay.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >("input[data-testid],textarea[data-testid]"))
      fields.set(field.dataset.testid!, {
        value: field.value,
        disabled: field.disabled,
      });
    const scroll = new Map<string, number>();
    for (const name of ["anatomy-panel", "record-panel", "structure-list"])
      scroll.set(
        name,
        this.overlay.querySelector<HTMLElement>(`.${name}`)?.scrollTop || 0,
      );
    const focused = (document.activeElement as HTMLElement)?.dataset.testid;
    const savePending = this.saveButton?.disabled;
    const authOpen = !!this.overlay.querySelector(".auth-backdrop");
    const pane = this.mobilePane,
      position = this.target.clone(),
      distance = this.distance;
    const search = this.search;
    setLocale(getLocale() === "zh" ? "en" : "zh");
    for (const cleanup of this.cleanup) cleanup();
    this.cleanup = [];
    this.overlay.remove();
    this.syncViewport = () => {};
    this.buildUI();
    this.bindControls();
    this.search = search;
    this.renderList();
    this.applyVisibility();
    this.updateSelectionChip();
    for (const check of this.overlay.querySelectorAll<HTMLInputElement>(
      "[data-layer]",
    ))
      check.checked = this.enabledLayers.has(check.dataset.layer!);
    this.setMobilePane(pane);
    if (authOpen) this.openAuth();
    for (const field of this.overlay.querySelectorAll<
      HTMLInputElement | HTMLTextAreaElement
    >("input[data-testid],textarea[data-testid]")) {
      const saved = fields.get(field.dataset.testid!);
      if (saved) {
        field.value = saved.value;
        field.disabled = saved.disabled;
      }
    }
    if (this.painLabel && fields.has("record-intensity"))
      this.painLabel.textContent = `${fields.get("record-intensity")!.value} / 10`;
    if (this.saveButton) this.saveButton.disabled = !!savePending;
    if (focused)
      this.overlay
        .querySelector<HTMLElement>(`[data-testid="${focused}"]`)
        ?.focus({ preventScroll: true });
    if (this.editing && this.saveButton)
      this.saveButton.textContent = t("saveChanges");
    for (const [name, top] of scroll) {
      const node = this.overlay.querySelector<HTMLElement>(`.${name}`);
      if (node) node.scrollTop = top;
    }
    this.target.set(position);
    this.distance = distance;
    this.updateCamera();
    if (!this.modelsReady)
      this.status.textContent = t("loadingCount", {
        done: this.parts.length + this.loadErrors,
        total: this.modelTotal,
      });
    if (this.modelsReady) {
      this.status.classList.add("loaded");
      this.status.textContent = t(
        this.loadErrors ? "loadFailed" : "loadedCount",
        { count: this.loadErrors || this.parts.length },
      );
    }
  }
  private async loadLearning() {
    try {
      const data = await api<LearningData>("/models/learning.json");
      if (
        data.version !== 1 ||
        !Array.isArray(data.groups) ||
        !Array.isArray(data.entries)
      )
        throw new Error(t("learningUnavailable"));
      this.learning = data;
    } catch {
      this.learningFailed = true;
    }
    this.renderList();
  }
  private selectLearning(entry: LearningEntry) {
    this.restoreStaticMotion(true);
    if (!this.modelsReady) {
      this.notify(t("loadingAnatomy"));
      return;
    }
    const result = matchLearningEntry(
      entry,
      this.learning?.groups || [],
      new Set(this.parts.map((p) => p.info.id)),
    );
    this.activeLearning = entry;
    this.selected = null;
    this.editing = null;
    this.highlightedIds = new Set(result.ids);
    this.isolateGroupIds = null;
    this.hidden.clear();
    this.enabledLayers = new Set(["superficial", "deep", "tendon", "bone"]);
    this.motionMode = motionForEntry(entry.id);
    this.isolated = null;
    for (const p of this.parts) {
      if (this.highlightedIds.has(p.info.id)) {
        this.hidden.delete(p.info.id);
        this.enabledLayers.add(
          p.info.kind === "muscle" ? p.info.layer : p.info.kind,
        );
      }
      this.colorPart(p);
    }
    for (const c of this.overlay.querySelectorAll<HTMLInputElement>(
      "[data-layer]",
    ))
      c.checked = this.enabledLayers.has(c.dataset.layer!);
    this.applyVisibility();
    this.renderDetail();
    this.renderLearningDetail();
    this.renderMotionControls();
    this.syncViewport();
    if (result.ids.length) this.fit();
    this.setMobilePane("model");
  }
  private renderLearningDetail() {
    if (!this.learningDetail) return;
    this.learningDetail.replaceChildren();
    if (!this.activeLearning || this.explorerTab === "structures") return;
    const entry = this.activeLearning,
      result = matchLearningEntry(
        entry,
        this.learning?.groups || [],
        new Set(this.parts.map((p) => p.info.id)),
      );
    this.learningDetail.append(
      el("h2", "", localized(entry.name)),
      el("p", "", localized(entry.summary)),
      el(
        "strong",
        "coverage",
        t(
          result.coverage === "none"
            ? "coverageNone"
            : result.coverage === "partial"
              ? "coveragePartial"
              : "coverageComplete",
          { count: result.ids.length },
        ),
      ),
    );
    if (entry.kind === "condition")
      this.learningDetail.append(el("p", "context-notice", t("contextOnly")));
    if (motionForEntry(entry.id))
      this.learningDetail.append(
        el("p", "context-notice", t("motionDisclaimer")),
      );
    if (entry.notice)
      this.learningDetail.append(
        el("p", "context-notice", localized(entry.notice)),
      );
    this.learningDetail.append(el("h3", "", t("relatedGroups")));
    for (const group of result.related)
      this.learningDetail.append(
        el("p", "related-group", localized(group.name)),
      );
    if (result.coverage !== "complete") {
      this.learningDetail.append(el("h3", "", t("missingCoverage")));
      for (const group of result.incompleteGroups)
        this.learningDetail.append(
          el(
            "p",
            "coverage-missing",
            `${localized(group.name)}: ${group.missing ? localized(group.missing) : t("missingGroup", { id: group.id })}`,
          ),
        );
      for (const id of result.missingIds)
        this.learningDetail.append(
          el("p", "coverage-missing", t("learningMissingId", { id })),
        );
      for (const id of result.missingGroups)
        this.learningDetail.append(
          el("p", "coverage-missing", t("missingGroup", { id })),
        );
    }
    this.learningDetail.append(el("h3", "", t("sources")));
    for (const source of entry.sources) {
      try {
        const url = new URL(source.url);
        if (!["https:", "http:"].includes(url.protocol)) continue;
        const label = source.label ? localized(source.label) : source.title;
        const a = el("a", "source-link", label);
        a.href = url.href;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.setAttribute("aria-label", t("sourceLink", { title: label }));
        this.learningDetail.append(a);
      } catch {}
    }
  }
  private async load() {
    try {
      const manifest = await api<{
        structures: Structure[];
      }>("/models/manifest.json");
      if (!Array.isArray(manifest.structures) || !manifest.structures.length)
        throw new Error(t("emptyManifest"));
      let next = 0,
        done = 0;
      const total = manifest.structures.length;
      this.modelTotal = total;
      const worker = async () => {
        while (next < total) {
          const info = manifest.structures[next++];
          try {
            const file = new URL(
              info.file,
              new URL("/models/", location.origin),
            );
            if (file.origin !== location.origin)
              throw new Error(t("sameOrigin"));
            const data = await api<MeshData>(file.pathname);
            this.addPart(info, data);
          } catch (e) {
            this.loadErrors++;
            console.warn("Model load failed:", info.id, e);
          }
          done++;
          this.status.textContent = t("loadingCount", { done, total });
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if (!this.parts.length) throw new Error(t("noMeshes"));
      this.modelsReady = true;
      this.parts.sort((a, b) =>
        title(a.info).localeCompare(title(b.info), "zh-CN"),
      );
      this.renderList();
      this.applyVisibility();
      this.fit();
      this.status.textContent = this.loadErrors
        ? t("loadFailed", { count: this.loadErrors })
        : t("loadedCount", { count: this.parts.length });
      this.status.classList.add("loaded");
      if (this.records.length) this.renderHistory();
    } catch (e) {
      this.status.classList.add("failed");
      this.status.replaceChildren(
        el("span", "", this.parts.length ? t("requestFailed") : t("noMeshes")),
        button(t("retry"), () => location.reload()),
      );
    }
  }
  private addPart(info: Structure, data: MeshData) {
    if (
      !data.positions?.length ||
      !data.indices?.length ||
      data.positions.length % 3 ||
      data.indices.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= data.positions.length / 3,
      )
    )
      throw new Error("Invalid anatomy mesh");
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < data.positions.length; i++) {
      if (!Number.isFinite(data.positions[i]))
        throw new Error("Invalid mesh coordinates");
      const axis = i % 3;
      min[axis] = Math.min(min[axis], data.positions[i]);
      max[axis] = Math.max(max[axis], data.positions[i]);
    }
    const node = new Node(info.id);
    this.node.addChild(node);
    const renderer = node.addComponent(MeshRenderer);
    renderer.mesh = utils.createMesh({
      positions: data.positions,
      normals: data.normals,
      indices: data.indices,
    });
    if (!this.tissueMaterial || !this.tissueMaterial.passes.length)
      throw new Error(t("materialMissing"));
    const mat = new Material();
    mat.copy(this.tissueMaterial);
    mat.setProperty("roughness", 0.68);
    mat.setProperty("metallic", 0.02);
    renderer.setSharedMaterial(mat, 0);
    const part: Part = {
      info,
      data,
      node,
      renderer,
      staticMaterial: mat,
      motionPart: classifyMotionPart(info, min, max),
      min,
      max,
      center: new Vec3(
        (min[0] + max[0]) / 2,
        (min[1] + max[1]) / 2,
        (min[2] + max[2]) / 2,
      ),
    };
    this.parts.push(part);
    this.colorPart(part);
  }
  private colorPart(part: Part) {
    const selected =
      this.selected === part || this.highlightedIds.has(part.info.id);
    const pain = this.todayRecords
      .filter((r) => r.structureId === part.info.id)
      .sort((a, b) => b.intensity - a.intensity)[0];
    const color = selected
      ? new Color(62, 221, 202)
      : pain
        ? new Color(239, 129 - Math.round(pain.intensity * 6), 85)
        : part.info.kind === "bone"
          ? new Color(228, 218, 193)
          : part.info.kind === "tendon"
            ? new Color(230, 225, 211)
            : part.info.layer === "deep"
              ? new Color(184, 105, 116)
              : new Color(220, 137, 127);
    for (const mat of [part.staticMaterial, part.poseMaterial])
      if (mat) {
        mat.setProperty("mainColor", color);
        mat.setProperty(
          "emissive",
          selected ? new Color(10, 67, 63) : new Color(0, 0, 0),
        );
      }
  }
  private visible(part: Part) {
    const key = part.info.kind === "muscle" ? part.info.layer : part.info.kind;
    return (
      this.enabledLayers.has(key) &&
      !this.hidden.has(part.info.id) &&
      (!this.isolated || this.isolated === part.info.id) &&
      (!this.isolateGroupIds || this.isolateGroupIds.has(part.info.id))
    );
  }
  private applyVisibility() {
    for (const p of this.parts) p.node.active = this.visible(p);
    this.renderList();
    this.updateSelectionChip();
  }
  private renderList() {
    this.list.replaceChildren();
    this.renderLearningDetail();
    const heading = this.overlay.querySelector<HTMLElement>(
      ".list-heading span:first-child",
    );
    if (heading)
      heading.textContent = t(
        this.explorerTab === "structures"
          ? "structureDirectory"
          : this.explorerTab === "exercise"
            ? "tabExercises"
            : "tabConditions",
      );
    if (this.explorerTab !== "structures") {
      const entries =
        this.learning?.entries.filter(
          (entry) =>
            entry.kind === this.explorerTab &&
            `${localized(entry.name)} ${localized(entry.summary)} ${entry.id}`
              .toLowerCase()
              .includes(this.search),
        ) || [];
      this.count.textContent = String(entries.length);
      for (const entry of entries) {
        const row = button(
          "",
          () => this.selectLearning(entry),
          "learning-row",
        );
        row.dataset.learningId = entry.id;
        row.disabled = !this.modelsReady;
        row.append(
          el("strong", "", localized(entry.name)),
          el("span", "", localized(entry.summary)),
        );
        this.list.append(row);
      }
      if (!entries.length)
        this.list.append(
          el(
            "p",
            "empty-state",
            this.learningFailed
              ? t("learningUnavailable")
              : this.learning
                ? t("noMatches")
                : t("learningLoading"),
          ),
        );
      return;
    }
    const filtered = this.parts.filter((p) =>
      `${title(p.info)} ${p.info.id} ${p.info.side} ${p.info.kind}`
        .toLowerCase()
        .includes(this.search),
    );
    this.count.textContent = String(filtered.length);
    for (const p of filtered) {
      const b = button(
        "",
        () => this.select(p, true),
        "structure-row" + (p === this.selected ? " selected" : ""),
      );
      b.dataset.structureId = p.info.id;
      const name = el("span", "structure-name", title(p.info));
      const today = this.todayRecords.some((r) => r.structureId === p.info.id);
      b.append(
        el("span", "tissue-dot " + p.info.kind + (today ? " recorded" : "")),
        name,
        el("small", "", sideLabel(p.info.side)),
      );
      if (!this.visible(p)) b.classList.add("is-hidden");
      this.list.append(b);
    }
    if (!filtered.length)
      this.list.append(
        el(
          "div",
          "empty-state",
          this.parts.length ? t("noMatches") : t("loadingStructures"),
        ),
      );
  }
  private select(p: Part, reveal = false) {
    this.restoreStaticMotion(true);
    if (this.activeLearning) {
      this.activeLearning = null;
      this.highlightedIds.clear();
      this.isolateGroupIds = null;
      this.parts.forEach((part) => this.colorPart(part));
      this.applyVisibility();
    }

    const prev = this.selected;
    this.selected = p;
    this.editing = null;
    if (prev) this.colorPart(prev);
    this.colorPart(p);
    if (reveal) {
      this.hidden.delete(p.info.id);
      this.isolated = null;
      this.enabledLayers.add(
        p.info.kind === "muscle" ? p.info.layer : p.info.kind,
      );
      for (const c of this.overlay.querySelectorAll<HTMLInputElement>(
        "[data-layer]",
      ))
        c.checked = this.enabledLayers.has(c.dataset.layer!);
      this.applyVisibility();
    }
    this.renderList();
    this.renderDetail();
    this.updateSelectionChip();
    if (this.mobilePane === "structures") this.setMobilePane("model");
  }
  private setMobilePane(pane: "model" | "structures" | "journal") {
    this.mobilePane = pane;
    this.overlay.dataset.mobilePane = pane;
    for (const b of this.overlay.querySelectorAll<HTMLButtonElement>(
      "[data-mobile-target]",
    ))
      b.setAttribute("aria-pressed", String(b.dataset.mobileTarget === pane));
    {
      if (pane === "model")
        this.overlay
          .querySelector<HTMLElement>(".viewport")
          ?.focus({ preventScroll: true });
      const sheet =
        pane === "structures"
          ? this.overlay.querySelector<HTMLElement>(".anatomy-panel")
          : pane === "journal"
            ? this.overlay.querySelector<HTMLElement>(".record-panel")
            : null;
      sheet
        ?.querySelector<HTMLButtonElement>(".sheet-close")
        ?.focus({ preventScroll: true });
    }
  }
  private updateSelectionChip() {
    const viewport = this.overlay.querySelector<HTMLElement>(".viewport");
    if (viewport) viewport.dataset.groupActive = String(!!this.activeLearning);
    this.groupActions.style.display = this.activeLearning ? "flex" : "none";
    if (this.activeLearning) {
      const result = matchLearningEntry(
        this.activeLearning,
        this.learning?.groups || [],
        new Set(this.parts.map((p) => p.info.id)),
      );
      this.selectionChip.textContent = `${localized(this.activeLearning.name)}\n${t(result.coverage === "none" ? "coverageNone" : result.coverage === "partial" ? "coveragePartial" : "coverageComplete", { count: result.ids.length })}`;
      this.syncViewport();
      return;
    }
    this.selectionChip.textContent = this.selected
      ? `${title(this.selected.info)}\n${sideLabel(this.selected.info.side)} · ${kindLabel(this.selected.info.kind)}${this.visible(this.selected) ? "" : ` · ${t("hidden")}`}`
      : t("selectHint");
    this.syncViewport();
  }
  private renderDetail() {
    this.detail.replaceChildren(el("div", "eyebrow", t("structurePain")));
    if (this.activeLearning) {
      this.detail.append(
        el("h2", "", localized(this.activeLearning.name)),
        el("p", "empty-state", t("singleRecordHint")),
        button(t("entryDetails"), () => {
          this.explorerTab = this.activeLearning!.kind;
          this.overlay.querySelector<HTMLElement>(
            ".anatomy-panel",
          )!.dataset.explorerTab = this.explorerTab;
          this.setMobilePane("structures");
          this.renderList();
        }),
      );
      return;
    }
    if (!this.selected) {
      this.detail.append(
        el("h2", "", t("knowBody")),
        el("p", "subheading", t("knowBodyHint")),
        el("div", "selection-empty", "◎"),
        el("p", "empty-state", t("selectToRecord")),
      );
      return;
    }
    const p = this.selected;
    const related =
      this.learning?.groups.filter((group) =>
        group.structureIds.includes(p.info.id),
      ) || [];
    if (related.length)
      this.detail.append(
        el(
          "p",
          "related-groups",
          `${t("relatedGroups")}: ${related.map((group) => localized(group.name)).join(" · ")}`,
        ),
      );
    this.detail.append(
      el("h2", "selected-title", title(p.info)),
      el(
        "p",
        "structure-meta",
        `${sideLabel(p.info.side)} · ${kindLabel(p.info.kind)} · ${p.info.id}`,
      ),
    );
    const actions = el("div", "selection-actions");
    actions.append(
      button(t("focus"), () => this.focus(p)),
      button(t("hide"), () => {
        this.hidden.add(p.info.id);
        this.applyVisibility();
      }),
      button(this.isolated ? t("wholeBody") : t("isolate"), () => {
        this.isolated = this.isolated ? null : p.info.id;
        this.applyVisibility();
        this.renderDetail();
      }),
      button(t("reset"), () => this.resetVisibility()),
    );
    this.detail.append(actions);
    if (!canRecord(p.info.kind)) {
      this.detail.append(el("p", "empty-state", t("boneHint")));
      return;
    }
    const form = el("form", "pain-form");
    form.dataset.testid = "pain-form";
    this.dateInput = input("date", localDate(), "record-date");
    this.dateInput.required = true;
    this.dateInput.max = localDate();
    this.painInput = input("range", "3", "record-intensity");
    this.painInput.min = "0";
    this.painInput.max = "10";
    this.painInput.step = "1";
    this.painLabel = el("strong", "pain-value", "3 / 10");
    this.painInput.addEventListener(
      "input",
      () => (this.painLabel.textContent = `${this.painInput.value} / 10`),
    );
    const painHeader = el("div", "pain-header");
    painHeader.append(el("span", "", t("intensity")), this.painLabel);
    this.noteInput = el("textarea");
    this.noteInput.dataset.testid = "record-note";
    this.noteInput.rows = 2;
    this.noteInput.maxLength = 2000;
    this.noteInput.placeholder = t("notePlaceholder");
    this.formMessage = el("p", "form-message");
    this.formMessage.setAttribute("role", "status");
    this.saveButton = el(
      "button",
      "primary-button",
      this.user ? t("saveRecord") : t("signInRecord"),
    );
    this.saveButton.type = "submit";
    this.saveButton.dataset.testid = "save-record";
    form.append(
      field(t("date"), this.dateInput),
      painHeader,
      this.painInput,
      el("div", "range-labels", t("range")),
      field(t("notes"), this.noteInput),
      this.formMessage,
      this.saveButton,
    );
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!this.user) {
        this.openAuth();
        return;
      }
      this.saveRecord();
    });
    this.detail.append(form);
  }
  private async loadUser() {
    try {
      const d = await api<{
        user: User;
      }>("/api/auth/me");
      this.user = d.user;
      this.authButton.textContent = t("signOutUser", {
        username: this.user.username,
      });
      await this.loadRecords();
    } catch (e) {
      if ((e as any).status !== 401) this.notify(t("accountError"));
    }
    this.renderDetail();
    this.renderHistory();
  }
  private async logout() {
    try {
      await api("/api/auth/logout", "POST");
      this.user = null;
      this.records = [];
      this.todayRecords = [];
      this.historyRequest++;
      this.authButton.textContent = t("signIn");
      this.parts.forEach((p) => this.colorPart(p));
      this.renderList();
      this.renderDetail();
      this.renderHistory();
      this.notify(t("signedOut"));
    } catch (e) {
      this.notify(displayError(e));
    }
  }
  private openAuth() {
    if (document.querySelector(".auth-backdrop")) return;
    const backdrop = el("div", "auth-backdrop");
    const dialog = el("form", "auth-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", t("accountLabel"));
    const heading = el("h2", "", t("welcome"));
    const modeButton = button(t("createAccount"), () => {
      register = !register;
      this.authRegister = register;
      heading.textContent = register ? t("createAccount") : t("welcome");
      submit.textContent = register ? t("register") : t("signIn");
      modeButton.textContent = register
        ? t("signInInstead")
        : t("createAccount");
      password.autocomplete = register ? "new-password" : "current-password";
      message.textContent = "";
    });
    let register = this.authRegister;
    const username = input("text", "", "auth-username");
    username.required = true;
    username.minLength = 3;
    username.maxLength = 32;
    username.pattern = "[A-Za-z0-9_]{3,32}";
    username.title = t("usernameRules");
    username.autocomplete = "username";
    const password = input("password", "", "auth-password");
    password.required = true;
    password.minLength = 10;
    password.maxLength = 128;
    password.autocomplete = "current-password";
    const message = el("p", "form-message");
    message.setAttribute("role", "alert");
    const submit = el("button", "primary-button", t("signIn"));
    submit.type = "submit";
    const close = button("×", () => backdrop.remove(), "dialog-close");
    close.setAttribute("aria-label", t("close"));
    dialog.append(
      close,
      el("div", "eyebrow", t("privateEyebrow")),
      heading,
      el("p", "subheading", t("authHint")),
      field(t("username"), username),
      field(t("password"), password),
      message,
      submit,
      modeButton,
    );
    const authLanguage = button(
      getLocale() === "zh" ? "English" : "中文",
      () => this.changeLocale(),
      "language-button auth-language-button",
    );
    authLanguage.dataset.testid = "auth-locale-switch";
    authLanguage.setAttribute("aria-label", t("languageLabel"));
    dialog.append(authLanguage);
    dialog.addEventListener("submit", async (e) => {
      e.preventDefault();
      submit.disabled = true;
      message.textContent = t("pleaseWait");
      try {
        const d = await api<{
          user: User;
        }>(`/api/auth/${register ? "register" : "login"}`, "POST", {
          username: username.value.trim(),
          password: password.value,
        });
        this.user = d.user;
        backdrop.remove();
        this.authButton.textContent = t("signOutUser", {
          username: d.user.username,
        });
        this.renderDetail();
        await this.loadRecords();
        this.notify(t("signedIn"));
      } catch (e) {
        message.textContent = displayError(e);
      } finally {
        submit.disabled = false;
      }
    });
    if (register) {
      heading.textContent = t("createAccount");
      submit.textContent = t("register");
      modeButton.textContent = t("signInInstead");
      password.autocomplete = "new-password";
    }
    backdrop.append(dialog);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.remove();
    });
    backdrop.addEventListener("keydown", (e) => {
      if (e.key === "Escape") backdrop.remove();
      if (e.key === "Tab") {
        const fields = Array.from(
          dialog.querySelectorAll<HTMLElement>("button,input"),
        ).filter((x) => !(x as HTMLButtonElement).disabled);
        if (e.shiftKey && document.activeElement === fields[0]) {
          e.preventDefault();
          fields[fields.length - 1].focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === fields[fields.length - 1]
        ) {
          e.preventDefault();
          fields[0].focus();
        }
      }
    });
    this.overlay.append(backdrop);
    username.focus();
  }
  private async loadRecords() {
    if (!this.user) {
      this.renderHistory();
      return;
    }
    const request = ++this.historyRequest;
    if (!this.from || !this.to || this.from > this.to) {
      this.history.replaceChildren(el("p", "form-message", t("validRange")));
      return;
    }
    this.history.replaceChildren(el("p", "empty-state", t("loadingRecords")));
    try {
      const d = await api<{
        records: PainRecord[];
        total: number;
      }>(
        `/api/records?from=${encodeURIComponent(this.from)}&to=${encodeURIComponent(this.to)}`,
      );
      if (request !== this.historyRequest) return;
      const today = localDate();
      const daily =
        this.from <= today && this.to >= today
          ? d
          : await api<{
              records: PainRecord[];
            }>(`/api/records?from=${today}&to=${today}`);
      if (request !== this.historyRequest) return;
      this.records = d.records;
      this.todayRecords = daily.records.filter((r) => r.date === today);
      this.renderHistory();
      this.renderList();
      this.parts.forEach((p) => this.colorPart(p));
    } catch (e) {
      if (request !== this.historyRequest) return;
      this.history.replaceChildren(
        el("p", "form-message", displayError(e)),
        button(t("retryRecords"), () => this.loadRecords()),
      );
    }
  }
  private renderHistory() {
    this.history.replaceChildren();
    if (!this.user) {
      this.history.append(el("div", "empty-state", t("privateJournalHint")));
      return;
    }
    if (!this.records.length) {
      this.history.append(el("div", "empty-state", t("noRecords")));
      return;
    }
    for (const r of [...this.records].sort((a, b) =>
      b.date.localeCompare(a.date),
    )) {
      const p = this.parts.find((p) => p.info.id === r.structureId);
      const row = el("article", "record-item");
      row.dataset.recordId = String(r.id);
      const top = el("div", "record-top");
      top.append(
        el("span", "record-date", r.date),
        el("strong", "record-intensity", `${r.intensity} / 10`),
      );
      const choose = button(
        p ? title(p.info) : r.structureId,
        () => {
          if (p) this.select(p, true);
        },
        "record-structure",
      );
      row.append(top, choose, el("small", "muted", sideLabel(r.side)));
      if (r.note) row.append(el("p", "record-note", r.note));
      const actions = el("div", "record-actions");
      actions.append(
        button(t("edit"), () => {
          if (!p) {
            this.notify(t("modelNotLoaded"));
            return;
          }
          this.select(p, true);
          this.setMobilePane("journal");
          this.editing = r.id;
          this.dateInput.value = r.date;
          this.painInput.value = String(r.intensity);
          this.painLabel.textContent = `${r.intensity} / 10`;
          this.noteInput.value = r.note;
          this.saveButton.textContent = t("saveChanges");
          this.detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }),
        button(t("delete"), () => this.requestDelete(r, row)),
      );
      row.append(actions);
      this.history.append(row);
    }
  }
  private async saveRecord() {
    if (!this.selected || !this.user) return;
    this.saveButton.disabled = true;
    this.formMessage.textContent = t("saving");
    const body = {
      date: this.dateInput.value,
      structureId: this.selected.info.id,
      side: this.selected.info.side,
      intensity: Number(this.painInput.value),
      note: this.noteInput.value.trim(),
    };
    try {
      await api(
        this.editing
          ? `/api/records/${encodeURIComponent(this.editing)}`
          : "/api/records",
        this.editing ? "PATCH" : "POST",
        body,
      );
      this.editing = null;
      this.formMessage.textContent = t("saved");
      this.saveButton.textContent = t("saveRecord");
      await this.loadRecords();
      this.notify(t("recordSaved"));
    } catch (e) {
      this.formMessage.textContent = displayError(e);
    } finally {
      this.saveButton.disabled = false;
    }
  }
  private requestDelete(r: PainRecord, row: HTMLElement) {
    if (row.querySelector(".delete-confirm")) return;
    const group = el("div", "delete-confirm");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", t("confirmDeleteLabel"));
    const question = el("p", "", t("deleteQuestion", { date: r.date }));
    const message = el("p", "form-message");
    message.setAttribute("role", "alert");
    const actions = el("div", "record-actions");
    const cancel = button(t("cancel"), () => {
      group.remove();
      row
        .querySelector<HTMLButtonElement>(".record-actions button:last-child")
        ?.focus();
    });
    const confirmButton = button(t("confirmDelete"), async () => {
      confirmButton.disabled = true;
      cancel.disabled = true;
      message.textContent = t("deleting");
      try {
        await this.deleteRecord(r);
      } catch (e) {
        message.textContent = displayError(e);
        confirmButton.disabled = false;
        cancel.disabled = false;
      }
    });
    confirmButton.dataset.testid = "confirm-delete-record";
    actions.append(cancel, confirmButton);
    group.append(question, message, actions);
    row.append(group);
    cancel.focus();
  }
  private async deleteRecord(r: PainRecord) {
    await api(`/api/records/${encodeURIComponent(r.id)}`, "DELETE");
    if (this.editing === r.id) {
      this.editing = null;
      this.renderDetail();
    }
    await this.loadRecords();
    this.notify(t("recordDeleted"));
  }
  private notify(message: string) {
    this.toast.textContent = message;
    this.toast.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(
      () => this.toast.classList.remove("show"),
      4000,
    );
  }
  private updateCamera() {
    this.keyLight?.setRotationFromEuler(
      -24,
      (this.yaw * 180) / Math.PI - 28,
      0,
    );
    const cp = Math.cos(this.pitch);
    this.camera.node.setPosition(
      this.target.x + this.distance * Math.sin(this.yaw) * cp,
      this.target.y + this.distance * Math.sin(this.pitch),
      this.target.z + this.distance * Math.cos(this.yaw) * cp,
    );
    this.camera.node.lookAt(this.target);
  }
  private preset(yaw: number) {
    this.yaw = yaw;
    this.pitch = 0.04;
    for (const b of this.overlay.querySelectorAll<HTMLButtonElement>(
      "[data-view-yaw]",
    ))
      b.setAttribute("aria-pressed", String(Number(b.dataset.viewYaw) === yaw));
    if (this.parts.length) this.fit();
    else this.updateCamera();
  }
  private fit() {
    if (this.motionActive) {
      this.fitMotion();
      return;
    }
    if (!this.parts.length) return;
    const min = [Infinity, Infinity, Infinity],
      max = [-Infinity, -Infinity, -Infinity];
    for (const p of this.parts.filter((p) => p.node.active)) {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p.min[i]);
        max[i] = Math.max(max[i], p.max[i]);
      }
    }
    if (!Number.isFinite(min[0])) return;
    this.target.set(
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    );
    this.distance = fitPerspectiveBounds(
      min,
      max,
      this.yaw,
      this.pitch,
      this.camera.fov,
      this.renderAspect,
    );
    this.updateCamera();
  }
  private focus(p: Part) {
    this.target.set(p.center);
    this.distance = fitPerspectiveBounds(
      p.min,
      p.max,
      this.yaw,
      this.pitch,
      this.camera.fov,
      this.renderAspect,
      0.82,
    );
    this.updateCamera();
  }
  private resetVisibility() {
    this.restoreStaticMotion(true);
    this.activeLearning = null;
    this.highlightedIds.clear();
    this.isolateGroupIds = null;
    this.parts.forEach((p) => this.colorPart(p));
    this.hidden.clear();
    this.isolated = null;
    this.enabledLayers = new Set(["superficial", "deep", "tendon", "bone"]);
    for (const c of this.overlay.querySelectorAll<HTMLInputElement>(
      "[data-layer]",
    ))
      c.checked = true;
    this.applyVisibility();
    this.renderDetail();
    this.fit();
  }
  private pick(clientX: number, clientY: number) {
    if (this.motionActive) return;
    const canvas = game.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ray = new geometry.Ray();
    this.camera.screenPointToRay(
      ((clientX - rect.left) * canvas.width) / rect.width,
      ((rect.bottom - clientY) * canvas.height) / rect.height,
      ray,
    );
    const o = [ray.o.x, ray.o.y, ray.o.z],
      d = [ray.d.x, ray.d.y, ray.d.z];
    let nearest = Infinity,
      found: Part | null = null;
    for (const p of this.parts) {
      if (!p.node.active || !rayBounds(o, d, p.min, p.max)) continue;
      const { positions: v, indices: ix } = p.data;
      for (let i = 0; i < ix.length; i += 3) {
        const a = ix[i] * 3,
          b = ix[i + 1] * 3,
          c = ix[i + 2] * 3;
        const t = rayTriangle(
          o,
          d,
          [v[a], v[a + 1], v[a + 2]],
          [v[b], v[b + 1], v[b + 2]],
          [v[c], v[c + 1], v[c + 2]],
        );
        if (t !== null && t < nearest) {
          nearest = t;
          found = p;
        }
      }
    }
    if (found) this.select(found);
  }
  private bindControls() {
    const viewport = this.overlay.querySelector<HTMLElement>(".viewport")!;
    const points = new Map<
      number,
      {
        x: number;
        y: number;
      }
    >();
    let startX = 0,
      startY = 0,
      moved = false,
      right = false,
      pinch = 0,
      multiTouch = false;
    const onDown = (e: PointerEvent) => {
      if (
        (e.target as HTMLElement).closest(
          "button,input,select,textarea,.motion-controls",
        )
      )
        return;
      viewport.setPointerCapture(e.pointerId);
      if (!points.size) multiTouch = false;
      else multiTouch = true;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      right = e.button === 2 || e.shiftKey;
      if (points.size === 2) {
        const p = Array.from(points.values());
        pinch = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      }
    };
    const pan = (dx: number, dy: number) => {
      const factor = this.distance * 0.0012;
      this.target.x -= Math.cos(this.yaw) * dx * factor;
      this.target.z += Math.sin(this.yaw) * dx * factor;
      this.target.y += dy * factor;
    };
    const onMove = (e: PointerEvent) => {
      if (!points.has(e.pointerId)) return;
      const old = points.get(e.pointerId)!;
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const dx = e.clientX - old.x,
        dy = e.clientY - old.y;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 5) moved = true;
      if (points.size === 2) {
        const p = Array.from(points.values()),
          now = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinch > 0)
          this.distance = Math.max(
            0.08,
            Math.min(12, (this.distance * pinch) / Math.max(1, now)),
          );
        pinch = now;
        pan(dx / 2, dy / 2);
        moved = true;
      } else if (right) pan(dx, dy);
      else {
        this.yaw -= dx * 0.008;
        this.pitch = Math.max(-1.49, Math.min(1.49, this.pitch + dy * 0.006));
      }
      this.updateCamera();
    };
    const onUp = (e: PointerEvent) => {
      const was = points.size;
      points.delete(e.pointerId);
      if (
        !right &&
        shouldPick(moved, multiTouch, was, e.type === "pointercancel")
      )
        this.pick(e.clientX, e.clientY);
      if (was > 1) moved = true;
      pinch = 0;
      if (!points.size) multiTouch = false;
    };
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".motion-controls")) return;
      e.preventDefault();
      this.distance = Math.max(
        0.08,
        Math.min(12, this.distance * Math.exp(e.deltaY * 0.001)),
      );
      this.updateCamera();
    };
    const onContext = (e: Event) => e.preventDefault();
    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    viewport.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("contextmenu", onContext);
    this.cleanup.push(() => {
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onUp);
      viewport.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("contextmenu", onContext);
    });
    const resize = (refit = true) => {
      const compact = window.innerWidth <= 1024;
      const visual = window.visualViewport;
      this.overlay.style.setProperty(
        "--app-height",
        `${visual?.height || window.innerHeight}px`,
      );
      this.overlay.style.setProperty(
        "--app-top",
        `${compact ? visual?.offsetTop || 0 : 0}px`,
      );
      screen.windowSize = new Size(
        Math.round(window.innerWidth * screen.devicePixelRatio),
        Math.round(window.innerHeight * screen.devicePixelRatio),
      );
      view.setDesignResolutionSize(
        window.innerWidth,
        window.innerHeight,
        ResolutionPolicy.SHOW_ALL,
      );
      const backing = renderingSize(
        window.innerWidth,
        window.innerHeight,
        screen.devicePixelRatio,
        compact,
      );
      director.root?.resize(backing.width, backing.height);
      const canvas = game.canvas!.getBoundingClientRect();
      const r = viewport.getBoundingClientRect();
      const controls = this.overlay
        .querySelector<HTMLElement>(".view-controls")!
        .getBoundingClientRect();
      const chip = this.selectionChip.getBoundingClientRect();
      const frame = sceneFrame(r, controls, chip, true);
      this.renderAspect = frame.width / frame.height;
      this.camera.rect = new Rect(
        (frame.left - canvas.left) / canvas.width,
        (canvas.bottom - frame.bottom) / canvas.height,
        frame.width / canvas.width,
        frame.height / canvas.height,
      );
      if (refit && this.parts.length) this.fit();
      else this.updateCamera();
    };
    this.syncViewport = () => resize(false);
    let resizeFrame = 0;
    const requestResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => resize());
    };
    window.addEventListener("resize", requestResize);
    window.addEventListener("orientationchange", requestResize);
    window.visualViewport?.addEventListener("resize", requestResize);
    window.visualViewport?.addEventListener("scroll", requestResize);
    this.cleanup.push(() => {
      cancelAnimationFrame(resizeFrame);
      window.removeEventListener("resize", requestResize);
      window.removeEventListener("orientationchange", requestResize);
      window.visualViewport?.removeEventListener("resize", requestResize);
      window.visualViewport?.removeEventListener("scroll", requestResize);
    });
    const pauseWhenHidden = () => {
      if (document.hidden && this.motionPlaying) {
        this.motionPlaying = false;
        this.updateMotionLabels();
      }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    this.cleanup.push(() =>
      document.removeEventListener("visibilitychange", pauseWhenHidden),
    );
    resize();
  }
  onDestroy() {
    for (const fn of this.cleanup) fn();
    window.clearTimeout(this.toastTimer);
    this.overlay?.remove();
    for (const p of this.parts) {
      p.staticMaterial.destroy();
      p.poseMaterial?.destroy();
      p.renderer.mesh?.destroy();
    }
  }
}
const STYLE = `
:root {
  color-scheme: light;
  --bg: #f5f7fa;
  --panel: #ffffff;
  --line: #e2e8ed;
  --ink: #20323d;
  --muted: #687c88;
  --teal: #247d74;
}
* { box-sizing: border-box; }
html, body { margin: 0 !important; width: 100%; height: 100%; overflow: hidden; background: var(--bg) !important; }
body { font-family: Inter, "Segoe UI", "Microsoft YaHei", sans-serif !important; color: var(--ink); font-size: 13px; }
#GameDiv, #Cocos3dGameContainer { position: fixed !important; inset: 0 !important; width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important; border: 0 !important; transform: none !important; }
#GameCanvas { width: 100% !important; height: 100% !important; display: block; }
.atlas-app { position: fixed; inset: 0; height: var(--app-height, 100dvh); pointer-events: none; }
button, input, textarea { font: inherit; }
button { cursor: pointer; color: var(--ink); border: 1px solid var(--line); background: #fff; border-radius: 9px; padding: 9px 11px; transition: background .15s, border-color .15s; }
button:hover { background: #eef5f4; border-color: #b4cfca; }
button:disabled { opacity: .55; cursor: wait; }
button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid var(--teal); outline-offset: 3px; }
input, textarea { color: var(--ink); background: #f8fafb; border: 1px solid #dce4e8; border-radius: 8px; padding: 10px 11px; min-width: 0; width: 100%; accent-color: var(--teal); }
input[type=date] { padding: 9px 6px; font-size: 12px; }
input[type=checkbox] { width: 18px; height: 18px; margin: 0; }
input[type=range] { padding: 0; border: 0; height: 28px; }
textarea { resize: vertical; min-height: 68px; max-height: 160px; }
h1, h2, p { margin: 0; }
h1 { font-size: 26px; line-height: 1.4; letter-spacing: .5px; }
h2 { font-size: 18px; line-height: 1.5; }
.atlas-header { height: 76px; position: absolute; inset: 0 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0 26px; background: #ffffffed; border-bottom: 1px solid var(--line); pointer-events: auto; z-index: 30; }
.brand { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 700; letter-spacing: 1.5px; }
.brand-mark { width: 35px; height: 40px; display: grid; place-items: center; border: 1px solid #adcfc5; background: #eff7f4; color: var(--teal); border-radius: 11px; font-size: 24px; font-weight: 500; }
.brand small { display: block; color: var(--muted); letter-spacing: 1.5px; font-size: 9px; margin-top: 5px; font-weight: 400; }
.header-nav { display: flex; gap: 28px; font-size: 12px; }
.nav-active { color: var(--teal); }
.nav-muted { color: #8a989f; }
.auth-button { border-color: #c8ded7; background: #f3f9f7; color: #286e62; font-size: 12px; max-width: 230px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.panel { position: absolute; top: 96px; bottom: 46px; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; pointer-events: auto; box-shadow: 0 8px 28px #233e4b06; overflow: hidden; }
.anatomy-panel { left: 24px; width: 250px; padding: 22px 17px 0; display: flex; flex-direction: column; }
.eyebrow { font-size: 9px; letter-spacing: 1.6px; color: var(--teal); margin-bottom: 9px; font-weight: 600; }
.subheading { color: var(--muted); font-size: 11px; line-height: 1.8; margin: 4px 0 17px; white-space: pre-line; }
.anatomy-panel input[type=search] { font-size: 11px; padding: 11px; margin-bottom: 19px; }
.section-title, .list-heading { font-size: 10px; letter-spacing: .4px; color: #667c87; font-weight: 600; }
.toggles { display: grid; gap: 10px; margin: 13px 0 11px; }
.toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 11px; min-height: 25px; }
.taxonomy-note { font-size: 9px; color: #788b95; white-space: pre-line; line-height: 1.6; margin-bottom: 18px; }
.list-heading { display: flex; justify-content: space-between; padding: 13px 0 10px; border-top: 1px solid var(--line); }
.structure-list { min-height: 0; overflow: auto; margin: 0 -8px; padding: 0 4px 12px; }
.structure-row { display: flex; width: 100%; align-items: center; gap: 9px; padding: 10px 7px; background: transparent; border: 1px solid transparent; border-radius: 8px; text-align: left; min-height: 46px; font-size: 11px; }
.structure-row.selected { background: #eaf5f1; border-color: #b9d9cf; color: #226a5d; }
.structure-row.is-hidden { opacity: .55; }
.structure-row small { font-size: 10px; flex-shrink: 0; color: var(--muted); }
.structure-name { flex: 1; line-height: 1.5; overflow-wrap: anywhere; }
.tissue-dot { width: 7px; height: 7px; background: #c97b76; border-radius: 50%; flex-shrink: 0; }
.tissue-dot.tendon { background: #a4a999; }
.tissue-dot.bone { background: #c1af89; }
.tissue-dot.recorded { box-shadow: 0 0 0 3px #e7906e26; background: #dc8059; }
.muted { color: var(--muted); }
.viewport { position: absolute; top: 76px; bottom: 35px; left: 290px; right: 370px; pointer-events: auto; touch-action: none; cursor: grab; }
.viewport:active { cursor: grabbing; }
.viewport-top { display: flex; gap: 8px; align-items: center; padding: 24px 0; font-size: 10px; letter-spacing: 1px; color: #6f858e; pointer-events: none; }
.live-dot { color: #49988a; font-size: 9px; }
.model-badge { border: 1px solid #d8e3e5; color: #7f929a; font-size: 8px; border-radius: 5px; padding: 4px 5px; margin-left: auto; letter-spacing: .6px; }
.load-status { position: absolute; top: 65px; left: 0; right: 0; text-align: center; color: #637c86; font-size: 11px; pointer-events: none; }
.load-status.loaded { opacity: .8; font-size: 9px; }
.load-status.failed { pointer-events: auto; display: flex; flex-direction: column; gap: 12px; align-items: center; color: #a64c3c; top: 35%; }
.view-controls { display: flex; position: absolute; top: 85px; left: 50%; transform: translateX(-50%); gap: 3px; white-space: nowrap; background: #ffffffef; padding: 4px; border: 1px solid #dfe8ea; border-radius: 12px; }
.view-controls button { font-size: 10px; padding: 7px 9px; border: 0; background: transparent; color: #657e89; }
.view-controls button:hover, .view-controls button[aria-pressed=true] { background: #eaf4f0; color: #277867; }
.orientation { position: absolute; right: 0; bottom: 91px; font-size: 11px; color: #78929c; white-space: pre; text-align: center; line-height: 2; pointer-events: none; }
.selection-chip { position: absolute; bottom: 73px; left: 50%; transform: translateX(-50%); max-width: 100%; white-space: pre-line; text-align: center; color: #3e6968; font-size: 11px; line-height: 1.8; padding: 10px 17px; background: #ffffffde; border: 1px solid #d8e6e2; border-radius: 11px; pointer-events: none; min-width: 220px; }
.viewport-instructions { position: absolute; bottom: 18px; left: 0; right: 0; text-align: center; font-size: 9px; color: #748993; line-height: 1.8; white-space: pre-line; pointer-events: none; }
.record-panel { right: 24px; width: 326px; padding: 20px 19px 0; overflow: auto; }
.selection-detail { padding-bottom: 22px; }
.selected-title { font-size: 17px; overflow-wrap: anywhere; }
.structure-meta { font-size: 10px; color: var(--muted); line-height: 1.7; margin-top: 7px; }
.selection-actions { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 18px; }
.selection-actions button { padding: 7px 8px; font-size: 10px; background: #f6f9f9; }
.selection-empty { font-size: 64px; color: #b6ccc9; text-align: center; margin: 25px 0 13px; font-weight: 200; }
.empty-state { color: #7b8e97; font-size: 11px; line-height: 1.9; white-space: pre-line; text-align: center; padding: 18px 2px; }
.field { display: block; margin-bottom: 13px; }
.field-label { display: block; color: #6b808a; font-size: 11px; margin-bottom: 7px; }
.pain-header { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #657d87; margin: 14px 0 8px; }
.pain-value { font-size: 16px; color: var(--teal); }
.range-labels { white-space: pre-wrap; font-size: 9px; color: #7b8d96; margin: 4px 0 17px; }
.primary-button { width: 100%; background: #2e8373; color: #fff; font-weight: 600; border: 1px solid #2e8373; padding: 12px; font-size: 12px; }
.primary-button:hover { background: #246e60; border-color: #246e60; }
.form-message { font-size: 11px; line-height: 1.7; color: #a95a45; margin: 6px 0 10px; overflow-wrap: anywhere; }
.form-message:empty { display: none; }
.history-heading { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding: 20px 0 13px; }
.history-heading h2 { font-size: 15px; }
.private-tag { font-size: 9px; color: #6c898a; border: 1px solid #d9e6e3; padding: 4px 6px; border-radius: 5px; }
.date-filters { display: flex; align-items: center; gap: 6px; color: #83969e; }
.date-filters input { flex: 1; width: 0; }
.history-list { margin-top: 12px; }
.record-item { padding: 14px 0; border-bottom: 1px solid var(--line); }
.record-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
.record-date { font-size: 11px; color: #7a8e98; }
.record-intensity { font-size: 12px; color: #a66445; background: #fbefe5; padding: 4px 8px; border-radius: 6px; }
.record-structure { display: block; text-align: left; border: 0; border-radius: 0; background: transparent; padding: 0; font-size: 12px; line-height: 1.5; color: #385a65; margin-bottom: 4px; }
.record-item small { font-size: 10px; }
.record-note { font-size: 12px; color: #788d96; line-height: 1.7; margin: 8px 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.record-actions { display: flex; gap: 12px; margin-top: 8px; }
.record-actions button { border: 0; background: transparent; font-size: 10px; color: #317f70; padding: 3px 0; }
.medical-note { font-size: 10px; line-height: 1.7; color: #83969e; white-space: pre-line; padding: 20px 0; }
.atlas-footer { display: flex; justify-content: space-between; position: absolute; bottom: 0; height: 30px; left: 24px; right: 24px; font-size: 9px; color: #81959d; align-items: center; pointer-events: auto; }
.toast { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%) translateY(12px); padding: 13px 20px; border: 1px solid #b7d8ca; background: #eff8f1; color: #36715a; border-radius: 10px; opacity: 0; transition: .2s; pointer-events: none; max-width: 90%; font-size: 12px; z-index: 50; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.auth-backdrop { position: absolute; inset: 0; background: #29424b55; backdrop-filter: blur(5px); display: flex; justify-content: center; align-items: center; pointer-events: auto; padding: 16px; z-index: 60; }
.auth-dialog { position: relative; width: 400px; max-width: 100%; max-height: calc(var(--app-height, 100dvh) - 32px); overflow: auto; overscroll-behavior: contain; background: white; border: 1px solid #d9e4e7; padding: 28px; border-radius: 18px; box-shadow: 0 20px 80px #26485322; }
.auth-dialog>.primary-button { margin: 8px 0 12px; }
.auth-dialog>button:last-child { width: 100%; font-size: 12px; border: 0; background: transparent; color: #358474; }
.dialog-close { position: absolute; right: 8px; top: 8px; border: 0; background: transparent; font-size: 25px; color: #7a9099; width: 44px; height: 44px; padding: 0; }
.delete-confirm { margin-top: 12px; border: 1px solid #e8d0c0; background: #fff8f1; padding: 12px; border-radius: 9px; font-size: 11px; line-height: 1.7; color: #9b6750; }
.delete-confirm .record-actions { justify-content: flex-end; gap: 15px; }
.delete-confirm .record-actions button:last-child { color: #b86248; }
.delete-confirm .form-message { margin-bottom: 5px; }
.model-credit {font-size: 9px; color: #83969e; padding: 10px 0 12px; line-height: 1.6;}
.mobile-nav, .sheet-header, .sheet-scrim { display: none; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: #cbdadf; border-radius: 3px; }
::-webkit-scrollbar-track { background: transparent; }
@media (min-width: 0px) {
  .atlas-app { top: var(--app-top, 0px); bottom: auto; overflow: hidden; }
  .atlas-header { height: calc(60px + env(safe-area-inset-top)); padding: env(safe-area-inset-top) 16px 0; }
  .brand { font-size: 11px; gap: 8px; letter-spacing: .8px; }
  .brand-mark { width: 29px; height: 33px; font-size: 21px; }
  .brand small { font-size: 8px; letter-spacing: .7px; }
  .header-nav { display: none; }
  .auth-button { font-size: 11px; min-height: 44px; max-width: 145px; padding: 8px 10px; }
  .viewport { top: calc(60px + env(safe-area-inset-top)); bottom: calc(76px + env(safe-area-inset-bottom)); left: 12px; right: 12px; margin: 0; }
  .viewport-top { padding: 13px 3px; font-size: 9px; letter-spacing: .5px; }
  .model-badge { font-size: 7px; padding: 3px 4px; }
  .load-status { top: 40px; font-size: 10px; }
  .load-status.loaded { font-size: 9px; }
  .view-controls { top: 58px; padding: 3px; gap: 2px; }
  .view-controls button { min-height: 44px; min-width: 64px; padding: 8px 9px; font-size: 11px; }
  .selection-chip { bottom: 55px; padding: 9px 14px; font-size: 12px; line-height: 1.6; width: max-content; min-width: 220px; max-width: calc(100% - 12px); max-height: 76px; overflow: hidden; }
  .viewport-instructions { bottom: 10px; font-size: 9px; line-height: 1.6; }
  .orientation { right: 6px; bottom: 128px; font-size: 10px; }
  .atlas-footer { display: none; }
  .mobile-nav { display: grid; grid-template-columns: repeat(3, 1fr); position: absolute; left: 0; right: 0; bottom: 0; height: calc(76px + env(safe-area-inset-bottom)); padding: 7px 16px calc(7px + env(safe-area-inset-bottom)); background: #fffffffa; border-top: 1px solid var(--line); pointer-events: auto; z-index: 40; gap: 10px; }
  .mobile-nav-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border: 0; background: transparent; min-height: 56px; padding: 6px; border-radius: 12px; color: #83949c; }
  .mobile-nav-item strong { font-size: 14px; font-weight: 600; }
  .mobile-nav-item small { font-size: 10px; }
  .mobile-nav-item[aria-pressed=true] { color: #267d6c; background: #edf7f1; }
  .panel { display: none; position: absolute; left: 10px; right: 10px; top: auto; bottom: calc(86px + env(safe-area-inset-bottom)); width: auto; margin: 0; padding: 0 18px 15px; max-height: calc(var(--app-height, 100dvh) - 160px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); border-radius: 20px; overflow: auto; overscroll-behavior: contain; box-shadow: 0 -5px 35px #29464a18; z-index: 25; }
  .atlas-app[data-mobile-pane=structures] .anatomy-panel { display: block; }
  .atlas-app[data-mobile-pane=journal] .record-panel { display: block; }
  .sheet-scrim { position: absolute; inset: calc(60px + env(safe-area-inset-top)) 0 calc(76px + env(safe-area-inset-bottom)); background: #31494a18; border: 0; border-radius: 0; z-index: 20; pointer-events: auto; padding: 0; }
  .atlas-app:not([data-mobile-pane=model]) .sheet-scrim { display: block; }
  .sheet-header { display: flex; position: sticky; top: 0; z-index: 2; align-items: center; justify-content: space-between; min-height: 62px; padding: 9px 0 6px; background: #fff; border-bottom: 1px solid var(--line); margin-bottom: 18px; flex-shrink: 0; }
  .sheet-header strong { font-size: 15px; font-weight: 600; }
  .sheet-close { min-width: 78px; min-height: 44px; border: 0; background: #f1f6f5; font-size: 12px; color: #377b6e; padding: 8px 10px; }
  .anatomy-panel { min-height: 0; }
  .anatomy-panel .eyebrow, .anatomy-panel>h1, .anatomy-panel>.subheading { display: none; }
  .anatomy-panel input[type=search] { font-size: 16px; min-height: 48px; margin-bottom: 17px; }
  .toggles { grid-template-columns: 1fr 1fr; gap: 6px 10px; margin: 10px 0; }
  .toggle { min-height: 44px; font-size: 12px; }
  .toggle input { width: 20px; height: 20px; }
  .taxonomy-note { font-size: 10px; margin-bottom: 13px; }
  .list-heading { padding: 12px 0; font-size: 11px; }
  .structure-list { flex: 1; min-height: 120px; max-height: 34dvh; overflow: auto; margin: 0 -5px; padding-bottom: 4px; }
  .structure-row { min-height: 52px; font-size: 13px; padding: 11px 8px; }
  .structure-row small { font-size: 11px; }
  .selected-title { font-size: 21px; }
  .selection-detail { padding-bottom: 18px; }
  .selection-detail .eyebrow { font-size: 9px; }
  .structure-meta { font-size: 11px; }
  .selection-actions { gap: 8px; margin: 16px 0 20px; }
  .selection-actions button { min-height: 44px; font-size: 12px; padding: 10px; flex: 1 1 42%; }
  .selection-empty { display: none; }
  .empty-state { font-size: 13px; padding: 18px 5px; }
  input, textarea, input[type=date] { font-size: 16px; min-height: 46px; padding: 11px; }
  input[type=range] { min-height: 44px; }
  .field-label, .pain-header { font-size: 12px; }
  .pain-value { font-size: 20px; }
  .range-labels { font-size: 10px; margin-bottom: 20px; }
  .primary-button { min-height: 48px; font-size: 14px; padding: 13px; }
  .form-message { font-size: 12px; }
  .history-heading h2 { font-size: 16px; }
  .date-filters { gap: 8px; }
  .date-filters input { font-size: 16px; padding: 10px 5px; }
  .history-list { max-height: none; overflow: visible; }
  .record-item { padding: 17px 0; }
  .record-date { font-size: 12px; }
  .record-intensity { font-size: 14px; }
  .record-structure { font-size: 14px; min-height: 44px; padding: 8px 0; }
  .record-note { font-size: 14px; }
  .record-actions { gap: 12px; }
  .record-actions button { min-height: 44px; min-width: 75px; font-size: 12px; padding: 8px 10px; background: #f1f7f4; border-radius: 8px; }
  .delete-confirm { font-size: 12px; padding: 14px; }
  .medical-note { font-size: 11px; padding: 20px 0 4px; }
  .auth-backdrop { align-items: center; padding: 12px; }
  .auth-dialog { padding: 26px 22px; max-height: calc(var(--app-height, 100dvh) - 24px); border-radius: 18px; }
  .auth-dialog h2 { font-size: 21px; }
  .auth-dialog .subheading { font-size: 12px; }
  .auth-dialog>button:last-child { min-height: 44px; font-size: 13px; }
  .toast { bottom: calc(92px + env(safe-area-inset-bottom)); font-size: 13px; width: max-content; max-width: calc(100% - 32px); padding: 13px 17px; }
}
@media (max-height: 500px) {
  .atlas-header { height: calc(52px + env(safe-area-inset-top)); }
  .brand small { display: none; }
  .viewport { top: calc(52px + env(safe-area-inset-top)); bottom: calc(66px + env(safe-area-inset-bottom)); }
  .viewport-top, .load-status.loaded, .viewport-instructions, .orientation { display: none; }
  .view-controls { top: 8px; left: 2px; transform: none; display: grid; grid-template-columns: 1fr; padding: 2px; gap: 2px; }
  .view-controls button { min-height: 44px; min-width: 80px; padding: 7px; font-size: 10px; }
  .selection-chip { bottom: 9px; left: auto; right: 4px; transform: none; width: 205px; min-width: 0; max-width: 38%; font-size: 10px; padding: 7px 9px; }
  .mobile-nav { height: calc(66px + env(safe-area-inset-bottom)); padding-top: 4px; padding-bottom: calc(4px + env(safe-area-inset-bottom)); }
  .mobile-nav-item { min-height: 52px; gap: 2px; }
  .mobile-nav-item strong { font-size: 13px; }
  .panel { bottom: calc(72px + env(safe-area-inset-bottom)); max-height: calc(var(--app-height, 100dvh) - 130px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
  .sheet-header { min-height: 54px; margin-bottom: 12px; }
  .sheet-scrim { top: calc(52px + env(safe-area-inset-top)); bottom: calc(66px + env(safe-area-inset-bottom)); }
  .anatomy-panel .section-title, .anatomy-panel .taxonomy-note { display: none; }
  .toggles { gap: 2px 8px; margin: 4px 0; }
  .structure-list { max-height: 40dvh; }
  .auth-backdrop { align-items: flex-start; }
}
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; transition: none !important; } }
.header-actions { display:flex; align-items:center; gap:6px; }
.language-button { min-height:44px; padding:8px 10px; font-size:11px; background:#fff; color:#4f716e; }
.explorer-tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin:0 0 16px; }
.explorer-tabs button { min-height:44px; font-size:13px; padding:8px 4px; background:#f6f9f9; border-color:transparent; }
.explorer-tabs button[aria-selected=true] { background:#eaf5ef; color:#246f60; border-color:#c5e0d2; }
.anatomy-panel:not([data-explorer-tab=structures]) .toggles,
.anatomy-panel:not([data-explorer-tab=structures]) .section-title,
.anatomy-panel:not([data-explorer-tab=structures]) .taxonomy-note { display:none; }
.learning-detail:empty { display:none; }
.learning-detail { padding:16px 0 18px; border-bottom:1px solid var(--line); margin-bottom:14px; }
.learning-detail h2 { margin-bottom:10px; font-size:20px; }
.learning-detail h3 { margin:18px 0 9px; font-size:13px; font-weight:600; }
.learning-detail p { font-size:13px; line-height:1.8; color:#607a84; }
.learning-detail .coverage { display:block; margin:14px 0; font-size:13px; color:#277969; }
.learning-detail .coverage-missing { color:#9c6a44; font-size:12px; padding:3px 0; }
.context-notice { background:#f8f7ef; border-radius:9px; padding:12px; margin:10px 0; }
.source-link { display:block; min-height:44px; padding:11px 0; color:#277867; font-size:12px; line-height:1.7; overflow-wrap:anywhere; }
.learning-row { display:flex; flex-direction:column; gap:7px; min-height:72px; width:100%; text-align:left; margin:5px 0; padding:14px 12px; border:1px solid #e3ebea; background:white; }
.learning-row strong { color:#355c63; font-size:14px; font-weight:600; }
.learning-row>span { font-size:12px; color:#7a8d94; line-height:1.6; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.related-groups { font-size:12px; color:#527e73; padding:10px 0; line-height:1.7; }
.group-actions { display:none; position:absolute; left:50%; transform:translateX(-50%); bottom:48px; gap:8px; white-space:nowrap; }
.group-actions button { min-height:44px; font-size:12px; padding:10px 14px; background:#fff; border-color:#cddfd9; }
.viewport[data-group-active=true] .selection-chip { bottom:107px; }
.brand { font-size:10px; letter-spacing:.5px; }
.auth-button { max-width:114px; }
.atlas-header { padding-left:12px; padding-right:12px; }
.viewport-top { display:none; }
.load-status.loaded { display:none; }
.view-controls { top:8px; }
.selection-chip { bottom:40px; max-height:none; font-size:11px; max-width:min(430px,calc(100% - 12px)); }
.viewport-instructions { bottom:7px; font-size:9px; }
@media (min-width:1025px) {
  .atlas-header { padding:0 24px; }
  .brand { font-size:13px; }
  .language-button { font-size:12px; }
  .auth-button { max-width:230px; }
  .panel { bottom:98px; max-height:calc(var(--app-height,100dvh) - 180px); }
  .anatomy-panel { width:470px; left:22px; right:auto; }
  .record-panel { width:400px; right:22px; left:auto; }
  .mobile-nav { width:360px; height:70px; left:50%; right:auto; transform:translateX(-50%); bottom:12px; border:1px solid #dce7e3; border-radius:17px; padding:5px; box-shadow:0 8px 30px #27473c0c; }
  .mobile-nav-item { min-height:58px; }
  .viewport { bottom:90px; }
  .sheet-scrim { bottom:90px; }
}
@media (max-height:500px) {
  .view-controls { top:8px; }
  .viewport[data-group-active=true] .selection-chip { bottom:67px; max-width:210px; right:6px; }
  .group-actions { left:auto; right:6px; bottom:10px; transform:none; }
  .group-actions button { font-size:10px; padding:8px; }
  .selection-chip { bottom:9px; font-size:10px; }
  .viewport-instructions { display:none; }
}

/* 边缘浮层保留完整取景。 / Edge overlays preserve full framing. */
.view-controls { top:8px; left:2px; transform:none; display:grid; grid-template-columns:1fr; padding:3px; gap:3px; max-width:78px; }
.view-controls button { min-height:44px; min-width:64px; padding:8px 7px; font-size:10px; }
.viewport-instructions, .orientation { display:none; }
.selection-chip { display:none; top:8px; bottom:auto; left:auto; right:4px; transform:none; width:max-content; min-width:0; max-width:36%; max-height:77px; overflow:hidden; font-size:10px; line-height:1.5; text-align:right; padding:6px 8px; background:#ffffffdc; }
.atlas-app:has(.structure-row.selected) .selection-chip, .viewport[data-group-active=true] .selection-chip { display:block; }
.viewport[data-group-active=true] .selection-chip { top:8px; bottom:auto; }
.group-actions { top:96px; bottom:auto; left:auto; right:4px; transform:none; flex-direction:column; max-width:34%; gap:5px; white-space:normal; }
.group-actions button { min-height:44px; padding:8px; font-size:10px; }
.load-status { top:50%; }

.motion-controls { position:absolute; top:auto; bottom:6px; left:2px; width:112px; padding:8px; border:1px solid #d7e4df; border-radius:11px; background:#ffffffed; max-height:calc(100% - 226px); overflow:auto; pointer-events:auto; }
.motion-notice { color:#6e827a; font-size:10px; line-height:1.5; margin-bottom:8px; }
.motion-controls button { width:100%; min-height:44px; font-size:11px; padding:8px; }
.motion-play { color:#246f60; background:#edf6f0; border-color:#c8dfd1; }
.motion-progress { display:grid; grid-template-columns:1fr auto; align-items:center; gap:4px; font-size:10px; color:#71887f; margin:9px 0; }
.motion-progress input { grid-column:1 / -1; min-height:44px; height:44px; padding:0; }
.motion-value { font-variant-numeric:tabular-nums; }
.motion-rest { color:#5f7870; background:#f7faf8; font-size:10px!important; }
@media(max-height:500px) { .motion-controls {top:8px;bottom:auto;left:90px;width:172px;max-height:calc(100% - 16px);} }
`;
