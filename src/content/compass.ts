import type {
  TelosCategory,
  TelosControllability,
  TelosRiskControlState,
  TelosRiskStatus,
} from "../../shared/types";

/** 树的展示顺序；风险固定排在最后，单独成区。 */
export const compassCategoryOrder: TelosCategory[] = [
  "problem",
  "goal",
  "challenge",
  "strategy",
  "project",
  "risk",
];

export type CompassCategoryMeta = {
  label: string;
  english: string;
  icon: string;
  description: string;
  /** 分类标签的胶囊样式。 */
  className: string;
};

export const compassCategoryMeta: Record<TelosCategory, CompassCategoryMeta> = {
  problem: {
    label: "问题",
    english: "Problem",
    icon: "🌍",
    description: "你要解决的世界问题，罗盘链的起点。",
    className: "bg-ink text-paper",
  },
  goal: {
    label: "目标",
    english: "Goal",
    icon: "🎯",
    description: "朝问题推进的可衡量里程碑。",
    className: "bg-moss-soft text-moss-dark",
  },
  challenge: {
    label: "挑战",
    english: "Challenge",
    icon: "🧱",
    description: "挡住目标、需要被解决的障碍。",
    className: "bg-clay/10 text-clay",
  },
  strategy: {
    label: "策略",
    english: "Strategy",
    icon: "🧭",
    description: "克服挑战的方法与假设。",
    className: "bg-paper-deep/90 text-ink-soft",
  },
  project: {
    label: "项目",
    english: "Project",
    icon: "🛠",
    description: "推进策略的具体项目与下一步行动。",
    className: "bg-moss-soft text-moss-dark",
  },
  risk: {
    label: "风险",
    english: "Risk",
    icon: "⚠️",
    description: "可能让你偏离理想状态的场景，独立于五级链。",
    className: "bg-clay/15 text-clay",
  },
};

export type CompassStatusMeta = {
  label: string;
  className: string;
};

/** 状态按分类区分，跨分类的非法状态不会出现在选择器里。 */
export const compassStatusMeta: Record<TelosCategory, Record<string, CompassStatusMeta>> = {
  problem: {
    active: { label: "进行中", className: "bg-moss-soft text-moss-dark" },
    addressed: { label: "已解决", className: "bg-moss text-white" },
    archived: { label: "已归档", className: "bg-white/80 text-ink-soft" },
  },
  goal: {
    draft: { label: "草稿", className: "bg-paper-deep/80 text-ink-soft" },
    active: { label: "进行中", className: "bg-moss-soft text-moss-dark" },
    paused: { label: "已暂停", className: "bg-clay/10 text-clay" },
    achieved: { label: "已达成", className: "bg-moss text-white" },
    abandoned: { label: "已放弃", className: "bg-white/80 text-ink-soft" },
  },
  challenge: {
    active: { label: "进行中", className: "bg-moss-soft text-moss-dark" },
    resolved: { label: "已解决", className: "bg-moss text-white" },
    accepted: { label: "已接受", className: "bg-white/80 text-ink-soft" },
  },
  strategy: {
    draft: { label: "草稿", className: "bg-paper-deep/80 text-ink-soft" },
    active: { label: "进行中", className: "bg-moss-soft text-moss-dark" },
    validated: { label: "已验证", className: "bg-moss text-white" },
    invalidated: { label: "已证伪", className: "bg-clay/10 text-clay" },
    retired: { label: "已停用", className: "bg-white/80 text-ink-soft" },
  },
  project: {
    planned: { label: "计划中", className: "bg-paper-deep/80 text-ink-soft" },
    active: { label: "进行中", className: "bg-moss-soft text-moss-dark" },
    paused: { label: "已暂停", className: "bg-clay/10 text-clay" },
    completed: { label: "已完成", className: "bg-moss text-white" },
    abandoned: { label: "已放弃", className: "bg-white/80 text-ink-soft" },
  },
  risk: {
    watching: { label: "观察中", className: "bg-moss-soft text-moss-dark" },
    mitigated: { label: "已缓解", className: "bg-moss text-white" },
    realized: { label: "已发生", className: "bg-clay/10 text-clay" },
    accepted: { label: "已接受", className: "bg-white/80 text-ink-soft" },
  },
};

/** 风险筛选顺序；「全部」在页面里单独加。 */
export const compassRiskStatusOrder: TelosRiskStatus[] = [
  "watching",
  "mitigated",
  "realized",
  "accepted",
];

