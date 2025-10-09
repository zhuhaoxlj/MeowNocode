#!/usr/bin/env node

/**
 * 测试 Memos 数据库导入功能
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const MEMOS_DB = path.join(process.cwd(), 'memos_db', 'memos_dev.db');

console.log('🧪 测试 Memos 数据库导入功能\n');

// 1. 检查数据库文件
console.log('1️⃣ 检查数据库文件...');
if (!fs.existsSync(MEMOS_DB)) {
  console.log('❌ 未找到数据库文件:', MEMOS_DB);
  console.log('📝 请将 Memos 数据库文件放在 memos_db/ 目录下');
  process.exit(1);
}
console.log('✅ 找到数据库文件\n');

// 2. 连接数据库
console.log('2️⃣ 连接数据库...');
let db;
try {
  db = new Database(MEMOS_DB, { readonly: true });
  console.log('✅ 连接成功\n');
} catch (error) {
  console.log('❌ 连接失败:', error.message);
  process.exit(1);
}

// 3. 检查表结构
console.log('3️⃣ 检查表结构...');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('📊 数据库表:', tables.map(t => t.name).join(', '));

const requiredTables = ['memo', 'user'];
const hasTables = requiredTables.every(table => tables.some(t => t.name === table));
if (!hasTables) {
  console.log('❌ 缺少必需的表');
  db.close();
  process.exit(1);
}
console.log('✅ 表结构完整\n');

// 4. 统计数据
console.log('4️⃣ 统计数据...');
try {
  const memoCount = db.prepare('SELECT COUNT(*) as count FROM memo').get().count;
  const normalMemos = db.prepare('SELECT COUNT(*) as count FROM memo WHERE row_status = "NORMAL"').get().count;
  const archivedMemos = db.prepare('SELECT COUNT(*) as count FROM memo WHERE row_status = "ARCHIVED"').get().count;
  
  console.log(`📝 总备忘录数: ${memoCount}`);
  console.log(`   ✨ 正常: ${normalMemos}`);
  console.log(`   📦 归档: ${archivedMemos}`);
  
  // 检查 memo_organizer 表
  const hasOrganizerTable = tables.some(t => t.name === 'memo_organizer');
  if (hasOrganizerTable) {
    const pinnedCount = db.prepare('SELECT COUNT(*) as count FROM memo_organizer WHERE pinned = 1').get().count;
    console.log(`   📌 置顶: ${pinnedCount}`);
  }
  
  console.log('✅ 数据统计完成\n');
} catch (error) {
  console.log('❌ 统计失败:', error.message);
  db.close();
  process.exit(1);
}

// 5. 查看示例数据
console.log('5️⃣ 查看示例数据...');
try {
  const sampleQuery = `
    SELECT 
      m.id,
      m.content,
      m.visibility,
      m.row_status,
      m.created_ts,
      o.pinned
    FROM memo m
    LEFT JOIN memo_organizer o ON m.id = o.memo_id
    ORDER BY m.created_ts DESC
    LIMIT 3
  `;
  
  const samples = db.prepare(sampleQuery).all();
  
  samples.forEach((memo, index) => {
    console.log(`\n📄 示例 ${index + 1}:`);
    console.log(`   ID: ${memo.id}`);
    console.log(`   内容: ${memo.content.substring(0, 50)}${memo.content.length > 50 ? '...' : ''}`);
    console.log(`   状态: ${memo.row_status} ${memo.pinned === 1 ? '📌' : ''}`);
    console.log(`   时间: ${new Date(memo.created_ts * 1000).toISOString()}`);
  });
  
  console.log('\n✅ 示例数据查看完成\n');
} catch (error) {
  console.log('❌ 查询失败:', error.message);
}

// 6. 测试标签提取
console.log('6️⃣ 测试标签提取...');
try {
  const memosWithTags = db.prepare('SELECT content FROM memo WHERE content LIKE "%#%"').all();
  
  if (memosWithTags.length > 0) {
    const sampleMemo = memosWithTags[0];
    const tagRegex = /#([^\s#]+)/g;
    const tags = [];
    let match;
    
    while ((match = tagRegex.exec(sampleMemo.content)) !== null) {
      if (!tags.includes(match[1])) {
        tags.push(match[1]);
      }
    }
    
    console.log(`📝 找到 ${memosWithTags.length} 条包含标签的备忘录`);
    console.log(`🏷️  示例标签: ${tags.join(', ')}`);
  } else {
    console.log('📝 未找到包含标签的备忘录');
  }
  
  console.log('✅ 标签提取测试完成\n');
} catch (error) {
  console.log('❌ 标签提取失败:', error.message);
}

// 7. 完成
db.close();
console.log('🎉 所有测试完成！');
console.log('\n📋 下一步:');
console.log('   1. 运行导入: npm run import:memos');
console.log('   2. 或在 Web 界面中导入（设置 → 数据 → 从 Memos 数据库导入）');

