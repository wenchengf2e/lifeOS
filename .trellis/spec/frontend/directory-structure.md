# 目录结构

> 前端代码在 LifeOS 中如何组织。

---

## 概览

前端是一个 React 19 单页应用，由 Vite 构建，路由使用 React Router 7 的 `BrowserRouter`，服务端状态统一走 TanStack Query，样式使用 Tailwind CSS 4。

整体分层：

- `src/pages/`：路由页面，负责页面级布局、表单状态和交互编排。
- `src/components/`：可复用 UI 与业务组件；五步诊断的表单组件放在 `components/goals/`，恐惧清单的步骤组件放在 `components/fears/`。
- `src/content/`：纯配置与文案（模块定义、步骤定义、选项、限额），不包含 JSX。
- `src/lib/`：API 客户端、查询 hooks、日期 / 统计 / 目标派生逻辑和自定义 hook。
- `src/App.tsx`：唯一的扁平路由表；所有页面都包在 `Layout` 里。
- `src/index.css`：Tailwind 4 入口、`@theme` 设计 token、`.card` / `.field` / `.btn-*` 等共享类。

没有 Redux / Zustand 之类的全局状态库。默认使用一份 `["bootstrap"]` 查询缓存；独立加载模块（人生罗盘）使用自己的 query key（`["telos", ...]`）。页面内的编辑状态用 `useState` 或 `useReducer` 局部管理，当前日期 / 步骤等选择状态放在 URL 查询参数里。

---

## 目录布局

