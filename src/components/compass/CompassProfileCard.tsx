import { useEffect, useRef, useState } from "react";
import { useSaveTelosProfile, useTelosProfile } from "../../lib/queries";

type ProfileDraft = {
  mission: string;
  currentState: string;
  idealState: string;
};

const PROFILE_FIELDS = [
  {
    key: "mission",
    label: "使命",
    hint: "我在解决什么问题？我想让什么变得不同？",
    placeholder: "例：帮助自己建立一套在不确定性里仍然能执行的决策系统，并把过程写下来。",
  },
  {
    key: "currentState",
    label: "当前状态",
    hint: "客观描述现在的处境、资源与约束，不评价好坏。",
    placeholder: "例：有稳定的工作与现金流，但时间被切得很碎；投资上仍然依赖情绪判断。",
  },
  {
    key: "idealState",
    label: "理想状态",
    hint: "如果一切顺利，3–5 年后是什么样子？",
    placeholder: "例：有一套自己验证过的规则，能在回撤时保持执行；每天有固定的深度工作时间。",
  },
] as const;

export function CompassProfileCard() {
  const { data: profile, isLoading, error, refetch, isFetching } = useTelosProfile();
  const saveProfile = useSaveTelosProfile();

  const [draft, setDraft] = useState<ProfileDraft>({
    mission: "",
    currentState: "",
    idealState: "",
  });
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  // 保存期间继续输入时，旧响应不能把草稿标记成已保存。
  const changeVersion = useRef(0);

  useEffect(() => {
    // 只在没有未保存改动时同步服务端档案，避免覆盖正在输入的内容。
    if (!profile || dirtyRef.current) return;
    setDraft({
      mission: profile.mission,
      currentState: profile.currentState,
      idealState: profile.idealState,
    });
  }, [profile]);

  function updateField(key: keyof ProfileDraft, value: string) {
    changeVersion.current += 1;
    setDraft((prev) => ({ ...prev, [key]: value }));
    dirtyRef.current = true;
    setDirty(true);
    setSaveError(null);
  }

  async function handleSave() {
    setSaveError(null);
    const version = changeVersion.current;
    try {
      await saveProfile.mutateAsync(draft);
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

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-moss">Profile</p>
          <h2 className="mt-1 text-xl text-ink">罗盘档案</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-soft">
            三段文字描述你为什么做这件事、现在在哪里、想去哪里。历史不在这里堆叠，交给快照。
          </p>
        </div>
        <span className="rounded-full bg-paper-deep/80 px-2.5 py-1 text-[11px] text-ink-soft">
          v{profile?.version ?? 1}
        </span>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl bg-clay/10 p-3 text-xs leading-6 text-clay">
          档案读取失败：{error instanceof Error ? error.message : "未知错误"}
          <button
            type="button"
            className="ml-2 underline-offset-2 hover:underline"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? "读取中…" : "重新读取"}
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-xs text-ink-soft">正在读取档案…</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {PROFILE_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="block text-sm font-medium text-ink">{field.label}</span>
              <span className="mt-1 block text-[11px] leading-6 text-ink-soft">{field.hint}</span>
              <textarea
                className="field mt-2 resize-y"
                rows={4}
                maxLength={20000}
                placeholder={field.placeholder}
                value={draft[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
              />
            </label>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
          {saveProfile.isPending ? "保存中…" : dirty ? "保存档案" : savedAt ? "已保存 ✓" : "保存档案"}
        </button>
      </div>
    </section>
  );
}
