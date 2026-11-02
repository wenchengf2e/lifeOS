import type { GoalData, GoalEntry, GoalPracticeLog, GoalProblem } from "../../shared/types";
import { createEmptyGoalData } from "../../shared/types";
import {
  STALE_GOAL_DAYS,
  goalDomains,
  goalSteps,
  type GoalStepKey,
} from "../content/goals";
import { formatDateCN, parseDateKey, todayKey } from "./date";

export type GoalProgress = {
  completed: number;
  percent: number;
  done: GoalStepKey[];
  nextStep: GoalStepKey | null;
};

export type GoalChecklistItem = {
  label: string;
  done: boolean;
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

export function goalStepDone(step: GoalStepKey, data: GoalData): boolean {
  switch (step) {
    case "goal":
      return hasText(data.goal.statement) && data.goal.successCriteria.some(hasText);
    case "problem": {
      const items = data.problem.items.filter((item) => hasText(item.title));
      return (
        items.length > 0 &&
        Boolean(
          data.problem.keyProblemId &&
            items.some((item) => item.id === data.problem.keyProblemId),
        )
      );
    }
    case "diagnosis":
      return hasText(data.diagnosis.rootCause) && hasText(data.diagnosis.conclusion);
    case "plan":
      return (
        hasText(data.plan.strategy) &&
        (data.plan.milestones.some((item) => hasText(item.text)) ||
          data.plan.weeklyActions.some(hasText))
      );
    case "practice":
      return data.practice.logs.some((log) => hasText(log.did) || hasText(log.evidence));
  }
}

export function goalProgress(data: GoalData): GoalProgress {
  const done = goalSteps.filter((step) => goalStepDone(step.key, data)).map((step) => step.key);
  const next = goalSteps.find((step) => !done.includes(step.key))?.key ?? null;
  return {
    completed: done.length,
    percent: Math.round((done.length / goalSteps.length) * 100),
    done,
    nextStep: next,
  };
}

export function goalStepChecklist(step: GoalStepKey, data: GoalData): GoalChecklistItem[] {
  switch (step) {
    case "goal":
      return [
        { label: "写下目标陈述", done: hasText(data.goal.statement) },
        {
          label: "至少一条成功标准",
          done: data.goal.successCriteria.some(hasText),
        },
      ];
    case "problem":
      return [
        {
          label: "至少一张写了标题的问题卡",
          done: data.problem.items.some((item) => hasText(item.title)),
        },
        {
          label: "选中一个关键问题",
          done: Boolean(
            data.problem.keyProblemId &&
              data.problem.items.some(
                (item) => item.id === data.problem.keyProblemId && hasText(item.title),
              ),
          ),
        },
      ];
    case "diagnosis":
      return [
        { label: "写清根本原因", done: hasText(data.diagnosis.rootCause) },
        { label: "写下一句诊断结论", done: hasText(data.diagnosis.conclusion) },
      ];
    case "plan":
      return [
        { label: "写清策略", done: hasText(data.plan.strategy) },
        {
          label: "至少一个里程碑或一条每周动作",
          done:
            data.plan.milestones.some((item) => hasText(item.text)) ||
            data.plan.weeklyActions.some(hasText),
        },
      ];
    case "practice":
      return [
        {
          label: "至少一条践行记录",
          done: data.practice.logs.some((log) => hasText(log.did) || hasText(log.evidence)),
        },
      ];
  }
}

export function keyProblemOf(data: GoalData): GoalProblem | null {
  if (!data.problem.keyProblemId) return null;
  return (
    data.problem.items.find(
      (item) => item.id === data.problem.keyProblemId && hasText(item.title),
    ) ?? null
  );
}

export function lastPracticeLog(goal: GoalEntry): GoalPracticeLog | null {
  return goal.data.practice.logs
    .filter((log) => /^\d{4}-\d{2}-\d{2}$/.test(log.date))
    .reduce<GoalPracticeLog | null>((latest, log) => {
      if (!latest) return log;
      return log.date >= latest.date ? log : latest;
    }, null);
}

export function daysSince(dateKey: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return Number.POSITIVE_INFINITY;
  const then = parseDateKey(dateKey).getTime();
  const now = parseDateKey(todayKey()).getTime();
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

export function isGoalStale(goal: GoalEntry): boolean {
  if (goal.status !== "active") return false;
  const last = lastPracticeLog(goal);
  const since = last ? daysSince(last.date) : daysSince(goal.createdAt.slice(0, 10));
  return since > STALE_GOAL_DAYS;
}

export function goalDomainOf(domain: string) {
  return goalDomains.find((item) => item.key === domain) ?? goalDomains[goalDomains.length - 1];
}

const STATUS_ORDER: Record<GoalEntry["status"], number> = {
  active: 0,
  draft: 1,
  paused: 2,
  achieved: 3,
  archived: 4,
};

export function sortGoals(goals: GoalEntry[]): GoalEntry[] {
  return [...goals].sort((a, b) => {
    const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (byStatus !== 0) return byStatus;
    return a.updatedAt < b.updatedAt ? 1 : -1;
  });
}

export function activeGoalCount(goals: GoalEntry[]): number {
  return goals.filter((goal) => goal.status === "active").length;
}

export function goalDeadlineLabel(goal: GoalEntry): string {
  const deadline = goal.data.goal.deadline;
  if (!deadline) return "未设期限";
  const label = formatDateCN(deadline, { withYear: true });
  if (goal.status === "active" && deadline < todayKey()) return `已过期 · ${label}`;
  return label;
}

export function goalPracticeLabel(goal: GoalEntry): string {
  const last = lastPracticeLog(goal);
  if (!last) return "还没开始";
  const days = daysSince(last.date);
  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  return `${days} 天前`;
}

export function newGoalData(deadline?: string): GoalData {
  const data = createEmptyGoalData();
  if (deadline) data.goal.deadline = deadline;
  return data;
}

export function goalItemId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
