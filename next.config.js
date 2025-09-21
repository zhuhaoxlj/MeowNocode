/** @type {import('next').NextConfig} */
const nextConfig = {
  // 实验性配置
  experimental: {
    serverComponentsExternalPackages: ['sqlite3', 'sql.js']
  },
  
  // 支持 ESM
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // 开发服务器配置
  async redirects() {
    return [];
  },
  
  // Webpack 配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 支持 WASM 文件
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // 处理 sql.js 的 WASM 文件
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    // 外部化服务器端的数据库驱动
    if (isServer) {
      config.externals.push('sqlite3', 'better-sqlite3', 'sql.js');
    }
    
    // 特殊处理 sql.js WASM 文件路径
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    
    return config;
  },
  
  // 静态资源配置
  assetPrefix: '',
  
  // 优化配置
  swcMinify: true,
  
  // 图片优化
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  
  // API 路由配置
  serverRuntimeConfig: {
    apiTimeout: 300000, // 5分钟
    maxRequestSize: '100mb'
  },
  
  // 开发服务器配置
  devServer: {
    clientLogLevel: 'warning',
  },
};

export default nextConfig;
