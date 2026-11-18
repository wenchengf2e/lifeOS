# 人生罗盘 · 实施计划

- 任务：`.trellis/tasks/11-18-life-compass`
- 设计：`design.md`
- 需求：`prd.md`

---

## 0. 前置检查

- [ ] 确认在 `feat/fear-list` 分支工作；如需独立分支，先与用户确认。
- [ ] 阅读 `design.md` 第 2–4 节，确认类型、表结构和 API 契约。
- [ ] 本地 D1 可迁移：`npm run db:migrate:local` 当前无报错。

---

## 1. 共享类型与归一化（`shared/types.ts`）

- [ ] 增加 `TELOS_CATEGORIES`、`TelosCategory`、`TELOS_PARENT_CATEGORY`。
- [ ] 增加各分类状态常量、`TELOS_STATUSES`、`TELOS_DEFAULT_STATUS` 与状态类型。
- [ ] 增加 `TelosProblemData` / `TelosGoalData` / `TelosChallengeData` / `TelosStrategyData` / `TelosProjectData` / `TelosRiskData` 及 `TelosRiskControl`。
- [ ] 增加 `TelosItemEntry` 判别联合、`TelosProfileData`、`TelosSnapshotData`、`TelosSnapshotMeta`、`TelosSnapshotEntry`。
- [ ] 实现 `createEmptyTelosData(category)`、`normalizeTelosItemData(category, raw)`、`normalizeTelosProfile(raw)`、`isTelosStatus(category, value)`。
- [ ] `BootstrapResponse` 保持不变；`ExportResponse` 增加 `telosProfile`、`telosItems`、`telosSnapshots`。

**验证**：`npm run typecheck`（此时未引用新字段，应通过）。

---

## 2. 数据层

- [ ] 新增 `migrations/0006_telos.sql`：`telos_profiles`、`telos_items`、`telos_snapshots` 与索引（含 profile 的 `WHERE is_active = 1` 部分唯一索引），开头保留 `PRAGMA foreign_keys = ON;`。
- [ ] `worker/db/schema.ts` 增加 `telosProfiles`、`telosItems`、`telosSnapshots` Drizzle 定义（snake_case 列名）。
- [ ] `worker/db/queries.ts`：
  - [ ] `mapTelosItem(row)`，按 `row.category` 调 `normalizeTelosItemData`。
  - [ ] `mapTelosProfile(row)`，归一化成 `TelosProfileData`。
  - [ ] `mapTelosSnapshot(row)`（含 data 解析）与 `mapTelosSnapshotMeta(row)`。
  - [ ] **不修改 `loadAll()`**，`BootstrapResponse` 保持原样。

**验证**：`npm run db:migrate:local`，`npm run typecheck`。

---

## 3. Worker 路由

- [ ] 新增 `worker/routes/telos.ts`，`const app = new Hono<AppEnv>()`，默认导出。
- [ ] 档案接口：
  - [ ] `GET /profile`：按 `user_id + is_active = 1` 查询；没有时返回空档案。
  - [ ] `PUT /profile`：先查当前用户 active 行，存在则 UPDATE（`version + 1`），否则 INSERT（`version = 1`）；三段字段归一化。
- [ ] 实体接口：
  - [ ] `GET /items`
  - [ ] `GET /items/:id`
  - [ ] `POST /items`：`category` / `title` / `parentId` / `status` / `sortOrder` / `data` 校验；父级白名单；默认状态；默认排序号；data 上限 200,000。
  - [ ] `PATCH /items/:id`：至少一项；`category` 不可改；状态按分类校验；父级重校验；data 归一化。
  - [ ] `DELETE /items/:id`：确认存在 → 取全部 `(id, parent_id)` → BFS 收集子树 → 每 50 个一批删除 → 返回 `deletedIds` / `deletedCount`。
- [ ] 快照接口：
  - [ ] `GET /snapshots`：只查 `id` / `item_count` / `created_at`。
  - [ ] `POST /snapshots`：服务端读取 profile 文档 + 全部 items，组装并写入。
  - [ ] `GET /snapshots/:id`：返回完整 data。
  - [ ] `DELETE /snapshots/:id`。
- [ ] `worker/index.ts` 挂载 `app.route("/api/telos", telosRoute)`。
- [ ] `GET /api/export` 在 `loadAll()` 之外单独查询档案、items 和快照，返回 `telosProfile` / `telosItems` / `telosSnapshots`；`/api/bootstrap` 不变。

