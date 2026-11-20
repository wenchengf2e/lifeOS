# AI 智能教练（coach）模块契约

> 独立模块的跨层契约。改动 `coach_*` / `chat_*` 表、`/api/coach/*` 或前端 `["coach", ...]` 查询时必须同步本文档。

---

## 1. Scope / Trigger

- 触发条件：新增或修改 AI 教练的数据库表、API 签名、请求 / 响应字段、缓存键、提案回写规则、模型调用配置。
- 本模块是项目里第二个**不进入 `bootstrap`** 的资源模块，参照 [`telos-module.md`](./telos-module.md) 的独立加载模式。
- 代码位置：`shared/types.ts`（契约与归一化）、`worker/routes/coach.ts`（HTTP）、`worker/coach/skills.ts`（成长模型 Playbook）、`worker/coach/engine.ts`（主动洞察、上下文装配、LLM / 本地引擎）、`worker/db/queries.ts`（映射与导出）、`src/lib/queries.ts`（前端缓存）、`src/pages/CoachPage.tsx`（页面）。

---

## 2. Signatures

### 2.1 数据库（migration `0007_coach.sql`）

```sql
coach_profiles(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  data TEXT NOT NULL, version INTEGER NOT NULL, is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
)
-- 部分唯一索引：每用户只允许一条 active 画像
UNIQUE INDEX coach_profiles_user_active_idx ON coach_profiles (user_id) WHERE is_active = 1

chat_sessions(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  mode TEXT NOT NULL, skill TEXT, stage TEXT NOT NULL,
  title TEXT NOT NULL, summary TEXT NOT NULL, trigger_ref_json TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
)
INDEX chat_sessions_user_status_updated_idx ON chat_sessions (user_id, status, updated_at DESC)

chat_messages(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, session_id TEXT NOT NULL,
  seq INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL,
  skill TEXT, stage TEXT,
  quick_replies_json TEXT NOT NULL, proposals_json TEXT NOT NULL,
  refs_json TEXT NOT NULL, context_snapshot_json TEXT NOT NULL,
  model TEXT, token_usage INTEGER, created_at TEXT NOT NULL
)
UNIQUE INDEX chat_messages_session_seq_uq ON chat_messages (session_id, seq)
INDEX chat_messages_user_session_seq_idx ON chat_messages (user_id, session_id, seq)
```

### 2.2 HTTP

| 方法 | 路径 | 成功响应 |
| --- | --- | --- |
| `GET` | `/api/coach/state?date=YYYY-MM-DD`（`date` 可选） | `{ profile, activeSession, activeMessages, recentSessions, signals, aiConfigured }`；无画像时返回空画像，不落库 |
| `PUT` | `/api/coach/profile` | `{ ok, profile }`；body `{ routines, energyWindows, preferences, executionClues[], longTermInsights[] }`，保存后 `version + 1` |
| `GET` | `/api/coach/sessions/:id` | `{ session, messages }`（消息按 `seq` 升序，最多最近 200 条） |
| `POST` | `/api/coach/chat` | `{ ok, session, userMessage, assistantMessage, archivedSession? }`；body `{ sessionId?, message, skill?, signalId?, triggerRef?, startNewSession?, localDate? }` |
| `POST` | `/api/coach/sessions/:id/complete` | `{ ok, session }`；body `{ summary? }`，缺省优先用已有 `summary`，再回退最后一条教练回复首行 |
| `POST` | `/api/coach/messages/:messageId/proposals/:proposalId` | `{ ok, message, appliedRef? }`；body `{ action: "apply" \| "dismiss" }` |

### 2.3 共享类型

- `COACH_SKILL_KEYS` / `COACH_STAGE_KEYS` / `COACH_PROPOSAL_KINDS` / `COACH_SESSION_STATUSES` 是唯一事实来源，前后端都从这里读。
- `CoachProfileData`、`ChatSessionEntry`、`ChatMessageEntry`、`CoachProposal`、`CoachRef`、`CoachSignal`、`CoachStateResponse` 定义在 `shared/types.ts`。
- 写入前统一走 `normalizeCoachProfile` / `normalizeCoachProposals` / `normalizeCoachRefs` / `normalizeQuickReplies`；读取行时 `mapCoach*` 也会归一化。

