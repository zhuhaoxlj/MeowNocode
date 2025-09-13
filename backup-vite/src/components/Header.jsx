import React from 'react';
import { Menu, Search, Headphones } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/context/ThemeContext';

const Header = ({ 
  searchQuery, 
  setSearchQuery, 
  searchInputRef, 
  onMobileMenuOpen,
  onOpenMusic,
  onOpenMusicSearch, // 新增：触发音乐搜索卡片
  musicEnabled = true,
}) => {
  const { themeColor } = useTheme();

  return (
    <div className="flex items-center justify-between p-4 bg-transparent">
      {/* 左侧：汉堡菜单按钮（移动端）+ Logo */}
      <div className="flex items-center">
        {/* 汉堡菜单按钮 - 仅在移动端显示 */}
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600 mr-3"
          aria-label="打开菜单"
          title="打开菜单"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <img
          src="https://s3.bmp.ovh/imgs/2025/07/31/baf5bf7ff49cae82.jpg"
          alt="应用Logo"
          className="h-10 w-10 rounded-full object-cover"
        />
        <span
          className="ml-2 text-xl font-bold transition-colors duration-300"
          style={{ color: themeColor }}
        >
          Meow
        </span>
      </div>

      {/* 右侧：搜索框（恢复到右侧位置） */}
      <div className="flex items-center gap-2">
        <div className="relative w-48 sm:w-64 md:w-80">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="搜索想法..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = (searchQuery || '').trim();
                if (q) {
                  // 仅触发音乐搜索卡片展示，不改变现有过滤逻辑
                  onOpenMusicSearch && onOpenMusicSearch(q);
                }
              }
            }}
            className="pl-10 pr-20"
          />
          {/* Ctrl+K快捷键提示 */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <kbd className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">Ctrl</kbd>
            <span className="mx-1 text-xs">+</span>
            <kbd className="px-1 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">K</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;