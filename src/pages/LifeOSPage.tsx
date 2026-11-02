import { useEffect, useState } from "react";
import { lifeosSections } from "../content/lifeos";
import { DirectionCard } from "../components/DirectionCard";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingPage } from "../components/StateViews";
import { useBootstrap, useSaveDocument } from "../lib/queries";

type SaveStatus = { type: "idle" | "saved" | "error"; message?: string };

export function LifeOSPage() {
  const { data, isLoading, error } = useBootstrap();
  const saveDocument = useSaveDocument();

  const [selectedKey, setSelectedKey] = useState(lifeosSections[0].key);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });

  const docs = data?.documents.filter((item) => item.module === "lifeos") ?? [];
  const directionDoc = docs.find((item) => item.key === "direction");
  const currentDoc = docs.find((item) => item.key === selectedKey);
  const section = lifeosSections.find((item) => item.key === selectedKey) ?? lifeosSections[0];

  useEffect(() => {
    setNotes(String(currentDoc?.data.notes ?? ""));
    setStatus({ type: "idle" });
  }, [selectedKey, currentDoc?.updatedAt]);

  const filledCount = lifeosSections.filter((item) => {
    const doc = docs.find((entry) => entry.key === item.key);
    return String(doc?.data.notes ?? "").trim().length > 0;
  }).length;

  if (isLoading) return <LoadingPage label="正在读取人生 OS…" />;
  if (error) return <ErrorState error={error} />;

  async function handleSave() {
    try {
      await saveDocument.mutateAsync({
        module: "lifeos",
        key: selectedKey,
        data: {
          notes: notes.trim(),
          _updated: new Date().toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      });
      setStatus({ type: "saved", message: "已保存" });
    } catch (saveError) {
      setStatus({
        type: "error",
        message: saveError instanceof Error ? saveError.message : "保存失败，请重试",
      });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Life OS"
        title="人生 OS"
        description="先写方向卡，再用六栏把自己描述清楚。方向卡给坐标，六栏给细节；先写事实和判断，再慢慢迭代。"
      />

      <DirectionCard doc={directionDoc} />

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="card p-4 lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 hidden px-2 lg:block">
            <div className="flex items-center justify-between text-xs text-ink-soft">
              <span>完成进度</span>
              <span>
                {filledCount} / {lifeosSections.length}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-deep">
              <div
                className="h-full rounded-full bg-moss transition-all"
                style={{ width: `${(filledCount / lifeosSections.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
            {lifeosSections.map((item) => {
              const filled = String(
                docs.find((doc) => doc.key === item.key)?.data.notes ?? "",
              ).trim().length;
              const active = item.key === selectedKey;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setSelectedKey(item.key)}
                  className={[
                    "flex shrink-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition lg:w-full",
                    active
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink-soft hover:bg-white/80 hover:text-ink",
                  ].join(" ")}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1 whitespace-nowrap lg:whitespace-normal">{item.title}</span>
                  {filled > 0 ? (
                    <span
                      className={[
                        "hidden h-1.5 w-1.5 rounded-full lg:block",
                        active ? "bg-paper" : "bg-moss",
                      ].join(" ")}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">
          <article className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-moss-soft text-xl">
                {section.icon}
              </span>
              <div>
                <h2 className="text-2xl text-ink">{section.title}</h2>
                <p className="mt-1 text-xs text-ink-soft">先写事实，再写判断。</p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-ink-soft">{section.desc}</p>

            <div className="mt-6 rounded-2xl bg-paper-deep/55 p-4 sm:p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-moss">
                核心问题
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-ink-soft">
                {section.questions.map((question) => (
                  <li key={question} className="pl-1">
                    {question}
                  </li>
                ))}
              </ol>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-xs font-medium tracking-wide text-ink-soft">
                我的回答
              </span>
              <textarea
                className="field min-h-64 resize-y"
                rows={14}
                placeholder={section.placeholder}
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setStatus({ type: "idle" });
                }}
              />
            </label>

            <div className="mt-4 rounded-2xl border border-moss/15 bg-moss-soft/45 p-4 text-sm leading-7 text-moss-dark">
              <span className="font-medium">输出：</span>
              {section.output}
            </div>
          </article>

          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink-soft">
              {status.type === "error" ? (
                <span className="text-clay">{status.message}</span>
              ) : status.type === "saved" ? (
                <span className="text-moss-dark">{status.message}</span>
              ) : currentDoc?.data._updated ? (
                <span>上次保存：{String(currentDoc.data._updated)}</span>
              ) : (
                <span>这一栏还没有保存过。</span>
              )}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saveDocument.isPending}
            >
              {saveDocument.isPending ? "保存中…" : "保存这一栏"}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
