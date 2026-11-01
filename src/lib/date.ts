const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function parseDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function weekdayCN(key: string) {
  return WEEKDAYS[parseDateKey(key).getDay()];
}

export function formatDateCN(key: string, opts?: { withWeekday?: boolean; withYear?: boolean }) {
  const date = parseDateKey(key);
  const base = opts?.withYear
    ? `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
    : `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
  return opts?.withWeekday ? `${base} · ${WEEKDAYS[date.getDay()]}` : base;
}

export function shiftDate(key: string, deltaDays: number) {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + deltaDays);
  return toDateKey(date);
}

export function monthKeyOf(key: string) {
  return key.slice(0, 7);
}

export function monthLabel(year: number, monthIndex: number) {
  const names = [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ];
  return `${year} 年 ${names[monthIndex]}`;
}

export function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

// Monday-first offset for the first day of the month.
export function mondayOffset(year: number, monthIndex: number) {
  const day = new Date(year, monthIndex, 1).getDay();
  return (day + 6) % 7;
}

export function isToday(key: string) {
  return key === todayKey();
}

// ---- ISO 周（周一开始，跨年周归属由那周的周四决定） ----

function weekOneMonday(year: number) {
  const jan4 = new Date(year, 0, 4);
  const jan4DayNum = (jan4.getDay() + 6) % 7;
  return new Date(year, 0, 4 - jan4DayNum);
}

export function isoWeekKeyOf(dateKey: string) {
  const date = parseDateKey(dateKey);
  const dayNum = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayNum);

  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();

  const start = weekOneMonday(isoYear);
  const week = 1 + Math.round((monday.getTime() - start.getTime()) / (7 * 86400000));
  return `${isoYear}-W${pad2(week)}`;
}

export function isoWeekStart(weekKey: string) {
  const [yearStr, weekStr] = weekKey.split("-W");
  const start = weekOneMonday(Number(yearStr));
  const offset = (Number(weekStr) - 1) * 7;
  return toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset));
}

export function isoWeekDays(weekKey: string) {
  const start = isoWeekStart(weekKey);
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
}

export function isoWeekNumber(weekKey: string) {
  return Number(weekKey.split("-W")[1] ?? 0);
}

export function shiftWeekKey(weekKey: string, delta: number) {
  return isoWeekKeyOf(shiftDate(isoWeekStart(weekKey), delta * 7));
}

export function weekRangeLabel(weekKey: string) {
  const days = isoWeekDays(weekKey);
  return `${formatDateCN(days[0])} – ${formatDateCN(days[6])}`;
}
