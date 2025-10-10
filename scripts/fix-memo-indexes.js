#!/usr/bin/env node

/**
 * 修复数据库索引 - 从 updated_ts 切换到 created_ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.MEMOS_DB_PATH || path.join(__dirname, '..', 'memos_db', 'memos_dev.db');

console.log('📂 数据库路径:', dbPath);

try {
  const db = new Database(dbPath);
  
  console.log('🔧 开始修复索引...\n');
  
  // 1. 删除旧的 updated_ts 索引
  console.log('1️⃣ 删除旧索引...');
  try {
    db.prepare('DROP INDEX IF EXISTS idx_memo_creator_status').run();
    console.log('   ✅ 删除 idx_memo_creator_status');
  } catch (error) {
    console.log('   ⚠️  idx_memo_creator_status 不存在或已删除');
  }
  
  try {
    db.prepare('DROP INDEX IF EXISTS idx_memo_updated_ts').run();
    console.log('   ✅ 删除 idx_memo_updated_ts');
  } catch (error) {
    console.log('   ⚠️  idx_memo_updated_ts 不存在或已删除');
  }
  
  // 2. 创建新的 created_ts 索引
  console.log('\n2️⃣ 创建新索引...');
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_memo_creator_status 
    ON memo(creator_id, row_status, created_ts DESC)
  `).run();
  console.log('   ✅ 创建 idx_memo_creator_status (按 created_ts 排序)');
  
  db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_memo_created_ts 
    ON memo(created_ts DESC)
  `).run();
  console.log('   ✅ 创建 idx_memo_created_ts');
  
  // 3. 验证索引
  console.log('\n3️⃣ 验证索引...');
  const indexes = db.prepare(`
    SELECT name, sql 
    FROM sqlite_master 
    WHERE type = 'index' 
    AND tbl_name = 'memo' 
    AND name LIKE 'idx_memo%'
  `).all();
  
  console.log('   当前 memo 表的索引:');
  indexes.forEach(idx => {
    console.log(`   - ${idx.name}`);
    if (idx.sql) {
      console.log(`     ${idx.sql}`);
    }
  });
  
  // 4. 优化数据库
  console.log('\n4️⃣ 优化数据库...');
  db.prepare('ANALYZE').run();
  console.log('   ✅ ANALYZE 完成');
  
  db.prepare('VACUUM').run();
  console.log('   ✅ VACUUM 完成');
  
  db.close();
  
  console.log('\n✅ 索引修复完成！\n');
  console.log('💡 提示: 现在刷新浏览器页面，memos 将按创建时间排序。');
  
} catch (error) {
  console.error('❌ 修复失败:', error);
  process.exit(1);
}

