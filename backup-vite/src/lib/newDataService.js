/**
 * 新版数据服务
 * 使用存储管理器提供统一的数据访问接口
 * 支持多种存储方式的无缝切换
 */

import { storageManager } from './storage/StorageManager.js';
import { toast } from 'sonner';

class NewDataService {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
  }

  // === 初始化 ===

  async initialize() {
    if (this.initPromise) {
      return await this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return await this.initPromise;
  }

  async _doInitialize() {
    if (this.initialized) return true;

    try {
      console.log('🚀 初始化新版数据服务...');
      
      // 初始化存储管理器
      await storageManager.initialize();
      
      this.initialized = true;
      console.log('✅ 新版数据服务初始化完成');
      
      // 显示当前使用的存储类型
      const currentType = storageManager.getCurrentStorageType();
      const typeConfigs = storageManager.getSupportedStorageTypes();
      const currentTypeInfo = typeConfigs.find(t => t.type === currentType);
      
      if (currentTypeInfo) {
        toast.success(`已启用 ${currentTypeInfo.name} 存储`, {
          description: currentTypeInfo.description,
          duration: 3000
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ 新版数据服务初始化失败:', error);
      toast.error(`数据服务初始化失败: ${error.message}`);
      throw error;
    }
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // === 备忘录相关方法 ===

  async getMemos() {
    await this.ensureInitialized();
    try {
      return await storageManager.getMemos({ pinned: false });
    } catch (error) {
      console.error('获取备忘录失败:', error);
      toast.error(`获取备忘录失败: ${error.message}`);
      return [];
    }
  }

  async getPinnedMemos() {
    await this.ensureInitialized();
    try {
      return await storageManager.getPinnedMemos();
    } catch (error) {
      console.error('获取置顶备忘录失败:', error);
      toast.error(`获取置顶备忘录失败: ${error.message}`);
      return [];
    }
  }

  async getAllMemos() {
    await this.ensureInitialized();
    try {
      return await storageManager.getMemos();
    } catch (error) {
      console.error('获取所有备忘录失败:', error);
      toast.error(`获取备忘录失败: ${error.message}`);
      return [];
    }
  }

  async createMemo(memoData) {
    await this.ensureInitialized();
    try {
      const result = await storageManager.createMemo(memoData);
      toast.success('备忘录已保存');
      
      // 触发数据变更事件
      this.dispatchDataChangedEvent('create');
      
      return result;
    } catch (error) {
      console.error('创建备忘录失败:', error);
      toast.error(`保存失败: ${error.message}`);
      throw error;
    }
  }

  async updateMemo(id, updateData) {
    await this.ensureInitialized();
    try {
      const result = await storageManager.updateMemo(id, updateData);
      toast.success('备忘录已更新');
      
      // 触发数据变更事件
      this.dispatchDataChangedEvent('update');
      
      return result;
    } catch (error) {
      console.error('更新备忘录失败:', error);
      toast.error(`更新失败: ${error.message}`);
      throw error;
    }
  }

  async deleteMemo(id) {
    await this.ensureInitialized();
    try {
      const result = await storageManager.deleteMemo(id);
      toast.success('备忘录已删除');
      
      // 触发数据变更事件
      this.dispatchDataChangedEvent('delete');
      
      return result;
    } catch (error) {
      console.error('删除备忘录失败:', error);
      toast.error(`删除失败: ${error.message}`);
      throw error;
    }
  }

  // === 附件相关方法 ===

  async uploadAttachment(file, options = {}) {
    await this.ensureInitialized();
    try {
      return await storageManager.uploadAttachment(file, options);
    } catch (error) {
      console.error('上传附件失败:', error);
      toast.error(`上传失败: ${error.message}`);
      throw error;
    }
  }

  getAttachmentURL(attachmentId) {
    return storageManager.getAttachmentURL(attachmentId);
  }

  async deleteAttachment(attachmentId) {
    await this.ensureInitialized();
    try {
      return await storageManager.deleteAttachment(attachmentId);
    } catch (error) {
      console.error('删除附件失败:', error);
      toast.error(`删除附件失败: ${error.message}`);
      throw error;
    }
  }

  // === 批量操作 ===

  async batchOperation(operations) {
    await this.ensureInitialized();
    try {
      const result = await storageManager.batchOperation(operations);
      
      const successful = result.filter(r => r.success).length;
      const failed = result.filter(r => !r.success).length;
      
      if (successful > 0) {
        toast.success(`批量操作完成: ${successful} 成功${failed > 0 ? `, ${failed} 失败` : ''}`);
      }
      
      if (failed > 0 && successful === 0) {
        toast.error(`批量操作失败: ${failed} 个操作失败`);
      }
      
      // 触发数据变更事件
      if (successful > 0) {
        this.dispatchDataChangedEvent('batch');
      }
      
      return result;
    } catch (error) {
      console.error('批量操作失败:', error);
      toast.error(`批量操作失败: ${error.message}`);
      throw error;
    }
  }

  // === 数据导入导出 ===

  async importData(memos, pinnedMemos = []) {
    await this.ensureInitialized();
    try {
      const result = await storageManager.importData(memos, pinnedMemos);
      
      if (result.successful > 0) {
        toast.success(`导入完成: ${result.successful} 条记录`);
        
        // 触发数据变更事件
        this.dispatchDataChangedEvent('import');
      }
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} 条记录导入失败`);
      }
      
      return result;
    } catch (error) {
      console.error('数据导入失败:', error);
      toast.error(`导入失败: ${error.message}`);
      throw error;
    }
  }

  async exportData() {
    await this.ensureInitialized();
    try {
      return await storageManager.exportData();
    } catch (error) {
      console.error('数据导出失败:', error);
      toast.error(`导出失败: ${error.message}`);
      throw error;
    }
  }

  // === 存储管理 ===

  async getStorageInfo() {
    await this.ensureInitialized();
    try {
      return await storageManager.getStorageStats();
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return null;
    }
  }

  getCurrentStorageType() {
    return storageManager.getCurrentStorageType();
  }

  getSupportedStorageTypes() {
    return storageManager.getSupportedStorageTypes();
  }

  async switchStorageType(type, config = {}, migrateData = true) {
    await this.ensureInitialized();
    try {
      await storageManager.switchStorageType(type, config, migrateData);
      
      // 触发存储变更事件
      this.dispatchStorageChangedEvent(type, config);
      
      return true;
    } catch (error) {
      console.error('切换存储类型失败:', error);
      toast.error(`切换失败: ${error.message}`);
      throw error;
    }
  }

  async testStorageType(type, config = {}) {
    return await storageManager.testStorageType(type, config);
  }

  // === 健康检查 ===

  async healthCheck() {
    try {
      if (!this.initialized) {
        return { healthy: false, reason: '服务未初始化' };
      }
      
      const isHealthy = await storageManager.healthCheck();
      const storageType = storageManager.getCurrentStorageType();
      
      return {
        healthy: isHealthy,
        storageType,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // === 特殊功能 ===

  // 导入数据库文件（仅限本地DB模式）
  async importDatabaseFile(file) {
    await this.ensureInitialized();
    try {
      await storageManager.importDatabaseFile(file);
      toast.success('数据库文件导入成功');
      
      // 触发数据变更事件
      this.dispatchDataChangedEvent('database_import');
    } catch (error) {
      console.error('导入数据库文件失败:', error);
      toast.error(`导入失败: ${error.message}`);
      throw error;
    }
  }

  // 导出数据库文件（仅限本地DB模式）
  async exportDatabaseFile() {
    await this.ensureInitialized();
    try {
      return await storageManager.exportDatabaseFile();
    } catch (error) {
      console.error('导出数据库文件失败:', error);
      toast.error(`导出失败: ${error.message}`);
      throw error;
    }
  }

  // === 兼容性方法 ===

  // 兼容旧版本的方法名
  async saveLocalMemo(memoData) {
    return this.createMemo(memoData);
  }

  async updateLocalMemo(id, memoData) {
    return this.updateMemo(id, memoData);
  }

  async deleteLocalMemo(id) {
    return this.deleteMemo(id);
  }

  getLocalMemos() {
    return this.getMemos();
  }

  getLocalPinnedMemos() {
    return this.getPinnedMemos();
  }

  // === 事件管理 ===

  dispatchDataChangedEvent(changeType) {
    try {
      window.dispatchEvent(new CustomEvent('app:dataChanged', {
        detail: {
          part: `storage.${changeType}`,
          storageType: storageManager.getCurrentStorageType(),
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.warn('触发数据变更事件失败:', error);
    }
  }

  dispatchStorageChangedEvent(newType, newConfig) {
    try {
      window.dispatchEvent(new CustomEvent('app:storageChanged', {
        detail: {
          newType,
          newConfig,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.warn('触发存储变更事件失败:', error);
    }
  }

  // === 生命周期管理 ===

  async destroy() {
    try {
      await storageManager.destroy();
      this.initialized = false;
      this.initPromise = null;
      
      console.log('🔄 数据服务已销毁');
    } catch (error) {
      console.error('销毁数据服务失败:', error);
    }
  }
}

// 创建全局实例
export const newDataService = new NewDataService();

// 默认导出
export default newDataService;