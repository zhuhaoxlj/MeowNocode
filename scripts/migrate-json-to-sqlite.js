#!/usr/bin/env node

/**
 * 数据迁移脚本：JSON → SQLite
 * 
 * 用途：将 memory-db.json 中的数据迁移到 SQLite 数据库
 */

import fs from 'fs';
import path from 'path';
import { getDatabase } from '../lib/server/database.js';

const JSON_FILE = path.join(process.cwd(), 'data', 'memory-db.json');
const BACKUP_FILE = path.join(process.cwd(), 'data', 'backups', `memory-db-backup-${Date.now()}.json`);

async function migrate() {
  console.log('🚀 开始数据迁移：JSON → SQLite\n');
  
  // 1. 检查 JSON 文件是否存在
  if (!fs.existsSync(JSON_FILE)) {
    console.log('❌ 未找到 JSON 数据文件:', JSON_FILE);
    console.log('ℹ️  如果这是新安装，请直接使用 SQLite 数据库');
    process.exit(0);
  }
  
  // 2. 备份 JSON 数据
  console.log('📦 备份 JSON 数据...');
  const backupDir = path.dirname(BACKUP_FILE);
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  fs.copyFileSync(JSON_FILE, BACKUP_FILE);
  console.log('✅ 备份完成:', BACKUP_FILE, '\n');
  
  // 3. 读取 JSON 数据
  console.log('📖 读取 JSON 数据...');
  const jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  console.log(`   - Memos: ${jsonData.memos?.length || 0} 条`);
  console.log(`   - Resources: ${jsonData.resources?.length || 0} 条`);
  console.log(`   - Settings: ${Object.keys(jsonData.settings || {}).length} 项\n`);
  
  // 4. 初始化 SQLite 数据库
  console.log('🗄️  初始化 SQLite 数据库...');
  const db = getDatabase();
  
  // 5. 清空现有数据（可选）
  const existingMemos = db.getAllMemos(true);
  if (existingMemos.length > 0) {
    console.log(`⚠️  数据库中已存在 ${existingMemos.length} 条记录`);
    console.log('   正在清空数据库...');
    db.clearAllMemos();
  }
  
  // 6. 迁移 Memos
  console.log('\n📝 迁移 Memos...');
  let successCount = 0;
  let errorCount = 0;
  
  if (jsonData.memos && Array.isArray(jsonData.memos)) {
    for (const memo of jsonData.memos) {
      try {
        db.createMemo({
          content: memo.content,
          tags: memo.tags || '',
          visibility: memo.visibility || 'private',
          pinned: memo.pinned || false,
          archived: memo.archived || false,
          created_ts: memo.created_ts,
          updated_ts: memo.updated_ts
        });
        successCount++;
      } catch (error) {
        console.error(`   ❌ 迁移失败 (ID: ${memo.id}):`, error.message);
        errorCount++;
      }
    }
  }
  
  console.log(`   ✅ 成功迁移 ${successCount} 条 Memos`);
  if (errorCount > 0) {
    console.log(`   ❌ 失败 ${errorCount} 条`);
  }
  
  // 7. 迁移 Resources
  if (jsonData.resources && jsonData.resources.length > 0) {
    console.log('\n📎 迁移 Resources...');
    let resourceSuccessCount = 0;
    let resourceErrorCount = 0;
    
    for (const resource of jsonData.resources) {
      try {
        db.createResource({
          memo_id: resource.memo_id,
          filename: resource.filename,
          type: resource.type,
          size: resource.size,
          blob: resource.blob
        });
        resourceSuccessCount++;
      } catch (error) {
        console.error(`   ❌ 迁移 Resource 失败 (ID: ${resource.id}):`, error.message);
        resourceErrorCount++;
      }
    }
    
    console.log(`   ✅ 成功迁移 ${resourceSuccessCount} 条 Resources`);
    if (resourceErrorCount > 0) {
      console.log(`   ❌ 失败 ${resourceErrorCount} 条`);
    }
  }
  
  // 8. 迁移 Settings
  if (jsonData.settings && typeof jsonData.settings === 'object') {
    console.log('\n⚙️  迁移 Settings...');
    let settingsCount = 0;
    
    for (const [key, value] of Object.entries(jsonData.settings)) {
      try {
        db.setSetting(key, typeof value === 'string' ? value : JSON.stringify(value));
        settingsCount++;
      } catch (error) {
        console.error(`   ❌ 迁移 Setting 失败 (${key}):`, error.message);
      }
    }
    
    console.log(`   ✅ 成功迁移 ${settingsCount} 项设置`);
  }
  
  // 9. 验证迁移结果
  console.log('\n🔍 验证迁移结果...');
  const migratedMemos = db.getAllMemos(true);
  console.log(`   - SQLite 中的 Memos: ${migratedMemos.length} 条`);
  
  // 10. 完成
  console.log('\n✨ 迁移完成！\n');
  console.log('📌 下一步：');
  console.log('   1. 验证数据是否正确');
  console.log('   2. 测试应用功能');
  console.log('   3. 如果一切正常，可以删除 JSON 文件（已备份）');
  console.log(`\n💾 JSON 备份位置: ${BACKUP_FILE}`);
}

// 运行迁移
migrate().catch(error => {
  console.error('\n❌ 迁移失败:', error);
  process.exit(1);
});

