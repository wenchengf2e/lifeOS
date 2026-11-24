# LifeOS 项目总览

> 一份面向新成员和 AI 助手的项目说明：技术架构、业务功能、数据模型与当前边界。
>
> 更新时间：2026-11-20
> 详细代码规范见 [`.trellis/spec/frontend/directory-structure.md`](../.trellis/spec/frontend/directory-structure.md) 与 [`.trellis/spec/backend/directory-structure.md`](../.trellis/spec/backend/directory-structure.md)。

---

## 1. 项目定位

LifeOS 是一个**个人心理工作台**，把「每日记录 → 每周复盘 → 长期目标与模式」串成一个闭环：

- **每日**：今日行动、晚间日记、想法、今日复盘六问。
- **每周**：四步复盘（聚焦、联结、抽象化、具体化）+ 模式库。
- **长期**：人生 OS 六栏、五步诊断目标、恐惧清单、Reality OS 投资能力六维。
- **沉淀**：成就 / 痛苦 / 关键改变 / 复盘动作清单，以及全量 JSON 导出。

数据只属于站点所有者：登录由 Cloudflare Access 负责，Worker 再校验邮箱是否等于 `OWNER_EMAIL`。

---

## 2. 技术架构

### 2.1 技术栈

| 层次 | 技术 | 用途 |
| --- | --- | --- |
| 前端框架 | React 19 + TypeScript | 页面与组件 |
| 路由 | React Router 7（`BrowserRouter`） | 扁平路由表，全部页面套 `Layout` |
| 服务端状态 | TanStack Query 5 | 单一 `["bootstrap"]` 查询缓存 + mutation |
| 样式 | Tailwind CSS 4（`@theme` token） | 语义色 `paper` / `ink` / `moss` / `clay` / `line` |
| 构建 | Vite 8 + `@cloudflare/vite-plugin` | 本地同时跑前端与 Worker |
| API | Hono 4（`worker/`） | REST API，与静态资源同一个 Worker |
| 数据库 | Cloudflare D1（SQLite） | 十一张业务表 |
| ORM | Drizzle ORM（`drizzle-orm/d1`） | 表定义与查询 |
| 校验 | Zod 4 | Worker 侧请求体校验 |
| AI | OpenAI 兼容 Chat Completions（可选） | AI 教练；未配置 Key 时降级为本地启发式引擎 |
| 鉴权 | Cloudflare Access + 邮箱头 | 仅所有者可访问 |
| 部署 | Cloudflare Workers Static Assets | SPA + API 一体部署 |
| 配置 | Wrangler 4 | D1 binding、静态资源、环境变量 |

`jose` 已安装但尚未启用：目前没有做 Access JWT 签名校验，只读取 Access 注入的邮箱请求头。

### 2.2 系统架构

```
浏览器
  │
  │  React SPA（Vite 构建产物）
  │  React Router · TanStack Query · Tailwind
  ▼
Cloudflare Access
  │  登录后注入 Cf-Access-Authenticated-User-Email
  ▼
Cloudflare Worker（Hono，worker/index.ts）
  ├─ 公开路由   /health
  ├─ 全局 API   /api/me · /api/bootstrap · /api/export
  ├─ 资源路由   /api/checkins · /api/docs · /api/fears · /api/goals
  │             /api/items · /api/reviews · /api/patterns · /api/telos · /api/coach
  │
  │  requireUser：邮箱头 → 与 OWNER_EMAIL 比对
  │  Zod 校验 → Drizzle 查询
  ▼
Cloudflare D1（SQLite，lifeos-db）
  checkins · documents · items · reviews · patterns · goals · fears · energy_sessions
  telos_profiles · telos_items · telos_snapshots
  coach_profiles · chat_sessions · chat_messages
```

前端静态资源与 Worker 同属一个 Cloudflare Worker：

