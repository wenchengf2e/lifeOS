import type { GoalData } from "../../shared/types";
import { goalSteps } from "../content/goals";
import { goalProgress } from "../lib/goals";

export function GoalStepProgress({ data }: { data: GoalData }) {
  const progress = goalProgress(data);

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 gap-1.5">
        {goalSteps.map((step) => {
          const done = progress.done.includes(step.key);
          const current = progress.nextStep === step.key;
          return (
            <span
              key={step.key}
              title={`${step.index} · ${step.title}${done ? "（已完成）" : ""}`}
              className={[
                "h-1.5 flex-1 rounded-full transition",
                done ? "bg-moss" : current ? "bg-moss/35" : "bg-line",
              ].join(" ")}
            />
          );
        })}
      </div>
      <span className="shrink-0 text-[11px] tabular-nums text-ink-soft">
        {progress.completed} / 5
      </span>
    </div>
  );
}
