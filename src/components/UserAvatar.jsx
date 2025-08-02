import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Github, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const UserAvatar = ({ onOpenSettings }) => {
  const { user, isAuthenticated, loginWithGitHub, logout, getUserAvatarUrl, getUserDisplayName } = useAuth();
  const { cloudSyncEnabled } = useSettings();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
      handleLogin();
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
    // 未登录状态 - 显示登录按钮
    return (
      <button
        ref={avatarRef}
        onClick={handleLogin}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        aria-label="GitHub登录"
        title="GitHub登录"
      >
        <Github className="h-5 w-5" />
      </button>
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
