/**
 * Fields that make a day count as a check-in.
 *
 * 三段式：`plan`（早上）、`journal` + `review`（晚上）、`q1`–`q6`（复盘）。
 * 写任意一段的一条就算当天完成。
 */
export const CHECKIN_FIELD_KEYS = [
  "plan",
  "journal",
  "review",
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
] as const;

export type CheckinFieldKey = (typeof CHECKIN_FIELD_KEYS)[number];

export type CheckinData = {
  /** 今日行动：开工前的方向、计划、障碍与应对。 */
  plan?: string;
  /** 晚间日记：一个输入框，五个问题当追问。 */
  journal?: string;
  /** 想法：不归到其他段落的东西都放这里。 */
  review?: string;
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
};

export type DocumentData = {
  notes?: string;
  _updated?: string;
  [key: string]: unknown;
};

export type CheckinEntry = {
  date: string;
  data: CheckinData;
  updatedAt: string;
};

export type DocumentEntry = {
  module: string;
  key: string;
  data: DocumentData;
  updatedAt: string;
};

export type ItemEntry = {
  id: string;
  module: string;
  content: string;
  itemDate: string | null;
  done: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const REVIEW_PERIOD_TYPES = ["week", "month"] as const;

export type ReviewPeriodType = (typeof REVIEW_PERIOD_TYPES)[number];

export const PATTERN_STATUSES = ["watching", "verified", "retired"] as const;

export type PatternStatus = (typeof PATTERN_STATUSES)[number];

/** 切分技巧：这件事我能不能改变。 */
export type ReviewControllable = "in" | "out";

export type ReviewData = {
  /** 选中的打卡日期，最多 3 条。存日期而不是文本，保证永远能点回当天。 */
  focus: string[];
  /** 本周做成了什么。放在最前面，先给证据再给问题。 */
  wins?: string;
  /** 联结：这几件事的共同点。 */
  connection?: string;
  /** 抽象化：提炼出的一句可复用规律。 */
  abstraction?: string;
  /** 具体化：下周要做的动作。 */
  actions?: string[];
  /** 关联或新建的模式卡。 */
  patternIds?: string[];
  /** 日期 → 可控 / 不可控。 */
  controllable?: Record<string, ReviewControllable>;
  /** 日期 → 换个说法。 */
  reframe?: Record<string, string>;
};

export type ReviewEntry = {
  periodType: ReviewPeriodType;
  periodKey: string;
  data: ReviewData;
  updatedAt: string;
};

export type PatternEntry = {
  id: string;
  title: string;
  trigger: string;
  reaction: string;
  payoff: string;
  cost: string;
  alternative: string;
  evidence: string[];
  status: PatternStatus;
  createdAt: string;
  updatedAt: string;
};

export const GOAL_STATUSES = ["draft", "active", "paused", "achieved", "archived"] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export type GoalImpact = "high" | "medium" | "low";

/** 切分：这个问题我能不能改变。 */
export type GoalControl = "in" | "partial" | "out";

export type GoalProblem = {
  id: string;
  title: string;
  evidence: string;
  impact: GoalImpact;
  control: GoalControl;
};

export type GoalMilestone = {
  id: string;
  text: string;
  due: string;
  done: boolean;
};

export type GoalIfThen = {
  id: string;
  trigger: string;
  response: string;
};

export type GoalMetric = {
  id: string;
  name: string;
  target: string;
  cadence: string;
};

export type GoalPracticeLog = {
  id: string;
  date: string;
  did: string;
  evidence: string;
  gap: string;
  next: string;
};

export type GoalGoalStep = {
  /** 在什么期限内，把什么从什么状态变成什么状态。 */
  statement: string;
  whyNow: string;
  successCriteria: string[];
  tradeoffs: string;
  notDoing: string[];
  deadline: string;
  /** 它服务于人生 OS 的哪个方向。 */
  alignment: string;
  /** 1–10，挑战度。 */
  challenge: number;
};

export type GoalProblemStep = {
  items: GoalProblem[];
  keyProblemId: string | null;
};

export type GoalDiagnosisStep = {
  directCause: string;
  /** 连续追问「为什么」，3–5 条。 */
  whyChain: string[];
  rootCause: string;
  pattern: string;
  alternative: string;
  conclusion: string;
};

export type GoalPlanStep = {
  strategy: string;
  check: string;
  milestones: GoalMilestone[];
  weeklyActions: string[];
  dailyActions: string[];
  ifThen: GoalIfThen[];
  metrics: GoalMetric[];
  stopDoing: string[];
};

export type GoalPracticeStep = {
  logs: GoalPracticeLog[];
  review: string;
  nextStep: string;
};

export type GoalData = {
  version: 1;
  goal: GoalGoalStep;
  problem: GoalProblemStep;
  diagnosis: GoalDiagnosisStep;
  plan: GoalPlanStep;
  practice: GoalPracticeStep;
};

export type GoalEntry = {
  id: string;
  title: string;
  /** 可选分类，不强制。 */
  domain: string;
  status: GoalStatus;
  data: GoalData;
  createdAt: string;
  updatedAt: string;
};

export const FEAR_STEP_KEYS = ["fear", "rootCause", "problem", "action", "evidence"] as const;

export type FearStepKey = (typeof FEAR_STEP_KEYS)[number];

/** 可选的权衡分析：这件事值不值得做。不进入五步完成度。 */
export type FearAnalysis = {
  /** 潜在好处，最多 3 条；空字符串在归一化时保留，UI 负责过滤展示。 */
  benefits: string[];
  /** 对取得「至少还算不错」结果的把握，0 表示未评，1–5。 */
  confidenceLevel: number;
  /** 历史案例：更普通（甚至不如自己聪明）的人也做到过的具体例子。 */
  precedent: string;
  /** 这件事对用户的影响程度，0 表示未评，1–5。 */
  impactLevel: number;
  inaction: {
    /** 6 个月后：保持现状会付出什么代价。 */
    sixMonths: string;
    /** 1 年后：会错过什么。 */
    oneYear: string;
    /** 3 年后：负面累积有多大。 */
    threeYears: string;
  };
};

export type FearData = {
  version: 1;
  /** 1 识别恐惧：我具体在害怕什么。 */
  fear: string;
  /** 2 寻找根因：为什么害怕，追问到真正的原因。 */
  rootCause: string;
  /** 3 定义问题：需要解决的是什么。 */
  problem: string;
  /** 4 转化为任务：下一步具体做什么。 */
  action: string;
  /** 5 验证与反馈：我取得了什么证据。 */
  evidence: string;
  /** 可选的权衡分析，不计入五步进度。 */
  analysis: FearAnalysis;
};

export type FearEntry = {
  id: string;
  data: FearData;
  /** 事件是否已完全结束；归档可逆，与五步内容分开存。 */
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export function createEmptyFearAnalysis(): FearAnalysis {
  return {
    benefits: [],
    confidenceLevel: 0,
    precedent: "",
    impactLevel: 0,
    inaction: {
      sixMonths: "",
      oneYear: "",
      threeYears: "",
    },
  };
}

export function createEmptyFearData(): FearData {
  return {
    version: 1,
    fear: "",
    rootCause: "",
    problem: "",
    action: "",
    evidence: "",
    analysis: createEmptyFearAnalysis(),
  };
}

export function createEmptyGoalData(): GoalData {
  return {
    version: 1,
    goal: {
      statement: "",
      whyNow: "",
      successCriteria: [],
      tradeoffs: "",
      notDoing: [],
      deadline: "",
      alignment: "",
      challenge: 5,
    },
    problem: { items: [], keyProblemId: null },
    diagnosis: {
      directCause: "",
      whyChain: [],
      rootCause: "",
      pattern: "",
      alternative: "",
      conclusion: "",
    },
    plan: {
      strategy: "",
      check: "",
      milestones: [],
      weeklyActions: [],
      dailyActions: [],
      ifThen: [],
      metrics: [],
      stopDoing: [],
    },
    practice: { logs: [], review: "", nextStep: "" },
  };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeProblems(value: unknown): GoalProblem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = asRecord(raw);
    const impact = item.impact;
    const control = item.control;
    return {
      id: asString(item.id) || `problem-${index}`,
      title: asString(item.title),
      evidence: asString(item.evidence),
      impact: impact === "high" || impact === "medium" || impact === "low" ? impact : "medium",
      control: control === "in" || control === "partial" || control === "out" ? control : "in",
    };
  });
}

