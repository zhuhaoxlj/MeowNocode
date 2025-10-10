import { getDatabase } from '../../../lib/server/database-config.js';
import { withMethods, withCors } from '../../../lib/server/middleware.js';

async function handler(req, res) {
  const { id } = req.query;
  const db = getDatabase();
  
  switch (req.method) {
    case 'GET':
      try {
        const memo = db.getMemoById(id);
        if (!memo) {
          return res.status(404).json({ error: 'Memo 不存在' });
        }
        res.status(200).json({ memo });
      } catch (error) {
        console.error('获取 memo 失败:', error);
        res.status(500).json({ error: '获取 memo 失败' });
      }
      break;
      
    case 'PUT':
      try {
        console.log('🔍 DEBUG API: Received PUT request for memo id:', id);
        console.log('🔍 DEBUG API: Request body:', JSON.stringify(req.body, null, 2));
        
        const memo = db.updateMemo(id, req.body);
        if (!memo) {
          return res.status(404).json({ error: 'Memo 不存在' });
        }
        
        console.log('✅ DEBUG API: Returning updated memo:', JSON.stringify(memo, null, 2));
        res.status(200).json({ memo });
      } catch (error) {
        console.error('更新 memo 失败:', error);
        res.status(500).json({ error: '更新 memo 失败' });
      }
      break;
      
    case 'DELETE':
      try {
        const success = db.deleteMemo(id);
        if (!success) {
          return res.status(404).json({ error: 'Memo 不存在' });
        }
        res.status(200).json({ message: '删除成功' });
      } catch (error) {
        console.error('删除 memo 失败:', error);
        res.status(500).json({ error: '删除 memo 失败' });
      }
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export default withCors(withMethods(['GET', 'PUT', 'DELETE'])(handler));

// 增加请求体大小限制，支持大图片（最大 10MB）
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
