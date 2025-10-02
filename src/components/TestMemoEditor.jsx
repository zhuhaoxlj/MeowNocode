import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// 逐步构建的 MemoEditor 测试版本
const TestMemoEditor = ({ 
  testLevel = 1,
  value = '', 
  onChange,
  placeholder = '测试输入...',
}) => {
  const textareaRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  console.log('🧪 TestMemoEditor 渲染 - level:', testLevel, '值长度:', value.length, '时间:', new Date().getTime());

  // Level 1: 基础输入 + 焦点状态
  const handleChange = useCallback((e) => {
    const startTime = performance.now();
    console.log('🧪 Level', testLevel, '输入开始 - 时间戳:', startTime);
    
    const newValue = e.target.value;
    onChange?.(newValue);
    
    console.log('🧪 Level', testLevel, '输入完成 - 耗时:', performance.now() - startTime, 'ms');
  }, [onChange, testLevel]);

  const handleFocus = useCallback(() => {
    console.log('🧪 Level', testLevel, '焦点获取');
    setIsFocused(true);
  }, [testLevel]);

  const handleBlur = useCallback(() => {
    console.log('🧪 Level', testLevel, '焦点失去');
    setIsFocused(false);
  }, [testLevel]);

  // Level 2: 添加高度自动调整
  const adjustHeight = useCallback(() => {
    if (testLevel >= 2 && textareaRef.current) {
      const startTime = performance.now();
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.max(120, Math.min(400, textarea.scrollHeight));
      textarea.style.height = newHeight + 'px';
      console.log('🧪 Level', testLevel, '高度调整 - 耗时:', performance.now() - startTime, 'ms, 高度:', newHeight);
    }
  }, [testLevel]);

  // Level 3: 添加防抖高度调整
  const debouncedAdjustHeight = useCallback(
    testLevel >= 3 ? (() => {
      let timeoutId;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(adjustHeight, 16);
      };
    })() : adjustHeight,
    [adjustHeight, testLevel]
  );

  // Level 4: 添加字符计数
  const charCount = useMemo(() => {
    if (testLevel >= 4) {
      console.log('🧪 Level', testLevel, '计算字符数');
      return value.length;
    }
    return 0;
  }, [value, testLevel]);

  // Level 5: 添加useEffect监听
  useEffect(() => {
    if (testLevel >= 5) {
      console.log('🧪 Level', testLevel, 'useEffect 触发 - 值变化');
      debouncedAdjustHeight();
    }
  }, [value, debouncedAdjustHeight, testLevel]);

  const levelDescription = {
    1: '基础输入 + 焦点状态',
    2: '+ 高度自动调整',
    3: '+ 防抖高度调整', 
    4: '+ 字符计数',
    5: '+ useEffect监听',
  };

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-gray-800">
      <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        🧪 Level {testLevel}: {levelDescription[testLevel]}
      </h3>
      <div className={`border rounded-lg transition-all duration-200 ${
        isFocused ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
      }`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full p-3 bg-transparent resize-none outline-none border-none"
          style={{
            minHeight: '120px',
            maxHeight: '400px',
          }}
          rows={5}
        />
        {testLevel >= 4 && (
          <div className="px-3 py-1 border-t text-xs text-gray-500">
            字符数: {charCount}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestMemoEditor;