import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { X, Palette, Download, Upload, AlertCircle, CheckCircle, Settings, Database, ChevronDown, ChevronUp, Check, Image as ImageIcon, Github, Cloud, Server } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import ImageUpload from './ImageUpload';

const SettingsCard = ({ isOpen, onClose }) => {
  const { themeColor, updateThemeColor } = useTheme();
  const { hitokotoConfig, updateHitokotoConfig, fontConfig, updateFontConfig, backgroundConfig, updateBackgroundConfig, cloudSyncEnabled, updateCloudSyncEnabled, syncToSupabase, restoreFromSupabase, syncToD1, restoreFromD1, cloudProvider, updateCloudProvider } = useSettings();
  const { user, isAuthenticated, loginWithGitHub } = useAuth();
  const [tempColor, setTempColor] = useState(themeColor);
  const [activeTab, setActiveTab] = useState('general');

  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSyncing, setIsSyncing] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    hitokoto: false,
    font: false,
    background: false
  });
  const [isD1Available, setIsD1Available] = useState(false);
  const [fontLoading, setFontLoading] = useState(false);



  useEffect(() => {
    if (isOpen) {
      setTempColor(themeColor);
      setMessage({ type: '', text: '' });
      
      // 检查是否在Cloudflare环境中运行
      const checkD1Availability = () => {
        // 在Cloudflare Workers环境中，DB会自动绑定到全局变量
        if (typeof DB !== 'undefined') {
          setIsD1Available(true);
          return;
        }
        
        // 检查是否在Cloudflare Pages环境中
        if (import.meta.env.VITE_CF_PAGES === 'true') {
          setIsD1Available(true);
          return;
        }
        
        setIsD1Available(false);
      };
      
      checkD1Availability();
    }
  }, [isOpen, themeColor]);

  const handleCustomColorChange = (e) => {
    const color = e.target.value;
    setTempColor(color);
    updateThemeColor(color);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };



  const handleHitokotoConfigChange = (field, value) => {
    updateHitokotoConfig({ [field]: value });
  };

  const handleBackgroundConfigChange = (field, value) => {
    updateBackgroundConfig({ [field]: value });
  };

  const handleHitokotoTypeToggle = (type) => {
    const newTypes = hitokotoConfig.types.includes(type)
      ? hitokotoConfig.types.filter(t => t !== type)
      : [...hitokotoConfig.types, type];
    updateHitokotoConfig({ types: newTypes });
  };



  // Supabase同步处理函数
  const handleSupabaseSync = async () => {
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: '请先登录GitHub账号' });
      return;
    }

    setIsSyncing(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await syncToSupabase();
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSupabaseRestore = async () => {
    if (!isAuthenticated) {
      setMessage({ type: 'error', text: '请先登录GitHub账号' });
      return;
    }

    setIsSyncing(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await restoreFromSupabase();
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  // D1同步处理函数
  const handleD1Sync = async () => {
    setIsSyncing(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await syncToD1();
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleD1Restore = async () => {
    setIsSyncing(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await restoreFromD1();
      setMessage({
        type: result.success ? 'success' : 'error',
        text: result.message
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCloudProviderChange = (provider) => {
    updateCloudProvider(provider);
  };

  const handleGitHubLogin = async () => {
    try {
      const result = await loginWithGitHub();
      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '登录失败' });
    }
  };

  const handleExportLocalData = () => {
    const data = {
      memos: localStorage.getItem('memos') || '[]',
      pinnedMemos: localStorage.getItem('pinnedMemos') || '[]',
      themeColor: localStorage.getItem('themeColor') || '#818CF8',
      darkMode: localStorage.getItem('darkMode') || 'false',
      hitokotoConfig: localStorage.getItem('hitokotoConfig') || '{"enabled":true,"types":["a","b","c","d","i","j","k"]}',
      fontConfig: localStorage.getItem('fontConfig') || '{"selectedFont":"default"}'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meow-app-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setMessage({
      type: 'success',
      text: '本地数据导出成功'
    });
  };

  const handleImportLocalData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        
        if (data.memos && data.pinnedMemos) {
          localStorage.setItem('memos', data.memos);
          localStorage.setItem('pinnedMemos', data.pinnedMemos);
          localStorage.setItem('themeColor', data.themeColor || '#818CF8');
          localStorage.setItem('darkMode', data.darkMode || 'false');
          localStorage.setItem('hitokotoConfig', data.hitokotoConfig || '{"enabled":true,"types":["a","b","c","d","i","j","k"]}');
          localStorage.setItem('fontConfig', data.fontConfig || '{"selectedFont":"default"}');
          localStorage.setItem('backgroundConfig', data.backgroundConfig || '{"imageUrl":"","brightness":50,"blur":10}');
          
          setMessage({
            type: 'success',
            text: '本地数据导入成功，请刷新页面查看'
          });
        } else {
          setMessage({
            type: 'error',
            text: '导入文件格式不正确'
          });
        }
      } catch (error) {
        setMessage({
          type: 'error',
          text: '解析文件失败: ' + error.message
        });
      }
    };
    reader.readAsText(file);
  };

  // 处理字体选择变化
  const handleFontChange = async (fontName) => {
    if (fontName !== 'default') {
      setFontLoading(true);
      // 模拟字体加载时间
      setTimeout(() => {
        setFontLoading(false);
      }, 1000);
    }

    updateFontConfig({ selectedFont: fontName });
  };

  // 切换折叠面板
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Settings className="h-5 w-5 mr-2" style={{ color: themeColor }} />
            设置
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        {/* 标签页导航 */}
        <div className="px-6 pb-4">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'general'
                  ? 'bg-white dark:bg-gray-800 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              style={activeTab === 'general' ? { color: themeColor } : {}}
            >
              <Settings className="h-4 w-4 mr-2" />
              常规
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'data'
                  ? 'bg-white dark:bg-gray-800 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              style={activeTab === 'data' ? { color: themeColor } : {}}
            >
              <Database className="h-4 w-4 mr-2" />
              数据
            </button>
          </div>
        </div>

        {/* 滚动容器 - 添加了scrollbar-hidden类 */}
        <CardContent className="space-y-6 flex-1 overflow-y-auto scrollbar-hidden">
          {/* 消息提示 */}
          {message.text && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* 常规设置 */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* 主题色设置 */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">主题色</Label>

                {/* 自定义颜色输入 */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-10 h-10 rounded-lg border-2 border-gray-200 dark:border-gray-600 flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: tempColor }}
                      title="颜色预览"
                    />
                    <Input
                      type="text"
                      value={tempColor}
                      onChange={(e) => handleCustomColorChange(e)}
                      placeholder="#818CF8"
                      className="flex-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 字体设置 - 改为折叠面板 */}
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleSection('font')}
                >
                  <Label className="text-sm font-medium cursor-pointer">字体设置</Label>
                  <button
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('font');
                    }}
                  >
                    {expandedSections.font ?
                      <ChevronUp className="h-4 w-4" /> :
                      <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                </div>

                {/* 折叠内容 - 添加平滑过渡动画 */}
                {expandedSections.font && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                  <div id="font-form-container" className="space-y-4 pl-4 pr-2 pb-4">
                    {/* 字体选择网格 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { value: 'default', name: '默认字体', preview: 'Aa 默认', desc: '系统默认字体' },
                        { value: 'jinghua', name: '京华老宋体', preview: 'Aa 宋体', desc: '传统宋体，适合正式文档' },
                        { value: 'lxgw', name: '霞鹜文楷', preview: 'Aa 文楷', desc: '现代楷体，易读性佳' },
                        { value: 'kongshan', name: '空山', preview: 'Aa 空山', desc: '艺术字体，独特风格' }
                      ].map((font) => (
                      <button
                        key={font.value}
                        onClick={() => handleFontChange(font.value)}
                        title={font.desc}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md ${
                          fontConfig.selectedFont === font.value
                            ? 'border-current shadow-md'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        } bg-white dark:bg-gray-700`}
                        style={fontConfig.selectedFont === font.value ? {
                          borderColor: themeColor,
                          backgroundColor: `${themeColor}10`
                        } : {}}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col space-y-1 flex-1">
                            <div
                              className={`text-lg font-medium ${
                                font.value !== 'default' ? `font-preview-${font.value}` : ''
                              }`}
                            >
                              {font.preview}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {font.name}
                            </div>
                          </div>
                          {fontConfig.selectedFont === font.value && (
                            <Check
                              className="h-4 w-4 flex-shrink-0 mt-1"
                              style={{ color: themeColor }}
                            />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* 字体预览区域 */}
                  <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">预览效果：</div>
                    {fontLoading ? (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-current"></div>
                        <span>字体加载中...</span>
                      </div>
                    ) : (
                      <div
                        className={`text-sm text-gray-900 dark:text-white transition-all duration-300 ${
                          fontConfig.selectedFont !== 'default' ? 'custom-font-content' : ''
                        }`}
                      >
                        现在的想法是……记录生活中的点点滴滴，感受文字的魅力。
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    字体将应用于所有Memos、编辑器、每日一言和标签管理
                  </p>
                  </div>
                  </div>
                )}
              </div>

              {/* 背景设置 - 折叠面板 */}
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleSection('background')}
                >
                  <Label className="text-sm font-medium cursor-pointer">背景设置</Label>
                  <button
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('background');
                    }}
                  >
                    {expandedSections.background ?
                      <ChevronUp className="h-4 w-4" /> :
                      <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                </div>

                {/* 折叠内容 - 添加平滑过渡动画 */}
                {expandedSections.background && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4 pl-4 pr-2 pb-4">
                      {/* 背景图片设置 */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">背景图片</Label>
                        <ImageUpload
                          value={backgroundConfig.imageUrl}
                          onChange={(url) => handleBackgroundConfigChange('imageUrl', url)}
                          onClear={() => handleBackgroundConfigChange('imageUrl', '')}
                        />
                      </div>

                      {/* 只有当有背景图片时才显示效果调节 */}
                      {backgroundConfig.imageUrl && (
                        <div className="space-y-4">
                          {/* 亮度调节 */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              亮度 ({backgroundConfig.brightness}%)
                            </Label>
                            <Slider
                              value={[backgroundConfig.brightness]}
                              onValueChange={(value) => handleBackgroundConfigChange('brightness', value[0])}
                              max={100}
                              min={0}
                              step={1}
                              className="w-full"
                            />
                          </div>

                          {/* 磨砂玻璃效果调节 */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">
                              磨砂玻璃效果 ({backgroundConfig.blur}px)
                            </Label>
                            <Slider
                              value={[backgroundConfig.blur]}
                              onValueChange={(value) => handleBackgroundConfigChange('blur', value[0])}
                              max={50}
                              min={0}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {backgroundConfig.imageUrl
                          ? '调节亮度和磨砂玻璃效果，点击图片右上角×可移除背景'
                          : '拖拽图片文件或粘贴图片链接来设置背景'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 一言设置 - 改为折叠面板 */}
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleSection('hitokoto')}
                >
                  <Label className="text-sm font-medium cursor-pointer">一言设置</Label>
                  <button
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection('hitokoto');
                    }}
                  >
                    {expandedSections.hitokoto ?
                      <ChevronUp className="h-4 w-4" /> :
                      <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                </div>

                {/* 折叠内容 - 添加平滑过渡动画 */}
                {expandedSections.hitokoto && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                  <div id="hitokoto-form-container" className="space-y-4 pl-4 pr-2 pb-4">
                      {/* 一言启用开关 */}
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">显示一言</Label>
                        <button
                          onClick={() => handleHitokotoConfigChange('enabled', !hitokotoConfig.enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            hitokotoConfig.enabled
                              ? 'bg-blue-600'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                          style={hitokotoConfig.enabled ? { backgroundColor: themeColor } : {}}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              hitokotoConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* 一言类型选择 */}
                      {hitokotoConfig.enabled && (
                        <div className="space-y-3">
                          <Label className="text-sm">句子类型（可多选）</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'a', label: '动画' },
                              { key: 'b', label: '漫画' },
                              { key: 'c', label: '游戏' },
                              { key: 'd', label: '文学' },
                              { key: 'i', label: '诗词' },
                              { key: 'j', label: '网易云' },
                              { key: 'k', label: '哲学' }
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                onClick={() => handleHitokotoTypeToggle(key)}
                                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                  hitokotoConfig.types.includes(key)
                                    ? 'border-transparent text-white'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                                }`}
                                style={hitokotoConfig.types.includes(key) ? {
                                  backgroundColor: themeColor,
                                  borderColor: themeColor
                                } : {}}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {hitokotoConfig.types.length === 0 && (
                            <p className="text-xs text-red-500">请至少选择一种句子类型</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 数据管理设置 */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* 云端同步设置 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center">
                    <Cloud className="h-4 w-4 mr-2" />
                    云端数据同步
                  </Label>
                  <button
                    onClick={() => updateCloudSyncEnabled(!cloudSyncEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      cloudSyncEnabled
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    style={cloudSyncEnabled ? { backgroundColor: themeColor } : {}}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        cloudSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {cloudSyncEnabled && (
                  <>
                    {/* 云服务提供商选择 */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">选择云服务提供商</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleCloudProviderChange('supabase')}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            cloudProvider === 'supabase'
                              ? 'border-current bg-current/10'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                          style={cloudProvider === 'supabase' ? { borderColor: themeColor } : {}}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            <Cloud className="h-6 w-6" style={cloudProvider === 'supabase' ? { color: themeColor } : {}} />
                            <span className="text-xs font-medium">Supabase</span>
                          </div>
                        </button>
                        <button
                          onClick={() => handleCloudProviderChange('d1')}
                          disabled={!isD1Available}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            cloudProvider === 'd1'
                              ? 'border-current bg-current/10'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          } ${!isD1Available ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={cloudProvider === 'd1' ? { borderColor: themeColor } : {}}
                        >
                          <div className="flex flex-col items-center space-y-1">
                            <Server className="h-6 w-6" style={cloudProvider === 'd1' ? { color: themeColor } : {}} />
                            <span className="text-xs font-medium">Cloudflare D1</span>
                          </div>
                        </button>
                      </div>
                      {!isD1Available && cloudProvider === 'd1' && (
                        <p className="text-xs text-red-500">
                          Cloudflare D1 仅在 Cloudflare Workers/Pages 环境中可用
                        </p>
                      )}
                    </div>

                    {/* 根据选择的提供商显示不同的登录和同步选项 */}
                    {cloudProvider === 'supabase' && (
                      <>
                        {!isAuthenticated ? (
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center space-x-3">
                              <Github className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  登录GitHub账号
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  登录后可以将数据同步到Supabase，在不同设备间保持数据一致
                                </p>
                              </div>
                              <Button
                                onClick={handleGitHubLogin}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                <Github className="h-4 w-4 mr-2" />
                                登录
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm text-green-800 dark:text-green-200">
                                  已登录: {user?.user_metadata?.user_name || user?.email}
                                </span>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                onClick={handleSupabaseSync}
                                disabled={isSyncing}
                                size="sm"
                                className="flex-1"
                                style={{ backgroundColor: themeColor }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {isSyncing ? '同步中...' : '备份到Supabase'}
                              </Button>
                              <Button
                                onClick={handleSupabaseRestore}
                                disabled={isSyncing}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {isSyncing ? '恢复中...' : '从Supabase恢复'}
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {cloudProvider === 'd1' && (
                      <>
                        {isD1Available ? (
                          <div className="space-y-3">
                            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-sm text-green-800 dark:text-green-200">
                                  已连接到Cloudflare D1数据库
                                </span>
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                onClick={handleD1Sync}
                                disabled={isSyncing}
                                size="sm"
                                className="flex-1"
                                style={{ backgroundColor: themeColor }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                {isSyncing ? '同步中...' : '备份到D1'}
                              </Button>
                              <Button
                                onClick={handleD1Restore}
                                disabled={isSyncing}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {isSyncing ? '恢复中...' : '从D1恢复'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center space-x-3">
                              <Server className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                                  Cloudflare D1 不可用
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                  请在 Cloudflare Workers/Pages 环境中部署应用，并绑定 D1 数据库
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              {/* 本地数据管理 */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Label className="text-sm font-medium block mb-4">本地数据管理</Label>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={handleExportLocalData}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    导出本地数据
                  </Button>
                  
                  <input
                    type="file"
                    id="import-local-data"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportLocalData}
                  />
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <label htmlFor="import-local-data">
                      <Upload className="h-4 w-4 mr-2" />
                      导入本地数据
                    </label>
                  </Button>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  本地数据包含所有想法、标签和设置，导出为JSON格式
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsCard;
