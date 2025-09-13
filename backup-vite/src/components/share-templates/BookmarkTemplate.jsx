import React from 'react';
import { useTheme } from '@/context/ThemeContext';

const BookmarkTemplate = ({ memo, themeColor }) => {
  const { currentFont } = useTheme();

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 根据文本长度计算合适的高度
  const calculateHeight = (content) => {
    const baseHeight = 360; // 基础高度
    const charCount = content.length;
    const lineCount = content.split('\n').length;

    // 每20个字符增加60px高度，每行增加50px高度
    const additionalHeight = Math.floor(charCount / 20) * 60 + (lineCount - 1) * 50;

    // 最小高度360px，最大高度2000px
    return Math.min(Math.max(baseHeight + additionalHeight, 360), 2000);
  };

  const cardHeight = calculateHeight(memo.content);

  return (
    <div
      className="w-full bg-[#f9f6f2] rounded-lg overflow-hidden relative"
      style={{ height: `${cardHeight}px` }}
    >
      <div className="w-full h-full">
        {/* 内容区域 */}
        <div className="w-full h-full p-[40px] relative flex flex-col justify-start">
          {/* 装饰元素 */}
          <div className="absolute top-5 left-5 w-20 h-20 border-2 border-[#d4af37] opacity-60 border-r-0 border-b-0"></div>
          <div className="absolute bottom-5 right-5 w-20 h-20 border-2 border-[#d4af37] opacity-60 border-l-0 border-t-0"></div>
          
          {/* 墨水溅点 */}
          <div className="absolute top-[10%] right-[10%] w-24 h-24 bg-[#333] rounded-full opacity-10 blur-md"></div>
          <div className="absolute bottom-[15%] right-[5%] w-24 h-24 bg-[#333] rounded-full opacity-10 blur-md"></div>
          
          {/* 文本内容 */}
          <div className="relative z-10 flex-1 flex flex-col justify-between">
            <div className={`text-[26px] leading-[1.5] text-[#333] font-medium whitespace-pre-wrap overflow-hidden ${
              currentFont !== 'default' ? 'custom-font-content' : ''
            }`} style={currentFont === 'default' ? {
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
            } : {}}>
              {memo.content}
            </div>
            
            <div className="space-y-3 mt-4">
              <div className={`text-[15px] text-[#666] italic ${
                currentFont !== 'default' ? 'custom-font-content' : ''
              }`} style={currentFont === 'default' ? {
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
              } : {}}>
                —— {formatDate(memo.createdAt)}
              </div>
              
              {/* 金色装饰线 */}
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
              
              {/* 标签 */}
              {memo.tags && memo.tags.length > 0 && (
                <div className={`text-[13px] text-[#666] flex flex-wrap items-center ${
                  currentFont !== 'default' ? 'custom-font-content' : ''
                }`} style={currentFont === 'default' ? {
                  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
                } : {}}>
                  {memo.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="mr-2">
                      #{tag}
                      {index < memo.tags.slice(0, 3).length - 1 && ' |'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 底部流苏 */}
      <div className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 w-10 h-8 bg-[#c5c3be] rounded-b-full">
        <div className="absolute top-0 left-2 w-2 h-10 bg-[#d4af37] rounded"></div>
        <div className="absolute top-0 right-2 w-2 h-10 bg-[#d4af37] rounded"></div>
      </div>
    </div>
  );
};

export default BookmarkTemplate;