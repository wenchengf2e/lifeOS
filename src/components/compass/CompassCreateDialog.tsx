import { useEffect, useRef, useState } from "react";
import type { TelosCategory, TelosPriority } from "../../../shared/types";
import { TELOS_DEFAULT_PRIORITY } from "../../../shared/types";
import {
  compassCategoryMeta,
  compassCreateCopy,
  compassCreatePlaceholder,
  compassPriorityMeta,
  compassPriorityOrder,
} from "../../content/compass";

type CompassCreateDialogProps = {
  category: TelosCategory;
  defaultPriority?: TelosPriority;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (title: string, priority: TelosPriority) => void | Promise<void>;
};

export function CompassCreateDialog({
  category,
  defaultPriority,
  submitting,
  error,
  onClose,
  onSubmit,
}: CompassCreateDialogProps) {
  const meta = compassCategoryMeta[category];
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TelosPriority>(
    defaultPriority ?? TELOS_DEFAULT_PRIORITY,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, []);

  async function submit() {
    const content = title.trim();
    if (!content) {
      setFormError("先写一个标题，哪怕是临时名字也可以。");
      return;
    }
    setFormError(null);
    await onSubmit(content, priority);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compass-create-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-line bg-paper p-6 shadow-2xl sm:rounded-[2rem] sm:p-7"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="compass-create-title" className="text-2xl text-ink">
              {compassCreateCopy.title} · {meta.label}
            </h2>
          </div>
          <button
            type="button"
            className="btn-ghost shrink-0 text-xl"
            onClick={onClose}
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <label className="mt-5 block">
          <span className="block text-sm font-medium text-ink">
            {meta.icon} {compassCreateCopy.titleLabel}
          </span>
          <input
            ref={inputRef}
            type="text"
            className="field mt-2"
            maxLength={200}
            placeholder={compassCreatePlaceholder[category]}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setFormError(null);
            }}
          />
        </label>

        <div className="mt-5">
          <span className="block text-sm font-medium text-ink">
            {compassCreateCopy.priorityLabel}
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {compassPriorityOrder.map((value) => {
              const priorityMeta = compassPriorityMeta[value];
              const active = priority === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  title={priorityMeta.hint}
                  onClick={() => setPriority(value)}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs transition",
                    active
                      ? `${priorityMeta.className} ring-1 ring-ink/15`
                      : "border border-line bg-white/70 text-ink-soft hover:text-ink",
                  ].join(" ")}
                >
                  {priorityMeta.label}
                </button>
              );
            })}
          </div>
        </div>

        {formError ? <p className="mt-4 text-sm text-clay">{formError}</p> : null}
        {error ? <p className="mt-4 text-sm text-clay">{error}</p> : null}

        <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            {compassCreateCopy.cancel}
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? compassCreateCopy.creating : compassCreateCopy.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
