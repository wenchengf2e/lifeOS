import { useEffect, useState } from "react";
import {
  daysInMonth,
  isToday,
  monthLabel,
  mondayOffset,
  pad2,
  parseDateKey,
  todayKey,
} from "../lib/date";

const WEEK_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

type Props = {
  selectedDate: string;
  onSelect: (date: string) => void;
  entryDates: Set<string>;
  doneDates: Set<string>;
};

export function MonthCalendar({ selectedDate, onSelect, entryDates, doneDates }: Props) {
  const selected = parseDateKey(selectedDate);
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  useEffect(() => {
    const date = parseDateKey(selectedDate);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  }, [selectedDate]);

  const totalDays = daysInMonth(viewYear, viewMonth);
  const offset = mondayOffset(viewYear, viewMonth);
  const today = todayKey();

  function moveMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-ink-soft transition hover:bg-white/80 hover:text-ink"
          aria-label="上个月"
        >
          ‹
        </button>
        <div className="text-sm font-medium tracking-wide text-ink">
          {monthLabel(viewYear, viewMonth)}
        </div>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-ink-soft transition hover:bg-white/80 hover:text-ink"
          aria-label="下个月"
        >
          ›
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1">
        {WEEK_LABELS.map((label) => (
          <span key={label} className="py-1 text-center text-[11px] text-ink-soft/70">
            {label}
          </span>
        ))}

        {Array.from({ length: offset }).map((_, index) => (
          <span key={`blank-${index}`} />
        ))}

        {Array.from({ length: totalDays }).map((_, index) => {
          const day = index + 1;
          const dateKey = `${viewYear}-${pad2(viewMonth + 1)}-${pad2(day)}`;
          const hasEntry = entryDates.has(dateKey);
          const isDone = doneDates.has(dateKey);
          const isSelected = dateKey === selectedDate;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelect(dateKey)}
              aria-label={dateKey}
              className={[
                "relative flex aspect-square items-center justify-center rounded-xl text-[13px] transition",
                isSelected
                  ? "bg-ink text-paper shadow-sm"
                  : isDone
                    ? "bg-moss-soft text-moss-dark hover:bg-moss-soft/80"
                    : hasEntry
                      ? "bg-white/80 text-ink hover:bg-white"
                      : "text-ink-soft hover:bg-white/70",
                isToday(dateKey) && !isSelected ? "ring-1 ring-moss/40" : "",
              ].join(" ")}
            >
              <span>{day}</span>
              {(hasEntry || isDone) && (
                <span
                  className={[
                    "absolute bottom-1.5 h-1 w-1 rounded-full",
                    isSelected ? "bg-paper" : isDone ? "bg-moss" : "bg-clay/70",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] text-ink-soft">
        <button
          type="button"
          onClick={() => onSelect(today)}
          className="rounded-full px-2 py-1 transition hover:bg-white/80 hover:text-ink"
        >
          回到今天
        </button>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full bg-clay/70" /> 有记录
          </span>
          <span className="flex items-center gap-1">
            <i className="h-1.5 w-1.5 rounded-full bg-moss" /> 计入打卡
          </span>
        </div>
      </div>
    </div>
  );
}
