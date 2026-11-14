import { useId, useState } from "react";
import type { FearAnalysis } from "../../../shared/types";
import { fearAnalysisCopy } from "../../content/fears";
import { fearAnalysisSummary, hasFearAnalysis } from "../../lib/fears";

const LEVELS = [1, 2, 3, 4, 5];

const INACTION_KEYS = ["sixMonths", "oneYear", "threeYears"] as const;

function LevelPicker({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <p className="mt-1 text-[11px] leading-6 text-ink-soft">{hint}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {LEVELS.map((level) => {
          const selected = value === level;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={selected}
              aria-label={`${label} ${level} 分${selected ? "，再次点击清除" : ""}`}
              title={selected ? "再次点击清除" : undefined}
              onClick={() => onChange(selected ? 0 : level)}
              className={
                selected
                  ? "flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm font-medium text-paper transition"
                  : "flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white/70 text-sm text-ink-soft transition hover:border-moss/40 hover:text-ink"
              }
            >
              {level}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FearAnalysisCard({
  data,
  onChange,
}: {
  data: FearAnalysis;
  onChange: (next: FearAnalysis) => void;
}) {
  // 只在挂载时根据内容决定一次；之后展开 / 收起完全交给用户。
  const [open, setOpen] = useState(() => hasFearAnalysis(data));
  const bodyId = useId();
  const filled = hasFearAnalysis(data);
  const benefitRows = data.benefits.length > 0 ? data.benefits : [""];

  function patch(partial: Partial<FearAnalysis>) {
    onChange({ ...data, ...partial });
  }

  function updateBenefit(index: number, value: string) {
    const next = benefitRows.slice(0, 3);
    next[index] = value;
    patch({ benefits: next });
  }

  function removeBenefit(index: number) {
    patch({ benefits: benefitRows.filter((_, itemIndex) => itemIndex !== index) });
  }

  return (
    <article className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-start justify-between gap-3 p-5 text-left transition hover:bg-paper-deep/30 sm:p-6"
      >
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-paper-deep/70 text-lg"
          >
            ⚖️
          </span>
          <span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xl leading-tight text-ink">
                {fearAnalysisCopy.title}
              </span>
              <span className="rounded-full bg-paper-deep/70 px-2 py-0.5 text-[11px] text-ink-soft">
                {fearAnalysisCopy.optional}
              </span>
            </span>
            <span className="mt-1 block text-[11px] leading-5 text-ink-soft">
              {open ? (filled ? "已填写" : "未填写") : fearAnalysisSummary(data)}
            </span>
          </span>
        </span>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-[11px] text-ink-soft">
          {open ? fearAnalysisCopy.collapse : fearAnalysisCopy.expand}
          <span aria-hidden="true">{open ? "↑" : "↓"}</span>
        </span>
      </button>

      {open ? (
        <div id={bodyId} className="border-t border-line/70 px-5 pb-6 pt-5 sm:px-6">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-ink">{fearAnalysisCopy.benefitsLabel}</p>
              <p className="mt-1 text-[11px] leading-6 text-ink-soft">
                {fearAnalysisCopy.benefitsHint}
              </p>
              <div className="mt-2 space-y-2">
                {benefitRows.map((value, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="mt-3 w-4 shrink-0 text-center text-[11px] tabular-nums text-ink-soft">
                      {index + 1}
                    </span>
                    <textarea
                      className="field min-h-12 resize-y"
                      rows={2}
                      maxLength={500}
                      aria-label={`潜在好处第 ${index + 1} 条`}
                      value={value}
                      onChange={(event) => updateBenefit(index, event.target.value)}
                    />
                    {data.benefits.length > 0 ? (
                      <button
                        type="button"
                        className="btn-ghost mt-1 shrink-0 px-2 text-xs text-ink-soft/70 hover:text-clay"
                        aria-label={`移除第 ${index + 1} 条好处`}
                        onClick={() => removeBenefit(index)}
                      >
                        移除
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
              {data.benefits.length > 0 && data.benefits.length < 3 ? (
                <button
                  type="button"
                  className="btn-secondary mt-2 text-xs"
                  onClick={() => patch({ benefits: [...data.benefits, ""] })}
                >
                  {fearAnalysisCopy.addBenefit}
                </button>
              ) : null}
            </div>

            <LevelPicker
              label={fearAnalysisCopy.confidenceLabel}
              hint={fearAnalysisCopy.confidenceHint}
              value={data.confidenceLevel}
              onChange={(value) => patch({ confidenceLevel: value })}
            />

            <div>
              <p className="text-sm font-medium text-ink">{fearAnalysisCopy.precedentLabel}</p>
              <p className="mt-1 text-[11px] leading-6 text-ink-soft">
                {fearAnalysisCopy.precedentHint}
              </p>
              <textarea
                className="field mt-2 resize-y"
                rows={3}
                maxLength={4000}
                aria-label={fearAnalysisCopy.precedentLabel}
                value={data.precedent}
                onChange={(event) => patch({ precedent: event.target.value })}
              />
            </div>

            <LevelPicker
              label={fearAnalysisCopy.impactLabel}
              hint={fearAnalysisCopy.impactHint}
              value={data.impactLevel}
              onChange={(value) => patch({ impactLevel: value })}
            />

            <div>
              <p className="text-sm font-medium text-ink">{fearAnalysisCopy.inactionTitle}</p>
              <div className="mt-3 space-y-4">
                {INACTION_KEYS.map((key) => {
                  const copy = fearAnalysisCopy.inaction[key];
                  return (
                    <label key={key} className="block">
                      <span className="block text-sm font-medium text-ink">{copy.label}</span>
                      <span className="mt-1 block text-[11px] leading-6 text-ink-soft">
                        {copy.hint}
                      </span>
                      <textarea
                        className="field mt-2 resize-y"
                        rows={3}
                        maxLength={20000}
                        value={data.inaction[key]}
                        onChange={(event) =>
                          patch({
                            inaction: { ...data.inaction, [key]: event.target.value },
                          })
                        }
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
