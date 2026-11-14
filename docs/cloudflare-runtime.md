# Cloudflare Workers / Hono / D1：运行与部署说明

> 基于本仓库当前配置整理，时间：2026-11-14。
>
> 相关文件：[`wrangler.jsonc`](../wrangler.jsonc)、[`vite.config.ts`](../vite.config.ts)、[`worker/index.ts`](../worker/index.ts)、[`worker/auth.ts`](../worker/auth.ts)、[`worker/db/client.ts`](../worker/db/client.ts)、[`package.json`](../package.json)。

先纠正一个说法：Cloudflare 不是一个 Web 框架，而是一整套**边缘运行平台**。这个项目里其实是四层东西配合：

| 层 | 角色 | 本项目中的位置 |
|---|---|---|
| Cloudflare Workers | Serverless 运行时（跑 JS 的边缘容器） | `worker/` |
| Hono | 跑在 Workers 里的 Web 框架（路由、中间件） | `worker/index.ts` |
| D1 | Cloudflare 的 Serverless SQLite 数据库 | binding `DB`，`migrations/` |
| Wrangler / Vite 插件 | 本地开发、构建、部署、迁移 CLI | `package.json`、`vite.config.ts` |

Drizzle 只是 ORM，负责把 TypeScript 查询翻译成 SQL；真正执行 SQL 的是 D1。

---

## 1. 三个核心概念

### Cloudflare Workers

它不是 Node.js 服务器，而是跑在 Cloudflare 全球边缘节点上的 V8 isolate：

- 入口是一个 `fetch(request, env, ctx)` 函数，没有长期运行的进程
- 只能用 Web 标准 API（`Request` / `Response` / `fetch` / `crypto`），没有 `fs`、`net` 这类 Node API
- 每个请求独立执行，天然无状态；要存数据就用 D1、KV、R2 等绑定
- 有 CPU 时间和请求大小限制，不适合跑长任务

这个项目里，前端静态资源和 API 在**同一个 Worker** 里：

```jsonc
// wrangler.jsonc
"main": "worker/index.ts",
"assets": {
  "directory": "./dist",
  "not_found_handling": "single-page-application",
  "run_worker_first": ["/api/*", "/health"]
}
```

意思是：`/api/*` 和 `/health` 先交给 Worker；其他路径直接由静态资源服务；找不到的路径回落到 `index.html`，交给 React Router。

### Hono

Hono 是专为边缘运行时设计的轻量 Web 框架，写法类似 Express：

```ts
const app = new Hono<AppEnv>();

app.use("*", logger());
app.get("/health", (c) => c.json({ ok: true }));
app.use("/api/*", requireUser);
app.route("/api/fears", fearsRoute);

export default app;
```

它只做路由和中间件，不负责启动服务器。Workers 拿到请求后调用 `app.fetch()`，Hono 再分发到对应路由。`AppEnv` 里定义了 `Bindings`（`DB`、`OWNER_EMAIL`）和 `Variables`（`userEmail`），所以 `c.env.DB` 和 `c.get("userEmail")` 都有类型。

### D1 + Drizzle

D1 是 Cloudflare 托管的 SQLite。Worker 通过 binding 拿到数据库对象：

```ts
// worker/db/client.ts
export function getDb(d1: D1Database) {
  return drizzle(d1);
}
```

路由里这样用：

```ts
const db = getDb(c.env.DB);
await db.select().from(fears).where(eq(fears.userId, c.get("userEmail")));
```

`env.DB` 不是网络连接串，而是平台注入的 binding。本地和线上用的是同一套代码，只是 binding 背后指向不同的数据库。

---

## 2. 本项目的请求链路

线上：

```
浏览器
  │
  ▼
Cloudflare Access（登录、注入用户邮箱头）
  │
  ▼
Cloudflare Worker（边缘 isolate）
  ├─ /api/*  → Hono → requireUser → 路由 → Zod → Drizzle → D1
  └─ 其他     → Static Assets（React SPA；深链接回落 index.html）
```

关键点：

- `worker/auth.ts` 从 `Cf-Access-Authenticated-User-Email` 读邮箱，再和 `OWNER_EMAIL` 比对
- 本地请求（`localhost` / `127.0.0.1` / `::1` / `*.localhost`）直接绕过 Access，身份取 `OWNER_EMAIL`
- 每个查询都带 `user_id = c.get("userEmail")`，数据隔离靠这一条
- 目前只信任 Access 注入的邮箱头，没有校验 JWT 签名（`jose` 已装但未启用）

---

## 3. 本地怎么运行

```bash
npm run dev          # 实际执行 vite
npm run db:migrate:local
```

`vite.config.ts` 里用了 `@cloudflare/vite-plugin`：

```ts
plugins: [react(), tailwindcss(), cloudflare()]
```

这个插件做了两件事：

1. 在 Vite 开发服务器里跑一个本地 `workerd`（Cloudflare 运行时的本地实现）
2. 把 Worker 和前端放进同一个开发进程，前后端都走一个地址，React 仍有 HMR

本地数据流：

```
浏览器 → Vite dev server（HMR）
           └─ /api/* → workerd 里的 Worker → 本地 SQLite
```

