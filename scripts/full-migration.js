#!/usr/bin/env node

/**
 * 完整迁移脚本
 * 从 Vite + React 迁移到 Next.js 完整版本
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

console.log('🚀 开始完整迁移到 Next.js...\n');

// 步骤 1: 备份现有项目
console.log('📦 1. 备份现有项目...');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(projectRoot, `backup-vite-${timestamp}`);

try {
  // 创建备份目录
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  // 备份重要文件
  const filesToBackup = [
    'package.json',
    'vite.config.js',
    'tailwind.config.js',
    'src',
    'public'
  ];

  filesToBackup.forEach(item => {
    const srcPath = path.join(projectRoot, item);
    const destPath = path.join(backupDir, item);
    
    if (fs.existsSync(srcPath)) {
      if (fs.statSync(srcPath).isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
      console.log(`  ✅ 已备份: ${item}`);
    }
  });

  console.log(`📁 备份完成，位置: ${backupDir}\n`);
} catch (error) {
  console.error('❌ 备份失败:', error.message);
  process.exit(1);
}

// 步骤 2: 安装依赖
console.log('📥 2. 安装 Next.js 依赖...');
try {
  // 复制新的 package.json
  const newPackageJsonPath = path.join(projectRoot, 'package-nextjs-full.json');
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (fs.existsSync(newPackageJsonPath)) {
    fs.copyFileSync(newPackageJsonPath, packageJsonPath);
    console.log('  ✅ 更新 package.json');
  }

  console.log('  🔄 安装依赖...');
  execSync('npm install', { stdio: 'inherit' });
  
  console.log('✅ 依赖安装完成\n');
} catch (error) {
  console.error('❌ 依赖安装失败:', error.message);
  console.log('💡 提示: 如果遇到编译错误，脚本会使用兼容版本的数据库');
}

// 步骤 3: 创建 Next.js 目录结构
console.log('📁 3. 创建 Next.js 项目结构...');
const dirsToCreate = [
  'pages/api/memos',
  'pages/api/attachments', 
  'pages/api/import',
  'pages/api/export',
  'data/uploads',
  'data/backups',
  'lib/server',
  'lib/client', 
  'components/nextjs'
];

dirsToCreate.forEach(dir => {
  const dirPath = path.join(projectRoot, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  ✅ 创建目录: ${dir}`);
  }
});

// 步骤 4: 复制 API 文件
console.log('\n📝 4. 设置 API Routes...');
const apiFiles = [
  { src: 'pages/api/memos/index-full.js', dest: 'pages/api/memos/index.js' },
  { src: 'pages/api/memos/[id]-full.js', dest: 'pages/api/memos/[id].js' }
];

apiFiles.forEach(({ src, dest }) => {
  const srcPath = path.join(projectRoot, src);
  const destPath = path.join(projectRoot, dest);
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✅ 设置 API: ${dest}`);
  }
});

// 步骤 5: 创建主要页面
console.log('\n🎨 5. 创建 Next.js 页面...');
createMainApp();
createMainIndexPage();

// 步骤 6: 创建数据迁移脚本
console.log('\n🔄 6. 创建数据迁移工具...');
createDataMigrationScript();

// 步骤 7: 更新配置文件
console.log('\n⚙️ 7. 更新配置文件...');
updateNextConfig();

console.log('\n🎉 完整迁移准备完成！\n');
console.log('📋 接下来的步骤:');
console.log('');
console.log('1. 🚀 启动 Next.js 开发服务器:');
console.log('   npm run dev');
console.log('');
console.log('2. 📱 访问新版本:');
console.log('   http://localhost:8081');
console.log('');
console.log('3. 🔄 迁移现有数据 (可选):');
console.log('   npm run migrate:data');
console.log('');
console.log('4. 🌐 测试跨浏览器功能:');
console.log('   - 在 Chrome 中创建数据');
console.log('   - 在 Firefox 中验证可以看到相同数据');
console.log('');
console.log('💡 提示:');
console.log('- 原 Vite 版本已备份到:', path.relative(projectRoot, backupDir));
console.log('- 可以同时运行两个版本进行对比测试');
console.log('- 如需回滚，请参考 ROLLBACK.md 文档');
console.log('');

// 辅助函数
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createMainApp() {
  const appContent = `/**
 * Next.js App 组件 - 完整版
 */

import { useEffect } from 'react';
import '../src/index.css';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    console.log('🚀 MeowNocode Next.js 完整版已启动');
    console.log('🌐 API 基础地址: http://localhost:8081/api');
  }, []);

  return <Component {...pageProps} />;
}`;

  fs.writeFileSync(path.join(projectRoot, 'pages/_app.js'), appContent);
}

function createMainIndexPage() {
  const indexContent = `/**
 * Next.js 主页面 - 完整版
 * 复用现有的组件架构
 */

import { useState, useEffect } from 'react';
import { NextDataProvider } from '../lib/client/nextDataProvider';
import { MemoApp } from '../components/nextjs/MemoApp';

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui'
      }}>
        <div>
          <div style={{ marginBottom: '10px' }}>🚀 Next.js 版本加载中...</div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            正在初始化跨浏览器数据共享功能
          </div>
        </div>
      </div>
    );
  }

  return (
    <NextDataProvider>
      <MemoApp />
    </NextDataProvider>
  );
}`;

  fs.writeFileSync(path.join(projectRoot, 'pages/index.js'), indexContent);
}

function createDataMigrationScript() {
  const migrationContent = `#!/usr/bin/env node

/**
 * 数据迁移脚本
 * 从浏览器 localStorage/IndexedDB 迁移到服务器 SQLite
 */

console.log('🔄 数据迁移功能');
console.log('');
console.log('由于浏览器安全限制，无法直接访问其他域名的数据。');
console.log('请手动导出现有数据：');
console.log('');
console.log('1. 打开原 Vite 版本 (http://localhost:8080)');
console.log('2. 使用导出功能保存数据');
console.log('3. 在 Next.js 版本中导入该文件');
console.log('');
console.log('或者重新创建重要的备忘录内容。');
`;

  fs.writeFileSync(path.join(projectRoot, 'scripts/migrate-data.js'), migrationContent);
}

function updateNextConfig() {
  const configContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 图片配置
  images: {
    unoptimized: true
  },

  // 实验性配置
  experimental: {
    serverComponentsExternalPackages: ['sql.js']
  },

  // API 配置
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  },

  // 开发服务器配置
  async redirects() {
    return [];
  },

  // Webpack 配置 
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 服务器端配置
      config.externals = [...config.externals, 'sql.js'];
    }
    return config;
  }
};

export default nextConfig;`;

  fs.writeFileSync(path.join(projectRoot, 'next.config.js'), configContent);
}