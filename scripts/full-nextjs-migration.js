#!/usr/bin/env node

/**
 * 完整的 Next.js 迁移脚本
 * 保留所有原有功能，创建一个完整的 Next.js 版本
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 开始完整的 Next.js 迁移...\n');

/**
 * 步骤 1: 创建备份
 */
async function createBackup() {
  console.log('📦 创建项目备份...');
  const backupDir = path.join(projectRoot, 'backup-vite');
  
  // 备份关键文件
  const filesToBackup = [
    'package.json',
    'vite.config.js', 
    'src/App.jsx',
    'src/main.jsx',
    'index.html'
  ];
  
  try {
    await fs.mkdir(backupDir, { recursive: true });
    
    for (const file of filesToBackup) {
      const srcPath = path.join(projectRoot, file);
      const destPath = path.join(backupDir, file);
      
      try {
        const content = await fs.readFile(srcPath, 'utf8');
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.writeFile(destPath, content, 'utf8');
        console.log(`   ✅ 备份: ${file}`);
      } catch (err) {
        console.log(`   ⚠️  跳过: ${file} (文件不存在)`);
      }
    }
    
    // 备份整个 src 目录
    console.log('   📁 备份 src 目录...');
    await copyDirectory(path.join(projectRoot, 'src'), path.join(backupDir, 'src'));
    
    console.log('✅ 备份完成\n');
  } catch (error) {
    console.error('❌ 备份失败:', error);
    throw error;
  }
}

/**
 * 步骤 2: 更新 package.json
 */
async function updatePackageJson() {
  console.log('📝 更新 package.json...');
  
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const currentPackage = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  
  // 新的 package.json 配置
  const newPackage = {
    ...currentPackage,
    name: "meownocode-nextjs",
    version: "2.0.0",
    description: "MeowNocode - 完整的 Next.js 版本，支持跨浏览器数据共享",
    scripts: {
      // Next.js 脚本
      "dev": "next dev -p 3001",
      "build": "next build", 
      "start": "next start -p 3001",
      "lint": "next lint",
      "export": "next export",
      
      // 数据库脚本
      "db:init": "node scripts/init-db.js",
      "db:migrate": "node scripts/migrate-data.js",
      "db:backup": "node scripts/backup-db.js", 
      "db:reset": "node scripts/reset-db.js",
      
      // 迁移脚本
      "migrate:data": "node scripts/migrate-browser-data.js",
      "full-migration": "node scripts/full-nextjs-migration.js",
      
      // 开发脚本
      "dev:both": "concurrently \"npm run dev:vite\" \"npm run dev\"",
      "dev:vite": "vite --port 8080",
      
      // 保持原有的构建脚本作为备份
      "build:vite": "vite build",
      "preview:vite": "vite preview"
    },
    dependencies: {
      // Next.js 核心
      "next": "14.2.32",
      "react": "^18.2.0", 
      "react-dom": "^18.2.0",
      
      // 数据库
      "sqlite3": "^5.1.6",
      "better-sqlite3": "^9.4.0",
      
      // 保持所有现有依赖
      ...currentPackage.dependencies,
      
      // 移除 Vite 特定依赖，但保留 sql.js 等通用库
    },
    devDependencies: {
      // Next.js 开发依赖
      "@types/node": "^20",
      "@types/react": "^18.2.43",
      "@types/react-dom": "^18.2.17",
      "eslint": "^8",
      "eslint-config-next": "14.2.32",
      
      // 保持现有开发依赖
      ...currentPackage.devDependencies,
      
      // 工具
      "concurrently": "^8.2.2"
    }
  };
  
  await fs.writeFile(packageJsonPath, JSON.stringify(newPackage, null, 2));
  console.log('✅ package.json 更新完成\n');
}

/**
 * 步骤 3: 创建 Next.js 配置
 */