```
src/
├── main.tsx                    # 入口：StrictMode → QueryClientProvider → BrowserRouter → App
├── App.tsx                     # 路由表，全部页面套 Layout
├── index.css                   # Tailwind 4、@theme token、共享组件类
├── components/
│   ├── Layout.tsx              # 顶部导航、主内容容器、footer、ScrollToTop
│   ├── PageHeader.tsx          # eyebrow / title / description / action 页头
│   ├── StateViews.tsx          # LoadingPage / ErrorState / EmptyState
│   ├── DaySidebar.tsx          # 日期切换、日期输入、日历、月度统计
│   ├── MonthCalendar.tsx       # 周一开头的月历，标记有记录 / 已完成
│   ├── GoalCard.tsx            # 目标摘要卡
│   ├── GoalStepProgress.tsx    # 五步完成进度条
│   ├── FearCard.tsx            # 恐惧清单摘要卡（含归档标记）
│   ├── EnergySessionCard.tsx   # 能量充电屋练习记录摘要卡
│   ├── DirectionCard.tsx       # 人生 OS 方向卡
│   ├── PatternCard.tsx         # 模式卡字段、证据、状态流转
│   ├── PlanReminderCard.tsx    # 每日仪式顶部的本周 / 本月计划提醒卡
│   ├── Reality*.tsx            # Reality OS：方向卡、目标摘要卡、雷达图
│   ├── goals/
│   │   ├── fields.tsx          # FieldHeader / TextField / TextInput / TextListField / SegmentedField / StepEmpty
│   │   └── Step*.tsx           # 五步诊断各步骤表单：目标 / 问题 / 诊断 / 方案 / 践行
│   ├── fears/
│   │   ├── FearAnalysisCard.tsx # 第 3、4 步之间的可选权衡分析（折叠 / 把握 / 历史案例 / 不行动代价）
│   │   └── FearStepField.tsx   # 恐惧清单单个步骤卡 + 文本域
│   ├── coach/                  # AI 教练：洞察卡 / 消息气泡 / 提案卡 / 画像抽屉 / 历史话题 / 输入区
│   └── compass/                # 人生罗盘：档案卡 / 递归树 / 分类字段 / 风险卡 / 快照 diff
├── content/                    # 纯配置与文案（无 JSX）
│   ├── autosave.ts             # 自动保存防抖延时（能量充电屋 / 恐惧 / 五步诊断共用）
│   ├── coach.ts                # AI 教练：7 大模型、5 阶段、提案与画像字段文案
│   ├── daily.ts                # 每日仪式四模块与字段
│   ├── energy.ts               # 能量充电屋四工具与默认问题模板
│   ├── compass.ts              # 人生罗盘分类 / 状态 / 字段 / 文案
│   ├── fears.ts                # 恐惧清单五步定义、归档筛选、权衡分析文案
│   ├── goals.ts                # 领域、状态、五步定义、限额与文案
│   ├── lifeos.ts               # 方向卡与人生 OS 六栏
│   ├── lists.ts                # 成就 / 痛苦 / 关键改变 / 复盘动作四个清单
│   ├── plan.ts                 # 周 / 月计划字段、限额、历史与提醒卡文案
│   ├── review.ts               # 周复盘四步、模式卡字段、状态
│   ├── reality.ts              # Reality OS 六维、T1–T5 标准、统计
│   ├── about.ts                # 关于页类型与解析
│   └── about.json              # 关于页静态内容
├── lib/
│   ├── api.ts                  # fetch 封装、ApiError、所有端点方法
│   ├── queries.ts              # bootstrap 查询、独立模块查询与各类 mutation
│   ├── energy.ts               # 能量充电屋派生：工具查找、答题进度、摘要、时间格式化
│   ├── compass.ts              # 人生罗盘派生：建树、祖先链、后代计数、风险排序、快照 diff
│   ├── fears.ts                # 恐惧派生：标题、完成度、归档过滤、下一步预览、分析状态
│   ├── goals.ts                # 五步派生：完成度、进度、检查清单、停滞判断
│   ├── stats.ts                # 打卡完成判断、日期集合、月 / 总计数、连续天数
│   ├── date.ts                 # 日期键、中文格式化、月 / ISO 周工具
│   ├── plan.ts                 # 周 / 月计划：周期键、规范化、历史列表派生
│   └── useReality.ts           # Reality OS 读写（documents + localStorage 兜底）
└── pages/                      # 路由页面，统一 XxxPage.tsx
    ├── OverviewPage.tsx        # 总览仪表盘
    ├── DailyPage.tsx           # 每日仪式（四模块 + 周 / 月计划提醒）
    ├── PlanPage.tsx            # 周 / 月计划编辑与历史周期
    ├── DiaryPage.tsx           # 日记归档（只读）
    ├── LifeOSPage.tsx          # 人生 OS 六栏
    ├── ReviewPage.tsx          # 复盘首页（周复盘入口 + 模式库）
    ├── ReviewWizardPage.tsx    # 周复盘四步向导
    ├── GoalsPage.tsx           # 五步诊断目标列表
    ├── GoalDetailPage.tsx      # 单个目标五步工作台
    ├── FearsPage.tsx           # 恐惧清单列表（未归档 / 已归档）+ 新建弹窗
    ├── FearDetailPage.tsx      # 单条恐惧五步详情 + 自动保存 + 归档
    ├── EnergyPage.tsx          # 能量充电屋主页（四大工具入口 + 历史练习记录筛选）
    ├── EnergySessionPage.tsx   # 单次充电练习（一步一问沉浸书写 + 全文回看双模式）
    ├── CoachPage.tsx           # AI 教练（单一连续主线 + 主动洞察 + 提案回写）
    ├── ListsPage.tsx           # 清单（四个 tab）
    ├── RealityPage.tsx         # Reality OS 投资六维
    ├── CompassPage.tsx         # 人生罗盘主页（档案 + 五级树 + 风险登记册 + 快照）
    ├── CompassItemPage.tsx     # 罗盘实体详情（分类字段 + 自动保存 + 级联删除）
    ├── CompassSnapshotsPage.tsx # 快照列表 + A/B 对比
    ├── AboutPage.tsx           # 静态关于页
    └── NotFoundPage.tsx        # 404
```

路由与页面的对应关系：

| 路径 | 页面 |
| --- | --- |
| `/` | `OverviewPage` |
| `/daily` | `DailyPage`（`?date=YYYY-MM-DD` 可补写历史） |
| `/plan` | `PlanPage`（`?period=week\|month&key=...`） |
| `/belief`、`/evening` | 重定向到 `/daily` |
| `/lifeos` | `LifeOSPage` |
| `/diary` | `DiaryPage` |
| `/review` | `ReviewPage` |
| `/review/week/:key` | `ReviewWizardPage`（`?step=1..4`） |
| `/lists` | `ListsPage` |
| `/fears` | `FearsPage` |
| `/fears/:fearId` | `FearDetailPage` |
| `/energy` | `EnergyPage` |
| `/energy/:sessionId` | `EnergySessionPage`（`?mode=write\|read&step=1..N`） |
| `/coach` | `CoachPage`（单一连续主线 + 主动洞察 + 教练画像 / 历史话题抽屉） |
| `/principles` | `GoalsPage` |
| `/principles/:goalId` | `GoalDetailPage`（`?step=1..5`） |
| `/reality` | `RealityPage` |
| `/compass` | `CompassPage` |
| `/compass/items/:itemId` | `CompassItemPage` |
| `/compass/snapshots` | `CompassSnapshotsPage`（`?a=&b=` 选择两份快照） |
| `/about` | `AboutPage` |
| `*` | `NotFoundPage` |

