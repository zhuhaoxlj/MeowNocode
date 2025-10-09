import React, { useEffect, useRef, useState } from 'react';
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
  onRemoveBacklink,
  // 分页相关
  hasMore,
  isLoadingMore,
  totalMemos,
  loadMoreTriggerRef
}) => {
  const { themeColor } = useTheme();
  const memosForBacklinks = (allMemos && allMemos.length) ? allMemos : [...pinnedMemos, ...memos];
  const [menuPosition, setMenuPosition] = useState({});
  const [hoverMenuId, setHoverMenuId] = useState(null);
  const hoverTimerRef = useRef(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const currentMousePositionRef = useRef({ x: 0, y: 0 });
  const safeZoneCheckIntervalRef = useRef(null);
  
  // 🐛 调试模式：设置为 true 可以看到桥接区域（绿色半透明）
  const DEBUG_BRIDGE = false;

  // ✨ Amazon 风格的三角形安全区域检测
  // 判断点是否在三角形内（使用叉积算法）
  const isPointInTriangle = (point, triangle) => {
    const [p1, p2, p3] = triangle;
    
    const sign = (p1, p2, p3) => {
      return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    };
    
    const d1 = sign(point, p1, p2);
    const d2 = sign(point, p2, p3);
    const d3 = sign(point, p3, p1);
    
    const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
    const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
    
    return !(hasNeg && hasPos);
  };

  // 检查鼠标是否在朝菜单方向移动（使用矩形安全区域 + 扩展区域）
  const isMouseMovingTowardsMenu = (currentMouse, menuPos) => {
    if (!menuPos.top || !menuPos.left) return false;
    
    const menuWidth = 140;
    const menuHeight = 100;
    const padding = 10; // 合理的容错空间
    
    // 1. 首先检查鼠标是否已经在菜单区域内或非常接近
    const inMenuArea = 
      currentMouse.x >= menuPos.left - padding && 
      currentMouse.x <= menuPos.left + menuWidth + padding &&
      currentMouse.y >= menuPos.top - padding && 
      currentMouse.y <= menuPos.top + menuHeight + padding;
    
    if (inMenuArea) return true;
    
    // 2. 检查鼠标是否在按钮区域内或附近
    const inButtonArea = 
      menuPos.buttonLeft && menuPos.buttonTop &&
      currentMouse.x >= menuPos.buttonLeft - padding &&
      currentMouse.x <= menuPos.buttonRight + padding &&
      currentMouse.y >= menuPos.buttonTop - padding &&
      currentMouse.y <= menuPos.buttonBottom + padding;
    
    if (inButtonArea) return true;
    
    // 3. 检查鼠标是否在按钮和菜单之间的矩形安全区域内
    if (menuPos.showAbove) {
      // 菜单在按钮上方：安全区域应该覆盖从菜单顶部到按钮底部
      const minX = Math.min(menuPos.buttonLeft || 0, menuPos.left) - padding;
      const maxX = Math.max(menuPos.buttonRight || 0, menuPos.left + menuWidth) + padding;
      const minY = menuPos.top - padding;
      const maxY = (menuPos.buttonBottom || 0) + padding;
      
      return currentMouse.x >= minX && 
        currentMouse.x <= maxX &&
        currentMouse.y >= minY && 
        currentMouse.y <= maxY;
    } else {
      // 菜单在按钮下方
      const minX = Math.min(menuPos.buttonLeft || 0, menuPos.left) - padding;
      const maxX = Math.max(menuPos.buttonRight || 0, menuPos.left + menuWidth) + padding;
      const minY = (menuPos.buttonTop || 0) - padding;
      const maxY = menuPos.top + menuHeight + padding;
      
      return currentMouse.x >= minX && 
        currentMouse.x <= maxX &&
        currentMouse.y >= minY && 
        currentMouse.y <= maxY;
    }
  };

  // 🚀 彻底修复：菜单紧贴按钮，桥接区域无缝连接
  const calculateMenuPosition = (buttonElement, menuId) => {
    if (!buttonElement) return {};

    const buttonRect = buttonElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuHeight = 100; // 归档菜单只有2个选项，高度更小
    const menuWidth = 140; // 菜单实际宽度

    let position = {
      buttonTop: buttonRect.top,
      buttonBottom: buttonRect.bottom,
      buttonLeft: buttonRect.left,
      buttonRight: buttonRect.right,
      buttonWidth: buttonRect.width,
      buttonHeight: buttonRect.height,
    };

    // 🎯 让菜单在按钮正下方（或正上方）居中显示
    let top = buttonRect.bottom + 2;  // 紧贴按钮底部，稍微偏移2px
    // 让菜单居中对齐按钮
    let left = buttonRect.left + (buttonRect.width / 2) - (menuWidth / 2);
    let showAbove = false;

    // 检查是否超出底部
    if (top + menuHeight > viewportHeight - 8) {
      // 向上显示，紧贴按钮顶部（使用更小的间距确保连接）
      top = buttonRect.top - menuHeight + 2;  // 向上显示时也要保持小间距
      showAbove = true;
    }

    // 确保不超出左边
    if (left < 8) {
      left = 8;
    }

    // 确保不超出右边
    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }

    const result = { 
      top, 
      left, 
      showAbove,
      ...position 
    };

    console.log('🔍 菜单位置计算:', {
      memoId: menuId,
      按钮位置: { top: buttonRect.top, bottom: buttonRect.bottom, left: buttonRect.left, right: buttonRect.right },
      菜单位置: { top, left },
      桥接区域高度: showAbove ? buttonRect.top - (top + menuHeight) : top - buttonRect.bottom,
      showAbove
    });

    return result;
  };

  // 悬停处理函数
  const handleMenuHover = (memoId, event) => {
    // 立即更新鼠标位置
    if (event) {
      currentMousePositionRef.current = { x: event.clientX, y: event.clientY };
      lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
    }
    
    // 清除之前的定时器和检查interval
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    if (safeZoneCheckIntervalRef.current) {
      clearInterval(safeZoneCheckIntervalRef.current);
    }
    
    // 立即计算菜单位置并设置
    if (menuRefs.current[memoId]) {
      const buttonElement = menuRefs.current[memoId];
      const position = calculateMenuPosition(buttonElement, memoId);
      setMenuPosition(position);
    }
    
    // 立即显示菜单
    setHoverMenuId(memoId);
    onMenuButtonClick(memoId);
  };

  const handleMenuLeave = (event) => {
    // 记录鼠标位置
    if (event) {
      lastMousePositionRef.current = { x: event.clientX, y: event.clientY };
      currentMousePositionRef.current = { x: event.clientX, y: event.clientY };
    }
    
    // 清除之前的定时器和检查
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    if (safeZoneCheckIntervalRef.current) {
      clearInterval(safeZoneCheckIntervalRef.current);
    }
    
    // ⚡ 快速响应：短暂延迟后立即检查并关闭
    hoverTimerRef.current = setTimeout(() => {
      // 检查鼠标是否真的离开了安全区域
      const currentPos = currentMousePositionRef.current;
      const stillInSafeZone = isMouseMovingTowardsMenu(currentPos, menuPosition);
      
      if (stillInSafeZone) {
        // 鼠标还在安全区域内，不做任何处理
        console.log('🔍 鼠标还在安全区域内，保持菜单打开');
        return;
      }
      
      // 🚀 鼠标已离开安全区域，快速检查后关闭
      let checkCount = 0;
      const maxChecks = 2; // 最多检查 2 次（100ms）
      
      safeZoneCheckIntervalRef.current = setInterval(() => {
        checkCount++;
        
        const isInSafeZone = isMouseMovingTowardsMenu(
          currentMousePositionRef.current, 
          menuPosition
        );
        
        console.log(`🔍 安全区域检查 ${checkCount}/${maxChecks}:`, isInSafeZone);
        
        // 如果鼠标回到安全区域，停止检查
        if (isInSafeZone) {
          console.log('✅ 鼠标回到安全区域');
          if (safeZoneCheckIntervalRef.current) {
            clearInterval(safeZoneCheckIntervalRef.current);
          }
          return;
        }
        
        // 如果鼠标持续不在安全区域，或者已经检查了足够次数，关闭菜单
        if (!isInSafeZone && checkCount >= maxChecks) {
          console.log('❌ 鼠标离开，关闭菜单');
          if (safeZoneCheckIntervalRef.current) {
            clearInterval(safeZoneCheckIntervalRef.current);
          }
          
          setHoverMenuId(null);
          setMenuPosition({});
          if (activeMenuId) {
            onMenuButtonClick(activeMenuId);
          }
        }
        
        // 更新上一次鼠标位置
        lastMousePositionRef.current = { ...currentMousePositionRef.current };
      }, 50);
    }, 100); // 初始延迟 100ms
  };

  const handleMenuEnter = () => {
    // 鼠标进入菜单时取消关闭定时器和检查interval
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    if (safeZoneCheckIntervalRef.current) {
      clearInterval(safeZoneCheckIntervalRef.current);
    }
  };

  // 处理菜单定位（作为备用，防止其他地方直接设置activeMenuId）
  useEffect(() => {
    if (activeMenuId && menuRefs.current[activeMenuId] && Object.keys(menuPosition).length === 0) {
      const buttonElement = menuRefs.current[activeMenuId];
      const position = calculateMenuPosition(buttonElement, activeMenuId);
      setMenuPosition(position);
    }
  }, [activeMenuId, menuPosition]);

  // 🎯 全局鼠标移动监听器 - 实时跟踪鼠标位置
  useEffect(() => {
    const handleMouseMove = (e) => {
      currentMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    
    // 只在菜单打开时添加监听器，优化性能
    if (activeMenuId) {
      document.addEventListener('mousemove', handleMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [activeMenuId]);

  // 清理定时器和interval
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      if (safeZoneCheckIntervalRef.current) {
        clearInterval(safeZoneCheckIntervalRef.current);
      }
    };
  }, []);

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
                  <Card key={memo.id} className="group hover:shadow-lg transition-shadow duration-200 border-l-4 border-orange-400 overflow-hidden">
                    <CardContent className="p-3 overflow-hidden">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 mr-3">
                          <div 
                            onDoubleClick={(e) => {
                              // 检查点击目标是否是复选框或其相关元素
                              const target = e.target;
                              if (target.type === 'checkbox' || 
                                  target.closest('input[type="checkbox"]') ||
                                  target.closest('label')) {
                                return; // 如果是复选框相关元素，不触发编辑
                              }
                              e.preventDefault();
                              e.stopPropagation();
                              onMenuAction(e, memo.id, 'edit');
                            }}
                            onClick={(e) => {
                              // 确保复选框点击事件能正常传播
                              const target = e.target;
                              if (target.type === 'checkbox') {
                                e.stopPropagation(); // 阻止事件继续冒泡，但不阻止默认行为
                              }
                            }}
                            className="cursor-text"
                            title="双击编辑"
                          >
                            <ContentRenderer 
                              content={memo.content} 
                              activeTag={activeTag}
                              onTagClick={onTagClick}
                              onContentChange={(newContent) => onUpdateMemo(memo.id, { content: newContent })}
                              memo={memo}
                            />
                          </div>
                          
                          {/* 时间戳 */}
                          <div className="text-xs text-gray-500 mt-2 flex items-center space-x-2">
                            <span>{new Date(memo.created_ts || memo.timestamp).toLocaleDateString('zh-CN')}</span>
                            <span className="text-orange-500">归档</span>
                          </div>
                        </div>
                        
                        {/* 归档备忘录菜单按钮 */}
                        <div 
                          className="relative flex-shrink-0"
                          onMouseEnter={(e) => handleMenuHover(memo.id, e)}
                          onMouseLeave={handleMenuLeave}
                        >
                          <div
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 cursor-pointer flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                            ref={(el) => {
                              if (el) menuRefs.current[memo.id] = el;
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </div>
                          
                          {/* 归档备忘录菜单面板 */}
                          {activeMenuId === memo.id && (
                            <>
                              {/* 🚀 彻底修复：扩大桥接区域，完全覆盖按钮到菜单的区域 */}
                              <div
                                className="fixed"
                                style={{
                                  // 扩大桥接区域，向上和向下都包含按钮和菜单
                                  top: menuPosition.showAbove 
                                    ? `${menuPosition.top}px`  // 向上：从菜单顶部开始
                                    : `${menuPosition.buttonTop}px`,  // 向下：从按钮顶部开始（而不是底部）
                                  left: Math.min(menuPosition.left || 0, menuPosition.buttonLeft || 0) - 30,
                                  width: Math.max(
                                    (menuPosition.buttonRight || 0) - Math.min(menuPosition.left || 0, menuPosition.buttonLeft || 0),
                                    140
                                  ) + 60,  // 左右各扩展 30px
                                  height: menuPosition.showAbove
                                    ? `${Math.max(0, (menuPosition.buttonBottom || 0) - (menuPosition.top || 0))}px`  // 向上：从菜单顶部到按钮底部
                                    : `${Math.max(0, (menuPosition.top || 0) + 100 - (menuPosition.buttonTop || 0))}px`,  // 向下：从按钮顶部到菜单底部
                                  zIndex: 49,
                                  backgroundColor: DEBUG_BRIDGE ? 'rgba(0, 255, 0, 0.3)' : 'transparent',
                                  border: DEBUG_BRIDGE ? '2px solid green' : 'none',
                                  pointerEvents: 'auto'
                                }}
                                onMouseEnter={handleMenuEnter}
                                onMouseLeave={handleMenuLeave}
                                title={DEBUG_BRIDGE ? `桥接区域 (${menuPosition.showAbove ? '向上' : '向下'})` : undefined}
                              />
                              
                              {/* 菜单面板 */}
                              <div 
                                className="fixed z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]"
                                style={{
                                  top: menuPosition.top ? `${menuPosition.top}px` : 'auto',
                                  left: menuPosition.left ? `${menuPosition.left}px` : 'auto',
                                  transform: 'none' // 取消默认的transform
                                }}
                                onMouseEnter={handleMenuEnter}
                                onMouseLeave={handleMenuLeave}
                              >
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🔵 点击取消归档:', memo.id);
                                  
                                  // 清除所有定时器和检查
                                  if (hoverTimerRef.current) {
                                    clearTimeout(hoverTimerRef.current);
                                  }
                                  if (safeZoneCheckIntervalRef.current) {
                                    clearInterval(safeZoneCheckIntervalRef.current);
                                  }
                                  
                                  // 执行操作（onMenuAction 会处理菜单关闭）
                                  await onMenuAction(e, memo.id, 'unarchive');
                                  
                                  // 清理本地菜单状态
                                  setHoverMenuId(null);
                                  setMenuPosition({});
                                }}
                                onMouseDown={(e) => {
                                  // 阻止 mousedown 事件触发 mouseleave
                                  e.stopPropagation();
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                              >
                                <span>📤</span>
                                <span className="truncate">取消归档</span>
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('🔴 点击删除:', memo.id);
                                  
                                  // 清除所有定时器和检查
                                  if (hoverTimerRef.current) {
                                    clearTimeout(hoverTimerRef.current);
                                  }
                                  if (safeZoneCheckIntervalRef.current) {
                                    clearInterval(safeZoneCheckIntervalRef.current);
                                  }
                                  
                                  // 执行操作（onMenuAction 会处理菜单关闭）
                                  await onMenuAction(e, memo.id, 'delete');
                                  
                                  // 清理本地菜单状态
                                  setHoverMenuId(null);
                                  setMenuPosition({});
                                }}
                                onMouseDown={(e) => {
                                  // 阻止 mousedown 事件触发 mouseleave
                                  e.stopPropagation();
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 flex items-center space-x-2"
                              >
                                <span>🗑️</span>
                                <span className="truncate">删除</span>
                              </button>
                              </div>
                            </>
                          )}
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
                <Card key={memo.id} className={`group hover:shadow-lg transition-shadow duration-200 border-l-4 overflow-hidden`} 
                      style={{ borderLeftColor: themeColor }}>
                  <CardContent className="p-3 overflow-hidden">
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
                          <div 
                            onDoubleClick={(e) => {
                              // 检查点击目标是否是复选框或其相关元素
                              const target = e.target;
                              if (target.type === 'checkbox' || 
                                  target.closest('input[type="checkbox"]') ||
                                  target.closest('label')) {
                                return; // 如果是复选框相关元素，不触发编辑
                              }
                              e.preventDefault();
                              e.stopPropagation();
                              onMenuAction(e, memo.id, 'edit');
                            }}
                            onClick={(e) => {
                              // 确保复选框点击事件能正常传播
                              const target = e.target;
                              if (target.type === 'checkbox') {
                                e.stopPropagation(); // 阻止事件继续冒泡，但不阻止默认行为
                              }
                            }}
                            className="cursor-text"
                            title="双击编辑"
                          >
                            <ContentRenderer 
                              content={memo.content}
                              activeTag={activeTag}
                              onTagClick={onTagClick}
                              onContentChange={(newContent) => onUpdateMemo(memo.id, { content: newContent })}
                              memo={memo}
                            />
                          </div>
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
                      <div 
                        className="relative flex-shrink-0"
                        onMouseEnter={(e) => handleMenuHover(memo.id, e)}
                        onMouseLeave={handleMenuLeave}
                      >
                        <div
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 cursor-pointer flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                          ref={el => {
                            if (menuRefs.current) {
                              menuRefs.current[memo.id] = el;
                            }
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </div>
                        
                        {/* 菜单面板 - 置顶备忘录专用 */}
                        {activeMenuId === memo.id && (
                          <>
                            {/* 🚀 彻底修复：无缝桥接区域，从按钮到菜单 - 置顶菜单 */}
                            <div
                              className="fixed"
                              style={{
                                top: menuPosition.buttonBottom ? `${menuPosition.buttonBottom}px` : 'auto',
                                left: Math.min(menuPosition.left || 0, menuPosition.buttonLeft || 0),
                                width: Math.max(
                                  (menuPosition.buttonRight || 0) - Math.min(menuPosition.left || 0, menuPosition.buttonLeft || 0),
                                  160
                                ),
                                height: menuPosition.top ? `${menuPosition.top - (menuPosition.buttonBottom || 0)}px` : '0px',
                                zIndex: 49,
                                backgroundColor: DEBUG_BRIDGE ? 'rgba(255, 0, 0, 0.3)' : 'transparent',
                                border: DEBUG_BRIDGE ? '1px solid red' : 'none',
                                pointerEvents: 'auto'
                              }}
                              onMouseEnter={handleMenuEnter}
                              onMouseLeave={handleMenuLeave}
                              title={DEBUG_BRIDGE ? '桥接区域（调试可见）' : undefined}
                            />
                            
                            {/* 菜单面板 */}
                            <div 
                              className="fixed z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1 w-40"
                              style={{
                                top: menuPosition.top ? `${menuPosition.top}px` : 'auto',
                                left: menuPosition.left ? `${menuPosition.left}px` : 'auto',
                                transform: 'none' // 取消默认的transform
                              }}
                              onMouseEnter={handleMenuEnter}
                              onMouseLeave={handleMenuLeave}
                            >
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
                              onClick={(e) => onMenuAction(e, memo.id, 'archive')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <span>📂</span>
                              <span className="truncate">归档</span>
                            </button>
                            <button
                              onClick={(e) => onMenuAction(e, memo.id, 'delete')}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 flex items-center space-x-2"
                            >
                              <span>🗑️</span>
                              <span className="truncate">删除</span>
                            </button>
                            </div>
                          </>
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
                  className={`group hover:shadow-md transition-shadow rounded-xl shadow-sm relative bg-white dark:bg-gray-800 overflow-hidden ${
                    pinnedMemos.some(p => p.id === memo.id) ? 'border-l-4' : ''
                  }`}
                  style={pinnedMemos.some(p => p.id === memo.id) ? { borderLeftColor: themeColor } : {}}
                >
                  <CardContent className="p-3 overflow-hidden">
                    {/* 菜单按钮 */}
                    <div
                      className="absolute top-3 right-3"
                      ref={(el) => menuRefs.current[memo.id] = el}
                      onMouseEnter={(e) => handleMenuHover(memo.id, e)}
                      onMouseLeave={handleMenuLeave}
                    >
                      <div
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 touch:opacity-100 cursor-pointer"
                        aria-label="操作菜单"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </div>

                      {/* 菜单面板容器 - 包含桥接区域 */}
                      {activeMenuId === memo.id && (
                        <>
                          {/* 🚀 彻底修复：无缝桥接区域，从按钮到菜单 - 普通菜单 */}
                          <div
                            className="fixed"
                            style={{
                              top: menuPosition.buttonBottom ? `${menuPosition.buttonBottom}px` : 'auto',
                              left: Math.min(menuPosition.left || 0, menuPosition.buttonLeft || 0),
                              width: Math.max(
                                (menuPosition.buttonRight || 0) - Math.min(menuPosition.left || 0, menuPosition.buttonLeft || 0),
                                192
                              ),
                              height: menuPosition.top ? `${menuPosition.top - (menuPosition.buttonBottom || 0)}px` : '0px',
                              zIndex: 49,
                              backgroundColor: DEBUG_BRIDGE ? 'rgba(255, 0, 0, 0.3)' : 'transparent',
                              border: DEBUG_BRIDGE ? '1px solid red' : 'none',
                              pointerEvents: 'auto'
                            }}
                            onMouseEnter={handleMenuEnter}
                            onMouseLeave={handleMenuLeave}
                            title={DEBUG_BRIDGE ? '桥接区域（调试可见）' : undefined}
                          />
                          
                          {/* 菜单面板 */}
                          <div
                            className="fixed w-40 sm:w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700"
                            style={{
                              top: menuPosition.top ? `${menuPosition.top}px` : 'auto',
                              left: menuPosition.left ? `${menuPosition.left}px` : 'auto',
                              transform: 'none' // 取消默认的transform
                            }}
                            onMouseEnter={handleMenuEnter}
                            onMouseLeave={handleMenuLeave}
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

                          {/* 归档按钮 */}
                          <button
                            onClick={(e) => onMenuAction(e, memo.id, 'archive')}
                            className="block w-full text-left px-3 py-2 sm:px-4 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="3" width="20" height="5" rx="1" ry="1"/>
                              <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/>
                              <path d="M10 12h4"/>
                            </svg>
                            <span className="truncate">归档</span>
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
                        </>
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
                      <div 
                        onDoubleClick={(e) => {
                          // 检查点击目标是否是复选框或其相关元素
                          const target = e.target;
                          if (target.type === 'checkbox' || 
                              target.closest('input[type="checkbox"]') ||
                              target.closest('label')) {
                            return; // 如果是复选框相关元素，不触发编辑
                          }
                          e.preventDefault();
                          e.stopPropagation();
                          onMenuAction(e, memo.id, 'edit');
                        }}
                        onClick={(e) => {
                          // 确保复选框点击事件能正常传播
                          const target = e.target;
                          if (target.type === 'checkbox') {
                            e.stopPropagation(); // 阻止事件继续冒泡，但不阻止默认行为
                          }
                        }}
                        className="cursor-text"
                        title="双击编辑"
                      >
                        <ContentRenderer
                          content={memo.content}
                          activeTag={activeTag}
                          onTagClick={onTagClick}
                          onContentChange={(newContent) => onUpdateMemo(memo.id, { content: newContent })}
                          memo={memo}
                        />
                      </div>
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

        {/* 无限滚动加载触发器 - 只在非归档视图显示 */}
        {!showArchived && (
          <>
            {/* 加载更多触发器 */}
            <div 
              ref={loadMoreTriggerRef} 
              className="h-20 flex items-center justify-center"
            >
              {isLoadingMore && (
                <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                  <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-sm">加载中...</p>
                </div>
              )}
              {!isLoadingMore && hasMore && (
                <div className="text-sm text-gray-400 dark:text-gray-500">
                  向下滚动加载更多...
                </div>
              )}
              {!hasMore && totalMemos > 0 && (
                <div className="text-sm text-gray-400 dark:text-gray-500 py-4">
                  已加载全部 {totalMemos} 条备忘录 ✓
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
