import type {
  TelosChallengeData,
  TelosControllability,
  TelosData,
  TelosGoalData,
  TelosItemEntry,
  TelosProblemData,
  TelosProjectData,
  TelosProjectMilestone,
  TelosRiskControl,
  TelosRiskData,
  TelosStrategyData,
} from "../../../shared/types";
import {
  compassControllabilityOptions,
  compassFieldCopy,
  compassRiskControlMeta,
  compassRiskControlStateMeta,
} from "../../content/compass";
import {
  FieldHeader,
  SegmentedField,
  TextField,
  TextInput,
  TextListField,
} from "../goals/fields";

export function CompassScaleField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <FieldHeader label={label} hint={hint} />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={value === score}
            onClick={() => onChange(score)}
            className={[
              "h-8 w-8 rounded-full text-xs tabular-nums transition",
              value === score
                ? "bg-ink text-paper"
                : "border border-line bg-white/70 text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            {score}
          </button>
        ))}
        <span className="ml-1 text-[11px] text-ink-soft">1 低 · 5 高</span>
      </div>
    </div>
  );
}

function ProblemFields({
  data,
  onChange,
}: {
  data: TelosProblemData;
  onChange: (next: TelosProblemData) => void;
}) {
  const copy = compassFieldCopy.problem;
  return (
    <div className="space-y-5">
      <TextField
        label={copy.description.label}
        hint={copy.description.hint}
        placeholder={copy.description.placeholder}
        value={data.description}
        onChange={(description) => onChange({ ...data, description })}
      />
      <TextField
        label={copy.whyItMatters.label}
        hint={copy.whyItMatters.hint}
        placeholder={copy.whyItMatters.placeholder}
        value={data.whyItMatters}
        onChange={(whyItMatters) => onChange({ ...data, whyItMatters })}
      />
      <TextListField
        label={copy.evidence.label}
        hint={copy.evidence.hint}
        values={data.evidence}
        onChange={(evidence) => onChange({ ...data, evidence })}
        placeholder={copy.evidence.placeholder}
        addLabel={copy.evidence.add}
        addVariant="text"
        max={5}
      />
      <TextField
        label={copy.scope.label}
        hint={copy.scope.hint}
        placeholder={copy.scope.placeholder}
        value={data.scope}
        onChange={(scope) => onChange({ ...data, scope })}
        rows={3}
      />
    </div>
  );
}

function GoalFields({
  data,
  onChange,
}: {
  data: TelosGoalData;
  onChange: (next: TelosGoalData) => void;
}) {
  const copy = compassFieldCopy.goal;
  return (
    <div className="space-y-5">
      <TextListField
        label={copy.successCriteria.label}
        hint={copy.successCriteria.hint}
        values={data.successCriteria}
        onChange={(successCriteria) => onChange({ ...data, successCriteria })}
        placeholder={copy.successCriteria.placeholder}
        addLabel={copy.successCriteria.add}
        addVariant="text"
        max={5}
      />

      <div>
        <p className="text-sm font-medium text-ink">核心指标</p>
        <p className="mt-1 text-[11px] leading-6 text-ink-soft">
          只选一个最能说明目标是否达成的指标。
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <TextInput
            label={copy.metricName.label}
            value={data.metric.name}
            onChange={(name) => onChange({ ...data, metric: { ...data.metric, name } })}
            placeholder={copy.metricName.placeholder}
          />
          <TextInput
            label={copy.metricTarget.label}
            value={data.metric.target}
            onChange={(target) => onChange({ ...data, metric: { ...data.metric, target } })}
            placeholder={copy.metricTarget.placeholder}
          />
          <TextInput
            label={copy.metricCadence.label}
            value={data.metric.cadence}
            onChange={(cadence) => onChange({ ...data, metric: { ...data.metric, cadence } })}
            placeholder={copy.metricCadence.placeholder}
          />
        </div>
      </div>

      <TextInput
        label={copy.deadline.label}
        hint={copy.deadline.hint}
        type="date"
        value={data.deadline}
        onChange={(deadline) => onChange({ ...data, deadline })}
      />

      <TextField
        label={copy.tradeoffs.label}
        hint={copy.tradeoffs.hint}
        placeholder={copy.tradeoffs.placeholder}
        value={data.tradeoffs}
        onChange={(tradeoffs) => onChange({ ...data, tradeoffs })}
        rows={3}
      />
      <TextListField
        label={copy.notDoing.label}
        hint={copy.notDoing.hint}
        values={data.notDoing}
        onChange={(notDoing) => onChange({ ...data, notDoing })}
        placeholder={copy.notDoing.placeholder}
        addLabel={copy.notDoing.add}
        addVariant="text"
        max={5}
      />
    </div>
  );
}

