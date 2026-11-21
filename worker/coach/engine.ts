import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  checkins,
  coachProfiles,
  energySessions,
  fears,
  goals,
  patterns,
  reviews,
  telosItems,
  telosProfiles,
} from "../db/schema";
import {
  mapCoachProfile,
  mapEnergySession,
  mapFear,
  mapGoal,
  mapPattern,
  mapTelosItem,
  mapTelosProfile,
} from "../db/queries";
import {
  CHECKIN_FIELD_KEYS,
  COACH_SKILL_KEYS,
  COACH_STAGE_KEYS,
  createEmptyCoachProfile,
  isCoachProposalKind,
  isCoachSkillKey,
  isCoachStageKey,
  normalizeFearData,
  normalizeQuickReplies,
} from "../../shared/types";
import type {
  ChatMessageEntry,
  ChatSessionEntry,
  CheckinData,
  CoachProfileData,
  CoachProposal,
  CoachProposalKind,
  CoachSignal,
  CoachSkillKey,
  CoachStageKey,
  FearData,
} from "../../shared/types";
import type { Bindings } from "../types";
import {
  COACH_SKILLS,
  SKILL_STAGE_TEMPLATES,
  buildCoachSystemPrompt,
} from "./skills";

type Db = ReturnType<typeof getDb>;

const MAX_CONTEXT_LENGTH = 200_000;
const MAX_REPLY_LENGTH = 100_000;

// ---- 日期工具：Worker 不能依赖 src/，这里保留一份最小实现 ----

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 业务日期键统一用「本地时区当天」（见 specs 命名约定），因此优先采用前端传入的
 * 本地日期；缺失或非法时才回落到 Worker 时钟。Worker 跑在 UTC，直接用本机日期
 * 会在 CST 00:00–08:00 之间把「今天」算成前一天。
 */
export function resolveTodayKey(value?: string | null): string {
  return typeof value === "string" && DATE_KEY_PATTERN.test(value) ? value : todayKey();
}

function shiftDateKey(key: string, deltaDays: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + deltaDays);
  return toDateKey(date);
}

function daysBetween(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey).getTime();
  const to = parseDateKey(toKey).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** 与 src/lib/date.ts 的 isoWeekKeyOf 保持一致：周一为一周起点，跨年周由周四决定。 */
function isoWeekKeyOf(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const dayNum = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayNum);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();

  const jan4 = new Date(isoYear, 0, 4);
  const jan4DayNum = (jan4.getDay() + 6) % 7;
  const weekOneMonday = new Date(isoYear, 0, 4 - jan4DayNum);
  const week = 1 + Math.round((monday.getTime() - weekOneMonday.getTime()) / (7 * 86_400_000));
  return `${isoYear}-W${pad2(week)}`;
}

function isoWeekStart(weekKey: string): string {
  const [yearStr, weekStr] = weekKey.split("-W");
  const year = Number(yearStr);
  const jan4 = new Date(year, 0, 4);
  const jan4DayNum = (jan4.getDay() + 6) % 7;
  const start = new Date(year, 0, 4 - jan4DayNum);
  start.setDate(start.getDate() + (Number(weekStr) - 1) * 7);
  return toDateKey(start);
}

function daysSinceIso(iso: string): number {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86_400_000));
}

