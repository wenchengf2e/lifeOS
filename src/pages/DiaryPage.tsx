import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { formatDateCN, todayKey, weekdayCN } from "../lib/date";
import { useBootstrap } from "../lib/queries";

export function DiaryPage() {
  const { data, isLoading, error } = useBootstrap();

  if (isLoading) return <LoadingPage label="正在翻阅日记…" />;
  if (error) return <ErrorState error={error} />;

  const entries = (data?.checkins ?? [])
    .filter((entry) => String(entry.data.review ?? "").trim().length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="日记"
        description="这里只读展示「信念重写」里的今日复盘 / 感恩。每天写下的那句话，会按时间自动汇总到这里。"
        action={
          <Link to="/belief" className="btn-secondary">
            去写今天的复盘
          </Link>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon="📔"
          title="日记还是空的"
          description="去「信念重写」写下今天的复盘或一件感恩的小事，它会自动出现在这里。"
          action={
            <Link to="/belief" className="btn-primary">
              写今天的第一条
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isToday = entry.date === todayKey();
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
                  <span className="text-[11px] text-ink-soft">{weekdayCN(entry.date)}</span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-ink-soft">
                  {String(entry.data.review)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
