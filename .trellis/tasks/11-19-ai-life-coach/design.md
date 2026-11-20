# AI 智能教练模块 (AI Life Coach) — 技术设计文档 (`design.md`)

## 1. 架构与模块边界

### 1.1 独立模块原则（参照 `telos` 人生罗盘模式）
- **不进入 `/api/bootstrap`**：`chat_sessions` 和 `chat_messages` 会随长期对话不断增长。为保证 LifeOS 首屏 `GET /api/bootstrap` 的轻量与稳定，`loadAll()` 不查询任何教练表。
- **进入 `/api/export`**：在 `worker/db/queries.ts` 中新增 `loadCoachExport(db, userId)`，在 `GET /api/export` 中与 `loadAll()`、`loadTelosExport()` 并行执行，确保用户一键导出备份时完整包含 `coachProfile`、`chatSessions`、`chatMessages`。
- **独立 Query Keys**：前端统一使用 `["coach", "state"]`（获取当前活跃会话 + 最新消息 + 主动洞察 + 最近历史会话摘要 + 教练画像）以及 `["coach", "session", sessionId]`（按需查看某个已归档历史话题的消息明细）。当用户点击「确认回写」修改了 `checkins`、`patterns`、`fears` 时，前端除更新 `["coach", ...]` 缓存外，定向 invalidate `["bootstrap"]` 以保证其他页面数据最新。

### 1.2 代码分层与文件映射
| 层级 | 文件路径 | 职责 |
| --- | --- | --- |
| 数据库迁移 | `migrations/0007_coach.sql` | 创建 `coach_profiles`、`chat_sessions`、`chat_messages` 三张表及索引 |
| Drizzle Schema | `worker/db/schema.ts` | 新增 `coachProfiles`、`chatSessions`、`chatMessages` 表定义 |
| 共享类型契约 | `shared/types.ts` | 定义 `CoachSkillKey`、`CoachStageKey`、`CoachProfileData`、`ChatSessionEntry`、`ChatMessageEntry`、`CoachProposal`、`CoachRef`、`CoachSignal` 及归一化函数 |
| DB 查询映射 | `worker/db/queries.ts` | 新增 `mapCoachProfile`、`mapChatSession`、`mapChatMessage`、`loadCoachExport` |
| 教练引擎与模型库 | `worker/coach/skills.ts`、`worker/coach/engine.ts` | 封装 `life-coach-main` 7 大成长模型 Playbook、主动洞察扫描器、按场景 D1 上下文装配器、OpenAI 兼容 LLM 调用与本地启发式兜底引擎 |
| Worker 路由 | `worker/routes/coach.ts`、`worker/index.ts` | 提供 `/api/coach/*` 接口并挂载到 Hono |
| 环境变量类型 | `worker/types.ts` | 在 `Bindings` 中增加可选的 `AI_BASE_URL?: string`、`AI_API_KEY?: string`、`AI_MODEL?: string` |
| 前端配置与文案 | `src/content/coach.ts` | 7 大成长模型元数据（名称、图标、标语、典型问题）、5 大成长阶段说明、画像字段说明 |
| 前端 API 与 Query | `src/lib/api.ts`、`src/lib/queries.ts` | 封装 `/api/coach/*` 请求与 TanStack Query hooks |
| 前端页面与组件 | `src/pages/CoachPage.tsx`、`src/components/coach/*` | 单一连续主线聊天视图、主动洞察卡片、回写提案确认卡片、教练画像抽屉、历史话题胶囊 |

---

## 2. 数据库设计 (`migrations/0007_coach.sql`)

```sql
PRAGMA foreign_keys = ON;

-- 1. 教练画像表：每用户一条当前 active 画像（不复用 documents 表）
CREATE TABLE IF NOT EXISTS coach_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS coach_profiles_user_active_idx
  ON coach_profiles (user_id) WHERE is_active = 1;

-- 2. 会话表：一轮教练话题单元（底层分段，前端默认无缝衔接 active 会话）
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'reactive',      -- 'reactive' | 'proactive'
  skill TEXT,                                 -- 7 大成长模型之一
  stage TEXT NOT NULL DEFAULT 'listen',       -- 'listen' | 'clarify' | 'reframe' | 'experiment' | 'wrapup'
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  trigger_ref_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',      -- 'active' | 'completed' | 'archived'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_status_updated_idx
  ON chat_sessions (user_id, status, updated_at DESC);

-- 3. 消息表：append-only 消息流水（仅 proposals_json / refs_json 在用户确认提案时更新状态）
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id),
  seq INTEGER NOT NULL,
  role TEXT NOT NULL,                         -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  skill TEXT,
  stage TEXT,
  quick_replies_json TEXT NOT NULL DEFAULT '[]',
  proposals_json TEXT NOT NULL DEFAULT '[]',
  refs_json TEXT NOT NULL DEFAULT '[]',
  context_snapshot_json TEXT NOT NULL DEFAULT '{}',
  model TEXT,
  token_usage INTEGER,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_session_seq_uq
  ON chat_messages (session_id, seq);

CREATE INDEX IF NOT EXISTS chat_messages_user_session_seq_idx
  ON chat_messages (user_id, session_id, seq);
```

