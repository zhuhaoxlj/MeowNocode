/**
 * 数据库导出 API
 * GET /api/export/database
 */

import { backupDatabase, getDatabaseStats } from '../../../lib/server/database';
import { withApiHandler } from '../../../lib/server/middleware';
import fs from 'fs';
import path from 'path';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = getDatabaseStats();
    
    if (stats.memos === 0 && stats.attachments === 0) {
      return res.status(400).json({ error: '数据库为空，无需导出' });
    }
    
    // 创建备份
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `meownocode-${timestamp}.db`;
    const backupPath = path.join(process.cwd(), 'data', 'backups', backupFilename);
    
    // 确保备份目录存在
    const backupDir = path.dirname(backupPath);
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // 执行备份
    await backupDatabase(backupPath);
    
    // 获取备份文件信息
    const backupStats = fs.statSync(backupPath);
    
    // 设置下载响应头
    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${backupFilename}"`);
    res.setHeader('Content-Length', backupStats.size);
    
    // 流式传输文件
    const stream = fs.createReadStream(backupPath);
    stream.pipe(res);
    
    // 清理临时备份文件 (延迟删除)
    stream.on('end', () => {
      setTimeout(() => {
        try {
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath);
          }
        } catch (error) {
          console.warn('清理临时备份文件失败:', error.message);
        }
      }, 5000); // 5秒后删除
    });
    
  } catch (error) {
    console.error('导出数据库失败:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withApiHandler(handler);