import { Hono } from "hono";
import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/client";
import {
  chatMessages,
  chatSessions,
  checkins,
  coachProfiles,
  fears,
  patterns,
} from "../db/schema";
import { mapChatMessage, mapChatSession, mapCoachProfile } from "../db/queries";
import {
  buildProactiveSignals,
  generateCoachTurn,
  todayKey,
} from "../coach/engine";
import {
  COACH_SKILL_KEYS,
  createEmptyCoachProfile,
  createEmptyFearData,
  normalizeChatSession,
  normalizeCoachProfile,
  normalizeCoachProposals,
  normalizeCoachRefs,
  normalizeFearData,
} from "../../shared/types";
import type {
  ChatMessageEntry,
  ChatSessionEntry,
  CheckinData,
  CoachProfileData,
  CoachProposal,
  CoachProposalKind,
  CoachRef,
  CoachSignal,
  FearData,
} from "../../shared/types";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

type Db = ReturnType<typeof getDb>;

const idSchema = z.string().min(1).max(64);
const skillSchema = z.enum(COACH_SKILL_KEYS);
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const profileSchema = z.object({
  routines: z.string().max(20_000),
  energyWindows: z.string().max(20_000),
  preferences: z.string().max(20_000),
  executionClues: z.array(z.string().max(2_000)).max(200),
  longTermInsights: z.array(z.string().max(2_000)).max(200),
});

const chatSchema = z.object({
  sessionId: idSchema.optional(),
  message: z.string().trim().min(1).max(20_000),
  skill: skillSchema.optional(),
  signalId: z.string().min(1).max(64).optional(),
  triggerRef: z.record(z.string(), z.unknown()).optional(),
  startNewSession: z.boolean().optional(),
  /** 前端当地日期键；缺失时服务端回落到 Worker 时钟（UTC）。 */
  localDate: dateKeySchema.optional(),
});

const completeSchema = z.object({
  summary: z.string().max(2_000).optional(),
});

const proposalActionSchema = z.object({
  action: z.enum(["apply", "dismiss"]),
});

/** 上下文 / 提案 JSON 的长度上限，与其余业务表保持一致。 */
const MAX_DATA_LENGTH = 200_000;

const DEFAULT_SESSION_SUMMARY = "已结束的话题";

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function firstLine(value: string): string {
  return value.split(/\r?\n/)[0]?.trim() ?? "";
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mergeUnique(base: string[], extra: string[]): string[] {
  const merged = [...base];
  for (const item of extra) {
    const trimmed = item.trim();
    if (trimmed && !merged.includes(trimmed)) merged.push(trimmed);
  }
  return merged.slice(0, 200);
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function clip(value: unknown, max: number): string {
  return pickString(value, "").slice(0, max);
}

function jsonTooLarge(value: unknown): boolean {
  return JSON.stringify(value).length > MAX_DATA_LENGTH;
}

/** 读取会话消息；默认取最近 200 条，返回时按 seq 升序。 */
async function loadMessages(
  db: Db,
  userId: string,
  sessionId: string,
  limit = 200,
): Promise<ChatMessageEntry[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sessionId, sessionId)))
    .orderBy(desc(chatMessages.seq))
    .limit(limit);
  return rows.reverse().map(mapChatMessage);
}

async function nextSeq(db: Db, userId: string, sessionId: string): Promise<number> {
  const [last] = await db
    .select({ seq: chatMessages.seq })
    .from(chatMessages)
    .where(and(eq(chatMessages.userId, userId), eq(chatMessages.sessionId, sessionId)))
    .orderBy(desc(chatMessages.seq))
    .limit(1);
  return (last?.seq ?? 0) + 1;
}

async function loadActiveProfileRow(db: Db, userId: string) {
  const [row] = await db
    .select()
    .from(coachProfiles)
    .where(and(eq(coachProfiles.userId, userId), eq(coachProfiles.isActive, true)))
    .limit(1);
  return row;
}

/** 结案小结兜底：最后一条教练回复的第一行，其次会话标题。 */
function fallbackSummary(session: ChatSessionEntry, lastAssistant?: ChatMessageEntry): string {
  const fromMessage = lastAssistant ? firstLine(lastAssistant.content) : "";
  if (fromMessage) return truncate(fromMessage, 60);
  if (session.title.trim()) return truncate(session.title.trim(), 60);
  return DEFAULT_SESSION_SUMMARY;
}

