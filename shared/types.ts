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

export type BootstrapResponse = {
  user: { email: string };
  checkins: CheckinEntry[];
  documents: DocumentEntry[];
  items: ItemEntry[];
  reviews: ReviewEntry[];
  patterns: PatternEntry[];
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
