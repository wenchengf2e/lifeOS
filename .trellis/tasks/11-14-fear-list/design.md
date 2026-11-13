# 技术设计：恐惧清单（五步恐惧转化）

## 1. 边界与总体结构

新增一个与 `goals` 平行的独立模块：

- 数据层：D1 新表 `fears`，一条记录对应一条恐惧，五步内容存在 JSON `data` 里。
- API：`/api/fears` CRUD，并加入 `/api/bootstrap`、`/api/export`。
- 前端：`/fears` 列表页 + `/fears/:id` 详情页；列表与详情都从 `["bootstrap"]` 缓存读取。
- 不复用 `goals` / `items` / `documents`：恐惧条目需要独立 id、列表和排序，属于「可枚举实体」；`documents` 适合单篇长文。

数据流：

```
FearsPage / FearDetailPage
  → useBootstrap()（只读）
  → useCreateFear / useUpdateFear / useDeleteFear
  → setQueryData 就地更新缓存（避免自动保存被整页 refetch 覆盖）
  → /api/fears → Drizzle → D1 fears
```

## 2. 数据模型

### 2.1 新表 `fears`

`worker/db/schema.ts`：

```ts
export const fears = sqliteTable("fears", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  data: text("data").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

`migrations/0004_fears.sql`：

```sql
PRAGMA foreign_keys = ON;

