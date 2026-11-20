import { useEffect, useRef, useState } from "react";
import type { CoachProfileData } from "../../../shared/types";
import { PROFILE_FIELDS, type CoachProfileField } from "../../content/coach";
import { useSaveCoachProfile } from "../../lib/queries";

type TextFieldKey = "routines" | "energyWindows" | "preferences";
type ListFieldKey = "executionClues" | "longTermInsights";

type ProfileDraft = {
  routines: string;
  energyWindows: string;
  preferences: string;
  executionClues: string[];
  longTermInsights: string[];
};

function toDraft(profile: CoachProfileData): ProfileDraft {
  return {
    routines: profile.routines,
    energyWindows: profile.energyWindows,
    preferences: profile.preferences,
    executionClues: profile.executionClues,
    longTermInsights: profile.longTermInsights,
  };
}

function isTextField(field: CoachProfileField): field is CoachProfileField & { key: TextFieldKey } {
  return field.kind === "text";
}

function isListField(field: CoachProfileField): field is CoachProfileField & { key: ListFieldKey } {
  return field.kind === "list";
}

export function CoachProfilePanel({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile: CoachProfileData;
  onClose: () => void;
}) {
  const saveProfile = useSaveCoachProfile();

  const [draft, setDraft] = useState<ProfileDraft>(() => toDraft(profile));
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  // 保存期间继续输入时，旧响应不能把草稿标记成已保存。
  const changeVersion = useRef(0);

  useEffect(() => {
    if (!open) return;
    if (dirtyRef.current) return;
    setDraft(toDraft(profile));
    setSavedAt(null);
    setSaveError(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  function markDirty() {
    changeVersion.current += 1;
    dirtyRef.current = true;
    setDirty(true);
    setSaveError(null);
  }

  function updateText(key: TextFieldKey, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    markDirty();
  }

  function updateItem(key: ListFieldKey, index: number, value: string) {
    setDraft((prev) => ({
      ...prev,
      [key]: prev[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
    markDirty();
  }

  function addItem(key: ListFieldKey) {
    setDraft((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
    markDirty();
  }

  function removeItem(key: ListFieldKey, index: number) {
    setDraft((prev) => ({ ...prev, [key]: prev[key].filter((_, itemIndex) => itemIndex !== index) }));
    markDirty();
  }

  async function handleSave() {
    setSaveError(null);
    const version = changeVersion.current;
    try {
      await saveProfile.mutateAsync({
        routines: draft.routines,
        energyWindows: draft.energyWindows,
        preferences: draft.preferences,
        executionClues: draft.executionClues.map((item) => item.trim()).filter(Boolean),
        longTermInsights: draft.longTermInsights.map((item) => item.trim()).filter(Boolean),
      });
      // 保存期间又输入了新内容：保持未保存状态，让用户再保存一次。
      if (changeVersion.current !== version) return;
      dirtyRef.current = false;
      setDirty(false);
      setSavedAt(
        new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : "保存失败，请重试");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/35 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-profile-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-paper shadow-2xl sm:rounded-l-[2rem]">
        <div className="flex items-start justify-between gap-4 border-b border-line/60 px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-moss">Coach Profile</p>
            <h2 id="coach-profile-title" className="mt-1 text-2xl text-ink">
              我的教练画像
            </h2>
            <p className="mt-1 text-xs leading-6 text-ink-soft">
              这是小芽对你的长期理解，只在确认后更新。随时可以手动修改。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-paper-deep/80 px-2.5 py-1 text-[11px] text-ink-soft">
              v{profile.version}
            </span>
            <button
              type="button"
              className="btn-ghost text-xl"
              onClick={onClose}
              aria-label="关闭教练画像"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 px-5 py-5 sm:px-7">
          {PROFILE_FIELDS.filter(isTextField).map((field) => (
            <label key={field.key} className="block">
              <span className="block text-sm font-medium text-ink">{field.label}</span>
              <span className="mt-1 block text-[11px] leading-6 text-ink-soft">{field.hint}</span>
              <textarea
                className="field mt-2 min-h-[7rem] resize-y"
                rows={4}
                maxLength={20000}
                placeholder={field.placeholder}
                value={draft[field.key]}
                onChange={(event) => updateText(field.key, event.target.value)}
              />
            </label>
          ))}

          {PROFILE_FIELDS.filter(isListField).map((field) => (
            <div key={field.key}>
              <p className="text-sm font-medium text-ink">{field.label}</p>
              <p className="mt-1 text-[11px] leading-6 text-ink-soft">{field.hint}</p>
              <div className="mt-2 space-y-2">
                {draft[field.key].length === 0 ? (
                  <p className="rounded-xl border border-dashed border-line bg-white/40 px-3 py-2 text-xs text-ink-soft/80">
                    还没有记录。
                  </p>
                ) : null}
                {draft[field.key].map((item, index) => (
                  <div key={`${field.key}-${index}`} className="flex items-start gap-1.5">
                    <input
                      className="field min-w-0 flex-1"
                      maxLength={2000}
                      placeholder={field.placeholder}
                      value={item}
                      onChange={(event) => updateItem(field.key, index, event.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-ghost shrink-0 px-2 py-2 text-lg"
                      onClick={() => removeItem(field.key, index)}
                      aria-label="删除这一条"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn-secondary px-3 py-1.5 text-xs"
                  onClick={() => addItem(field.key)}
                >
                  ＋ 添加一条
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 bg-paper/95 px-5 py-4 backdrop-blur sm:px-7">
          <p className="text-xs text-ink-soft">
            {saveError ? (
              <span className="text-clay">保存失败：{saveError}</span>
            ) : saveProfile.isPending ? (
              "保存中…"
            ) : dirty ? (
              "有未保存的改动"
            ) : savedAt ? (
              <span className="text-moss-dark">已保存 · {savedAt}</span>
            ) : (
              "改动需要手动保存"
            )}
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleSave()}
            disabled={saveProfile.isPending || !dirty}
          >
            {saveProfile.isPending ? "保存中…" : dirty ? "保存画像" : savedAt ? "已保存 ✓" : "保存画像"}
          </button>
        </div>
      </div>
    </div>
  );
}
