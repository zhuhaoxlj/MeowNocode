
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { toast } from 'sonner';

// 🚀 使用 React.memo 优化，只在 props 真正变化时才重渲染
const MemoEditor = React.memo(({
  value = '',
  onChange,
  placeholder = '现在的想法是……',
  onSubmit,
  disabled = false,
  maxLength,
  showCharCount = false,
  autoFocus = false,
  className = '',
  // backlinks related
  memosList = [],
  currentMemoId = null,
  backlinks = [],
  onAddBacklink,
  onRemoveBacklink,
  onPreviewMemo,
  // attachments related
  attachments = [],
  onAttachmentsChange,
  // optional focus callbacks
  onFocus,
  onBlur,
}) => {
  // theme & settings
  const { themeColor } = useTheme();
  const { fontConfig, hitokotoConfig } = useSettings();
  const currentFont = fontConfig?.selectedFont || 'default';

  // local states / refs
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [compositionValue, setCompositionValue] = useState('');
  const [hitokoto, setHitokoto] = useState({ text: '' });
  const [showBacklinkPicker, setShowBacklinkPicker] = useState(false);
  const [pickerPos, setPickerPos] = useState(null);
  const backlinkBtnRef = useRef(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // 使用传入的 attachments 或本地状态
  const [localAttachments, setLocalAttachments] = useState([]);
  // 如果父组件提供了 onAttachmentsChange，使用受控模式；否则使用非受控模式
  const pastedAttachments = onAttachmentsChange ? attachments : localAttachments;
  const setPastedAttachments = onAttachmentsChange || setLocalAttachments;

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

  // 🚀 性能优化：移除性能监控代码
  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.max(120, Math.min(400, textarea.scrollHeight));
      textarea.style.height = newHeight + 'px';
    }
  }, []);

  // 🚀 极致优化：使用 requestAnimationFrame + 防抖，减少高度调整的性能开销
  const debouncedAdjustHeight = useCallback(
    (() => {
      let rafId = null;
      let timeoutId = null;
      return () => {
        // 取消之前的调度
        if (rafId) cancelAnimationFrame(rafId);
        if (timeoutId) clearTimeout(timeoutId);
        
        // 使用 rAF + 防抖组合：快速响应但避免过度调用
        rafId = requestAnimationFrame(() => {
          timeoutId = setTimeout(adjustHeight, 100); // 100ms 防抖，减少频繁调整
        });
      };
    })(),
    [adjustHeight]
  );

  // 🔍 性能排查模式：逐个测试每个函数的性能影响
  const PERF_DEBUG = {
    enabled: false,  // 启用性能调试
    logTiming: false,  // 记录每个步骤的耗时
    disableOnChange: false,  // 禁用 onChange 回调
    disableHeightAdjust: false,  // 禁用高度调整
    disableCharCount: false,  // 禁用字符计数
    disableBacklinks: false,  // 禁用反链计算
  };

  const handleChange = useCallback((e) => {
    if (PERF_DEBUG.enabled && PERF_DEBUG.logTiming) {
      const start = performance.now();
      console.log('🔍 [1] handleChange 开始');
      
      const newValue = e.target.value;
      const step1 = performance.now();
      console.log(`🔍 [2] 获取 value 耗时: ${(step1 - start).toFixed(2)}ms`);
      
      if (!PERF_DEBUG.disableOnChange) {
        onChange?.(newValue);
        const step2 = performance.now();
        console.log(`🔍 [3] onChange 回调耗时: ${(step2 - step1).toFixed(2)}ms`);
      } else {
        console.log('🔍 [3] onChange 回调已禁用 ✅');
      }
      
      console.log(`🔍 [总计] handleChange 总耗时: ${(performance.now() - start).toFixed(2)}ms\n`);
    } else {
      const newValue = e.target.value;
      onChange?.(newValue);
    }
  }, [onChange]);

  // 处理输入法合成开始
  const handleCompositionStart = useCallback((e) => {
    setIsComposing(true);
    setCompositionValue(e.target.value);
  }, []);

  // 处理输入法合成更新
  const handleCompositionUpdate = useCallback((e) => {
    if (isComposing) {
      setCompositionValue(e.target.value);
    }
  }, [isComposing]);

  // 处理输入法合成结束
  const handleCompositionEnd = useCallback((e) => {
    setIsComposing(false);
    setCompositionValue('');
    const newValue = e.target.value;
    onChange?.(newValue);
    // 🚀 高度调整由 useEffect 统一处理
    // debouncedAdjustHeight();
  }, [onChange]);

  // 复制每日一句到剪贴板
  const copyHitokotoToClipboard = async () => {
    if (!hitokoto.text) return;
    
    try {
      await navigator.clipboard.writeText(hitokoto.text);
      toast.success('每日一句已复制到剪贴板');
    } catch (err) {
      // 如果现代 API 失败，使用传统方法
      try {
        const textArea = document.createElement('textarea');
        textArea.value = hitokoto.text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('每日一句已复制到剪贴板');
      } catch (fallbackErr) {
        toast.error('复制失败，请手动复制');
        console.error('复制失败:', fallbackErr);
      }
    }
  };

  // 在光标处插入 markdown todo 格式 - 优化
  const insertTodoAtCursor = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    
    // 检查是否在行首，如果不是则先添加换行
    const isAtLineStart = start === 0 || before.endsWith('\n');
    const prefix = isAtLineStart ? '' : '\n';
    const snippet = '- [ ] ';
    const insertText = prefix + snippet;
    
    const newValue = before + insertText + after;
    onChange?.(newValue);
    
      // 聚焦并设置光标位置到 todo 内容开始位置
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const pos = start + insertText.length;
          try { textareaRef.current.setSelectionRange(pos, pos); } catch {}
        }
        // 调整高度
        debouncedAdjustHeight();
      }, 0);
    }, [value, onChange, debouncedAdjustHeight]);

  // 上传附件到服务器（参考 memos 实现）
  const uploadAttachment = useCallback(async (file) => {
    try {
      console.log('📤 [MemoEditor uploadAttachment] 开始上传文件:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      setIsUploadingAttachment(true);

      const arrayBuffer = await file.arrayBuffer();

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: arrayBuffer,
        headers: {
          'Content-Type': file.type,
          'X-Filename': file.name || `image-${Date.now()}.${file.type.split('/')[1]}`
        }
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const attachment = await response.json();
      console.log('✅ [MemoEditor uploadAttachment] 上传成功，返回:', attachment);

      setIsUploadingAttachment(false);

      return attachment;
    } catch (error) {
      console.error('❌ [MemoEditor uploadAttachment] 上传失败:', error);
      setIsUploadingAttachment(false);
      throw error;
    }
  }, []);

  // 删除附件
  const removeAttachment = useCallback(async (attachmentId) => {
    // 从附件列表中移除
    setPastedAttachments(prev => prev.filter(att => att.id !== attachmentId));

    // 从服务器删除
    try {
      await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('删除附件失败:', error);
    }

    toast.success('图片已删除');
  }, [setPastedAttachments]);

  // 处理粘贴事件（支持图片） - 参考 memos 实现
  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    console.log('📋 [MemoEditor handlePaste] 检测到粘贴事件，items数量:', items.length);

    // 检查是否有图片
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      console.log(`   - Item ${i}: type = ${item.type}`);

      if (item.type.startsWith('image/')) {
        e.preventDefault(); // 阻止默认的文本粘贴

        const file = item.getAsFile();
        if (!file) continue;

        console.log('🖼️ [MemoEditor handlePaste] 检测到图片，准备上传');

        try {
          // 立即上传到服务器（像 memos 一样）
          const attachment = await uploadAttachment(file);

          console.log('📎 [MemoEditor handlePaste] 添加到附件列表，ID:', attachment.id);

          // 添加到附件列表
          setPastedAttachments(prev => {
            const newList = [...prev, attachment];
            console.log('   - 当前附件列表:', newList.map(a => ({ id: a.id, filename: a.filename })));
            return newList;
          });

          toast.success(`图片已上传 (${(file.size / 1024).toFixed(0)} KB)`);
        } catch (error) {
          console.error('❌ [MemoEditor handlePaste] 图片上传失败:', error);
          toast.error('图片上传失败: ' + error.message);
        }

        break; // 只处理第一张图片
      }
    }
  }, [uploadAttachment, setPastedAttachments]);

  // 处理键盘事件 - 使用 useCallback 优化
  const handleKeyDown = useCallback((e) => {
    // Ctrl+Enter 或 Cmd+Enter 提交
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
      return;
    }
    
    // Cmd+L 插入 markdown todo
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      insertTodoAtCursor();
      return;
    }

    // 处理回车键的 todo 自动补齐
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const el = textareaRef.current;
      if (!el) return;

      const start = el.selectionStart;
      const value = el.value;
      const lines = value.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];

      // 检查当前行是否是 todo 格式
      const todoMatch = currentLine.match(/^(\s*)- \[ \] (.*)$/);
      if (todoMatch) {
        e.preventDefault();
        const indent = todoMatch[1];
        const content = todoMatch[2].trim();
        
        // 如果当前 todo 是空的，清除它而不是创建新的
        if (content === '') {
          const beforeCursor = value.substring(0, start - currentLine.length);
          const afterCursor = value.substring(start);
          const newValue = beforeCursor + afterCursor;
          onChange?.(newValue);
          
          // 设置光标位置
          setTimeout(() => {
            if (textareaRef.current) {
              const newPos = start - currentLine.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        } else {
          // 创建新的 todo 项
          const newTodo = `\n${indent}- [ ] `;
          const beforeCursor = value.substring(0, start);
          const afterCursor = value.substring(start);
          const newValue = beforeCursor + newTodo + afterCursor;
          onChange?.(newValue);
          
          // 设置光标位置到新 todo 项的内容位置
          setTimeout(() => {
            if (textareaRef.current) {
              const newPos = start + newTodo.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        }
        return;
      }

      // 检查当前行是否是普通无序列表格式，保持无序列表格式
      const listMatch = currentLine.match(/^(\s*)- (.*)$/);
      if (listMatch) {
        e.preventDefault();
        const indent = listMatch[1];
        const content = listMatch[2].trim();
        
        if (content === '') {
          // 如果是空的无序列表，清除它
          const beforeCursor = value.substring(0, start - currentLine.length);
          const afterCursor = value.substring(start);
          const newValue = beforeCursor + afterCursor;
          onChange?.(newValue);
          
          setTimeout(() => {
            if (textareaRef.current) {
              const newPos = start - currentLine.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        } else {
          // 创建新的无序列表项
          const newListItem = `\n${indent}- `;
          const beforeCursor = value.substring(0, start);
          const afterCursor = value.substring(start);
          const newValue = beforeCursor + newListItem + afterCursor;
          onChange?.(newValue);
          
          setTimeout(() => {
            if (textareaRef.current) {
              const newPos = start + newListItem.length;
              textareaRef.current.setSelectionRange(newPos, newPos);
            }
          }, 0);
        }
        return;
      }
    }
  }, [onSubmit, insertTodoAtCursor, onChange]);

  // 在光标处插入 spoiler 语法，并将光标定位到 spoiler 内容处 - 优化
  const insertSpoilerAtCursor = useCallback(() => {
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
        debouncedAdjustHeight();
      }, 0);
    }, [value, onChange, debouncedAdjustHeight]);


  // 选择一个目标 memo 建立双链 - 优化
  const handlePickBacklink = useCallback((targetId) => {
    if (!onAddBacklink) return;
    if (currentMemoId && targetId === currentMemoId) return;
    onAddBacklink(currentMemoId || null, targetId);
    setShowBacklinkPicker(false);
  }, [onAddBacklink, currentMemoId]);

  // 计算选择卡片的屏幕定位，避免被滚动容器裁剪 - 防抖优化
  const updatePickerPosition = useCallback(
    (() => {
      let timeoutId;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const btn = backlinkBtnRef.current;
          if (!btn) return;
          const rect = btn.getBoundingClientRect();
          const width = 320;
          const margin = 8;
          let left = Math.min(rect.left, window.innerWidth - width - margin);
          if (left < margin) left = margin;
          const top = Math.min(rect.bottom + 6, window.innerHeight - margin);
          setPickerPos({ left, top, width });
        }, 50); // 增加防抖延迟，减少频繁更新
      };
    })(),
    []
  );

  useEffect(() => {
    if (!showBacklinkPicker) return;
    updatePickerPosition();
    const onResize = () => updatePickerPosition();
    const onScroll = () => updatePickerPosition();
    window.addEventListener('resize', onResize);
    // 捕获阶段监听滚动，包含内部滚动容器
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [showBacklinkPicker, updatePickerPosition]);

  // 缓存反链 memo 列表
  const backlinkMemos = useMemo(() => {
    if (PERF_DEBUG.disableBacklinks) {
      return [];
    }
    
    const start = performance.now();
    const findMemoById = (id) => memosList.find(m => m.id === id);
    const result = (backlinks || []).map(findMemoById).filter(Boolean);
    
    if (PERF_DEBUG.enabled && PERF_DEBUG.logTiming) {
      console.log(`🔍 [useMemo] backlinkMemos 计算耗时: ${(performance.now() - start).toFixed(2)}ms, 数量: ${result.length}`);
    }
    
    return result;
  }, [backlinks, memosList]);

  // 焦点事件 - 使用 useCallback 优化
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  // 🚀 性能优化：只在值变化且需要时调整高度
  // 使用 useRef 追踪上次的长度，避免每次都调用
  const lastLengthRef = useRef(0);
  useEffect(() => {
    if (PERF_DEBUG.disableHeightAdjust) {
      console.log('🔍 [useEffect] 高度调整已禁用 ✅');
      return;
    }
    
    const start = performance.now();
    const currentLength = value?.length || 0;
    const lengthDiff = Math.abs(currentLength - lastLengthRef.current);
    
    if (PERF_DEBUG.enabled && PERF_DEBUG.logTiming) {
      console.log(`🔍 [useEffect] 长度变化: ${lengthDiff}, 是否触发调整: ${lengthDiff > 10}`);
    }
    
    // 只在长度变化较大时才调整高度（优化性能）
    if (lengthDiff > 10) {
      debouncedAdjustHeight();
      lastLengthRef.current = currentLength;
      
      if (PERF_DEBUG.enabled && PERF_DEBUG.logTiming) {
        console.log(`🔍 [useEffect] 高度调整触发耗时: ${(performance.now() - start).toFixed(2)}ms`);
      }
    }
  }, [value, debouncedAdjustHeight]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // 组件挂载时延迟获取一言，使用 requestIdleCallback 优化性能
  useEffect(() => {
    // 使用 requestIdleCallback 延迟非关键API请求
    if ('requestIdleCallback' in window) {
      const idleCallbackId = requestIdleCallback(() => {
        fetchHitokoto();
      }, { timeout: 2000 });
      return () => cancelIdleCallback(idleCallbackId);
    } else {
      // 降级方案：延迟 1 秒后执行
      const timerId = setTimeout(() => {
        fetchHitokoto();
      }, 1000);
      return () => clearTimeout(timerId);
    }
  }, [hitokotoConfig]);

  // 计算字符数 - 使用 useMemo 缓存计算结果
  const charCount = useMemo(() => {
    if (PERF_DEBUG.disableCharCount) {
      return 0;
    }
    
    const start = performance.now();
    let result;
    
    if (isComposing && compositionValue) {
      // 输入法合成期间，使用合成开始前的字符数
      result = compositionValue.length;
    } else {
      result = value.length;
    }
    
    if (PERF_DEBUG.enabled && PERF_DEBUG.logTiming) {
      console.log(`🔍 [useMemo] charCount 计算耗时: ${(performance.now() - start).toFixed(2)}ms`);
    }
    
    return result;
  }, [value, isComposing, compositionValue]);

  const { isNearLimit, isOverLimit } = useMemo(() => {
    if (PERF_DEBUG.disableCharCount) {
      return { isNearLimit: false, isOverLimit: false };
    }
    
    const start = performance.now();
    const isNearLimit = maxLength && charCount > maxLength * 0.8;
    const isOverLimit = maxLength && charCount > maxLength;
    
    if (PERF_DEBUG.enabled && PERF_DEBUG.logTiming) {
      console.log(`🔍 [useMemo] limit 检查耗时: ${(performance.now() - start).toFixed(2)}ms`);
    }
    
    return { isNearLimit, isOverLimit };
  }, [maxLength, charCount]);

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
      {/* 粘贴的附件预览（显示在输入框上方） */}
      {pastedAttachments.length > 0 && (
        <div className="px-3 pt-3 pb-2 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
          {pastedAttachments.map((att) => (
            <div
              key={att.id}
              className="inline-flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 group transition-all hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {/* 图片缩略图 */}
              <img
                src={att.url}
                alt={att.filename}
                className="w-8 h-8 object-cover rounded"
              />
              
              {/* 文件名 */}
              <span className="text-xs text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                {att.filename}
              </span>
              
              {/* 文件大小 */}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {(att.size / 1024).toFixed(0)} KB
              </span>
              
              {/* 删除按钮 */}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="ml-1 w-5 h-5 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center text-gray-500 dark:text-gray-300 opacity-70 group-hover:opacity-100 transition-opacity"
                aria-label="删除附件"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* 上传中提示 */}
      {isUploadingAttachment && (
        <div className="px-3 pt-2 pb-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>上传中...</span>
        </div>
      )}

      {/* 主要文本区域 */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionUpdate={handleCompositionUpdate}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
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

      {/* 反链 Chips（编辑时显示） */}
      {isFocused && backlinkMemos.length > 0 && (
        <div className="px-3 pb-1 -mt-2 flex flex-wrap gap-2">
          {backlinkMemos.map((m) => (
            <span key={m.id} className="inline-flex items-center group">
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onPreviewMemo?.(m.id); }}
                className="max-w-full inline-flex items-center gap-1 pl-2 pr-2 py-0.5 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="truncate inline-block max-w-[180px]">{m.content?.replace(/\n/g, ' ').slice(0, 50) || '（无内容）'}</span>
                <ArrowUpRight className="h-3.5 w-3.5 opacity-70" />
              </button>
              <button
                type="button"
                aria-label="移除反链"
                className="ml-1 w-4 h-4 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveBacklink?.(currentMemoId || null, m.id); }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 底部信息栏 */}
      {(showCharCount || onSubmit) && (
        <div className="flex items-center justify-between px-3 py-1 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 min-h-[32px]">
          {/* 未聚焦时显示一言 */}
          {!isFocused && hitokotoConfig.enabled ? (
            <a
              className={cn(
                "flex-1 text-center text-xs text-gray-500 truncate px-2 transition-colors duration-300 cursor-pointer",
                currentFont !== 'default' && "custom-font-content"
              )}
              style={{
                '--hover-color': 'var(--theme-color)',
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--theme-color)'}
              onMouseLeave={(e) => e.target.style.color = ''}
              onClick={copyHitokotoToClipboard}
              title="点击复制每日一句"
            >
              {hitokoto.text}
            </a>
          ) : !isFocused && !hitokotoConfig.enabled ? (
            <div className="flex-1"></div>
          ) : isFocused ? (
            <>
              {/* 左侧：字数 + 插入spoiler按钮 */}
              <div className="flex items-center gap-2 relative">
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

                {/* 双链按钮 */}
                <button
                  type="button"
                  ref={backlinkBtnRef}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowBacklinkPicker(v => !v); }}
                  className={cn(
                    "inline-flex items-center justify-center h-7 px-2 rounded-md text-gray-600 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                  )}
                >
                  {/* 简洁链路图标 */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 14a5 5 0 0 1 0-7.07l1.94-1.94a5 5 0 0 1 7.07 7.07l-1.25 1.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 10a5 5 0 0 1 0 7.07l-1.94 1.94a5 5 0 0 1-7.07-7.07l1.25-1.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>

                {/* 双链选择卡片 */}
                {isFocused && showBacklinkPicker && (
                  <div
                    className="fixed z-50 w-[320px] max-h-56 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
                    style={{ left: pickerPos?.left ?? 16, top: pickerPos?.top ?? 100, width: pickerPos?.width ?? 320 }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  >
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">选择一个 Memo 建立双链</div>
                    <div className="overflow-y-auto pr-2 scrollbar-transparent" style={{ maxHeight: '11rem' }}>
                      {(memosList || [])
                        .filter(m => m.id !== currentMemoId)
                        .filter(m => !(Array.isArray(backlinks) && backlinks.includes(m.id)))
                        .slice(0, 50)
                        .map(m => (
                        <button
                          key={m.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handlePickBacklink(m.id); }}
                             
                        >
                          <div className="truncate">{m.content?.replace(/\n/g, ' ') || '（无内容）'}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">{new Date(m.updated_ts || m.created_ts).toLocaleString('zh-CN', { month: 'short', day: 'numeric' })}</div>
                        </button>
                      ))}
                      {(memosList || [])
                        .filter(m => m.id !== currentMemoId)
                        .filter(m => !(Array.isArray(backlinks) && backlinks.includes(m.id)))
                        .length === 0 && (
                        <div className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">暂无可选 Memo</div>
                      )}
                    </div>
                  </div>
                )}
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
}, (prevProps, nextProps) => {
  // 🚀 自定义比较函数：只在关键 props 变化时才重渲染
  return (
    prevProps.value === nextProps.value &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.maxLength === nextProps.maxLength &&
    prevProps.showCharCount === nextProps.showCharCount &&
    prevProps.autoFocus === nextProps.autoFocus &&
    prevProps.backlinks?.length === nextProps.backlinks?.length &&
    prevProps.memosList?.length === nextProps.memosList?.length &&
    prevProps.attachments?.length === nextProps.attachments?.length
  );
});

MemoEditor.displayName = 'MemoEditor';

export default MemoEditor;

