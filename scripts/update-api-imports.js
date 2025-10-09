#!/usr/bin/env node

/**
 * 批量更新 API 文件的数据库导入
 * 将所有 database.js 和 database-simple.js 的导入改为 database-config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_DIR = path.join(__dirname, '..', 'pages', 'api');

// 需要更新的导入模式
const patterns = [
  {
    old: /from ['"]\.\.\/\.\.\/\.\.\/lib\/server\/database\.js['"]/g,
    new: 'from \'../../../lib/server/database-config.js\''
  },
  {
    old: /from ['"]\.\.\/\.\.\/lib\/server\/database\.js['"]/g,
    new: 'from \'../../lib/server/database-config.js\''
  },
  {
    old: /from ['"]\.\.\/\.\.\/\.\.\/lib\/server\/database-simple\.js['"]/g,
    new: 'from \'../../../lib/server/database-config.js\''
  },
  {
    old: /from ['"]\.\.\/\.\.\/lib\/server\/database-simple\.js['"]/g,
    new: 'from \'../../lib/server/database-config.js\''
  },
];

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const pattern of patterns) {
    if (pattern.old.test(content)) {
      content = content.replace(pattern.old, pattern.new);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 已更新: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  
  return false;
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  let updatedCount = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      updatedCount += walkDir(filePath);
    } else if (file.endsWith('.js')) {
      if (updateFile(filePath)) {
        updatedCount++;
      }
    }
  }
  
  return updatedCount;
}

console.log('🔄 开始更新 API 文件的数据库导入...\n');

const updatedCount = walkDir(API_DIR);

console.log(`\n✨ 完成！共更新 ${updatedCount} 个文件`);
console.log('\n📝 所有 API 现在使用统一的数据库配置');
console.log('💡 可以通过修改 lib/server/database-config.js 来切换数据库类型');

