#!/usr/bin/env node

/**
 * 从 memory.json 导入数据到 memos_dev.db
 * 如果内容重复则跳过
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置路径
const JSON_FILE_PATH = path.join(process.cwd(), 'memos_db', 'memory.json');
const MEMOS_DB_PATH = path.join(process.cwd(), 'memos_db', 'memos_dev.db');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log('\n' + '='.repeat(70), 'cyan');
  log(message, 'bright');
  log('='.repeat(70), 'cyan');
}

/**
 * 生成唯一 UID
 */
function generateUid() {
  return `meow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

/**
 * 确保默认用户存在
 */
function ensureDefaultUser(db, userId = 1) {
  const user = db.prepare('SELECT * FROM user WHERE id = ?').get(userId);
  
  if (!user) {
    const now = Math.floor(Date.now() / 1000);
    db.prepare(`
      INSERT INTO user (id, username, role, email, nickname, password_hash, avatar_url, created_ts, updated_ts, row_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
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
    log(`✅ 创建默认用户 (ID: ${userId})`, 'green');
  }
}

/**
 * 检查内容是否重复
 */
function isDuplicate(db, content, userId = 1) {
  const existing = db.prepare(`
    SELECT id FROM memo 
    WHERE creator_id = ? AND content = ?
    LIMIT 1
  `).get(userId, content);
  
  return !!existing;
}

/**
 * 导入单条 memo
 */
