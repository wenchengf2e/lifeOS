PRAGMA foreign_keys = ON;

-- 能量充电屋：每次练习是一条独立记录，四类工具共表。
-- 问题与回答存在 data 的 JSON 里（{ version, answers: { [questionKey]: string } }），
-- 题目模板由前端 src/content/energy.ts 驱动，改配置不需要改表结构。
CREATE TABLE IF NOT EXISTS energy_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS energy_sessions_user_updated_idx
  ON energy_sessions (user_id, updated_at);

CREATE INDEX IF NOT EXISTS energy_sessions_user_tool_updated_idx
  ON energy_sessions (user_id, tool, updated_at);
