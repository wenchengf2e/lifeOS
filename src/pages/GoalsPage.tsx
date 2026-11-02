import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { GoalEntry } from "../../shared/types";
import { GoalCard } from "../components/GoalCard";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, LoadingPage } from "../components/StateViews";
import {
  MAX_ACTIVE_GOALS,
  goalsPageCopy,
  goalDomains,
  goalSteps,
  newGoalCopy,
} from "../content/goals";
import { formatDateCN } from "../lib/date";
import {
  activeGoalCount,
  daysSince,
  goalProgress,
  lastPracticeLog,
  newGoalData,
  sortGoals,
} from "../lib/goals";
import { useBootstrap, useCreateGoal } from "../lib/queries";

type StatusFilter = "open" | "paused" | "closed" | "all";

const STATUS_FILTERS: { key: StatusFilter; label: string; match: (goal: GoalEntry) => boolean }[] = [
  {
    key: "open",
    label: goalsPageCopy.statusOpen,
    match: (goal) => goal.status === "active" || goal.status === "draft",
  },
  { key: "paused", label: goalsPageCopy.statusPaused, match: (goal) => goal.status === "paused" },
  {
    key: "closed",
    label: goalsPageCopy.statusClosed,
    match: (goal) => goal.status === "achieved" || goal.status === "archived",
  },
  { key: "all", label: goalsPageCopy.statusAll, match: () => true },
];

