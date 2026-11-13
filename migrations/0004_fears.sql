PRAGMA foreign_keys = ON;

-- 恐惧清单：一条记录对应一个恐惧，五步内容存在 data 的 JSON 里。
-- 标题由第 1 步内容派生，状态由第 4、5 步内容派生，不额外存列。
CREATE TABLE IF NOT EXISTS fears (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS fears_user_updated_idx
  ON fears (user_id, updated_at);
