import { getDatabase } from '../../../lib/server/database-config.js';
import { withMethods, withCors } from '../../../lib/server/middleware.js';

/**
 * 🚀 按需加载单个资源 API
 * GET /api/resources/:id - 获取资源的完整数据（包括 blob）
 */
async function handler(req, res) {
  const db = getDatabase();
  const { id } = req.query;
  
  switch (req.method) {
    case 'GET':
      try {
        // 支持通过 ID 或 UID 查询
        let resource;
        if (id.startsWith('meow-')) {
          // 是 UID
          resource = db.getResourceByUid(id);
        } else {
          // 是数字 ID
          resource = db.getResourceById(parseInt(id));
        }
        
        if (!resource) {
          return res.status(404).json({ error: '资源不存在' });
        }
        
        // 如果有 blob 数据，转换为 base64
        let dataUri = null;
        if (resource.blob) {
          const base64 = Buffer.isBuffer(resource.blob) 
            ? resource.blob.toString('base64')
            : Buffer.from(resource.blob).toString('base64');
          dataUri = `data:${resource.type};base64,${base64}`;
        }
        
        res.status(200).json({
          resource: {
            id: resource.id,
            uid: resource.uid,
            filename: resource.filename,
            type: resource.type,
            size: resource.size,
            memo_id: resource.memo_id,
            dataUri, // base64 data URI
            created_ts: resource.created_ts,
          }
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

