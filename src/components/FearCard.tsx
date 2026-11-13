import { Link } from "react-router-dom";
import type { FearEntry } from "../../shared/types";
import { fearStageMeta, fearSteps } from "../content/fears";
import { formatDateCN, toDateKey } from "../lib/date";
import { fearNextStepPreview, fearProgress, fearStage, fearTitle } from "../lib/fears";

export function FearCard({ fear }: { fear: FearEntry }) {
  const stage = fearStageMeta[fearStage(fear.data)];
  const progress = fearProgress(fear.data);

  return (
    <Link
      to={`/fears/${fear.id}`}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={["rounded-full px-2.5 py-1 text-[11px] font-medium", stage.className].join(" ")}>
          {stage.label}
        </span>
        <span className="text-[11px] text-ink-soft">
          更新于 {formatDateCN(toDateKey(new Date(fear.updatedAt)), { withYear: true })}
        </span>
      </div>

      <h3 className="mt-4 line-clamp-1 font-display text-xl leading-snug text-ink transition group-hover:text-moss-dark">
        {fearTitle(fear.data)}
      </h3>

      <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-7 text-ink-soft">
        {fearNextStepPreview(fear.data)}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-1.5">
          {fearSteps.map((step) => {
            const done = progress.done.includes(step.key);
            return (
              <span
                key={step.key}
                title={`${step.index} · ${step.title}${done ? "（已填写）" : ""}`}
                className={[
                  "h-2 w-2 rounded-full transition",
                  done ? "bg-moss" : "bg-line",
                ].join(" ")}
              />
            );
          })}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-ink-soft">
          {progress.completed} / 5
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-line/60 pt-3">
        <span className="text-xs text-ink-soft">{stage.hint}</span>
        <span className="shrink-0 text-sm text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-moss">
          继续 →
        </span>
      </div>
    </Link>
  );
}
