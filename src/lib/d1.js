// D1数据库服务类
export class D1DatabaseService {
  // 初始化D1数据库连接
  static async getDB() {
    // 在Cloudflare Workers环境中，DB会自动绑定到全局变量
    if (typeof DB !== 'undefined') {
      return DB;
    }
    
    // 在本地开发环境中，使用模拟的DB
    if (import.meta.env.DEV) {
      return this.getMockDB();
    }
    
    throw new Error('D1数据库未正确绑定');
  }

  // 本地开发环境的模拟数据库
  static getMockDB() {
    return {
      prepare: (query) => ({
        bind: (...params) => ({
          all: async () => {
            console.log('Mock D1 Query:', query, params);
            return { results: [] };
          },
          first: async () => {
            console.log('Mock D1 Query (first):', query, params);
            return null;
          },
          run: async () => {
            console.log('Mock D1 Query (run):', query, params);
            return { success: true };
          }
        })
      }),
      batch: async (statements) => {
        console.log('Mock D1 Batch:', statements);
        return statements.map(() => ({ success: true }));
      }
    };
  }

  // 同步用户数据到D1
  static async syncUserData(userId) {
    try {
      const db = await this.getDB();
      
      // 获取本地数据
      const localData = {
        memos: JSON.parse(localStorage.getItem('memos') || '[]'),
        pinnedMemos: JSON.parse(localStorage.getItem('pinnedMemos') || '[]'),
        themeColor: localStorage.getItem('themeColor') || '#818CF8',
        darkMode: localStorage.getItem('darkMode') || 'false',
        hitokotoConfig: JSON.parse(localStorage.getItem('hitokotoConfig') || '{"enabled":true,"types":["a","b","c","d","i","j","k"]}'),
        fontConfig: JSON.parse(localStorage.getItem('fontConfig') || '{"selectedFont":"default"}'),
        backgroundConfig: JSON.parse(localStorage.getItem('backgroundConfig') || '{"imageUrl":"","brightness":50,"blur":10}')
      };

      // 同步memos
      for (const memo of localData.memos) {
        await this.upsertMemo(userId, memo);
      }

      // 同步用户设置
      await this.upsertUserSettings(userId, {
        pinnedMemos: localData.pinnedMemos,
        themeColor: localData.themeColor,
        darkMode: localData.darkMode,
        hitokotoConfig: localData.hitokotoConfig,
        fontConfig: localData.fontConfig,
        backgroundConfig: localData.backgroundConfig
      });

      return { success: true, message: '数据同步到D1成功' };
    } catch (error) {
      console.error('D1数据同步失败:', error);
      return { success: false, message: error.message };
    }
  }

  // 从D1恢复用户数据
  static async restoreUserData(userId) {
    try {
      const db = await this.getDB();

      // 获取用户的memos
      const { results: memos } = await db
        .prepare('SELECT * FROM memos WHERE user_id = ? ORDER BY created_at DESC')
        .bind(userId)
        .all();

      // 获取用户设置
      const settings = await db
        .prepare('SELECT * FROM user_settings WHERE user_id = ?')
        .bind(userId)
        .first();

      // 恢复到本地存储
      if (memos && memos.length > 0) {
        const localMemos = memos.map(memo => ({
          id: memo.memo_id,
          content: memo.content,
          tags: JSON.parse(memo.tags || '[]'),
          timestamp: memo.created_at,
          lastModified: memo.updated_at,
          createdAt: memo.created_at,
          updatedAt: memo.updated_at
        }));
        localStorage.setItem('memos', JSON.stringify(localMemos));
      }

      if (settings) {
        if (settings.pinned_memos) {
          localStorage.setItem('pinnedMemos', settings.pinned_memos);
        }
        if (settings.theme_color) {
          localStorage.setItem('themeColor', settings.theme_color);
        }
        if (settings.dark_mode !== null) {
          localStorage.setItem('darkMode', settings.dark_mode.toString());
        }
        if (settings.hitokoto_config) {
          localStorage.setItem('hitokotoConfig', settings.hitokoto_config);
        }
        if (settings.font_config) {
          localStorage.setItem('fontConfig', settings.font_config);
        }
        if (settings.background_config) {
          localStorage.setItem('backgroundConfig', settings.background_config);
        }
      }

      return { success: true, message: '从D1恢复数据成功，请刷新页面查看' };
    } catch (error) {
      console.error('从D1恢复数据失败:', error);
      return { success: false, message: error.message };
    }
  }

