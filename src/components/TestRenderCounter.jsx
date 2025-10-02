import React, { useRef, useEffect } from 'react';

// 渲染计数器组件 - 帮助检测无限重渲染
const TestRenderCounter = ({ name = "Component", trackProps = {} }) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(performance.now());
  const propsHistory = useRef([]);
  
  renderCount.current += 1;
  const currentTime = performance.now();
  const timeSinceLastRender = currentTime - lastRenderTime.current;
  lastRenderTime.current = currentTime;
  
  // 记录props变化历史
  propsHistory.current.push({
    count: renderCount.current,
    time: currentTime,
    timeDiff: timeSinceLastRender,
    props: { ...trackProps }
  });
  
  // 只保留最近10次渲染记录
  if (propsHistory.current.length > 10) {
    propsHistory.current = propsHistory.current.slice(-10);
  }
  
  // 检测频繁重渲染（1秒内超过10次）
  const recentRenders = propsHistory.current.filter(
    record => (currentTime - record.time) < 1000
  );
  
  const isRenderingTooFast = recentRenders.length > 10;
  
  console.log(`🔥 ${name} 渲染统计:`, {
    总渲染次数: renderCount.current,
    距离上次渲染: `${timeSinceLastRender.toFixed(2)}ms`,
    最近1秒内渲染次数: recentRenders.length,
    是否过度渲染: isRenderingTooFast,
    当前props: trackProps
  });
  
  if (isRenderingTooFast) {
    console.error(`❌ ${name} 检测到过度重渲染！1秒内渲染了 ${recentRenders.length} 次`);
    console.table(propsHistory.current);
  }
  
  useEffect(() => {
    if (renderCount.current === 1) {
      console.log(`✅ ${name} 首次渲染完成`);
    }
  });
  
  return (
    <div className={`text-xs p-2 rounded ${isRenderingTooFast ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
      🔥 {name}: {renderCount.current} 次渲染
      {isRenderingTooFast && <span className="ml-2">⚠️ 过度重渲染</span>}
    </div>
  );
};

export default TestRenderCounter;