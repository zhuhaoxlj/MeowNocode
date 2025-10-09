#!/usr/bin/env node

/**
 * 检查 Memos 数据库结构
 */

import Database from 'better-sqlite3';
import path from 'path';

const MEMOS_DB = path.join(process.cwd(), 'memos_db', 'memos_dev.db');

try {
  console.log('🔍 检查 Memos 数据库结构\n');
  console.log('数据库文件:', MEMOS_DB, '\n');
  
  const db = new Database(MEMOS_DB, { readonly: true });
  
  // 获取所有表
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    ORDER BY name
  `).all();
  
  console.log('📊 数据库中的表：');
  tables.forEach(table => console.log(`   - ${table.name}`));
  console.log('');
  
  // 查看每个表的结构
  for (const table of tables) {
    console.log(`\n📋 表: ${table.name}`);
    console.log('─'.repeat(60));
    
    const columns = db.pragma(`table_info(${table.name})`);
    console.log('字段信息:');
    columns.forEach(col => {
      console.log(`   ${col.name.padEnd(20)} ${col.type.padEnd(15)} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // 获取记录数
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    console.log(`\n记录数: ${count.count}`);
    
    // 显示前 3 条记录示例
    if (count.count > 0 && count.count < 1000) {
      console.log('\n示例记录（前3条）:');
      const samples = db.prepare(`SELECT * FROM ${table.name} LIMIT 3`).all();
      samples.forEach((row, index) => {
        console.log(`\n  [${index + 1}]`, JSON.stringify(row, null, 2).split('\n').join('\n  '));
      });
    }
  }
  
  db.close();
  console.log('\n\n✅ 检查完成');
  
} catch (error) {
  console.error('❌ 错误:', error.message);
  process.exit(1);
}

