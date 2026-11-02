import type { GoalDiagnosisStep, GoalProblemStep } from "../../../shared/types";
import {
  goalControlOptions,
  goalImpactOptions,
  goalStepCopy,
} from "../../content/goals";
import { StepEmpty, TextField, TextListField } from "./fields";

export function StepDiagnosis({
  problem,
  data,
  onChange,
  onGoToProblem,
}: {
  problem: GoalProblemStep;
  data: GoalDiagnosisStep;
  onChange: (next: GoalDiagnosisStep) => void;
  onGoToProblem: () => void;
}) {
  const copy = goalStepCopy.diagnosis;
  const keyProblem = problem.items.find(
    (item) => item.id === problem.keyProblemId && item.title.trim().length > 0,
  );

  function patch<K extends keyof GoalDiagnosisStep>(key: K, value: GoalDiagnosisStep[K]) {
    onChange({ ...data, [key]: value });
  }

  if (!keyProblem) {
    return (
      <StepEmpty
        icon="🔍"
        title={copy.noKey}
        desc="诊断的对象只能有一个。选那个最限制整体进步的问题，剩下的先放着。"
        action={
          <button type="button" className="btn-primary" onClick={onGoToProblem}>
            回第 2 步选关键问题
          </button>
        }
      />
    );
  }

  const impactLabel =
    goalImpactOptions.find((option) => option.value === keyProblem.impact)?.label ?? "";
  const controlLabel =
    goalControlOptions.find((option) => option.value === keyProblem.control)?.label ?? "";

  return (
    <div className="space-y-7">
      <div className="rounded-2xl border border-moss/20 bg-moss-soft/35 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-moss">
            {copy.keyProblemTitle}
          </p>
          <button
            type="button"
            className="text-[11px] text-ink-soft transition hover:text-clay"
            onClick={onGoToProblem}
          >
            换一个关键问题
          </button>
        </div>
        <p className="mt-2 text-sm font-medium leading-7 text-ink">{keyProblem.title}</p>
        {keyProblem.evidence ? (
          <p className="mt-1 text-xs leading-6 text-ink-soft">{keyProblem.evidence}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] text-ink-soft">
            影响：{impactLabel}
          </span>
          <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[10px] text-ink-soft">
            可控性：{controlLabel}
          </span>
        </div>
      </div>

      <TextField
        label={copy.directCauseLabel}
        hint={copy.directCauseHint}
        rows={3}
        placeholder={copy.directCausePlaceholder}
        value={data.directCause}
        onChange={(value) => patch("directCause", value)}
      />

      <TextListField
        label={copy.whyChainLabel}
        hint={copy.whyChainHint}
        values={data.whyChain}
        onChange={(value) => patch("whyChain", value)}
        placeholder={copy.whyPlaceholder}
        addLabel={copy.addWhy}
        max={5}
        rows={2}
      />

      <TextField
        label={copy.rootCauseLabel}
        hint={copy.rootCauseHint}
        required
        rows={4}
        placeholder={copy.rootCausePlaceholder}
        value={data.rootCause}
        onChange={(value) => patch("rootCause", value)}
      />

      <TextField
        label={copy.patternLabel}
        hint={copy.patternHint}
        rows={3}
        placeholder={copy.patternPlaceholder}
        value={data.pattern}
        onChange={(value) => patch("pattern", value)}
      />

      <TextField
        label={copy.alternativeLabel}
        hint={copy.alternativeHint}
        rows={3}
        placeholder={copy.alternativePlaceholder}
        value={data.alternative}
        onChange={(value) => patch("alternative", value)}
      />

      <div className="rounded-2xl border border-moss/15 bg-moss-soft/30 p-4 sm:p-5">
        <TextField
          label={copy.conclusionLabel}
          hint={copy.conclusionHint}
          required
          rows={3}
          placeholder={copy.conclusionPlaceholder}
          value={data.conclusion}
          onChange={(value) => patch("conclusion", value)}
        />
      </div>
    </div>
  );
}
