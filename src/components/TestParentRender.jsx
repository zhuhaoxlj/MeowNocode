import React, { useState, useCallback, useMemo } from 'react';

// 测试父组件重渲染对子组件的影响
const TestParentRender = () => {
  const [value, setValue] = useState('');
  const [renderCount, setRenderCount] = useState(0);
  
  // 记录渲染次数（不再触发重渲染）
  React.useRef(null).current = (() => {
    setRenderCount(prev => prev + 1);
    return true;
  })();
  
  console.log('🔥 TestParentRender 渲染次数:', renderCount, '时间:', performance.now());
  
  // 测试不同的onChange实现方式
  
  // 方式1：直接传递 setValue（最优）
  const handleChange1 = setValue;
  
  // 方式2：使用 useCallback
  const handleChange2 = useCallback((newValue) => {
    console.log('🔥 useCallback onChange 调用');
    setValue(newValue);
  }, []);
  
  // 方式3：每次渲染都创建新函数（最差）
  const handleChange3 = (newValue) => {
    console.log('🔥 inline onChange 调用');
    setValue(newValue);
  };
  
  // 方式4：模拟复杂的onChange（可能有问题的）
  const handleChange4 = useCallback((newValue) => {
    console.log('🔥 复杂onChange开始:', newValue?.length);
    // 模拟一些可能导致卡顿的操作
    const startTime = performance.now();
    
    // 模拟数据处理
    if (newValue && newValue.length > 10) {
      const processed = newValue.split('').reverse().join('').split('').reverse().join('');
    }
    
    setValue(newValue);
    console.log('🔥 复杂onChange完成，耗时:', performance.now() - startTime, 'ms');
  }, []);
  
  const [currentTest, setCurrentTest] = useState(1);
  
  const currentHandler = useMemo(() => {
    switch(currentTest) {
      case 1: return handleChange1;
      case 2: return handleChange2;
      case 3: return handleChange3;
      case 4: return handleChange4;
      default: return handleChange1;
    }
  }, [currentTest, handleChange1, handleChange2, handleChange4]);
  
  return (
    <div className="p-4 space-y-4">
      <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded">
        <h3 className="font-bold text-sm">🔥 父组件重渲染测试</h3>
        <p className="text-xs">渲染次数: {renderCount}</p>
      </div>
      
      <div className="space-x-2">
        <label className="text-sm">选择onChange实现:</label>
        <select 
          value={currentTest} 
          onChange={(e) => setCurrentTest(Number(e.target.value))}
          className="text-sm border rounded px-2 py-1"
        >
          <option value={1}>方式1: 直接传递setValue</option>
          <option value={2}>方式2: useCallback包装</option>
          <option value={3}>方式3: 内联函数(每次新建)</option>
          <option value={4}>方式4: 复杂处理逻辑</option>
        </select>
      </div>
      
      <div className="border rounded-lg p-3 bg-white dark:bg-gray-800">
        <h4 className="text-sm font-medium mb-2">测试输入框 - 方式{currentTest}</h4>
        <textarea
          value={value}
          onChange={(e) => {
            console.log('🔥 textarea onChange 触发');
            currentHandler(e.target.value);
          }}
          placeholder={`测试方式${currentTest}的性能...`}
          className="w-full p-2 border rounded resize-none"
          rows={4}
        />
        <div className="text-xs text-gray-500 mt-1">字符数: {value.length}</div>
      </div>
    </div>
  );
};

export default TestParentRender;