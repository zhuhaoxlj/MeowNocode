/**
 * 浏览器存储适配器
 * 使用 localStorage + IndexedDB，兼容现有的存储方式
 */

import { StorageAdapter } from './StorageAdapter.js';
import fileStorageService from '../fileStorageService.js';

export class BrowserStorageAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);
  }

  // === 基础方法 ===

  async initialize() {
    if (this.initialized) return true;

    try {
      // 检查浏览器支持
      if (typeof localStorage === 'undefined' || typeof indexedDB === 'undefined') {
        throw new Error('浏览器不支持 localStorage 或 IndexedDB');
      }
      
      this.initialized = true;
      console.log('✅ 浏览器存储适配器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 浏览器存储适配器初始化失败:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      // 测试 localStorage
      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  // === 备忘录相关方法 ===

  async createMemo(memoData) {
    if (!this.initialized) await this.initialize();
    
    const validation = this.validateMemoData(memoData);
    if (!validation.isValid) {
      throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
    }
    
    const normalizedData = this.normalizeMemoData(memoData);
    
    try {
      if (normalizedData.pinned) {
        // 置顶备忘录
        const pinnedMemos = this.getLocalPinnedMemos();
        pinnedMemos.unshift(normalizedData);
        localStorage.setItem('pinnedMemos', JSON.stringify(pinnedMemos));
      } else {
        // 普通备忘录
        const memos = this.getLocalMemos();
        memos.unshift(normalizedData);
        localStorage.setItem('memos', JSON.stringify(memos));
      }
      
      return normalizedData;
    } catch (error) {
      console.error('创建备忘录失败:', error);
      throw error;
    }
  }

  async getMemos(options = {}) {
    if (!this.initialized) await this.initialize();
    
    const { pinned, limit, offset = 0 } = options;
    
    let results = [];
    
    if (pinned === undefined) {
      // 获取所有备忘录
      results = [...this.getLocalMemos(), ...this.getLocalPinnedMemos()];
    } else if (pinned) {
      // 只获取置顶备忘录
      results = this.getLocalPinnedMemos();
    } else {
      // 只获取普通备忘录
      results = this.getLocalMemos();
    }
    
    // 按时间排序
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 分页
    if (limit) {
      results = results.slice(offset, offset + limit);
    } else if (offset > 0) {
      results = results.slice(offset);
    }
    
    return results;
  }

  async updateMemo(id, updateData) {
    if (!this.initialized) await this.initialize();
    
    try {
      const now = new Date().toISOString();
      let found = false;
      
      // 更新普通备忘录
      const memos = this.getLocalMemos();
      for (let i = 0; i < memos.length; i++) {
        if (memos[i].id === id) {
          memos[i] = {
            ...memos[i],
            ...updateData,
            updatedAt: now,
            lastModified: now
          };
          found = true;
          break;
        }
      }
      
      if (found) {
        localStorage.setItem('memos', JSON.stringify(memos));
      } else {
        // 更新置顶备忘录
        const pinnedMemos = this.getLocalPinnedMemos();
        for (let i = 0; i < pinnedMemos.length; i++) {
          if (pinnedMemos[i].id === id) {
            pinnedMemos[i] = {
              ...pinnedMemos[i],
              ...updateData,
              updatedAt: now,
              lastModified: now
            };
            found = true;
            break;
          }
        }
        
        if (found) {
          localStorage.setItem('pinnedMemos', JSON.stringify(pinnedMemos));
        }
      }
      
      if (!found) {
        throw new Error('备忘录不存在');
      }
      
      return { message: '更新成功', updatedAt: now };
    } catch (error) {
      console.error('更新备忘录失败:', error);
      throw error;
    }
  }

  async deleteMemo(id) {
    if (!this.initialized) await this.initialize();
    
    try {
      let found = false;
      
      // 从普通备忘录中删除
      let memos = this.getLocalMemos();
      const originalMemoCount = memos.length;
      memos = memos.filter(memo => memo.id !== id);
      
      if (memos.length < originalMemoCount) {
        found = true;
        localStorage.setItem('memos', JSON.stringify(memos));
      }
      
      // 从置顶备忘录中删除
      let pinnedMemos = this.getLocalPinnedMemos();
      const originalPinnedCount = pinnedMemos.length;
      pinnedMemos = pinnedMemos.filter(memo => memo.id !== id);
      
      if (pinnedMemos.length < originalPinnedCount) {
        found = true;
        localStorage.setItem('pinnedMemos', JSON.stringify(pinnedMemos));
      }
      
      if (!found) {
        throw new Error('备忘录不存在');
      }
      
      return { message: '删除成功' };
    } catch (error) {
      console.error('删除备忘录失败:', error);
      throw error;
    }
  }

  // === 附件相关方法 ===

  async uploadAttachment(file, options = {}) {
    if (!this.initialized) await this.initialize();
    
    try {
      // 使用现有的文件存储服务
      const result = await fileStorageService.uploadToIndexedDB(file, { type: 'image' });
      
      return {
        id: result.id,
        filename: result.name || file.name,
        type: result.type || file.type,
        size: result.size || file.size,
        url: `./local/${result.id}`,
        isLocal: true
      };
    } catch (error) {
      console.error('上传附件失败:', error);
      throw error;
    }
  }

  getAttachmentURL(attachmentId) {
    return `./local/${attachmentId}`;
  }

  async deleteAttachment(attachmentId) {
    try {
      // 使用现有的文件存储服务删除文件
      await fileStorageService.deleteFile({
        id: attachmentId,
        storageType: 'indexeddb'
      });
      
      return { message: '附件删除成功' };
    } catch (error) {
      console.error('删除附件失败:', error);
      throw error;
    }
  }

  // === 数据导入导出 ===

  async importData(memos, pinnedMemos = []) {
    if (!this.initialized) await this.initialize();
    
    try {
      const existingMemos = this.getLocalMemos();
      const existingPinned = this.getLocalPinnedMemos();
      
      // 合并数据，避免重复
      const existingIds = new Set([
        ...existingMemos.map(m => m.id),
        ...existingPinned.map(m => m.id)
      ]);
      
      const newMemos = memos.filter(m => !existingIds.has(m.id));
      const newPinned = pinnedMemos.filter(m => !existingIds.has(m.id));
      
      // 保存合并后的数据
      const mergedMemos = [...existingMemos, ...newMemos];
      const mergedPinned = [...existingPinned, ...newPinned];
      
      localStorage.setItem('memos', JSON.stringify(mergedMemos));
      localStorage.setItem('pinnedMemos', JSON.stringify(mergedPinned));
      
      // 触发数据变更事件
      window.dispatchEvent(new CustomEvent('app:dataChanged', { 
        detail: { part: 'storage.import' } 
      }));
      
      return {
        successful: newMemos.length + newPinned.length,
        failed: 0,
        duplicates: (memos.length - newMemos.length) + (pinnedMemos.length - newPinned.length)
      };
    } catch (error) {
      console.error('数据导入失败:', error);
      throw error;
    }
  }

  async exportData() {
    if (!this.initialized) await this.initialize();
    
    const memos = this.getLocalMemos();
    const pinnedMemos = this.getLocalPinnedMemos();
    
    return {
      memos,
      pinnedMemos,
      metadata: {
        exportedAt: new Date().toISOString(),
        adapterType: 'BrowserStorageAdapter',
        totalCount: memos.length + pinnedMemos.length
      }
    };
  }

  // === 统计信息 ===

  async getStorageStats() {
    if (!this.initialized) await this.initialize();
    
    try {
      const memos = this.getLocalMemos();
      const pinnedMemos = this.getLocalPinnedMemos();
      
      // 获取 IndexedDB 存储信息
      let indexedDBStats = null;
      try {
        indexedDBStats = await fileStorageService.getStorageStats();
      } catch (error) {
        console.warn('获取 IndexedDB 统计失败:', error);
      }
      
      // 计算 localStorage 使用量
      let localStorageSize = 0;
      try {
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            localStorageSize += localStorage[key].length;
          }
        }
      } catch (error) {
        console.warn('计算 localStorage 大小失败:', error);
      }
      
      return {
        adapterType: 'BrowserStorageAdapter',
        totalMemos: memos.length,
        pinnedMemos: pinnedMemos.length,
        totalCount: memos.length + pinnedMemos.length,
        localStorage: {
          totalSizeBytes: localStorageSize,
          totalSizeKB: Math.round(localStorageSize / 1024 * 100) / 100,
          available: true
        },
        indexedDB: indexedDBStats?.indexeddb || null,
        initialized: this.initialized,
        healthy: await this.healthCheck(),
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        adapterType: 'BrowserStorageAdapter',
        error: error.message,
        healthy: false,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // === 本地存储工具方法 ===

  getLocalMemos() {
    try {
      return JSON.parse(localStorage.getItem('memos') || '[]');
    } catch (error) {
      console.error('读取本地备忘录失败:', error);
      return [];
    }
  }

  getLocalPinnedMemos() {
    try {
      return JSON.parse(localStorage.getItem('pinnedMemos') || '[]');
    } catch (error) {
      console.error('读取置顶备忘录失败:', error);
      return [];
    }
  }

  // === 数据清理 ===

  async clearAllData() {
    try {
      localStorage.removeItem('memos');
      localStorage.removeItem('pinnedMemos');
      localStorage.removeItem('lastCloudSyncAt');
      
      // 清理 IndexedDB 中的文件
      try {
        // 这里可以添加清理 IndexedDB 文件的逻辑
        console.log('清理 IndexedDB 文件数据...');
      } catch (error) {
        console.warn('清理 IndexedDB 失败:', error);
      }
      
      // 触发数据变更事件
      window.dispatchEvent(new CustomEvent('app:dataChanged', { 
        detail: { part: 'storage.clear' } 
      }));
      
      return { message: '所有数据已清空' };
    } catch (error) {
      console.error('清空数据失败:', error);
      throw error;
    }
  }
}