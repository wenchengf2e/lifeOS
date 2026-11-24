import { Link } from "react-router-dom";
import { planReminderCopy } from "../content/plan";
import { isoWeekNumber } from "../lib/date";
import { isPlanFilled, type NormalizedPlan } from "../lib/plan";

type PlanReminderCardProps = {
  weekKey: string;
  monthKey: string;
  weekPlan: NormalizedPlan;
  monthPlan: NormalizedPlan;
};

/** 每日仪式顶部的只读提醒：周计划为主，月计划只留一行主题。 */
export function PlanReminderCard({ weekKey, monthKey, weekPlan, monthPlan }: PlanReminderCardProps) {
  const weekFilled = isPlanFilled(weekPlan);

  return (
    <section className="card mb-6 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg text-ink">
            {weekFilled
              ? planReminderCopy.weekTitle(isoWeekNumber(weekKey))
              : planReminderCopy.weekEmptyTitle}
          </h2>
        </div>
        <Link
          to={`/plan?period=week&key=${weekKey}`}
          className="btn-ghost shrink-0 self-start text-xs"
        >
          {weekFilled ? planReminderCopy.edit : planReminderCopy.create}
        </Link>
      </div>

      {weekFilled ? (
        <div className="mt-2 min-w-0">
          {weekPlan.theme ? (
            <p className="break-words text-sm leading-6 text-ink">{weekPlan.theme}</p>
          ) : null}
          {weekPlan.priorities.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {weekPlan.priorities.map((priority, index) => (
                <li
                  key={`${index}-${priority}`}
                  className="flex gap-2 text-sm leading-6 text-ink-soft"
                >
                  <span className="shrink-0 text-moss">{index + 1}.</span>
                  <span className="min-w-0 break-words">{priority}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm leading-6 text-ink-soft">{planReminderCopy.weekEmptyHint}</p>
      )}

      <div className="mt-4 border-t border-line/60 pt-3 text-xs text-ink-soft">
        <Link
          to={`/plan?period=month&key=${monthKey}`}
          className="inline-flex max-w-full flex-wrap items-baseline gap-1 transition hover:text-ink"
        >
          <span className="shrink-0 text-moss">{planReminderCopy.monthLabel}：</span>
          <span className="min-w-0 break-words text-ink">
            {monthPlan.theme || planReminderCopy.monthEmpty}
          </span>
        </Link>
      </div>
    </section>
  );
}
