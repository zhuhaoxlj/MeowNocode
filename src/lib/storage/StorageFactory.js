/**
 * 存储工厂
 * 根据配置创建不同类型的存储适配器
 * 参考 memos 的 NewDBDriver 设计
 */

import { BrowserStorageAdapter } from './BrowserStorageAdapter.js';
import { LocalDBAdapter } from './LocalDBAdapter.js';

// 存储类型常量
export const STORAGE_TYPES = {
  BROWSER: 'browser',
  LOCAL_DB: 'localdb',
  S3: 's3' // 预留
};

// 存储类型配置
export const STORAGE_TYPE_CONFIGS = {
  [STORAGE_TYPES.BROWSER]: {
    name: '浏览器存储',
    description: 'localStorage + IndexedDB，数据存储在浏览器本地',
    icon: '🌐',
    pros: ['离线可用', '无需配置', '响应快速'],
    cons: ['限制单浏览器', '可能丢失数据', '存储容量有限'],
    requiresConfig: false,
    isDefault: false
  },
  
  [STORAGE_TYPES.LOCAL_DB]: {
    name: '本地数据库文件',
    description: 'SQLite 数据库文件，可导入导出',
    icon: '💾',
    pros: ['数据文件化', '可备份导出', '兼容 memos', '性能好'],
    cons: ['仅本机访问', '需手动备份'],
    requiresConfig: true,
    isDefault: true,
    configFields: [
      { key: 'dbPath', label: '数据库文件名', type: 'text', default: 'meownocode.db' },
      { key: 'autoSave', label: '自动保存', type: 'boolean', default: true },
      { key: 'saveInterval', label: '保存间隔(秒)', type: 'number', default: 30 }
    ]
  },
  
  [STORAGE_TYPES.S3]: {
    name: 'S3 兼容存储',
    description: 'AWS S3 或兼容服务',
    icon: '🪣',
    pros: ['企业级', '高可靠', '大容量'],
    cons: ['需要配置', '可能产生费用'],
    requiresConfig: true,
    isDefault: false,
    disabled: true, // 暂未实现
    configFields: [
      { key: 'endpoint', label: 'S3 端点', type: 'text' },
      { key: 'region', label: '区域', type: 'text', default: 'us-east-1' },
      { key: 'bucket', label: '存储桶', type: 'text' },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password' }
    ]
  }
};

export class StorageFactory {
  constructor() {
    this.adapters = new Map(); // 缓存适配器实例
  }

  /**
   * 创建存储适配器
   * @param {string} type - 存储类型
   * @param {Object} config - 配置选项
   * @returns {Promise<StorageAdapter>} 存储适配器实例
   */
  async createAdapter(type, config = {}) {
    // 检查是否已有缓存的实例
    const cacheKey = `${type}_${JSON.stringify(config)}`;
    if (this.adapters.has(cacheKey)) {
      return this.adapters.get(cacheKey);
    }

    let adapter;

    switch (type) {
      case STORAGE_TYPES.BROWSER:
        adapter = new BrowserStorageAdapter(config);
        break;

      case STORAGE_TYPES.LOCAL_DB:
        adapter = new LocalDBAdapter(config);
        break;

      case STORAGE_TYPES.S3:
        throw new Error('S3 存储适配器暂未实现');

      default:
        throw new Error(`不支持的存储类型: ${type}`);
    }

    // 初始化适配器
    try {
      await adapter.initialize();
      
      // 缓存成功初始化的适配器
      this.adapters.set(cacheKey, adapter);
      
      return adapter;
    } catch (error) {
      console.error(`初始化 ${type} 存储适配器失败:`, error);
      throw error;
    }
  }

  /**
   * 获取所有支持的存储类型
   * @returns {Array} 存储类型配置列表
   */
  getSupportedStorageTypes() {
    return Object.entries(STORAGE_TYPE_CONFIGS).map(([type, config]) => ({
      type,
      ...config
    }));
  }

  /**
   * 获取默认存储类型
   * @returns {string} 默认存储类型
   */
  getDefaultStorageType() {
    const defaultType = Object.entries(STORAGE_TYPE_CONFIGS)
      .find(([, config]) => config.isDefault);
    
    return defaultType ? defaultType[0] : STORAGE_TYPES.LOCAL_DB;
  }

  /**
   * 验证存储类型配置
   * @param {string} type - 存储类型
   * @param {Object} config - 配置对象
   * @returns {Object} 验证结果 {isValid, errors}
   */
  validateConfig(type, config) {
    const typeConfig = STORAGE_TYPE_CONFIGS[type];
    if (!typeConfig) {
      return {
        isValid: false,
        errors: [`不支持的存储类型: ${type}`]
      };
    }

    if (typeConfig.disabled) {
      return {
        isValid: false,
        errors: [`存储类型 ${typeConfig.name} 暂不可用`]
      };
    }

    const errors = [];

    // 检查必需配置字段
    if (typeConfig.requiresConfig && typeConfig.configFields) {
      typeConfig.configFields.forEach(field => {
        if (field.required !== false && !config[field.key]) {
          errors.push(`缺少必需配置: ${field.label}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 测试存储适配器连接
   * @param {string} type - 存储类型
   * @param {Object} config - 配置选项
   * @returns {Promise<Object>} 测试结果
   */
  async testConnection(type, config = {}) {
    try {
      const validation = this.validateConfig(type, config);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          type
        };
      }

      // 创建临时适配器进行测试
      const adapter = await this.createAdapter(type, config);
      
      // 执行健康检查
      const startTime = Date.now();
      const isHealthy = await adapter.healthCheck();
      const responseTime = Date.now() - startTime;

      // 获取基本统计信息
      let stats = null;
      try {
        stats = await adapter.getStorageStats();
      } catch (error) {
        console.warn('获取存储统计失败:', error);
      }

      return {
        success: isHealthy,
        responseTime,
        stats,
        type,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        type,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 自动检测可用的存储类型
   * @returns {Promise<Array>} 可用存储类型列表
   */
  async detectAvailableStorageTypes() {
    const supportedTypes = this.getSupportedStorageTypes();
    const availableTypes = [];

    for (const typeInfo of supportedTypes) {
      if (typeInfo.disabled) continue;

      try {
        // 使用默认配置进行测试
        const defaultConfig = {};
        if (typeInfo.configFields) {
          typeInfo.configFields.forEach(field => {
            if (field.default !== undefined) {
              defaultConfig[field.key] = field.default;
            }
          });
        }

        const testResult = await this.testConnection(typeInfo.type, defaultConfig);
        
        availableTypes.push({
          ...typeInfo,
          available: testResult.success,
          testResult
        });
      } catch (error) {
        availableTypes.push({
          ...typeInfo,
          available: false,
          error: error.message
        });
      }
    }

    return availableTypes;
  }

  /**
   * 清理缓存的适配器
   */
  async clearCache() {
    for (const adapter of this.adapters.values()) {
      try {
        await adapter.close();
      } catch (error) {
        console.warn('关闭适配器失败:', error);
      }
    }
    
    this.adapters.clear();
  }

  /**
   * 销毁工厂实例
   */
  async destroy() {
    await this.clearCache();
  }
}

// 创建全局工厂实例
export const storageFactory = new StorageFactory();