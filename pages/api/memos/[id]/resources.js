import { getDatabase } from '../../../../lib/server/database-config.js';
import { withMethods, withCors } from '../../../../lib/server/middleware.js';

/**
 * 🚀 获取 memo 的所有资源（完整数据）
 * GET /api/memos/:id/resources - 按需加载 memo 的所有资源
 */
async function handler(req, res) {
  const db = getDatabase();
  const { id } = req.query;
  
  switch (req.method) {
    case 'GET':
      try {
        const memoId = parseInt(id);
        
        // 验证 memo 是否存在
        const memo = db.getMemoById(memoId);
        if (!memo) {
          return res.status(404).json({ error: 'Memo 不存在' });
        }
        
        // 获取资源
        const resources = db.getResourcesByMemoId(memoId);
        
        // 转换资源为前端可用格式
        const formattedResources = resources.map((r, index) => {
          let dataUri = null;
          if (r.blob && r.type && r.type.startsWith('image/')) {
            const base64 = Buffer.isBuffer(r.blob) 
              ? r.blob.toString('base64')
              : Buffer.from(r.blob).toString('base64');
            dataUri = `data:${r.type};base64,${base64}`;
          }
          
          return {
            id: r.id,
            uid: r.uid,
            filename: r.filename,
            type: r.type,
            size: r.size,
            memo_id: r.memo_id,
            dataUri,
            created_ts: r.created_ts,
          };
        });
        
        res.status(200).json({
          resources: formattedResources,
          count: formattedResources.length,
        });
      } catch (error) {
        console.error('❌ 获取资源失败:', error);
        res.status(500).json({ error: '获取资源失败' });
      }
      break;
      
    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export default withCors(withMethods(['GET'])(handler));

