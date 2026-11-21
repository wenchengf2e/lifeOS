import type {
  TelosCategory,
  TelosItemEntry,
  TelosPriority,
  TelosProfileData,
  TelosRiskStatus,
  TelosSnapshotData,
} from "../../shared/types";
import {
  TELOS_DEFAULT_PRIORITY,
  TELOS_PARENT_CATEGORY,
  TELOS_PRIORITIES,
  normalizeTelosProfile,
} from "../../shared/types";
import {
  compassCategoryMeta,
  compassCategoryOrder,
  compassStatusMeta,
} from "../content/compass";

export type TelosRiskItem = Extract<TelosItemEntry, { category: "risk" }>;

export function isRiskItem(item: TelosItemEntry): item is TelosRiskItem {
  return item.category === "risk";
}

/** P0 → P3 的排序权重；数字越小越靠前。未知值按默认 P2 处理。 */
export function compassPriorityRank(priority: TelosPriority): number {
  const index = TELOS_PRIORITIES.indexOf(priority);
  return index === -1 ? TELOS_PRIORITIES.indexOf(TELOS_DEFAULT_PRIORITY) : index;
}

/** 同级排序：先按优先级 P0→P3，再按手排 sortOrder，最后创建时间与标题兜底。 */
export function compareCompassItems(a: TelosItemEntry, b: TelosItemEntry): number {
  const rank = compassPriorityRank(a.priority) - compassPriorityRank(b.priority);
  if (rank !== 0) return rank;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.title.localeCompare(b.title, "zh-CN");
}

export function sortCompassItems(items: TelosItemEntry[]): TelosItemEntry[] {
  return [...items].sort(compareCompassItems);
}

export type CompassForest = {
  problemRoots: TelosItemEntry[];
  childrenByParent: Map<string, TelosItemEntry[]>;
  byId: Map<string, TelosItemEntry>;
};

/** 建树：problem 是根，其余分类按 parentId 挂到上一级。 */
export function buildCompassForest(items: TelosItemEntry[]): CompassForest {
  const byId = new Map<string, TelosItemEntry>();
  const childrenByParent = new Map<string, TelosItemEntry[]>();

  for (const item of items) {
    byId.set(item.id, item);
    if (!item.parentId) continue;
    const list = childrenByParent.get(item.parentId);
    if (list) list.push(item);
    else childrenByParent.set(item.parentId, [item]);
  }

  for (const list of childrenByParent.values()) list.sort(compareCompassItems);

  return {
    problemRoots: items.filter((item) => item.category === "problem").sort(compareCompassItems),
    childrenByParent,
    byId,
  };
}

export type TelosProjectItem = Extract<TelosItemEntry, { category: "project" }>;

/** 进行中的项目，平铺视图用；先按优先级，再按最近更新时间倒序。 */
export function activeCompassProjects(items: TelosItemEntry[]): TelosProjectItem[] {
  return items
    .filter(
      (item): item is TelosProjectItem =>
        item.category === "project" && item.status === "active",
    )
    .sort((a, b) => {
      const rank = compassPriorityRank(a.priority) - compassPriorityRank(b.priority);
      if (rank !== 0) return rank;
      if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
      return a.title.localeCompare(b.title, "zh-CN");
    });
}

/** 从根到当前条目（含当前）的祖先链，用于面包屑。 */
export function getAncestorChain(items: TelosItemEntry[], id: string): TelosItemEntry[] {
  const byId = new Map(items.map((item) => [item.id, item] as const));
  const chain: TelosItemEntry[] = [];
  const seen = new Set<string>();
  let current = byId.get(id);

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }

  return chain;
}

/** 整棵子树的后代 id（不含自己），用 BFS 收集。 */
export function getDescendantIds(items: TelosItemEntry[], id: string): string[] {
  const children = new Map<string, string[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const list = children.get(item.parentId);
    if (list) list.push(item.id);
    else children.set(item.parentId, [item.id]);
  }

  const result: string[] = [];
  const seen = new Set<string>([id]);
  const queue = [id];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const childId of children.get(current) ?? []) {
      if (seen.has(childId)) continue;
      seen.add(childId);
      result.push(childId);
      queue.push(childId);
    }
  }

  return result;
}

