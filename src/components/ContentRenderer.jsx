import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/context/ThemeContext';

const ContentRenderer = ({ content, activeTag, onTagClick }) => {
  const { themeColor, currentFont } = useTheme();
  // 解析内容，分离文本和标签
  const parseContent = (text) => {
    const parts = [];
    let lastIndex = 0;
    
    // 匹配标签的正则表达式
    const tagRegex = /(?:^|\s)(#[\u4e00-\u9fa5a-zA-Z0-9_\/]+)/g;
    let match;
    
    while ((match = tagRegex.exec(text)) !== null) {
      // 添加标签前的文本
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push({
            type: 'text',
            content: beforeText
          });
        }
      }
      
      // 添加空格（如果标签前有空格）
      const spaceMatch = text.substring(match.index, match.index + match[0].length - match[1].length);
      if (spaceMatch) {
        parts.push({
          type: 'text',
          content: spaceMatch
        });
      }
      
      // 添加标签
      const tagContent = match[1]; // #标签内容
      const tagName = tagContent.substring(1); // 去掉#号
      parts.push({
        type: 'tag',
        content: tagContent,
        tagName: tagName
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex)
      });
    }
    
    return parts;
  };

  // 渲染markdown文本（不包含标签）
  const renderMarkdownText = (text) => {
    // 处理换行符
    let processedText = text.replace(/\n/g, '  \n');
    
    // 转换标题语法
    processedText = processedText.replace(/(?:^|\s)#([^\s#][^\n]*)/g, (match, p1) => {
      // 检查是否是标签
      const isTag = /^[\u4e00-\u9fa5a-zA-Z0-9_\/]+$/.test(p1);
      
      if (isTag) {
        return match; // 保留标签不变
      }
      
      // 否则替换为markdown标题格式
      return `${match[0] === ' ' ? ' ' : ''}# ${p1}`;
    });
    
    return processedText;
  };

  const parts = parseContent(content);
  const { darkMode } = useTheme();

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${currentFont !== 'default' ? 'custom-font-content' : ''}`}>
      {parts.map((part, index) => {
        if (part.type === 'tag') {
          const isSecondLevel = part.tagName.includes('/');
          const [parentTag, childTag] = isSecondLevel ? part.tagName.split('/') : [part.tagName, null];
          const isActive = part.tagName === activeTag;
          
          return (
            <span
              key={index}
              onClick={() => onTagClick(part.tagName === activeTag ? null : part.tagName)}
              className={`inline-block text-xs px-2 py-1 rounded-full cursor-pointer transition-colors mx-1 border ${
                isActive
                  ? ''
                  : isSecondLevel
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700 dark:hover:bg-blue-800/30'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:border-gray-600'
              }`}
              style={isActive ? {
                backgroundColor: `${themeColor}20`,
                color: themeColor,
                borderColor: themeColor
              } : {}}
              title={part.content}
            >
              {isSecondLevel ? (
                <>
                  <span className="text-gray-500">#{parentTag}/</span>
                  <span className="font-medium">{childTag}</span>
                </>
              ) : (
                part.content
              )}
            </span>
          );
        } else {
          // 渲染文本部分
          // 检查是否以空格开头
          const startsWithSpace = /^\s/.test(part.content);
          
          if (startsWithSpace) {
            // 如果以空格开头，直接渲染为span，保留所有空格
            return (
              <span key={index} className="whitespace-pre-wrap">
                {part.content}
              </span>
            );
          } else {
            // 否则使用ReactMarkdown渲染
            return (
              <ReactMarkdown
                key={index}
                components={{
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-md font-bold my-2" {...props} />,
                  p: ({node, ...props}) => <span className="whitespace-pre-wrap" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2" {...props} />,
                  li: ({node, ...props}) => <li className="my-1" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                  br: () => <br />,
                }}
                remarkPlugins={[]}
                rehypePlugins={[]}
              >
                {renderMarkdownText(part.content)}
              </ReactMarkdown>
            );
          }
        }
      })}
    </div>
  );
};

export default ContentRenderer;
