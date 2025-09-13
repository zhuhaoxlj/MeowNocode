/**
 * 备忘录 API - 完整版
 * GET /api/memos - 获取备忘录列表
 * POST /api/memos - 创建新备忘录
 */

import { getMemos, createMemo } from '../../../lib/server/memoService-simple.js';

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetMemos(req, res);
      case 'POST':
        return await handleCreateMemo(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API 错误:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGetMemos(req, res) {
  try {
    const { pinned, tag, search, limit = 100, offset = 0 } = req.query;
    
    const options = {
      pinned: pinned === 'true' ? true : pinned === 'false' ? false : undefined,
      tag: tag || undefined,
      search: search || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const result = await getMemos(options);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('获取备忘录失败:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleCreateMemo(req, res) {
  try {
    const { content, tags = [], pinned = false } = req.body;
    
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: '备忘录内容不能为空' });
    }
    
    const memo = await createMemo({
      content: content.trim(),
      tags: Array.isArray(tags) ? tags : [],
      pinned: Boolean(pinned)
    });
    
    res.status(201).json(memo);
  } catch (error) {
    console.error('创建备忘录失败:', error);
    res.status(500).json({ error: error.message });
  }
}