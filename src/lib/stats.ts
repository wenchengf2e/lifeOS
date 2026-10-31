import { CHECKIN_FIELD_KEYS, type CheckinData, type CheckinEntry } from "../../shared/types";
import { pad2, shiftDate, todayKey } from "./date";

export function isCountedDone(data: CheckinData) {
  return CHECKIN_FIELD_KEYS.some((key) => String(data[key] ?? "").trim().length > 0);
}

export function doneDateSet(checkins: CheckinEntry[]) {
  return new Set(checkins.filter((entry) => isCountedDone(entry.data)).map((entry) => entry.date));
}

export function entryDateSet(checkins: CheckinEntry[]) {
  return new Set(checkins.map((entry) => entry.date));
}

export function monthDoneCount(checkins: CheckinEntry[], year: number, monthIndex: number) {
  const prefix = `${year}-${pad2(monthIndex + 1)}-`;
  return checkins.filter((entry) => entry.date.startsWith(prefix) && isCountedDone(entry.data)).length;
}

export function totalDoneCount(checkins: CheckinEntry[]) {
  return checkins.filter((entry) => isCountedDone(entry.data)).length;
}

export function currentStreak(checkins: CheckinEntry[]) {
  const done = doneDateSet(checkins);
  let cursor = todayKey();
  if (!done.has(cursor)) cursor = shiftDate(cursor, -1);

  let streak = 0;
  while (done.has(cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
}