`public/` 放不经过打包的静态资源：favicon、`site.webmanifest`、关于页图片 `public/about/`。`index.html` 是 SPA 壳，设置 `lang="zh-CN"` 与主题色。

---

## 模块组织

### 新增一个页面

1. 新建 `src/pages/XxxPage.tsx`，导出 `XxxPage`。
2. 在 `src/App.tsx` 的路由表里注册，外层包 `<Layout>`。
3. 如果是顶级导航，在 `src/components/Layout.tsx` 的 `NAV` 数组加一项。
4. 需要新接口时：在 `src/lib/api.ts` 加方法，在 `src/lib/queries.ts` 加 query / mutation。
5. 页面文案和配置优先放进 `src/content/`，不要散落在 JSX 里。

### 各层职责

- **页面**：组合组件、读取路由参数、维护表单草稿和保存状态；不直接写 `fetch`。
- **组件**：可复用视觉与交互；复杂业务组件（如五步步骤表单）放在 `components/<domain>/`。
- **content**：只导出类型化常量与文案，方便集中改文案、调限额。
- **lib**：纯函数、派生计算、日期工具和 API / Query 封装；不引入 React 组件。
- **index.css**：只放设计 token 和高频共享类，页面级样式用 Tailwind utilities。

### 状态与数据流

- 默认服务端状态通过 `useBootstrap()` 读取，查询键固定为 `["bootstrap"]`，`staleTime: 15s`；独立加载模块见下文。
- 写操作分两类：
  - 打卡、文档、清单、复盘、模式卡：mutation 成功后 invalidate `["bootstrap"]`。
  - 目标、恐惧清单：用 `setQueryData` 就地更新缓存，避免覆盖正在编辑的草稿。
- 周 / 月计划复用 `documents` 与 `useSaveDocument`，不新增 query key；页面从 bootstrap 的 `documents` 中过滤 `module = "plan"`，保存成功后随 bootstrap 一起刷新。
- 页面内表单使用局部 state；日期、步骤等领域选择状态用 `useSearchParams` 保存，保证刷新和分享链接可恢复。
- 长表单（如 `GoalDetailPage`）使用防抖自动保存和版本守卫，避免旧响应覆盖新输入。
- 防抖延时统一用 `src/content/autosave.ts` 的 `AUTOSAVE_DEBOUNCE_MS`，不要在页面里写死数字。
- 能量充电屋单次练习页（`EnergySessionPage`）用 URL `?mode=write|read&step=1..N` 同时记录「书写 / 回看」模式和当前题号，刷新或分享链接都能回到同一题。

### 独立加载模块（人生罗盘）

- 罗盘数据不进入 bootstrap，使用独立 query key：
  - `["telos","items"]` → `GET /api/telos/items`
  - `["telos","profile"]` → `GET /api/telos/profile`
  - `["telos","snapshots"]`、`["telos","snapshot", id]` → 快照
- mutation 只更新对应的 `["telos", ...]` 缓存；不要 invalidate `["bootstrap"]`。
- 档案保存是显式按钮，不是自动保存；保存中继续输入时，旧响应不得清除 dirty 或覆盖新草稿。
- 详情页自动保存沿用 `AUTOSAVE_DEBOUNCE_MS` + 版本守卫 + 离开补保存。
- 级联删除确认框显示后代数量；成功后按响应 `deletedIds` 精确移除缓存。
- 快照对比从 URL `?a=&b=` 恢复选择；移动端纵向堆叠，不能横向滚动。

### 独立加载模块（AI 教练）

