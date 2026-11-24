# 执行计划：周度/月度前瞻计划

## 前置

- 任务目录：`.trellis/tasks/11-23-weekly-monthly-plan`
- 设计依据：`design.md`
- 不改 Worker、数据库、migration；全部改动在前端与共享类型。

## 实施清单

### 1. 共享类型

- [x] `shared/types.ts`
  - 增加 `PLAN_PERIOD_TYPES`、`PlanPeriodType`。
  - 增加 `PeriodPlanData`（`theme?: string`、`priorities?: string[]`）。
  - 位置放在 `ReviewPeriodType` 附近，保持周期类型集中。

### 2. 日期与计划派生

- [x] `src/lib/date.ts`
  - 增加 `shiftMonthKey(monthKey, delta)`，处理跨年。
- [x] `src/lib/plan.ts`（新建）
  - `PLAN_MODULE = "plan"`。
  - `weekPlanKey` / `monthPlanKey` / `planKeyFor`。
  - `parsePlanKey`：校验并返回 `{ periodType, periodKey }`。
  - `isValidPlanPeriodKey(type, key)`：周 `^\d{4}-W\d{2}$` 且周号 1–53；月 `^\d{4}-(0[1-9]|1[0-2])$`。
  - `findPlanEntry(documents, type, periodKey)`。
  - `readPlanData(entry)`：trim、过滤空行、最多 3 条、非法类型兜底。
  - `normalizePlanData(form)`：保存前规范化。
  - `isPlanFilled(plan)`。
  - `listPlanPeriods(documents, type)`：只返回已填写周期，按 `periodKey` 倒序。
  - `planPeriodLabel(type, periodKey)`：周「第 N 周 · 范围」，月「YYYY 年 十一月」。

### 3. 文案与配置

- [x] `src/content/plan.ts`（新建）
  - `PLAN_PAGE_COPY`：标题、描述、保存按钮文案。
  - `MAX_PLAN_PRIORITIES = 3`。
  - `PLAN_THEME_MAX_LENGTH` / `PLAN_PRIORITY_MAX_LENGTH`。
  - 字段标签、提示、placeholder。
  - 周 / 月 tab 文案、历史列表空态、提醒卡文案。

### 4. 提醒卡组件

- [x] `src/components/PlanReminderCard.tsx`（新建）
  - props：`weekKey`、`monthKey`、`weekPlan`、`monthPlan`。
  - 周计划完整展示；空态显示轻提示。
  - 底部固定一行本月主题 / 空态。
  - 链接到 `/plan?period=week&key=<weekKey>`。
  - 只用现有 `.card`、语义 token 和 `btn-*` 类。

### 5. 计划页面

- [x] `src/pages/PlanPage.tsx`（新建）
  - `useSearchParams` 管理 `period` / `key`，默认当前周 / 当前月。
  - 非法参数回退，不报错。
  - tab 切换重置为当前周期；箭头用 `shiftWeekKey` / `shiftMonthKey`。
  - 表单：主题 + 3 个重点，显式保存，dirty / saved / error 状态。
  - `useEffect` 以 `periodType`、`periodKey`、`entry?.updatedAt` 为依赖重置表单。
  - 周 tab 显示「本月主题」上下文；月计划为空不显示。
  - 历史列表来自 `listPlanPeriods`，点击切换周期。
  - 保存走 `useSaveDocument`，payload 为 `normalizePlanData` 结果。

### 6. 路由与入口

- [x] `src/App.tsx`：注册 `/plan` → `PlanPage`。
- [x] `src/pages/DailyPage.tsx`：
  - 根据当前 `date` 计算 `isoWeekKeyOf(date)` / `monthKeyOf(date)`。
  - 从 `data.documents` 取两个周期计划。
  - 在 `PageHeader` 之后、grid 之前插入 `PlanReminderCard`。
- [x] `src/pages/OverviewPage.tsx`：
  - 计算本周计划是否已填写。
  - 右侧快捷入口增加「🗓️ 周 / 月计划」，状态显示「已定调 / 未定调」，链接 `/plan`。
- [x] `src/components/Layout.tsx`：不改导航。

### 7. 文档同步（完成后）

- [x] `docs/project-overview.md` 的功能地图与目录结构补 `/plan` 与 `src/lib/plan.ts`、`src/content/plan.ts`、`src/components/PlanReminderCard.tsx`。
- [x] 如复盘后续接入，另开任务；本期只在 PRD / design 中记录通路。

## 验证

### 自动

```bash
npm run typecheck
npm run build
```

### 手动

1. `/plan` 默认落在当前周；填写主题 + 2 条重点，保存后刷新仍在。
2. 切到月 tab，填写不同内容；回到周 tab，内容不串。
3. 周 / 月前后箭头跨年正常：`2026-W01` 上一周为 `2025-W52`；`2026-01` 上一月为 `2025-12`。
4. 历史列表只出现已填写周期；点击可回到对应周期。
5. 清空所有字段保存后，历史列表不再显示该周期，`/daily` 回到空态。
6. `/daily`：
   - 空态只显示轻提示，不遮挡每日模块。
   - 填写后显示主题与重点，底部显示本月主题。
   - `?date=` 切到历史日期时，提醒卡跟着显示该日期所在周 / 月。
7. `/` 快捷入口状态正确。
8. `/api/export` 的 `documents` 中包含 `module = "plan"` 的记录。
9. 375px 宽度下无横向滚动；桌面端卡片不挤压日历侧栏。

## 风险文件与回滚点

| 文件 | 风险 | 回滚 |
| --- | --- | --- |
| `src/pages/DailyPage.tsx` | 插入位置影响移动端首屏 | 移除卡片即恢复 |
| `src/pages/OverviewPage.tsx` | 快捷入口列表变长 | 移除该 `<Link>` |
| `src/App.tsx` | 路由冲突 | 删除 `/plan` 路由 |
| `shared/types.ts` | 类型命名冲突 | 删除新增类型，无运行时影响 |

数据层没有迁移；回滚代码后，已写入的 `documents(module="plan")` 保持惰性，不影响现有模块。

## 完成前检查

- [x] `npm run typecheck` 通过。
- [x] `npm run build` 通过。
- [x] PRD 验收项逐条核对。
- [x] 没有新增硬编码颜色 / 字号，沿用 `.card`、`.field`、`btn-*` 与语义 token。
- [x] 没有改动 Worker、schema、migration、`/api/bootstrap` 契约。

## 执行结果（2026-11-23）

- 实现子代理完成全部 9 步清单；`npm run typecheck` 与 `npm run build` 通过（仅保留既存的 chunk > 500 kB 警告）。
- 质量检查子代理复核 10 个改动文件及跨层契约，发现并修复 5 处问题：
  1. 周 tab 的「本月主题」跳转使用当前月而非该周所在月；
  2. `parsePlanKey` 硬编码周期类型；
  3. 历史排序相等时返回 `-1`；
  4. 页面重复硬编码「本月主题：」文案；
  5. 项目总览未列出计划数据。
- 主会话额外修复：点击已选中的周 / 月 tab 不再重置到当前周期。
- 检查子代理执行了 44 条运行时断言、本地 dev server + headless Chrome 的 375px 端到端检查；本地 D1 的 `module = "plan"` 测试数据已清理，复查计数为 0。
- 未提交代码；任务状态保持 `in_progress`，等待提交与收尾。
