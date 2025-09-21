/**
 * API 路由：清理演示数据，为导入做准备
 */

// 导入数据库获取函数，确保使用同一个实例
import { getDatabase } from '../../lib/server/database-simple.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST 请求' });
  }

  try {
    // 获取数据库单例实例
    const database = getDatabase();
    
    if (!database) {
      throw new Error('数据库实例未找到');
    }
    
    // 获取清理前的数量
    const clearedCount = database.memos ? database.memos.length : 0;
    console.log(`准备清理 ${clearedCount} 条记录`);
    
    if (typeof database.clearAllMemos === 'function') {
      database.clearAllMemos();
      console.log('✅ 使用 clearAllMemos 方法清理数据');
    } else {
      // 手动清理
      database.memos = [];
      database.resources = [];
      database.nextMemoId = 1;
      database.nextResourceId = 1;
      // clearAllMemos 方法中已经包含了 saveData 调用，这里不需要单独调用
      console.log('✅ 手动清理数据完成');
    }
    
    console.log('✅ 数据已清理，共清理', clearedCount, '条记录');
    return res.status(200).json({ 
      success: true, 
      message: `数据已清理，共清理 ${clearedCount} 条记录`,
      clearedCount 
    });
    
  } catch (error) {
    console.error('清理数据失败:', error);
    res.status(500).json({ error: `清理失败: ${error.message}` });
  }
}