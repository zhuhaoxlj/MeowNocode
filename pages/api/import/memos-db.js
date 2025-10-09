import { IncomingForm } from 'formidable';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getDatabase } from '../../../lib/server/database-config.js';

export const config = {
  api: {
    bodyParser: false, // 禁用默认的 body parser 以处理文件上传
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 解析上传的文件
    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), 'data', 'temp'),
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB
    });

    // 确保临时目录存在
    if (!fs.existsSync(form.uploadDir)) {
      fs.mkdirSync(form.uploadDir, { recursive: true });
    }

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const uploadedFile = files.memosDb;
    if (!uploadedFile) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const filePath = Array.isArray(uploadedFile) ? uploadedFile[0].filepath : uploadedFile.filepath;

    // 验证是否是有效的 SQLite 数据库
    let memosDb;
    try {
      memosDb = new Database(filePath, { readonly: true });
      
      // 检查是否包含 Memos 的表结构
      const tables = memosDb.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();
      
      const tableNames = tables.map(t => t.name);
      if (!tableNames.includes('memo')) {
        throw new Error('不是有效的 Memos 数据库文件');
      }
    } catch (error) {
      // 清理上传的文件
      fs.unlinkSync(filePath);
      return res.status(400).json({ 
        error: '无效的数据库文件: ' + error.message 
      });
    }

    // 开始导入
    const meowDb = getDatabase();
    
    // 备份当前数据
    const backupDir = path.join(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const currentMemos = meowDb.getAllMemos(true);
    if (currentMemos.length > 0) {
      const backupFile = path.join(backupDir, `meownocode-backup-${Date.now()}.json`);
      fs.writeFileSync(backupFile, JSON.stringify({
        memos: currentMemos,
        exportDate: new Date().toISOString(),
      }, null, 2));
    }
    
    // 清空现有数据
    meowDb.clearAllMemos();
    
    // 导入备忘录
    const memoQuery = `
      SELECT 
        m.*,
        o.pinned
      FROM memo m
      LEFT JOIN memo_organizer o ON m.id = o.memo_id AND m.creator_id = o.user_id
      ORDER BY m.created_ts ASC
    `;
    
    const memos = memosDb.prepare(memoQuery).all();
    
    let importedCount = 0;
    let archivedCount = 0;
    
    for (const memo of memos) {
      try {
        // 提取标签
        const tags = extractTagsFromContent(memo.content);
        
        // 转换时间戳 (Memos 使用 Unix 时间戳，单位秒)
        const createdAt = new Date(memo.created_ts * 1000).toISOString();
        const updatedAt = new Date(memo.updated_ts * 1000).toISOString();
        
        // 创建备忘录
        meowDb.createMemo({
          content: memo.content,
          tags: tags.join(','),
          visibility: convertVisibility(memo.visibility),
          pinned: memo.pinned === 1,
          archived: memo.row_status === 'ARCHIVED',
          created_ts: createdAt,
          updated_ts: updatedAt,
        });
        
        importedCount++;
        if (memo.row_status === 'ARCHIVED') {
          archivedCount++;
        }
      } catch (error) {
        console.error(`导入备忘录失败 (ID: ${memo.id}):`, error);
      }
    }
    
    // 关闭数据库连接
    memosDb.close();
    
    // 清理上传的文件
    fs.unlinkSync(filePath);
    
    return res.status(200).json({
      success: true,
      imported: importedCount,
      archived: archivedCount,
      total: memos.length,
    });
    
  } catch (error) {
    console.error('导入失败:', error);
    return res.status(500).json({ 
      error: '导入失败: ' + error.message 
    });
  }
}

/**
 * 从内容中提取标签
 */
function extractTagsFromContent(content) {
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
 * 转换可见性设置
 */
function convertVisibility(memosVisibility) {
  const visibilityMap = {
    'PRIVATE': 'private',
    'PROTECTED': 'protected',
    'PUBLIC': 'public',
  };
  
  return visibilityMap[memosVisibility] || 'private';
}
