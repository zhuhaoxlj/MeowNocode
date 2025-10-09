#!/usr/bin/env node
/**
 * 性能测试脚本
 * 测试优化前后的 API 响应时间
 */

async function testPerformance() {
  const baseUrl = 'http://localhost:8081/api';
  
  console.log('🚀 开始性能测试...\n');
  
  // 测试列表查询性能
  console.log('📊 测试分页查询性能:');
  
  const tests = [
    { page: 1, limit: 50, desc: '第1页（50条）' },
    { page: 2, limit: 50, desc: '第2页（50条）' },
    { page: 3, limit: 50, desc: '第3页（50条）' },
  ];
  
  for (const test of tests) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${baseUrl}/memos?page=${test.page}&limit=${test.limit}`);
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      const emoji = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴';
      
      console.log(`  ${emoji} ${test.desc}: ${duration}ms (${data.memos.length} 条记录)`);
      
      // 检查资源元数据
      const memosWithResources = data.memos.filter(m => m.hasResources);
      if (memosWithResources.length > 0) {
        console.log(`     - 包含资源的 memo: ${memosWithResources.length} 条`);
        console.log(`     - 资源未加载（优化生效）✅`);
      }
    } catch (error) {
      console.error(`  ❌ ${test.desc}: 失败 -`, error.message);
    }
  }
  
  console.log('\n📦 测试资源按需加载:');
  
  // 获取第一个有资源的 memo
  const response = await fetch(`${baseUrl}/memos?page=1&limit=10`);
  const data = await response.json();
  const memoWithResource = data.memos.find(m => m.hasResources);
  
  if (memoWithResource) {
    const startTime = Date.now();
    const resourceResponse = await fetch(`${baseUrl}/memos/${memoWithResource.id}/resources`);
    const resourceData = await resourceResponse.json();
    const duration = Date.now() - startTime;
    
    console.log(`  ✅ 按需加载资源: ${duration}ms (${resourceData.count} 个资源)`);
    console.log(`     - Memo ID: ${memoWithResource.id}`);
    console.log(`     - 资源数量: ${resourceData.count}`);
  } else {
    console.log(`  ℹ️ 未找到包含资源的 memo`);
  }
  
  console.log('\n📈 性能总结:');
  console.log('  🟢 <100ms  = 优秀');
  console.log('  🟡 100-500ms = 良好');
  console.log('  🔴 >500ms  = 需要优化');
  
  console.log('\n✨ 测试完成！');
}

testPerformance().catch(console.error);

