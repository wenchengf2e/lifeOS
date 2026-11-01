import { Link } from "react-router-dom";
import type { CheckinData } from "../../shared/types";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { formatDateCN, todayKey, weekdayCN } from "../lib/date";
import { useBootstrap } from "../lib/queries";

function hasJournalContent(data: CheckinData) {
  return (data.journal ?? "").trim().length > 0 || (data.review ?? "").trim().length > 0;
}

export function DiaryPage() {
  const { data, isLoading, error } = useBootstrap();

  if (isLoading) return <LoadingPage label="正在翻阅日记…" />;
  if (error) return <ErrorState error={error} />;

  const entries = (data?.checkins ?? [])
    .filter((entry) => hasJournalContent(entry.data))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="日记"
        description="晚间日记和想法的只读归档，按时间倒序。想补写某一天，点开那一条就行。"
        action={
          <Link to="/daily" className="btn-secondary">
            写今天的
          </Link>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon="📔"
          title="日记还是空的"
          description="去「每日仪式」的晚间日记模块写一段，它会自动出现在这里。"
          action={
            <Link to="/daily" className="btn-primary">
              写今天的第一条
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isToday = entry.date === todayKey();
            const journal = (entry.data.journal ?? "").trim();
            const thought = (entry.data.review ?? "").trim();

            return (
              <article key={entry.date} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-lg text-ink">
                      {isToday ? "今天 · " : ""}
                      {formatDateCN(entry.date, { withWeekday: true, withYear: true })}
                    </h2>
                    {isToday ? <span className="chip">今天</span> : null}
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-[11px] text-ink-soft">{weekdayCN(entry.date)}</span>
                    <Link
                      to={`/daily?date=${entry.date}`}
                      className="text-[11px] text-ink-soft/70 transition hover:text-moss"
                    >
                      补写 →
                    </Link>
                  </div>
                </div>

                {journal ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-ink">{journal}</p>
                ) : null}

                {thought ? (
                  <div className="mt-4 rounded-2xl bg-paper-deep/45 p-4">
                    <p className="text-[11px] text-ink-soft">想法</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-8 text-ink-soft">
                      {thought}
                    </p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
