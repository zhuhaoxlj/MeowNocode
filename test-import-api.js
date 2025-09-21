// 测试导入API的脚本
import { getDatabase } from './lib/server/database-simple.js';

console.log('🧪 测试数据库连接和写入功能...');

const database = getDatabase();

// 获取当前记录数
const currentMemos = database.getAllMemos();
console.log(`📊 当前记录数: ${currentMemos.length}`);

// 测试创建一条新记录
try {
  const testMemo = database.createMemo({
    content: '测试导入API - ' + new Date().toISOString(),
    tags: 'test',
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  console.log('✅ 测试记录创建成功:', testMemo);
  
  // 重新获取记录数
  const newMemos = database.getAllMemos();
  console.log(`📊 新的记录数: ${newMemos.length}`);
  
  if (newMemos.length > currentMemos.length) {
    console.log('✅ 数据成功写入JSON文件');
  } else {
    console.log('❌ 数据没有被保存');
  }
  
} catch (error) {
  console.error('❌ 测试失败:', error);
}