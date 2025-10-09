#!/usr/bin/env node

/**
 * 测试 Memos 数据库连接和功能
 */

import { getMemosDatabase } from '../lib/server/memos-database.js';

console.log('🧪 测试 Memos 数据库功能\n');

try {
  // 1. 连接数据库
  console.log('1️⃣ 连接数据库...');
  const db = getMemosDatabase();
  console.log('✅ 连接成功\n');
  
  // 2. 测试获取所有备忘录
  console.log('2️⃣ 测试获取备忘录...');
  const memos = db.getAllMemos();
  console.log(`✅ 获取成功，共 ${memos.length} 条备忘录\n`);
  
  if (memos.length > 0) {
    console.log('📄 示例备忘录:');
    const sample = memos[0];
    console.log(`   ID: ${sample.id}`);
    console.log(`   内容: ${sample.content.substring(0, 50)}...`);
    console.log(`   标签: ${sample.tags || '无'}`);
    console.log(`   置顶: ${sample.pinned ? '是' : '否'}`);
    console.log(`   归档: ${sample.archived ? '是' : '否'}`);
    console.log(`   创建时间: ${sample.created_ts}`);
    console.log('');
  }
  
  // 3. 测试分页
  console.log('3️⃣ 测试分页查询...');
  const paginated = db.getMemosPaginated({ limit: 5, offset: 0 });
  console.log(`✅ 分页成功，获取 ${paginated.memos.length} 条，总计 ${paginated.total} 条\n`);
  
  // 4. 测试归档备忘录
  console.log('4️⃣ 测试获取归档备忘录...');
  const archived = db.getArchivedMemos();
  console.log(`✅ 获取成功，共 ${archived.length} 条归档备忘录\n`);
  
  // 5. 测试创建备忘录
  console.log('5️⃣ 测试创建备忘录...');
  const newMemo = db.createMemo({
    content: '这是一个测试备忘录 #测试 #MeowNocode',
    visibility: 'private',
    pinned: false,
    archived: false,
  });
  console.log(`✅ 创建成功，ID: ${newMemo.id}\n`);
  
  // 6. 测试更新备忘录
  console.log('6️⃣ 测试更新备忘录...');
  const updated = db.updateMemo(newMemo.id, {
    content: '这是更新后的内容 #测试 #已更新',
    pinned: true,
  });
  console.log(`✅ 更新成功，置顶: ${updated.pinned}\n`);
  
  // 7. 测试删除备忘录
  console.log('7️⃣ 测试删除备忘录...');
  const deleted = db.deleteMemo(newMemo.id);
  console.log(`✅ 删除成功: ${deleted}\n`);
  
  // 8. 最终统计
  console.log('📊 最终统计:');
  const finalMemos = db.getAllMemos();
  const finalArchived = db.getArchivedMemos();
  console.log(`   正常备忘录: ${finalMemos.length}`);
  console.log(`   归档备忘录: ${finalArchived.length}`);
  console.log(`   总计: ${finalMemos.length + finalArchived.length}`);
  
  console.log('\n🎉 所有测试通过！\n');
  
  console.log('💡 提示:');
  console.log('   - Memos 数据库工作正常');
  console.log('   - 可以开始使用 MeowNocode');
  console.log('   - 运行 npm run dev 启动应用');
  
} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}

