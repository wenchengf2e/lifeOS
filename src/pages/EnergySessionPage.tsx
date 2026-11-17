import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { EnergySessionData } from "../../shared/types";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { AUTOSAVE_DEBOUNCE_MS } from "../content/autosave";
import { energySessionCopy } from "../content/energy";
import {
  energyProgress,
  energyQuestionProgressLabel,
  formatEnergyTimestamp,
  getEnergyTool,
} from "../lib/energy";
import { useBootstrap, useDeleteEnergySession, useUpdateEnergySession } from "../lib/queries";

type EnergyDraft = {
  id: string;
  data: EnergySessionData;
  completed: boolean;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type Mode = "write" | "read";

export function EnergySessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, isLoading, error } = useBootstrap();
  const updateSession = useUpdateEnergySession();
  const deleteSession = useDeleteEnergySession();

  const session = (data?.energySessions ?? []).find((item) => item.id === sessionId);
  const tool = session ? getEnergyTool(session.tool) : undefined;
  const questions = tool?.questions ?? [];

  const [draft, setDraft] = useState<EnergyDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const changeVersion = useRef(0);
  const draftRef = useRef<EnergyDraft | null>(null);
  const dirtyRef = useRef(false);
  const updateSessionRef = useRef(updateSession);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    updateSessionRef.current = updateSession;
  }, [updateSession]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!session) return;
    setDraft({ id: session.id, data: session.data, completed: session.completed });
    setDirty(false);
    dirtyRef.current = false;
    setSaveState("idle");
    setSaveError(null);
    setDeleteError(null);
    setLastSavedAt(null);
    changeVersion.current = 0;
    // 只跟着练习 id 重置；保存成功后 updatedAt 会变，但不能重置正在编辑的内容
  }, [session?.id]);

  const markDirty = useCallback(() => {
    changeVersion.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    setSaveState("dirty");
    setSaveError(null);
  }, []);

  const save = useCallback(
    async (options?: { completed?: boolean }): Promise<boolean> => {
      const current = draftRef.current;
      if (!current || !sessionId) return true;

      const version = changeVersion.current;
      setSaveState("saving");
      setSaveError(null);

      try {
        await updateSession.mutateAsync({
          id: sessionId,
          patch: {
            data: current.data,
            ...(options?.completed !== undefined ? { completed: options.completed } : {}),
          },
        });

        if (changeVersion.current === version) {
          dirtyRef.current = false;
          setDirty(false);
          setSaveState("saved");
          setLastSavedAt(
            new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          );
        } else {
          setSaveState("dirty");
        }
        return true;
      } catch (saveFailure) {
        setSaveState("error");
        setSaveError(saveFailure instanceof Error ? saveFailure.message : "保存失败，请重试");
        return false;
      }
    },
    [sessionId, updateSession],
  );

  // 防抖自动保存；保存失败时停下来等用户手动重试，避免反复打同一个错误。
  useEffect(() => {
    if (!dirty || !draft || updateSession.isPending || saveState === "error") return;
    const timer = window.setTimeout(() => {
      void save();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, save, saveState, updateSession.isPending]);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // SPA 里点导航不会触发 beforeunload，离开前把没保存的改动补一次。
  useEffect(() => {
    return () => {
      const current = draftRef.current;
      if (!sessionId || !current || !dirtyRef.current) return;
      void updateSessionRef.current
        .mutateAsync({ id: sessionId, patch: { data: current.data } })
        .catch(() => undefined);
    };
  }, [sessionId]);

  // 默认模式：已完成默认全文回看，未完成默认继续书写；URL 显式指定时以 URL 为准。
  const modeParam = searchParams.get("mode");
  const mode: Mode =
    modeParam === "read" ? "read" : modeParam === "write" ? "write" : session?.completed ? "read" : "write";

  const rawStep = Number.parseInt(searchParams.get("step") ?? "", 10);
  const step = Number.isFinite(rawStep)
    ? Math.min(Math.max(rawStep, 1), Math.max(questions.length, 1))
    : 1;
  const question = questions[step - 1];
  const currentValue = question ? draft?.data.answers[question.key] ?? "" : "";

  // 切题 / 切回书写模式时自动聚焦，不中断心流。
  useEffect(() => {
    if (mode !== "write") return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [mode, step]);

  // 文本域随内容自适应高度，长回答也能一眼看完。
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(Math.max(element.scrollHeight, 180), 560)}px`;
  }, [mode, step, currentValue]);

  function goToStep(next: number, nextMode: Mode = "write") {
    const params = new URLSearchParams(searchParams);
    params.set("mode", nextMode);
    if (nextMode === "write") {
      params.set("step", String(next));
    } else {
      params.delete("step");
    }
    setSearchParams(params);
    if (nextMode === "read") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateAnswer(questionKey: string, value: string) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            data: { ...prev.data, answers: { ...prev.data.answers, [questionKey]: value } },
          }
        : prev,
    );
    markDirty();
  }

  async function finish() {
    // 自动保存还在路上时先跳过，避免两个 PATCH 交错。
    if (updateSession.isPending) return;
    const current = draftRef.current;
    if (!current) return;
    const previousCompleted = current.completed;
    setDraft((prev) => (prev ? { ...prev, completed: true } : prev));
    const ok = await save({ completed: true });
    if (!ok) {
      setDraft((prev) => (prev ? { ...prev, completed: previousCompleted } : prev));
      return;
    }
    goToStep(1, "read");
  }

  function handleNext() {
    if (step < questions.length) {
      goToStep(step + 1);
    } else {
      void finish();
    }
  }

  function handleManualSave() {
    if (updateSession.isPending) return;
    if (!dirty && !dirtyRef.current) return;
    void save();
  }

  async function handleDelete() {
    if (!sessionId) return;
    if (!window.confirm(energySessionCopy.deleteConfirm)) return;
    try {
      await deleteSession.mutateAsync(sessionId);
      // 删除成功后不要再让离开清理补一次保存
      dirtyRef.current = false;
      setDirty(false);
      navigate("/energy");
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error ? deleteFailure.message : energySessionCopy.deleteFailed,
      );
    }
  }

  if (isLoading) return <LoadingPage label="正在读取这次练习…" />;
  if (error) return <ErrorState error={error} />;

  if (!session) {
    return (
      <EmptyState
        icon="⚡"
        title="这次练习不存在"
        description={energySessionCopy.notFound}
        action={
          <Link to="/energy" className="btn-primary">
            {energySessionCopy.back}
          </Link>
        }
      />
    );
  }

  if (!tool || questions.length === 0) {
    return (
      <div>
        <Link to="/energy" className="mb-4 inline-flex text-xs text-ink-soft hover:text-ink">
          ← {energySessionCopy.back}
        </Link>
        <EmptyState
          icon="⚡"
          title="工具配置不存在"
          description={energySessionCopy.toolMissing}
          action={
            <button
              type="button"
              className="btn-secondary text-clay"
              onClick={() => void handleDelete()}
              disabled={deleteSession.isPending}
            >
              {deleteSession.isPending ? energySessionCopy.deleting : energySessionCopy.deleteSession}
            </button>
          }
        />
        {deleteError ? <p className="mt-2 text-center text-[11px] text-clay">{deleteError}</p> : null}
      </div>
    );
  }

  if (!draft || draft.id !== session.id) {
    return <LoadingPage label="正在准备这次练习…" />;
  }

  const progress = energyProgress({ ...session, data: draft.data });
  const saveLabel =
    saveState === "saving"
      ? energySessionCopy.saveSaving
      : saveState === "saved"
        ? `${energySessionCopy.saveSaved}${lastSavedAt ? ` · ${lastSavedAt}` : ""}`
        : saveState === "error"
          ? energySessionCopy.saveError
          : dirty
            ? energySessionCopy.saveDirty
            : energySessionCopy.saveIdle;

  const headerMeta = (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-ink-soft sm:mt-3 sm:text-[11px]">
      <span>
        {energySessionCopy.createdAt} {formatEnergyTimestamp(session.createdAt)}
      </span>
      <span
        className={
          draft.completed
            ? "chip"
            : "rounded-full bg-paper-deep/80 px-2.5 py-1 text-[11px] font-medium text-ink-soft"
        }
      >
        {draft.completed ? energySessionCopy.completedBadge : energySessionCopy.inProgressBadge}
      </span>
      <span className={saveState === "error" ? "text-clay" : ""}>{saveLabel}</span>
    </div>
  );

  const progressBar = (
    <div className="mt-4 flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-deep">
        <div
          className="h-full rounded-full bg-moss transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-ink-soft">
        {progress.answered} / {progress.total}
      </span>
    </div>
  );

  if (mode === "read") {
    return (
      <div>
        <Link to="/energy" className="mb-4 inline-flex text-xs text-ink-soft hover:text-ink">
          ← {energySessionCopy.back}
        </Link>

        <header className="mb-5 rounded-3xl border border-line/60 bg-white/60 p-5 shadow-sm sm:mb-6 sm:rounded-[2rem] sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-moss sm:text-[11px] sm:tracking-[0.22em]">
                {tool.icon} {tool.badge} · {tool.subtitle}
              </p>
              <h1 className="mt-2 font-display text-2xl leading-tight text-ink sm:text-4xl">
                {tool.title}
              </h1>
              {headerMeta}
              {progressBar}
            </div>
            <button
              type="button"
              className="btn-primary w-full shrink-0 sm:w-auto"
              onClick={() => goToStep(1, "write")}
            >
              {energySessionCopy.toWriteMode}
            </button>
          </div>
        </header>

        <section className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Session notes</p>
          <h2 className="mt-1 text-xl text-ink">{energySessionCopy.readTitle}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-soft">
            {energySessionCopy.readDesc}
          </p>
        </section>

        <div className="space-y-4">
          {questions.map((item, index) => {
            const answer = draft.data.answers[item.key] ?? "";
            const done = Boolean(answer.trim());
            return (
              <article key={item.key} className="card p-4 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-ink-soft sm:text-[11px] sm:tracking-[0.16em]">
                      第 {index + 1} 题 · {item.title}
                    </p>
                    <h2 className="mt-1 font-display text-base leading-snug text-ink sm:text-lg">
                      {item.prompt}
                    </h2>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                    <span
                      className={
                        done
                          ? "chip"
                          : "rounded-full bg-paper-deep/70 px-2 py-0.5 text-[10px] text-ink-soft sm:px-2.5 sm:py-1 sm:text-[11px]"
                      }
                    >
                      {done ? "已填写" : "待填写"}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost px-2 py-1 text-[11px] sm:px-3 sm:py-2 sm:text-xs"
                      onClick={() => goToStep(index + 1, "write")}
                    >
                      {energySessionCopy.editQuestion}
                    </button>
                  </div>
                </div>

                <p
                  className={[
                    "mt-3 whitespace-pre-wrap text-sm leading-7 sm:mt-4 sm:leading-8",
                    done ? "text-ink" : "text-ink-soft/70",
                  ].join(" ")}
                >
                  {done ? answer : energySessionCopy.answerEmpty}
                </p>
              </article>
            );
          })}
        </div>

        <div className="card mt-5 p-4 sm:mt-6 sm:p-6">
          <p className="text-sm leading-7 text-ink-soft">{energySessionCopy.footerHint}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
            <Link to="/energy" className="btn-secondary">
              {energySessionCopy.back}
            </Link>
            <button
              type="button"
              className="btn-ghost text-clay hover:text-clay/80"
              onClick={() => void handleDelete()}
              disabled={deleteSession.isPending}
            >
              {deleteSession.isPending
                ? energySessionCopy.deleting
                : energySessionCopy.deleteSession}
            </button>
          </div>
          {deleteError ? <p className="mt-2 text-[11px] text-clay">{deleteError}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link to="/energy" className="mb-4 inline-flex text-xs text-ink-soft hover:text-ink">
        ← {energySessionCopy.back}
      </Link>

      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-moss sm:text-[11px] sm:tracking-[0.22em]">
            {tool.icon} {tool.badge} · {tool.subtitle}
          </p>
          <h1 className="mt-1.5 font-display text-xl leading-tight text-ink sm:mt-2 sm:text-3xl">
            {tool.title}
          </h1>
          {headerMeta}
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0 self-start px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
          onClick={() => goToStep(1, "read")}
        >
          {energySessionCopy.toReadMode}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:mb-5 sm:gap-2">
        {questions.map((item, index) => {
          const current = index + 1 === step;
          const done = progress.doneKeys.includes(item.key);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => goToStep(index + 1)}
              title={`第 ${index + 1} 题 · ${item.title}${done ? "（已填写）" : ""}`}
              className={[
                "flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums transition sm:h-8 sm:min-w-8 sm:px-2 sm:text-xs",
                current
                  ? "bg-ink text-paper shadow-sm"
                  : done
                    ? "bg-moss-soft text-moss-dark hover:bg-moss/20"
                    : "border border-line bg-white/60 text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {index + 1}
            </button>
          );
        })}
        <span className="ml-auto text-[11px] tabular-nums text-ink-soft sm:text-xs">
          {energyQuestionProgressLabel(step, questions.length)}
        </span>
      </div>

      <div className="mb-4 h-1 overflow-hidden rounded-full bg-paper-deep sm:mb-5 sm:h-1.5">
        <div
          className="h-full rounded-full bg-moss transition-all"
          style={{ width: `${Math.round((step / questions.length) * 100)}%` }}
        />
      </div>

      <article className="card p-4 sm:p-9">
        <p className="text-[10px] uppercase tracking-[0.16em] text-moss sm:text-[11px] sm:tracking-[0.2em]">
          第 {step} 题 · {question.title}
        </p>
        <h2 className="mt-2 font-display text-lg leading-relaxed text-ink sm:mt-3 sm:text-2xl">
          {question.prompt}
        </h2>
        <p className="mt-2 text-xs leading-6 text-ink-soft sm:mt-3 sm:text-sm sm:leading-7">
          {question.hint}
        </p>

        <label className="mt-4 block sm:mt-6">
          <textarea
            ref={textareaRef}
            className="field resize-none text-base leading-7 sm:leading-8"
            rows={5}
            maxLength={20000}
            aria-label={`第 ${step} 题：${question.title}`}
            placeholder={question.placeholder}
            value={currentValue}
            onChange={(event) => updateAnswer(question.key, event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                handleNext();
              }
            }}
          />
        </label>
        <div className="mt-2 flex items-center justify-between text-[10px] text-ink-soft sm:text-[11px]">
          <span className="pr-3">{energySessionCopy.shortcutHint}</span>
          <span className="shrink-0 tabular-nums">{currentValue.trim().length} 字</span>
        </div>
      </article>

      {/* 移动端固定在底部，拇指可及；桌面端回到卡片布局。 */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-line/60 bg-paper/95 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur sm:static sm:mx-0 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:rounded-[1.5rem] sm:border sm:border-line/70 sm:bg-white/60 sm:p-4 sm:pb-4 sm:backdrop-blur-none">
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-soft sm:order-none sm:text-xs">
          {saveState === "error" ? (
            <button
              type="button"
              onClick={() => void save()}
              className="text-left text-clay underline-offset-2 hover:underline"
            >
              {energySessionCopy.saveError}
              {saveError ? `：${saveError}` : ""}
            </button>
          ) : (
            <span className="truncate">{saveLabel}</span>
          )}
          <button
            type="button"
            className="shrink-0 text-moss underline-offset-2 hover:underline sm:hidden"
            onClick={() => goToStep(1, "read")}
          >
            {energySessionCopy.toReadMode}
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2 sm:mt-0">
          <button
            type="button"
            className="btn-secondary shrink-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
            onClick={() => goToStep(step - 1)}
            disabled={step <= 1}
          >
            {energySessionCopy.prev}
          </button>
          <button
            type="button"
            className="btn-secondary shrink-0 px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm"
            onClick={handleManualSave}
            disabled={updateSession.isPending || (!dirty && saveState !== "error")}
          >
            {energySessionCopy.saveDraft}
          </button>
          {step < questions.length ? (
            <button type="button" className="btn-primary min-w-0 flex-1 sm:flex-none" onClick={handleNext}>
              {energySessionCopy.next}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary min-w-0 flex-1 sm:flex-none"
              onClick={() => void finish()}
              disabled={updateSession.isPending}
            >
              {updateSession.isPending ? energySessionCopy.finishing : energySessionCopy.finish}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
