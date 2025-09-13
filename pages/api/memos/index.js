import { getDatabase } from '../../../lib/server/database-simple.js';
import { withMethods, withCors } from '../../../lib/server/middleware.js';

async function handler(req, res) {
  const db = getDatabase();
  
  switch (req.method) {
    case 'GET':
      try {
        const memos = db.getAllMemos();
        res.status(200).json({ memos });
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
