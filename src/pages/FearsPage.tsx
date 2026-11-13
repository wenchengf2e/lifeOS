import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEmptyFearData } from "../../shared/types";
import { FearCard } from "../components/FearCard";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { fearsPageCopy, newFearCopy } from "../content/fears";
import { fearStage, sortFears } from "../lib/fears";
import { useBootstrap, useCreateFear } from "../lib/queries";

export function FearsPage() {
  const { data, isLoading, error } = useBootstrap();
  const createFear = useCreateFear();
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [fearText, setFearText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!showCreate) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowCreate(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [showCreate]);

  const fears = useMemo(() => sortFears(data?.fears ?? []), [data?.fears]);
  const stats = useMemo(() => {
    const counts: Record<string, number> = { pending_action: 0, pending_proof: 0, verified: 0 };
    for (const entry of fears) counts[fearStage(entry.data)] += 1;
    return counts;
  }, [fears]);

  if (isLoading) return <LoadingPage label="正在读取恐惧清单…" />;
  if (error) return <ErrorState error={error} />;

  function openCreate() {
    setFearText("");
    setFormError(null);
    setShowCreate(true);
  }

  async function handleCreate() {
    const content = fearText.trim();
    if (!content) {
      setFormError("先写下一句具体的恐惧，哪怕只是「下周的汇报」也可以。");
      return;
    }

    try {
      const result = await createFear.mutateAsync({
        data: { ...createEmptyFearData(), fear: content },
      });
      setShowCreate(false);
      navigate(`/fears/${result.fear.id}`);
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : "创建失败，请重试");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={fearsPageCopy.eyebrow}
        title={fearsPageCopy.title}
        description={fearsPageCopy.description}
        action={
          <button type="button" className="btn-primary" onClick={openCreate}>
            + {fearsPageCopy.newFear}
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-white/70 px-3 py-1.5 text-xs text-ink-soft">
          {fearsPageCopy.statsTotal} {fears.length} {fearsPageCopy.statsUnit}
        </span>
        <span className="rounded-full bg-paper-deep/80 px-3 py-1.5 text-xs text-ink-soft">
          待行动 {stats.pending_action}
        </span>
        <span className="rounded-full bg-clay/10 px-3 py-1.5 text-xs text-clay">
          待验证 {stats.pending_proof}
        </span>
        <span className="rounded-full bg-moss-soft px-3 py-1.5 text-xs text-moss-dark">
          已验证 {stats.verified}
        </span>
      </div>

      {fears.length === 0 ? (
        <EmptyState
          icon="🫨"
          title={fearsPageCopy.emptyTitle}
          description={fearsPageCopy.emptyDesc}
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              + {fearsPageCopy.newFear}
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {fears.map((fear) => (
            <FearCard key={fear.id} fear={fear} />
          ))}
        </div>
      )}

      {showCreate ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-fear-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCreate(false);
          }}
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-line bg-paper p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-moss">New Fear</p>
                <h2 id="new-fear-title" className="mt-1 text-2xl text-ink">
                  {newFearCopy.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{newFearCopy.desc}</p>
              </div>
              <button
                type="button"
                className="btn-ghost shrink-0 text-xl"
                onClick={() => setShowCreate(false)}
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <label className="mt-6 block">
              <span className="block text-sm font-medium text-ink">{newFearCopy.label}</span>
              <span className="mt-1 block text-[11px] leading-6 text-ink-soft">
                {newFearCopy.hint}
              </span>
              <textarea
                ref={textareaRef}
                className="field mt-2 resize-y"
                rows={4}
                maxLength={20000}
                placeholder={newFearCopy.placeholder}
                value={fearText}
                onChange={(event) => {
                  setFearText(event.target.value);
                  setFormError(null);
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                    void handleCreate();
                  }
                }}
              />
            </label>

            {formError ? <p className="mt-4 text-sm text-clay">{formError}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>
                {newFearCopy.cancel}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreate}
                disabled={createFear.isPending}
              >
                {createFear.isPending ? newFearCopy.creating : newFearCopy.submit}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