function normalizeMilestones(value: unknown): GoalMilestone[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = asRecord(raw);
    return {
      id: asString(item.id) || `milestone-${index}`,
      text: asString(item.text),
      due: asString(item.due),
      done: item.done === true,
    };
  });
}

function normalizeIfThen(value: unknown): GoalIfThen[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = asRecord(raw);
    return {
      id: asString(item.id) || `ifthen-${index}`,
      trigger: asString(item.trigger),
      response: asString(item.response),
    };
  });
}

function normalizeMetrics(value: unknown): GoalMetric[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = asRecord(raw);
    return {
      id: asString(item.id) || `metric-${index}`,
      name: asString(item.name),
      target: asString(item.target),
      cadence: asString(item.cadence),
    };
  });
}

function normalizeLogs(value: unknown): GoalPracticeLog[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = asRecord(raw);
    return {
      id: asString(item.id) || `log-${index}`,
      date: asString(item.date),
      did: asString(item.did),
      evidence: asString(item.evidence),
      gap: asString(item.gap),
      next: asString(item.next),
    };
  });
}

/** 把可能缺字段的 JSON 补成完整形状，读旧数据时也不会炸。 */
export function normalizeGoalData(raw: unknown): GoalData {
  const root = asRecord(raw);
  const goal = asRecord(root.goal);
  const problem = asRecord(root.problem);
  const diagnosis = asRecord(root.diagnosis);
  const plan = asRecord(root.plan);
  const practice = asRecord(root.practice);
  const items = normalizeProblems(problem.items);
  const rawKey = asString(problem.keyProblemId);

  return {
    version: 1,
    goal: {
      statement: asString(goal.statement),
      whyNow: asString(goal.whyNow),
      successCriteria: asStringArray(goal.successCriteria),
      tradeoffs: asString(goal.tradeoffs),
      notDoing: asStringArray(goal.notDoing),
      deadline: asString(goal.deadline),
      alignment: asString(goal.alignment),
      challenge: Math.min(10, Math.max(1, Math.round(asNumber(goal.challenge, 5)))),
    },
    problem: {
      items,
      keyProblemId: rawKey && items.some((item) => item.id === rawKey) ? rawKey : null,
    },
    diagnosis: {
      directCause: asString(diagnosis.directCause),
      whyChain: asStringArray(diagnosis.whyChain),
      rootCause: asString(diagnosis.rootCause),
      pattern: asString(diagnosis.pattern),
      alternative: asString(diagnosis.alternative),
      conclusion: asString(diagnosis.conclusion),
    },
    plan: {
      strategy: asString(plan.strategy),
      check: asString(plan.check),
      milestones: normalizeMilestones(plan.milestones),
      weeklyActions: asStringArray(plan.weeklyActions),
      dailyActions: asStringArray(plan.dailyActions),
      ifThen: normalizeIfThen(plan.ifThen),
      metrics: normalizeMetrics(plan.metrics),
      stopDoing: asStringArray(plan.stopDoing),
    },
    practice: {
      logs: normalizeLogs(practice.logs),
      review: asString(practice.review),
      nextStep: asString(practice.nextStep),
    },
  };
}

