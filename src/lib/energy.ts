import type { EnergySessionEntry, EnergyToolKey } from "../../shared/types";
import { isEnergyToolKey } from "../../shared/types";
import { energyTools, type EnergyQuestion, type EnergyTool } from "../content/energy";
import { formatDateCN, pad2, toDateKey } from "./date";

export type EnergyToolFilter = EnergyToolKey | "all";

export type EnergyProgress = {
  /** 已填写（去空白后非空）的题数。 */
  answered: number;
  total: number;
  percent: number;
  doneKeys: string[];
  /** 第一道未答题的 1-based 题号；全部答完时停在最后一题。 */
  nextStep: number;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function firstLine(value: string): string {
  return value.split(/\r?\n/)[0]?.trim() ?? "";
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/** 工具配置在 src/content/energy.ts；配置里删掉某个工具时返回 undefined。 */
export function getEnergyTool(key: string): EnergyTool | undefined {
  return energyTools.find((tool) => tool.key === key);
}

export function energyQuestions(session: EnergySessionEntry): EnergyQuestion[] {
  return getEnergyTool(session.tool)?.questions ?? [];
}

export function energyAnswer(session: EnergySessionEntry, questionKey: string): string {
  return session.data?.answers?.[questionKey] ?? "";
}

export function energyProgress(session: EnergySessionEntry): EnergyProgress {
  const questions = energyQuestions(session);
  const answers = session.data?.answers ?? {};
  const doneKeys = questions.filter((question) => hasText(answers[question.key])).map((q) => q.key);
  const firstUnanswered = questions.findIndex((question) => !hasText(answers[question.key]));

  return {
    answered: doneKeys.length,
    total: questions.length,
    percent: questions.length > 0 ? Math.round((doneKeys.length / questions.length) * 100) : 0,
    doneKeys,
    nextStep:
      firstUnanswered === -1 ? Math.max(questions.length, 1) : firstUnanswered + 1,
  };
}

export function firstUnansweredStep(session: EnergySessionEntry): number {
  return energyProgress(session).nextStep;
}

/** 卡片预览：第一条有内容的回答，单行截断。 */
export function energySummary(session: EnergySessionEntry): string {
  for (const question of energyQuestions(session)) {
    const answer = energyAnswer(session, question.key);
    if (hasText(answer)) return truncate(firstLine(answer), 96);
  }
  return "";
}

/** 按更新时间倒序；时间相同再按创建时间倒序。 */
export function sortEnergySessions(entries: EnergySessionEntry[]): EnergySessionEntry[] {
  return [...entries].sort((a, b) => {
    const byUpdated = b.updatedAt.localeCompare(a.updatedAt);
    if (byUpdated !== 0) return byUpdated;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterEnergySessions(
  entries: EnergySessionEntry[],
  filter: EnergyToolFilter,
): EnergySessionEntry[] {
  if (filter === "all") return entries;
  return entries.filter((entry) => entry.tool === filter);
}

export function energyToolCounts(
  entries: EnergySessionEntry[],
): Record<EnergyToolKey, number> {
  const counts: Record<EnergyToolKey, number> = {
    awareness: 0,
    manifestation: 0,
    reframe: 0,
    behavior: 0,
  };
  for (const entry of entries) {
    if (isEnergyToolKey(entry.tool)) counts[entry.tool] += 1;
  }
  return counts;
}

/** 练习卡片的跳转：已完成默认全文回看，未完成从第一道未答题继续。 */
export function energySessionHref(session: EnergySessionEntry): string {
  if (session.completed) return `/energy/${session.id}`;
  return `/energy/${session.id}?mode=write&step=${firstUnansweredStep(session)}`;
}

/** 「11 月 17 日 · 周二 14:30」；时间戳异常时返回空串。 */
export function formatEnergyTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = formatDateCN(toDateKey(date), { withWeekday: true });
  return `${day} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function energyQuestionProgressLabel(current: number, total: number) {
  return `第 ${current} / ${total} 题`;
}
