import { Link } from "react-router-dom";
import {
  compassCategoryMeta,
  compassPriorityMeta,
  compassRiskControlMeta,
  compassRiskControlStateMeta,
} from "../../content/compass";
import {
  compassStatusClassName,
  compassStatusLabel,
  riskScore,
  type TelosRiskItem,
} from "../../lib/compass";

const CONTROL_KEYS = ["prevent", "detect", "respond"] as const;

export function RiskCard({ risk }: { risk: TelosRiskItem }) {
  const meta = compassCategoryMeta.risk;

  return (
    <Link
      to={`/compass/items/${risk.id}`}
      className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className={["rounded-full px-2.5 py-1 text-[11px] font-medium", meta.className].join(" ")}>
          {meta.icon} {meta.label}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[11px]",
              compassPriorityMeta[risk.priority].className,
            ].join(" ")}
            title={compassPriorityMeta[risk.priority].hint}
          >
            {compassPriorityMeta[risk.priority].shortLabel}
          </span>
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[11px]",
              compassStatusClassName("risk", risk.status),
            ].join(" ")}
          >
            {compassStatusLabel("risk", risk.status)}
          </span>
        </div>
      </div>

      <h3 className="mt-3 line-clamp-2 font-display text-lg leading-snug text-ink transition group-hover:text-moss-dark">
        {risk.title}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-6 text-ink-soft">
        {risk.data.scenario || "还没写风险场景。"}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] tabular-nums text-paper">
          概率 {risk.data.probability} × 影响 {risk.data.impact} = {riskScore(risk)}
        </span>
        {CONTROL_KEYS.map((key) => {
          const stateMeta = compassRiskControlStateMeta[risk.data[key].state];
          return (
            <span
              key={key}
              title={risk.data[key].note || compassRiskControlMeta[key].label}
              className={[
                "rounded-full px-2.5 py-1 text-[11px]",
                stateMeta.className,
              ].join(" ")}
            >
              {compassRiskControlMeta[key].label} · {stateMeta.label}
            </span>
          );
        })}
      </div>

      {CONTROL_KEYS.some((key) => risk.data[key].note.trim()) ? (
        <dl className="mt-3 space-y-1 text-[11px] leading-5 text-ink-soft">
          {CONTROL_KEYS.map((key) => {
            const note = risk.data[key].note.trim();
            if (!note) return null;
            return (
              <div key={key} className="flex gap-1.5">
                <dt className="shrink-0 text-ink-soft/70">
                  {compassRiskControlMeta[key].label}
                </dt>
                <dd className="min-w-0 whitespace-pre-line break-words">{note}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-line/60 pt-3 text-xs text-ink-soft">
        <span className={risk.data.detect.state === "none" ? "text-clay" : ""}>
          {risk.data.detect.state === "none" ? "没有检测手段" : "检测手段已就位"}
        </span>
        <span className="shrink-0 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-moss">
          查看 →
        </span>
      </div>
    </Link>
  );
}
