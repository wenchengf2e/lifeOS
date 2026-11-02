import type { GoalControl, GoalImpact, GoalStatus } from "../../shared/types";

/** 领域只是分类，不强制先拆。一个目标可以直接叫「投资」。 */
export const goalDomains = [
  { key: "invest", label: "投资", icon: "📈", hint: "资产、研究、交易、风险" },
  { key: "career", label: "事业", icon: "🏔", hint: "职业、业务、作品" },
  { key: "health", label: "健康", icon: "🌱", hint: "身体、精力、作息" },
  { key: "relation", label: "关系", icon: "🤝", hint: "家人、朋友、伴侣" },
  { key: "learn", label: "学习", icon: "📚", hint: "知识、技能、学历" },
  { key: "life", label: "人生", icon: "🧭", hint: "生活方式、居住、意义" },
  { key: "other", label: "其他", icon: "🎯", hint: "不好归类就先放这里" },
] as const;

export type GoalDomainKey = (typeof goalDomains)[number]["key"];

export const goalStatusMeta: Record<
  GoalStatus,
  { label: string; desc: string; className: string; dotClassName: string }
> = {
  draft: {
    label: "草稿",
    desc: "还在想，不急着推进",
    className: "bg-paper-deep/80 text-ink-soft",
    dotClassName: "bg-ink-soft/40",
  },
  active: {
    label: "进行中",
    desc: "正在推进",
    className: "bg-moss-soft text-moss-dark",
    dotClassName: "bg-moss",
  },
  paused: {
    label: "已暂停",
    desc: "先放一放，之后可以继续",
    className: "bg-clay/10 text-clay",
    dotClassName: "bg-clay",
  },
  achieved: {
    label: "已达成",
    desc: "已经拿到结果",
    className: "bg-moss text-white",
    dotClassName: "bg-moss-dark",
  },
  archived: {
    label: "已放下",
    desc: "不再推进，留档备查",
    className: "bg-white/80 text-ink-soft",
    dotClassName: "bg-line",
  },
};

export type GoalStepKey = "goal" | "problem" | "diagnosis" | "plan" | "practice";

export type GoalStep = {
  key: GoalStepKey;
  index: number;
  title: string;
  short: string;
  icon: string;
  desc: string;
  output: string;
};

export const goalSteps: GoalStep[] = [
  {
    key: "goal",
    index: 1,
    title: "设定目标",
    short: "目标",
    icon: "🎯",
    desc: "目标不是欲望。欲望想要结果，目标要求你交换。先写清楚挑战度足够高的那个目标，再给它一个能被检查的完成标准。",
    output: "一句话目标、1–5 条成功标准，以及愿意交换什么。",
  },
  {
    key: "problem",
    index: 2,
    title: "找到问题",
    short: "问题",
    icon: "🧱",
    desc: "不要从「我该做什么」开始，而是从「什么在阻碍目标」开始。先列事实，再选一个最关键的问题。",
    output: "1–5 张问题卡，以及唯一那个最关键的问题。",
  },
  {
    key: "diagnosis",
    index: 3,
    title: "诊断根源",
    short: "诊断",
    icon: "🔍",
    desc: "区分直接原因和根本原因。不要停在「我不够努力」，继续问为什么，直到找到可改变的结构。",
    output: "根本原因、反复出现的模式，以及一句诊断结论。",
  },
  {
    key: "plan",
    index: 4,
    title: "规划方案",
    short: "方案",
    icon: "🛠",
    desc: "方案要落到 90 天目标、每周任务、每日动作，并预写「再次逃避时怎么办」。写不出动作，说明前面只是自我安慰。",
    output: "一条策略、里程碑、周动作和障碍预案。",
  },
  {
    key: "practice",
    index: 5,
    title: "践行验证",
    short: "践行",
    icon: "📊",
    desc: "做一切必要的事。用真实结果验证方案，而不是用「感觉好一点了」验证。每次记录都带证据和下一步。",
    output: "至少一条带证据的践行记录，以及阶段结论。",
  },
];

