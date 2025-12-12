import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

class SQLiteDatabase {
  constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'meownocode.db');
    
    // 确保数据目录存在
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // 性能优化
    this.createTables();
    
    console.log('✅ SQLite 数据库已连接:', dbPath);
  }
  
  createTables() {
    const createMemosTable = `
      CREATE TABLE IF NOT EXISTS memos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '',
        visibility TEXT DEFAULT 'private',
        pinned BOOLEAN DEFAULT 0,
        archived BOOLEAN DEFAULT 0,
        created_ts TEXT NOT NULL,
        updated_ts TEXT NOT NULL
      )
    `;
    
    const createResourcesTable = `
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memo_id INTEGER,
        filename TEXT NOT NULL,
        type TEXT,
        size INTEGER,
        blob BLOB,
        created_ts TEXT NOT NULL,
        FOREIGN KEY (memo_id) REFERENCES memos (id) ON DELETE CASCADE
      )
    `;
    
    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_ts TEXT NOT NULL
      )
    `;
    
    // 创建索引以提高查询性能
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_memos_created_ts ON memos(created_ts);
      CREATE INDEX IF NOT EXISTS idx_memos_pinned ON memos(pinned);
      CREATE INDEX IF NOT EXISTS idx_memos_archived ON memos(archived);
      CREATE INDEX IF NOT EXISTS idx_resources_memo_id ON resources(memo_id);
    `;
    
    this.db.exec(createMemosTable);
    this.db.exec(createResourcesTable);
    this.db.exec(createSettingsTable);
    this.db.exec(createIndexes);
    
    console.log('📊 数据库表已创建/验证');
  }
  
  // 清理所有数据
  clearAllMemos() {
    const startTime = Date.now();
    
    this.db.exec('DELETE FROM resources');
    this.db.exec('DELETE FROM memos');
    this.db.exec('DELETE FROM sqlite_sequence WHERE name="memos" OR name="resources"');
    
    const execTime = Date.now() - startTime;
    console.log(`🧹 所有数据已清理 (${execTime}ms)`);
  }
  
  // Memos 操作
  getAllMemos(includeArchived = false) {
    const startTime = Date.now();
    
    const sql = includeArchived 
      ? `SELECT * FROM memos ORDER BY pinned DESC, updated_ts DESC`
      : `SELECT * FROM memos WHERE archived = 0 ORDER BY pinned DESC, updated_ts DESC`;
    
    const memos = this.db.prepare(sql).all();
    
    const execTime = Date.now() - startTime;
    if (execTime > 10) {
      console.log(`⚡ getAllMemos 执行时间: ${execTime}ms (返回 ${memos.length} 条记录)`);
    }
    
    return memos;
  }
  
  // 分页获取 Memos
  getMemosPaginated({ limit = 50, offset = 0, includeArchived = false } = {}) {
    const startTime = Date.now();
    
    const whereClause = includeArchived ? '' : 'WHERE archived = 0';
    const orderClause = 'ORDER BY pinned DESC, updated_ts DESC';
    
    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM memos ${whereClause}`;
    const { total } = this.db.prepare(countSql).get();
    
    // 获取分页数据
    const dataSql = `SELECT * FROM memos ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
    const memos = this.db.prepare(dataSql).all(limit, offset);
    
    // 是否还有更多数据
    const hasMore = offset + limit < total;
    
    // 移除 console.log 避免控制台打开时影响性能
    // const execTime = Date.now() - startTime;
    // console.log(`⚡ getMemosPaginated 执行时间: ${execTime}ms (返回 ${memos.length}/${total} 条记录, hasMore: ${hasMore})`);
    
    return {
      memos,
      total,
      hasMore
    };
  }
  
  getArchivedMemos() {
    return this.db.prepare(`
      SELECT * FROM memos 
      WHERE archived = 1 
      ORDER BY updated_ts DESC
    `).all();
  }
  
  getMemoById(id) {
    return this.db.prepare('SELECT * FROM memos WHERE id = ?').get(id);
  }
  
  createMemo(data) {
    const { 
      content, 
      tags = '', 
      visibility = 'private', 
      pinned = false, 
      archived = false,
      created_ts,
      updated_ts,
      createdAt,
      updatedAt
    } = data;
    
    const now = new Date().toISOString();
    const createdTime = created_ts || createdAt || now;
    const updatedTime = updated_ts || updatedAt || now;
    
    const stmt = this.db.prepare(`
      INSERT INTO memos (content, tags, visibility, pinned, archived, created_ts, updated_ts)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      content, 
      tags, 
      visibility, 
      pinned ? 1 : 0, 
      archived ? 1 : 0,
      createdTime,
      updatedTime
    );
    
    return this.getMemoById(result.lastInsertRowid);
  }
  
  updateMemo(id, data) {
    console.log('🔍 DEBUG updateMemo called with:', { id, data });
    
    const currentMemo = this.getMemoById(id);
    if (!currentMemo) {
      console.log('❌ DEBUG: Memo not found with id:', id);
      return null;
    }
    
    console.log('📝 DEBUG: Current memo before update:', JSON.stringify(currentMemo, null, 2));
    
    const now = new Date().toISOString();
    
    // 构建更新字段
    const updates = [];
    const values = [];
    
    if (data.content !== undefined) {
      updates.push('content = ?');
      values.push(data.content);
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?');
      values.push(data.tags);
    }
    if (data.visibility !== undefined) {
      updates.push('visibility = ?');
      values.push(data.visibility);
    }
    if (data.pinned !== undefined) {
      updates.push('pinned = ?');
      values.push(data.pinned ? 1 : 0);
    }
    if (data.archived !== undefined) {
      updates.push('archived = ?');
      values.push(data.archived ? 1 : 0);
    }
    
    // 总是更新 updated_ts
    updates.push('updated_ts = ?');
    values.push(now);
    
    // 添加 id 到 values 数组
    values.push(id);
    
    const sql = `UPDATE memos SET ${updates.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
    
    const updatedMemo = this.getMemoById(id);
    console.log('✅ DEBUG: Updated memo after changes:', JSON.stringify(updatedMemo, null, 2));
    
    return updatedMemo;
  }
  
  deleteMemo(id) {
    const result = this.db.prepare('DELETE FROM memos WHERE id = ?').run(id);
    return result.changes > 0;
  }
  
  // Resources/Attachments 操作
  getResourcesByMemoId(memoId) {
    return this.db.prepare('SELECT * FROM resources WHERE memo_id = ?').all(memoId);
  }
  
  // 🚀 批量查询附件（性能优化 - 解决 N+1 查询问题）
  getResourcesByMemoIds(memoIds) {
    if (!memoIds || memoIds.length === 0) {
      return [];
    }
    
    // 使用 IN 查询一次性获取所有附件
    const placeholders = memoIds.map(() => '?').join(',');
    const sql = `SELECT * FROM resources WHERE memo_id IN (${placeholders})`;
    
    return this.db.prepare(sql).all(...memoIds);
  }
  
  getResourceById(id) {
    return this.db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
  }
  
  createResource(data) {
    const { memo_id, filename, type, size, blob } = data;
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO resources (memo_id, filename, type, size, blob, created_ts)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(memo_id, filename, type, size, blob, now);
    return {
      id: result.lastInsertRowid,
      memo_id,
      filename,
      type,
      size,
      created_ts: now
    };
  }
  
  deleteResource(id) {
    const result = this.db.prepare('DELETE FROM resources WHERE id = ?').run(id);
    return result.changes > 0;
  }
  
  updateResourceMemoId(resourceId, memoId) {
    const result = this.db.prepare('UPDATE resources SET memo_id = ? WHERE id = ?').run(memoId, resourceId);
    return result.changes > 0;
  }
  
  // Settings 操作
  getSetting(key) {
    const result = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return result ? result.value : null;
  }
  
  setSetting(key, value) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_ts)
      VALUES (?, ?, ?)
    `).run(key, value, now);
  }
  
  close() {
    if (this.db) {
      this.db.close();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 单例模式
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new SQLiteDatabase();
  }
  return dbInstance;
}

/**
 * Get a prepared statement for the given SQL
 * @param {string} sql - SQL query string
 * @returns {Statement} - Prepared statement
 */
export function getStatement(sql) {
  const db = getDatabase();
  return db.db.prepare(sql);
}

/**
 * Create a transaction wrapper function
 * @param {Function} fn - Function to execute within transaction
 * @returns {Function} - Transaction-wrapped function
 */
export function transaction(fn) {
  const db = getDatabase();
  return db.db.transaction(fn);
}

/**
 * Get database statistics
 * @returns {Object} - Database statistics
 */
export function getDatabaseStats() {
  const db = getDatabase();
  const memoCount = db.db.prepare('SELECT COUNT(*) as count FROM memos').get();
  const resourceCount = db.db.prepare('SELECT COUNT(*) as count FROM resources').get();
  const settingsCount = db.db.prepare('SELECT COUNT(*) as count FROM settings').get();
  
  return {
    memos: memoCount?.count || 0,
    resources: resourceCount?.count || 0,
    settings: settingsCount?.count || 0,
    timestamp: new Date().toISOString()
  };
}

/**
 * Backup database to a file
 * @param {string} backupPath - Path to save the backup
 * @returns {Object} - Backup result
 */
export function backupDatabase(backupPath) {
  const db = getDatabase();
  try {
    db.db.backup(backupPath);
    return {
      success: true,
      path: backupPath,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export default getDatabase;