### 2.4 环境变量

| 键 | 必填 | 说明 |
| --- | --- | --- |
| `AI_BASE_URL` | 否 | OpenAI 兼容端点，默认 `https://api.openai.com/v1` |
| `AI_API_KEY` | 否 | 缺省时自动降级为本地启发式教练引擎；线上用 `wrangler secret put AI_API_KEY` |
| `AI_MODEL` | 否 | 默认 `deepseek-chat` |

- 不要把 `AI_API_KEY` 写进 `wrangler.jsonc` 的 `vars` 或仓库文件。
- `aiConfigured` 只反映是否存在 `AI_API_KEY`，不探测上游可用性。

---

## 3. Contracts

### 3.1 成长模型与阶段

- 七个 Skill：`life-vision`、`procrastination-execution`、`planning`、`review`、`habit-design`、`energy-management`、`complex-problem-solving`。
- 五个阶段：`listen → clarify → reframe → experiment → wrapup`，与会话七步流程对齐。
- 路由优先级：显式 `skill` > 主动洞察的 `signal.skill` > 中文关键词匹配 > 上下文默认值。
- 主动洞察由服务端确定性规则扫描生成（最多 3 条），客户端不能伪造 `signalId`；未知 `signalId` 返回 400 且不产生任何写入。

### 3.2 日期与上下文

- 业务日期一律使用本地时区 `YYYY-MM-DD`。前端 `useCoachState` 与 `useSendCoachChat` 会传 `todayKey()`；服务端 `resolveTodayKey()` 校验后使用，非法或缺省时回退到 Worker 的 UTC 日期。
- `coach_profiles` 是稳定底图：作息、固定承诺、能量窗口、沟通偏好与雷区、执行 / 拖延线索、长期洞察；不是所有记忆的总仓库。
- 上下文按 Skill 场景裁剪（打卡、目标、罗盘、恐惧、模式、周复盘），并写入 `chat_messages.context_snapshot_json` 便于审计和复现。
- `context_snapshot_json` 超限时退化为 `{ generatedAt, skill, truncated: true }`，不允许写库失败。

### 3.3 消息与回写

- `chat_messages` 是 append-only 流水；只有 `proposals_json` / `refs_json` 会在用户确认提案时更新。
- 提案结构：`{ id, kind, title, summary, status, payload }`，`status ∈ pending | applied | dismissed`。
- 回写类型与目标：

| kind | 写入目标 | payload 关键字段 |
| --- | --- | --- |
| `checkin_plan` | `checkins.data.plan`（`date` 当天） | `date`、`text`、`mode: "append" \| "replace"` |
| `pattern_card` | `patterns` 新行（`status = watching`） | `title`、`trigger`、`reaction`、`payoff`、`cost`、`alternative`、`evidence[]` |
| `fear_action` | 指定 `fears.data.action` | `fearId`、`text` |
| `coach_profile` | active `coach_profiles.data` 合并 | `patch: Partial<CoachProfileData>` |

- 采纳成功后：业务行写入、`proposal.status = applied`、`refs_json` 追加 `{ table, id, op, label }`。
- 重复采纳是幂等的：不会重复写业务表，返回按 `kind` 匹配的已有 `ref`。
- 已采纳的提案不能再 `dismiss`（400 `proposal_already_applied`）。
- 回写前必须按 `(id, user_id)` 校验消息、提案和业务行归属。

### 3.4 `bootstrap` 与 `export`

- `loadAll()` 和 `/api/bootstrap` **不包含任何 coach 字段**。
- `/api/export` 通过 `loadCoachExport()` 附加 `coachProfile` / `chatSessions` / `chatMessages`，保证备份完整。
- 前端使用独立 query key：`["coach","state"]`、`["coach","session",id]`。
- 教练发送消息不得 invalidate `["bootstrap"]`；只有提案 `apply` 写入业务表后才 invalidate `["bootstrap"]`。

