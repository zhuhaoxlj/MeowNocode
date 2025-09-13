/**
 * 数据服务 - 统一的数据存储接口
 * 自动检测并使用最佳存储方案：后端 API > 本地存储
 */

import apiClient from './apiClient';
import { toast } from 'sonner';

class DataService {
  constructor() {
    this.useBackend = false;
    this.backendChecked = false;
    this.initPromise = this.initialize();
  }

  // 初始化：检测后端可用性
  async initialize() {
    if (this.backendChecked) return this.useBackend;

    try {
      console.log('🔍 检测后端服务可用性...');
      const isHealthy = await apiClient.healthCheck();
      
      if (isHealthy) {
        await apiClient.initialize();
        this.useBackend = true;
        console.log('✅ 后端服务可用，使用服务器存储');
        
        // 可选：同步本地数据到服务器
        await this.syncLocalToServer();
      } else {
        console.log('⚠️  后端服务不可用，使用本地存储');
        this.useBackend = false;
      }
    } catch (error) {
      console.log('⚠️  后端连接失败，使用本地存储:', error.message);
      this.useBackend = false;
    }

    this.backendChecked = true;
    return this.useBackend;
  }

  // 确保已初始化
  async ensureInitialized() {
    await this.initPromise;
  }

  // 获取普通备忘录
  async getMemos() {
    await this.ensureInitialized();

    if (this.useBackend) {
      try {
        return await apiClient.getNormalMemos();
      } catch (error) {
        console.error('后端获取失败，回退到本地存储:', error);
        return this.getLocalMemos();
      }
    } else {
      return this.getLocalMemos();
    }
  }

  // 获取置顶备忘录
  async getPinnedMemos() {
    await this.ensureInitialized();

    if (this.useBackend) {
      try {
        return await apiClient.getPinnedMemos();
      } catch (error) {
        console.error('后端获取失败，回退到本地存储:', error);
        return this.getLocalPinnedMemos();
      }
    } else {
      return this.getLocalPinnedMemos();
    }
  }

  // 创建备忘录
  async createMemo(memoData) {
    await this.ensureInitialized();

    if (this.useBackend) {
      try {
        const result = await apiClient.createMemo(memoData);
        toast.success('备忘录已保存到服务器');
        return result;
      } catch (error) {
        console.error('后端保存失败，保存到本地:', error);
        toast.warning('服务器保存失败，已保存到本地');
        return this.saveLocalMemo(memoData);
      }
    } else {
      return this.saveLocalMemo(memoData);
    }
  }

  // 更新备忘录
  async updateMemo(id, memoData) {
    await this.ensureInitialized();

    if (this.useBackend) {
      try {
        const result = await apiClient.updateMemo(id, memoData);
        toast.success('备忘录已更新');
        return result;
      } catch (error) {
        console.error('后端更新失败:', error);
        toast.error('更新失败');
        throw error;
      }
    } else {
      return this.updateLocalMemo(id, memoData);
    }
  }

  // 删除备忘录
  async deleteMemo(id) {
    await this.ensureInitialized();

    if (this.useBackend) {
      try {
        const result = await apiClient.deleteMemo(id);
        toast.success('备忘录已删除');
        return result;
      } catch (error) {
        console.error('后端删除失败:', error);
        toast.error('删除失败');
        throw error;
      }
    } else {
      return this.deleteLocalMemo(id);
    }
  }

  // 上传附件
  async uploadAttachment(file) {
    await this.ensureInitialized();

    if (this.useBackend) {
      try {
        const result = await apiClient.uploadAttachment(file);
        return {
          id: result.id,
          url: result.url,
          filename: result.filename,
          type: result.type,
          size: result.size
        };
      } catch (error) {
        console.error('后端上传失败，使用本地存储:', error);
        toast.warning('服务器上传失败，使用本地存储');
        return this.uploadLocalFile(file);
      }
    } else {
      return this.uploadLocalFile(file);
    }
  }

  // 获取附件URL
  getAttachmentURL(attachmentId, isLocal = false) {
    if (this.useBackend && !isLocal) {
      return apiClient.getAttachmentURL(attachmentId);
    } else {
      // 本地附件处理逻辑
      return `./local/${attachmentId}`;
    }
  }

  // === 本地存储方法 ===

  getLocalMemos() {
    return JSON.parse(localStorage.getItem('memos') || '[]');
  }

  getLocalPinnedMemos() {
    return JSON.parse(localStorage.getItem('pinnedMemos') || '[]');
  }