- `wrangler.jsonc` 的 `assets.directory = ./dist`
- `not_found_handling = single-page-application`，所有前端深链接回落到 SPA
- `run_worker_first = ["/api/*", "/health"]`，只有 API 和健康检查先经过 Hono

### 2.3 请求与数据流

1. SPA 启动后调用一次 `GET /api/bootstrap`，Worker 用 `loadAll()` 并行读取现有八张核心业务表，返回当前用户的核心数据。人生罗盘不在其中：进入 `/compass` 时才请求 `/api/telos/*`。
2. 前端把结果放在 TanStack Query 的 `["bootstrap"]` 缓存里，`staleTime: 15s`。
3. 写操作分两类：
   - **自然键资源**用 `PUT` upsert：打卡按日期、文档按 `(module, key)`、复盘按 `(period_type, period_key)`。
   - **自增 ID 资源**用 `POST` / `PATCH` / `DELETE`：目标、恐惧条目、清单项、模式卡。
4. 多数 mutation 成功后 invalidate bootstrap；目标与恐惧相关 mutation 用 `setQueryData` 就地更新，避免覆盖正在编辑的草稿。人生罗盘 mutation 只更新自己的 `["telos", ...]` 缓存。
5. `GET /api/export` 返回 bootstrap 的核心数据，外加 `telosProfile` / `telosItems` / `telosSnapshots`、`version` 和 `exportedAt`，用于备份。

### 2.4 目录结构

```
lifeos/
├── src/                    # React 前端
│   ├── components/         # 可复用组件（含 goals/ 五步表单、fears/ 恐惧步骤卡、compass/ 罗盘组件、coach/ 教练组件、PlanReminderCard）
│   ├── content/            # 纯配置与文案（含 compass.ts、coach.ts、plan.ts）
│   ├── lib/                # API、Query、日期、统计、派生逻辑（含 compass.ts、plan.ts）
│   ├── pages/              # 路由页面（XxxPage.tsx，含 Compass*.tsx、CoachPage.tsx、PlanPage.tsx）
│   ├── App.tsx             # 路由表
│   ├── main.tsx            # 入口与 Provider
│   └── index.css           # Tailwind 4 + 设计 token
├── worker/                 # Hono API Worker
│   ├── routes/             # checkins / coach / docs / energy / fears / goals / items / reviews / patterns / telos
│   ├── coach/              # 7 大成长模型、主动洞察、上下文装配、LLM 与本地引擎
│   ├── db/                 # schema、client、queries
│   ├── auth.ts             # requireUser 身份中间件
│   ├── types.ts            # AppEnv（Bindings / Variables）
│   └── index.ts            # Worker 入口与路由挂载
├── shared/types.ts         # 前后端共享类型与常量
├── migrations/             # D1 migration（0001–0007）
├── public/                 # favicon、manifest、关于页图片
├── docs/                   # 设计、运维与开发流程文档
├── index.html              # SPA 壳
├── vite.config.ts          # React + Tailwind + Cloudflare 插件
├── wrangler.jsonc          # Worker / D1 / 静态资源 / OWNER_EMAIL
└── package.json            # 脚本与依赖
```

各目录内部的详细约定见两份 spec：

- 前端：[`.trellis/spec/frontend/directory-structure.md`](../.trellis/spec/frontend/directory-structure.md)
- 后端：[`.trellis/spec/backend/directory-structure.md`](../.trellis/spec/backend/directory-structure.md)

### 2.5 认证与安全

- 入口中间件：`worker/index.ts` 对所有 `/api/*` 挂载 `requireUser`。
- 身份来源：Cloudflare Access 注入的 `Cf-Access-Authenticated-User-Email`。
- 所有者校验：邮箱必须与 `wrangler.jsonc` 的 `vars.OWNER_EMAIL` 完全一致；不一致返回 403。
- 本地开发：`localhost` / `127.0.0.1` / `::1` / `*.localhost` 自动绕过，身份取 `OWNER_EMAIL`。
- 数据隔离：每个查询都带 `user_id = c.get("userEmail")`；表之间没有外键，`user_id` 是唯一归属依据。
- 已知限制：邮箱头没有签名校验。**不要让任何能绕过 Access 的 hostname 指向这个 Worker**；公开地址前必须确认 Access 已开启。