- 教练数据不进入 bootstrap，使用独立 query key：
  - `["coach","state"]` → `GET /api/coach/state?date=<本地日期>`（当前画像 + 活跃会话 + 消息 + 最近话题 + 主动洞察）
  - `["coach","session",id]` → `GET /api/coach/sessions/:id`（历史话题只读明细）
- 发送消息只就地追加 `["coach","state"]` 缓存，不整页 refetch，避免覆盖输入框草稿。
- 提案 `apply` 会写入 `checkins` / `patterns` / `fears`，因此需要 invalidate `["bootstrap"]`；`dismiss` 不需要。
- 请求必须携带本地 `todayKey()`（`localDate` / `?date=`），业务日期不依赖 Worker 的 UTC 时钟。
- 教练画像保存是显式按钮 + 版本守卫；历史话题抽屉复用只读消息组件，不渲染输入区。
- 详细契约见 [`coach-module.md`](../backend/coach-module.md)。

### 派生逻辑

- 打卡完成判断、连续天数、月度统计 → `src/lib/stats.ts`。
- 五步完成度、进度、检查清单、停滞判断 → `src/lib/goals.ts`。
- 恐惧标题（第 1 步首行）、完成度、归档过滤、下一步预览、权衡分析状态 → `src/lib/fears.ts`。
- 罗盘建树、祖先链、后代计数、风险排序、快照 diff → `src/lib/compass.ts`。
- 日期键、ISO 周、中文格式化 → `src/lib/date.ts`。
- 周 / 月计划的周期键、数据规范化、历史列表、周期标签 → `src/lib/plan.ts`。
- 页面里不要重复实现这些计算。

---

## 命名约定

- **页面**：`PascalCase` + `Page` 后缀，如 `DailyPage.tsx`、`GoalDetailPage.tsx`。
- **组件**：`PascalCase`，如 `PatternCard.tsx`；五步组件统一 `Step` 前缀（`StepGoal.tsx`、`StepPractice.tsx`）。
- **Hook**：`useXxx`，如 `useReality.ts`；返回对象而不是位置数组。
- **lib / content**：`camelCase.ts`，如 `queries.ts`、`daily.ts`。
- **常量**：`UPPER_SNAKE_CASE`，如 `MAX_ACTIVE_GOALS`、`CHECKIN_FIELD_KEYS`。
- **标识符用英文，界面文案和代码注释用中文**。
- **样式**：优先用 `@theme` 里的语义 token（`paper` / `ink` / `moss` / `clay` / `line`）和共享类（`.card`、`.field`、`.btn-primary`、`.btn-secondary`、`.btn-ghost`、`.chip`），不要硬编码颜色值。

---

## 示例

| 场景 | 参考文件 |
| --- | --- |
| 页面级组合、日期参数、表单保存 | `src/pages/DailyPage.tsx` |
| 长表单、防抖自动保存、版本守卫 | `src/pages/GoalDetailPage.tsx` |
| 配置驱动的步骤表单 | `src/components/goals/Step*.tsx` + `src/components/goals/fields.tsx` |
| 集中式文案与限额 | `src/content/goals.ts`、`src/content/daily.ts` |
| API + Query 封装 | `src/lib/api.ts`、`src/lib/queries.ts` |
| 派生统计 | `src/lib/stats.ts`、`src/lib/goals.ts` |
| 新模块复用 documents + localStorage 兜底 | `src/lib/useReality.ts`、`src/pages/RealityPage.tsx` |
| 列表 + 详情 + 自动保存 + 派生状态的新模块 | `src/pages/FearsPage.tsx`、`src/pages/FearDetailPage.tsx`、`src/lib/fears.ts` |
| 配置驱动的一步一问沉浸式书写 + 回看双模式 | `src/pages/EnergyPage.tsx`、`src/pages/EnergySessionPage.tsx`、`src/content/energy.ts`、`src/lib/energy.ts` |
| 独立加载模块 + 独立 query key | `src/pages/CompassPage.tsx`、`src/lib/queries.ts` |
| 单一连续主线、主动洞察、提案回写与抽屉面板 | `src/pages/CoachPage.tsx`、`src/components/coach/*`、`src/lib/queries.ts` |
| 整图快照 diff | `src/lib/compass.ts`、`src/pages/CompassSnapshotsPage.tsx` |
| 静态内容页 | `src/pages/AboutPage.tsx` + `src/content/about.json` |
