# 能量充电屋模块

## Goal

新增「能量充电屋」（Energy Charging House）核心模块（`/energy`、`/energy/:sessionId`），包含**自我觉察训练**、**显化日记**、**认知重塑书写**、**行为模式分析**四类心理练习工具。支持**一步一问的沉浸式书写交互**（一次只聚焦回答当前问题，再进入下一题）与**全文卡片回看视图**双模式切换，每次练习生成一篇带时间戳的独立练习记录，并将所有工具及问题模板集中配置在纯配置文件 `src/content/energy.ts` 中，方便用户随时修改或扩充问题。

## Background & Confirmed Facts

- **技术栈与分层**：前端 React 19 + React Router 7 + TanStack Query 5（单一 `["bootstrap"]` 缓存）+ Tailwind CSS 4；后端 Cloudflare Workers (Hono 4) + Cloudflare D1 + Drizzle ORM + Zod。
- **路由与导航约定**：
  - 路由表位于 `src/App.tsx`；顶部导航位于 `src/components/Layout.tsx:4` 的 `NAV` 数组；首页快捷入口位于 `src/pages/OverviewPage.tsx:255`。
- **内容配置约定**：
  - `src/content/` 存放纯配置与文案（无 JSX）。新建 `src/content/energy.ts` 集中定义四大工具的元信息与问题数组，用户后续改文案或增删问题只需改此文件。
- **数据存储与缓存约定**：
  - 后端规范（`.trellis/spec/backend/directory-structure.md:95`）规定「需要列表、排序、筛选或独立计数的实体 → 单独建表」。
  - 新建 D1 表 `energy_sessions`（migration `migrations/0005_energy_sessions.sql`），接入 `worker/db/schema.ts`、`worker/db/queries.ts` 的 `loadAll()`（自动进入 `/api/bootstrap` 与 `/api/export`）及 `worker/routes/energy.ts`。
  - 前端 mutation 沿用 `useCreateFear` / `useUpdateFear` / `useDeleteFear` 的 `setQueryData` 就地更新策略（`src/lib/queries.ts:162`），避免防抖自动保存触发全量 refetch 覆盖正在输入的草稿。

## Requirements

### R1. 集中式工具与问题模板配置（`src/content/energy.ts`）
1. 在 `shared/types.ts` 定义工具标识常量 `ENERGY_TOOL_KEYS = ["awareness", "manifestation", "reframe", "behavior"] as const` 及 `EnergyToolKey`。
2. 在 `src/content/energy.ts` 导出 `energyTools` 数组，每个工具包含：`key`、`title`、`subtitle`、`icon`、`badge`、`description`、`questions`（数组，每题含 `key`、`title`、`prompt`、`hint`、`placeholder`）。
3. 四个工具的默认问题模板设计如下（每工具 4–5 题，用户可随时在 `src/content/energy.ts` 中修改）：
   - **自我觉察训练（`awareness`）**：
     1. `bodyAndMood` — 身心扫描：此刻我的身体哪个部位最紧绷或有感觉？如果给现在的情绪起个名字，它叫什么？
     2. `triggerEvent` — 触发锚点：今天或刚才，是哪一个具体瞬间、哪句话或哪件事触发了这种状态？
     3. `innerVoice` — 内心独白：在那个瞬间，我脑海里自动冒出的第一句话（评判、担忧或防卫）是什么？
     4. `unmetNeed` — 底层需求：这份情绪背后，其实在保护我什么？我真正渴望被满足的需求是什么？
     5. `gentleCare` — 当下安顿：如果像对待好朋友一样对待现在的自己，我此刻可以做一件什么最小的事来照顾自己？
   - **显化日记（`manifestation`）**：
     1. `futureScene` — 理想画面：闭上眼来到已经实现愿望的那一天，我看到了什么具体的场景？周围有什么声音和细节？
     2. `embodiedFeeling` — 具身感受：当这一切已经成为现在的事实，我身体里流动着怎样的感觉（松弛、笃定、喜悦）？
     3. `identityShift` — 身份对齐：那个已经拥有这一切的我，是怎么看待自己、怎么开启每一天的？
     4. `gratitudeNow` — 先行感恩：回望今天，我已经拥有了哪些正在支撑我走向那个画面的微小证据与资源？
     5. `inspiredAction` — 灵感行动：顺着这份充盈的能量，今天我可以满怀喜悦地去做哪一件顺流的小事？
   - **认知重塑书写（`reframe`）**：
     1. `situation` — 客观事实：发生了什么具体事件？（只写摄像机能拍下的客观事实，不带形容词和脑补）
     2. `automaticThought` — 自动思维：我当时脑子里立刻得出了什么结论？我最担心的坏结果是什么？
     3. `evidenceCheck` — 证据检验：有哪些客观事实支持这个想法？又有哪些事实或过往经历说明它未必完全是真的？
     4. `newPerspective` — 转换视角：如果三年后的我，或者一位既智慧又爱我的朋友来看这件事，会怎么重新解读它？
     5. `empoweringBelief` — 赋能新信念：现在，我选择用哪一句更真实、更有力量的话来替代刚才的旧想法，并迈出哪一步？
   - **行为模式分析（`behavior`）**：
     1. `targetBehavior` — 锁定行为：我想拆解的这次重复行为（如拖延、刷手机、讨好、退缩或冲动反应）具体是怎么发生的？
     2. `cueAndTrigger` — 触发线索：在这个行为发生前几分钟，我在哪里、面对什么任务、身体或情绪有什么前兆信号？
     3. `hiddenPayoff` — 隐性收益：这个看似消耗我的行为，在当下那一刻帮我立刻缓解了什么不适，或给了我什么短暂的好处？
     4. `actualCost` — 真实代价：当短暂的缓解过去后，它给我带来了什么长期代价或真实感受？
     5. `ifThenDesign` — 替代回路：下次当同样的触发信号出现时，我可以用哪个更轻量、能照顾同一种需求的动作来替代（如果…我就…）？

