import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, MoreVertical, ArrowUp, Send, X, Share2, Image } from 'lucide-react';
import MemoEditor from '@/components/MemoEditor';
import ContentRenderer from '@/components/ContentRenderer';
import { useTheme } from '@/context/ThemeContext';

const MemoList = ({ 
  memos, 
  pinnedMemos, 
  activeMenuId, 
  editingId, 
  editContent, 
  activeTag,
  activeDate, // 新增日期筛选状态
  showScrollToTop,
  menuRefs,
  memosContainerRef,
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
  onUpdateMemo,
  // backlinks
  allMemos = [],
  onAddBacklink,
  onPreviewMemo,
  onRemoveBacklink
}) => {
  const { themeColor } = useTheme();
  const memosForBacklinks = (allMemos && allMemos.length) ? allMemos : [...pinnedMemos, ...memos];

  // 处理菜单定位
  useEffect(() => {
    if (activeMenuId && menuRefs.current[activeMenuId]) {
      const menuElement = menuRefs.current[activeMenuId];
      const buttonRect = menuElement.getBoundingClientRect();
      
      // 更新菜单位置
      const updateMenuPosition = () => {
        const menuPanel = menuElement.querySelector('[class*="fixed"]');
        if (menuPanel) {
          menuPanel.style.top = `${buttonRect.bottom + 5}px`;
          
          // 确保菜单不会超出视窗右侧
          const viewportWidth = window.innerWidth;
          const menuWidth = menuPanel.offsetWidth;
          const rightSpace = viewportWidth - buttonRect.right;
          
          if (rightSpace < menuWidth) {
            // 如果右侧空间不足，将菜单对齐到按钮左侧
            menuPanel.style.right = 'auto';
            menuPanel.style.left = `${buttonRect.left - menuWidth + buttonRect.width}px`;
          } else {
            // 否则保持对齐到按钮右侧
            menuPanel.style.right = `${viewportWidth - buttonRect.right}px`;
            menuPanel.style.left = 'auto';
          }
        }
      };
      
      // 初始更新位置
      updateMenuPosition();
      
      // 监听窗口大小变化和滚动，重新计算位置
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition);
      
      return () => {
        window.removeEventListener('resize', updateMenuPosition);
        window.removeEventListener('scroll', updateMenuPosition);
      };
    }
  }, [activeMenuId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 标题区域 */}
      <div className="p-3 sm:p-4 lg:p-6 pb-0">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center flex-shrink-0">
            <Clock
              className="h-4 w-4 sm:h-5 sm:w-5 mr-2 transition-colors duration-300"
              style={{ color: themeColor }}
            />
            近期想法
          </h2>
          
          {/* 筛选条件显示区域 */}
          {(activeTag || activeDate) && (
            <div className="flex items-center mb-3 sm:mb-4">
              <div 
                className="flex items-center px-3 py-1 rounded-full text-sm"
                style={{ 
                  backgroundColor: `${themeColor}20`,
                  color: themeColor,
                  border: `1px solid ${themeColor}`
                }}
              >
                <span className="mr-2">
                  {activeTag ? `#${activeTag}` : activeDate}
                </span>
                <button 
                  onClick={clearFilters}
                  className="flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
                  style={{ color: themeColor }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 滚动容器 */}
  <div
        ref={memosContainerRef}
        className="flex-1 overflow-y-auto mobile-memos-container lg:mobile-memos-container-disabled px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6 min-h-[250px]"
      >
    {memos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p>还没有记录任何想法</p>
              <p className="text-sm mt-2">在顶部输入框写下你的第一个想法吧</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto scrollbar-hidden">
            <div className="space-y-4 pb-4">
      {memos.map(memo => (
                <Card
                  key={memo.id}
                  className={`group hover:shadow-md transition-shadow rounded-xl shadow-sm relative bg-white dark:bg-gray-800 ${
                    pinnedMemos.some(p => p.id === memo.id) ? 'border-l-4' : ''
                  }`}
                  style={pinnedMemos.some(p => p.id === memo.id) ? { borderLeftColor: themeColor } : {}}
                >
                  <CardContent className="p-3 sm:p-4">
                    {/* 菜单按钮 */}
                    <div
                      className="absolute top-3 right-3 sm:top-4 sm:right-4"
                      ref={(el) => menuRefs.current[memo.id] = el}
                      onMouseEnter={() => onMenuContainerEnter(memo.id)}
                      onMouseLeave={onMenuContainerLeave}
                    >
                      <button
                        onClick={() => onMenuButtonClick(memo.id)}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch:opacity-100"
                        aria-label="操作菜单"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>

                      {/* 菜单面板 */}
                      {activeMenuId === memo.id && (
                        <div
                          className="fixed w-40 sm:w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* 置顶/取消置顶按钮 */}
                          {pinnedMemos.some(p => p.id === memo.id) ? (
                            <button
                              onClick={(e) => onMenuAction(e, memo.id, 'unpin')}
                              className="block w-full text-left px-3 py-2 sm:px-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 12l3-3 3 3M8 21l4-7 4 7M16 3h5v5M21 3l-7.5 7.5" />
                              </svg>
                              <span className="truncate">取消置顶</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => onMenuAction(e, memo.id, 'pin')}
                              className="block w-full text-left px-3 py-2 sm:px-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 12l2 2 4-4M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                              </svg>
                              <span className="truncate">置顶</span>
                            </button>
                          )}

                          {/* 编辑按钮 */}
                          <button
                            onClick={(e) => onMenuAction(e, memo.id, 'edit')}
                            className="block w-full text-left px-3 py-2 sm:px-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span className="truncate">编辑</span>
                          </button>

                          {/* 分享图按钮 */}
                          <button
                            onClick={(e) => onMenuAction(e, memo.id, 'share')}
                            className="block w-full text-left px-3 py-2 sm:px-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          >
                            <Image className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">分享图</span>
                          </button>

                          {/* 删除按钮 */}
                          <button
                            onClick={(e) => onMenuAction(e, memo.id, 'delete')}
                            className="block w-full text-left px-3 py-2 sm:px-4 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span className="truncate">删除</span>
                          </button>
                          
                          {/* memo信息 */}
                          <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1 px-3 py-2 sm:px-4 text-xs text-gray-500 dark:text-gray-400">
                            <div className="truncate">字数: {memo.content.length}字</div>
                            <div className="truncate">创建: {new Date(memo.createdAt).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</div>
                            <div className="truncate">修改: {new Date(memo.updatedAt).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
        {editingId === memo.id ? (
                      <div className="mb-4">
                        <div className="relative">
                          <MemoEditor
                            value={editContent}
                            onChange={onEditContentChange}
                            placeholder="编辑想法..."
                            maxLength={5000}
                            showCharCount={true}
                            autoFocus={true}
                            memosList={memosForBacklinks}
          currentMemoId={memo.id}
          backlinks={Array.isArray(memo.backlinks) ? memo.backlinks : []}
          onAddBacklink={onAddBacklink}
          onPreviewMemo={onPreviewMemo}
                            onRemoveBacklink={onRemoveBacklink}
                          />
                          <div className="absolute bottom-12 right-2 flex items-center space-x-1 sm:space-x-2">
                            <Button
                              variant="outline"
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={onCancelEdit}
                              className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300 px-2 py-1 sm:px-3 sm:py-2 text-sm"
                            >
                              取消
                            </Button>
                            <Button
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={() => onSaveEdit(memo.id)}
                              disabled={!editContent.trim()}
                              className="bg-slate-600 hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-2 py-1 sm:px-3 sm:py-2 text-sm"
                            >
                              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <ContentRenderer
                        content={memo.content}
                        activeTag={activeTag}
                        onTagClick={onTagClick}
                        onContentChange={(newContent) => onUpdateMemo(memo.id, { content: newContent })}
                      />
                    )}

                    {/* 反链 chips（展示在每条 memo 下面） */}
        {Array.isArray(memo.backlinks) && memo.backlinks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {memo.backlinks.map((bid) => {
          const m = memosForBacklinks.find(x => x.id === bid);
                          if (!m) return null;
                          return (
                            <span key={`${memo.id}-bk-${bid}`} className="inline-flex items-center group">
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPreviewMemo?.(bid); }}
                                className="max-w-full inline-flex items-center gap-1 pl-2 pr-2 py-0.5 rounded-md bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                <span className="truncate inline-block max-w-[200px]">{m.content?.replace(/\n/g, ' ').slice(0, 60) || '（无内容）'}</span>
                                {/* 小箭头图标 */}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                                  <path d="M7 17L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M9 7H17V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                              </button>
                              {/* hover 才出现的小 × */}
                              <button
                                type="button"
                                className="ml-1 w-4 h-4 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveBacklink?.(memo.id, bid); }}
                                aria-label="移除反链"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-3 flex justify-end">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(memo.updatedAt).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 回到顶部按钮 */}
        {showScrollToTop && (
          <button
            onClick={onScrollToTop}
            className="absolute bottom-6 right-6 z-30 flex items-center justify-center w-12 h-12 rounded-full bg-gray-200/90 dark:bg-gray-700/90 text-gray-700 dark:text-gray-300 transition-all duration-300 hover:bg-gray-300/90 dark:hover:bg-gray-600/90 hover:scale-110 shadow-lg backdrop-blur-sm border border-gray-300/20 dark:border-gray-600/20"
            aria-label="回到顶部"
            title="回到顶部"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default MemoList;
