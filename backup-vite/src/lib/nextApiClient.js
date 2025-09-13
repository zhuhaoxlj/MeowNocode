/**
 * Next.js API 客户端 - 用于跨浏览器数据共享
 */

class NextApiClient {
  constructor() {
    this.baseUrl = '';
  }

  async getMemos(options = {}) {
    try {
      const params = new URLSearchParams();
      Object.keys(options).forEach(key => {
        if (options[key] !== undefined && options[key] !== null) {
          params.append(key, options[key]);
        }
      });

      const url = `/api/memos${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data.memos || [];
    } catch (error) {
      console.error('获取备忘录失败:', error);
      return [];
    }
  }

  async createMemo(memo) {
    try {
      const response = await fetch('/api/memos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memo),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('创建备忘录失败:', error);
      throw error;
    }
  }

  async updateMemo(id, updates) {
    try {
      const response = await fetch(`/api/memos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('更新备忘录失败:', error);
      throw error;
    }
  }

  async deleteMemo(id) {
    try {
      const response = await fetch(`/api/memos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('删除备忘录失败:', error);
      throw error;
    }
  }
}

export const nextApiClient = new NextApiClient();
export default nextApiClient;