/** 评分统一夹到 0–5，0 表示未评。 */
function normalizeFearLevel(value: unknown): number {
  return Math.min(5, Math.max(0, Math.round(asNumber(value, 0))));
}

function normalizeFearAnalysis(raw: unknown): FearAnalysis {
  const root = asRecord(raw);
  const inaction = asRecord(root.inaction);
  return {
    benefits: asStringArray(root.benefits).slice(0, 3),
    confidenceLevel: normalizeFearLevel(root.confidenceLevel),
    precedent: asString(root.precedent),
    impactLevel: normalizeFearLevel(root.impactLevel),
    inaction: {
      sixMonths: asString(inaction.sixMonths),
      oneYear: asString(inaction.oneYear),
      threeYears: asString(inaction.threeYears),
    },
  };
}

/** 把可能缺字段的 JSON 补成完整形状，读旧数据时也不会炸。 */
export function normalizeFearData(raw: unknown): FearData {
  const root = asRecord(raw);
  return {
    version: 1,
    fear: asString(root.fear),
    rootCause: asString(root.rootCause),
    problem: asString(root.problem),
    action: asString(root.action),
    evidence: asString(root.evidence),
    analysis: normalizeFearAnalysis(root.analysis),
  };
}

export const ENERGY_TOOL_KEYS = ["awareness", "manifestation", "reframe", "behavior"] as const;

