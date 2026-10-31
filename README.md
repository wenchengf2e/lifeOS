# LifeOS

个人的 LifeOS 心理工作台：信念重写、人生 OS、日记、成就 / 改变清单、五步诊断、关于。

数据保存在 Cloudflare D1，站点和 API 跑在同一个 Cloudflare Worker 上，登录由 Cloudflare Access 负责。免费额度足够个人使用。

## 技术栈

- 前端：Vite + React 19 + React Router 7 + TanStack Query + Tailwind CSS 4
- API：Hono（`worker/`），和静态资源同属一个 Worker
- 数据库：Cloudflare D1，Drizzle ORM + SQL migration
- 部署：Cloudflare Workers Static Assets + Workers Builds / GitHub
- 鉴权：Cloudflare Access 登录后，Worker 读取 `Cf-Access-Authenticated-User-Email`，只允许 `OWNER_EMAIL`

## 目录

```
src/             React 前端
  components/    布局、日历、状态组件
  content/       信念重写、人生 OS、清单的文案配置；关于页静态内容
  lib/           API 客户端、查询 hooks、日期与统计工具
  pages/         总览、信念重写、人生 OS、日记、清单、五步诊断、关于
public/          静态图片（关于页图片在 public/about/）
worker/          Hono API Worker
  routes/        checkins / docs / items
  db/            Drizzle schema、client、查询
shared/          前后端共享类型
migrations/      D1 migration
wrangler.jsonc   Worker / D1 / 静态资源配置
```

## 本地开发

```bash
npm install
npm run db:migrate:local
npm run dev
```

打开 http://localhost:5173 。本地开发时 `localhost` 自动绕过 Cloudflare Access，用户身份取 `OWNER_EMAIL`（在 `wrangler.jsonc` 的 `vars` 里），所以不需要登录。

常用命令：

```bash
npm run typecheck       # app + worker + node 三套 tsconfig
npm run build           # typecheck + vite build
npm run db:migrate:local
npm run db:migrate:remote
npm run deploy          # build + wrangler deploy
npm run cf:tail         # 线上日志
```

## 首次部署

### 1. 注册 workers.dev 子域

Wrangler 部署到 workers.dev 之前，账号必须已经有一个 workers.dev 子域。这个子域是账号级的，不是项目级的：

1. 打开 Cloudflare Dashboard → Workers & Pages
2. 如果提示注册子域，选择一个可用的名字（例如 `wencheng-f2e`）
3. 部署后的地址形如 `https://lifeos.<子域>.workers.dev`（当前为 `https://lifeos.wencheng-f2e.workers.dev`）

> `lifeos` 这个名字可能已被占用。Worker 名称仍然是 `lifeos`，子域可以另选。

### 2. 创建 D1 并迁移

`wrangler.jsonc` 里的 `database_id` 已经是当前账号下的 `lifeos-db`。如果换账号或重建数据库：

```bash
npx wrangler d1 create lifeos-db
# 把新的 database_id 填回 wrangler.jsonc
npm run db:migrate:remote
```

### 3. 部署

```bash
npm run deploy
```

部署完成后，`/` 是静态 SPA，`/api/*` 是 Worker 路由，`/health` 是不需要登录的健康检查。

### 4. 配置 Cloudflare Access

**在把地址发给任何人之前，先完成这一步。** Worker 通过 Access 注入的邮箱头识别用户；没有 Access 时普通请求会返回 401，但该请求头本身没有签名校验，所以不要在 Access 开启前公开 Worker 地址。