// ---- 通用工具 ----

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function firstLine(value: string): string {
  return value.split(/\r?\n/)[0]?.trim() ?? "";
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function hasCheckinContent(data: CheckinData): boolean {
  return CHECKIN_FIELD_KEYS.some((key) => hasText(data[key]));
}

function checkinDataOf(row: typeof checkins.$inferSelect): CheckinData {
  // 旧数据 / 手写导出可能不是对象，asRecord 兜底避免逐字段读取时炸掉。
  return asRecord(parseJson<unknown>(row.data, {})) as CheckinData;
}

function fearTitleOf(data: FearData): string {
  const line = firstLine(data.fear);
  return line ? truncate(line, 40) : "一条还没命名的恐惧";
}

// ---- Skill 路由 ----

/**
 * 中文关键词路由：显式指定的 skill 优先，其次按关键词得分，最后回落到会话上下文。
 * 没有任何信号时按 life-coach-main 的建议用 complex-problem-solving 兜底。
 */
export function detectSkill(
  message: string,
  preferredSkill?: CoachSkillKey | null,
  fallbackSkill?: CoachSkillKey | null,
): CoachSkillKey {
  if (isCoachSkillKey(preferredSkill)) return preferredSkill;

  const text = message.toLowerCase();
  let best: { skill: CoachSkillKey; score: number } | null = null;
  for (const key of COACH_SKILL_KEYS) {
    let score = 0;
    for (const keyword of COACH_SKILLS[key].keywords) {
      if (text.includes(keyword.toLowerCase())) {
        // 长关键词更具体，权重大一些，避免「累」误吃到「积累」。
        score += keyword.length >= 3 ? 2 : 1;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { skill: key, score };
    }
  }

  if (best) return best.skill;
  if (isCoachSkillKey(fallbackSkill)) return fallbackSkill;
  return "complex-problem-solving";
}

/** 阶段随助手回合数推进，且不倒退；由本地引擎与 LLM 失败兜底共同使用。 */
function nextStage(session: ChatSessionEntry, history: ChatMessageEntry[]): CoachStageKey {
  const assistantTurns = history.filter((message) => message.role === "assistant").length;
  const byCount = COACH_STAGE_KEYS[Math.min(COACH_STAGE_KEYS.length - 1, assistantTurns)];
  const currentIndex = Math.max(0, COACH_STAGE_KEYS.indexOf(session.stage));
  const targetIndex = Math.max(currentIndex, COACH_STAGE_KEYS.indexOf(byCount));
  return COACH_STAGE_KEYS[Math.min(COACH_STAGE_KEYS.length - 1, targetIndex)];
}

// ---- 主动洞察 ----

/**
 * 画像校准：PRD 要求「首次使用或尚未记录任何能量窗口与执行线索」时给出线索，
 * 只看这两类与教练推进最相关的信息，不因为用户只填了作息就静默。
 */
function needsProfileCalibration(profile: CoachProfileData): boolean {
  return !profile.energyWindows.trim() && profile.executionClues.length === 0;
}

const FATIGUE_KEYWORDS = ["累", "疲惫", "耗竭", "撑不住", "没睡好", "失眠", "透支", "没力气"];

/**
 * 基于确定性规则扫描 LifeOS 数据，最多返回 3 条主动洞察。
 * 顺序即优先级；id 稳定，前端点击后由 /chat 按 id 重新匹配。
 */
export async function buildProactiveSignals(
  db: Db,
  userId: string,
  localDate?: string,
): Promise<CoachSignal[]> {
  const today = resolveTodayKey(localDate);
  const weekKey = isoWeekKeyOf(today);
  const weekStart = isoWeekStart(weekKey);

  const [checkinRows, goalRows, projectRows, fearRows, weekReviewRows, profileRows] =
    await Promise.all([
      db
        .select()
        .from(checkins)
        .where(eq(checkins.userId, userId))
        .orderBy(desc(checkins.checkinDate))
        .limit(14),
      db
        .select()
        .from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.status, "active")))
        .orderBy(desc(goals.updatedAt))
        .limit(20),
      db
        .select()
        .from(telosItems)
        .where(and(eq(telosItems.userId, userId), eq(telosItems.category, "project")))
        .orderBy(desc(telosItems.updatedAt))
        .limit(20),
      db
        .select()
        .from(fears)
        .where(and(eq(fears.userId, userId), eq(fears.archived, false)))
        .orderBy(desc(fears.updatedAt))
        .limit(20),
      db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.userId, userId),
            eq(reviews.periodType, "week"),
            eq(reviews.periodKey, weekKey),
          ),
        )
        .limit(1),
      db
        .select()
        .from(coachProfiles)
        .where(and(eq(coachProfiles.userId, userId), eq(coachProfiles.isActive, true)))
        .limit(1),
    ]);

  const signals: CoachSignal[] = [];

  const contentCheckins = checkinRows.filter((row) => hasCheckinContent(checkinDataOf(row)));
  const latestCheckin = contentCheckins[0];
  const gapDays = latestCheckin ? daysBetween(latestCheckin.checkinDate, today) : null;
  const fatigueHit = contentCheckins
    .slice(0, 3)
    .map((row) => {
      const data = checkinDataOf(row);
      return `${data.journal ?? ""}\n${data.review ?? ""}`;
    })
    .join("\n");
  const fatigueKeyword = FATIGUE_KEYWORDS.find((keyword) => fatigueHit.includes(keyword));

  // 1. 低电量 / 断签关怀
  if ((gapDays !== null && gapDays >= 2) || fatigueKeyword) {
    const observation =
      gapDays !== null && gapDays >= 2
        ? `最近 ${gapDays} 天没有记录每日仪式，最后一次是 ${latestCheckin?.checkinDate}。`
        : `最近的日记里出现了「${fatigueKeyword}」这样的耗竭信号。`;
    signals.push({
      id: "checkin-gap",
      skill: "energy-management",
      title: gapDays !== null && gapDays >= 2 ? "先照顾一下电量" : "最近的疲惫值得被看见",
      observation,
      openingPrompt: `我注意到${observation}今天想先照顾电量，还是先说说发生了什么？`,
      quickOptions: ["先聊聊最近的疲惫", "帮我把今天降到最低可行", "我只是断了记录，想重新开始"],
      triggerRef: {
        table: "checkins",
        ...(latestCheckin ? { id: latestCheckin.checkinDate } : {}),
        reason: gapDays !== null && gapDays >= 2 ? "checkin_gap" : "fatigue_signal",
      },
    });
  }

  // 2. 目标 / 项目停滞
  const todayCheckin = checkinRows.find((row) => row.checkinDate === today);
  const todayPlanEmpty = !hasText(todayCheckin ? checkinDataOf(todayCheckin).plan : "");
  const stalledGoal = goalRows.find((row) => daysSinceIso(row.updatedAt) >= 7);
  const stalledProject = projectRows.find(
    (row) => (row.status === "planned" || row.status === "active") && daysSinceIso(row.updatedAt) >= 7,
  );

  if (stalledGoal || stalledProject || (todayPlanEmpty && goalRows.length > 0)) {
    const stalledDays = stalledGoal ? daysSinceIso(stalledGoal.updatedAt) : stalledProject ? daysSinceIso(stalledProject.updatedAt) : 0;
    const observation = stalledGoal
      ? `「${stalledGoal.title}」已经 ${stalledDays} 天没有更新，今天也还没有写行动。`
      : stalledProject
        ? `罗盘项目「${stalledProject.title}」已经 ${stalledDays} 天没有更新。`
        : `今天还没有写行动，「${goalRows[0]?.title}」还挂着。`;
    signals.push({
      id: "goal-stall",
      skill: "procrastination-execution",
      title: "有一个目标停在那里",
      observation,
      openingPrompt: `我注意到${observation}我们先不追责，只看看最小的下一步能有多小。`,
      quickOptions: ["帮我把下一步缩小", "今天先做 10 分钟", "这个目标我想重新看看"],
      triggerRef: stalledGoal
        ? { table: "goals", id: stalledGoal.id, reason: "goal_stalled" }
        : stalledProject
          ? { table: "telos_items", id: stalledProject.id, reason: "project_stalled" }
          : { table: "checkins", reason: "empty_today_plan" },
    });
  }

  // 3. 恐惧与卡点拆解
  const openFear = fearRows
    .map((row) => ({ row, data: normalizeFearData(parseJson<unknown>(row.data, {})) }))
    .find((item) => !hasText(item.data.action));
  if (openFear) {
    const title = fearTitleOf(openFear.data);
    signals.push({
      id: "fear-open",
      skill: "complex-problem-solving",
      title: "有一条恐惧还没拆完",
      observation: `「${title}」还停在拆解中途：第 4 步「转化为任务」还是空的。`,
      openingPrompt: `我注意到「${title}」还没有落到下一步行动。要不要一起把它拆成一个今天能做的小验证？`,
      quickOptions: ["先把它拆成下一步", "我有点不敢碰它", "先聊聊我在怕什么"],
      triggerRef: { table: "fears", id: openFear.row.id, reason: "fear_step4_missing" },
    });
  }

  // 4. 周复盘提醒
  const weekDays = new Set(
    contentCheckins.filter((row) => row.checkinDate >= weekStart).map((row) => row.checkinDate),
  );
  const weekReview = weekReviewRows[0];
  const weekReviewData = weekReview ? parseJson<Record<string, unknown>>(weekReview.data, {}) : null;
  const weekReviewDone = Boolean(
    weekReviewData &&
      (hasText(weekReviewData.wins as string | undefined) ||
        asStringArray(weekReviewData.actions).length > 0),
  );
  if (weekDays.size >= 2 && !weekReviewDone) {
    signals.push({
      id: "week-review",
      skill: "review",
      title: "本周可以收个尾",
      observation: `本周已经记录了 ${weekDays.size} 天，但周复盘还没有完成。`,
      openingPrompt: `本周你已经记录了 ${weekDays.size} 天。要不要花 5 分钟，只提炼一条有效做法？`,
      quickOptions: ["现在做一次周复盘", "先聊聊这周发生了什么", "只写三条也行"],
      triggerRef: { table: "reviews", reason: "week_review_pending" },
    });
  }

  // 5. 方向与画像校准
  const profile = profileRows[0] ? mapCoachProfile(profileRows[0]) : createEmptyCoachProfile();
  if (needsProfileCalibration(profile)) {
    signals.push({
      id: "profile-calibration",
      skill: "life-vision",
      title: "先让教练认识你",
      observation: "教练还不了解你的精力窗口和执行线索：这两类关键信息还没有记录。",
      openingPrompt:
        "我还不了解你的作息和能量规律。先告诉我一件最影响你安排的事，好吗？比如你一天里什么时候最有精力。",
      quickOptions: ["先记录我的作息", "我总在晚上更有精力", "我讨厌被催"],
      triggerRef: { table: "coach_profiles", reason: "profile_empty" },
    });
  }

  return signals.slice(0, 3);
}

