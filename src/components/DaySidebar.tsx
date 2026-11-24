import { useMemo, useState } from "react";
import type { CheckinEntry } from "../../shared/types";
import { MonthCalendar } from "./MonthCalendar";
import { formatDateCN, shiftDate, todayKey } from "../lib/date";
import { doneDateSet, entryDateSet } from "../lib/stats";

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

  // 移动端日历默认收起，需要看记录分布时再展开；桌面端始终展示。
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateLabel =
    date === todayKey()
      ? `今天 · ${formatDateCN(date, { withWeekday: true })}`
      : formatDateCN(date, { withWeekday: true, withYear: true });

  function handleSelectDate(nextDate: string) {
    onDateChange(nextDate);
    setCalendarOpen(false);
  }

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

        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">选择日期</span>
            <input
              type="date"
              value={date}
              onChange={(event) => onDateChange(event.target.value || todayKey())}
              className="field px-3 py-2 text-xs"
            />
          </label>
          <button
            type="button"
            className="btn-secondary h-11 shrink-0 px-3 text-xs lg:hidden"
            onClick={() => setCalendarOpen((open) => !open)}
            aria-expanded={calendarOpen}
            aria-controls="daily-calendar"
          >
            {calendarOpen ? "收起日历" : "展开日历"}
          </button>
        </div>

        <div
          id="daily-calendar"
          className={`mt-5 ${calendarOpen ? "" : "hidden lg:block"}`}
        >
          <MonthCalendar
            selectedDate={date}
            onSelect={handleSelectDate}
            entryDates={entryDates}
            doneDates={doneDates}
          />
        </div>
      </section>
    </aside>
  );
}