### 3.5 LLM 调用与降级

- 已配置 `AI_API_KEY` 时，Worker 原生 `fetch` 请求 `${AI_BASE_URL}/chat/completions`（30s 超时），请求头固定为 `Authorization: Bearer <AI_API_KEY>` 与 `x-opencode-session: lifeos`（OpenCode 网关要求，其他 OpenAI 兼容端点会忽略该未知头），要求模型返回含 `reply/skill/stage/quickReplies/proposals/sessionTitle` 的 JSON；解析失败时退化为纯文本回复。
- 本地调试可设 `AI_DEBUG_LOG=1`，把完整请求（系统提示词、上下文快照、近 12 条历史、用户消息）打印为 `coach_llm_request` 日志；日志含用户真实数据，只在本地开启。
- 未配置 Key、网络错误、超时、JSON 解析失败一律降级到本地启发式引擎，接口保持 200，不向客户端抛 500。
- 本地引擎按阶段推进并生成 2–4 条快捷回复；`experiment` / `wrapup` 阶段生成 0–2 条保守提案，内容优先引用真实数据与用户原话。
- 所有提案默认 `pending`，必须用户确认才写入业务表。

---

## 4. Validation & Error Matrix

| 条件 | 响应 |
| --- | --- |
| `date` 不符合 `^\d{4}-\d{2}-\d{2}$` | `400 invalid_date` |
| 请求体不是对象 / 字段类型错误 / 空消息 | `400 invalid_body` + `issues` |
| `:id` / `:messageId` / `:proposalId` 不合法 | `400 invalid_id` |
| 会话 / 消息 / 提案不存在或不属于当前用户 | `404 not_found` / `404 proposal_not_found` |
| 显式 `sessionId` 指向非 active 会话 | `400 session_not_active` |
| `signalId` 不存在或已失效 | `400 invalid_signal` |
| 提案 payload 缺关键字段（如 `checkin_plan` 无 `text`） | `400 invalid_proposal` |
| `fear_action` 指向的恐惧不存在 | `404 not_found` |
| 画像 / 提案 / 上下文 / 消息内容超长 | `413 payload_too_large` |
| 采纳已采纳的提案（dismiss） | `400 proposal_already_applied` |
| LLM 上游失败 | 降级本地引擎，仍 200 |

其他约定：

- 所有查询都带 `user_id = c.get("userEmail")`。
- 会话消息 `seq` 由服务端 `max(seq) + 1` 计算，`(session_id, seq)` 唯一索引兜底。
- 单用户同时只应有一个 `active` 会话；`POST /chat` 默认续接最近一条 active。
- `startNewSession` 会先归档旧会话并返回 `archivedSession`；归档前先校验 `signalId`，避免无效请求改变状态。

---

## 5. Good / Base / Bad Cases

- **Good**：用户点击「目标停滞」洞察 → 服务端按 `signalId` 重新扫描并确认有效 → 创建 `proactive` 会话 → 本地引擎带着真实目标标题回应 → `experiment` 阶段生成 `checkin_plan` 提案 → 用户采纳 → 当天 `checkins.data.plan` 追加行动，提案变 `applied` 并记录 ref。
- **Base**：第一次进入 `/coach`，没有画像和会话 → `GET /state` 返回空画像、空会话、最多 3 条洞察 → 用户发第一句话才创建会话与消息。
- **Base**：已配置 Key 但上游超时 → 本地引擎回复，界面无错误，`model` 为空。
- **Bad**：把 coach 数据塞进 `loadAll()` / `BootstrapResponse` → 首屏请求随会话历史无限增长，所有页面被拖慢。
- **Bad**：客户端传 `signalId` 并自行指定 `skill` / 数据 → 必须拒绝：服务端重新扫描匹配，避免伪造上下文。
- **Bad**：提案直接写入业务表而不等用户确认 → 违反 `life-coach-main` 的“写入前确认”原则，必须走 `apply`。
- **Bad**：用 Worker UTC 日期生成 `checkin_plan` → 凌晨 0–8 点会写到前一天，必须使用客户端 `localDate`。