// ---- 按场景装配上下文 ----

type CompactCheckin = {
  date: string;
  plan: string;
  journal: string;
  review: string;
};

function compactCheckin(row: typeof checkins.$inferSelect): CompactCheckin {
  const data = checkinDataOf(row);
  return {
    date: row.checkinDate,
    plan: truncate(data.plan ?? "", 200),
    journal: truncate(data.journal ?? "", 280),
    review: truncate(data.review ?? "", 200),
  };
}

/**
 * 按 skill 场景抽取真实 D1 数据摘要。
 *
 * 只读取与该场景相关的表，控制 prompt 长度与故障面；
 * 所有查询都按 user_id 过滤，摘要写进消息的 context_snapshot_json 便于复现。
 */
export async function buildCoachContextSnapshot(
  db: Db,
  userId: string,
  skill: CoachSkillKey,
  existing?: Record<string, unknown>,
  localDate?: string,
): Promise<Record<string, unknown>> {
  const today = resolveTodayKey(localDate);
  const weekKey = isoWeekKeyOf(today);
  const weekStart = isoWeekStart(weekKey);
  const weekAgo = shiftDateKey(today, -6);

  const wantsVision = skill === "life-vision" || skill === "planning";
  const wantsExecution = skill === "procrastination-execution" || skill === "habit-design";
  const wantsReview = skill === "review";
  const wantsEnergy = skill === "energy-management";
  const wantsComplex = skill === "complex-problem-solving";

  const [profileRows, checkinRows, goalRows, fearRows, patternRows, telosProfileRows, telosRows, energyRows] =
    await Promise.all([
      db
        .select()
        .from(coachProfiles)
        .where(and(eq(coachProfiles.userId, userId), eq(coachProfiles.isActive, true)))
        .limit(1),
      db
        .select()
        .from(checkins)
        .where(and(eq(checkins.userId, userId), gte(checkins.checkinDate, weekAgo)))
        .orderBy(desc(checkins.checkinDate))
        .limit(10),
      wantsVision || wantsExecution
        ? db
            .select()
            .from(goals)
            .where(and(eq(goals.userId, userId), inArray(goals.status, ["draft", "active", "paused"])))
            .orderBy(desc(goals.updatedAt))
            .limit(20)
        : Promise.resolve([] as (typeof goals.$inferSelect)[]),
      wantsExecution || wantsComplex
        ? db
            .select()
            .from(fears)
            .where(and(eq(fears.userId, userId), eq(fears.archived, false)))
            .orderBy(desc(fears.updatedAt))
            .limit(20)
        : Promise.resolve([] as (typeof fears.$inferSelect)[]),
      wantsExecution || wantsReview
        ? db
            .select()
            .from(patterns)
            .where(and(eq(patterns.userId, userId), inArray(patterns.status, ["watching", "verified"])))
            .orderBy(desc(patterns.updatedAt))
            .limit(10)
        : Promise.resolve([] as (typeof patterns.$inferSelect)[]),
      wantsVision || wantsComplex
        ? db
            .select()
            .from(telosProfiles)
            .where(and(eq(telosProfiles.userId, userId), eq(telosProfiles.isActive, true)))
            .limit(1)
        : Promise.resolve([] as (typeof telosProfiles.$inferSelect)[]),
      wantsVision || wantsComplex
        ? db
            .select()
            .from(telosItems)
            .where(
              and(
                eq(telosItems.userId, userId),
                inArray(
                  telosItems.category,
                  wantsVision ? ["goal", "project", "risk"] : ["challenge", "risk"],
                ),
              ),
            )
            .orderBy(desc(telosItems.updatedAt))
            .limit(40)
        : Promise.resolve([] as (typeof telosItems.$inferSelect)[]),
      wantsEnergy
        ? db
            .select()
            .from(energySessions)
            .where(eq(energySessions.userId, userId))
            .orderBy(desc(energySessions.updatedAt))
            .limit(3)
        : Promise.resolve([] as (typeof energySessions.$inferSelect)[]),
    ]);

  const profile = profileRows[0] ? mapCoachProfile(profileRows[0]) : createEmptyCoachProfile();
  const recentCheckins = checkinRows.map(compactCheckin);
  const todayPlan =
    recentCheckins.find((item) => item.date === today)?.plan ?? "";

  // 只放入本轮实际读取的数据：缺失的 key 表示「这个场景没有读」，
  // 避免模型把空数组误读成「用户没有目标 / 没有恐惧」。
  const snapshot: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    skill,
    today,
    weekKey,
    profile,
    todayPlan,
    recentCheckins,
  };

  if (wantsVision || wantsExecution) {
    snapshot.activeGoals = goalRows.map((row) => {
      const goal = mapGoal(row);
      return {
        id: goal.id,
        title: goal.title,
        status: goal.status,
        updatedAt: goal.updatedAt,
        statement: truncate(goal.data.goal.statement, 160),
        nextStep: truncate(goal.data.practice.nextStep, 120),
      };
    });
  }

  if (wantsExecution || wantsComplex) {
    snapshot.openFears = fearRows.map((row) => {
      const fear = mapFear(row);
      return {
        id: fear.id,
        title: fearTitleOf(fear.data),
        action: truncate(fear.data.action, 160),
        updatedAt: fear.updatedAt,
      };
    });
  }

  if (wantsExecution || wantsReview) {
    snapshot.patterns = patternRows.map((row) => {
      const pattern = mapPattern(row);
      return {
        id: pattern.id,
        title: pattern.title,
        status: pattern.status,
        trigger: truncate(pattern.trigger, 120),
        alternative: truncate(pattern.alternative, 120),
      };
    });
  }

  if (wantsVision || wantsComplex) {
    snapshot.telosProfile = telosProfileRows[0]
      ? (() => {
          const item = mapTelosProfile(telosProfileRows[0]);
          return {
            mission: item.mission,
            currentState: item.currentState,
            idealState: item.idealState,
          };
        })()
      : null;
    snapshot.telosItems = telosRows.map((row) => {
      const item = mapTelosItem(row);
      return {
        id: item.id,
        category: item.category,
        title: item.title,
        status: item.status,
        priority: item.priority,
        updatedAt: item.updatedAt,
        nextAction: item.category === "project" ? truncate(item.data.nextAction, 120) : "",
      };
    });
  }

  if (wantsEnergy) {
    snapshot.recentEnergySessions = energyRows.map((row) => {
      const session = mapEnergySession(row);
      const firstAnswer =
        Object.values(session.data.answers).find((answer) => hasText(answer)) ?? "";
      return {
        id: session.id,
        tool: session.tool,
        completed: session.completed,
        updatedAt: session.updatedAt,
        note: truncate(firstAnswer, 120),
      };
    });
  }

  if (wantsReview) {
    const [weekReview] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, userId),
          eq(reviews.periodType, "week"),
          eq(reviews.periodKey, weekKey),
        ),
      )
      .limit(1);
    const data = weekReview ? parseJson<Record<string, unknown>>(weekReview.data, {}) : null;
    snapshot.weekReview = {
      periodKey: weekKey,
      weekStart,
      checkinDays: recentCheckins.filter((item) => item.date >= weekStart).length,
      exists: Boolean(weekReview),
      done: Boolean(
        data &&
          (hasText(data.wins as string | undefined) ||
            asStringArray(data.actions).length > 0),
      ),
      wins: truncate((data?.wins as string | undefined) ?? "", 240),
      actions: asStringArray(data?.actions).slice(0, 5),
    };
  }

  const merged = { ...(existing ?? {}), ...snapshot };
  return JSON.stringify(merged).length > MAX_CONTEXT_LENGTH
    ? { generatedAt: snapshot.generatedAt, skill, truncated: true }
    : merged;
}

