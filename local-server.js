/**
 * 本地文件服务器
 * 提供真正的本地 SQLite 文件读写 API
 * 支持跨浏览器数据共享
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// 数据存储目录
const DATA_DIR = path.join(__dirname, 'local-data');
const DB_PATH = path.join(DATA_DIR, 'meownocode.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// 确保目录存在
[DATA_DIR, UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 中间件
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:5173'], // Vite 开发服务器
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// 文件上传配置
const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// 数据库连接
let db = null;

// 初始化数据库
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('数据库连接失败:', err);
        reject(err);
        return;
      }
      
      console.log('✅ 连接到 SQLite 数据库:', DB_PATH);
      
      // 创建表结构
      db.serialize(() => {
        db.run(`
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

        db.run(`
          CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT UNIQUE NOT NULL,
            memo_id INTEGER,
            filename TEXT NOT NULL,
            type TEXT NOT NULL,
            size INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (memo_id) REFERENCES memos (id)
          )
        `);

        // 创建索引
        db.run('CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos (created_at DESC)');
        db.run('CREATE INDEX IF NOT EXISTS idx_memos_pinned ON memos (pinned)');
        db.run('CREATE INDEX IF NOT EXISTS idx_attachments_memo_id ON attachments (memo_id)');
        
        console.log('📋 数据库表结构已确保');
        resolve();
      });
    });
  });
}

// === API 路由 ===

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: DB_PATH,
    connected: !!db
  });
});

// 获取备忘录
app.get('/api/memos', (req, res) => {
  const { pinned } = req.query;
  
  let query = `
    SELECT m.*, 
           GROUP_CONCAT(a.uid) as attachment_uids,
           GROUP_CONCAT(a.filename) as attachment_filenames,
           GROUP_CONCAT(a.type) as attachment_types
    FROM memos m
    LEFT JOIN attachments a ON m.id = a.memo_id
  `;
  
  const params = [];
  
  if (pinned !== undefined) {
    query += ' WHERE m.pinned = ?';
    params.push(pinned === 'true' ? 1 : 0);
  }
  
  query += ' GROUP BY m.id ORDER BY m.created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('查询备忘录失败:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    const memos = rows.map(row => ({
      id: row.uid,
      content: row.content,
      tags: JSON.parse(row.tags || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      timestamp: row.created_at,
      lastModified: row.updated_at,
      pinned: Boolean(row.pinned),
      attachments: parseAttachments(row)
    }));
    
    res.json({ memos });
  });
});

// 创建备忘录
app.post('/api/memos', (req, res) => {
  const { content, tags = [], pinned = false } = req.body;
  
  if (!content) {
    res.status(400).json({ error: 'Content is required' });
    return;
  }
  
  const uid = `memo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const query = `
    INSERT INTO memos (uid, content, tags, created_at, updated_at, pinned)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [uid, content, JSON.stringify(tags), now, now, pinned ? 1 : 0], function(err) {
    if (err) {
      console.error('创建备忘录失败:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      id: uid,
      content,
      tags,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      lastModified: now,
      pinned
    });
  });
});

// 更新备忘录
app.put('/api/memos/:uid', (req, res) => {
  const { uid } = req.params;
  const { content, tags, pinned } = req.body;
  const now = new Date().toISOString();
  
  const setParts = [];
  const params = [];
  
  if (content !== undefined) {
    setParts.push('content = ?');
    params.push(content);
  }
  
  if (tags !== undefined) {
    setParts.push('tags = ?');
    params.push(JSON.stringify(tags));
  }
  
  if (pinned !== undefined) {
    setParts.push('pinned = ?');
    params.push(pinned ? 1 : 0);
  }
  
  setParts.push('updated_at = ?');
  params.push(now);
  params.push(uid);
  
  const query = `UPDATE memos SET ${setParts.join(', ')} WHERE uid = ?`;
  
  db.run(query, params, function(err) {
    if (err) {
      console.error('更新备忘录失败:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Memo not found' });
      return;
    }
    
    res.json({ message: 'Memo updated successfully', updatedAt: now });
  });
});

// 删除备忘录
app.delete('/api/memos/:uid', (req, res) => {
  const { uid } = req.params;
  
  // 先删除相关附件文件
  db.all('SELECT file_path FROM attachments WHERE memo_id = (SELECT id FROM memos WHERE uid = ?)', [uid], (err, attachments) => {
    if (!err && attachments) {
      attachments.forEach(att => {
        try {
          if (fs.existsSync(att.file_path)) {
            fs.unlinkSync(att.file_path);
          }
        } catch (e) {
          console.warn('删除附件文件失败:', e.message);
        }
      });
    }
    
    // 删除数据库记录
    db.serialize(() => {
      db.run('DELETE FROM attachments WHERE memo_id = (SELECT id FROM memos WHERE uid = ?)', [uid]);
      db.run('DELETE FROM memos WHERE uid = ?', [uid], function(err) {
        if (err) {
          console.error('删除备忘录失败:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        
        if (this.changes === 0) {
          res.status(404).json({ error: 'Memo not found' });
          return;
        }
        
        res.json({ message: 'Memo deleted successfully' });
      });
    });
  });
});

// 上传附件
app.post('/api/attachments', upload.single('file'), (req, res) => {
  const file = req.file;
  
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  
  const uid = `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  const query = `
    INSERT INTO attachments (uid, filename, type, size, file_path, created_at, memo_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [
    uid,
    file.originalname,
    file.mimetype,
    file.size,
    file.path,
    now,
    req.body.memoId || null
  ], function(err) {
    if (err) {
      console.error('保存附件记录失败:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({
      id: uid,
      filename: file.originalname,
      type: file.mimetype,
      size: file.size,
      url: `/api/attachments/${uid}`
    });
  });
});

// 获取附件
app.get('/api/attachments/:uid', (req, res) => {
  const { uid } = req.params;
  
  db.get('SELECT * FROM attachments WHERE uid = ?', [uid], (err, row) => {
    if (err) {
      console.error('查询附件失败:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!row) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }
    
    if (!fs.existsSync(row.file_path)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    
    res.setHeader('Content-Type', row.type);
    res.setHeader('Content-Disposition', `inline; filename="${row.filename}"`);
    res.sendFile(path.resolve(row.file_path));
  });
});

// 导入数据库文件
app.post('/api/import-db', upload.single('dbFile'), (req, res) => {
  const file = req.file;
  
  if (!file) {
    res.status(400).json({ error: 'No database file provided' });
    return;
  }
  
  try {
    // 备份当前数据库
    if (fs.existsSync(DB_PATH)) {
      const backupPath = `${DB_PATH}.backup.${Date.now()}`;
      fs.copyFileSync(DB_PATH, backupPath);
      console.log('📦 当前数据库已备份至:', backupPath);
    }
    
    // 关闭当前数据库连接
    db.close((err) => {
      if (err) console.warn('关闭数据库连接失败:', err);
      
      // 替换数据库文件
      fs.copyFileSync(file.path, DB_PATH);
      fs.unlinkSync(file.path); // 删除临时文件
      
      // 重新初始化数据库连接
      initDatabase().then(() => {
        res.json({ message: '数据库导入成功', timestamp: new Date().toISOString() });
      }).catch(error => {
        res.status(500).json({ error: `重新连接数据库失败: ${error.message}` });
      });
    });
    
  } catch (error) {
    console.error('导入数据库失败:', error);
    res.status(500).json({ error: error.message });
  }
});

// 导出数据库文件
app.get('/api/export-db', (req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    res.status(404).json({ error: 'Database file not found' });
    return;
  }
  
  const filename = `meownocode-${new Date().toISOString().slice(0, 10)}.db`;
  
  res.setHeader('Content-Type', 'application/x-sqlite3');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(path.resolve(DB_PATH));
});

// 工具函数
function parseAttachments(row) {
  if (!row.attachment_uids) return [];
  
  const uids = row.attachment_uids.split(',');
  const filenames = (row.attachment_filenames || '').split(',');
  const types = (row.attachment_types || '').split(',');
  
  return uids.map((uid, index) => ({
    id: uid,
    filename: filenames[index] || '',
    type: types[index] || '',
    url: `/api/attachments/${uid}`
  }));
}

// 启动服务器
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log('🚀 本地文件服务器已启动');
      console.log(`📡 HTTP API: http://localhost:${PORT}`);
      console.log(`💾 数据库文件: ${DB_PATH}`);
      console.log(`📁 上传目录: ${UPLOADS_DIR}`);
      console.log('\n✅ 现在可以跨浏览器访问同一份数据了！\n');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🔄 正在关闭服务器...');
  if (db) {
    db.close((err) => {
      if (err) console.error('关闭数据库连接失败:', err);
      else console.log('✅ 数据库连接已关闭');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

startServer();