1. 打开 [Zero Trust Dashboard](https://one.dash.cloudflare.com/)，完成初始化
   - 选择团队名，例如 `wencheng-f2e`，登录域会变成 `wencheng-f2e.cloudflareaccess.com`
   - 选择 Free plan（最多 50 个用户）；如果面板要求验证付款方式，按提示操作，免费额度不收费
2. Workers & Pages → 选择 `lifeos` → **Access** 标签
3. 点击 **Protect this Worker behind Access**
4. 选择 **All traffic**，同时保护 workers.dev、自定义域名和 preview URLs
5. Authentication policy 选择 **Cloudflare account**（只有账号成员能登录），或先在 Zero Trust 里建一个只允许 `wencheng.f2e@gmail.com` 的 email policy 再选中它
   - 不要选择 **Email domain** 后填 `gmail.com`，那会允许所有 Gmail 用户登录
6. 点击 **Apply Access**，再用无痕窗口打开站点，确认先跳到 Access 登录页

Worker 的校验逻辑在 `worker/auth.ts`：只接受 Access 注入的邮箱头，且必须与 `OWNER_EMAIL` 完全一致。**不要让任何能绕过 Access 的 hostname 指向这个 Worker**，否则客户端可以伪造该请求头。

> 使用 Static Assets 的 Worker 目前无法通过 `ctx.access` 读取身份（Cloudflare 的内部 router 不会传递该对象），因此本项目继续使用 Access 注入的请求头。

### 5. 绑定自定义域名（可选，推荐）

`*.workers.dev` 在中国大陆通常不可访问。有域名后：

1. 把域名接入 Cloudflare（免费 plan 即可）
2. Workers → `lifeos` → Settings → Domains & Routes → Add custom domain，例如 `lifeos.example.com`
3. 为这个新 hostname 再建一个 Access application / policy（或把两个 hostname 都放进同一个应用，如果面板支持）
4. 确认自定义域名可以正常登录后，再考虑关闭 workers.dev：

```jsonc
// wrangler.jsonc
"workers_dev": false
```

腾讯云注册、修改 NS、Worker Custom Domain、国内访问注意事项的完整步骤，见
[docs/custom-domain.md](docs/custom-domain.md)。

## API

所有 `/api/*` 都要求 Access 身份（本地 localhost 除外）。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 公开健康检查 |
| GET | `/api/me` | 当前登录邮箱 |
| GET | `/api/bootstrap` | 一次性拉取 checkins / documents / items |
| GET | `/api/export` | 全量 JSON 导出 |
| GET | `/api/checkins?from=&to=` | 按日期范围读取打卡 |
| GET | `/api/checkins/:date` | 读取某天打卡 |
| PUT | `/api/checkins/:date` | 保存某天打卡（upsert） |
| GET | `/api/docs` | 读取所有文档 |
| GET | `/api/docs/:module/:key` | 读取单篇文档 |
| PUT | `/api/docs/:module/:key` | 保存文档（upsert） |
| GET | `/api/items?module=` | 读取清单 |
| POST | `/api/items` | 新增清单项 |
| PATCH | `/api/items/:id` | 修改清单项 |
| DELETE | `/api/items/:id` | 删除清单项 |

数据模型：

- `checkins`：一人一天一条，`data` 是 JSON，包含 `q1`–`q6` 和 `review`
- `documents`：按 `(module, key)` 存长文本 / 结构化 JSON，人生 OS 用 `module = "lifeos"`
- `items`：清单条目，按 `(module, sort_order, created_at)` 排序

## 「关于」页

`/about` 是静态内容页，不读写 D1：

- 文字在 `src/content/about.json`，支持段落、小节、列表、引用、提示框和本地图片
- 图片放在 `public/about/`，构建时随静态资源一起发布
- 修改后重新构建部署即可生效

字段说明和示例见 [docs/about-content.md](docs/about-content.md)。

> 这个文件会打包进前端静态资源，并且仓库是公开的，**不要放私人日记或真实联系方式**。私人数据只放在 D1。

## 备份

总览页有「导出全部数据」，会下载全量 JSON。免费服务没有 SLA，建议定期导出，并把文件放到自己的网盘 / 本地目录。

## 后续

- [ ] 旧 localStorage 数据导入页面
- [ ] 五步诊断的交互表单（`documents` 模型和 API 已预留）
- [ ] 清单项的编辑、勾选完成、日期分组
- [ ] 周 / 月回顾视图
- [ ] PWA 离线壳
- [ ] Access JWT 签名校验（`jose` 已安装，等 Access 应用创建后配置 `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` 再启用）