**API 冒烟（`npm run dev` 后）**

```bash
# bootstrap 不应包含任何罗盘字段
curl -s localhost:8787/api/bootstrap | jq 'has("telosItems")'   # 期望 false
curl -s localhost:8787/api/telos/profile | jq
curl -s -X PUT localhost:8787/api/telos/profile \
  -H 'Content-Type: application/json' \
  -d '{"mission":"测试使命","currentState":"现状","idealState":"理想"}' | jq
curl -s localhost:8787/api/telos/items | jq
curl -s -X POST localhost:8787/api/telos/items \
  -H 'Content-Type: application/json' \
  -d '{"category":"problem","title":"测试问题"}' | jq
# 用返回的 id 依次创建 goal / challenge / strategy / project，验证父级白名单
# 尝试把 goal 挂到 strategy 下，期望 400
curl -s -X DELETE localhost:8787/api/telos/items/<problem-id> | jq '.deletedCount'
curl -s -X POST localhost:8787/api/telos/snapshots | jq
curl -s localhost:8787/api/telos/snapshots | jq
```

**审查门 1**：后端类型检查通过、CRUD 与级联删除冒烟通过。

---

## 4. 前端数据接入

- [ ] `src/lib/api.ts`：
  - [ ] `getTelosProfile` / `saveTelosProfile`
  - [ ] `listTelosItems` / `createTelosItem` / `updateTelosItem` / `deleteTelosItem`
  - [ ] `listTelosSnapshots` / `getTelosSnapshot` / `createTelosSnapshot` / `deleteTelosSnapshot`
  - [ ] 对应的输入类型（`TelosProfileInput` / `TelosItemCreateInput` / `TelosItemPatch`）。
- [ ] `src/lib/queries.ts`：
  - [ ] `useTelosItems`（`["telos","items"]`）、`useTelosProfile`（`["telos","profile"]`）。
  - [ ] `useSaveTelosProfile`：成功后原地更新 `["telos","profile"]`。
  - [ ] `useCreateTelosItem` / `useUpdateTelosItem` 用 `setQueryData` 就地更新 `["telos","items"]`。
  - [ ] `useDeleteTelosItem` 用 `deletedIds` 移除。
  - [ ] `useTelosSnapshots`（`["telos","snapshots"]`）、`useTelosSnapshot(id)`（`["telos","snapshot",id]`）。
  - [ ] `useCreateTelosSnapshot` / `useDeleteTelosSnapshot`，成功后 invalidate 列表。
  - [ ] 以上查询均不依赖 `["bootstrap"]`。

**验证**：`npm run typecheck`。

---

## 5. 配置与派生逻辑

- [ ] `src/content/compass.ts`：
  - [ ] 分类标签 / 描述 / 颜色、子分类映射（引用 `TELOS_PARENT_CATEGORY`）。
  - [ ] 各分类状态文案。
  - [ ] 字段标签与提示语、风险 control 文案。
  - [ ] 页面文案（空状态、删除确认、快照说明）。
- [ ] `src/lib/compass.ts`：
  - [ ] `buildCompassForest(items)`：根节点 + 子节点 map，按 `sortOrder` / `createdAt` 排序。
  - [ ] `getAncestorChain(items, id)`、`getDescendantIds(items, id)`、`countDescendants`。
  - [ ] `getAllowedParents(items, category)`（用于父级选择）。
  - [ ] `sortRisks(items, filter)`：按 `probability × impact` 倒序。
  - [ ] `diffTelosSnapshots(a, b)`：按 `design.md` 4.5 输出。
  - [ ] `normalizeTelosProfile` 的读取辅助（用于 `/api/telos/profile` 响应兜底）。

**验证**：`npm run typecheck`；可在浏览器控制台用两份快照数据跑一遍 diff。

**审查门 2**：前端类型与纯函数逻辑完成，diff 输出结构与设计一致。

---

## 6. 组件

- [ ] `CompassProfileCard`：三段文本域、显式保存、已保存 / 保存中 / 错误状态。
- [ ] `CompassTree`：递归节点、展开 / 折叠、分类标签、状态 chip、子节点数、操作按钮。
- [ ] `CompassItemFields`：按 `category` 渲染字段；数组字段支持增删行；风险 control 用 `none / partial / ready` 分段选择。
- [ ] `CompassCreateDialog`：只收标题；提交后跳详情。
- [ ] `RiskCard`：概率 × 影响、三个 control 徽章、备注。
- [ ] `SnapshotDiff`：档案 diff + 新增 / 删除 / 变化；移动端纵向堆叠。

