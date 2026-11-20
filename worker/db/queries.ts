import { and, asc, desc, eq } from "drizzle-orm";
import type {
  ChatMessageEntry,
  ChatSessionEntry,
  CheckinData,
  CoachProfileData,
  DocumentData,
  CheckinEntry,
  DocumentEntry,
  EnergySessionEntry,
  EnergyToolKey,
  FearEntry,
  GoalEntry,
  GoalStatus,
  ItemEntry,
  PatternEntry,
  PatternStatus,
  ReviewData,
  ReviewEntry,
  ReviewPeriodType,
  TelosChallengeStatus,
  TelosGoalStatus,
  TelosItemEntry,
  TelosProblemStatus,
  TelosProfileData,
  TelosProjectStatus,
  TelosRiskStatus,
  TelosSnapshotEntry,
  TelosSnapshotMeta,
  TelosStrategyStatus,
} from "../../shared/types";
import {
  createEmptyCoachProfile,
  normalizeChatMessage,
  normalizeChatSession,
  normalizeCoachProfile,
  normalizeEnergySessionData,
  normalizeFearData,
  normalizeGoalData,
  normalizeTelosChallengeData,
  normalizeTelosGoalData,
  normalizeTelosProblemData,
  normalizeTelosProfile,
  normalizeTelosProjectData,
  normalizeTelosRiskData,
  normalizeTelosSnapshotData,
  normalizeTelosStrategyData,
} from "../../shared/types";
import { getDb } from "./client";
import {
  chatMessages,
  chatSessions,
  checkins,
  coachProfiles,
  documents,
  energySessions,
  fears,
  goals,
  items,
  patterns,
  reviews,
  telosItems,
  telosProfiles,
  telosSnapshots,
} from "./schema";

type Db = ReturnType<typeof getDb>;

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapCheckin(row: typeof checkins.$inferSelect): CheckinEntry {
  return {
    date: row.checkinDate,
    data: parseJson<CheckinData>(row.data, {}),
    updatedAt: row.updatedAt,
  };
}

export function mapDocument(row: typeof documents.$inferSelect): DocumentEntry {
  return {
    module: row.module,
    key: row.docKey,
    data: parseJson<DocumentData>(row.data, {}),
    updatedAt: row.updatedAt,
  };
}