function importMemo(db, memo, userId = 1) {
  const now = Math.floor(Date.now() / 1000);
  
  // 转换时间戳
  const createdTimestamp = memo.created_ts 
    ? Math.floor(new Date(memo.created_ts).getTime() / 1000) 
    : now;
  const updatedTimestamp = memo.updated_ts 
    ? Math.floor(new Date(memo.updated_ts).getTime() / 1000) 
    : now;
  
  // 转换 visibility
  const visibility = (memo.visibility || 'private').toUpperCase();
  
  // 插入 memo
  const result = db.prepare(`
    INSERT INTO memo (uid, creator_id, content, visibility, created_ts, updated_ts, row_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    generateUid(),
    userId,
    memo.content,
    visibility,
    createdTimestamp,
    updatedTimestamp,
    memo.archived ? 'ARCHIVED' : 'NORMAL'
  );
  
  const memoId = result.lastInsertRowid;
  
  // 处理置顶状态
  if (memo.pinned) {
    db.prepare(`
      INSERT OR REPLACE INTO memo_organizer (memo_id, user_id, pinned)
      VALUES (?, ?, 1)
    `).run(memoId, userId);
  }
  
  // 处理标签
  const tags = extractTagsFromContent(memo.content);
  for (const tag of tags) {
    const existingTag = db.prepare(
      'SELECT * FROM tag WHERE creator_id = ? AND name = ?'
    ).get(userId, tag);
    
    if (!existingTag) {
      db.prepare(`
        INSERT INTO tag (name, creator_id, created_ts)
        VALUES (?, ?, ?)
      `).run(tag, userId, now);
    }
  }
  
  return memoId;
}

/**
 * 主导入函数
 */
async function importJsonToMemos() {
  try {
    header('🚀 从 memory.json 导入数据到 memos_dev.db');
    
    // 1. 检查 JSON 文件
    log('\n📂 检查 JSON 文件...', 'blue');
    if (!fs.existsSync(JSON_FILE_PATH)) {
      log(`❌ 未找到文件: ${JSON_FILE_PATH}`, 'red');
      log('请确保 memory.json 文件存在于 memos_db/ 目录下', 'yellow');
      process.exit(1);
    }
    log(`✅ 找到文件: ${JSON_FILE_PATH}`, 'green');
    
    // 2. 读取 JSON 数据
    log('\n📖 读取 JSON 数据...', 'blue');
    const jsonData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
    
    if (!jsonData.memos || !Array.isArray(jsonData.memos)) {
      log('❌ JSON 文件格式错误，找不到 memos 数组', 'red');
      process.exit(1);
    }
    
    log(`✅ 读取成功，共 ${jsonData.memos.length} 条备忘录`, 'green');
    
    // 3. 检查数据库文件
    log('\n🗄️  检查数据库文件...', 'blue');
    if (!fs.existsSync(MEMOS_DB_PATH)) {
      log(`❌ 未找到数据库: ${MEMOS_DB_PATH}`, 'red');
      log('请先运行 Memos 应用创建数据库，或从官方下载数据库文件', 'yellow');
      process.exit(1);
    }
    log(`✅ 找到数据库: ${MEMOS_DB_PATH}`, 'green');
    
    // 4. 连接数据库
    log('\n🔌 连接数据库...', 'blue');
    const db = new Database(MEMOS_DB_PATH);
    db.pragma('journal_mode = WAL');
    log('✅ 连接成功', 'green');
    
    // 5. 确保默认用户存在
    log('\n👤 检查默认用户...', 'blue');
    ensureDefaultUser(db);
    
    // 6. 统计现有数据
    log('\n📊 统计数据库现有数据...', 'blue');
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM memo WHERE creator_id = 1').get().count;
    log(`   当前数据库中有 ${existingCount} 条备忘录`, 'cyan');
    
    // 7. 开始导入
    header('📝 开始导入备忘录');
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // 使用事务提高性能
    const insertMany = db.transaction((memos) => {
      for (const memo of memos) {
        try {
          // 检查内容是否重复
          if (isDuplicate(db, memo.content)) {
            skippedCount++;
            if (skippedCount <= 5) {
              log(`⏭️  跳过重复内容: ${memo.content.substring(0, 50)}...`, 'gray');
            } else if (skippedCount === 6) {
              log(`⏭️  (还有更多重复项，不再显示...)`, 'gray');
            }
            continue;
          }
          
          // 导入
          const memoId = importMemo(db, memo);
          importedCount++;
          
          // 显示进度
          if (importedCount % 100 === 0) {
            log(`   已导入 ${importedCount} 条...`, 'cyan');
          } else if (importedCount <= 10) {
            log(`✅ 导入成功 (ID: ${memoId}): ${memo.content.substring(0, 50)}...`, 'green');
          } else if (importedCount === 11) {
            log(`   (后续导入将只显示进度...)`, 'gray');
          }
        } catch (error) {
          errorCount++;
          log(`❌ 导入失败: ${error.message}`, 'red');
          log(`   内容: ${memo.content.substring(0, 50)}...`, 'gray');
        }
      }
    });
    
    log('\n⏳ 执行导入（使用事务优化性能）...', 'blue');
    insertMany(jsonData.memos);
    
    // 8. 显示结果
    header('✨ 导入完成！');
    
    const finalCount = db.prepare('SELECT COUNT(*) as count FROM memo WHERE creator_id = 1').get().count;
    
    log('\n📊 导入统计:', 'bright');
    log(`   JSON 中的备忘录: ${jsonData.memos.length}`, 'cyan');
    log(`   成功导入: ${importedCount}`, 'green');
    log(`   跳过重复: ${skippedCount}`, 'yellow');
    if (errorCount > 0) {
      log(`   导入失败: ${errorCount}`, 'red');
    }
    log(`   数据库现有总数: ${finalCount} (导入前: ${existingCount})`, 'cyan');
    
    if (importedCount > 0) {
      log(`\n🎉 成功导入 ${importedCount} 条新备忘录到数据库！`, 'green');
    } else {
      log('\n⚠️  没有新数据被导入（所有内容都已存在）', 'yellow');
    }
    
    log('\n💡 下一步:', 'bright');
    log('   1. 运行 npm run dev 启动应用', 'cyan');
    log('   2. 访问应用查看导入的数据', 'cyan');
    log('   3. 或运行 node scripts/test-memos-db.js 测试数据库', 'cyan');
    
    // 关闭数据库
    db.close();
    log('\n✅ 数据库连接已关闭', 'green');
    
  } catch (error) {
    log('\n❌ 导入过程中发生错误:', 'red');
    console.error(error);
    process.exit(1);
  }
}

// 运行导入
importJsonToMemos().catch(error => {
  log('\n❌ 未知错误:', 'red');
  console.error(error);
  process.exit(1);
});

