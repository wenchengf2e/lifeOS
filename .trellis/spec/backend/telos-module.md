# 人生罗盘（telos）模块契约

> 独立模块的跨层契约。改动 `telos_*` 表、`/api/telos/*` 或前端 `["telos", ...]` 查询时必须同步本文档。

---

## 1. Scope / Trigger

- 触发条件：新增或修改人生罗盘的数据库表、API 签名、请求 / 响应字段、缓存键、快照格式。
- 本模块是项目里第一个**不进入 `bootstrap`** 的资源模块，用于验证「独立加载、独立故障面」的模块组织方式。
- 代码位置：`shared/types.ts`（契约与归一化）、`worker/routes/telos.ts`（HTTP）、`worker/db/queries.ts`（映射）、`src/lib/queries.ts`（前端缓存）。

---

## 2. Signatures

### 2.1 数据库（migration `0006_telos.sql`）

```sql
telos_profiles(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  mission TEXT NOT NULL, current_state TEXT NOT NULL, ideal_state TEXT NOT NULL,
  version INTEGER NOT NULL, is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
)
-- 部分唯一索引：每用户只允许一条 active 档案
UNIQUE INDEX telos_profiles_user_active_idx ON telos_profiles (user_id) WHERE is_active = 1

telos_items(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, parent_id TEXT,
  category TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL,
  sort_order INTEGER NOT NULL, data TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
)

telos_snapshots(
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
  item_count INTEGER NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL
)
```

### 2.2 HTTP

| 方法 | 路径 | 成功响应 |
| --- | --- | --- |
| `GET` | `/api/telos/profile` | `{ profile: TelosProfileData }`（无档案时返回空档案，不落库） |
| `PUT` | `/api/telos/profile` | `{ ok, profile }`；body `{ mission, currentState, idealState }`，三者均为必填字符串 |
| `GET` | `/api/telos/items` | `{ items: TelosItemEntry[] }` |
| `GET` | `/api/telos/items/:id` | `{ item: TelosItemEntry \| null }` |
| `POST` | `/api/telos/items` | 201 `{ ok, item }`；body `{ category, parentId?, title, status?, sortOrder?, data? }` |
| `PATCH` | `/api/telos/items/:id` | `{ ok, item }`；body 至少包含 `title/status/parentId/sortOrder/data` 之一 |
| `DELETE` | `/api/telos/items/:id` | `{ ok, deletedIds, deletedCount }`（整棵子树，含目标自身） |
| `GET` | `/api/telos/snapshots` | `{ snapshots: TelosSnapshotMeta[] }`（只含 `id/createdAt/itemCount`） |
| `POST` | `/api/telos/snapshots` | 201 `{ ok, snapshot: TelosSnapshotMeta }`；服务端抓取，忽略请求体 |
| `GET` | `/api/telos/snapshots/:id` | `{ snapshot: TelosSnapshotEntry \| null }`（含 `data`） |
| `DELETE` | `/api/telos/snapshots/:id` | `{ ok }` |

### 2.3 共享类型

- `TELOS_CATEGORIES` / `TELOS_PARENT_CATEGORY` / `TELOS_STATUSES` / `TELOS_DEFAULT_STATUS` 是唯一事实来源，前后端都从这里读。
- `TelosItemEntry` 是按 `category` 判别的联合类型；状态和 `data` 会随分类收窄。
- 写入前统一走 `normalizeTelosItemData(category, raw)`；读取时 `mapTelosItem` 也会归一化。

---

## 3. Contracts

### 3.1 层级白名单

| category | 合法 parent |
| --- | --- |
| `problem` | `null` |
| `goal` | `problem` |
| `challenge` | `goal` |
| `strategy` | `challenge` |
| `project` | `strategy` |
| `risk` | `null` |

- `category` 创建后不可修改。
- `parent_id` 指向唯一上级；跨树移动时只允许换到同类父级下。
- 五级链天然无环；PATCH 仍做防御性检查（parent 不能是自己或自己的后代）。

### 3.2 `data` JSON

- 每类实体有自己的 shape，字段见 `shared/types.ts` 的 `Telos*Data`。
- 1–5 分值（`severity` / `probability` / `impact`）未评时归一化为 `3`。
- 风险控制状态固定为 `none | partial | ready`。
- `data` JSON 上限 200,000 字符；超过返回 413。

### 3.3 `bootstrap` 与 `export`

- `loadAll()` 和 `/api/bootstrap` **不包含任何 telos 字段**；不要为了省一个请求把罗盘塞回 bootstrap。
- `/api/export` 单独查询并附加 `telosProfile` / `telosItems` / `telosSnapshots`，保证备份完整。
- 前端使用独立 query key：`["telos","items"]`、`["telos","profile"]`、`["telos","snapshots"]`、`["telos","snapshot",id]`。

### 3.4 快照

- `POST /api/telos/snapshots` 不信任客户端：服务端读取 active profile + 当前全部 items。
- `data = { version: 1, profile, items }`；快照不可变，只有插入和删除，没有 `updated_at`。
- 列表接口只 select `id/item_count/created_at`，避免加载大 JSON。
- diff 在前端 `diffTelosSnapshots` 里做，纯确定性计算。