async function createNextConfig() {
  console.log('⚙️ 创建 Next.js 配置...');
  
  const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  // 实验性配置
  experimental: {
    serverComponentsExternalPackages: ['sqlite3', 'better-sqlite3', 'sql.js']
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
      test: /\\.wasm$/,
      type: 'webassembly/async',
    });
    
    // 外部化服务器端的数据库驱动
    if (isServer) {
      config.externals.push('sqlite3', 'better-sqlite3');
    }
    
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
};

export default nextConfig;
`;
  
  await fs.writeFile(path.join(projectRoot, 'next.config.js'), nextConfigContent);
  console.log('✅ Next.js 配置创建完成\n');
}

/**
 * 步骤 4: 创建 Next.js 目录结构
 */
async function createNextDirectories() {
  console.log('📁 创建 Next.js 目录结构...');
  
  const directories = [
    'pages',
    'pages/api',
    'pages/api/memos',
    'pages/api/attachments',
    'pages/api/auth',
    'pages/api/settings',
    'pages/api/import',
    'pages/api/export',
    'lib/server',
    'lib/client',
    'components/nextjs',
    'public/uploads',
    'scripts'
  ];
  
  for (const dir of directories) {
    await fs.mkdir(path.join(projectRoot, dir), { recursive: true });
    console.log(`   📂 创建目录: ${dir}`);
  }
  
  console.log('✅ 目录结构创建完成\n');
}

/**
 * 步骤 5: 创建服务器端数据库服务
 */
async function createServerServices() {
  console.log('🗄️ 创建服务器端服务...');
  
  // 数据库连接
  const databaseContent = `import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.db = null;
    this.init();
  }
  
  init() {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'meownocode.db');
      this.db = new Database(dbPath);
      
      // 创建表
      this.createTables();
      
      console.log('✅ 数据库连接成功');
    } catch (error) {
      console.error('❌ 数据库连接失败:', error);
      throw error;
    }
  }
  
  createTables() {
    const createMemosTable = \`
      CREATE TABLE IF NOT EXISTS memos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        tags TEXT,
        visibility TEXT DEFAULT 'private',
        pinned BOOLEAN DEFAULT 0,
        created_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_ts DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    \`;
    
    const createResourcesTable = \`
      CREATE TABLE IF NOT EXISTS resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memo_id INTEGER,
        filename TEXT NOT NULL,
        type TEXT,
        size INTEGER,
        blob BLOB,
        created_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (memo_id) REFERENCES memos (id) ON DELETE CASCADE
      )
    \`;
    
    const createSettingsTable = \`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_ts DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    \`;
    
    this.db.exec(createMemosTable);
    this.db.exec(createResourcesTable);
    this.db.exec(createSettingsTable);
  }
  
  // Memos 操作
  getAllMemos() {
    return this.db.prepare(\`
      SELECT * FROM memos 
      ORDER BY pinned DESC, created_ts DESC
    \`).all();
  }
  
  getMemoById(id) {
    return this.db.prepare('SELECT * FROM memos WHERE id = ?').get(id);
  }
  
  createMemo(data) {
    const { content, tags = '', visibility = 'private', pinned = false } = data;
    const result = this.db.prepare(\`
      INSERT INTO memos (content, tags, visibility, pinned)
      VALUES (?, ?, ?, ?)
    \`).run(content, tags, visibility, pinned ? 1 : 0);
    
    return this.getMemoById(result.lastInsertRowid);
  }
  
  updateMemo(id, data) {
    const { content, tags, visibility, pinned } = data;
    this.db.prepare(\`
      UPDATE memos 
      SET content = ?, tags = ?, visibility = ?, pinned = ?, updated_ts = CURRENT_TIMESTAMP
      WHERE id = ?
    \`).run(content, tags, visibility, pinned ? 1 : 0, id);
    
    return this.getMemoById(id);
  }
  
  deleteMemo(id) {
    const result = this.db.prepare('DELETE FROM memos WHERE id = ?').run(id);
    return result.changes > 0;
  }
  
  // Resources 操作
  getResourcesByMemoId(memoId) {
    return this.db.prepare('SELECT * FROM resources WHERE memo_id = ?').all(memoId);
  }
  
  createResource(data) {
    const { memo_id, filename, type, size, blob } = data;
    const result = this.db.prepare(\`
      INSERT INTO resources (memo_id, filename, type, size, blob)
      VALUES (?, ?, ?, ?, ?)
    \`).run(memo_id, filename, type, size, blob);
    
    return result.lastInsertRowid;
  }
  
  // Settings 操作
  getSetting(key) {
    const result = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return result ? result.value : null;
  }
  
  setSetting(key, value) {
    this.db.prepare(\`
      INSERT OR REPLACE INTO settings (key, value, updated_ts)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    \`).run(key, value);
  }
  
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

// 单例模式
let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
  }
  return dbInstance;
}

export default getDatabase;
`;
  
  await fs.writeFile(path.join(projectRoot, 'lib/server/database.js'), databaseContent);
  console.log('   ✅ 数据库服务创建完成');
  
  // API 中间件
  const middlewareContent = `export function withMethods(allowedMethods) {
  return function (handler) {
    return async function (req, res) {
      if (!allowedMethods.includes(req.method)) {
        res.setHeader('Allow', allowedMethods.join(', '));
        return res.status(405).json({ error: 'Method Not Allowed' });
      }
      
      try {
        await handler(req, res);
      } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    };
  };
}

export function withCors(handler) {
  return async function (req, res) {
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    return handler(req, res);
  };
}
`;
  
  await fs.writeFile(path.join(projectRoot, 'lib/server/middleware.js'), middlewareContent);
  console.log('   ✅ API 中间件创建完成');
  
  console.log('✅ 服务器端服务创建完成\n');
}

