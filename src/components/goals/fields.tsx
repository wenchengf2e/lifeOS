import type { ReactNode } from "react";

export function FieldHeader({
  label,
  hint,
  required,
}: {
  label: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <span className="block">
      <span className="block text-sm font-medium text-ink">
        {label}
        {required ? <span className="ml-1 text-clay">*</span> : null}
      </span>
      {hint ? <span className="mt-1 block text-[11px] leading-6 text-ink-soft">{hint}</span> : null}
    </span>
  );
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <FieldHeader label={label} hint={hint} required={required} />
      <textarea
        className="field mt-2 resize-y"
        rows={rows}
        maxLength={20000}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength = 200,
  className = "",
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  maxLength?: number;
  className?: string;
}) {
  return (
    <label className={["block", className].join(" ")}>
      <FieldHeader label={label} hint={hint} />
      <input
        type={type}
        className="field mt-2"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextListField({
  label,
  hint,
  values,
  onChange,
  placeholder,
  addLabel,
  max = 5,
  rows = 2,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  addLabel: string;
  max?: number;
  rows?: number;
}) {
  const rowsValues = values.length > 0 ? values : [""];

  function update(index: number, value: string) {
    const next = [...rowsValues];
    next[index] = value;
    onChange(next);
  }

  function remove(index: number) {
    onChange(rowsValues.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div>
      <FieldHeader label={label} hint={hint} />
      <div className="mt-2 space-y-2">
        {rowsValues.map((value, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-3 w-4 shrink-0 text-center text-[11px] tabular-nums text-ink-soft">
              {index + 1}
            </span>
            <textarea
              className="field min-h-12 resize-y"
              rows={rows}
              maxLength={4000}
              placeholder={placeholder}
              value={value}
              onChange={(event) => update(index, event.target.value)}
            />
            {values.length > 0 ? (
              <button
                type="button"
                className="btn-ghost mt-1 shrink-0 px-2 text-xs text-ink-soft/70 hover:text-clay"
                onClick={() => remove(index)}
              >
                移除
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {values.length > 0 && values.length < max ? (
        <button
          type="button"
          className="btn-secondary mt-2 text-xs"
          onClick={() => onChange([...values, ""])}
        >
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export function SegmentedField<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <FieldHeader label={label} hint={hint} />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            title={option.hint}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={[
              "rounded-full px-3 py-1.5 text-xs transition",
              value === option.value
                ? "bg-ink text-paper"
                : "border border-line bg-white/70 text-ink-soft hover:text-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StepEmpty({
  icon = "·",
  title,
  desc,
  action,
}: {
  icon?: ReactNode;
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-paper-deep/30 p-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-moss-soft text-base">
        {icon}
      </div>
      <p className="mt-3 text-sm font-medium text-ink">{title}</p>
      {desc ? <p className="mx-auto mt-1.5 max-w-md text-xs leading-6 text-ink-soft">{desc}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
