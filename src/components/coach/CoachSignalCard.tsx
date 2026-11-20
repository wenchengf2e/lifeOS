import type { CoachSignal } from "../../../shared/types";
import { COACH_SKILLS } from "../../content/coach";

export function CoachSignalCard({
  signal,
  busy = false,
  onSelect,
}: {
  signal: CoachSignal;
  busy?: boolean;
  onSelect: (signal: CoachSignal) => void;
}) {
  const skill = COACH_SKILLS[signal.skill];

  return (
    <button
      type="button"
      className="card flex h-full w-full flex-col p-5 text-left transition hover:-translate-y-0.5 hover:border-moss/30 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
      onClick={() => onSelect(signal)}
      disabled={busy}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="chip">
          {skill.icon} {skill.label}
        </span>
        <span className="text-[11px] text-ink-soft">主动洞察</span>
      </div>

      <p className="mt-3 text-base font-medium leading-6 text-ink">{signal.title}</p>
      <p className="mt-2 flex-1 text-sm leading-7 text-ink-soft">{signal.observation}</p>

      {signal.quickOptions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {signal.quickOptions.map((option) => (
            <span
              key={option}
              className="rounded-full border border-line/80 bg-white/60 px-2.5 py-1 text-[11px] text-ink-soft"
            >
              {option}
            </span>
          ))}
        </div>
      ) : null}

      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-moss-dark">
        {busy ? "小芽正在接入上下文…" : "和教练聊聊 →"}
      </span>
    </button>
  );
}
