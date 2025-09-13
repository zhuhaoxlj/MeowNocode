/**
 * 存储系统演示组件
 * 展示如何使用新的多存储方案
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Cloud, HardDrive, Globe, RefreshCw, Settings, FileText } from 'lucide-react';
import StorageSelector from './StorageSelector';
import { newDataService } from '@/lib/newDataService.js';
import { storageManager } from '@/lib/storage/StorageManager.js';
import { toast } from 'sonner';

const STORAGE_ICONS = {
  browser: <Globe className="w-4 h-4" />,
  localdb: <Database className="w-4 h-4" />,
  cloudflare: <Cloud className="w-4 h-4" />,
  s3: <HardDrive className="w-4 h-4" />
};

export default function StorageDemo() {
  const [storageInfo, setStorageInfo] = useState(null);
  const [supportedTypes, setSupportedTypes] = useState([]);
  const [healthStatus, setHealthStatus] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [memos, setMemos] = useState([]);

  // 加载存储信息
  const loadStorageInfo = async () => {
    try {
      setIsLoading(true);
      
      // 确保服务已初始化
      await newDataService.initialize();
      
      const [info, types, health, allMemos] = await Promise.all([
        newDataService.getStorageInfo(),
        storageManager.getSupportedStorageTypes(),
        newDataService.healthCheck(),
        newDataService.getAllMemos()
      ]);
      
      setStorageInfo(info);
      setSupportedTypes(types);
      setHealthStatus(health);
      setMemos(allMemos.slice(0, 5)); // 显示前5条
    } catch (error) {
      console.error('加载存储信息失败:', error);
      toast.error(`加载失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStorageInfo();
  }, []);

  // 刷新数据
  const handleRefresh = async () => {
    await loadStorageInfo();
    toast.success('数据已刷新');
  };

  // 创建测试备忘录
  const createTestMemo = async () => {
    try {
      const testContent = `测试备忘录 - ${new Date().toLocaleString()} #测试`;
      await newDataService.createMemo({
        content: testContent,
        tags: ['测试'],
        pinned: false
      });
      
      await loadStorageInfo(); // 刷新数据
      toast.success('测试备忘录已创建');
    } catch (error) {
      toast.error(`创建失败: ${error.message}`);
    }
  };

  // 导出数据
  const handleExportData = async () => {
    try {
      const exportedData = await newDataService.exportData();
      
      const dataStr = JSON.stringify(exportedData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `storage-demo-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('数据导出成功');
    } catch (error) {
      toast.error(`导出失败: ${error.message}`);
    }
  };

  // 渲染当前存储状态
  const renderCurrentStorage = () => {
    if (!storageInfo) return <div>加载中...</div>;

    const currentType = supportedTypes.find(t => t.type === storageInfo.currentType);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {STORAGE_ICONS[storageInfo.currentType]}
            当前存储方式
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{currentType?.name}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {currentType?.description}
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={healthStatus?.healthy ? 'default' : 'destructive'}>
                {healthStatus?.healthy ? '健康' : '异常'}
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{storageInfo.totalMemos}</div>
              <div className="text-sm text-gray-600">普通备忘录</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{storageInfo.pinnedMemos}</div>
              <div className="text-sm text-gray-600">置顶备忘录</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{storageInfo.totalCount}</div>
              <div className="text-sm text-gray-600">总计</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染存储类型列表
  const renderStorageTypes = () => (
    <Card>
      <CardHeader>
        <CardTitle>支持的存储类型</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supportedTypes.map(type => (
            <div key={type.type} className="flex items-center gap-3 p-3 border rounded-lg">
              <span className="text-2xl">{type.icon}</span>
              <div className="flex-1">
                <div className="font-medium">{type.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {type.description}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {storageInfo?.currentType === type.type && (
                  <Badge variant="default" className="text-xs">当前</Badge>
                )}
                {type.disabled && (
                  <Badge variant="secondary" className="text-xs">禁用</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // 渲染最近的备忘录
  const renderRecentMemos = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          最近的备忘录
        </CardTitle>
      </CardHeader>
      <CardContent>
        {memos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div>暂无备忘录</div>
            <Button className="mt-2" onClick={createTestMemo}>
              创建测试备忘录
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {memos.map((memo, index) => (
              <div key={memo.id || index} className="p-3 border rounded-lg">
                <div className="text-sm line-clamp-2 mb-1">
                  {memo.content}
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex gap-1">
                    {memo.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    {new Date(memo.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
            
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" onClick={createTestMemo}>
                创建新的测试备忘录
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // 渲染操作面板
  const renderActionPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle>操作面板</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新数据
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowSelector(true)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            存储设置
          </Button>
          
          <Button
            variant="outline"
            onClick={createTestMemo}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            创建测试
          </Button>
          
          <Button
            variant="outline"
            onClick={handleExportData}
            className="flex items-center gap-2"
          >
            <HardDrive className="w-4 h-4" />
            导出数据
          </Button>
        </div>
        
        {/* 健康状态 */}
        <div className="pt-4 border-t">
          <div className="text-sm font-medium mb-2">系统状态</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              healthStatus?.healthy ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm">
              {healthStatus?.healthy ? '存储服务正常' : '存储服务异常'}
            </span>
            {healthStatus?.storageType && (
              <Badge variant="outline" className="text-xs">
                {healthStatus.storageType}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">多存储方案演示</h1>
        <p className="text-gray-600 dark:text-gray-400">
          基于 memos 架构的灵活存储解决方案
        </p>
      </div>

      {/* 主要内容 */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="storage">存储类型</TabsTrigger>
          <TabsTrigger value="data">数据管理</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderCurrentStorage()}
            {renderActionPanel()}
          </div>
          {renderRecentMemos()}
        </TabsContent>
        
        <TabsContent value="storage" className="space-y-6">
          {renderStorageTypes()}
        </TabsContent>
        
        <TabsContent value="data" className="space-y-6">
          {renderRecentMemos()}
        </TabsContent>
      </Tabs>

      {/* 存储选择器 */}
      <StorageSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onStorageChanged={async (type, config) => {
          console.log('存储已切换:', type, config);
          await loadStorageInfo(); // 刷新数据
        }}
      />
    </div>
  );
}