import { getDatabase } from '../../../lib/server/database-config.js';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const db = getDatabase();
      const resource = db.getResourceById(parseInt(id));

      if (!resource) {
        return res.status(404).json({ error: '附件不存在' });
      }

      // 设置响应头
      res.setHeader('Content-Type', resource.type || 'application/octet-stream');
      res.setHeader('Content-Length', resource.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存一年
      
      // 返回二进制数据
      res.status(200).send(resource.blob);
    } catch (error) {
      console.error('❌ 获取附件失败:', error);
      res.status(500).json({
        error: '获取附件失败',
        message: error.message
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const db = getDatabase();
      const success = db.deleteResource(parseInt(id));

      if (!success) {
        return res.status(404).json({ error: '附件不存在' });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('❌ 删除附件失败:', error);
      res.status(500).json({
        error: '删除附件失败',
        message: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
