import { desc, eq } from "drizzle-orm";
import type {
  CheckinData,
  DocumentData,
  CheckinEntry,
  DocumentEntry,
  GoalEntry,
  GoalStatus,
  ItemEntry,
  PatternEntry,
  PatternStatus,
  ReviewData,
  ReviewEntry,
  ReviewPeriodType,
} from "../../shared/types";
import { normalizeGoalData } from "../../shared/types";
import { getDb } from "./client";
import { checkins, documents, goals, items, patterns, reviews } from "./schema";

type Db = ReturnType<typeof getDb>;

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapCheckin(row: typeof checkins.$inferSelect): CheckinEntry {
  return {
    date: row.checkinDate,
    data: parseJson<CheckinData>(row.data, {}),
    updatedAt: row.updatedAt,
  };
}

export function mapDocument(row: typeof documents.$inferSelect): DocumentEntry {
  return {
    module: row.module,
    key: row.docKey,
    data: parseJson<DocumentData>(row.data, {}),
    updatedAt: row.updatedAt,
  };
}

export function mapItem(row: typeof items.$inferSelect): ItemEntry {
  return {
    id: row.id,
    module: row.module,
    content: row.content,
    itemDate: row.itemDate,
    done: row.done,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapReview(row: typeof reviews.$inferSelect): ReviewEntry {
  const data = parseJson<Partial<ReviewData>>(row.data, {});
  return {
    periodType: row.periodType as ReviewPeriodType,
    periodKey: row.periodKey,
    data: { focus: [], ...data },
    updatedAt: row.updatedAt,
  };
}

export function mapPattern(row: typeof patterns.$inferSelect): PatternEntry {
  return {
    id: row.id,
    title: row.title,
    trigger: row.trigger ?? "",
    reaction: row.reaction ?? "",
    payoff: row.payoff ?? "",
    cost: row.cost ?? "",
    alternative: row.alternative ?? "",
    evidence: parseJson<string[]>(row.evidence, []),
    status: row.status as PatternStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapGoal(row: typeof goals.$inferSelect): GoalEntry {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    status: row.status as GoalStatus,
    data: normalizeGoalData(parseJson<unknown>(row.data, {})),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function loadAll(db: Db, userId: string) {
  const [checkinRows, documentRows, itemRows, reviewRows, patternRows, goalRows] = await Promise.all([
    db.select().from(checkins).where(eq(checkins.userId, userId)).orderBy(desc(checkins.checkinDate)),
    db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.updatedAt)),
    db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt)),
    db.select().from(reviews).where(eq(reviews.userId, userId)).orderBy(desc(reviews.periodKey)),
    db.select().from(patterns).where(eq(patterns.userId, userId)).orderBy(desc(patterns.updatedAt)),
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.updatedAt)),
  ]);

  return {
    checkins: checkinRows.map(mapCheckin),
    documents: documentRows.map(mapDocument),
    items: itemRows.map(mapItem),
    reviews: reviewRows.map(mapReview),
    patterns: patternRows.map(mapPattern),
    goals: goalRows.map(mapGoal),
  };
}
