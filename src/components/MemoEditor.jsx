
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';

const MemoEditor = ({
  value = '',
  onChange,
  placeholder = '现在的想法是……',
  onSubmit,
  disabled = false,
  maxLength = 5000,
  showCharCount = true,
  autoFocus = false,
  className = '',
  onFocus,
  onBlur
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [compositionValue, setCompositionValue] = useState('');
  const [hitokoto, setHitokoto] = useState({ text: '加载中...', uuid: '' });
  const textareaRef = useRef(null);
  const { darkMode, themeColor, currentFont } = useTheme();
  const { hitokotoConfig } = useSettings();

  // 获取一言或内置句子
  const fetchHitokoto = async () => {
    if (!hitokotoConfig.enabled) {
      // 从内置句子中随机选择
      const builtInSentences = [
        "生活就像一盒巧克力，你永远不知道下一颗是什么味道。",
        "岁月不居，时节如流。",
        "The only way to do great work is to love what you do. - Steve Jobs",
        "路漫漫其修远兮，吾将上下而求索。",
        "Stay hungry, stay foolish. - Steve Jobs",
        "不积跬步，无以至千里；不积小流，无以成江海。",
        "To be or not to be, that is the question. - Shakespeare",
        "人生得意须尽欢，莫使金樽空对月。",
        "The journey of a thousand miles begins with one step. - Lao Tzu",
        "天行健，君子以自强不息。",
        "Carpe diem. Seize the day, boys. Make your lives extraordinary. - Dead Poets Society",
        "海内存知己，天涯若比邻。",
        "In three words I can sum up everything I've learned about life: it goes on. - Robert Frost",
        "春风得意马蹄疾，一日看尽长安花。",
        "The best preparation for tomorrow is doing your best today. - H. Jackson Brown Jr.",
        "会当凌绝顶，一览众山小。",
        "Life is what happens when you're busy making other plans. - John Lennon",
        "落霞与孤鹜齐飞，秋水共长天一色。",
        "You miss 100% of the shots you don't take. - Wayne Gretzky",
        "问渠那得清如许？为有源头活水来。"
      ];
      const randomIndex = Math.floor(Math.random() * builtInSentences.length);
      setHitokoto({
        text: builtInSentences[randomIndex],
      });
      return;
    }

    try {
      // 构建请求URL，包含类型参数
      const typeParams = hitokotoConfig.types.map(type => `c=${type}`).join('&');
      const url = `https://v1.hitokoto.cn/?${typeParams}`;

      const response = await fetch(url);
      const data = await response.json();
      setHitokoto({
        text: data.hitokoto,
      });
    } catch (error) {
      console.error('获取一言失败:', error);
      // API失败时使用内置句子
      const builtInSentences = [
        "生活就像一盒巧克力，你永远不知道下一颗是什么味道。",
        "岁月不居，时节如流。",
        "The only way to do great work is to love what you do. - Steve Jobs",
        "路漫漫其修远兮，吾将上下而求索。",
        "Stay hungry, stay foolish. - Steve Jobs",
        "不积跬步，无以至千里；不积小流，无以成江海。",
        "To be or not to be, that is the question. - Shakespeare",
        "人生得意须尽欢，莫使金樽空对月。",
        "The journey of a thousand miles begins with one step. - Lao Tzu",
        "天行健，君子以自强不息。",
        "Carpe diem. Seize the day, boys. Make your lives extraordinary. - Dead Poets Society",
        "海内存知己，天涯若比邻。",
        "In three words I can sum up everything I've learned about life: it goes on. - Robert Frost",
        "春风得意马蹄疾，一日看尽长安花。",
        "The best preparation for tomorrow is doing your best today. - H. Jackson Brown Jr.",
        "会当凌绝顶，一览众山小。",
        "Life is what happens when you're busy making other plans. - John Lennon",
        "落霞与孤鹜齐飞，秋水共长天一色。",
        "You miss 100% of the shots you don't take. - Wayne Gretzky",
        "问渠那得清如许？为有源头活水来。"
      ];
      const randomIndex = Math.floor(Math.random() * builtInSentences.length);
      setHitokoto({
        text: builtInSentences[randomIndex],
      });
    }
  };

  // 自动调整高度
  const adjustHeight = () => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.max(120, Math.min(400, textarea.scrollHeight));
      textarea.style.height = newHeight + 'px';
    }
  };

  // 处理输入变化
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    // 延迟调整高度
    setTimeout(adjustHeight, 0);
  };

  // 处理输入法合成开始
  const handleCompositionStart = (e) => {
    setIsComposing(true);
    setCompositionValue(e.target.value);
  };

  // 处理输入法合成更新
  const handleCompositionUpdate = (e) => {
    if (isComposing) {
      setCompositionValue(e.target.value);
    }
  };

  // 处理输入法合成结束
  const handleCompositionEnd = (e) => {
    setIsComposing(false);
    setCompositionValue('');
    const newValue = e.target.value;
    onChange?.(newValue);
  };

  // 处理键盘事件
  const handleKeyDown = (e) => {
    // Ctrl+Enter 或 Cmd+Enter 提交
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
      return;
    }
  };

  // 在光标处插入 spoiler 语法，并将光标定位到 spoiler 内容处
  const insertSpoilerAtCursor = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    // 形如: {% spoiler  %}，光标定位到 spoiler 后的空白处（两空格中间的第一个后）
    const snippet = '{% spoiler  %}';
    // 计算插入后光标位置：位于 "{% spoiler " 之后（索引从0开始）
    const caretOffsetInSnippet = '{% spoiler '.length; // 包含末尾空格，落在内容位置
    const newValue = before + snippet + after;
    onChange?.(newValue);
    // 聚焦并设置选择区域到内容位置
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = start + caretOffsetInSnippet;
        try { textareaRef.current.setSelectionRange(pos, pos); } catch {}
      }
      // 调整高度
      adjustHeight();
    }, 0);
  };

  // 焦点事件
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  // 当value变化时调整高度
  useEffect(() => {
    adjustHeight();
  }, [value]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // 组件挂载时获取一言，以及当一言配置变化时重新获取
  useEffect(() => {
    fetchHitokoto();
  }, [hitokotoConfig]);

  // 计算字符数 - 在输入法合成期间使用合成前的值
  const getDisplayCharCount = () => {
    if (isComposing && compositionValue) {
      // 输入法合成期间，使用合成开始前的字符数
      return compositionValue.length;
    }
    return value.length;
  };

  const charCount = getDisplayCharCount();
  const isNearLimit = maxLength && charCount > maxLength * 0.8;
  const isOverLimit = maxLength && charCount > maxLength;

  return (
    <div
      className={cn(
        "relative border rounded-lg bg-white dark:bg-gray-800 transition-all duration-200",
        isFocused
          ? "ring-2 shadow-sm"
          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={isFocused ? {
        borderColor: themeColor,
        '--tw-ring-color': themeColor
      } : {}}
    >
      {/* 主要文本区域 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full p-3 bg-transparent resize-none outline-none border-none theme-selection",
          "text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
          currentFont !== 'default' && "custom-font-content",
          disabled && "cursor-not-allowed"
        )}
        style={{
          minHeight: '120px',
          maxHeight: '400px',
          lineHeight: '1.5rem',
          fontSize: '0.875rem',
          ...(currentFont === 'default' && {
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
          })
        }}
        rows={5}
      />

      {/* 底部信息栏 */}
      {(showCharCount || onSubmit) && (
        <div className="flex items-center justify-between px-3 py-1 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 min-h-[32px]">
          {/* 未聚焦时显示一言 */}
          {!isFocused && hitokotoConfig.enabled ? (
            <a
              className={cn(
                "flex-1 text-center text-xs text-gray-500 truncate px-2 transition-colors duration-300",
                currentFont !== 'default' && "custom-font-content"
              )}
              style={{
                '--hover-color': 'var(--theme-color)',
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--theme-color)'}
              onMouseLeave={(e) => e.target.style.color = ''}
            >
              {hitokoto.text}
            </a>
          ) : !isFocused && !hitokotoConfig.enabled ? (
            <div className="flex-1"></div>
          ) : isFocused ? (
            <>
              {/* 左侧：字数 + 插入spoiler按钮 */}
              <div className="flex items-center gap-2">
                {showCharCount && (
                  <div className={cn(
                    "text-xs transition-colors",
                    isOverLimit
                      ? "text-red-500 font-medium"
                      : isNearLimit
                        ? "text-orange-500"
                        : "text-gray-500 dark:text-gray-400"
                  )}>
                    {charCount} 字
                  </div>
                )}
                {/* Spoiler 快捷按钮 */}
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); insertSpoilerAtCursor(); }}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-md text-gray-600 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  {/* 模糊的小圆角矩形图标（默认模糊效果） */}
                  <svg width="16" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <filter id="f" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1.1" />
                      </filter>
                    </defs>
                    <rect x="2" y="2" width="14" height="8" rx="3" fill="currentColor" opacity="0.9" filter="url(#f)" />
                  </svg>
                </button>
              </div>

              {/* 右侧：快捷键提示 */}
              {onSubmit && (
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Ctrl</kbd>
                  {' + '}
                  <kbd className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Enter</kbd>
                  {' 保存'}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MemoEditor;

