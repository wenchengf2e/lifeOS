# AI 智能教练模块 (AI Life Coach) — 执行计划 (`implement.md`)

## 1. 有序实施清单 (Ordered Implementation Checklist)

### Step 1: 数据库迁移与 Drizzle Schema
- [ ] 新建 `migrations/0007_coach.sql`：创建 `coach_profiles`（带 `WHERE is_active = 1` 部分唯一索引）、`chat_sessions`、`chat_messages`（带 `(session_id, seq)` 唯一索引）。
- [ ] 更新 `worker/db/schema.ts`：导出 `coachProfiles`、`chatSessions`、`chatMessages`。
- [ ] 执行 `npm run db:migrate:local` 验证本地 D1 迁移成功。

### Step 2: 前后端共享类型与归一化契约
- [ ] 更新 `shared/types.ts`：
  - 新增 `COACH_SKILL_KEYS`、`COACH_STAGE_KEYS`、`COACH_PROPOSAL_KINDS` 常量及对应类型。
  - 新增 `CoachProfileData`、`ChatSessionEntry`、`ChatMessageEntry`、`CoachProposal`、`CoachRef`、`CoachSignal`、`CoachContextSnapshot`、`CoachStateResponse` 类型。
  - 新增 `normalizeCoachProfile`、`normalizeCoachProposals`、`normalizeCoachRefs` 等安全归一化函数。
  - 在 `ExportResponse` 中扩展 `coachProfile`、`chatSessions`、`chatMessages`。
- [ ] 更新 `worker/types.ts`：在 `Bindings` 中添加 `AI_BASE_URL?: string`、`AI_API_KEY?: string`、`AI_MODEL?: string`。

### Step 3: 数据库映射与导出集成
- [ ] 更新 `worker/db/queries.ts`：
  - 新增 `mapCoachProfile`、`mapChatSession`、`mapChatMessage`。
  - 新增 `loadCoachExport(db, userId)`，保持 `loadAll()` 不变（确保 `/api/bootstrap` 不包含教练数据）。
- [ ] 更新 `worker/index.ts`：在 `/api/export` 中并行调用 `loadCoachExport(db, user)` 并合并进 `ExportResponse`。

### Step 4: 成长模型库、主动洞察与教练对话引擎
- [ ] 新建 `worker/coach/skills.ts`：提炼 `life-coach-main` 的小芽总调度人格（`AGENTS.md`）、会话七步法（`coaching-process.md`）、ACT 核心技术（`act-core.md`）与 7 大专项 Skill 的核心流程、路由关键词及阶段推进模板。
- [ ] 新建 `worker/coach/engine.ts`：
  - 实现 `buildProactiveSignals(db, userId)`：扫描 `checkins`、`goals`、`telos_items`、`fears`、`reviews`、`coach_profiles` 生成主动洞察卡片。
  - 实现 `buildCoachContextSnapshot(db, userId, skill)`：按 Skill 场景抽取用户真实 D1 数据摘要。
  - 实现 `generateCoachTurn(...)`：优先使用 `AI_API_KEY` 请求 `${AI_BASE_URL}/chat/completions`（OpenAI 兼容 JSON 响应），未配置或失败时平滑降级到本地启发式教练引擎（结合真实数据快照、当前 Stage 自动推进、快捷回复与回写提案生成）。

### Step 5: Worker `/api/coach/*` 路由实现与挂载
- [ ] 新建 `worker/routes/coach.ts`：
  - `GET /state`：返回 `profile`、`activeSession`、`activeMessages`、`recentSessions`、`signals`、`aiConfigured`。
  - `PUT /profile`：Zod 校验并 upsert 当前 active `coach_profiles`（`version + 1`）。
  - `GET /sessions/:id`：返回指定会话及其按 `seq` 升序排列的消息。
  - `POST /chat`：支持续接当前 `active` 会话或开启新会话，写入 `user` 消息（`seq` 递增）与 `assistant` 消息（含 `skill`、`stage`、`quickReplies`、`proposals`、`contextSnapshot`）。
  - `POST /sessions/:id/complete`：将当前会话标记为 `completed` 并保存一句话 `summary`。
  - `POST /messages/:messageId/proposals/:proposalId`：处理 `apply`（向 `checkins` / `patterns` / `fears` / `coach_profiles` 写入数据，更新提案 `status = "applied"` 并追加 `refs_json`）或 `dismiss`。