---

## 3. 核心数据结构与共享契约 (`shared/types.ts`)

### 3.1 成长模型（Skills）与成长循环阶段（Stages）
严格对齐 `life-coach-main/AGENTS.md` 与 `references/coaching-process.md`：

```ts
export const COACH_SKILL_KEYS = [
  "life-vision",
  "procrastination-execution",
  "planning",
  "review",
  "habit-design",
  "energy-management",
  "complex-problem-solving",
] as const;

export type CoachSkillKey = (typeof COACH_SKILL_KEYS)[number];

export const COACH_STAGE_KEYS = [
  "listen",      // 1-2. 建立安全 & 接住情绪与映照处境
  "clarify",     // 3. 澄清主题与真实需求
  "reframe",     // 4-5. 促进觉察(ACT解离/改释) & 聚焦选择
  "experiment",  // 6. 共创最小行动或小实验
  "wrapup",      // 7. 整合收尾与沉淀回写
] as const;

export type CoachStageKey = (typeof COACH_STAGE_KEYS)[number];
```

### 3.2 教练画像结构 (`CoachProfileData`)
对齐 `life-coach-main/templates/profile/user.md` 与 `templates/memory/long-term.md`：

```ts
export type CoachProfileData = {
  version: number;
  /** 基本作息与固定承诺（工作日/周末节律、固定安排） */
  routines: string;
  /** 精力窗口与恢复线索（高能/低能时段、透支信号、有效恢复方式） */
  energyWindows: string;
  /** 沟通偏好与雷区（喜欢推进方式、讨厌被催/打卡等雷区） */
  preferences: string;
  /** 执行与拖延线索（常见启动阻力、触发场景、有效启动方式、反效果方式） */
  executionClues: string[];
  /** 跨周期长期核心洞察与有效策略（沉淀自多次对话与复盘） */
  longTermInsights: string[];
};
```

### 3.3 主动洞察卡片 (`CoachSignal`)
```ts
export type CoachSignal = {
  id: string;
  skill: CoachSkillKey;
  title: string;
  observation: string;    // 教练观察到的客观数据事实（如：“最近 2 天还没有记录每日仪式”）
  openingPrompt: string;  // 用户点击后发起对话的开场种子或教练首句
  quickOptions: string[]; // 预设的 2~3 个低负担回应选项
  triggerRef?: {
    table: string;
    id?: string;
    reason: string;
  };
};
```

### 3.4 待确认回写提案 (`CoachProposal`) 与结果引用 (`CoachRef`)
```ts
export const COACH_PROPOSAL_KINDS = [
  "checkin_plan",   // 写入今日行动 (checkins.data.plan)
  "pattern_card",   // 新建行为模式卡 (patterns)
  "fear_action",    // 更新或新建恐惧清单下一步行动 (fears)
  "coach_profile",  // 沉淀到教练画像 (coach_profiles)
] as const;

export type CoachProposalKind = (typeof COACH_PROPOSAL_KINDS)[number];
export type CoachProposalStatus = "pending" | "applied" | "dismissed";

export type CoachProposal = {
  id: string;
  kind: CoachProposalKind;
  title: string;
  summary: string;
  status: CoachProposalStatus;
  payload: Record<string, unknown>;
};

export type CoachRef = {
  table: "checkins" | "patterns" | "fears" | "coach_profiles";
  id: string;
  op: "create" | "update" | "upsert";
  label: string;
};
```

---

## 4. HTTP API 契约 (`worker/routes/coach.ts`)

| 方法 | 路径 | 用途 | 请求体 / 参数 | 成功响应 |
| --- | --- | --- | --- | --- |
| `GET` | `/api/coach/state` | 获取教练工作台完整状态 | 无 | `{ profile, activeSession, activeMessages, recentSessions, signals, aiConfigured }` |
| `PUT` | `/api/coach/profile` | 手动保存/更新教练画像 | `Omit<CoachProfileData, "version">` | `{ ok: true, profile: CoachProfileData }` |
| `GET` | `/api/coach/sessions/:id` | 读取指定会话及其消息流水 | `:id` | `{ session: ChatSessionEntry, messages: ChatMessageEntry[] }` |
| `POST` | `/api/coach/chat` | 发送一条消息或从主动洞察开聊 | `{ sessionId?, message, skill?, signalId?, triggerRef?, startNewSession? }` | `{ ok: true, session, userMessage, assistantMessage }` |
| `POST` | `/api/coach/sessions/:id/complete` | 结束当前话题并生成小结 | `{ summary? }` | `{ ok: true, session: ChatSessionEntry }` |
| `POST` | `/api/coach/messages/:messageId/proposals/:proposalId` | 采纳或忽略一条回写提案 | `{ action: "apply" \| "dismiss" }` | `{ ok: true, message: ChatMessageEntry, appliedRef?: CoachRef }` |

