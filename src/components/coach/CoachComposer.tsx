import { useState } from "react";
import type { KeyboardEvent } from "react";
import type { CoachSkillKey } from "../../../shared/types";
import { CHAT_INPUT_MAX_LENGTH, COACH_SKILLS, QUICK_REPLY_LIMIT } from "../../content/coach";

// Object.keys 的类型是 string[]，这里集中断言一次，顺序与 COACH_SKILLS 定义一致。
const SKILL_KEYS = Object.keys(COACH_SKILLS) as CoachSkillKey[];

export function CoachComposer({
  quickReplies,
  selectedSkill,
  sending,
  error,
  onSelectSkill,
  onSend,
}: {
  /** 当前最新一条教练消息给出的 2~4 个快捷回复。 */
  quickReplies: string[];
  selectedSkill: CoachSkillKey | null;
  sending: boolean;
  error: string | null;
  onSelectSkill: (skill: CoachSkillKey | null) => void;
  /** 返回 true 表示发送成功，输入框才会清空。 */
  onSend: (message: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState("");
  const tips = quickReplies.slice(0, QUICK_REPLY_LIMIT);

  async function submit(text: string) {
    const message = text.trim();
    if (!message || sending) return;
    const sent = await onSend(message);
    if (sent) setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    // 中文输入法组词时的回车不能直接发送。
    if (event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit(value);
  }

  return (
    <div>
      {tips.length > 0 ? (
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] text-ink-soft">小芽的建议回复 · 点一下直接发送</p>
          <div className="flex flex-wrap gap-1.5">
            {tips.map((reply) => (
              <button
                key={reply}
                type="button"
                className="rounded-full border border-moss/25 bg-moss-soft/70 px-3 py-1.5 text-xs text-moss-dark transition hover:bg-moss-soft disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void submit(reply)}
                disabled={sending}
              >
                {reply}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={selectedSkill === null}
          className={[
            "rounded-full border px-2.5 py-1 text-[11px] transition",
            selectedSkill === null
              ? "border-ink bg-ink text-paper"
              : "border-line bg-white/70 text-ink-soft hover:border-moss/40 hover:text-ink",
          ].join(" ")}
          onClick={() => onSelectSkill(null)}
        >
          自动路由
        </button>
        {SKILL_KEYS.map((key) => {
          const skill = COACH_SKILLS[key];
          const active = selectedSkill === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              title={skill.tagline}
              className={[
                "rounded-full border px-2.5 py-1 text-[11px] transition",
                active
                  ? "border-moss/40 bg-moss-soft text-moss-dark"
                  : "border-line bg-white/70 text-ink-soft hover:border-moss/40 hover:text-ink",
              ].join(" ")}
              onClick={() => onSelectSkill(active ? null : key)}
            >
              {skill.icon} {skill.label}
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1">
          <span className="sr-only">对教练说</span>
          <textarea
            className="field min-h-[4.5rem] resize-y"
            rows={2}
            maxLength={CHAT_INPUT_MAX_LENGTH}
            placeholder="此刻最想说的那句话…（Enter 发送，Shift + Enter 换行）"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
        </label>
        <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
          <span className="text-[11px] tabular-nums text-ink-soft/70">
            {value.length} / {CHAT_INPUT_MAX_LENGTH}
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void submit(value)}
            disabled={sending || !value.trim()}
          >
            {sending ? "小芽正在想…" : "发送"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-2 text-xs leading-6 text-clay">{error}</p> : null}
    </div>
  );
}
