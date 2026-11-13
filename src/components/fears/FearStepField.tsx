import type { FearStep } from "../../content/fears";

export function FearStepField({
  step,
  value,
  done,
  onChange,
}: {
  step: FearStep;
  value: string;
  done: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <article className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-moss-soft text-xl">
            {step.icon}
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">
              第 {step.index} 步 · {step.short}
            </p>
            <h2 className="text-2xl text-ink">{step.title}</h2>
          </div>
        </div>
        <span
          className={
            done
              ? "chip"
              : "rounded-full bg-paper-deep/70 px-2.5 py-1 text-[11px] text-ink-soft"
          }
        >
          {done ? "已填写" : "待填写"}
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-ink-soft">{step.prompt}</p>

      <label className="mt-4 block">
        <span className="block text-[11px] leading-6 text-ink-soft">{step.hint}</span>
        <textarea
          className="field mt-2 resize-y"
          rows={5}
          maxLength={20000}
          placeholder={step.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </article>
  );
}
