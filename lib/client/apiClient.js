class NextApiClient {
  constructor() {
    // 在浏览器端始终使用相对路径，因为 Next.js API routes 与前端在同一域名下
    // 这样可以自动适配 localhost、外网 IP 或域名访问
    this.baseUrl = typeof window !== 'undefined' 
      ? '' // 浏览器端：使用相对路径
      : 'http://localhost:8081'; // 服务端：使用 localhost
    
    // 添加请求缓存和去重
    this.pendingRequests = new Map(); // 存储正在进行的请求
    this.cache = new Map(); // 简单的缓存
    this.cacheTimeout = 5000; // 缓存 5 秒
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/api${endpoint}`;
    const cacheKey = `${options.method || 'GET'}:${url}`;
    
    // 对于 GET 请求，检查是否有相同的请求正在进行（请求去重）
    if (!options.method || options.method === 'GET') {
      // 检查缓存
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log(`⚡ 使用缓存: ${endpoint}`);
          return cached.data;
        } else {
          this.cache.delete(cacheKey);
        }
      }
      
      // 检查是否有相同的请求正在进行
      if (this.pendingRequests.has(cacheKey)) {
        console.log(`⏳ 等待已有请求: ${endpoint}`);
        return this.pendingRequests.get(cacheKey);
      }
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    // 创建请求 Promise
    const requestPromise = (async () => {
      const startTime = Date.now();
      try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'API 请求失败');
        }
        
        const result = await response.json();
        const duration = Date.now() - startTime;
        
        // 记录慢请求
        if (duration > 1000) {
          console.warn(`🐌 慢请求警告: ${endpoint} 耗时 ${duration}ms`);
        } else if (duration > 100) {
          console.log(`⏱️ ${endpoint} 耗时 ${duration}ms`);
        }
        
        // 对于 GET 请求，缓存结果
        if (!options.method || options.method === 'GET') {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
        }
        
        return result;
      } finally {
        // 清除待处理请求
        this.pendingRequests.delete(cacheKey);
      }
    })();
    
    // 对于 GET 请求，记录待处理请求
    if (!options.method || options.method === 'GET') {
      this.pendingRequests.set(cacheKey, requestPromise);
    }
    
    return requestPromise;
  }
  
  // 清除缓存
  clearCache() {
    this.cache.clear();
    console.log('🧹 API 缓存已清除');
  }
  
  // Memos API
  async getMemos() {
    return this.request('/memos');
  }
  
  async getMemo(id) {
    return this.request(`/memos/${id}`);
  }
  
  async createMemo(data) {
    const result = await this.request('/memos', {
      method: 'POST',
      body: data,
    });
    
    // 创建后清除缓存
    this.clearCache();
    
    return result;
  }
  
  async updateMemo(id, data) {
    console.log('🌐 DEBUG apiClient.updateMemo called:', { id, data });
    console.log('🌐 DEBUG: About to call this.request...');
    const result = await this.request(`/memos/${id}`, {
      method: 'PUT',
      body: data,
    });
    console.log('🌐 DEBUG: apiClient.updateMemo result:', result);
    
    // 更新后清除相关缓存
    this.clearCache();
    
    return result;
  }
  
  async deleteMemo(id) {
    const result = await this.request(`/memos/${id}`, {
      method: 'DELETE',
    });
    
    // 删除后清除缓存
    this.clearCache();
    
    return result;
  }
  
  // Health Check
  async getHealth() {
    return this.request('/health');
  }
}

export const apiClient = new NextApiClient();
export default apiClient;