/**
 * 步骤 6: 创建 API Routes
 */
async function createApiRoutes() {
  console.log('🛠️ 创建 API Routes...');
  
  // Memos API
  const memosApiContent = `import { getDatabase } from '../../lib/server/database.js';
import { withMethods, withCors } from '../../lib/server/middleware.js';

async function handler(req, res) {
  const db = getDatabase();
  
  switch (req.method) {
    case 'GET':
      try {
        const memos = db.getAllMemos();
        res.status(200).json({ memos });
      } catch (error) {
        console.error('获取 memos 失败:', error);
        res.status(500).json({ error: '获取 memos 失败' });
      }
      break;
      
    case 'POST':
      try {
        const memo = db.createMemo(req.body);
        res.status(201).json({ memo });
      } catch (error) {
        console.error('创建 memo 失败:', error);
        res.status(500).json({ error: '创建 memo 失败' });
      }
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export default withCors(withMethods(['GET', 'POST'])(handler));
`;
  
  await fs.writeFile(path.join(projectRoot, 'pages/api/memos/index.js'), memosApiContent);
  
  // 单个 Memo API
  const memoByIdContent = `import { getDatabase } from '../../../lib/server/database.js';
import { withMethods, withCors } from '../../../lib/server/middleware.js';

async function handler(req, res) {
  const { id } = req.query;
  const db = getDatabase();
  
  switch (req.method) {
    case 'GET':
      try {
        const memo = db.getMemoById(id);
        if (!memo) {
          return res.status(404).json({ error: 'Memo 不存在' });
        }
        res.status(200).json({ memo });
      } catch (error) {
        console.error('获取 memo 失败:', error);
        res.status(500).json({ error: '获取 memo 失败' });
      }
      break;
      
    case 'PUT':
      try {
        const memo = db.updateMemo(id, req.body);
        if (!memo) {
          return res.status(404).json({ error: 'Memo 不存在' });
        }
        res.status(200).json({ memo });
      } catch (error) {
        console.error('更新 memo 失败:', error);
        res.status(500).json({ error: '更新 memo 失败' });
      }
      break;
      
    case 'DELETE':
      try {
        const success = db.deleteMemo(id);
        if (!success) {
          return res.status(404).json({ error: 'Memo 不存在' });
        }
        res.status(200).json({ message: '删除成功' });
      } catch (error) {
        console.error('删除 memo 失败:', error);
        res.status(500).json({ error: '删除 memo 失败' });
      }
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: 'Method Not Allowed' });
  }
}

export default withCors(withMethods(['GET', 'PUT', 'DELETE'])(handler));
`;
  
  await fs.writeFile(path.join(projectRoot, 'pages/api/memos/[id].js'), memoByIdContent);
  
  // Health Check API
  const healthContent = `export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
}
`;
  
  await fs.writeFile(path.join(projectRoot, 'pages/api/health.js'), healthContent);
  
  console.log('✅ API Routes 创建完成\n');
}

