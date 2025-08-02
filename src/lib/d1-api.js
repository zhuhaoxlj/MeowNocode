 // D1数据库API客户端，用于在Cloudflare Pages环境中访问D1数据库
export class D1ApiClient {
  static async getBaseUrl() {
    // 获取当前域名
    const currentUrl = window.location.origin;
    
    // 如果是在workers.dev或pages.dev域名下，使用相对路径
    if (currentUrl.includes('workers.dev') || currentUrl.includes('pages.dev')) {
      return '';
    }
    
    // 否则使用完整URL
    return currentUrl;
  }

  // 初始化数据库
  static async initDatabase(authKey) {
    try {
      const baseUrl = await this.getBaseUrl();
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // 如果提供了鉴权密钥，添加到请求头
      if (authKey) {
        headers['Authorization'] = `Bearer ${authKey}`;
      }
      
      const response = await fetch(`${baseUrl}/api/init`, {
        method: 'POST',
        headers,
      });
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('初始化D1数据库失败:', error);
      return { success: false, message: error.message };
    }
  }

  // 同步用户数据到D1
  static async syncUserData(userId, data, authKey) {
    try {
      const baseUrl = await this.getBaseUrl();
      
      // 同步memos
      for (const memo of data.memos) {
        await this.upsertMemo(userId, memo, authKey);
      }

      // 同步用户设置
      await this.upsertUserSettings(userId, {
        pinnedMemos: data.pinnedMemos,
        themeColor: data.themeColor,
        darkMode: data.darkMode,
        hitokotoConfig: data.hitokotoConfig,
        fontConfig: data.fontConfig,
        backgroundConfig: data.backgroundConfig
      }, authKey);

      return { success: true, message: '数据同步到D1成功' };
    } catch (error) {
      console.error('D1数据同步失败:', error);
      return { success: false, message: error.message };
    }
  }

  // 从D1恢复用户数据
  static async restoreUserData(userId, authKey) {
    try {
      const baseUrl = await this.getBaseUrl();
      
      // 设置请求头
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // 如果提供了鉴权密钥，添加到请求头
      if (authKey) {
        headers['Authorization'] = `Bearer ${authKey}`;
      }
      
      // 获取用户的memos
      const memosResponse = await fetch(`${baseUrl}/api/memos?userId=${userId}`, {
        method: 'GET',
        headers,
      });
      
      const memosResult = await memosResponse.json();
      
      // 获取用户设置
      const settingsResponse = await fetch(`${baseUrl}/api/settings?userId=${userId}`, {
        method: 'GET',
        headers,
      });
      
      const settingsResult = await settingsResponse.json();
      
      if (!memosResult.success || !settingsResult.success) {
        throw new Error(memosResult.message || settingsResult.message || '获取数据失败');
      }
      
      return {
        success: true,
        data: {
          memos: memosResult.data || [],
          settings: settingsResult.data
        },
        message: '从D1恢复数据成功'
      };
    } catch (error) {
      console.error('从D1恢复数据失败:', error);
      return { success: false, message: error.message };
    }
  }

  // 插入或更新memo
  static async upsertMemo(userId, memo, authKey) {
    try {
      const baseUrl = await this.getBaseUrl();
      
      // 设置请求头
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // 如果提供了鉴权密钥，添加到请求头
      if (authKey) {
        headers['Authorization'] = `Bearer ${authKey}`;
      }
      
      // 确保时间戳不为空，使用当前时间作为备用
      const now = new Date().toISOString();
      const createdAt = memo.timestamp || now;
      const updatedAt = memo.lastModified || memo.timestamp || now;

      const response = await fetch(`${baseUrl}/api/memos?userId=${userId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          memo_id: memo.id,
          content: memo.content,
          tags: memo.tags || [],
          created_at: createdAt,
          updated_at: updatedAt
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '保存memo失败');
      }
      
      return result;
    } catch (error) {
      console.error('保存memo失败:', error);
      throw error;
    }
  }

  // 插入或更新用户设置
  static async upsertUserSettings(userId, settings, authKey) {
    try {
      const baseUrl = await this.getBaseUrl();
      
      // 设置请求头
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // 如果提供了鉴权密钥，添加到请求头
      if (authKey) {
        headers['Authorization'] = `Bearer ${authKey}`;
      }
      
      const response = await fetch(`${baseUrl}/api/settings?userId=${userId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pinned_memos: settings.pinnedMemos,
          theme_color: settings.themeColor,
          dark_mode: settings.darkMode === 'true',
          hitokoto_config: settings.hitokotoConfig,
          font_config: settings.fontConfig,
          background_config: settings.backgroundConfig
        }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '保存用户设置失败');
      }
      
      return result;
    } catch (error) {
      console.error('保存用户设置失败:', error);
      throw error;
    }
  }

  // 删除memo
  static async deleteMemo(userId, memoId, authKey) {
    try {
      const baseUrl = await this.getBaseUrl();
      
      // 设置请求头
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // 如果提供了鉴权密钥，添加到请求头
      if (authKey) {
        headers['Authorization'] = `Bearer ${authKey}`;
      }
      
      const response = await fetch(`${baseUrl}/api/memos?userId=${userId}&memoId=${memoId}`, {
        method: 'DELETE',
        headers,
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '删除memo失败');
      }
      
      return result;
    } catch (error) {
      console.error('删除memo失败:', error);
      throw error;
    }
  }

  // 检查D1 API是否可用
  static async checkAvailability() {
    try {
      const baseUrl = await this.getBaseUrl();
      const apiUrl = `${baseUrl}/api/health`;
      console.log('正在检查D1 API可用性:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('API响应状态:', response.status, response.statusText);
      
      // 如果返回401错误，说明已配置D1PASSWORD但需要鉴权
      if (response.status === 401) {
        return { available: true, requiresAuth: true };
      }
      
      // 检查响应类型
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('API返回了非JSON响应:', contentType);
        const text = await response.text();
        console.error('响应内容:', text.substring(0, 200));
        return { available: false, requiresAuth: false };
      }
      
      const result = await response.json();
      console.log('API响应数据:', result);
      
      if (result.status === 'ok') {
        return { available: true, requiresAuth: false };
      }
      
      return { available: false, requiresAuth: false };
    } catch (error) {
      console.error('检查D1 API可用性失败:', error);
      return { available: false, requiresAuth: false };
    }
  }
}