export function mapItem(row: typeof items.$inferSelect): ItemEntry {
  return {
    id: row.id,
    module: row.module,
    content: row.content,
    itemDate: row.itemDate,
    done: row.done,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapReview(row: typeof reviews.$inferSelect): ReviewEntry {
  const data = parseJson<Partial<ReviewData>>(row.data, {});
  return {
    periodType: row.periodType as ReviewPeriodType,
    periodKey: row.periodKey,
    data: { focus: [], ...data },
    updatedAt: row.updatedAt,
  };
}

export function mapPattern(row: typeof patterns.$inferSelect): PatternEntry {
  return {
    id: row.id,
    title: row.title,
    trigger: row.trigger ?? "",
    reaction: row.reaction ?? "",
    payoff: row.payoff ?? "",
    cost: row.cost ?? "",
    alternative: row.alternative ?? "",
    evidence: parseJson<string[]>(row.evidence, []),
    status: row.status as PatternStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapGoal(row: typeof goals.$inferSelect): GoalEntry {
  return {
    id: row.id,
    title: row.title,
    domain: row.domain,
    status: row.status as GoalStatus,
    data: normalizeGoalData(parseJson<unknown>(row.data, {})),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapFear(row: typeof fears.$inferSelect): FearEntry {
  return {
    id: row.id,
    data: normalizeFearData(parseJson<unknown>(row.data, {})),
    archived: row.archived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapEnergySession(
  row: typeof energySessions.$inferSelect,
): EnergySessionEntry {
  return {
    id: row.id,
    tool: row.tool as EnergyToolKey,
    data: normalizeEnergySessionData(parseJson<unknown>(row.data, {})),
    completed: row.completed,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapTelosProfile(row: typeof telosProfiles.$inferSelect): TelosProfileData {
  return normalizeTelosProfile({
    version: row.version,
    mission: row.mission,
    currentState: row.currentState,
    idealState: row.idealState,
  });
}

export function mapTelosItem(row: typeof telosItems.$inferSelect): TelosItemEntry {
  const base = {
    id: row.id,
    parentId: row.parentId,
    title: row.title,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  const raw = parseJson<unknown>(row.data, {});

  // category 由 API 按白名单写入；这里用 switch 把 data 收窄成判别联合。
  switch (row.category) {
    case "problem":
      return {
        ...base,
        category: "problem",
        status: row.status as TelosProblemStatus,
        data: normalizeTelosProblemData(raw),
      };
    case "goal":
      return {
        ...base,
        category: "goal",
        status: row.status as TelosGoalStatus,
        data: normalizeTelosGoalData(raw),
      };
    case "challenge":
      return {
        ...base,
        category: "challenge",
        status: row.status as TelosChallengeStatus,
        data: normalizeTelosChallengeData(raw),
      };
    case "strategy":
      return {
        ...base,
        category: "strategy",
        status: row.status as TelosStrategyStatus,
        data: normalizeTelosStrategyData(raw),
      };
    case "project":
      return {
        ...base,
        category: "project",
        status: row.status as TelosProjectStatus,
        data: normalizeTelosProjectData(raw),
      };
    case "risk":
      return {
        ...base,
        category: "risk",
        status: row.status as TelosRiskStatus,
        data: normalizeTelosRiskData(raw),
      };
    default:
      // 理论上不会出现未知分类；兜底成 problem，保证整页数据仍能读出来。
      return {
        ...base,
        category: "problem",
        status: row.status as TelosProblemStatus,
        data: normalizeTelosProblemData(raw),
      };
  }
}

export function mapTelosSnapshotMeta(
  row: Pick<typeof telosSnapshots.$inferSelect, "id" | "itemCount" | "createdAt">,
): TelosSnapshotMeta {
  return {
    id: row.id,
    createdAt: row.createdAt,
    itemCount: row.itemCount,
  };
}

export function mapTelosSnapshot(
  row: typeof telosSnapshots.$inferSelect,
): TelosSnapshotEntry {
  return {
    ...mapTelosSnapshotMeta(row),
    data: normalizeTelosSnapshotData(parseJson<unknown>(row.data, {})),
  };
}

/**
 * 罗盘数据独立导出：不参与 `loadAll()`，`/api/bootstrap` 的体积与故障面不受影响。
 * 只有手动导出备份时才一起读取。
 */
export async function loadTelosExport(db: Db, userId: string) {
  const [profileRows, itemRows, snapshotRows] = await Promise.all([
    db
      .select()
      .from(telosProfiles)
      .where(and(eq(telosProfiles.userId, userId), eq(telosProfiles.isActive, true)))
      .limit(1),
    db
      .select()
      .from(telosItems)
      .where(eq(telosItems.userId, userId))
      .orderBy(asc(telosItems.category), asc(telosItems.sortOrder), asc(telosItems.createdAt)),
    db
      .select()
      .from(telosSnapshots)
      .where(eq(telosSnapshots.userId, userId))
      .orderBy(desc(telosSnapshots.createdAt)),
  ]);

  const [profileRow] = profileRows;
  return {
    telosProfile: profileRow ? mapTelosProfile(profileRow) : normalizeTelosProfile({}),
    telosItems: itemRows.map(mapTelosItem),
    telosSnapshots: snapshotRows.map(mapTelosSnapshot),
  };
}

/**
 * 教练数据独立导出：同样不参与 `loadAll()`，`/api/bootstrap` 不受影响；
 * 只有手动导出备份时才一起读取。
 */
export async function loadCoachExport(db: Db, userId: string) {
  const [profileRows, sessionRows, messageRows] = await Promise.all([
    db
      .select()
      .from(coachProfiles)
      .where(and(eq(coachProfiles.userId, userId), eq(coachProfiles.isActive, true)))
      .limit(1),
    db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt)),
    db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(asc(chatMessages.sessionId), asc(chatMessages.seq)),
  ]);

  const [profileRow] = profileRows;
  return {
    coachProfile: profileRow ? mapCoachProfile(profileRow) : createEmptyCoachProfile(),
    chatSessions: sessionRows.map(mapChatSession),
    chatMessages: messageRows.map(mapChatMessage),
  };
}

export function mapCoachProfile(row: typeof coachProfiles.$inferSelect): CoachProfileData {
  const raw = parseJson<Record<string, unknown>>(row.data, {});
  // 行上的 version 是权威值；data 里可能残留旧值。
  return normalizeCoachProfile({ ...raw, version: row.version });
}

export function mapChatSession(row: typeof chatSessions.$inferSelect): ChatSessionEntry {
  return normalizeChatSession({
    id: row.id,
    mode: row.mode,
    skill: row.skill,
    stage: row.stage,
    title: row.title,
    summary: row.summary,
    triggerRef: parseJson<Record<string, unknown>>(row.triggerRef, {}),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function mapChatMessage(row: typeof chatMessages.$inferSelect): ChatMessageEntry {
  return normalizeChatMessage({
    id: row.id,
    sessionId: row.sessionId,
    seq: row.seq,
    role: row.role,
    content: row.content,
    skill: row.skill,
    stage: row.stage,
    quickReplies: parseJson<unknown>(row.quickReplies, []),
    proposals: parseJson<unknown>(row.proposals, []),
    refs: parseJson<unknown>(row.refs, []),
    contextSnapshot: parseJson<Record<string, unknown>>(row.contextSnapshot, {}),
    model: row.model,
    tokenUsage: row.tokenUsage,
    createdAt: row.createdAt,
  });
}

export async function loadAll(db: Db, userId: string) {
  const [
    checkinRows,
    documentRows,
    itemRows,
    reviewRows,
    patternRows,
    goalRows,
    fearRows,
    energyRows,
  ] = await Promise.all([
    db.select().from(checkins).where(eq(checkins.userId, userId)).orderBy(desc(checkins.checkinDate)),
    db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.updatedAt)),
    db.select().from(items).where(eq(items.userId, userId)).orderBy(desc(items.createdAt)),
    db.select().from(reviews).where(eq(reviews.userId, userId)).orderBy(desc(reviews.periodKey)),
    db.select().from(patterns).where(eq(patterns.userId, userId)).orderBy(desc(patterns.updatedAt)),
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.updatedAt)),
    db.select().from(fears).where(eq(fears.userId, userId)).orderBy(desc(fears.updatedAt)),
    db
      .select()
      .from(energySessions)
      .where(eq(energySessions.userId, userId))
      .orderBy(desc(energySessions.updatedAt)),
  ]);

  return {
    checkins: checkinRows.map(mapCheckin),
    documents: documentRows.map(mapDocument),
    items: itemRows.map(mapItem),
    reviews: reviewRows.map(mapReview),
    patterns: patternRows.map(mapPattern),
    goals: goalRows.map(mapGoal),
    fears: fearRows.map(mapFear),
    energySessions: energyRows.map(mapEnergySession),
  };
}