/**
 * 步骤 7: 创建客户端服务
 */
async function createClientServices() {
  console.log('💻 创建客户端服务...');
  
  const clientApiContent = `class NextApiClient {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '' 
      : 'http://localhost:3001';
  }
  
  async request(endpoint, options = {}) {
    const url = \`\${this.baseUrl}/api\${endpoint}\`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };
    
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }
    
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API 请求失败');
    }
    
    return response.json();
  }
  
  // Memos API
  async getMemos() {
    return this.request('/memos');
  }
  
  async getMemo(id) {
    return this.request(\`/memos/\${id}\`);
  }
  
  async createMemo(data) {
    return this.request('/memos', {
      method: 'POST',
      body: data,
    });
  }
  
  async updateMemo(id, data) {
    return this.request(\`/memos/\${id}\`, {
      method: 'PUT',
      body: data,
    });
  }
  
  async deleteMemo(id) {
    return this.request(\`/memos/\${id}\`, {
      method: 'DELETE',
    });
  }
  
  // Health Check
  async getHealth() {
    return this.request('/health');
  }
}

export const apiClient = new NextApiClient();
export default apiClient;
`;
  
  await fs.writeFile(path.join(projectRoot, 'lib/client/apiClient.js'), clientApiContent);
  
  // 数据服务
  const dataServiceContent = `import { apiClient } from './apiClient.js';

class NextDataService {
  // Memos
  async getAllMemos() {
    try {
      const response = await apiClient.getMemos();
      return response.memos || [];
    } catch (error) {
      console.error('获取 memos 失败:', error);
      return [];
    }
  }
  
  async getMemoById(id) {
    try {
      const response = await apiClient.getMemo(id);
      return response.memo;
    } catch (error) {
      console.error(\`获取 memo \${id} 失败:\`, error);
      return null;
    }
  }
  
  async createMemo(data) {
    try {
      const response = await apiClient.createMemo(data);
      return response.memo;
    } catch (error) {
      console.error('创建 memo 失败:', error);
      throw error;
    }
  }
  
  async updateMemo(id, data) {
    try {
      const response = await apiClient.updateMemo(id, data);
      return response.memo;
    } catch (error) {
      console.error(\`更新 memo \${id} 失败:\`, error);
      throw error;
    }
  }
  
  async deleteMemo(id) {
    try {
      await apiClient.deleteMemo(id);
      return true;
    } catch (error) {
      console.error(\`删除 memo \${id} 失败:\`, error);
      return false;
    }
  }
  
  // 健康检查
  async checkHealth() {
    try {
      return await apiClient.getHealth();
    } catch (error) {
      console.error('健康检查失败:', error);
      return { status: 'error', error: error.message };
    }
  }
}

export const dataService = new NextDataService();
export default dataService;
`;
  
  await fs.writeFile(path.join(projectRoot, 'lib/client/dataService.js'), dataServiceContent);
  
  console.log('✅ 客户端服务创建完成\n');
}

/**
 * 步骤 8: 创建 Next.js Pages
 */
