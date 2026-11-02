import { Link } from "react-router-dom";
import type { GoalGoalStep } from "../../../shared/types";
import {
  MAX_GOAL_NOT_DOING,
  MAX_GOAL_SUCCESS_CRITERIA,
  goalStepCopy,
} from "../../content/goals";
import { FieldHeader, TextField, TextInput, TextListField } from "./fields";

export function StepGoal({
  data,
  onChange,
}: {
  data: GoalGoalStep;
  onChange: (next: GoalGoalStep) => void;
}) {
  const copy = goalStepCopy.goal;

  function patch<K extends keyof GoalGoalStep>(key: K, value: GoalGoalStep[K]) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-7">
      <TextField
        label={copy.statementLabel}
        hint={copy.statementHint}
        required
        rows={4}
        placeholder={copy.statementPlaceholder}
        value={data.statement}
        onChange={(value) => patch("statement", value)}
      />

      <TextField
        label={copy.whyNowLabel}
        hint={copy.whyNowHint}
        rows={3}
        placeholder={copy.whyNowPlaceholder}
        value={data.whyNow}
        onChange={(value) => patch("whyNow", value)}
      />

      <TextListField
        label={copy.successLabel}
        hint={copy.successHint}
        values={data.successCriteria}
        onChange={(value) => patch("successCriteria", value)}
        placeholder={copy.successPlaceholder}
        addLabel="再加一条成功标准"
        max={MAX_GOAL_SUCCESS_CRITERIA}
        rows={2}
      />

      <TextField
        label={copy.tradeoffLabel}
        hint={copy.tradeoffHint}
        rows={3}
        placeholder={copy.tradeoffPlaceholder}
        value={data.tradeoffs}
        onChange={(value) => patch("tradeoffs", value)}
      />

      <TextListField
        label={copy.notDoingLabel}
        hint={copy.notDoingHint}
        values={data.notDoing}
        onChange={(value) => patch("notDoing", value)}
        placeholder={copy.notDoingPlaceholder}
        addLabel="再加一条"
        max={MAX_GOAL_NOT_DOING}
        rows={2}
      />

      <div className="grid gap-5 sm:grid-cols-[200px_minmax(0,1fr)]">
        <TextInput
          label={copy.deadlineLabel}
          hint={copy.deadlineHint}
          type="date"
          value={data.deadline}
          onChange={(value) => patch("deadline", value)}
        />

        <div>
          <FieldHeader label={copy.challengeLabel} hint={copy.challengeHint} />
          <div className="mt-4 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={data.challenge}
              onChange={(event) => patch("challenge", Number(event.target.value))}
              className="h-1.5 flex-1 accent-[#5d7355]"
              aria-label={copy.challengeLabel}
            />
            <span className="w-9 text-center font-display text-2xl text-ink">
              {data.challenge}
            </span>
          </div>
        </div>
      </div>

      <div>
        <TextField
          label={copy.alignmentLabel}
          hint={copy.alignmentHint}
          rows={3}
          placeholder={copy.alignmentPlaceholder}
          value={data.alignment}
          onChange={(value) => patch("alignment", value)}
        />
        <Link
          to="/lifeos"
          className="mt-2 inline-block text-xs text-moss transition hover:text-moss-dark"
        >
          打开人生 OS 校准方向 →
        </Link>
      </div>
    </div>
  );
}
