import React, { useState } from 'react';

// 测试绕过所有中间层，直接访问原始setNewMemo
const TestDirectSetNewMemo = () => {
  const [localNewMemo, setLocalNewMemo] = useState('');
  
  console.log('🔥 TestDirectSetNewMemo 渲染次数检查');
  
  const handleChange = (e) => {
    const startTime = performance.now();
    console.log('🔥 直接setNewMemo测试 - 开始');
    
    const value = e.target.value;
    setLocalNewMemo(value);
    
    const endTime = performance.now();
    console.log('🔥 直接setNewMemo测试 - 完成，耗时:', endTime - startTime, 'ms');
  };
  
  return (
    <div className="p-4 bg-red-50 rounded">
      <h3 className="font-bold text-red-800 mb-2">🚨 紧急测试：直接状态更新</h3>
      <p className="text-sm text-red-700 mb-2">
        绕过所有组件层级，测试最原始的React状态更新
      </p>
      
      <textarea
        value={localNewMemo}
        onChange={handleChange}
        placeholder="测试原始React状态更新..."
        className="w-full p-2 border rounded"
        rows={4}
      />
      
      <div className="text-xs text-red-600 mt-2">
        字符数: {localNewMemo.length} | 如果这个都卡，说明是React或浏览器层面的问题
      </div>
    </div>
  );
};

export default TestDirectSetNewMemo;