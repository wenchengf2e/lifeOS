import { useState } from "react";
import { listModules } from "../content/lists";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { formatDateCN } from "../lib/date";
import { useBootstrap, useCreateItem, useDeleteItem, useUpdateItem } from "../lib/queries";

export function ListsPage() {
  const { data, isLoading, error } = useBootstrap();
  const createItem = useCreateItem();
  const updateItem = useUpdateItem();
  const deleteItem = useDeleteItem();

  const [selectedKey, setSelectedKey] = useState(listModules[0].key);
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const module = listModules.find((item) => item.key === selectedKey) ?? listModules[0];
  const items = (data?.items ?? []).filter((item) => item.module === selectedKey);

  if (isLoading) return <LoadingPage label="正在读取清单…" />;
  if (error) return <ErrorState error={error} />;

  async function handleAdd() {
    const content = draft.trim();
    if (!content) {
      setMessage("先写点内容再添加");
      return;
    }

    try {
      await createItem.mutateAsync({ module: selectedKey, content });
      setDraft("");
      setMessage("已添加");
    } catch (createError) {
      setMessage(createError instanceof Error ? createError.message : "添加失败");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("确定删除这条记录吗？")) return;
    try {
      await deleteItem.mutateAsync(id);
      setMessage("已删除");
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  }

  function startEdit(id: string, content: string) {
    if (updateItem.isPending) return;
    if (editingId && editingId !== id) {
      if (!window.confirm("还有未保存的编辑，切换会丢失，继续吗？")) return;
    }
    setEditingId(id);
    setEditDraft(content);
    setEditError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
    setEditError(null);
  }

  async function handleSaveEdit(id: string) {
    const content = editDraft.trim();
    if (!content) {
      setEditError("内容不能为空");
      return;
    }

    try {
      await updateItem.mutateAsync({ id, patch: { content } });
      setEditingId(null);
      setEditDraft("");
      setEditError(null);
      setMessage("已保存");
    } catch (saveError) {
      setEditError(saveError instanceof Error ? saveError.message : "保存失败，请重试");
    }
  }

  return (
    <>
      <PageHeader
        title="清单"
        description="成就和关键改变不是用来感动自己的，是状态差的时候拿出来的证据。写具体的事、次数、天数、结果。"
      />

      <div className="mb-6 flex gap-2 overflow-x-auto">
        {listModules.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setSelectedKey(item.key);
              setMessage(null);
              setEditingId(null);
              setEditDraft("");
              setEditError(null);
            }}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-sm transition",
              item.key === selectedKey
                ? "bg-ink text-paper shadow-sm"
                : "border border-line bg-white/60 text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            <span className="mr-1.5">{item.icon}</span>
            {item.title}
          </button>
        ))}
      </div>

      <section className="card p-5 sm:p-6">
        <p className="text-sm leading-7 text-ink-soft">{module.desc}</p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            className="field flex-1"
            placeholder={module.placeholder}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setMessage(null);
            }}
          />
          <button
            type="button"
            className="btn-primary shrink-0"
            onClick={handleAdd}
            disabled={createItem.isPending}
          >
            {createItem.isPending ? "添加中…" : "添加"}
          </button>
        </div>

        {message ? <p className="mt-2 text-xs text-ink-soft">{message}</p> : null}
      </section>

      <section className="mt-5">
        {items.length === 0 ? (
          <EmptyState icon={module.icon} title={`${module.title}还是空的`} description={module.empty} />
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const editing = editingId === item.id;
              return (
                <li key={item.id} className="card group flex items-start gap-4 p-4 sm:p-5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <>
                        <textarea
                          className="field resize-y"
                          rows={4}
                          maxLength={4000}
                          aria-label="编辑记录内容"
                          autoFocus
                          value={editDraft}
                          onChange={(event) => {
                            setEditDraft(event.target.value);
                            setEditError(null);
                          }}
                          onKeyDown={(event) => {
                            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                              event.preventDefault();
                              void handleSaveEdit(item.id);
                            } else if (event.key === "Escape") {
                              cancelEdit();
                            }
                          }}
                        />
                        {editError ? <p className="mt-2 text-xs text-clay">{editError}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn-primary text-xs"
                            onClick={() => void handleSaveEdit(item.id)}
                            disabled={updateItem.isPending}
                          >
                            {updateItem.isPending ? "保存中…" : "保存"}
                          </button>
                          <button
                            type="button"
                            className="btn-ghost text-xs"
                            onClick={cancelEdit}
                            disabled={updateItem.isPending}
                          >
                            取消
                          </button>
                          <span className="text-[11px] text-ink-soft">
                            ⌘/Ctrl + Enter 保存 · Esc 取消
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm leading-7 text-ink">{item.content}</p>
                        <p className="mt-1 text-[11px] text-ink-soft">
                          {formatDateCN(item.itemDate ?? item.createdAt.slice(0, 10), {
                            withYear: true,
                          })}
                        </p>
                      </>
                    )}
                  </div>
                  {!editing ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(item.id, item.content)}
                        className="rounded-full px-2 py-1 text-xs text-ink-soft/70 transition hover:bg-paper-deep/60 hover:text-ink"
                        aria-label="编辑这条记录"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-full px-2 py-1 text-xs text-ink-soft/60 transition hover:bg-paper-deep/60 hover:text-clay"
                        aria-label="删除这条记录"
                        disabled={deleteItem.isPending}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
