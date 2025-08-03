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

  return (
    <div className="w-full h-full bg-[#f9f6f2] rounded-lg overflow-hidden relative">
      <div className="w-full h-full flex">
        {/* 左侧内容区域 */}
        <div className="w-[65%] h-full p-[40px_20px_40px_40px] relative flex flex-col justify-center">
          {/* 装饰元素 */}
          <div className="absolute top-5 left-5 w-20 h-20 border-2 border-[#d4af37] opacity-60 border-r-0 border-b-0"></div>
          <div className="absolute bottom-5 right-5 w-20 h-20 border-2 border-[#d4af37] opacity-60 border-l-0 border-t-0"></div>
          
          {/* 墨水溅点 */}
          <div className="absolute top-[10%] right-[20%] w-24 h-24 bg-[#333] rounded-full opacity-10 blur-md"></div>
          <div className="absolute bottom-[15%] right-[10%] w-24 h-24 bg-[#333] rounded-full opacity-10 blur-md"></div>
          
          {/* 文本内容 */}
          <div className="relative z-10">
            <div className={`text-[28px] leading-[1.6] text-[#333] font-medium mb-5 ${
              currentFont !== 'default' ? 'custom-font-content' : ''
            }`} style={currentFont === 'default' ? {
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
            } : {}}>
              {memo.content}
            </div>
            <div className={`text-[16px] text-[#666] italic mt-4 ${
              currentFont !== 'default' ? 'custom-font-content' : ''
            }`} style={currentFont === 'default' ? {
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
            } : {}}>
              —— {formatDate(memo.createdAt)}
            </div>
          </div>
          
          {/* 金色装饰线 */}
          <div className="absolute bottom-8 left-10 w-20 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
          
          {/* 标签 */}
          {memo.tags && memo.tags.length > 0 && (
            <div className={`absolute bottom-5 left-10 text-[14px] text-[#666] flex items-center ${
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
        
        {/* 右侧装饰区域 */}
        <div className="w-[35%] h-full bg-gradient-to-b from-[#d6d4cf] to-[#c5c3be] relative overflow-hidden">
          {/* 山峦 */}
          <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-[#b8b5aa] to-[#d6d4cf] opacity-40" 
               style={{ clipPath: 'polygon(0% 100%, 15% 60%, 30% 80%, 45% 40%, 60% 70%, 75% 30%, 90% 60%, 100% 100%)' }}>
          </div>
          
          {/* 三角形装饰 */}
          <div className="absolute bottom-[30%] right-[20%] w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[70px] border-b-[#9a958a]"
               style={{ opacity: '0.6' }}>
          </div>
          
          {/* 小三角形装饰 */}
          <div className="absolute bottom-[45%] right-[40%] w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[35px] border-b-[#9a958a]"
               style={{ opacity: '0.4' }}>
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