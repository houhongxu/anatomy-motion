import type { Locale, Text } from "./types";
const words = {
  directory: ["学习目录", "Learning directory"],
  structureDirectory: ["肌肉/肌腱", "Muscles/tendons"],
  clearSelection: ["取消选择", "Clear selection"],
  restoreWholeBody: ["返回全身", "Restore whole body"],
  clickModelHint: [
    "点击人体模型中的肌肉或穴位，查看详情及有来源的关联项目。完整目录位于动作与病症。",
    "Select a muscle or acupoint on the model to view details and sourced associations. Find complete directories in Learn.",
  ],
  muscles: ["肌肉", "Muscles"],
  overlay: ["叠加", "Overlay"],
  layerSuperficial: ["浅层", "Superficial"],
  layerDeep: ["深层", "Deep"],
  layers: ["图层", "Layers"],
  skinOpacity: ["皮肤不透明度", "Skin opacity"],
  fitness: ["健身", "Fitness"],
  stretching: ["拉伸", "Stretching"],
  western: ["西医", "Western medicine"],
  tcm: ["中医", "Traditional Chinese medicine"],
  relatedLearning: ["关联动作与症状", "Related movements and symptoms"],
  relatedPoints: ["关联穴位", "Related acupoints"],
  noRelations: ["暂无有来源的关联", "No sourced associations yet"],
  traditionalNotice: [
    "传统理论关联，仅供学习，不构成诊断或治疗建议。",
    "Traditional associations for learning; not diagnosis or treatment advice.",
  ],
  backSelection: ["返回所选结构或穴位", "Back to selected structure or point"],
  brand: ["人体运动图谱", "Anatomy Motion"],
  atlas: ["人体图谱", "Atlas"],
  learning: ["动作与病症", "Learn"],
  records: ["个人记录", "Records"],
  acupuncture: ["经络穴位", "Acupoints"],
  explore: ["探索人体", "Explore anatomy"],
  subtitle: ["旋转 · 缩放 · 点选结构", "Rotate · Zoom · Select a structure"],
  openPanel: ["打开面板", "Open panel"],
  closePanel: ["收起面板", "Close panel"],
  language: ["切换为英文", "Switch to Chinese"],
  search: ["搜索名称", "Search names"],
  all: ["全部", "All"],
  groups: ["肌群", "Muscle groups"],
  tendons: ["肌腱", "Tendons"],
  superficial: ["浅层肌肉", "Superficial muscles"],
  deep: ["显示所选或本区域深层", "Show selected or regional deep muscles"],
  deepHint: [
    "全身默认保留浅层；选择深层结构或限定区域后按需加载。",
    "Whole-body browsing keeps superficial muscles; deep structures load only when selected or within a chosen region.",
  ],
  region: ["区域", "Region"],
  select: ["选择", "Select"],
  missing: ["源数据暂无此结构", "Unavailable in source data"],
  front: ["正面", "Front"],
  back: ["背面", "Back"],
  leftView: ["左侧", "Left"],
  rightView: ["右侧", "Right"],
  reset: ["重置视角", "Reset view"],
  loading: ["正在加载人体…", "Loading body…"],
  loadingStructures: ["按需加载结构", "Loading selected structures"],
  retry: ["重试", "Retry"],
  loadError: [
    "部分资源未能加载，请重试。",
    "Some resources could not load. Please retry.",
  ],
  networkError: [
    "连接失败，请检查网络后重试。",
    "Connection failed. Check your network and retry.",
  ],
  body: ["皮肤", "Skin"],
  points: ["穴位", "Points"],
  meridians: ["经络", "Meridians"],
  meridian: ["经络筛选", "Filter meridian"],
  source: ["资料来源", "Sources"],
  sourceModel: [
    "人体模型：BodyParts3D，生命科学数据库中心。CC BY 4.0 / CC BY-SA 2.1 JP。",
    "Body model: BodyParts3D, The Database Center for Life Science. CC BY 4.0 / CC BY-SA 2.1 JP.",
  ],
  sourceNotice: [
    "医学示意，未经临床审校。14 条经络、56 个代表穴位（含双侧），非完整医学图谱，不用于诊断或治疗。",
    "Illustrative and clinically unreviewed. 14 meridians and 56 representative point codes (including bilateral locations); not a complete medical atlas or a diagnostic or treatment tool.",
  ],
  unreviewed: ["未经临床审校", "Clinically unreviewed"],
  landmark: ["体表定位", "Surface landmark"],
  pages: ["参考页", "Reference pages"],
  exercises: ["动作", "Movements"],
  conditions: ["症状", "Symptoms"],
  affected: ["关联肌群", "Related muscles"],
  learningHint: [
    "点选条目高亮有来源的关联肌群和穴位；保留全身轮廓。",
    "Select an entry to highlight sourced muscle and acupoint associations within the whole-body context.",
  ],
  coveragePartial: [
    "部分覆盖：仅高亮当前图谱中可用的结构；缺失结构未显示。",
    "Partial coverage: only structures available in this atlas are highlighted; missing structures are not shown.",
  ],
  coverageMissing: ["暂无可用网格。", "No mesh is available."],
  coverageExcluded: [
    "未包含在当前图谱的结构",
    "Structures outside the current atlas",
  ],
  noGeometry: [
    "本条目关联结构暂无可用模型。",
    "No available geometry for this entry.",
  ],
  login: ["登录", "Sign in"],
  register: ["注册", "Register"],
  logout: ["退出登录", "Sign out"],
  username: ["用户名", "Username"],
  password: ["密码", "Password"],
  credentialsHint: [
    "用户名：3–32 个字母、数字或下划线；密码：10–128 个字符。",
    "Username: 3–32 letters, digits or underscores. Password: 10–128 characters.",
  ],
  accountHint: [
    "登录后可保存并查看你的个人酸痛记录。",
    "Sign in to save and review your personal soreness records.",
  ],
  structure: ["结构", "Structure"],
  side: ["侧别", "Side"],
  left: ["左侧", "Left"],
  right: ["右侧", "Right"],
  midline: ["中线", "Midline"],
  date: ["日期", "Date"],
  intensity: ["酸痛程度", "Soreness intensity"],
  note: ["备注", "Notes"],
  save: ["保存记录", "Save record"],
  saving: ["保存中…", "Saving…"],
  cancel: ["取消", "Cancel"],
  edit: ["编辑", "Edit"],
  delete: ["删除", "Delete"],
  confirmDelete: [
    "确认删除这条记录？此操作无法撤销。",
    "Delete this record? This cannot be undone.",
  ],
  deleteRecord: ["删除记录", "Delete record"],
  saved: ["记录已保存", "Record saved"],
  deleted: ["记录已删除", "Record deleted"],
  selectStructure: [
    "先在图谱中选择肌肉或肌腱",
    "Select a muscle or tendon in the atlas first",
  ],
  newRecord: ["新增记录", "New record"],
  history: ["历史记录", "History"],
  from: ["开始日期", "From date"],
  to: ["结束日期", "To date"],
  filter: ["应用筛选", "Apply filters"],
  previous: ["上一页", "Previous"],
  next: ["下一页", "Next"],
  noRecords: ["暂无记录", "No records yet"],
  total: ["条记录", "records"],
  noResults: ["没有匹配项", "No matches"],
  details: ["结构详情", "Details"],
  historic: ["历史结构", "Historical structure"],
  historyHint: [
    "已有记录完整保留；部分历史结构不在当前 40 肌群图谱内。",
    "Existing records are preserved. Some historical structures are outside the current 40-group atlas.",
  ],
  INVALID_CREDENTIALS: [
    "用户名或密码格式不正确。",
    "Invalid username or password format.",
  ],
  USERNAME_TAKEN: ["该用户名已被使用。", "Username is already taken."],
  LOGIN_FAILED: ["用户名或密码不正确。", "Incorrect username or password."],
  UNAUTHENTICATED: ["请先登录。", "Please sign in."],
  AUTH_REQUIRED: [
    "登录已过期，请重新登录。",
    "Your session expired. Please sign in again.",
  ],
  INVALID_FILTER: [
    "日期筛选无效，请检查日期范围。",
    "Invalid date filters. Check the date range.",
  ],
  INVALID_RECORD: [
    "记录内容无效，请检查日期、结构、侧别与酸痛程度。",
    "Invalid record. Check its date, structure, side and intensity.",
  ],
  RECORD_EXISTS: [
    "该日期、结构与侧别已有记录。",
    "A record already exists for this date, structure and side.",
  ],
  NOT_FOUND: ["记录不存在或已被删除。", "Record was not found or was deleted."],
  RATE_LIMITED: [
    "操作过于频繁，请稍后重试。",
    "Too many attempts. Please try again later.",
  ],
  SERVER_ERROR: [
    "服务暂时不可用，请稍后重试。",
    "Service is temporarily unavailable. Please retry later.",
  ],
  FORBIDDEN: [
    "请求未被允许，请刷新后重试。",
    "Request was not allowed. Refresh and retry.",
  ],
  CSRF: [
    "会话验证失败，请刷新后重试。",
    "Session verification failed. Refresh and retry.",
  ],
  ORIGIN_REJECTED: [
    "请求来源验证失败，请刷新后重试。",
    "Request origin was rejected. Refresh and retry.",
  ],
  modelUnreviewed: [
    "模型仅作学习示意，未经专业校核。",
    "Models are educational illustrations and have not been professionally reviewed.",
  ],
  acuSources: [
    "WHO 西太平洋地区标准针灸穴位定位（2008）",
    "WHO Standard Acupuncture Point Locations (2008)",
  ],
  acuSourceCopy: [
    "WHO 针灸穴位定位参考副本",
    "WHO point-location reference copy",
  ],
  busy: ["处理中…", "Working…"],
  selectPoint: [
    "点选穴位查看定位与来源。",
    "Select a point to view its location and sources.",
  ],
  selected: ["当前选择", "Selected"],
  pointsCount: ["个位置", "locations"],
  clear: ["清除选择", "Clear selection"],
  webglError: [
    "无法显示三维图谱，请启用 WebGL 或更换浏览器。列表和个人记录仍可使用。",
    "The 3D atlas could not display. Enable WebGL or try another browser. Lists and personal records remain available.",
  ],
  mode: ["图谱模式", "Atlas mode"],
  opacity: ["轮廓", "Body outline"],
} as const;
export type MessageKey = keyof typeof words;
export function t(locale: Locale, key: MessageKey): string {
  return words[key][locale === "zh" ? 0 : 1];
}
export function text(locale: Locale, value: Text | undefined): string {
  return value?.[locale] ?? "";
}
export function errorText(locale: Locale, error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  return t(
    locale,
    Object.hasOwn(words, code) ? (code as MessageKey) : "networkError",
  );
}
export function initialLocale(): Locale {
  try {
    return (localStorage.getItem("anatomy-motion-locale") ??
      localStorage.getItem("anatomy-locale")) === "en"
      ? "en"
      : "zh";
  } catch {
    return "zh";
  }
}
export function sourceLabel(locale: Locale, id: string, title: string): string {
  if (id.startsWith("who2008")) return t(locale, "acuSources");
  if (id.startsWith("who")) return t(locale, "acuSourceCopy");
  return title.includes("BodyParts")
    ? t(locale, "sourceModel")
    : locale === "zh"
      ? "针灸穴位定位参考资料"
      : title;
}
