import React, { useState, useRef, useEffect } from 'react';
import { LogOut, User, Settings as SettingsIcon } from 'lucide-react';
import { usePasswordAuth } from '@/context/PasswordAuthContext';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const UserAvatar = ({ onOpenSettings }) => {
  const { isAuthenticated, requiresAuth, logout } = usePasswordAuth();
  const { user, getUserAvatarUrl, getUserDisplayName } = useAuth();
  const { cloudSyncEnabled, avatarConfig } = useSettings();
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
    }
    // 如果未认证，不处理点击事件（会由App组件重定向到登录页）
  };

  // 获取头像URL的优先级：自定义头像 > GitHub头像 > 默认头像
  const getAvatarUrl = () => {
    // 优先使用用户设置的自定义头像
    if (avatarConfig && avatarConfig.imageUrl) {
      return avatarConfig.imageUrl;
    }
    
    // 如果用户已通过GitHub登录，使用GitHub头像
    if (user && getUserAvatarUrl()) {
      return getUserAvatarUrl();
    }
    
    // 默认返回null，显示默认图标
    return null;
  };

  // 获取显示名称
  const getDisplayName = () => {
    if (user && getUserDisplayName()) {
      return getUserDisplayName();
    }
    return isAuthenticated ? "已登录" : "访客";
  };

  const handleLogout = () => {
    try {
      const result = logout();
      if (result.success) {
        setIsDropdownOpen(false);
        // 退出后会自动重定向到登录页（由App组件处理）
      }
    } catch (error) {
      console.error('退出登录异常:', error);
    }
  };

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    onOpenSettings?.();
  };

  // 如果需要认证但未认证，不显示用户按钮（App组件会处理重定向）
  if (requiresAuth && !isAuthenticated) {
    return null;
  }

  // 已登录状态或无需认证 - 显示用户按钮
  return (
    <div className="relative">
      <button
        ref={avatarRef}
        onClick={handleAvatarClick}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden transition-all duration-300 hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 dark:hover:ring-offset-gray-800"
        aria-label="用户菜单"
        title={getDisplayName()}
      >
        {getAvatarUrl() ? (
          <img
            src={getAvatarUrl()}
            alt={getDisplayName()}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="w-full h-full flex items-center justify-center text-gray-700 dark:text-gray-300"
          style={{ display: getAvatarUrl() ? 'none' : 'flex' }}
        >
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

      {/* 用户下拉菜单 */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
        >
          {/* 用户信息 */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()}
                    alt={getDisplayName()}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="w-full h-full flex items-center justify-center text-gray-700 dark:text-gray-300"
                  style={{ display: getAvatarUrl() ? 'none' : 'flex' }}
                >
                  <User className="h-4 w-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getDisplayName()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                  {user?.email || (requiresAuth && isAuthenticated ? "密码认证" : "无需认证")}
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
            {/* 只有在需要认证且已认证时才显示退出登录按钮 */}
            {requiresAuth && isAuthenticated && (
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>退出登录</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
