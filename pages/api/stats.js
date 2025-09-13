/**
 * 统计信息 API
 * GET /api/stats
 */

import { getDatabaseStats } from '../../lib/server/database';
import { getTagStats } from '../../lib/server/memoService';
import { getAttachmentStats } from '../../lib/server/attachmentService';
import { withApiHandler } from '../../lib/server/middleware';

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { include } = req.query;
    const includeList = include ? include.split(',') : ['all'];
    
    const stats = {};
    
    // 基础数据库统计
    if (includeList.includes('all') || includeList.includes('database')) {
      stats.database = getDatabaseStats();
    }
    
    // 标签统计
    if (includeList.includes('all') || includeList.includes('tags')) {
      stats.tags = getTagStats();
    }
    
    // 附件统计
    if (includeList.includes('all') || includeList.includes('attachments')) {
      stats.attachments = getAttachmentStats();
    }
    
    // 服务器信息
    if (includeList.includes('all') || includeList.includes('server')) {
      stats.server = {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      };
    }
    
    res.status(200).json(stats);
    
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withApiHandler(handler);