// ---- 回合生成 ----

export type CoachTurnResult = {
  reply: string;
  skill: CoachSkillKey;
  stage: CoachStageKey;
  quickReplies: string[];
  proposals: CoachProposal[];
  model: string | null;
  tokenUsage: number | null;
  sessionTitle?: string;
  summary?: string;
  /** 同时返回本次上下文快照，路由直接写入 context_snapshot_json。 */
  contextSnapshot: Record<string, unknown>;
};

export type CoachTurnInput = {
  env: Bindings;
  db: Db;
  userId: string;
  session: ChatSessionEntry;
  history: ChatMessageEntry[];
  userMessage: string;
  signal?: CoachSignal;
  /** 用户显式选择的成长模型（快捷芯片 / 主动洞察）；优先于关键词路由。 */
  preferredSkill?: CoachSkillKey | null;
  contextSnapshot?: Record<string, unknown>;
  /** 前端当地日期键（YYYY-MM-DD）；缺省时回落到 Worker 时钟。 */
  localDate?: string;
};

function substitute(template: string, values: Record<string, string>): string {
  return template.replace(/\{(observation|focus|question)\}/g, (_, key: string) => values[key] ?? "");
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function pickFocus(snapshot: Record<string, unknown>, userMessage: string): string {
  const goal = arrayOfRecords(snapshot.activeGoals)[0];
  if (goal && typeof goal.title === "string" && goal.title.trim()) {
    return truncate(goal.title.trim(), 40);
  }
  const fear = arrayOfRecords(snapshot.openFears)[0];
  if (fear && typeof fear.title === "string" && fear.title.trim()) {
    return truncate(fear.title.trim(), 40);
  }
  const project = arrayOfRecords(snapshot.telosItems).find((item) => item.category === "project");
  if (project && typeof project.title === "string" && project.title.trim()) {
    return truncate(project.title.trim(), 40);
  }
  const line = firstLine(userMessage);
  return line ? truncate(line, 40) : "下一步";
}

function buildObservation(snapshot: Record<string, unknown>, signal?: CoachSignal): string {
  const raw = signal ? signal.observation : buildObservationText(snapshot);
  // 模板会在占位符后再加句号；这里先去掉观察句末尾的标点，避免「。。」。
  return raw.replace(/[。！？!?]+$/g, "");
}

function buildObservationText(snapshot: Record<string, unknown>): string {
  const goal = arrayOfRecords(snapshot.activeGoals)[0];
  if (goal && typeof goal.title === "string" && goal.title.trim()) {
    return `你的「${truncate(goal.title.trim(), 40)}」还在进行中`;
  }
  const fear = arrayOfRecords(snapshot.openFears)[0];
  if (fear && typeof fear.title === "string" && fear.title.trim()) {
    return `「${truncate(fear.title.trim(), 40)}」还没有拆到下一步`;
  }
  const checkin = arrayOfRecords(snapshot.recentCheckins)[0];
  if (checkin && typeof checkin.date === "string") {
    return `你最近的记录停在 ${checkin.date}`;
  }

  // 没有具体条目时，按场景给一句不冒犯的处境描述。
  switch (snapshot.skill) {
    case "energy-management":
      return "你现在的电量不太够用";
    case "review":
      return "这周的经历还没有被整理成结论";
    case "planning":
      return "事情还堆在一起，没有排序";
    case "habit-design":
      return "这个习惯还没有找到稳定的落点";
    case "procrastination-execution":
      return "有一件事一直没能开始";
    case "life-vision":
      return "你正在寻找一个更诚实的方向";
    case "complex-problem-solving":
      return "这件事的线索还缠在一起";
    default:
      return "你愿意从现在的状态开始说";
  }
}

function makeProposal(
  kind: CoachProposalKind,
  title: string,
  summary: string,
  payload: Record<string, unknown>,
): CoachProposal {
  return {
    id: crypto.randomUUID(),
    kind,
    title,
    summary,
    status: "pending",
    payload,
  };
}

function actionTextForSkill(skill: CoachSkillKey, focus: string): string {
  switch (skill) {
    case "life-vision":
      return `用 15 分钟做一次小实验：${focus}`;
    case "procrastination-execution":
      return `先用 2 分钟启动「${focus}」`;
    case "planning":
      return `为「${focus}」排一个 25 分钟的时间块`;
    case "review":
      return "记录一条本轮复盘的有效做法，并保留它";
    case "habit-design":
      return `完成「${focus}」的最小版本（2 分钟）`;
    case "energy-management":
      return "按低电量版本推进：先做 10 分钟，再决定要不要继续";
    case "complex-problem-solving":
      return `为「${focus}」做一个低风险的小验证`;
  }
}

function profilePatchForSkill(
  skill: CoachSkillKey,
  userMessage: string,
): Partial<CoachProfileData> | null {
  const clue = truncate(firstLine(userMessage), 60);
  if (!clue) return null;
  switch (skill) {
    case "energy-management":
      return { energyWindows: clue };
    case "life-vision":
      return { longTermInsights: [clue] };
    case "procrastination-execution":
    case "habit-design":
    case "planning":
    case "review":
      return { executionClues: [clue] };
    case "complex-problem-solving":
      return null;
  }
}

function buildLocalProposal(
  kind: CoachProposalKind,
  skill: CoachSkillKey,
  snapshot: Record<string, unknown>,
  userMessage: string,
  today: string,
): CoachProposal | null {
  const focus = pickFocus(snapshot, userMessage);

  switch (kind) {
    case "checkin_plan":
      return makeProposal(
        kind,
        "把下一步写进今日行动",
        `会追加到今天（${today}）的今日行动，不会覆盖原有内容。`,
        { date: today, text: actionTextForSkill(skill, focus), mode: "append" },
      );
    case "pattern_card":
      return makeProposal(
        kind,
        "沉淀一张模式卡",
        "把这次识别到的触发—反应—替代做法存进模式库，状态为观察中。",
        {
          title: truncate(`${focus} 的启动回路`, 40),
          trigger: `想到要开始「${focus}」时`,
          reaction: "先刷手机或推迟到「有状态」再做",
          payoff: "暂时避开不确定和失败风险",
          cost: "真正可用的时间变少，临近截止时更焦虑",
          alternative: `先做 2 分钟最小版本：${focus}`,
          evidence: [today],
        },
      );
    case "fear_action": {
      const fear = arrayOfRecords(snapshot.openFears)[0];
      if (!fear || typeof fear.id !== "string" || !fear.id) return null;
      return makeProposal(
        kind,
        "把下一步写进恐惧清单",
        `会更新「${truncate(String(fear.title ?? "这条恐惧"), 30)}」的第 4 步，不动其他内容。`,
        { fearId: fear.id, text: `先做一个低风险验证：${focus}`, createIfMissing: false },
      );
    }
    case "coach_profile": {
      const patch = profilePatchForSkill(skill, userMessage);
      if (!patch) return null;
      return makeProposal(
        kind,
        "记进教练画像",
        "只记录这轮对话里你亲口说过的线索，之后可以随时修改。",
        { patch },
      );
    }
  }
}

function generateLocalTurn(
  input: CoachTurnInput,
  skill: CoachSkillKey,
  stage: CoachStageKey,
  contextSnapshot: Record<string, unknown>,
): CoachTurnResult {
  const template = SKILL_STAGE_TEMPLATES[skill][stage];
  const observation = buildObservation(contextSnapshot, input.signal);
  const focus = pickFocus(contextSnapshot, input.userMessage);
  const values = { observation, focus, question: template.question };

  const reply = truncate(
    `${substitute(template.reply, values)}\n\n${substitute(template.question, values)}`,
    MAX_REPLY_LENGTH,
  );

  const hooks = template.proposalHooks ?? [];
  const proposalCount = stage === "experiment" ? Math.min(1, hooks.length) : stage === "wrapup" ? Math.min(2, hooks.length) : 0;
  const today = resolveTodayKey(input.localDate);
  const proposals = hooks
    .slice(0, proposalCount)
    .map((kind) => buildLocalProposal(kind, skill, contextSnapshot, input.userMessage, today))
    .filter((item): item is CoachProposal => Boolean(item));

  return {
    reply,
    skill,
    stage,
    quickReplies: template.quickReplies.slice(0, 4),
    proposals,
    model: null,
    tokenUsage: null,
    // 收尾时用下一步行动做一句话小结，比固定的「已收束」更有信息量。
    summary: stage === "wrapup" ? truncate(`下一步：${actionTextForSkill(skill, focus)}`, 120) : undefined,
    contextSnapshot,
  };
}

type ChatCompletionResponse = {
  model?: string;
  choices?: { message?: { content?: string } }[];
  usage?: { total_tokens?: number };
};

/** 兼容模型返回 Markdown 代码块或前后废话的 JSON 提取。 */
function parseJsonBlock(raw: string): Record<string, unknown> | null {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-zA-Z0-9_-]*\s*/, "").replace(/\s*```$/, "").trim();
  }

  const attempt = (candidate: string): Record<string, unknown> | null => {
    try {
      const value = JSON.parse(candidate) as unknown;
      return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  };

  const direct = attempt(text);
  if (direct) return direct;

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return attempt(text.slice(start, end + 1));
  }
  return null;
}

function normalizeLlmProposals(raw: unknown, today: string): CoachProposal[] {
  if (!Array.isArray(raw)) return [];

  const result: CoachProposal[] = [];
  for (const item of raw.slice(0, 2)) {
    const root = asRecord(item);
    if (!isCoachProposalKind(root.kind)) continue;
    const payload = asRecord(root.payload);
    // 模型可能漏掉日期或写成别的格式；这里统一补成本地日期，
    // 回写 checkins 时才不会落到前一天的日期键上。
    if (root.kind === "checkin_plan") {
      const rawDate = typeof payload.date === "string" ? payload.date : "";
      if (!DATE_KEY_PATTERN.test(rawDate)) payload.date = today;
    }
    result.push({
      id: crypto.randomUUID(),
      kind: root.kind,
      title: truncate(typeof root.title === "string" ? root.title.trim() : "", 40),
      summary: truncate(typeof root.summary === "string" ? root.summary.trim() : "", 200),
      status: "pending",
      payload,
    });
  }
  return result;
}

async function callLlm(
  input: CoachTurnInput,
  skill: CoachSkillKey,
  stage: CoachStageKey,
  contextSnapshot: Record<string, unknown>,
): Promise<CoachTurnResult> {
  const baseUrl = (input.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = input.env.AI_MODEL ?? "deepseek-chat";
  const history = input.history.slice(-12).map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
  }));

  const userContent = input.signal
    ? `（主动洞察：${input.signal.title} / ${input.signal.observation}）\n${input.userMessage}`
    : input.userMessage;

  const messages = [
    { role: "system", content: buildCoachSystemPrompt(skill, stage, contextSnapshot) },
    ...history,
    { role: "user", content: userContent },
  ];
  const requestBody = { model, temperature: 0.7, messages };

  if (input.env.AI_DEBUG_LOG === "1") {
    // 完整请求含用户真实数据，只应本地开启。
    console.log("coach_llm_request", JSON.stringify({ baseUrl, ...requestBody }));
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.env.AI_API_KEY}`,
      // OpenCode 网关要求的会话标识
      "x-opencode-session": "lifeos",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`ai_http_${response.status}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("ai_empty");
  }

  const parsed = parseJsonBlock(content);
  const replyText = typeof parsed?.reply === "string" && parsed.reply.trim() ? parsed.reply : content;
  const routedSkill = parsed && isCoachSkillKey(parsed.skill) ? parsed.skill : skill;
  const routedStage = parsed && isCoachStageKey(parsed.stage) ? parsed.stage : stage;
  const fallbackQuick = SKILL_STAGE_TEMPLATES[routedSkill][routedStage].quickReplies;
  const quickReplies = normalizeQuickReplies(parsed?.quickReplies);
  const sessionTitle =
    typeof parsed?.sessionTitle === "string" && parsed.sessionTitle.trim()
      ? truncate(parsed.sessionTitle.trim(), 40)
      : undefined;
  const summary =
    typeof parsed?.summary === "string" && parsed.summary.trim()
      ? truncate(parsed.summary.trim(), 300)
      : undefined;

  return {
    reply: truncate(replyText.trim(), MAX_REPLY_LENGTH),
    skill: routedSkill,
    stage: routedStage,
    quickReplies: quickReplies.length >= 2 ? quickReplies : fallbackQuick,
    proposals: normalizeLlmProposals(parsed?.proposals, resolveTodayKey(input.localDate)),
    model: payload.model ?? model,
    tokenUsage:
      typeof payload.usage?.total_tokens === "number" ? payload.usage.total_tokens : null,
    sessionTitle,
    summary,
    contextSnapshot,
  };
}

/**
 * 生成一轮教练回复：优先走 OpenAI 兼容接口，任何失败都平滑降级到本地启发式引擎，
 * 保证未配置 Key 时整条链路（洞察 → 对话 → 提案回写）仍然可用。
 */
export async function generateCoachTurn(input: CoachTurnInput): Promise<CoachTurnResult> {
  // 显式选择优先；主动洞察次之；否则按关键词路由，最后回落到会话上下文。
  const skill = detectSkill(
    input.userMessage,
    input.preferredSkill ?? input.signal?.skill,
    input.session.skill ?? undefined,
  );
  const stage = nextStage(input.session, input.history);
  const contextSnapshot =
    input.contextSnapshot ??
    (await buildCoachContextSnapshot(input.db, input.userId, skill, undefined, input.localDate));

  if (input.env.AI_API_KEY) {
    try {
      return await callLlm(input, skill, stage, contextSnapshot);
    } catch (error) {
      // 上游不可用时不让用户看到错误；记录后降级到本地引擎。
      console.error("coach_llm_failed", error);
    }
  }

  return generateLocalTurn(input, skill, stage, contextSnapshot);
}
