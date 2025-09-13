import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from '@/context/ThemeContext';
import Spoiler from '@/components/Spoiler';
import fileStorageService from '@/lib/fileStorageService';

// LocalImage 组件处理 local: 引用的图片
const LocalImage = ({ src, alt, ...props }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    const loadLocalImage = async () => {
      
      if (!src || !src.startsWith('./local/')) {
        console.log('Not a local image, using direct src:', src);
        setImageSrc(src);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        
        // 提取文件ID
        const fileId = src.replace('./local/', '');
        setDebugInfo(`Loading ID: ${fileId}`);
        
        // 首先尝试从memo数据中查找完整的文件信息
        try {
          const memos = JSON.parse(localStorage.getItem('memos') || '[]');
          const pinnedMemos = JSON.parse(localStorage.getItem('pinnedMemos') || '[]');
          const allMemos = [...memos, ...pinnedMemos];
          
          for (const memo of allMemos) {
            if (memo.processedResources) {
              for (const res of memo.processedResources) {
                if (res.fileRef === fileId && res.id) {
                  // 使用完整的存储信息恢复文件
                  const restoredFile = await fileStorageService.restoreFile({
                    id: res.id,
                    storageType: res.storageType || 'indexeddb',
                    type: res.type,
                    name: res.filename
                  });
                  
                  if (restoredFile && restoredFile.data) {
                    setImageSrc(restoredFile.data);
                    setDebugInfo(`Found via memo metadata`);
                    return;
                  }
                }
              }
            }
          }
        } catch (memoErr) {
          console.error('Error reading memo data:', memoErr);
        }
        
        // 备用方案：尝试直接从 IndexedDB 恢复文件
        let fileInfo = await fileStorageService.restoreFile({ 
          id: fileId, 
          storageType: 'indexeddb' 
        });
        
        if (fileInfo && fileInfo.data) {
          setImageSrc(fileInfo.data);
          setDebugInfo(`Found in IndexedDB`);
          return;
        }
        setError(true);
        setDebugInfo(`Not found: ${fileId}`);
      } catch (err) {
        console.error('Failed to load local image:', err);
        setError(true);
        setDebugInfo(`Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadLocalImage();
  }, [src]);

  if (loading) {
    return (
      <div className="inline-block w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">加载中...</span>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className="inline-block min-w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded flex items-center justify-center p-2">
        <span className="text-xs text-red-500 dark:text-red-400">{debugInfo || '图片丢失'}</span>
      </div>
    );
  }

  return (
    <img 
      src={imageSrc} 
      alt={alt || '图片'} 
      className="max-w-full h-auto rounded-lg shadow-sm my-2"
      {...props} 
    />
  );
};

const ContentRenderer = ({ content, activeTag, onTagClick, onContentChange }) => {
  const { themeColor, currentFont } = useTheme();
  
  
  // 处理 checkbox 切换
  const handleCheckboxToggle = (taskIndex, isChecked) => {
    if (!onContentChange) return;
    
    // 找到所有的任务列表项
    const taskRegex = /^(\s*-\s*)\[([x\s])\](.*)$/gim;
    let taskCount = 0;
    
    const newContent = content.replace(taskRegex, (match, prefix, checkState, suffix) => {
      if (taskCount === taskIndex) {
        // 切换这个任务的状态
        const newCheckState = isChecked ? ' ' : 'x';
        taskCount++;
        return `${prefix}[${newCheckState}]${suffix}`;
      }
      taskCount++;
      return match;
    });
    
    if (newContent !== content) {
      onContentChange(newContent);
    }
  };
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

  // 解析并按自定义原样 HTML 片段分割文本
  // 语法：```__html\n ... 任意 HTML ... \n```
  const splitByRawHtml = (text) => {
    const result = [];
    const re = /```__html\s*\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIndex) {
        result.push({ kind: 'text', value: text.slice(lastIndex, m.index) });
      }
      const html = (m[1] || '').trim();
      result.push({ kind: 'rawhtml', value: html });
      lastIndex = re.lastIndex;
    }
    if (lastIndex < text.length) {
      result.push({ kind: 'text', value: text.slice(lastIndex) });
    }
    return result;
  };

  const parts = parseContent(content);
  const { darkMode } = useTheme();
  
  // 创建组件工厂函数，为每个 ReactMarkdown 实例维护独立的任务索引
  const createLiComponent = () => {
    let taskIndex = 0;
    return ({node, ...props}) => {
      // 检查是否是 task list item
      if (props.children && typeof props.children[0] === 'object' && props.children[0]?.props?.type === 'checkbox') {
        const checkbox = props.children[0];
        const isChecked = checkbox.props.checked;
        const textContent = props.children.slice(1);
        const currentIndex = taskIndex++;
        
        return (
          <li className="my-1 flex items-start gap-2" {...props}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => handleCheckboxToggle(currentIndex, isChecked)}
              className="mt-1 flex-shrink-0 cursor-pointer"
            />
            <span className={isChecked ? 'line-through text-gray-500 dark:text-gray-400' : ''}>
              {textContent}
            </span>
          </li>
        );
      }
      return <li className="my-1" {...props} />;
    };
  };

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
          // 渲染文本部分：支持 __html 原样 HTML + spoiler + markdown
          const rawSegments = splitByRawHtml(part.content);
          return (
            <>
              {rawSegments.map((rawSeg, rawIdx) => {
                if (rawSeg.kind === 'rawhtml') {
                  // 直接渲染原样 HTML（来自 ```__html ... ``` 块）
                  return (
                    <div key={`${index}-raw-${rawIdx}`} dangerouslySetInnerHTML={{ __html: rawSeg.value }} />
                  );
                }

                // 普通文本：先按 spoiler 切分，再交给 ReactMarkdown
                const segments = splitBySpoilers(rawSeg.value);
                if (segments.length === 1 && segments[0].kind === 'text') {
                  return (
                    <ReactMarkdown
                      key={`${index}-md-${rawIdx}`}
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-md font-bold my-2" {...props} />,
                        p: ({node, ...props}) => <span className="whitespace-pre-wrap" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2" {...props} />,
                        li: createLiComponent(),
                        input: ({node, ...props}) => {
                          // 处理 task list 的 checkbox
                          if (props.type === 'checkbox') {
                            return <input {...props} readOnly className="flex-shrink-0" />;
                          }
                          return <input {...props} />;
                        },
                        strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                        em: ({node, ...props}) => <em className="italic" {...props} />,
                        img: ({node, ...props}) => <LocalImage {...props} />,
                        br: () => <br />,
                      }}
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[]}
                    >
                      {renderMarkdownText(segments[0].value)}
                    </ReactMarkdown>
                  );
                }

                // 多段（含 spoiler）的情况：处理前后换行与拼接
                let pendingBreaks = 0;
                let lastWasSpoiler = false;
                return (
                  <React.Fragment key={`${index}-mdsp-${rawIdx}`}>
                    {segments.map((seg, i) => {
                      const renderBreaks = (count, keyPrefix) => Array.from({ length: count }, (_, k) => <br key={`${index}-${keyPrefix}-${rawIdx}-${i}-${k}`} />);

                      if (seg.kind === 'spoiler') {
                        const beforeEls = [];
                        if (pendingBreaks > 0) {
                          beforeEls.push(...renderBreaks(pendingBreaks, 'pb'));
                          pendingBreaks = 0;
                        }
                        const el = (
                          <span key={`${index}-sp-wrap-${rawIdx}-${i}`}>
                            {beforeEls}
                            <Spoiler text={seg.value} styleType={seg.styleType} color={seg.color} />
                          </span>
                        );
                        lastWasSpoiler = true;
                        return el;
                      }

                      const prefixEls = [];
                      if (pendingBreaks > 0) {
                        prefixEls.push(...renderBreaks(pendingBreaks, 'pb'));
                        pendingBreaks = 0;
                      }

                      const leading = seg.value.match(/^[ \t]*\n+/);
                      const leadingBreaks = leading ? (leading[0].match(/\n/g) || []).length : 0;
                      if (leadingBreaks > 0) {
                        prefixEls.push(...renderBreaks(leadingBreaks, 'lb'));
                      } else if (lastWasSpoiler) {
                        prefixEls.push(' ');
                      }

                      let inner = seg.value.replace(/^[ \t]*\n+/, '');
                      const trailing = inner.match(/\n+[ \t]*$/);
                      const trailingBreaks = trailing ? (trailing[0].match(/\n/g) || []).length : 0;
                      inner = inner.replace(/\n+[ \t]*$/, '');

                      const node = (
                        <span key={`${index}-tx-wrap-${rawIdx}-${i}`}>
                          {prefixEls}
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-md font-bold my-2" {...props} />,
                              p: ({node, ...props}) => <span className="whitespace-pre-wrap" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2" {...props} />,
                              li: createLiComponent(),
                              input: ({node, ...props}) => {
                                // 处理 task list 的 checkbox
                                if (props.type === 'checkbox') {
                                  return <input {...props} readOnly className="flex-shrink-0" />;
                                }
                                return <input {...props} />;
                              },
                              strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                              em: ({node, ...props}) => <em className="italic" {...props} />,
                              img: ({node, ...props}) => <LocalImage {...props} />,
                              br: () => <br />,
                            }}
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[]}
                          >
                            {renderMarkdownText(inner)}
                          </ReactMarkdown>
                        </span>
                      );

                      pendingBreaks = trailingBreaks;
                      lastWasSpoiler = false;
                      return node;
                    })}
                  </React.Fragment>
                );
              })}
            </>
          );
        }
      })}
    </div>
  );
};

export default ContentRenderer;
