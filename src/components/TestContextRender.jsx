import React, { useState, useContext } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';

// 测试Context层面的重渲染问题
const TestContextRender = () => {
  const [value, setValue] = useState('');
  const [renderCount, setRenderCount] = useState(0);
  
  // 测试各个Context
  const themeContext = useTheme();
  const settingsContext = useSettings();
  
  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  });
  
  console.log('🔥 TestContextRender 渲染次数:', renderCount, {
    themeContext键数量: Object.keys(themeContext || {}).length,
    settingsContext键数量: Object.keys(settingsContext || {}).length,
    时间: performance.now()
  });
  
  // 不使用任何Context的原生输入框
  const handleChangeRaw = (e) => {
    console.log('🔥 原生输入框 onChange');
    setValue(e.target.value);
  };
  
  // 使用Context但不触发Context更新的输入框
  const handleChangeWithContext = (e) => {
    console.log('🔥 带Context输入框 onChange', {
      themeColor: themeContext?.themeColor,
      currentFont: themeContext?.currentFont,
    });
    setValue(e.target.value);
  };
  
  return (
    <div className="space-y-4 p-4">
      <div className="bg-blue-50 p-3 rounded">
        <h3 className="font-bold text-blue-800">🧪 Context重渲染测试</h3>
        <p className="text-sm text-blue-600">渲染次数: {renderCount}</p>
      </div>
      
      <div className="border rounded p-3 bg-white">
        <h4 className="font-medium mb-2">1. 原生HTML输入框（无Context）</h4>
        <textarea
          value={value}
          onChange={handleChangeRaw}
          placeholder="完全原生的输入框..."
          className="w-full p-2 border rounded"
          rows={3}
        />
      </div>
      
      <div className="border rounded p-3 bg-white">
        <h4 className="font-medium mb-2">2. 使用Context但不修改（读取主题）</h4>
        <textarea
          value={value}
          onChange={handleChangeWithContext}
          placeholder="使用Context读取数据的输入框..."
          className="w-full p-2 border rounded"
          style={{ 
            borderColor: themeContext?.themeColor || '#ccc',
            fontFamily: themeContext?.currentFont === 'default' ? 'inherit' : 'custom'
          }}
          rows={3}
        />
        <div className="text-xs text-gray-500">
          当前主题色: {themeContext?.themeColor} | 字体: {themeContext?.currentFont}
        </div>
      </div>
      
      <div className="text-xs text-gray-600">
        如果这些输入框都卡，说明问题在Context层面或更深层的系统问题
      </div>
    </div>
  );
};

export default TestContextRender;