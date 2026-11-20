# 目录结构

> 后端代码在 LifeOS 中如何组织。

---

## 概览

后端是一个跑在 Cloudflare Workers 上的 Hono 应用，入口为 `worker/index.ts`。

设计上没有独立的 service 层：路由文件同时承担参数校验、业务处理和响应组装；D1 访问集中在 `worker/db/`；前后端共享的数据契约放在 `shared/types.ts`。静态前端由 Workers Static Assets 提供，只有 `/api/*` 和 `/health` 先经过 Worker（见 `wrangler.jsonc` 的 `run_worker_first`）。

关键约束：

- 所有 `/api/*` 路由统一由 `requireUser` 保护（`worker/index.ts`）。
- 每个查询都必须按 `user_id = c.get("userEmail")` 过滤。
- 结构化数据要么单独建表，要么复用 `documents` 的 `(module, key)` 文档存储。

---

## 目录布局

```
worker/
├── index.ts              # Hono 入口：logger、全局路由、挂载 /api/*、404/500 处理
├── auth.ts               # requireUser：Access 身份读取、localhost 绕过、owner 校验
├── types.ts              # AppEnv：Bindings（DB / OWNER_EMAIL）与 Variables（userEmail）
├── db/
│   ├── client.ts         # getDb(d1)：Drizzle D1 客户端
│   ├── schema.ts         # Drizzle sqlite-core 表定义
│   └── queries.ts        # parseJson、行映射 mapXxx、loadAll 聚合查询
└── routes/
    ├── checkins.ts       # 打卡：按日期读取 / upsert
    ├── coach.ts          # AI 教练：状态 / 画像 / 会话 / 对话 / 提案回写
    ├── docs.ts           # 通用文档：按 (module, key) 读取 / upsert
    ├── energy.ts         # 能量充电屋练习记录 CRUD，answers 字典在 data JSON
    ├── fears.ts          # 恐惧清单 CRUD，五步 data 为 JSON
    ├── goals.ts          # 目标 CRUD，五步诊断 data 为 JSON
    ├── items.ts          # 清单项 CRUD
    ├── patterns.ts       # 模式卡 CRUD 与状态流转
    ├── reviews.ts        # 周 / 月复盘读取 / upsert
    └── telos.ts          # 人生罗盘：档案 / 五级链实体 / 整图快照
  coach/
    ├── skills.ts         # 7 大成长模型 Playbook、共享教练人格与阶段模板
    └── engine.ts         # 主动洞察扫描、上下文装配、LLM 调用与本地启发式降级

shared/types.ts           # 前端与 Worker 共享的类型、常量和数据契约
migrations/               # D1 migration：0001–0006，0007_coach.sql 起为 AI 教练
wrangler.jsonc            # Worker、D1 binding、静态资源、OWNER_EMAIL 配置
```

---

## 模块组织

### 新增一个资源模块

1. 新建 `worker/routes/<resource>.ts`，导出一个 `Hono<AppEnv>` 实例。
2. 在 `worker/index.ts` 中 `app.route("/api/<resource>", <resource>Route)` 挂载。
3. 在 `worker/db/schema.ts` 增加 `sqliteTable` 定义。
4. 在 `migrations/` 新增 `NNNN_<snake_name>.sql`，通过 `npm run db:migrate:local|remote` 应用。
5. 在 `worker/db/queries.ts` 增加 `mapXxx` 行映射；如果该资源要进入 `/api/bootstrap` 或 `/api/export`，同时加入 `loadAll()` 的并行查询。
6. 在 `shared/types.ts` 增加前后端共享类型。

### 路由文件内部结构

每个路由文件按同一顺序组织：

```ts
const bodySchema = z.object({ ... });

const route = new Hono<AppEnv>();

route.get("/", async (c) => { ... });
route.put("/:key", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid_body", issues: parsed.error.issues }, 400);
  }
  // Drizzle 查询 / 写入，user_id 来自 c.get("userEmail")
});

export default route;
```

