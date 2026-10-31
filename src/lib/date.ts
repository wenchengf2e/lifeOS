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