### 2.6 构建与部署

```bash
npm install
npm run db:migrate:local   # 本地 D1
npm run dev                # Vite + Worker 本地开发

npm run typecheck          # app / worker / node 三套 tsconfig
npm run build              # typecheck + vite build
npm run db:migrate:remote  # 线上 D1
npm run deploy             # build + wrangler deploy
npm run cf:tail            # 线上日志
```

三套 TypeScript 配置：

- `tsconfig.app.json`：`src` + `shared`，浏览器环境。
- `tsconfig.worker.json`：`worker` + `shared`，`@cloudflare/workers-types`。
- `tsconfig.node.json`：`vite.config.ts`。

部署目标是 Cloudflare Workers Static Assets；D1 binding 名为 `DB`，数据库 `lifeos-db`。完整首次部署、Access 和自定义域名步骤见 [`README.md`](../README.md) 与 [`docs/custom-domain.md`](./custom-domain.md)。

### 2.7 数据模型

| 表 | 粒度 | 关键字段 | 用途 |
| --- | --- | --- | --- |
| `checkins` | 用户 + 日期 | `checkin_date`、`data`(JSON) | 每日仪式的 `plan` / `journal` / `review` / `q1`–`q6` |
| `documents` | 用户 + module + key | `module`、`doc_key`、`data`(JSON) | 人生 OS 六栏、方向卡、周 / 月计划、Reality OS |
| `items` | 单条 | `module`、`content`、`item_date`、`done`、`sort_order` | 成就 / 痛苦 / 关键改变 / 复盘动作清单 |
| `reviews` | 用户 + 周期 | `period_type`(`week`/`month`)、`period_key`、`data`(JSON) | 周复盘、月复盘（页面待做） |
| `patterns` | 单条 | `title`、`trigger`、`reaction`、`payoff`、`cost`、`alternative`、`evidence`、`status` | 模式库 |
| `goals` | 单条 | `title`、`domain`、`status`、`data`(JSON 五步) | 五步诊断目标 |
| `fears` | 单条 | `data`(JSON 五步 + 可选权衡分析)、`archived` | 恐惧清单；标题从内容派生，归档是显式可逆标记 |
| `energy_sessions` | 单条 | `tool`、`data`(JSON `answers` 字典)、`completed` | 能量充电屋带时间戳的独立练习记录 |
| `telos_profiles` | 用户 + active 档案 | `mission`、`current_state`、`ideal_state`、`version`、`is_active` | 人生罗盘档案；部分唯一索引保证每用户一条 active |
| `telos_items` | 单条 | `parent_id`、`category`、`title`、`status`、`priority`、`sort_order`、`data`(JSON) | 人生罗盘五级链实体与风险；priority 取 P0–P3 |
| `telos_snapshots` | 单条 | `item_count`、`data`(JSON `{profile, items}`) | 人生罗盘整图快照，不可变 |
| `coach_profiles` | 用户 + active 画像 | `data`(JSON 作息 / 能量窗口 / 沟通偏好 / 执行线索 / 长期洞察)、`version`、`is_active` | AI 教练画像；部分唯一索引保证每用户一条 active |
| `chat_sessions` | 单条 | `mode`、`skill`、`stage`、`title`、`summary`、`trigger_ref_json`、`status` | 教练话题单元；前端默认续接最近 active |
| `chat_messages` | 单条 | `session_id`、`seq`、`role`、`content`、`skill`、`stage`、`quick_replies_json`、`proposals_json`、`refs_json`、`context_snapshot_json`、`model`、`token_usage` | append-only 消息流水；只有提案状态会更新 |

共同约定：

