# 人生罗盘 · 技术设计

- 任务：`.trellis/tasks/11-18-life-compass`
- 前置：`prd.md`（实体、五级链、风险登记册、快照仅手动、级联删除）
- 日期：2026-11-18

---

## 1. 设计原则

1. **新模块独立建表**，不复制 `goals` / `fears` / `documents(lifeos)` 的实体，也不与旧模块联动。
2. **列只放需要查询 / 排序 / 索引的字段**，分类专属内容全部进 `data` JSON，用判别联合校验。
3. **严格五级链 + 单父指针**：每类实体只有一个合法父类，天然无环，不需要边表。
4. **快照整图存档**，diff 纯确定性计算，不依赖 AI。
5. 复用现有基础设施：TanStack Query、`PageHeader` / `StateViews` / 设计 token；但罗盘数据**不进 `bootstrap`**，用独立接口和缓存键加载，避免继续放大 bootstrap 的体积与故障面。

---

## 2. 数据模型

### 2.1 分类与父子链

| category | 角色 | 合法 parent | 是否根节点 |
| --- | --- | --- | --- |
| `problem` | 要解决的世界问题 | 无 | 是 |
| `goal` | 朝问题推进的可衡量里程碑 | `problem` | 否 |
| `challenge` | 挡住目标的障碍 | `goal` | 否 |
| `strategy` | 克服挑战的方法 | `challenge` | 否 |
| `project` | 推进策略的具体项目 | `strategy` | 否 |
| `risk` | 可能偏离理想状态的场景 | 无 | 是 |

链：

```
problem → goal → challenge → strategy → project

risk（独立根节点，相对 profile.ideal）
```

约束：

- 父节点必须存在且 `user_id` 相同。
- 子节点的 `parent.category` 必须等于上表。
- `problem` / `risk` 的 `parent_id` 必须为 `NULL`。
- `category` 创建后不可修改；需要换类就删除重建。
- 由于分类层级严格递增，任意父级调整都不会形成环；服务端仍做一次防御性检查（parent 不能是自己或自己的后代）。

### 2.2 状态枚举（按分类）

| category | 状态 |
| --- | --- |
| `problem` | `active` / `addressed` / `archived` |
| `goal` | `draft` / `active` / `paused` / `achieved` / `abandoned` |
| `challenge` | `active` / `resolved` / `accepted` |
| `strategy` | `draft` / `active` / `validated` / `invalidated` / `retired` |
| `project` | `planned` / `active` / `paused` / `completed` / `abandoned` |
| `risk` | `watching` / `mitigated` / `realized` / `accepted` |

默认状态：`problem=active`、`goal=draft`、`challenge=active`、`strategy=draft`、`project=planned`、`risk=watching`。

### 2.3 表结构

新增 `migrations/0006_telos.sql`：

```sql
PRAGMA foreign_keys = ON;

-- 罗盘档案：每用户一条当前档案，沿用 telos.md 的字段模型。
-- 版本历史不在这里堆行，交给 telos_snapshots 做整图快照。
CREATE TABLE IF NOT EXISTS telos_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  mission TEXT NOT NULL DEFAULT '',
  current_state TEXT NOT NULL DEFAULT '',
  ideal_state TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 只允许一条 active 档案，避免出现多条“当前档案”。
CREATE UNIQUE INDEX IF NOT EXISTS telos_profiles_user_active_idx
  ON telos_profiles (user_id) WHERE is_active = 1;

-- 人生罗盘实体：单表 + 单父指针 + data JSON。
-- 分类专属字段全部在 data 里，按 category 做 Zod 判别校验。
CREATE TABLE IF NOT EXISTS telos_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  parent_id TEXT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS telos_items_user_parent_idx
  ON telos_items (user_id, parent_id);

CREATE INDEX IF NOT EXISTS telos_items_user_category_idx
  ON telos_items (user_id, category, status);

-- 快照不可变：只插入和删除，不更新。
CREATE TABLE IF NOT EXISTS telos_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS telos_snapshots_user_created_idx
  ON telos_snapshots (user_id, created_at);
```

说明：

- `telos_profiles` 沿用 `telos.md` 的 mission / current_state / ideal_state / version / is_active 字段；部分唯一索引保证每用户只有一条 active 档案。保存时更新同一条并 `version + 1`，历史由快照承担。
- `telos_snapshots` 没有 `updated_at`：快照不可变，避免误改。
- `item_count` 是为了列表页不解析大 JSON。
- 没有外键：遵循项目现状，父子关系由应用层校验；删除父节点走显式级联。

