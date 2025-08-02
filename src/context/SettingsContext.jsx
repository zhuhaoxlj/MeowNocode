import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database';
import { D1DatabaseService } from '@/lib/d1';
import { D1ApiClient } from '@/lib/d1-api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [hitokotoConfig, setHitokotoConfig] = useState({
    enabled: true,
    types: ['a', 'b', 'c', 'd', 'i', 'j', 'k'] // 默认全选
  });
  const [fontConfig, setFontConfig] = useState({
    selectedFont: 'default' // default, jinghua, lxgw, kongshan
  });
  const [backgroundConfig, setBackgroundConfig] = useState({
    imageUrl: '',
    brightness: 50, // 0-100
    blur: 10 // 0-50 磨砂玻璃程度
  });
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [cloudProvider, setCloudProvider] = useState('supabase'); // 'supabase' 或 'd1'
  const [d1AuthKey, setD1AuthKey] = useState('');
  const [isD1Authenticated, setIsD1Authenticated] = useState(false);

  useEffect(() => {
    // 从localStorage加载一言设置
    const savedHitokotoConfig = localStorage.getItem('hitokotoConfig');
    if (savedHitokotoConfig) {
      try {
        setHitokotoConfig(JSON.parse(savedHitokotoConfig));
      } catch (error) {
        console.warn('Failed to parse Hitokoto config:', error);
      }
    }

    // 从localStorage加载字体设置
    const savedFontConfig = localStorage.getItem('fontConfig');
    if (savedFontConfig) {
      try {
        setFontConfig(JSON.parse(savedFontConfig));
      } catch (error) {
        console.warn('Failed to parse Font config:', error);
      }
    }

    // 从localStorage加载背景设置
    const savedBackgroundConfig = localStorage.getItem('backgroundConfig');
    if (savedBackgroundConfig) {
      try {
        setBackgroundConfig(JSON.parse(savedBackgroundConfig));
      } catch (error) {
        console.warn('Failed to parse Background config:', error);
      }
    }

    // 从localStorage加载云端同步设置
    const savedCloudSyncEnabled = localStorage.getItem('cloudSyncEnabled');
    if (savedCloudSyncEnabled) {
      try {
        setCloudSyncEnabled(JSON.parse(savedCloudSyncEnabled));
      } catch (error) {
        console.warn('Failed to parse cloud sync config:', error);
      }
    }

    // 从localStorage加载云服务提供商设置
    const savedCloudProvider = localStorage.getItem('cloudProvider');
    if (savedCloudProvider) {
      try {
        setCloudProvider(savedCloudProvider);
      } catch (error) {
        console.warn('Failed to parse cloud provider config:', error);
      }
    }

    // 从localStorage加载D1鉴权密钥
    const savedD1AuthKey = localStorage.getItem('d1AuthKey');
    if (savedD1AuthKey) {
      try {
        setD1AuthKey(savedD1AuthKey);
      } catch (error) {
        console.warn('Failed to parse D1 auth key:', error);
      }
    }

    // 从localStorage加载D1鉴权状态
    const savedD1Authenticated = localStorage.getItem('isD1Authenticated');
    if (savedD1Authenticated) {
      try {
        setIsD1Authenticated(JSON.parse(savedD1Authenticated));
      } catch (error) {
        console.warn('Failed to parse D1 auth status:', error);
      }
    }
  }, []);



  useEffect(() => {
    // 保存一言设置到localStorage
    localStorage.setItem('hitokotoConfig', JSON.stringify(hitokotoConfig));
  }, [hitokotoConfig]);

  useEffect(() => {
    // 保存字体设置到localStorage
    localStorage.setItem('fontConfig', JSON.stringify(fontConfig));
  }, [fontConfig]);

  useEffect(() => {
    // 保存背景设置到localStorage
    localStorage.setItem('backgroundConfig', JSON.stringify(backgroundConfig));
  }, [backgroundConfig]);

  useEffect(() => {
    // 保存云端同步设置到localStorage
    localStorage.setItem('cloudSyncEnabled', JSON.stringify(cloudSyncEnabled));
  }, [cloudSyncEnabled]);

  useEffect(() => {
    // 保存云服务提供商设置到localStorage
    localStorage.setItem('cloudProvider', cloudProvider);
  }, [cloudProvider]);

  useEffect(() => {
    // 保存D1鉴权密钥到localStorage
    localStorage.setItem('d1AuthKey', d1AuthKey);
  }, [d1AuthKey]);

  useEffect(() => {
    // 保存D1鉴权状态到localStorage
    localStorage.setItem('isD1Authenticated', JSON.stringify(isD1Authenticated));
  }, [isD1Authenticated]);



  const updateHitokotoConfig = (newConfig) => {
    setHitokotoConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateFontConfig = (newConfig) => {
    setFontConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateBackgroundConfig = (newConfig) => {
    setBackgroundConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateCloudSyncEnabled = (enabled) => {
    setCloudSyncEnabled(enabled);
  };

  const updateCloudProvider = (provider) => {
    try {
      setCloudProvider(provider);
    } catch (error) {
      console.error('更新云服务提供商失败:', error);
      throw error;
    }
  };

  const updateD1AuthKey = (key) => {
    setD1AuthKey(key);
  };

  const updateD1Authenticated = (authenticated) => {
    setIsD1Authenticated(authenticated);
  };

  // 验证D1鉴权密钥
  const verifyD1AuthKey = async (key) => {
    try {
      // 确保key不为空
      if (!key || !key.trim()) {
        setIsD1Authenticated(false);
        return { success: false, message: 'D1鉴权密钥不能为空' };
      }
      
      const baseUrl = await D1ApiClient.getBaseUrl();
      
      // 在Cloudflare Pages环境中，baseUrl可能是空字符串，这是正常的
      // 我们不需要检查baseUrl是否为空，直接使用它
      const url = `${baseUrl}/api/health`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
      });
      
      if (response.ok) {
        setD1AuthKey(key);
        setIsD1Authenticated(true);
        return { success: true, message: 'D1鉴权密钥验证成功' };
      } else {
        setIsD1Authenticated(false);
        return { success: false, message: 'D1鉴权密钥验证失败' };
      }
    } catch (error) {
      console.error('验证D1鉴权密钥失败:', error);
      setIsD1Authenticated(false);
      return { success: false, message: '验证D1鉴权密钥时发生错误: ' + error.message };
    }
  };





  // Supabase同步功能
  const syncToSupabase = async () => {
    if (!user) {
      throw new Error('请先登录');
    }

    try {
      const result = await DatabaseService.syncUserData(user.id);
      return result;
    } catch (error) {
      console.error('同步到Supabase失败:', error);
      return { success: false, message: error.message };
    }
  };

  const restoreFromSupabase = async () => {
    if (!user) {
      throw new Error('请先登录');
    }

    try {
      const result = await DatabaseService.restoreUserData(user.id);
      return result;
    } catch (error) {
      console.error('从Supabase恢复失败:', error);
      return { success: false, message: error.message };
    }
  };

  // D1同步功能
  const syncToD1 = async () => {
    try {
      // 检查是否已通过D1鉴权
      if (!isD1Authenticated || !d1AuthKey) {
        return { success: false, message: '请先输入D1鉴权密钥进行验证' };
      }

      // 获取本地数据
      const localData = {
        memos: JSON.parse(localStorage.getItem('memos') || '[]'),
        pinnedMemos: JSON.parse(localStorage.getItem('pinnedMemos') || '[]'),
        themeColor: localStorage.getItem('themeColor') || '#818CF8',
        darkMode: localStorage.getItem('darkMode') || 'false',
        hitokotoConfig: JSON.parse(localStorage.getItem('hitokotoConfig') || '{"enabled":true,"types":["a","b","c","d","i","j","k"]}'),
        fontConfig: JSON.parse(localStorage.getItem('fontConfig') || '{"selectedFont":"default"}'),
        backgroundConfig: JSON.parse(localStorage.getItem('backgroundConfig') || '{"imageUrl":"","brightness":50,"blur":10}')
      };

      // 优先尝试使用API客户端（适用于Cloudflare Pages）
      try {
        const result = await D1ApiClient.syncUserData(localData, d1AuthKey);
        return result;
      } catch (apiError) {
        console.warn('D1 API客户端失败，尝试直接访问D1数据库:', apiError);
        
        // 如果API客户端失败，尝试直接访问D1数据库（适用于Cloudflare Workers）
        const result = await D1DatabaseService.syncUserData();
        return result;
      }
    } catch (error) {
      console.error('同步到D1失败:', error);
      return { success: false, message: error.message };
    }
  };

  const restoreFromD1 = async () => {
    try {
      // 检查是否已通过D1鉴权
      if (!isD1Authenticated || !d1AuthKey) {
        return { success: false, message: '请先输入D1鉴权密钥进行验证' };
      }

      // 优先尝试使用API客户端（适用于Cloudflare Pages）
      try {
        const result = await D1ApiClient.restoreUserData(d1AuthKey);
        
        if (result.success) {
          // 恢复到本地存储
          if (result.data.memos && result.data.memos.length > 0) {
            const localMemos = result.data.memos.map(memo => ({
              id: memo.memo_id,
              content: memo.content,
              tags: JSON.parse(memo.tags || '[]'),
              timestamp: memo.created_at,
              lastModified: memo.updated_at,
              createdAt: memo.created_at,
              updatedAt: memo.updated_at
            }));
            localStorage.setItem('memos', JSON.stringify(localMemos));
          }

          if (result.data.settings) {
            if (result.data.settings.pinned_memos) {
              localStorage.setItem('pinnedMemos', result.data.settings.pinned_memos);
            }
            if (result.data.settings.theme_color) {
              localStorage.setItem('themeColor', result.data.settings.theme_color);
            }
            if (result.data.settings.dark_mode !== null) {
              localStorage.setItem('darkMode', result.data.settings.dark_mode.toString());
            }
            if (result.data.settings.hitokoto_config) {
              localStorage.setItem('hitokotoConfig', result.data.settings.hitokoto_config);
            }
            if (result.data.settings.font_config) {
              localStorage.setItem('fontConfig', result.data.settings.font_config);
            }
            if (result.data.settings.background_config) {
              localStorage.setItem('backgroundConfig', result.data.settings.background_config);
            }
          }
          
          return { success: true, message: '从D1恢复数据成功，请刷新页面查看' };
        }
        
        throw new Error(result.message || '恢复数据失败');
      } catch (apiError) {
        console.warn('D1 API客户端失败，尝试直接访问D1数据库:', apiError);
        
        // 如果API客户端失败，尝试直接访问D1数据库（适用于Cloudflare Workers）
        const result = await D1DatabaseService.restoreUserData();
        return result;
      }
    } catch (error) {
      console.error('从D1恢复失败:', error);
      return { success: false, message: error.message };
    }
  };

  return (
    <SettingsContext.Provider value={{
      hitokotoConfig,
      updateHitokotoConfig,
      fontConfig,
      updateFontConfig,
      backgroundConfig,
      updateBackgroundConfig,
      cloudSyncEnabled,
      updateCloudSyncEnabled,
      cloudProvider,
      updateCloudProvider,
      d1AuthKey,
      updateD1AuthKey,
      isD1Authenticated,
      updateD1Authenticated,
      verifyD1AuthKey,
      syncToSupabase,
      restoreFromSupabase,
      syncToD1,
      restoreFromD1
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
