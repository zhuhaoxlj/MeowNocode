/**
 * 清空所有数据按钮组件
 */
import React, { useState } from 'react';
import { Trash2, AlertTriangle, Check } from 'lucide-react';
import { Button } from '../../src/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../src/components/ui/alert-dialog';

export default function ClearAllDataButton() {
  const [isClearing, setIsClearing] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  const handleClearAllData = async () => {
    setIsClearing(true);
    
    try {
      const response = await fetch('/api/clear-demo-data', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '清空数据失败');
      }

      if (result.success) {
        setIsCleared(true);
        toast.success(`成功清空所有数据！共清理了 ${result.clearedCount || 0} 条记录`);
        
        // 触发页面刷新
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        throw new Error(result.error || '清空失败');
      }
    } catch (error) {
      console.error('清空数据失败:', error);
      toast.error(`清空数据失败: ${error.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="sm"
          disabled={isClearing || isCleared}
          className="w-full"
        >
          {isClearing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              正在清空...
            </>
          ) : isCleared ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              已清空
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              清空所有数据
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <AlertDialogTitle className="text-red-600 dark:text-red-400">
              确认清空所有数据？
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-2">
            <p className="font-medium text-red-800 dark:text-red-200">
              ⚠️ 这是一个危险操作，将会：
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm ml-4">
              <li>永久删除所有备忘录内容</li>
              <li>清除所有标签和分类</li>
              <li>移除全部图片和附件</li>
              <li>重置所有设置和配置</li>
            </ul>
            <p className="font-medium text-red-800 dark:text-red-200 mt-3">
              此操作无法撤销！请确保您已经备份了重要数据。
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearAllData}
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isClearing}
          >
            {isClearing ? '正在清空...' : '确认清空'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}