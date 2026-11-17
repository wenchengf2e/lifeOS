import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { FearAnalysis, FearData, FearStepKey } from "../../shared/types";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { FearAnalysisCard } from "../components/fears/FearAnalysisCard";
import { FearStepField } from "../components/fears/FearStepField";
import { AUTOSAVE_DEBOUNCE_MS } from "../content/autosave";
import { fearDetailCopy, fearsPageCopy, fearSteps } from "../content/fears";
import { formatDateCN, toDateKey } from "../lib/date";
import { fearProgress, fearTitle } from "../lib/fears";
import { useBootstrap, useDeleteFear, useUpdateFear } from "../lib/queries";

type FearDraft = {
  id: string;
  data: FearData;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function FearDetailPage() {
  const { fearId } = useParams<{ fearId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useBootstrap();
  const updateFear = useUpdateFear();
  const deleteFear = useDeleteFear();

  const fear = (data?.fears ?? []).find((item) => item.id === fearId);
  const [draft, setDraft] = useState<FearDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const changeVersion = useRef(0);
  const draftRef = useRef<FearDraft | null>(null);
  const dirtyRef = useRef(false);
  const updateFearRef = useRef(updateFear);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    updateFearRef.current = updateFear;
  }, [updateFear]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!fear) return;
    setDraft({ id: fear.id, data: fear.data });
    setDirty(false);
    dirtyRef.current = false;
    setSaveState("idle");
    setSaveError(null);
    setLastSavedAt(null);
    setDeleteError(null);
    setArchiveError(null);
    changeVersion.current = 0;
    // 只跟着恐惧 id 重置；保存成功后 fear.updatedAt 会变，但不能重置正在编辑的内容
  }, [fear?.id]);

  const markDirty = useCallback(() => {
    changeVersion.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    setSaveState("dirty");
    setSaveError(null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const current = draftRef.current;
    if (!current || !fearId) return true;

    const version = changeVersion.current;
    setSaveState("saving");
    setSaveError(null);

    try {
      await updateFear.mutateAsync({ id: fearId, patch: { data: current.data } });

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
  }, [fearId, updateFear]);

  useEffect(() => {
    if (!dirty || !draft || updateFear.isPending || saveState === "error") return;
    const timer = window.setTimeout(() => {
      void save();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, save, saveState, updateFear.isPending]);

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
      if (!fearId || !current || !dirtyRef.current) return;
      void updateFearRef.current.mutateAsync({ id: fearId, patch: { data: current.data } }).catch(
        () => undefined,
      );
    };
  }, [fearId]);

  function updateField(key: FearStepKey, value: string) {
    setDraft((prev) => (prev ? { ...prev, data: { ...prev.data, [key]: value } } : prev));
    markDirty();
  }

  // 分析是可选内容，和五步字段一样走防抖自动保存，但不进入 fearProgress。
  function updateAnalysis(next: FearAnalysis) {
    setDraft((prev) => (prev ? { ...prev, data: { ...prev.data, analysis: next } } : prev));
    markDirty();
  }

  async function finish() {
    if (dirty || dirtyRef.current) {
      const ok = await save();
      if (!ok) return;
    }
    navigate("/fears");
  }

  function handleManualSave() {
    if (updateFear.isPending) return;
    if (!dirty && !dirtyRef.current) return;
    void save();
  }

  async function handleDelete() {
    if (!fearId) return;
    if (!window.confirm(fearDetailCopy.deleteConfirm)) return;
    try {
      await deleteFear.mutateAsync(fearId);
      // 删除成功后不要再让离开清理补一次保存
      dirtyRef.current = false;
      setDirty(false);
      navigate("/fears");
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error ? deleteFailure.message : "删除失败，请重试",
      );
    }
  }

  // 归档可逆，不弹确认；先落盘未保存的内容，避免归档与补保存交错。
  async function handleArchiveToggle() {
    if (!fearId || !fear) return;
    setArchiveError(null);
    if (dirtyRef.current) {
      const ok = await save();
      if (!ok) return;
    }
    try {
      await updateFear.mutateAsync({ id: fearId, patch: { archived: !fear.archived } });
    } catch (archiveFailure) {
      setArchiveError(
        archiveFailure instanceof Error
          ? archiveFailure.message
          : fear.archived
            ? fearDetailCopy.unarchiveFailed
            : fearDetailCopy.archiveFailed,
      );
    }
  }

  if (isLoading) return <LoadingPage label="正在读取这条恐惧…" />;
  if (error) return <ErrorState error={error} />;
  if (!fear) {
    return (
      <EmptyState
        icon="🫨"
        title="恐惧不存在"
        description={fearDetailCopy.notFound}
        action={
          <Link to="/fears" className="btn-primary">
            {fearDetailCopy.back}
          </Link>
        }
      />
    );
  }
  if (!draft || draft.id !== fear.id) {
    return <LoadingPage label="正在准备这条恐惧…" />;
  }

  const progress = fearProgress(draft.data);

  return (
    <div>
      <button
        type="button"
        onClick={() => void finish()}
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        disabled={updateFear.isPending}
      >
        ← {fearDetailCopy.back}
      </button>

      <div className="mb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-moss">
          {fearsPageCopy.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight text-ink sm:text-4xl">
          {fearTitle(draft.data)}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {fear.archived ? (
            <span className="rounded-full bg-paper-deep/80 px-2.5 py-1 text-[11px] font-medium text-ink-soft">
              {fearDetailCopy.archivedBadge}
            </span>
          ) : null}
          <span className="text-[11px] text-ink-soft">
            {fearDetailCopy.createdAt}{" "}
            {formatDateCN(toDateKey(new Date(fear.createdAt)), { withYear: true })}
          </span>
          <span className="text-[11px] text-ink-soft/70">
            {saveState === "saving"
              ? fearDetailCopy.saveSaving
              : saveState === "saved"
                ? `${fearDetailCopy.saveSaved}${lastSavedAt ? ` · ${lastSavedAt}` : ""}`
                : saveState === "error"
                  ? fearDetailCopy.saveError
                  : dirty
                    ? fearDetailCopy.saveDirty
                    : fearDetailCopy.saveIdle}
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

      <div className="space-y-4">
        {fearSteps.slice(0, 3).map((step) => (
          <FearStepField
            key={step.key}
            step={step}
            value={draft.data[step.key]}
            done={progress.done.includes(step.key)}
            onChange={(value) => updateField(step.key, value)}
          />
        ))}

        {/* key 跟记录走：切换到另一条恐惧时重新判断「有内容自动展开」 */}
        <FearAnalysisCard
          key={fear.id}
          data={draft.data.analysis}
          onChange={updateAnalysis}
        />

        {fearSteps.slice(3).map((step) => (
          <FearStepField
            key={step.key}
            step={step}
            value={draft.data[step.key]}
            done={progress.done.includes(step.key)}
            onChange={(value) => updateField(step.key, value)}
          />
        ))}
      </div>

      <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-ink-soft">
          {saveState === "error" ? (
            <button
              type="button"
              onClick={() => void save()}
              className="text-clay underline-offset-2 hover:underline"
            >
              {fearDetailCopy.saveError}
              {saveError ? `：${saveError}` : ""}
            </button>
          ) : saveState === "saving" ? (
            <span>{fearDetailCopy.saveSaving}</span>
          ) : saveState === "saved" ? (
            <span className="text-moss-dark">
              {fearDetailCopy.saveSaved}
              {lastSavedAt ? ` · ${lastSavedAt}` : ""}
            </span>
          ) : dirty ? (
            <span>{fearDetailCopy.saveDirty}</span>
          ) : (
            <span>{fearDetailCopy.saveIdle}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleArchiveToggle()}
            disabled={updateFear.isPending}
            title={fear.archived ? fearDetailCopy.unarchiveHint : fearDetailCopy.archiveHint}
          >
            {fear.archived ? fearDetailCopy.unarchive : fearDetailCopy.archive}
          </button>
          <button
            type="button"
            className="btn-ghost text-clay hover:text-clay/80"
            onClick={handleDelete}
            disabled={deleteFear.isPending}
            title={fearDetailCopy.deleteHint}
          >
            {deleteFear.isPending ? "删除中…" : fearDetailCopy.deleteFear}
          </button>
          <button type="button" className="btn-secondary" onClick={() => void finish()}>
            返回列表
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleManualSave}
            disabled={updateFear.isPending}
          >
            {updateFear.isPending
              ? "保存中…"
              : saveState === "saved" && !dirty
                ? "已保存 ✓"
                : "保存"}
          </button>
        </div>
      </div>

      {deleteError ? <p className="mt-2 text-[11px] text-clay">{deleteError}</p> : null}
      {archiveError ? <p className="mt-2 text-[11px] text-clay">{archiveError}</p> : null}
    </div>
  );
}
