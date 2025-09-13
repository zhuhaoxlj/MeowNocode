/**
 * 附件服务层
 * 处理文件上传、存储和管理
 */

import { getStatement, transaction } from './database';
import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';

// 附件存储配置
const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'text/plain',
  'application/pdf',
  'application/json'
];

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * 生成附件 UID
 */
function generateAttachmentId() {
  return `att-${Date.now()}-${nanoid(8)}`;
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename, mimeType) {
  // 先从文件名获取扩展名
  const extFromName = path.extname(filename).toLowerCase();
  if (extFromName) return extFromName;
  
  // 从 MIME 类型推断扩展名
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'text/plain': '.txt',
    'application/pdf': '.pdf',
    'application/json': '.json'
  };
  
  return mimeToExt[mimeType] || '';
}

/**
 * 生成安全的文件名
 */
function generateSafeFilename(originalName, mimeType) {
  const timestamp = Date.now();
  const randomId = nanoid(6);
  const ext = getFileExtension(originalName, mimeType);
  
  // 清理原始文件名
  const baseName = path.basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '-')
    .substring(0, 50);
  
  return `${timestamp}-${randomId}-${baseName}${ext}`;
}

/**
 * 验证文件
 */
function validateFile(file) {
  if (!file) {
    throw new Error('没有提供文件');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件大小超出限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`不支持的文件类型: ${file.type}`);
  }
  
  return true;
}

/**
 * 上传附件
 */
