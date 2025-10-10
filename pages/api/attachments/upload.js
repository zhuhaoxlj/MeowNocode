import { getDatabase } from '../../../lib/server/database-config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const db = getDatabase();
    
    // 从请求头获取元数据
    const filename = req.headers['x-filename'] || 'untitled';
    const contentType = req.headers['content-type'] || 'application/octet-stream';
    
    // 读取二进制数据
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const size = buffer.length;
    
    console.log(`📎 上传附件: ${filename}, 类型: ${contentType}, 大小: ${(size / 1024).toFixed(2)} KB`);
    
    // 创建资源记录（暂不关联 memo）
    const resource = db.createResource({
      memo_id: null, // 粘贴时还没有 memo_id，提交时再关联
      filename,
      type: contentType,
      size,
      blob: buffer
    });
    
    res.status(200).json({
      id: resource.id,
      filename: resource.filename,
      type: resource.type,
      size: resource.size,
      url: `/api/attachments/${resource.id}`
    });
  } catch (error) {
    console.error('❌ 附件上传失败:', error);
    res.status(500).json({
      error: '附件上传失败',
      message: error.message
    });
  }
}

// 禁用默认的 body parser，直接处理二进制流
export const config = {
  api: {
    bodyParser: false,
  },
};

