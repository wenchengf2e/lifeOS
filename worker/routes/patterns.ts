import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { patterns } from "../db/schema";
import { mapPattern } from "../db/queries";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  trigger: z.string().max(4000).optional(),
  reaction: z.string().max(4000).optional(),
  payoff: z.string().max(4000).optional(),
  cost: z.string().max(4000).optional(),
  alternative: z.string().max(4000).optional(),
  evidence: z.array(dateKeySchema).max(400).optional(),
  status: z.enum(["watching", "verified", "retired"]).optional(),
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  trigger: z.string().max(4000).optional(),
  reaction: z.string().max(4000).optional(),
  payoff: z.string().max(4000).optional(),
  cost: z.string().max(4000).optional(),
  alternative: z.string().max(4000).optional(),
  evidence: z.array(dateKeySchema).max(400).optional(),
  status: z.enum(["watching", "verified", "retired"]).optional(),
});

app.get("/", async (c) => {
  const rows = await getDb(c.env.DB)
    .select()
    .from(patterns)
    .where(eq(patterns.userId, c.get("userEmail")))
    .orderBy(desc(patterns.updatedAt));

  return c.json({ patterns: rows.map(mapPattern) });
});

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const now = new Date().toISOString();
  const row: typeof patterns.$inferInsert = {
    id: crypto.randomUUID(),
    userId: c.get("userEmail"),
    title: parsed.data.title,
    trigger: parsed.data.trigger ?? "",
    reaction: parsed.data.reaction ?? "",
    payoff: parsed.data.payoff ?? "",
    cost: parsed.data.cost ?? "",
    alternative: parsed.data.alternative ?? "",
    evidence: JSON.stringify(parsed.data.evidence ?? []),
    status: parsed.data.status ?? "watching",
    createdAt: now,
    updatedAt: now,
  };

  await getDb(c.env.DB).insert(patterns).values(row);
  return c.json({ ok: true, pattern: mapPattern(row as typeof patterns.$inferSelect) }, 201);
});

app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [existing] = await db
    .select()
    .from(patterns)
    .where(and(eq(patterns.id, id), eq(patterns.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  const updates: Partial<typeof patterns.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.trigger !== undefined) updates.trigger = parsed.data.trigger;
  if (parsed.data.reaction !== undefined) updates.reaction = parsed.data.reaction;
  if (parsed.data.payoff !== undefined) updates.payoff = parsed.data.payoff;
  if (parsed.data.cost !== undefined) updates.cost = parsed.data.cost;
  if (parsed.data.alternative !== undefined) updates.alternative = parsed.data.alternative;
  if (parsed.data.evidence !== undefined) updates.evidence = JSON.stringify(parsed.data.evidence);
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;

  await db.update(patterns).set(updates).where(and(eq(patterns.id, id), eq(patterns.userId, user)));

  const [updated] = await db
    .select()
    .from(patterns)
    .where(and(eq(patterns.id, id), eq(patterns.userId, user)))
    .limit(1);

  return c.json({ ok: true, pattern: mapPattern(updated) });
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const user = c.get("userEmail");

  const [existing] = await db
    .select()
    .from(patterns)
    .where(and(eq(patterns.id, id), eq(patterns.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  await db.delete(patterns).where(and(eq(patterns.id, id), eq(patterns.userId, user)));
  return c.json({ ok: true });
});

export default app;
