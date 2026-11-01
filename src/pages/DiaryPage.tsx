import { Link } from "react-router-dom";
import type { CheckinData } from "../../shared/types";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import { eveningFields } from "../content/evening";
import { formatDateCN, todayKey, weekdayCN } from "../lib/date";
import { useBootstrap } from "../lib/queries";

function hasEveningContent(data: CheckinData) {
  return (
    eveningFields.some((field) => (data[field.key] ?? "").trim().length > 0) ||
    (data.review ?? "").trim().length > 0
  );
}

export function DiaryPage() {
  const { data, isLoading, error } = useBootstrap();

  if (isLoading) return <LoadingPage label="正在翻阅日记…" />;
  if (error) return <ErrorState error={error} />;

  const entries = (data?.checkins ?? [])
    .filter((entry) => hasEveningContent(entry.data))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <PageHeader
        eyebrow="Journal"
        title="日记"
        description="晚间日记的只读归档，按时间倒序。想补写某一天，点开那一条就行。"
        action={
          <Link to="/evening" className="btn-secondary">
            写今天的
          </Link>
        }
      />

      {entries.length === 0 ? (
        <EmptyState
          icon="📔"
          title="日记还是空的"
          description="去「晚间日记」写下今天完成的事、当时的感受，它会自动出现在这里。"
          action={
            <Link to="/evening" className="btn-primary">
              写今天的第一条
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isToday = entry.date === todayKey();
            const review = (entry.data.review ?? "").trim();

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
                      to={`/evening?date=${entry.date}`}
                      className="text-[11px] text-ink-soft/70 transition hover:text-moss"
                    >
                      补写 →
                    </Link>
                  </div>
                </div>

                <dl className="mt-4 space-y-4">
                  {eveningFields.map((field) => {
                    const value = (entry.data[field.key] ?? "").trim();
                    if (!value) return null;
                    return (
                      <div key={field.key}>
                        <dt className="text-[11px] leading-6 text-ink-soft">{field.question}</dt>
                        <dd className="mt-1 whitespace-pre-wrap text-sm leading-8 text-ink">
                          {value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>

                {review ? (
                  <div className="mt-5 rounded-2xl bg-paper-deep/45 p-4">
                    <p className="text-[11px] text-ink-soft">还有什么想留下的</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-8 text-ink-soft">
                      {review}
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
