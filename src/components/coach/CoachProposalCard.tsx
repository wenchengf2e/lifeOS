import { Link } from "react-router-dom";
import type { CoachProposal, CoachRef } from "../../../shared/types";
import { COACH_PROPOSAL_META } from "../../content/coach";

/** 提案类型与回写目标表的对应关系，用于筛出这条提案自己产生的 refs。 */
const REF_TABLE_BY_KIND: Record<CoachProposal["kind"], CoachRef["table"]> = {
  checkin_plan: "checkins",
  pattern_card: "patterns",
  fear_action: "fears",
  coach_profile: "coach_profiles",
};

function refPath(ref: CoachRef): string | null {
  switch (ref.table) {
    case "checkins":
      return "/daily";
    case "patterns":
      return "/review";
    case "fears":
      return `/fears/${ref.id}`;
    default:
      return null;
  }
}

function opLabel(op: CoachRef["op"]) {
  switch (op) {
    case "create":
      return "新建";
    case "update":
      return "更新";
    default:
      return "写入";
  }
}

const STATUS_BADGE: Record<CoachProposal["status"], { label: string; className: string }> = {
  pending: { label: "待确认", className: "bg-paper-deep/80 text-ink-soft" },
  applied: { label: "已写入", className: "bg-moss-soft text-moss-dark" },
  dismissed: { label: "已忽略", className: "bg-white/80 text-ink-soft" },
};

export function CoachProposalCard({
  proposal,
  refs,
  busy = false,
  error = null,
  onApply,
  onDismiss,
  onOpenProfile,
}: {
  proposal: CoachProposal;
  refs: CoachRef[];
  busy?: boolean;
  error?: string | null;
  /** 省略对应回调时进入只读模式（历史话题回看）。 */
  onApply?: () => void;
  onDismiss?: () => void;
  onOpenProfile?: () => void;
}) {
  const meta = COACH_PROPOSAL_META[proposal.kind];
  const badge = STATUS_BADGE[proposal.status];
  const relatedRefs = refs.filter((ref) => ref.table === REF_TABLE_BY_KIND[proposal.kind]);

  return (
    <div className="rounded-2xl border border-line/80 bg-white/75 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-moss">
          {meta.icon} {meta.label}
        </span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <p className="mt-2 text-sm font-medium leading-6 text-ink">
        {proposal.title.trim() || "小芽的回写建议"}
      </p>
      {proposal.summary.trim() ? (
        <p className="mt-1 text-xs leading-6 text-ink-soft">{proposal.summary}</p>
      ) : null}
      <p className="mt-2 text-[11px] text-ink-soft/80">去向：{meta.targetLabel}</p>

      {proposal.status === "applied" ? (
        relatedRefs.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {relatedRefs.map((ref) => {
              const path = refPath(ref);
              const label = `已${opLabel(ref.op)}：${ref.label || meta.label}`;
              return path ? (
                <Link
                  key={`${ref.table}-${ref.id}`}
                  to={path}
                  className="text-[11px] text-moss-dark underline-offset-2 hover:underline"
                >
                  {label} →
                </Link>
              ) : onOpenProfile ? (
                <button
                  key={`${ref.table}-${ref.id}`}
                  type="button"
                  className="text-left text-[11px] text-moss-dark underline-offset-2 hover:underline"
                  onClick={onOpenProfile}
                >
                  {label} →
                </button>
              ) : (
                <span key={`${ref.table}-${ref.id}`} className="text-[11px] text-moss-dark">
                  {label}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-moss-dark">已经写入，可在对应页面查看。</p>
        )
      ) : null}

      {proposal.status === "pending" && onApply && onDismiss ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-primary px-3.5 py-1.5 text-xs"
            onClick={onApply}
            disabled={busy}
          >
            {busy ? "写入中…" : "采纳并写入"}
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={onDismiss} disabled={busy}>
            忽略
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-2 text-[11px] leading-5 text-clay">写入失败：{error}</p> : null}
    </div>
  );
}