- 校验统一使用 Zod；错误响应保持 `{ error, message?, issues? }`。
- 日期参数用 `^\d{4}-\d{2}-\d{2}$`；slug 用 `^[a-zA-Z0-9_-]+$`；复盘周期键用 `^\d{4}-(W\d{2}|\d{2})$`。
- 日期 / 周期 / 文档键等天然唯一的资源用 `PUT` upsert；自增 ID 资源用 `POST` / `PATCH` / `DELETE`。
- 大 JSON（如目标五步 `data`）在写入前检查长度（当前上限 200,000 字符，超限返回 413）。

### 数据访问

- 只通过 Drizzle 访问 D1，不在路由里手写 SQL 字符串。
- JSON 列（`data`、`evidence`）以 `text` 存储：写入 `JSON.stringify`，读取用 `parseJson` 兜底。
- 表之间没有外键约束，`user_id` 是唯一的归属依据；删除 / 修改前先按 `(id, user_id)` 查存在性，避免越权。
- 新增表时同步补索引，现有模式是 `(user_id, <查询列>)` 组合索引。

### 何时复用 `documents`，何时新建表

- 页面级、结构不固定或迭代频繁的数据 → `documents`（`module` + `key`），例如人生 OS 六栏、方向卡、Reality OS 的 `module="reality", key="trading"`。
- 需要列表、排序、筛选、状态流转或独立计数的实体 → 单独建表（`goals`、`fears`、`items`、`patterns`、`reviews`、`checkins`）。

### 恐惧清单（`fears`）

- 独立表 `fears(id, user_id, data, archived, created_at, updated_at)`；五步写在 `data` JSON 里。
- 不存 `title` / `status` 列：标题由 `data.fear` 第一行派生；`archived` 是显式布尔列，归档可逆，不再从内容派生状态。
- 路由：`GET /api/fears`、`GET /api/fears/:id`、`POST /api/fears`（`data` 可空，新建默认 `archived = false`）、`PATCH /api/fears/:id`（`data` 与 `archived` 至少传一个，只改传入的字段）、`DELETE /api/fears/:id`。
- 写入前统一走 `normalizeFearData`，JSON 长度上限 200,000；所有查询按 `user_id` 过滤。
- `fears` 已加入 `loadAll()`，因此 `/api/bootstrap` 与 `/api/export` 自动包含该字段。

### 能量充电屋（`energy_sessions`）

- 独立表 `energy_sessions(id, user_id, tool, data, completed, created_at, updated_at)`；问题回答存在 `data.answers`（`Record<string, string>`）JSON 里，由 `src/content/energy.ts` 的配置驱动题目 `key`，修改问题模板无需改表结构。
- 路由：`GET /api/energy`、`GET /api/energy/:id`、`POST /api/energy`（需传合法 `tool`）、`PATCH /api/energy/:id`（`data` 与 `completed` 至少传一个）、`DELETE /api/energy/:id`。
- 写入前统一走 `normalizeEnergySessionData`，JSON 长度上限 200,000；`energySessions` 已加入 `loadAll()`，自动包含在 `/api/bootstrap` 与 `/api/export` 中。

### 何时进入 `bootstrap`，何时独立加载

- 默认：首屏需要、多个页面共用的资源加入 `loadAll()`，随 `/api/bootstrap` 返回。
- 例外：数据可能持续增长、页面独立、故障面需要隔离的模块，使用独立接口和独立前端缓存，**不要**修改 `loadAll()` / `BootstrapResponse`。
- 独立模块仍应进入 `/api/export`：在导出路由里单独查询并附加字段，保持备份完整。
- 人生罗盘是第一个独立加载模块，详细契约见 [`telos-module.md`](./telos-module.md)。
- AI 教练是第二个独立加载模块（`chat_messages` 会持续增长），详细契约见 [`coach-module.md`](./coach-module.md)。

### 人生罗盘（`telos_*`）

- 三张表：`telos_profiles`（每用户一条 active 档案）、`telos_items`（单父指针 + `data` JSON）、`telos_snapshots`（不可变整图快照）。
- 五级链：`problem → goal → challenge → strategy → project`；`risk` 是独立根节点。父级和状态由 `worker/routes/telos.ts` 校验。
- 路由：`GET/PUT /api/telos/profile`、`/api/telos/items`、`/api/telos/snapshots`。
- `loadAll()` 与 `/api/bootstrap` 不包含任何 telos 字段；`/api/export` 单独附加 `telosProfile` / `telosItems` / `telosSnapshots`。
- 删除父节点走服务端 BFS 级联，返回 `deletedIds`；快照由服务端抓取，不信任客户端。
- 档案用独立 `telos_profiles` 表，不要复用 `documents`。

