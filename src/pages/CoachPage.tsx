import { useEffect, useRef, useState } from "react";
import type {
  ChatMessageEntry,
  CoachProposal,
  CoachSignal,
  CoachSkillKey,
} from "../../shared/types";
import { CoachComposer } from "../components/coach/CoachComposer";
import { CoachHistoryPanel } from "../components/coach/CoachHistoryPanel";
import { CoachMessageBubble } from "../components/coach/CoachMessageBubble";
import { CoachProfilePanel } from "../components/coach/CoachProfilePanel";
import { CoachSignalCard } from "../components/coach/CoachSignalCard";
import { ErrorState, LoadingPage } from "../components/StateViews";
import {
  COACH_SKILLS,
  COACH_STAGES,
  coachPageCopy,
  coachStageIndex,
} from "../content/coach";
import {
  useCoachState,
  useCompleteCoachSession,
  useResolveCoachProposal,
  useSendCoachChat,
} from "../lib/queries";

const SKILL_KEYS = Object.keys(COACH_SKILLS) as CoachSkillKey[];

export function CoachPage() {
  const stateQuery = useCoachState();
  const sendChat = useSendCoachChat();
  const completeSession = useCompleteCoachSession();
  const resolveProposal = useResolveCoachProposal();

  const [selectedSkill, setSelectedSkill] = useState<CoachSkillKey | null>(null);
  const [signalsExpanded, setSignalsExpanded] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySessionId, setHistorySessionId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [pendingSignalId, setPendingSignalId] = useState<string | null>(null);
  const [resolvingProposalId, setResolvingProposalId] = useState<string | null>(null);
  const [proposalErrors, setProposalErrors] = useState<Record<string, string>>({});

  const threadRef = useRef<HTMLDivElement>(null);
  const messageCount = stateQuery.data?.activeMessages.length ?? 0;
  const activeSessionId = stateQuery.data?.activeSession?.id ?? null;

  // 新消息或切换会话后滚到最新一条。
  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messageCount, activeSessionId]);

  if (stateQuery.isLoading) return <LoadingPage label={coachPageCopy.loading} />;
  if (stateQuery.error) return <ErrorState error={stateQuery.error} />;

  const state = stateQuery.data;
  if (!state) return <LoadingPage label={coachPageCopy.loading} />;

  // 明确一个非空的局部别名，闭包里不再受 useQuery 的 undefined 影响。
  const loadedState = state;
  const activeMessages = loadedState.activeMessages;
  const hasMessages = activeMessages.length > 0;
  const signals = state.signals;
  const currentSkillKey = state.activeSession?.skill ?? selectedSkill;
  const currentSkill = currentSkillKey ? COACH_SKILLS[currentSkillKey] : null;
  const currentStage = state.activeSession?.stage ?? "listen";
  const stageIndex = coachStageIndex(currentStage);
  const lastMessage = activeMessages[activeMessages.length - 1];
  const quickReplies = lastMessage?.role === "assistant" ? lastMessage.quickReplies : [];

  async function handleSend(
    text: string,
    options?: { signalId?: string; skill?: CoachSkillKey },
  ): Promise<boolean> {
    const message = text.trim();
    if (!message || sendChat.isPending) return false;
    setChatError(null);
    try {
      await sendChat.mutateAsync({
        message,
        sessionId: loadedState.activeSession?.id,
        skill: options?.skill ?? selectedSkill ?? undefined,
        signalId: options?.signalId,
      });
      return true;
    } catch (sendFailure) {
      setChatError(
        sendFailure instanceof Error ? sendFailure.message : coachPageCopy.chatFailed,
      );
      return false;
    }
  }

  async function handleSignalSelect(signal: CoachSignal) {
    if (sendChat.isPending) return;
    setPendingSignalId(signal.id);
    await handleSend(signal.openingPrompt, { signalId: signal.id, skill: signal.skill });
    setPendingSignalId(null);
  }

  function handleStartSkill(skill: CoachSkillKey) {
    void handleSend(COACH_SKILLS[skill].startPrompt, { skill });
  }

  async function handleSwitchTopic() {
    if (!loadedState.activeSession || sendChat.isPending) return;
    if (!window.confirm(coachPageCopy.switchConfirm)) return;
    setChatError(null);
    try {
      await sendChat.mutateAsync({
        message: coachPageCopy.switchSeed,
        skill: selectedSkill ?? undefined,
        startNewSession: true,
      });
    } catch (switchFailure) {
      setChatError(
        switchFailure instanceof Error ? switchFailure.message : coachPageCopy.actionFailed,
      );
    }
  }

  async function handleCompleteSession() {
    const session = loadedState.activeSession;
    if (!session || completeSession.isPending) return;
    if (!window.confirm(coachPageCopy.completeConfirm)) return;
    setChatError(null);
    try {
      await completeSession.mutateAsync({ id: session.id });
    } catch (completeFailure) {
      setChatError(
        completeFailure instanceof Error ? completeFailure.message : coachPageCopy.actionFailed,
      );
    }
  }

  async function handleResolveProposal(
    message: ChatMessageEntry,
    proposal: CoachProposal,
    action: "apply" | "dismiss",
  ) {
    if (resolvingProposalId) return;
    setResolvingProposalId(proposal.id);
    setProposalErrors((prev) => {
      if (!(proposal.id in prev)) return prev;
      const next = { ...prev };
      delete next[proposal.id];
      return next;
    });
    try {
      await resolveProposal.mutateAsync({
        messageId: message.id,
        proposalId: proposal.id,
        action,
      });
    } catch (resolveFailure) {
      setProposalErrors((prev) => ({
        ...prev,
        [proposal.id]:
          resolveFailure instanceof Error ? resolveFailure.message : coachPageCopy.actionFailed,
      }));
    } finally {
      setResolvingProposalId(null);
    }
  }

  function openHistoryPanel() {
    setProfileOpen(false);
    setHistorySessionId(null);
    setHistoryOpen(true);
  }

  function openProfilePanel() {
    setHistoryOpen(false);
    setProfileOpen(true);
  }

  function openHistorySession(id: string) {
    setProfileOpen(false);
    setHistorySessionId(id);
    setHistoryOpen(true);
  }

  const signalGrid =
    signals.length > 0 ? (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {signals.map((signal) => (
          <CoachSignalCard
            key={signal.id}
            signal={signal}
            busy={sendChat.isPending || pendingSignalId === signal.id}
            onSelect={(item) => void handleSignalSelect(item)}
          />
        ))}
      </div>
    ) : null;

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-line/60 bg-white/60 p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
              {coachPageCopy.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-ink-soft">
              {coachPageCopy.description}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
              {currentSkill ? (
                <span className="chip">
                  {currentSkill.icon} {currentSkill.label}
                </span>
              ) : (
                <span className="rounded-full bg-paper-deep/80 px-2.5 py-1 text-ink-soft">
                  {coachPageCopy.autoSkill}
                </span>
              )}
              <span className="rounded-full bg-paper-deep/80 px-2.5 py-1 text-ink-soft">
                {state.aiConfigured ? coachPageCopy.aiConnected : coachPageCopy.aiLocal}
              </span>
              {hasMessages ? (
                <span className="rounded-full bg-paper-deep/80 px-2.5 py-1 text-ink-soft">
                  {activeMessages.length} 条消息
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={openHistoryPanel}>
                {coachPageCopy.history}
                {state.recentSessions.length > 0 ? ` · ${state.recentSessions.length}` : ""}
              </button>
              <button type="button" className="btn-secondary" onClick={openProfilePanel}>
                {coachPageCopy.profile}
              </button>
            </div>
            {state.activeSession ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void handleSwitchTopic()}
                  disabled={sendChat.isPending}
                >
                  {coachPageCopy.switchTopic}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void handleCompleteSession()}
                  disabled={completeSession.isPending}
                >
                  {completeSession.isPending ? "正在收尾…" : coachPageCopy.completeSession}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line/60 pt-4">
          {COACH_STAGES.map((stage, index) => {
            const active = index === stageIndex;
            const done = index < stageIndex;
            return (
              <div key={stage.key} className="flex items-center gap-1.5" title={stage.description}>
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    active ? "bg-moss" : done ? "bg-moss/50" : "bg-line",
                  ].join(" ")}
                />
                <span
                  className={active ? "text-xs font-medium text-moss-dark" : "text-xs text-ink-soft"}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
          <span className="text-[11px] text-ink-soft sm:ml-auto">
            {coachPageCopy.stageLabel} · 第 {stageIndex + 1} / {COACH_STAGES.length} 步
          </span>
        </div>
      </section>

      {state.recentSessions.length > 0 ? (
        <section className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="px-1 text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            已结束话题
          </span>
          {state.recentSessions.slice(0, 4).map((session) => (
            <button
              key={session.id}
              type="button"
              title={session.summary.trim() || "查看话题小结"}
              className="max-w-[16rem] truncate rounded-full border border-line bg-white/60 px-3 py-1.5 text-xs text-ink-soft transition hover:border-moss/30 hover:text-ink"
              onClick={() => openHistorySession(session.id)}
            >
              {session.title.trim() || "未命名话题"}
            </button>
          ))}
        </section>
      ) : null}

      {!hasMessages ? (
        <section className="card mt-6 p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-moss-soft text-2xl">
              🌱
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-moss">
                {coachPageCopy.waitingEyebrow}
              </p>
              <h2 className="mt-1 text-2xl text-ink">{coachPageCopy.waitingTitle}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-ink-soft">
                {coachPageCopy.waitingDesc}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SKILL_KEYS.map((key) => {
                  const skill = COACH_SKILLS[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      title={skill.tagline}
                      className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-xs text-ink-soft transition hover:border-moss/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => handleStartSkill(key)}
                      disabled={sendChat.isPending}
                    >
                      {skill.icon} {skill.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!hasMessages ? (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-moss">
                {coachPageCopy.signalsEyebrow}
              </p>
              <h2 className="mt-1 text-xl text-ink">{coachPageCopy.signalsTitle}</h2>
              <p className="mt-1 text-xs leading-6 text-ink-soft">{coachPageCopy.signalsDesc}</p>
            </div>
            {signals.length > 0 ? <span className="chip">{signals.length} 条</span> : null}
          </div>
          {signals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 px-5 py-6 text-sm text-ink-soft">
              {coachPageCopy.signalsEmpty}
            </div>
          ) : (
            signalGrid
          )}
        </section>
      ) : signals.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            className="rounded-full border border-line bg-white/60 px-3 py-1.5 text-xs text-ink-soft transition hover:border-moss/30 hover:text-ink"
            aria-expanded={signalsExpanded}
            onClick={() => setSignalsExpanded((prev) => !prev)}
          >
            🧭 {coachPageCopy.signalsCollapsed} · {signals.length} 条{" "}
            {signalsExpanded ? "收起" : "展开"}
          </button>
          {signalsExpanded ? <div className="mt-3">{signalGrid}</div> : null}
        </div>
      ) : null}

      <section className="card mt-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-xl text-ink">
              {state.activeSession?.title.trim() ||
                (hasMessages
                  ? coachPageCopy.threadFallbackTitle
                  : coachPageCopy.threadEmptyTitle)}
            </h2>
          </div>
          <p className="text-[11px] text-ink-soft">
            {hasMessages
              ? `共 ${activeMessages.length} 条消息`
              : coachPageCopy.startedHint}
          </p>
        </div>

        {hasMessages ? (
          <div
            ref={threadRef}
            className="mt-4 max-h-[56vh] space-y-5 overflow-y-auto rounded-2xl bg-paper-deep/20 p-3 sm:p-4"
          >
            {activeMessages.map((message) => (
              <CoachMessageBubble
                key={message.id}
                message={message}
                showQuickReplies={false}
                resolvingProposalId={resolvingProposalId}
                proposalErrors={proposalErrors}
                onApplyProposal={(item, proposal) =>
                  void handleResolveProposal(item, proposal, "apply")
                }
                onDismissProposal={(item, proposal) =>
                  void handleResolveProposal(item, proposal, "dismiss")
                }
                onOpenProfile={openProfilePanel}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-paper-deep/30 px-4 py-6 text-center text-sm leading-7 text-ink-soft">
            {coachPageCopy.threadEmptyHint}
          </p>
        )}

        <div className="mt-4 border-t border-line/60 pt-4">
          <CoachComposer
            quickReplies={quickReplies}
            selectedSkill={selectedSkill}
            sending={sendChat.isPending}
            error={chatError}
            onSelectSkill={setSelectedSkill}
            onSend={handleSend}
          />
        </div>
      </section>

      <CoachProfilePanel
        open={profileOpen}
        profile={state.profile}
        onClose={() => setProfileOpen(false)}
      />
      <CoachHistoryPanel
        open={historyOpen}
        sessions={state.recentSessions}
        selectedId={historySessionId}
        onSelect={setHistorySessionId}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