export type CompassDescendantCount = {
  total: number;
  byCategory: Record<TelosCategory, number>;
};

export function countDescendants(items: TelosItemEntry[], id: string): CompassDescendantCount {
  const byCategory: Record<TelosCategory, number> = {
    problem: 0,
    goal: 0,
    challenge: 0,
    strategy: 0,
    project: 0,
    risk: 0,
  };
  const ids = new Set(getDescendantIds(items, id));
  let total = 0;

  for (const item of items) {
    if (!ids.has(item.id)) continue;
    total += 1;
    byCategory[item.category] += 1;
  }

  return { total, byCategory };
}

/** 删除确认里的数量摘要，例如「目标 2、挑战 3」。 */
export function describeCompassDescendants(count: CompassDescendantCount): string {
  return compassCategoryOrder
    .filter((category) => category !== "problem")
    .filter((category) => count.byCategory[category] > 0)
    .map((category) => `${compassCategoryMeta[category].label} ${count.byCategory[category]}`)
    .join("、");
}

/** 下一级只允许一种分类；project 是链的末端。 */
export function nextCompassCategory(category: TelosCategory): TelosCategory | null {
  switch (category) {
    case "problem":
      return "goal";
    case "goal":
      return "challenge";
    case "challenge":
      return "strategy";
    case "strategy":
      return "project";
    case "project":
    case "risk":
      return null;
  }
}

/** 父级选择器只列出白名单允许的分类，并排除当前节点及其后代。 */
export function getAllowedParents(
  items: TelosItemEntry[],
  category: TelosCategory,
  excludeIds?: ReadonlySet<string>,
): TelosItemEntry[] {
  const expected = TELOS_PARENT_CATEGORY[category];
  if (!expected) return [];

  return items
    .filter((item) => item.category === expected && !excludeIds?.has(item.id))
    .sort(compareCompassItems);
}

export function riskScore(item: TelosRiskItem): number {
  return item.data.probability * item.data.impact;
}

/** 风险按 概率 × 影响 倒序；也可以按状态筛选后排序。 */
export function sortRisks(
  items: TelosItemEntry[],
  status: TelosRiskStatus | "all" = "all",
): TelosRiskItem[] {
  return items
    .filter(isRiskItem)
    .filter((item) => status === "all" || item.status === status)
    .sort((a, b) => {
      const diff = riskScore(b) - riskScore(a);
      if (diff !== 0) return diff;
      if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
      return a.title.localeCompare(b.title, "zh-CN");
    });
}

/** 「有预防但没检测」的盲区数量。 */
export function countDetectMissingRisks(items: TelosItemEntry[]): number {
  return items.filter(isRiskItem).filter((item) => item.data.detect.state === "none").length;
}

export function compassStatusLabel(category: TelosCategory, status: string): string {
  return (compassStatusMeta[category] as Record<string, { label: string }>)[status]?.label ?? status;
}

export function compassStatusClassName(category: TelosCategory, status: string): string {
  return (
    (compassStatusMeta[category] as Record<string, { className: string }>)[status]?.className ??
    "bg-paper-deep/80 text-ink-soft"
  );
}

/** 读取 `/api/telos/profile` 响应；缺字段或旧响应时补成完整形状。 */
export function readTelosProfile(raw: unknown): TelosProfileData {
  const root =
    raw && typeof raw === "object" && "profile" in raw
      ? (raw as { profile?: unknown }).profile
      : raw;
  return normalizeTelosProfile(root);
}

export type CompassProfileDiffField = "mission" | "currentState" | "idealState";
export type CompassChangedField = "title" | "status" | "priority" | "parentId";

export type CompassDataDiff = {
  key: string;
  before: unknown;
  after: unknown;
};

export type CompassItemChange = {
  item: TelosItemEntry;
  fields: {
    field: CompassChangedField;
    before: string | null;
    after: string | null;
  }[];
  data: CompassDataDiff[];
};

