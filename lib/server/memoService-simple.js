/**
 * 备忘录服务 - 简化版
 * 使用 sql.js 数据库
 */

import { executeQuery, executeQueryOne, executeUpdate } from './database-simple.js';
import { nanoid } from 'nanoid';

/**
 * 生成备忘录 UID
 */
function generateMemoId() {
  return `memo-${Date.now()}-${nanoid(8)}`;
}

/**
 * 格式化备忘录数据
 */
function formatMemo(row) {
  if (!row) return null;
  
  return {
    id: row.uid,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    timestamp: row.created_at,
    lastModified: row.updated_at,
    pinned: Boolean(row.pinned),
    archived: Boolean(row.archived)
  };
}

/**
 * 获取备忘录列表
 */
export async function getMemos(options = {}) {
  const {
    pinned,
    archived = false,
    tag,
    search,
    limit = 100,
    offset = 0
  } = options;

  let sql = `
    SELECT m.*, 
           COUNT(a.id) as attachment_count,
           GROUP_CONCAT(a.uid) as attachment_uids
    FROM memos m
    LEFT JOIN attachments a ON m.id = a.memo_id
    WHERE m.deleted = 0
  `;
  
  const params = [];
  
  // 筛选条件
  if (pinned !== undefined) {
    sql += ' AND m.pinned = ?';
    params.push(pinned ? 1 : 0);
  }
  
  if (archived !== undefined) {
    sql += ' AND m.archived = ?';
    params.push(archived ? 1 : 0);
  }
  
  if (tag) {
    sql += ' AND m.tags LIKE ?';
    params.push(`%"${tag}"%`);
  }
  
  if (search) {
    sql += ' AND m.content LIKE ?';
    params.push(`%${search}%`);
  }
  
  sql += ' GROUP BY m.id ORDER BY m.pinned DESC, m.created_at DESC';
  
  if (limit > 0) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
  }
  
  const rows = await executeQuery(sql, params);
  
  const memos = rows.map(row => {
    const memo = formatMemo(row);
    
    // 添加附件信息
    memo.attachmentCount = row.attachment_count || 0;
    memo.attachments = row.attachment_uids 
      ? row.attachment_uids.split(',').map(uid => ({ id: uid, url: `/api/attachments/${uid}` }))
      : [];
    
    return memo;
  });

  // 获取总数
  let countSql = 'SELECT COUNT(*) as total FROM memos WHERE deleted = 0';
  const countParams = [];
  
  if (pinned !== undefined) {
    countSql += ' AND pinned = ?';
    countParams.push(pinned ? 1 : 0);
  }
  
  if (archived !== undefined) {
    countSql += ' AND archived = ?';
    countParams.push(archived ? 1 : 0);
  }
  
  if (tag) {
    countSql += ' AND tags LIKE ?';
    countParams.push(`%"${tag}"%`);
  }
  
  if (search) {
    countSql += ' AND content LIKE ?';
    countParams.push(`%${search}%`);
  }
  
  const totalRow = await executeQueryOne(countSql, countParams);
  const totalCount = totalRow?.total || 0;

  return {
    memos,
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    }
  };
}

/**
 * 获取单个备忘录
 */
export async function getMemo(uid) {
  const sql = `
    SELECT m.*, 
           COUNT(a.id) as attachment_count,
           GROUP_CONCAT(a.uid) as attachment_uids,
           GROUP_CONCAT(a.filename) as attachment_filenames,
           GROUP_CONCAT(a.type) as attachment_types
    FROM memos m
    LEFT JOIN attachments a ON m.id = a.memo_id
    WHERE m.uid = ? AND m.deleted = 0
    GROUP BY m.id
  `;
  
  const row = await executeQueryOne(sql, [uid]);
  
  if (!row) return null;
  
  const memo = formatMemo(row);
  
  // 添加详细的附件信息
  if (row.attachment_uids) {
    const uids = row.attachment_uids.split(',');
    const filenames = (row.attachment_filenames || '').split(',');
    const types = (row.attachment_types || '').split(',');
    
    memo.attachments = uids.map((uid, index) => ({
      id: uid,
      filename: filenames[index] || '',
      type: types[index] || '',
      url: `/api/attachments/${uid}`
    }));
  } else {
    memo.attachments = [];
  }
  
  return memo;
}

/**
 * 创建备忘录
 */
export async function createMemo(data) {
  const { content, tags = [], pinned = false } = data;
  
  if (!content || content.trim() === '') {
    throw new Error('备忘录内容不能为空');
  }
  
  const uid = generateMemoId();
  const now = new Date().toISOString();
  
  const sql = `
    INSERT INTO memos (uid, content, tags, created_at, updated_at, pinned)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  try {
    await executeUpdate(sql, [uid, content.trim(), JSON.stringify(tags), now, now, pinned ? 1 : 0]);
    
    return {
      id: uid,
      content: content.trim(),
      tags,
      createdAt: now,
      updatedAt: now,
      timestamp: now,
      lastModified: now,
      pinned,
      archived: false,
      attachments: []
    };
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      throw new Error('备忘录 ID 冲突，请重试');
    }
    throw error;
  }
}

/**
 * 更新备忘录
 */
export async function updateMemo(uid, updates) {
  const allowedFields = ['content', 'tags', 'pinned', 'archived'];
  const setParts = [];
  const params = [];
  
  Object.keys(updates).forEach(field => {
    if (allowedFields.includes(field) && updates[field] !== undefined) {
      if (field === 'tags') {
        setParts.push(`${field} = ?`);
        params.push(JSON.stringify(updates[field]));
      } else if (field === 'pinned' || field === 'archived') {
        setParts.push(`${field} = ?`);
        params.push(updates[field] ? 1 : 0);
      } else {
        setParts.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }
  });
  
  if (setParts.length === 0) {
    throw new Error('没有有效的更新字段');
  }
  
  const now = new Date().toISOString();
  setParts.push('updated_at = ?');
  params.push(now, uid);
  
  const sql = `UPDATE memos SET ${setParts.join(', ')} WHERE uid = ? AND deleted = 0`;
  
  await executeUpdate(sql, params);
  
  // 返回更新后的备忘录
  return await getMemo(uid);
}

/**
 * 删除备忘录
 */
export async function deleteMemo(uid) {
  // 软删除备忘录
  const sql = 'UPDATE memos SET deleted = 1, updated_at = ? WHERE uid = ? AND deleted = 0';
  const now = new Date().toISOString();
  
  await executeUpdate(sql, [now, uid]);
  
  return true;
}

/**
 * 获取标签统计
 */
export async function getTagStats() {
  const sql = 'SELECT tags FROM memos WHERE deleted = 0 AND tags != "[]"';
  const rows = await executeQuery(sql);
  
  const tagCount = new Map();
  
  rows.forEach(row => {
    try {
      const tags = JSON.parse(row.tags || '[]');
      tags.forEach(tag => {
        if (typeof tag === 'string' && tag.trim()) {
          const normalizedTag = tag.trim();
          tagCount.set(normalizedTag, (tagCount.get(normalizedTag) || 0) + 1);
        }
      });
    } catch (error) {
      // 忽略 JSON 解析错误
    }
  });
  
  return Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}