### AI 智能教练（`coach_*` / `chat_*`）

- 三张表：`coach_profiles`（每用户一条 active 画像）、`chat_sessions`（话题单元）、`chat_messages`（append-only 消息流水）。
- 画像不复用 `documents`；`coach_profiles` 用部分唯一索引保证每用户只有一条 active 画像。
- 路由：`GET /api/coach/state`、`PUT /api/coach/profile`、`GET /api/coach/sessions/:id`、`POST /api/coach/chat`、`POST /api/coach/sessions/:id/complete`、`POST /api/coach/messages/:messageId/proposals/:proposalId`。
- 成长模型与引擎在 `worker/coach/`：7 个 Skill、5 个阶段；显式 `skill` 优先于关键词路由。
- 配置了 `AI_API_KEY` 时调用 OpenAI 兼容接口，未配置或失败时降级本地引擎；`AI_API_KEY` 用 `wrangler secret`，不要写进 `vars`。
- 业务日期使用客户端 `localDate`（本地时区 `YYYY-MM-DD`），缺省才回退 UTC。
- 提案必须用户确认后 `apply` 才写业务表；重复采纳幂等。
- `loadAll()` / `/api/bootstrap` 不包含任何 coach 字段；`/api/export` 单独附加三份数据。
- 详细契约见 [`coach-module.md`](./coach-module.md)。

---

## 命名约定

- **文件**：小写资源名，如 `checkins.ts`、`reviews.ts`；目录用 `db/`、`routes/`。
- **Drizzle 导出**：表名复数 camelCase，如 `checkins`、`documents`、`items`。
- **数据库**：表和列一律 snake_case（`checkin_date`、`sort_order`、`doc_key`）；Drizzle 属性 camelCase，通过 `text("checkin_date")` 显式映射。
- **主键**：应用侧 `crypto.randomUUID()` 生成 TEXT id，不使用自增主键。
- **时间**：`created_at` / `updated_at` 存 ISO 字符串；业务日期键用本地时区的 `YYYY-MM-DD`；周复盘键 `YYYY-Www`（周一为一周起点），月复盘键 `YYYY-MM`。
- **响应**：成功用 `{ ok: true, ... }` 或 `{ <resource>: ... }`；错误用 `{ error: "snake_case_code", message?, issues? }`。
- **Hono 实例名**：路由文件内统一 `const app = new Hono<AppEnv>()`，默认导出；在 `worker/index.ts` 以 `<resource>Route` 别名导入并挂载（如 `checkinsRoute`）。

---

## 示例

| 场景 | 参考文件 |
| --- | --- |
| 按日期 upsert 的最小范例 | `worker/routes/checkins.ts` |
| 带 JSON `data`、长度上限和状态枚举的 CRUD | `worker/routes/goals.ts` |
| 无 title/status 列、字段全部由 JSON 派生的 CRUD | `worker/routes/fears.ts` |
| 通用 `(module, key)` 文档存储，新页面数据首选 | `worker/routes/docs.ts` |
| 行映射与 `/api/bootstrap` 聚合读取 | `worker/db/queries.ts` 的 `mapXxx` / `loadAll` |
| 身份中间件与本地绕过 | `worker/auth.ts` |
| 入口挂载与统一错误处理 | `worker/index.ts` |

---

## 迁移命名

`migrations/NNNN_snake_name.sql`，序号递增、下划线命名，例如：

- `0001_init.sql` — `checkins` / `documents` / `items`
- `0002_review.sql` — `reviews` / `patterns`
- `0003_goals.sql` — `goals`
- `0004_fears.sql` — `fears`（含 `archived` 列与归档索引）
- `0005_energy_sessions.sql` — `energy_sessions`（含 `tool`、`completed` 与组合索引）
- `0007_coach.sql` — `coach_profiles` / `chat_sessions` / `chat_messages`（含 active 画像部分唯一索引与会话 `seq` 唯一索引）

每个 migration 文件开头保留 `PRAGMA foreign_keys = ON;`。
