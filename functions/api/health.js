// 健康检查端点
export async function onRequest(context) {
  const { env } = context;
  
  try {
    // 检查数据库连接
    await env.DB.prepare('SELECT 1').first();
    
    return new Response(JSON.stringify({ 
      status: 'ok', 
      message: 'D1数据库连接正常',
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('健康检查失败:', error);
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: 'D1数据库连接失败',
      error: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
}