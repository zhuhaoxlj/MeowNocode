/**
 * 存储管理器
 * 统一的存储接口，自动选择和管理不同的存储适配器
 * 提供存储类型切换、配置管理、数据迁移等功能
 */

import { storageFactory, STORAGE_TYPES, STORAGE_TYPE_CONFIGS } from './StorageFactory.js';
import { toast } from 'sonner';

export class StorageManager {
  constructor() {
    this.currentAdapter = null;
    this.currentType = null;
    this.currentConfig = null;
    this.initPromise = null;
    this.configKey = 'storage_config';
    this.fallbackType = STORAGE_TYPES.BROWSER; // 降级存储类型
  }

  // === 初始化和配置管理 ===

  /**
   * 初始化存储管理器
   * @returns {Promise<boolean>} 是否初始化成功
   */
  async initialize() {
    if (this.initPromise) {
      return await this.initPromise;
    }

    this.initPromise = this._doInitialize();
    return await this.initPromise;
  }

  async _doInitialize() {
    try {
      console.log('🔄 初始化存储管理器...');

      // 加载保存的配置
      const savedConfig = this.loadConfig();
      
      let targetType = savedConfig.type || storageFactory.getDefaultStorageType();
      let targetConfig = savedConfig.config || {};

      // 尝试初始化首选存储类型
      let adapter = null;
      try {
        adapter = await storageFactory.createAdapter(targetType, targetConfig);
        console.log(`✅ 使用 ${STORAGE_TYPE_CONFIGS[targetType]?.name} 存储`);
      } catch (error) {
        console.warn(`❌ ${STORAGE_TYPE_CONFIGS[targetType]?.name} 不可用:`, error.message);
        
        // 尝试降级到浏览器存储
        if (targetType !== this.fallbackType) {
          try {
            adapter = await storageFactory.createAdapter(this.fallbackType, {});
            targetType = this.fallbackType;
            targetConfig = {};
            console.log(`🔄 降级到 ${STORAGE_TYPE_CONFIGS[this.fallbackType]?.name} 存储`);
            
            toast.warning(`主存储不可用，已切换到${STORAGE_TYPE_CONFIGS[this.fallbackType]?.name}`);
          } catch (fallbackError) {
            console.error('❌ 降级存储也不可用:', fallbackError);
            throw new Error('所有存储类型都不可用');
          }
        } else {
          throw error;
        }
      }

      // 设置当前适配器
      this.currentAdapter = adapter;
      this.currentType = targetType;
      this.currentConfig = targetConfig;

      // 如果配置发生了变化，保存新配置
      if (savedConfig.type !== targetType) {
        this.saveConfig(targetType, targetConfig);
      }

      console.log('✅ 存储管理器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ 存储管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 切换存储类型
   * @param {string} newType - 新的存储类型
   * @param {Object} newConfig - 新的配置
   * @param {boolean} migrateData - 是否迁移数据
   * @returns {Promise<boolean>} 是否切换成功
   */
  async switchStorageType(newType, newConfig = {}, migrateData = true) {
    try {
      console.log(`🔄 切换到 ${STORAGE_TYPE_CONFIGS[newType]?.name} 存储...`);

      // 验证新配置
      const validation = storageFactory.validateConfig(newType, newConfig);
      if (!validation.isValid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      // 创建新适配器
      const newAdapter = await storageFactory.createAdapter(newType, newConfig);

      // 数据迁移
      if (migrateData && this.currentAdapter && this.currentAdapter !== newAdapter) {
        await this.migrateData(this.currentAdapter, newAdapter);
      }

      // 关闭旧适配器
      if (this.currentAdapter && this.currentAdapter !== newAdapter) {
        try {
          await this.currentAdapter.close();
        } catch (error) {
          console.warn('关闭旧适配器失败:', error);
        }
      }

      // 更新当前适配器
      this.currentAdapter = newAdapter;
      this.currentType = newType;
      this.currentConfig = newConfig;

      // 保存配置
      this.saveConfig(newType, newConfig);

      console.log(`✅ 已切换到 ${STORAGE_TYPE_CONFIGS[newType]?.name} 存储`);
      toast.success(`已切换到${STORAGE_TYPE_CONFIGS[newType]?.name}`);

      return true;
    } catch (error) {
      console.error('存储类型切换失败:', error);
      toast.error(`切换失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 数据迁移
   * @param {StorageAdapter} fromAdapter - 源适配器
   * @param {StorageAdapter} toAdapter - 目标适配器
   */
  async migrateData(fromAdapter, toAdapter) {
    if (!fromAdapter || !toAdapter) return;

    try {
      console.log('🔄 开始数据迁移...');
      toast.info('正在迁移数据...');

      // 从源适配器导出数据
      const exportedData = await fromAdapter.exportData();
      
      if (!exportedData.memos.length && !exportedData.pinnedMemos.length) {
        console.log('📝 无数据需要迁移');
        return;
      }

      // 导入到目标适配器
      const result = await toAdapter.importData(
        exportedData.memos, 
        exportedData.pinnedMemos
      );

      console.log(`✅ 数据迁移完成: ${result.successful} 成功, ${result.failed} 失败`);
      
      if (result.successful > 0) {
        toast.success(`成功迁移 ${result.successful} 条记录`);
      }
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} 条记录迁移失败`);
      }

    } catch (error) {
      console.error('数据迁移失败:', error);
      toast.error(`数据迁移失败: ${error.message}`);
      throw error;
    }
  }

  // === 配置持久化 ===

  loadConfig() {
    try {
      const configStr = localStorage.getItem(this.configKey);
      return configStr ? JSON.parse(configStr) : {};
    } catch (error) {
      console.warn('加载存储配置失败:', error);
      return {};
    }
  }

  saveConfig(type, config) {
    try {
      const configData = { type, config };
      localStorage.setItem(this.configKey, JSON.stringify(configData));
    } catch (error) {
      console.warn('保存存储配置失败:', error);
    }
  }

  // === 统一的存储接口 ===

  async ensureInitialized() {
    if (!this.currentAdapter) {
      await this.initialize();
    }
  }

  async createMemo(memoData) {
    await this.ensureInitialized();
    return this.currentAdapter.createMemo(memoData);
  }

  async getMemos(options = {}) {
    await this.ensureInitialized();
    return this.currentAdapter.getMemos(options);
  }

  async getPinnedMemos() {
    await this.ensureInitialized();
    return this.currentAdapter.getPinnedMemos();
  }

  async updateMemo(id, updateData) {
    await this.ensureInitialized();
    return this.currentAdapter.updateMemo(id, updateData);
  }

  async deleteMemo(id) {
    await this.ensureInitialized();
    return this.currentAdapter.deleteMemo(id);
  }

  async uploadAttachment(file, options = {}) {
    await this.ensureInitialized();
    return this.currentAdapter.uploadAttachment(file, options);
  }

  getAttachmentURL(attachmentId) {
    if (!this.currentAdapter) return '';
    return this.currentAdapter.getAttachmentURL(attachmentId);
  }

  async deleteAttachment(attachmentId) {
    await this.ensureInitialized();
    return this.currentAdapter.deleteAttachment(attachmentId);
  }

  async batchOperation(operations) {
    await this.ensureInitialized();
    return this.currentAdapter.batchOperation(operations);
  }

  async importData(memos, pinnedMemos = []) {
    await this.ensureInitialized();
    return this.currentAdapter.importData(memos, pinnedMemos);
  }

  async exportData() {
    await this.ensureInitialized();
    return this.currentAdapter.exportData();
  }

  // === 状态查询 ===

  getCurrentStorageType() {
    return this.currentType;
  }

  getCurrentConfig() {
    return { ...this.currentConfig };
  }

  getCurrentAdapter() {
    return this.currentAdapter;
  }

  async getStorageStats() {
    await this.ensureInitialized();
    
    const adapterStats = await this.currentAdapter.getStorageStats();
    
    return {
      ...adapterStats,
      currentType: this.currentType,
      currentConfig: this.currentConfig,
      managerInitialized: !!this.currentAdapter
    };
  }

  async healthCheck() {
    if (!this.currentAdapter) return false;
    return this.currentAdapter.healthCheck();
  }

  // === 存储类型管理 ===

  getSupportedStorageTypes() {
    return storageFactory.getSupportedStorageTypes();
  }

  async detectAvailableStorageTypes() {
    return storageFactory.detectAvailableStorageTypes();
  }

  async testStorageType(type, config = {}) {
    return storageFactory.testConnection(type, config);
  }

  // === 特殊功能 ===

  /**
   * 获取本地 DB 适配器（如果当前使用的是本地 DB）
   * @returns {LocalDBAdapter|null} 本地 DB 适配器实例
   */
  getLocalDBAdapter() {
    if (this.currentType === STORAGE_TYPES.LOCAL_DB) {
      return this.currentAdapter;
    }
    return null;
  }

  /**
   * 导入数据库文件（仅限本地 DB 模式）
   * @param {File} file - 数据库文件
   */
  async importDatabaseFile(file) {
    const localDBAdapter = this.getLocalDBAdapter();
    if (!localDBAdapter) {
      throw new Error('当前不是本地数据库模式，无法导入数据库文件');
    }
    
    return localDBAdapter.importDatabaseFile(file);
  }

  /**
   * 导出数据库文件（仅限本地 DB 模式）
   */
  async exportDatabaseFile() {
    const localDBAdapter = this.getLocalDBAdapter();
    if (!localDBAdapter) {
      throw new Error('当前不是本地数据库模式，无法导出数据库文件');
    }
    
    return localDBAdapter.exportDatabaseFile();
  }

  // === 清理和销毁 ===

  async close() {
    if (this.currentAdapter) {
      try {
        await this.currentAdapter.close();
      } catch (error) {
        console.warn('关闭当前适配器失败:', error);
      }
    }
    
    this.currentAdapter = null;
    this.currentType = null;
    this.currentConfig = null;
    this.initPromise = null;
  }

  async destroy() {
    await this.close();
    await storageFactory.clearCache();
  }
}

// 创建全局存储管理器实例
export const storageManager = new StorageManager();