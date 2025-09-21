// 检查ARCHIVED记录的详细信息
import sqlite3 from 'sqlite3';
import path from 'path';

const sourceDbPath = path.join(process.cwd(), 'memos_db', 'memos_dev.db');

const db = new sqlite3.Database(sourceDbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ 无法打开源数据库:', err.message);
    process.exit(1);
  }
});

// 查询所有ARCHIVED记录的详细信息
const archivedQuery = `
  SELECT id, uid, creator_id, created_ts, updated_ts, 
         row_status, content, visibility, pinned, payload
  FROM memo 
  WHERE row_status = 'ARCHIVED'
  ORDER BY id
`;

db.all(archivedQuery, [], (err, rows) => {
  if (err) {
    console.error('❌ 查询ARCHIVED记录失败:', err);
    db.close();
    return;
  }
  
  console.log(`🗃️ 找到 ${rows.length} 条ARCHIVED记录：`);
  console.log('='.repeat(80));
  
  rows.forEach((row, index) => {
    console.log(`\n📋 记录 ${index + 1}:`);
    console.log(`  ID: ${row.id}`);
    console.log(`  UID: ${row.uid}`);
    console.log(`  状态: ${row.row_status}`);
    console.log(`  创建时间: ${new Date(row.created_ts * 1000).toISOString()}`);
    console.log(`  更新时间: ${new Date(row.updated_ts * 1000).toISOString()}`);
    console.log(`  可见性: ${row.visibility}`);
    console.log(`  置顶: ${row.pinned ? '是' : '否'}`);
    console.log(`  内容: ${row.content || '(空)'}`);
    console.log(`  内容长度: ${row.content ? row.content.length : 0} 字符`);
    
    // 检查是否有特殊字符或问题
    if (!row.content || row.content.trim() === '') {
      console.log(`  ⚠️ 空内容记录！`);
    }
    if (!row.id) {
      console.log(`  ⚠️ 缺少ID！`);
    }
  });
  
  db.close();
});