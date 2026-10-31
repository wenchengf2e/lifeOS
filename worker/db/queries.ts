import { desc, eq } from "drizzle-orm";
import type { CheckinData, DocumentData, CheckinEntry, DocumentEntry, ItemEntry } from "../../shared/types";
import { getDb } from "./client";
import { checkins, documents, items } from "./schema";

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

export async function loadAll(db: Db, userId: string) {
  const [checkinRows, documentRows, itemRows] = await Promise.all([
    db.select().from(checkins).where(eq(checkins.userId, userId)).orderBy(desc(checkins.checkinDate)),
    db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.updatedAt)),
    db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt)),
  ]);

  return {
    checkins: checkinRows.map(mapCheckin),
    documents: documentRows.map(mapDocument),
    items: itemRows.map(mapItem),
  };
}