**验证**：`npm run typecheck`；桌面宽度下逐组件在页面中渲染。

---

## 7. 页面与路由

- [ ] `CompassPage`：档案卡 + 统计 + 树 + 风险板 + 快照区 + 新建入口；数据全部来自 `useTelosItems` / `useTelosProfile`，不读 bootstrap。
- [ ] `CompassItemPage`：
  - [ ] 面包屑、标题、状态、父级选择、分类字段。
  - [ ] 防抖自动保存（`AUTOSAVE_DEBOUNCE_MS`）+ 版本守卫 + 离开补保存。
  - [ ] 子节点列表与「添加子项」。
  - [ ] 级联删除二次确认（显示后代数量）。
- [ ] `CompassSnapshotsPage`：
  - [ ] 列表、A / B 选择、URL `?a=&b=` 持久化。
  - [ ] 并行拉取两份快照并渲染 diff。
  - [ ] 删除快照二次确认。
- [ ] `src/App.tsx` 注册 `/compass`、`/compass/items/:itemId`、`/compass/snapshots`。
- [ ] `src/components/Layout.tsx` 的 `NAV` 增加「人生罗盘」。

**验证**：`npm run dev` 手动走完整流程。

---

## 8. 全量验证

- [ ] `npm run db:migrate:local`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] 人工验证（桌面 + 手机宽度）：
  - [ ] 创建 problem → goal → challenge → strategy → project，树层级正确，展开 / 折叠可用。
  - [ ] 非法父级（goal 挂 strategy、project 挂 problem）返回 400 且有提示。
  - [ ] 删除 problem，确认框显示后代数量，删除后整条子树消失，其他树不受影响。
  - [ ] 删除 project 只删自身。
  - [ ] 风险 prevent / detect / respond 可编辑、保存、回显；按 P×I 排序正确。
  - [ ] 编辑并保存 mission / current / ideal，刷新后回显。
  - [ ] 创建快照 A → 修改若干条目 → 创建快照 B → diff 列出新增 / 删除 / 字段变化 / 状态变化 / 父级变化 / 档案变化。
  - [ ] 快照页在手机宽度下无横向滚动。
  - [ ] 旧模块（`/lifeos`、`/principles`、`/fears`、`/energy`）正常访问，数据不变。
  - [ ] `/api/bootstrap` 响应不含 `telosItems` / `telosProfile`；罗盘页使用独立的 `["telos", ...]` 查询。
- [ ] 检查 `/api/export` 包含 `telosProfile`、`telosItems` 与 `telosSnapshots`。

---

## 9. 回滚点

| 阶段 | 回滚方式 |
| --- | --- |
| 后端完成后 | 撤销 `worker/routes/telos.ts` 挂载与导出改动；三张新表保留但无人读写 |
| 前端接入后 | 撤销 `src/lib/api.ts` / `queries.ts` 的新增方法 |
| 页面完成后 | 移除三条路由与导航项；页面文件可保留不引用 |
| 迁移已上远端 | 不回滚迁移；新表保持空置，代码回滚即可 |

---

## 10. 验收映射

| PRD 验收项 | 对应实现 |
| --- | --- |
| 五级链创建与树展示 | 第 3、5、6、7 节 |
| 非法父级 400 | 第 3 节父级校验 |
| 级联删除与数量提示 | 第 3 节 DELETE + 第 7 节确认框 |
| 删除 project 只删自身 | BFS 子树为空 |
| 风险三状态可编辑回显 | 第 2 节 data schema + 第 6 节 RiskCard |
| 快照 diff 六类变化 | 第 5 节 `diffTelosSnapshots` + 第 6 节 SnapshotDiff |
| 手机宽度可读 | 第 7 节纵向布局 |
| 档案保存与 diff | 第 2.5 节 + 第 5、6 节 |
| bootstrap 不含罗盘数据、独立加载 | 第 3.4 节 + 第 4 节独立查询 |
| 旧模块不受影响 | 第 1–3 节纯新增，`loadAll()` 不变 |
| `typecheck` / `build` | 第 8 节 |
