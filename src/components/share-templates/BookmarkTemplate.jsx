import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import ContentRenderer from '@/components/ContentRenderer';

const BookmarkTemplate = ({ memo, themeColor }) => {
  const { currentFont } = useTheme();

  // 如果没有memo数据，返回空内容
  if (!memo) {
    return null;
  }

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 精确计算内容高度
  const calculateHeight = (content) => {
    if (!content) return 280;
    
    // 计算标签所需高度
    let tagsHeight = 0;
    if (memo.tags && memo.tags.trim()) {
      const tags = memo.tags.split(',').slice(0, 3);
      const tagsText = tags.map(tag => `#${tag.trim()}`).join(' | ');
      // 估算标签文本宽度，每个字符约8px (13px字体的大概值)
      const tagsWidth = tagsText.length * 8;
      const tagsLines = Math.max(1, Math.ceil(tagsWidth / 600)); // 600px可用宽度
      tagsHeight = tagsLines * 18; // 13px字体 + 5px行高
    }
    
    // 基础高度组成：
    // - 顶部padding: 40px
    // - 日期: 15px
    // - 间距: 12px  
    // - 装饰线: 8px
    // - 间距: 12px
    // - 标签: 动态计算
    // - 底部padding: 40px
    // - 内容与底部间距: 24px (mb-6)
    const baseHeight = 151 + tagsHeight;
    
    // 分析内容结构
    const lines = content.split('\n');
    let totalHeight = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        // 空行
        totalHeight += 8;
      } else if (trimmedLine.startsWith('#')) {
        // 标题行 (28px字体 + 8px间距)
        const textWidth = trimmedLine.length * 18;
        const lineCount = Math.max(1, Math.ceil(textWidth / 600));
        totalHeight += lineCount * 36 + 8;
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        // 列表项 (26px字体 + 3px间距)
        const textContent = trimmedLine.substring(2);
        const textWidth = textContent.length * 16;
        const lineCount = Math.max(1, Math.ceil(textWidth / 580));
        totalHeight += lineCount * 29 + 3;
      } else {
        // 普通段落 (26px字体 + 8px间距)
        const textWidth = trimmedLine.length * 16;
        const lineCount = Math.max(1, Math.ceil(textWidth / 600));
        totalHeight += lineCount * 34 + 8;
      }
    }
    
    // 总高度 = 基础高度 + 内容高度 + 安全边距
    const finalHeight = baseHeight + totalHeight + 20; // 额外20px安全边距
    
    // 限制范围
    return Math.min(Math.max(finalHeight, 320), 650);
  };

  const cardHeight = calculateHeight(memo.content);

  return (
    <div
      className="w-full bg-[#f9f6f2] rounded-lg relative p-[40px]"
      style={{ height: `${cardHeight}px` }}
    >
          {/* 装饰元素 */}
          <div className="absolute top-5 left-5 w-20 h-20 border-2 border-[#d4af37] opacity-60 border-r-0 border-b-0"></div>
          <div className="absolute bottom-5 right-5 w-20 h-20 border-2 border-[#d4af37] opacity-60 border-l-0 border-t-0"></div>
          
          {/* 墨水溅点 */}
          <div className="absolute top-[20px] right-[20px] w-16 h-16 bg-[#333] rounded-full opacity-10 blur-md"></div>
          <div className="absolute bottom-[20px] left-[20px] w-12 h-12 bg-[#333] rounded-full opacity-10 blur-md"></div>
          
          {/* 文本内容 */}
          <div className="relative z-10 flex flex-col">
            {/* 主要内容文本 - 使用 ContentRenderer 解析 Markdown */}
            <div className={`mb-6 ${
              currentFont !== 'default' ? 'custom-font-content' : ''
            }`}>
              <style dangerouslySetInnerHTML={{
                __html: `
                  .share-content * {
                    color: #333 !important;
                    font-size: 26px !important;
                    line-height: 1.5 !important;
                    margin: 0 0 6px 0 !important;
                    font-family: ${currentFont === 'default' ? 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' : 'inherit'} !important;
                  }
                  .share-content h1, .share-content h2, .share-content h3, 
                  .share-content h4, .share-content h5, .share-content h6 {
                    font-weight: 600 !important;
                    font-size: 28px !important;
                    margin: 0 0 8px 0 !important;
                  }
                  .share-content p {
                    font-weight: 500 !important;
                    margin: 0 0 8px 0 !important;
                  }
                  .share-content ul, .share-content ol {
                    padding-left: 20px !important;
                    margin: 0 0 8px 0 !important;
                  }
                  .share-content li {
                    margin: 0 0 3px 0 !important;
                  }
                  .share-content strong, .share-content b {
                    font-weight: 700 !important;
                  }
                  .share-content em, .share-content i {
                    font-style: italic !important;
                  }
                  .share-content code {
                    font-size: 24px !important;
                    background: rgba(0,0,0,0.1) !important;
                    padding: 2px 4px !important;
                    border-radius: 3px !important;
                  }
                  .share-content blockquote {
                    border-left: 4px solid #d4af37 !important;
                    padding-left: 16px !important;
                    color: #666 !important;
                    font-style: italic !important;
                    margin: 0 0 12px 0 !important;
                  }
                `
              }} />
              <div className="share-content">
                <ContentRenderer 
                  content={memo.content} 
                  activeTag={null} 
                  onTagClick={() => {}} 
                />
              </div>
            </div>
            
            {/* 底部信息区域 */}
            <div className="space-y-3 mt-4 pb-2">
              <div className={`text-[15px] text-[#666] italic ${
                currentFont !== 'default' ? 'custom-font-content' : ''
              }`} style={currentFont === 'default' ? {
                fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
              } : {}}>
                —— {formatDate(memo.created_ts)}
              </div>
              
              {/* 金色装饰线 */}
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent"></div>
              
              {/* 标签 */}
              {memo.tags && memo.tags.trim() && (
                <div className={`text-[13px] text-[#666] flex flex-wrap items-start leading-relaxed ${
                  currentFont !== 'default' ? 'custom-font-content' : ''
                }`} style={currentFont === 'default' ? {
                  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
                  lineHeight: '1.4'
                } : {
                  lineHeight: '1.4'
                }}>
                  {memo.tags.split(',').slice(0, 3).map((tag, index) => (
                    <span key={index} className="mr-2 mb-1">
                      #{tag.trim()}
                      {index < Math.min(memo.tags.split(',').length, 3) - 1 && ' |'}
                    </span>
                  ))}
                </div>
              )}
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