- 主键是应用侧 `crypto.randomUUID()` 生成的 TEXT，不使用自增。
- 没有 `users` 表；`user_id` 就是 Access 邮箱。
- JSON 列统一存 `text`，读取时用 `parseJson` 兜底。
- 时间字段是 ISO 字符串；业务日期键是本地时区 `YYYY-MM-DD`；周键 `YYYY-Www`（周一开头），月键 `YYYY-MM`。

---

## 3. 业务功能

### 3.1 功能地图

| 模块 | 路由 | 核心作用 | 主要数据 |
| --- | --- | --- | --- |
| 总览 | `/` | 今日状态、连续天数、目标进度、日记摘要、快捷入口、全量导出 | 聚合 bootstrap |
| 每日仪式 | `/daily` | 今日行动 / 晚间日记 / 想法 / 今日复盘六问；顶部展示本周 / 本月计划提醒 | `checkins` |
| 周 / 月计划 | `/plan` | 周期主题 + 1–3 个重点，作为每日行动的上层坐标 | `documents(module=plan)` |
| 日记 | `/diary` | 只读回看有日记或想法的日期 | `checkins` |
| 人生 OS | `/lifeos` | 方向卡 + 身份 / 阶段 / 理想 / 差距 / 策略 / 验证六栏 | `documents(module=lifeos)` |
| 人生罗盘 | `/compass`、`/compass/items/:id`、`/compass/snapshots` | 五级链战略树 + 风险登记册 + 整图快照对比 | `telos_profiles`、`telos_items`、`telos_snapshots` |
| 五步诊断 | `/principles`、`/principles/:id` | 目标列表 + 单目标五步工作台 | `goals` |
| 恐惧清单 | `/fears`、`/fears/:id` | 恐惧列表 + 五步恐惧转化（识别 → 根因 → 问题 → 行动 → 验证），含可选权衡分析 | `fears` |
| 能量充电屋 | `/energy`、`/energy/:sessionId` | 自我觉察训练 / 显化日记 / 认知重塑书写 / 行为模式分析四工具，一步一问沉浸式书写 + 全文回看 | `energy_sessions` |
| 复盘 | `/review`、`/review/week/:key` | 周复盘四步向导 + 模式库 | `reviews`、`patterns`、`items` |
| 清单 | `/lists` | 成就 / 痛苦 / 关键改变 / 复盘动作 | `items` |
| Reality OS | `/reality` | 投资能力六维 T 度雷达与升级 | `documents(module=reality)` |
| AI 教练 | `/coach` | 主动洞察 + 单一连续对话主线 + 成长模型路由 + 确认后回写业务表 | `coach_profiles`、`chat_sessions`、`chat_messages` |
| 关于 | `/about` | 项目理念、设计说明、模块介绍 | 静态 `about.json` |

### 3.2 总览 `/`

- 今日是否完成、连续打卡天数、本月打卡次数、人生 OS 六栏完成度。
- 最多三个进行中目标及其五步进度。
- 最近三条日记 / 想法摘要。
- 快捷入口：每日仪式、周 / 月计划、人生 OS、日记、复盘、五步诊断、恐惧清单、Reality OS、清单。
- 「导出全部数据」下载全量 JSON。

### 3.3 每日仪式 `/daily`

四个并列模块，定义在 `src/content/daily.ts`：

1. **今日行动**（`plan`）：今天专注什么、计划、可能障碍、应对方式。
2. **晚间日记**（`journal`）：一个自由输入框，五个问题作为追问。
3. **想法**（`review`）：不归入其他段落的零散记录。
4. **今日复盘**（`q1`–`q6`）：六个问题，想深一层时再写。

规则：

- 任意一段写了一条，当天就算完成。
- 支持 `?date=YYYY-MM-DD` 补写历史日期。
- 保存时整条 `data` 覆盖写入 `checkins`，表单有未保存 / 已保存 / 错误状态提示。
- 日历用圆点区分「有记录」和「计入完成」。