### R2. 数据模型与 API（`energy_sessions`）
1. D1 表 `energy_sessions`：
   - `id` (`TEXT PRIMARY KEY`，UUID)
   - `user_id` (`TEXT NOT NULL`)
   - `tool` (`TEXT NOT NULL`，四个 `EnergyToolKey` 之一)
   - `data` (`TEXT NOT NULL DEFAULT '{}'`，JSON 字符串：`{ version: 1, answers: Record<string, string>, notes?: string }`)
   - `completed` (`INTEGER NOT NULL DEFAULT 0`，布尔标记：是否已完成整轮练习)
   - `created_at` (`TEXT NOT NULL`，ISO 时间戳)
   - `updated_at` (`TEXT NOT NULL`，ISO 时间戳)
   - 索引：`(user_id, updated_at)` 与 `(user_id, tool, updated_at)`。
2. Worker 路由 `/api/energy`（`worker/routes/energy.ts`）：
   - `GET /api/energy`：按 `updated_at` 倒序返回当前用户全部练习记录。
   - `GET /api/energy/:id`：返回单条记录。
   - `POST /api/energy`：传入 `{ tool, data?, completed? }`，新建一条独立练习记录并返回 `201 { ok: true, session }`。
   - `PATCH /api/energy/:id`：传入 `{ data?, completed? }`（至少一项），更新记录并返回 `{ ok: true, session }`。
   - `DELETE /api/energy/:id`：删除指定记录。
3. `/api/bootstrap` 与 `/api/export`：
   - `BootstrapResponse` 新增 `energySessions: EnergySessionEntry[]`，在 `loadAll()` 中并行加载。

### R3. 能量充电屋主页（`/energy`，`src/pages/EnergyPage.tsx`）
1. **顶部四大工具充电舱卡片**：
   - 网格展示「自我觉察训练」「显化日记」「认知重塑书写」「行为模式分析」四张卡片，显示图标、名称、副标题、问题数量、该工具累计练习次数，以及「开始一次沉浸练习」按钮。
   - 点击「开始一次沉浸练习」立即创建一条带当前时间戳的 `energy_sessions` 记录，并跳转到 `/energy/:sessionId?mode=write&step=1`。