function ChallengeFields({
  data,
  onChange,
}: {
  data: TelosChallengeData;
  onChange: (next: TelosChallengeData) => void;
}) {
  const copy = compassFieldCopy.challenge;
  return (
    <div className="space-y-5">
      <TextField
        label={copy.evidence.label}
        hint={copy.evidence.hint}
        placeholder={copy.evidence.placeholder}
        value={data.evidence}
        onChange={(evidence) => onChange({ ...data, evidence })}
      />
      <TextField
        label={copy.rootCause.label}
        hint={copy.rootCause.hint}
        placeholder={copy.rootCause.placeholder}
        value={data.rootCause}
        onChange={(rootCause) => onChange({ ...data, rootCause })}
      />
      <SegmentedField<TelosControllability>
        label={copy.controllability.label}
        hint={copy.controllability.hint}
        value={data.controllability}
        options={compassControllabilityOptions}
        onChange={(controllability) => onChange({ ...data, controllability })}
      />
      <CompassScaleField
        label={copy.severity.label}
        hint={copy.severity.hint}
        value={data.severity}
        onChange={(severity) => onChange({ ...data, severity })}
      />
    </div>
  );
}

function StrategyFields({
  data,
  onChange,
}: {
  data: TelosStrategyData;
  onChange: (next: TelosStrategyData) => void;
}) {
  const copy = compassFieldCopy.strategy;
  return (
    <div className="space-y-5">
      <TextField
        label={copy.hypothesis.label}
        hint={copy.hypothesis.hint}
        placeholder={copy.hypothesis.placeholder}
        value={data.hypothesis}
        onChange={(hypothesis) => onChange({ ...data, hypothesis })}
      />
      <TextListField
        label={copy.assumptions.label}
        hint={copy.assumptions.hint}
        values={data.assumptions}
        onChange={(assumptions) => onChange({ ...data, assumptions })}
        placeholder={copy.assumptions.placeholder}
        addLabel={copy.assumptions.add}
        addVariant="text"
        max={5}
      />
      <TextListField
        label={copy.leadingIndicators.label}
        hint={copy.leadingIndicators.hint}
        values={data.leadingIndicators}
        onChange={(leadingIndicators) => onChange({ ...data, leadingIndicators })}
        placeholder={copy.leadingIndicators.placeholder}
        addLabel={copy.leadingIndicators.add}
        addVariant="text"
        max={5}
      />
      <TextListField
        label={copy.stopConditions.label}
        hint={copy.stopConditions.hint}
        values={data.stopConditions}
        onChange={(stopConditions) => onChange({ ...data, stopConditions })}
        placeholder={copy.stopConditions.placeholder}
        addLabel={copy.stopConditions.add}
        addVariant="text"
        max={5}
      />
    </div>
  );
}

function createMilestone(): TelosProjectMilestone {
  return {
    id: crypto.randomUUID(),
    text: "",
    due: "",
    done: false,
  };
}

