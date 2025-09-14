import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Eye, Image, Sparkles, X } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

// 导入模板组件
import BookmarkTemplate from './share-templates/BookmarkTemplate';

const ShareDialog = ({ isOpen, onClose, memo }) => {
  const { themeColor } = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const previewRef = useRef(null);
  
  // 模板列表
  const templates = [
    { name: '书签模板', component: BookmarkTemplate },
  ];

  // 关闭对话框时重置选择
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(0);
    }
  }, [isOpen]);

  // 下载分享图
  const downloadShareImage = async () => {
    if (!previewRef.current || !memo) return;
    
    try {
      // 使用html2canvas将预览区域转换为图片
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: null,
        logging: false,
      });
      
      // 创建下载链接
      const link = document.createElement('a');
      link.download = `memo-${memo.id}-${new Date().getTime()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('生成分享图失败:', error);
      alert('生成分享图失败，请重试');
    }
  };

  // 当前选中的模板组件
  const CurrentTemplate = templates[selectedTemplate].component;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none flex items-center justify-center [&>button]:hidden">
        <Card className="w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col bg-white dark:bg-gray-800 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-yellow-500" />
              生成分享图
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

          {/* 预览标题 - 固定不滚动 */}
          <div className="px-4 pt-4">
            <h3 className="text-sm font-medium">预览</h3>
          </div>
          
          {/* 预览区域 - 可滚动 */}
          <CardContent className="flex-1 overflow-y-auto scrollbar-hidden px-4">
            {memo ? (
              <div className="flex justify-center">
                <div
                  ref={previewRef}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
                  style={{
                    width: '100%',
                    maxWidth: '720px',
                  }}
                >
                  <CurrentTemplate memo={memo} themeColor={themeColor} />
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500 text-center">
                  <div className="text-lg mb-2">📝</div>
                  <div>请选择一个备忘录</div>
                </div>
              </div>
            )}
          </CardContent>
          
          {/* 模板选择区域 - 固定不滚动 */}
          <div className="px-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">选择模板</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {templates.map((template, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTemplate === index
                        ? 'border-current shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    } bg-white dark:bg-gray-700`}
                    style={selectedTemplate === index ? {
                      borderColor: themeColor,
                      backgroundColor: `${themeColor}10`
                    } : {}}
                    onClick={() => setSelectedTemplate(index)}
                  >
                    <div className="text-center">
                      <div className="text-sm font-medium mb-1">{template.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedTemplate === index ? '已选择' : '点击选择'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="p-4 pt-0 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">取消</Button>
            <Button 
              onClick={downloadShareImage} 
              disabled={!memo}
              className="flex items-center w-full sm:w-auto" 
              style={{ backgroundColor: themeColor }}
            >
              <Download className="h-4 w-4 mr-2" />
              下载分享图
            </Button>
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;