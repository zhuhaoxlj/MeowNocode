/**
 * Memos 数据库适配器
 * 直接使用 Memos 官方的数据库结构
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

class MemosDatabase {
  constructor() {
    try {
      // 支持通过环境变量配置数据库路径
      const dbPath = process.env.MEMOS_DB_PATH || path.join(process.cwd(), 'memos_db', 'memos_dev.db');
      
      console.log('🔍 尝试连接数据库:', dbPath);
      
      // 检查数据库目录是否存在
      const dbDir = path.dirname(dbPath);
      
      if (!fs.existsSync(dbDir)) {
        console.error(`❌ 数据库目录不存在: ${dbDir}`);
        throw new Error(`数据库目录不存在: ${dbDir}。请创建目录或设置 MEMOS_DB_PATH 环境变量。`);
      }
      
      // 尝试连接数据库
      this.db = new Database(dbPath);
      this.db.pragma('journal_mode = WAL');
      
      // 🚀 性能优化：启用更多优化选项
      this.db.pragma('synchronous = NORMAL'); // 平衡安全性和性能
      this.db.pragma('cache_size = -64000'); // 64MB 缓存
      this.db.pragma('temp_store = MEMORY'); // 临时表存储在内存中
      this.db.pragma('mmap_size = 30000000000'); // 使用内存映射 I/O
      
      // 默认用户 ID（如果是单用户环境）
      this.defaultUserId = 1;
      
      console.log('✅ Memos 数据库已连接:', dbPath);
      
      // 确保默认用户存在
      this.ensureDefaultUser();
      
      // 🚀 性能优化：添加必要的索引
      this.ensureIndexes();
      
      // 🚀 性能优化：预编译常用查询语句
      this.prepareStatements();
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw new Error(`数据库初始化失败: ${error.message}`);
    }
  }
  
  /**
   * 🚀 预编译常用查询语句（性能优化）
   */
  prepareStatements() {
    // 预编译查询语句，避免每次都解析 SQL
    this.stmts = {
      // Memo 查询
      getMemoById: this.db.prepare(`
        SELECT m.*, o.pinned
        FROM memo m
        LEFT JOIN memo_organizer o ON m.id = o.memo_id AND m.creator_id = o.user_id
        WHERE m.id = ? AND m.creator_id = ?
      `),
      
      countMemos: this.db.prepare(`
        SELECT COUNT(*) as total 
        FROM memo 
        WHERE creator_id = ? AND row_status = 'NORMAL'
      `),
      
      countMemosIncludeArchived: this.db.prepare(`
        SELECT COUNT(*) as total 
        FROM memo 
        WHERE creator_id = ?
      `),
      
      // 资源查询
      getResourceById: this.db.prepare('SELECT * FROM resource WHERE id = ?'),
      getResourceByUid: this.db.prepare('SELECT * FROM resource WHERE uid = ?'),
      getResourcesByMemoId: this.db.prepare('SELECT * FROM resource WHERE memo_id = ?'),
      
      // Memo 更新
      updateMemoContent: this.db.prepare('UPDATE memo SET content = ?, updated_ts = ? WHERE id = ?'),
      updateMemoVisibility: this.db.prepare('UPDATE memo SET visibility = ?, updated_ts = ? WHERE id = ?'),
      updateMemoRowStatus: this.db.prepare('UPDATE memo SET row_status = ?, updated_ts = ? WHERE id = ?'),
      
      // Organizer 操作
      setPinned: this.db.prepare('INSERT OR REPLACE INTO memo_organizer (memo_id, user_id, pinned) VALUES (?, ?, 1)'),
      unsetPinned: this.db.prepare('DELETE FROM memo_organizer WHERE memo_id = ? AND user_id = ?'),
      
      // 软删除
      softDeleteMemo: this.db.prepare(`UPDATE memo SET row_status = 'ARCHIVED', updated_ts = ? WHERE id = ? AND creator_id = ?`),
    };
    
    console.log('✅ 预编译查询语句已准备');
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
   * 🚀 确保必要的索引存在（性能优化）
   */
  ensureIndexes() {
    try {
      // 检查并创建索引，使用 IF NOT EXISTS 避免重复创建
      
      // 1. memo 表的 creator_id 和 row_status 组合索引（用于分页查询）
      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_memo_creator_status 
        ON memo(creator_id, row_status, created_ts DESC)
      `).run();
      
      // 2. memo 表的 created_ts 索引（用于排序）
      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_memo_created_ts 
        ON memo(created_ts DESC)
      `).run();
      
      // 3. memo_organizer 表的 memo_id 和 user_id 组合索引（用于 JOIN）
      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_memo_organizer_memo_user 
        ON memo_organizer(memo_id, user_id)
      `).run();
      
      // 4. resource 表的 memo_id 索引（用于获取资源）
      this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_resource_memo_id 
        ON resource(memo_id)
      `).run();
      
      console.log('✅ 数据库索引已优化');
    } catch (error) {
      // 索引可能已经存在，忽略错误
      console.log('ℹ️ 索引已存在或创建失败:', error.message);
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
   * 🚀 分页获取备忘录（性能优化版本 - 不加载资源，避免耗时的 base64 转换）
   */
  getMemosPaginated({ limit = 50, offset = 0, includeArchived = false } = {}) {
    // 🚀 使用预编译语句
    const total = includeArchived 
      ? this.stmts.countMemosIncludeArchived.get(this.defaultUserId).total
      : this.stmts.countMemos.get(this.defaultUserId).total;
    
    // 获取 memos（不含资源，性能提升关键）
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
    
    if (rows.length === 0) {
      return { memos: [], total, hasMore: false };
    }
    
    // 🚀 性能优化：列表查询不加载资源（避免 base64 转换）
    // 资源将通过单独的 API 按需加载
    const memoIds = rows.map(r => r.id);
    const placeholders = memoIds.map(() => '?').join(',');
    
    // 只获取资源元数据（不含 blob），用于前端显示占位符
    const resourceMetaQuery = `
      SELECT id, memo_id, filename, type, size, uid
      FROM resource 
      WHERE memo_id IN (${placeholders})
      ORDER BY memo_id, id
    `;
    const allResourceMeta = this.db.prepare(resourceMetaQuery).all(...memoIds);
    
    // 将资源元数据按 memo_id 分组
    const resourceMetaByMemoId = {};
    allResourceMeta.forEach(res => {
      if (!resourceMetaByMemoId[res.memo_id]) {
        resourceMetaByMemoId[res.memo_id] = [];
      }
      resourceMetaByMemoId[res.memo_id].push(res);
    });
    
    // 组装 memos（不含 blob 数据）
    const memos = rows.map(row => {
      const resourceMeta = resourceMetaByMemoId[row.id] || [];
      return this.normalizeMemoLight(row, resourceMeta);
    });
    
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
    // 🚀 使用预编译语句
    const row = this.stmts.getMemoById.get(id, this.defaultUserId);
    return row ? this.normalizeMemo(row) : null;
  }
  
  /**
   * 创建备忘录
   */
  createMemo(data) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const { content, tags = '', visibility = 'PRIVATE', pinned = false, archived = false, created_ts, updated_ts } = data;
      
      // 创建时间戳转换
      const createdTimestamp = created_ts 
        ? Math.floor(new Date(created_ts).getTime() / 1000) 
        : now;
      const updatedTimestamp = updated_ts 
        ? Math.floor(new Date(updated_ts).getTime() / 1000) 
        : now;
      
      // 生成 UID
      const uid = this.generateUid();
      
      // 1. 插入 memo
      const result = this.db.prepare(`
        INSERT INTO memo (uid, creator_id, content, visibility, created_ts, updated_ts, row_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uid,
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
      
      // 4. 直接返回创建的 memo 数据，避免再次查询
      const extractedTags = this.extractTagsFromContent(content);
      
      return {
        id: Number(memoId),
        uid: uid,
        content: content,
        tags: extractedTags.join(','),
        visibility: visibility.toLowerCase(),
        pinned: pinned,
        archived: archived,
        created_ts: new Date(createdTimestamp * 1000).toISOString(),
        updated_ts: new Date(updatedTimestamp * 1000).toISOString(),
        timestamp: createdTimestamp * 1000,
        createdAt: new Date(createdTimestamp * 1000).toISOString(),
        updatedAt: new Date(updatedTimestamp * 1000).toISOString(),
      };
    } catch (error) {
      console.error('❌ createMemo 执行失败:', error);
      console.error('   错误详情:', {
        message: error.message,
        stack: error.stack,
        data: data
      });
      throw error;
    }
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
    
    // 🚀 处理置顶状态（使用预编译语句）
    if (data.pinned !== undefined) {
      if (data.pinned) {
        this.stmts.setPinned.run(id, this.defaultUserId);
      } else {
        this.stmts.unsetPinned.run(id, this.defaultUserId);
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
    // 🚀 使用预编译语句（Memos 使用软删除）
    const result = this.stmts.softDeleteMemo.run(
      Math.floor(Date.now() / 1000), 
      id, 
      this.defaultUserId
    );
    
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
   * @param {Object} row - 数据库行
   * @param {boolean} includeResources - 是否包含资源（默认 true，列表页传 false 提升性能）
   */
  normalizeMemo(row, includeResources = true) {
    if (!row) return null;
    
    // 提取标签
    const tags = this.extractTagsFromContent(row.content);
    
    let content = row.content;
    let resources = null;
    
    // 🚀 性能优化：只在需要时加载资源（详情页），避免 N+1 查询
    if (includeResources) {
      // 获取关联的资源（图片等）
      resources = this.getResourcesByMemoId(row.id);
      
      // 处理内容：如果有资源但内容中没有图片引用，则添加图片引用
      if (resources && resources.length > 0) {
        // 检查内容中是否已经有图片引用
        const hasImageReference = /!\[.*?\]\(.*?\)/.test(content);
        
        if (!hasImageReference) {
          // 在内容末尾添加图片引用
          const imageReferences = resources
            .filter(r => r.type && r.type.startsWith('image/'))
            .map((r, index) => {
              if (r.blob) {
                // 将 blob 转换为 base64 data URI
                const base64 = Buffer.from(r.blob).toString('base64');
                const dataUri = `data:${r.type};base64,${base64}`;
                // 使用资源ID或索引创建唯一的文件名
                const uniqueFilename = r.uid || r.id ? `${r.filename.replace(/\.[^.]+$/, '')}_${r.uid || r.id}${r.filename.match(/\.[^.]+$/)?.[0] || ''}` : `${r.filename.replace(/\.[^.]+$/, '')}_${index}${r.filename.match(/\.[^.]+$/)?.[0] || ''}`;
                return `![${uniqueFilename}](${dataUri})`;
              }
              return null;
            })
            .filter(Boolean);
          
          if (imageReferences.length > 0) {
            // 如果原内容不为空，添加换行
            content = content.trim() ? `${content}\n\n${imageReferences.join('\n')}` : imageReferences.join('\n');
          }
        }
      }
    }
    
    const normalized = {
      id: row.id,
      uid: row.uid,
      content: content,
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
    
    // 只在加载资源时添加 resources 字段
    if (includeResources && resources) {
      normalized.resources = resources;
    }
    
    return normalized;
  }
  
  /**
   * 🚀 轻量级标准化（列表查询专用 - 不包含 blob 数据）
   * 只包含资源元数据，不转换 base64，大幅提升性能
   */
  normalizeMemoLight(row, resourceMeta = []) {
    if (!row) return null;
    
    // 提取标签
    const tags = this.extractTagsFromContent(row.content);
    
    const normalized = {
      id: row.id,
      uid: row.uid,
      content: row.content, // 不修改内容，保持原样
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
    
    // 添加资源元数据（不含 blob）
    if (resourceMeta.length > 0) {
      normalized.resourceMeta = resourceMeta.map(r => ({
        id: r.id,
        uid: r.uid,
        filename: r.filename,
        type: r.type,
        size: r.size,
        memo_id: r.memo_id,
      }));
      
      // 添加一个标记，表示有资源但未加载
      normalized.hasResources = true;
      normalized.resourceCount = resourceMeta.length;
    }
    
    return normalized;
  }
  
  /**
   * 🚀 标准化备忘录对象（使用批量查询获取的资源）
   * 将 memo 行数据和资源数组组装成完整的 memo 对象
   */
  normalizeMemoWithResources(row, resources = []) {
    if (!row) return null;
    
    // 提取标签
    const tags = this.extractTagsFromContent(row.content);
    
    let content = row.content;
    
    // 处理内容：如果有资源但内容中没有图片引用，则添加图片引用
    if (resources.length > 0) {
      const hasImageReference = /!\[.*?\]\(.*?\)/.test(content);
      
      if (!hasImageReference) {
        // 在内容末尾添加图片引用
        const imageReferences = resources
          .filter(r => r.type && r.type.startsWith('image/'))
          .map((r, index) => {
            if (r.blob) {
              // 🔧 修复：正确处理 BLOB 数据
              // SQLite 的 BLOB 在 better-sqlite3 中是 Buffer 对象
              const base64 = Buffer.isBuffer(r.blob) 
                ? r.blob.toString('base64')
                : Buffer.from(r.blob).toString('base64');
              const dataUri = `data:${r.type};base64,${base64}`;
              // 使用资源ID或索引创建唯一的文件名
              const uniqueFilename = r.uid || r.id 
                ? `${r.filename.replace(/\.[^.]+$/, '')}_${r.uid || r.id}${r.filename.match(/\.[^.]+$/)?.[0] || ''}` 
                : `${r.filename.replace(/\.[^.]+$/, '')}_${index}${r.filename.match(/\.[^.]+$/)?.[0] || ''}`;
              return `![${uniqueFilename}](${dataUri})`;
            }
            return null;
          })
          .filter(Boolean);
        
        if (imageReferences.length > 0) {
          // 如果原内容不为空，添加换行
          content = content.trim() ? `${content}\n\n${imageReferences.join('\n')}` : imageReferences.join('\n');
        }
      }
    }
    
    const normalized = {
      id: row.id,
      uid: row.uid,
      content: content,
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
    
    // 添加资源信息（用于调试或其他用途）
    if (resources.length > 0) {
      normalized.resources = resources;
    }
    
    return normalized;
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
   * 获取资源（完整数据，包含 blob）
   */
  getResourcesByMemoId(memoId) {
    // 🚀 使用预编译语句
    return this.stmts.getResourcesByMemoId.all(memoId);
  }
  
  /**
   * 🚀 获取单个资源（按需加载）
   */
  getResourceById(resourceId) {
    // 🚀 使用预编译语句
    return this.stmts.getResourceById.get(resourceId);
  }
  
  /**
   * 🚀 获取单个资源（按 UID）
   */
  getResourceByUid(uid) {
    // 🚀 使用预编译语句
    return this.stmts.getResourceByUid.get(uid);
  }
  
  /**
   * 🚀 获取资源元数据（不含 blob）
   */
  getResourceMetaByMemoId(memoId) {
    return this.db.prepare('SELECT id, memo_id, filename, type, size, uid FROM resource WHERE memo_id = ?').all(memoId);
  }
  
  /**
   * 创建资源
   */
  createResource(data) {
    const { memo_id, filename, type, size, blob } = data;
    const now = Math.floor(Date.now() / 1000);
    const uid = this.generateUid();
    
    // 参考 memos 实现：使用 blob 存储二进制数据
    const result = this.db.prepare(`
      INSERT INTO resource (
        uid, 
        creator_id, 
        created_ts, 
        updated_ts, 
        filename, 
        blob, 
        type, 
        size, 
        memo_id, 
        storage_type, 
        reference, 
        payload
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uid,
      this.defaultUserId,
      now,
      now,
      filename,
      blob, // BLOB 二进制数据
      type,
      size,
      memo_id || null,
      'DATABASE', // 存储类型：DATABASE (存储在 blob 字段)
      '', // reference 为空（本地存储）
      '{}' // payload 为空 JSON
    );
    
    return {
      id: result.lastInsertRowid,
      uid,
      filename,
      type,
      size,
      memo_id,
      created_ts: now
    };
  }
  
  /**
   * 通过 ID 获取资源（包含 blob）
   */
  getResourceById(id) {
    return this.stmts.getResourceById.get(id);
  }
  
  /**
   * 删除资源
   */
  deleteResource(id) {
    const result = this.db.prepare('DELETE FROM resource WHERE id = ?').run(id);
    return result.changes > 0;
  }
  
  /**
   * 更新资源的 memo_id（关联到 memo）
   */
  updateResourceMemoId(resourceId, memoId) {
    const now = Math.floor(Date.now() / 1000);
    const result = this.db.prepare(`
      UPDATE resource 
      SET memo_id = ?, updated_ts = ? 
      WHERE id = ?
    `).run(memoId, now, resourceId);
    return result.changes > 0;
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

