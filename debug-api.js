// 在浏览器控制台运行此脚本来调试 API 配置

console.clear();
console.log('🔍 API 配置调试工具');
console.log('='.repeat(50));

// 1. 检查 localStorage
const mode = localStorage.getItem('API_MODE');
console.log('1️⃣ localStorage.API_MODE:', mode);

// 2. 检查可用配置
const configs = {
  local: { baseURL: '', name: '本地 API' },
  remote: { baseURL: 'http://111.170.174.134:18081', name: '远程 API' }
};
console.log('2️⃣ 可用配置:', configs);

// 3. 确定当前应该使用的配置
const currentConfig = configs[mode] || configs.local;
console.log('3️⃣ 当前应该使用:', currentConfig);

// 4. 测试 API 端点
const testEndpoint = '/api/health';
const fullURL = currentConfig.baseURL 
  ? `${currentConfig.baseURL}${testEndpoint}`
  : `http://localhost:8081${testEndpoint}`;

console.log('4️⃣ 测试 URL:', fullURL);
console.log('='.repeat(50));

// 5. 执行测试请求
console.log('🚀 正在测试 API 连接...');
fetch(fullURL)
  .then(res => res.json())
  .then(data => {
    console.log('✅ API 响应成功:', data);
    console.log('📡 请求的完整 URL:', fullURL);
  })
  .catch(err => {
    console.error('❌ API 请求失败:', err);
    console.log('📡 尝试的 URL:', fullURL);
  });

// 6. 提供快速切换命令
console.log('');
console.log('💡 快速切换命令:');
console.log('切换到远程: localStorage.setItem("API_MODE", "remote"); location.reload();');
console.log('切换到本地: localStorage.setItem("API_MODE", "local"); location.reload();');
