// 验证密码是否正确的端点
export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;
  
  // 设置CORS头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  
  // 处理OPTIONS请求（预检请求）
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  if (method !== 'POST') {
    return new Response(JSON.stringify({
      valid: false,
      message: '只支持POST请求'
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { password } = body;

    // 检查是否配置了PASSWORD环境变量
    if (!env.PASSWORD || !env.PASSWORD.trim()) {
      return new Response(JSON.stringify({
        valid: true,
        message: '无需密码认证'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 验证密码
    const isValid = password && password.trim() === env.PASSWORD.trim();
    
    return new Response(JSON.stringify({
      valid: isValid,
      message: isValid ? '密码正确' : '密码错误'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('验证密码失败:', error);
    return new Response(JSON.stringify({
      valid: false,
      message: '验证密码时发生错误'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}