import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Download, Eye } from 'lucide-react';
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
    if (!previewRef.current) return;
    
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="mr-2">📸</span>
            生成分享图
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* 预览区域 */}
          <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
            <div className="flex justify-center">
              <div 
                ref={previewRef}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"
                style={{ width: '720px', height: '360px' }}
              >
                <CurrentTemplate memo={memo} themeColor={themeColor} />
              </div>
            </div>
          </div>
          
          {/* 模板选择区域 */}
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">选择模板</h3>
            <Carousel className="w-full">
              <CarouselContent>
                {templates.map((template, index) => (
                  <CarouselItem key={index} className="md:basis-1/3">
                    <div 
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedTemplate === index 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedTemplate(index)}
                    >
                      <div className="text-center">
                        <div className="text-sm font-medium mb-1">{template.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedTemplate === index ? '已选择' : '点击选择'}
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
          
          {/* 操作按钮 */}
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button onClick={downloadShareImage} className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              下载分享图
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;