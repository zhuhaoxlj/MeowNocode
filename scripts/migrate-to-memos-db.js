#!/usr/bin/env node

/**
 * 将 MeowNocode 数据迁移到 Memos 数据库
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(message, 'bright');
  log('='.repeat(60), 'cyan');
}

async function migrate() {
  header('🚀 MeowNocode → Memos 数据迁移');
  
  const MEMOS_DB_PATH = path.join(process.cwd(), 'memos_db', 'memos_dev.db');
  const MEOW_JSON_PATH = path.join(process.cwd(), 'data', 'memory-db.json');
  const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');
  
  // 1. 检查源数据
  log('\n📂 检查源数据...', 'blue');
  
  let sourceData = { memos: [], resources: [], settings: {} };
  
  // 检查 JSON 文件
  if (fs.existsSync(MEOW_JSON_PATH)) {
    log('✅ 找到 JSON 数据文件', 'green');
    sourceData = JSON.parse(fs.readFileSync(MEOW_JSON_PATH, 'utf8'));
  } else {
    log('⚠️  未找到 JSON 数据文件', 'yellow');
  }
  
  const totalMemos = sourceData.memos?.length || 0;
  if (totalMemos === 0) {
    log('\n⚠️  没有数据需要迁移', 'yellow');
    process.exit(0);
  }
  
  log(`📊 找到 ${totalMemos} 条备忘录`, 'cyan');
  
  // 2. 检查目标数据库
  log('\n🎯 检查目标 Memos 数据库...', 'blue');
  
  if (!fs.existsSync(MEMOS_DB_PATH)) {
    log('❌ 未找到 Memos 数据库文件', 'red');
    log(`请确保文件存在: ${MEMOS_DB_PATH}`, 'yellow');
    process.exit(1);
  }
  
  const memosDb = new Database(MEMOS_DB_PATH);
  log('✅ Memos 数据库连接成功', 'green');
  
  // 3. 备份 Memos 数据库
  log('\n💾 备份 Memos 数据库...', 'blue');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const backupPath = path.join(BACKUP_DIR, `memos_dev-backup-${Date.now()}.db`);
  fs.copyFileSync(MEMOS_DB_PATH, backupPath);
  log(`✅ 备份完成: ${backupPath}`, 'green');
  
  // 4. 确保默认用户存在
  log('\n👤 确保用户存在...', 'blue');
  
  const defaultUserId = 1;
  const user = memosDb.prepare('SELECT * FROM user WHERE id = ?').get(defaultUserId);
  
  if (!user) {
    const now = Math.floor(Date.now() / 1000);
    memosDb.prepare(`
      INSERT INTO user (id, username, role, email, nickname, password_hash, avatar_url, created_ts, updated_ts, row_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      defaultUserId,
      'meow',
      'HOST',
      'meow@meownocode.com',
      'MeowNocode User',
      '',
      '',
      now,
      now,
      'NORMAL'
    );
    log('✅ 创建默认用户 (ID: 1)', 'green');
  } else {
    log(`✅ 用户已存在: ${user.nickname || user.username}`, 'green');
  }
  
  // 5. 开始迁移数据
  header('📝 开始迁移备忘录');
  
  let successCount = 0;
  let errorCount = 0;
  const memoIdMap = new Map(); // 旧ID -> 新ID映射
  
  for (const memo of sourceData.memos) {
    try {
      // 提取标签
      const tags = extractTagsFromContent(memo.content);
      
      // 转换时间戳
      const createdTs = memo.created_ts 
        ? Math.floor(new Date(memo.created_ts).getTime() / 1000)
        : Math.floor(Date.now() / 1000);
      
      const updatedTs = memo.updated_ts 
        ? Math.floor(new Date(memo.updated_ts).getTime() / 1000)
        : createdTs;
      
      // 生成 UID
      const uid = `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // 插入 memo
      const result = memosDb.prepare(`
        INSERT INTO memo (uid, creator_id, content, visibility, created_ts, updated_ts, row_status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        uid,
        defaultUserId,
        memo.content,
        (memo.visibility || 'PRIVATE').toUpperCase(),
        createdTs,
        updatedTs,
        memo.archived ? 'ARCHIVED' : 'NORMAL'
      );
      
      const newMemoId = result.lastInsertRowid;
      memoIdMap.set(memo.id, newMemoId);
      
      // 处理置顶
      if (memo.pinned) {
        memosDb.prepare(`
          INSERT OR REPLACE INTO memo_organizer (memo_id, user_id, pinned)
          VALUES (?, ?, 1)
        `).run(newMemoId, defaultUserId);
      }
      
      // 处理标签
      if (tags.length > 0) {
        const now = Math.floor(Date.now() / 1000);
        for (const tag of tags) {
          const existingTag = memosDb.prepare(
            'SELECT * FROM tag WHERE creator_id = ? AND name = ?'
          ).get(defaultUserId, tag);
          
          if (!existingTag) {
            memosDb.prepare(`
              INSERT INTO tag (name, creator_id, created_ts)
              VALUES (?, ?, ?)
            `).run(tag, defaultUserId, now);
          }
        }
      }
      
      successCount++;
      if (successCount % 50 === 0) {
        log(`   已迁移 ${successCount} 条...`, 'cyan');
      }
      
    } catch (error) {
      console.error(`   ❌ 迁移失败 (ID: ${memo.id}):`, error.message);
      errorCount++;
    }
  }
  
  log(`\n✅ 备忘录迁移完成:`, 'green');
  log(`   成功: ${successCount} 条`, 'green');
  if (errorCount > 0) {
    log(`   失败: ${errorCount} 条`, 'red');
  }
  
  // 6. 迁移资源（如果有）
  if (sourceData.resources && sourceData.resources.length > 0) {
    header('📎 迁移资源文件');
    
    let resourceSuccessCount = 0;
    
    for (const resource of sourceData.resources) {
      try {
        const newMemoId = memoIdMap.get(resource.memo_id);
        if (!newMemoId) {
          log(`   ⚠️  跳过资源（关联的 memo 不存在）: ${resource.filename}`, 'yellow');
          continue;
        }
        
        const now = Math.floor(Date.now() / 1000);
        const uid = `resource-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        memosDb.prepare(`
          INSERT INTO resource (uid, creator_id, filename, type, size, internal_path, created_ts, memo_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uid,
          defaultUserId,
          resource.filename,
          resource.type,
          resource.size,
          resource.blob || '',
          now,
          newMemoId
        );
        
        resourceSuccessCount++;
      } catch (error) {
        console.error(`   ❌ 迁移资源失败:`, error.message);
      }
    }
    
    log(`\n✅ 资源迁移完成: ${resourceSuccessCount} 个`, 'green');
  }
  
  // 7. 迁移设置
  if (sourceData.settings && Object.keys(sourceData.settings).length > 0) {
    header('⚙️  迁移设置');
    
    let settingCount = 0;
    
    for (const [key, value] of Object.entries(sourceData.settings)) {
      try {
        const existingSetting = memosDb.prepare(
          'SELECT * FROM user_setting WHERE user_id = ? AND key = ?'
        ).get(defaultUserId, key);
        
        const settingValue = typeof value === 'string' ? value : JSON.stringify(value);
        
        if (existingSetting) {
          memosDb.prepare(`
            UPDATE user_setting 
            SET value = ?
            WHERE user_id = ? AND key = ?
          `).run(settingValue, defaultUserId, key);
        } else {
          memosDb.prepare(`
            INSERT INTO user_setting (user_id, key, value)
            VALUES (?, ?, ?)
          `).run(defaultUserId, key, settingValue);
        }
        
        settingCount++;
      } catch (error) {
        console.error(`   ❌ 迁移设置失败 (${key}):`, error.message);
      }
    }
    
    log(`\n✅ 设置迁移完成: ${settingCount} 项`, 'green');
  }
  
  // 8. 统计最终结果
  const finalStats = {
    memos: memosDb.prepare('SELECT COUNT(*) as count FROM memo WHERE creator_id = ?').get(defaultUserId).count,
    archived: memosDb.prepare('SELECT COUNT(*) as count FROM memo WHERE creator_id = ? AND row_status = "ARCHIVED"').get(defaultUserId).count,
    pinned: memosDb.prepare('SELECT COUNT(*) as count FROM memo_organizer WHERE user_id = ?').get(defaultUserId).count,
    tags: memosDb.prepare('SELECT COUNT(*) as count FROM tag WHERE creator_id = ?').get(defaultUserId).count,
  };
  
  memosDb.close();
  
  // 9. 完成
  header('✨ 迁移完成！');
  
  log('\n📊 迁移后的 Memos 数据库统计:', 'bright');
  log(`   备忘录总数: ${finalStats.memos}`, 'green');
  log(`   归档备忘录: ${finalStats.archived}`, 'cyan');
  log(`   置顶备忘录: ${finalStats.pinned}`, 'cyan');
  log(`   标签数: ${finalStats.tags}`, 'cyan');
  
  log('\n💡 下一步:', 'bright');
  log('   1. 检查迁移结果是否正确', 'cyan');
  log('   2. 备份文件位于: ' + backupPath, 'cyan');
  log('   3. 启动应用: npm run dev', 'cyan');
  log('   4. 如有问题，可从备份恢复', 'cyan');
  
  log('\n🎉 数据已成功迁移到 Memos 数据库！', 'green');
}

/**
 * 从内容中提取标签
 */
function extractTagsFromContent(content) {
  if (!content) return [];
  
  const tagRegex = /#([^\s#]+)/g;
  const tags = [];
  let match;
  
  while ((match = tagRegex.exec(content)) !== null) {
    const tag = match[1];
    if (!tags.includes(tag)) {
      tags.push(tag);
    }
  }
  
  return tags;
}

// 运行迁移
migrate().catch(error => {
  log('\n❌ 迁移失败:', 'red');
  console.error(error);
  process.exit(1);
});

