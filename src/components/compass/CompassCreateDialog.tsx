import { useEffect, useRef, useState } from "react";
import type { TelosCategory } from "../../../shared/types";
import { compassCategoryMeta, compassCreateCopy, compassCreatePlaceholder } from "../../content/compass";

type CompassCreateDialogProps = {
  category: TelosCategory;
  parentTitle: string | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (title: string) => void | Promise<void>;
};

export function CompassCreateDialog({
  category,
  parentTitle,
  submitting,
  error,
  onClose,
  onSubmit,
}: CompassCreateDialogProps) {
  const meta = compassCategoryMeta[category];
  const [title, setTitle] = useState("");
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
    await onSubmit(content);
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
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">
              {meta.english} · New
            </p>
            <h2 id="compass-create-title" className="mt-1 text-2xl text-ink">
              {compassCreateCopy.title} · {meta.label}
            </h2>
            <p className="mt-2 text-sm leading-7 text-ink-soft">{compassCreateCopy.desc}</p>
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

        <p className="mt-4 rounded-2xl bg-paper-deep/55 px-4 py-3 text-xs leading-6 text-ink-soft">
          {parentTitle ? (
            <>
              {compassCreateCopy.childHintPrefix}「{parentTitle}」{compassCreateCopy.childHintSuffix}
            </>
          ) : (
            compassCreateCopy.rootHint
          )}
        </p>

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
