/**
 * API 路由：获取归档的备忘录
 */
import { getDatabase } from '../../../lib/server/database-simple.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持 GET 请求' });
  }

  try {
    const database = getDatabase();
    const archivedMemos = database.getArchivedMemos();
    
    console.log(`📋 返回 ${archivedMemos.length} 条归档备忘录`);
    
    res.status(200).json({
      success: true,
      data: archivedMemos,
      total: archivedMemos.length
    });
  } catch (error) {
    console.error('获取归档备忘录失败:', error);
    res.status(500).json({ 
      error: `获取归档备忘录失败: ${error.message}` 
    });
  }
}