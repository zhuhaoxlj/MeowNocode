import React from 'react';
import { Tag, ChevronRight } from 'lucide-react';
import TagManager from '@/components/TagManager';
import { useTheme } from '@/context/ThemeContext';

const RightSidebar = ({ 
  memos, 
  activeTag, 
  setActiveTag, 
  isRightSidebarHidden, 
  setIsRightSidebarHidden 
}) => {
  const { themeColor } = useTheme();

  return (
    <div
      className={`hidden lg:flex flex-col border-l dark:border-gray-700 transition-all duration-500 ease-in-out ${
        isRightSidebarHidden
          ? 'lg:w-0 lg:min-w-0 lg:max-w-0 overflow-hidden opacity-0 translate-x-full'
          : 'lg:w-1/5 lg:min-w-[240px] opacity-100 translate-x-0'
      }`}
    >
      <div className="p-4 flex-1 flex flex-col min-w-[240px] relative">
        {/* 隐藏右侧栏按钮 */}
        <button
          onClick={() => setIsRightSidebarHidden(true)}
          className="absolute top-4 left-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600 hover:scale-110"
          aria-label="隐藏右侧栏"
          title="隐藏右侧栏"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="flex-1 overflow-hidden">
          <TagManager
            memos={memos}
            activeTag={activeTag}
            setActiveTag={setActiveTag}
          />
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;