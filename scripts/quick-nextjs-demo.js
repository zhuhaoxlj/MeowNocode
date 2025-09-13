#!/usr/bin/env node

/**
 * 快速 Next.js 演示脚本
 * 跳过复杂的数据库依赖，快速体验 Next.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 快速设置 Next.js 演示版本...\n');

// 检查当前目录
const currentDir = process.cwd();
const packageJsonPath = path.join(currentDir, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ 没有找到 package.json 文件');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 步骤 1: 安装基础 Next.js 依赖 (跳过数据库)
console.log('📥 1. 安装基础 Next.js 依赖...');
try {
  const dependencies = [
    'next@^14.0.0'
  ];
  
  const devDependencies = [
    '@types/node@^20.8.10'
  ];

  console.log('安装 Next.js...');
  execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
  
  console.log('安装开发依赖...');
  execSync(`npm install -D ${devDependencies.join(' ')}`, { stdio: 'inherit' });

} catch (error) {
  console.error('❌ Next.js 安装失败:', error.message);
  process.exit(1);
}

// 步骤 2: 更新 package.json scripts
console.log('📝 2. 更新 package.json scripts...');
packageJson.scripts = {
  ...packageJson.scripts,
  'dev-nextjs': 'next dev -p 3001',
  'build-nextjs': 'next build',
  'start-nextjs': 'next start -p 3001',
  'demo': 'node scripts/quick-nextjs-demo.js'
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// 步骤 3: 创建简化的演示文件
console.log('📁 3. 创建演示文件...');

// 创建 pages 目录
const pagesDir = path.join(currentDir, 'pages');
if (!fs.existsSync(pagesDir)) {
  fs.mkdirSync(pagesDir, { recursive: true });
}

// 创建简单的首页
const indexContent = `/**
 * Next.js 版本的首页 - 演示版
 */

import { useState } from 'react';

export default function NextJSDemo() {
  const [memos, setMemos] = useState([
    {
      id: '1',
      content: '🎉 欢迎使用 Next.js 版本的 MeowNocode！',
      createdAt: new Date().toISOString(),
      tags: ['demo', 'nextjs']
    },
    {
      id: '2', 
      content: '✨ 这是一个演示版本，展示了 Next.js 的基础架构',
      createdAt: new Date().toISOString(),
      tags: ['demo']
    },
    {
      id: '3',
      content: '🚀 完整版本包含服务器端 SQLite 数据库，实现真正的跨浏览器数据共享',
      createdAt: new Date().toISOString(),
      tags: ['info']
    }
  ]);

  const [newMemo, setNewMemo] = useState('');

  const addMemo = () => {
    if (!newMemo.trim()) return;
    
    const memo = {
      id: Date.now().toString(),
      content: newMemo,
      createdAt: new Date().toISOString(),
      tags: []
    };
    
    setMemos([memo, ...memos]);
    setNewMemo('');
  };

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px'
    }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ 
          color: '#2563eb', 
          fontSize: '2rem',
          marginBottom: '10px' 
        }}>
          📝 MeowNocode - Next.js 演示版
        </h1>
        <p style={{ color: '#6b7280' }}>
          这个演示展示了 Next.js 的基础架构。完整版本将包含服务器端数据库，实现跨浏览器数据共享。
        </p>
      </header>

      {/* 输入区域 */}
      <div style={{
        background: '#f8fafc',
        border: '2px solid #e2e8f0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <textarea
          value={newMemo}
          onChange={(e) => setNewMemo(e.target.value)}
          placeholder="写点什么... (这是演示版本，数据不会持久化)"
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            resize: 'none',
            marginBottom: '10px'
          }}
        />
        <button
          onClick={addMemo}
          disabled={!newMemo.trim()}
          style={{
            background: newMemo.trim() ? '#2563eb' : '#9ca3af',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: newMemo.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          添加备忘录
        </button>
      </div>

      {/* 备忘录列表 */}
      <div>
        <h2 style={{ 
          fontSize: '1.25rem',
          marginBottom: '20px',
          color: '#374151'
        }}>
          备忘录列表 ({memos.length})
        </h2>
        
        {memos.map(memo => (
          <div 
            key={memo.id}
            style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '8px'
            }}>
              {memo.content}
            </div>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              <span>
                {new Date(memo.createdAt).toLocaleString()}
              </span>
              {memo.tags.length > 0 && (
                <div>
                  {memo.tags.map(tag => (
                    <span 
                      key={tag}
                      style={{
                        background: '#dbeafe',
                        color: '#1e40af',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        marginLeft: '4px',
                        fontSize: '11px'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 说明信息 */}
      <div style={{
        background: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '30px'
      }}>
        <h3 style={{ 
          fontSize: '1rem',
          margin: '0 0 8px 0',
          color: '#92400e' 
        }}>
          💡 关于完整版本
        </h3>
        <p style={{ 
          margin: 0,
          fontSize: '14px',
          color: '#92400e' 
        }}>
          完整的 Next.js 版本将包含：<br/>
          • 服务器端 SQLite 数据库<br/>
          • 真正的跨浏览器数据共享<br/>  
          • 文件上传和图片支持<br/>
          • 数据导入导出功能<br/>
          • 完整的 API 系统
        </p>
      </div>
    </div>
  );
}`;

fs.writeFileSync(path.join(pagesDir, 'index.js'), indexContent);

// 创建基础的 next.config.js
const nextConfigContent = `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 图片配置
  images: {
    unoptimized: true
  },

  // 开发服务器配置
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;`;

fs.writeFileSync(path.join(currentDir, 'next.config.js'), nextConfigContent);

console.log('\n🎉 Next.js 演示版本设置完成！\n');
console.log('🚀 启动演示:');
console.log('  npm run dev-nextjs');
console.log('');
console.log('📱 访问地址:');
console.log('  http://localhost:3001');
console.log('');
console.log('🌟 主要特性:');
console.log('  ✅ Next.js 框架已就绪');
console.log('  ✅ 基础的备忘录功能');
console.log('  ✅ 现代化的项目结构');
console.log('  ✅ 热重载和开发体验');
console.log('');
console.log('📋 下一步:');
console.log('  1. 启动演示版本');
console.log('  2. 体验 Next.js 的开发模式');
console.log('  3. 了解项目架构');
console.log('  4. 准备安装完整的数据库支持');
console.log('');
console.log('💡 提示:');
console.log('  演示版本使用内存存储，数据不会持久化');
console.log('  完整版本将提供服务器端 SQLite 支持');
console.log('');