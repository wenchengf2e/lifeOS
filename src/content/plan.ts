import type { PlanPeriodType } from "../../shared/types";

/** 每个周期最多 3 个重点。 */
export const MAX_PLAN_PRIORITIES = 3;

/** 主题和单条重点的字符上限，与输入框 maxLength 同步。 */
export const PLAN_THEME_MAX_LENGTH = 200;
export const PLAN_PRIORITY_MAX_LENGTH = 200;

export const planPageCopy = {
  title: "周 / 月计划",
  description:
    "在每个周 / 月开始前，用几分钟写下本期主题和 1–3 个重点。它们不记录完成状态，只给每天的行动一个上层坐标。",
  save: "保存计划",
  saving: "保存中…",
  saved: "已保存到云端",
  dirty: "有改动还没保存",
  empty: "这个周期还没有写计划。",
  clearHint: "主题和重点都清空后保存，会清掉这个周期的计划。",
};

export const planPeriodTabs: { type: PlanPeriodType; label: string }[] = [
  { type: "week", label: "周计划" },
  { type: "month", label: "月计划" },
];

export const planFieldCopy = {
  themeLabel: "一句话主题",
  themeHint: "这个周期最重要的方向，一句话就够。",
  themePlaceholder: "例：把交付节奏跑顺，同时把投资规则跑完一轮。",
  priorityLabel: "1–3 个重点",
  priorityHint: "纯文本提醒，不记录完成状态，也不写入清单或目标。",
  priorityPlaceholder: (index: number) => `重点 ${index + 1}：……`,
};

export const planHistoryCopy = {
  title: "历史周期",
  weekEmpty: "还没有写过的周。保存后会自动出现在这里。",
  monthEmpty: "还没有写过的月。保存后会自动出现在这里。",
};

export const planReminderCopy = {
  weekTitle: (weekNumber: number) => `本周 · 第 ${weekNumber} 周`,
  weekEmptyTitle: "本周还没定调",
  weekEmptyHint: "花几分钟写下这周的主题和重点，今天的行动会更有方向。",
  monthLabel: "本月主题",
  monthEmpty: "还没写",
  edit: "去调整 →",
  create: "去定调 →",
  monthLink: "切到月计划 →",
};
