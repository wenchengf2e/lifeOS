import { Link } from "react-router-dom";
import type { EnergySessionEntry } from "../../shared/types";
import { energyPageCopy } from "../content/energy";
import {
  energySessionHref,
  energySummary,
  formatEnergyTimestamp,
  getEnergyTool,
} from "../lib/energy";

type EnergySessionCardProps = {
  session: EnergySessionEntry;
  onDelete: () => void;
  deleting?: boolean;
};

export function EnergySessionCard({ session, onDelete, deleting = false }: EnergySessionCardProps) {
  const tool = getEnergyTool(session.tool);
  const summary = energySummary(session);

  return (
    <div className="card group relative flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-md sm:p-5">
      {/* 低频操作：桌面端 hover 时才出现，触屏没有 hover，直接常驻。 */}
      <div className="absolute right-4 top-4 flex flex-col items-end gap-1 sm:right-5 sm:top-5">
        <span
          className={
            session.completed
              ? "chip shrink-0"
              : "shrink-0 rounded-full bg-paper-deep/80 px-2 py-0.5 text-[10px] font-medium text-ink-soft sm:text-[11px]"
          }
        >
          {session.completed ? "已完成" : "进行中"}
        </span>
        <button
          type="button"
          className="text-[10px] text-ink-soft underline-offset-2 transition hover:text-clay hover:underline focus-visible:opacity-100 sm:text-[11px] sm:opacity-0 sm:group-hover:opacity-100"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? energyPageCopy.listDeleting : energyPageCopy.listDelete}
        </button>
      </div>

      <Link to={energySessionHref(session)} className="flex flex-1 flex-col pr-16 sm:pr-20">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moss-soft text-sm">
            {tool?.icon ?? "⚡"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{tool?.title ?? "未知工具"}</p>
            <p className="text-[10px] text-ink-soft sm:text-[11px]">
              {formatEnergyTimestamp(session.createdAt)}
            </p>
          </div>
        </div>

        <p className="mt-2.5 line-clamp-1 text-xs leading-6 text-ink-soft">
          {summary || "还没有写下回答，点开从第一题开始。"}
        </p>
      </Link>
    </div>
  );
}
