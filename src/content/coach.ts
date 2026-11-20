import type { CoachProposalKind, CoachSkillKey, CoachStageKey } from "../../shared/types";

export type CoachSkillMeta = {
  label: string;
  icon: string;
  tagline: string;
  /** 手动选择该模型开聊时使用的第一句话。 */
  startPrompt: string;
};

/** 七大成长模型的前端展示配置；key 与 shared/types.ts 的白名单一一对应。 */
export const COACH_SKILLS: Record<CoachSkillKey, CoachSkillMeta> = {
  "life-vision": {
    label: "人生愿景",
    icon: "🧭",
    tagline: "找回方向与意义",
    startPrompt: "我最近有点迷茫，想聊聊自己到底想要什么。",
  },
  "procrastination-execution": {
    label: "拖延与执行",
    icon: "🚀",
    tagline: "把卡住的事推动起来",
    startPrompt: "有一件事我一直拖着没开始，想请你陪我看看。",
  },
  planning: {
    label: "计划安排",
    icon: "🗓",
    tagline: "给堆积的事情排出顺序",
    startPrompt: "事情有点多，我想把今天重新排一遍。",
  },
  review: {
    label: "复盘提炼",
    icon: "🔍",
    tagline: "把经历沉淀成结论",
    startPrompt: "想回顾一下最近发生的事，提炼一点有用的东西。",
  },
  "habit-design": {
    label: "习惯设计",
    icon: "🌿",
    tagline: "让改变小到能坚持",
    startPrompt: "我想建立一个新习惯，但总是坚持不了几天。",
  },
  "energy-management": {
    label: "精力管理",
    icon: "🔋",
    tagline: "先照顾电量，再谈行动",
    startPrompt: "最近总觉得很累，想聊聊怎么恢复一点能量。",
  },
  "complex-problem-solving": {
    label: "复杂问题",
    icon: "🧩",
    tagline: "把纠缠的难题拆开",
    startPrompt: "有个问题一直绕不出来，想请你帮我一起拆一拆。",
  },
};

export type CoachStageMeta = {
  key: CoachStageKey;
  label: string;
  description: string;
};

/** 成长循环五阶段；顺序即进度条的推进顺序。 */
export const COACH_STAGES: CoachStageMeta[] = [
  {
    key: "listen",
    label: "接住",
    description: "先让情绪和处境被看见，不急着给建议。",
  },
  {
    key: "clarify",
    label: "澄清",
    description: "找到这次真正要谈的主题和需要。",
  },
  {
    key: "reframe",
    label: "觉察",
    description: "换一个角度，看看卡住自己的是什么。",
  },
  {
    key: "experiment",
    label: "小实验",
    description: "共创一个今天就能做的最小行动。",
  },
  {
    key: "wrapup",
    label: "收尾",
    description: "整合这一轮的收获，沉淀成可回写的内容。",
  },
];

export function coachStageIndex(stage: CoachStageKey) {
  const index = COACH_STAGES.findIndex((item) => item.key === stage);
  return index >= 0 ? index : 0;
}

export type CoachProposalMeta = {
  label: string;
  /** 提案写入的业务位置，展示给用户确认。 */
  targetLabel: string;
  icon: string;
};

/** 四类待确认回写提案的展示元数据。 */
export const COACH_PROPOSAL_META: Record<CoachProposalKind, CoachProposalMeta> = {
  checkin_plan: {
    label: "今日行动",
    targetLabel: "每日仪式 · 今日行动",
    icon: "📝",
  },
  pattern_card: {
    label: "模式卡",
    targetLabel: "复盘 · 模式库",
    icon: "🔁",
  },
  fear_action: {
    label: "恐惧行动",
    targetLabel: "恐惧清单 · 下一步",
    icon: "🫨",
  },
  coach_profile: {
    label: "教练画像",
    targetLabel: "我的教练画像",
    icon: "🪪",
  },
};

export type CoachProfileFieldKey =
  | "routines"
  | "energyWindows"
  | "preferences"
  | "executionClues"
  | "longTermInsights";

