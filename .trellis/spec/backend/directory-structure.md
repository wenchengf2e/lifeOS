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
    ├── docs.ts           # 通用文档：按 (module, key) 读取 / upsert
    ├── goals.ts          # 目标 CRUD，五步诊断 data 为 JSON
    ├── items.ts          # 清单项 CRUD
    ├── patterns.ts       # 模式卡 CRUD 与状态流转
    └── reviews.ts        # 周 / 月复盘读取 / upsert

shared/types.ts           # 前端与 Worker 共享的类型、常量和数据契约
migrations/               # D1 migration：0001_init.sql / 0002_review.sql / 0003_goals.sql
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
- 需要列表、排序、筛选、状态流转或独立计数的实体 → 单独建表（`goals`、`items`、`patterns`、`reviews`、`checkins`）。

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

每个 migration 文件开头保留 `PRAGMA foreign_keys = ON;`。
