import type { FearStepKey } from "../../shared/types";

/** 列表筛选：默认只展示未归档，归档可逆。 */
export const fearFilters = {
  active: "未归档",
  archived: "已归档",
} as const;

export const fearCardCopy = {
  activeHint: "继续拆解下一步",
  archivedHint: "归档记录，可随时恢复",
};

export type FearStep = {
  key: FearStepKey;
  index: number;
  title: string;
  short: string;
  icon: string;
  /** 这一步的主问题，放在卡片顶部当引导语。 */
  prompt: string;
  hint: string;
  placeholder: string;
};

export const fearSteps: FearStep[] = [
  {
    key: "fear",
    index: 1,
    title: "识别恐惧",
    short: "恐惧",
    icon: "🫨",
    prompt: "我具体在害怕什么？",
    hint: "写具体场景，不写抽象情绪。不是「我很焦虑」，而是「下周三汇报时，我怕被问住」。",
    placeholder: "例：下周的季度汇报，我怕被问到答不上来的问题，被同事认为不专业。",
  },
  {
    key: "rootCause",
    index: 2,
    title: "寻找根因",
    short: "根因",
    icon: "🕳",
    prompt: "为什么害怕？如果它真的发生，最坏会怎样？发生的概率有多大？",
    hint: "继续往下问一层。答案不是「我就是胆小」，而是某个具体的失去：被否定、失去机会、失去关系。",
    placeholder:
      "例：我怕的不是答不上来，而是被当成「不专业的人」，之前被否定的感觉又回来一次。",
  },
  {
    key: "problem",
    index: 3,
    title: "定义问题",
    short: "问题",
    icon: "🧩",
    prompt: "把恐惧翻译成一个可以处理的问题。",
    hint: "恐惧是情绪，问题是可以被回答的对象。试着写成「我需要解决的是……」。",
    placeholder:
      "例：我需要解决的是：如何在汇报前准备好被追问的高风险问题，并在答不上来时体面地接住。",
  },
  {
    key: "action",
    index: 4,
    title: "转化为任务",
    short: "行动",
    icon: "🛠",
    prompt: "下一步具体做什么？小到今天就能开始。",
    hint: "写一个动作，不写一个愿望。能在一小时内做完的，比「以后要多准备」有用。",
    placeholder:
      "例：今晚列出 5 个最可能被追问的问题，各写 3 句回答；明天找同事模拟一次。",
  },
  {
    key: "evidence",
    index: 5,
    title: "验证与反馈",
    short: "证据",
    icon: "📊",
    prompt: "做完之后，实际发生了什么？我取得了什么证据？",
    hint: "用事实回答，不用「感觉好一点」。写清楚做了什么、结果是什么、下一步怎么调。",
    placeholder:
      "例：列了 5 个问题，模拟时被问住 1 个；正式汇报没有被问倒，比上次多讲了 2 分钟。",
  },
];

/** 标题为空时的兜底文案。 */
export const FEAR_UNTITLED = "未命名恐惧";

export const fearsPageCopy = {
  title: "恐惧清单",
  description:
    "把一条模糊的恐惧拆成五步：识别、找根因、定义问题、变成动作、用证据验证。写下来之后，它才有机会被处理，而不是一直在脑子里放大。",
  newFear: "新建恐惧",
  emptyTitle: "还没有写下的恐惧",
  emptyDesc:
    "恐惧在脑子里会放大。先写一条最具体的：你此刻在回避什么？不用写完整，第 1 步就够了。",
  archivedEmptyTitle: "还没有归档的恐惧",
  archivedEmptyDesc:
    "事件完全结束后，可以在详情页把它归档。归档不会删除内容，随时可以取消归档。",
};

export const newFearCopy = {
  title: "写下一条恐惧",
  desc: "先只写第 1 步。剩下的四步，等它被写下来之后再说。",
  label: "我具体在害怕什么？",
  hint: "写具体场景，不写抽象情绪。可以之后回来补。",
  placeholder: "例：下周三的季度汇报，我怕被问到答不上来的问题。",
  submit: "创建并开始拆解",
  creating: "创建中…",
  cancel: "取消",
};

export const fearDetailCopy = {
  back: "全部恐惧",
  saveIdle: "改动会自动保存",
  saveDirty: "有未保存的改动",
  saveSaving: "保存中…",
  saveSaved: "已保存",
  saveError: "保存失败，点击重试",
  notFound: "这条恐惧不存在，可能已经被删除了。",
  archivedBadge: "已归档",
  archive: "归档",
  unarchive: "取消归档",
  archiveHint: "事件完全结束后归档，记录保留，可随时恢复。",
  unarchiveHint: "恢复到未归档列表，继续编辑。",
  archiveFailed: "归档失败，请重试",
  unarchiveFailed: "取消归档失败，请重试",
  deleteFear: "删除这条恐惧",
  deleteConfirm: "删除后，这条恐惧的五步内容都会消失。确定吗？",
  createdAt: "创建于",
  deleteTitle: "不再需要这条记录？",
  deleteHint: "删除后五步内容会一起消失，无法恢复。",
};

/** 第 3 步与第 4 步之间的可选权衡分析。 */
export const fearAnalysisCopy = {
  title: "权衡分析",
  optional: "可选",
  expand: "展开分析",
  collapse: "收起分析",
  benefitsLabel: "潜在好处",
  benefitsHint: "如果这件事做成，最值得的是什么？写具体一点，最多 3 条。",
  addBenefit: "+ 添加一条好处",
  confidenceLabel: "你有多大的把握能取得一个「至少还算不错」的结果？",
  confidenceHint: "不是做到最好，而是「至少不算失败」。1 = 几乎没把握，5 = 很有把握；再次点击已选值可清除。",
  precedentLabel: "历史案例",
  precedentHint:
    "历史上，有没有比你更普通（甚至没你聪明）的人做过类似的事，并且成功了？写清楚是谁、做了什么、结果如何，不要只写「肯定有人做到过」。",
  impactLabel: "这件事对我的影响程度",
  impactHint: "如果一直不解决，它对你生活的影响有多大？",
  inactionTitle: "如果什么都不做",
  inaction: {
    sixMonths: {
      label: "6 个月后",
      hint: "如果保持现状，半年后你的财务状况、情绪状态和身体健康会付出什么代价？",
    },
    oneYear: {
      label: "1 年后",
      hint: "一年过去，如果你依然停留在原地，会错过哪些机会或产生怎样的遗憾？",
    },
    threeYears: {
      label: "3 年后",
      hint: "三年后回望今天，维持现状会给你的人生带来多大程度的负面累积？",
    },
  },
};