export type CoachProfileField = {
  key: CoachProfileFieldKey;
  /** text 用多行文本域；list 用可增删的单行条目。 */
  kind: "text" | "list";
  label: string;
  hint: string;
  placeholder: string;
};

/** 教练画像编辑面板的字段说明；顺序即展示顺序。 */
export const PROFILE_FIELDS: CoachProfileField[] = [
  {
    key: "routines",
    kind: "text",
    label: "作息与固定承诺",
    hint: "工作日 / 周末的节律、固定安排，以及不可挪动的承诺。",
    placeholder: "例：工作日 7:30 起床，晚上 10 点后不安排需要动脑的事；周三晚上固定上课。",
  },
  {
    key: "energyWindows",
    kind: "text",
    label: "精力窗口与恢复线索",
    hint: "什么时候最有电、什么时候容易透支，以及真正有效的恢复方式。",
    placeholder:
      "例：上午 9–11 点最适合深度工作；下午 3 点后电量下降；散步 10 分钟比刷手机更能恢复。",
  },
  {
    key: "preferences",
    kind: "text",
    label: "沟通偏好与雷区",
    hint: "喜欢被怎样推进，讨厌被催、被打分或被强行鼓励。",
    placeholder:
      "例：喜欢直接指出问题再一起想办法；讨厌被反复追问进度，也不喜欢空泛的鼓励。",
  },
  {
    key: "executionClues",
    kind: "list",
    label: "执行与拖延线索",
    hint: "常见启动阻力、触发场景、有效与反效果的启动方式，一条一行。",
    placeholder: "例：任务没有明确第一步时会一直拖",
  },
  {
    key: "longTermInsights",
    kind: "list",
    label: "长期洞察与有效策略",
    hint: "从多次对话与复盘里沉淀下来的稳定认识，一条一行。",
    placeholder: "例：把任务写小到 2 分钟，比给自己打鸡血更有效",
  },
];

/** 单条消息的输入上限，与后端 chatSchema 的 20,000 上限留有余量。 */
export const CHAT_INPUT_MAX_LENGTH = 4000;

/** 快捷回复展示上限，与 shared/types.ts 的 normalizeQuickReplies 保持一致。 */
export const QUICK_REPLY_LIMIT = 4;

export const coachPageCopy = {
  eyebrow: "AI Coach",
  title: "小芽 · 你的成长教练",
  description:
    "不评判、不催促。每次只问一个锋利的问题，陪你把卡住的地方拆成一个今天能做的小动作。",
  waitingEyebrow: "候诊室",
  waitingTitle: "你想从哪里开始？",
  waitingDesc:
    "不用先组织好语言。选一个最接近此刻的状态，小芽会接住它，然后一次只问一个问题。",
  signalsEyebrow: "主动洞察",
  signalsTitle: "教练主动线索",
  signalsDesc: "根据你最近的打卡、目标、恐惧与罗盘数据扫描得出，点一张就直接开聊。",
  signalsEmpty: "暂时没有需要提醒的线索。直接在下面写一句话，小芽就会接住。",
  signalsCollapsed: "教练主动线索",
  threadEyebrow: "Thread",
  threadEmptyTitle: "新的对话",
  threadFallbackTitle: "当前对话",
  threadEmptyHint: "还没有开始对话。点一张主动线索卡，或直接在下面写下此刻最想说的那句话。",
  startedHint: "发出第一条消息即开始",
  history: "历史话题",
  profile: "我的教练画像",
  switchTopic: "换个话题",
  completeSession: "完成本轮",
  switchConfirm: "结束当前话题，换一个新的开始？当前对话会收进历史话题。",
  completeConfirm: "完成本轮话题？小芽会自动生成一句话小结，收进历史话题。",
  switchSeed: "我们换个话题聊聊。",
  chatFailed: "发送失败，请重试",
  actionFailed: "操作失败，请重试",
  loading: "小芽正在准备…",
  aiConnected: "已连接大模型",
  aiLocal: "本地教练引擎",
  autoSkill: "自动匹配成长模型",
  stageLabel: "成长循环",
} as const;
