import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { GoalData, GoalEntry, GoalStatus } from "../../shared/types";
import { GOAL_STATUSES } from "../../shared/types";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { StepDiagnosis } from "../components/goals/StepDiagnosis";
import { StepGoal } from "../components/goals/StepGoal";
import { StepPlan } from "../components/goals/StepPlan";
import { StepPractice } from "../components/goals/StepPractice";
import { StepProblem } from "../components/goals/StepProblem";
import {
  goalDetailCopy,
  goalDomains,
  goalStatusMeta,
  goalSteps,
} from "../content/goals";
import {
  goalDeadlineLabel,
  goalPracticeLabel,
  goalProgress,
  goalStepChecklist,
  keyProblemOf,
  lastPracticeLog,
} from "../lib/goals";
import { useBootstrap, useDeleteGoal, useUpdateGoal } from "../lib/queries";

type GoalDraft = {
  id: string;
  title: string;
  domain: string;
  status: GoalStatus;
  data: GoalData;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

type Flash = {
  type: "success" | "info" | "error";
  message: string;
};

export function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useBootstrap();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const goal = data?.goals.find((item) => item.id === goalId);
  const [draft, setDraft] = useState<GoalDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const changeVersion = useRef(0);
  const draftRef = useRef<GoalDraft | null>(null);
  const dirtyRef = useRef(false);
  const updateGoalRef = useRef(updateGoal);

  const [searchParams, setSearchParams] = useSearchParams();
  const rawStep = Number(searchParams.get("step") ?? "1");
  const stepIndex = Number.isFinite(rawStep)
    ? Math.min(goalSteps.length - 1, Math.max(0, rawStep - 1))
    : 0;
  const currentStep = goalSteps[stepIndex];

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    updateGoalRef.current = updateGoal;
  }, [updateGoal]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!goal) return;
    setDraft({
      id: goal.id,
      title: goal.title,
      domain: goal.domain,
      status: goal.status,
      data: goal.data,
    });
    setDirty(false);
    dirtyRef.current = false;
    setSaveState("idle");
    setSaveError(null);
    setLastSavedAt(null);
    setFlash(null);
    changeVersion.current = 0;
    // 只跟着目标 id 重置；保存成功后 goal.updatedAt 会变，但不能重置正在编辑的内容
  }, [goal?.id]);

  const markDirty = useCallback(() => {
    changeVersion.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    setSaveState("dirty");
    setSaveError(null);
  }, []);

  const save = useCallback(
    async (options?: { announce?: boolean }): Promise<boolean> => {
      const current = draftRef.current;
      const announce = options?.announce ?? false;
      if (!current || !goalId) return true;

      if (!current.title.trim()) {
        setSaveState("error");
        setSaveError("目标名称不能为空");
        if (announce) setFlash({ type: "error", message: "先给目标起个名字" });
        return false;
      }

      const version = changeVersion.current;
      setSaveState("saving");
      setSaveError(null);

      try {
        await updateGoal.mutateAsync({
          id: goalId,
          patch: {
            title: current.title.trim(),
            domain: current.domain,
            status: current.status,
            data: current.data,
          },
        });

        const versionMatched = changeVersion.current === version;
        if (versionMatched) {
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

        if (announce) {
          setFlash({
            type: versionMatched ? "success" : "info",
            message: versionMatched ? "已保存" : "已保存，但又有新改动",
          });
        }
        return true;
      } catch (saveFailure) {
        setSaveState("error");
        setSaveError(
          saveFailure instanceof Error ? saveFailure.message : "保存失败，请重试",
        );
        if (announce) setFlash({ type: "error", message: "保存失败，请重试" });
        return false;
      }
    },
    [goalId, updateGoal],
  );

  useEffect(() => {
    if (!dirty || !draft || updateGoal.isPending || saveState === "error") return;
    const timer = window.setTimeout(() => {
      void save();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, save, saveState, updateGoal.isPending]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 2400);
    return () => window.clearTimeout(timer);
  }, [flash]);

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
      if (!goalId || !current || !dirtyRef.current || !current.title.trim()) return;
      void updateGoalRef.current
        .mutateAsync({
          id: goalId,
          patch: {
            title: current.title.trim(),
            domain: current.domain,
            status: current.status,
            data: current.data,
          },
        })
        .catch(() => undefined);
    };
  }, [goalId]);

  function goStep(next: number) {
    const clamped = Math.min(goalSteps.length - 1, Math.max(0, next));
    const params = new URLSearchParams(searchParams);
    params.set("step", String(clamped + 1));
    setSearchParams(params, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateMeta(patch: Partial<Pick<GoalDraft, "title" | "domain" | "status">>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    markDirty();
  }

  function updateData<K extends keyof GoalData>(key: K, value: GoalData[K]) {
    setDraft((prev) => (prev ? { ...prev, data: { ...prev.data, [key]: value } } : prev));
    markDirty();
  }

  async function finish() {
    if (dirty || dirtyRef.current) {
      const ok = await save();
      if (!ok) return;
    }
    navigate("/principles");
  }

  function handleManualSave() {
    if (updateGoal.isPending) return;
    if (!dirty && !dirtyRef.current) {
      setFlash({ type: "info", message: "已是最新，没有需要保存的改动" });
      return;
    }
    void save({ announce: true });
  }

  async function handleDelete() {
    if (!goalId) return;
    if (!window.confirm(goalDetailCopy.deleteConfirm)) return;
    try {
      await deleteGoal.mutateAsync(goalId);
      navigate("/principles");
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error ? deleteFailure.message : "删除失败，请重试",
      );
    }
  }

  if (isLoading) return <LoadingPage label="正在读取这个目标…" />;
  if (error) return <ErrorState error={error} />;
  if (!goal) {
    return (
      <EmptyState
        icon="🧭"
        title="目标不存在"
        description={goalDetailCopy.notFound}
        action={
          <Link to="/principles" className="btn-primary">
            {goalDetailCopy.back}
          </Link>
        }
      />
    );
  }
  if (!draft || draft.id !== goal.id) {
    return <LoadingPage label="正在准备目标…" />;
  }

  const progress = goalProgress(draft.data);
  const checklist = goalStepChecklist(currentStep.key, draft.data);
  const keyProblem = keyProblemOf(draft.data);
  const liveGoal: GoalEntry = {
    id: draft.id,
    title: draft.title,
    domain: draft.domain,
    status: draft.status,
    data: draft.data,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
  const directionDoc = data?.documents.find(
    (doc) => doc.module === "lifeos" && doc.key === "direction",
  );
  const directionTheme = String(directionDoc?.data.theme ?? "").trim();
  const directionStatement = String(directionDoc?.data.statement ?? "").trim();
  const lastLog = lastPracticeLog(liveGoal);

  function renderStep() {
    if (!draft) return null;
    switch (currentStep.key) {
      case "goal":
        return (
          <StepGoal data={draft.data.goal} onChange={(next) => updateData("goal", next)} />
        );
      case "problem":
        return (
          <StepProblem
            data={draft.data.problem}
            onChange={(next) => updateData("problem", next)}
          />
        );
      case "diagnosis":
        return (
          <StepDiagnosis
            problem={draft.data.problem}
            data={draft.data.diagnosis}
            onChange={(next) => updateData("diagnosis", next)}
            onGoToProblem={() => goStep(1)}
          />
        );
      case "plan":
        return (
          <StepPlan data={draft.data.plan} onChange={(next) => updateData("plan", next)} />
        );
      case "practice":
        return (
          <StepPractice
            plan={draft.data.plan}
            data={draft.data.practice}
            status={draft.status}
            onChange={(next) => updateData("practice", next)}
            onStatusChange={(status) => updateMeta({ status })}
            onGoToPlan={() => goStep(3)}
            onNotify={(message) => setFlash({ type: "success", message })}
          />
        );
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void finish()}
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        disabled={updateGoal.isPending}
      >
        ← {goalDetailCopy.back}
      </button>

      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-moss">
              Five-Step Diagnosis
            </p>
            <input
              type="text"
              value={draft.title}
              maxLength={120}
              aria-label="目标名称"
              placeholder="未命名目标"
              onChange={(event) => updateMeta({ title: event.target.value })}
              className="mt-2 w-full border-0 bg-transparent p-0 font-display text-3xl text-ink outline-none placeholder:text-ink-soft/40 sm:text-4xl"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span
              className={[
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                goalStatusMeta[draft.status].className,
              ].join(" ")}
            >
              {goalStatusMeta[draft.status].label}
            </span>
            <span className="text-[11px] text-ink-soft">{goalDeadlineLabel(liveGoal)}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={draft.domain}
            aria-label={goalDetailCopy.domainLabel}
            onChange={(event) => updateMeta({ domain: event.target.value })}
            className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-xs text-ink-soft outline-none transition focus:border-moss/50"
          >
            {goalDomains.map((item) => (
              <option key={item.key} value={item.key}>
                {item.icon} {item.label}
              </option>
            ))}
            {!goalDomains.some((item) => item.key === draft.domain) ? (
              <option value={draft.domain}>{draft.domain}</option>
            ) : null}
          </select>

          <select
            value={draft.status}
            aria-label={goalDetailCopy.statusLabel}
            onChange={(event) => updateMeta({ status: event.target.value as GoalStatus })}
            className="rounded-full border border-line bg-white/70 px-3 py-1.5 text-xs text-ink-soft outline-none transition focus:border-moss/50"
          >
            {GOAL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {goalStatusMeta[status].label}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-ink-soft/70">
            {saveState === "saving"
              ? goalDetailCopy.saveSaving
              : saveState === "saved"
                ? `${goalDetailCopy.saveSaved}${lastSavedAt ? ` · ${lastSavedAt}` : ""}`
                : dirty
                  ? goalDetailCopy.saveDirty
                  : goalDetailCopy.saveIdle}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-deep">
            <div
              className="h-full rounded-full bg-moss transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-ink-soft">{progress.completed} / 5</span>
        </div>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {goalSteps.map((step, index) => {
          const done = progress.done.includes(step.key);
          const active = index === stepIndex;
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => goStep(index)}
              className={[
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition",
                active
                  ? "bg-ink text-paper shadow-sm"
                  : "border border-line bg-white/60 text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              <span
                className={[
                  "text-xs",
                  done && !active ? "text-moss" : "opacity-60",
                ].join(" ")}
              >
                {done ? "✓" : String(step.index).padStart(2, "0")}
              </span>
              {step.title}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <article className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-moss-soft text-xl">
                  {currentStep.icon}
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                    第 {currentStep.index} 步 · {currentStep.short}
                  </p>
                  <h2 className="text-2xl text-ink">{currentStep.title}</h2>
                </div>
              </div>
              {progress.done.includes(currentStep.key) ? (
                <span className="chip">这一步已完成</span>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-7 text-ink-soft">{currentStep.desc}</p>

            <div className="mt-5 rounded-2xl bg-paper-deep/55 p-4 text-sm leading-7 text-ink-soft">
              <span className="font-medium text-moss-dark">这一步的产出：</span>
              {currentStep.output}
            </div>

            <div className="mt-7">{renderStep()}</div>
          </article>

          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink-soft">
              {saveState === "error" ? (
                <button
                  type="button"
                  onClick={() => void save({ announce: true })}
                  className="text-clay underline-offset-2 hover:underline"
                >
                  {goalDetailCopy.saveError}
                  {saveError ? `：${saveError}` : ""}
                </button>
              ) : saveState === "saving" ? (
                <span>{goalDetailCopy.saveSaving}</span>
              ) : saveState === "saved" ? (
                <span className="text-moss-dark">
                  {goalDetailCopy.saveSaved}
                  {lastSavedAt ? ` · ${lastSavedAt}` : ""}
                </span>
              ) : dirty ? (
                <span>{goalDetailCopy.saveDirty}</span>
              ) : (
                <span>{goalDetailCopy.saveIdle}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => goStep(stepIndex - 1)}
                disabled={stepIndex === 0}
              >
                {goalDetailCopy.prev}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleManualSave}
                disabled={updateGoal.isPending}
              >
                {updateGoal.isPending
                  ? "保存中…"
                  : saveState === "saved" && !dirty
                    ? "已保存 ✓"
                    : "保存"}
              </button>
              {stepIndex < goalSteps.length - 1 ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => goStep(stepIndex + 1)}
                >
                  {goalDetailCopy.next}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void finish()}
                  disabled={updateGoal.isPending}
                >
                  {updateGoal.isPending ? "保存中…" : "完成并返回"}
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-moss">Checklist</p>
            <h2 className="mt-1 text-base text-ink">{goalDetailCopy.sidebarChecklist}</h2>
            <ul className="mt-3 space-y-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex gap-2 text-xs leading-6">
                  <span className={item.done ? "text-moss" : "text-ink-soft/40"}>
                    {item.done ? "✓" : "○"}
                  </span>
                  <span className={item.done ? "text-ink-soft" : "text-ink"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-moss">North Star</p>
            <h2 className="mt-1 text-base text-ink">
              {directionTheme || goalDetailCopy.sidebarDirection}
            </h2>
            <p className="mt-2 text-xs leading-6 text-ink-soft">
              {directionStatement || goalDetailCopy.sidebarDirectionEmpty}
            </p>
            <Link
              to="/lifeos"
              className="mt-3 inline-block text-xs text-moss transition hover:text-moss-dark"
            >
              打开人生 OS →
            </Link>
          </section>

          <section className="card p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-moss">Overview</p>
            <h2 className="mt-1 text-base text-ink">{goalDetailCopy.sidebarOverview}</h2>
            <dl className="mt-4 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-soft">{goalDetailCopy.deadline}</dt>
                <dd className="text-right text-ink">{goalDeadlineLabel(liveGoal)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-soft">{goalDetailCopy.challenge}</dt>
                <dd className="text-right text-ink">{draft.data.goal.challenge} / 10</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-soft">{goalDetailCopy.keyProblem}</dt>
                <dd className="line-clamp-2 text-right text-ink">
                  {keyProblem?.title || "还没选"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-soft">{goalDetailCopy.practiceCount}</dt>
                <dd className="text-right text-ink">{draft.data.practice.logs.length} 条</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-ink-soft">{goalDetailCopy.lastPractice}</dt>
                <dd className="text-right text-ink">
                  {lastLog ? goalPracticeLabel(liveGoal) : "还没开始"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="text-base text-ink">不再推进？</h2>
            <p className="mt-1 text-[11px] leading-6 text-ink-soft">
              删除会连五步内容和践行记录一起消失。只是暂时放下的话，把状态改成「已暂停」就好。
            </p>
            <button
              type="button"
              className="mt-3 text-xs text-clay transition hover:text-clay/80 disabled:opacity-50"
              onClick={handleDelete}
              disabled={deleteGoal.isPending}
            >
              {deleteGoal.isPending ? "删除中…" : goalDetailCopy.deleteGoal}
            </button>
            {deleteError ? <p className="mt-2 text-[11px] text-clay">{deleteError}</p> : null}
          </section>
        </aside>
      </div>

      {flash ? (
        <div
          role="status"
          aria-live="polite"
          className={[
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur",
            flash.type === "error"
              ? "border-clay/30 bg-clay/10 text-clay"
              : flash.type === "success"
                ? "border-moss/30 bg-moss-soft text-moss-dark"
                : "border-line bg-white/90 text-ink-soft",
          ].join(" ")}
        >
          {flash.type === "success" ? "✓ " : flash.type === "error" ? "! " : "· "}
          {flash.message}
        </div>
      ) : null}
    </div>
  );
}