export const compassControllabilityOptions: {
  value: TelosControllability;
  label: string;
  hint: string;
}[] = [
  { value: "in", label: "可控", hint: "我的行为能改变" },
  { value: "partial", label: "部分可控", hint: "能影响，不能决定" },
  { value: "out", label: "不可控", hint: "接受或绕开" },
];

export const compassRiskControlMeta: Record<
  "prevent" | "detect" | "respond",
  { label: string; hint: string }
> = {
  prevent: {
    label: "预防 Prevent",
    hint: "做什么能降低它发生的概率？",
  },
  detect: {
    label: "检测 Detect",
    hint: "怎么尽早知道它正在发生？没有检测手段是最危险的盲区。",
  },
  respond: {
    label: "应对 Respond",
    hint: "真的发生后，怎么把损失控制住？",
  },
};

export const compassRiskControlStateMeta: Record<
  TelosRiskControlState,
  { label: string; className: string }
> = {
  none: { label: "未准备", className: "bg-clay/10 text-clay" },
  partial: { label: "部分", className: "bg-paper-deep/90 text-ink-soft" },
  ready: { label: "就绪", className: "bg-moss-soft text-moss-dark" },
};

export type CompassTextCopy = {
  label: string;
  hint: string;
  placeholder: string;
};

export type CompassListCopy = CompassTextCopy & {
  add: string;
};

/** 分类专属字段的文案与提示。 */
export const compassFieldCopy = {
  problem: {
    description: {
      label: "问题描述",
      hint: "具体发生了什么？谁受影响？不要写成一句口号。",
      placeholder:
        "例：我在市场剧烈波动时没有稳定的决策流程，经常在情绪里买入和卖出，事后才发现自己违背了原本的计划。",
    },
    whyItMatters: {
      label: "为什么重要",
      hint: "如果这个问题一直存在，会付出什么代价？",
      placeholder: "例：每一次情绪化交易都在消耗本金和信心，长期复利根本无从谈起。",
    },
    evidence: {
      label: "证据",
      hint: "有哪些事实、数据或经历说明它真实存在？最多 5 条。",
      placeholder: "例：过去一年有 6 次在回撤超过 8% 时清仓，其中 4 次之后出现反弹。",
      add: "+ 添加一条证据",
    },
    scope: {
      label: "范围",
      hint: "这个问题覆盖哪些场景、人群或时间范围？",
      placeholder: "例：只涉及个人投资决策，不包括家庭资产配置。",
    },
  },
  goal: {
    successCriteria: {
      label: "成功标准",
      hint: "达成时能被谁、用什么证据检查？最多 5 条，不写「感觉好一点」。",
      placeholder: "例：连续 12 个月按同一套规则执行；年度回撤 ≤ 20%。",
      add: "+ 添加一条成功标准",
    },
    metricName: {
      label: "指标名称",
      hint: "最核心的一个可量化指标。",
      placeholder: "例：按规则执行率",
    },
    metricTarget: {
      label: "目标值",
      hint: "达到多少算成功。",
      placeholder: "例：≥ 90%",
    },
    metricCadence: {
      label: "统计频率",
      hint: "多久看一次。",
      placeholder: "例：每周",
    },
    deadline: {
      label: "截止日期",
      hint: "可以是一个明确的日期。",
      placeholder: "",
    },
    tradeoffs: {
      label: "取舍",
      hint: "目标不是加法，是交换。写下你愿意放弃的时间、舒适或机会。",
      placeholder: "例：每周少刷 5 小时短视频，把周末半天留给复盘。",
    },
    notDoing: {
      label: "明确不做",
      hint: "为了这个目标，我决定不做什么？最多 5 条。",
      placeholder: "例：不碰看不懂的标的；不在盘中临时改规则。",
      add: "+ 添加一条「不做」",
    },
  },
  challenge: {
    evidence: {
      label: "证据",
      hint: "这个障碍真实存在的具体证据是什么？",
      placeholder: "例：过去 6 个月里，有 4 次在下跌时临时卖出，之后又追高买回。",
    },
    rootCause: {
      label: "根因",
      hint: "不要停在「我不够自律」，继续问一层：是什么结构导致它反复发生？",
      placeholder: "例：我把「不亏钱」当成自我价值的证明，所以回撤不只是市场信号。",
    },
    controllability: {
      label: "可控性",
      hint: "只控制能控制的部分，别把精力花在不可控上。",
      placeholder: "",
    },
    severity: {
      label: "严重程度",
      hint: "它多大程度上挡住了目标？1 低，5 高。",
      placeholder: "",
    },
  },
  strategy: {
    hypothesis: {
      label: "策略假设",
      hint: "用一句话说：如果这样做，就能克服挑战。",
      placeholder:
        "例：如果先把仓位规则写死并回测，再用 12 个月只验证执行率，就能减少情绪化交易。",
    },
    assumptions: {
      label: "前提假设",
      hint: "这个策略成立依赖什么？最多 5 条。",
      placeholder: "例：我能提前写好规则；规则在极端行情下仍然可执行。",
      add: "+ 添加一条前提假设",
    },
    leadingIndicators: {
      label: "领先指标",
      hint: "在结果出现之前，什么信号能说明策略在起作用？最多 5 条。",
      placeholder: "例：每周复盘时记录执行率；连续 4 周没有临时改规则。",
      add: "+ 添加一条领先指标",
    },
    stopConditions: {
      label: "停止条件",
      hint: "出现什么情况时，应该停下来重新评估？最多 5 条。",
      placeholder: "例：连续两个季度执行率低于 70%；规则在回测外明显失效。",
      add: "+ 添加一条停止条件",
    },
  },
  project: {
    nextAction: {
      label: "下一步行动",
      hint: "小到今天就能开始。写一个动作，不写一个愿望。",
      placeholder: "例：今晚列出 5 条仓位规则，写成一张可以贴在桌上的卡片。",
    },
    milestones: {
      label: "里程碑",
      hint: "把项目拆成可以检查完成的小节点。",
      add: "+ 添加里程碑",
      textPlaceholder: "例：完成第一版规则卡",
      dueLabel: "截止",
      doneLabel: "已完成",
      removeLabel: "移除",
      empty: "还没有里程碑。先想一个两周内能完成的节点。",
    },
  },
  risk: {
    scenario: {
      label: "风险场景",
      hint: "具体描述什么情况会发生，而不是写「可能会失败」。",
      placeholder:
        "例：连续两个季度回撤超过 15%，我会开始怀疑整套系统，最终放弃并回到凭感觉交易。",
    },
    probability: {
      label: "发生概率",
      hint: "1 = 几乎不会，5 = 很可能发生。",
      placeholder: "",
    },
    impact: {
      label: "影响程度",
      hint: "1 = 影响很小，5 = 会严重偏离理想状态。",
      placeholder: "",
    },
    notePlaceholder: "备注：具体做什么、由谁来做、多久检查一次。",
  },
} as const;