### 2.4 `data` JSON schema

所有字段在归一化时补默认值，读旧数据不会炸。

```ts
type TelosProblemData = {
  description: string;
  whyItMatters: string;
  evidence: string[];
  scope: string;
};

type TelosGoalData = {
  successCriteria: string[];
  metric: { name: string; target: string; cadence: string };
  deadline: string;
  tradeoffs: string;
  notDoing: string[];
};

type TelosChallengeData = {
  evidence: string;
  rootCause: string;
  controllability: "in" | "partial" | "out";
  severity: number; // 1–5
};

type TelosStrategyData = {
  hypothesis: string;
  assumptions: string[];
  leadingIndicators: string[];
  stopConditions: string[];
};

type TelosProjectMilestone = {
  id: string;
  text: string;
  due: string;
  done: boolean;
};

type TelosProjectData = {
  nextAction: string;
  milestones: TelosProjectMilestone[];
};

type TelosRiskControl = {
  state: "none" | "partial" | "ready";
  note: string;
};

type TelosRiskData = {
  scenario: string;
  probability: number; // 1–5
  impact: number; // 1–5
  prevent: TelosRiskControl;
  detect: TelosRiskControl;
  respond: TelosRiskControl;
};
```

归一化规则：

- 字符串：非字符串 → `""`。
- 字符串数组：过滤非字符串。
- `severity` / `probability` / `impact`：四舍五入并夹到 `1–5`。
- `controllability`：非法值 → `"in"`。
- `risk.*.state`：非法值 → `"none"`。
- `milestones`：逐条补 `id`（缺失时 `milestone-<index>`）。
- 未知字段原样丢弃（不保留），保证 `data` 形状稳定。

### 2.5 罗盘档案（`telos_profiles`）

独立表，每用户一条 active 档案；字段沿用 `telos.md`：

```ts
type TelosProfileData = {
  version: number;  // 每次保存 +1，仅作展示 / 调试
  mission: string;      // 使命：我在解决什么问题
  currentState: string; // 现状客观描述
  idealState: string;   // 理想状态愿景
};
```

接口：

- `GET /api/telos/profile`：按 `user_id` 查 `is_active = 1` 的行；没有时返回空档案（不落库）。
- `PUT /api/telos/profile`：upsert 当前用户的 active 行；已存在则更新三段文字、`version + 1`、`updated_at`；不存在则插入 `version = 1`。
- 归一化：非字符串 → `""`；`version` 夹到 ≥1。
- 快照创建时服务端直接读取该表，不信任客户端传入。
- 不把档案写进 `documents`，也不放进 bootstrap。

### 2.6 共享类型（`shared/types.ts`）

新增：

```ts
export const TELOS_CATEGORIES = [
  "problem", "goal", "challenge", "strategy", "project", "risk",
] as const;
export type TelosCategory = (typeof TELOS_CATEGORIES)[number];

export const TELOS_PARENT_CATEGORY: Record<TelosCategory, TelosCategory | null> = {
  problem: null,
  goal: "problem",
  challenge: "goal",
  strategy: "challenge",
  project: "strategy",
  risk: null,
};

export const TELOS_STATUSES: Record<TelosCategory, readonly string[]> = { ... };
export const TELOS_DEFAULT_STATUS: Record<TelosCategory, string> = { ... };

type TelosItemBase = {
  id: string;
  parentId: string | null;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TelosItemEntry =
  | (TelosItemBase & { category: "problem"; status: TelosProblemStatus; data: TelosProblemData })
  | (TelosItemBase & { category: "goal"; status: TelosGoalStatus; data: TelosGoalData })
  | (TelosItemBase & { category: "challenge"; status: TelosChallengeStatus; data: TelosChallengeData })
  | (TelosItemBase & { category: "strategy"; status: TelosStrategyStatus; data: TelosStrategyData })
  | (TelosItemBase & { category: "project"; status: TelosProjectStatus; data: TelosProjectData })
  | (TelosItemBase & { category: "risk"; status: TelosRiskStatus; data: TelosRiskData });

export type TelosSnapshotData = {
  version: 1;
  profile: TelosProfileData;
  items: TelosItemEntry[];
};

export type TelosSnapshotMeta = {
  id: string;
  createdAt: string;
  itemCount: number;
};

export type TelosSnapshotEntry = TelosSnapshotMeta & {
  data: TelosSnapshotData;
};
```

