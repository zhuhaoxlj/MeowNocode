/**
 * Cloudflare 存储适配器
 * 使用 Cloudflare Workers + D1 + R2 作为后端存储
 */

import { StorageAdapter } from './StorageAdapter.js';

export class CloudflareStorageAdapter extends StorageAdapter {
  constructor(config = {}) {
    super(config);
    this.baseURL = config.baseURL || this.getDefaultBaseURL();
    this.apiKey = config.apiKey; // 如果需要认证
  }

  // === 基础方法 ===

  getDefaultBaseURL() {
    // 根据环境自动配置 API 基础地址
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost') {
        return 'http://localhost:8787'; // Wrangler dev 默认端口
      }
    }
    
    // 生产环境 - 替换为您的实际 Worker URL
    return 'https://meownocode-api.your-username.workers.dev';
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      // 检查后端连通性
      const healthCheck = await this.healthCheck();
      if (!healthCheck) {
        throw new Error('Cloudflare 后端服务不可用');
      }

      // 初始化数据库（如果需要）
      try {
        await this.request('/api/v1/init', { method: 'POST' });
      } catch (error) {
        // 初始化失败不是致命错误，可能数据库已经存在
        console.warn('数据库初始化警告:', error.message);
      }

      this.initialized = true;
      console.log('✅ Cloudflare 存储适配器初始化完成');
      return true;
    } catch (error) {
      console.error('❌ Cloudflare 存储适配器初始化失败:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await this.request('/api/v1/health');
      return response.status === 'ok';
    } catch (error) {
      console.warn('Cloudflare 健康检查失败:', error.message);
      return false;
    }
  }

  // === 基础请求方法 ===

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // 添加认证头（如果配置了 API Key）
    if (this.apiKey) {
      config.headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // 处理空响应
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error) {
      console.error(`Cloudflare API 请求失败: ${endpoint}`, error);
      throw error;
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
      const result = await this.request('/api/v1/memos', {
        method: 'POST',
        body: JSON.stringify(normalizedData),
      });
      
      return result;
    } catch (error) {
      console.error('创建备忘录失败:', error);
      throw error;
    }
  }

  async getMemos(options = {}) {
    if (!this.initialized) await this.initialize();
    
    const { pinned, limit, offset = 0 } = options;
    const params = new URLSearchParams();
    
    if (pinned !== undefined) {
      params.append('pinned', pinned.toString());
    }
    
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    if (offset > 0) {
      params.append('offset', offset.toString());
    }
    
    try {
      const endpoint = `/api/v1/memos${params.toString() ? `?${params}` : ''}`;
      const response = await this.request(endpoint);
      return response.memos || [];
    } catch (error) {
      console.error('获取备忘录失败:', error);
      throw error;
    }
  }

  async updateMemo(id, updateData) {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.request(`/api/v1/memos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });
      
      return result;
    } catch (error) {
      console.error('更新备忘录失败:', error);
      throw error;
    }
  }

  async deleteMemo(id) {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.request(`/api/v1/memos/${id}`, {
        method: 'DELETE',
      });
      
      return result;
    } catch (error) {
      console.error('删除备忘录失败:', error);
      throw error;
    }
  }

  // === 附件相关方法 ===

  async uploadAttachment(file, options = {}) {
    if (!this.initialized) await this.initialize();
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options.memoId) {
        formData.append('memoId', options.memoId);
      }

      const result = await this.request('/api/v1/attachments', {
        method: 'POST',
        headers: {}, // 让浏览器自动设置 Content-Type 为 multipart/form-data
        body: formData,
      });

      return {
        id: result.id,
        filename: result.filename,
        type: result.type,
        size: result.size,
        url: result.url
      };
    } catch (error) {
      console.error('上传附件失败:', error);
      throw error;
    }
  }

  getAttachmentURL(attachmentId) {
    return `${this.baseURL}/api/v1/attachments/${attachmentId}`;
  }

  async deleteAttachment(attachmentId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.request(`/api/v1/attachments/${attachmentId}`, {
        method: 'DELETE',
      });
      
      return result;
    } catch (error) {
      console.error('删除附件失败:', error);
      throw error;
    }
  }

  // === 批量操作 ===

  async batchOperation(operations) {
    if (!this.initialized) await this.initialize();
    
    try {
      const result = await this.request('/api/v1/memos/batch', {
        method: 'POST',
        body: JSON.stringify({ operations }),
      });
      
      return result.results || [];
    } catch (error) {
      console.warn('批量操作不支持，回退到单个操作:', error.message);
      // 如果后端不支持批量操作，回退到父类的逐个处理
      return super.batchOperation(operations);
    }
  }

  // === 数据导入导出 ===

  async importData(memos, pinnedMemos = []) {
    if (!this.initialized) await this.initialize();
    
    try {
      console.log('🔄 开始同步数据到 Cloudflare...');
      
      const operations = [];
      
      // 添加普通备忘录
      memos.forEach(memo => {
        operations.push({
          type: 'create',
          data: {
            ...memo,
            pinned: false
          }
        });
      });
      
      // 添加置顶备忘录
      pinnedMemos.forEach(memo => {
        operations.push({
          type: 'create', 
          data: {
            ...memo,
            pinned: true
          }
        });
      });
      
      // 执行批量操作
      const results = await this.batchOperation(operations);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      console.log(`✅ Cloudflare 同步完成: ${successful} 成功, ${failed} 失败`);
      
      return { successful, failed, results };
    } catch (error) {
      console.error('❌ Cloudflare 同步失败:', error);
      throw error;
    }
  }

  // === 统计信息 ===

  async getStorageStats() {
    try {
      if (!this.initialized) await this.initialize();
      
      const [memos, pinnedMemos] = await Promise.all([
        this.getMemos({ pinned: false }),
        this.getMemos({ pinned: true })
      ]);
      
      // 获取后端统计信息（如果支持）
      let backendStats = null;
      try {
        backendStats = await this.request('/api/v1/stats');
      } catch (error) {
        console.warn('获取后端统计信息失败:', error.message);
      }
      
      return {
        adapterType: 'CloudflareStorageAdapter',
        baseURL: this.baseURL,
        totalMemos: memos.length,
        pinnedMemos: pinnedMemos.length,
        totalCount: memos.length + pinnedMemos.length,
        backend: backendStats,
        initialized: this.initialized,
        healthy: await this.healthCheck(),
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        adapterType: 'CloudflareStorageAdapter',
        baseURL: this.baseURL,
        error: error.message,
        healthy: false,
        lastChecked: new Date().toISOString()
      };
    }
  }

  // === 配置管理 ===

  updateConfig(newConfig) {
    if (newConfig.baseURL) {
      this.baseURL = newConfig.baseURL;
    }
    
    if (newConfig.apiKey) {
      this.apiKey = newConfig.apiKey;
    }
    
    this.config = { ...this.config, ...newConfig };
  }

  // === 连接测试 ===

  async testConnection() {
    try {
      const startTime = Date.now();
      const health = await this.healthCheck();
      const endTime = Date.now();
      
      return {
        success: health,
        responseTime: endTime - startTime,
        baseURL: this.baseURL,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        baseURL: this.baseURL,
        timestamp: new Date().toISOString()
      };
    }
  }
}