/**
 * 单个附件 API
 * GET /api/attachments/[id] - 获取附件文件
 * DELETE /api/attachments/[id] - 删除附件
 */

import { getAttachment, deleteAttachment } from '../../../lib/server/attachmentService';
import { withApiHandler } from '../../../lib/server/middleware';
import fs from 'fs';
import path from 'path';

async function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Attachment ID is required' });
  }

  switch (req.method) {
    case 'GET':
      return await handleGetAttachment(req, res);
    case 'DELETE':
      return await handleDeleteAttachment(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetAttachment(req, res) {
  try {
    const { id } = req.query;
    const attachment = await getAttachment(id);
    
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const filePath = path.resolve(attachment.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 设置响应头
    res.setHeader('Content-Type', attachment.type);
    res.setHeader('Content-Length', attachment.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存一年
    
    // 支持 inline 显示
    const disposition = req.query.download === '1' 
      ? `attachment; filename="${attachment.filename}"`
      : `inline; filename="${attachment.filename}"`;
    res.setHeader('Content-Disposition', disposition);
    
    // 流式传输文件
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
  } catch (error) {
    console.error('Get attachment failed:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleDeleteAttachment(req, res) {
  try {
    const { id } = req.query;
    const success = await deleteAttachment(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    res.status(200).json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment failed:', error);
    res.status(500).json({ error: error.message });
  }
}

export default withApiHandler(handler);