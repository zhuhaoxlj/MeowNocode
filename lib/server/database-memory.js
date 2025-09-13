/**
 * 内存数据库 - 演示版
 * 用于快速展示跨浏览器数据共享功能
 * 注意：服务器重启后数据会丢失，适合演示和测试
 */

import { nanoid } from 'nanoid';

// 内存存储
let memos = [];
let nextId = 1;

/**
 * 格式化备忘录数据
 */
function formatMemo(memo) {
  return {
    id: memo.uid,
    content: memo.content,
    tags: memo.tags || [],
    createdAt: memo.created_at,
    updatedAt: memo.updated_at,
    timestamp: memo.created_at,
    lastModified: memo.updated_at,
    pinned: Boolean(memo.pinned),
    archived: Boolean(memo.archived),
    attachments: []
  };
}

/**
 * 生成备忘录 UID
 */
function generateMemoId() {
  return `memo-${Date.now()}-${nanoid(8)}`;
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

  let filteredMemos = memos.filter(memo => {
    // 不显示已删除的
    if (memo.deleted) return false;
    
    // 筛选条件
    if (pinned !== undefined && Boolean(memo.pinned) !== pinned) {
      return false;
    }
    
    if (archived !== undefined && Boolean(memo.archived) !== archived) {
      return false;
    }
    
    if (tag && !memo.tags.includes(tag)) {
      return false;
    }
    
    if (search && !memo.content.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  // 排序：置顶的在前，然后按创建时间倒序
  filteredMemos.sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return b.pinned - a.pinned; // 置顶的在前
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // 分页
  const total = filteredMemos.length;
  const paginatedMemos = filteredMemos.slice(offset, offset + limit);

  return {
    memos: paginatedMemos.map(formatMemo),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    }
  };
}

/**
 * 获取单个备忘录
 */
export async function getMemo(uid) {
  const memo = memos.find(m => m.uid === uid && !m.deleted);
  return memo ? formatMemo(memo) : null;
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
  
  const memo = {
    id: nextId++,
    uid,
    content: content.trim(),
    tags: Array.isArray(tags) ? tags : [],
    created_at: now,
    updated_at: now,
    pinned: Boolean(pinned),
    archived: false,
    deleted: false
  };
  
  memos.push(memo);
  
  console.log(`✅ 创建备忘录: ${uid} - ${content.substring(0, 50)}...`);
  
  return formatMemo(memo);
}

/**
 * 更新备忘录
 */
export async function updateMemo(uid, updates) {
  const memoIndex = memos.findIndex(m => m.uid === uid && !m.deleted);
  
  if (memoIndex === -1) {
    return null;
  }
  
  const memo = memos[memoIndex];
  const now = new Date().toISOString();
  
  // 更新字段
  if (updates.content !== undefined) {
    memo.content = updates.content;
  }
  if (updates.tags !== undefined) {
    memo.tags = Array.isArray(updates.tags) ? updates.tags : [];
  }
  if (updates.pinned !== undefined) {
    memo.pinned = Boolean(updates.pinned);
  }
  if (updates.archived !== undefined) {
    memo.archived = Boolean(updates.archived);
  }
  
  memo.updated_at = now;
  
  console.log(`✅ 更新备忘录: ${uid}`);
  
  return formatMemo(memo);
}

/**
 * 删除备忘录
 */
export async function deleteMemo(uid) {
  const memo = memos.find(m => m.uid === uid && !m.deleted);
  
  if (!memo) {
    return false;
  }
  
  memo.deleted = true;
  memo.updated_at = new Date().toISOString();
  
  console.log(`✅ 删除备忘录: ${uid}`);
  
  return true;
}

/**
 * 获取标签统计
 */
export async function getTagStats() {
  const tagCount = new Map();
  
  memos.forEach(memo => {
    if (memo.deleted) return;
    
    memo.tags.forEach(tag => {
      if (typeof tag === 'string' && tag.trim()) {
        const normalizedTag = tag.trim();
        tagCount.set(normalizedTag, (tagCount.get(normalizedTag) || 0) + 1);
      }
    });
  });
  
  return Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 获取数据库统计
 */
export async function getDatabaseStats() {
  const activeMemos = memos.filter(m => !m.deleted);
  
  return {
    memos: activeMemos.length,
    attachments: 0,
    databaseSize: JSON.stringify(memos).length,
    databasePath: '内存存储'
  };
}

/**
 * 初始化演示数据
 */
export function initDemoData() {
  if (memos.length === 0) {
    const now = new Date().toISOString();
    
    const demoMemos = [
      {
        id: nextId++,
        uid: generateMemoId(),
        content: '🎉 欢迎使用 Next.js 版本的 MeowNocode！\n\n这是一个完全重写的版本，使用服务器端数据存储，支持真正的跨浏览器数据共享。',
        tags: ['欢迎', 'nextjs'],
        created_at: now,
        updated_at: now,
        pinned: true,
        archived: false,
        deleted: false
      },
      {
        id: nextId++,
        uid: generateMemoId(),
        content: '🌟 主要特性：\n\n- ✅ 跨浏览器数据共享\n- ✅ 服务器端持久化存储\n- ✅ 现代化的 Next.js 架构\n- ✅ 实时数据同步',
        tags: ['特性', '说明'],
        created_at: new Date(Date.now() - 60000).toISOString(),
        updated_at: new Date(Date.now() - 60000).toISOString(),
        pinned: false,
        archived: false,
        deleted: false
      },
      {
        id: nextId++,
        uid: generateMemoId(),
        content: '🔥 测试跨浏览器功能：\n\n1. 在 Chrome 中创建备忘录\n2. 在 Firefox 中打开相同地址\n3. 神奇的时刻：你会看到相同的数据！\n\n这就是服务器端数据存储的威力。',
        tags: ['测试', '跨浏览器'],
        created_at: new Date(Date.now() - 120000).toISOString(),
        updated_at: new Date(Date.now() - 120000).toISOString(),
        pinned: false,
        archived: false,
        deleted: false
      }
    ];
    
    memos.push(...demoMemos);
    console.log('📋 已初始化演示数据');
  }
}

// 自动初始化演示数据
initDemoData();