export type EnergyToolKey = (typeof ENERGY_TOOL_KEYS)[number];

/**
 * 能量充电屋的一次练习记录。
 *
 * `answers` 用「问题 key -> 回答」的字典存，而不是固定字段：
 * 题目模板由 `src/content/energy.ts` 驱动，用户随时可以改 key 或增删题目，
 * 不需要同步改数据库 schema 或归一化逻辑。
 */
export type EnergySessionData = {
  version: 1;
  answers: Record<string, string>;
};

export type EnergySessionEntry = {
  id: string;
  tool: EnergyToolKey;
  data: EnergySessionData;
  /** 用户是否已经点击「完成本次充电」走完一轮；显式标记，不按题目填满派生。 */
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export function createEmptyEnergySessionData(): EnergySessionData {
  return { version: 1, answers: {} };
}

export function isEnergyToolKey(value: unknown): value is EnergyToolKey {
  return typeof value === "string" && (ENERGY_TOOL_KEYS as readonly string[]).includes(value);
}

/** 把可能缺字段的 JSON 补成完整形状；非字符串回答丢弃，未知问题 key 原样保留。 */
export function normalizeEnergySessionData(raw: unknown): EnergySessionData {
  const root = asRecord(raw);
  const answers: Record<string, string> = {};
  for (const [key, value] of Object.entries(asRecord(root.answers))) {
    if (typeof value === "string") answers[key] = value;
  }
  return { version: 1, answers };
}

export const TELOS_CATEGORIES = [
  "problem",
  "goal",
  "challenge",
  "strategy",
  "project",
  "risk",
] as const;

export type TelosCategory = (typeof TELOS_CATEGORIES)[number];

/** 每类实体唯一合法的父级分类；problem / risk 是根节点。 */
export const TELOS_PARENT_CATEGORY: Record<TelosCategory, TelosCategory | null> = {
  problem: null,
  goal: "problem",
  challenge: "goal",
  strategy: "challenge",
  project: "strategy",
  risk: null,
};

/** 状态按分类区分，不允许跨分类的非法状态。 */
export const TELOS_STATUSES = {
  problem: ["active", "addressed", "archived"],
  goal: ["draft", "active", "paused", "achieved", "abandoned"],
  challenge: ["active", "resolved", "accepted"],
  strategy: ["draft", "active", "validated", "invalidated", "retired"],
  project: ["planned", "active", "paused", "completed", "abandoned"],
  risk: ["watching", "mitigated", "realized", "accepted"],
} as const satisfies Record<TelosCategory, readonly string[]>;

export type TelosProblemStatus = (typeof TELOS_STATUSES.problem)[number];
export type TelosGoalStatus = (typeof TELOS_STATUSES.goal)[number];
export type TelosChallengeStatus = (typeof TELOS_STATUSES.challenge)[number];
export type TelosStrategyStatus = (typeof TELOS_STATUSES.strategy)[number];
export type TelosProjectStatus = (typeof TELOS_STATUSES.project)[number];
export type TelosRiskStatus = (typeof TELOS_STATUSES.risk)[number];

export const TELOS_DEFAULT_STATUS = {
  problem: "active",
  goal: "draft",
  challenge: "active",
  strategy: "draft",
  project: "planned",
  risk: "watching",
} as const satisfies Record<TelosCategory, string>;

export type TelosControllability = "in" | "partial" | "out";

export type TelosRiskControlState = "none" | "partial" | "ready";

export type TelosProblemData = {
  description: string;
  whyItMatters: string;
  evidence: string[];
  scope: string;
};

export type TelosGoalMetric = {
  name: string;
  target: string;
  cadence: string;
};

export type TelosGoalData = {
  successCriteria: string[];
  metric: TelosGoalMetric;
  deadline: string;
  tradeoffs: string;
  notDoing: string[];
};

export type TelosChallengeData = {
  evidence: string;
  rootCause: string;
  controllability: TelosControllability;
  /** 1–5，未评时取中间值 3。 */
  severity: number;
};

export type TelosStrategyData = {
  hypothesis: string;
  assumptions: string[];
  leadingIndicators: string[];
  stopConditions: string[];
};

export type TelosProjectMilestone = {
  id: string;
  text: string;
  due: string;
  done: boolean;
};

export type TelosProjectData = {
  nextAction: string;
  milestones: TelosProjectMilestone[];
};

export type TelosRiskControl = {
  state: TelosRiskControlState;
  note: string;
};

export type TelosRiskData = {
  scenario: string;
  /** 1–5，未评时取中间值 3。 */
  probability: number;
  /** 1–5，未评时取中间值 3。 */
  impact: number;
  prevent: TelosRiskControl;
  detect: TelosRiskControl;
  respond: TelosRiskControl;
};

export type TelosData =
  | TelosProblemData
  | TelosGoalData
  | TelosChallengeData
  | TelosStrategyData
  | TelosProjectData
  | TelosRiskData;

export type TelosItemBase = {
  id: string;
  parentId: string | null;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TelosItemEntry =
  | (TelosItemBase & {
      category: "problem";
      status: TelosProblemStatus;
      data: TelosProblemData;
    })
  | (TelosItemBase & { category: "goal"; status: TelosGoalStatus; data: TelosGoalData })
  | (TelosItemBase & {
      category: "challenge";
      status: TelosChallengeStatus;
      data: TelosChallengeData;
    })
  | (TelosItemBase & { category: "strategy"; status: TelosStrategyStatus; data: TelosStrategyData })
  | (TelosItemBase & { category: "project"; status: TelosProjectStatus; data: TelosProjectData })
  | (TelosItemBase & { category: "risk"; status: TelosRiskStatus; data: TelosRiskData });

/** 罗盘档案：每用户一条当前档案，历史交给快照。 */
export type TelosProfileData = {
  /** 每次保存 +1，仅作展示 / 调试。 */
  version: number;
  mission: string;
  currentState: string;
  idealState: string;
};

export type TelosSnapshotData = {
  version: 1;
  profile: TelosProfileData;
  items: TelosItemEntry[];
};

export type TelosSnapshotMeta = {
  id: string;
  createdAt: string;
  itemCount: number;
};

export type TelosSnapshotEntry = TelosSnapshotMeta & {
  data: TelosSnapshotData;
};

export function isTelosCategory(value: unknown): value is TelosCategory {
  return typeof value === "string" && (TELOS_CATEGORIES as readonly string[]).includes(value);
}

export function isTelosStatus(category: TelosCategory, value: unknown): boolean {
  return typeof value === "string" && (TELOS_STATUSES[category] as readonly string[]).includes(value);
}

/** 评分统一四舍五入并夹到 1–5；缺省时取中间值 3。 */
function normalizeTelosScale(value: unknown): number {
  return Math.min(5, Math.max(1, Math.round(asNumber(value, 3))));
}

function normalizeTelosMilestones(value: unknown): TelosProjectMilestone[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = asRecord(raw);
    return {
      id: asString(item.id) || `milestone-${index}`,
      text: asString(item.text),
      due: asString(item.due),
      done: item.done === true,
    };
  });
}

