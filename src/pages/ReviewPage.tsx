import { useState } from "react";
import { Link } from "react-router-dom";
import type { ReviewEntry } from "../../shared/types";
import { PatternCard } from "../components/PatternCard";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { MAX_ACTIVE_PATTERNS, reviewPageCopy } from "../content/review";
import {
  formatDateCN,
  isoWeekDays,
  isoWeekKeyOf,
  isoWeekNumber,
  shiftWeekKey,
  todayKey,
  weekRangeLabel,
} from "../lib/date";
import { useBootstrap, useDeletePattern, useUpdatePattern } from "../lib/queries";
import { isCountedDone } from "../lib/stats";

function isReviewFilled(review: ReviewEntry | undefined) {
  if (!review) return false;
  return Boolean(
    (review.data.abstraction ?? "").trim() || (review.data.connection ?? "").trim(),
  );
}

export function ReviewPage() {
  const { data, isLoading, error } = useBootstrap();
  const updatePattern = useUpdatePattern();
  const deletePattern = useDeletePattern();
  const [showRetired, setShowRetired] = useState(false);

  if (isLoading) return <LoadingPage label="正在读取复盘记录…" />;
  if (error) return <ErrorState error={error} />;

  const currentWeek = isoWeekKeyOf(todayKey());
  const weekDays = isoWeekDays(currentWeek);
  const checkins = data?.checkins ?? [];
  const weekEntries = checkins.filter((entry) => weekDays.includes(entry.date));
  const doneDays = weekEntries.filter((entry) => isCountedDone(entry.data)).length;

  const reviews = data?.reviews ?? [];
  const currentReview = reviews.find(
    (item) => item.periodType === "week" && item.periodKey === currentWeek,
  );
  const currentDone = isReviewFilled(currentReview);

  const filledWeeks = new Set(
    reviews.filter((item) => item.periodType === "week" && isReviewFilled(item)).map((item) => item.periodKey),
  );
  let streak = 0;
  let cursor = currentWeek;
  if (!filledWeeks.has(cursor)) cursor = shiftWeekKey(cursor, -1);
  while (filledWeeks.has(cursor)) {
    streak += 1;
    cursor = shiftWeekKey(cursor, -1);
  }

  const patterns = data?.patterns ?? [];
  const activePatterns = patterns.filter((item) => item.status === "watching");
  const visiblePatterns = showRetired
    ? patterns
    : patterns.filter((item) => item.status !== "retired");

  const history = reviews
    .filter((item) => item.periodType === "week")
    .sort((a, b) => (a.periodKey < b.periodKey ? 1 : -1))
    .slice(0, 8);

  return (
    <>
      <PageHeader
        eyebrow={reviewPageCopy.eyebrow}
        title={reviewPageCopy.title}
        description={reviewPageCopy.description}
      />

      <section className="mb-6 overflow-hidden rounded-[2rem] border border-line/60 bg-white/60 p-6 shadow-sm sm:p-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-moss">
              2026 年 · 第 {isoWeekNumber(currentWeek)} 周 · {weekRangeLabel(currentWeek)}
            </p>
            <h2 className="mt-4 font-display text-2xl leading-tight text-ink sm:text-4xl">
              {currentDone ? "这一周已经收好了。" : "这一周还散着。"}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-ink-soft">
              {currentDone
                ? "可以回去补证据，也可以翻翻模式库，看看哪条规律又多了一条线索。"
                : `本周写了 ${doneDays} 天。挑三件最重要的事，找出它们的共同点，收成一句能带走的话。`}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`/review/week/${currentWeek}`} className="btn-primary">
                {currentDone ? "继续这一周的复盘" : "开始本周复盘"}
              </Link>
              <Link to={`/review/week/${shiftWeekKey(currentWeek, -1)}`} className="btn-secondary">
                补上一周
              </Link>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-3xl border border-moss/15 bg-moss-soft/50 px-5 py-4">
            <span className="text-2xl">{currentDone ? "✓" : "○"}</span>
            <div>
              <p className="text-sm font-medium text-moss-dark">
                {currentDone ? "本周已复盘" : "本周还没复盘"}
              </p>
              <p className="mt-0.5 text-xs text-moss-dark/70">
                连续 {streak} 周 · 记录 {weekEntries.length} 天
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">本周记录</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {doneDays}
            <span className="ml-1 text-base text-ink-soft">/ 7 天</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">只统计填了至少一个问题的日子</p>
        </div>

        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">连续复盘</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {streak}
            <span className="ml-1 text-base text-ink-soft">周</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">本周没做的话，从上周开始算</p>
        </div>

        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">模式库</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {activePatterns.length}
            <span className="ml-1 text-base text-ink-soft">条观察中</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            共 {patterns.length} 条
            {activePatterns.length > MAX_ACTIVE_PATTERNS
              ? ` · 超过 ${MAX_ACTIVE_PATTERNS} 条了，先收掉一条`
              : ""}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">已完成复盘</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {filledWeeks.size}
            <span className="ml-1 text-base text-ink-soft">周</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">历史全部周复盘数量</p>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Patterns</p>
            <h2 className="mt-1 text-xl text-ink">模式库</h2>
            <p className="mt-1 text-xs text-ink-soft">
              这里是复盘的资产。每张卡都应该能解释过去，也能预测下次。
            </p>
          </div>
          {patterns.some((item) => item.status === "retired") ? (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setShowRetired((prev) => !prev)}
            >
              {showRetired ? "隐藏已放下" : "显示已放下"}
            </button>
          ) : null}
        </div>

        {visiblePatterns.length === 0 ? (
          <EmptyState
            icon="🧩"
            title="模式库还是空的"
            description="模式卡不是想出来的，是复盘到第三步时自然浮出来的。做完一次周复盘，这里就会有第一张。"
            action={
              <Link to={`/review/week/${currentWeek}`} className="btn-primary">
                去做本周复盘
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visiblePatterns.map((pattern) => (
              <PatternCard
                key={pattern.id}
                pattern={pattern}
                busy={updatePattern.isPending || deletePattern.isPending}
                onCycleStatus={(status) => updatePattern.mutate({ id: pattern.id, patch: { status } })}
                onDelete={() => {
                  if (window.confirm(`删除「${pattern.title}」？证据也会一起消失。`)) {
                    deletePattern.mutate(pattern.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-moss">History</p>
          <h2 className="mt-1 text-xl text-ink">往期复盘</h2>
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 p-6 text-center">
            <p className="text-sm text-ink-soft">还没有任何周复盘记录。</p>
          </div>
        ) : (
          <div className="divide-y divide-line/60 overflow-hidden rounded-3xl border border-line/70 bg-white/60">
            {history.map((review) => (
              <Link
                key={review.periodKey}
                to={`/review/week/${review.periodKey}`}
                className="flex items-start gap-4 px-5 py-4 transition hover:bg-white/80"
              >
                <div className="w-24 shrink-0">
                  <p className="text-sm text-ink">第 {isoWeekNumber(review.periodKey)} 周</p>
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {formatDateCN(isoWeekDays(review.periodKey)[0])}
                  </p>
                </div>
                <p className="line-clamp-2 flex-1 text-sm leading-7 text-ink-soft">
                  {review.data.abstraction?.trim() ||
                    review.data.connection?.trim() ||
                    review.data.wins?.trim() ||
                    "（只写了草稿）"}
                </p>
                <span className="shrink-0 text-xs text-ink-soft/60">→</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
