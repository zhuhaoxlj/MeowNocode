import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseService } from '@/lib/database';
import { D1DatabaseService } from '@/lib/d1';
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
    setCloudProvider(provider);
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
      // 生成一个基于时间戳的简单用户ID，用于D1数据库
      const userId = localStorage.getItem('d1_user_id') || `d1_user_${Date.now()}`;
      if (!localStorage.getItem('d1_user_id')) {
        localStorage.setItem('d1_user_id', userId);
      }

      const result = await D1DatabaseService.syncUserData(userId);
      return result;
    } catch (error) {
      console.error('同步到D1失败:', error);
      return { success: false, message: error.message };
    }
  };

  const restoreFromD1 = async () => {
    try {
      // 获取之前生成的用户ID
      const userId = localStorage.getItem('d1_user_id');
      if (!userId) {
        throw new Error('未找到D1用户ID，请先同步数据到D1');
      }

      const result = await D1DatabaseService.restoreUserData(userId);
      return result;
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
      syncToSupabase,
      restoreFromSupabase,
      syncToD1,
      restoreFromD1
    }}>
      {children}
    </SettingsContext.Provider>
  );
}
