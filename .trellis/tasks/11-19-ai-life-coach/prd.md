# AI 智能教练模块 (AI Life Coach)

## Goal

基于 `life-coach-main` 成长模型（小芽调度人格 + 7 大专项 Skill + ACT 核心参考 + 共享聊愈流程）与 LifeOS 已沉淀的个人数据（每日打卡、五步诊断、恐惧清单、模式库、人生罗盘 `telos_*`、能量充电屋），打造一个**零心智负担**的对话式 AI 教练模块（`/coach`）：
1. **单一连续主线 + 话题分段归档**：默认打开 `/coach` 直接进入当前活跃对话流（若无活跃会话则展示教练候诊室与主动洞察卡片，发消息即进入/续接当前活跃会话），无需用户手动管理繁琐的多会话列表；当话题结案或用户点击「完成本轮/换个话题」时，当前会话归档为历史话题胶囊。
2. **主动洞察（Proactive）+ 被动倾诉（Reactive）双模式**：系统基于确定性规则扫描 LifeOS 数据生成主动关怀线索；用户点击洞察或主动倾诉时，自动路由到对应的成长模型 Skill 并按场景注入 LifeOS 上下文。
3. **低负担交互与闭环回写**：教练每次只问一个锋利问题，附带 2~4 个快捷回复胶囊（`quickReplies`），并在形成行动或洞察时产出待确认回写提案（`proposals`），用户一键确认即可写入对应业务表（`checkins`、`patterns`、`fears`、`coach_profiles`）。

## Background & Confirmed Facts

- **独立加载模块架构**（参照 `.trellis/spec/backend/telos-module.md` 与 `worker/index.ts:39-52`）：AI 教练属于持续增长的数据模块，**不进入** `loadAll()` 与 `/api/bootstrap`，使用独立 API `/api/coach/*` 与独立前端缓存键 `["coach", ...]`；`GET /api/export` 通过 `loadCoachExport()` 完整附加 `coachProfile`、`chatSessions`、`chatMessages`。
- **独立 `coach_profiles` 表**：用户明确要求使用独立的 `coach_profiles` 表存储教练画像与长期记忆，**不复用** `documents` 表。沿用 `telos_profiles` 的部分唯一索引模式（每用户一条 `is_active = 1` 的当前画像）。
- **会话与消息双表基础**：基于仓库根目录 `inter-coach.md` 的 `chat_sessions` 和 `chat_messages`（append-only 消息流水 + `seq` 保序 + `refs_json` + `context_snapshot_json`），扩展成长循环阶段（`stage`）、触发引用（`trigger_ref_json`）、快捷回复（`quick_replies_json`）和待确认回写提案（`proposals_json`）。
- **大模型调用方式（用户已确认方案 A）**：Worker 通过环境变量 `AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL` 调用标准 OpenAI 兼容 Chat Completions 接口（`${AI_BASE_URL}/chat/completions`）；当本地开发未配置 `AI_API_KEY` 或上游不可用时，自动降级为基于 `life-coach-main` 7 大 Skill 规则与用户真实 D1 数据的本地启发式教练引擎，保证全链路随时可用。
- **成长模型资产**：`life-coach-main/` 已包含总调度 `AGENTS.md`、底层流程 `references/coaching-process.md`、`references/act-core.md`、`references/memory-system.md` 以及 7 个专项 Skill（`life-vision`、`procrastination-execution`、`planning`、`review`、`habit-design`、`energy-management`、`complex-problem-solving`）。

## Requirements

