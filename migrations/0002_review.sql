PRAGMA foreign_keys = ON;

-- 周复盘 / 月复盘。一条记录对应一个周期，data 里存 ReviewData 的 JSON。
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_type TEXT NOT NULL,
  period_key TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_period_uq
  ON reviews (user_id, period_type, period_key);

-- 模式卡：从复盘里提炼出来的、可复用的行为模式。
-- trigger 是 SQLite 关键字，这里显式加引号。
CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  "trigger" TEXT,
  reaction TEXT,
  payoff TEXT,
  cost TEXT,
  alternative TEXT,
  evidence TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'watching',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS patterns_user_status_idx
  ON patterns (user_id, status);
