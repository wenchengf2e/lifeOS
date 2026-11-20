PRAGMA foreign_keys = ON;

-- AI 教练画像：每用户一条当前 active 画像，沿用 telos_profiles 的部分唯一索引模式。
-- 作息、能量窗口、沟通偏好、执行线索与长期洞察全部存在 data 的 JSON 里，
-- 字段增删不需要改表结构。
CREATE TABLE IF NOT EXISTS coach_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 只允许一条 active 画像，避免出现多条“当前画像”。
CREATE UNIQUE INDEX IF NOT EXISTS coach_profiles_user_active_idx
  ON coach_profiles (user_id) WHERE is_active = 1;

-- 教练会话：一轮话题单元。前端默认只展示当前 active 会话，
-- 结案后归档为历史话题胶囊。
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'reactive',
  skill TEXT,
  stage TEXT NOT NULL DEFAULT 'listen',
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  trigger_ref_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_status_updated_idx
  ON chat_sessions (user_id, status, updated_at DESC);

-- 教练消息：append-only 流水，seq 在会话内唯一递增。
-- 只有 proposals_json / refs_json 会在用户确认提案时更新。
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id),
  seq INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  skill TEXT,
  stage TEXT,
  quick_replies_json TEXT NOT NULL DEFAULT '[]',
  proposals_json TEXT NOT NULL DEFAULT '[]',
  refs_json TEXT NOT NULL DEFAULT '[]',
  context_snapshot_json TEXT NOT NULL DEFAULT '{}',
  model TEXT,
  token_usage INTEGER,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_session_seq_uq
  ON chat_messages (session_id, seq);

CREATE INDEX IF NOT EXISTS chat_messages_user_session_seq_idx
  ON chat_messages (user_id, session_id, seq);
