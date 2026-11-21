import { Hono } from "hono";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import { telosItems, telosProfiles, telosSnapshots } from "../db/schema";
import {
  mapTelosItem,
  mapTelosProfile,
  mapTelosSnapshot,
  mapTelosSnapshotMeta,
} from "../db/queries";
import {
  TELOS_CATEGORIES,
  TELOS_DEFAULT_PRIORITY,
  TELOS_DEFAULT_STATUS,
  TELOS_PARENT_CATEGORY,
  TELOS_PRIORITIES,
  isTelosCategory,
  isTelosStatus,
  normalizeTelosItemData,
  normalizeTelosProfile,
} from "../../shared/types";
import type { TelosCategory, TelosSnapshotData } from "../../shared/types";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

type Db = ReturnType<typeof getDb>;

const idSchema = z.string().min(1).max(64);
const categorySchema = z.enum(TELOS_CATEGORIES);
const titleSchema = z.string().trim().min(1).max(200);
const statusSchema = z.string().min(1).max(32);
const prioritySchema = z.enum(TELOS_PRIORITIES);
const parentIdSchema = z.string().min(1).max(64).nullable();
const dataSchema = z.record(z.string(), z.unknown());

const profileSchema = z.object({
  mission: z.string(),
  currentState: z.string(),
  idealState: z.string(),
});

const createItemSchema = z.object({
  category: categorySchema,
  parentId: parentIdSchema.optional(),
  title: titleSchema,
  status: statusSchema.optional(),
  priority: prioritySchema.optional(),
  sortOrder: z.number().int().optional(),
  data: dataSchema.optional(),
});

const patchItemSchema = z
  .object({
    title: titleSchema.optional(),
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    parentId: parentIdSchema.optional(),
    sortOrder: z.number().int().optional(),
    data: dataSchema.optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.status !== undefined ||
      value.priority !== undefined ||
      value.parentId !== undefined ||
      value.sortOrder !== undefined ||
      value.data !== undefined,
    { message: "至少需要提供一个字段" },
  );

/** 实体 data 是整段 JSON，给一个上限，避免误传超大内容。 */
const MAX_DATA_LENGTH = 200_000;

function serializeItemData(
  category: TelosCategory,
  raw: unknown,
): { data: string } | { error: "payload_too_large" } {
  const data = JSON.stringify(normalizeTelosItemData(category, raw));
  if (data.length > MAX_DATA_LENGTH) {
    return { error: "payload_too_large" };
  }
  return { data };
}

/** DB 里的 category 由 API 写入，理论上一定合法；未知值兜底成 problem。 */
function asTelosCategory(value: string): TelosCategory {
  return isTelosCategory(value) ? value : "problem";
}

type ItemTreeRow = { id: string; parentId: string | null };

/** 在内存里 BFS 收集 rootId 及整棵子树。 */
function collectSubtreeIds(rows: ItemTreeRow[], rootId: string): string[] {
  const children = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = children.get(row.parentId);
    if (list) list.push(row.id);
    else children.set(row.parentId, [row.id]);
  }

  const result: string[] = [];
  const seen = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    result.push(current);
    queue.push(...(children.get(current) ?? []));
  }

  return result;
}

type ParentResult = { ok: true; parentId: string | null } | { ok: false };

/**
 * 父级白名单校验：problem / risk 不允许父级，其余分类必须挂在唯一合法父类下，
 * 且父节点必须存在、属于同一用户。
 */
async function resolveParentId(
  db: Db,
  userId: string,
  category: TelosCategory,
  parentId: string | null | undefined,
): Promise<ParentResult> {
  const expected = TELOS_PARENT_CATEGORY[category];

  if (expected === null) {
    return parentId === null || parentId === undefined ? { ok: true, parentId: null } : { ok: false };
  }

  if (!parentId) {
    return { ok: false };
  }

  const [parent] = await db
    .select({ id: telosItems.id, category: telosItems.category })
    .from(telosItems)
    .where(and(eq(telosItems.id, parentId), eq(telosItems.userId, userId)))
    .limit(1);

  if (!parent || parent.category !== expected) {
    return { ok: false };
  }

  return { ok: true, parentId };
}

app.get("/profile", async (c) => {
  const [row] = await getDb(c.env.DB)
    .select()
    .from(telosProfiles)
    .where(and(eq(telosProfiles.userId, c.get("userEmail")), eq(telosProfiles.isActive, true)))
    .limit(1);

  return c.json({ profile: row ? mapTelosProfile(row) : normalizeTelosProfile({}) });
});

