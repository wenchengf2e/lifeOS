import { useEffect, useMemo, useState } from "react";
import type { CheckinData } from "../../shared/types";
import { beliefFields, reviewField } from "../content/belief";
import { MonthCalendar } from "../components/MonthCalendar";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingPage } from "../components/StateViews";
import { formatDateCN, parseDateKey, shiftDate, todayKey } from "../lib/date";
import { useBootstrap, useSaveCheckin } from "../lib/queries";
import {
  currentStreak,
  doneDateSet,
  entryDateSet,
  isCountedDone,
  monthDoneCount,
  totalDoneCount,
} from "../lib/stats";

type SaveStatus = { type: "idle" | "saved" | "error"; message?: string };

export function BeliefPage() {
  const { data, isLoading, error } = useBootstrap();
  const saveCheckin = useSaveCheckin();

  const [date, setDate] = useState(todayKey());
  const [form, setForm] = useState<CheckinData>({});
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });

  const entry = data?.checkins.find((item) => item.date === date);

  useEffect(() => {
    setForm(entry?.data ?? {});
    setStatus({ type: "idle" });
  }, [date, entry?.updatedAt]);

  const checkins = data?.checkins ?? [];
  const entryDates = useMemo(() => entryDateSet(checkins), [checkins]);
  const doneDates = useMemo(() => doneDateSet(checkins), [checkins]);

  const selected = parseDateKey(date);
  const monthStats = useMemo(
    () => monthDoneCount(checkins, selected.getFullYear(), selected.getMonth()),
    [checkins, selected],
  );
  const streak = useMemo(() => currentStreak(checkins), [checkins]);
  const total = useMemo(() => totalDoneCount(checkins), [checkins]);

  if (isLoading) return <LoadingPage label="正在读取今天的记录…" />;
  if (error) return <ErrorState error={error} />;

  function updateField(key: keyof CheckinData, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setStatus({ type: "idle" });
  }

  async function handleSave() {
    const payload: CheckinData = {};
    for (const field of beliefFields) {
      payload[field.key] = (form[field.key] ?? "").trim();
    }
    payload.review = (form.review ?? "").trim();

    if (!isCountedDone(payload)) {
      setStatus({ type: "error", message: "至少填写一个核心问题再保存" });
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

  const isCurrentMonth =
    selected.getFullYear() === new Date().getFullYear() &&
    selected.getMonth() === new Date().getMonth();

  const dateLabel =
    date === todayKey()
      ? `今天 · ${formatDateCN(date, { withWeekday: true })}`
      : formatDateCN(date, { withWeekday: true, withYear: true });

  return (
    <>
      <PageHeader
        eyebrow="Daily Practice"
        title="信念重写"
        description="六个问题，把注意力从「今天感觉如何」拉回「今天做了什么、在逃避什么」。每天写一点，旧信念才会被新证据一点点替换。"
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <button
                type="button"
                className="btn-ghost h-8 px-2.5"
                onClick={() => setDate(shiftDate(date, -1))}
                aria-label="前一天"
              >
                ‹
              </button>
              <div className="text-center">
                <p className="text-sm font-medium text-ink">{dateLabel}</p>
                <p className="mt-0.5 text-[11px] text-ink-soft">
                  {entry ? "有记录" : "还没有记录"}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost h-8 px-2.5"
                onClick={() => setDate(shiftDate(date, 1))}
                aria-label="后一天"
              >
                ›
              </button>
            </div>

            <label className="block">
              <span className="sr-only">选择日期</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value || todayKey())}
                className="field px-3 py-2 text-xs"
              />
            </label>

            <div className="mt-5">
              <MonthCalendar
                selectedDate={date}
                onSelect={setDate}
                entryDates={entryDates}
                doneDates={doneDates}
              />
            </div>
          </section>

          <section className="card grid grid-cols-3 divide-x divide-line/60 p-4 text-center">
            <div className="px-2">
              <p className="font-display text-2xl text-ink">{monthStats}</p>
              <p className="mt-1 text-[11px] text-ink-soft">
                {isCurrentMonth ? "本月打卡" : "该月打卡"}
              </p>
            </div>
            <div className="px-2">
              <p className="font-display text-2xl text-ink">{streak}</p>
              <p className="mt-1 text-[11px] text-ink-soft">连续天数</p>
            </div>
            <div className="px-2">
              <p className="font-display text-2xl text-ink">{total}</p>
              <p className="mt-1 text-[11px] text-ink-soft">累计打卡</p>
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          {beliefFields.map((field) => (
            <article key={field.key} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg text-ink">{field.label}</h2>
                <span className="rounded-full bg-paper-deep/70 px-2.5 py-1 text-[11px] text-clay">
                  {field.meta}
                </span>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-ink-soft">
                {field.prompt}
              </p>

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
          ))}

          <article className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg text-ink">{reviewField.label}</h2>
              <span className="chip">不计入打卡</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-ink-soft">{reviewField.prompt}</p>
            <label className="mt-5 block">
              <span className="sr-only">{reviewField.label}</span>
              <textarea
                className="field min-h-24 resize-y"
                rows={4}
                placeholder={reviewField.placeholder}
                value={form.review ?? ""}
                onChange={(event) => updateField("review", event.target.value)}
              />
            </label>
          </article>

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
            数据保存到 Cloudflare D1，换设备登录同一账号后会自动同步。每日复盘会出现在「日记」页。
          </p>
        </section>
      </div>
    </>
  );
}