### 3.4 日记 `/diary`

- 只展示包含 `journal` 或 `review` 的打卡记录，按日期倒序。
- 纯只读归档；「补写」会跳到 `/daily?date=...`。

### 3.5 人生 OS `/lifeos`

- **方向卡**（`documents` 的 `key = "direction"`）：一句话方向、主题、下注、不做什么。
- **六栏**：身份、阶段、理想、差距、策略、验证。每栏有问题、提示语和输出区。
- 每栏单独保存为 `documents(module=lifeos, key=<栏位>)`，页面显示六栏完成进度。

### 3.6 五步诊断 `/principles`

业务意图：人生 OS 给方向，目标定义战场，五步诊断把目标拆到可执行、可验证，践行日志负责验证。

五步：

1. **目标**：可验证、有时限、包含取舍。
2. **问题**：列出障碍，选出关键问题。
3. **诊断**：追问原因链，找到根因。
4. **方案**：里程碑、行动、if-then、指标。
5. **践行**：实践记录与状态推进。

机制：

- 目标状态：`draft` / `active` / `paused` / `achieved` / `archived`。
- 领域分类，可选；创建时可根据标题推断。
- 软上限 3 个进行中目标；14 天无践行会提示停滞。
- 五步完成度由内容派生，不单独存布尔值。
- 详情页支持步骤 tab、防抖自动保存、版本守卫、删除确认。

### 3.7 复盘 `/review`

周复盘四步向导：

1. **聚焦**：从本周打卡中最多选 3 天，并标记哪些是可控 / 不可控。
2. **联结**：回顾人际与支持。
3. **抽象化**：关联已有模式卡，或新建模式卡，把选中的日期作为证据。
4. **具体化**：最多 3 个行动，可写入 `items` 的 `review` 清单。

其他能力：

- 复盘首页显示本周状态、连续复盘、模式库概览和最近 8 次周复盘。
- 模式卡字段：触发、反应、收益、代价、替代做法、证据日期、状态。
- 模式状态流转：`watching` → `verified` → `retired`。
- 允许草稿保存；先写「做得好的」再写改进，避免自我批判。
- 月复盘的表结构和 API 已支持 `period_type = "month"`，页面尚未实现。

### 3.8 清单 `/lists`

四个 tab：

- **成就**（`wins`）
- **痛苦**（`pains`）
- **关键改变**（`changes`）
- **复盘动作**（`review`）

支持新增、内联编辑、删除（带确认）；排序按 `sort_order` 与创建时间。勾选完成尚未做。

### 3.9 Reality OS `/reality`（进行中）

投资能力六维自评：

- 六个方向：`regime`（市场环境识别）、`edge`（交易优势 Edge）、`system`（入场与退出系统）、`risk`（仓位与风险管理）、`discipline`（交易执行纪律）、`review`（数据统计与复盘）。
- 每维有 T1–T5 标准，记录当前 T 度、目标 T 度和备注。
- 页面展示六边形雷达、平均 T、目标 T、差距、最弱三维、下一次升级要求。
- 数据写入 `documents(module=reality, key=trading)`，并镜像到 `localStorage`；写入失败时先用本地状态兜底。
- 当前为未提交功能，README 与相关文档尚未同步。

### 3.10 人生罗盘 `/compass`

业务意图：用 Problem → Goal → Challenge → Strategy → Project 五级链把「我在解决什么问题」到「这周在做什么项目」串成一条线；Risk 独立登记，用 prevent / detect / respond 暴露「有预防但没检测」的盲区；快照对比看见长期变化。

机制：

- 三张独立表：`telos_profiles`（每用户一条 active 档案）、`telos_items`（单父指针 + `data` JSON）、`telos_snapshots`（不可变整图快照）。
- 实体严格按五级链挂父级；`risk` 是独立根节点。父级、状态和 `data` 由 Worker 校验。
- 页面通过 `/api/telos/*` 独立加载，不进入 `/api/bootstrap`；`/api/export` 单独包含罗盘数据。
- 删除父节点级联整棵子树，二次确认显示后代数量。
- 快照仅手动创建，整图存档；diff 在前端确定性计算，不依赖 AI。
- 档案（mission / currentState / idealState）每用户一条 active 行，历史由快照承担。

