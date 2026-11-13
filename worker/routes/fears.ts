import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { fears } from "../db/schema";
import { mapFear } from "../db/queries";
import { normalizeFearData } from "../../shared/types";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const fearIdSchema = z.string().min(1).max(64);
const dataSchema = z.record(z.string(), z.unknown());

const createSchema = z.object({
  data: dataSchema.optional(),
});

const patchSchema = z.object({
  data: dataSchema,
});

/** 恐惧 data 是整段 JSON，给一个上限，避免误传超大内容。 */
const MAX_DATA_LENGTH = 200_000;

function serializeData(raw: unknown): { data: string } | { error: string } {
  const data = JSON.stringify(normalizeFearData(raw));
  if (data.length > MAX_DATA_LENGTH) {
    return { error: "payload_too_large" };
  }
  return { data };
}

app.get("/", async (c) => {
  const rows = await getDb(c.env.DB)
    .select()
    .from(fears)
    .where(eq(fears.userId, c.get("userEmail")))
    .orderBy(desc(fears.updatedAt));

  return c.json({ fears: rows.map(mapFear) });
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!fearIdSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const [row] = await getDb(c.env.DB)
    .select()
    .from(fears)
    .where(and(eq(fears.id, id), eq(fears.userId, c.get("userEmail"))))
    .limit(1);

  return c.json({ fear: row ? mapFear(row) : null });
});

app.post("/", async (c) => {
  // 允许空 body：服务端兜底成空五步，UI 在创建弹窗里要求第 1 步非空。
  const body = await c.req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const serialized = serializeData(parsed.data.data);
  if ("error" in serialized) {
    return c.json({ error: serialized.error }, 413);
  }

  const now = new Date().toISOString();
  const row: typeof fears.$inferInsert = {
    id: crypto.randomUUID(),
    userId: c.get("userEmail"),
    data: serialized.data,
    createdAt: now,
    updatedAt: now,
  };

  await getDb(c.env.DB).insert(fears).values(row);

  return c.json({ ok: true, fear: mapFear(row as typeof fears.$inferSelect) }, 201);
});

app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  if (!fearIdSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [existing] = await db
    .select()
    .from(fears)
    .where(and(eq(fears.id, id), eq(fears.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  const serialized = serializeData(parsed.data.data);
  if ("error" in serialized) {
    return c.json({ error: serialized.error }, 413);
  }

  await db
    .update(fears)
    .set({ data: serialized.data, updatedAt: new Date().toISOString() })
    .where(and(eq(fears.id, id), eq(fears.userId, user)));

  const [updated] = await db
    .select()
    .from(fears)
    .where(and(eq(fears.id, id), eq(fears.userId, user)))
    .limit(1);

  if (!updated) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json({ ok: true, fear: mapFear(updated) });
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  if (!fearIdSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [existing] = await db
    .select()
    .from(fears)
    .where(and(eq(fears.id, id), eq(fears.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  await db.delete(fears).where(and(eq(fears.id, id), eq(fears.userId, user)));
  return c.json({ ok: true });
});

export default app;
