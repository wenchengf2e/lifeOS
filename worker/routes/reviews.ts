import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { reviews } from "../db/schema";
import { mapReview } from "../db/queries";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const periodTypeSchema = z.enum(["week", "month"]);
const periodKeySchema = z.string().regex(/^\d{4}-(W\d{2}|\d{2})$/, "Expected 2026-W44 or 2026-11");

const reviewSchema = z.object({
  focus: z.array(dateKeySchema).max(3).optional(),
  wins: z.string().max(20000).optional(),
  connection: z.string().max(20000).optional(),
  abstraction: z.string().max(20000).optional(),
  actions: z.array(z.string().max(4000)).max(20).optional(),
  patternIds: z.array(z.string().max(64)).max(20).optional(),
  controllable: z.record(dateKeySchema, z.enum(["in", "out"])).optional(),
  reframe: z.record(dateKeySchema, z.string().max(20000)).optional(),
});

app.get("/", async (c) => {
  const type = c.req.query("type");
  if (type !== undefined && !periodTypeSchema.safeParse(type).success) {
    return c.json({ error: "invalid_type" }, 400);
  }

  const conditions = [eq(reviews.userId, c.get("userEmail"))];
  if (type) conditions.push(eq(reviews.periodType, type));

  const rows = await getDb(c.env.DB)
    .select()
    .from(reviews)
    .where(and(...conditions))
    .orderBy(desc(reviews.periodKey));

  return c.json({ reviews: rows.map(mapReview) });
});

app.get("/:type/:key", async (c) => {
  const type = c.req.param("type");
  const key = c.req.param("key");

  if (!periodTypeSchema.safeParse(type).success || !periodKeySchema.safeParse(key).success) {
    return c.json({ error: "invalid_period" }, 400);
  }

  const [row] = await getDb(c.env.DB)
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, c.get("userEmail")),
        eq(reviews.periodType, type),
        eq(reviews.periodKey, key),
      ),
    )
    .limit(1);

  return c.json({ review: row ? mapReview(row) : null });
});

app.put("/:type/:key", async (c) => {
  const type = c.req.param("type");
  const key = c.req.param("key");

  if (!periodTypeSchema.safeParse(type).success || !periodKeySchema.safeParse(key).success) {
    return c.json({ error: "invalid_period" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const now = new Date().toISOString();
  const user = c.get("userEmail");
  const data = JSON.stringify({ focus: [], ...parsed.data });

  await getDb(c.env.DB)
    .insert(reviews)
    .values({
      id: crypto.randomUUID(),
      userId: user,
      periodType: type,
      periodKey: key,
      data,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [reviews.userId, reviews.periodType, reviews.periodKey],
      set: { data, updatedAt: now },
    });

  return c.json({ ok: true, periodType: type, periodKey: key, updatedAt: now });
});

export default app;
