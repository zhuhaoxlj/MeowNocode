/**
 * Next.js 兼容的设置卡片组件
 * 移除了依赖 Node.js fs 模块的功能
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { X, Settings, ChevronDown, ChevronUp, Check, Music2, Type, Quote, Bot, Keyboard, Github, Star, Cloud, Database, Download, Upload } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import WorkingMemosImport from './WorkingMemosImport';
import ClearAllDataButton from './ClearAllDataButton';

const NextJsSettingsCard = ({ isOpen, onClose, onOpenTutorial }) => {
  const { themeColor, updateThemeColor } = useTheme();
  const { 
    hitokotoConfig, updateHitokotoConfig, 
    fontConfig, updateFontConfig, 
    backgroundConfig, updateBackgroundConfig, 
    avatarConfig, updateAvatarConfig, 
    cloudSyncEnabled, updateCloudSyncEnabled, 
    cloudProvider, updateCloudProvider, 
    aiConfig, updateAiConfig, 
    keyboardShortcuts, updateKeyboardShortcuts, 
    musicConfig, updateMusicConfig 
  } = useSettings();
  
  const { user, isAuthenticated, loginWithGitHub } = useAuth();
  const [tempColor, setTempColor] = useState(themeColor);
  const [activeTab, setActiveTab] = useState('general');
  const [isSyncing, setIsSyncing] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    hitokoto: false,
    font: false,
    appearance: false,
    ai: false,
    music: false,
    keyboard: false,
    storage: false,
    about: false
  });

  useEffect(() => {
    if (isOpen) {
      setTempColor(themeColor);
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
    if (field === 'imageUrl') {
      updateBackgroundConfig({ imageUrl: value, useRandom: value ? false : backgroundConfig.useRandom });
      return;
    }
    updateBackgroundConfig({ [field]: value });
  };

  const handleAvatarConfigChange = (field, value) => {
    if (updateAvatarConfig) {
      updateAvatarConfig({ [field]: value });
    }
  };

  const handleHitokotoTypeToggle = (type) => {
    const newTypes = hitokotoConfig.types.includes(type)
      ? hitokotoConfig.types.filter(t => t !== type)
      : [...hitokotoConfig.types, type];
    updateHitokotoConfig({ types: newTypes });
  };

  const handleExportLocalData = () => {
    const data = {
      memos: localStorage.getItem('memos') || '[]',
      pinnedMemos: localStorage.getItem('pinnedMemos') || '[]',
      themeColor: localStorage.getItem('themeColor') || '#818CF8',
      darkMode: localStorage.getItem('darkMode') || 'false',
      hitokotoConfig: localStorage.getItem('hitokotoConfig') || '{"enabled":true,"types":["a","b","c","d","i","j","k"]}',
      fontConfig: localStorage.getItem('fontConfig') || '{"selectedFont":"default"}',
      backgroundConfig: localStorage.getItem('backgroundConfig') || '{"imageUrl":"","brightness":50,"blur":10,"useRandom":false}'
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

    toast.success('本地数据导出成功');
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
          localStorage.setItem('backgroundConfig', data.backgroundConfig || '{"imageUrl":"","brightness":50,"blur":10,"useRandom":false}');
          
          toast.success('本地数据导入成功，请刷新页面查看');
        } else {
          toast.error('导入文件格式不正确');
        }
      } catch (error) {
        toast.error('解析文件失败: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const handleFontChange = (fontName) => {
    updateFontConfig({ selectedFont: fontName });
  };

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

        <CardContent className="space-y-6 flex-1 overflow-y-auto">
          {/* 常规设置 */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* 主题色设置 */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">主题色</Label>
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

              {/* 字体设置 */}
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleSection('font')}
                >
                  <Label className="text-sm font-medium cursor-pointer flex items-center">
                    <Type className="h-4 w-4 mr-2" />
                    字体设置
                  </Label>
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

                {expandedSections.font && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4 pl-4 pr-2 pb-4">
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
                    </div>
                  </div>
                )}
              </div>

              {/* 一言设置 */}
              <div className="space-y-4">
                <div
                  className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  onClick={() => toggleSection('hitokoto')}
                >
                  <Label className="text-sm font-medium cursor-pointer flex items-center">
                    <Quote className="h-4 w-4 mr-2" />
                    一言设置
                  </Label>
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

                {expandedSections.hitokoto && (
                  <div className="animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4 pl-4 pr-2 pb-4">
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
              {/* 本地数据管理 */}
              <div className="space-y-4">
                <Label className="text-sm font-medium block">本地数据管理</Label>
                
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
                
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  本地数据包含所有想法、标签和设置，导出为JSON格式
                </p>

                {/* 从 Memos 导入 */}
                <div className="mt-6">
                  <WorkingMemosImport />
                </div>

                {/* 清空数据 */}
                <div className="mt-6 p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950/20">
                  <div className="flex items-center space-x-2 mb-3">
                    <Database className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <Label className="text-sm font-medium text-red-800 dark:text-red-200">
                      危险操作
                    </Label>
                  </div>
                  
                  <p className="text-xs text-red-700 dark:text-red-300 mb-4">
                    此操作将永久删除所有备忘录、标签和附件数据，无法恢复！
                  </p>
                  
                  <ClearAllDataButton />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NextJsSettingsCard;