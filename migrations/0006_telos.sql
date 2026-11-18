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