export function GoalsPage() {
  const { data, isLoading, error } = useBootstrap();
  const createGoal = useCreateGoal();
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [domainFilter, setDomainFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("");
  const [deadline, setDeadline] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showCreate) return;
    const timer = window.setTimeout(() => titleRef.current?.focus(), 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setShowCreate(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [showCreate]);

  const goals = useMemo(() => sortGoals(data?.goals ?? []), [data?.goals]);
  const activeCount = activeGoalCount(goals);
  const completeCount = goals.filter((goal) => goalProgress(goal.data).completed === 5).length;
  const latestPractice = goals.reduce<string | null>((latest, goal) => {
    const log = lastPracticeLog(goal);
    if (!log) return latest;
    if (!latest || log.date > latest) return log.date;
    return latest;
  }, null);
  const latestPracticeLabel = latestPractice
    ? daysSince(latestPractice) === 0
      ? "今天"
      : `${daysSince(latestPractice)} 天前`
    : goalsPageCopy.noPractice;

  const directionDoc = data?.documents.find(
    (doc) => doc.module === "lifeos" && doc.key === "direction",
  );
  const directionTheme = String(directionDoc?.data.theme ?? "").trim();
  const directionStatement = String(directionDoc?.data.statement ?? "").trim();
  const directionBet = String(directionDoc?.data.bet ?? "").trim();

  const domainsWithGoals = goalDomains.filter((item) =>
    goals.some((goal) => goal.domain === item.key),
  );
  const statusMeta = STATUS_FILTERS.find((item) => item.key === statusFilter) ?? STATUS_FILTERS[0];
  const filtered = goals
    .filter((goal) => statusMeta.match(goal))
    .filter((goal) => domainFilter === "all" || goal.domain === domainFilter);

  if (isLoading) return <LoadingPage label="正在读取目标…" />;
  if (error) return <ErrorState error={error} />;

  function openCreate() {
    setTitle("");
    setDomain("");
    setDeadline("");
    setFormError(null);
    setShowCreate(true);
  }

  async function handleCreate() {
    const name = title.trim();
    if (!name) {
      setFormError("先给目标起个名字，哪怕只是「投资」也可以。");
      return;
    }

    const inferredDomain = goalDomains.find(
      (item) => item.key !== "other" && (name === item.label || name.includes(item.label)),
    );

    try {
      const result = await createGoal.mutateAsync({
        title: name,
        domain: domain || inferredDomain?.key || "other",
        status: "active",
        data: newGoalData(deadline || undefined),
      });
      setShowCreate(false);
      navigate(`/principles/${result.goal.id}?step=1`);
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : "创建失败，请重试");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={goalsPageCopy.eyebrow}
        title={goalsPageCopy.title}
        description={goalsPageCopy.description}
        action={
          <button type="button" className="btn-primary" onClick={openCreate}>
            + {goalsPageCopy.newGoal}
          </button>
        }
      />

      <section className="mb-5 overflow-hidden rounded-[2rem] border border-line/60 bg-white/60 p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-moss">
              North Star
            </p>
            <h2 className="mt-2 text-xl text-ink sm:text-2xl">
              {directionTheme || "先给这一年的自己一个主题"}
            </h2>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              {directionStatement ||
                (directionDoc ? goalsPageCopy.directionFallback : goalsPageCopy.directionEmpty)}
            </p>
            {directionBet ? (
              <p className="mt-3 inline-flex rounded-full bg-paper-deep/70 px-3 py-1 text-[11px] text-ink-soft">
                今年最重要的赌注：{directionBet}
              </p>
            ) : null}
          </div>
          <Link to="/lifeos" className="btn-secondary shrink-0">
            {directionTheme || directionStatement ? "校准方向" : "去写方向卡"}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            {goalsPageCopy.statsActive}
          </p>
          <p className="mt-3 font-display text-3xl text-ink">
            {activeCount}
            <span className="ml-1 text-base text-ink-soft">个</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            {activeCount > MAX_ACTIVE_GOALS
              ? `超过 ${MAX_ACTIVE_GOALS} 个了，先收拢一下`
              : `建议同时不超过 ${MAX_ACTIVE_GOALS} 个`}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            {goalsPageCopy.statsComplete}
          </p>
          <p className="mt-3 font-display text-3xl text-ink">
            {completeCount}
            <span className="ml-1 text-base text-ink-soft">个</span>
          </p>
          <p className="mt-2 text-xs text-ink-soft">五个步骤都有内容，不等于已经做到</p>
        </div>

        <div className="card p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
            {goalsPageCopy.statsPractice}
          </p>
          <p className="mt-3 font-display text-3xl text-ink">{latestPracticeLabel}</p>
          <p className="mt-2 text-xs text-ink-soft">
            {latestPractice ? formatDateCN(latestPractice, { withYear: true }) : "第一条记录会出现在第 5 步"}
          </p>
        </div>
      </section>

      {activeCount > MAX_ACTIVE_GOALS ? (
        <p className="mt-3 rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-xs leading-6 text-clay">
          {goalsPageCopy.activeCapHint}
        </p>
      ) : null}

      <section className="mt-8">
        <div className="flex flex-col gap-3 border-b border-line/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((item) => {
              const count = goals.filter((goal) => item.match(goal)).length;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setStatusFilter(item.key)}
                  className={[
                    "rounded-full px-3.5 py-2 text-sm transition",
                    item.key === statusFilter
                      ? "bg-ink text-paper shadow-sm"
                      : "text-ink-soft hover:bg-white/70 hover:text-ink",
                  ].join(" ")}
                >
                  {item.label}
                  <span className="ml-1.5 text-[11px] opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {domainsWithGoals.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDomainFilter("all")}
                className={[
                  "rounded-full px-3 py-1.5 text-[11px] transition",
                  domainFilter === "all"
                    ? "bg-moss-soft text-moss-dark"
                    : "border border-line bg-white/60 text-ink-soft hover:text-ink",
                ].join(" ")}
              >
                {goalsPageCopy.allDomains}
              </button>
              {domainsWithGoals.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setDomainFilter(item.key)}
                  className={[
                    "rounded-full px-3 py-1.5 text-[11px] transition",
                    domainFilter === item.key
                      ? "bg-moss-soft text-moss-dark"
                      : "border border-line bg-white/60 text-ink-soft hover:text-ink",
                  ].join(" ")}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {goals.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              icon="🎯"
              title={goalsPageCopy.emptyTitle}
              description={goalsPageCopy.emptyDesc}
              action={
                <button type="button" className="btn-primary" onClick={openCreate}>
                  + {goalsPageCopy.newGoal}
                </button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-line bg-paper-deep/30 p-8 text-center">
            <p className="text-sm text-ink-soft">这个筛选下还没有目标。</p>
            <button
              type="button"
              className="btn-secondary mt-4"
              onClick={() => {
                setStatusFilter("all");
                setDomainFilter("all");
              }}
            >
              查看全部目标
            </button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {filtered.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Method</p>
          <h2 className="mt-1 text-xl text-ink">{goalsPageCopy.methodTitle}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-soft">
            {goalsPageCopy.methodDesc}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {goalSteps.map((step) => (
            <article key={step.key} className="card flex flex-col p-4">
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl text-moss/50">
                  {String(step.index).padStart(2, "0")}
                </span>
                <span className="text-lg">{step.icon}</span>
              </div>
              <h3 className="mt-3 text-base text-ink">{step.title}</h3>
              <p className="mt-1.5 flex-1 text-xs leading-6 text-ink-soft">{step.desc}</p>
              <p className="mt-3 border-t border-line/60 pt-2 text-[11px] leading-5 text-moss-dark">
                产出：{step.output}
              </p>
            </article>
          ))}
        </div>
      </section>

      {showCreate ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-goal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCreate(false);
          }}
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-line bg-paper p-6 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-moss">New Goal</p>
                <h2 id="new-goal-title" className="mt-1 text-2xl text-ink">
                  {newGoalCopy.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-ink-soft">{newGoalCopy.desc}</p>
              </div>
              <button
                type="button"
                className="btn-ghost shrink-0 text-xl"
                onClick={() => setShowCreate(false)}
                aria-label="关闭"
              >
                ×
              </button>
            </div>

            <label className="mt-6 block">
              <span className="block text-sm font-medium text-ink">{newGoalCopy.nameLabel}</span>
              <input
                ref={titleRef}
                type="text"
                className="field mt-2"
                maxLength={120}
                placeholder={newGoalCopy.namePlaceholder}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setFormError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) void handleCreate();
                }}
              />
            </label>

            <div className="mt-5">
              <span className="block text-sm font-medium text-ink">{newGoalCopy.domainLabel}</span>
              <span className="mt-1 block text-[11px] text-ink-soft">{newGoalCopy.domainHint}</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setDomain("")}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs transition",
                    domain === ""
                      ? "bg-ink text-paper"
                      : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                  ].join(" ")}
                >
                  不分类
                </button>
                {goalDomains.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setDomain(item.key)}
                    className={[
                      "rounded-full px-3 py-1.5 text-xs transition",
                      domain === item.key
                        ? "bg-ink text-paper"
                        : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                    ].join(" ")}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-5 block">
              <span className="block text-sm font-medium text-ink">{newGoalCopy.deadlineLabel}</span>
              <input
                type="date"
                className="field mt-2 max-w-56"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </label>

            {formError ? <p className="mt-4 text-sm text-clay">{formError}</p> : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)}>
                {newGoalCopy.cancel}
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleCreate}
                disabled={createGoal.isPending}
              >
                {createGoal.isPending ? newGoalCopy.creating : newGoalCopy.submit}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