export function uploadAttachment(file, memoId = null) {
  validateFile(file);
  
  const uid = generateAttachmentId();
  const now = new Date().toISOString();
  const safeFilename = generateSafeFilename(file.originalname || file.name, file.mimetype || file.type);
  const filePath = path.join(UPLOAD_DIR, safeFilename);
  
  const uploadTransaction = transaction((file, uid, memoId, filePath, now) => {
    // 移动上传的文件到目标位置
    if (file.path) {
      // 来自 multer 的文件
      fs.renameSync(file.path, filePath);
    } else if (file.filepath) {
      // 来自 formidable 的文件
      fs.renameSync(file.filepath, filePath);
    } else {
      throw new Error('无法处理上传的文件');
    }
    
    // 获取实际文件大小
    const stats = fs.statSync(filePath);
    
    // 保存附件记录
    const sql = `
      INSERT INTO attachments (uid, memo_id, filename, original_name, type, size, file_path, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = getStatement(sql);
    stmt.run(
      uid,
      memoId ? getStatement('SELECT id FROM memos WHERE uid = ?').get(memoId)?.id : null,
      safeFilename,
      file.originalname || file.name,
      file.mimetype || file.type,
      stats.size,
      filePath,
      now
    );
    
    return {
      id: uid,
      filename: safeFilename,
      originalName: file.originalname || file.name,
      type: file.mimetype || file.type,
      size: stats.size,
      url: `/api/attachments/${uid}`,
      createdAt: now
    };
  });
  
  try {
    return uploadTransaction(file, uid, memoId, filePath, now);
  } catch (error) {
    // 清理上传失败的文件
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.warn('清理失败的上传文件时出错:', cleanupError.message);
    }
    
    throw error;
  }
}

/**
 * 获取附件信息
 */
export function getAttachment(uid) {
  const sql = `
    SELECT a.*, m.uid as memo_uid
    FROM attachments a
    LEFT JOIN memos m ON a.memo_id = m.id
    WHERE a.uid = ?
  `;
  
  const stmt = getStatement(sql);
  const row = stmt.get(uid);
  
  if (!row) return null;
  
  return {
    id: row.uid,
    filename: row.filename,
    originalName: row.original_name,
    type: row.type,
    size: row.size,
    filePath: row.file_path,
    url: `/api/attachments/${row.uid}`,
    createdAt: row.created_at,
    memoId: row.memo_uid
  };
}

/**
 * 获取备忘录的所有附件
 */
export function getAttachmentsByMemo(memoId) {
  const sql = `
    SELECT * FROM attachments 
    WHERE memo_id = (SELECT id FROM memos WHERE uid = ?)
    ORDER BY created_at DESC
  `;
  
  const stmt = getStatement(sql);
  const rows = stmt.all(memoId);
  
  return rows.map(row => ({
    id: row.uid,
    filename: row.filename,
    originalName: row.original_name,
    type: row.type,
    size: row.size,
    url: `/api/attachments/${row.uid}`,
    createdAt: row.created_at
  }));
}

/**
 * 删除附件
 */
export function deleteAttachment(uid) {
  const deleteAttachmentTransaction = transaction((uid) => {
    // 获取附件信息
    const attachment = getAttachment(uid);
    if (!attachment) return false;
    
    // 删除数据库记录
    const sql = 'DELETE FROM attachments WHERE uid = ?';
    const stmt = getStatement(sql);
    const result = stmt.run(uid);
    
    if (result.changes === 0) return false;
    
    // 删除物理文件
    try {
      if (fs.existsSync(attachment.filePath)) {
        fs.unlinkSync(attachment.filePath);
        console.log('✅ 已删除附件文件:', attachment.filePath);
      }
    } catch (error) {
      console.warn('删除附件文件失败:', error.message);
      // 不抛出错误，因为数据库记录已经删除
    }
    
    return true;
  });
  
  return deleteAttachmentTransaction(uid);
}

/**
 * 批量删除附件
 */
export function batchDeleteAttachments(uids) {
  if (!Array.isArray(uids) || uids.length === 0) {
    throw new Error('附件 ID 列表不能为空');
  }
  
  const batchDelete = transaction((uids) => {
    const results = [];
    
    for (const uid of uids) {
      try {
        const success = deleteAttachment(uid);
        results.push({ uid, success });
      } catch (error) {
        results.push({ uid, success: false, error: error.message });
      }
    }
    
    return results;
  });
  
  return batchDelete(uids);
}

/**
 * 清理孤立的附件
 */
export function cleanupOrphanedAttachments() {
  const sql = `
    SELECT a.uid, a.file_path
    FROM attachments a
    LEFT JOIN memos m ON a.memo_id = m.id
    WHERE m.id IS NULL OR m.deleted = 1
  `;
  
  const stmt = getStatement(sql);
  const orphanedAttachments = stmt.all();
  
  if (orphanedAttachments.length === 0) {
    return { cleaned: 0, errors: [] };
  }
  
  const cleanup = transaction(() => {
    let cleaned = 0;
    const errors = [];
    
    for (const attachment of orphanedAttachments) {
      try {
        // 删除数据库记录
        const deleteStmt = getStatement('DELETE FROM attachments WHERE uid = ?');
        deleteStmt.run(attachment.uid);
        
        // 删除物理文件
        if (fs.existsSync(attachment.file_path)) {
          fs.unlinkSync(attachment.file_path);
        }
        
        cleaned++;
      } catch (error) {
        errors.push({ uid: attachment.uid, error: error.message });
      }
    }
    
    return { cleaned, errors };
  });
  
  const result = cleanup();
  console.log(`🧹 清理了 ${result.cleaned} 个孤立附件`);
  
  return result;
}

/**
 * 获取附件统计信息
 */
export function getAttachmentStats() {
  const totalSql = 'SELECT COUNT(*) as total, SUM(size) as total_size FROM attachments';
  const typeSql = 'SELECT type, COUNT(*) as count, SUM(size) as size FROM attachments GROUP BY type';
  
  const totalStmt = getStatement(totalSql);
  const typeStmt = getStatement(typeSql);
  
  const total = totalStmt.get();
  const byType = typeStmt.all();
  
  return {
    total: total.total || 0,
    totalSize: total.total_size || 0,
    byType: byType.map(row => ({
      type: row.type,
      count: row.count,
      size: row.size
    }))
  };
}