- **R1. 数据库 Schema（Migration `0007_coach.sql` & `worker/db/schema.ts`）**
  - `coach_profiles`：每用户一条 active 档案（部分唯一索引 `WHERE is_active = 1`），字段包含 `id`、`user_id`、`data`（JSON：作息节律 `routines`、能量窗口 `energyWindows`、沟通偏好与雷区 `preferences`、执行与拖延线索 `executionClues`、跨画像长期洞察 `longTermInsights`、有效策略 `effectiveStrategies`）、`version`、`is_active`、`created_at`、`updated_at`。
  - `chat_sessions`：存储教练对话单元，字段包含 `id`、`user_id`、`mode`（`'reactive' | 'proactive'`）、`skill`（7 大 Skill 之一）、`stage`（`'listen' | 'clarify' | 'reframe' | 'experiment' | 'wrapup'`）、`title`、`summary`、`trigger_ref_json`、`status`（`'active' | 'completed' | 'archived'`）、`created_at`、`updated_at`。
  - `chat_messages`：append-only 消息流水，字段包含 `id`、`user_id`、`session_id`、`seq`（会话内唯一递增序号）、`role`（`'user' | 'assistant' | 'system'`）、`content`、`skill`、`stage`、`quick_replies_json`、`proposals_json`、`refs_json`、`context_snapshot_json`、`model`、`token_usage`、`created_at`。
- **R2. 成长模型装配与按场景上下文注入**
  - 将 `life-coach-main` 的总调度、ACT 底层参考、共享七步过程与 7 大 Skill 提炼为静态配置与 Prompt 组装模块（`src/content/coach.ts` 与 `worker/coach/`）。
  - 根据当前匹配的 Skill 按场景从 D1 抽取用户的 `coach_profiles`、最近 7 天 `checkins`、进行中 `goals`、人生罗盘 `telos_profiles` + `telos_items`、未归档 `fears`、观察中 `patterns`、本周 `reviews` 摘要，组装为结构化上下文并记录快照到 `chat_messages.context_snapshot_json`。
- **R3. 主动洞察引擎（Proactive Signals）**
  - 后端基于确定性规则扫描用户 D1 数据，生成最多 3 条高价值主动洞察卡片（`CoachSignal`）：
    1. **低电量/断签关怀**（`energy-management`）：连续 ≥2 天未完成每日仪式，或最近日记/充电屋出现疲惫耗竭信号。
    2. **目标/项目停滞启动**（`procrastination-execution`）：进行中的五步诊断目标（`goals`）或罗盘项目（`telos_items`）超过 7 天未更新，或今日行动为空。
    3. **恐惧与卡点拆解**（`complex-problem-solving`）：存在未归档且尚未填完第 4 步（转化为任务）的 `fears` 条目。
    4. **周复盘与模式提炼**（`review`）：本周累计打卡 ≥2 天且当前 ISO 周尚未完成周复盘。
    5. **方向与画像校准**（`life-vision`）：首次使用或 `coach_profiles` 尚未记录任何能量窗口与执行线索。
- **R4. 对话推进与结构化输出（OpenAI 兼容接口 + 本地启发式兜底）**
  - `POST /api/coach/chat` 接收用户消息（或主动洞察触发参数），自动续接当前 `active` 会话或创建新会话。
  - 调用 OpenAI 兼容接口（或本地启发式引擎）生成教练回复，包含：共情与框架回应正文（Markdown）、更新后的 `skill` 与 `stage`、2~4 个 `quickReplies` 快捷回复胶囊，以及当处于 `experiment` / `wrapup` 阶段或识别到明确行动/模式/画像线索时的 `proposals` 待确认回写提案。
- **R5. 确认后回写（Proposal Apply）与会话结案**
  - 支持四类结构化回写提案（遵循 `life-coach-main`“确认后写入”原则）：
    1. `checkin_plan`：将共创的最小行动追加或写入今日 `checkins.data.plan`。
    2. `pattern_card`：将识别到的触发-反应-替代做法创建为 `patterns` 表的新模式卡。
    3. `fear_action`：将拆解出的下一步行动写入指定 `fears` 条目的 `data.action`（或新建恐惧拆解）。
    4. `coach_profile`：将确认的作息、能量窗口、沟通偏好、拖延线索或长期洞察合并写入 `coach_profiles.data`。
  - 用户点击「采纳并写入」时调用 `POST /api/coach/messages/:id/proposals/:proposalId/apply`，服务端执行事务写入对应业务表，将该提案状态更新为 `applied`，并把写入的 `{ table, id, op }` 追加到该消息的 `refs_json`；用户点击「忽略」可标记为 `dismissed`。
  - 用户点击「完成本轮话题」或「换个话题聊聊」时，可将当前 active 会话标记为 `completed` 并生成一句话小结（`summary`），界面平滑切换到新一轮主线或折叠展示历史话题。
