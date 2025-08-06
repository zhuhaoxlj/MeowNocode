import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePasswordAuth } from '@/context/PasswordAuthContext';
import { useSettings } from '@/context/SettingsContext';

const Login = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = usePasswordAuth();
  const { backgroundConfig } = useSettings();

  // 获取背景图片URL
  const getBackgroundImageUrl = () => {
    if (backgroundConfig?.imageUrl) {
      return backgroundConfig.imageUrl;
    }
    // 默认背景图片
    return 'https://s3.bmp.ovh/imgs/2025/08/06/a45ae94d48c17ed0.png';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await login(password.trim());
      if (!result.success) {
        setError(result.message || '登录失败');
      }
      // 登录成功后，PasswordAuthContext会自动更新状态，App组件会重新渲染
    } catch (err) {
      console.error('登录异常:', err);
      setError('登录时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat relative"
      style={{
        backgroundImage: `url(${getBackgroundImageUrl()})`,
      }}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* 登录表单 */}
      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* 标题区域 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              欢迎回来
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              请输入密码以访问应用
            </p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                密码
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="请输入密码"
                  className="w-full pr-12 bg-white/70 dark:bg-gray-800/70 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* 登录按钮 */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  登录中...
                </div>
              ) : (
                '登录'
              )}
            </Button>
          </form>

          {/* 底部信息 */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              登录成功后，会话将永久保持有效
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;