export const goalImpactOptions: { value: GoalImpact; label: string }[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

export const goalControlOptions: { value: GoalControl; label: string; hint: string }[] = [
  { value: "in", label: "可控", hint: "我的行为能改变" },
  { value: "partial", label: "部分可控", hint: "能影响，不能决定" },
  { value: "out", label: "不可控", hint: "接受或绕开" },
];

export const MAX_GOAL_PROBLEMS = 5;
export const MAX_GOAL_SUCCESS_CRITERIA = 5;
export const MAX_GOAL_NOT_DOING = 5;
export const MAX_GOAL_MILESTONES = 3;
export const MAX_GOAL_IF_THEN = 3;
export const MAX_GOAL_METRICS = 3;
export const MAX_ACTIVE_GOALS = 3;
export const STALE_GOAL_DAYS = 14;

export const goalsPageCopy = {
  eyebrow: "Five-Step Diagnosis",
  title: "五步诊断",
  description:
    "人生 OS 定方向，目标定战场。每个目标单独走一遍：目标 → 问题 → 诊断 → 方案 → 践行。",
  directionEmpty:
    "还没有方向卡。先去人生 OS 写下大方向，目标才有可以对齐的坐标系。",
  directionFallback: "方向卡还没写完整，先去补一句 3–5 年的方向。",
  methodTitle: "五步怎么走",
  methodDesc: "不是一次性仪式，是每周转动一次的飞轮。可以只写一半，也可以随时回来改。",
  statsActive: "进行中",
  statsComplete: "走完五步",
  statsPractice: "最近践行",
  noPractice: "还没开始",
  allDomains: "全部领域",
  statusOpen: "当前",
  statusPaused: "已暂停",
  statusClosed: "已结束",
  statusAll: "全部",
  emptyTitle: "还没有目标",
  emptyDesc:
    "先写一个你现在最想推进的对象，比如投资、健康、职业。名字可以很粗，第 1 步会帮你把它变得可诊断。",
  activeCapHint: "同时推进超过 3 个目标，注意力会被摊薄。可以先暂停一个，或者把目标写小一点。",
  newGoal: "新建目标",
};

export const newGoalCopy = {
  title: "新建目标",
  desc: "名字先粗一点没关系。建好之后，第 1 步会带你把期限、标准和代价写清楚。",
  nameLabel: "目标名称",
  namePlaceholder: "例：投资、建立一套能穿越周期的投资体系、每周跑三次",
  domainLabel: "领域（可选）",
  domainHint: "只是分类，不影响诊断。",
  deadlineLabel: "期限（可选）",
  submit: "创建并开始",
  creating: "创建中…",
  cancel: "取消",
};

export const goalStepCopy = {
  goal: {
    statementLabel: "目标陈述",
    statementHint: "在什么期限内，把什么从什么状态变成什么状态。",
    statementPlaceholder:
      "例：18 个月内建立一套能穿越周期的投资体系，最大回撤控制在 20% 以内。",
    whyNowLabel: "为什么是现在",
    whyNowHint: "如果今年不做，会失去什么？",
    whyNowPlaceholder: "例：再拖一年，我还是会把时间花在追涨杀跌上，复利起步又晚一年。",
    successLabel: "成功标准",
    successHint: "达成时能被谁、用什么证据检查。1–5 条，不写「感觉好一点」。",
    successPlaceholder: "例：连续 12 个月按同一套规则执行；年度回撤 ≤ 20%；复盘记录 ≥ 40 条。",
    tradeoffLabel: "我愿意交换什么",
    tradeoffHint: "目标不是加法，是交换。写下你要放弃的时间、舒适、机会。",
    tradeoffPlaceholder: "例：每周少刷 5 小时短视频，把周末半天留给研究。",
    notDoingLabel: "明确不做",
    notDoingHint: "为了这个目标，我决定不做什么。",
    notDoingPlaceholder: "例：不碰看不懂的标的；不在盘中临时改规则。",
    deadlineLabel: "期限",
    deadlineHint: "可以是一个日期，也可以先空着。",
    challengeLabel: "挑战度",
    challengeHint: "1 太轻松，10 几乎不可能。",
    alignmentLabel: "方向对齐",
    alignmentHint: "它服务于人生 OS 的哪个方向？写一句就够了。",
    alignmentPlaceholder: "例：服务于「有足够的资产自由度，能选择自己想做的事」。",
  },
  problem: {
    intro:
      "先把阻碍目标的事实列出来，不要急着写解决方案。问题越具体，下一步越有东西可诊断。",
    listTitle: "阻碍目标的问题",
    add: "添加一个问题",
    maxHint: "最多 5 个。先写最明显的，不用一次写全。",
    titleLabel: "问题一句话",
    titlePlaceholder: "例：一到下跌就改规则，事后才发现是情绪驱动。",
    evidenceLabel: "证据 / 现象",
    evidenceHint: "具体到次数、场景、数字，不写「有时候」。",
    evidencePlaceholder: "例：过去 6 个月有 4 次在回撤超过 8% 时清仓，之后 3 次反弹。",
    impactLabel: "影响",
    controlLabel: "可控性",
    controlHint: "只控制能控制的部分，别把精力花在不可控上。",
    keyLabel: "设为关键问题",
    keyHint: "下一步只诊断一个。选那个最限制整体进步的。",
    keySelected: "当前关键问题",
    keyEmpty: "还没有选关键问题。没有它，第 3 步会空着。",
    empty: "还没有问题卡。先写下最近一次「明明想做好，却没做到」的具体场景。",
  },
  diagnosis: {
    keyProblemTitle: "这次只诊断",
    noKey: "第 2 步还没有选关键问题。先回去选一个，再往下诊断。",
    directCauseLabel: "直接原因",
    directCauseHint: "表面上看，是什么直接造成的？",
    directCausePlaceholder: "例：看到账户回撤，我立刻想先卖掉，避免更难受。",
    whyChainLabel: "连续追问为什么",
    whyChainHint: "至少 3 条。每一条都要比上一条更接近可改变的结构。",
    whyPlaceholder: "为什么？",
    addWhy: "再加一条",
    rootCauseLabel: "根本原因",
    rootCauseHint: "不是「我不够努力」。写能力、环境、资源、关系或信念上的结构。",
    rootCausePlaceholder:
      "例：我把「不亏钱」当成自我价值的证明，所以回撤不是市场信号，而是对「我不行」的确认。",
    patternLabel: "反复出现的模式",
    patternHint: "这个问题以前在哪里出现过？如果不止一次，它就不是意外。",
    patternPlaceholder: "例：工作上被否定时也会立刻收缩投入，先保护自己不被评价。",
    alternativeLabel: "另一种解释",
    alternativeHint: "如果旧判断是错的，还有什么解释？",
    alternativePlaceholder:
      "例：回撤是策略的正常成本，不等于我这个人失败；我需要的是规则，不是证明自己。",
    conclusionLabel: "诊断结论",
    conclusionHint: "用一句话说：真正的问题不是 X，而是 Y。",
    conclusionPlaceholder:
      "例：真正的问题不是我选不到好标的，而是我没有一套在回撤时仍然能执行的规则。",
  },
  plan: {
    strategyLabel: "策略",
    strategyHint: "如果只能做一件事，做什么？",
    strategyPlaceholder:
      "例：先固定一套仓位和再平衡规则，用 12 个月只验证「能不能按规则执行」，不追求收益。",
    checkLabel: "方案自检",
    checkHint: "这个方案是在解决根本原因，还是在缓解症状？",
    checkPlaceholder: "例：它在解决「回撤时没有规则」这个根因；不是靠盯盘让自己安心。",
    milestonesLabel: "90 天里程碑",
    milestonesHint: "1–3 个。每个都要能被检查完成。",
    milestonePlaceholder: "例：写下并回测第一版规则",
    milestoneDue: "截止",
    milestoneDone: "已完成",
    weeklyLabel: "每周动作",
    weeklyHint: "每周可重复执行的动作，不是待办清单。3–5 条。",
    weeklyPlaceholder: "例：周日晚上复盘一次，记录本周有没有按规则执行。",
    dailyLabel: "每日动作",
    dailyHint: "1–3 条，越少越可能做到。",
    dailyPlaceholder: "例：开盘前看一眼规则卡，不做临时决策。",
    ifThenLabel: "障碍预演",
    ifThenHint: "当……发生时，我就……。提前写好，别等事到临头再想办法。",
    ifThenTrigger: "当",
    ifThenResponse: "我就",
    ifThenTriggerPlaceholder: "例：回撤超过 8%、很想清仓时",
    ifThenResponsePlaceholder: "例：先读一遍规则卡，24 小时后再决定",
    metricsLabel: "验证指标",
    metricsHint: "1–3 个。指标要能看到，不是「感觉更好了」。",
    metricName: "指标",
    metricTarget: "目标值",
    metricCadence: "频率",
    metricNamePlaceholder: "例：按规则执行率",
    metricTargetPlaceholder: "例：≥ 90%",
    metricCadencePlaceholder: "例：每周",
    stopLabel: "停止做的事",
    stopHint: "为了这个方案，必须停掉什么？",
    stopPlaceholder: "例：盘中看盘、临时改规则、和别人比收益。",
    latestWeekly: "本周动作",
  },
  practice: {
    intro:
      "方案只有被真实结果验证才算数。每次记录都带证据：做了什么、结果如何、偏差在哪、下一步是什么。",
    planEmpty: "第 4 步还没有每周动作。先去写下这周要做什么，再回来记录。",
    logsTitle: "践行记录",
    logFormTitle: "记一条践行",
    dateLabel: "日期",
    didLabel: "做了什么",
    didPlaceholder: "例：按规则做了本周的再平衡，没有临时改仓位。",
    evidenceLabel: "结果 / 证据",
    evidencePlaceholder: "例：执行率 100%；回撤 6.2%；没有触发情绪化交易。",
    gapLabel: "偏差 / 卡点",
    gapPlaceholder: "例：周三看到大跌还是想手动清仓，忍住了，但很焦虑。",
    nextLabel: "下一步",
    nextPlaceholder: "例：把「24 小时冷静」写进规则卡，下周继续观察。",
    addLog: "保存这条记录",
    needContent: "至少写一句「做了什么」或「结果 / 证据」。",
    empty: "还没有践行记录。方案写完不等于做到，第一条记录才是开始。",
    deleteLog: "删除",
    reviewTitle: "阶段结论",
    reviewHint: "这一阶段验证出了什么？哪些假设被证实，哪些被推翻？",
    reviewPlaceholder: "例：规则能执行，但回撤时的焦虑仍然很高；需要把冷静期写进流程。",
    nextStepTitle: "下一步",
    nextStepHint: "继续、调整、还是停止？写一句下一步。",
    nextStepPlaceholder: "例：再跑 90 天，只改一个变量：把仓位上限从 70% 降到 60%。",
    statusTitle: "收束这个目标",
    statusHint: "根据真实结果改状态，不用等「感觉完成」。",
    setActive: "继续推进",
    setPaused: "暂停",
    setAchieved: "标记达成",
    setArchived: "放下",
  },
};

export const goalDetailCopy = {
  back: "全部目标",
  saveIdle: "改动会自动保存",
  saveDirty: "有未保存的改动",
  saveSaving: "保存中…",
  saveSaved: "已保存",
  saveError: "保存失败，点击重试",
  prev: "上一步",
  next: "下一步",
  finish: "完成这一步",
  sidebarChecklist: "这一步还差什么",
  sidebarDirection: "大方向",
  sidebarDirectionEmpty: "方向卡还没写。",
  sidebarOverview: "目标速览",
  deadline: "期限",
  challenge: "挑战度",
  keyProblem: "关键问题",
  practiceCount: "践行记录",
  lastPractice: "上次践行",
  notFound: "这个目标不存在，可能已经被删除了。",
  deleteGoal: "删除目标",
  deleteConfirm: "删除后，这个目标的五步内容和践行记录都会消失。确定吗？",
  statusLabel: "状态",
  domainLabel: "领域",
};
