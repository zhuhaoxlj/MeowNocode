// 直接测试导入API逻辑
import sqlite3 from 'sqlite3';
import path from 'path';
import { getDatabase } from './lib/server/database-simple.js';

const sourceDbPath = path.join(process.cwd(), 'memos_db', 'memos_dev.db');

console.log('🧪 直接测试导入逻辑...');

// 获取当前数据库状态
const database = getDatabase();
const beforeCount = database.getAllMemos().length;
console.log(`📊 导入前记录数: ${beforeCount}`);

const db = new sqlite3.Database(sourceDbPath, sqlite3.OPEN_READONLY);

db.serialize(() => {
  // 使用修改后的查询条件
  const memoQuery = `
    SELECT 
      id, uid, creator_id, created_ts, updated_ts, 
      row_status, content, visibility, pinned, payload
    FROM memo 
    WHERE row_status IN ('NORMAL', 'ARCHIVED', 'PRIVATE', 'PUBLIC', 'PROTECTED')
       OR row_status IS NULL
       OR row_status NOT IN ('DELETED')
    ORDER BY created_ts DESC
  `;
  
  console.log('📋 执行查询...');
  
  db.all(memoQuery, [], (err, memoRows) => {
    if (err) {
      console.error('❌ 查询失败:', err);
      db.close();
      return;
    }
    
    console.log(`✅ 查询返回 ${memoRows.length} 条记录`);
    
    // 统计各状态
    const statusCounts = {};
    memoRows.forEach(row => {
      statusCounts[row.row_status] = (statusCounts[row.row_status] || 0) + 1;
    });
    
    console.log('📊 状态分布:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} 条`);
    });
    
    // 模拟导入前3条ARCHIVED记录
    let importedCount = 0;
    const archivedRecords = memoRows.filter(row => row.row_status === 'ARCHIVED').slice(0, 3);
    
    console.log(`\n🔄 尝试导入 ${archivedRecords.length} 条ARCHIVED记录...`);
    
    archivedRecords.forEach((row, index) => {
      try {
        console.log(`\n📝 处理记录 ${index + 1}:`);
        console.log(`  原始ID: ${row.id}`);
        console.log(`  状态: ${row.row_status}`);
        console.log(`  内容: ${row.content?.substring(0, 50)}...`);
        
        // 检查是否有问题
        if (!row.id) {
          console.log('❌ 跳过: 缺少ID');
          return;
        }
        
        if (!row.content) {
          console.log('❌ 跳过: 内容为空');
          return;
        }
        
        // 转换时间戳
        const createdAt = new Date(row.created_ts * 1000).toISOString();
        const updatedAt = new Date(row.updated_ts * 1000).toISOString();
        
        // 提取标签
        const tagMatches = (row.content || '').match(/#[\u4e00-\u9fa5\w-]+/g) || [];
        const tags = tagMatches.map(tag => tag.slice(1));
        
        // 尝试创建memo
        const insertedMemo = database.createMemo({
          content: row.content || '',
          tags: tags.join(','),
          pinned: Boolean(row.pinned),
          createdAt,
          updatedAt
        });
        
        if (insertedMemo) {
          importedCount++;
          console.log(`✅ 成功导入: ID ${insertedMemo.id}`);
        } else {
          console.log('❌ 导入失败');
        }
        
      } catch (error) {
        console.error(`❌ 处理记录 ${row.id} 时出错:`, error.message);
      }
    });
    
    const afterCount = database.getAllMemos().length;
    console.log(`\n📊 导入后记录数: ${afterCount}`);
    console.log(`📈 成功导入: ${importedCount} 条`);
    console.log(`📈 实际增加: ${afterCount - beforeCount} 条`);
    
    db.close();
  });
});