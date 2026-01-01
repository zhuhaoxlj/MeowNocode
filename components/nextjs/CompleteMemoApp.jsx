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

// 导入 API 模式指示器
import ApiModeIndicator from '../../src/components/ApiModeIndicator';

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
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalMemos, setTotalMemos] = useState(0);
  
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
  const loadMoreTriggerRef = useRef(null); // 用于无限滚动的触发器
  
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
  
  // 🔒 添加请求锁，防止并发请求导致的竞态条件
  const loadingLockRef = useRef(false);
  
  // 使用 useCallback 优化事件处理函数
  // 🚀 优化：接受内容参数，避免依赖异步状态更新
  const handleAddMemo = useCallback(async (contentOrData) => {
    console.log('📥 [CompleteMemoApp handleAddMemo] 接收数据:', contentOrData);

    // 兼容两种输入：字符串或对象 { content, attachmentIds }
    let memoData;

    if (typeof contentOrData === 'string') {
      // 旧的方式：直接传字符串
      if (!contentOrData.trim()) {
        console.warn('⚠️ [handleAddMemo] 内容为空');
        return;
      }
      memoData = {
        content: contentOrData.trim(),
        pinned: false
      };
      console.log('   - 使用字符串模式，memoData:', memoData);
    } else if (typeof contentOrData === 'object' && contentOrData !== null) {
      // 新的方式：传对象（参考 memos）
      const { content, attachmentIds } = contentOrData;

      console.log('   - 使用对象模式');
      console.log('     * content 长度:', content?.length || 0);
      console.log('     * attachmentIds:', attachmentIds);

      // 验证：至少要有内容或附件
      if (!content?.trim() && (!attachmentIds || attachmentIds.length === 0)) {
        console.warn('⚠️ [handleAddMemo] 内容和附件都为空');
        return;
      }

      memoData = {
        content: content?.trim() || '',
        attachmentIds: attachmentIds || [],
        pinned: false
      };

      console.log('   - 构建的 memoData:', {
        contentLength: memoData.content.length,
        attachmentIds: memoData.attachmentIds,
        pinned: memoData.pinned
      });
    } else {
      // 使用 newMemo 状态
      const memoContent = newMemo;
      if (!memoContent.trim()) {
        console.warn('⚠️ [handleAddMemo] 内容为空');
        return;
      }
      memoData = {
        content: memoContent.trim(),
        pinned: false
      };
      console.log('   - 使用状态模式，memoData:', memoData);
    }

    try {
      console.log('📡 [CompleteMemoApp handleAddMemo] 调用 dataService.createMemo，参数:', memoData);
      const created = await dataService.createMemo(memoData);
      console.log('✅ [CompleteMemoApp handleAddMemo] 创建成功，返回:', created);
      
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

  // 生成热力图数据
  const generateHeatmapData = useCallback((memosData) => {
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
  }, []);

  // 加载归档的 memos（添加性能日志）
  const loadArchivedMemos = useCallback(async () => {
    try {
      const response = await fetch('/api/memos/archived');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      
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
    } catch (error) {
      console.error('❌ 获取归档备忘录失败:', error);
      toast.error('获取归档备忘录失败');
    }
  }, []);

  // 加载首页数据（分页）- 使用 useCallback 优化
  const loadMemos = useCallback(async (resetPage = false) => {
    // 🔒 防止并发请求（竞态条件的关键修复）
    if (loadingLockRef.current) {
      console.log('⚠️ loadMemos 已被锁定，跳过本次调用');
      return;
    }
    
    console.log(`🔒 加载数据 - resetPage: ${resetPage}, currentPage: ${currentPage}`);
    loadingLockRef.current = true;
    
    try {
      const pageToLoad = resetPage ? 1 : currentPage;
      
      const result = await dataService.getMemos({ page: pageToLoad, limit: 50 });
      
      const memosData = result.memos;
      
      // 过滤掉已归档的备忘录
      const regular = memosData.filter(m => !m.pinned && !m.archived);
      const pinned = memosData.filter(m => m.pinned && !m.archived);
      
      if (resetPage) {
        // 重置数据
        console.log(`🔄 重置页面 - regular: ${regular.length}条, pinned: ${pinned.length}条`);
        console.log('   前3条:', regular.slice(0, 3).map(m => `ID${m.id}(${m.created_ts?.substring(0,10)})`));
        setMemos(regular);
        setPinnedMemos(pinned);
        setAllMemos(memosData);
        setCurrentPage(1);
      } else {
        // 追加数据（去重）
        setMemos(prev => {
          const existingIds = new Set(prev.map(m => m.uid || m.id));
          const newItems = regular.filter(m => !existingIds.has(m.uid || m.id));
          console.log(`📄 追加第${pageToLoad}页 - 新增: ${newItems.length}条, 总计: ${prev.length + newItems.length}条`);
          console.log('   新增前3条:', newItems.slice(0, 3).map(m => `ID${m.id}(${m.created_ts?.substring(0,10)})`));
          const result = [...prev, ...newItems];
          console.log('   追加后前5条:', result.slice(0, 5).map(m => `ID${m.id}(${m.created_ts?.substring(0,10)})`));
          return result;
        });
        setPinnedMemos(prev => {
          const existingIds = new Set(prev.map(m => m.uid || m.id));
          const newItems = pinned.filter(m => !existingIds.has(m.uid || m.id));
          return [...prev, ...newItems];
        });
        setAllMemos(prev => {
          const existingIds = new Set(prev.map(m => m.uid || m.id));
          const newItems = memosData.filter(m => !existingIds.has(m.uid || m.id));
          return [...prev, ...newItems];
        });
      }
      
      // 更新分页状态
      const newHasMore = result.pagination.hasMore;
      const newTotal = result.pagination.total;
      
      setHasMore(newHasMore);
      setTotalMemos(newTotal);
      
      // 生成热力图数据（使用刚加载的数据）
      if (resetPage) {
        generateHeatmapData(memosData);
      }
    } catch (error) {
      console.error('❌ 加载备忘录失败:', error);
      toast.error('加载备忘录失败');
    } finally {
      // 🔒 释放锁
      loadingLockRef.current = false;
    }
  }, [currentPage, generateHeatmapData]);

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
        await Promise.all([
          loadMemos(true), // 传入 true 以触发热力图数据生成
          loadArchivedMemos()
        ]);
        
        if (isSubscribed) {
          setIsAppLoaded(true);
          setTimeout(() => setIsInitialLoad(false), 100);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // 只依赖 isAuthenticated，避免无限循环

  // 当 refreshTrigger 变化时重新加载数据
  useEffect(() => {
    if (refreshTrigger > 0 && isAuthenticated && isAppLoaded) {
      // 移除 console.log 避免控制台打开时影响性能
      Promise.all([
        loadMemos(true), // 重置页码（内部会重置所有状态）
        loadArchivedMemos()
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, isAuthenticated, isAppLoaded]); // 不包含函数依赖，避免无限循环
  
  // 加载更多数据（使用 useCallback 避免闭包问题）
  const loadMoreMemos = useCallback(async () => {
    // 🔒 如果主加载正在进行，不要触发加载更多
    if (loadingLockRef.current) {
      console.log('⚠️ 主加载正在进行，跳过加载更多');
      return;
    }
    
    if (isLoadingMore || !hasMore) {
      console.log(`⚠️ 跳过加载更多 - isLoadingMore: ${isLoadingMore}, hasMore: ${hasMore}`);
      return;
    }
    
    console.log(`📄 开始加载更多 - 当前页: ${currentPage}`);
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      
      const result = await dataService.getMemos({ page: nextPage, limit: 50 });
      const memosData = result.memos;
      
      // 过滤掉已归档的备忘录
      const regular = memosData.filter(m => !m.pinned && !m.archived);
      const pinned = memosData.filter(m => m.pinned && !m.archived);
      
      // 追加数据（去重）
      setMemos(prev => {
        const existingIds = new Set(prev.map(m => m.uid || m.id));
        const newItems = regular.filter(m => !existingIds.has(m.uid || m.id));
        return [...prev, ...newItems];
      });
      setPinnedMemos(prev => {
        const existingIds = new Set(prev.map(m => m.uid || m.id));
        const newItems = pinned.filter(m => !existingIds.has(m.uid || m.id));
        return [...prev, ...newItems];
      });
      setAllMemos(prev => {
        const existingIds = new Set(prev.map(m => m.uid || m.id));
        const newItems = memosData.filter(m => !existingIds.has(m.uid || m.id));
        return [...prev, ...newItems];
      });
      
      // 更新分页状态
      setCurrentPage(nextPage);
      setHasMore(result.pagination.hasMore);
      setTotalMemos(result.pagination.total);
      
    } catch (error) {
      console.error('❌ 加载更多失败:', error);
      toast.error('加载更多失败');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, currentPage]);
  
  // 设置无限滚动监听器（IntersectionObserver）
  useEffect(() => {
    // 使用 setTimeout 确保 DOM 已渲染
    const setupObserver = () => {
      const trigger = loadMoreTriggerRef.current;
      
      if (!trigger) {
        return null;
      }
      
      if (!hasMore) {
        return null;
      }
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            // 🔒 增加更严格的检查，防止在初始加载时触发
            if (entry.isIntersecting && hasMore && !isLoadingMore && !loadingLockRef.current) {
              console.log('🔍 IntersectionObserver 触发 - 准备加载更多');
              loadMoreMemos();
            }
          });
        },
        {
          root: null, // 使用视口作为根
          rootMargin: '200px', // 提前 200px 开始加载
          threshold: 0.1
        }
      );
      
      observer.observe(trigger);
      
      return observer;
    };
    
    // ⚡ 增加延迟，确保第一页完全加载完成后再设置监听器
    const timer = setTimeout(() => {
      // 🔒 只有在没有加载锁时才设置监听器
      if (!loadingLockRef.current) {
        const observer = setupObserver();
        if (observer) {
          // 保存到 ref 以便清理
          loadMoreTriggerRef.observer = observer;
        }
      }
    }, 500); // 从 100ms 增加到 500ms
    
    return () => {
      clearTimeout(timer);
      if (loadMoreTriggerRef.observer) {
        loadMoreTriggerRef.observer.disconnect();
        delete loadMoreTriggerRef.observer;
      }
    };
  }, [hasMore, isLoadingMore, currentPage, memos.length, loadMoreMemos]);

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
      const updatedMemo = result;
      
      // 🚀 如果只是内容更新（不涉及置顶/归档状态变化），使用原地更新
      const isStatusChange = updates.hasOwnProperty('pinned') || updates.hasOwnProperty('archived');
      
      if (!isStatusChange) {
        // 原地更新，保持位置不变
        console.log(`✏️ 原地更新 ID${id} - created_ts: ${updatedMemo.created_ts?.substring(0,19)}`);
        setMemos(prev => {
          const result = prev.map(m => (m.id === id || m.uid === id) ? updatedMemo : m);
          console.log('   更新后前5条:', result.slice(0, 5).map(m => `ID${m.id}(${m.created_ts?.substring(0,10)})`));
          return result;
        });
        setPinnedMemos(prev => prev.map(m => (m.id === id || m.uid === id) ? updatedMemo : m));
        setArchivedMemos(prev => prev.map(m => (m.id === id || m.uid === id) ? updatedMemo : m));
        setAllMemos(prev => prev.map(m => (m.id === id || m.uid === id) ? updatedMemo : m));
        
        toast.success('备忘录已更新');
        return;
      }
      
      // 🔄 状态变化时才需要移动位置
      
      // 1. 从所有列表中移除该 memo
      setMemos(prev => prev.filter(m => m.id !== id && m.uid !== id));
      setPinnedMemos(prev => prev.filter(m => m.id !== id && m.uid !== id));
      setArchivedMemos(prev => prev.filter(m => m.id !== id && m.uid !== id));
      setAllMemos(prev => prev.filter(m => m.id !== id && m.uid !== id));
      
      // 辅助函数：按时间降序插入 memo（保持正确的排序）
      const insertMemoSorted = (list, memo) => {
        const newList = [...list];
        // 找到第一个创建时间早于当前 memo 的位置
        const insertIndex = newList.findIndex(m => {
          const memoTime = new Date(memo.created_ts || memo.createdAt).getTime();
          const itemTime = new Date(m.created_ts || m.createdAt).getTime();
          return itemTime < memoTime;
        });
        
        if (insertIndex === -1) {
          // 如果没找到，说明是最早的，添加到末尾
          return [...newList, memo];
        } else {
          // 插入到正确的位置
          newList.splice(insertIndex, 0, memo);
          return newList;
        }
      };
      
      // 2. 根据新状态添加到对应列表（按时间顺序）
      if (updatedMemo.archived) {
        // 归档：添加到归档列表，按时间排序
        setArchivedMemos(prev => insertMemoSorted(prev, updatedMemo));
      } else {
        // 未归档：根据置顶状态添加，按时间排序
        setAllMemos(prev => insertMemoSorted(prev, updatedMemo));
        
        if (updatedMemo.pinned) {
          setPinnedMemos(prev => insertMemoSorted(prev, updatedMemo));
        } else {
          setMemos(prev => insertMemoSorted(prev, updatedMemo));
        }
      }
      
      // 3. 更新总数
      if (updates.hasOwnProperty('archived')) {
        if (updates.archived) {
          setTotalMemos(prev => Math.max(0, prev - 1));
        } else {
          setTotalMemos(prev => prev + 1);
        }
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
      // 从所有备忘录（包括归档的）中查找 - 同时检查 id 和 uid
      const memo = [...memos, ...pinnedMemos, ...archivedMemos].find(m => m.id === memoId || m.uid === memoId);

      if (!memo) {
        console.error('❌ 找不到备忘录:', memoId);
        return;
      }

      switch (action) {
        case 'delete':
          await dataService.deleteMemo(memoId);
          
          // 🚀 直接从前端状态移除
          setMemos(prev => prev.filter(m => m.id !== memoId && m.uid !== memoId));
          setPinnedMemos(prev => prev.filter(m => m.id !== memoId && m.uid !== memoId));
          setArchivedMemos(prev => prev.filter(m => m.id !== memoId && m.uid !== memoId));
          setAllMemos(prev => prev.filter(m => m.id !== memoId && m.uid !== memoId));
          
          // 更新总数
          if (!memo.archived) {
            setTotalMemos(prev => Math.max(0, prev - 1));
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

          // ✅ 确保 content 不为 undefined/null，防止输入框为空
          let editableContent = memo.content || '';

          // 🚀 如果 content 中没有有效的图片引用但有 resourceMeta，添加占位符
          if (memo.resourceMeta && memo.resourceMeta.length > 0) {
            const hasValidImageReference = /!\[.*?\]\((?:data:|placeholder-|https?:)/.test(editableContent);
            const hasInvalidImageReference = /!\[.*?\]\(\.\/local\//.test(editableContent);

            if (!hasValidImageReference) {
              // 清除无效引用
              if (hasInvalidImageReference) {
                editableContent = editableContent.replace(/!\[.*?\]\(\.\/local\/[^)]*\)\s*/g, '');
              }

              // 添加 resourceMeta 的占位符
              const imageReferences = memo.resourceMeta
                .filter(r => r.type && r.type.startsWith('image/'))
                .map(r => `![${r.filename}](placeholder-${r.id})`)
                .join('\n');

              if (imageReferences) {
                editableContent = editableContent.trim()
                  ? `${editableContent}\n\n${imageReferences}`
                  : imageReferences;
              }
            }
          }

          setEditContent(editableContent);
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
          <LeftSidebar
            heatmapData={heatmapData}
            memos={allMemos}
            pinnedMemos={[]}
            totalMemos={totalMemos}
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
                
                // 分页相关
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                totalMemos={totalMemos}
                loadMoreTriggerRef={loadMoreTriggerRef}
                
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
      
      {/* API 模式指示器 */}
      <ApiModeIndicator />
    </div>
  );
}