2. **历史练习记录区**：
   - 支持按工具筛选（全部 / 自我觉察 / 显化日记 / 认知重塑 / 行为模式），每个筛选项显示对应记录数量。
   - 按 `updatedAt`（或 `createdAt`）倒序展示练习卡片：显示所属工具标签、练习日期与精确时间（如 `11月17日 周二 14:30`）、完成状态徽章与首题回答摘要预览（单行）；不展示答题数量，保持卡片紧凑。
   - 点击卡片：若 `completed === true`，默认进入全文卡片回看视图（`/energy/:sessionId`）；若未完成，默认进入一步一问沉浸式视图并定位到第一道未答题（`/energy/:sessionId?mode=write&step=<next>`）。
   - 每张卡片提供「删除记录」按钮，二次确认后删除该条练习（与详情页删除共用同一 API 与缓存更新）。

### R4. 一步一问沉浸式书写与全文回看页（`/energy/:sessionId`，`src/pages/EnergySessionPage.tsx`）
1. **双模式切换（方案 A）**：
   - **沉浸式一步一问模式（`mode=write`）**：
     - 顶部显示工具名称、创建时间、自动保存状态指示、当前题号进度条（如 `第 2 / 5 题`）以及可点击跳转的步骤圆点。
     - 中心聚焦卡片一次只渲染**当前这一道问题**：大字号主问题 `prompt`、温和的引导提示 `hint`、自适应高度的沉浸式文本域（自动聚焦，支持快捷键 `Cmd/Ctrl + Enter` 进入下一题）。
     - 底部操作栏提供「上一题」「保存草稿」「下一题」（最后一题显示「完成本次充电 ✓」），以及切换到「全文预览」的入口。
     - 点击「完成本次充电 ✓」时保存当前内容并将 `completed` 标记为 `true`，随后平滑切换到「全文回看模式」。
   - **全文卡片回看模式（`mode=read`，已完成记录默认）**：
     - 像一篇排版舒展的带时间戳心理笔记，一页完整展示本次练习的所有问题与回答（未答题目温和标示）。
     - 顶部提供「进入沉浸式逐题修改」按钮（切回 `mode=write&step=1`），每道题旁也可直接点「修改此题」跳到对应 `step`。
     - 底部提供「返回能量充电屋」与「删除本次记录」（带二次确认）。
2. **防抖自动保存与版本守卫**：
   - 书写过程中防抖自动保存（统一使用 `src/content/autosave.ts` 的 `AUTOSAVE_DEBOUNCE_MS = 2000`）+ `changeVersion` 守卫 + `beforeunload` 提醒 + 路由卸载补保存，体验与 `FearDetailPage.tsx` 保持一致。

### R5. 导航与总览入口集成
1. `src/components/Layout.tsx` 顶部导航 `NAV` 增加 `{ to: "/energy", label: "能量充电屋" }`。
2. `src/pages/OverviewPage.tsx` 右侧「今天想做点什么？」快捷入口增加「⚡ 能量充电屋」（显示累计充电次数）。

## Out of Scope

- 在线可视化增删改问题模板的后台管理界面（问题模板通过直接编辑 `src/content/energy.ts` 维护）。
- 音频/冥想背景音乐播放、AI 自动点评或跨模块自动生成清单项。

## Acceptance Criteria

- [ ] AC1：`src/content/energy.ts` 集中定义自我觉察训练、显化日记、认知重塑书写、行为模式分析四个工具及其默认问题模板，无 JSX，修改配置即可调整题目。
- [ ] AC2：`migrations/0005_energy_sessions.sql` 可在本地 D1 正常执行，`/api/energy` 支持 CRUD，`/api/bootstrap` 与 `/api/export` 包含 `energySessions`。
- [ ] AC3：`/energy` 页面展示四大工具入口卡片与带时间戳的历史练习记录列表，支持按工具筛选并显示对应数量。
- [ ] AC4：点击任一工具可创建独立练习记录并进入 `/energy/:sessionId` 的一步一问沉浸式书写视图，一次只展示一道问题，支持上一题/下一题切换（URL `?step=1..N` 同步）与防抖自动保存（`AUTOSAVE_DEBOUNCE_MS = 2000`）。
- [ ] AC5：完成最后一题后标记 `completed = true` 并展示全文卡片回看视图；从历史记录点开已完成记录默认展示全文回看视图，且可随时切回一步一问模式修改任意题目；支持带确认的删除。
- [ ] AC6：`npm run typecheck` 与 `npm run build` 零错误通过。
