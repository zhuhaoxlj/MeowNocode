/**
 * 存储方式选择器组件
 * 允许用户选择和配置不同的存储方式
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle2, Database, Upload, Download, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { storageManager } from '@/lib/storage/StorageManager.js';

export default function StorageSelector({ isOpen, onClose, onStorageChanged }) {
  const [supportedTypes, setSupportedTypes] = useState([]);
  const [currentType, setCurrentType] = useState('');
  const [currentConfig, setCurrentConfig] = useState({});
  const [configForm, setConfigForm] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState({});
  const [storageStats, setStorageStats] = useState(null);

  // 加载当前存储状态
  useEffect(() => {
    loadCurrentStorage();
    loadSupportedTypes();
  }, []);

  const loadCurrentStorage = async () => {
    try {
      const type = storageManager.getCurrentStorageType();
      const config = storageManager.getCurrentConfig();
      const stats = await storageManager.getStorageStats();
      
      setCurrentType(type || '');
      setCurrentConfig(config || {});
      setConfigForm(config || {});
      setStorageStats(stats);
    } catch (error) {
      console.error('加载当前存储状态失败:', error);
    }
  };

  const loadSupportedTypes = async () => {
    try {
      const types = storageManager.getSupportedStorageTypes();
      setSupportedTypes(types);
    } catch (error) {
      console.error('加载支持的存储类型失败:', error);
    }
  };

  // 测试存储连接
  const testStorageConnection = async (type, config = {}) => {
    setIsLoading(true);
    try {
      const result = await storageManager.testStorageType(type, config);
      setTestResults(prev => ({
        ...prev,
        [type]: result
      }));
      
      if (result.success) {
        toast.success(`${supportedTypes.find(t => t.type === type)?.name} 连接成功`);
      } else {
        toast.error(`连接失败: ${result.error || '未知错误'}`);
      }
      
      return result.success;
    } catch (error) {
      const errorResult = { success: false, error: error.message };
      setTestResults(prev => ({
        ...prev,
        [type]: errorResult
      }));
      toast.error(`连接测试失败: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 切换存储类型
  const switchStorageType = async (type, config = {}, migrateData = true) => {
    setIsLoading(true);
    try {
      await storageManager.switchStorageType(type, config, migrateData);
      
      // 更新状态
      setCurrentType(type);
      setCurrentConfig(config);
      await loadCurrentStorage();
      
      // 通知父组件
      if (onStorageChanged) {
        onStorageChanged(type, config);
      }
      
      toast.success('存储方式切换成功');
    } catch (error) {
      toast.error(`切换失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染存储类型卡片
  const renderStorageTypeCard = (typeInfo) => {
    const isActive = currentType === typeInfo.type;
    const testResult = testResults[typeInfo.type];
    
    return (
      <Card key={typeInfo.type} className={`relative ${isActive ? 'ring-2 ring-blue-500' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{typeInfo.icon}</span>
              <span>{typeInfo.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {isActive && <Badge variant="default">当前使用</Badge>}
              {typeInfo.disabled && <Badge variant="secondary">暂不可用</Badge>}
              {testResult?.success && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {testResult?.success === false && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">{typeInfo.description}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 优缺点 */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-medium text-green-600 dark:text-green-400 mb-1">优势</div>
              <ul className="space-y-1">
                {typeInfo.pros.map((pro, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <div className="font-medium text-amber-600 dark:text-amber-400 mb-1">限制</div>
              <ul className="space-y-1">
                {typeInfo.cons.map((con, idx) => (
                  <li key={idx} className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 配置表单 */}
          {typeInfo.requiresConfig && typeInfo.configFields && (
            <div className="space-y-3 border-t pt-3">
              <div className="font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                配置选项
              </div>
              
              {typeInfo.configFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`${typeInfo.type}_${field.key}`} className="text-xs">
                    {field.label}
                    {field.required !== false && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {field.type === 'boolean' ? (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`${typeInfo.type}_${field.key}`}
                        checked={configForm[field.key] ?? field.default ?? false}
                        onCheckedChange={(checked) => setConfigForm(prev => ({
                          ...prev,
                          [field.key]: checked
                        }))}
                      />
                      <span className="text-sm text-gray-600">
                        {configForm[field.key] ?? field.default ? '开启' : '关闭'}
                      </span>
                    </div>
                  ) : field.type === 'select' && field.options ? (
                    <Select
                      value={configForm[field.key] || field.default || ''}
                      onValueChange={(value) => setConfigForm(prev => ({
                        ...prev,
                        [field.key]: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`选择${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`${typeInfo.type}_${field.key}`}
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={configForm[field.key] || field.default || ''}
                      onChange={(e) => setConfigForm(prev => ({
                        ...prev,
                        [field.key]: e.target.value
                      }))}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 测试结果 */}
          {testResult && (
            <div className={`text-xs p-2 rounded ${
              testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResult.success ? (
                <div>
                  ✅ 连接成功
                  {testResult.responseTime && ` (${testResult.responseTime}ms)`}
                </div>
              ) : (
                <div>❌ 连接失败: {testResult.error}</div>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={() => testStorageConnection(typeInfo.type, configForm)}
              disabled={isLoading || typeInfo.disabled}
            >
              测试连接
            </Button>
            
            {!isActive && (
              <Button
                size="sm"
                onClick={() => switchStorageType(typeInfo.type, configForm, true)}
                disabled={isLoading || typeInfo.disabled}
              >
                使用此存储
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染数据管理标签页
  const renderDataManagementTab = () => (
    <div className="space-y-6">
      {/* 当前存储状态 */}
      {storageStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              当前存储状态
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">{storageStats.totalMemos}</div>
                <div className="text-sm text-gray-600">普通备忘录</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-purple-600">{storageStats.pinnedMemos}</div>
                <div className="text-sm text-gray-600">置顶备忘录</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">{storageStats.totalCount}</div>
                <div className="text-sm text-gray-600">总计</div>
              </div>
              <div className="space-y-1">
                <div className={`text-2xl font-bold ${storageStats.healthy ? 'text-green-600' : 'text-red-600'}`}>
                  {storageStats.healthy ? '✅' : '❌'}
                </div>
                <div className="text-sm text-gray-600">健康状态</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据操作 */}
      <Card>
        <CardHeader>
          <CardTitle>数据管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleExportData}
              disabled={isLoading}
            >
              <Download className="w-4 h-4" />
              导出数据
            </Button>
            
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={handleImportData}
              disabled={isLoading}
            >
              <Upload className="w-4 h-4" />
              导入数据
            </Button>
          </div>
          
          {/* 本地数据库特殊操作 */}
          {currentType === 'localdb' && (
            <div className="border-t pt-4 space-y-2">
              <div className="text-sm font-medium">本地数据库文件操作</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportDatabaseFile}
                  disabled={isLoading}
                >
                  导出 SQLite 文件
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleImportDatabaseFile}
                  disabled={isLoading}
                >
                  导入 SQLite 文件
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // 处理数据导出
  const handleExportData = async () => {
    try {
      setIsLoading(true);
      const exportedData = await storageManager.exportData();
      
      const dataStr = JSON.stringify(exportedData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `meownocode-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('数据导出成功');
    } catch (error) {
      toast.error(`导出失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理数据导入
  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        setIsLoading(true);
        const text = await file.text();
        const importData = JSON.parse(text);
        
        const result = await storageManager.importData(
          importData.memos || [],
          importData.pinnedMemos || []
        );
        
        toast.success(`导入成功: ${result.successful} 条记录`);
        await loadCurrentStorage();
      } catch (error) {
        toast.error(`导入失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  // 处理数据库文件导出
  const handleExportDatabaseFile = async () => {
    try {
      setIsLoading(true);
      const result = await storageManager.exportDatabaseFile();
      
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('数据库文件导出成功');
    } catch (error) {
      toast.error(`导出失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理数据库文件导入
  const handleImportDatabaseFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db,.sqlite,.sqlite3';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        setIsLoading(true);
        await storageManager.importDatabaseFile(file);
        toast.success('数据库文件导入成功');
        await loadCurrentStorage();
      } catch (error) {
        toast.error(`导入失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">存储方式设置</h2>
            <Button variant="outline" onClick={onClose}>
              关闭
            </Button>
          </div>
        </div>
        
        <div className="p-6 h-[calc(100%-80px)] overflow-auto">
          <Tabs defaultValue="storage-types" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="storage-types">存储类型</TabsTrigger>
              <TabsTrigger value="data-management">数据管理</TabsTrigger>
            </TabsList>
            
            <TabsContent value="storage-types" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {supportedTypes.map(renderStorageTypeCard)}
              </div>
            </TabsContent>
            
            <TabsContent value="data-management" className="mt-6">
              {renderDataManagementTab()}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}