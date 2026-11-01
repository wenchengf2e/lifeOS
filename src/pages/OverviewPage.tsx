import { useState } from "react";
import { Link } from "react-router-dom";
import { lifeosSections } from "../content/lifeos";
import { ErrorState, LoadingPage } from "../components/StateViews";
import { api } from "../lib/api";
import { formatDateCN, isoWeekKeyOf, todayKey, weekdayCN } from "../lib/date";
import { useBootstrap } from "../lib/queries";
import { currentStreak, isCountedDone, monthDoneCount } from "../lib/stats";

export function OverviewPage() {
  const { data, isLoading, error } = useBootstrap();
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingPage label="正在读取你的 LifeOS…" />;
  if (error) return <ErrorState error={error} />;

  const checkins = data?.checkins ?? [];
  const today = todayKey();
  const todayEntry = checkins.find((entry) => entry.date === today);
  const todayDone = !!todayEntry && isCountedDone(todayEntry.data);
  const streak = currentStreak(checkins);
  const now = new Date();
  const month = monthDoneCount(checkins, now.getFullYear(), now.getMonth());
  const docs = (data?.documents ?? []).filter((doc) => doc.module === "lifeos");
  const lifeosFilled = lifeosSections.filter((section) => {
    const doc = docs.find((item) => item.key === section.key);
    return String(doc?.data.notes ?? "").trim().length > 0;
  }).length;
  const recentDiary = checkins
    .filter((entry) =>
      [entry.data.e1, entry.data.e2, entry.data.e3, entry.data.e4, entry.data.e5, entry.data.review].some(
        (value) => String(value ?? "").trim().length > 0,
      ),
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);
  const itemCount = data?.items.length ?? 0;

  const currentWeek = isoWeekKeyOf(today);
  const weekReview = (data?.reviews ?? []).find(
    (entry) => entry.periodType === "week" && entry.periodKey === currentWeek,
  );
  const weekReviewDone = Boolean(
    (weekReview?.data.abstraction ?? "").trim() || (weekReview?.data.connection ?? "").trim(),
  );

  async function handleExport() {
    setExporting(true);
    setExportMessage(null);
    try {
      const payload = await api.exportAll();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lifeos-export-${today}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportMessage("已导出全量 JSON 备份");
    } catch (exportError) {
      setExportMessage(exportError instanceof Error ? exportError.message : "导出失败");
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="mb-8 overflow-hidden rounded-[2rem] border border-line/60 bg-white/60 p-6 shadow-sm sm:p-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-moss">
              {formatDateCN(today, { withWeekday: true, withYear: true })}
            </p>
            <h1 className="mt-4 font-display text-3xl leading-tight text-ink sm:text-5xl">
              今天也在往
              <br className="hidden sm:block" />
              想要的方向走。
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-ink-soft">
              这里不评分、不催促，只提供几个向内的入口：今天要专注什么、逃避了什么、又交付了什么。
              写具体的事实，不写「还行」。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/belief" className="btn-primary">
                {todayDone ? "继续今天的信念重写" : "开始今天的信念重写"}
              </Link>
              <Link to="/evening" className="btn-secondary">
                写晚间日记
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-3xl border border-moss/15 bg-moss-soft/50 px-5 py-4">
            <span className="text-2xl">{todayDone ? "✓" : "○"}</span>
            <div>
              <p className="text-sm font-medium text-moss-dark">
                {todayDone ? "今天已完成" : "今天还没写"}
              </p>
              <p className="mt-0.5 text-xs text-moss-dark/70">
                {weekdayCN(today)} · 连续 {streak} 天
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/belief" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">今日打卡</p>
          <p className="mt-3 font-display text-3xl text-ink">{todayDone ? "完成" : "未完成"}</p>
          <p className="mt-2 text-xs text-ink-soft">
            {todayEntry ? "有记录，可以继续补充" : "先写计划，再写复盘，写一个也算开始"}
          </p>
        </Link>

        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">连续打卡</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {streak}
            <span className="ml-1 text-base text-ink-soft">天</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">今天没写的话，从昨天开始算</p>
        </div>

        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">本月打卡</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {month}
            <span className="ml-1 text-base text-ink-soft">天</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">只统计至少填了一个核心问题的日子</p>
        </div>

        <Link to="/lifeos" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">人生 OS</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {lifeosFilled}
            <span className="ml-1 text-base text-ink-soft">/ {lifeosSections.length}</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">六栏都填，系统才闭环</p>
        </Link>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Journal</p>
              <h2 className="mt-1 text-xl text-ink">最近的日记</h2>
            </div>
            <Link to="/diary" className="btn-ghost text-xs">
              全部 →
            </Link>
          </div>

          {recentDiary.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line bg-paper-deep/30 p-6 text-center">
              <p className="text-sm text-ink-soft">还没有复盘记录。</p>
              <Link to="/belief" className="btn-secondary mt-4">
                去写一条
              </Link>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-line/60">
              {recentDiary.map((entry) => (
                <article key={entry.date} className="py-4 first:pt-0 last:pb-0">
                  <p className="text-xs text-ink-soft">
                    {entry.date === today ? "今天" : formatDateCN(entry.date, { withWeekday: true })}
                  </p>
                  <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-ink">
                    {String(entry.data.e1 ?? "").trim() || String(entry.data.review ?? "")}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Quick links</p>
            <h2 className="mt-1 text-xl text-ink">今天想做点什么？</h2>
            <div className="mt-4 space-y-2">
              <Link
                to="/belief"
                className="flex items-center justify-between rounded-2xl border border-line/70 bg-paper-deep/30 px-4 py-3 text-sm text-ink transition hover:border-moss/30 hover:bg-white/70"
              >
                <span>🪞 信念重写</span>
                <span className="text-ink-soft">→</span>
              </Link>
              <Link
                to="/lifeos"
                className="flex items-center justify-between rounded-2xl border border-line/70 bg-paper-deep/30 px-4 py-3 text-sm text-ink transition hover:border-moss/30 hover:bg-white/70"
              >
                <span>🧭 人生 OS</span>
                <span className="text-ink-soft">→</span>
              </Link>
              <Link
                to="/evening"
                className="flex items-center justify-between rounded-2xl border border-line/70 bg-paper-deep/30 px-4 py-3 text-sm text-ink transition hover:border-moss/30 hover:bg-white/70"
              >
                <span>🌙 晚间日记</span>
                <span className="text-ink-soft">→</span>
              </Link>
              <Link
                to="/review"
                className="flex items-center justify-between rounded-2xl border border-line/70 bg-paper-deep/30 px-4 py-3 text-sm text-ink transition hover:border-moss/30 hover:bg-white/70"
              >
                <span>🧩 周复盘</span>
                <span className="text-ink-soft">{weekReviewDone ? "已复盘" : "待复盘"} →</span>
              </Link>
              <Link
                to="/lists"
                className="flex items-center justify-between rounded-2xl border border-line/70 bg-paper-deep/30 px-4 py-3 text-sm text-ink transition hover:border-moss/30 hover:bg-white/70"
              >
                <span>🏆 成就与改变</span>
                <span className="text-ink-soft">{itemCount} 条 →</span>
              </Link>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-base text-ink">数据备份</h2>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              随时把全量数据导出为 JSON。免费服务没有 SLA，重要数据不要只留一份。
            </p>
            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "导出中…" : "导出全部数据"}
            </button>
            {exportMessage ? (
              <p className="mt-2 text-center text-[11px] text-ink-soft">{exportMessage}</p>
            ) : null}
          </section>
        </aside>
      </div>
    </>
  );
}