app.get("/state", async (c) => {
  // 业务日期键是本地时区的「今天」；Worker 时钟是 UTC，由前端显式传入。
  const rawDate = c.req.query("date");
  if (rawDate !== undefined && !dateKeySchema.safeParse(rawDate).success) {
    return c.json({ error: "invalid_date" }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");

  const [profileRow, activeRows, recentRows] = await Promise.all([
    loadActiveProfileRow(db, user),
    db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, user), eq(chatSessions.status, "active")))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(1),
    db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, user), ne(chatSessions.status, "active")))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(10),
  ]);

  const profile = profileRow ? mapCoachProfile(profileRow) : createEmptyCoachProfile();
  const activeSession = activeRows[0] ? mapChatSession(activeRows[0]) : null;
  const [activeMessages, signals] = await Promise.all([
    activeSession ? loadMessages(db, user, activeSession.id) : Promise.resolve([]),
    buildProactiveSignals(db, user, rawDate),
  ]);

  return c.json({
    profile,
    activeSession,
    activeMessages,
    recentSessions: recentRows.map(mapChatSession),
    signals,
    aiConfigured: Boolean(c.env.AI_API_KEY),
  });
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
  const existing = await loadActiveProfileRow(db, user);

  const profile = normalizeCoachProfile({
    version: existing ? existing.version + 1 : 1,
    routines: parsed.data.routines,
    energyWindows: parsed.data.energyWindows,
    preferences: parsed.data.preferences,
    executionClues: parsed.data.executionClues,
    longTermInsights: parsed.data.longTermInsights,
  });

  const data = JSON.stringify(profile);
  if (data.length > MAX_DATA_LENGTH) {
    return c.json({ error: "payload_too_large" }, 413);
  }

  if (existing) {
    await db
      .update(coachProfiles)
      .set({ data, version: profile.version, updatedAt: now })
      .where(and(eq(coachProfiles.id, existing.id), eq(coachProfiles.userId, user)));
  } else {
    await db.insert(coachProfiles).values({
      id: crypto.randomUUID(),
      userId: user,
      data,
      version: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return c.json({ ok: true, profile });
});

app.get("/sessions/:id", async (c) => {
  const id = c.req.param("id");
  if (!idSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [row] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user)))
    .limit(1);

  if (!row) {
    return c.json({ error: "not_found" }, 404);
  }

  return c.json({ session: mapChatSession(row), messages: await loadMessages(db, user, id) });
});

