PRAGMA foreign_keys = ON;

-- 目标：一条记录对应一个目标，data 里存 GoalData 的 JSON。
-- 领域只是可选分类，一个目标可以直接叫「投资」。
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'active',
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS goals_user_status_idx
  ON goals (user_id, status);

CREATE INDEX IF NOT EXISTS goals_user_updated_idx
  ON goals (user_id, updated_at);
