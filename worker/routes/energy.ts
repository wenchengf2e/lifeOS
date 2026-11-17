import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { energySessions } from "../db/schema";
import { mapEnergySession } from "../db/queries";
import { ENERGY_TOOL_KEYS, normalizeEnergySessionData } from "../../shared/types";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const sessionIdSchema = z.string().min(1).max(64);
const dataSchema = z.record(z.string(), z.unknown());

const createSchema = z.object({
  tool: z.enum(ENERGY_TOOL_KEYS),
  data: dataSchema.optional(),
  completed: z.boolean().optional(),
});

const patchSchema = z
  .object({
    data: dataSchema.optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => value.data !== undefined || value.completed !== undefined, {
    message: "至少需要提供 data 或 completed",
  });

/** 一次练习的答案是一整段 JSON，给一个上限，避免误传超大内容。 */
const MAX_DATA_LENGTH = 200_000;

function serializeData(raw: unknown): { data: string } | { error: string } {
  const data = JSON.stringify(normalizeEnergySessionData(raw));
  if (data.length > MAX_DATA_LENGTH) {
    return { error: "payload_too_large" };
  }
  return { data };
}

app.get("/", async (c) => {
  const rows = await getDb(c.env.DB)
    .select()
    .from(energySessions)
    .where(eq(energySessions.userId, c.get("userEmail")))
    .orderBy(desc(energySessions.updatedAt));

  return c.json({ energySessions: rows.map(mapEnergySession) });
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!sessionIdSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const [row] = await getDb(c.env.DB)
    .select()
    .from(energySessions)
    .where(and(eq(energySessions.id, id), eq(energySessions.userId, c.get("userEmail"))))
    .limit(1);

  return c.json({ session: row ? mapEnergySession(row) : null });
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
  const row: typeof energySessions.$inferInsert = {
    id: crypto.randomUUID(),
    userId: c.get("userEmail"),
    tool: parsed.data.tool,
    data: serialized.data,
    completed: parsed.data.completed ?? false,
    createdAt: now,
    updatedAt: now,
  };

  await getDb(c.env.DB).insert(energySessions).values(row);

  return c.json(
    { ok: true, session: mapEnergySession(row as typeof energySessions.$inferSelect) },
    201,
  );
});

app.patch("/:id", async (c) => {
  const id = c.req.param("id");
  if (!sessionIdSchema.safeParse(id).success) {
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
    .from(energySessions)
    .where(and(eq(energySessions.id, id), eq(energySessions.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  // 只保存内容时不动 completed，只在完成练习时不动 answers。
  const updates: Partial<typeof energySessions.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (parsed.data.data !== undefined) {
    const serialized = serializeData(parsed.data.data);
    if ("error" in serialized) {
      return c.json({ error: serialized.error }, 413);
    }
    updates.data = serialized.data;
  }

  if (parsed.data.completed !== undefined) {
    updates.completed = parsed.data.completed;
  }

  await db
    .update(energySessions)
    .set(updates)
    .where(and(eq(energySessions.id, id), eq(energySessions.userId, user)));

  const [updated] = await db
    .select()
    .from(energySessions)
    .where(and(eq(energySessions.id, id), eq(energySessions.userId, user)))
    .limit(1);

  if (!updated) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json({ ok: true, session: mapEnergySession(updated) });
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  if (!sessionIdSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [existing] = await db
    .select()
    .from(energySessions)
    .where(and(eq(energySessions.id, id), eq(energySessions.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  await db
    .delete(energySessions)
    .where(and(eq(energySessions.id, id), eq(energySessions.userId, user)));
  return c.json({ ok: true });
});

export default app;
