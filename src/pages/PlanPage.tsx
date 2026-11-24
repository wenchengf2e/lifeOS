import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { PlanPeriodType } from "../../shared/types";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, LoadingPage } from "../components/StateViews";
import {
  MAX_PLAN_PRIORITIES,
  PLAN_PRIORITY_MAX_LENGTH,
  PLAN_THEME_MAX_LENGTH,
  planFieldCopy,
  planHistoryCopy,
  planPageCopy,
  planPeriodTabs,
  planReminderCopy,
} from "../content/plan";
import {
  isoWeekKeyOf,
  isoWeekStart,
  monthKeyOf,
  shiftMonthKey,
  shiftWeekKey,
  todayKey,
} from "../lib/date";
import {
  PLAN_MODULE,
  findPlanEntry,
  isValidPlanPeriodKey,
  listPlanPeriods,
  normalizePlanData,
  planKeyFor,
  planPeriodLabel,
  readPlanData,
} from "../lib/plan";
import { useBootstrap, useSaveDocument } from "../lib/queries";

type SaveStatus = { type: "idle" | "saved" | "error"; message?: string };

function padPriorities(values: string[]) {
  return Array.from({ length: MAX_PLAN_PRIORITIES }, (_, index) => values[index] ?? "");
}

export function PlanPage() {
  const { data, isLoading, error } = useBootstrap();
  const saveDocument = useSaveDocument();
  const [searchParams, setSearchParams] = useSearchParams();

  const today = todayKey();
  const currentWeekKey = isoWeekKeyOf(today);
  const currentMonthKey = monthKeyOf(today);

  // 周期类型和周期键都放 URL；非法或缺省时静默回退到当前周期。
  const periodType: PlanPeriodType = searchParams.get("period") === "month" ? "month" : "week";
  const rawKey = searchParams.get("key") ?? "";
  const periodKey = isValidPlanPeriodKey(periodType, rawKey)
    ? rawKey
    : periodType === "week"
      ? currentWeekKey
      : currentMonthKey;

  const documents = data?.documents ?? [];
  const entry = findPlanEntry(documents, periodType, periodKey);
  // 周计划编辑时，用该周周一的月份作为「本月主题」的上下文。
  const monthContext =
    periodType === "week"
      ? readPlanData(findPlanEntry(documents, "month", monthKeyOf(isoWeekStart(periodKey))))
      : null;
  const history = listPlanPeriods(documents, periodType);

  const [theme, setTheme] = useState("");
  const [priorities, setPriorities] = useState<string[]>(padPriorities([]));
  const [status, setStatus] = useState<SaveStatus>({ type: "idle" });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const plan = readPlanData(entry);
    setTheme(plan.theme);
    setPriorities(padPriorities(plan.priorities));
    setStatus({ type: "idle" });
    setDirty(false);
    // 只跟着周期和云端更新时间走，避免每次输入都重置表单。
  }, [periodType, periodKey, entry?.updatedAt]);

  if (isLoading) return <LoadingPage label="正在读取周 / 月计划…" />;
  if (error) return <ErrorState error={error} />;

  function updatePeriod(nextType: PlanPeriodType) {
    // 点已选中的 tab 不跳周期；真正切换时才回到该类型的当前周期。
    if (nextType === periodType) return;
    const params = new URLSearchParams(searchParams);
    params.set("period", nextType);
    params.set("key", nextType === "week" ? currentWeekKey : currentMonthKey);
    setSearchParams(params, { replace: true });
  }

  function openMonthContext() {
    // 「本月主题」展示的是该周周一所在的月份，点击就进入那个月。
    const params = new URLSearchParams(searchParams);
    params.set("period", "month");
    params.set("key", monthKeyOf(isoWeekStart(periodKey)));
    setSearchParams(params, { replace: true });
  }

  function shiftPeriod(delta: number) {
    const nextKey =
      periodType === "week" ? shiftWeekKey(periodKey, delta) : shiftMonthKey(periodKey, delta);
    const params = new URLSearchParams(searchParams);
    params.set("period", periodType);
    params.set("key", nextKey);
    setSearchParams(params, { replace: true });
  }

  function selectPeriod(nextKey: string) {
    const params = new URLSearchParams(searchParams);
    params.set("period", periodType);
    params.set("key", nextKey);
    setSearchParams(params, { replace: true });
  }

  async function handleSave() {
    const payload = normalizePlanData({ theme, priorities });

    try {
      await saveDocument.mutateAsync({
        module: PLAN_MODULE,
        key: planKeyFor(periodType, periodKey),
        data: { theme: payload.theme, priorities: payload.priorities },
      });
      setTheme(payload.theme);
      setPriorities(padPriorities(payload.priorities));
      setDirty(false);
      setStatus({ type: "saved", message: planPageCopy.saved });
    } catch (saveError) {
      setStatus({
        type: "error",
        message: saveError instanceof Error ? saveError.message : "保存失败，请重试",
      });
    }
  }

  const statusText =
    status.type === "error" ? (
      <span className="text-clay">{status.message}</span>
    ) : status.type === "saved" ? (
      <span className="text-moss-dark">{status.message}</span>
    ) : dirty ? (
      <span className="text-ink">{planPageCopy.dirty}</span>
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
      <span>{planPageCopy.empty}</span>
    );

  return (
    <>
      <PageHeader
        title={planPageCopy.title}
        description={planPageCopy.description}
        action={
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saveDocument.isPending}
          >
            {saveDocument.isPending ? planPageCopy.saving : planPageCopy.save}
          </button>
        }
      />

      <section className="card mb-6 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-full rounded-full border border-line bg-white/70 p-1 sm:w-auto">
            {planPeriodTabs.map((tab) => {
              const active = tab.type === periodType;
              return (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => updatePeriod(tab.type)}
                  className={[
                    "flex-1 rounded-full px-4 py-1.5 text-xs transition sm:flex-none",
                    active ? "bg-ink text-paper shadow-sm" : "text-ink-soft hover:text-ink",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
              onClick={() => shiftPeriod(-1)}
              aria-label="上一个周期"
            >
              ←
            </button>
            <div className="min-w-0 text-center">
              <p className="break-words text-sm font-medium text-ink">
                {planPeriodLabel(periodType, periodKey)}
              </p>
              <p className="text-[11px] text-ink-soft">
                {periodType === "week" ? "周一为一周起点" : "自然月"}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
              onClick={() => shiftPeriod(1)}
              aria-label="下一个周期"
            >
              →
            </button>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-7">
        {monthContext && monthContext.theme ? (
          <button
            type="button"
            onClick={openMonthContext}
            className="mb-5 flex w-full flex-wrap items-baseline gap-1 rounded-2xl bg-paper-deep/45 px-4 py-3 text-left text-xs text-ink-soft transition hover:bg-paper-deep/70"
          >
            <span className="shrink-0 text-moss">{planReminderCopy.monthLabel}：</span>
            <span className="min-w-0 break-words text-ink">{monthContext.theme}</span>
            <span className="ml-auto shrink-0">{planReminderCopy.monthLink}</span>
          </button>
        ) : null}

        <label className="block">
          <span className="block text-sm font-medium text-ink">{planFieldCopy.themeLabel}</span>
          <span className="mt-1 block text-[11px] leading-6 text-ink-soft">
            {planFieldCopy.themeHint}
          </span>
          <input
            className="field mt-2"
            type="text"
            maxLength={PLAN_THEME_MAX_LENGTH}
            placeholder={planFieldCopy.themePlaceholder}
            value={theme}
            onChange={(event) => {
              setTheme(event.target.value);
              setStatus({ type: "idle" });
              setDirty(true);
            }}
          />
        </label>

        <div className="mt-6">
          <p className="text-sm font-medium text-ink">{planFieldCopy.priorityLabel}</p>
          <p className="mt-1 text-[11px] leading-6 text-ink-soft">
            {planFieldCopy.priorityHint}
          </p>
          <div className="mt-3 space-y-2">
            {priorities.map((priority, index) => (
              <label key={index} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss-soft text-[11px] font-medium text-moss-dark">
                  {index + 1}
                </span>
                <input
                  className="field min-w-0"
                  type="text"
                  maxLength={PLAN_PRIORITY_MAX_LENGTH}
                  placeholder={planFieldCopy.priorityPlaceholder(index)}
                  value={priority}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPriorities((prev) =>
                      prev.map((item, itemIndex) => (itemIndex === index ? value : item)),
                    );
                    setStatus({ type: "idle" });
                    setDirty(true);
                  }}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-line/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-ink-soft">{statusText}</div>
          <p className="text-[11px] leading-6 text-ink-soft/80">{planPageCopy.clearHint}</p>
        </div>
      </section>

      <section className="card mt-6 p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg text-ink">{planHistoryCopy.title}</h2>
          <span className="text-[11px] text-ink-soft">{history.length} 个周期</span>
        </div>

        {history.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-line bg-paper-deep/30 p-5 text-center text-sm text-ink-soft">
            {periodType === "week" ? planHistoryCopy.weekEmpty : planHistoryCopy.monthEmpty}
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {history.map((item) => {
              const active = item.periodKey === periodKey;
              const preview = item.plan.theme || item.plan.priorities[0] || "";
              return (
                <button
                  key={item.periodKey}
                  type="button"
                  onClick={() => selectPeriod(item.periodKey)}
                  className={[
                    "flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                    active
                      ? "border-moss/40 bg-moss-soft/50"
                      : "border-line/70 bg-paper-deep/30 hover:border-moss/30 hover:bg-white/70",
                  ].join(" ")}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm text-ink">
                      {planPeriodLabel(periodType, item.periodKey)}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-soft">
                      {preview}
                    </span>
                  </span>
                  {active ? <span className="chip shrink-0">当前</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
