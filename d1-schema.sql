-- D1数据库初始化脚本
-- 这个脚本用于创建与Supabase相同结构的表，但适配D1数据库的语法

-- 创建memos表
CREATE TABLE IF NOT EXISTS memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memo_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(memo_id, user_id)
);

-- 创建user_settings表
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  pinned_memos TEXT DEFAULT '[]',
  theme_color TEXT DEFAULT '#818CF8',
  dark_mode INTEGER DEFAULT 0,
  hitokoto_config TEXT DEFAULT '{"enabled":true,"types":["a","b","c","d","i","j","k"]}',
  font_config TEXT DEFAULT '{"selectedFont":"default"}',
  background_config TEXT DEFAULT '{"imageUrl":"","brightness":50,"blur":10}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id);
CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- 插入默认用户设置的示例（可选）
-- INSERT OR IGNORE INTO user_settings (user_id, pinned_memos, theme_color, dark_mode, hitokoto_config, font_config, background_config, created_at, updated_at)
-- VALUES ('default-user-id', '[]', '#818CF8', 0, '{"enabled":true,"types":["a","b","c","d","i","j","k"]}', '{"selectedFont":"default"}', '{"imageUrl":"","brightness":50,"blur":10}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);