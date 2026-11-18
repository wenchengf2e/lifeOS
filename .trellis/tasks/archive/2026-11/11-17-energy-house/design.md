# 能量充电屋（Energy Charging House）技术设计

## 1. 架构与边界

### 1.1 分层设计
遵循 LifeOS 现有前后端分层约定：

- **共享契约层（`shared/types.ts`）**：
  - 定义 `ENERGY_TOOL_KEYS = ["awareness", "manifestation", "reframe", "behavior"] as const` 与 `EnergyToolKey`。
  - 定义 `EnergySessionData`（`{ version: 1, answers: Record<string, string> }`）、`EnergySessionEntry`、`createEmptyEnergySessionData`、`normalizeEnergySessionData`。
  - 之所以把 `answers` 设计为 `Record<string, string>`（字典结构而非固定字段），是因为用户在 `src/content/energy.ts` 中随时可能修改问题 `key` 或增删题目；字典结构能保证用户改配置文件时无需修改 `shared/types.ts` 或数据库 schema。
- **配置与文案层（`src/content/energy.ts`）**：
  - 纯 TypeScript 配置文件（无 JSX），集中定义四个工具（`energyTools`）的标题、副标题、图标、导语以及各自的 `questions` 数组，以及页面级文案 `energyPageCopy` / `energySessionCopy`。
- **派生计算层（`src/lib/energy.ts`）**：
  - 纯函数计算：根据 `session.tool` 查找工具定义、计算已答题目数与完成百分比 `energyProgress(session)`、提取首条非空回答作为卡片标题/摘要 `energySummary(session)`、找到第一道未答题索引 `firstUnansweredStep(session)`、按工具筛选与按时间排序。
- **组件与页面层**：
  - `src/pages/EnergyPage.tsx`：四大工具充电舱卡片 + 历史练习记录筛选与列表。
  - `src/pages/EnergySessionPage.tsx`：单次练习详情页，支持 `mode=write`（一步一问沉浸式书写，一次只渲染当前 `step` 对应的问题卡片）与 `mode=read`（全文纵览笔记视图，一页渲染全部问答并支持跳回任意题修改）。
  - `src/components/EnergySessionCard.tsx`：历史练习记录摘要卡片。
- **后端与数据库层**：
  - `migrations/0005_energy_sessions.sql`：新建 `energy_sessions` 表及索引。
  - `worker/db/schema.ts`：新增 `energySessions` Drizzle 表定义。
  - `worker/db/queries.ts`：新增 `mapEnergySession`，并在 `loadAll()` 中并行查询 `energy_sessions`。
  - `worker/routes/energy.ts`：提供 `/api/energy` 的 `GET /`、`GET /:id`、`POST /`、`PATCH /:id`、`DELETE /:id`，并在 `worker/index.ts` 挂载。

---

## 2. 数据流与接口契约

### 2.1 数据库 Schema（`migrations/0005_energy_sessions.sql`）

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS energy_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS energy_sessions_user_updated_idx
  ON energy_sessions (user_id, updated_at);

CREATE INDEX IF NOT EXISTS energy_sessions_user_tool_updated_idx
  ON energy_sessions (user_id, tool, updated_at);
```

### 2.2 共享类型契约（`shared/types.ts`）

```ts
export const ENERGY_TOOL_KEYS = [
  "awareness",
  "manifestation",
  "reframe",
  "behavior",
] as const;

export type EnergyToolKey = (typeof ENERGY_TOOL_KEYS)[number];

export type EnergySessionData = {
  version: 1;
  /** 问题 key -> 用户回答文本 */
  answers: Record<string, string>;
};

