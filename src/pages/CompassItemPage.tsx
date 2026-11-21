import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { TelosCategory, TelosData, TelosItemEntry, TelosPriority } from "../../shared/types";
import { TELOS_PARENT_CATEGORY, TELOS_STATUSES } from "../../shared/types";
import { CompassCreateDialog } from "../components/compass/CompassCreateDialog";
import { CompassItemFields } from "../components/compass/CompassItemFields";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { AUTOSAVE_DEBOUNCE_MS } from "../content/autosave";
import {
  compassCategoryMeta,
  compassCreateCopy,
  compassItemCopy,
  compassPriorityMeta,
  compassPriorityOrder,
} from "../content/compass";
import {
  compassStatusClassName,
  compassStatusLabel,
  compareCompassItems,
  countDescendants,
  describeCompassDescendants,
  getAllowedParents,
  getAncestorChain,
  getDescendantIds,
  nextCompassCategory,
} from "../lib/compass";
import { formatDateCN, toDateKey } from "../lib/date";
import {
  useCreateTelosItem,
  useDeleteTelosItem,
  useTelosItems,
  useUpdateTelosItem,
} from "../lib/queries";

type CompassDraft = {
  id: string;
  category: TelosCategory;
  title: string;
  status: string;
  priority: TelosPriority;
  parentId: string | null;
  sortOrder: number;
  data: TelosData;
  createdAt: string;
  updatedAt: string;
};

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export function CompassItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const itemsQuery = useTelosItems();
  const createItem = useCreateTelosItem();
  const updateItem = useUpdateTelosItem();
  const deleteItem = useDeleteTelosItem();

  const items = itemsQuery.data ?? [];
  const item = items.find((entry) => entry.id === itemId);

  const [draft, setDraft] = useState<CompassDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [childTarget, setChildTarget] = useState<TelosCategory | null>(null);
  const [childError, setChildError] = useState<string | null>(null);

  const changeVersion = useRef(0);
  const draftRef = useRef<CompassDraft | null>(null);
  const dirtyRef = useRef(false);
  const updateItemRef = useRef(updateItem);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    updateItemRef.current = updateItem;
  }, [updateItem]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    if (!item) return;
    setDraft({
      id: item.id,
      category: item.category,
      title: item.title,
      status: item.status,
      priority: item.priority,
      parentId: item.parentId,
      sortOrder: item.sortOrder,
      data: item.data,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
    setDirty(false);
    dirtyRef.current = false;
    setSaveState("idle");
    setSaveError(null);
    setDeleteError(null);
    setLastSavedAt(null);
    changeVersion.current = 0;
    // 只跟着条目 id 重置；保存成功后 updatedAt 会变，但不能重置正在编辑的内容
  }, [item?.id]);

  const markDirty = useCallback(() => {
    changeVersion.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    setSaveState("dirty");
    setSaveError(null);
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    const current = draftRef.current;
    if (!current || !itemId) return true;

    const title = current.title.trim();
    if (!title) {
      setSaveState("error");
      setSaveError("标题不能为空，先给它一个名字");
      return false;
    }

    const version = changeVersion.current;
    setSaveState("saving");
    setSaveError(null);

    try {
      await updateItem.mutateAsync({
        id: itemId,
        patch: {
          title,
          status: current.status,
          priority: current.priority,
          parentId: current.parentId,
          data: current.data,
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
  }, [itemId, updateItem]);

  useEffect(() => {
    if (!dirty || !draft || updateItem.isPending || saveState === "error") return;
    const timer = window.setTimeout(() => {
      void save();
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, dirty, save, saveState, updateItem.isPending]);

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
      if (!itemId || !current || !dirtyRef.current) return;
      const title = current.title.trim();
      if (!title) return;
      void updateItemRef.current
        .mutateAsync({
          id: itemId,
          patch: {
            title,
            status: current.status,
            priority: current.priority,
            parentId: current.parentId,
            data: current.data,
          },
        })
        .catch(() => undefined);
    };
  }, [itemId]);

  const chain = useMemo(
    () => (draft ? getAncestorChain(items, draft.id) : []),
    [items, draft],
  );

  const children = useMemo(() => {
    if (!draft) return [];
    return items
      .filter((entry) => entry.parentId === draft.id)
      .sort(compareCompassItems);
  }, [items, draft]);

  const descendantIds = useMemo(
    () => new Set(draft ? getDescendantIds(items, draft.id) : []),
    [items, draft],
  );

  const allowedParents = useMemo(
    () => (draft ? getAllowedParents(items, draft.category, descendantIds) : []),
    [items, draft, descendantIds],
  );

  const siblings = useMemo(() => {
    if (!draft) return [];
    return items
      .filter(
        (entry) =>
          entry.category === draft.category && entry.parentId === draft.parentId,
      )
      .sort(compareCompassItems);
  }, [items, draft]);

  if (itemsQuery.isLoading) return <LoadingPage label="正在读取这个条目…" />;
  if (itemsQuery.error) return <ErrorState error={itemsQuery.error} />;
  if (!item) {
    return (
      <EmptyState
        icon="🧭"
        title="条目不存在"
        description={compassItemCopy.notFound}
        action={
          <Link to="/compass" className="btn-primary">
            {compassItemCopy.back}
          </Link>
        }
      />
    );
  }
  if (!draft || draft.id !== item.id) {
    return <LoadingPage label="正在准备条目…" />;
  }

  const meta = compassCategoryMeta[draft.category];
  const parentCategory = TELOS_PARENT_CATEGORY[draft.category];
  const nextCategory = nextCompassCategory(draft.category);
  const parentItem = draft.parentId
    ? items.find((entry) => entry.id === draft.parentId)
    : undefined;
  const liveItem = draft as unknown as TelosItemEntry;
  const descendants = countDescendants(items, draft.id);
  const siblingIndex = siblings.findIndex((entry) => entry.id === draft.id);
  // 排序优先级优先于手排 sortOrder，箭头只调整同一优先级组内的顺序。
  const canMoveUp =
    siblingIndex > 0 && siblings[siblingIndex - 1]?.priority === draft.priority;
  const canMoveDown =
    siblingIndex >= 0 &&
    siblingIndex < siblings.length - 1 &&
    siblings[siblingIndex + 1]?.priority === draft.priority;

  function updateMeta(
    patch: Partial<Pick<CompassDraft, "title" | "status" | "priority" | "parentId">>,
  ) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    markDirty();
  }

  function updateData(next: TelosData) {
    setDraft((prev) => (prev ? { ...prev, data: next } : prev));
    markDirty();
  }

  async function finish() {
    if (dirty || dirtyRef.current) {
      const ok = await save();
      if (!ok) return;
    }
    navigate("/compass");
  }

  function handleManualSave() {
    if (updateItem.isPending) return;
    if (!dirty && !dirtyRef.current) return;
    void save();
  }

  async function handleDelete() {
    if (!draft) return;
    const detail = describeCompassDescendants(descendants);
    const message =
      descendants.total > 0
        ? `删除「${draft.title}」会同时删除 ${descendants.total} 条下级内容${
            detail ? `（${detail}）` : ""
          }。确定吗？`
        : `删除「${draft.title}」？确定吗？`;
    if (!window.confirm(message)) return;

    setDeleteError(null);
    try {
      await deleteItem.mutateAsync(draft.id);
      // 删除成功后不要再让离开清理补一次保存
      dirtyRef.current = false;
      setDirty(false);
      navigate("/compass");
    } catch (deleteFailure) {
      setDeleteError(
        deleteFailure instanceof Error ? deleteFailure.message : compassItemCopy.deleteFailed,
      );
    }
  }

  async function handleCreateChild(title: string, priority: TelosPriority) {
    if (!draft || !nextCategory) return;
    setChildError(null);
    try {
      const result = await createItem.mutateAsync({
        category: nextCategory,
        parentId: draft.id,
        title,
        priority,
      });
      setChildTarget(null);
      navigate(`/compass/items/${result.item.id}`);
    } catch (createFailure) {
      setChildError(
        createFailure instanceof Error ? createFailure.message : compassCreateCopy.failed,
      );
    }
  }

  /** 同级排序：和相邻条目交换 sortOrder；两个请求都成功后同步本地草稿。 */
  async function handleMove(direction: -1 | 1) {
    if (!draft || updateItem.isPending) return;
    const targetIndex = siblingIndex + direction;
    const target = siblings[targetIndex];
    if (siblingIndex < 0 || !target || target.priority !== draft.priority) return;

    let nextCurrentOrder = target.sortOrder;
    let nextTargetOrder = draft.sortOrder;
    if (nextCurrentOrder === nextTargetOrder) {
      // sortOrder 相同时交换不会产生变化，把当前项放到目标前 / 后。
      nextCurrentOrder = target.sortOrder + (direction === -1 ? -1 : 1);
      nextTargetOrder = target.sortOrder;
    }

    setSaveError(null);
    try {
      await updateItem.mutateAsync({
        id: draft.id,
        patch: { sortOrder: nextCurrentOrder },
      });
      await updateItem.mutateAsync({
        id: target.id,
        patch: { sortOrder: nextTargetOrder },
      });
      // 排序是元数据，不改变内容，不能触发自动保存覆盖排序结果。
      setDraft((prev) => (prev ? { ...prev, sortOrder: nextCurrentOrder } : prev));
    } catch (moveFailure) {
      setSaveState("error");
      setSaveError(
        moveFailure instanceof Error ? moveFailure.message : "调整顺序失败，请重试",
      );
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void finish()}
        className="mb-4 inline-flex items-center gap-1 text-xs text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        disabled={updateItem.isPending}
      >
        ← {compassItemCopy.back}
      </button>

      <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-ink-soft">
        <Link to="/compass" className="transition hover:text-ink">
          人生罗盘
        </Link>
        {chain.map((node) => (
          <span key={node.id} className="flex items-center gap-1">
            <span className="text-ink-soft/50">→</span>
            {node.id === draft.id ? (
              <span className="text-ink">
                {compassCategoryMeta[node.category].icon} {node.title}
              </span>
            ) : (
              <Link to={`/compass/items/${node.id}`} className="transition hover:text-ink">
                {compassCategoryMeta[node.category].icon} {node.title}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[11px] font-medium",
              meta.className,
            ].join(" ")}
          >
            {meta.icon} {meta.label}
          </span>
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[11px]",
              compassStatusClassName(draft.category, draft.status),
            ].join(" ")}
          >
            {compassStatusLabel(draft.category, draft.status)}
          </span>
          <span className="text-[11px] text-ink-soft">
            {compassItemCopy.createdAt}{" "}
            {formatDateCN(toDateKey(new Date(item.createdAt)), { withYear: true })}
          </span>
        </div>

        <input
          type="text"
          value={draft.title}
          maxLength={200}
          aria-label="标题"
          placeholder={compassItemCopy.titlePlaceholder}
          onChange={(event) => updateMeta({ title: event.target.value })}
          className="mt-2 w-full border-0 bg-transparent p-0 font-display text-3xl text-ink outline-none placeholder:text-ink-soft/40 sm:text-4xl"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={draft.status}
            aria-label={compassItemCopy.statusLabel}
            onChange={(event) => updateMeta({ status: event.target.value })}
            className="select-pill"
          >
            {TELOS_STATUSES[draft.category].map((status) => (
              <option key={status} value={status}>
                {compassStatusLabel(draft.category, status)}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span>{compassItemCopy.priorityLabel}</span>
            <select
              value={draft.priority}
              aria-label={compassItemCopy.priorityLabel}
              onChange={(event) =>
                updateMeta({ priority: event.target.value as TelosPriority })
              }
              className="select-pill"
            >
              {compassPriorityOrder.map((priority) => (
                <option key={priority} value={priority}>
                  {compassPriorityMeta[priority].label}
                </option>
              ))}
            </select>
          </label>

          {parentCategory ? (
            <label className="flex items-center gap-1.5 text-xs text-ink-soft">
              <span>{compassItemCopy.parentLabel}</span>
              <select
                value={draft.parentId ?? ""}
                aria-label={compassItemCopy.parentLabel}
                onChange={(event) => updateMeta({ parentId: event.target.value || null })}
                className="select-pill max-w-52"
              >
                {allowedParents.length === 0 ? (
                  <option value="">{compassItemCopy.parentEmpty}</option>
                ) : null}
                {allowedParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.title}
                  </option>
                ))}
                {draft.parentId &&
                !allowedParents.some((parent) => parent.id === draft.parentId) ? (
                  <option value={draft.parentId}>
                    {parentItem?.title ?? "当前上级"}
                  </option>
                ) : null}
              </select>
            </label>
          ) : (
            <span className="rounded-full bg-paper-deep/80 px-2.5 py-1 text-[11px] text-ink-soft">
              根级条目
            </span>
          )}

          <span className="flex items-center gap-1 text-[11px] text-ink-soft">
            <span className="px-1">{compassItemCopy.sortLabel}</span>
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              aria-label={compassItemCopy.moveUp}
              disabled={!canMoveUp || updateItem.isPending}
              onClick={() => void handleMove(-1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs"
              aria-label={compassItemCopy.moveDown}
              disabled={!canMoveDown || updateItem.isPending}
              onClick={() => void handleMove(1)}
            >
              ↓
            </button>
          </span>

          <span className="text-[11px] text-ink-soft/70">
            {saveState === "saving"
              ? compassItemCopy.saveSaving
              : saveState === "saved"
                ? `${compassItemCopy.saveSaved}${lastSavedAt ? ` · ${lastSavedAt}` : ""}`
                : dirty
                  ? compassItemCopy.saveDirty
                  : compassItemCopy.saveIdle}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="card p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-moss-soft text-xl">
              {meta.icon}
            </span>
            <div>
              <h2 className="text-2xl text-ink">{meta.label}内容</h2>
            </div>
          </div>

          <div className="mt-7">
            <CompassItemFields item={liveItem} onChange={updateData} />
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-5">
            <h2 className="text-base text-ink">{compassItemCopy.childrenTitle}</h2>

            {children.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-line bg-paper-deep/30 px-3 py-3 text-xs leading-6 text-ink-soft">
                {compassItemCopy.childrenEmpty}
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {children.map((child) => (
                  <li key={child.id}>
                    <Link
                      to={`/compass/items/${child.id}`}
                      className="flex items-center gap-2 rounded-xl border border-line/70 bg-white/60 px-3 py-2 transition hover:border-moss/30"
                    >
                      <span className="text-sm">
                        {compassCategoryMeta[child.category].icon}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-ink">
                        {child.title}
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-soft">
                        {compassStatusLabel(child.category, child.status)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {nextCategory ? (
              <button
                type="button"
                className="btn-secondary mt-3 w-full text-xs"
                onClick={() => {
                  setChildError(null);
                  setChildTarget(nextCategory);
                }}
              >
                + {compassItemCopy.addChild}
                {compassCategoryMeta[nextCategory].label}
              </button>
            ) : (
              <p className="mt-3 text-[11px] text-ink-soft">
                项目是五级链的末端，不再往下添加。
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="text-base text-ink">{compassItemCopy.deleteTitle}</h2>
            <p className="mt-1 text-[11px] leading-6 text-ink-soft">
              {compassItemCopy.deleteHint}
            </p>
            {descendants.total > 0 ? (
              <p className="mt-2 text-[11px] text-clay">
                当前会同时删除 {descendants.total} 条下级内容
                {describeCompassDescendants(descendants)
                  ? `（${describeCompassDescendants(descendants)}）`
                  : ""}
                。
              </p>
            ) : null}
            <button
              type="button"
              className="mt-3 text-xs text-clay transition hover:text-clay/80 disabled:opacity-50"
              onClick={() => void handleDelete()}
              disabled={deleteItem.isPending || updateItem.isPending}
            >
              {deleteItem.isPending
                ? compassItemCopy.deletePending
                : compassItemCopy.deleteItem}
            </button>
            {deleteError ? <p className="mt-2 text-[11px] text-clay">{deleteError}</p> : null}
          </section>
        </aside>
      </div>

      <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-ink-soft">
          {saveState === "error" ? (
            <button
              type="button"
              onClick={() => void save()}
              className="text-clay underline-offset-2 hover:underline"
            >
              {compassItemCopy.saveError}
              {saveError ? `：${saveError}` : ""}
            </button>
          ) : saveState === "saving" ? (
            <span>{compassItemCopy.saveSaving}</span>
          ) : saveState === "saved" ? (
            <span className="text-moss-dark">
              {compassItemCopy.saveSaved}
              {lastSavedAt ? ` · ${lastSavedAt}` : ""}
            </span>
          ) : dirty ? (
            <span>{compassItemCopy.saveDirty}</span>
          ) : (
            <span>{compassItemCopy.saveIdle}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={() => void finish()}>
            {compassItemCopy.backAction}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleManualSave}
            disabled={updateItem.isPending || !dirty}
          >
            {updateItem.isPending
              ? compassItemCopy.savePending
              : saveState === "saved" && !dirty
                ? "已保存 ✓"
                : compassItemCopy.saveAction}
          </button>
        </div>
      </div>

      {childTarget ? (
        <CompassCreateDialog
          category={childTarget}
          defaultPriority={draft.priority}
          submitting={createItem.isPending}
          error={childError}
          onClose={() => {
            setChildTarget(null);
            setChildError(null);
          }}
          onSubmit={handleCreateChild}
        />
      ) : null}
    </div>
  );
}
