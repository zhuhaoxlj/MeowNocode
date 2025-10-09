#!/usr/bin/env node

/**
 * NAS 部署诊断脚本
 * 用于检查数据库配置、文件权限和依赖问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🔍 MeowNocode NAS 部署诊断\n');
console.log('=' .repeat(60));

let hasErrors = false;

// 1. 检查 Node.js 版本
console.log('\n📦 检查 Node.js 版本...');
try {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  console.log(`   Node.js 版本: ${nodeVersion}`);
  
  if (majorVersion < 18) {
    console.log('   ❌ 警告: 建议使用 Node.js 18 或更高版本');
    hasErrors = true;
  } else {
    console.log('   ✅ Node.js 版本符合要求');
  }
} catch (error) {
  console.log('   ❌ 无法检查 Node.js 版本');
  hasErrors = true;
}

// 2. 检查数据库目录和文件
console.log('\n💾 检查数据库配置...');
const dbPath = process.env.MEMOS_DB_PATH || path.join(projectRoot, 'memos_db', 'memos_dev.db');
const dbDir = path.dirname(dbPath);

console.log(`   数据库路径: ${dbPath}`);

if (!fs.existsSync(dbDir)) {
  console.log(`   ❌ 数据库目录不存在: ${dbDir}`);
  console.log(`   💡 解决方案: mkdir -p ${dbDir}`);
  hasErrors = true;
} else {
  console.log(`   ✅ 数据库目录存在`);
  
  // 检查目录权限
  try {
    const dirStats = fs.statSync(dbDir);
    const dirMode = (dirStats.mode & parseInt('777', 8)).toString(8);
    console.log(`   目录权限: ${dirMode}`);
    
    if (dirMode < '755') {
      console.log(`   ⚠️  警告: 目录权限可能不足`);
      console.log(`   💡 解决方案: chmod 755 ${dbDir}`);
    }
  } catch (error) {
    console.log(`   ❌ 无法检查目录权限: ${error.message}`);
    hasErrors = true;
  }
}

if (!fs.existsSync(dbPath)) {
  console.log(`   ⚠️  数据库文件不存在: ${dbPath}`);
  console.log(`   💡 这可能是首次部署，数据库将在首次运行时创建`);
  console.log(`   💡 或者你需要上传现有的数据库文件`);
} else {
  console.log(`   ✅ 数据库文件存在`);
  
  // 检查文件权限
  try {
    const fileStats = fs.statSync(dbPath);
    const fileMode = (fileStats.mode & parseInt('777', 8)).toString(8);
    const fileSize = (fileStats.size / 1024 / 1024).toFixed(2);
    
    console.log(`   文件大小: ${fileSize} MB`);
    console.log(`   文件权限: ${fileMode}`);
    
    if (fileMode < '644') {
      console.log(`   ⚠️  警告: 文件权限可能不足`);
      console.log(`   💡 解决方案: chmod 664 ${dbPath}`);
    }
    
    // 测试读取权限
    try {
      fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      console.log(`   ✅ 文件可读写`);
    } catch (error) {
      console.log(`   ❌ 文件权限不足: 无法读写`);
      console.log(`   💡 解决方案: chmod 664 ${dbPath}`);
      hasErrors = true;
    }
  } catch (error) {
    console.log(`   ❌ 无法检查文件权限: ${error.message}`);
    hasErrors = true;
  }
}

// 3. 检查 better-sqlite3
console.log('\n🔧 检查 better-sqlite3...');
try {
  const betterSqlite3Path = path.join(projectRoot, 'node_modules', 'better-sqlite3');
  
  if (!fs.existsSync(betterSqlite3Path)) {
    console.log('   ❌ better-sqlite3 未安装');
    console.log('   💡 解决方案: npm install better-sqlite3');
    hasErrors = true;
  } else {
    console.log('   ✅ better-sqlite3 已安装');
    
    // 尝试加载模块
    try {
      const Database = (await import('better-sqlite3')).default;
      console.log('   ✅ better-sqlite3 可以正常加载');
      
      // 尝试创建测试数据库
      try {
        const testDbPath = path.join(projectRoot, 'test-db-temp.db');
        const testDb = new Database(testDbPath);
        testDb.close();
        fs.unlinkSync(testDbPath);
        console.log('   ✅ better-sqlite3 功能正常');
      } catch (error) {
        console.log(`   ❌ better-sqlite3 无法创建数据库: ${error.message}`);
        console.log('   💡 解决方案: npm rebuild better-sqlite3');
        hasErrors = true;
      }
    } catch (error) {
      console.log(`   ❌ better-sqlite3 加载失败: ${error.message}`);
      console.log('   💡 可能需要重新编译: npm rebuild better-sqlite3');
      hasErrors = true;
    }
  }
} catch (error) {
  console.log(`   ❌ 检查失败: ${error.message}`);
  hasErrors = true;
}

// 4. 检查系统架构
console.log('\n🖥️  检查系统架构...');
try {
  const arch = process.arch;
  const platform = process.platform;
  console.log(`   架构: ${arch}`);
  console.log(`   平台: ${platform}`);
  
  if (arch === 'arm' || arch === 'arm64') {
    console.log('   ℹ️  检测到 ARM 架构，建议重新编译原生模块');
    console.log('   💡 运行: npm rebuild better-sqlite3');
  }
} catch (error) {
  console.log(`   ❌ 无法检查系统架构: ${error.message}`);
}

// 5. 检查端口
console.log('\n🌐 检查端口配置...');
const port = process.env.PORT || 8081;
console.log(`   配置端口: ${port}`);

try {
  // 尝试检查端口是否被占用（仅在 Unix 系统）
  if (process.platform !== 'win32') {
    try {
      const result = execSync(`lsof -i :${port}`, { encoding: 'utf-8', stdio: 'pipe' });
      console.log(`   ⚠️  端口 ${port} 可能已被占用:`);
      console.log(result.split('\n').slice(0, 3).join('\n'));
    } catch (error) {
      // lsof 返回非零代码表示端口未被占用
      console.log(`   ✅ 端口 ${port} 可用`);
    }
  }
} catch (error) {
  // 忽略检查失败
}

// 6. 检查关键依赖
console.log('\n📚 检查关键依赖...');
const criticalDeps = [
  'next',
  'react',
  'react-dom',
  'better-sqlite3'
];

for (const dep of criticalDeps) {
  const depPath = path.join(projectRoot, 'node_modules', dep);
  if (fs.existsSync(depPath)) {
    console.log(`   ✅ ${dep}`);
  } else {
    console.log(`   ❌ ${dep} 未安装`);
    hasErrors = true;
  }
}

// 7. 检查构建文件
console.log('\n🏗️  检查构建文件...');
const nextBuildPath = path.join(projectRoot, '.next');
if (fs.existsSync(nextBuildPath)) {
  console.log(`   ✅ Next.js 构建文件存在`);
} else {
  console.log(`   ⚠️  Next.js 构建文件不存在`);
  console.log(`   💡 需要先构建: npm run build`);
}

// 8. 测试数据库连接
console.log('\n🔌 测试数据库连接...');
if (fs.existsSync(dbPath)) {
  try {
    const Database = (await import('better-sqlite3')).default;
    const db = new Database(dbPath, { readonly: true });
    
    // 尝试查询
    try {
      const result = db.prepare('SELECT COUNT(*) as count FROM memo').get();
      console.log(`   ✅ 数据库连接成功`);
      console.log(`   备忘录数量: ${result.count}`);
    } catch (error) {
      console.log(`   ⚠️  数据库连接成功，但查询失败: ${error.message}`);
      console.log(`   💡 数据库可能需要初始化或迁移`);
    }
    
    db.close();
  } catch (error) {
    console.log(`   ❌ 数据库连接失败: ${error.message}`);
    hasErrors = true;
  }
} else {
  console.log(`   ⏭️  跳过（数据库文件不存在）`);
}

// 总结
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.log('\n❌ 发现问题，请按照上述建议进行修复\n');
  console.log('常见解决方案：');
  console.log('1. 重新安装依赖: npm install');
  console.log('2. 重新编译原生模块: npm rebuild better-sqlite3');
  console.log('3. 检查文件权限: chmod 755 memos_db && chmod 664 memos_db/*.db');
  console.log('4. 构建项目: npm run build');
  console.log('\n详细部署指南: doc/NAS_DEPLOYMENT_GUIDE.md\n');
  process.exit(1);
} else {
  console.log('\n✅ 所有检查通过！系统配置正常\n');
  console.log('可以启动服务: npm start\n');
  process.exit(0);
}

