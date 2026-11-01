import { useMemo } from "react";
import type { CheckinEntry } from "../../shared/types";
import { MonthCalendar } from "./MonthCalendar";
import { formatDateCN, parseDateKey, shiftDate, todayKey } from "../lib/date";
import { currentStreak, doneDateSet, entryDateSet, monthDoneCount, totalDoneCount } from "../lib/stats";

export function DaySidebar({
  date,
  onDateChange,
  hasEntry,
  checkins,
}: {
  date: string;
  onDateChange: (date: string) => void;
  hasEntry: boolean;
  checkins: CheckinEntry[];
}) {
  const entryDates = useMemo(() => entryDateSet(checkins), [checkins]);
  const doneDates = useMemo(() => doneDateSet(checkins), [checkins]);

  const selected = parseDateKey(date);
  const monthStats = useMemo(
    () => monthDoneCount(checkins, selected.getFullYear(), selected.getMonth()),
    [checkins, selected],
  );
  const streak = useMemo(() => currentStreak(checkins), [checkins]);
  const total = useMemo(() => totalDoneCount(checkins), [checkins]);

  const isCurrentMonth =
    selected.getFullYear() === new Date().getFullYear() &&
    selected.getMonth() === new Date().getMonth();

  const dateLabel =
    date === todayKey()
      ? `今天 · ${formatDateCN(date, { withWeekday: true })}`
      : formatDateCN(date, { withWeekday: true, withYear: true });

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn-ghost h-8 px-2.5"
            onClick={() => onDateChange(shiftDate(date, -1))}
            aria-label="前一天"
          >
            ‹
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-ink">{dateLabel}</p>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              {hasEntry ? "有记录" : "还没有记录"}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost h-8 px-2.5"
            onClick={() => onDateChange(shiftDate(date, 1))}
            aria-label="后一天"
          >
            ›
          </button>
        </div>

        <label className="block">
          <span className="sr-only">选择日期</span>
          <input
            type="date"
            value={date}
            onChange={(event) => onDateChange(event.target.value || todayKey())}
            className="field px-3 py-2 text-xs"
          />
        </label>

        <div className="mt-5">
          <MonthCalendar
            selectedDate={date}
            onSelect={onDateChange}
            entryDates={entryDates}
            doneDates={doneDates}
          />
        </div>
      </section>

      <section className="card grid grid-cols-3 divide-x divide-line/60 p-4 text-center">
        <div className="px-2">
          <p className="font-display text-2xl text-ink">{monthStats}</p>
          <p className="mt-1 text-[11px] text-ink-soft">
            {isCurrentMonth ? "本月打卡" : "该月打卡"}
          </p>
        </div>
        <div className="px-2">
          <p className="font-display text-2xl text-ink">{streak}</p>
          <p className="mt-1 text-[11px] text-ink-soft">连续天数</p>
        </div>
        <div className="px-2">
          <p className="font-display text-2xl text-ink">{total}</p>
          <p className="mt-1 text-[11px] text-ink-soft">累计打卡</p>
        </div>
      </section>
    </aside>
  );
}
