/**
 * Memos 数据库导入组件
 * 支持从 Memos 官方 SQLite 数据库导入数据
 */
import React, { useState } from 'react';
import { Button } from '../../src/components/ui/button';
import { Database, Upload, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

const MemosDbImport = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  
  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件类型
    if (!file.name.endsWith('.db')) {
      toast.error('请选择有效的 Memos 数据库文件 (.db)');
      return;
    }
    
    setIsImporting(true);
    setImportStatus(null);
    
    try {
      const formData = new FormData();
      formData.append('memosDb', file);
      
      // 上传并导入数据库文件
      const response = await fetch('/api/import/memos-db', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('导入失败');
      }
      
      const result = await response.json();
      
      setImportStatus({
        success: true,
        data: result,
      });
      
      toast.success(`成功导入 ${result.imported} 条备忘录！`);
      
      // 提示用户刷新页面
      setTimeout(() => {
        if (confirm('数据导入成功！是否刷新页面查看导入的数据？')) {
          window.location.reload();
        }
      }, 1000);
      
    } catch (error) {
      console.error('导入失败:', error);
      setImportStatus({
        success: false,
        error: error.message,
      });
      toast.error('导入失败: ' + error.message);
    } finally {
      setIsImporting(false);
      // 清空文件输入
      event.target.value = '';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="flex-1 text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">从 Memos 导入数据</p>
          <p className="text-blue-700 dark:text-blue-300">
            支持导入 Memos 官方的 SQLite 数据库文件（通常名为 memos_prod.db 或 memos_dev.db）。
            导入的数据包括所有备忘录、标签、置顶状态和归档状态。
          </p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <input
            type="file"
            id="memos-db-import"
            accept=".db"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isImporting}
          />
          <Button
            asChild
            variant="outline"
            className="w-full"
            disabled={isImporting}
          >
            <label htmlFor="memos-db-import" className="cursor-pointer">
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  正在导入...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  选择 Memos 数据库文件
                </>
              )}
            </label>
          </Button>
        </div>
        
        {importStatus && (
          <div className={`p-4 rounded-lg border ${
            importStatus.success 
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start space-x-3">
              {importStatus.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              )}
              <div className="flex-1 text-sm">
                {importStatus.success ? (
                  <>
                    <p className="font-medium text-green-800 dark:text-green-200 mb-1">
                      导入成功！
                    </p>
                    <p className="text-green-700 dark:text-green-300">
                      已成功导入 {importStatus.data.imported} 条备忘录
                      {importStatus.data.archived > 0 && ` (包含 ${importStatus.data.archived} 条归档)`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-red-800 dark:text-red-200 mb-1">
                      导入失败
                    </p>
                    <p className="text-red-700 dark:text-red-300">
                      {importStatus.error}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p className="font-medium">使用说明：</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li>找到你的 Memos 数据库文件（通常在 ~/.memos/ 目录）</li>
          <li>点击上方按钮选择数据库文件</li>
          <li>等待导入完成（大型数据库可能需要几分钟）</li>
          <li>导入完成后刷新页面查看数据</li>
        </ol>
        <p className="mt-2 text-yellow-600 dark:text-yellow-400">
          ⚠️ 注意：导入前会自动备份当前数据，但建议手动导出备份。
        </p>
      </div>
    </div>
  );
};

export default MemosDbImport;