function MilestonesField({
  milestones,
  onChange,
}: {
  milestones: TelosProjectMilestone[];
  onChange: (next: TelosProjectMilestone[]) => void;
}) {
  const copy = compassFieldCopy.project.milestones;

  function update(index: number, patch: Partial<TelosProjectMilestone>) {
    onChange(
      milestones.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, ...patch } : milestone,
      ),
    );
  }

  function remove(index: number) {
    onChange(milestones.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div>
      <FieldHeader label={copy.label} hint={copy.hint} />
      {milestones.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-line bg-paper-deep/30 px-4 py-3 text-xs text-ink-soft">
          {copy.empty}
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {milestones.map((milestone, index) => (
            <div
              key={milestone.id}
              className="rounded-2xl border border-line/70 bg-white/60 p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  className="field"
                  maxLength={200}
                  placeholder={copy.textPlaceholder}
                  value={milestone.text}
                  aria-label={`里程碑 ${index + 1}`}
                  onChange={(event) => update(index, { text: event.target.value })}
                />
                <input
                  type="date"
                  className="field sm:w-40"
                  value={milestone.due}
                  aria-label={`里程碑 ${index + 1} ${copy.dueLabel}`}
                  onChange={(event) => update(index, { due: event.target.value })}
                />
                <label className="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-moss"
                    checked={milestone.done}
                    onChange={(event) => update(index, { done: event.target.checked })}
                  />
                  {copy.doneLabel}
                </label>
                <button
                  type="button"
                  className="btn-ghost shrink-0 px-2 py-1 text-xs text-ink-soft/70 hover:text-clay"
                  onClick={() => remove(index)}
                >
                  {copy.removeLabel}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="mt-2 pl-3 text-xs font-medium text-moss underline-offset-4 transition hover:text-moss-dark hover:underline"
        onClick={() => onChange([...milestones, createMilestone()])}
      >
        {copy.add}
      </button>
    </div>
  );
}

function ProjectFields({
  data,
  onChange,
}: {
  data: TelosProjectData;
  onChange: (next: TelosProjectData) => void;
}) {
  const copy = compassFieldCopy.project;
  return (
    <div className="space-y-5">
      <TextField
        label={copy.nextAction.label}
        hint={copy.nextAction.hint}
        placeholder={copy.nextAction.placeholder}
        value={data.nextAction}
        onChange={(nextAction) => onChange({ ...data, nextAction })}
        rows={3}
      />
      <MilestonesField
        milestones={data.milestones}
        onChange={(milestones) => onChange({ ...data, milestones })}
      />
    </div>
  );
}

function RiskControlField({
  kind,
  value,
  onChange,
}: {
  kind: "prevent" | "detect" | "respond";
  value: TelosRiskControl;
  onChange: (next: TelosRiskControl) => void;
}) {
  const meta = compassRiskControlMeta[kind];
  return (
    <div className="rounded-2xl border border-line/70 bg-paper-deep/30 p-4">
      <FieldHeader label={meta.label} hint={meta.hint} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(["none", "partial", "ready"] as const).map((state) => {
          const stateMeta = compassRiskControlStateMeta[state];
          const active = value.state === state;
          return (
            <button
              key={state}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...value, state })}
              className={[
                "rounded-full px-3 py-1.5 text-xs transition",
                active
                  ? "bg-ink text-paper"
                  : "border border-line bg-white/70 text-ink-soft hover:text-ink",
              ].join(" ")}
              title={stateMeta.label}
            >
              {stateMeta.label}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        className="field mt-3"
        maxLength={2000}
        placeholder={compassFieldCopy.risk.notePlaceholder}
        value={value.note}
        aria-label={`${meta.label} 备注`}
        onChange={(event) => onChange({ ...value, note: event.target.value })}
      />
    </div>
  );
}

function RiskFields({
  data,
  onChange,
}: {
  data: TelosRiskData;
  onChange: (next: TelosRiskData) => void;
}) {
  const copy = compassFieldCopy.risk;
  return (
    <div className="space-y-5">
      <TextField
        label={copy.scenario.label}
        hint={copy.scenario.hint}
        placeholder={copy.scenario.placeholder}
        value={data.scenario}
        onChange={(scenario) => onChange({ ...data, scenario })}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <CompassScaleField
          label={copy.probability.label}
          hint={copy.probability.hint}
          value={data.probability}
          onChange={(probability) => onChange({ ...data, probability })}
        />
        <CompassScaleField
          label={copy.impact.label}
          hint={copy.impact.hint}
          value={data.impact}
          onChange={(impact) => onChange({ ...data, impact })}
        />
      </div>
      <RiskControlField
        kind="prevent"
        value={data.prevent}
        onChange={(prevent) => onChange({ ...data, prevent })}
      />
      <RiskControlField
        kind="detect"
        value={data.detect}
        onChange={(detect) => onChange({ ...data, detect })}
      />
      <RiskControlField
        kind="respond"
        value={data.respond}
        onChange={(respond) => onChange({ ...data, respond })}
      />
    </div>
  );
}

/** 按分类渲染专属字段；data 形状由 shared/types.ts 的归一化函数保证。 */
export function CompassItemFields({
  item,
  onChange,
}: {
  item: TelosItemEntry;
  onChange: (data: TelosData) => void;
}) {
  switch (item.category) {
    case "problem":
      return <ProblemFields data={item.data} onChange={onChange} />;
    case "goal":
      return <GoalFields data={item.data} onChange={onChange} />;
    case "challenge":
      return <ChallengeFields data={item.data} onChange={onChange} />;
    case "strategy":
      return <StrategyFields data={item.data} onChange={onChange} />;
    case "project":
      return <ProjectFields data={item.data} onChange={onChange} />;
    case "risk":
      return <RiskFields data={item.data} onChange={onChange} />;
  }
}
