import { Link } from "react-router-dom";
import type { GoalEntry } from "../../shared/types";
import {
  STALE_GOAL_DAYS,
  goalStatusMeta,
  goalSteps,
} from "../content/goals";
import {
  goalDeadlineLabel,
  goalDomainOf,
  goalPracticeLabel,
  goalProgress,
  isGoalStale,
  keyProblemOf,
} from "../lib/goals";
import { GoalStepProgress } from "./GoalStepProgress";

export function GoalCard({ goal }: { goal: GoalEntry }) {
  const domain = goalDomainOf(goal.domain);
  const status = goalStatusMeta[goal.status];
  const progress = goalProgress(goal.data);
  const next = goalSteps.find((step) => step.key === progress.nextStep);
  const keyProblem = keyProblemOf(goal.data);
  const stale = isGoalStale(goal);

  return (
    <Link
      to={`/principles/${goal.id}?step=${next?.index ?? 5}`}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-paper-deep/70 px-2.5 py-1 text-[11px] text-ink-soft">
          <span>{domain.icon}</span>
          {domain.label}
        </span>
        <span className={["rounded-full px-2.5 py-1 text-[11px] font-medium", status.className].join(" ")}>
          {status.label}
        </span>
      </div>

      <h3 className="mt-4 font-display text-xl leading-snug text-ink transition group-hover:text-moss-dark">
        {goal.title}
      </h3>

      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-7 text-ink-soft">
        {goal.data.goal.statement.trim() || keyProblem?.title || "目标陈述还没写。先回答：在什么期限内，把什么变成什么。"}
      </p>

      <div className="mt-4">
        <GoalStepProgress data={goal.data} />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-line/60 pt-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-ink-soft">
            {next ? `卡在第 ${next.index} 步 · ${next.title}` : "五步已走完，进入践行"}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-soft/80">
            <span>{goalDeadlineLabel(goal)}</span>
            <span>·</span>
            <span>践行 {goalPracticeLabel(goal)}</span>
            {stale ? (
              <span className="rounded-full bg-clay/10 px-2 py-0.5 text-clay">
                {STALE_GOAL_DAYS} 天没记录
              </span>
            ) : null}
          </p>
        </div>
        <span className="shrink-0 text-sm text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-moss">
          {next ? "继续 →" : "回看 →"}
        </span>
      </div>
    </Link>
  );
}