export type EnergySessionEntry = {
  id: string;
  tool: EnergyToolKey;
  data: EnergySessionData;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

`normalizeEnergySessionData(raw: unknown)` 会将 `raw.answers` 中的所有字符串键值对保留下来，过滤掉非字符串值，保证用户后续在 `src/content/energy.ts` 自定义新问题 `key` 时后端能直接透传保存。

### 2.3 REST API 契约（`/api/energy`）

- `GET /api/energy` → `{ energySessions: EnergySessionEntry[] }`
- `GET /api/energy/:id` → `{ session: EnergySessionEntry | null }`
- `POST /api/energy`
  - 请求体：`{ tool: EnergyToolKey, data?: Record<string, unknown>, completed?: boolean }`
  - 校验：`tool` 属于 `ENERGY_TOOL_KEYS`；序列化后 JSON 长度 ≤ 200,000（超限返回 `413 payload_too_large`）
  - 响应：`201 { ok: true, session: EnergySessionEntry }`
- `PATCH /api/energy/:id`
  - 请求体：`{ data?: Record<string, unknown>, completed?: boolean }`（至少传一个）
  - 响应：`200 { ok: true, session: EnergySessionEntry }`
- `DELETE /api/energy/:id`
  - 响应：`200 { ok: true }`

### 2.4 前端状态与 URL 状态设计

1. **缓存更新策略（`src/lib/queries.ts`）**：
   - `useCreateEnergySession`：成功后将新记录插入 `["bootstrap"]` 的 `energySessions` 队首。
   - `useUpdateEnergySession`：成功后按 `item.id === session.id && item.updatedAt <= session.updatedAt` 原地替换，避免防抖请求交错时旧响应覆盖正在输入的草稿。
   - `useDeleteEnergySession`：成功后从 `energySessions` 移除对应 `id`。
2. **一步一问与全文回看 URL 参数（`/energy/:sessionId`）**：
   - `mode`：`write`（一步一问沉浸模式）或 `read`（全文卡片回看模式）。若 URL 未指定 `mode`，当 `session.completed === true` 时默认为 `read`，否则默认为 `write`。
   - `step`：`1..N`（当前题号，仅在 `mode=write` 下生效，默认 `1`）。
3. **沉浸式书写交互细节**：
   - 切换上/下一题时自动聚焦当前题目的 `<textarea>`，不中断心流。
   - 输入变更后防抖自动触发 `PATCH /api/energy/:id`，延时统一取 `src/content/autosave.ts` 的 `AUTOSAVE_DEBOUNCE_MS`（当前 2000ms，与恐惧清单、五步诊断详情共享）。
   - 在最后一题点击「完成本次充电 ✓」时，立即落盘当前 `draft.data` 并同时设置 `completed: true`，随后将 URL 切换为 `?mode=read` 展示整篇成果卡片。

---

## 3. 关键权衡（Trade-offs）

1. **`answers: Record<string, string>` vs 固定强类型字段**：
   - 用户明确提出「你先设计默认问题模板写一个配置文件里，我到时候可以修改」。如果把每个问题的 `key` 写死在 `shared/types.ts` 和后端归一化函数里，用户改配置文件增删问题时数据会被后端丢弃或报错。因此采用 `Record<string, string>` 动态键值映射，题目列表完全由 `src/content/energy.ts` 驱动。
2. **显式 `completed` 字段 vs 仅靠题目填满派生**：
   - 沉浸式练习中，用户可能跳过某一道不想回答的题，但在最后一题点击「完成本次充电」。使用显式 `completed` 布尔列记录用户是否走完了本次练习，能准确决定下次点开时默认进入「全文回看（`read`）」还是「继续答题（`write`）」。

---

## 4. 兼容性、迁移与回滚

- **向后兼容**：`BootstrapResponse` 新增 `energySessions: EnergySessionEntry[]`，前端读取时统一用 `data?.energySessions ?? []` 兜底。
- **数据库迁移**：新增 `migrations/0005_energy_sessions.sql`，不影响现有 7 张表。本地通过 `npm run db:migrate:local` 应用。
- **回滚方案**：若需回滚前端与 Worker 改动，还原路由挂载与 `loadAll()` 查询即可；`energy_sessions` 表与现有表无外键耦合。