function normalizeTelosRiskControl(raw: unknown): TelosRiskControl {
  const root = asRecord(raw);
  const state = root.state;
  return {
    state: state === "none" || state === "partial" || state === "ready" ? state : "none",
    note: asString(root.note),
  };
}

export function normalizeTelosProblemData(raw: unknown): TelosProblemData {
  const root = asRecord(raw);
  return {
    description: asString(root.description),
    whyItMatters: asString(root.whyItMatters),
    evidence: asStringArray(root.evidence),
    scope: asString(root.scope),
  };
}

export function normalizeTelosGoalData(raw: unknown): TelosGoalData {
  const root = asRecord(raw);
  const metric = asRecord(root.metric);
  return {
    successCriteria: asStringArray(root.successCriteria),
    metric: {
      name: asString(metric.name),
      target: asString(metric.target),
      cadence: asString(metric.cadence),
    },
    deadline: asString(root.deadline),
    tradeoffs: asString(root.tradeoffs),
    notDoing: asStringArray(root.notDoing),
  };
}

export function normalizeTelosChallengeData(raw: unknown): TelosChallengeData {
  const root = asRecord(raw);
  const controllability = root.controllability;
  return {
    evidence: asString(root.evidence),
    rootCause: asString(root.rootCause),
    controllability:
      controllability === "in" || controllability === "partial" || controllability === "out"
        ? controllability
        : "in",
    severity: normalizeTelosScale(root.severity),
  };
}

