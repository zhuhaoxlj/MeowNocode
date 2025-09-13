import { createClient } from '@supabase/supabase-js'

// Supabase配置
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

// 创建Supabase客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // 启用自动检测处理query参数
    flowType: 'pkce'
  }
})

// 数据库表名常量
export const TABLES = {
  MEMOS: 'memos',
  USER_SETTINGS: 'user_settings'
}

// 检查当前环境
const isDevelopment = () => {
  return import.meta.env.DEV || 
         import.meta.env.VITE_ENVIRONMENT === 'development' ||
         window.location.origin.includes('localhost') ||
         window.location.origin.includes('127.0.0.1')
}

// 获取正确的重定向URL
const getRedirectUrl = () => {
  const currentUrl = window.location.origin
  const redirectUrl = `${currentUrl}/`
  
  if (isDevelopment()) {
    console.log('开发环境模式，使用本地重定向URL:', redirectUrl)
    return redirectUrl
  }
  
  console.log('生产环境模式，使用重定向URL:', redirectUrl)
  return redirectUrl
}

// GitHub OAuth登录
export const signInWithGitHub = async () => {
  try {
    const redirectUrl = getRedirectUrl()
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl
      }
    })
    
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('GitHub登录失败:', error)
    return { data: null, error }
  }
}

// 退出登录
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('退出登录失败:', error)
    return { error }
  }
}

// 获取当前用户
export const getCurrentUser = () => {
  return supabase.auth.getUser()
}

// 获取当前会话
export const getCurrentSession = () => {
  return supabase.auth.getSession()
}

// 监听认证状态变化
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}

// 处理OAuth回调
export const handleAuthCallback = async () => {
  try {
    // 检查URL中的code参数
    const query = new URLSearchParams(window.location.search)
    
    if (query.has('code')) {
      console.log('检测到code参数，处理OAuth回调...')
      
      // 让Supabase自动处理code参数
      const { data, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (data.session) {
        // 清理URL中的参数
        const url = new URL(window.location.href)
        url.search = ''
        window.history.replaceState({}, document.title, url.toString())
        
        return { success: true, session: data.session }
      }
    }
    
    // 检查hash中的access_token
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)
    
    if (hashParams.has('access_token')) {
      console.log('检测到access_token，处理OAuth回调...')
      
      // 使用access_token和refresh_token设置session
      const { data, error } = await supabase.auth.setSession({
        access_token: hashParams.get('access_token'),
        refresh_token: hashParams.get('refresh_token')
      })
      
      if (error) throw error
      
      // 清理URL中的access_token和refresh_token
      const url = new URL(window.location.href)
      url.hash = ''
      window.history.replaceState({}, document.title, url.toString())
      
      return { success: true, session: data.session }
    }
    
    return { success: false, session: null }
  } catch (error) {
    console.error('处理认证回调失败:', error)
    return { success: false, error }
  }
}

// 检查URL中是否包含OAuth参数
export const hasOAuthParams = () => {
  const hash = window.location.hash
  const query = window.location.search
  return hash.includes('access_token') || hash.includes('error') || query.includes('code') || query.includes('error')
}
