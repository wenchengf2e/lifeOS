PRAGMA foreign_keys = ON;

-- 恐惧清单：一条记录对应一个恐惧，五步内容存在 data 的 JSON 里。
-- 标题由第 1 步内容派生；archived 是显式、可逆的归档标记，不按内容派生。
CREATE TABLE IF NOT EXISTS fears (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS fears_user_updated_idx
  ON fears (user_id, updated_at);

CREATE INDEX IF NOT EXISTS fears_user_archived_updated_idx
  ON fears (user_id, archived, updated_at);
