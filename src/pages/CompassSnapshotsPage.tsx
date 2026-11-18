import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { SnapshotDiff } from "../components/compass/SnapshotDiff";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { compassSnapshotsCopy } from "../content/compass";
import { formatDateTimeCN } from "../lib/date";
import {
  useDeleteTelosSnapshot,
  useTelosSnapshot,
  useTelosSnapshots,
} from "../lib/queries";

export function CompassSnapshotsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedA = searchParams.get("a");
  const selectedB = searchParams.get("b");

  const snapshotsQuery = useTelosSnapshots();
  const snapshotA = useTelosSnapshot(selectedA);
  const snapshotB = useTelosSnapshot(selectedB);
  const deleteSnapshot = useDeleteTelosSnapshot();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const snapshots = snapshotsQuery.data ?? [];
  const metaById = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot] as const));

  function updateSelection(nextA: string | null, nextB: string | null) {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    setSearchParams(params, { replace: true });
  }

  function selectA(id: string) {
    if (selectedA === id) {
      updateSelection(null, selectedB);
      return;
    }
    // 同一份快照不能同时是 A 和 B，占用时清掉另一侧。
    updateSelection(id, selectedB === id ? null : selectedB);
  }

  function selectB(id: string) {
    if (selectedB === id) {
      updateSelection(selectedA, null);
      return;
    }
    updateSelection(selectedA === id ? null : selectedA, id);
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    if (!window.confirm(compassSnapshotsCopy.deleteConfirm)) return;

    setDeletingId(id);
    setDeleteError(null);
    try {
      await deleteSnapshot.mutateAsync(id);
      updateSelection(selectedA === id ? null : selectedA, selectedB === id ? null : selectedB);
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error
          ? deleteFailure.message
          : compassSnapshotsCopy.deleteFailed,
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (snapshotsQuery.isLoading) return <LoadingPage label="正在读取快照…" />;
  if (snapshotsQuery.error) return <ErrorState error={snapshotsQuery.error} />;

  function renderComparison() {
    if (!selectedA || !selectedB) {
      return (
        <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 px-5 py-8 text-center">
          <p className="text-sm text-ink-soft">
            {snapshots.length < 2
              ? compassSnapshotsCopy.noSnapshotsHint
              : compassSnapshotsCopy.compareHint}
          </p>
        </div>
      );
    }

    if (snapshotA.isLoading || snapshotB.isLoading) {
      return <LoadingPage label={compassSnapshotsCopy.loading} />;
    }

    if (snapshotA.error || snapshotB.error) {
      return (
        <p className="rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay">
          {compassSnapshotsCopy.loadFailed}
        </p>
      );
    }

    if (!snapshotA.data || !snapshotB.data) {
      return (
        <p className="rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay">
          {compassSnapshotsCopy.missing}
        </p>
      );
    }

    return <SnapshotDiff before={snapshotA.data.data} after={snapshotB.data.data} />;
  }

  return (
    <>
      <PageHeader
        title={compassSnapshotsCopy.title}
        action={
          <Link to="/compass" className="btn-secondary">
            {compassSnapshotsCopy.back}
          </Link>
        }
      />

      {snapshots.length === 0 ? (
        <EmptyState
          icon="📌"
          title={compassSnapshotsCopy.emptyTitle}
          description={compassSnapshotsCopy.emptyDesc}
          action={
            <Link to="/compass" className="btn-primary">
              {compassSnapshotsCopy.emptyAction}
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          <section>
            <div className="mb-4">
              <h2 className="text-xl text-ink">{compassSnapshotsCopy.listTitle}</h2>
            </div>

            {deleteError ? <p className="mb-3 text-sm text-clay">{deleteError}</p> : null}

            <div className="grid gap-2">
              {snapshots.map((snapshot) => {
                const isA = selectedA === snapshot.id;
                const isB = selectedB === snapshot.id;
                const deleting = deletingId === snapshot.id;

                return (
                  <div
                    key={snapshot.id}
                    className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-ink">
                        {formatDateTimeCN(snapshot.createdAt)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        共 {snapshot.itemCount} {compassSnapshotsCopy.itemCount}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectA(snapshot.id)}
                        aria-pressed={isA}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs transition",
                          isA
                            ? "bg-ink text-paper shadow-sm"
                            : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                        ].join(" ")}
                      >
                        {isA ? "A · 已选" : compassSnapshotsCopy.selectA}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectB(snapshot.id)}
                        aria-pressed={isB}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs transition",
                          isB
                            ? "bg-ink text-paper shadow-sm"
                            : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                        ].join(" ")}
                      >
                        {isB ? "B · 已选" : compassSnapshotsCopy.selectB}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(snapshot.id)}
                        disabled={deletingId !== null}
                        className="btn-ghost px-2 py-1 text-xs text-ink-soft/70 hover:text-clay"
                      >
                        {deleting
                          ? compassSnapshotsCopy.deleting
                          : compassSnapshotsCopy.delete}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl text-ink">{compassSnapshotsCopy.compareTitle}</h2>
              {selectedA && selectedB ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => updateSelection(selectedB, selectedA)}
                >
                  {compassSnapshotsCopy.swap}
                </button>
              ) : null}
            </div>

            {selectedA || selectedB ? (
              <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-ink-soft">
                <span className="rounded-full bg-paper-deep/80 px-2.5 py-1">
                  A：
                  {selectedA
                    ? metaById.get(selectedA)
                      ? formatDateTimeCN(metaById.get(selectedA)!.createdAt)
                      : compassSnapshotsCopy.missing
                    : "未选择"}
                </span>
                <span className="rounded-full bg-paper-deep/80 px-2.5 py-1">
                  B：
                  {selectedB
                    ? metaById.get(selectedB)
                      ? formatDateTimeCN(metaById.get(selectedB)!.createdAt)
                      : compassSnapshotsCopy.missing
                    : "未选择"}
                </span>
              </div>
            ) : null}

            {renderComparison()}
          </section>
        </div>
      )}
    </>
  );
}
