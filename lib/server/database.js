import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.db = null;
    this.init();
  }
  
  init() {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'meownocode.db');
      this.db = new Database(dbPath);
      
      // 创建表
      this.createTables();
      
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }
  
  createTables() {
    const createMemosTable = `
      CREATE TABLE IF NOT EXISTS memos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        tags TEXT,
        visibility TEXT DEFAULT 'private',
        pinned BOOLEAN DEFAULT 0,
        created_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_ts DATETIME DEFAULT CURRENT_TIMESTAMP
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
        created_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (memo_id) REFERENCES memos (id) ON DELETE CASCADE
      )
    `;
    
    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_ts DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.exec(createMemosTable);
    this.db.exec(createResourcesTable);
    this.db.exec(createSettingsTable);
  }
  
  // Memos 操作
  getAllMemos() {
    return this.db.prepare(`
      SELECT * FROM memos 
      ORDER BY pinned DESC, created_ts DESC
    `).all();
  }
  
  getMemoById(id) {
    return this.db.prepare('SELECT * FROM memos WHERE id = ?').get(id);
  }
  
  createMemo(data) {
    const { content, tags = '', visibility = 'private', pinned = false } = data;
    const result = this.db.prepare(`
      INSERT INTO memos (content, tags, visibility, pinned)
      VALUES (?, ?, ?, ?)
    `).run(content, tags, visibility, pinned ? 1 : 0);
    
    return this.getMemoById(result.lastInsertRowid);
  }
  
  updateMemo(id, data) {
    const { content, tags, visibility, pinned } = data;
    this.db.prepare(`
      UPDATE memos 
      SET content = ?, tags = ?, visibility = ?, pinned = ?, updated_ts = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(content, tags, visibility, pinned ? 1 : 0, id);
    
    return this.getMemoById(id);
  }
  
  deleteMemo(id) {
    const result = this.db.prepare('DELETE FROM memos WHERE id = ?').run(id);
    return result.changes > 0;
  }
  
  // Resources 操作
  getResourcesByMemoId(memoId) {
    return this.db.prepare('SELECT * FROM resources WHERE memo_id = ?').all(memoId);
  }
  
  createResource(data) {
    const { memo_id, filename, type, size, blob } = data;
    const result = this.db.prepare(`
      INSERT INTO resources (memo_id, filename, type, size, blob)
      VALUES (?, ?, ?, ?, ?)
    `).run(memo_id, filename, type, size, blob);
    
    return result.lastInsertRowid;
  }
  
  // Settings 操作
  getSetting(key) {
    const result = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return result ? result.value : null;
  }
  
  setSetting(key, value) {
    this.db.prepare(`
      INSERT OR REPLACE INTO settings (key, value, updated_ts)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(key, value);
  }
  
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// 单例模式
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
  }
  return dbInstance;
}

export default getDatabase;