辅助函数：

- `createEmptyTelosData(category): TelosData`
- `normalizeTelosItemData(category, raw): TelosData`
- `normalizeTelosProfile(raw): TelosProfileData`
- `isTelosStatus(category, value): boolean`

`BootstrapResponse` **保持不变**：罗盘数据不进入全量 bootstrap。

`ExportResponse` 增加 `telosProfile: TelosProfileData`、`telosItems: TelosItemEntry[]`、`telosSnapshots: TelosSnapshotEntry[]`，由 `/api/export` 单独查询，保证备份完整。

---

## 3. API 设计

挂载点：`app.route("/api/telos", telosRoute)`，文件 `worker/routes/telos.ts`。

统一约定：`user_id` 来自 `c.get("userEmail")`；错误 `{ error, message?, issues? }`；`data` JSON 长度上限 200,000。

### 3.1 档案

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/telos/profile` | 返回当前用户 active 档案；没有时返回空档案 |
| `PUT` | `/api/telos/profile` | 保存当前档案；先查 active 行，存在则更新并 `version + 1`，否则插入 |

**PUT body**

```ts
{
  mission: string;
  currentState: string;
  idealState: string;
}
```

返回 `{ ok: true, profile: TelosProfileData }`。

### 3.2 实体

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/telos/items` | 列出当前用户全部实体，按 `category, sort_order, created_at` |
| `GET` | `/api/telos/items/:id` | 单条；不存在返回 `{ item: null }` |
| `POST` | `/api/telos/items` | 创建 |
| `PATCH` | `/api/telos/items/:id` | 更新标题 / 状态 / 父级 / 排序 / data |
| `DELETE` | `/api/telos/items/:id` | 级联删除整条子树 |

**POST body**

```ts
{
  category: TelosCategory;
  parentId?: string | null;
  title: string;            // 1–200 字符
  status?: string;          // 省略时取分类默认状态
  sortOrder?: number;       // 省略时取同级最大 + 1
  data?: unknown;           // 按 category 归一化
}
```

**PATCH body**（至少传一项，`category` 不可改）

```ts
{
  title?: string;
  status?: string;
  parentId?: string | null;
  sortOrder?: number;
  data?: unknown;
}
```

**POST / PATCH 校验顺序**

1. Zod 基础校验（字段类型、标题长度、data 为对象、`sortOrder` 为整数）。
2. 状态是否属于该分类。
3. 父级校验：
   - `expected = TELOS_PARENT_CATEGORY[category]`
   - `expected === null` → `parentId` 必须为空。
   - 否则 `parentId` 必填；查父节点：必须存在、同用户、`parent.category === expected`。
   - PATCH 时防御性检查 `parentId !== id`，且 `id` 不在 `parentId` 的祖先链上（正常不可能）。
4. `data` 长度 ≤ 200,000，超限返回 413 `payload_too_large`。
5. `sortOrder` 省略时：查同 `user_id + parent_id` 的最大值 + 1。

**DELETE 行为**

- 先按 `(id, user_id)` 确认目标存在。
- 用一次查询取出该用户全部 `(id, parent_id)`，在内存里 BFS 收集整棵子树。
- 按 50 个 id 一批执行 `DELETE ... WHERE user_id = ? AND id IN (...)`，避免 D1 绑定参数上限。
- 返回 `{ ok: true, deletedIds, deletedCount }`，前端据此精确更新缓存。

