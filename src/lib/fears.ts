import type { FearData, FearEntry, FearStepKey } from "../../shared/types";
import { FEAR_UNTITLED, fearSteps } from "../content/fears";

export type FearProgress = {
  completed: number;
  percent: number;
  done: FearStepKey[];
  nextStep: FearStepKey | null;
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

/** 列表标题取第 1 步内容的第一行；空内容用兜底文案，超长截断。 */
export function fearTitle(data: FearData): string {
  const title = firstLine(data.fear);
  return title ? truncate(title, 48) : FEAR_UNTITLED;
}

export function fearProgress(data: FearData): FearProgress {
  const done = fearSteps
    .filter((step) => hasText(data[step.key]))
    .map((step) => step.key);
  const next = fearSteps.find((step) => !done.includes(step.key))?.key ?? null;
  return {
    completed: done.length,
    percent: Math.round((done.length / fearSteps.length) * 100),
    done,
    nextStep: next,
  };
}

/** 按显式归档标记过滤；列表默认只看未归档。 */
export function filterFears(entries: FearEntry[], archived: boolean): FearEntry[] {
  return entries.filter((entry) => entry.archived === archived);
}

/** 按更新时间倒序；时间相同再按创建时间倒序。 */
export function sortFears(entries: FearEntry[]): FearEntry[] {
  return [...entries].sort((a, b) => {
    if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

/** 卡片上的下一步预览：优先展示第 4 步，还没写就提示先完成它。 */
export function fearNextStepPreview(data: FearData): string {
  const action = firstLine(data.action);
  if (action) return `下一步：${truncate(action, 80)}`;
  return "下一步：还没写。第 4 步会把它变成一个今天就能开始的动作。";
}
