import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/context/ThemeContext';
import Spoiler from '@/components/Spoiler';

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

  // 解析并按自定义 spoiler 语法分割文本
  // 语法：
  // {% spoiler 文本 %}
  // {% spoiler style:box 文本 %}
  // {% spoiler style:box color:red 文本 %}
  const splitBySpoilers = (text) => {
    const result = [];
    const re = /{%\s*spoiler\b([\s\S]*?)%}/g; // 非贪婪匹配到 %}
    let lastIndex = 0;
    let m;

    while ((m = re.exec(text)) !== null) {
      const before = text.slice(lastIndex, m.index);
      if (before) result.push({ kind: 'text', value: before });

      const inner = (m[1] || '').trim();
      // 解析参数与内容
      let styleType = 'blur';
      let color;
      let content = inner;

      // 尝试提取前部的 key:value 选项（顺序不限），直到遇到第一个非 key:value 开头的 token
      // 用简单扫描避免把内容里的冒号误判：仅接受 style: 和 color: 两种 key
      const tokens = inner.split(/\s+/);
      let consumed = 0;
      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (/^style:/i.test(t)) {
          const v = t.split(':')[1]?.toLowerCase();
          if (v === 'box' || v === 'blur') styleType = v;
          consumed = i + 1;
          continue;
        }
        if (/^color:/i.test(t)) {
          color = t.slice(t.indexOf(':') + 1);
          consumed = i + 1;
          continue;
        }
        // 第一个非选项，剩余全部作为内容
        break;
      }
      if (consumed > 0 && consumed < tokens.length) {
        content = tokens.slice(consumed).join(' ');
      } else if (consumed === tokens.length) {
        // 只有参数没有内容，降级为空字符串
        content = '';
      }

      result.push({ kind: 'spoiler', styleType, color, value: content });
      lastIndex = re.lastIndex;
    }
    const rest = text.slice(lastIndex);
    if (rest) result.push({ kind: 'text', value: rest });
    return result;
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
            // 否则：先按 spoiler 语法切分，再分别渲染
            const segments = splitBySpoilers(part.content);
            if (segments.length === 1 && segments[0].kind === 'text') {
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
                  {renderMarkdownText(segments[0].value)}
                </ReactMarkdown>
              );
            }
            // 强化版：按段渲染并精确处理前导/尾随换行
            let pendingBreaks = 0; // 由上一文本段尾随换行携带到下一段
            let lastWasSpoiler = false;
            return (
              <>
                {segments.map((seg, i) => {
                  // 渲染一个帮助函数：输出若干个 <br/>
                  const renderBreaks = (count, keyPrefix) => Array.from({ length: count }, (_, k) => <br key={`${index}-${keyPrefix}-${i}-${k}`} />);

                  if (seg.kind === 'spoiler') {
                    const beforeEls = [];
                    if (pendingBreaks > 0) {
                      beforeEls.push(...renderBreaks(pendingBreaks, 'pb'));
                      pendingBreaks = 0;
                    }
                    const el = (
                      <span key={`${index}-sp-wrap-${i}`}>
                        {beforeEls}
                        <Spoiler text={seg.value} styleType={seg.styleType} color={seg.color} />
                      </span>
                    );
                    lastWasSpoiler = true;
                    return el;
                  }

                  // 文本段：处理与上一段的关系（spoiler 后空行/空格），以及自身的前导/尾随换行
                  const prefixEls = [];
                  if (pendingBreaks > 0) {
                    prefixEls.push(...renderBreaks(pendingBreaks, 'pb')); // 来自上一文本段的结尾
                    pendingBreaks = 0;
                  }

                  // 统计并消费前导空白+换行（将其改为 <br/>）
                  const leading = seg.value.match(/^[ \t]*\n+/);
                  const leadingBreaks = leading ? (leading[0].match(/\n/g) || []).length : 0;
                  if (leadingBreaks > 0) {
                    prefixEls.push(...renderBreaks(leadingBreaks, 'lb'));
                  } else if (lastWasSpoiler) {
                    // 如果上一段是 spoiler 且没有前导换行，则插入一个空格，避免紧贴
                    prefixEls.push(' ');
                  }

                  // 去掉前导/尾随换行再交给 markdown
                  let inner = seg.value.replace(/^[ \t]*\n+/, '');
                  const trailing = inner.match(/\n+[ \t]*$/);
                  const trailingBreaks = trailing ? (trailing[0].match(/\n/g) || []).length : 0;
                  inner = inner.replace(/\n+[ \t]*$/, '');

                  const node = (
                    <span key={`${index}-tx-wrap-${i}`}>
                      {prefixEls}
                      <ReactMarkdown
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
                        {renderMarkdownText(inner)}
                      </ReactMarkdown>
                    </span>
                  );

                  // 将尾随换行携带到下一段
                  pendingBreaks = trailingBreaks;
                  lastWasSpoiler = false;
                  return node;
                })}
              </>
            );
          }
        }
      })}
    </div>
  );
};

export default ContentRenderer;
