# 实施计划：恐惧清单（五步恐惧转化）

## 前置

- [ ] 已阅读 `prd.md`、`design.md`、`.trellis/spec/frontend/directory-structure.md`、`.trellis/spec/backend/directory-structure.md`
- [ ] 工作区现有未提交改动（Reality OS 等）与本任务无关，实施时不要顺手格式化或改动它们

## 执行清单

### 1. 共享契约（`shared/types.ts`）

- [ ] 增加 `FEAR_STEP_KEYS`、`FearStepKey`、`FearData`、`FearEntry`
- [ ] 增加 `createEmptyFearData()` 与 `normalizeFearData()`
- [ ] `BootstrapResponse` 增加 `fears: FearEntry[]`

### 2. 数据库

- [ ] `worker/db/schema.ts` 增加 `fears` 表定义（id / user_id / data / created_at / updated_at）
- [ ] 新增 `migrations/0004_fears.sql`，包含表与 `(user_id, updated_at)` 索引
- [ ] `worker/db/queries.ts` 增加 `mapFear`，并在 `loadAll()` 中并行读取 `fears`
- [ ] 运行 `npm run db:migrate:local`

### 3. Worker API

- [ ] 新增 `worker/routes/fears.ts`：GET 列表 / GET 单个 / POST / PATCH / DELETE
- [ ] Zod 校验 id 与 data，`normalizeFearData` + 200,000 字符上限
- [ ] 所有查询带 `user_id`；PATCH / DELETE 先查存在性
- [ ] `worker/index.ts` 挂载 `/api/fears`

### 4. 前端 API 与 Query

- [ ] `src/lib/api.ts` 增加 `FearCreateInput` / `FearPatch` 类型与 CRUD 方法
- [ ] `src/lib/queries.ts` 增加 `useCreateFear` / `useUpdateFear` / `useDeleteFear`
- [ ] 三个 mutation 都用 `setQueryData` 就地更新 `fears`，不 invalidate bootstrap
- [ ] `useUpdateFear` 用 `updatedAt` 守卫，避免旧响应覆盖新输入

### 5. 内容与派生逻辑

- [ ] 新增 `src/content/fears.ts`：五步定义、页面文案、状态标签与样式
- [ ] 新增 `src/lib/fears.ts`：`fearTitle`、`fearProgress`、`fearStage`、`sortFears`

### 6. UI

- [ ] `src/components/fears/FearStepField.tsx`：步骤卡 + 文本域
- [ ] `src/components/FearCard.tsx`：列表卡片（标题 / 状态 / 下一步预览 / 五步点 / 更新时间）
- [ ] `src/pages/FearsPage.tsx`：列表、统计 chips、空状态、新建弹窗
- [ ] `src/pages/FearDetailPage.tsx`：五步纵向表单、800ms 自动保存、版本守卫、离开提示、删除确认

### 7. 路由与入口

- [ ] `src/App.tsx` 注册 `/fears` 与 `/fears/:id`
- [ ] `src/components/Layout.tsx` 的 `NAV` 增加「恐惧清单」
- [ ] `src/pages/OverviewPage.tsx` 快捷入口增加恐惧清单（显示待行动数量）

### 8. 文档

- [ ] `README.md`：功能列表、API 表、数据模型
- [ ] `docs/project-overview.md`：功能地图、数据模型、当前边界
- [ ] 如 `src/content/about.json` 有模块清单，同步补一条

### 9. 验证

- [ ] `npm run db:migrate:local`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] 手动冒烟（`npm run dev`）：
  - [ ] 新建恐惧 → 进入详情 → 五步都能输入 → 等待自动保存 → 刷新后内容完整
  - [ ] 列表标题来自第 1 步；空内容显示「未命名恐惧」
  - [ ] 填第 4 步后状态变「待验证」，填第 5 步后变「已验证」
  - [ ] 删除有确认，删除后列表与 `/api/bootstrap` 同步
  - [ ] `/api/export` 中包含 `fears`
  - [ ] 现有页面（每日仪式、五步诊断、复盘、清单、人生 OS）正常加载

## 风险文件与回滚点

| 文件 | 风险 | 回滚方式 |
| --- | --- | --- |
| `migrations/0004_fears.sql` | 新增表，纯增量 | 可保留；彻底回滚时 `DROP TABLE fears;` |
| `shared/types.ts` | bootstrap 响应形状变化 | 回退类型与 `loadAll` 一侧 |
| `worker/db/queries.ts` | `loadAll` 查询失败会影响整页 bootstrap | 先单独验证 `mapFear` 与查询 |
| `src/lib/queries.ts` | 缓存更新逻辑错误会污染列表 | 回退三个 mutation |
| `src/pages/FearDetailPage.tsx` | 自动保存竞态导致输入被覆盖 | 对照 `GoalDetailPage.tsx` 的版本守卫实现 |

## 评审门

1. 后端完成：`npm run typecheck` + 本地 API 冒烟（GET/POST/PATCH/DELETE）。
2. 前端完成：`npm run build` + 手动冒烟全部通过。
3. 提交前：`git diff` 审查，确认没有改动 Reality OS 等无关未提交文件。