app.post("/chat", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const now = new Date().toISOString();

  // 1. 定位当前会话：显式 sessionId 优先，否则续接最近一条 active。
  let sessionRow: typeof chatSessions.$inferSelect | undefined;
  let archivedSession: ChatSessionEntry | undefined;
  if (parsed.data.sessionId) {
    const [row] = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.id, parsed.data.sessionId), eq(chatSessions.userId, user)))
      .limit(1);
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }
    if (row.status !== "active") {
      return c.json({ error: "session_not_active" }, 400);
    }
    sessionRow = row;
  } else {
    const [row] = await db
      .select()
      .from(chatSessions)
      .where(and(eq(chatSessions.userId, user), eq(chatSessions.status, "active")))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(1);
    sessionRow = row;
  }

  // 2. 主动洞察：按稳定 id 重新扫描，客户端不能伪造 skill 或数据。
  //    必须在归档旧会话之前校验，避免无效信号把当前话题误结案。
  let signal: CoachSignal | undefined;
  if (parsed.data.signalId) {
    const signals = await buildProactiveSignals(db, user, parsed.data.localDate);
    signal = signals.find((item) => item.id === parsed.data.signalId);
    if (!signal) {
      return c.json({ error: "invalid_signal" }, 400);
    }
  }

  // 3. 换个话题：先给旧会话补小结并归档。
  if (parsed.data.startNewSession && sessionRow) {
    const history = await loadMessages(db, user, sessionRow.id, 20);
    const lastAssistant = [...history].reverse().find((message) => message.role === "assistant");
    const summary = sessionRow.summary || fallbackSummary(mapChatSession(sessionRow), lastAssistant);
    await db
      .update(chatSessions)
      .set({ status: "completed", summary, updatedAt: now })
      .where(and(eq(chatSessions.id, sessionRow.id), eq(chatSessions.userId, user)));
    // 回传归档后的会话，前端缓存才能拿到服务端生成的小结。
    archivedSession = normalizeChatSession({
      id: sessionRow.id,
      mode: sessionRow.mode,
      skill: sessionRow.skill,
      stage: sessionRow.stage,
      title: sessionRow.title,
      summary,
      triggerRef: parseJson<Record<string, unknown>>(sessionRow.triggerRef, {}),
      status: "completed",
      createdAt: sessionRow.createdAt,
      updatedAt: now,
    });
    sessionRow = undefined;
  }

  // 4. 没有 active 会话时创建新会话；主动洞察来源自动标记为 proactive。
  if (!sessionRow) {
    const triggerRef = parsed.data.triggerRef ?? signal?.triggerRef ?? {};
    const triggerRefJson = JSON.stringify(triggerRef);
    if (triggerRefJson.length > MAX_DATA_LENGTH) {
      return c.json({ error: "payload_too_large" }, 413);
    }

    const values: typeof chatSessions.$inferInsert = {
      id: crypto.randomUUID(),
      userId: user,
      mode: signal ? "proactive" : "reactive",
      skill: parsed.data.skill ?? signal?.skill ?? null,
      stage: "listen",
      title: "",
      summary: "",
      triggerRef: triggerRefJson,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(chatSessions).values(values);
    sessionRow = values as unknown as typeof chatSessions.$inferSelect;
  }

  // 5. 写入用户消息（seq 由服务端计算，append-only）。
  const history = await loadMessages(db, user, sessionRow.id, 40);
  const seq = await nextSeq(db, user, sessionRow.id);
  const userRow: typeof chatMessages.$inferInsert = {
    id: crypto.randomUUID(),
    userId: user,
    sessionId: sessionRow.id,
    seq,
    role: "user",
    content: parsed.data.message,
    skill: parsed.data.skill ?? signal?.skill ?? null,
    stage: sessionRow.stage,
    quickReplies: "[]",
    proposals: "[]",
    refs: "[]",
    contextSnapshot: "{}",
    model: null,
    tokenUsage: null,
    createdAt: now,
  };
  await db.insert(chatMessages).values(userRow);

  // 6. 生成教练回合；LLM 不可用时引擎内部自动降级。
  const sessionEntry = mapChatSession(sessionRow);
  const turn = await generateCoachTurn({
    env: c.env,
    db,
    userId: user,
    session: sessionEntry,
    history,
    userMessage: parsed.data.message,
    signal,
    preferredSkill: parsed.data.skill ?? signal?.skill ?? null,
    localDate: parsed.data.localDate,
  });

  // 7. 写入助手消息；上下文快照超限时退化成压缩版，避免写库失败。
  const replyCreatedAt = new Date().toISOString();
  const contextSnapshot = jsonTooLarge(turn.contextSnapshot)
    ? { generatedAt: replyCreatedAt, skill: turn.skill, truncated: true }
    : turn.contextSnapshot;
  const proposalsJson = JSON.stringify(turn.proposals);
  const quickRepliesJson = JSON.stringify(turn.quickReplies);

  const assistantRow: typeof chatMessages.$inferInsert = {
    id: crypto.randomUUID(),
    userId: user,
    sessionId: sessionRow.id,
    seq: seq + 1,
    role: "assistant",
    content: truncate(turn.reply, 100_000),
    skill: turn.skill,
    stage: turn.stage,
    quickReplies: quickRepliesJson,
    proposals: proposalsJson.length > MAX_DATA_LENGTH ? "[]" : proposalsJson,
    refs: "[]",
    contextSnapshot: JSON.stringify(contextSnapshot),
    model: turn.model,
    tokenUsage: turn.tokenUsage,
    createdAt: replyCreatedAt,
  };
  await db.insert(chatMessages).values(assistantRow);

  // 8. 会话跟随回合路由更新 skill / stage / title。
  const title =
    sessionRow.title.trim() ||
    turn.sessionTitle ||
    (firstLine(parsed.data.message) ? truncate(firstLine(parsed.data.message), 24) : "");
  const summary = sessionRow.summary || turn.summary || "";
  await db
    .update(chatSessions)
    .set({ skill: turn.skill, stage: turn.stage, title, summary, updatedAt: replyCreatedAt })
    .where(and(eq(chatSessions.id, sessionRow.id), eq(chatSessions.userId, user)));

  const session = normalizeChatSession({
    id: sessionRow.id,
    mode: sessionRow.mode,
    skill: turn.skill,
    stage: turn.stage,
    title,
    summary,
    triggerRef: parseJson<Record<string, unknown>>(sessionRow.triggerRef, {}),
    status: "active",
    createdAt: sessionRow.createdAt,
    updatedAt: replyCreatedAt,
  });

  return c.json({
    ok: true,
    session,
    userMessage: mapChatMessage(userRow as typeof chatMessages.$inferSelect),
    assistantMessage: mapChatMessage(assistantRow as typeof chatMessages.$inferSelect),
    ...(archivedSession ? { archivedSession } : {}),
  });
});

