# 技术设计：周度/月度前瞻计划

## 1. 边界与结论

- 新增独立页面 `/plan`，周 / 月双轨，共用一套表单。
- 每日仪式 `/daily` 增加一张只读提醒卡；总览 `/` 增加一个快捷入口。
- 不新增表、不新增 API、不新增 migration。
- 数据存 `documents`，`module = "plan"`，周期键带类型前缀。
- 本期不改复盘页面；只保证周复盘后续能按周键读到同一周计划。

## 2. 为什么复用 `documents`

`.trellis/spec/backend/directory-structure.md` 的约定：

> 页面级、结构不固定或迭代频繁的数据 → `documents`（`module` + `key`）。
> 需要列表、排序、筛选、状态流转或独立计数的实体 → 单独建表。

周 / 月计划是页面级、按周期自然键读写、没有独立列表 / 状态流转需求的数据，
符合 `documents` 的适用范围。复用后：

- 不需要 migration、schema、`loadAll()`、`/api/export` 改动。
- `documents` 已在 `BootstrapResponse` 中，每日仪式和总览无需额外请求。
- 写入直接复用 `useSaveDocument()`（`src/lib/queries.ts:57`），成功后 invalidate bootstrap。

代价：`documents` 的 `data` 是宽松 JSON，类型安全靠前端辅助函数约束。
本期用 `readPlanData()` 统一兜底，不信任任意字段。

## 3. 数据契约

### 3.1 存储键

| 周期 | `module` | `key` | 示例 |
| --- | --- | --- | --- |
| 周 | `plan` | `week-YYYY-Www` | `week-2026-W48` |
| 月 | `plan` | `month-YYYY-MM` | `month-2026-11` |

`docs.ts` 的 slug 校验为 `^[a-zA-Z0-9_-]+$`（`worker/routes/docs.ts:11`），
因此不能使用冒号；用 `week-` / `month-` 前缀区分周期类型。

### 3.2 类型（`shared/types.ts`）

```ts
export const PLAN_PERIOD_TYPES = ["week", "month"] as const;
export type PlanPeriodType = (typeof PLAN_PERIOD_TYPES)[number];

export type PeriodPlanData = {
  /** 一句话主题 */
  theme?: string;
  /** 1–3 个重点，纯文本，不记录完成状态 */
  priorities?: string[];
};
```

`PeriodPlanData` 可直接赋给 `DocumentData`（后者有 `[key: string]: unknown`）。

### 3.3 前端辅助（`src/lib/plan.ts`）

| 函数 | 作用 |
| --- | --- |
| `PLAN_MODULE` | 常量 `"plan"` |
| `weekPlanKey(weekKey)` / `monthPlanKey(monthKey)` | 生成存储键 |
| `parsePlanKey(key)` | 解析 `{ periodType, periodKey }`，非法返回 `null` |
| `findPlanEntry(documents, type, periodKey)` | 从 bootstrap documents 找条目 |
| `readPlanData(entry)` | 返回规范化的 `{ theme: string; priorities: string[] }`，过滤空行、最多 3 条 |
| `isPlanFilled(plan)` | 主题或任一重点非空 |
| `planPeriodLabel(type, periodKey)` | 周：「第 48 周 · 11 月 23 日 – 11 月 29 日」；月：「2026 年 十一月」 |

`shiftMonthKey` 放在 `src/lib/date.ts`，与 `shiftWeekKey` 并列，负责跨年月份偏移。

### 3.4 写入规范化

保存前：

1. `theme.trim()`。
2. `priorities` 逐条 `trim()`，过滤空串，截断到最多 3 条。
3. 单条长度上限 200 字符（UI `maxLength` 同步），主题 200 字符。
4. 全空也允许保存（用于清空），但 `isPlanFilled` 为 false，历史列表不展示。

## 4. 页面与交互

### 4.1 `/plan` 路由