-- 恐惧清单：一条记录对应一个恐惧，五步内容存在 data 的 JSON 里。
CREATE TABLE IF NOT EXISTS fears (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS fears_user_updated_idx
  ON fears (user_id, updated_at);
```

设计取舍：

- **不存 `title` 列**：标题由第 1 步内容派生，避免标题和内容出现两份真相。
- **不存 `status` 列**：状态由第 4、5 步内容派生，不增加用户输入。
- **五步用 JSON 而不是五个列**：与 `goals.data` 一致；后续加字段不用改表，读取时统一走 `normalizeFearData`。

### 2.2 共享类型（`shared/types.ts`）

```ts
export const FEAR_STEP_KEYS = ["fear", "rootCause", "problem", "action", "evidence"] as const;

export type FearStepKey = (typeof FEAR_STEP_KEYS)[number];

export type FearData = {
  version: 1;
  /** 1 识别恐惧：我具体在害怕什么。 */
  fear: string;
  /** 2 寻找根因：为什么害怕。 */
  rootCause: string;
  /** 3 定义问题：需要解决什么。 */
  problem: string;
  /** 4 转化为任务：下一步做什么。 */
  action: string;
  /** 5 验证与反馈：取得了什么证据。 */
  evidence: string;
};

export type FearEntry = {
  id: string;
  data: FearData;
  createdAt: string;
  updatedAt: string;
};
```

同时增加：

- `createEmptyFearData(): FearData`，五个字段均为空字符串。
- `normalizeFearData(raw: unknown): FearData`，复用现有 `asString` 兜底，保证旧数据 / 缺字段不炸。
- `BootstrapResponse` 增加 `fears: FearEntry[]`；`ExportResponse` 继承后自动包含。

### 2.3 行映射与聚合读取

`worker/db/queries.ts`：

- 新增 `mapFear(row)`：`parseJson` + `normalizeFearData`。
- `loadAll()` 并行查询增加 `fears`，按 `updatedAt` 倒序。

## 3. API

`worker/routes/fears.ts`，遵循现有路由文件结构：

| 方法 | 路径 | 请求体 | 响应 |
| --- | --- | --- | --- |
| GET | `/api/fears` | — | `{ fears: FearEntry[] }` |
| GET | `/api/fears/:id` | — | `{ fear: FearEntry \| null }` |
| POST | `/api/fears` | `{ data?: FearData }` | `201 { ok: true, fear }` |
| PATCH | `/api/fears/:id` | `{ data: FearData }` | `{ ok: true, fear }` |
| DELETE | `/api/fears/:id` | — | `{ ok: true }` |

约定：

- id 校验 `z.string().min(1).max(64)`；data 用 `z.record(z.string(), z.unknown())`。
- 写入前 `JSON.stringify(normalizeFearData(data))`，长度上限 `200_000`，超限返回 `413 payload_too_large`。
- 所有查询带 `user_id = c.get("userEmail")`；PATCH / DELETE 先按 `(id, user_id)` 查存在性，不存在返回 `404 not_found`。
- POST 允许 `data` 为空（服务端兜底为空五步）；UI 在创建弹窗要求第 1 步非空。
- `worker/index.ts` 挂载 `app.route("/api/fears", fearsRoute)`。

## 4. 前端设计

### 4.1 文件职责

新增：

| 文件 | 职责 |
| --- | --- |
| `src/content/fears.ts` | 五步定义、页面文案、派生状态标签与样式 |
| `src/lib/fears.ts` | 标题派生、完成度、状态派生、排序 |
| `src/components/fears/FearStepField.tsx` | 单个步骤的卡片 + 文本域 |
| `src/components/FearCard.tsx` | 列表卡片 |
| `src/pages/FearsPage.tsx` | 列表 + 新建弹窗 |
| `src/pages/FearDetailPage.tsx` | 五步详情 + 自动保存 + 删除 |
| `worker/routes/fears.ts` | CRUD |
| `migrations/0004_fears.sql` | `fears` 表 |

修改：

| 文件 | 改动 |
| --- | --- |
| `shared/types.ts` | 恐惧类型、默认值、normalize、bootstrap 响应 |
| `worker/db/schema.ts` | `fears` 表定义 |
| `worker/db/queries.ts` | `mapFear`、`loadAll` |
| `worker/index.ts` | 挂载 `/api/fears` |
| `src/lib/api.ts` | `createFear` / `updateFear` / `deleteFear` |
| `src/lib/queries.ts` | 三个 mutation，缓存就地更新 |
| `src/App.tsx` | `/fears`、`/fears/:id` 路由 |
| `src/components/Layout.tsx` | NAV 增加「恐惧清单」 |
| `src/pages/OverviewPage.tsx` | 快捷入口增加恐惧清单 |
| `README.md`、`docs/project-overview.md` | 功能、API、数据模型、模块地图 |

### 4.2 五步内容与派生逻辑

`src/content/fears.ts`：

```ts
export type FearStep = {
  key: FearStepKey;
  index: number;
  title: string;
  short: string;
  icon: string;
  prompt: string;
  hint: string;
  placeholder: string;
};

export const fearSteps: FearStep[] = [
  { key: "fear", index: 1, title: "识别恐惧", short: "恐惧", icon: "🫨", ... },
  { key: "rootCause", index: 2, title: "寻找根因", short: "根因", icon: "🕳", ... },
  { key: "problem", index: 3, title: "定义问题", short: "问题", icon: "🧩", ... },
  { key: "action", index: 4, title: "转化为任务", short: "行动", icon: "🛠", ... },
  { key: "evidence", index: 5, title: "验证与反馈", short: "证据", icon: "📊", ... },
];
```

文案方向（最终以实现为准）：

1. 识别恐惧：写具体场景，不写抽象情绪。
2. 寻找根因：如果它真的发生，最坏会怎样？继续往下问一层。
3. 定义问题：把恐惧翻译成一个可以处理的问题。
4. 转化为任务：下一步做什么？小到今天就能开始。
5. 验证与反馈：做完之后，实际发生了什么？

`src/lib/fears.ts`：

- `fearTitle(data)`：取 `data.fear` 第一行，`trim`，为空返回「未命名恐惧」，超长截断。
- `fearProgress(data)`：五个字段非空计数 / 5，返回 `completed` 与 `percent`。
- `fearStage(data)`：
  - `evidence` 非空 → `verified`（已验证）
  - `action` 非空 → `pending_proof`（待验证）
  - 其他 → `pending_action`（待行动）
- `sortFears(entries)`：按 `updatedAt` 倒序，时间相同按 `createdAt`。

派生状态样式沿用现有 token，不使用硬编码颜色。

### 4.3 列表页 `/fears`

- 顶部 `PageHeader`：eyebrow「Fear → Action」，标题「恐惧清单」，描述一句话说明五步转化。
- 右侧主按钮「+ 新建恐惧」。
- 标题下方一行统计 chips：共 N 条 · 待行动 X · 待验证 Y · 已验证 Z。
- 卡片网格（`lg:grid-cols-2`），每张卡：
  - 派生状态 chip
  - 第 1 步标题（单行截断）
  - 下一步预览：第 4 步有内容显示「下一步：…」，否则显示第 1 步摘要
  - 五步完成点（5 个小圆点，已完成填色）
  - 更新时间（复用 `formatDateCN` / 相对时间风格）
  - 整卡点击进入 `/fears/:id`
- 空状态：`EmptyState`，引导写下第一条恐惧。
- 新建弹窗：复用 `GoalsPage` 的弹窗交互模式（Escape 关闭、背景点击关闭、打开时聚焦、锁定 body 滚动），只有一个文本域「我具体在害怕什么？」；提交时校验非空，`createFear({ data: { ...empty, fear } })` 成功后 `navigate('/fears/' + id)`。

### 4.4 详情页 `/fears/:id`

以 `GoalDetailPage` 的草稿 / 自动保存机制为模板，去掉步骤 tab 和侧边栏：

- 从 `useBootstrap()` 找到 `fears` 中的条目；不存在时显示「恐惧不存在」空状态。
- 本地 `draft: { id, data }`，只在 `fear.id` 变化时重置，避免保存成功后 `updatedAt` 变化重置输入。
- 头图：
  - 返回按钮（有未保存改动先保存，再回 `/fears`）
  - eyebrow「Fear → Action」
  - 派生标题（`fearTitle`，用 `font-display` 展示，不单独做标题输入）
  - 派生状态 chip、保存状态
  - 五步进度条（`completed / 5`）
- 主体：五张步骤卡纵向排列，每张包含序号、图标、标题、引导语、提示语和文本域。
- 底部操作条：保存状态（保存中 / 已保存 · 时间 / 保存失败，点击重试）、手动「保存」按钮、删除入口。
- 保存机制：
  - 输入停止 800ms 后自动保存；
  - `changeVersion` ref 版本守卫，响应回来时版本不一致则保持 dirty；
  - 保存失败后停下，等待手动重试，不连续打接口；
  - 有未保存内容时 `beforeunload` 提示；SPA 离开时补一次保存（同 `GoalDetailPage.tsx` 的 cleanup 逻辑）。
- 删除：`window.confirm` 二次确认，成功后 `navigate('/fears')`。

### 4.5 Query 缓存策略

沿用目标模块的做法，避免自动保存触发整页 refetch：

- `useCreateFear`：成功后把新条目插到 `fears` 缓存头部。
- `useUpdateFear`：成功后按 id 替换，且仅当缓存中的 `updatedAt <= 返回的 updatedAt` 时替换。
- `useDeleteFear`：成功后从缓存过滤。
- 不使用 `invalidateQueries({ queryKey: ["bootstrap"] })`。

### 4.6 入口

- `Layout.tsx` 的 `NAV` 在「五步诊断」后增加 `{ to: "/fears", label: "恐惧清单" }`。
- `OverviewPage` 快捷入口增加一条，显示待行动数量，例如「😨 恐惧清单 · N 条待行动」。
- `App.tsx` 注册 `/fears` 与 `/fears/:id`。

## 5. 兼容、迁移与部署

- migration 为纯新增表，无回填；本地 `npm run db:migrate:local`，线上部署前 `npm run db:migrate:remote`。
- `/api/bootstrap`、`/api/export` 为增量字段 `fears`，不影响现有模块；前端读取时用 `data?.fears ?? []` 兜底旧 Worker。
- `ExportResponse.version` 保持 `1`，属于向后兼容的新增字段。
- 部署顺序：先应用 migration，再部署 Worker，最后前端静态资源（同一次 deploy 内顺序由 Wrangler 保证）。

## 6. 取舍记录

| 决策 | 选择 | 理由 |
| --- | --- | --- |
| 存储 | 独立 `fears` 表 | 需要列表、排序和独立 id，不是单篇文档 |
| 字段存储 | JSON `data` | 与 `goals` 一致，五步结构演进不用改表 |
| 标题 | 从第 1 步派生 | 保持五个输入框，避免标题与内容不一致 |
| 状态 | 内容派生 | 零额外输入，避免用户维护状态 |
| 第 4 步 | 纯文本 | 现有清单模块无法勾选完成，联动无法闭环 |
| 自动保存 | 800ms 防抖 + 版本守卫 | 复用已验证的目标模块机制 |

## 7. 风险与回滚

- **自动保存竞态**：版本守卫 + `updatedAt` 比较；保存失败可见、可重试。
- **空记录**：创建弹窗要求第 1 步非空；之后清空第 1 步允许保存，列表显示「未命名恐惧」。
- **删除误操作**：二次确认。
- **回滚**：前端路由/入口和 Worker 挂载可单独回退；`fears` 表为新增，可保留不删。需要彻底回滚时再执行 `DROP TABLE fears;`。
