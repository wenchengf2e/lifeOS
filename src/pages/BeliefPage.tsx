import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CheckinData } from "../../shared/types";
import { beliefFields, type BeliefField } from "../content/belief";
import { DaySidebar } from "../components/DaySidebar";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingPage } from "../components/StateViews";
import { todayKey } from "../lib/date";
import { useBootstrap, useSaveCheckin } from "../lib/queries";
import { isCountedDone } from "../lib/stats";

type SaveStatus = { type: "idle" | "saved" | "error"; message?: string };

/** 事后六问暂时隐藏，只保留事前部分。 */
const activeFields = beliefFields.filter((field) => !field.hidden);

export function BeliefPage() {
  const { data, isLoading, error } = useBootstrap();
  const saveCheckin = useSaveCheckin();

  const [date, setDate] = useState(todayKey());
  const [form, setForm] = useState<CheckinData>({});
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });

  const entry = data?.checkins.find((item) => item.date === date);
  const checkins = useMemo(() => data?.checkins ?? [], [data]);

  useEffect(() => {
    setForm(entry?.data ?? {});
    setStatus({ type: "idle" });
  }, [date, entry?.updatedAt]);

  if (isLoading) return <LoadingPage label="正在读取今天的计划…" />;
  if (error) return <ErrorState error={error} />;

  function updateField(key: keyof CheckinData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus({ type: "idle" });
  }

  async function handleSave() {
    // 以 form 为底，避免把隐藏的 q1–q6 和晚间日记的字段覆盖掉
    const payload: CheckinData = { ...form };
    for (const field of activeFields) {
      payload[field.key] = (form[field.key] ?? "").trim();
    }

    if (!isCountedDone(payload)) {
      setStatus({ type: "error", message: "先写一句今天的计划再保存" });
      return;
    }

    try {
      await saveCheckin.mutateAsync({ date, data: payload });
      setStatus({ type: "saved", message: "已保存到云端" });
      setForm(payload);
    } catch (saveError) {
      setStatus({
        type: "error",
        message: saveError instanceof Error ? saveError.message : "保存失败，请重试",
      });
    }
  }

  function renderField(field: BeliefField) {
    return (
      <article key={field.key} className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg text-ink">{field.label}</h2>
          <span className="rounded-full bg-paper-deep/70 px-2.5 py-1 text-[11px] text-clay">
            {field.meta}
          </span>
        </div>

        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink-soft">{field.prompt}</p>

        <label className="mt-5 block">
          <span className="sr-only">{field.label}</span>
          <textarea
            className="field min-h-28 resize-y"
            rows={4}
            placeholder={field.placeholder}
            value={form[field.key] ?? ""}
            onChange={(event) => updateField(field.key, event.target.value)}
          />
        </label>
      </article>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Daily Practice"
        title="信念重写"
        description="早上花两分钟，把今天要专注什么、可能卡在哪、卡住了怎么办写下来。事后的复盘已经移到「晚间日记」。"
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <DaySidebar
          date={date}
          onDateChange={setDate}
          hasEntry={Boolean(entry)}
          checkins={checkins}
        />

        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 px-1">
            <span className="chip">事前</span>
            <p className="text-xs text-ink-soft">先定方向：今天要往哪走，卡住了怎么办</p>
          </div>

          {activeFields.map(renderField)}

          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-ink-soft">
              晚上的事不在这里写。想到什么就记什么，不评分、不追问。
            </p>
            <Link to="/evening" className="btn-secondary shrink-0 text-xs">
              去写晚间日记
            </Link>
          </div>

          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-ink-soft">
              {status.type === "error" ? (
                <span className="text-clay">{status.message}</span>
              ) : status.type === "saved" ? (
                <span className="text-moss-dark">{status.message}</span>
              ) : entry?.updatedAt ? (
                <span>
                  上次保存：
                  {new Date(entry.updatedAt).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                <span>还没有保存过今天的内容。</span>
              )}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSave}
              disabled={saveCheckin.isPending}
            >
              {saveCheckin.isPending ? "保存中…" : "保存今天的记录"}
            </button>
          </div>

          <p className="px-2 text-[11px] leading-6 text-ink-soft/80">
            数据保存到 Cloudflare D1，换设备登录同一账号后会自动同步。
          </p>
        </section>
      </div>
    </>
  );
}
