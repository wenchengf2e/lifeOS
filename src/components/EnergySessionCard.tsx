import { Link } from "react-router-dom";
import type { EnergySessionEntry } from "../../shared/types";
import {
  energyProgress,
  energySessionHref,
  energySummary,
  formatEnergyTimestamp,
  getEnergyTool,
} from "../lib/energy";

export function EnergySessionCard({ session }: { session: EnergySessionEntry }) {
  const tool = getEnergyTool(session.tool);
  const progress = energyProgress(session);
  const summary = energySummary(session);

  return (
    <Link
      to={energySessionHref(session)}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-md sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-moss-soft text-base">
            {tool?.icon ?? "⚡"}
          </span>
          <div>
            <p className="text-sm font-medium text-ink">{tool?.title ?? "未知工具"}</p>
            <p className="text-[11px] text-ink-soft">{formatEnergyTimestamp(session.createdAt)}</p>
          </div>
        </div>
        <span
          className={
            session.completed
              ? "chip shrink-0"
              : "shrink-0 rounded-full bg-paper-deep/80 px-2.5 py-1 text-[11px] font-medium text-ink-soft"
          }
        >
          {session.completed ? "已完成" : "进行中"}
        </span>
      </div>

      <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-7 text-ink-soft">
        {summary || "还没有写下回答，点开从第一题开始。"}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-deep">
          <div
            className="h-full rounded-full bg-moss transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-ink-soft">
          {progress.answered} / {progress.total} 题 · {session.completed ? "已完成" : "进行中"}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-line/60 pt-3">
        <span className="text-xs text-ink-soft">
          {session.completed ? "已完成的练习，默认打开全文回看" : "从第一道未答题继续"}
        </span>
        <span className="shrink-0 text-sm text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-moss">
          {session.completed ? "回看 →" : "继续 →"}
        </span>
      </div>
    </Link>
  );
}
