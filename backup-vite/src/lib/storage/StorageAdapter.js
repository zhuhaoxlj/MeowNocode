/**
 * 存储适配器接口
 * 参考 memos Driver 接口设计，为不同存储方式提供统一接口
 */

export class StorageAdapter {
  constructor(config = {}) {
    this.config = config;
    this.initialized = false;
  }

  // === 基础方法 ===
  
  /**
   * 初始化存储适配器
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclasses');
  }

  /**
   * 检查是否已初始化
   */
  async isInitialized() {
    return this.initialized;
  }

  /**
   * 关闭连接
   */
  async close() {
    this.initialized = false;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclasses');
  }

  // === 备忘录相关方法 ===

  /**
   * 创建备忘录
   * @param {Object} memoData - 备忘录数据
   * @returns {Promise<Object>} 创建的备忘录
   */
  async createMemo(memoData) {
    throw new Error('createMemo() must be implemented by subclasses');
  }

  /**
   * 获取备忘录列表
   * @param {Object} options - 查询选项 {pinned, limit, offset}
   * @returns {Promise<Array>} 备忘录列表
   */
  async getMemos(options = {}) {
    throw new Error('getMemos() must be implemented by subclasses');
  }

  /**
   * 更新备忘录
   * @param {string} id - 备忘录ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新结果
   */
  async updateMemo(id, updateData) {
    throw new Error('updateMemo() must be implemented by subclasses');
  }

  /**
   * 删除备忘录
   * @param {string} id - 备忘录ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteMemo(id) {
    throw new Error('deleteMemo() must be implemented by subclasses');
  }

  /**
   * 获取置顶备忘录
   * @returns {Promise<Array>} 置顶备忘录列表
   */
  async getPinnedMemos() {
    return this.getMemos({ pinned: true });
  }

  // === 附件相关方法 ===

  /**
   * 上传附件
   * @param {File} file - 文件对象
   * @param {Object} options - 上传选项
   * @returns {Promise<Object>} 附件信息
   */
  async uploadAttachment(file, options = {}) {
    throw new Error('uploadAttachment() must be implemented by subclasses');
  }

  /**
   * 获取附件URL
   * @param {string} attachmentId - 附件ID
   * @returns {string} 附件URL
   */
  getAttachmentURL(attachmentId) {
    throw new Error('getAttachmentURL() must be implemented by subclasses');
  }

  /**
   * 删除附件
   * @param {string} attachmentId - 附件ID
   * @returns {Promise<Object>} 删除结果
   */
  async deleteAttachment(attachmentId) {
    throw new Error('deleteAttachment() must be implemented by subclasses');
  }

  // === 批量操作 ===

  /**
   * 批量操作
   * @param {Array} operations - 操作列表
   * @returns {Promise<Array>} 操作结果列表
   */
  async batchOperation(operations) {
    const results = [];
    
    for (const operation of operations) {
      try {
        let result;
        
        switch (operation.type) {
          case 'create':
            result = await this.createMemo(operation.data);
            break;
          case 'update':
            result = await this.updateMemo(operation.id, operation.data);
            break;
          case 'delete':
            result = await this.deleteMemo(operation.id);
            break;
          default:
            throw new Error(`Unsupported operation type: ${operation.type}`);
        }
        
        results.push({ ...operation, success: true, result });
      } catch (error) {
        results.push({ ...operation, success: false, error: error.message });
      }
    }
    
    return results;
  }

  // === 数据导入导出 ===

  /**
   * 导入数据
   * @param {Array} memos - 备忘录数据
   * @param {Array} pinnedMemos - 置顶备忘录数据
   * @returns {Promise<Object>} 导入结果
   */
  async importData(memos, pinnedMemos = []) {
    const operations = [];
    
    memos.forEach(memo => {
      operations.push({
        type: 'create',
        data: { ...memo, pinned: false }
      });
    });
    
    pinnedMemos.forEach(memo => {
      operations.push({
        type: 'create',
        data: { ...memo, pinned: true }
      });
    });
    
    const results = await this.batchOperation(operations);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return { successful, failed, results };
  }

  /**
   * 导出数据
   * @returns {Promise<Object>} 导出的数据
   */
  async exportData() {
    const [memos, pinnedMemos] = await Promise.all([
      this.getMemos({ pinned: false }),
      this.getPinnedMemos()
    ]);
    
    return {
      memos,
      pinnedMemos,
      metadata: {
        exportedAt: new Date().toISOString(),
        adapterType: this.constructor.name,
        totalCount: memos.length + pinnedMemos.length
      }
    };
  }

  // === 统计信息 ===

  /**
   * 获取存储统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStorageStats() {
    try {
      const [memos, pinnedMemos] = await Promise.all([
        this.getMemos({ pinned: false }),
        this.getPinnedMemos()
      ]);
      
      return {
        adapterType: this.constructor.name,
        totalMemos: memos.length,
        pinnedMemos: pinnedMemos.length,
        totalCount: memos.length + pinnedMemos.length,
        initialized: this.initialized,
        healthy: await this.healthCheck(),
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        adapterType: this.constructor.name,
        error: error.message,
        healthy: false,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // === 工具方法 ===

  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 验证备忘录数据
   * @param {Object} memoData - 备忘录数据
   * @returns {Object} 验证结果
   */
  validateMemoData(memoData) {
    const errors = [];
    
    if (!memoData.content) {
      errors.push('Content is required');
    }
    
    if (memoData.content && memoData.content.length > 10000) {
      errors.push('Content too long (max 10000 characters)');
    }
    
    if (memoData.tags && !Array.isArray(memoData.tags)) {
      errors.push('Tags must be an array');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 标准化备忘录数据
   * @param {Object} memoData - 原始备忘录数据
   * @returns {Object} 标准化后的数据
   */
  normalizeMemoData(memoData) {
    const now = new Date().toISOString();
    
    return {
      id: memoData.id || this.generateId(),
      content: memoData.content || '',
      tags: Array.isArray(memoData.tags) ? memoData.tags : [],
      createdAt: memoData.createdAt || now,
      updatedAt: memoData.updatedAt || now,
      timestamp: memoData.timestamp || memoData.createdAt || now,
      lastModified: memoData.lastModified || memoData.updatedAt || now,
      pinned: Boolean(memoData.pinned),
      ...memoData
    };
  }
}