app.post("/sessions/:id/complete", async (c) => {
  const id = c.req.param("id");
  if (!idSchema.safeParse(id).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const body = (await c.req.json().catch(() => ({}))) ?? {};
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [row] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user)))
    .limit(1);

  if (!row) {
    return c.json({ error: "not_found" }, 404);
  }

  const session = mapChatSession(row);
  let summary = parsed.data.summary?.trim();
  if (!summary) {
    // 收尾阶段可能已经生成过一句话小结，优先保留它。
    summary = session.summary.trim();
  }
  if (!summary) {
    const messages = await loadMessages(db, user, id, 20);
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    summary = fallbackSummary(session, lastAssistant);
  }

  const now = new Date().toISOString();
  await db
    .update(chatSessions)
    .set({ status: "completed", summary, updatedAt: now })
    .where(and(eq(chatSessions.id, id), eq(chatSessions.userId, user)));

  return c.json({
    ok: true,
    session: normalizeChatSession({
      id: row.id,
      mode: row.mode,
      skill: row.skill,
      stage: row.stage,
      title: row.title,
      summary,
      triggerRef: parseJson<Record<string, unknown>>(row.triggerRef, {}),
      status: "completed",
      createdAt: row.createdAt,
      updatedAt: now,
    }),
  });
});

/** 提案类型与写入表的一一对应，用于幂等重放时找回正确的 appliedRef。 */
const REF_TABLE_BY_KIND: Record<CoachProposalKind, CoachRef["table"]> = {
  checkin_plan: "checkins",
  pattern_card: "patterns",
  fear_action: "fears",
  coach_profile: "coach_profiles",
};

type ApplySuccess = { ref: CoachRef };

type ApplyFailure = { error: string; status: 400 | 404 | 413; message?: string };

type ApplyResult = ApplySuccess | ApplyFailure;

function isFailure(result: ApplyResult): result is ApplyFailure {
  return "error" in result;
}

