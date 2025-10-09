import { getDatabase } from '../../../lib/server/database-config.js';
import { withMethods, withCors } from '../../../lib/server/middleware.js';

async function handler(req, res) {
  try {
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
          console.error('❌ 获取 memos 失败:', error);
          res.status(500).json({ 
            error: '获取 memos 失败',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }
        break;
        
      case 'POST':
        try {
          console.log('📥 收到 POST 请求 - 创建 memo');
          console.log('   请求体:', JSON.stringify(req.body, null, 2));
          
          // 验证请求数据
          if (!req.body || !req.body.content) {
            console.error('❌ 无效的请求数据 - 缺少 content');
            return res.status(400).json({ 
              error: '无效的请求数据',
              message: '必须提供 content 字段' 
            });
          }
          
          const memo = db.createMemo(req.body);
          console.log('✅ Memo 创建成功:', memo.id);
          
          res.status(201).json({ memo });
        } catch (error) {
          console.error('❌ 创建 memo 失败:', error);
          console.error('   错误堆栈:', error.stack);
          console.error('   请求体:', req.body);
          res.status(500).json({ 
            error: '创建 memo 失败',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          });
        }
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method Not Allowed' });
    }
  } catch (error) {
    console.error('❌ API 路由错误 (/api/memos):', error);
    res.status(500).json({ 
      error: '数据库初始化失败',
      message: error.message,
      details: '请检查数据库配置和文件权限',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

export default withCors(withMethods(['GET', 'POST'])(handler));