---

## 4. Validation & Error Matrix

| 条件 | 响应 |
| --- | --- |
| 请求体不是对象 / 字段类型错误 / PATCH 为空 | `400 invalid_body` + `issues` |
| `:id` 不合法（空、超长） | `400 invalid_id` |
| 状态不属于当前 category | `400 invalid_status` |
| 父级缺失、父级不存在、父级属于其他用户、父级 category 不在白名单 | `400 invalid_parent` |
| `problem` / `risk` 带了 `parentId` | `400 invalid_parent` |
| PATCH 的 `parentId` 是自己或后代 | `400 invalid_parent` |
| 实体 / 快照不存在或不属于当前用户 | `404 not_found` |
| `data` JSON > 200,000 字符 | `413 payload_too_large` |

其他约定：

- 所有查询都带 `user_id = c.get("userEmail")`。
- 默认状态取 `TELOS_DEFAULT_STATUS[category]`。
- `sortOrder` 省略时取同级最大值 + 1。
- 级联删除按 50 个 id 一批执行 `IN (...)`，避免 D1 绑定参数上限。

---

## 5. Good / Base / Bad Cases

- **Good**：`goal` 挂在 `problem` 下；`challenge` 挂在 `goal` 下；删除 `problem` 返回整棵子树的 `deletedIds`；前端按这些 id 精确移除缓存。
- **Base**：第一次打开罗盘，没有 profile 行 → `GET /api/telos/profile` 返回空档案；第一次保存插入 `version = 1`。
- **Bad**：把 `goal` 挂到 `strategy` 下 → `400 invalid_parent`；给 `challenge` 写 `achieved` → `400 invalid_status`；删除父节点只删自己 → 产生孤儿，绝不允许。
- **Bad**：`POST /api/telos/snapshots` 由客户端传 `items` 并写入 → 快照可能与数据库不一致，必须由服务端抓取。

---

## 6. Tests Required

当前仓库没有自动化测试；以下为最低验证点，补测试时按这些断言写。

### 6.1 API 集成

- `GET /api/bootstrap` 的 JSON **不包含** `telosItems` / `telosProfile` / `telosSnapshots`。
- `PUT /api/telos/profile` 连续两次，第二次响应 `version` 比第一次大 1。
- 创建五级链成功；`goal` 挂 `strategy`、`project` 挂 `problem` 均返回 400 `invalid_parent`。
- 给 `challenge` PATCH `status=achieved` 返回 400 `invalid_status`。
- 删除 `problem` 返回 `deletedCount` 等于整棵子树节点数，其他树不受影响。
- `GET /api/telos/snapshots` 的列表项没有 `data` 字段。
- `/api/export` 同时包含 `telosProfile` / `telosItems` / `telosSnapshots`。

### 6.2 前端单元（补充测试时）

- `buildCompassForest`：五级链建树正确，risk 为根节点。
- `getDescendantIds` / `countDescendants`：父节点包含全部后代，不包含兄弟节点。
- `diffTelosSnapshots`：新增、删除、标题 / 状态 / 父级 / data 变化、profile 变化都能列出。

### 6.3 E2E

- 新建 problem → 逐级添加子项，刷新后树结构保持。
- 详情页输入后等待自动保存，刷新后内容仍在。
- 级联删除确认框显示后代数量。
- 快照 A/B 对比在 390px 宽度下无横向滚动。

---

## 7. Wrong vs Correct

### Wrong：把罗盘塞回 bootstrap

```ts
// worker/db/queries.ts
export async function loadAll(db: Db, userId: string) {
  // ...
  const telosRows = await db.select().from(telosItems)...;
  return { ..., telosItems: telosRows.map(mapTelosItem) };
}
```

问题：bootstrap 是首屏唯一的大请求，罗盘 item 和快照会持续增长；一处查询变慢会拖垮所有页面。

### Correct：独立接口 + 独立缓存

```ts
// worker/routes/telos.ts
app.get("/items", async (c) => {
  const rows = await getDb(c.env.DB)
    .select()
    .from(telosItems)
    .where(eq(telosItems.userId, c.get("userEmail")));
  return c.json({ items: rows.map(mapTelosItem) });
});

// src/lib/queries.ts
export function useTelosItems() {
  return useQuery({ queryKey: ["telos", "items"], queryFn: api.listTelosItems });
}
```

### Wrong：用 `documents` 存档案

```ts
await saveDocument("telos", "profile", { mission, currentState, idealState });
```

问题：档案需要 `version` / `is_active` 约束和独立 upsert 语义，塞进通用文档会丢失这些约束。

### Correct：独立 `telos_profiles`

```ts
// 先查 active 行，存在则 UPDATE（version + 1），否则 INSERT（version = 1）
const [existing] = await db.select().from(telosProfiles)
  .where(and(eq(telosProfiles.userId, user), eq(telosProfiles.isActive, true)))
  .limit(1);
```
