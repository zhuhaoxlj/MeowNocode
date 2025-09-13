/**
 * 附件上传 API
 * POST /api/attachments - 上传新附件
 */

import { uploadAttachment } from '../../../lib/server/attachmentService';
import { withFileUpload } from '../../../lib/server/middleware';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { files } = req;
    
    if (!files || !files.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const { memoId } = req.body;
    
    const attachment = await uploadAttachment(file, memoId);
    
    res.status(201).json(attachment);
  } catch (error) {
    console.error('Upload attachment failed:', error);
    res.status(500).json({ error: error.message });
  }
}

// 配置文件上传
export const config = {
  api: {
    bodyParser: false, // 禁用默认的 body parser，使用自定义的文件上传处理
  },
};

export default withFileUpload(handler);