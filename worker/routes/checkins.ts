import { Hono } from "hono";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { checkins } from "../db/schema";
import { mapCheckin } from "../db/queries";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const checkinSchema = z.object({
  plan: z.string().max(20000).optional(),
  e1: z.string().max(20000).optional(),
  e2: z.string().max(20000).optional(),
  e3: z.string().max(20000).optional(),
  e4: z.string().max(20000).optional(),
  e5: z.string().max(20000).optional(),
  q1: z.string().max(20000).optional(),
  q2: z.string().max(20000).optional(),
  q3: z.string().max(20000).optional(),
  q4: z.string().max(20000).optional(),
  q5: z.string().max(20000).optional(),
  q6: z.string().max(20000).optional(),
  review: z.string().max(40000).optional(),
});

app.get("/", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (from && !dateSchema.safeParse(from).success) {
    return c.json({ error: "invalid_from" }, 400);
  }
  if (to && !dateSchema.safeParse(to).success) {
    return c.json({ error: "invalid_to" }, 400);
  }

  const conditions = [eq(checkins.userId, c.get("userEmail"))];
  if (from) conditions.push(gte(checkins.checkinDate, from));
  if (to) conditions.push(lte(checkins.checkinDate, to));

  const rows = await getDb(c.env.DB)
    .select()
    .from(checkins)
    .where(and(...conditions))
    .orderBy(checkins.checkinDate);

  return c.json({ checkins: rows.map(mapCheckin) });
});

app.get("/:date", async (c) => {
  const date = c.req.param("date");
  if (!dateSchema.safeParse(date).success) {
    return c.json({ error: "invalid_date" }, 400);
  }

  const [row] = await getDb(c.env.DB)
    .select()
    .from(checkins)
    .where(and(eq(checkins.userId, c.get("userEmail")), eq(checkins.checkinDate, date)))
    .limit(1);

  return c.json({ checkin: row ? mapCheckin(row) : null });
});

app.put("/:date", async (c) => {
  const date = c.req.param("date");
  if (!dateSchema.safeParse(date).success) {
    return c.json({ error: "invalid_date" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const now = new Date().toISOString();
  const user = c.get("userEmail");
  const data = JSON.stringify(parsed.data);

  await getDb(c.env.DB)
    .insert(checkins)
    .values({
      id: crypto.randomUUID(),
      userId: user,
      checkinDate: date,
      data,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [checkins.userId, checkins.checkinDate],
      set: { data, updatedAt: now },
    });

  return c.json({ ok: true, date, updatedAt: now });
});

export default app;
