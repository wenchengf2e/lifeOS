/**
 * Fields that make a day count as a check-in.
 *
 * `plan` is the pre-action half of the daily loop. Counting it means writing
 * the morning plan alone already registers the day, so the practice is not
 * gated behind an evening review that may never happen.
 */
export const CHECKIN_FIELD_KEYS = ["plan", "q1", "q2", "q3", "q4", "q5", "q6"] as const;

export type CheckinFieldKey = (typeof CHECKIN_FIELD_KEYS)[number];

export type CheckinData = {
  plan?: string;
  q1?: string;
  q2?: string;
  q3?: string;
  q4?: string;
  q5?: string;
  q6?: string;
  review?: string;
};

export type DocumentData = {
  notes?: string;
  _updated?: string;
  [key: string]: unknown;
};

export type CheckinEntry = {
  date: string;
  data: CheckinData;
  updatedAt: string;
};

export type DocumentEntry = {
  module: string;
  key: string;
  data: DocumentData;
  updatedAt: string;
};

export type ItemEntry = {
  id: string;
  module: string;
  content: string;
  itemDate: string | null;
  done: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BootstrapResponse = {
  user: { email: string };
  checkins: CheckinEntry[];
  documents: DocumentEntry[];
  items: ItemEntry[];
};

export type ExportResponse = BootstrapResponse & {
  version: 1;
  exportedAt: string;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  issues?: unknown;
};
