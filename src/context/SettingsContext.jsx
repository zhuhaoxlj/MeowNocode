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
  const [avatarConfig, setAvatarConfig] = useState({
    imageUrl: '' // 用户自定义头像URL
  });
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [cloudProvider, setCloudProvider] = useState('supabase'); // 'supabase' 或 'd1'
  const [aiConfig, setAiConfig] = useState({
    baseUrl: '',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    enabled: false
  });

  const [keyboardShortcuts, setKeyboardShortcuts] = useState({
    toggleSidebar: 'Tab',
    openAIDialog: 'Ctrl+Space',
    openSettings: 'Ctrl+,'
  });

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

    // 从localStorage加载头像设置
    const savedAvatarConfig = localStorage.getItem('avatarConfig');
    if (savedAvatarConfig) {
      try {
        setAvatarConfig(JSON.parse(savedAvatarConfig));
      } catch (error) {
        console.warn('Failed to parse Avatar config:', error);
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

  }, []);

  // 从localStorage加载AI配置
  useEffect(() => {
    const savedAiConfig = localStorage.getItem('aiConfig');
    if (savedAiConfig) {
      try {
        setAiConfig(JSON.parse(savedAiConfig));
      } catch (error) {
        console.warn('Failed to parse AI config:', error);
      }
    }
  }, []);

  // 从localStorage加载快捷键配置
  useEffect(() => {
    const savedKeyboardShortcuts = localStorage.getItem('keyboardShortcuts');
    if (savedKeyboardShortcuts) {
      try {
        setKeyboardShortcuts(JSON.parse(savedKeyboardShortcuts));
      } catch (error) {
        console.warn('Failed to parse keyboard shortcuts config:', error);
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
    // 保存头像设置到localStorage
    localStorage.setItem('avatarConfig', JSON.stringify(avatarConfig));
  }, [avatarConfig]);

  useEffect(() => {
    // 保存云端同步设置到localStorage
    localStorage.setItem('cloudSyncEnabled', JSON.stringify(cloudSyncEnabled));
  }, [cloudSyncEnabled]);

  useEffect(() => {
    // 保存云服务提供商设置到localStorage
    localStorage.setItem('cloudProvider', cloudProvider);
  }, [cloudProvider]);


  useEffect(() => {
    // 保存AI配置到localStorage
    localStorage.setItem('aiConfig', JSON.stringify(aiConfig));
  }, [aiConfig]);

  useEffect(() => {
    // 保存快捷键配置到localStorage
    localStorage.setItem('keyboardShortcuts', JSON.stringify(keyboardShortcuts));
  }, [keyboardShortcuts]);



  const updateHitokotoConfig = (newConfig) => {
    setHitokotoConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateFontConfig = (newConfig) => {
    setFontConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateBackgroundConfig = (newConfig) => {
    setBackgroundConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateAvatarConfig = (newConfig) => {
    setAvatarConfig(prev => ({ ...prev, ...newConfig }));
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


  const updateAiConfig = (newConfig) => {
    setAiConfig(prev => ({ ...prev, ...newConfig }));
  };

  const updateKeyboardShortcuts = (newConfig) => {
    setKeyboardShortcuts(prev => ({ ...prev, ...newConfig }));
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
      // 获取本地数据
      const localData = {
        memos: JSON.parse(localStorage.getItem('memos') || '[]'),
        pinnedMemos: JSON.parse(localStorage.getItem('pinnedMemos') || '[]'),
        themeColor: localStorage.getItem('themeColor') || '#818CF8',
        darkMode: localStorage.getItem('darkMode') || 'false',
        hitokotoConfig: JSON.parse(localStorage.getItem('hitokotoConfig') || '{"enabled":true,"types":["a","b","c","d","i","j","k"]}'),
        fontConfig: JSON.parse(localStorage.getItem('fontConfig') || '{"selectedFont":"default"}'),
        backgroundConfig: JSON.parse(localStorage.getItem('backgroundConfig') || '{"imageUrl":"","brightness":50,"blur":10}'),
        avatarConfig: JSON.parse(localStorage.getItem('avatarConfig') || '{"imageUrl":""}')
      };

      // 优先尝试使用API客户端（适用于Cloudflare Pages）
      try {
        const result = await D1ApiClient.syncUserData(localData);
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
      // 优先尝试使用API客户端（适用于Cloudflare Pages）
      try {
        const result = await D1ApiClient.restoreUserData();
        
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
            if (result.data.settings.avatar_config) {
              localStorage.setItem('avatarConfig', result.data.settings.avatar_config);
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
      avatarConfig,
      updateAvatarConfig,
      cloudSyncEnabled,
      updateCloudSyncEnabled,
      cloudProvider,
      updateCloudProvider,
      syncToSupabase,
      restoreFromSupabase,
      syncToD1,
      restoreFromD1,
      aiConfig,
      updateAiConfig,
      keyboardShortcuts,
      updateKeyboardShortcuts
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