app.put("/profile", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const now = new Date().toISOString();
  const [existing] = await db
    .select()
    .from(telosProfiles)
    .where(and(eq(telosProfiles.userId, user), eq(telosProfiles.isActive, true)))
    .limit(1);

  const profile = normalizeTelosProfile({
    version: existing ? existing.version + 1 : 1,
    mission: parsed.data.mission,
    currentState: parsed.data.currentState,
    idealState: parsed.data.idealState,
  });

  if (existing) {
    await db
      .update(telosProfiles)
      .set({
        mission: profile.mission,
        currentState: profile.currentState,
        idealState: profile.idealState,
        version: profile.version,
        updatedAt: now,
      })
      .where(and(eq(telosProfiles.id, existing.id), eq(telosProfiles.userId, user)));
  } else {
    await db.insert(telosProfiles).values({
      id: crypto.randomUUID(),
      userId: user,
      mission: profile.mission,
      currentState: profile.currentState,
      idealState: profile.idealState,
      version: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return c.json({ ok: true, profile });
});

app.get("/items", async (c) => {
  const rows = await getDb(c.env.DB)
    .select()
    .from(telosItems)
    .where(eq(telosItems.userId, c.get("userEmail")))
    .orderBy(asc(telosItems.category), asc(telosItems.sortOrder), asc(telosItems.createdAt));

  return c.json({ items: rows.map(mapTelosItem) });
});

app.get("/items/:id", async (c) => {
  const id = c.req.param("id");
  if (!idSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const [row] = await getDb(c.env.DB)
    .select()
    .from(telosItems)
    .where(and(eq(telosItems.id, id), eq(telosItems.userId, c.get("userEmail"))))
    .limit(1);

  return c.json({ item: row ? mapTelosItem(row) : null });
});

app.post("/items", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const category = parsed.data.category;
  const status = parsed.data.status ?? TELOS_DEFAULT_STATUS[category];
  if (!isTelosStatus(category, status)) {
    return c.json({ error: "invalid_status" }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const parent = await resolveParentId(db, user, category, parsed.data.parentId);
  if (!parent.ok) {
    return c.json({ error: "invalid_parent" }, 400);
  }

  const serialized = serializeItemData(category, parsed.data.data);
  if ("error" in serialized) {
    return c.json({ error: serialized.error }, 413);
  }

  let sortOrder = parsed.data.sortOrder;
  if (sortOrder === undefined) {
    // 默认排到同级末尾。
    const [last] = await db
      .select({ sortOrder: telosItems.sortOrder })
      .from(telosItems)
      .where(
        and(
          eq(telosItems.userId, user),
          parent.parentId === null
            ? isNull(telosItems.parentId)
            : eq(telosItems.parentId, parent.parentId),
        ),
      )
      .orderBy(desc(telosItems.sortOrder))
      .limit(1);
    sortOrder = (last?.sortOrder ?? -1) + 1;
  }

  const now = new Date().toISOString();
  const row: typeof telosItems.$inferInsert = {
    id: crypto.randomUUID(),
    userId: user,
    parentId: parent.parentId,
    category,
    title: parsed.data.title,
    status,
    priority: parsed.data.priority ?? TELOS_DEFAULT_PRIORITY,
    sortOrder,
    data: serialized.data,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(telosItems).values(row);

  return c.json({ ok: true, item: mapTelosItem(row as typeof telosItems.$inferSelect) }, 201);
});

app.patch("/items/:id", async (c) => {
  const id = c.req.param("id");
  if (!idSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = patchItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [existing] = await db
    .select()
    .from(telosItems)
    .where(and(eq(telosItems.id, id), eq(telosItems.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  const category = asTelosCategory(existing.category);

  if (parsed.data.status !== undefined && !isTelosStatus(category, parsed.data.status)) {
    return c.json({ error: "invalid_status" }, 400);
  }

  let nextParentId: string | null | undefined;
  if (parsed.data.parentId !== undefined) {
    const parent = await resolveParentId(db, user, category, parsed.data.parentId);
    if (!parent.ok) {
      return c.json({ error: "invalid_parent" }, 400);
    }
    nextParentId = parent.parentId;
  }

  // 防御性检查：分类白名单已经保证无环，这里再挡一次「父级是自己或后代」。
  if (nextParentId) {
    const treeRows = await db
      .select({ id: telosItems.id, parentId: telosItems.parentId })
      .from(telosItems)
      .where(eq(telosItems.userId, user));
    if (collectSubtreeIds(treeRows, id).includes(nextParentId)) {
      return c.json({ error: "invalid_parent" }, 400);
    }
  }

  // 只改传入的字段，未传的保持原样。
  const updates: Partial<typeof telosItems.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
  if (nextParentId !== undefined) updates.parentId = nextParentId;
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder;
  if (parsed.data.data !== undefined) {
    const serialized = serializeItemData(category, parsed.data.data);
    if ("error" in serialized) {
      return c.json({ error: serialized.error }, 413);
    }
    updates.data = serialized.data;
  }

  await db
    .update(telosItems)
    .set(updates)
    .where(and(eq(telosItems.id, id), eq(telosItems.userId, user)));

  const [updated] = await db
    .select()
    .from(telosItems)
    .where(and(eq(telosItems.id, id), eq(telosItems.userId, user)))
    .limit(1);

  if (!updated) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json({ ok: true, item: mapTelosItem(updated) });
});

app.delete("/items/:id", async (c) => {
  const id = c.req.param("id");
  if (!idSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [existing] = await db
    .select({ id: telosItems.id })
    .from(telosItems)
    .where(and(eq(telosItems.id, id), eq(telosItems.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  const rows = await db
    .select({ id: telosItems.id, parentId: telosItems.parentId })
    .from(telosItems)
    .where(eq(telosItems.userId, user));
  const deletedIds = collectSubtreeIds(rows, id);

  // D1 单条语句绑定参数有限，按 50 个一批删除。
  for (let index = 0; index < deletedIds.length; index += 50) {
    const chunk = deletedIds.slice(index, index + 50);
    await db
      .delete(telosItems)
      .where(and(eq(telosItems.userId, user), inArray(telosItems.id, chunk)));
  }

  return c.json({ ok: true, deletedIds, deletedCount: deletedIds.length });
});

app.get("/snapshots", async (c) => {
  const rows = await getDb(c.env.DB)
    .select({
      id: telosSnapshots.id,
      itemCount: telosSnapshots.itemCount,
      createdAt: telosSnapshots.createdAt,
    })
    .from(telosSnapshots)
    .where(eq(telosSnapshots.userId, c.get("userEmail")))
    .orderBy(desc(telosSnapshots.createdAt));

  return c.json({ snapshots: rows.map(mapTelosSnapshotMeta) });
});

app.post("/snapshots", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("userEmail");

  // 快照只由服务端抓取当前状态，不接受客户端传入的档案或条目。
  const [profileRow] = await db
    .select()
    .from(telosProfiles)
    .where(and(eq(telosProfiles.userId, user), eq(telosProfiles.isActive, true)))
    .limit(1);
  const itemRows = await db
    .select()
    .from(telosItems)
    .where(eq(telosItems.userId, user))
    .orderBy(asc(telosItems.category), asc(telosItems.sortOrder), asc(telosItems.createdAt));

  const data: TelosSnapshotData = {
    version: 1,
    profile: profileRow ? mapTelosProfile(profileRow) : normalizeTelosProfile({}),
    items: itemRows.map(mapTelosItem),
  };

  const row: typeof telosSnapshots.$inferInsert = {
    id: crypto.randomUUID(),
    userId: user,
    itemCount: data.items.length,
    data: JSON.stringify(data),
    createdAt: new Date().toISOString(),
  };

  await db.insert(telosSnapshots).values(row);

  return c.json(
    { ok: true, snapshot: mapTelosSnapshotMeta(row as typeof telosSnapshots.$inferSelect) },
    201,
  );
});

app.get("/snapshots/:id", async (c) => {
  const id = c.req.param("id");
  if (!idSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const [row] = await getDb(c.env.DB)
    .select()
    .from(telosSnapshots)
    .where(and(eq(telosSnapshots.id, id), eq(telosSnapshots.userId, c.get("userEmail"))))
    .limit(1);

  return c.json({ snapshot: row ? mapTelosSnapshot(row) : null });
});

app.delete("/snapshots/:id", async (c) => {
  const id = c.req.param("id");
  if (!idSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [existing] = await db
    .select({ id: telosSnapshots.id })
    .from(telosSnapshots)
    .where(and(eq(telosSnapshots.id, id), eq(telosSnapshots.userId, user)))
    .limit(1);

  if (!existing) {
    return c.json({ error: "not_found" }, 404);
  }

  await db
    .delete(telosSnapshots)
    .where(and(eq(telosSnapshots.id, id), eq(telosSnapshots.userId, user)));
  return c.json({ ok: true });
});

export default app;
