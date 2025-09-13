/**
 * API Client for MeowNocode Backend
 * 与 Cloudflare Workers 后端通信
 */

class ApiClient {
  constructor() {
    // 根据环境自动配置 API 基础地址
    this.baseURL = this.getBaseURL();
    this.initialized = false;
  }

  // 获取 API 基础地址
  getBaseURL() {
    // 开发环境
    if (window.location.hostname === 'localhost') {
      return 'http://localhost:8787'; // Wrangler dev 默认端口
    }
    
    // 生产环境 - 可以是 Cloudflare Workers 或自定义域名
    return 'https://your-worker-name.your-username.workers.dev';
  }

  // 初始化数据库（首次使用时调用）
  async initialize() {
    if (this.initialized) return true;

    try {
      const response = await this.request('/api/v1/init', {
        method: 'POST'
      });
      
      this.initialized = true;
      console.log('✅ Database initialized:', response);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      return false;
    }
  }

  // 基础请求方法
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
      console.error(`API Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // 检查健康状态
  async healthCheck() {
    try {
      const response = await this.request('/api/v1/health');
      return response.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  // 获取所有备忘录
  async getMemos(options = {}) {
    const { pinned = false } = options;
    const params = new URLSearchParams();
    
    if (pinned) params.append('pinned', 'true');
    
    const endpoint = `/api/v1/memos${params.toString() ? `?${params}` : ''}`;
    const response = await this.request(endpoint);
    return response.memos || [];
  }

  // 获取普通备忘录
  async getNormalMemos() {
    return this.getMemos({ pinned: false });
  }

  // 获取置顶备忘录  
  async getPinnedMemos() {
    return this.getMemos({ pinned: true });
  }

  // 创建备忘录
  async createMemo(memoData) {
    return this.request('/api/v1/memos', {
      method: 'POST',
      body: JSON.stringify(memoData),
    });
  }

  // 更新备忘录
  async updateMemo(id, memoData) {
    return this.request(`/api/v1/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memoData),
    });
  }

  // 删除备忘录
  async deleteMemo(id) {
    return this.request(`/api/v1/memos/${id}`, {
      method: 'DELETE',
    });
  }

  // 上传附件
  async uploadAttachment(file) {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/v1/attachments', {
      method: 'POST',
      headers: {}, // 让浏览器自动设置 Content-Type
      body: formData,
    });
  }

  // 获取附件URL
  getAttachmentURL(attachmentId) {
    return `${this.baseURL}/api/v1/attachments/${attachmentId}`;
  }

  // 批量操作
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

  // 同步本地数据到服务器（迁移现有数据用）
  async syncLocalData(localMemos, pinnedMemos) {
    console.log('🔄 Starting data sync to server...');
    
    try {
      // 确保数据库已初始化
      await this.initialize();
      
      const operations = [];
      
      // 添加普通备忘录
      localMemos.forEach(memo => {
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
      
      console.log(`✅ Sync completed: ${successful} successful, ${failed} failed`);
      
      return { successful, failed, results };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }
}

// 创建全局实例
const apiClient = new ApiClient();

export default apiClient;