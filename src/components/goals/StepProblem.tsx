import type { GoalProblem, GoalProblemStep } from "../../../shared/types";
import {
  MAX_GOAL_PROBLEMS,
  goalControlOptions,
  goalImpactOptions,
  goalStepCopy,
} from "../../content/goals";
import { goalItemId } from "../../lib/goals";
import { SegmentedField, StepEmpty } from "./fields";

export function StepProblem({
  data,
  onChange,
}: {
  data: GoalProblemStep;
  onChange: (next: GoalProblemStep) => void;
}) {
  const copy = goalStepCopy.problem;
  const keyProblem = data.items.find(
    (item) => item.id === data.keyProblemId && item.title.trim().length > 0,
  );

  function patchProblem(id: string, patch: Partial<GoalProblem>) {
    onChange({
      ...data,
      items: data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function addProblem() {
    if (data.items.length >= MAX_GOAL_PROBLEMS) return;
    const item: GoalProblem = {
      id: goalItemId("problem"),
      title: "",
      evidence: "",
      impact: "medium",
      control: "in",
    };
    const hasKey = data.items.some((entry) => entry.id === data.keyProblemId);
    onChange({
      items: [...data.items, item],
      keyProblemId: hasKey ? data.keyProblemId : item.id,
    });
  }

  function removeProblem(id: string) {
    onChange({
      items: data.items.filter((item) => item.id !== id),
      keyProblemId: data.keyProblemId === id ? null : data.keyProblemId,
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line/70 bg-paper-deep/35 p-4 text-sm leading-7 text-ink-soft">
        {copy.intro}
      </div>

      {data.items.length === 0 ? (
        <StepEmpty
          icon="🧱"
          title={copy.empty}
          action={
            <button type="button" className="btn-primary" onClick={addProblem}>
              {copy.add}
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {data.items.map((item, index) => {
            const selected = item.id === data.keyProblemId;
            return (
              <article
                key={item.id}
                className={[
                  "rounded-2xl border p-4 transition sm:p-5",
                  selected
                    ? "border-moss/40 bg-moss-soft/25"
                    : "border-line/70 bg-paper-deep/20",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
                    问题 {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...data,
                          keyProblemId: selected ? null : item.id,
                        })
                      }
                      aria-pressed={selected}
                      className={[
                        "rounded-full px-3 py-1 text-[11px] transition",
                        selected
                          ? "bg-moss text-white"
                          : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                      ].join(" ")}
                    >
                      {selected ? copy.keySelected : copy.keyLabel}
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-2 py-1 text-[11px] text-ink-soft/70 transition hover:bg-white/70 hover:text-clay"
                      onClick={() => removeProblem(item.id)}
                    >
                      移除
                    </button>
                  </div>
                </div>

                <label className="mt-3 block">
                  <span className="block text-xs font-medium text-ink">{copy.titleLabel}</span>
                  <input
                    type="text"
                    className="field mt-1.5"
                    maxLength={200}
                    placeholder={copy.titlePlaceholder}
                    value={item.title}
                    onChange={(event) => patchProblem(item.id, { title: event.target.value })}
                  />
                </label>

                <label className="mt-3 block">
                  <span className="block text-xs font-medium text-ink">{copy.evidenceLabel}</span>
                  <span className="mt-1 block text-[11px] text-ink-soft">{copy.evidenceHint}</span>
                  <textarea
                    className="field mt-1.5 min-h-16 resize-y"
                    rows={2}
                    maxLength={4000}
                    placeholder={copy.evidencePlaceholder}
                    value={item.evidence}
                    onChange={(event) => patchProblem(item.id, { evidence: event.target.value })}
                  />
                </label>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <SegmentedField
                    label={copy.impactLabel}
                    value={item.impact}
                    options={goalImpactOptions}
                    onChange={(value) => patchProblem(item.id, { impact: value })}
                  />
                  <SegmentedField
                    label={copy.controlLabel}
                    hint={copy.controlHint}
                    value={item.control}
                    options={goalControlOptions}
                    onChange={(value) => patchProblem(item.id, { control: value })}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}

      {data.items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={addProblem}
            disabled={data.items.length >= MAX_GOAL_PROBLEMS}
          >
            {copy.add}
          </button>
          <span className="text-[11px] text-ink-soft">
            {data.items.length} / {MAX_GOAL_PROBLEMS} · {copy.maxHint}
          </span>
        </div>
      ) : null}

      <div
        className={[
          "rounded-2xl border px-4 py-3 text-xs leading-6",
          keyProblem
            ? "border-moss/20 bg-moss-soft/40 text-moss-dark"
            : "border-clay/20 bg-clay/5 text-clay",
        ].join(" ")}
      >
        {keyProblem ? (
          <>
            <span className="font-medium">下一步只诊断：</span>
            {keyProblem.title}
            <span className="ml-2 text-moss-dark/70">{copy.keyHint}</span>
          </>
        ) : (
          copy.keyEmpty
        )}
      </div>
    </div>
  );
}
