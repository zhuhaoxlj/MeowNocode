/**
 * API 配置文件
 * 根据启动命令决定使用本地还是远程 API
 * 
 * 使用方法：
 * - bun run dev         → 使用本地 API
 * - bun run dev:remote  → 使用远程 API
 */

export const API_CONFIGS = {
  local: {
    baseURL: '',  // 使用本地 Next.js API 路由
    name: '本地 API',
  },
  remote: {
    baseURL: 'http://111.170.174.134:18081',
    name: '远程 API',
  },
};

/**
 * 获取当前 API 配置
 * 从环境变量 NEXT_PUBLIC_API_MODE 读取配置
 */
export function getApiConfig() {
  const envMode = process.env.NEXT_PUBLIC_API_MODE || 'local';
  const config = API_CONFIGS[envMode] || API_CONFIGS.local;
  
  // 开发环境输出配置信息
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
    console.log(`🌐 [API Config] 当前模式: ${config.name} (baseURL: ${config.baseURL || 'localhost'})`);
  }
  
  return config;
}

export const apiConfig = getApiConfig();
export default apiConfig;

