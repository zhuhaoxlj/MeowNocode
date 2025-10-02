import React from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Header from '@/components/Header';
import MemoInput from '@/components/MemoInput';
import MemoList from '@/components/MemoList';
import { useTheme } from '@/context/ThemeContext';

// 🚀 使用 React.memo 优化，避免不必要的重渲染
const MainContent = React.memo(({
  // Layout state
  isLeftSidebarHidden,
  isRightSidebarHidden,
  setIsLeftSidebarHidden,
  setIsRightSidebarHidden,
  isLeftSidebarPinned,
  isRightSidebarPinned,
  
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
  // 归档相关
  showArchived,
  setShowArchived,
  archivedMemos,
  
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
  clearFilters, // 新增清除筛选函数
  onEditorFocus,
  onEditorBlur,
  onUpdateMemo,
  onOpenMusic,
  onOpenMusicSearch,
  musicEnabled = true,
  // backlinks
  allMemos,
  onAddBacklink,
  onPreviewMemo,
  pendingNewBacklinks,
  onRemoveBacklink
}) => {
  const { themeColor } = useTheme();

  // 调试信息 - 检查 MainContent 收到的 props 
  // console.log('🐛 MainContent Debug - Archive Props:', { 
  //   showArchived, 
  //   setShowArchived: typeof setShowArchived, 
  //   archivedMemosLength: archivedMemos?.length,
  //   hasSetShowArchived: !!setShowArchived,
  //   timestamp: new Date().toLocaleTimeString()
  // });  

  return (
    <div className={`flex-1 flex flex-col w-full relative h-full overflow-hidden ${
      isLeftSidebarPinned && isRightSidebarPinned
        ? 'lg:max-w-2xl lg:mx-auto'
        : isLeftSidebarPinned || isRightSidebarPinned
          ? 'lg:max-w-3xl lg:mx-auto'
          : 'lg:max-w-4xl lg:mx-auto px-4'
    }`}>


      {/* 固定顶部区域 */}
      <div className="flex-shrink-0">
        {/* 顶部栏 */}
        <Header
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchInputRef={searchInputRef}
          onMobileMenuOpen={onMobileMenuOpen}
          onOpenMusicSearch={onOpenMusicSearch}
          // 归档相关
          showArchived={showArchived}
          setShowArchived={setShowArchived}
          archivedCount={archivedMemos?.length || 0}
        />

        {/* 编辑区域 */}
        <MemoInput
          newMemo={newMemo}
          setNewMemo={setNewMemo}
          onAddMemo={onAddMemo}
          onEditorFocus={onEditorFocus}
          onEditorBlur={onEditorBlur}
          // backlinks for input editor (new memo has no id; only provide memos list)
          allMemos={allMemos}
          onAddBacklink={onAddBacklink}
          onPreviewMemo={onPreviewMemo}
          pendingNewBacklinks={pendingNewBacklinks}
          onRemoveBacklink={onRemoveBacklink}
        />
      </div>

      {/* 可滚动内容区域 - 占据剩余所有空间 */}
      <MemoList
        memos={showArchived ? [] : filteredMemos}
        pinnedMemos={showArchived ? [] : pinnedMemos}
        archivedMemos={showArchived ? archivedMemos : []}
        showArchived={showArchived}
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
        onUpdateMemo={onUpdateMemo}
  // backlinks for memo cards
  allMemos={allMemos}
  onAddBacklink={onAddBacklink}
  onPreviewMemo={onPreviewMemo}
  onRemoveBacklink={onRemoveBacklink}
      />
    </div>
  );
});

MainContent.displayName = 'MainContent';

export default MainContent;
