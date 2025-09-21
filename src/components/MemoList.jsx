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
  archivedMemos = [],
  showArchived = false,
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
    <div className="flex-1 overflow-hidden h-full">
      {/* 统一的大滚动容器 - 包含所有内容 */}
      <div
        ref={memosContainerRef}
        className="h-full overflow-y-auto"
      >
        {/* 归档视图 */}
        {showArchived ? (
          <div className="px-4 pt-4">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 flex items-center">
              <span className="mr-2">📁</span>
              归档备忘录
              <span className="ml-2 text-sm text-gray-500">({archivedMemos.length})</span>
            </h2>
            {archivedMemos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-4 block">📁</span>
                <p>暂无归档备忘录</p>
              </div>
            ) : (
              <div className="space-y-3">
                {archivedMemos.map(memo => (
                  <Card key={memo.id} className="group hover:shadow-lg transition-shadow duration-200 border-l-4 border-orange-400">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-3">
                          <ContentRenderer 
                            content={memo.content} 
                            activeTag={activeTag}
                            onTagClick={onTagClick}
                          />
                          
                          {/* 时间戳 */}
                          <div className="text-xs text-gray-500 mt-2 flex items-center space-x-2">
                            <span>{new Date(memo.created_ts || memo.timestamp).toLocaleDateString('zh-CN')}</span>
                            <span className="text-orange-500">归档</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 置顶备忘录区域 */}
            {pinnedMemos.length > 0 && (
          <div className="px-4 pt-4 mb-4">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 flex items-center">
              <span className="mr-2">📌</span>
              置顶备忘录
            </h2>
            <div className="space-y-3 mb-4">
              {pinnedMemos.map(memo => (
                <Card key={memo.id} className={`group hover:shadow-lg transition-shadow duration-200 border-l-4`} 
                      style={{ borderLeftColor: themeColor }}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 mr-3">
                        {editingId === memo.id ? (
                          <MemoEditor
                            content={editContent}
                            onChange={onEditContentChange}
                            onSave={onSaveEdit}
                            onCancel={onCancelEdit}
                          />
                        ) : (
                          <ContentRenderer content={memo.content} />
                        )}
                        
                        {/* 时间戳 */}
                        <div className="text-xs text-gray-500 mt-2 flex items-center space-x-2">
                          <span>{new Date(memo.created_ts || memo.timestamp).toLocaleDateString('zh-CN')}</span>
                          {memo.updated_ts && memo.updated_ts !== memo.created_ts && (
                            <span className="text-orange-500">已编辑</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 菜单按钮 */}
                      <div className="relative flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onMenuButtonClick(memo.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0"
                          ref={el => {
                            if (menuRefs.current) {
                              menuRefs.current[memo.id] = el;
                            }
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        
                        {/* 菜单面板 - 置顶备忘录专用 */}
                        {activeMenuId === memo.id && (
                          <div className="fixed z-50 mt-1 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                            <button
                              onClick={(e) => onMenuAction(e, memo.id, 'unpin')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <span>📌</span>
                              <span className="truncate">取消置顶</span>
                            </button>
                            <button
                              onClick={(e) => onMenuAction(e, memo.id, 'edit')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <span>✏️</span>
                              <span className="truncate">编辑</span>
                            </button>
                            <button
                              onClick={(e) => onMenuAction(e, memo.id, 'delete')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 flex items-center space-x-2"
                            >
                              <span>🗑️</span>
                              <span className="truncate">删除</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 近期想法区域 */}
        <div className={`px-4 pb-4 ${pinnedMemos.length === 0 ? 'pt-4' : ''}`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center">
              <Clock
                className="h-4 w-4 sm:h-5 sm:w-5 mr-2 transition-colors duration-300"
                style={{ color: themeColor }}
              />
              近期想法 ({memos.length})
            </h2>
            
            {/* 筛选条件显示区域 */}
            {(activeTag || activeDate) && (
              <div className="flex items-center">
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

          {/* 普通备忘录列表 */}
          {memos.length === 0 ? (
            <div className="flex items-center justify-center text-gray-500 py-8">
              <div className="text-center">
                <p>还没有记录任何想法</p>
                <p className="text-sm mt-2">在顶部输入框写下你的第一个想法吧</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {memos.map(memo => (
                <Card
                  key={memo.id}
                  className={`group hover:shadow-md transition-shadow rounded-xl shadow-sm relative bg-white dark:bg-gray-800 ${
                    pinnedMemos.some(p => p.id === memo.id) ? 'border-l-4' : ''
                  }`}
                  style={pinnedMemos.some(p => p.id === memo.id) ? { borderLeftColor: themeColor } : {}}
                >
                  <CardContent className="p-3">
                    {/* 菜单按钮 */}
                    <div
                      className="absolute top-3 right-3"
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
                            <div className="truncate">创建: {new Date(memo.created_ts || memo.createdAt || Date.now()).toLocaleString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</div>
                            <div className="truncate">修改: {new Date(memo.updated_ts || memo.created_ts).toLocaleString('zh-CN', {
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
                        {new Date(memo.updated_ts || memo.created_ts).toLocaleString('zh-CN', {
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
          )}
        </div>

          </>
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
