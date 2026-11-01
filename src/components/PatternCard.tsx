import type { PatternEntry, PatternStatus } from "../../shared/types";
import { patternFields, patternStatusMeta } from "../content/review";
import { formatDateCN } from "../lib/date";

const STATUS_CYCLE: Record<PatternStatus, PatternStatus> = {
  watching: "verified",
  verified: "retired",
  retired: "watching",
};

export function PatternCard({
  pattern,
  onCycleStatus,
  onDelete,
  busy = false,
}: {
  pattern: PatternEntry;
  onCycleStatus?: (status: PatternStatus) => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  const meta = patternStatusMeta[pattern.status];
  const filled = patternFields.filter((field) => pattern[field.key].trim().length > 0);

  return (
    <article className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="max-w-[70%] text-lg leading-8 text-ink">{pattern.title}</h3>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${meta.className}`}>
          {meta.label}
        </span>
      </div>

      {filled.length > 0 ? (
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {filled.map((field) => (
            <div key={field.key}>
              <dt className="text-[11px] tracking-[0.14em] text-ink-soft">{field.label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-7 text-ink">
                {pattern[field.key]}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">这张卡还只有标题，补上几栏才拆得动。</p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-4">
        <p className="text-[11px] text-ink-soft">
          {pattern.evidence.length > 0
            ? `证据 ${pattern.evidence.length} 条 · 最近 ${formatDateCN(
                pattern.evidence[pattern.evidence.length - 1],
                { withYear: true },
              )}`
            : "还没有挂证据"}
        </p>

        {onCycleStatus || onDelete ? (
          <div className="flex items-center gap-2">
            {onCycleStatus ? (
              <button
                type="button"
                className="btn-ghost text-xs"
                disabled={busy}
                onClick={() => onCycleStatus(STATUS_CYCLE[pattern.status])}
                title={patternStatusMeta[STATUS_CYCLE[pattern.status]].desc}
              >
                改为{patternStatusMeta[STATUS_CYCLE[pattern.status]].label}
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className="btn-ghost text-xs hover:text-clay"
                disabled={busy}
                onClick={onDelete}
              >
                删除
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