  // 插入或更新memo
  static async upsertMemo(userId, memo) {
    const db = await this.getDB();
    
    // 确保时间戳不为空，使用当前时间作为备用
    const now = new Date().toISOString();
    const createdAt = memo.timestamp || now;
    const updatedAt = memo.lastModified || memo.timestamp || now;

    // 检查memo是否已存在
    const existingMemo = await db
      .prepare('SELECT * FROM memos WHERE memo_id = ? AND user_id = ?')
      .bind(memo.id, userId)
      .first();

    if (existingMemo) {
      // 更新现有memo
      await db
        .prepare('UPDATE memos SET content = ?, tags = ?, updated_at = ? WHERE memo_id = ? AND user_id = ?')
        .bind(memo.content, JSON.stringify(memo.tags || []), updatedAt, memo.id, userId)
        .run();
    } else {
      // 插入新memo
      await db
        .prepare('INSERT INTO memos (memo_id, user_id, content, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(memo.id, userId, memo.content, JSON.stringify(memo.tags || []), createdAt, updatedAt)
        .run();
    }
  }

  // 插入或更新用户设置
  static async upsertUserSettings(userId, settings) {
    const db = await this.getDB();
    
    // 检查用户设置是否已存在
    const existingSettings = await db
      .prepare('SELECT * FROM user_settings WHERE user_id = ?')
      .bind(userId)
      .first();

    if (existingSettings) {
      // 更新现有设置
      await db
        .prepare('UPDATE user_settings SET pinned_memos = ?, theme_color = ?, dark_mode = ?, hitokoto_config = ?, font_config = ?, background_config = ?, updated_at = ? WHERE user_id = ?')
        .bind(
          JSON.stringify(settings.pinnedMemos),
          settings.themeColor,
          settings.darkMode === 'true',
          JSON.stringify(settings.hitokotoConfig),
          JSON.stringify(settings.fontConfig),
          JSON.stringify(settings.backgroundConfig),
          new Date().toISOString(),
          userId
        )
        .run();
    } else {
      // 插入新设置
      await db
        .prepare('INSERT INTO user_settings (user_id, pinned_memos, theme_color, dark_mode, hitokoto_config, font_config, background_config, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(
          userId,
          JSON.stringify(settings.pinnedMemos),
          settings.themeColor,
          settings.darkMode === 'true',
          JSON.stringify(settings.hitokotoConfig),
          JSON.stringify(settings.fontConfig),
          JSON.stringify(settings.backgroundConfig),
          new Date().toISOString(),
          new Date().toISOString()
        )
        .run();
    }
  }

  // 删除memo
  static async deleteMemo(userId, memoId) {
    const db = await this.getDB();
    
    await db
      .prepare('DELETE FROM memos WHERE user_id = ? AND memo_id = ?')
      .bind(userId, memoId)
      .run();
  }

  // 获取用户的所有memos
  static async getUserMemos(userId) {
    const db = await this.getDB();
    
    const { results } = await db
      .prepare('SELECT * FROM memos WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all();
    
    return results;
  }

  // 获取用户设置
  static async getUserSettings(userId) {
    const db = await this.getDB();
    
    const settings = await db
      .prepare('SELECT * FROM user_settings WHERE user_id = ?')
      .bind(userId)
      .first();
    
    return settings;
  }

  // 初始化数据库表
  static async initDatabase() {
    try {
      const db = await this.getDB();
      
      // 创建memos表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS memos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          memo_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          tags TEXT DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(memo_id, user_id)
        )
      `).run();

      // 创建user_settings表
      await db.prepare(`
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
        )
      `).run();

      // 创建索引
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_memos_user_id ON memos(user_id)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at)').run();
      await db.prepare('CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)').run();

      return { success: true, message: 'D1数据库初始化成功' };
    } catch (error) {
      console.error('D1数据库初始化失败:', error);
      return { success: false, message: error.message };
    }
  }
}