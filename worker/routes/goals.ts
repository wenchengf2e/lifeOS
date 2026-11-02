import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { goals } from "../db/schema";
import { mapGoal } from "../db/queries";
import { GOAL_STATUSES, normalizeGoalData } from "../../shared/types";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const goalIdSchema = z.string().min(1).max(64);
const domainSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);
const statusSchema = z.enum(GOAL_STATUSES);
const dataSchema = z.record(z.string(), z.unknown());

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  domain: domainSchema.optional(),
  status: statusSchema.optional(),
  data: dataSchema.optional(),
});

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  domain: domainSchema.optional(),
  status: statusSchema.optional(),
  data: dataSchema.optional(),
});

/** 目标 data 是整段 JSON，给一个上限，避免误传超大内容。 */
const MAX_DATA_LENGTH = 200_000;

function serializeData(raw: unknown): { data: string } | { error: string } {
  const data = JSON.stringify(normalizeGoalData(raw));
  if (data.length > MAX_DATA_LENGTH) {
    return { error: "payload_too_large" };
  }
  return { data };
}

app.get("/", async (c) => {
  const rows = await getDb(c.env.DB)
    .select()
    .from(goals)
    .where(eq(goals.userId, c.get("userEmail")))
    .orderBy(desc(goals.updatedAt));

  return c.json({ goals: rows.map(mapGoal) });
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!goalIdSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const [row] = await getDb(c.env.DB)
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, c.get("userEmail"))))
    .limit(1);

  return c.json({ goal: row ? mapGoal(row) : null });
});

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const serialized = serializeData(parsed.data.data);
  if ("error" in serialized) {
    return c.json({ error: serialized.error }, 413);
  }

  const now = new Date().toISOString();
  const row: typeof goals.$inferInsert = {
    id: crypto.randomUUID(),
    userId: c.get("userEmail"),
    title: parsed.data.title,
    domain: parsed.data.domain ?? "other",
    status: parsed.data.status ?? "active",
    data: serialized.data,
    createdAt: now,
    updatedAt: now,
  };

  await getDb(c.env.DB).insert(goals).values(row);

  return c.json({ ok: true, goal: mapGoal(row as typeof goals.$inferSelect) }, 201);
});

app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  if (!goalIdSchema.safeParse(id).success) {
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
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  const updates: Partial<typeof goals.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.domain !== undefined) updates.domain = parsed.data.domain;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.data !== undefined) {
    const serialized = serializeData(parsed.data.data);
    if ("error" in serialized) {
      return c.json({ error: serialized.error }, 413);
    }
    updates.data = serialized.data;
  }

  await db.update(goals).set(updates).where(and(eq(goals.id, id), eq(goals.userId, user)));

  const [updated] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, user)))
    .limit(1);

  return c.json({ ok: true, goal: mapGoal(updated) });
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  if (!goalIdSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [existing] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, user)));
  return c.json({ ok: true });
});

export default app;
