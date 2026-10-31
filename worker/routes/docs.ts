import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { documents } from "../db/schema";
import { mapDocument } from "../db/queries";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const slugSchema = z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/);
const docDataSchema = z.record(z.string(), z.unknown());

function validateSlug(value: string | undefined): value is string {
  return !!value && slugSchema.safeParse(value).success;
}

app.get("/", async (c) => {
  const module = c.req.query("module");
  if (module !== undefined && !validateSlug(module)) {
    return c.json({ error: "invalid_module" }, 400);
  }

  const conditions = [eq(documents.userId, c.get("userEmail"))];
  if (module) conditions.push(eq(documents.module, module));

  const rows = await getDb(c.env.DB)
    .select()
    .from(documents)
    .where(and(...conditions));

  return c.json({ documents: rows.map(mapDocument) });
});

app.get("/:module/:key", async (c) => {
  const module = c.req.param("module");
  const key = c.req.param("key");
  if (!validateSlug(module) || !validateSlug(key)) {
    return c.json({ error: "invalid_path" }, 400);
  }

  const [row] = await getDb(c.env.DB)
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.userId, c.get("userEmail")),
        eq(documents.module, module),
        eq(documents.docKey, key),
      ),
    )
    .limit(1);

  return c.json({ document: row ? mapDocument(row) : null });
});

app.put("/:module/:key", async (c) => {
  const module = c.req.param("module");
  const key = c.req.param("key");
  if (!validateSlug(module) || !validateSlug(key)) {
    return c.json({ error: "invalid_path" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = docDataSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const now = new Date().toISOString();
  const user = c.get("userEmail");
  const data = JSON.stringify(parsed.data);

  await getDb(c.env.DB)
    .insert(documents)
    .values({
      id: crypto.randomUUID(),
      userId: user,
      module,
      docKey: key,
      data,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [documents.userId, documents.module, documents.docKey],
      set: { data, updatedAt: now },
    });

  return c.json({ ok: true, module, key, updatedAt: now });
});

export default app;
