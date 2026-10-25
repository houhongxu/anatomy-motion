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
const sides: Record<string, string> = {
  left: "左侧 Left",
  right: "右侧 Right",
  midline: "中线 Midline",
};
const kinds: Record<string, string> = {
  muscle: "肌肉 Muscle",
  tendon: "肌腱 Tendon",
  bone: "骨骼 Bone",
};
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
function title(s: Structure): string {
  return s.nameZh ? `${s.nameZh} · ${s.nameEn || s.name}` : s.name;
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
  });
  let data: any = {};
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) {
    const e = new Error(
      data.error?.message || `请求失败 / Request failed (${r.status})`,
    );
    (e as any).status = r.status;
    throw e;
  }
  return data;
}
/** Cocos 负责三维场景；DOM 提供无障碍表单。 / Cocos renders the scene; DOM provides accessible forms. */
@ccclass("AtlasBootstrap")
export class AtlasBootstrap extends Component {
  @property(Material)
  tissueMaterial: Material | null = null;
  private camera!: Camera;
  private keyLight!: Node;
  private renderAspect = 1;
  private parts: Part[] = [];
  private selected: Part | null = null;
  private hidden = new Set<string>();
  private isolated: string | null = null;
  private enabledLayers = new Set(["superficial", "deep", "tendon", "bone"]);
  private target = new Vec3(0, 0, 0);
  private yaw = 0;
  private pitch = 0.04;
  private distance = 2.65;
  private overlay!: HTMLElement;
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
    this.loadUser();
  }
  private setupScene() {
    const c = new Node("Atlas Camera");
    this.node.addChild(c);
    this.camera = c.addComponent(Camera);
    this.camera.near = 0.01;
    this.camera.far = 30;
    this.camera.fov = 39;
    this.camera.fovAxis = Camera.FOVAxis.VERTICAL;
    this.camera.clearColor = new Color(10, 17, 28, 255);
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
    document.title = "Anatomy Motion · 解剖与疼痛记录";
    document.documentElement.lang = "zh-CN";
    const style = el("style");
    style.textContent = STYLE;
    document.head.append(style);
    this.cleanup.push(() => style.remove());
    this.overlay = el("div", "atlas-app");
    this.overlay.dataset.testid = "atlas-app";
    document.body.append(this.overlay);
    const header = el("header", "atlas-header"),
      brand = el("div", "brand");
    brand.append(
      el("span", "brand-mark", "A"),
      el("div", "", "ANATOMY / MOTION"),
    );
    brand.lastElementChild?.append(el("small", "", "身体图谱 · BODY ATLAS"));
    const nav = el("div", "header-nav");
    nav.append(
      el("span", "nav-active", "交互图谱 / Atlas"),
      el("span", "nav-muted", "动作 · 经络 / P1 规划"),
    );
    this.authButton = button(
      "登录 / Sign in",
      () => (this.user ? this.logout() : this.openAuth()),
      "auth-button",
    );
    this.authButton.dataset.testid = "auth-button";
    header.append(brand, nav, this.authButton);
    const left = el("aside", "panel anatomy-panel");
    left.append(
      el("div", "eyebrow", "EXPLORE THE HUMAN BODY"),
      el("h1", "", "身体结构"),
      el("p", "subheading", "Anatomical explorer"),
    );
    const search = input("search", "", "structure-search");
    search.placeholder = "搜索名称 / Search structures";
    search.setAttribute("aria-label", "搜索结构 / Search structures");
    search.addEventListener("input", () => {
      this.search = search.value.toLowerCase();
      this.renderList();
    });
    left.append(search);
    const layerTitle = el("div", "section-title", "显示组织 / VISIBLE TISSUES"),
      toggles = el("div", "toggles");
    for (const [key, label] of [
      ["superficial", "浅层肌肉 / Surface"],
      ["deep", "深层肌肉 / Deep"],
      ["tendon", "肌腱 / Tendons"],
      ["bone", "骨骼 / Bones"],
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
    const disclaimer = el(
      "p",
      "taxonomy-note",
      "层级用于显示筛选，未经临床验证。\nDisplay layers are not clinically validated.",
    );
    left.append(disclaimer);
    const listHead = el("div", "list-heading");
    this.count = el("span", "muted", "0");
    listHead.append(el("span", "", "结构目录 / STRUCTURES"), this.count);
    this.list = el("div", "structure-list");
    this.list.dataset.testid = "structure-list";
    left.append(listHead, this.list);
    const viewport = el("main", "viewport");
    viewport.setAttribute("aria-label", "三维解剖视图 / 3D anatomy viewport");
    viewport.dataset.testid = "viewport";
    const viewportTop = el("div", "viewport-top");
    viewportTop.append(
      el("span", "live-dot", "●"),
      el("span", "", "三维解剖 / 3D ATLAS"),
      el("span", "model-badge", "BODYPARTS3D"),
    );
    this.status = el(
      "div",
      "load-status",
      "正在加载真实解剖模型… / Loading anatomy…",
    );
    this.status.setAttribute("role", "status");
    const controls = el("div", "view-controls");
    for (const [label, fn] of [
      ["正面 / Front", () => this.preset(0)],
      ["背面 / Back", () => this.preset(Math.PI)],
      ["侧面 / Side", () => this.preset(Math.PI / 2)],
      ["适应 / Fit", () => this.fit()],
    ] as [string, () => void][]) {
      const b = button(label, fn);
      if (label !== "适应 / Fit") {
        b.dataset.viewYaw = String(
          label === "正面 / Front"
            ? 0
            : label === "背面 / Back"
              ? Math.PI
              : Math.PI / 2,
        );
        b.setAttribute("aria-pressed", String(label === "正面 / Front"));
      }
      controls.append(b);
    }
    const gizmo = el("div", "orientation", "Y ↑\nZ ⊙  X →");
    this.selectionChip = el(
      "div",
      "selection-chip",
      "点击模型中的肌肉或从目录选择\nSelect a structure to explore",
    );
    const instructions = el(
      "div",
      "viewport-instructions",
      "拖动旋转 · 滚轮缩放 · 右键 / 双指平移\nDrag to rotate · Scroll to zoom · Right drag / two fingers to pan",
    );
    viewport.append(
      viewportTop,
      this.status,
      controls,
      gizmo,
      this.selectionChip,
      instructions,
    );
    const right = el("aside", "panel record-panel");
    this.detail = el("section", "selection-detail");
    right.append(this.detail);
    const historyTitle = el("div", "history-heading");
    historyTitle.append(
      el("h2", "", "我的记录 / Journal"),
      el("span", "private-tag", "私密 / PRIVATE"),
    );
    right.append(historyTitle);
    const dateFilters = el("div", "date-filters");
    const from = input("date", this.from, "history-from"),
      to = input("date", this.to, "history-to");
    from.setAttribute("aria-label", "记录起始日期 / From");
    to.setAttribute("aria-label", "记录结束日期 / To");
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
    right.append(
      this.history,
      el(
        "p",
        "medical-note",
        "仅用于身体学习与个人记录，不构成诊断或治疗建议。\nFor learning and personal tracking; not medical advice.",
      ),
    );
    const footer = el("footer", "atlas-footer");
    footer.append(
      el("span", "", "P0 / 交互解剖与疼痛日志"),
      el("span", "", "模型来源 / BodyParts3D · DBCLS · CC BY 4.0"),
    );
    this.toast = el("div", "toast");
    this.toast.setAttribute("role", "status");
    this.overlay.append(header, left, viewport, right, footer, this.toast);
    this.renderDetail();
    this.renderHistory();
  }
  private async load() {
    try {
      const manifest = await api<{
        structures: Structure[];
      }>("/models/manifest.json");
      if (!Array.isArray(manifest.structures) || !manifest.structures.length)
        throw new Error("模型清单为空 / Empty model manifest");
      let next = 0,
        done = 0;
      const total = manifest.structures.length;
      const worker = async () => {
        while (next < total) {
          const info = manifest.structures[next++];
          try {
            const file = new URL(
              info.file,
              new URL("/models/", location.origin),
            );
            if (file.origin !== location.origin)
              throw new Error("模型必须同源 / Models must be same origin");
            const data = await api<MeshData>(file.pathname);
            this.addPart(info, data);
          } catch (e) {
            this.loadErrors++;
            console.warn("Model load failed:", info.id, e);
          }
          done++;
          this.status.textContent = `加载解剖结构 / Loading anatomy ${done} / ${total}`;
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if (!this.parts.length)
        throw new Error("没有可显示的解剖模型 / No anatomy meshes loaded");
      this.parts.sort((a, b) =>
        title(a.info).localeCompare(title(b.info), "zh-CN"),
      );
      this.renderList();
      this.applyVisibility();
      this.fit();
      this.status.textContent = this.loadErrors
        ? `${this.loadErrors} 个结构加载失败，请刷新重试 / Structures failed to load`
        : `${this.parts.length} 个真实解剖结构 / anatomical structures`;
      this.status.classList.add("loaded");
      if (this.records.length) this.renderHistory();
    } catch (e) {
      this.status.classList.add("failed");
      this.status.replaceChildren(
        el("span", "", (e as Error).message),
        button("重新加载 / Retry", () => location.reload()),
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
      throw new Error("基础解剖材质未加载 / Anatomy material is not loaded");
    const mat = new Material();
    mat.copy(this.tissueMaterial);
    mat.setProperty("roughness", 0.68);
    mat.setProperty("metallic", 0.02);
    renderer.setSharedMaterial(mat, 0);
    const part = {
      info,
      data,
      node,
      renderer,
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
    const mat = part.renderer.getSharedMaterial(0);
    if (!mat) return;
    const selected = this.selected === part;
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
    mat.setProperty("mainColor", color);
    mat.setProperty(
      "emissive",
      selected ? new Color(10, 67, 63) : new Color(0, 0, 0),
    );
  }
  private visible(part: Part) {
    const key = part.info.kind === "muscle" ? part.info.layer : part.info.kind;
    return (
      this.enabledLayers.has(key) &&
      !this.hidden.has(part.info.id) &&
      (!this.isolated || this.isolated === part.info.id)
    );
  }
  private applyVisibility() {
    for (const p of this.parts) p.node.active = this.visible(p);
    this.renderList();
    this.updateSelectionChip();
  }
  private renderList() {
    this.list.replaceChildren();
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
        el("small", "", sides[p.info.side]?.split(" ")[0] || p.info.side),
      );
      if (!this.visible(p)) b.classList.add("is-hidden");
      this.list.append(b);
    }
    if (!filtered.length)
      this.list.append(
        el(
          "div",
          "empty-state",
          this.parts.length
            ? "没有匹配的结构 / No matches"
            : "模型加载后显示目录 / Loading structures",
        ),
      );
  }
  private select(p: Part, reveal = false) {
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
  }
  private updateSelectionChip() {
    this.selectionChip.textContent = this.selected
      ? `${title(this.selected.info)}\n${sides[this.selected.info.side]} · ${kinds[this.selected.info.kind]}${this.visible(this.selected) ? "" : " · 已隐藏 / Hidden"}`
      : "点击模型中的肌肉或从目录选择\nSelect a structure to explore";
  }
  private renderDetail() {
    this.detail.replaceChildren(
      el("div", "eyebrow", "STRUCTURE & PAIN TRACKING"),
    );
    if (!this.selected) {
      this.detail.append(
        el("h2", "", "了解你的身体"),
        el("p", "subheading", "Know your body, track how you feel."),
        el("div", "selection-empty", "◎"),
        el(
          "p",
          "empty-state",
          "选择肌肉或肌腱，记录今天的身体感受。\nSelect a muscle or tendon to begin.",
        ),
      );
      return;
    }
    const p = this.selected;
    this.detail.append(
      el("h2", "selected-title", title(p.info)),
      el(
        "p",
        "structure-meta",
        `${sides[p.info.side]} · ${kinds[p.info.kind]} · ${p.info.id}`,
      ),
    );
    const actions = el("div", "selection-actions");
    actions.append(
      button("聚焦 / Focus", () => this.focus(p)),
      button("隐藏 / Hide", () => {
        this.hidden.add(p.info.id);
        this.applyVisibility();
      }),
      button(
        this.isolated ? "显示全部 / Show all" : "单独显示 / Isolate",
        () => {
          this.isolated = this.isolated ? null : p.info.id;
          this.applyVisibility();
          this.renderDetail();
        },
      ),
      button("重置 / Reset", () => this.resetVisibility()),
    );
    this.detail.append(actions);
    if (!canRecord(p.info.kind)) {
      this.detail.append(
        el(
          "p",
          "empty-state",
          "骨骼供定位参考。疼痛记录适用于肌肉与肌腱。\nRecords are available for muscles and tendons.",
        ),
      );
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
    painHeader.append(el("span", "", "疼痛强度 / Intensity"), this.painLabel);
    this.noteInput = el("textarea");
    this.noteInput.dataset.testid = "record-note";
    this.noteInput.rows = 2;
    this.noteInput.maxLength = 2000;
    this.noteInput.placeholder = "何时出现？有什么感受？ / Add a short note";
    this.formMessage = el("p", "form-message");
    this.formMessage.setAttribute("role", "status");
    this.saveButton = el(
      "button",
      "primary-button",
      this.user
        ? "保存当天记录 / Save record"
        : "登录后记录 / Sign in to record",
    );
    this.saveButton.type = "submit";
    this.saveButton.dataset.testid = "save-record";
    form.append(
      field("日期 / Date", this.dateInput),
      painHeader,
      this.painInput,
      el(
        "div",
        "range-labels",
        "0 无疼痛 / None                         10 剧烈 / Severe",
      ),
      field("备注 / Notes", this.noteInput),
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
      this.authButton.textContent = `${this.user.username} · 退出 / Sign out`;
      await this.loadRecords();
    } catch (e) {
      if ((e as any).status !== 401)
        this.notify("账户状态读取失败 / Could not load account");
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
      this.authButton.textContent = "登录 / Sign in";
      this.parts.forEach((p) => this.colorPart(p));
      this.renderList();
      this.renderDetail();
      this.renderHistory();
      this.notify("已退出 / Signed out");
    } catch (e) {
      this.notify((e as Error).message);
    }
  }
  private openAuth() {
    if (document.querySelector(".auth-backdrop")) return;
    const backdrop = el("div", "auth-backdrop");
    const dialog = el("form", "auth-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "账户登录 / Account sign in");
    const heading = el("h2", "", "欢迎回来 / Welcome back");
    const modeButton = button("创建账户 / Create account", () => {
      register = !register;
      heading.textContent = register
        ? "创建账户 / Create account"
        : "欢迎回来 / Welcome back";
      submit.textContent = register ? "注册 / Register" : "登录 / Sign in";
      modeButton.textContent = register
        ? "已有账户 / Sign in instead"
        : "创建账户 / Create account";
      password.autocomplete = register ? "new-password" : "current-password";
      message.textContent = "";
    });
    let register = false;
    const username = input("text", "", "auth-username");
    username.required = true;
    username.minLength = 3;
    username.maxLength = 32;
    username.pattern = "[A-Za-z0-9_]{3,32}";
    username.title =
      "3–32 位字母、数字或下划线 / 3–32 letters, digits or underscores";
    username.autocomplete = "username";
    const password = input("password", "", "auth-password");
    password.required = true;
    password.minLength = 10;
    password.maxLength = 128;
    password.autocomplete = "current-password";
    const message = el("p", "form-message");
    message.setAttribute("role", "alert");
    const submit = el("button", "primary-button", "登录 / Sign in");
    submit.type = "submit";
    const close = button("×", () => backdrop.remove(), "dialog-close");
    close.setAttribute("aria-label", "关闭 / Close");
    dialog.append(
      close,
      el("div", "eyebrow", "YOUR PRIVATE BODY JOURNAL"),
      heading,
      el(
        "p",
        "subheading",
        "保存每日记录，回顾身体变化。\nSave your daily observations securely.",
      ),
      field("用户名 / Username", username),
      field("密码 / Password · 10–128 位 / 10–128 characters", password),
      message,
      submit,
      modeButton,
    );
    dialog.addEventListener("submit", async (e) => {
      e.preventDefault();
      submit.disabled = true;
      message.textContent = "正在处理 / Please wait…";
      try {
        const d = await api<{
          user: User;
        }>(`/api/auth/${register ? "register" : "login"}`, "POST", {
          username: username.value.trim(),
          password: password.value,
        });
        this.user = d.user;
        backdrop.remove();
        this.authButton.textContent = `${d.user.username} · 退出 / Sign out`;
        this.renderDetail();
        await this.loadRecords();
        this.notify("已登录 / Signed in");
      } catch (e) {
        message.textContent = (e as Error).message;
      } finally {
        submit.disabled = false;
      }
    });
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
      this.history.replaceChildren(
        el(
          "p",
          "form-message",
          "请选择有效日期区间 / Choose a valid date range",
        ),
      );
      return;
    }
    this.history.replaceChildren(
      el("p", "empty-state", "正在读取记录 / Loading records…"),
    );
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
        el("p", "form-message", (e as Error).message),
        button("重试 / Retry", () => this.loadRecords()),
      );
    }
  }
  private renderHistory() {
    this.history.replaceChildren();
    if (!this.user) {
      this.history.append(
        el(
          "div",
          "empty-state",
          "登录以查看私人历史记录。\nSign in to see your private journal.",
        ),
      );
      return;
    }
    if (!this.records.length) {
      this.history.append(
        el(
          "div",
          "empty-state",
          "这个日期区间还没有记录。\nNo records in this date range.",
        ),
      );
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
      row.append(top, choose, el("small", "muted", sides[r.side] || r.side));
      if (r.note) row.append(el("p", "record-note", r.note));
      const actions = el("div", "record-actions");
      actions.append(
        button("编辑 / Edit", () => {
          if (!p) {
            this.notify("对应模型尚未加载 / Model not loaded");
            return;
          }
          this.select(p, true);
          this.editing = r.id;
          this.dateInput.value = r.date;
          this.painInput.value = String(r.intensity);
          this.painLabel.textContent = `${r.intensity} / 10`;
          this.noteInput.value = r.note;
          this.saveButton.textContent = "保存修改 / Save changes";
          this.detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }),
        button("删除 / Delete", () => this.requestDelete(r, row)),
      );
      row.append(actions);
      this.history.append(row);
    }
  }
  private async saveRecord() {
    if (!this.selected || !this.user) return;
    this.saveButton.disabled = true;
    this.formMessage.textContent = "正在保存 / Saving…";
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
      this.formMessage.textContent = "已保存 / Saved";
      this.saveButton.textContent = "保存当天记录 / Save record";
      await this.loadRecords();
      this.notify("疼痛记录已保存 / Record saved");
    } catch (e) {
      this.formMessage.textContent = (e as Error).message;
    } finally {
      this.saveButton.disabled = false;
    }
  }
  private requestDelete(r: PainRecord, row: HTMLElement) {
    if (row.querySelector(".delete-confirm")) return;
    const group = el("div", "delete-confirm");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", "确认删除记录 / Confirm record deletion");
    const question = el(
      "p",
      "",
      `确定删除 ${r.date} 的记录？ / Delete this record?`,
    );
    const message = el("p", "form-message");
    message.setAttribute("role", "alert");
    const actions = el("div", "record-actions");
    const cancel = button("取消 / Cancel", () => {
      group.remove();
      row
        .querySelector<HTMLButtonElement>(".record-actions button:last-child")
        ?.focus();
    });
    const confirmButton = button("确认删除 / Confirm delete", async () => {
      confirmButton.disabled = true;
      cancel.disabled = true;
      message.textContent = "正在删除 / Deleting…";
      try {
        await this.deleteRecord(r);
      } catch (e) {
        message.textContent = (e as Error).message;
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
    this.notify("记录已删除 / Record deleted");
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
    this.hidden.clear();
    this.isolated = null;
    this.enabledLayers = new Set(["superficial", "deep", "tendon", "bone"]);
    for (const c of this.overlay.querySelectorAll<HTMLInputElement>(
      "[data-layer]",
    ))
      c.checked = true;
    this.applyVisibility();
    this.renderDetail();
  }
  private pick(clientX: number, clientY: number) {
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
      pinch = 0;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      viewport.setPointerCapture(e.pointerId);
      points.set(e.pointerId, { x: e.clientX, y: e.clientY });
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      right = e.button === 2 || e.shiftKey;
      if (points.size === 2) {
        const p = [...points.values()];
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
        const p = [...points.values()],
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
      if (!moved && !right && was === 1 && e.type !== "pointercancel")
        this.pick(e.clientX, e.clientY);
      if (was > 1) moved = true;
      pinch = 0;
    };
    const onWheel = (e: WheelEvent) => {
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
    const resize = () => {
      screen.windowSize = new Size(
        Math.round(window.innerWidth * screen.devicePixelRatio),
        Math.round(window.innerHeight * screen.devicePixelRatio),
      );
      view.setDesignResolutionSize(
        window.innerWidth,
        window.innerHeight,
        ResolutionPolicy.SHOW_ALL,
      );
      const canvas = game.canvas!.getBoundingClientRect();
      const r = viewport.getBoundingClientRect();
      const controls = this.overlay
        .querySelector<HTMLElement>(".view-controls")!
        .getBoundingClientRect();
      const chip = this.selectionChip.getBoundingClientRect();
      const left = r.left + 6,
        right = r.right - 6;
      const top = controls.bottom + 10,
        bottom = Math.max(top + 100, chip.top - 12);
      this.renderAspect = (right - left) / (bottom - top);
      this.camera.rect = new Rect(
        (left - canvas.left) / canvas.width,
        (canvas.bottom - bottom) / canvas.height,
        (right - left) / canvas.width,
        (bottom - top) / canvas.height,
      );
      if (this.parts.length) this.fit();
      else this.updateCamera();
    };
    window.addEventListener("resize", resize);
    this.cleanup.push(() => window.removeEventListener("resize", resize));
    resize();
  }
  onDestroy() {
    for (const fn of this.cleanup) fn();
    window.clearTimeout(this.toastTimer);
    this.overlay?.remove();
    for (const p of this.parts) {
      p.renderer.getSharedMaterial(0)?.destroy();
      p.renderer.mesh?.destroy();
    }
  }
}
const STYLE = `
:root{color-scheme:dark;--bg:#0a111c;--panel:rgba(17,27,41,.96);--line:#263344;--ink:#e8eef4;--muted:#91a1b2;--teal:#58d8c1;--cyan:#8be3e1}*{box-sizing:border-box}html,body{margin:0!important;width:100%;height:100%;overflow:hidden;background:var(--bg)!important}body{font-family:Inter,"Segoe UI","Microsoft YaHei",sans-serif!important;color:var(--ink);font-size:13px}#GameDiv,#Cocos3dGameContainer{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;transform:none!important}#GameCanvas{width:100%!important;height:100%!important;display:block}.atlas-app{position:fixed;inset:0;z-index:10;pointer-events:none;background:radial-gradient(ellipse at 49% 44%,transparent 15%,rgba(4,10,17,.15) 75%)}button,input,textarea{font:inherit}button{cursor:pointer;color:var(--ink);border:1px solid var(--line);background:#152336;border-radius:7px;padding:8px 10px;transition:background .18s,border-color .18s}button:hover{background:#203449;border-color:#4b6b7a}button:disabled{opacity:.5;cursor:wait}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--teal);outline-offset:3px}input,textarea{color:var(--ink);background:#0d1826;border:1px solid var(--line);border-radius:7px;padding:9px 10px;min-width:0;width:100%;accent-color:var(--teal)}input[type=date]{padding:7px 5px;font-size:11px}input[type=checkbox]{width:15px;height:15px;margin:0}input[type=range]{padding:0;border:0;height:20px}textarea{resize:vertical;min-height:55px;max-height:120px}h1,h2,p{margin:0}h1{font-size:27px;line-height:1.4;letter-spacing:1px}h2{font-size:18px;line-height:1.5}.atlas-header{height:76px;position:absolute;inset:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(9,17,28,.96);border-bottom:1px solid var(--line);pointer-events:auto}.brand{display:flex;align-items:center;gap:12px;font-size:15px;font-weight:700;letter-spacing:2px}.brand-mark{width:35px;height:40px;display:grid;place-items:center;border:1px solid #64caba;color:var(--teal);border-radius:10px;font-size:24px;font-weight:500}.brand small{display:block;color:var(--muted);letter-spacing:2px;font-size:9px;margin-top:5px;font-weight:400}.header-nav{display:flex;gap:29px;font-size:12px}.nav-active{color:var(--teal)}.nav-muted{color:#6f8296}.auth-button{border-color:#356659;background:#142b2c;color:#99e7d8;font-size:12px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.panel{position:absolute;top:96px;bottom:48px;background:var(--panel);border:1px solid var(--line);border-radius:12px;pointer-events:auto;box-shadow:0 12px 40px #0002;overflow:hidden}.anatomy-panel{left:24px;width:250px;padding:22px 17px 0;display:flex;flex-direction:column}.eyebrow{font-size:9px;letter-spacing:1.8px;color:var(--teal);margin-bottom:9px;font-weight:600}.subheading{color:var(--muted);font-size:11px;line-height:1.8;margin:3px 0 17px;white-space:pre-line}.anatomy-panel input[type=search]{font-size:11px;padding:10px;margin-bottom:21px}.section-title,.list-heading{font-size:10px;letter-spacing:.5px;color:#a0adbc;font-weight:600}.toggles{display:grid;grid-template-columns:1fr;gap:11px;margin:13px 0 11px}.toggle{display:flex;align-items:center;gap:10px;cursor:pointer;font-size:11px}.taxonomy-note{font-size:9px;color:#748598;white-space:pre-line;line-height:1.6;margin-bottom:20px}.list-heading{display:flex;justify-content:space-between;padding:13px 0 10px;border-top:1px solid var(--line)}.structure-list{min-height:0;overflow:auto;margin:0 -8px;padding:0 4px 12px}.structure-row{display:flex;width:100%;align-items:center;gap:8px;padding:10px 7px;background:transparent;border:1px solid transparent;border-radius:6px;text-align:left;min-height:48px;font-size:11px}.structure-row.selected{background:#183d3c;border-color:#2a756a;color:#a2f2df}.structure-row.is-hidden{opacity:.5}.structure-row small{font-size:9px;flex-shrink:0;color:#91a1b2}.structure-name{flex:1;line-height:1.5;overflow-wrap:anywhere}.tissue-dot{width:6px;height:6px;background:#cb7b80;border-radius:50%;flex-shrink:0}.tissue-dot.tendon{background:#d1d9d1}.tissue-dot.bone{background:#cac0a7}.tissue-dot.recorded{box-shadow:0 0 0 3px #ed784844;background:#f08b56}.muted{color:var(--muted)}.viewport{position:absolute;top:76px;bottom:35px;left:290px;right:370px;pointer-events:auto;touch-action:none;cursor:grab}.viewport:active{cursor:grabbing}.viewport-top{display:flex;gap:8px;align-items:center;padding:24px 0;font-size:10px;letter-spacing:1px;color:#91a8b5;pointer-events:none}.live-dot{color:var(--teal);font-size:9px}.model-badge{border:1px solid #2a3b4d;color:#7f95a7;font-size:8px;border-radius:4px;padding:4px 5px;margin-left:auto;letter-spacing:.6px}.load-status{position:absolute;top:65px;left:0;right:0;text-align:center;color:#8ba9b8;font-size:11px;pointer-events:none}.load-status.loaded{opacity:.65;font-size:9px}.load-status.failed{pointer-events:auto;display:flex;flex-direction:column;gap:12px;align-items:center;color:#ffac9b;top:35%}.view-controls{display:flex;position:absolute;top:85px;left:50%;transform:translateX(-50%);gap:3px;white-space:nowrap;background:#111f2ebf;padding:4px;border:1px solid #26394b;border-radius:9px}.view-controls button{font-size:9px;padding:6px 8px;border:0;background:transparent;color:#abbecd}.view-controls button:hover{background:#24394b;color:#fff}.orientation{position:absolute;right:0;bottom:91px;font-size:11px;color:#7796a8;white-space:pre;text-align:center;line-height:2;pointer-events:none}.selection-chip{position:absolute;bottom:73px;left:50%;transform:translateX(-50%);max-width:100%;white-space:pre-line;text-align:center;color:#c6e8e4;font-size:11px;line-height:1.8;padding:10px 17px;background:#12232ac7;border:1px solid #2b4f54;border-radius:8px;pointer-events:none;min-width:220px}.viewport-instructions{position:absolute;bottom:18px;left:0;right:0;text-align:center;font-size:9px;color:#6c8294;line-height:1.8;white-space:pre-line;pointer-events:none}.record-panel{right:24px;width:326px;padding:20px 19px 0;overflow:auto}.selection-detail{padding-bottom:22px}.selected-title{font-size:17px;overflow-wrap:anywhere}.structure-meta{font-size:10px;color:var(--muted);line-height:1.7;margin-top:7px}.selection-actions{display:flex;flex-wrap:wrap;gap:5px;margin:14px 0 18px}.selection-actions button{padding:6px 7px;font-size:9px;background:#132435}.selection-empty{font-size:72px;color:#345a66;text-align:center;margin:28px 0 15px;font-weight:200}.empty-state{color:#8b9eaf;font-size:11px;line-height:1.9;white-space:pre-line;text-align:center;padding:18px 2px}.field{display:block;margin-bottom:12px}.field-label{display:block;color:#a1b0bf;font-size:10px;margin-bottom:7px}.pain-header{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#a1b0bf;margin:13px 0 7px}.pain-value{font-size:15px;color:var(--teal)}.range-labels{display:flex;justify-content:space-between;white-space:pre;font-size:8px;color:#72889b;margin:4px 0 17px}.primary-button{width:100%;background:#56cbb6;color:#082724;font-weight:700;border:1px solid #70ddc7;padding:11px;font-size:11px}.primary-button:hover{background:#74e0ca;border-color:#95f5df}.form-message{font-size:10px;line-height:1.7;color:#f0ae96;min-height:0;margin:6px 0 10px;overflow-wrap:anywhere}.form-message:empty{display:none}.history-heading{display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:20px 0 13px}.history-heading h2{font-size:14px}.private-tag{font-size:8px;color:#7f9aa9;border:1px solid #2b4252;padding:4px 5px;border-radius:4px}.date-filters{display:flex;align-items:center;gap:5px;color:#698093}.date-filters input{flex:1;width:0}.history-list{margin-top:12px}.record-item{padding:13px 0;border-bottom:1px solid #243344}.record-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.record-date{font-size:10px;color:#9cacbb}.record-intensity{font-size:11px;color:#e5a17c;background:#493226;padding:3px 7px;border-radius:4px}.record-structure{display:block;text-align:left;border:0;border-radius:0;background:transparent;padding:0;font-size:11px;line-height:1.5;color:#d2e0e8;margin-bottom:3px}.record-item small{font-size:9px}.record-note{font-size:11px;color:#92a5b6;line-height:1.7;margin:8px 0;overflow-wrap:anywhere;white-space:pre-wrap}.record-actions{display:flex;gap:12px;margin-top:8px}.record-actions button{border:0;background:transparent;font-size:9px;color:#75cabb;padding:1px 0}.medical-note{font-size:9px;line-height:1.7;color:#647c90;white-space:pre-line;padding:20px 0}.atlas-footer{display:flex;justify-content:space-between;position:absolute;bottom:0;height:30px;left:24px;right:24px;font-size:9px;color:#61788b;align-items:center;pointer-events:auto}.toast{position:absolute;bottom:50px;left:50%;transform:translateX(-50%) translateY(12px);padding:12px 20px;border:1px solid #327d6a;background:#12352f;color:#b4f3df;border-radius:8px;opacity:0;transition:.2s;pointer-events:none;max-width:90%;font-size:12px}.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}.auth-backdrop{position:absolute;inset:0;background:#030911b8;backdrop-filter:blur(7px);display:flex;justify-content:center;align-items:center;pointer-events:auto;padding:20px;z-index:30}.auth-dialog{position:relative;width:380px;max-width:100%;background:#142131;border:1px solid #34485a;padding:30px;border-radius:14px;box-shadow:0 30px 80px #0009}.auth-dialog>.primary-button{margin:8px 0 12px}.auth-dialog>button:last-child{width:100%;font-size:11px;border:0;background:transparent;color:#8ddcc9}.dialog-close{position:absolute;right:12px;top:10px;border:0;background:transparent;font-size:24px;color:#8ea5b7}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#334b5c;border-radius:3px}::-webkit-scrollbar-track{background:transparent}
@media(max-width:1100px) and (min-width:761px){.anatomy-panel{left:16px;width:216px;padding:18px 13px 0}.record-panel{right:16px;width:280px;padding:18px 14px 0}.viewport{left:245px;right:310px}.header-nav{gap:15px;font-size:10px}.brand{font-size:12px}.model-badge{display:none}.view-controls{gap:0}.view-controls button{font-size:8px;padding:6px}.record-panel .range-labels{font-size:7px}.structure-row{font-size:10px}}
@media(max-width:760px){html,body{overflow:auto!important}.atlas-app{overflow:auto;position:fixed;background:transparent;display:grid;grid-template-columns:1fr;grid-template-rows:65px 52vh auto auto 42px;gap:0}.atlas-header{position:relative;height:65px;padding:0 16px;grid-row:1}.brand{font-size:11px;gap:8px;letter-spacing:1px}.brand-mark{width:28px;height:33px;font-size:20px}.brand small{font-size:8px;letter-spacing:1px}.header-nav{display:none}.auth-button{font-size:10px;padding:8px;max-width:148px}.viewport{position:relative;top:auto;left:auto;right:auto;bottom:auto;grid-row:2;min-height:360px;margin:0 16px;background:linear-gradient(0deg,#0a111c 0%,transparent 22%)}.viewport-top{padding-top:17px;font-size:9px}.load-status{top:42px;font-size:9px}.view-controls{top:62px}.selection-chip{bottom:55px;font-size:10px;padding:7px 12px}.viewport-instructions{bottom:10px;font-size:8px}.orientation{bottom:75px;font-size:9px}.panel{position:relative;top:auto;bottom:auto;left:auto;right:auto;width:auto;margin:12px 16px;border-radius:10px}.anatomy-panel{grid-row:3;padding:17px 14px 0;max-height:365px}.anatomy-panel h1{font-size:20px}.anatomy-panel .eyebrow{font-size:8px;margin-bottom:3px}.anatomy-panel .subheading{margin-bottom:10px}.anatomy-panel input[type=search]{margin-bottom:12px}.toggles{grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.taxonomy-note{font-size:8px;margin-bottom:9px}.section-title{font-size:9px}.structure-list{max-height:135px}.structure-row{min-height:38px;padding:7px;font-size:11px}.record-panel{grid-row:4;padding:20px 18px 0;overflow:visible}.selected-title{font-size:20px}.selection-detail{padding-bottom:15px}.selection-empty{display:none}.record-panel .empty-state{padding:12px}.history-list{max-height:340px;overflow:auto}.range-labels{justify-content:space-between}.atlas-footer{position:relative;grid-row:5;left:auto;right:auto;bottom:auto;padding:0 16px;font-size:7px;gap:12px;height:42px}.auth-backdrop{position:fixed}.toast{position:fixed;bottom:20px;font-size:11px}.date-filters input{font-size:12px}.selection-actions button{font-size:10px}.pain-header,.field-label{font-size:11px}.primary-button{font-size:12px}}
.delete-confirm{margin-top:12px;border:1px solid #76554b;background:#372922;padding:11px;border-radius:7px;font-size:10px;line-height:1.7;color:#edbba4}.delete-confirm .record-actions{justify-content:flex-end;gap:15px}.delete-confirm .record-actions button:last-child{color:#ffa78e}.delete-confirm .form-message{margin-bottom:5px}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
`;
