/**
 * Next.js 版本的数据服务
 * 替代原有的 localStorage + IndexedDB 方案
 * 使用服务器端 SQLite 数据库
 */

import { nextApiClient } from './nextApiClient';
import { toast } from 'sonner';

class NextDataService {
  constructor() {
    this.memoCache = new Map();
    this.attachmentCache = new Map();
    this.subscribers = new Set();
  }

  // === 事件系统 ===
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('订阅者回调错误:', error);
      }
    });
  }

  // === 备忘录管理 ===
  
  /**
   * 获取所有备忘录
   */
  async getAllMemos(options = {}) {
    try {
      const data = await nextApiClient.getMemos(options);
      const memos = data.memos || [];
      
      // 更新缓存
      memos.forEach(memo => {
        this.memoCache.set(memo.id, memo);
      });
      
      this.notify('memosLoaded', { memos, pagination: data.pagination });
      return memos;
    } catch (error) {
      console.error('获取备忘录失败:', error);
      this.notify('error', { type: 'loadMemos', error: error.message });
      throw error;
    }
  }

  /**
   * 获取单个备忘录
   */
  async getMemo(id) {
    // 先检查缓存
    if (this.memoCache.has(id)) {
      return this.memoCache.get(id);
    }

    try {
      const memo = await nextApiClient.getMemo(id);
      this.memoCache.set(id, memo);
      return memo;
    } catch (error) {
      console.error('获取备忘录失败:', error);
      throw error;
    }
  }

  /**
   * 创建备忘录
   */
  async createMemo(memoData) {
    try {
      const newMemo = await nextApiClient.createMemo(memoData);
      this.memoCache.set(newMemo.id, newMemo);
      
      this.notify('memoCreated', newMemo);
      return newMemo;
    } catch (error) {
      console.error('创建备忘录失败:', error);
      this.notify('error', { type: 'createMemo', error: error.message });
      throw error;
    }
  }

  /**
   * 更新备忘录
   */
  async updateMemo(id, updates) {
    try {
      const updatedMemo = await nextApiClient.updateMemo(id, updates);
      this.memoCache.set(id, updatedMemo);
      
      this.notify('memoUpdated', { id, memo: updatedMemo });
      return updatedMemo;
    } catch (error) {
      console.error('更新备忘录失败:', error);
      this.notify('error', { type: 'updateMemo', error: error.message });
      throw error;
    }
  }

  /**
   * 删除备忘录
   */
  async deleteMemo(id) {
    try {
      await nextApiClient.deleteMemo(id);
      this.memoCache.delete(id);
      
      this.notify('memoDeleted', { id });
      return true;
    } catch (error) {
      console.error('删除备忘录失败:', error);
      this.notify('error', { type: 'deleteMemo', error: error.message });
      throw error;
    }
  }

  /**
   * 批量操作备忘录
   */
  async batchUpdateMemos(ids, updates) {
    try {
      const results = await nextApiClient.batchUpdateMemos(ids, updates);
      
      // 更新缓存
      results.forEach(result => {
        if (result.success && result.memo) {
          this.memoCache.set(result.uid, result.memo);
        }
      });
      
      this.notify('memosBatchUpdated', { results });
      return results;
    } catch (error) {
      console.error('批量更新备忘录失败:', error);
      throw error;
    }
  }

  // === 附件管理 ===

  /**
   * 上传附件
   */
  async uploadFile(file, memoId = null) {
    try {
      // 文件大小检查
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new Error(`文件大小超出限制 (最大 ${maxSize / 1024 / 1024}MB)`);
      }

      const attachment = await nextApiClient.uploadAttachment(file, memoId);
      this.attachmentCache.set(attachment.id, attachment);
      
      this.notify('attachmentUploaded', { attachment, memoId });
      return attachment;
    } catch (error) {
      console.error('上传附件失败:', error);
      this.notify('error', { type: 'uploadFile', error: error.message });
      throw error;
    }
  }

  /**
   * 批量上传附件
   */
  async uploadFiles(files, memoId = null) {
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadFile(files[i], memoId);
        results.push(result);
      } catch (error) {
        errors.push({ file: files[i].name, error: error.message });
      }
    }

    if (errors.length > 0) {
      toast.warning(`${results.length} 个文件上传成功, ${errors.length} 个失败`);
    }

    return { results, errors };
  }

  /**
   * 删除附件
   */
  async deleteAttachment(id) {
    try {
      await nextApiClient.deleteAttachment(id);
      this.attachmentCache.delete(id);
      
      this.notify('attachmentDeleted', { id });
      return true;
    } catch (error) {
      console.error('删除附件失败:', error);
      throw error;
    }
  }

  /**
   * 获取附件 URL
   */
  getAttachmentUrl(id, download = false) {
    return nextApiClient.getAttachmentUrl(id, download);
  }

  // === 数据导入导出 ===

  /**
   * 导入 Memos 数据库
   */
  async importMemosDatabase(file) {
    try {
      const result = await nextApiClient.importMemosDb(file);
      
      // 清空缓存，强制重新加载
      this.memoCache.clear();
      this.attachmentCache.clear();
      
      this.notify('databaseImported', result);
      toast.success('数据库导入成功，请刷新页面');
      
      return result;
    } catch (error) {
      console.error('导入数据库失败:', error);
      this.notify('error', { type: 'importDatabase', error: error.message });
      throw error;
    }
  }

  /**
   * 导出数据库
   */
  async exportDatabase() {
    try {
      const blob = await nextApiClient.exportDatabase();
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `meownocode-${timestamp}.db`;
      
      document.body.appendChild(a);
      a.click();
      
      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('数据库导出成功');
      this.notify('databaseExported', { timestamp });
      
    } catch (error) {
      console.error('导出数据库失败:', error);
      this.notify('error', { type: 'exportDatabase', error: error.message });
      throw error;
    }
  }

  // === 搜索和筛选 ===

  /**
   * 搜索备忘录
   */
  async searchMemos(query, options = {}) {
    try {
      const data = await nextApiClient.getMemos({
        search: query,
        ...options
      });
      
      this.notify('searchCompleted', { query, results: data.memos });
      return data.memos;
    } catch (error) {
      console.error('搜索失败:', error);
      throw error;
    }
  }

  /**
   * 按标签获取备忘录
   */
  async getMemosByTag(tag, options = {}) {
    try {
      const data = await nextApiClient.getMemos({
        tag,
        ...options
      });
      
      return data.memos;
    } catch (error) {
      console.error('按标签获取备忘录失败:', error);
      throw error;
    }
  }

  /**
   * 获取标签统计
   */
  async getTagStats() {
    try {
      return await nextApiClient.getTagStats();
    } catch (error) {
      console.error('获取标签统计失败:', error);
      throw error;
    }
  }

  // === 统计信息 ===

  /**
   * 获取应用统计
   */
  async getAppStats() {
    try {
      return await nextApiClient.getStats();
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  // === 健康检查 ===

  /**
   * 检查服务器状态
   */
  async checkHealth() {
    try {
      return await nextApiClient.getHealth();
    } catch (error) {
      console.error('健康检查失败:', error);
      this.notify('error', { type: 'healthCheck', error: error.message });
      throw error;
    }
  }

  // === 缓存管理 ===

  /**
   * 清空缓存
   */
  clearCache() {
    this.memoCache.clear();
    this.attachmentCache.clear();
    this.notify('cacheCleared', {});
  }

  /**
   * 获取缓存状态
   */
  getCacheStats() {
    return {
      memos: this.memoCache.size,
      attachments: this.attachmentCache.size,
      subscribers: this.subscribers.size
    };
  }

  // === 兼容性方法 (为了兼容现有代码) ===

  /**
   * 兼容原有的 saveMemo 方法
   */
  async saveMemo(memo) {
    if (memo.id) {
      return await this.updateMemo(memo.id, memo);
    } else {
      return await this.createMemo(memo);
    }
  }

  /**
   * 兼容原有的 loadMemos 方法
   */
  async loadMemos() {
    return await this.getAllMemos();
  }
}

// 创建全局实例
export const nextDataService = new NextDataService();

// React Hook 集成
import { useState, useEffect, useCallback } from 'react';

/**
 * 使用数据服务的 React Hook
 */
export function useNextDataService() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = nextDataService.subscribe((event, data) => {
      if (event === 'error') {
        setError(data.error);
      }
    });

    return unsubscribe;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    dataService: nextDataService,
    loading,
    error,
    clearError
  };
}