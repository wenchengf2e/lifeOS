import type { FearStepKey } from "../../shared/types";

/** 派生状态：不存字段，只看第 4、5 步有没有内容。 */
export type FearStage = "pending_action" | "pending_proof" | "verified";

export const fearStageMeta: Record<
  FearStage,
  { label: string; className: string; hint: string }
> = {
  pending_action: {
    label: "待行动",
    className: "bg-paper-deep/80 text-ink-soft",
    hint: "第 4 步还没写：这条恐惧还没有变成动作。",
  },
  pending_proof: {
    label: "待验证",
    className: "bg-clay/10 text-clay",
    hint: "下一步已经写好了，还没有回去看结果。",
  },
  verified: {
    label: "已验证",
    className: "bg-moss-soft text-moss-dark",
    hint: "已经拿到一次真实反馈，可以决定继续、调整还是放下。",
  },
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
    prompt: "为什么害怕？如果它真的发生，最坏会怎样？",
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
  eyebrow: "Fear → Action",
  title: "恐惧清单",
  description:
    "把一条模糊的恐惧拆成五步：识别、找根因、定义问题、变成动作、用证据验证。写下来之后，它才有机会被处理，而不是一直在脑子里放大。",
  newFear: "新建恐惧",
  statsTotal: "共",
  statsUnit: "条",
  emptyTitle: "还没有写下的恐惧",
  emptyDesc:
    "恐惧在脑子里会放大。先写一条最具体的：你此刻在回避什么？不用写完整，第 1 步就够了。",
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
  deleteFear: "删除这条恐惧",
  deleteConfirm: "删除后，这条恐惧的五步内容都会消失。确定吗？",
  createdAt: "创建于",
  deleteTitle: "不再需要这条记录？",
  deleteHint: "删除后五步内容会一起消失，无法恢复。",
};