- **R6. 前端 `/coach` 页面、导航与总览入口**
  - `src/components/Layout.tsx` 顶部导航新增 `{ to: "/coach", label: "AI 教练" }`；`src/pages/OverviewPage.tsx` 快捷入口新增 AI 教练入口。
  - `/coach` 页面（`src/pages/CoachPage.tsx`）采用无心智负担的布局：
    - **顶部栏**：当前教练状态（小芽 · 当前挂载的成长模型 Skill 标签 + 成长循环阶段进度点）+ 「换个话题 / 结案小结」按钮 + 「历史话题」与「我的教练画像」切换抽屉/面板。
    - **主动洞察区**：当开启新话题或处于对话起点时，展示 1~3 张主动洞察卡片，点击即可一键让教练带着上下文开口。
    - **主对话流**：展示消息气泡、消息关联的 Skill/Stage 微标、待确认/已采纳的回写提案卡片（`ProposalCard`）、已回写的业务表跳转链接（`refs`）。
    - **底部低负担输入区**：上方悬浮当前最新一轮的 2~4 个快捷回复胶囊（点击直接发送），下方为多行输入框与 Skill 快捷切换芯片。
    - **教练画像侧栏/面板**：可视化展示并允许手动编辑 `coach_profiles`（能量窗口、沟通偏好、拖延线索、长期洞察）。

## Acceptance Criteria

- [ ] **AC1 (构建与类型安全)**：`npm run typecheck`（覆盖 `tsconfig.app.json`、`tsconfig.worker.json`、`tsconfig.node.json`）与 `npm run build` 零错误通过。
- [ ] **AC2 (数据库迁移)**：`migrations/0007_coach.sql` 通过 `npm run db:migrate:local` 成功执行，创建 `coach_profiles`、`chat_sessions`、`chat_messages` 三张表及对应唯一索引/普通索引。
- [ ] **AC3 (Bootstrap 隔离与 Export 完整性)**：`GET /api/bootstrap` 响应不包含任何教练表字段；`GET /api/export` 响应完整包含 `coachProfile`、`chatSessions`、`chatMessages`。
- [ ] **AC4 (主动洞察与单一主线体验)**：访问 `/coach` 时，无需手动先建会话即可看到基于当前 D1 数据计算的 `signals`（主动洞察卡）与当前活跃对话流；点击任意主动洞察卡或快捷回复胶囊即可推进对话。
- [ ] **AC5 (成长模型路由与阶段流转)**：发送涉及拖延、低精力、方向迷茫、计划、习惯、复盘或复杂问题的消息时，响应消息包含匹配的 `skill`（7 大模型之一）、`stage`（5 个阶段之一）、`quickReplies`（2~4 条快捷回复）及 `contextSnapshot`（本次读取的 LifeOS 数据摘要）。
- [ ] **AC6 (一键确认回写闭环)**：在教练消息的提案卡上点击「采纳」，后端成功写入目标业务表（`checkins` / `patterns` / `fears` / `coach_profiles`），返回更新后的消息（提案状态变为 `applied`，`refs` 记录写入的 `{ table, id, op }`），且前端对应缓存同步更新或失效。
- [ ] **AC7 (话题结案与画像维护)**：点击「完成本轮 / 换个话题」可将当前会话归档为 `completed` 并记录 `summary`，在历史话题列表中可查看过往会话明细；在教练画像面板中可查看并手动保存 `coach_profiles`。

## Out of Scope

- 外部第三方工具（滴答清单、Notion、Google Calendar 等）的 MCP / 外部 OAuth 接入。
- 语音实时通话或多模态图片上传分析。
