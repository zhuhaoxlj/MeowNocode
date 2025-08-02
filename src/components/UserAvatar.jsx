import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Github, Settings as SettingsIcon, Key, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const UserAvatar = ({ onOpenSettings }) => {
  const { user, isAuthenticated, loginWithGitHub, logout, getUserAvatarUrl, getUserDisplayName } = useAuth();
  const { cloudSyncEnabled, cloudProvider, isD1Authenticated, verifyD1AuthKey } = useSettings();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isD1KeyInputOpen, setIsD1KeyInputOpen] = useState(false);
  const [d1KeyInput, setD1KeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          avatarRef.current && !avatarRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAvatarClick = () => {
    if (isAuthenticated) {
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      if (cloudProvider === 'd1') {
        setIsD1KeyInputOpen(!isD1KeyInputOpen);
      } else {
        handleLogin();
      }
    }
  };

  const handleD1KeySubmit = async () => {
    if (!d1KeyInput.trim()) return;
    
    setIsVerifying(true);
    try {
      const result = await verifyD1AuthKey(d1KeyInput.trim());
      if (result.success) {
        setIsD1KeyInputOpen(false);
        setD1KeyInput('');
      }
    } catch (error) {
      console.error('验证D1密钥失败:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogin = async () => {
    try {
      const result = await loginWithGitHub();
      if (!result.success) {
        console.error('登录失败:', result.error);
      }
    } catch (error) {
      console.error('登录异常:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        setIsDropdownOpen(false);
      } else {
        console.error('退出登录失败:', result.error);
      }
    } catch (error) {
      console.error('退出登录异常:', error);
    }
  };

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    onOpenSettings?.();
  };

  if (!isAuthenticated) {
    // 未登录状态 - 显示登录按钮或D1密钥输入按钮
    return (
      <div className="relative">
        <button
          ref={avatarRef}
          onClick={handleAvatarClick}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:ring-2 hover:ring-offset-2 ${
            cloudProvider === 'd1'
              ? isD1Authenticated
                ? 'bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 hover:ring-green-500 dark:hover:ring-green-400'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:ring-blue-500 dark:hover:ring-blue-400'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:ring-blue-500 dark:hover:ring-blue-400'
          }`}
          aria-label={cloudProvider === 'd1' ? "D1鉴权密钥" : "GitHub登录"}
          title={cloudProvider === 'd1' ? (isD1Authenticated ? "D1已鉴权" : "输入D1鉴权密钥") : "GitHub登录"}
        >
          {cloudProvider === 'd1' ? (
            isD1Authenticated ? (
              <Check className="h-5 w-5" />
            ) : (
              <Key className="h-5 w-5" />
            )
          ) : (
            <Github className="h-5 w-5" />
          )}
        </button>

        {/* D1密钥输入框 */}
        {cloudProvider === 'd1' && isD1KeyInputOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50">
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                D1鉴权密钥
              </label>
              <Input
                type="password"
                value={d1KeyInput}
                onChange={(e) => setD1KeyInput(e.target.value)}
                placeholder="请输入D1鉴权密钥"
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleD1KeySubmit();
                  }
                }}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsD1KeyInputOpen(false);
                  setD1KeyInput('');
                }}
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleD1KeySubmit}
                disabled={isVerifying || !d1KeyInput.trim()}
              >
                {isVerifying ? '验证中...' : '验证'}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 已登录状态 - 显示用户头像
  return (
    <div className="relative">
      <button
        ref={avatarRef}
        onClick={handleAvatarClick}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 dark:hover:ring-offset-gray-800"
        aria-label="用户菜单"
        title={getUserDisplayName()}
      >
        {getUserAvatarUrl() ? (
          <img
            src={getUserAvatarUrl()}
            alt={getUserDisplayName()}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div className="w-full h-full flex items-center justify-center text-gray-700 dark:text-gray-300" style={{ display: getUserAvatarUrl() ? 'none' : 'flex' }}>
          <User className="h-5 w-5" />
        </div>
      </button>

      {/* Beta badge */}
      {cloudSyncEnabled && (
        <Badge 
          variant="secondary" 
          className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-medium bg-yellow-500 text-white hover:bg-yellow-600"
        >
          β
        </Badge>
      )}

      {/* 用户信息下拉菜单 */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
        >
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                {getUserAvatarUrl() ? (
                  <img
                    src={getUserAvatarUrl()}
                    alt={getUserDisplayName()}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700 dark:text-gray-300">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>

          {/* 菜单项 */}
          <div className="py-1">
            <button
              onClick={handleOpenSettings}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <SettingsIcon className="h-4 w-4" />
              <span>设置</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
