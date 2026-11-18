# 能量充电屋模块 — 执行计划（Implementation Plan）

## 1. 实施步骤清单（Ordered Checklist）

### Step 1：共享类型与数据库层
- [ ] **1.1 更新 `shared/types.ts`**：
  - 新增 `ENERGY_TOOL_KEYS`、`EnergyToolKey`、`EnergySessionData`、`EnergySessionEntry`。
  - 新增 `createEmptyEnergySessionData()` 与 `normalizeEnergySessionData(raw: unknown)`。
  - 在 `BootstrapResponse` 中新增 `energySessions: EnergySessionEntry[]`。
- [ ] **1.2 新增 D1 Migration `migrations/0005_energy_sessions.sql`**：
  - 创建 `energy_sessions` 表及 `(user_id, updated_at)`、`(user_id, tool, updated_at)` 索引。
  - 执行 `npm run db:migrate:local` 应用到本地 D1。
- [ ] **1.3 更新 `worker/db/schema.ts` 与 `worker/db/queries.ts`**：
  - 在 `worker/db/schema.ts` 新增 `energySessions` 表定义。
  - 在 `worker/db/queries.ts` 新增 `mapEnergySession`，并在 `loadAll()` 的 `Promise.all` 中加入 `energySessions` 查询与返回字段。

### Step 2：后端 Worker API 路由
- [ ] **2.1 新建 `worker/routes/energy.ts`**：
  - 实现 `GET /`、`GET /:id`、`POST /`、`PATCH /:id`、`DELETE /:id`。
  - 使用 Zod 校验 `tool`（枚举 `ENERGY_TOOL_KEYS`）、`data`（JSON 长度上限 200,000）与 `completed`（布尔值）。
- [ ] **2.2 挂载路由 `worker/index.ts`**：
  - 导入 `energyRoute` 并挂载 `app.route("/api/energy", energyRoute)`。

### Step 3：前端配置、派生逻辑与 API/Query 封装
- [ ] **3.1 新建配置文件 `src/content/energy.ts`**：
  - 定义四大工具（自我觉察训练 `awareness`、显化日记 `manifestation`、认知重塑书写 `reframe`、行为模式分析 `behavior`）及其默认问题列表（每题含 `key`、`title`、`prompt`、`hint`、`placeholder`）。
  - 定义列表页与详情页文案常量 `energyPageCopy`、`energySessionCopy`。
- [ ] **3.2 新建派生工具 `src/lib/energy.ts`**：
  - 实现 `getEnergyTool(key)`、`energyProgress(session)`、`energySummary(session)`、`firstUnansweredStep(session)`、`sortEnergySessions(entries)`、`filterEnergySessions(entries, toolFilter)`。
- [ ] **3.3 更新 `src/lib/api.ts` 与 `src/lib/queries.ts`**：
  - 在 `src/lib/api.ts` 新增 `createEnergySession`、`updateEnergySession`、`deleteEnergySession`。
  - 在 `src/lib/queries.ts` 新增 `useCreateEnergySession`、`useUpdateEnergySession`、`useDeleteEnergySession`（采用 `setQueryData` 原地更新 `["bootstrap"]` 缓存）。

### Step 4：前端组件、页面与路由集成
- [ ] **4.1 新建 `src/components/EnergySessionCard.tsx`**：
  - 展示单条练习记录的工具徽章、练习时间戳、完成状态徽章、答题进度条与首条回答摘要，点击根据 `completed` 跳往 `/energy/:id`（回看或继续书写）。
- [ ] **4.2 新建 `src/pages/EnergyPage.tsx`（`/energy`）**：
  - 渲染顶部四大工具充电舱卡片（含累计练习次数统计与「开始沉浸练习」按钮）。
  - 渲染底部历史练习记录区（含工具分类筛选胶囊与空状态提示）。
- [ ] **4.3 新建 `src/pages/EnergySessionPage.tsx`（`/energy/:sessionId`）**：
  - 实现 `mode=write`（一步一问沉浸式书写视图：进度指示器、单题大卡片、自动聚焦输入框、上一题/下一题/完成本次充电、防抖自动保存（`AUTOSAVE_DEBOUNCE_MS = 2000`）+ 卸载补保存）。
  - 实现 `mode=read`（全文卡片回看视图：一页展示全部问题与回答、支持一键切回沉浸式修改或点单题直接跳对应 `step` 修改、支持带确认删除）。
- [ ] **4.4 更新路由与入口（`src/App.tsx`、`src/components/Layout.tsx`、`src/pages/OverviewPage.tsx`）**：
  - `src/App.tsx` 注册 `/energy` 与 `/energy/:sessionId`。
  - `src/components/Layout.tsx` 的 `NAV` 加入「能量充电屋」。
  - `src/pages/OverviewPage.tsx` 的快捷入口加入「⚡ 能量充电屋」。

---

## 2. 验证命令与质量门（Validation Commands & Review Gates）

1. **本地数据库迁移验证**：
   ```bash
   npm run db:migrate:local
   ```
2. **三套 TypeScript 类型检查**：
   ```bash
   npm run typecheck
   ```
3. **生产构建验证**：
   ```bash
   npm run build
   ```

---

## 3. 风险点与回滚点（Risky Files & Rollback Points）

- **`shared/types.ts` 与 `worker/db/queries.ts`**：修改了全局 `BootstrapResponse`，需确保所有读取 `data?.energySessions` 的地方都有 `?? []` 空数组兜底，防止旧缓存或异常数据导致白屏。
- **`src/pages/EnergySessionPage.tsx`**：一步一问切换题目时，共用同一个受控 `draft.data.answers[currentQuestion.key]`，切题时无需等待网络请求即可立即切换，防抖自动保存统一在后台保存整份 `draft.data`，避免切题卡顿或丢字。