/** 当前结构统计暂时隐藏；需要恢复时改为 true。 */
export const COMPASS_SHOW_STATS: boolean = false;

export const compassPageCopy = {
  title: "人生罗盘",
  newProblem: "新建问题",
  newRisk: "新建风险",
  statsTitle: "当前结构",
  blindSpotLabel: "检测缺口",
  blindSpotHint: "有预防意识、但没有检测手段的风险数量",
  treeTitle: "五级链",
  treeEmptyTitle: "还没有问题",
  treeEmptyDesc:
    "罗盘的起点是一个你想解决的真实问题。先写下它，再往下长目标、挑战、策略和项目。",
  riskTitle: "风险登记册",
  riskEmptyTitle: "还没有登记风险",
  riskEmptyDesc:
    "想想什么情况会让你偏离理想状态。写下场景，再标出预防、检测、应对各做到什么程度。",
  riskAll: "全部风险",
  snapshotsTitle: "快照",
  snapshotsDesc: "手动记录当前档案和全部条目，之后可以两两对比，看到自己的变化。",
  createSnapshot: "记录这一刻",
  creatingSnapshot: "记录中…",
  snapshotCreated: "已记录当前状态",
  snapshotCreateFailed: "快照创建失败，请重试",
  snapshotEmpty: "还没有快照。先记录一次，之后每过一段时间再记录一次，就能看到差异。",
  snapshotViewAll: "打开快照对比",
  deleteFailed: "删除失败，请重试",
};

export const compassCreateCopy = {
  title: "新建条目",
  desc: "先只写标题。建好之后进入详情页，再补这一类需要的字段。",
  titleLabel: "标题",
  submit: "创建并开始填写",
  creating: "创建中…",
  cancel: "取消",
  failed: "创建失败，请重试",
  rootHint: "这是一个根级条目。",
  childHintPrefix: "它会被挂在",
  childHintSuffix: "的下一级。",
};

