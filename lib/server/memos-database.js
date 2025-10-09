/**
 * Memos 数据库适配器
 * 直接使用 Memos 官方的数据库结构
 */

import Database from 'better-sqlite3';
import path from 'path';

class MemosDatabase {
  constructor() {
    const dbPath = path.join(process.cwd(), 'memos_db', 'memos_dev.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    
    // 默认用户 ID（如果是单用户环境）
    this.defaultUserId = 1;
    
    console.log('✅ Memos 数据库已连接:', dbPath);
    
    // 确保默认用户存在
    this.ensureDefaultUser();
  }
  
  /**
   * 确保默认用户存在
   */
  ensureDefaultUser() {
    const user = this.db.prepare('SELECT * FROM user WHERE id = ?').get(this.defaultUserId);
    
    if (!user) {
      // 创建默认用户
      const now = Math.floor(Date.now() / 1000);
      this.db.prepare(`
        INSERT INTO user (id, username, role, email, nickname, password_hash, avatar_url, created_ts, updated_ts, row_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        this.defaultUserId,
        'meow',
        'HOST',
        'meow@meownocode.com',
        'MeowNocode User',
        '', // 密码哈希为空
        '',
        now,
        now,
        'NORMAL'
      );
      console.log('✅ 创建默认用户 (ID: 1)');
    }
  }
  
  /**
   * 获取所有备忘录（不包括归档的）
   */
  getAllMemos(includeArchived = false) {
    const query = `
      SELECT 
        m.*,
        o.pinned
      FROM memo m
      LEFT JOIN memo_organizer o ON m.id = o.memo_id AND m.creator_id = o.user_id
      WHERE m.creator_id = ? ${includeArchived ? '' : "AND m.row_status = 'NORMAL'"}
      ORDER BY 
        CASE WHEN o.pinned = 1 THEN 0 ELSE 1 END,
        m.created_ts DESC
    `;
    
    const rows = this.db.prepare(query).all(this.defaultUserId);
    
    // 转换为统一格式
    return rows.map(row => this.normalizeMemo(row));
  }
  
  /**
   * 分页获取备忘录
   */
  getMemosPaginated({ limit = 50, offset = 0, includeArchived = false } = {}) {
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM memo 
      WHERE creator_id = ? ${includeArchived ? '' : "AND row_status = 'NORMAL'"}
    `;
    
    const total = this.db.prepare(countQuery).get(this.defaultUserId).total;
    
    const query = `
      SELECT 
        m.*,
        o.pinned
      FROM memo m
      LEFT JOIN memo_organizer o ON m.id = o.memo_id AND m.creator_id = o.user_id
      WHERE m.creator_id = ? ${includeArchived ? '' : "AND m.row_status = 'NORMAL'"}
      ORDER BY 
        CASE WHEN o.pinned = 1 THEN 0 ELSE 1 END,
        m.created_ts DESC
      LIMIT ? OFFSET ?
    `;
    
    const rows = this.db.prepare(query).all(this.defaultUserId, limit, offset);
    const memos = rows.map(row => this.normalizeMemo(row));
    
    return {
      memos,
      total,
      hasMore: offset + limit < total,
    };
  }
  
  /**
   * 获取归档的备忘录
   */
  getArchivedMemos() {
    const query = `
      SELECT 
        m.*,
        o.pinned
      FROM memo m
      LEFT JOIN memo_organizer o ON m.id = o.memo_id AND m.creator_id = o.user_id
      WHERE m.creator_id = ? AND m.row_status = 'ARCHIVED'
      ORDER BY m.created_ts DESC
    `;
    
    const rows = this.db.prepare(query).all(this.defaultUserId);
    return rows.map(row => this.normalizeMemo(row));
  }
  
  /**
   * 根据 ID 获取备忘录
   */
  getMemoById(id) {
    const query = `
      SELECT 
        m.*,
        o.pinned
      FROM memo m
      LEFT JOIN memo_organizer o ON m.id = o.memo_id AND m.creator_id = o.user_id
      WHERE m.id = ? AND m.creator_id = ?
    `;
    
    const row = this.db.prepare(query).get(id, this.defaultUserId);
    return row ? this.normalizeMemo(row) : null;
  }
  
  /**
   * 创建备忘录
   */
  createMemo(data) {
    const now = Math.floor(Date.now() / 1000);
    const { content, tags = '', visibility = 'PRIVATE', pinned = false, archived = false, created_ts, updated_ts } = data;
    
    // 创建时间戳转换
    const createdTimestamp = created_ts 
      ? Math.floor(new Date(created_ts).getTime() / 1000) 
      : now;
    const updatedTimestamp = updated_ts 
      ? Math.floor(new Date(updated_ts).getTime() / 1000) 
      : now;
    
    // 1. 插入 memo
    const result = this.db.prepare(`
      INSERT INTO memo (uid, creator_id, content, visibility, created_ts, updated_ts, row_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      this.generateUid(),
      this.defaultUserId,
      content,
      visibility.toUpperCase(),
      createdTimestamp,
      updatedTimestamp,
      archived ? 'ARCHIVED' : 'NORMAL'
    );
    
    const memoId = result.lastInsertRowid;
    
    // 2. 如果置顶，插入 memo_organizer
    if (pinned) {
      this.db.prepare(`
        INSERT OR REPLACE INTO memo_organizer (memo_id, user_id, pinned)
        VALUES (?, ?, 1)
      `).run(memoId, this.defaultUserId);
    }
    
    // 3. 处理标签
    if (tags) {
      this.updateMemoTags(memoId, tags);
    }
    
    return this.getMemoById(memoId);
  }
  
  /**
   * 更新备忘录
   */
  updateMemo(id, data) {
    const now = Math.floor(Date.now() / 1000);
    const memo = this.getMemoById(id);
    
    if (!memo) {
      console.error('备忘录不存在:', id);
      return null;
    }
    
    // 构建更新字段
    const updates = [];
    const values = [];
    
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    
    if (data.visibility !== undefined) {
      updates.push('visibility = ?');
      values.push(data.visibility.toUpperCase());
    }
    
    if (data.archived !== undefined) {
      updates.push('row_status = ?');
      values.push(data.archived ? 'ARCHIVED' : 'NORMAL');
    }
    
    updates.push('updated_ts = ?');
    values.push(now);
    
    // 更新 memo 表
    if (updates.length > 0) {
      values.push(id);
      this.db.prepare(`
        UPDATE memo 
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
    }
    
    // 处理置顶状态
    if (data.pinned !== undefined) {
      if (data.pinned) {
        this.db.prepare(`
          INSERT OR REPLACE INTO memo_organizer (memo_id, user_id, pinned)
          VALUES (?, ?, 1)
        `).run(id, this.defaultUserId);
      } else {
        this.db.prepare(`
          DELETE FROM memo_organizer 
          WHERE memo_id = ? AND user_id = ?
        `).run(id, this.defaultUserId);
      }
    }
    
    // 处理标签
    if (data.tags !== undefined) {
      this.updateMemoTags(id, data.tags);
    }
    
    return this.getMemoById(id);
  }
  
  /**
   * 删除备忘录
   */
  deleteMemo(id) {
    // Memos 使用软删除
    const result = this.db.prepare(`
      UPDATE memo 
      SET row_status = 'ARCHIVED', updated_ts = ?
      WHERE id = ? AND creator_id = ?
    `).run(Math.floor(Date.now() / 1000), id, this.defaultUserId);
    
    return result.changes > 0;
  }
  
  /**
   * 永久删除备忘录
   */
  permanentlyDeleteMemo(id) {
    // 删除相关的 organizer
    this.db.prepare('DELETE FROM memo_organizer WHERE memo_id = ?').run(id);
    
    // 删除相关的标签
    this.db.prepare('DELETE FROM tag WHERE creator_id = ? AND name IN (SELECT DISTINCT tag FROM (SELECT SUBSTR(content, INSTR(content, "#") + 1) as tag FROM memo WHERE id = ?))').run(this.defaultUserId, id);
    
    // 删除 memo
    const result = this.db.prepare('DELETE FROM memo WHERE id = ? AND creator_id = ?').run(id, this.defaultUserId);
    
    return result.changes > 0;
  }
  
  /**
   * 清空所有数据
   */
  clearAllMemos() {
    this.db.prepare('DELETE FROM memo_organizer WHERE user_id = ?').run(this.defaultUserId);
    this.db.prepare('DELETE FROM tag WHERE creator_id = ?').run(this.defaultUserId);
    this.db.prepare('DELETE FROM memo WHERE creator_id = ?').run(this.defaultUserId);
    
    console.log('🧹 已清空所有备忘录数据');
  }
  
  /**
   * 更新备忘录标签
   */
  updateMemoTags(memoId, tagsString) {
    if (!tagsString) return;
    
    const tags = tagsString.split(',').map(t => t.trim()).filter(t => t);
    const now = Math.floor(Date.now() / 1000);
    
    for (const tag of tags) {
      // 检查标签是否存在
      const existingTag = this.db.prepare(
        'SELECT * FROM tag WHERE creator_id = ? AND name = ?'
      ).get(this.defaultUserId, tag);
      
      if (!existingTag) {
        this.db.prepare(`
          INSERT INTO tag (name, creator_id, created_ts)
          VALUES (?, ?, ?)
        `).run(tag, this.defaultUserId, now);
      }
    }
  }
  
  /**
   * 生成唯一 UID
   */
  generateUid() {
    return `meow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 标准化备忘录对象
   */
  normalizeMemo(row) {
    if (!row) return null;
    
    // 提取标签
    const tags = this.extractTagsFromContent(row.content);
    
    return {
      id: row.id,
      uid: row.uid,
      content: row.content,
      tags: tags.join(','),
      visibility: row.visibility.toLowerCase(),
      pinned: row.pinned === 1,
      archived: row.row_status === 'ARCHIVED',
      created_ts: new Date(row.created_ts * 1000).toISOString(),
      updated_ts: new Date(row.updated_ts * 1000).toISOString(),
      timestamp: row.created_ts * 1000,
      createdAt: new Date(row.created_ts * 1000).toISOString(),
      updatedAt: new Date(row.updated_ts * 1000).toISOString(),
    };
  }
  
  /**
   * 从内容中提取标签
   */
  extractTagsFromContent(content) {
    if (!content) return [];
    
    const tagRegex = /#([^\s#]+)/g;
    const tags = [];
    let match;
    
    while ((match = tagRegex.exec(content)) !== null) {
      const tag = match[1];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }
  
  /**
   * 获取资源
   */
  getResourcesByMemoId(memoId) {
    return this.db.prepare('SELECT * FROM resource WHERE memo_id = ?').all(memoId);
  }
  
  /**
   * 创建资源
   */
  createResource(data) {
    const { memo_id, filename, type, size, blob } = data;
    const now = Math.floor(Date.now() / 1000);
    
    const result = this.db.prepare(`
      INSERT INTO resource (uid, creator_id, filename, type, size, internal_path, external_link, created_ts, memo_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      this.generateUid(),
      this.defaultUserId,
      filename,
      type,
      size,
      blob || '', // 内部路径
      '', // 外部链接
      now,
      memo_id
    );
    
    return result.lastInsertRowid;
  }
  
  /**
   * 获取设置
   */
  getSetting(key) {
    const row = this.db.prepare(
      'SELECT value FROM user_setting WHERE user_id = ? AND key = ?'
    ).get(this.defaultUserId, key);
    
    return row ? row.value : null;
  }
  
  /**
   * 设置
   */
  setSetting(key, value) {
    const existingSetting = this.getSetting(key);
    
    if (existingSetting) {
      this.db.prepare(`
        UPDATE user_setting 
        SET value = ?
        WHERE user_id = ? AND key = ?
      `).run(value, this.defaultUserId, key);
    } else {
      this.db.prepare(`
        INSERT INTO user_setting (user_id, key, value)
        VALUES (?, ?, ?)
      `).run(this.defaultUserId, key, value);
    }
  }
}

// 单例模式
let dbInstance = null;

export function getMemosDatabase() {
  if (!dbInstance) {
    dbInstance = new MemosDatabase();
    console.log('✅ Memos 数据库实例已创建');
  }
  return dbInstance;
}

export default getMemosDatabase;