---

## 5. 成长模型装配、上下文抽取与 LLM 降级机制

### 5.1 路由与上下文按需抽取（对齐 `memory-system.md`）
当用户发送消息或点击主动洞察时：
1. **Skill 路由**：
   - 若用户/主动洞察显式指定了 `skill`，优先使用；
   - 否则根据用户输入关键词与当前会话上下文自动匹配 7 大 Skill（如包含“拖延/卡住/刷手机/不想动/启动” → `procrastination-execution`；“累/困/耗竭/没精力/失眠” → `energy-management`；“迷茫/意义/方向/价值” → `life-vision`；“计划/安排/今天做什么/排序” → `planning`；“复盘/总结/为什么又失败” → `review`；“习惯/打卡/坚持” → `habit-design`；“纠结/两难/害怕/风险” → `complex-problem-solving`）。
2. **D1 上下文按需抽取（生成 `CoachContextSnapshot`）**：
   - 必读：`coach_profiles`（当前 active 画像）+ 今日与最近 3 天 `checkins` 摘要。
   - 按 Skill 补充：
     - `life-vision` / `planning`：读取 `telos_profiles` + 进行中的 `telos_items`（Goal/Project）+ 进行中的 `goals`。
     - `procrastination-execution` / `habit-design`：读取进行中的 `goals` + `patterns`（watching/verified）+ 未归档 `fears`。
     - `energy-management`：读取最近 3 次 `energy_sessions` + 最近打卡中的情绪/精力线索。
     - `review`：读取本周 `checkins` + 最近一次 `reviews` + `patterns`。
     - `complex-problem-solving`：读取未归档 `fears` + `telos_items` 中的 Challenge/Risk。

### 5.2 LLM 调用（方案 A：OpenAI 兼容接口）与本地启发式兜底
- **当配置了 `c.env.AI_API_KEY` 时**：
  - 默认 `AI_BASE_URL = "https://api.openai.com/v1"`（用户在 `.dev.vars` 或 Wrangler secrets 中可设为 DeepSeek `https://api.deepseek.com/v1`、Gemini OpenAI 兼容地址等），默认 `AI_MODEL = "deepseek-chat"` 或环境变量指定值。
  - 发送 System Prompt（融合 `life-coach-main/AGENTS.md` 角色沟通法则 + `coaching-process.md` 七步法 + `act-core.md` 话术 + 当前路由 Skill 的核心流程 + 抽取的 LifeOS 真实数据摘要）+ 最近 12 条会话历史。
  - 要求模型输出 JSON（或带 JSON 尾块），解析出 `reply`（Markdown）、`skill`、`stage`、`quickReplies`（2~4 项）、`proposals`（0~2 项）以及 `sessionTitle`。
- **当未配置 `AI_API_KEY` 或网络异常时（本地启发式教练引擎兜底）**：
  - 基于 `life-coach-main` 的 7 大 Skill 流程、会话当前 `stage`（从 `listen` → `clarify` → `reframe` → `experiment` → `wrapup` 自动推进）以及抽取到的用户真实 D1 数据（如引用用户真实的目标名称、恐惧标题、打卡断签天数），生成贴合小芽人格的共情回应、1 个锋利追问、3 个快捷回复选项，并在 `experiment` / `wrapup` 阶段自动生成可一键落库的 `CoachProposal`（如把用户说的最小行动生成 `checkin_plan` 提案、把拖延触发点生成 `pattern_card` 提案、把新发现的阻力生成 `coach_profile` 提案）。
  - 这样无论是否配置外部 API Key，整套产品流程、数据库读写、主动洞察、快捷回复和一键回写都能 100% 真实跑通。

---

## 6. 兼容性、迁移与回滚考量

- **向后兼容**：新增表 `0007_coach.sql` 不修改任何现有 11 张业务表的列结构；回写操作复用现有的 `checkins`、`patterns`、`fears` 表结构与归一化函数（`normalizeFearData` 等）。
- **回滚方案**：若需回滚，前端移除 `/coach` 路由与导航项，后端卸载 `/api/coach` 路由即可；由于 `/api/bootstrap` 未被侵入，现有所有页面零影响。
