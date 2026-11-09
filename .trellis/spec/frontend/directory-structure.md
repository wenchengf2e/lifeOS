# 目录结构

> 前端代码在 LifeOS 中如何组织。

---

## 概览

前端是一个 React 19 单页应用，由 Vite 构建，路由使用 React Router 7 的 `BrowserRouter`，服务端状态统一走 TanStack Query，样式使用 Tailwind CSS 4。

整体分层：

- `src/pages/`：路由页面，负责页面级布局、表单状态和交互编排。
- `src/components/`：可复用 UI 与业务组件；五步诊断的表单组件单独放在 `components/goals/`。
- `src/content/`：纯配置与文案（模块定义、步骤定义、选项、限额），不包含 JSX。
- `src/lib/`：API 客户端、查询 hooks、日期 / 统计 / 目标派生逻辑和自定义 hook。
- `src/App.tsx`：唯一的扁平路由表；所有页面都包在 `Layout` 里。
- `src/index.css`：Tailwind 4 入口、`@theme` 设计 token、`.card` / `.field` / `.btn-*` 等共享类。

没有 Redux / Zustand 之类的全局状态库。服务端数据只有一份 `["bootstrap"]` 查询缓存；页面内的编辑状态用 `useState` 或 `useReducer` 局部管理，当前日期 / 步骤等选择状态放在 URL 查询参数里。

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
│   ├── DirectionCard.tsx       # 人生 OS 方向卡
│   ├── PatternCard.tsx         # 模式卡字段、证据、状态流转
│   ├── Reality*.tsx            # Reality OS：方向卡、目标摘要卡、雷达图
│   └── goals/
│       ├── fields.tsx          # FieldHeader / TextField / TextInput / TextListField / SegmentedField / StepEmpty
│       └── Step*.tsx           # 五步诊断各步骤表单：目标 / 问题 / 诊断 / 方案 / 践行
├── content/                    # 纯配置与文案（无 JSX）
│   ├── daily.ts                # 每日仪式四模块与字段
│   ├── goals.ts                # 领域、状态、五步定义、限额与文案
│   ├── lifeos.ts               # 方向卡与人生 OS 六栏
│   ├── lists.ts                # 成就 / 关键改变 / 复盘动作三个清单
│   ├── review.ts               # 周复盘四步、模式卡字段、状态
│   ├── reality.ts              # Reality OS 六维、T1–T5 标准、统计
│   ├── about.ts                # 关于页类型与解析
│   └── about.json              # 关于页静态内容
├── lib/
│   ├── api.ts                  # fetch 封装、ApiError、所有端点方法
│   ├── queries.ts              # bootstrap 查询与各类 mutation
│   ├── goals.ts                # 五步派生：完成度、进度、检查清单、停滞判断
│   ├── stats.ts                # 打卡完成判断、日期集合、月 / 总计数、连续天数
│   ├── date.ts                 # 日期键、中文格式化、月 / ISO 周工具
│   └── useReality.ts           # Reality OS 读写（documents + localStorage 兜底）
└── pages/                      # 路由页面，统一 XxxPage.tsx
    ├── OverviewPage.tsx        # 总览仪表盘
    ├── DailyPage.tsx           # 每日仪式（四模块）
    ├── DiaryPage.tsx           # 日记归档（只读）
    ├── LifeOSPage.tsx          # 人生 OS 六栏
    ├── ReviewPage.tsx          # 复盘首页（周复盘入口 + 模式库）
    ├── ReviewWizardPage.tsx    # 周复盘四步向导
    ├── GoalsPage.tsx           # 五步诊断目标列表
    ├── GoalDetailPage.tsx      # 单个目标五步工作台
    ├── ListsPage.tsx           # 清单（三个 tab）
    ├── RealityPage.tsx         # Reality OS 投资六维
    ├── AboutPage.tsx           # 静态关于页
    └── NotFoundPage.tsx        # 404
```

路由与页面的对应关系：

| 路径 | 页面 |
| --- | --- |
| `/` | `OverviewPage` |
| `/daily` | `DailyPage`（`?date=YYYY-MM-DD` 可补写历史） |
| `/belief`、`/evening` | 重定向到 `/daily` |
| `/lifeos` | `LifeOSPage` |
| `/diary` | `DiaryPage` |
| `/review` | `ReviewPage` |
| `/review/week/:key` | `ReviewWizardPage`（`?step=1..4`） |
| `/lists` | `ListsPage` |
| `/principles` | `GoalsPage` |
| `/principles/:goalId` | `GoalDetailPage`（`?step=1..5`） |
| `/reality` | `RealityPage` |
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

- 服务端状态统一通过 `useBootstrap()` 读取，查询键固定为 `["bootstrap"]`，`staleTime: 15s`。
- 写操作分两类：
  - 打卡、文档、清单、复盘、模式卡：mutation 成功后 invalidate `["bootstrap"]`。
  - 目标：用 `setQueryData` 就地更新缓存，避免覆盖正在编辑的草稿。
- 页面内表单使用局部 state；日期、步骤等领域选择状态用 `useSearchParams` 保存，保证刷新和分享链接可恢复。
- 长表单（如 `GoalDetailPage`）使用防抖自动保存和版本守卫，避免旧响应覆盖新输入。

### 派生逻辑

- 打卡完成判断、连续天数、月度统计 → `src/lib/stats.ts`。
- 五步完成度、进度、检查清单、停滞判断 → `src/lib/goals.ts`。
- 日期键、ISO 周、中文格式化 → `src/lib/date.ts`。
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
| 静态内容页 | `src/pages/AboutPage.tsx` + `src/content/about.json` |
