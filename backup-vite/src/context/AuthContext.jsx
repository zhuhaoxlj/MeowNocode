import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, signInWithGitHub, signOut, getCurrentUser, onAuthStateChange, handleAuthCallback, hasOAuthParams } from '@/lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 处理OAuth回调
    const handleOAuthCallback = async () => {
      if (hasOAuthParams()) {
        console.log('检测到OAuth回调，处理认证...')
        const result = await handleAuthCallback()
        if (result.success) {
          console.log('OAuth回调处理成功')
          setSession(result.session)
          setUser(result.session?.user ?? null)
        } else {
          console.error('OAuth回调处理失败:', result.error)
        }
      }
    }

    // 获取初始会话
    const getInitialSession = async () => {
      try {
        await handleOAuthCallback()
        
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('获取会话失败:', error)
        } else {
          setSession(session)
          setUser(session?.user ?? null)
        }
      } catch (error) {
        console.error('获取会话异常:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // 监听认证状态变化
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('认证状态变化:', event, session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // GitHub登录
  const loginWithGitHub = async () => {
    try {
      setLoading(true)
      const { data, error } = await signInWithGitHub()
      if (error) {
        throw error
      }
      return { success: true, error: null }
    } catch (error) {
      console.error('GitHub登录失败:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // 退出登录
  const logout = async () => {
    try {
      setLoading(true)
      const { error } = await signOut()
      if (error) {
        throw error
      }
      setUser(null)
      setSession(null)
      return { success: true, error: null }
    } catch (error) {
      console.error('退出登录失败:', error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // 获取用户头像URL
  const getUserAvatarUrl = () => {
    if (!user) return null
    return user.user_metadata?.avatar_url || `https://github.com/${user.user_metadata?.user_name}.png`
  }

  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (!user) return null
    return user.user_metadata?.full_name || user.user_metadata?.user_name || user.email
  }

  const value = {
    user,
    session,
    loading,
    loginWithGitHub,
    logout,
    getUserAvatarUrl,
    getUserDisplayName,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