async function applyCheckinPlan(
  db: Db,
  userId: string,
  proposal: CoachProposal,
): Promise<ApplyResult> {
  const payload = asRecord(proposal.payload);
  const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 2_000) : "";
  if (!text) {
    return { error: "invalid_proposal", status: 400, message: "checkin_plan 缺少 text" };
  }

  const rawDate = typeof payload.date === "string" ? payload.date : "";
  const date = dateKeySchema.safeParse(rawDate).success ? rawDate : todayKey();
  const mode = payload.mode === "replace" ? "replace" : "append";
  const now = new Date().toISOString();

  const [existing] = await db
    .select()
    .from(checkins)
    .where(and(eq(checkins.userId, userId), eq(checkins.checkinDate, date)))
    .limit(1);

  const data = asRecord(parseJson<unknown>(existing?.data ?? "{}", {})) as CheckinData;
  const existingPlan = (data.plan ?? "").trim();
  const alreadyIncluded =
    mode === "append" &&
    existingPlan
      .split(/\r?\n/)
      .map((line) => line.trim())
      .includes(text);
  const nextPlan =
    mode === "replace"
      ? text
      : alreadyIncluded
        ? existingPlan
        : [existingPlan, text].filter(Boolean).join("\n");
  const serialized = JSON.stringify({ ...data, plan: nextPlan });
  if (serialized.length > MAX_DATA_LENGTH) {
    return { error: "payload_too_large", status: 413 };
  }

  const id = existing?.id ?? crypto.randomUUID();
  if (existing) {
    await db
      .update(checkins)
      .set({ data: serialized, updatedAt: now })
      .where(and(eq(checkins.id, id), eq(checkins.userId, userId)));
  } else {
    await db.insert(checkins).values({
      id,
      userId,
      checkinDate: date,
      data: serialized,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { ref: { table: "checkins", id, op: "upsert", label: `今日行动 ${date}` } };
}

async function applyPatternCard(
  db: Db,
  userId: string,
  proposal: CoachProposal,
): Promise<ApplyResult> {
  const payload = asRecord(proposal.payload);
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  if (!title) {
    return { error: "invalid_proposal", status: 400, message: "pattern_card 缺少 title" };
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const row: typeof patterns.$inferInsert = {
    id,
    userId,
    title: title.slice(0, 200),
    trigger: clip(payload.trigger, 4_000),
    reaction: clip(payload.reaction, 4_000),
    payoff: clip(payload.payoff, 4_000),
    cost: clip(payload.cost, 4_000),
    alternative: clip(payload.alternative, 4_000),
    evidence: JSON.stringify(
      asStringArray(payload.evidence).filter((item) => dateKeySchema.safeParse(item).success),
    ),
    status: "watching",
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(patterns).values(row);
  return { ref: { table: "patterns", id, op: "create", label: truncate(title, 60) } };
}

async function applyFearAction(
  db: Db,
  userId: string,
  proposal: CoachProposal,
): Promise<ApplyResult> {
  const payload = asRecord(proposal.payload);
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  if (!text) {
    return { error: "invalid_proposal", status: 400, message: "fear_action 缺少 text" };
  }

  const now = new Date().toISOString();
  const fearId = typeof payload.fearId === "string" ? payload.fearId : "";

  if (fearId) {
    const [existing] = await db
      .select()
      .from(fears)
      .where(and(eq(fears.id, fearId), eq(fears.userId, userId)))
      .limit(1);
    if (!existing) {
      return { error: "not_found", status: 404, message: "恐惧条目不存在" };
    }

    const data = normalizeFearData(parseJson<unknown>(existing.data, {}));
    const next: FearData = { ...data, action: text };
    const serialized = JSON.stringify(next);
    if (serialized.length > MAX_DATA_LENGTH) {
      return { error: "payload_too_large", status: 413 };
    }

    await db
      .update(fears)
      .set({ data: serialized, updatedAt: now })
      .where(and(eq(fears.id, fearId), eq(fears.userId, userId)));

    const title = firstLine(next.fear);
    return {
      ref: {
        table: "fears",
        id: fearId,
        op: "update",
        label: title ? truncate(title, 60) : "恐惧清单",
      },
    };
  }

  // 只有提案明确要求时才新建，避免误写一条空恐惧。
  if (payload.createIfMissing !== true) {
    return {
      error: "invalid_proposal",
      status: 400,
      message: "fear_action 需要已存在的 fearId，或显式 createIfMissing",
    };
  }

  const data = createEmptyFearData();
  data.fear = pickString(payload.title, text);
  data.action = text;
  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_DATA_LENGTH) {
    return { error: "payload_too_large", status: 413 };
  }

  const id = crypto.randomUUID();
  await db.insert(fears).values({
    id,
    userId,
    data: serialized,
    archived: false,
    createdAt: now,
    updatedAt: now,
  });

  return { ref: { table: "fears", id, op: "create", label: truncate(firstLine(data.fear), 60) } };
}

async function applyCoachProfile(
  db: Db,
  userId: string,
  proposal: CoachProposal,
): Promise<ApplyResult> {
  const payload = asRecord(proposal.payload);
  const patch = asRecord(payload.patch);
  const existing = await loadActiveProfileRow(db, userId);
  const current = existing ? mapCoachProfile(existing) : createEmptyCoachProfile();
  const now = new Date().toISOString();

  const merged: CoachProfileData = normalizeCoachProfile({
    version: (existing?.version ?? 0) + 1,
    routines: pickString(patch.routines, current.routines),
    energyWindows: pickString(patch.energyWindows, current.energyWindows),
    preferences: pickString(patch.preferences, current.preferences),
    executionClues: mergeUnique(current.executionClues, asStringArray(patch.executionClues)),
    longTermInsights: mergeUnique(current.longTermInsights, asStringArray(patch.longTermInsights)),
  });

  const data = JSON.stringify(merged);
  if (data.length > MAX_DATA_LENGTH) {
    return { error: "payload_too_large", status: 413 };
  }

  const id = existing?.id ?? crypto.randomUUID();
  if (existing) {
    await db
      .update(coachProfiles)
      .set({ data, version: merged.version, updatedAt: now })
      .where(and(eq(coachProfiles.id, id), eq(coachProfiles.userId, userId)));
  } else {
    await db.insert(coachProfiles).values({
      id,
      userId,
      data,
      version: merged.version,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    ref: { table: "coach_profiles", id, op: existing ? "update" : "create", label: "教练画像" },
  };
}

app.post("/messages/:messageId/proposals/:proposalId", async (c) => {
  const messageId = c.req.param("messageId");
  const proposalId = c.req.param("proposalId");
  if (!idSchema.safeParse(messageId).success || !idSchema.safeParse(proposalId).success) {
    return c.json({ error: "invalid_id" }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = proposalActionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }

  const db = getDb(c.env.DB);
  const user = c.get("userEmail");
  const [row] = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, user)))
    .limit(1);

  if (!row) {
    return c.json({ error: "not_found" }, 404);
  }

  const proposals = normalizeCoachProposals(parseJson<unknown>(row.proposals, []));
  const proposal = proposals.find((item) => item.id === proposalId);
  if (!proposal) {
    return c.json({ error: "proposal_not_found" }, 404);
  }

  const refs = normalizeCoachRefs(parseJson<unknown>(row.refs, []));

  if (parsed.data.action === "dismiss") {
    if (proposal.status === "applied") {
      return c.json({ error: "proposal_already_applied" }, 400);
    }
    proposal.status = "dismissed";
    const proposalsJson = JSON.stringify(proposals);
    await db
      .update(chatMessages)
      .set({ proposals: proposalsJson })
      .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, user)));

    return c.json({
      ok: true,
      message: mapChatMessage({ ...row, proposals: proposalsJson }),
    });
  }

  // 幂等：已经采纳过的提案不再重复写入业务表。
  if (proposal.status === "applied") {
    const appliedRef = [...refs]
      .reverse()
      .find((ref) => ref.table === REF_TABLE_BY_KIND[proposal.kind]);
    return c.json({
      ok: true,
      message: mapChatMessage(row),
      ...(appliedRef ? { appliedRef } : {}),
    });
  }

  let result: ApplyResult;
  switch (proposal.kind) {
    case "checkin_plan":
      result = await applyCheckinPlan(db, user, proposal);
      break;
    case "pattern_card":
      result = await applyPatternCard(db, user, proposal);
      break;
    case "fear_action":
      result = await applyFearAction(db, user, proposal);
      break;
    case "coach_profile":
      result = await applyCoachProfile(db, user, proposal);
      break;
  }

  if (isFailure(result)) {
    return c.json(
      result.message ? { error: result.error, message: result.message } : { error: result.error },
      result.status,
    );
  }

  proposal.status = "applied";
  if (!refs.some((ref) => ref.table === result.ref.table && ref.id === result.ref.id)) {
    refs.push(result.ref);
  }

  const proposalsJson = JSON.stringify(proposals);
  const refsJson = JSON.stringify(refs);
  if (proposalsJson.length > MAX_DATA_LENGTH || refsJson.length > MAX_DATA_LENGTH) {
    return c.json({ error: "payload_too_large" }, 413);
  }

  await db
    .update(chatMessages)
    .set({ proposals: proposalsJson, refs: refsJson })
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.userId, user)));

  return c.json({
    ok: true,
    message: mapChatMessage({ ...row, proposals: proposalsJson, refs: refsJson }),
    appliedRef: result.ref,
  });
});

export default app;
