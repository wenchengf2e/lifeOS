import {
  PLAN_PERIOD_TYPES,
  type DocumentEntry,
  type PeriodPlanData,
  type PlanPeriodType,
} from "../../shared/types";
import {
  MAX_PLAN_PRIORITIES,
  PLAN_PRIORITY_MAX_LENGTH,
  PLAN_THEME_MAX_LENGTH,
} from "../content/plan";
import { isoWeekNumber, monthLabel, weekRangeLabel } from "./date";

/** 计划存在 documents 里：module 固定为 plan，key 带周期类型前缀。 */
export const PLAN_MODULE = "plan";

export type NormalizedPlan = {
  theme: string;
  priorities: string[];
};

export type PlanPeriodEntry = {
  periodType: PlanPeriodType;
  periodKey: string;
  plan: NormalizedPlan;
  updatedAt: string;
};

export function weekPlanKey(weekKey: string) {
  return `week-${weekKey}`;
}

export function monthPlanKey(monthKey: string) {
  return `month-${monthKey}`;
}

export function planKeyFor(periodType: PlanPeriodType, periodKey: string) {
  return periodType === "week" ? weekPlanKey(periodKey) : monthPlanKey(periodKey);
}

/** 周键 YYYY-Www（周号 01–53），月键 YYYY-MM。 */
export function isValidPlanPeriodKey(periodType: PlanPeriodType, periodKey: string) {
  if (periodType === "week") {
    if (!/^\d{4}-W\d{2}$/.test(periodKey)) return false;
    const week = Number(periodKey.slice(-2));
    return week >= 1 && week <= 53;
  }
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey);
}

/** 从 documents 的 key 解析周期；不是计划键或格式非法时返回 null。 */
export function parsePlanKey(
  key: string,
): { periodType: PlanPeriodType; periodKey: string } | null {
  for (const periodType of PLAN_PERIOD_TYPES) {
    const prefix = `${periodType}-`;
    if (!key.startsWith(prefix)) continue;
    const periodKey = key.slice(prefix.length);
    if (isValidPlanPeriodKey(periodType, periodKey)) return { periodType, periodKey };
  }
  return null;
}

export function findPlanEntry(
  documents: DocumentEntry[],
  periodType: PlanPeriodType,
  periodKey: string,
) {
  const key = planKeyFor(periodType, periodKey);
  return documents.find((doc) => doc.module === PLAN_MODULE && doc.key === key);
}

/** 读取并规范化：非字符串丢弃、trim、过滤空行、最多 3 条。 */
export function readPlanData(entry: DocumentEntry | undefined): NormalizedPlan {
  const raw = entry?.data;
  const theme = typeof raw?.theme === "string" ? raw.theme.trim() : "";
  const priorities = Array.isArray(raw?.priorities)
    ? raw.priorities
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, MAX_PLAN_PRIORITIES)
    : [];
  return { theme, priorities };
}

/** 保存前规范化：trim、过滤空行、截断长度和条数；全空也允许保存（用于清空）。 */
export function normalizePlanData(form: PeriodPlanData): NormalizedPlan {
  const theme = (form.theme ?? "").trim().slice(0, PLAN_THEME_MAX_LENGTH);
  const priorities = (form.priorities ?? [])
    .map((item) => item.trim().slice(0, PLAN_PRIORITY_MAX_LENGTH))
    .filter((item) => item.length > 0)
    .slice(0, MAX_PLAN_PRIORITIES);
  return { theme, priorities };
}

export function isPlanFilled(plan: NormalizedPlan) {
  return plan.theme.length > 0 || plan.priorities.length > 0;
}

/** 只返回已填写的周期，按 periodKey 倒序（YYYY-Www / YYYY-MM 可直接比较）。 */
export function listPlanPeriods(
  documents: DocumentEntry[],
  periodType: PlanPeriodType,
): PlanPeriodEntry[] {
  const result: PlanPeriodEntry[] = [];
  for (const doc of documents) {
    if (doc.module !== PLAN_MODULE) continue;
    const parsed = parsePlanKey(doc.key);
    if (!parsed || parsed.periodType !== periodType) continue;
    const plan = readPlanData(doc);
    if (!isPlanFilled(plan)) continue;
    result.push({ ...parsed, plan, updatedAt: doc.updatedAt });
  }
  return result.sort((a, b) =>
    a.periodKey === b.periodKey ? 0 : a.periodKey < b.periodKey ? 1 : -1,
  );
}

/** 周：「第 48 周 · 11 月 23 日 – 11 月 29 日」；月：「2026 年 十一月」。 */
export function planPeriodLabel(periodType: PlanPeriodType, periodKey: string) {
  if (!isValidPlanPeriodKey(periodType, periodKey)) return periodKey;
  if (periodType === "week") {
    return `第 ${isoWeekNumber(periodKey)} 周 · ${weekRangeLabel(periodKey)}`;
  }
  const year = Number(periodKey.slice(0, 4));
  const month = Number(periodKey.slice(5, 7));
  return monthLabel(year, month - 1);
}
