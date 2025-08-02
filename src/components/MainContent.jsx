import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Header from '@/components/Header';
import MemoInput from '@/components/MemoInput';
import MemoList from '@/components/MemoList';
import { useTheme } from '@/context/ThemeContext';

const MainContent = ({
  // Layout state
  isLeftSidebarHidden,
  isRightSidebarHidden,
  setIsLeftSidebarHidden,
  setIsRightSidebarHidden,
  
  // Data
  searchQuery,
  setSearchQuery,
  newMemo,
  setNewMemo,
  filteredMemos,
  pinnedMemos,
  activeMenuId,
  editingId,
  editContent,
  activeTag,
  activeDate, // 新增日期筛选状态
  showScrollToTop,
  
  // Refs
  searchInputRef,
  memosContainerRef,
  menuRefs,
  
  // Callbacks
  onMobileMenuOpen,
  onAddMemo,
  onMenuAction,
  onMenuContainerEnter,
  onMenuContainerLeave,
  onMenuButtonClick,
  onEditContentChange,
  onSaveEdit,
  onCancelEdit,
  onTagClick,
  onScrollToTop,
  clearFilters // 新增清除筛选函数
}) => {
  const { themeColor } = useTheme();

  return (
    <div className={`flex-1 flex flex-col w-full transition-all duration-500 ease-in-out relative h-full lg:h-full ${
      isLeftSidebarHidden && isRightSidebarHidden
        ? 'lg:max-w-3xl lg:mx-auto'
        : 'lg:max-w-2xl lg:mx-auto'
    }`}>

      {/* 显示左侧栏按钮 - 仅在桌面端显示 */}
      {isLeftSidebarHidden && (
        <div className="hidden lg:block absolute top-4 -left-6 z-20 show-sidebar-btn">
          <button
            onClick={() => setIsLeftSidebarHidden(false)}
            className="fixed-sidebar-btn flex items-center justify-center w-10 h-10 rounded-lg bg-gray-200/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-300/90 dark:hover:bg-gray-600/90 hover:scale-110"
            aria-label="显示左侧栏"
            title="显示左侧栏"
          >
            <ChevronRight className="h-4 w-4 transition-transform duration-200" />
          </button>
        </div>
      )}

      {/* 显示右侧栏按钮 - 仅在桌面端显示 */}
      {isRightSidebarHidden && (
        <div className="hidden lg:block absolute top-4 -right-6 z-20 show-sidebar-btn">
          <button
            onClick={() => setIsRightSidebarHidden(false)}
            className="fixed-sidebar-btn flex items-center justify-center w-10 h-10 rounded-lg bg-gray-200/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-300/90 dark:hover:bg-gray-600/90 hover:scale-110"
            aria-label="显示右侧栏"
            title="显示右侧栏"
          >
            <ChevronLeft className="h-4 w-4 transition-transform duration-200" />
          </button>
        </div>
      )}

      {/* 顶部栏 */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef}
        onMobileMenuOpen={onMobileMenuOpen}
      />

      {/* 编辑区域 */}
      <MemoInput
        newMemo={newMemo}
        setNewMemo={setNewMemo}
        onAddMemo={onAddMemo}
      />

      {/* Memos列表 */}
      <MemoList
        memos={filteredMemos}
        pinnedMemos={pinnedMemos}
        activeMenuId={activeMenuId}
        editingId={editingId}
        editContent={editContent}
        activeTag={activeTag}
        activeDate={activeDate} // 传递日期筛选状态
        showScrollToTop={showScrollToTop}
        menuRefs={menuRefs}
        memosContainerRef={memosContainerRef}
        onMenuAction={onMenuAction}
        onMenuContainerEnter={onMenuContainerEnter}
        onMenuContainerLeave={onMenuContainerLeave}
        onMenuButtonClick={onMenuButtonClick}
        onEditContentChange={onEditContentChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onTagClick={onTagClick}
        onScrollToTop={onScrollToTop}
        clearFilters={clearFilters} // 传递清除筛选函数
      />
    </div>
  );
};

export default MainContent;
