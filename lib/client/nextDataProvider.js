/**
 * Next.js 数据提供者
 * 包装 API 调用和状态管理
 */

import { createContext, useContext, useState, useEffect } from 'react';

const NextDataContext = createContext();

export function NextDataProvider({ children }) {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // API 基础地址
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? ''
    : 'http://localhost:3001';

  // API 调用封装
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE}/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API 调用失败 ${endpoint}:`, error);
      throw error;
    }
  };

  // 加载备忘录
  const loadMemos = async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined && options[key] !== null) {
          params.append(key, options[key]);
        }
      });

      const queryString = params.toString();
      const endpoint = `/memos${queryString ? `?${queryString}` : ''}`;
      
      const data = await apiCall(endpoint);
      setMemos(data.memos || []);
      
      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 创建备忘录
  const createMemo = async (memoData) => {
    try {
      const newMemo = await apiCall('/memos', {
        method: 'POST',
        body: JSON.stringify(memoData),
      });
      
      setMemos(prev => [newMemo, ...prev]);
      return newMemo;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // 更新备忘录
  const updateMemo = async (id, updates) => {
    try {
      const updatedMemo = await apiCall(`/memos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      setMemos(prev => prev.map(memo => 
        memo.id === id ? updatedMemo : memo
      ));
      
      return updatedMemo;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // 删除备忘录
  const deleteMemo = async (id) => {
    try {
      await apiCall(`/memos/${id}`, {
        method: 'DELETE',
      });
      
      setMemos(prev => prev.filter(memo => memo.id !== id));
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // 初始化加载
  useEffect(() => {
    loadMemos().catch(() => {
      // 错误已经在 loadMemos 中处理
    });
  }, []);

  const value = {
    memos,
    loading,
    error,
    loadMemos,
    createMemo,
    updateMemo,
    deleteMemo,
    apiCall,
    clearError: () => setError(null)
  };

  return (
    <NextDataContext.Provider value={value}>
      {children}
    </NextDataContext.Provider>
  );
}

export function useNextData() {
  const context = useContext(NextDataContext);
  if (!context) {
    throw new Error('useNextData 必须在 NextDataProvider 内使用');
  }
  return context;
}