export type CompassSnapshotDiff = {
  profile: {
    field: CompassProfileDiffField;
    before: string;
    after: string;
  }[];
  added: TelosItemEntry[];
  removed: TelosItemEntry[];
  changed: CompassItemChange[];
  unchangedCount: number;
};

const PROFILE_FIELDS: CompassProfileDiffField[] = ["mission", "currentState", "idealState"];

function categoryRank(category: TelosCategory): number {
  const index = compassCategoryOrder.indexOf(category);
  return index === -1 ? compassCategoryOrder.length : index;
}

function compareForDiff(a: TelosItemEntry, b: TelosItemEntry): number {
  const rank = categoryRank(a.category) - categoryRank(b.category);
  if (rank !== 0) return rank;
  return a.title.localeCompare(b.title, "zh-CN");
}

function stableValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function readDataField(data: unknown, key: string): unknown {
  if (!data || typeof data !== "object") return undefined;
  return (data as Record<string, unknown>)[key];
}

/**
 * 两份快照的确定性 diff：档案三段文字、新增 / 删除 / 共同条目的标题、状态、父级与 data 顶层字段。
 * 不依赖 AI，也不改写快照。
 */
export function diffTelosSnapshots(
  before: TelosSnapshotData,
  after: TelosSnapshotData,
): CompassSnapshotDiff {
  const profile = PROFILE_FIELDS.flatMap((field) => {
    const beforeText = before.profile[field];
    const afterText = after.profile[field];
    return beforeText === afterText ? [] : [{ field, before: beforeText, after: afterText }];
  });

  const beforeById = new Map(before.items.map((item) => [item.id, item] as const));
  const afterById = new Map(after.items.map((item) => [item.id, item] as const));

  const added: TelosItemEntry[] = [];
  const removed: TelosItemEntry[] = [];
  const changed: CompassItemChange[] = [];
  let unchangedCount = 0;

  for (const item of after.items) {
    const previous = beforeById.get(item.id);

    if (!previous) {
      added.push(item);
      continue;
    }

    // 分类不可修改；真出现分类变化时按「删除 + 新增」处理。
    if (previous.category !== item.category) {
      removed.push(previous);
      added.push(item);
      continue;
    }

    const fields: CompassItemChange["fields"] = [];
    if (previous.title !== item.title) {
      fields.push({ field: "title", before: previous.title, after: item.title });
    }
    if (previous.status !== item.status) {
      fields.push({ field: "status", before: previous.status, after: item.status });
    }
    // 旧快照没有 priority 字段，按默认 P2 处理，避免整份历史全被判成变化。
    const beforePriority = previous.priority || TELOS_DEFAULT_PRIORITY;
    const afterPriority = item.priority || TELOS_DEFAULT_PRIORITY;
    if (beforePriority !== afterPriority) {
      fields.push({ field: "priority", before: beforePriority, after: afterPriority });
    }
    if (previous.parentId !== item.parentId) {
      fields.push({ field: "parentId", before: previous.parentId, after: item.parentId });
    }

    const data: CompassDataDiff[] = [];
    const keys = new Set([
      ...Object.keys((previous.data ?? {}) as Record<string, unknown>),
      ...Object.keys((item.data ?? {}) as Record<string, unknown>),
    ]);
    for (const key of keys) {
      const beforeValue = readDataField(previous.data, key);
      const afterValue = readDataField(item.data, key);
      if (stableValue(beforeValue) !== stableValue(afterValue)) {
        data.push({ key, before: beforeValue, after: afterValue });
      }
    }

    if (fields.length > 0 || data.length > 0) {
      changed.push({ item, fields, data });
    } else {
      unchangedCount += 1;
    }
  }

  for (const item of before.items) {
    if (!afterById.has(item.id)) removed.push(item);
  }

  added.sort(compareForDiff);
  removed.sort(compareForDiff);
  changed.sort((a, b) => compareForDiff(a.item, b.item));

  return { profile, added, removed, changed, unchangedCount };
}
