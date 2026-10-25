/** 单一语言界面词典。 / Single-locale interface dictionary. */
export type Locale = "zh" | "en";
export type Localized = { zh: string; en: string };
export const dictionary = {
  motionPlay: { zh: "播放示意", en: "Play illustration" },
  motionPause: { zh: "暂停", en: "Pause" },
  motionProgress: { zh: "动作进度", en: "Motion progress" },
  motionReturnStatic: { zh: "返回静态查看", en: "Return to static view" },
  motionNoticeShort: {
    zh: "近似动作示意 · 无器械",
    en: "Approximate motion · No equipment",
  },
  motionDisclaimer: {
    zh: "由静态网格程序化关节变换生成的近似示意，不代表精确负重动作、肌肉生理变形或训练指导。",
    en: "Approximate joint illustration from static meshes. It does not model loaded mechanics or muscle physiology and is not exercise instruction.",
  },
  motionUnavailable: {
    zh: "动作材质暂不可用，请刷新后重试。",
    en: "Motion material unavailable. Reload and retry.",
  },
  poseViewportLabel: {
    zh: "近似动作示意；可旋转缩放，返回静态后才能选取结构。",
    en: "Approximate motion. Orbit and zoom remain available; return to static view to select structures.",
  },
  signIn: {
    zh: "登录",
    en: "Sign in",
  },
  brandSub: {
    zh: "身体图谱",
    en: "BODY ATLAS",
  },
  atlas: {
    zh: "交互图谱",
    en: "Interactive atlas",
  },
  roadmap: {
    zh: "动作与经络 · 后续规划",
    en: "Motion & meridians · Planned",
  },
  structures: {
    zh: "身体结构",
    en: "Structures",
  },
  search: {
    zh: "搜索结构、动作或病症",
    en: "Search structures, exercises or conditions",
  },
  searchLabel: {
    zh: "搜索图谱内容",
    en: "Search atlas content",
  },
  tissues: {
    zh: "显示组织",
    en: "Visible tissues",
  },
  surface: {
    zh: "浅层肌肉",
    en: "Surface muscles",
  },
  deep: {
    zh: "深层肌肉",
    en: "Deep muscles",
  },
  tendons: {
    zh: "肌腱",
    en: "Tendons",
  },
  bones: {
    zh: "骨骼",
    en: "Bones",
  },
  layerNotice: {
    zh: "层级仅用于显示筛选，未经临床验证。",
    en: "Display layers are organizational filters, not clinically validated.",
  },
  structureDirectory: {
    zh: "结构目录",
    en: "Structure directory",
  },
  close: {
    zh: "关闭",
    en: "Close",
  },
  explorer: {
    zh: "探索图谱",
    en: "Explore anatomy",
  },
  modelCredit: {
    zh: "模型：DBCLS BodyParts3D · CC BY 4.0",
    en: "Models: DBCLS BodyParts3D · CC BY 4.0",
  },
  viewportLabel: {
    zh: "三维解剖视图",
    en: "3D anatomy viewport",
  },
  atlas3d: {
    zh: "三维解剖",
    en: "3D anatomy",
  },
  loadingAnatomy: {
    zh: "正在加载解剖模型…",
    en: "Loading anatomy…",
  },
  front: {
    zh: "正面",
    en: "Front",
  },
  back: {
    zh: "背面",
    en: "Back",
  },
  side: {
    zh: "侧面",
    en: "Side",
  },
  fit: {
    zh: "适应视图",
    en: "Fit view",
  },
  selectHint: {
    zh: "点选模型，或从探索目录选择结构",
    en: "Tap the model or explore the library",
  },
  gestureHint: {
    zh: "拖动旋转 · 双指缩放与平移 · 滚轮缩放",
    en: "Drag to orbit · Pinch / pan with two fingers · Scroll to zoom",
  },
  journalTitle: {
    zh: "身体记录",
    en: "Body journal",
  },
  myJournal: {
    zh: "我的记录",
    en: "My journal",
  },
  private: {
    zh: "私密",
    en: "Private",
  },
  from: {
    zh: "记录起始日期",
    en: "Records from date",
  },
  to: {
    zh: "记录结束日期",
    en: "Records to date",
  },
  medicalNotice: {
    zh: "仅用于身体学习与个人记录，不构成诊断或治疗建议。",
    en: "For anatomy learning and personal tracking; not diagnosis or treatment advice.",
  },
  footer: {
    zh: "交互解剖与疼痛日志",
    en: "Interactive anatomy & pain journal",
  },
  sourceCredit: {
    zh: "模型来源：BodyParts3D · DBCLS · CC BY 4.0",
    en: "Model source: BodyParts3D · DBCLS · CC BY 4.0",
  },
  closeSheet: {
    zh: "关闭面板并返回模型",
    en: "Close panel and return to model",
  },
  navLabel: {
    zh: "图谱导航",
    en: "Atlas navigation",
  },
  emptyManifest: {
    zh: "模型清单为空",
    en: "Empty model manifest",
  },
  sameOrigin: {
    zh: "模型必须由当前站点提供",
    en: "Models must be served from the same origin",
  },
  noMeshes: {
    zh: "没有可显示的解剖模型",
    en: "No anatomy meshes loaded",
  },
  retry: {
    zh: "重新加载",
    en: "Reload",
  },
  materialMissing: {
    zh: "基础解剖材质未加载",
    en: "Anatomy material is not loaded",
  },
  noMatches: {
    zh: "没有匹配的内容",
    en: "No matching content",
  },
  loadingStructures: {
    zh: "模型加载后显示目录",
    en: "Loading structures",
  },
  knowBody: {
    zh: "了解你的身体",
    en: "Know your body",
  },
  selectToRecord: {
    zh: "选择一块肌肉或肌腱，记录身体感受。",
    en: "Select a muscle or tendon to record how you feel.",
  },
  focus: {
    zh: "聚焦",
    en: "Focus",
  },
  hide: {
    zh: "隐藏",
    en: "Hide",
  },
  wholeBody: {
    zh: "显示全身",
    en: "Show whole body",
  },
  isolate: {
    zh: "单独显示",
    en: "Isolate",
  },
  reset: {
    zh: "重置视图",
    en: "Reset view",
  },
  boneHint: {
    zh: "骨骼用于定位参考；疼痛记录适用于肌肉和肌腱。",
    en: "Bones provide anatomical context. Records are available for muscles and tendons.",
  },
  intensity: {
    zh: "疼痛强度",
    en: "Pain intensity",
  },
  notePlaceholder: {
    zh: "何时出现？有什么感受？",
    en: "When did it start? How does it feel?",
  },
  saveRecord: {
    zh: "保存当天记录",
    en: "Save daily record",
  },
  signInRecord: {
    zh: "登录后记录",
    en: "Sign in to record",
  },
  date: {
    zh: "日期",
    en: "Date",
  },
  range: {
    zh: "0 无疼痛                         10 剧烈",
    en: "0 None                         10 Severe",
  },
  notes: {
    zh: "备注",
    en: "Notes",
  },
  accountError: {
    zh: "无法读取账户状态，请重试",
    en: "Could not load account. Please retry.",
  },
  signedOut: {
    zh: "已退出登录",
    en: "Signed out",
  },
  accountLabel: {
    zh: "账户登录",
    en: "Account sign in",
  },
  welcome: {
    zh: "欢迎回来",
    en: "Welcome back",
  },
  createAccount: {
    zh: "创建账户",
    en: "Create account",
  },
  register: {
    zh: "注册",
    en: "Register",
  },
  signInInstead: {
    zh: "已有账户，前往登录",
    en: "Already have an account? Sign in",
  },
  usernameRules: {
    zh: "3–32 位字母、数字或下划线",
    en: "3–32 letters, digits or underscores",
  },
  authHint: {
    zh: "保存每日记录，回顾身体变化。",
    en: "Save your daily observations and review changes.",
  },
  username: {
    zh: "用户名",
    en: "Username",
  },
  password: {
    zh: "密码 · 10–128 位",
    en: "Password · 10–128 characters",
  },
  pleaseWait: {
    zh: "正在处理…",
    en: "Please wait…",
  },
  signedIn: {
    zh: "已登录",
    en: "Signed in",
  },
  validRange: {
    zh: "请选择有效日期区间",
    en: "Choose a valid date range",
  },
  loadingRecords: {
    zh: "正在读取记录…",
    en: "Loading records…",
  },
  retryRecords: {
    zh: "重试",
    en: "Retry",
  },
  privateJournalHint: {
    zh: "登录后可查看私人历史记录。",
    en: "Sign in to see your private journal.",
  },
  noRecords: {
    zh: "这个日期区间还没有记录。",
    en: "No records in this date range.",
  },
  edit: {
    zh: "编辑",
    en: "Edit",
  },
  modelNotLoaded: {
    zh: "对应模型尚未加载",
    en: "The corresponding model has not loaded",
  },
  saveChanges: {
    zh: "保存修改",
    en: "Save changes",
  },
  delete: {
    zh: "删除",
    en: "Delete",
  },
  saving: {
    zh: "正在保存…",
    en: "Saving…",
  },
  saved: {
    zh: "已保存",
    en: "Saved",
  },
  recordSaved: {
    zh: "疼痛记录已保存",
    en: "Pain record saved",
  },
  confirmDeleteLabel: {
    zh: "确认删除记录",
    en: "Confirm record deletion",
  },
  cancel: {
    zh: "取消",
    en: "Cancel",
  },
  confirmDelete: {
    zh: "确认删除",
    en: "Confirm delete",
  },
  deleting: {
    zh: "正在删除…",
    en: "Deleting…",
  },
  recordDeleted: {
    zh: "记录已删除",
    en: "Record deleted",
  },
  exploreEyebrow: {
    zh: "探索人体结构",
    en: "Explore the human body",
  },
  anatomicalExplorer: {
    zh: "认识结构与相关知识",
    en: "Anatomical explorer",
  },
  structurePain: {
    zh: "结构与个人记录",
    en: "Structure & personal tracking",
  },
  knowBodyHint: {
    zh: "认识身体，记录感受。",
    en: "Know your body, track how you feel.",
  },
  privateEyebrow: {
    zh: "你的私人身体记录",
    en: "Your private body journal",
  },
  pageTitle: {
    zh: "Anatomy Motion · 解剖与个人记录",
    en: "Anatomy Motion · Anatomy & personal tracking",
  },
  side_left: {
    zh: "左侧",
    en: "Left",
  },
  side_right: {
    zh: "右侧",
    en: "Right",
  },
  side_midline: {
    zh: "中线",
    en: "Midline",
  },
  kind_muscle: {
    zh: "肌肉",
    en: "Muscle",
  },
  kind_tendon: {
    zh: "肌腱",
    en: "Tendon",
  },
  kind_bone: {
    zh: "骨骼",
    en: "Bone",
  },
  hidden: {
    zh: "已隐藏",
    en: "Hidden",
  },
  signOutUser: {
    zh: "{username} · 退出",
    en: "{username} · Sign out",
  },
  loadingCount: {
    zh: "正在加载解剖结构 {done} / {total}",
    en: "Loading anatomy {done} / {total}",
  },
  loadFailed: {
    zh: "{count} 个结构加载失败，请重试",
    en: "{count} structures failed to load. Please retry.",
  },
  loadedCount: {
    zh: "{count} 个解剖结构",
    en: "{count} anatomical structures",
  },
  deleteQuestion: {
    zh: "确定删除 {date} 的记录？",
    en: "Delete the record from {date}?",
  },
  model: {
    zh: "模型",
    en: "Model",
  },
  explore: {
    zh: "探索",
    en: "Explore",
  },
  journal: {
    zh: "记录",
    en: "Journal",
  },
  tabStructures: {
    zh: "结构",
    en: "Structures",
  },
  tabExercises: {
    zh: "动作",
    en: "Exercises",
  },
  tabConditions: {
    zh: "病症",
    en: "Conditions",
  },
  relatedGroups: {
    zh: "相关肌群",
    en: "Related groups",
  },
  sources: {
    zh: "来源",
    en: "Sources",
  },
  entryDetails: {
    zh: "详情与来源",
    en: "Details & sources",
  },
  contextOnly: {
    zh: "仅展示相关解剖位置，不提供诊断、治疗或康复建议。",
    en: "Related anatomy only. This is not diagnosis, treatment or rehabilitation advice.",
  },
  coverageComplete: {
    zh: "匹配 {count} 个结构",
    en: "{count} structures matched",
  },
  coveragePartial: {
    zh: "部分覆盖：匹配 {count} 个结构",
    en: "Partial coverage: {count} structures matched",
  },
  coverageNone: {
    zh: "当前模型未覆盖相关结构",
    en: "No related structures are covered in this model",
  },
  missingCoverage: {
    zh: "未覆盖的相关肌群或结构",
    en: "Related groups or structures not covered",
  },
  singleRecordHint: {
    zh: "请选择单个肌肉或肌腱记录感受；肌群选择不会批量写入记录。",
    en: "Select an individual muscle or tendon to record symptoms. Group selection does not create bulk records.",
  },
  learningLoading: {
    zh: "正在加载学习目录…",
    en: "Loading learning library…",
  },
  learningUnavailable: {
    zh: "学习目录暂不可用，可继续浏览结构。",
    en: "Learning library unavailable. Structure browsing remains available.",
  },
  selectLearning: {
    zh: "查看相关结构",
    en: "View related anatomy",
  },
  requestFailed: {
    zh: "请求未完成，请重试。",
    en: "Request failed. Please retry.",
  },
  networkError: {
    zh: "网络连接失败，请重试。",
    en: "Network connection failed. Please retry.",
  },
  authRequired: {
    zh: "请先登录。",
    en: "Please sign in first.",
  },
  usernameTaken: {
    zh: "用户名已被使用。",
    en: "This username is already taken.",
  },
  badCredentials: {
    zh: "用户名或密码不正确。",
    en: "Username or password is incorrect.",
  },
  invalidAuth: {
    zh: "请检查用户名和密码格式。",
    en: "Check the username and password requirements.",
  },
  invalidRecord: {
    zh: "请检查记录的日期、组织和疼痛强度。",
    en: "Check the record date, tissue and pain intensity.",
  },
  notFound: {
    zh: "内容不存在或已删除。",
    en: "Content was not found or has been deleted.",
  },
  invalidFilter: {
    zh: "日期筛选条件无效。",
    en: "The date filter is invalid.",
  },
  tooMany: {
    zh: "请求过于频繁，请稍后重试。",
    en: "Too many requests. Please try again later.",
  },
  serverError: {
    zh: "服务暂时不可用，请稍后重试。",
    en: "The service is temporarily unavailable. Please retry later.",
  },
  requestTooLarge: {
    zh: "提交内容过长，请缩短后重试。",
    en: "The submitted content is too large. Please shorten it.",
  },
  invalidJson: {
    zh: "提交格式无效，请重试。",
    en: "Invalid request format. Please retry.",
  },
  sourceLink: {
    zh: "打开来源：{title}",
    en: "Open source: {title}",
  },
  explorerTabs: {
    zh: "探索内容类型",
    en: "Explore content types",
  },
  languageLabel: {
    zh: "切换到英文",
    en: "Switch to Chinese",
  },
  learningMissingId: {
    zh: "缺少结构：{id}",
    en: "Missing structure: {id}",
  },
  missingGroup: {
    zh: "缺少肌群：{id}",
    en: "Missing group: {id}",
  },
} as const;
export type MessageKey = keyof typeof dictionary;
let locale: Locale = "zh";
try {
  locale = localStorage.getItem("anatomy-motion-locale") === "en" ? "en" : "zh";
} catch {}
export function getLocale(): Locale {
  return locale;
}
export function setLocale(value: Locale): void {
  locale = value;
  try {
    localStorage.setItem("anatomy-motion-locale", value);
  } catch {}
}
export function localized(value: Localized): string {
  return value[locale];
}
export function t(
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  return dictionary[key][locale].replace(/\{(\w+)\}/g, (_, name: string) =>
    String(params[name] ?? ""),
  );
}
export function apiErrorMessage(code: string, status = 0): string {
  const keys: Record<string, MessageKey> = {
    UNAUTHENTICATED: "authRequired",
    USERNAME_TAKEN: "usernameTaken",
    INVALID_CREDENTIALS: "badCredentials",
    INVALID_AUTH: "invalidAuth",
    INVALID_INPUT: "invalidAuth",
    INVALID_RECORD: "invalidRecord",
    NOT_FOUND: "notFound",
    INVALID_FILTER: "invalidFilter",
    RATE_LIMITED: "tooMany",
    BODY_TOO_LARGE: "requestTooLarge",
    INVALID_JSON: "invalidJson",
    INTERNAL_ERROR: "serverError",
  };
  return t(
    keys[code] ||
      (status >= 500
        ? "serverError"
        : status === 429
          ? "tooMany"
          : "requestFailed"),
  );
}
