import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { TelosCategory, TelosItemEntry, TelosRiskStatus } from "../../shared/types";
import { CompassCreateDialog } from "../components/compass/CompassCreateDialog";
import { CompassProfileCard } from "../components/compass/CompassProfileCard";
import { CompassTree } from "../components/compass/CompassTree";
import { RiskCard } from "../components/compass/RiskCard";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import {
  compassCategoryMeta,
  compassCategoryOrder,
  compassCreateCopy,
  compassPageCopy,
  compassRiskStatusOrder,
  compassSnapshotsCopy,
  compassStatusMeta,
} from "../content/compass";
import {
  countDescendants,
  countDetectMissingRisks,
  describeCompassDescendants,
  nextCompassCategory,
  sortRisks,
} from "../lib/compass";
import { formatDateTimeCN } from "../lib/date";
import {
  useCreateTelosItem,
  useCreateTelosSnapshot,
  useDeleteTelosItem,
  useTelosItems,
  useTelosSnapshots,
} from "../lib/queries";

type CreateTarget = {
  category: TelosCategory;
  parent: TelosItemEntry | null;
};

type Flash = {
  type: "success" | "error";
  message: string;
};

export function CompassPage() {
  const navigate = useNavigate();
  const itemsQuery = useTelosItems();
  const snapshotsQuery = useTelosSnapshots();
  const createItem = useCreateTelosItem();
  const deleteItem = useDeleteTelosItem();
  const createSnapshot = useCreateTelosSnapshot();

  const [createTarget, setCreateTarget] = useState<CreateTarget | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<TelosRiskStatus | "all">("all");
  const [flash, setFlash] = useState<Flash | null>(null);

  const items = itemsQuery.data ?? [];
  const snapshots = snapshotsQuery.data ?? [];

  const counts = useMemo(() => {
    const result: Record<TelosCategory, number> = {
      problem: 0,
      goal: 0,
      challenge: 0,
      strategy: 0,
      project: 0,
      risk: 0,
    };
    for (const item of items) result[item.category] += 1;
    return result;
  }, [items]);

  const allRisks = useMemo(() => sortRisks(items), [items]);
  const shownRisks = useMemo(() => sortRisks(items, riskFilter), [items, riskFilter]);
  const detectMissing = useMemo(() => countDetectMissingRisks(items), [items]);

  const riskStatusCounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const risk of allRisks) result[risk.status] = (result[risk.status] ?? 0) + 1;
    return result;
  }, [allRisks]);

  const recentSnapshots = snapshots.slice(0, 5);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 2600);
    return () => window.clearTimeout(timer);
  }, [flash]);

  if (itemsQuery.isLoading) return <LoadingPage label="正在打开人生罗盘…" />;
  if (itemsQuery.error) return <ErrorState error={itemsQuery.error} />;

  function openRoot(category: TelosCategory) {
    setDialogError(null);
    setCreateTarget({ category, parent: null });
  }

  function openChild(parent: TelosItemEntry) {
    const category = nextCompassCategory(parent.category);
    if (!category) return;
    setDialogError(null);
    setCreateTarget({ category, parent });
  }

  function closeDialog() {
    setCreateTarget(null);
    setDialogError(null);
  }

  async function handleCreate(title: string) {
    if (!createTarget) return;
    setDialogError(null);
    try {
      const result = await createItem.mutateAsync({
        category: createTarget.category,
        parentId: createTarget.parent?.id ?? null,
        title,
      });
      setCreateTarget(null);
      navigate(`/compass/items/${result.item.id}`);
    } catch (createFailure) {
      setDialogError(
        createFailure instanceof Error ? createFailure.message : compassCreateCopy.failed,
      );
    }
  }

  async function handleDelete(item: TelosItemEntry) {
    const descendants = countDescendants(items, item.id);
    const detail = describeCompassDescendants(descendants);
    const message =
      descendants.total > 0
        ? `删除「${item.title}」会同时删除 ${descendants.total} 条下级内容${
            detail ? `（${detail}）` : ""
          }。确定吗？`
        : `删除「${item.title}」？确定吗？`;
    if (!window.confirm(message)) return;

    try {
      await deleteItem.mutateAsync(item.id);
    } catch (deleteFailure) {
      setFlash({
        type: "error",
        message:
          deleteFailure instanceof Error ? deleteFailure.message : compassPageCopy.deleteFailed,
      });
    }
  }

  async function handleCreateSnapshot() {
    if (createSnapshot.isPending) return;
    try {
      await createSnapshot.mutateAsync();
      setFlash({ type: "success", message: compassPageCopy.snapshotCreated });
    } catch (createFailure) {
      setFlash({
        type: "error",
        message:
          createFailure instanceof Error
            ? createFailure.message
            : compassPageCopy.snapshotCreateFailed,
      });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={compassPageCopy.eyebrow}
        title={compassPageCopy.title}
        description={compassPageCopy.description}
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => openRoot("risk")}
            >
              + {compassPageCopy.newRisk}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => openRoot("problem")}
            >
              + {compassPageCopy.newProblem}
            </button>
          </div>
        }
      />

      <CompassProfileCard />

      <section className="mt-6">
        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-moss">
          {compassPageCopy.statsTitle}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {compassCategoryOrder.map((category) => (
            <div key={category} className="card p-4">
              <p className="text-[11px] text-ink-soft">
                {compassCategoryMeta[category].icon} {compassCategoryMeta[category].label}
              </p>
              <p className="mt-1 font-display text-2xl tabular-nums text-ink">
                {counts[category]}
              </p>
            </div>
          ))}
          <div
            className="card p-4"
            title={compassPageCopy.blindSpotHint}
          >
            <p className="text-[11px] text-ink-soft">⚠ {compassPageCopy.blindSpotLabel}</p>
            <p
              className={[
                "mt-1 font-display text-2xl tabular-nums",
                detectMissing > 0 ? "text-clay" : "text-ink",
              ].join(" ")}
            >
              {detectMissing}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Problem → Project</p>
          <h2 className="mt-1 text-xl text-ink">{compassPageCopy.treeTitle}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-soft">
            {compassPageCopy.treeDesc}
          </p>
        </div>

        {counts.problem === 0 ? (
          <EmptyState
            icon="🌍"
            title={compassPageCopy.treeEmptyTitle}
            description={compassPageCopy.treeEmptyDesc}
            action={
              <button type="button" className="btn-primary" onClick={() => openRoot("problem")}>
                + {compassPageCopy.newProblem}
              </button>
            }
          />
        ) : (
          <CompassTree items={items} onCreateChild={openChild} onDelete={handleDelete} />
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Risk Register</p>
            <h2 className="mt-1 text-xl text-ink">{compassPageCopy.riskTitle}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-soft">
              {compassPageCopy.riskDesc}
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => openRoot("risk")}>
            + {compassPageCopy.newRisk}
          </button>
        </div>

        {allRisks.length === 0 ? (
          <EmptyState
            icon="⚠️"
            title={compassPageCopy.riskEmptyTitle}
            description={compassPageCopy.riskEmptyDesc}
            action={
              <button type="button" className="btn-primary" onClick={() => openRoot("risk")}>
                + {compassPageCopy.newRisk}
              </button>
            }
          />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRiskFilter("all")}
                className={[
                  "rounded-full px-3.5 py-2 text-sm transition",
                  riskFilter === "all"
                    ? "bg-ink text-paper shadow-sm"
                    : "text-ink-soft hover:bg-white/70 hover:text-ink",
                ].join(" ")}
              >
                {compassPageCopy.riskAll}
                <span className="ml-1.5 text-[11px] opacity-60">{allRisks.length}</span>
              </button>
              {compassRiskStatusOrder.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setRiskFilter(status)}
                  className={[
                    "rounded-full px-3.5 py-2 text-sm transition",
                    riskFilter === status
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink-soft hover:bg-white/70 hover:text-ink",
                  ].join(" ")}
                >
                  {compassStatusMeta.risk[status].label}
                  <span className="ml-1.5 text-[11px] opacity-60">
                    {riskStatusCounts[status] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {shownRisks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 p-8 text-center">
                <p className="text-sm text-ink-soft">这个状态下还没有风险。</p>
                <button
                  type="button"
                  className="btn-secondary mt-4"
                  onClick={() => setRiskFilter("all")}
                >
                  查看全部风险
                </button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {shownRisks.map((risk) => (
                  <RiskCard key={risk.id} risk={risk} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Snapshots</p>
            <h2 className="mt-1 text-xl text-ink">{compassPageCopy.snapshotsTitle}</h2>
            <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-soft">
              {compassPageCopy.snapshotsDesc}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/compass/snapshots" className="btn-secondary">
              {compassPageCopy.snapshotViewAll}
            </Link>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void handleCreateSnapshot()}
              disabled={createSnapshot.isPending}
            >
              {createSnapshot.isPending
                ? compassPageCopy.creatingSnapshot
                : compassPageCopy.createSnapshot}
            </button>
          </div>
        </div>

        {snapshotsQuery.isLoading ? (
          <p className="text-sm text-ink-soft">{compassSnapshotsCopy.loading}</p>
        ) : snapshotsQuery.error ? (
          <p className="text-sm text-clay">
            快照列表读取失败：
            {snapshotsQuery.error instanceof Error
              ? snapshotsQuery.error.message
              : "未知错误"}
          </p>
        ) : recentSnapshots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 px-5 py-8 text-center">
            <p className="text-sm text-ink-soft">{compassPageCopy.snapshotEmpty}</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {recentSnapshots.map((snapshot) => (
              <Link
                key={snapshot.id}
                to={`/compass/snapshots?a=${snapshot.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/70 bg-white/60 px-4 py-3 text-sm transition hover:border-moss/30"
              >
                <span className="text-ink">{formatDateTimeCN(snapshot.createdAt)}</span>
                <span className="text-xs text-ink-soft">
                  {snapshot.itemCount} {compassSnapshotsCopy.itemCount}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {createTarget ? (
        <CompassCreateDialog
          category={createTarget.category}
          parentTitle={createTarget.parent?.title ?? null}
          submitting={createItem.isPending}
          error={dialogError}
          onClose={closeDialog}
          onSubmit={handleCreate}
        />
      ) : null}

      {flash ? (
        <div
          role="status"
          aria-live="polite"
          className={[
            "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-4 py-2 text-sm shadow-lg backdrop-blur",
            flash.type === "error"
              ? "border-clay/30 bg-clay/10 text-clay"
              : "border-moss/30 bg-moss-soft text-moss-dark",
          ].join(" ")}
        >
          {flash.type === "success" ? "✓ " : "! "}
          {flash.message}
        </div>
      ) : null}
    </>
  );
}