export function normalizeTelosStrategyData(raw: unknown): TelosStrategyData {
  const root = asRecord(raw);
  return {
    hypothesis: asString(root.hypothesis),
    assumptions: asStringArray(root.assumptions),
    leadingIndicators: asStringArray(root.leadingIndicators),
    stopConditions: asStringArray(root.stopConditions),
  };
}

export function normalizeTelosProjectData(raw: unknown): TelosProjectData {
  const root = asRecord(raw);
  return {
    nextAction: asString(root.nextAction),
    milestones: normalizeTelosMilestones(root.milestones),
  };
}

export function normalizeTelosRiskData(raw: unknown): TelosRiskData {
  const root = asRecord(raw);
  return {
    scenario: asString(root.scenario),
    probability: normalizeTelosScale(root.probability),
    impact: normalizeTelosScale(root.impact),
    prevent: normalizeTelosRiskControl(root.prevent),
    detect: normalizeTelosRiskControl(root.detect),
    respond: normalizeTelosRiskControl(root.respond),
  };
}

/** 按分类把 data 归一化成稳定的 JSON 形状，读旧数据时也不会炸。 */
export function normalizeTelosItemData(category: TelosCategory, raw: unknown): TelosData {
  switch (category) {
    case "problem":
      return normalizeTelosProblemData(raw);
    case "goal":
      return normalizeTelosGoalData(raw);
    case "challenge":
      return normalizeTelosChallengeData(raw);
    case "strategy":
      return normalizeTelosStrategyData(raw);
    case "project":
      return normalizeTelosProjectData(raw);
    case "risk":
      return normalizeTelosRiskData(raw);
  }
}

export function createEmptyTelosData(category: TelosCategory): TelosData {
  return normalizeTelosItemData(category, {});
}

/** 把可能缺字段的档案补成完整形状；version 至少为 1。 */
export function normalizeTelosProfile(raw: unknown): TelosProfileData {
  const root = asRecord(raw);
  return {
    version: Math.max(1, Math.round(asNumber(root.version, 1))),
    mission: asString(root.mission),
    currentState: asString(root.currentState),
    idealState: asString(root.idealState),
  };
}

/** 快照由服务端写入，这里只做最低限度的结构兜底。 */
export function normalizeTelosSnapshotData(raw: unknown): TelosSnapshotData {
  const root = asRecord(raw);
  return {
    version: 1,
    profile: normalizeTelosProfile(root.profile),
    items: Array.isArray(root.items) ? (root.items as TelosItemEntry[]) : [],
  };
}

export type BootstrapResponse = {
  user: { email: string };
  checkins: CheckinEntry[];
  documents: DocumentEntry[];
  items: ItemEntry[];
  reviews: ReviewEntry[];
  patterns: PatternEntry[];
  goals: GoalEntry[];
  fears: FearEntry[];
  energySessions: EnergySessionEntry[];
};

export type ExportResponse = BootstrapResponse & {
  version: 1;
  exportedAt: string;
  telosProfile: TelosProfileData;
  telosItems: TelosItemEntry[];
  telosSnapshots: TelosSnapshotEntry[];
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  issues?: unknown;
};
