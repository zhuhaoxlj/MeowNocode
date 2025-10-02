import React, { useState } from 'react';

// 最基础的输入框 - 用于性能测试
const TestBasicInput = () => {
  const [value, setValue] = useState('');

  console.log('🧪 TestBasicInput 渲染 - 值长度:', value.length, '时间:', new Date().getTime());

  const handleChange = (e) => {
    const startTime = performance.now();
    console.log('🧪 基础输入开始 - 时间戳:', startTime);
    
    setValue(e.target.value);
    
    console.log('🧪 基础输入完成 - 耗时:', performance.now() - startTime, 'ms');
  };

  return (
    <div className="p-4 border rounded-lg bg-white dark:bg-gray-800">
      <h3 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">🧪 基础性能测试输入框</h3>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="测试基础输入性能..."
        className="w-full p-3 border rounded resize-none outline-none"
        style={{ minHeight: '120px' }}
        rows={5}
      />
      <div className="text-xs text-gray-500 mt-2">字符数: {value.length}</div>
    </div>
  );
};

export default TestBasicInput;