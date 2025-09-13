#!/usr/bin/env node

/**
 * 自动迁移脚本
 * 帮助从 Vite 项目迁移到 Next.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 开始迁移到 Next.js...\n');

// 检查当前目录
const currentDir = process.cwd();
const packageJsonPath = path.join(currentDir, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ 没有找到 package.json 文件');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 步骤 1: 备份 package.json
console.log('📦 1. 备份当前 package.json...');
fs.copyFileSync(packageJsonPath, path.join(currentDir, 'package.json.backup'));

// 步骤 2: 安装 Next.js 依赖
console.log('📥 2. 安装 Next.js 依赖...');
try {
  const dependencies = [
    'next@^14.0.0',
    'sqlite3@^5.1.6',
    'formidable@^3.5.1',
    'nanoid@^5.0.4'
  ];
  
  const devDependencies = [
    '@types/node@^20.8.10',
    'typescript@^5.2.2'
  ];

  console.log('安装生产依赖...');
  execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
  
  console.log('安装开发依赖...');
  execSync(`npm install -D ${devDependencies.join(' ')}`, { stdio: 'inherit' });

} catch (error) {
  console.error('❌ 依赖安装失败:', error.message);
  process.exit(1);
}

// 步骤 3: 更新 package.json scripts
console.log('📝 3. 更新 package.json scripts...');
packageJson.scripts = {
  ...packageJson.scripts,
  'dev': 'next dev',
  'build': 'next build',
  'start': 'next start',
  'db:backup': 'node scripts/backup-db.js',
  'migrate': 'node scripts/migrate-to-nextjs.js'
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// 步骤 4: 创建必要的目录结构
console.log('📁 4. 创建目录结构...');
const dirsToCreate = [
  'pages/api',
  'data/uploads',
  'data/backups',
  'lib/server',
  'lib/client'
];

dirsToCreate.forEach(dir => {
  const dirPath = path.join(currentDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  ✅ 创建目录: ${dir}`);
  }
});

// 步骤 5: 检查文件状态
console.log('🔍 5. 检查迁移文件状态...');
const requiredFiles = [
  'next.config.js',
  'pages/_app.js',
  'pages/index.js',
  'pages/api/health.js',
  'pages/api/memos/index.js',
  'lib/server/database.js',
  'lib/client/nextApiClient.js',
  'NEXTJS_MIGRATION.md'
];

const missingFiles = [];
requiredFiles.forEach(file => {
  if (!fs.existsSync(path.join(currentDir, file))) {
    missingFiles.push(file);
  }
});

if (missingFiles.length > 0) {
  console.log('⚠️  以下文件需要手动创建或已提供:');
  missingFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
} else {
  console.log('✅ 所有必需文件都已存在');
}

// 步骤 6: 数据迁移提醒
console.log('\n📋 6. 数据迁移指南:');
console.log('');
console.log('🔄 **重要**: 您需要迁移现有的浏览器存储数据到服务器:');
console.log('');
console.log('1. 现有数据在浏览器的 localStorage 和 IndexedDB 中');
console.log('2. Next.js 版本使用服务器端 SQLite 数据库');
console.log('3. 请使用以下方法之一迁移数据:');
console.log('');
console.log('   方法A: 通过导入功能');
console.log('   - 如果您有 .db 文件，可以通过 /api/import/memos-db 导入');
console.log('');
console.log('   方法B: 手动重新创建');
console.log('   - 在新版本中重新创建重要的备忘录');
console.log('');

// 步骤 7: 启动指南
console.log('🚀 7. 启动新版本:');
console.log('');
console.log('  npm run dev');
console.log('');
console.log('  然后访问: http://localhost:3000');
console.log('');

// 步骤 8: 验证提醒
console.log('✅ 8. 验证功能:');
console.log('');
console.log('迁移完成后，请验证以下功能:');
console.log('  □ 跨浏览器数据共享');
console.log('  □ 备忘录的创建、编辑、删除');
console.log('  □ 文件上传和图片显示');
console.log('  □ 数据导入导出');
console.log('  □ 搜索和标签筛选');
console.log('');

console.log('🎉 迁移准备完成!');
console.log('');
console.log('📖 详细说明请查看: NEXTJS_MIGRATION.md');
console.log('');
console.log('如果遇到问题:');
console.log('1. 检查控制台错误信息');
console.log('2. 确认数据库文件权限');
console.log('3. 验证所有依赖已安装');
console.log('');
console.log('⚠️  备份文件: package.json.backup');
console.log('如需回滚，请恢复该文件并重新安装依赖。');
console.log('');