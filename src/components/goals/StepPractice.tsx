import { useState } from "react";
import type { GoalPracticeStep, GoalPlanStep, GoalStatus } from "../../../shared/types";
import { goalStatusMeta, goalStepCopy } from "../../content/goals";
import { formatDateCN, todayKey } from "../../lib/date";
import { goalItemId } from "../../lib/goals";
import { StepEmpty, TextField, TextInput } from "./fields";

type LogDraft = {
  date: string;
  did: string;
  evidence: string;
  gap: string;
  next: string;
};

const EMPTY_LOG = (): LogDraft => ({
  date: todayKey(),
  did: "",
  evidence: "",
  gap: "",
  next: "",
});

const STATUS_ACTIONS: { status: GoalStatus; label: string }[] = [
  { status: "active", label: goalStepCopy.practice.setActive },
  { status: "paused", label: goalStepCopy.practice.setPaused },
  { status: "achieved", label: goalStepCopy.practice.setAchieved },
  { status: "archived", label: goalStepCopy.practice.setArchived },
];

export function StepPractice({
  plan,
  data,
  status,
  onChange,
  onStatusChange,
  onGoToPlan,
  onNotify,
}: {
  plan: GoalPlanStep;
  data: GoalPracticeStep;
  status: GoalStatus;
  onChange: (next: GoalPracticeStep) => void;
  onStatusChange: (status: GoalStatus) => void;
  onGoToPlan: () => void;
  onNotify?: (message: string) => void;
}) {
  const copy = goalStepCopy.practice;
  const [log, setLog] = useState<LogDraft>(EMPTY_LOG);
  const [error, setError] = useState<string | null>(null);

  const weeklyActions = plan.weeklyActions.map((item) => item.trim()).filter(Boolean);
  const sortedLogs = [...data.logs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  function handleAddLog() {
    if (!log.did.trim() && !log.evidence.trim()) {
      setError(copy.needContent);
      return;
    }

    onChange({
      ...data,
      logs: [
        ...data.logs,
        {
          id: goalItemId("log"),
          date: log.date || todayKey(),
          did: log.did.trim(),
          evidence: log.evidence.trim(),
          gap: log.gap.trim(),
          next: log.next.trim(),
        },
      ],
    });
    setLog(EMPTY_LOG());
    setError(null);
    onNotify?.("已添加一条践行记录");
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-line/70 bg-paper-deep/35 p-4 text-sm leading-7 text-ink-soft">
        {copy.intro}
      </div>

      <div className="rounded-2xl border border-line/70 bg-white/50 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base text-ink">{goalStepCopy.plan.latestWeekly}</h3>
          <button
            type="button"
            className="text-[11px] text-ink-soft transition hover:text-moss-dark"
            onClick={onGoToPlan}
          >
            去第 4 步调整 →
          </button>
        </div>
        {weeklyActions.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {weeklyActions.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-6 text-ink-soft">
                <span className="text-moss">·</span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-clay">{copy.planEmpty}</p>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base text-ink">{copy.logsTitle}</h3>
          <span className="text-[11px] text-ink-soft">{data.logs.length} 条记录</span>
        </div>

        {sortedLogs.length === 0 ? (
          <div className="mt-3">
            <StepEmpty icon="📝" title={copy.empty} />
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {sortedLogs.map((entry) => (
              <article
                key={entry.id}
                className="rounded-2xl border border-line/70 bg-paper-deep/20 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-ink">
                    {entry.date ? formatDateCN(entry.date, { withYear: true }) : "未标日期"}
                  </span>
                  <button
                    type="button"
                    className="rounded-full px-2 py-1 text-[11px] text-ink-soft/70 transition hover:bg-white/70 hover:text-clay"
                    onClick={() => {
                      onChange({
                        ...data,
                        logs: data.logs.filter((logItem) => logItem.id !== entry.id),
                      });
                      onNotify?.("已删除这条践行记录");
                    }}
                  >
                    {copy.deleteLog}
                  </button>
                </div>
                <dl className="mt-2 space-y-2 text-sm leading-6">
                  {entry.did ? (
                    <div>
                      <dt className="text-[11px] text-ink-soft">做了什么</dt>
                      <dd className="text-ink">{entry.did}</dd>
                    </div>
                  ) : null}
                  {entry.evidence ? (
                    <div>
                      <dt className="text-[11px] text-ink-soft">结果 / 证据</dt>
                      <dd className="text-ink-soft">{entry.evidence}</dd>
                    </div>
                  ) : null}
                  {entry.gap ? (
                    <div>
                      <dt className="text-[11px] text-ink-soft">偏差 / 卡点</dt>
                      <dd className="text-ink-soft">{entry.gap}</dd>
                    </div>
                  ) : null}
                  {entry.next ? (
                    <div>
                      <dt className="text-[11px] text-ink-soft">下一步</dt>
                      <dd className="text-moss-dark">{entry.next}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-line/70 bg-white/60 p-4 sm:p-5">
        <h3 className="text-base text-ink">{copy.logFormTitle}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          <TextInput
            label={copy.dateLabel}
            type="date"
            value={log.date}
            onChange={(value) => {
              setLog((prev) => ({ ...prev, date: value }));
              setError(null);
            }}
          />
          <TextField
            label={copy.didLabel}
            rows={2}
            placeholder={copy.didPlaceholder}
            value={log.did}
            onChange={(value) => {
              setLog((prev) => ({ ...prev, did: value }));
              setError(null);
            }}
          />
        </div>
        <div className="mt-4">
          <TextField
            label={copy.evidenceLabel}
            rows={2}
            placeholder={copy.evidencePlaceholder}
            value={log.evidence}
            onChange={(value) => {
              setLog((prev) => ({ ...prev, evidence: value }));
              setError(null);
            }}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <TextField
            label={copy.gapLabel}
            rows={2}
            placeholder={copy.gapPlaceholder}
            value={log.gap}
            onChange={(value) => setLog((prev) => ({ ...prev, gap: value }))}
          />
          <TextField
            label={copy.nextLabel}
            rows={2}
            placeholder={copy.nextPlaceholder}
            value={log.next}
            onChange={(value) => setLog((prev) => ({ ...prev, next: value }))}
          />
        </div>
        {error ? <p className="mt-3 text-xs text-clay">{error}</p> : null}
        <button type="button" className="btn-primary mt-4" onClick={handleAddLog}>
          {copy.addLog}
        </button>
      </div>

      <div className="space-y-5 rounded-2xl border border-moss/15 bg-moss-soft/25 p-4 sm:p-5">
        <TextField
          label={copy.reviewTitle}
          hint={copy.reviewHint}
          rows={3}
          placeholder={copy.reviewPlaceholder}
          value={data.review}
          onChange={(value) => onChange({ ...data, review: value })}
        />
        <TextField
          label={copy.nextStepTitle}
          hint={copy.nextStepHint}
          rows={2}
          placeholder={copy.nextStepPlaceholder}
          value={data.nextStep}
          onChange={(value) => onChange({ ...data, nextStep: value })}
        />
      </div>

      <div>
        <h3 className="text-base text-ink">{copy.statusTitle}</h3>
        <p className="mt-1 text-[11px] leading-6 text-ink-soft">{copy.statusHint}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_ACTIONS.map((action) => (
            <button
              key={action.status}
              type="button"
              aria-pressed={status === action.status}
              onClick={() => {
                onStatusChange(action.status);
                onNotify?.(`状态已改为「${goalStatusMeta[action.status].label}」`);
              }}
              className={[
                "rounded-full px-3.5 py-1.5 text-xs transition",
                status === action.status
                  ? "bg-ink text-paper"
                  : "border border-line bg-white/70 text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