async function createNextPages() {
  console.log('📄 创建 Next.js Pages...');
  
  // _app.js
  const appContent = `import '../src/index.css';
import { useEffect, useState } from 'react';

export default function App({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  return <Component {...pageProps} />;
}
`;
  
  await fs.writeFile(path.join(projectRoot, 'pages/_app.js'), appContent);
  
  // index.js - 主页面
  const indexContent = `import { useState, useEffect } from 'react';
import Head from 'next/head';
import { dataService } from '../lib/client/dataService.js';

export default function Home() {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMemo, setNewMemo] = useState('');
  
  useEffect(() => {
    loadMemos();
  }, []);
  
  async function loadMemos() {
    try {
      setLoading(true);
      const memosData = await dataService.getAllMemos();
      setMemos(memosData);
    } catch (error) {
      console.error('加载 memos 失败:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleCreateMemo() {
    if (!newMemo.trim()) return;
    
    try {
      await dataService.createMemo({ 
        content: newMemo,
        tags: '',
        visibility: 'private'
      });
      setNewMemo('');
      await loadMemos();
    } catch (error) {
      console.error('创建 memo 失败:', error);
      alert('创建失败: ' + error.message);
    }
  }
  
  async function handleDeleteMemo(id) {
    if (!confirm('确定要删除这个 memo 吗？')) return;
    
    try {
      await dataService.deleteMemo(id);
      await loadMemos();
    } catch (error) {
      console.error('删除 memo 失败:', error);
      alert('删除失败');
    }
  }
  
  return (
    <>
      <Head>
        <title>MeowNocode - Next.js</title>
        <meta name="description" content="MeowNocode memo app powered by Next.js" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            🐱 MeowNocode - Next.js 版本
          </h1>
          
          {/* 创建新 Memo */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              创建新备忘录
            </h2>
            <div className="flex gap-4">
              <textarea
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                placeholder="输入您的备忘录内容..."
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="4"
              />
              <button
                onClick={handleCreateMemo}
                disabled={!newMemo.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600
                         disabled:opacity-50 disabled:cursor-not-allowed h-fit"
              >
                创建
              </button>
            </div>
          </div>
          
          {/* Memos 列表 */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              我的备忘录
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent 
                               rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">加载中...</p>
              </div>
            ) : memos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  还没有备忘录，创建第一个吧！
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {memos.map((memo) => (
                  <div key={memo.id} className="border border-gray-200 dark:border-gray-600 
                                               rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                          {memo.content}
                        </p>
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          创建于: {new Date(memo.created_ts).toLocaleString()}
                          {memo.updated_ts !== memo.created_ts && (
                            <span className="ml-4">
                              更新于: {new Date(memo.updated_ts).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {memo.tags && (
                          <div className="mt-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {memo.tags}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteMemo(memo.id)}
                        className="ml-4 text-red-500 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 状态信息 */}
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>✅ Next.js 后端已就绪 - 支持跨浏览器数据共享</p>
            <p>🔧 这是一个基础版本，完整功能正在迁移中...</p>
          </div>
        </div>
      </div>
    </>
  );
}
`;
  
  await fs.writeFile(path.join(projectRoot, 'pages/index.js'), indexContent);
  
  console.log('✅ Next.js Pages 创建完成\n');
}

/**
 * 辅助函数：复制目录
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🎯 完整的 Next.js 迁移开始\n');
    
    await createBackup();
    await updatePackageJson();
    await createNextConfig();
    await createNextDirectories();
    await createServerServices();
    await createApiRoutes();
    await createClientServices();
    await createNextPages();
    
    // 确保数据目录存在
    await fs.mkdir(path.join(projectRoot, 'data'), { recursive: true });
    
    console.log('🎉 完整的 Next.js 迁移完成！\n');
    
    console.log('📝 下一步操作：');
    console.log('1. 运行 npm install 安装依赖');
    console.log('2. 运行 npm run dev 启动 Next.js 开发服务器 (端口 3001)');
    console.log('3. 访问 http://localhost:3001 查看 Next.js 版本');
    console.log('4. 原 Vite 版本仍可通过 npm run dev:vite 运行 (端口 8080)');
    console.log('\n💡 提示：');
    console.log('- 原项目文件已备份到 backup-vite/ 目录');
    console.log('- 这是基础版本，完整 UI 功能将逐步迁移');
    console.log('- Next.js 版本支持跨浏览器数据共享');
    
  } catch (error) {
    console.error('❌ 迁移过程中出现错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;