### 3.11 恐惧清单 `/fears`

业务意图：把一条模糊的恐惧拆成五步，最后变成可以验证的下一步行动。恐惧写下来、拆开之后，才有机会被处理，而不是一直在脑子里放大。

五步（固定顺序，五个输入框）：

1. **识别恐惧**：我具体在害怕什么。
2. **寻找根因**：为什么害怕，追问到真正的原因。
3. **定义问题**：需要解决的是什么。
4. **转化为任务**：下一步具体做什么。
5. **验证与反馈**：取得了什么证据。

机制：

- 列表按更新时间倒序；标题取第 1 步内容第一行，空内容显示「未命名恐惧」。
- 列表默认只展示未归档条目，可切换到「已归档」；两个筛选都显示数量。
- `archived` 是显式的可逆标记：事件完全结束后在详情页归档，归档条目仍可查看、编辑和取消归档。
- 新建时只填第 1 步，创建后直接进入详情页。
- 详情页 800ms 防抖自动保存、版本守卫、离开提示与补保存；删除有二次确认。
- 第 3 步和第 4 步之间有一块可选的「权衡分析」：最多 3 条潜在好处，把握程度 / 影响程度各 1–5 分（0 表示未评），一段历史案例，以及 6 个月 / 1 年 / 3 年后的不行动代价；存在 `data.analysis` 里，默认折叠、有内容自动展开，不计入五步进度。
- 第 4 步只作文本记录，暂不与清单 / 五步诊断联动。

### 3.12 AI 智能教练 `/coach`

业务意图：把 `life-coach-main` 的 7 大成长模型与 LifeOS 沉淀的数据接起来，让教练主动发现卡点、按成长循环推进对话，并把结论落回业务表，降低「每次自己从头想」的心智负担。

机制：

- **单一连续主线 + 底层话题分段**：默认续接最近一条 `active` 会话；点「完成本轮」或「换个话题」才归档为历史话题并生成一句话 `summary`。
- **主动洞察**：服务端确定性扫描打卡断签、停滞目标 / 罗盘项目、未拆解恐惧、待复盘周、画像空缺，生成最多 3 张卡片；客户端不能伪造 `signalId`。
- **成长模型路由**：7 个 Skill（人生愿景 / 拖延执行 / 计划 / 复盘 / 习惯 / 精力 / 复杂问题）× 5 个阶段（接住 → 澄清 → 觉察 → 小实验 → 收尾）。显式 Skill 芯片优先于关键词路由。
- **上下文注入**：按 Skill 场景从 D1 抽取画像、最近打卡、目标、罗盘、恐惧、模式与周复盘摘要，写入 `context_snapshot_json`。
- **低负担交互**：每轮 2–4 个快捷回复胶囊；回复以纯文本 / Markdown 原样换行展示。
- **确认后回写**：四类提案（今日行动 / 模式卡 / 恐惧行动 / 教练画像）默认 `pending`，用户点「采纳并写入」才落库，并记录 `refs`；重复采纳幂等。
- **模型调用**：配置 `AI_API_KEY` 时走 OpenAI 兼容接口（`AI_BASE_URL` / `AI_MODEL` 可选）；未配置或失败时自动降级为本地启发式教练引擎。
- **独立加载**：不进 `/api/bootstrap`，使用 `["coach","state"]` 与 `["coach","session",id]`；`/api/export` 完整附加三表数据。
- **日期**：请求携带客户端本地 `date` / `localDate`，避免 Worker UTC 在凌晨把行动写到前一天。

详细契约见 [`.trellis/spec/backend/coach-module.md`](../.trellis/spec/backend/coach-module.md)。