- [ ] 在 `worker/index.ts` 中挂载 `app.route("/api/coach", coachRoute)`。

### Step 6: 前端配置、API 与 Query Hooks
- [ ] 新建 `src/content/coach.ts`：定义 7 大成长模型展示配置（中文名、图标、简介、默认开场问题）、5 大成长循环阶段中文标签、回写提案类型标签与教练画像字段说明。
- [ ] 更新 `src/lib/api.ts`：新增 `getCoachState`、`saveCoachProfile`、`getCoachSession`、`sendCoachChat`、`completeCoachSession`、`resolveCoachProposal`。
- [ ] 更新 `src/lib/queries.ts`：新增 `useCoachState`、`useCoachSession`、`useSaveCoachProfile`、`useSendCoachChat`、`useCompleteCoachSession`、`useResolveCoachProposal`（采纳提案后同步更新 `["coach", "state"]` 并 invalidate `["bootstrap"]`）。

### Step 7: 前端 `/coach` 页面与导航入口
- [ ] 新建 `src/pages/CoachPage.tsx`：
  - 顶部教练状态栏：展示当前挂载的成长模型 Skill、5 步成长循环进度指示器、「完成本轮 / 换个话题」按钮、「历史话题」与「教练画像」抽屉开关。
  - 主动洞察区：展示 `signals` 卡片，点击直接带入上下文发起或继续对话。
  - 单一连续对话流：渲染用户与小芽教练消息、Skill & Stage 标签、可交互的回写提案卡（「采纳并写入」/「忽略」）、已生效的 `refs` 跳转链接，以及历史已结案话题的折叠小结胶囊。
  - 底部低负担输入区：展示当前最新消息的 `quickReplies` 快捷回复胶囊（一键点选发送）、Skill 手动切换芯片、多行输入框。
  - 教练画像面板：查看并手动编辑 `routines`、`energyWindows`、`preferences`、`executionClues`、`longTermInsights`。
- [ ] 更新 `src/App.tsx` 注册 `/coach` 路由；更新 `src/components/Layout.tsx` 顶部导航与 `src/pages/OverviewPage.tsx` 快捷入口。

---

## 2. 验证命令与质量门 (Validation Commands & Review Gates)

1. **数据库迁移验证**：
   ```bash
   npm run db:migrate:local
   ```
2. **TypeScript 全量类型检查**（覆盖 `app`、`worker`、`node` 三套配置）：
   ```bash
   npm run typecheck
   ```
3. **生产构建验证**：
   ```bash
   npm run build
   ```
4. **端到端 API 与功能冒烟检查**：
   - 验证 `/api/bootstrap` 不含教练字段，`/api/export` 包含 `coachProfile`、`chatSessions`、`chatMessages`。
   - 验证 `GET /api/coach/state`、`POST /api/coach/chat`、`POST /api/coach/messages/:id/proposals/:pid`、`PUT /api/coach/profile`、`POST /api/coach/sessions/:id/complete` 全部返回 200 且数据落库。

---

## 3. 风险点与回滚点 (Risky Files & Rollback Points)

- **`shared/types.ts` 与 `worker/db/queries.ts`**：属于全局共享文件，只做增量导出，严禁修改现有业务类型的签名或 `loadAll()` 的返回结构。
- **`migrations/0007_coach.sql`**：仅包含新增的 3 张表（`CREATE TABLE IF NOT EXISTS`），不触碰现有 11 张表。
