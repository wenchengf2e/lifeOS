import { useEffect } from "react";
import type { ChatSessionEntry } from "../../../shared/types";
import { COACH_SKILLS } from "../../content/coach";
import { formatDateTimeCN } from "../../lib/date";
import { useCoachSession } from "../../lib/queries";
import { CoachMessageBubble } from "./CoachMessageBubble";

function sessionSkillLabel(session: ChatSessionEntry) {
  if (!session.skill) return "成长对话";
  return `${COACH_SKILLS[session.skill].icon} ${COACH_SKILLS[session.skill].label}`;
}

export function CoachHistoryPanel({
  open,
  sessions,
  selectedId,
  onSelect,
  onClose,
}: {
  open: boolean;
  sessions: ChatSessionEntry[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}) {
  const detailQuery = useCoachSession(open ? selectedId : null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const detail = detailQuery.data ?? null;
  const selectedSummary = sessions.find((session) => session.id === selectedId) ?? detail?.session ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/35 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-history-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-paper shadow-2xl sm:rounded-l-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-line/60 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">History</p>
            <h2 id="coach-history-title" className="mt-1 text-2xl text-ink">
              {selectedId ? "话题回顾" : "历史话题"}
            </h2>
            <p className="mt-1 text-xs leading-6 text-ink-soft">
              {selectedId ? "只读回看这一轮对话与当时的小结。" : "已经结束的对话都收在这里，不会丢。"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {selectedId ? (
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => onSelect(null)}>
                ← 全部话题
              </button>
            ) : null}
            <button
              type="button"
              className="btn-ghost text-xl"
              onClick={onClose}
              aria-label="关闭历史话题"
            >
              ×
            </button>
          </div>
        </div>

        {selectedId ? (
          <div className="flex-1 px-5 py-5 sm:px-7">
            {detailQuery.isLoading ? (
              <p className="text-sm text-ink-soft">正在读取话题…</p>
            ) : detailQuery.error ? (
              <div className="rounded-2xl bg-clay/10 p-4 text-xs leading-6 text-clay">
                话题读取失败：
                {detailQuery.error instanceof Error ? detailQuery.error.message : "未知错误"}
                <button
                  type="button"
                  className="ml-2 underline-offset-2 hover:underline"
                  onClick={() => void detailQuery.refetch()}
                  disabled={detailQuery.isFetching}
                >
                  {detailQuery.isFetching ? "读取中…" : "重新读取"}
                </button>
              </div>
            ) : detail ? (
              <>
                <div className="rounded-2xl border border-line/70 bg-white/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="chip">{sessionSkillLabel(detail.session)}</span>
                    <span className="text-[11px] text-ink-soft">
                      {formatDateTimeCN(detail.session.updatedAt)}
                    </span>
                  </div>
                  {detail.session.summary.trim() ? (
                    <p className="mt-3 text-sm leading-7 text-ink">{detail.session.summary}</p>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-ink-soft">这一轮没有留下小结。</p>
                  )}
                </div>

                <div className="mt-4 space-y-5">
                  {detail.messages.length === 0 ? (
                    <p className="text-sm text-ink-soft">这条话题没有消息记录。</p>
                  ) : (
                    detail.messages.map((message) => (
                      <CoachMessageBubble key={message.id} message={message} readOnly />
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-soft">这条话题不存在，可能已经被清理。</p>
            )}
          </div>
        ) : (
          <div className="flex-1 px-5 py-5 sm:px-7">
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 px-5 py-10 text-center">
                <p className="text-sm text-ink-soft">
                  还没有已经结束的话题。聊完一轮后点「完成本轮」，就会收进这里。
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      className="w-full rounded-2xl border border-line/70 bg-white/60 px-4 py-3 text-left transition hover:border-moss/30 hover:bg-white/80"
                      onClick={() => onSelect(session.id)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] text-ink-soft">{sessionSkillLabel(session)}</span>
                        <span className="text-[11px] text-ink-soft">
                          {formatDateTimeCN(session.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-sm font-medium text-ink">
                        {session.title.trim() || "未命名话题"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink-soft">
                        {session.summary.trim() || "没有小结，点开看完整对话。"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {selectedId && selectedSummary ? (
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 bg-paper/95 px-5 py-3 text-[11px] text-ink-soft backdrop-blur sm:px-7">
            <span className="min-w-0 truncate">
              当前查看：{selectedSummary.title.trim() || "未命名话题"}
            </span>
            <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={onClose}>
              返回当前对话
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
