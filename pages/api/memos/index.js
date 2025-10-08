import { getDatabase } from '../../../lib/server/database-simple.js';
import { withMethods, withCors } from '../../../lib/server/middleware.js';

async function handler(req, res) {
  const db = getDatabase();
  
  switch (req.method) {
    case 'GET':
      try {
        // 从查询参数获取分页信息
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50; // 默认每页 50 条
        const offset = (page - 1) * limit;
        
        console.log(`📖 获取 memos - 页码: ${page}, 每页: ${limit}, 偏移: ${offset}`);
        
        // 调用分页方法
        const result = db.getMemosPaginated({ limit, offset });
        
        res.status(200).json({
          memos: result.memos,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            hasMore: result.hasMore
          }
        });
      } catch (error) {
        console.error('获取 memos 失败:', error);
        res.status(500).json({ error: '获取 memos 失败' });
      }
      break;
      
    case 'POST':
      try {
        const memo = db.createMemo(req.body);
        res.status(201).json({ memo });
      } catch (error) {
        console.error('创建 memo 失败:', error);
        res.status(500).json({ error: '创建 memo 失败' });
      }
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export default withCors(withMethods(['GET', 'POST'])(handler));