- 路由：`/plan`，选择状态放 URL 查询参数，符合前端 spec 的约定：
  - `?period=week|month`，默认 `week`。
  - `?key=2026-W48` / `?key=2026-11`，默认当前周期。
- 非法或缺省参数回退到当前周 / 当前月，不报错。
- 周 / 月 tab 切换时，`key` 重置为新类型的当前周期。
- 左右箭头按 `shiftWeekKey` / `shiftMonthKey` 移动一个周期。
- 页面结构：
  1. `PageHeader`：标题「周 / 月计划」，描述，右侧保存按钮。
  2. 周期导航：tab + 前后箭头 + 周期标签。
  3. 表单卡：主题输入 + 3 个重点输入 + 保存状态。
  4. 历史列表：当前 tab 下所有已填写的周期，按 `periodKey` 倒序，点击切换。
- 周计划编辑时，在表单上方显示一行「本月主题：…」，点击切到月 tab；月计划为空则不显示。

### 4.2 每日仪式提醒卡

- 新组件 `src/components/PlanReminderCard.tsx`，纯展示，数据由 `DailyPage` 从 bootstrap 传入。
- 位置：`DailyPage` 的 `PageHeader` 之后、`grid` 之前，整宽，保证移动端也在每日模块之前。
- 展示规则：
  - 周计划已填写：标题「本周 · 第 N 周」+ 主题 + 最多 3 条重点。
  - 周计划为空：标题「本周还没定调」+ 一行轻提示。
  - 底部固定一行「本月主题：…」；月计划为空显示「本月主题：还没写」。
  - 右侧链接「去调整 →」指向 `/plan?period=week&key=<当前周>`。
- 空态不阻塞任何每日填写，不弹窗、不折叠每日模块。

### 4.3 总览入口

- `OverviewPage` 右侧快捷入口列表增加「🗓️ 周 / 月计划」，状态显示「本周已定调 / 未定调」，
  链接到 `/plan`。
- 顶部导航 `NAV` 不新增第 7 项，避免导航换行拥挤。

## 5. 数据流

```
/api/bootstrap ──► ["bootstrap"] ──► documents
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
        DailyPage              OverviewPage                PlanPage
   findPlanEntry(week/month)  findPlanEntry(week)      findPlanEntry(选中周期)
              │                       │                       │
              ▼                       ▼                       ▼
      PlanReminderCard           快捷入口状态            表单 + 历史列表
                                                              │
                                                     useSaveDocument(PUT)
                                                              │
                                                              ▼
                                                   invalidate ["bootstrap"]
```

- 不新增 query key；计划数据随 bootstrap 一起刷新。
- 保存成功后 `entry.updatedAt` 变化，`PlanPage` 的 `useEffect` 以 `updatedAt` 为依赖重置表单，
  与 `DirectionCard` 的模式一致。
- 用户正在输入时若发生无关的 bootstrap refetch，只有 `updatedAt` 变化才会覆盖草稿；
  本期接受该行为，与现有方向卡一致。

## 6. 兼容性与迁移

- 无 schema / migration / API 变更。
- `documents` 的其他消费者按 `module` 过滤，`module = "plan"` 不会影响它们。
- `/api/export` 已包含全部 `documents`，计划自动进入备份。
- 每周 / 每月最多新增一条文档，bootstrap 体积增长可忽略。
- 回滚：移除 `/plan` 路由、每日卡和总览入口即可；已写入的 `documents` 行保持惰性，不破坏现有功能。

## 7. 后续扩展（不在本期）

- 周复盘向导读取 `findPlanEntry(documents, "week", weekKey)`，在第一步或第四步展示本周计划，
  让「定调 → 执行 → 复盘」形成闭环。
- 月复盘页面落地后，月度计划可作为「定型」步骤的上层输入。
- 若未来需要重点完成状态或与清单联动，再评估是否从 `documents` 迁移到独立表；
  本期不预留 `done` 字段，避免半成品契约。
