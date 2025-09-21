// 诊断导入问题的脚本
import sqlite3 from 'sqlite3';
import path from 'path';

console.log('🔍 诊断Memos导入问题...');

// 检查源数据库
const sourceDbPath = path.join(process.cwd(), 'memos_db', 'memos_dev.db');

console.log(`📋 检查源数据库: ${sourceDbPath}`);

const db = new sqlite3.Database(sourceDbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ 无法打开源数据库:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  // 检查所有状态的记录分布
  const statusQuery = `
    SELECT row_status, COUNT(*) as count 
    FROM memo 
    GROUP BY row_status
  `;
  
  db.all(statusQuery, [], (err, statusRows) => {
    if (err) {
      console.error('❌ 查询状态分布失败:', err);
    } else {
      console.log('📊 源数据库中的记录状态分布:');
      let total = 0;
      statusRows.forEach(row => {
        console.log(`  "${row.row_status}": ${row.count} 条`);
        total += row.count;
      });
      console.log(`  总计: ${total} 条记录`);
    }
    
    // 使用修改后的查询条件
    const importQuery = `
      SELECT COUNT(*) as count
      FROM memo 
      WHERE row_status IN ('NORMAL', 'ARCHIVED', 'PRIVATE', 'PUBLIC', 'PROTECTED')
         OR row_status IS NULL
         OR row_status NOT IN ('DELETED')
    `;
    
    db.get(importQuery, [], (err, result) => {
      if (err) {
        console.error('❌ 查询可导入记录失败:', err);
      } else {
        console.log(`📈 根据新查询条件，应该能导入: ${result.count} 条记录`);
      }
      
      // 检查前几条记录的具体内容
      const sampleQuery = `
        SELECT id, row_status, content, created_ts
        FROM memo 
        ORDER BY id DESC 
        LIMIT 5
      `;
      
      db.all(sampleQuery, [], (err, sampleRows) => {
        if (err) {
          console.error('❌ 查询样本记录失败:', err);
        } else {
          console.log('📋 最新的5条记录:');
          sampleRows.forEach(row => {
            console.log(`  ID: ${row.id}, 状态: "${row.row_status}", 内容: ${row.content?.substring(0, 50)}...`);
          });
        }
        
        db.close();
      });
    });
  });
});