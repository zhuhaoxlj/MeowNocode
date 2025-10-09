/**
 * API 模式指示器
 * 在开发环境显示当前使用的 API 模式（本地/远程）
 */

import { useEffect, useState } from 'react';

export default function ApiModeIndicator() {
  const [apiMode, setApiMode] = useState(null);
  
  useEffect(() => {
    // 只在开发环境且客户端显示
    if (process.env.NODE_ENV !== 'production') {
      const mode = process.env.NEXT_PUBLIC_API_MODE || 'local';
      setApiMode(mode);
    }
  }, []);
  
  // 生产环境不显示
  if (process.env.NODE_ENV === 'production' || !apiMode) {
    return null;
  }
  
  const isRemote = apiMode === 'remote';
  
  return (
    <div className="fixed bottom-2 left-2 z-10">
      <div className="text-[10px] text-gray-400 dark:text-gray-600 select-none opacity-50 hover:opacity-100 transition-opacity">
        <span className="font-mono">
          API: {isRemote ? 'Remote' : 'Local'}
        </span>
      </div>
    </div>
  );
}

