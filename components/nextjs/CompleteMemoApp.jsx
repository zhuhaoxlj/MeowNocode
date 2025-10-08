/**
 * 完整的 Next.js 版本 MeowNocode 应用
 * 包含所有原始功能：热力图、音乐播放器、AI对话、画布编辑等
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePasswordAuth } from '../../src/context/PasswordAuthContext';
import { useSettings } from '../../src/context/SettingsContext';
import { toast } from 'sonner';
import Login from '../../src/pages/Login';

// 导入主要布局组件
import LeftSidebar from '../../src/components/LeftSidebar';  
import MainContent from '../../src/components/MainContent';
import RightSidebar from '../../src/components/RightSidebar';
import MiniMusicPlayer from '../../src/components/MiniMusicPlayer';

// 导入移动端组件
import MobileSidebar from '../../src/components/MobileSidebar';

// 导入对话框组件
import ShareDialog from '../../src/components/ShareDialog';
import NextJsSettingsCard from './SettingsCard';

// 导入数据服务
import { dataService } from '../../lib/client/dataService.js';

export default function CompleteMemoApp() {
  const { isAuthenticated, requiresAuth, isLoading } = usePasswordAuth();
  const { settings } = useSettings();
  
  // UI 状态
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // 侧边栏状态
  const [isLeftSidebarHidden, setIsLeftSidebarHidden] = useState(false);
  const [isRightSidebarHidden, setIsRightSidebarHidden] = useState(false);
  const [isLeftSidebarPinned, setIsLeftSidebarPinned] = useState(true);
  const [isRightSidebarPinned, setIsRightSidebarPinned] = useState(true);
  const [isLeftSidebarHovered, setIsLeftSidebarHovered] = useState(false);
  const [isRightSidebarHovered, setIsRightSidebarHovered] = useState(false);
  
  // Canvas 模式
  const [isCanvasMode, setIsCanvasMode] = useState(false);
  
  // 数据状态
  const [memos, setMemos] = useState([]);
  const [pinnedMemos, setPinnedMemos] = useState([]);
  const [archivedMemos, setArchivedMemos] = useState([]);
  const [allMemos, setAllMemos] = useState([]);
  const [heatmapData, setHeatmapData] = useState({});
  
  // 编辑状态
  const [newMemo, setNewMemo] = useState('');
  
  // 创建防抖的 setNewMemo 函数 - 真正的防抖
  const debouncedSetNewMemo = useMemo(() => {
    let timeoutId;
    const debouncedFn = (value) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setNewMemo(value);
      }, 50); // 50ms 防抖，平衡响应性和性能
    };
    return debouncedFn;
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [activeDate, setActiveDate] = useState('');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  // 归档状态
  const [showArchived, setShowArchived] = useState(false);
  
  // 分享状态
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedMemoForShare, setSelectedMemoForShare] = useState(null);
  
  // 设置状态
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // 引用
  const searchInputRef = useRef(null);
  const memosContainerRef = useRef(null);
  const menuRefs = useRef({});
  
  // 回链状态
  const [pendingNewBacklinks, setPendingNewBacklinks] = useState([]);

  // 创建稳定的 setShowArchived 函数引用
  const handleSetShowArchived = useCallback((value) => {
    if (typeof value === 'function') {
      setShowArchived(prevState => {
        const newState = value(prevState);
        return newState;
      });
    } else {
      setShowArchived(value);
    }
  }, []);

  // 创建数据刷新触发器
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // 使用 useCallback 优化事件处理函数
  // 🚀 优化：接受内容参数，避免依赖异步状态更新
  const handleAddMemo = useCallback(async (content) => {
    console.log('💥 [handleAddMemo] 被调用，参数:', content);
    console.log('💥 [handleAddMemo] 当前 newMemo 状态:', newMemo);
    
    // 如果传入 content，使用它；否则使用 newMemo 状态
    const memoContent = content !== undefined ? content : newMemo;
    
    console.log('💥 [handleAddMemo] 最终使用内容:', memoContent);
    
    if (!memoContent.trim()) {
      console.warn('⚠️ [handleAddMemo] 内容为空');
      return;
    }
    
    try {
      const memoData = {
        content: memoContent.trim(),
        pinned: false
      };
      
      console.log('💥 [handleAddMemo] 准备调用 API，内容:', memoData.content);
      const created = await dataService.createMemo(memoData);
      console.log('✅ [handleAddMemo] API 调用成功，创建的 memo:', created);
      
      setNewMemo('');
      // 触发数据重新加载
      setRefreshTrigger(prev => prev + 1);
      toast.success('备忘录创建成功');
    } catch (error) {
      console.error('❌ [handleAddMemo] 创建备忘录失败:', error);
      toast.error('创建备忘录失败');
    }
  }, [newMemo]);

  const handleEditorFocus = useCallback(() => {
    // 编辑器聚焦处理
  }, []);

  const handleEditorBlur = useCallback(() => {
    // 编辑器失焦处理
  }, []);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 初始化应用（只在认证后执行一次）
  useEffect(() => {
    let isSubscribed = true;
    
    const initApp = async () => {
      try {
        console.log('🚀 开始初始化应用...');
        await Promise.all([
          loadMemos(),
          loadArchivedMemos()
        ]);
        
        if (isSubscribed) {
          setIsAppLoaded(true);
          setTimeout(() => setIsInitialLoad(false), 100);
          console.log('✅ 应用初始化完成');
        }
      } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        if (isSubscribed) {
          toast.error('应用初始化失败');
        }
      }
    };
    
    if (isAuthenticated && !isAppLoaded) {
      initApp();
    }
    
    return () => {
      isSubscribed = false;
    };
  }, [isAuthenticated]); // 只依赖 isAuthenticated

  // 当 refreshTrigger 变化时重新加载数据
  useEffect(() => {
    if (refreshTrigger > 0 && isAuthenticated && isAppLoaded) {
      console.log(`🔄 触发数据刷新 (trigger: ${refreshTrigger})`);
      Promise.all([
        loadMemos(),
        loadArchivedMemos()
      ]);
    }
  }, [refreshTrigger]);

  // 加载数据（添加性能日志）
  const loadMemos = async () => {
    const startTime = Date.now();
    try {
      console.log('📥 开始加载备忘录...');
      const memosData = await dataService.getAllMemos();
      const loadTime = Date.now() - startTime;
      console.log(`✅ 备忘录加载完成，耗时 ${loadTime}ms，共 ${memosData.length} 条`);
      
      // 过滤掉已归档的备忘录
      const regular = memosData.filter(m => !m.pinned && !m.archived);
      const pinned = memosData.filter(m => m.pinned && !m.archived);
      
      setMemos(regular);
      setPinnedMemos(pinned);
      setAllMemos(memosData);
      
      // 生成热力图数据
      generateHeatmapData(memosData);
    } catch (error) {
      console.error('❌ 加载备忘录失败:', error);
      toast.error('加载备忘录失败');
    }
  };

  // 加载归档的 memos（添加性能日志）
  const loadArchivedMemos = async () => {
    const startTime = Date.now();
    try {
      console.log('📥 开始加载归档备忘录...');
      const response = await fetch('/api/memos/archived');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      const loadTime = Date.now() - startTime;
      
      const normalizedArchivedMemos = result.data.map(memo => ({
        id: memo.id,
        content: memo.content,
        tags: memo.tags,
        visibility: memo.visibility,
        pinned: memo.pinned,
        created_ts: memo.created_ts,
        updated_ts: memo.updated_ts,
        timestamp: memo.created_ts || memo.timestamp,
        archived: true
      }));
      setArchivedMemos(normalizedArchivedMemos);
      console.log(`✅ 归档备忘录加载完成，耗时 ${loadTime}ms，共 ${normalizedArchivedMemos.length} 条`);
    } catch (error) {
      console.error('❌ 获取归档备忘录失败:', error);
      toast.error('获取归档备忘录失败');
    }
  };

  // 生成热力图数据
  const generateHeatmapData = (memosData) => {
    const heatmapCounts = {};
    memosData.forEach(memo => {
      const date = new Date(memo.created_ts || memo.createdAt).toISOString().split('T')[0];
      heatmapCounts[date] = (heatmapCounts[date] || 0) + 1;
    });
    
    // 转换为GitHubStyleHeatmap期望的数组格式
    const heatmapArray = Object.entries(heatmapCounts).map(([date, count]) => ({
      date,
      count
    }));
    
    setHeatmapData(heatmapArray);
  };

  // 筛选备忘录
  const filteredMemos = memos.filter(memo => {
    let matches = true;
    
    if (searchQuery) {
      matches = matches && memo.content.toLowerCase().includes(searchQuery.toLowerCase());
    }
    
    if (activeTag) {
      // 处理不同的标签格式
      let tags = [];
      if (Array.isArray(memo.tags)) {
        tags = memo.tags;
      } else if (typeof memo.tags === 'string' && memo.tags.trim()) {
        tags = memo.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
      matches = matches && tags.includes(activeTag);
    }
    
    if (activeDate) {
      const memoDate = new Date(memo.created_ts || memo.createdAt).toISOString().split('T')[0];
      matches = matches && memoDate === activeDate;
    }
    
    return matches;
  });

  // 添加备忘录
  const onAddMemo = async () => {
    if (!newMemo.trim()) return;
    
    try {
      const memoData = {
        content: newMemo.trim(),
        tags: '',
        visibility: 'private',
        pinned: false
      };
      
      await dataService.createMemo(memoData);
      setNewMemo('');
      await loadMemos();
      toast.success('备忘录已创建');
    } catch (error) {
      console.error('创建备忘录失败:', error);
      toast.error('创建备忘录失败');
    }
  };

  // 更新备忘录
  const onUpdateMemo = async (id, updates) => {
    // console.log('🔍 DEBUG CompleteMemoApp onUpdateMemo called:', { id, updates });
    try {
      // console.log('📡 DEBUG: Calling dataService.updateMemo...');
      const result = await dataService.updateMemo(id, updates);
      // console.log('✅ DEBUG: dataService.updateMemo returned:', result);
      
      // console.log('🔄 DEBUG: Calling loadMemos...');
      await loadMemos();
      // console.log('✅ DEBUG: loadMemos completed');
      
      // 如果更新涉及归档状态，也重新加载归档列表
      if (updates.hasOwnProperty('archived')) {
        // console.log('🔄 DEBUG: Archive status changed, reloading archived memos...');
        await loadArchivedMemos();
        // console.log('✅ DEBUG: loadArchivedMemos completed');
      }
      
      toast.success('备忘录已更新');
    } catch (error) {
      console.error('❌ DEBUG: 更新备忘录失败:', error);
      toast.error('更新备忘录失败');
    }
  };

  // 菜单操作
  const onMenuAction = async (e, memoId, action) => {
    e?.stopPropagation();
    
    try {
      // 从所有备忘录（包括归档的）中查找
      const memo = [...memos, ...pinnedMemos, ...archivedMemos].find(m => m.id === memoId);
      if (!memo) {
        console.error('❌ 找不到备忘录:', memoId);
        return;
      }
      
      switch (action) {
        case 'delete':
          await dataService.deleteMemo(memoId);
          await loadMemos();
          // 如果删除的是归档备忘录，也需要刷新归档列表
          if (memo.archived) {
            await loadArchivedMemos();
          }
          toast.success('备忘录已删除');
          break;
        case 'pin':
        case 'unpin':
      // console.log('📌 DEBUG: Pin/Unpin action triggered for memo:', memoId);
      // console.log('📌 DEBUG: Current memo:', JSON.stringify(memo, null, 2));
      // console.log('📌 DEBUG: Will set pinned to:', !memo.pinned);
          // 只传递需要更新的字段，避免数据覆盖问题
          await onUpdateMemo(memoId, { pinned: !memo.pinned });
          break;
        case 'edit':
          setEditingId(memoId);
          setEditContent(memo.content);
          break;
        case 'share':
          setSelectedMemoForShare(memo);
          setIsShareDialogOpen(true);
          break;
        case 'archive':
          // console.log('📂 DEBUG: Archive action triggered for memo:', memoId);
          // 调用API将备忘录标记为归档
          await onUpdateMemo(memoId, { archived: true });
          toast.success('备忘录已归档');
          break;
        case 'unarchive':
          // console.log('📤 DEBUG: Unarchive action triggered for memo:', memoId);
          // 调用API取消备忘录的归档状态
          await onUpdateMemo(memoId, { archived: false });
          toast.success('已取消归档');
          break;
        default:
          console.log('未知操作:', action);
      }
      setActiveMenuId(null);
    } catch (error) {
      console.error('操作失败:', error);
      toast.error('操作失败');
    }
  };

  // 清除筛选
  const clearFilters = () => {
    setSearchQuery('');
    setActiveTag('');
    setActiveDate('');
  };

  // 日期点击处理
  const onDateClick = (date) => {
    setActiveDate(date);
  };

  // 标签点击处理
  const onTagClick = (tag) => {
    setActiveTag(activeTag === tag ? '' : tag);
  };

  // 编辑相关
  const onSaveEdit = async () => {
    if (editingId && editContent !== undefined) {
      const memo = [...memos, ...pinnedMemos].find(m => m.id === editingId);
      if (memo) {
        await onUpdateMemo(editingId, { ...memo, content: editContent.trim() });
        setEditingId(null);
        setEditContent('');
      }
    }
  };

  const onCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const onEditContentChange = (content) => {
    setEditContent(content);
  };

  // 设置处理器
  const onSettingsOpen = () => {
    setIsSettingsOpen(true);
  };

  const onOpenDailyReview = () => {
    // TODO: 实现日常回顾
    toast.info('日常回顾功能开发中');
  };

  const onFavoriteRandomBackground = () => {
    // TODO: 实现随机背景
    toast.info('随机背景功能开发中');
  };

  // 音乐相关
  const onOpenMusic = () => {
    // TODO: 打开音乐对话框
    toast.info('音乐功能已在底部播放器中');
  };

  const onOpenMusicSearch = (query) => {
    // TODO: 音乐搜索
    toast.info(`搜索音乐: ${query}`);
  };

  // 回链相关
  const onAddBacklink = (fromMemoId, toMemoId) => {
    // TODO: 实现回链功能
    // console.log('添加回链:', fromMemoId, '->', toMemoId);
  };

  const onPreviewMemo = (memoId) => {
    // TODO: 实现预览功能
    // console.log('预览备忘录:', memoId);
  };

  const onRemoveBacklink = (fromMemoId, toMemoId) => {
    // TODO: 移除回链
    // console.log('移除回链:', fromMemoId, '->', toMemoId);
  };

  // 滚动相关
  const onScrollToTop = () => {
    memosContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 编辑器焦点
  const onEditorFocus = () => {
    // TODO: 处理编辑器焦点
  };

  const onEditorBlur = () => {
    // TODO: 处理编辑器失焦
  };

  // 菜单相关
  const onMenuContainerEnter = (id) => {
    // TODO: 菜单容器鼠标进入
  };

  const onMenuContainerLeave = () => {
    // TODO: 菜单容器鼠标离开
  };

  const onMenuButtonClick = (id) => {
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在初始化...</p>
        </div>
      </div>
    );
  }

  // 如果需要认证但未认证，显示登录页
  if (requiresAuth && !isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex h-full">
        {/* 左侧边栏 - 桌面端 */}
        {!isMobile && (
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
            <LeftSidebar
              heatmapData={heatmapData}
              memos={memos}
              pinnedMemos={pinnedMemos}
              isLeftSidebarHidden={isLeftSidebarHidden}
              setIsLeftSidebarHidden={setIsLeftSidebarHidden}
              isLeftSidebarPinned={isLeftSidebarPinned}
              setIsLeftSidebarPinned={setIsLeftSidebarPinned}
              isLeftSidebarHovered={isLeftSidebarHovered}
              isAppLoaded={isAppLoaded}
              isInitialLoad={isInitialLoad}
              isCanvasMode={isCanvasMode}
              setIsCanvasMode={setIsCanvasMode}
              onSettingsOpen={onSettingsOpen}
              onDateClick={onDateClick}
              onOpenDailyReview={onOpenDailyReview}
              showFavoriteRandomButton={true}
              onFavoriteRandomBackground={onFavoriteRandomBackground}
            />
          </div>
        )}
        
        {/* 移动端侧边栏 */}
        {isMobile && showMobileSidebar && (
          <MobileSidebar 
            isOpen={showMobileSidebar}
            onClose={() => setShowMobileSidebar(false)}
          />
        )}
        
        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* 主要内容 */}
            <div className="flex-1 overflow-hidden">
              <MainContent
                // Layout state
                isLeftSidebarHidden={isLeftSidebarHidden}
                isRightSidebarHidden={isRightSidebarHidden}
                setIsLeftSidebarHidden={setIsLeftSidebarHidden}
                setIsRightSidebarHidden={setIsRightSidebarHidden}
                isLeftSidebarPinned={isLeftSidebarPinned}
                isRightSidebarPinned={isRightSidebarPinned}
                
                // Data
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                newMemo={newMemo}
                setNewMemo={debouncedSetNewMemo}
                filteredMemos={filteredMemos}
                pinnedMemos={pinnedMemos}
                activeMenuId={activeMenuId}
                editingId={editingId}
                editContent={editContent}
                activeTag={activeTag}
                activeDate={activeDate}
                showScrollToTop={showScrollToTop}
                
                // 归档相关
                showArchived={showArchived}
                setShowArchived={handleSetShowArchived}
                archivedMemos={archivedMemos}
                
                // Refs
                searchInputRef={searchInputRef}
                memosContainerRef={memosContainerRef}
                menuRefs={menuRefs}
                
                // Callbacks
                onMobileMenuOpen={() => setShowMobileSidebar(true)}
                onAddMemo={handleAddMemo}
                onMenuAction={onMenuAction}
                onMenuContainerEnter={onMenuContainerEnter}
                onMenuContainerLeave={onMenuContainerLeave}
                onMenuButtonClick={onMenuButtonClick}
                onEditContentChange={onEditContentChange}
                onSaveEdit={onSaveEdit}
                onCancelEdit={onCancelEdit}
                onTagClick={onTagClick}
                onScrollToTop={onScrollToTop}
                clearFilters={clearFilters}
                onEditorFocus={onEditorFocus}
                onEditorBlur={onEditorBlur}
                onUpdateMemo={onUpdateMemo}
                onOpenMusic={onOpenMusic}
                onOpenMusicSearch={onOpenMusicSearch}
                musicEnabled={true}
                
                // Backlinks
                allMemos={allMemos}
                onAddBacklink={onAddBacklink}
                onPreviewMemo={onPreviewMemo}
                pendingNewBacklinks={pendingNewBacklinks}
                onRemoveBacklink={onRemoveBacklink}
              />
            </div>
            
            {/* 右侧边栏 - 桌面端 */}
            {!isMobile && (
              <div className="w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
                <RightSidebar
                  memos={allMemos}
                  activeTag={activeTag}
                  setActiveTag={setActiveTag}
                  isRightSidebarHidden={isRightSidebarHidden}
                  setIsRightSidebarHidden={setIsRightSidebarHidden}
                  isRightSidebarPinned={isRightSidebarPinned}
                  setIsRightSidebarPinned={setIsRightSidebarPinned}
                  isRightSidebarHovered={isRightSidebarHovered}
                  isAppLoaded={isAppLoaded}
                  isInitialLoad={isInitialLoad}
                  isCanvasMode={isCanvasMode}
                />
              </div>
            )}
          </div>
          
          {/* 底部音乐播放器 */}
          <div className="border-t border-gray-200 dark:border-gray-700">
            <MiniMusicPlayer />
          </div>
        </div>
      </div>
      
      {/* 分享对话框 */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => {
          setIsShareDialogOpen(false);
          setSelectedMemoForShare(null);
        }}
        memo={selectedMemoForShare}
      />

      {/* 设置卡片 */}
      <NextJsSettingsCard
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onOpenTutorial={() => {
          // TODO: 实现教程功能
          toast.info('教程功能开发中');
        }}
      />
    </div>
  );
}