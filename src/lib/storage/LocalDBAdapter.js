/**
 * 本地 DB 文件适配器
 * 直接读写本地 SQLite 数据库文件，类似 memos 的 SQLite 驱动
 */

import { StorageAdapter } from './StorageAdapter.js';
import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export class LocalDBAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);
    this.db = null;
    this.SQL = null;
    this.dbFile = null;
    this.dbPath = config.dbPath || 'meownocode.db';
    this.autoSave = config.autoSave !== false; // 默认开启自动保存
    this.saveInterval = config.saveInterval || 30000; // 30秒自动保存一次
    this.saveTimer = null;
  }

  // === 基础方法 ===

  async initialize() {
    if (this.initialized) return true;

    try {
      // 初始化 SQL.js
      this.SQL = await initSqlJs({ locateFile: () => sqlWasmUrl });
      
      // 尝试加载现有数据库文件
      await this.loadDatabase();
      
      // 确保数据库结构
      await this.ensureSchema();
      
      this.initialized = true;
      
      // 开启自动保存
      if (this.autoSave) {
        this.startAutoSave();
      }
      
      console.log('✅ 本地数据库适配器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 本地数据库适配器初始化失败:', error);
      throw error;
    }
  }

  async loadDatabase() {
    try {
      // 从 localStorage 或 IndexedDB 加载数据库文件
      const savedDB = localStorage.getItem(`localdb_${this.dbPath}`);
      
      if (savedDB) {
        // 从 base64 恢复数据库
        const binaryString = atob(savedDB);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        this.db = new this.SQL.Database(bytes);
        console.log('📂 从本地存储加载数据库文件');
      } else {
        // 创建新数据库
        this.db = new this.SQL.Database();
        console.log('🆕 创建新的数据库文件');
      }
    } catch (error) {
      console.error('加载数据库失败:', error);
      // 创建新数据库作为后备
      this.db = new this.SQL.Database();
    }
  }

  async saveDatabase() {
    if (!this.db) return;

    try {
      // 将数据库保存为二进制数据
      const data = this.db.export();
      const base64 = btoa(String.fromCharCode(...data));
      
      // 保存到 localStorage
      localStorage.setItem(`localdb_${this.dbPath}`, base64);
      
      console.log('💾 数据库已保存');
    } catch (error) {
      console.error('保存数据库失败:', error);
    }
  }

  async ensureSchema() {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // 创建备忘录表
      this.db.run(`
        CREATE TABLE IF NOT EXISTS memos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT UNIQUE NOT NULL,
          content TEXT NOT NULL,
          tags TEXT DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          pinned INTEGER DEFAULT 0
        )
      `);

      // 创建附件表
      this.db.run(`
        CREATE TABLE IF NOT EXISTS attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uid TEXT UNIQUE NOT NULL,
          memo_id INTEGER,
          filename TEXT NOT NULL,
          type TEXT NOT NULL,
          size INTEGER NOT NULL,
          blob_data BLOB,
          created_at TEXT NOT NULL,
          FOREIGN KEY (memo_id) REFERENCES memos (id)
        )
      `);

      // 创建索引
      this.db.run('CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos (created_at DESC)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_memos_pinned ON memos (pinned)');
      this.db.run('CREATE INDEX IF NOT EXISTS idx_attachments_memo_id ON attachments (memo_id)');

      console.log('📋 数据库结构已确保');
    } catch (error) {
      console.error('创建数据库结构失败:', error);
      throw error;
    }
  }

  startAutoSave() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    
    this.saveTimer = setInterval(() => {
      this.saveDatabase();
    }, this.saveInterval);
  }

  async close() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    
    if (this.db) {
      await this.saveDatabase(); // 最后保存一次
      this.db.close();
      this.db = null;
    }
    
    await super.close();
  }

  async healthCheck() {
    if (!this.initialized || !this.db) return false;
    
    try {
      // 简单的查询测试
      this.db.prepare('SELECT 1').step();
      return true;
    } catch (error) {
      return false;
    }
  }

  // === 备忘录相关方法 ===

  async createMemo(memoData) {
    if (!this.initialized) await this.initialize();
    
    const validation = this.validateMemoData(memoData);
    if (!validation.isValid) {
      throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
    }
    
    const normalizedData = this.normalizeMemoData(memoData);
    
    try {
      const stmt = this.db.prepare(`
        INSERT INTO memos (uid, content, tags, created_at, updated_at, pinned)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        normalizedData.id,
        normalizedData.content,
        JSON.stringify(normalizedData.tags),
        normalizedData.createdAt,
        normalizedData.updatedAt,
        normalizedData.pinned ? 1 : 0
      ]);
      
      stmt.free();
      
      if (this.autoSave) {
        await this.saveDatabase();
      }
      
      return normalizedData;
    } catch (error) {
      console.error('创建备忘录失败:', error);
      throw error;
    }
  }

  async getMemos(options = {}) {
    if (!this.initialized) await this.initialize();
    
    const { pinned, limit, offset = 0 } = options;
    
    try {
      let query = `
        SELECT m.*, 
               GROUP_CONCAT(a.uid) as attachment_uids,
               GROUP_CONCAT(a.filename) as attachment_filenames,
               GROUP_CONCAT(a.type) as attachment_types
        FROM memos m
        LEFT JOIN attachments a ON m.id = a.memo_id
      `;
      
      const conditions = [];
      const params = [];
      
      if (pinned !== undefined) {
        conditions.push('m.pinned = ?');
        params.push(pinned ? 1 : 0);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' GROUP BY m.id ORDER BY m.updated_at DESC';
      
      if (limit) {
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }
      
      const stmt = this.db.prepare(query);
      const results = [];
      
      stmt.bind(params);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        
        const memo = {
          id: row.uid,
          content: row.content,
          tags: JSON.parse(row.tags || '[]'),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          timestamp: row.created_at,
          lastModified: row.updated_at,
          pinned: Boolean(row.pinned),
          attachments: this.parseAttachments(row)
        };
        
        results.push(memo);
      }
      
      stmt.free();
      return results;
    } catch (error) {
      console.error('获取备忘录失败:', error);
      throw error;
    }
  }

  async updateMemo(id, updateData) {
    if (!this.initialized) await this.initialize();
    
    try {
      const now = new Date().toISOString();
      const setParts = [];
      const params = [];
      
      if (updateData.content !== undefined) {
        setParts.push('content = ?');
        params.push(updateData.content);
      }
      
      if (updateData.tags !== undefined) {
        setParts.push('tags = ?');
        params.push(JSON.stringify(updateData.tags));
      }
      
      if (updateData.pinned !== undefined) {
        setParts.push('pinned = ?');
        params.push(updateData.pinned ? 1 : 0);
      }
      
      setParts.push('updated_at = ?');
      params.push(now);
      params.push(id); // WHERE 条件的参数
      
      const stmt = this.db.prepare(`
        UPDATE memos 
        SET ${setParts.join(', ')}
        WHERE uid = ?
      `);
      
      stmt.run(params);
      stmt.free();
      
      if (this.autoSave) {
        await this.saveDatabase();
      }
      
      return { message: '更新成功', updatedAt: now };
    } catch (error) {
      console.error('更新备忘录失败:', error);
      throw error;
    }
  }

  async deleteMemo(id) {
    if (!this.initialized) await this.initialize();
    
    try {
      // 删除相关附件
      const deleteAttachmentsStmt = this.db.prepare(`
        DELETE FROM attachments WHERE memo_id = (
          SELECT id FROM memos WHERE uid = ?
        )
      `);
      deleteAttachmentsStmt.run([id]);
      deleteAttachmentsStmt.free();
      
      // 删除备忘录
      const deleteMemoStmt = this.db.prepare('DELETE FROM memos WHERE uid = ?');
      deleteMemoStmt.run([id]);
      deleteMemoStmt.free();
      
      if (this.autoSave) {
        await this.saveDatabase();
      }
      
      return { message: '删除成功' };
    } catch (error) {
      console.error('删除备忘录失败:', error);
      throw error;
    }
  }

  // === 附件相关方法 ===

  async uploadAttachment(file, options = {}) {
    if (!this.initialized) await this.initialize();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const attachmentId = this.generateId();
      
      const stmt = this.db.prepare(`
        INSERT INTO attachments (uid, filename, type, size, blob_data, created_at, memo_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        attachmentId,
        file.name,
        file.type,
        file.size,
        uint8Array,
        new Date().toISOString(),
        options.memoId || null
      ]);
      
      stmt.free();
      
      if (this.autoSave) {
        await this.saveDatabase();
      }
      
      return {
        id: attachmentId,
        filename: file.name,
        type: file.type,
        size: file.size,
        url: this.getAttachmentURL(attachmentId)
      };
    } catch (error) {
      console.error('上传附件失败:', error);
      throw error;
    }
  }

  getAttachmentURL(attachmentId) {
    return `localdb://attachment/${attachmentId}`;
  }

  async getAttachmentBlob(attachmentId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const stmt = this.db.prepare(`
        SELECT blob_data, type, filename
        FROM attachments 
        WHERE uid = ?
      `);
      
      stmt.bind([attachmentId]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        
        return {
          data: new Blob([row.blob_data], { type: row.type }),
          type: row.type,
          filename: row.filename
        };
      }
      
      stmt.free();
      return null;
    } catch (error) {
      console.error('获取附件失败:', error);
      return null;
    }
  }

  // === 工具方法 ===

  parseAttachments(row) {
    if (!row.attachment_uids) return [];
    
    const uids = row.attachment_uids.split(',');
    const filenames = (row.attachment_filenames || '').split(',');
    const types = (row.attachment_types || '').split(',');
    
    return uids.map((uid, index) => ({
      id: uid,
      filename: filenames[index] || '',
      type: types[index] || '',
      url: this.getAttachmentURL(uid)
    }));
  }

  // === 数据库文件操作 ===

  /**
   * 导入外部数据库文件
   */
  async importDatabaseFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // 创建临时数据库来验证文件
      const tempDb = new this.SQL.Database(uint8Array);
      
      // 验证数据库结构
      const tables = tempDb.exec("SELECT name FROM sqlite_master WHERE type='table'");
      tempDb.close();
      
      // 如果验证通过，替换当前数据库
      if (this.db) {
        this.db.close();
      }
      
      this.db = new this.SQL.Database(uint8Array);
      await this.ensureSchema(); // 确保有必要的表结构
      await this.saveDatabase();
      
      console.log('✅ 数据库文件导入成功');
      return { success: true, message: '数据库文件导入成功' };
    } catch (error) {
      console.error('导入数据库文件失败:', error);
      throw error;
    }
  }

  /**
   * 导出数据库文件
   */
  async exportDatabaseFile() {
    if (!this.db) throw new Error('数据库未初始化');
    
    try {
      const data = this.db.export();
      const blob = new Blob([data], { type: 'application/x-sqlite3' });
      
      return {
        blob,
        filename: `${this.dbPath.replace('.db', '')}_${new Date().toISOString().slice(0, 10)}.db`,
        size: data.length
      };
    } catch (error) {
      console.error('导出数据库文件失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库信息
   */
  async getDatabaseInfo() {
    if (!this.db) return null;
    
    try {
      const info = {
        path: this.dbPath,
        size: this.db.export().length,
        autoSave: this.autoSave,
        saveInterval: this.saveInterval,
        tables: []
      };
      
      // 获取表信息
      const tablesResult = this.db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      if (tablesResult.length > 0) {
        info.tables = tablesResult[0].values.map(row => row[0]);
      }
      
      // 获取记录统计
      for (const table of info.tables) {
        try {
          const countResult = this.db.exec(`SELECT COUNT(*) FROM ${table}`);
          if (countResult.length > 0) {
            info[`${table}_count`] = countResult[0].values[0][0];
          }
        } catch (e) {
          // 忽略统计错误
        }
      }
      
      return info;
    } catch (error) {
      console.error('获取数据库信息失败:', error);
      return null;
    }
  }
}