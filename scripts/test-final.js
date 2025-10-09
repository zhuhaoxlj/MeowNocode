/**
 * 最终性能测试
 * 验证批量查询方案能否正确显示图片
 */

import { getMemosDatabase } from '../lib/server/memos-database.js';

async function testFinal() {
  console.log('🚀 最终测试：批量查询方案...\n');
  
  const db = getMemosDatabase();
  
  // 测试查询
  console.log('📊 测试 1: 查询第 1 页（50 条）');
  const startTime = Date.now();
  const page1 = db.getMemosPaginated({ limit: 50, offset: 0 });
  const duration = Date.now() - startTime;
  
  console.log(`   ✅ 耗时: ${duration}ms`);
  console.log(`   📝 返回: ${page1.memos.length} 条记录`);
  console.log(`   📊 总计: ${page1.total} 条记录\n`);
  
  // 查找有图片的 memo
  console.log('📊 测试 2: 验证图片是否正确嵌入');
  const memosWithImages = page1.memos.filter(m => 
    m.resources && m.resources.length > 0 && 
    m.resources.some(r => r.type && r.type.startsWith('image/'))
  );
  
  if (memosWithImages.length > 0) {
    const testMemo = memosWithImages[0];
    console.log(`   📷 找到 ${memosWithImages.length} 个包含图片的 memo`);
    console.log(`   📝 测试 memo ID: ${testMemo.id}`);
    console.log(`   📷 资源数量: ${testMemo.resources.length}`);
    
    // 检查内容中是否有 base64 图片
    const hasBase64Image = /!\[.*?\]\(data:image\/[^;]+;base64,/.test(testMemo.content);
    console.log(`   ${hasBase64Image ? '✅' : '❌'} 内容包含 base64 图片: ${hasBase64Image}`);
    
    if (hasBase64Image) {
      // 提取 base64 前缀检查
      const match = testMemo.content.match(/data:image\/([^;]+);base64,([A-Za-z0-9+/]{50})/);
      if (match) {
        console.log(`   ✅ 图片类型: ${match[1]}`);
        console.log(`   ✅ Base64 前缀: ${match[2]}...`);
        console.log(`   🎉 图片数据正确，应该可以在前端显示！`);
      }
    } else {
      console.log(`   ❌ 内容预览: ${testMemo.content.substring(0, 200)}`);
    }
  } else {
    console.log(`   ℹ️ 第一页没有包含图片的 memo`);
  }
  
  console.log('\n📈 性能评估:');
  if (duration < 100) {
    console.log('   🎉 优秀! 查询速度 < 100ms');
  } else if (duration < 500) {
    console.log('   ✅ 良好! 查询速度 < 500ms');
  } else {
    console.log('   ⚠️ 需要优化');
  }
  
  console.log('\n💡 优化方案: 批量查询（2次SQL）');
  console.log('   1️⃣ 查询 memos');
  console.log('   2️⃣ 批量查询资源（WHERE memo_id IN (...)）');
  console.log('   ✅ 避免 N+1 查询');
  console.log('   ✅ 正确处理 BLOB 数据');
}

testFinal().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