export const compassCreatePlaceholder: Record<TelosCategory, string> = {
  problem: "例：我还没有一套在剧烈波动时仍然能执行的决策系统。",
  goal: "例：12 个月内建立并验证一套可执行的投资决策系统。",
  challenge: "例：一遇到回撤就会临时改规则，事后才发现是情绪驱动。",
  strategy: "例：先把规则写死并回测，用 12 个月只验证执行率。",
  project: "例：本月完成第一版规则卡和回测记录表。",
  risk: "例：连续两个季度回撤超过 15%，我可能会放弃整套系统。",
};

export const compassItemCopy = {
  back: "返回人生罗盘",
  notFound: "这个条目不存在，可能已经被删除了。",
  titlePlaceholder: "未命名条目",
  statusLabel: "状态",
  parentLabel: "上级",
  parentEmpty: "没有可选的上级",
  sortLabel: "同级排序",
  moveUp: "上移",
  moveDown: "下移",
  saveIdle: "改动会自动保存",
  saveDirty: "有未保存的改动",
  saveSaving: "保存中…",
  saveSaved: "已保存",
  saveError: "保存失败，点击重试",
  saveAction: "保存",
  savePending: "保存中…",
  childrenTitle: "下一级",
  childrenDesc: "这一条往下拆出的内容。",
  childrenEmpty: "还没有下一级。先加一个，把它继续往下拆。",
  addChild: "添加",
  deleteTitle: "删除这一条",
  deleteHint:
    "删除会连同所有下级一起消失，无法恢复。只是暂时不推进的话，先把状态改成暂停、归档或已放弃。",
  deleteItem: "删除",
  deletePending: "删除中…",
  deleteFailed: "删除失败，请重试",
  createdAt: "创建于",
  backAction: "返回罗盘",
};

export const compassSnapshotsCopy = {
  eyebrow: "Snapshots",
  title: "快照对比",
  description: "快照不可变。选两份对比，看看这段时间新增、删除、改动了什么。",
  back: "返回人生罗盘",
  listTitle: "全部快照",
  listDesc: "按记录时间倒序。A 是变更前，B 是变更后。",
  emptyTitle: "还没有快照",
  emptyDesc: "回到人生罗盘，点「记录这一刻」保存当前档案和全部条目。",
  emptyAction: "返回人生罗盘",
  selectA: "选为 A",
  selectB: "选为 B",
  clearSelection: "取消选择",
  delete: "删除",
  deleting: "删除中…",
  deleteConfirm: "快照删除后无法恢复。确定删除这份快照吗？",
  deleteFailed: "删除失败，请重试",
  compareTitle: "对比",
  compareHint: "选择两份快照查看差异。A 是变更前，B 是变更后。",
  itemCount: "条",
  loading: "正在读取快照…",
  loadFailed: "快照读取失败，请重试",
  missing: "其中一份快照不存在，可能已经被删除。",
  swap: "交换 A / B",
  noSnapshotsHint: "先创建至少两份快照，才能对比变化。",
};

export const compassDiffCopy = {
  profileTitle: "档案变化",
  profileEmpty: "两段档案文字没有变化。",
  noChanges: "两份快照之间没有条目差异。",
  addedTitle: "新增",
  removedTitle: "删除",
  changedTitle: "变化",
  unchangedLabel: "未变化",
  beforeLabel: "之前",
  afterLabel: "之后",
  noParent: "（无上级）",
  profileFields: {
    mission: "使命",
    currentState: "当前状态",
    idealState: "理想状态",
  },
  itemFields: {
    title: "标题",
    status: "状态",
    parentId: "上级",
  },
  parentMovedPrefix: "从",
  parentMovedMiddle: "移到",
  dataFieldLabels: {
    description: "问题描述",
    whyItMatters: "为什么重要",
    evidence: "证据",
    scope: "范围",
    successCriteria: "成功标准",
    metric: "指标",
    deadline: "截止日期",
    tradeoffs: "取舍",
    notDoing: "明确不做",
    rootCause: "根因",
    controllability: "可控性",
    severity: "严重程度",
    hypothesis: "策略假设",
    assumptions: "前提假设",
    leadingIndicators: "领先指标",
    stopConditions: "停止条件",
    nextAction: "下一步行动",
    milestones: "里程碑",
    scenario: "风险场景",
    probability: "发生概率",
    impact: "影响程度",
    prevent: "预防",
    detect: "检测",
    respond: "应对",
  } as Record<string, string>,
};
