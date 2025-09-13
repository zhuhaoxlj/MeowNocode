/**
 * 单个备忘录 API - 完整版
 * GET /api/memos/[id] - 获取特定备忘录
 * PUT /api/memos/[id] - 更新备忘录
 * DELETE /api/memos/[id] - 删除备忘录
 */

import { getMemo, updateMemo, deleteMemo } from '../../../lib/server/memoService-simple.js';

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: '备忘录 ID 是必需的' });
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetMemo(req, res);
      case 'PUT':
        return await handleUpdateMemo(req, res);
      case 'DELETE':
        return await handleDeleteMemo(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API 错误:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGetMemo(req, res) {
  try {
    const { id } = req.query;
    const memo = await getMemo(id);
    
    if (!memo) {
      return res.status(404).json({ error: '备忘录未找到' });
    }
    
    res.status(200).json(memo);
  } catch (error) {
    console.error('获取备忘录失败:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleUpdateMemo(req, res) {
  try {
    const { id } = req.query;
    const { content, tags, pinned } = req.body;
    
    const updates = {};
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : [];
    if (pinned !== undefined) updates.pinned = Boolean(pinned);
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: '没有提供有效的更新字段' });
    }
    
    const memo = await updateMemo(id, updates);
    
    if (!memo) {
      return res.status(404).json({ error: '备忘录未找到' });
    }
    
    res.status(200).json(memo);
  } catch (error) {
    console.error('更新备忘录失败:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleDeleteMemo(req, res) {
  try {
    const { id } = req.query;
    const success = await deleteMemo(id);
    
    if (!success) {
      return res.status(404).json({ error: '备忘录未找到' });
    }
    
    res.status(200).json({ message: '备忘录删除成功' });
  } catch (error) {
    console.error('删除备忘录失败:', error);
    res.status(500).json({ error: error.message });
  }
}