### 3.3 快照

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/telos/snapshots` | 元数据列表（不含 data），按 `created_at DESC` |
| `POST` | `/api/telos/snapshots` | 服务端抓取当前 profile + items，创建快照 |
| `GET` | `/api/telos/snapshots/:id` | 单份完整快照（含 data） |
| `DELETE` | `/api/telos/snapshots/:id` | 删除一份快照 |

**POST 行为**

1. 读取 `telos_profiles` 中当前用户的 active 行，归一化成 `TelosProfileData`；没有时用空档案。
2. 读取当前用户全部 `telos_items`，映射成 `TelosItemEntry[]`。
3. 组装 `{ version: 1, profile, items }`，`JSON.stringify` 后写入；`item_count = items.length`。
4. 返回 `{ ok: true, snapshot: TelosSnapshotMeta }` 201。
5. 不接收客户端传入的档案或 items，避免快照和当时状态不一致。

**列表查询**只 select `id, item_count, created_at`，不读 `data`。

### 3.4 bootstrap / export

- `worker/db/queries.ts`：新增 `mapTelosItem` / `mapTelosProfile` / 快照映射函数，但**不修改 `loadAll()`**，`BootstrapResponse` 保持不变。
- 罗盘页面完全通过 `/api/telos/*` 加载；bootstrap 的体积、查询数量和故障面不受新模块影响。
- `GET /api/export`：在 `loadAll()` 结果之外，单独查询档案、全部 items 和全部快照（含 data），组装为 `telosProfile` / `telosItems` / `telosSnapshots`。导出是手动触发的备份，允许承担更大体积。

---

## 4. 前端设计

### 4.1 路由与导航

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/compass` | `CompassPage` | 档案 + 五级树 + 风险登记册 + 快照入口 |
| `/compass/items/:itemId` | `CompassItemPage` | 单实体详情、编辑、调整父级、级联删除 |
| `/compass/snapshots` | `CompassSnapshotsPage` | 快照列表 + 对比（`?a=<id>&b=<id>`） |

- `src/App.tsx` 注册三条路由，外层 `Layout`。
- `src/components/Layout.tsx` 的 `NAV` 增加 `{ to: "/compass", label: "人生罗盘" }`。移动端顶部导航已支持换行。

### 4.2 页面职责

**`CompassPage`**

- 页头：`PageHeader`，标题「人生罗盘」。
- `CompassProfileCard`：mission / current / ideal 三个文本域，本地草稿 + 显式「保存档案」，保存状态提示；使用 `useTelosProfile` / `useSaveTelosProfile`。
- 统计条：各分类数量、风险中 `detect.state === "none"` 的数量。
- `CompassTree`：以 problem 为根递归渲染；默认展开 problem，goal 及更深层折叠；每个节点显示分类标签、标题、状态 chip、子节点数，操作：展开 / 折叠、进入详情、添加子项、删除。
- `RiskBoard`：risk 独立区块，按 `probability × impact` 倒序，可按状态筛选；卡片显示 `P×I` 与 prevent / detect / respond 三个徽章。
- 快照区：最近 5 条快照 + 「记录这一刻」按钮 + 进入快照页链接。
- 新建入口：「新建问题」「新建风险」；子项通过节点上的「添加子项」创建。
- 新建交互：`CompassCreateDialog` 只收集标题，POST 后直接跳到详情页补齐内容。

**`CompassItemPage`**

- 从 `useTelosItems()` 的结果找 `itemId`；找不到显示 `EmptyState`。
- 顶部面包屑：problem → goal → challenge → strategy → project（按 parent 链回溯）。
- 标题输入、状态选择、父级选择（只列出白名单允许的分类；problem / risk 不显示父级选择）。
- `CompassItemFields`：按 `category` 渲染专属字段。
- 子节点列表：标题 + 状态 + 进入链接；提供「添加子项」。
- 自动保存：防抖 `AUTOSAVE_DEBOUNCE_MS`（2s）+ 版本守卫，沿用 `FearDetailPage` 的模式；切换实体或离开页面时补保存。
- 删除：二次确认里显示「将同时删除 N 条子项」；确认后调 DELETE，并用返回的 `deletedIds` 更新缓存，然后回 `/compass`。

**`CompassSnapshotsPage`**

- 快照列表：创建时间、条目数、选择 A / B 进行对比、删除（二次确认）。
- A / B 选择写入 URL `?a=&b=`，刷新和分享可恢复。
- 两份快照都选中后，并行请求 `GET /api/telos/snapshots/:id`。
- 顶部档案 diff：mission / current / ideal 三段的前后文本。
- 条目 diff：新增 / 删除 / 变化（标题、状态、父级、data 字段），按分类分组。
- 移动端：全部纵向堆叠，长文本用换行块展示，不做横向表格。

### 4.3 组件与文件

```
src/
├── components/compass/
│   ├── CompassProfileCard.tsx   # 档案三段文字 + 保存
│   ├── CompassTree.tsx          # 递归树节点（展开 / 折叠 / 操作）
│   ├── CompassItemFields.tsx    # 分类专属字段渲染
│   ├── CompassCreateDialog.tsx  # 新建实体（只收标题）
│   ├── RiskCard.tsx             # 风险卡片 + 三个状态徽章
│   └── SnapshotDiff.tsx         # 档案 diff + 条目 diff
├── content/
│   └── compass.ts               # 分类 / 状态 / 字段文案、默认值、限额
├── lib/
│   └── compass.ts               # 建树、祖先链、后代计数、风险排序、快照 diff
├── pages/
│   ├── CompassPage.tsx
│   ├── CompassItemPage.tsx
│   └── CompassSnapshotsPage.tsx
```

### 4.4 状态与缓存

- 罗盘数据**不读 bootstrap**，使用独立查询：
  - `["telos", "items"]` → `GET /api/telos/items`
  - `["telos", "profile"]` → `GET /api/telos/profile`
  - `["telos", "snapshots"]`、`["telos", "snapshot", id]` → 快照
- 页面只依赖这些查询；bootstrap 失败或变慢不影响罗盘页面。
- 新增：`useCreateTelosItem` → `setQueryData(["telos", "items"])` 追加。
- 更新：`useUpdateTelosItem` → 替换同一 id（`updatedAt` 旧的响应不覆盖新的）。
- 删除：`useDeleteTelosItem` → 用响应里的 `deletedIds` 从缓存移除；不做整页 refetch，避免覆盖编辑中的草稿。
- 档案：`useTelosProfile` + `useSaveTelosProfile`；保存成功后原地更新 `["telos", "profile"]`，不触发 bootstrap。
- 快照：创建 / 删除后 invalidate `["telos", "snapshots"]`，不影响 items / profile。
- URL 状态：快照对比的 `a` / `b` 用 `useSearchParams`。

### 4.5 快照 diff 算法（`src/lib/compass.ts`）

纯函数，输入两份 `TelosSnapshotData`：

```ts
type TelosSnapshotDiff = {
  profile: { field: "mission" | "current" | "ideal"; before: string; after: string }[];
  added: TelosItemEntry[];
  removed: TelosItemEntry[];
  changed: {
    item: TelosItemEntry;          // 新版本
    fields: { field: "title" | "status" | "parentId"; before: string | null; after: string | null }[];
    data: { key: string; before: unknown; after: unknown }[];
  }[];
  unchangedCount: number;
};
```

- 按 `id` 建 map；`added` = B 有 A 无，`removed` = A 有 B 无。
- 共同条目比较 `title` / `status` / `parentId`；`parentId` 变化时额外解析前后父节点标题，UI 显示「从 X 移到 Y」。
- `data` 按顶层 key 比较，数组和对象用 `JSON.stringify` 比较（顺序敏感，够用且确定）。
- `category` 理论上不可变；若不同，按「删除 + 新增」处理。
- 输出按分类顺序（problem → … → risk）、再按标题排序。
- 不改写快照，不调用 AI。

---

## 5. 兼容、发布与回滚

- 迁移只新增三张表（`telos_profiles` / `telos_items` / `telos_snapshots`），不改旧表；旧模块代码零改动。
- 新路由 `/compass` 与导航项是纯增量；旧页面、旧接口、旧数据不受影响。
- **`/api/bootstrap` 与 `loadAll()` 不变**；罗盘使用独立接口和查询键，新模块出问题不会拖垮首屏。
- 发布顺序：先 `npm run db:migrate:local` 验证 → 部署前 `npm run db:migrate:remote` → `npm run deploy`。
- 回滚：代码层回滚到上一版本即可，新增表保留但无人读写；不需要删表。
- 只有进入罗盘页面才请求 `/api/telos/*`，不影响首屏 bootstrap 的体积。

---

## 6. 风险与取舍

| 风险 | 处理 |
| --- | --- |
| 单父指针表达不了多父级 | v1 接受；真出现跨目标项目时再加 `related_ids` 或边表，不预留 |
| 树层级只有五级 | 用分类白名单硬约束，不做任意深度 |
| 快照 JSON 可能变大 | 仅手动创建；列表不读 data；对比时按需拉两份 |
| 独立加载增加请求 | 罗盘页首屏多一次 `/api/telos/*` 请求；换来 bootstrap 不被新模块拖累 |
| 服务端无外键 | 父级存在性、同用户、分类白名单都在路由层校验；删除走显式 BFS |
| 无自动化测试 | 以 `npm run typecheck` / `npm run build` + 本地 curl + 桌面 / 移动端人工验证为质量门 |
| `data` JSON 结构漂移 | 所有读取走 `normalizeTelosItemData`，非法值回落默认；Zod 在写入前校验外层结构 |