  saveLocalMemo(memoData) {
    const memos = this.getLocalMemos();
    const newMemo = {
      id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      ...memoData
    };
    
    memos.unshift(newMemo);
    localStorage.setItem('memos', JSON.stringify(memos));
    
    return newMemo;
  }

  updateLocalMemo(id, memoData) {
    const memos = this.getLocalMemos();
    const pinnedMemos = this.getLocalPinnedMemos();
    
    // 查找并更新
    let found = false;
    
    // 检查普通备忘录
    for (let i = 0; i < memos.length; i++) {
      if (memos[i].id === id) {
        memos[i] = { ...memos[i], ...memoData, updatedAt: new Date().toISOString() };
        localStorage.setItem('memos', JSON.stringify(memos));
        found = true;
        break;
      }
    }
    
    // 检查置顶备忘录
    if (!found) {
      for (let i = 0; i < pinnedMemos.length; i++) {
        if (pinnedMemos[i].id === id) {
          pinnedMemos[i] = { ...pinnedMemos[i], ...memoData, updatedAt: new Date().toISOString() };
          localStorage.setItem('pinnedMemos', JSON.stringify(pinnedMemos));
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      throw new Error('备忘录不存在');
    }
    
    return { message: '更新成功' };
  }

  deleteLocalMemo(id) {
    let memos = this.getLocalMemos();
    let pinnedMemos = this.getLocalPinnedMemos();
    
    const originalMemoCount = memos.length;
    const originalPinnedCount = pinnedMemos.length;
    
    // 从两个列表中删除
    memos = memos.filter(memo => memo.id !== id);
    pinnedMemos = pinnedMemos.filter(memo => memo.id !== id);
    
    if (memos.length === originalMemoCount && pinnedMemos.length === originalPinnedCount) {
      throw new Error('备忘录不存在');
    }
    
    localStorage.setItem('memos', JSON.stringify(memos));
    localStorage.setItem('pinnedMemos', JSON.stringify(pinnedMemos));
    
    return { message: '删除成功' };
  }

  async uploadLocalFile(file) {
    // 使用现有的文件存储服务
    const fileStorageService = (await import('./fileStorageService')).default;
    const result = await fileStorageService.uploadToIndexedDB(file, { type: 'image' });
    
    return {
      id: result.id,
      url: `./local/${result.id}`,
      filename: result.name || file.name,
      type: result.type || file.type,
      size: result.size || file.size,
      isLocal: true
    };
  }

  // 同步本地数据到服务器
  async syncLocalToServer() {
    try {
      const localMemos = this.getLocalMemos();
      const pinnedMemos = this.getLocalPinnedMemos();
      
      if (localMemos.length === 0 && pinnedMemos.length === 0) {
        console.log('📝 无本地数据需要同步');
        return;
      }
      
      console.log(`🔄 开始同步本地数据: ${localMemos.length + pinnedMemos.length} 条记录`);
      
      const result = await apiClient.syncLocalData(localMemos, pinnedMemos);
      
      if (result.successful > 0) {
        toast.success(`成功同步 ${result.successful} 条记录到服务器`);
        
        // 可选：清理本地数据（用户确认后）
        // this.offerToCleanupLocal();
      }
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} 条记录同步失败`);
      }
      
    } catch (error) {
      console.error('同步失败:', error);
      // 不显示错误 toast，因为这是后台操作
    }
  }

  // 提供清理本地数据的选项
  offerToCleanupLocal() {
    if (confirm('数据已成功同步到服务器，是否清理本地缓存数据？')) {
      localStorage.removeItem('memos');
      localStorage.removeItem('pinnedMemos');
      toast.success('本地数据已清理');
    }
  }

  // 获取存储状态信息
  async getStorageInfo() {
    await this.ensureInitialized();
    
    const localMemos = this.getLocalMemos().length;
    const localPinned = this.getLocalPinnedMemos().length;
    
    return {
      useBackend: this.useBackend,
      backendHealthy: this.useBackend,
      localMemos,
      localPinned,
      totalLocal: localMemos + localPinned,
    };
  }

  // 强制切换到本地模式（调试用）
  forceLocalMode() {
    this.useBackend = false;
    console.log('🔄 强制切换到本地存储模式');
  }

  // 重新检测后端（重试连接）
  async retryBackend() {
    this.backendChecked = false;
    this.initPromise = this.initialize();
    await this.initPromise;
    return this.useBackend;
  }
}

// 创建全局实例
const dataService = new DataService();

export default dataService;