### 3.13 关于 `/about`

- 静态内容页，不读写 D1。
- 内容在 `src/content/about.json`，支持段落、小节、列表、引用、提示框、图片。
- 图片放 `public/about/`，随静态资源发布。
- 仓库公开，**不要放私人日记或真实联系方式**。

### 3.14 业务闭环

```
人生 OS（方向）
    │
    ▼
五步诊断（目标与验证） ◄──── 每日仪式（行动 / 日记 / 复盘）
    │                              │
    │                              ▼
    │                        周复盘（聚焦 → 联结 → 抽象化 → 具体化）
    │                              │
    ▼                              ▼
践行记录  ────────────────►  模式库（触发 / 反应 / 收益 / 代价 / 替代）
    │                              │
    ▼                              ▼
清单（成就 / 改变 / 动作）      月复盘（待实现）

恐惧清单（回避 → 行动） ──► 第 4 步动作 ──► 每日仪式 / 清单

AI 教练（主动洞察 → 成长模型对话 → 小实验提案）
    │  采纳后回写
    ▼
今日行动 / 模式库 / 恐惧清单 / 教练画像 ──► 下一轮复盘与对话
```

---

## 4. 当前边界与待办

### 4.1 已知限制

- **没有自动化测试和 CI**：`npm run build`（typecheck + 构建）是唯一质量门。详见 [`docs/development-workflow.md`](./development-workflow.md)。
- **Access 邮箱头未做签名校验**：依赖 Cloudflare Access 在前面拦截；公开部署前必须确认 Access 已启用。
- **Reality OS 未提交**：前端代码与入口已存在，后端复用 `documents`，没有新增表或 migration。
- **月复盘只有数据结构**：API 支持 `period_type = "month"`，没有页面。
- **清单能力不完整**：缺少勾选完成、日期分组。
- **旧 localStorage 数据没有导入页面**。
- **人生罗盘与旧模块不联动**：独立表、独立加载，旧的人生 OS / 五步诊断 / 恐惧清单暂不迁移。
- **AI 教练依赖可选的外部模型**：未配置 `AI_API_KEY` 时使用本地启发式引擎，回复质量与灵活性低于真实模型；上游模型不可用时不会报错，但会退回本地模式。
- **AI 教练回写非事务**：业务行写入与消息提案状态更新是两条语句，极端失败下可能留下「已写入但提案仍 pending」；单用户顺序操作下影响很小。

### 4.2 后续方向（来自 README）

- 目标每周动作同步到清单 / 每日仪式。
- 诊断关联模式卡，周复盘展示进行中的目标。
- PWA 离线壳。
- Access JWT 签名校验（`jose` 已安装，待配置 `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD`）。

---

## 5. 相关文档

| 文档 | 内容 |
| --- | --- |
| [`README.md`](../README.md) | 项目介绍、API 表、首次部署、备份 |
| [`docs/development-workflow.md`](./development-workflow.md) | 开发流程、测试现状、风险与建议 |
| [`docs/goal-module-design.md`](./goal-module-design.md) | 目标模块与五步诊断的设计取舍 |
| [`docs/review-module-design.md`](./review-module-design.md) | 周复盘与模式库的设计依据 |
| [`docs/about-content.md`](./about-content.md) | 关于页 JSON 结构与图片规范 |
| [`docs/custom-domain.md`](./custom-domain.md) | 自定义域名与国内访问 |
| [`.trellis/spec/backend/coach-module.md`](../.trellis/spec/backend/coach-module.md) | AI 教练模块的 DB / API / 提案回写 / LLM 降级契约 |
| [`.trellis/spec/frontend/directory-structure.md`](../.trellis/spec/frontend/directory-structure.md) | 前端目录与命名规范 |
| [`.trellis/spec/backend/directory-structure.md`](../.trellis/spec/backend/directory-structure.md) | 后端目录、模块与迁移规范 |
