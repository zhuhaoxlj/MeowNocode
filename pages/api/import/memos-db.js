/**
 * Memos 数据库导入 API
 * POST /api/import/memos-db
 */

import { restoreDatabase } from '../../../lib/server/database';
import { withFileUpload } from '../../../lib/server/middleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = req;
    
    if (!files || !files.dbFile) {
      return res.status(400).json({ error: '请提供数据库文件' });
    }
    
    const file = Array.isArray(files.dbFile) ? files.dbFile[0] : files.dbFile;
    
    // 验证文件类型
    if (!file.originalFilename.endsWith('.db') && 
        !file.originalFilename.endsWith('.sqlite') &&
        !file.originalFilename.endsWith('.sqlite3')) {
      return res.status(400).json({ error: '只支持 .db, .sqlite, .sqlite3 格式的数据库文件' });
    }
    
    // 验证文件大小 (最大 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return res.status(400).json({ error: '数据库文件过大 (最大 100MB)' });
    }
    
    // 执行数据库恢复
    await restoreDatabase(file.filepath);
    
    res.status(200).json({
      message: 'Memos 数据库导入成功',
      filename: file.originalFilename,
      size: file.size,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('导入 Memos 数据库失败:', error);
    res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default withFileUpload(handler, { 
  maxFileSize: 100 * 1024 * 1024 // 100MB
});