import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { items } from "../db/schema";
import { mapItem } from "../db/queries";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const moduleSchema = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSchema = z.object({
  module: moduleSchema,
  content: z.string().trim().min(1).max(4000),
  itemDate: dateSchema.nullable().optional(),
  done: z.boolean().optional(),
  sortOrder: z.number().int().min(-100000).max(100000).optional(),
});

const patchSchema = z.object({
  content: z.string().trim().min(1).max(4000).optional(),
  itemDate: dateSchema.nullable().optional(),
  done: z.boolean().optional(),
  sortOrder: z.number().int().min(-100000).max(100000).optional(),
});

app.get("/", async (c) => {
  const module = c.req.query("module");
  if (module !== undefined && !moduleSchema.safeParse(module).success) {
    return c.json({ error: "invalid_module" }, 400);
  }

  const conditions = [eq(items.userId, c.get("userEmail"))];
  if (module) conditions.push(eq(items.module, module));

  const rows = await getDb(c.env.DB)
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(desc(items.createdAt));

  return c.json({ items: rows.map(mapItem) });
});

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const now = new Date().toISOString();
  const row: typeof items.$inferInsert = {
    id: crypto.randomUUID(),
    userId: c.get("userEmail"),
    module: parsed.data.module,
    content: parsed.data.content,
    itemDate: parsed.data.itemDate ?? null,
    done: parsed.data.done ?? false,
    sortOrder: parsed.data.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  await getDb(c.env.DB).insert(items).values(row);
  return c.json({ ok: true, item: mapItem(row as typeof items.$inferSelect) }, 201);
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
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  const updates: Partial<typeof items.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (parsed.data.content !== undefined) updates.content = parsed.data.content;
  if (parsed.data.itemDate !== undefined) updates.itemDate = parsed.data.itemDate;
  if (parsed.data.done !== undefined) updates.done = parsed.data.done;
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;

  await db.update(items).set(updates).where(and(eq(items.id, id), eq(items.userId, user)));

  const [updated] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, user)))
    .limit(1);

  return c.json({ ok: true, item: mapItem(updated) });
});

app.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const user = c.get("userEmail");

  const [existing] = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  await db.delete(items).where(and(eq(items.id, id), eq(items.userId, user)));
  return c.json({ ok: true });
});

export default app;