---

## 6. Tests Required

当前仓库没有自动化测试；以下为最低验证点，补测试时按这些断言写。

### 6.1 API 集成

- `GET /api/bootstrap` 的 JSON **不包含** `coachProfile` / `chatSessions` / `chatMessages`。
- `/api/export` 同时包含 `coachProfile` / `chatSessions` / `chatMessages`。
- `GET /api/coach/state` 在无画像时返回空画像且不插入行；`?date=2026-01-01` 影响信号中的日期。
- `POST /api/coach/chat` 首次消息自动建会话，消息 `seq` 为 1、2；连续消息阶段按 `listen → clarify → …` 推进。
- `POST /api/coach/chat` 显式 `skill` 时返回的 `assistantMessage.skill` 等于该值。
- 未知 `signalId` 返回 400，且不会归档当前 active 会话。
- 四类提案 `apply` 后对应业务表确实写入；重复 `apply` 不产生第二行；`dismiss` 后 `status = dismissed`。
- 提案 `apply` 后 `refs` 含 `{ table, id, op, label }`，且不能被再次 `dismiss`。
- `PUT /api/coach/profile` 连续两次，第二次 `version` 比第一次大 1。
- 未配置 `AI_API_KEY` 或上游不可达时，`POST /chat` 仍返回 200。

### 6.2 前端单元（补充测试时）

- `useSendCoachChat` 追加用户与助手消息，不整页 refetch。
- `useResolveCoachProposal` 替换目标消息并仅 invalidate `["bootstrap"]`。
- `useCompleteCoachSession` 将会话移入 `recentSessions` 并清空 active。
- `normalizeQuickReplies` 去重并截断到 4 条。

### 6.3 E2E

- 首次进入 `/coach` 看到洞察卡；点击卡片即可开始对话。
- 快捷回复胶囊一键发送，阶段标签与 Skill 标签更新。
- 提案卡「采纳并写入」后显示已写入，并可跳转到今日仪式 / 模式库 / 恐惧详情。
- 「完成本轮」后当前流清空，历史话题中可打开只读明细。
- 390px 宽度下无横向滚动，画像 / 历史抽屉全屏可用。

---

## 7. Wrong vs Correct

### Wrong：把教练数据塞回 bootstrap

```ts
// worker/db/queries.ts
export async function loadAll(db: Db, userId: string) {
  const coachRows = await db.select().from(chatMessages)...;
  return { ..., chatMessages: coachRows.map(mapChatMessage) };
}
```

问题：消息流水会持续增长，首屏请求体积和故障面随对话历史无限放大。

### Correct：独立接口 + 独立缓存 + 导出补齐

```ts
// worker/index.ts
app.route("/api/coach", coachRoute);

app.get("/api/export", async (c) => {
  const [data, telos, coach] = await Promise.all([
    loadAll(db, user),
    loadTelosExport(db, user),
    loadCoachExport(db, user),
  ]);
  return c.json({ ...data, ...telos, ...coach });
});
```

```ts
// src/lib/queries.ts
export function useCoachState() {
  return useQuery({
    queryKey: ["coach", "state"],
    queryFn: () => api.getCoachState(todayKey()),
  });
}
```

### Wrong：用 UTC 日期生成行动提案

```ts
const date = new Date().toISOString().slice(0, 10);
```

问题：在 UTC+8 的凌晨 0–8 点会写到前一天，和每日仪式页的本地日期不一致。

### Correct：客户端传本地日期，服务端校验兜底

```ts
// src/lib/queries.ts
api.sendCoachChat({ ...input, localDate: input.localDate ?? todayKey() });
```

```ts
// worker/coach/engine.ts
const today = resolveTodayKey(localDate); // 非法或缺省才回退 UTC
```
