import React from 'react';
import { Calendar, Settings, ChevronLeft, Sun, Moon } from 'lucide-react';
import GitHubStyleHeatmap from '@/components/GitHubStyleHeatmap';
import UserAvatar from '@/components/UserAvatar';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';

const LeftSidebar = ({ 
  heatmapData, 
  isLeftSidebarHidden, 
  setIsLeftSidebarHidden, 
  onSettingsOpen,
  onDateClick
}) => {
  const { darkMode, toggleDarkMode, themeColor } = useTheme();
  const { cloudSyncEnabled } = useSettings();

  return (
    <div
      className={`hidden lg:flex flex-col border-r dark:border-gray-700 transition-all duration-500 ease-in-out ${
        isLeftSidebarHidden
          ? 'lg:w-0 lg:min-w-0 lg:max-w-0 overflow-hidden opacity-0 -translate-x-full'
          : 'lg:w-1/5 lg:min-w-[240px] opacity-100 translate-x-0'
      }`}
    >
      <div className="p-4 flex-1 flex flex-col min-w-[240px] relative">
        {/* 隐藏左侧栏按钮 */}
        <button
          onClick={() => setIsLeftSidebarHidden(true)}
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-110"
          aria-label="隐藏左侧栏"
          title="隐藏左侧栏"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center mb-4">
          <Calendar
            className="h-5 w-5 mr-2 transition-colors duration-300"
            style={{ color: themeColor }}
          />
          <h2 className="text-lg font-semibold dark:text-gray-200">记忆热力图</h2>
        </div>

        <div className="flex-1 overflow-hidden">
          <GitHubStyleHeatmap data={heatmapData} onDateClick={onDateClick} />
        </div>

        {/* 底部按钮区域 */}
        <div className="mt-auto pt-4 flex items-center space-x-2">
          {/* 用户头像 */}
          {cloudSyncEnabled && (
            <UserAvatar onOpenSettings={onSettingsOpen} />
          )}

          {/* 设置按钮 */}
          <button
            onClick={onSettingsOpen}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label="打开设置"
          >
            <Settings className="h-5 w-5 transition-transform duration-300 hover:rotate-90" />
          </button>

          {/* 黑暗模式切换按钮 */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-yellow-300 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            aria-label={darkMode ? "切换到白天模式" : "切换到黑夜模式"}
          >
            {darkMode ? (
              <Sun className="h-5 w-5 transition-transform duration-500 transform rotate-180" />
            ) : (
              <Moon className="h-5 w-5 transition-transform duration-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
