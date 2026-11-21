PRAGMA foreign_keys = ON;

-- 罗盘条目优先级：p0 最高，p3 最低；已有条目默认 p2。
ALTER TABLE telos_items ADD COLUMN priority TEXT NOT NULL DEFAULT 'p2';
