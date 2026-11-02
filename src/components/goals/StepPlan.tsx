import type {
  GoalIfThen,
  GoalMetric,
  GoalMilestone,
  GoalPlanStep,
} from "../../../shared/types";
import {
  MAX_GOAL_IF_THEN,
  MAX_GOAL_METRICS,
  MAX_GOAL_MILESTONES,
  goalStepCopy,
} from "../../content/goals";
import { goalItemId } from "../../lib/goals";
import { FieldHeader, TextField, TextListField } from "./fields";

export function StepPlan({
  data,
  onChange,
}: {
  data: GoalPlanStep;
  onChange: (next: GoalPlanStep) => void;
}) {
  const copy = goalStepCopy.plan;

  function patch<K extends keyof GoalPlanStep>(key: K, value: GoalPlanStep[K]) {
    onChange({ ...data, [key]: value });
  }

  function patchMilestone(id: string, next: Partial<GoalMilestone>) {
    patch(
      "milestones",
      data.milestones.map((item) => (item.id === id ? { ...item, ...next } : item)),
    );
  }

  function addMilestone() {
    if (data.milestones.length >= MAX_GOAL_MILESTONES) return;
    patch("milestones", [
      ...data.milestones,
      { id: goalItemId("milestone"), text: "", due: "", done: false },
    ]);
  }

  function patchIfThen(id: string, next: Partial<GoalIfThen>) {
    patch(
      "ifThen",
      data.ifThen.map((item) => (item.id === id ? { ...item, ...next } : item)),
    );
  }

  function addIfThen() {
    if (data.ifThen.length >= MAX_GOAL_IF_THEN) return;
    patch("ifThen", [
      ...data.ifThen,
      { id: goalItemId("ifthen"), trigger: "", response: "" },
    ]);
  }

  function patchMetric(id: string, next: Partial<GoalMetric>) {
    patch(
      "metrics",
      data.metrics.map((item) => (item.id === id ? { ...item, ...next } : item)),
    );
  }

  function addMetric() {
    if (data.metrics.length >= MAX_GOAL_METRICS) return;
    patch("metrics", [
      ...data.metrics,
      { id: goalItemId("metric"), name: "", target: "", cadence: "" },
    ]);
  }

  return (
    <div className="space-y-8">
      <TextField
        label={copy.strategyLabel}
        hint={copy.strategyHint}
        required
        rows={4}
        placeholder={copy.strategyPlaceholder}
        value={data.strategy}
        onChange={(value) => patch("strategy", value)}
      />

      <TextField
        label={copy.checkLabel}
        hint={copy.checkHint}
        rows={2}
        placeholder={copy.checkPlaceholder}
        value={data.check}
        onChange={(value) => patch("check", value)}
      />

      <div>
        <FieldHeader label={copy.milestonesLabel} hint={copy.milestonesHint} />
        <div className="mt-2 space-y-2">
          {data.milestones.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-line/70 bg-paper-deep/20 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] tabular-nums text-ink-soft">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[#5d7355]"
                    checked={item.done}
                    onChange={(event) => patchMilestone(item.id, { done: event.target.checked })}
                  />
                  {copy.milestoneDone}
                </label>
                <input
                  type="text"
                  className="field min-w-48 flex-1"
                  maxLength={200}
                  placeholder={copy.milestonePlaceholder}
                  value={item.text}
                  onChange={(event) => patchMilestone(item.id, { text: event.target.value })}
                />
                <input
                  type="date"
                  className="field w-40"
                  aria-label={copy.milestoneDue}
                  value={item.due}
                  onChange={(event) => patchMilestone(item.id, { due: event.target.value })}
                />
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-[11px] text-ink-soft/70 transition hover:bg-white/70 hover:text-clay"
                  onClick={() =>
                    patch(
                      "milestones",
                      data.milestones.filter((milestone) => milestone.id !== item.id),
                    )
                  }
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
        {data.milestones.length < MAX_GOAL_MILESTONES ? (
          <button type="button" className="btn-secondary mt-2 text-xs" onClick={addMilestone}>
            + 添加里程碑
          </button>
        ) : null}
      </div>

      <TextListField
        label={copy.weeklyLabel}
        hint={copy.weeklyHint}
        values={data.weeklyActions}
        onChange={(value) => patch("weeklyActions", value)}
        placeholder={copy.weeklyPlaceholder}
        addLabel="再加一条每周动作"
        max={5}
        rows={2}
      />

      <TextListField
        label={copy.dailyLabel}
        hint={copy.dailyHint}
        values={data.dailyActions}
        onChange={(value) => patch("dailyActions", value)}
        placeholder={copy.dailyPlaceholder}
        addLabel="再加一条每日动作"
        max={3}
        rows={2}
      />

      <div>
        <FieldHeader label={copy.ifThenLabel} hint={copy.ifThenHint} />
        <div className="mt-2 space-y-2">
          {data.ifThen.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-line/70 bg-paper-deep/20 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-soft">预案 {index + 1}</span>
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-[11px] text-ink-soft/70 transition hover:bg-white/70 hover:text-clay"
                  onClick={() =>
                    patch(
                      "ifThen",
                      data.ifThen.filter((entry) => entry.id !== item.id),
                    )
                  }
                >
                  移除
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-[11px] text-ink-soft">{copy.ifThenTrigger}</span>
                  <input
                    type="text"
                    className="field mt-1"
                    maxLength={400}
                    placeholder={copy.ifThenTriggerPlaceholder}
                    value={item.trigger}
                    onChange={(event) => patchIfThen(item.id, { trigger: event.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="block text-[11px] text-ink-soft">{copy.ifThenResponse}</span>
                  <input
                    type="text"
                    className="field mt-1"
                    maxLength={400}
                    placeholder={copy.ifThenResponsePlaceholder}
                    value={item.response}
                    onChange={(event) => patchIfThen(item.id, { response: event.target.value })}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        {data.ifThen.length < MAX_GOAL_IF_THEN ? (
          <button type="button" className="btn-secondary mt-2 text-xs" onClick={addIfThen}>
            + 添加障碍预案
          </button>
        ) : null}
      </div>

      <div>
        <FieldHeader label={copy.metricsLabel} hint={copy.metricsHint} />
        <div className="mt-2 space-y-2">
          {data.metrics.map((item, index) => (
            <div
              key={item.id}
              className="rounded-2xl border border-line/70 bg-paper-deep/20 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-ink-soft">指标 {index + 1}</span>
                <button
                  type="button"
                  className="rounded-full px-2 py-1 text-[11px] text-ink-soft/70 transition hover:bg-white/70 hover:text-clay"
                  onClick={() =>
                    patch(
                      "metrics",
                      data.metrics.filter((metric) => metric.id !== item.id),
                    )
                  }
                >
                  移除
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <input
                  type="text"
                  className="field"
                  maxLength={200}
                  placeholder={copy.metricNamePlaceholder}
                  aria-label={copy.metricName}
                  value={item.name}
                  onChange={(event) => patchMetric(item.id, { name: event.target.value })}
                />
                <input
                  type="text"
                  className="field"
                  maxLength={200}
                  placeholder={copy.metricTargetPlaceholder}
                  aria-label={copy.metricTarget}
                  value={item.target}
                  onChange={(event) => patchMetric(item.id, { target: event.target.value })}
                />
                <input
                  type="text"
                  className="field"
                  maxLength={100}
                  placeholder={copy.metricCadencePlaceholder}
                  aria-label={copy.metricCadence}
                  value={item.cadence}
                  onChange={(event) => patchMetric(item.id, { cadence: event.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
        {data.metrics.length < MAX_GOAL_METRICS ? (
          <button type="button" className="btn-secondary mt-2 text-xs" onClick={addMetric}>
            + 添加验证指标
          </button>
        ) : null}
      </div>

      <TextListField
        label={copy.stopLabel}
        hint={copy.stopHint}
        values={data.stopDoing}
        onChange={(value) => patch("stopDoing", value)}
        placeholder={copy.stopPlaceholder}
        addLabel="再加一条"
        max={5}
        rows={2}
      />
    </div>
  );
}
