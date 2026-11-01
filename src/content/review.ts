import type { PatternStatus } from "../../shared/types";

/** 聚焦技巧：一周只允许挑三件，多一件都不行。 */
export const MAX_FOCUS_ITEMS = 3;

/** 同时处于「观察中」的模式卡上限，防止模式库通货膨胀。 */
export const MAX_ACTIVE_PATTERNS = 5;

export type ReviewStepKey = "focus" | "connect" | "abstract" | "act";

export type ReviewStep = {
  key: ReviewStepKey;
  index: number;
  title: string;
  technique: string;
  desc: string;
};

export const reviewSteps: ReviewStep[] = [
  {
    key: "focus",
    index: 1,
    title: "聚焦",
    technique: "聚焦 · 切分",
    desc: "先写下这周做成了什么，再从七天的记录里挑出最重要的三件。挑不满可以，超过三件不行——面面俱到等于没有重点。",
  },
  {
    key: "connect",
    index: 2,
    title: "联结",
    technique: "联结",
    desc: "把选中的几件事并排看，问一句：它们背后是不是同一件事？反复出现的东西，才是树干。",
  },
  {
    key: "abstract",
    index: 3,
    title: "抽象化",
    technique: "抽象化",
    desc: "把共同点收成一句能复用的话。它应该能解释过去，也能预测下次。写不成一句话，说明还没想清楚。",
  },
  {
    key: "act",
    index: 4,
    title: "具体化",
    technique: "具体化",
    desc: "把结论落到下周的动作上。写不出动作，说明前面几步只是自我安慰。",
  },
];

export const reviewPageCopy = {
  eyebrow: "Weekly Review",
  title: "复盘",
  description:
    "日记是原料，周复盘是加工，模式卡是资产。每周花二十分钟，把散落的七天收成一句能带走的话。",
};

export const focusStepCopy = {
  winsLabel: "本周做成了什么",
  winsPrompt: "先给证据，再看问题。写完再往下走。",
  winsPlaceholder: "例：把复盘模块的表结构和 API 跑通了；连续四天在 9 点前开始工作。",
  listTitle: "本周的七天",
  listEmpty: "这周还没有任何记录。先去写几条，再回来复盘。",
  selectedLabel: "已选",
  controllableLabel: "可控 / 不可控",
  controllableIn: "我能改变",
  controllableOut: "改变不了",
};

export const connectStepCopy = {
  title: "它们的共同点是什么",
  prompt:
    "不要总结每件事各自说明了什么，只回答一件事：它们为什么会同时出现在我这一周里？",
  placeholder:
    "例：这三件事都是在「没人催我」的时候发生的；我都是在等一个足够好的版本，结果什么都没发出去。",
  empty: "还没有选中任何记录，回上一步挑三件。",
};

export const abstractStepCopy = {
  title: "提炼出一句可复用的规律",
  prompt:
    "用「当我……的时候，我通常会……，因为……」的句式写。它要能解释这一周，也能预测下一周。",
  placeholder:
    "例：当一件事没有外部截止时间时，我通常会先做别人的事，因为我怕做出来的东西被评价。",
  patternTitle: "落成一张模式卡",
  patternHint: "模式卡会一直留在库里，以后每次复盘都能挂上去、继续加证据。",
  existingLabel: "挂到已有模式",
  newLabel: "新建模式卡",
};

export const actStepCopy = {
  title: "下周要做的具体动作",
  prompt: "一到三条，每条都要能在下周内被验证完成。写「多写点」不算动作。",
  placeholder: "例：周三之前把复盘模块的 V1 部署上线，并在群里发一次链接。",
  addAction: "再加一条",
  writeToList: "同时写入清单",
  writeToListHint: "勾选后，这些动作会出现在「清单 → 复盘动作」里，方便下周回来打勾。",
};

export const patternFields = [
  {
    key: "trigger" as const,
    label: "触发条件",
    hint: "什么情况下会出现",
    placeholder: "例：任务没人催、也没有明确截止日期的时候",
  },
  {
    key: "reaction" as const,
    label: "我的反应",
    hint: "我通常怎么做",
    placeholder: "例：先去做别的，把它一直推到明天",
  },
  {
    key: "payoff" as const,
    label: "短期收益",
    hint: "它保护了我什么",
    placeholder: "例：避免做出一个会被评价的东西",
  },
  {
    key: "cost" as const,
    label: "长期代价",
    hint: "我为此付出了什么",
    placeholder: "例：三个月过去，作品还是零",
  },
  {
    key: "alternative" as const,
    label: "替代动作",
    hint: "下次可以怎么做",
    placeholder: "例：先做一个 30 分钟内能发出去的粗版",
  },
];

export const patternStatusMeta: Record<
  PatternStatus,
  { label: string; desc: string; className: string }
> = {
  watching: {
    label: "观察中",
    desc: "还在收集证据，不确定是不是稳定的模式",
    className: "bg-paper-deep/70 text-clay",
  },
  verified: {
    label: "已验证",
    desc: "多次出现，确认是稳定模式，可以开始替换",
    className: "bg-moss-soft text-moss-dark",
  },
  retired: {
    label: "已放下",
    desc: "已经不再重复，留档备查",
    className: "bg-white/70 text-ink-soft",
  },
};
