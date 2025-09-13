/**
 * Next.js API 客户端
 * 统一管理所有的 API 调用
 */

class NextApiClient {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_URL || ''
      : '';
  }

  // === 通用请求方法 ===
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`;
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API 请求失败 ${endpoint}:`, error);
      throw error;
    }
  }

  // === 备忘录相关 API ===
  async getMemos(options = {}) {
    const params = new URLSearchParams();
    
    Object.keys(options).forEach(key => {
      if (options[key] !== undefined && options[key] !== null) {
        params.append(key, options[key]);
      }
    });

    const queryString = params.toString();
    const endpoint = `/memos${queryString ? `?${queryString}` : ''}`;
    
    return await this.request(endpoint);
  }

  async getMemo(id) {
    return await this.request(`/memos/${id}`);
  }

  async createMemo(memo) {
    return await this.request('/memos', {
      method: 'POST',
      body: JSON.stringify(memo),
    });
  }

  async updateMemo(id, updates) {
    return await this.request(`/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteMemo(id) {
    return await this.request(`/memos/${id}`, {
      method: 'DELETE',
    });
  }

  async batchUpdateMemos(uids, updates) {
    return await this.request('/memos/batch', {
      method: 'PUT',
      body: JSON.stringify({ uids, updates }),
    });
  }

  // === 附件相关 API ===
  async uploadAttachment(file, memoId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (memoId) {
      formData.append('memoId', memoId);
    }

    return await this.request('/attachments', {
      method: 'POST',
      headers: {}, // 不设置 Content-Type，让浏览器自动设置
      body: formData,
    });
  }

  async deleteAttachment(id) {
    return await this.request(`/attachments/${id}`, {
      method: 'DELETE',
    });
  }

  getAttachmentUrl(id, download = false) {
    const params = download ? '?download=1' : '';
    return `${this.baseURL}/api/attachments/${id}${params}`;
  }

  // === 导入导出 API ===
  async importMemosDb(file) {
    const formData = new FormData();
    formData.append('dbFile', file);

    return await this.request('/import/memos-db', {
      method: 'POST',
      headers: {},
      body: formData,
    });
  }

  async exportDatabase() {
    const url = `${this.baseURL}/api/export/database`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('导出数据库失败:', error);
      throw error;
    }
  }

  // === 统计信息 API ===
  async getStats(include = 'all') {
    return await this.request(`/stats?include=${include}`);
  }

  // === 健康检查 ===
  async getHealth() {
    return await this.request('/health');
  }

  // === 标签相关 ===
  async getTagStats() {
    const stats = await this.getStats('tags');
    return stats.tags || [];
  }
}

// 创建全局实例
export const nextApiClient = new NextApiClient();

// React Hook 集成
import { useState, useEffect } from 'react';

export function useMemos(options = {}) {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMemos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await nextApiClient.getMemos(options);
      setMemos(data.memos || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemos();
  }, [JSON.stringify(options)]);

  const createMemo = async (memo) => {
    try {
      const newMemo = await nextApiClient.createMemo(memo);
      setMemos(prev => [newMemo, ...prev]);
      return newMemo;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateMemo = async (id, updates) => {
    try {
      const updatedMemo = await nextApiClient.updateMemo(id, updates);
      setMemos(prev => prev.map(memo => 
        memo.id === id ? updatedMemo : memo
      ));
      return updatedMemo;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const deleteMemo = async (id) => {
    try {
      await nextApiClient.deleteMemo(id);
      setMemos(prev => prev.filter(memo => memo.id !== id));
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  return {
    memos,
    loading,
    error,
    loadMemos,
    createMemo,
    updateMemo,
    deleteMemo,
  };
}

export function useStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await nextApiClient.getStats();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return { stats, loading, error };
}