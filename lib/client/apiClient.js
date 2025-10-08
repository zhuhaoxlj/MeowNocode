class NextApiClient {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '' 
      : 'http://localhost:8081';
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}/api${endpoint}`;
    // console.log('🚀 DEBUG apiClient.request called:', { endpoint, baseUrl: this.baseUrl, url });
    
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
    
      // console.log('🚀 DEBUG: Fetch config:', config);
      // console.log('🚀 DEBUG: About to call fetch...');
    
    const response = await fetch(url, config);
      // console.log('🚀 DEBUG: Fetch response received:', response.status, response.statusText);
    
    if (!response.ok) {
      const error = await response.json();
      // console.error('🚀 DEBUG: Fetch error response:', error);
      throw new Error(error.error || 'API 请求失败');
    }
    
    const result = await response.json();
    // console.log('🚀 DEBUG: Fetch result:', result);
    return result;
  }
  
  // Memos API
  async getMemos() {
    return this.request('/memos');
  }
  
  async getMemo(id) {
    return this.request(`/memos/${id}`);
  }
  
  async createMemo(data) {
    return this.request('/memos', {
      method: 'POST',
      body: data,
    });
  }
  
  async updateMemo(id, data) {
    console.log('🌐 DEBUG apiClient.updateMemo called:', { id, data });
    console.log('🌐 DEBUG: About to call this.request...');
    const result = await this.request(`/memos/${id}`, {
      method: 'PUT',
      body: data,
    });
    console.log('🌐 DEBUG: apiClient.updateMemo result:', result);
    return result;
  }
  
  async deleteMemo(id) {
    return this.request(`/memos/${id}`, {
      method: 'DELETE',
    });
  }
  
  // Health Check
  async getHealth() {
    return this.request('/health');
  }
}

export const apiClient = new NextApiClient();
export default apiClient;
