import { apiClient } from './apiClient.js';

class NextDataService {
  // Memos - 分页获取
  async getMemos(params = {}) {
    try {
      const response = await apiClient.getMemos(params);
      return {
        memos: response.memos || [],
        pagination: response.pagination || { hasMore: false, total: 0 }
      };
    } catch (error) {
      console.error('获取 memos 失败:', error);
      return { memos: [], pagination: { hasMore: false, total: 0 } };
    }
  }
  
  // 获取所有 memos（兼容旧代码）
  async getAllMemos() {
    try {
      const response = await apiClient.getAllMemosLegacy();
      return response.memos || [];
    } catch (error) {
      console.error('获取 memos 失败:', error);
      return [];
    }
  }
  
  async getMemoById(id) {
    try {
      const response = await apiClient.getMemo(id);
      return response.memo;
    } catch (error) {
      console.error(`获取 memo ${id} 失败:`, error);
      return null;
    }
  }
  
  async createMemo(data) {
    try {
      const response = await apiClient.createMemo(data);
      return response.memo;
    } catch (error) {
      console.error('创建 memo 失败:', error);
      throw error;
    }
  }
  
  async updateMemo(id, data) {
    try {
      const response = await apiClient.updateMemo(id, data);
      return response.memo;
    } catch (error) {
      console.error(`更新 memo ${id} 失败:`, error);
      throw error;
    }
  }
  
  async deleteMemo(id) {
    try {
      await apiClient.deleteMemo(id);
      return true;
    } catch (error) {
      console.error(`删除 memo ${id} 失败:`, error);
      return false;
    }
  }
  
  // 健康检查
  async checkHealth() {
    try {
      return await apiClient.getHealth();
    } catch (error) {
      console.error('健康检查失败:', error);
      return { status: 'error', error: error.message };
    }
  }
  
  // 🚀 资源加载（按需加载，带缓存）
  async getResource(resourceId) {
    try {
      const response = await apiClient.getResource(resourceId);
      return response.resource;
    } catch (error) {
      console.error(`获取资源 ${resourceId} 失败:`, error);
      return null;
    }
  }
  
  async getMemoResources(memoId) {
    try {
      const response = await apiClient.getMemoResources(memoId);
      return response.resources || [];
    } catch (error) {
      console.error(`获取 memo ${memoId} 的资源失败:`, error);
      return [];
    }
  }
}

export const dataService = new NextDataService();
export default dataService;
