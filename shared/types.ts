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

export type BootstrapResponse = {
  user: { email: string };
  checkins: CheckinEntry[];
  documents: DocumentEntry[];
  items: ItemEntry[];
  reviews: ReviewEntry[];
  patterns: PatternEntry[];
  goals: GoalEntry[];
  fears: FearEntry[];
};

export type ExportResponse = BootstrapResponse & {
  version: 1;
  exportedAt: string;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  issues?: unknown;
};
