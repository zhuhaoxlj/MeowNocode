// 检查是否需要密码认证的端点
export async function onRequest(context) {
  const { env } = context;
  
  try {
    // 检查是否设置了PASSWORD环境变量
    const requiresAuth = !!(env.PASSWORD && env.PASSWORD.trim());
    
    return new Response(JSON.stringify({
      requiresAuth,
      message: requiresAuth ? '需要密码认证' : '无需认证'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('检查认证状态失败:', error);
    return new Response(JSON.stringify({
      requiresAuth: false,
      message: '检查认证状态失败'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
}