/**
 * 多存储方案入口文件
 * 统一导出所有存储相关的类和工具
 */

// 核心类
export { StorageAdapter } from './StorageAdapter.js';
export { LocalDBAdapter } from './LocalDBAdapter.js';
export { BrowserStorageAdapter } from './BrowserStorageAdapter.js';
export { CloudflareStorageAdapter } from './CloudflareStorageAdapter.js';

// 工厂和管理器
export { StorageFactory, storageFactory, STORAGE_TYPES, STORAGE_TYPE_CONFIGS } from './StorageFactory.js';
export { StorageManager, storageManager } from './StorageManager.js';

// 数据服务
export { newDataService } from '../newDataService.js';

// 便捷的使用函数
export const useStorage = () => {
  return {
    // 存储管理
    manager: storageManager,
    dataService: newDataService,
    
    // 快捷方法
    async switchTo(type, config = {}, migrate = true) {
      return storageManager.switchStorageType(type, config, migrate);
    },
    
    async getCurrentInfo() {
      return storageManager.getStorageStats();
    },
    
    async testConnection(type, config = {}) {
      return storageManager.testStorageType(type, config);
    },
    
    getSupportedTypes() {
      return storageManager.getSupportedStorageTypes();
    }
  };
};

// 类型定义（方便IDE提示）
export const StorageTypes = STORAGE_TYPES;