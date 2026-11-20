import type { ChatMessageEntry, CoachProposal } from "../../../shared/types";
import { COACH_SKILLS, COACH_STAGES } from "../../content/coach";
import { CoachProposalCard } from "./CoachProposalCard";

function stageLabelOf(stage: ChatMessageEntry["stage"]) {
  if (!stage) return null;
  return COACH_STAGES.find((item) => item.key === stage)?.label ?? null;
}

export function CoachMessageBubble({
  message,
  showQuickReplies = false,
  readOnly = false,
  resolvingProposalId = null,
  proposalErrors = {},
  onQuickReply,
  onApplyProposal,
  onDismissProposal,
  onOpenProfile,
}: {
  message: ChatMessageEntry;
  /** 只对「最新一条教练消息」传 true，避免旧快捷回复干扰当前输入。 */
  showQuickReplies?: boolean;
  readOnly?: boolean;
  resolvingProposalId?: string | null;
  proposalErrors?: Record<string, string>;
  onQuickReply?: (reply: string) => void;
  onApplyProposal?: (message: ChatMessageEntry, proposal: CoachProposal) => void;
  onDismissProposal?: (message: ChatMessageEntry, proposal: CoachProposal) => void;
  onOpenProfile?: () => void;
}) {
  if (message.role === "system") {
    return <p className="text-center text-[11px] leading-6 text-ink-soft">{message.content}</p>;
  }

  const isUser = message.role === "user";
  const skill = message.skill ? COACH_SKILLS[message.skill] : null;
  const stageLabel = stageLabelOf(message.stage);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-ink px-4 py-3 text-sm leading-7 text-paper">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss-soft text-base sm:flex">
        🌱
      </span>
      <div className="min-w-0 max-w-[92%] flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-soft">
          <span className="font-medium text-moss-dark">小芽</span>
          {skill ? (
            <span className="chip">
              {skill.icon} {skill.label}
            </span>
          ) : null}
          {stageLabel ? <span>· {stageLabel}</span> : null}
        </div>

        <div className="rounded-3xl rounded-bl-lg border border-line/70 bg-white/80 px-4 py-3 text-sm leading-7 text-ink">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {message.proposals.length > 0 ? (
          <div className="mt-2 space-y-2">
            {message.proposals.map((proposal) => (
              <CoachProposalCard
                key={proposal.id}
                proposal={proposal}
                refs={message.refs}
                busy={resolvingProposalId === proposal.id}
                error={proposalErrors[proposal.id] ?? null}
                onApply={
                  readOnly || !onApplyProposal
                    ? undefined
                    : () => onApplyProposal(message, proposal)
                }
                onDismiss={
                  readOnly || !onDismissProposal
                    ? undefined
                    : () => onDismissProposal(message, proposal)
                }
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        ) : message.refs.length > 0 ? (
          <p className="mt-2 text-[11px] text-ink-soft">
            已写入 {message.refs.length} 处业务数据。
          </p>
        ) : null}

        {showQuickReplies && onQuickReply && message.quickReplies.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                className="rounded-full border border-moss/25 bg-moss-soft/60 px-3 py-1.5 text-xs text-moss-dark transition hover:bg-moss-soft"
                onClick={() => onQuickReply(reply)}
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