本地数据库：

- `npm run db:migrate:local` 执行 `wrangler d1 migrations apply DB --local`
- 数据存在项目下的 `.wrangler/state/`（Miniflare 的本地 SQLite 文件），不会碰线上
- 本地也有 `d1_migrations` 表，记录哪些 migration 已经应用

本地环境变量来自 `wrangler.jsonc` 的 `vars`；如果以后有密钥，本地放 `.dev.vars`，线上用 `wrangler secret put`。

---

## 4. 线上怎么部署

部署分两步，顺序不能反：

### 第一步：远端数据库迁移

```bash
npm run db:migrate:remote
# = wrangler d1 migrations apply DB --remote
```

Wrangler 会：

- 读取 `migrations/` 下还没应用的 SQL
- 在远端 D1 上执行，并写入远端 `d1_migrations`
- 执行前自动备份；单条 migration 失败会回滚该条

这次部署实际就是给线上应用了 `0004_fears.sql`。

### 第二步：部署 Worker + 前端

```bash
npm run deploy
# = npm run build && wrangler deploy
```

`npm run build` 会先跑三套 TypeScript 检查，再执行 `vite build`。`@cloudflare/vite-plugin` 会生成两份产物：

- `dist/client/`：前端静态资源
- `dist/lifeos/`：打包后的 Worker 脚本

部署日志里的「Using redirected Wrangler configuration」就是这个插件生成的 `dist/lifeos/wrangler.json`，它会把 assets 指向 `dist/client`。所以直接看根目录 `wrangler.jsonc` 里的 `assets.directory: "./dist"` 会有点疑惑，实际部署时配置被插件重定向了。

`wrangler deploy` 会上传 Worker 脚本和静态资源，生成新版本并切换流量。这次输出是：

```
https://lifeos.wencheng-f2e.workers.dev
Current Version ID: b14cdfd2-fea4-48f2-90c6-297e8f0c856d
```

可以用这些命令查看和回滚：

```bash
npx wrangler deployments list
npx wrangler rollback [deployment-or-version-id]
npm run cf:tail        # 实时看线上日志
```

---

## 5. 本地 vs 线上对照

| 维度 | 本地 | 线上 |
|---|---|---|
| Worker 运行时 | `workerd`（本地模拟） | Cloudflare 边缘 isolate |
| 前端 | Vite dev server，HMR | 构建后的静态资源，由 Static Assets 提供 |
| 数据库 | `.wrangler/state/` 下的本地 SQLite | 远端 D1（`lifeos-db`） |
| 迁移命令 | `db:migrate:local` | `db:migrate:remote` |
| 鉴权 | localhost 自动绕过，身份取 `OWNER_EMAIL` | Cloudflare Access + 邮箱头校验 |
| 访问入口 | `localhost:5173`（Vite） | `*.workers.dev` 或自定义域名 |
| 环境变量 | `wrangler.jsonc` 的 `vars` / `.dev.vars` | `vars` / `wrangler secret` |
| 部署方式 | 不部署，进程内运行 | `wrangler deploy` 上传版本 |

---

## 6. 几个最容易踩的坑

1. **Workers 不是 Node**：不能用 `fs`、原生 TCP、随便装依赖。第三方包必须兼容 Workers；这个项目里 Hono、Drizzle、Zod 都是兼容的。
2. **本地和线上数据库是两套**：本地迁移成功不代表线上有表。部署前一定先跑 `db:migrate:remote`，否则 Worker 查询新表会 500。这次 `fears` 就是这样处理的。
3. **migration 一旦应用就不要改历史文件**：Wrangler 按文件名记录，改了已应用的文件不会重新执行。这次把 `0004` 和 `0005` 合并，是因为线上从未应用过；本地通过清理 `d1_migrations` 里的 0005 记录保持了一致。
4. **静态资源和 Worker 同一次发布**：`wrangler deploy` 会把两者一起上传；不要只部署 Worker 而漏掉前端资源。
5. **Access 是平台层配置，不在代码里**：`wrangler.jsonc` 只写 `OWNER_EMAIL`；登录策略、域名保护要在 Cloudflare Dashboard 配。
6. **`workers.dev` 在国内通常不可达**：这次部署成功但当前网络打不开，就是这个原因；需要绑定自定义域名（`lifeos.lifecraft.top`）才能稳定访问。

---

## 7. 命令速查

```bash
npm run dev                 # 本地跑前端 + Worker + 本地 D1
npm run db:migrate:local    # 应用本地 migration
npm run typecheck           # 三套 TS 检查
npm run build               # typecheck + vite build
npm run db:migrate:remote   # 应用线上 D1 migration
npm run deploy              # build + wrangler deploy
npm run cf:tail             # 线上实时日志
```

一句话总结：**Workers 提供边缘运行时，Hono 负责路由，D1 负责数据，Wrangler 负责把本地代码、远端数据库和静态资源按顺序发上线。** 本地是 `vite + workerd + 本地 SQLite`，线上是 `Access + Workers + 远端 D1`，同一套代码通过 binding 切换环境。
