import React, { useState, useEffect, useRef } from 'react';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import MainContent from '@/components/MainContent';
import MobileSidebar from '@/components/MobileSidebar';
import SettingsCard from '@/components/SettingsCard';
import ShareDialog from '@/components/ShareDialog';
import { useSettings } from '@/context/SettingsContext';

const Index = () => {
  // State management
  const [memos, setMemos] = useState([]);
  const [newMemo, setNewMemo] = useState('');
  const [filteredMemos, setFilteredMemos] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [activeDate, setActiveDate] = useState(null); // 新增日期筛选状态
  const [heatmapData, setHeatmapData] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [pinnedMemos, setPinnedMemos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeftSidebarHidden, setIsLeftSidebarHidden] = useState(false);
  const [isRightSidebarHidden, setIsRightSidebarHidden] = useState(false);
  const [isLeftSidebarPinned, setIsLeftSidebarPinned] = useState(true);
  const [isRightSidebarPinned, setIsRightSidebarPinned] = useState(true);
  const [isLeftSidebarHovered, setIsLeftSidebarHovered] = useState(false);
  const [isRightSidebarHovered, setIsRightSidebarHovered] = useState(false);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [selectedMemo, setSelectedMemo] = useState(null);

  // Refs
  const hoverTimerRef = useRef(null);
  const menuRefs = useRef({});
  const searchInputRef = useRef(null);
  const memosContainerRef = useRef(null);

  // Context
  const { backgroundConfig } = useSettings();

  // 控制移动端侧栏打开时的页面滚动
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileSidebarOpen]);

  // 处理左侧栏鼠标悬停事件
  useEffect(() => {
    let hoverTimer;
    
    const handleMouseMove = (e) => {
      if (!isLeftSidebarPinned) {
        if (e.clientX < 50) {
          // 清除之前的定时器
          if (hoverTimer) {
            clearTimeout(hoverTimer);
          }
          // 设置新的定时器，延迟显示侧栏
          hoverTimer = setTimeout(() => {
            setIsLeftSidebarHovered(true);
          }, 150);
        } else if (e.clientX > 350 && isLeftSidebarHovered) {
          // 清除之前的定时器
          if (hoverTimer) {
            clearTimeout(hoverTimer);
          }
          // 设置新的定时器，延迟隐藏侧栏
          hoverTimer = setTimeout(() => {
            setIsLeftSidebarHovered(false);
          }, 200);
        }
      }
    };

    if (!isLeftSidebarPinned) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
    };
  }, [isLeftSidebarPinned, isLeftSidebarHovered]);

  // 处理右侧栏鼠标悬停事件
  useEffect(() => {
    let hoverTimer;
    
    const handleMouseMove = (e) => {
      if (!isRightSidebarPinned) {
        if (e.clientX > window.innerWidth - 50) {
          // 清除之前的定时器
          if (hoverTimer) {
            clearTimeout(hoverTimer);
          }
          // 设置新的定时器，延迟显示侧栏
          hoverTimer = setTimeout(() => {
            setIsRightSidebarHovered(true);
          }, 150);
        } else if (e.clientX < window.innerWidth - 350 && isRightSidebarHovered) {
          // 清除之前的定时器
          if (hoverTimer) {
            clearTimeout(hoverTimer);
          }
          // 设置新的定时器，延迟隐藏侧栏
          hoverTimer = setTimeout(() => {
            setIsRightSidebarHovered(false);
          }, 200);
        }
      }
    };

    if (!isRightSidebarPinned) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (hoverTimer) {
        clearTimeout(hoverTimer);
      }
    };
  }, [isRightSidebarPinned, isRightSidebarHovered]);

  // 监听memos列表滚动，控制回到顶部按钮显示
  useEffect(() => {
    const container = memosContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setShowScrollToTop(container.scrollTop > 200);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // 回到顶部功能
  const scrollToTop = () => {
    if (memosContainerRef.current) {
      memosContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // 从localStorage加载数据
  useEffect(() => {
    const savedMemos = localStorage.getItem('memos');
    const savedPinned = localStorage.getItem('pinnedMemos');
    const savedLeftSidebarPinned = localStorage.getItem('isLeftSidebarPinned');
    const savedRightSidebarPinned = localStorage.getItem('isRightSidebarPinned');
    
    if (savedMemos) {
      try {
        const parsedMemos = JSON.parse(savedMemos);
        const normalizedMemos = parsedMemos.map(memo => ({
          id: memo.id || Date.now() + Math.random(),
          content: memo.content || '',
          tags: memo.tags || [],
          timestamp: memo.timestamp || memo.createdAt || new Date().toISOString(),
          lastModified: memo.lastModified || memo.updatedAt || new Date().toISOString(),
          createdAt: memo.createdAt || memo.timestamp || new Date().toISOString(),
          updatedAt: memo.updatedAt || memo.lastModified || new Date().toISOString()
        }));
        setMemos(normalizedMemos);
      } catch (e) {
        console.error('Failed to parse memos from localStorage', e);
      }
    }
    
    if (savedPinned) {
      try {
        setPinnedMemos(JSON.parse(savedPinned));
      } catch (e) {
        console.error('Failed to parse pinned memos from localStorage', e);
      }
    }

    if (savedLeftSidebarPinned !== null) {
      try {
        setIsLeftSidebarPinned(JSON.parse(savedLeftSidebarPinned));
      } catch (e) {
        console.error('Failed to parse left sidebar pinned state from localStorage', e);
      }
    }

    if (savedRightSidebarPinned !== null) {
      try {
        setIsRightSidebarPinned(JSON.parse(savedRightSidebarPinned));
      } catch (e) {
        console.error('Failed to parse right sidebar pinned state from localStorage', e);
      }
    }
    
    // 设置应用已加载，避免初始动画
    setTimeout(() => {
      setIsAppLoaded(true);
      setIsInitialLoad(false);
    }, 100);
  }, []);

  // 保存数据到localStorage
  useEffect(() => {
    localStorage.setItem('memos', JSON.stringify(memos));
    localStorage.setItem('pinnedMemos', JSON.stringify(pinnedMemos));
  }, [memos, pinnedMemos]);

  // 保存侧栏固定状态到localStorage
  useEffect(() => {
    localStorage.setItem('isLeftSidebarPinned', JSON.stringify(isLeftSidebarPinned));
  }, [isLeftSidebarPinned]);

  useEffect(() => {
    localStorage.setItem('isRightSidebarPinned', JSON.stringify(isRightSidebarPinned));
  }, [isRightSidebarPinned]);

  // 添加新memo
  const addMemo = () => {
    if (newMemo.trim() === '') return;

    const extractedTags = [...newMemo.matchAll(/(?:^|\s)#([^\s#][\u4e00-\u9fa5a-zA-Z0-9_\/]*)/g)]
      .map(match => match[1])
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .filter(tag => tag.length > 0);

    const newMemoObj = {
      id: Date.now(),
      content: newMemo,
      tags: extractedTags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };

    setMemos([newMemoObj, ...memos]);
    setNewMemo('');
  };

  // 更新热力图数据
  useEffect(() => {
    const generateHeatmapData = () => {
      const data = [];
      const today = new Date();
      const memoCountByDate = {};
      
      [...memos, ...pinnedMemos].forEach(memo => {
        const createdAt = memo.createdAt || memo.timestamp || new Date().toISOString();
        const date = createdAt.split('T')[0];
        memoCountByDate[date] = (memoCountByDate[date] || 0) + 1;
      });
      
      for (let i = 0; i < 365; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        data.push({
          date: dateStr,
          count: memoCountByDate[dateStr] || 0
        });
      }
      
      return data;
    };
    
    setHeatmapData(generateHeatmapData());
    setFilteredMemos(memos);
  }, [memos, pinnedMemos]);

  // 按标签或日期过滤
  useEffect(() => {
    let result = memos;
    
    // 按标签过滤
    if (activeTag) {
      result = result.filter(memo => {
        if (memo.tags.includes(activeTag)) {
          return true;
        }

        if (!activeTag.includes('/')) {
          return memo.tags.some(tag => tag.startsWith(activeTag + '/'));
        }

        return false;
      });
    }
    
    // 按日期过滤
    if (activeDate) {
      result = result.filter(memo => {
        const memoDate = memo.createdAt.split('T')[0];
        return memoDate === activeDate;
      });
    }
    
    setFilteredMemos(result);
  }, [activeTag, activeDate, memos]);

  // 处理搜索功能
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMemos(memos);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = memos.filter(memo => {
      if (memo.content.toLowerCase().includes(query)) {
        return true;
      }
      
      if (memo.tags.some(tag => tag.toLowerCase().includes(query))) {
        return true;
      }
      
      return false;
    });

    setFilteredMemos(results);
  }, [searchQuery, memos]);

  // 处理菜单操作
  const handleMenuAction = (e, memoId, action) => {
    e.stopPropagation();

    switch (action) {
      case 'pin':
        const memoToPin = memos.find(memo => memo.id === memoId);
        if (memoToPin && !pinnedMemos.some(p => p.id === memoId)) {
          const pinnedMemo = {
            ...memoToPin,
            isPinned: true,
            pinnedAt: new Date().toISOString()
          };
          setPinnedMemos([pinnedMemo, ...pinnedMemos]);
          setMemos(memos.filter(memo => memo.id !== memoId));
        }
        break;
      case 'unpin':
        const memoToUnpin = pinnedMemos.find(memo => memo.id === memoId);
        if (memoToUnpin) {
          const unpinnedMemo = { ...memoToUnpin, isPinned: false };
          delete unpinnedMemo.pinnedAt;
          setMemos([unpinnedMemo, ...memos]);
          setPinnedMemos(pinnedMemos.filter(memo => memo.id !== memoId));
        }
        break;
      case 'edit':
        const memoToEdit = [...memos, ...pinnedMemos].find(memo => memo.id === memoId);
        if (memoToEdit) {
          setEditingId(memoId);
          setEditContent(memoToEdit.content);
        }
        break;
      case 'share':
        const memoToShare = [...memos, ...pinnedMemos].find(memo => memo.id === memoId);
        if (memoToShare) {
          setSelectedMemo(memoToShare);
          setIsShareDialogOpen(true);
        }
        break;
      case 'delete':
        setMemos(memos.filter(memo => memo.id !== memoId));
        setPinnedMemos(pinnedMemos.filter(memo => memo.id !== memoId));
        break;
      default:
        break;
    }
    setActiveMenuId(null);
  };

  // 保存编辑
  const saveEdit = (memoId) => {
    const extractedTags = [...editContent.matchAll(/(?:^|\s)#([^\s#][\u4e00-\u9fa5a-zA-Z0-9_\/]*)/g)]
      .map(match => match[1])
      .filter((tag, index, self) => self.indexOf(tag) === index)
      .filter(tag => tag.length > 0);

    const updatedMemos = memos.map(memo =>
      memo.id === memoId ? {
        ...memo,
        content: editContent,
        tags: extractedTags,
        updatedAt: new Date().toISOString()
      } : memo
    );

    const updatedPinned = pinnedMemos.map(memo =>
      memo.id === memoId ? {
        ...memo,
        content: editContent,
        tags: extractedTags,
        updatedAt: new Date().toISOString()
      } : memo
    );

    setMemos(updatedMemos);
    setPinnedMemos(updatedPinned);
    setEditingId(null);
    setEditContent('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  // 处理菜单容器的鼠标事件
  const handleMenuContainerEnter = (memoId) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    if (activeMenuId === memoId) {
      return;
    }

    hoverTimerRef.current = setTimeout(() => {
      setActiveMenuId(memoId);
    }, 300);
  };

  const handleMenuContainerLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }

    hoverTimerRef.current = setTimeout(() => {
      setActiveMenuId(null);
    }, 150);
  };

  // 处理点击菜单按钮
  const handleMenuButtonClick = (memoId) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    setActiveMenuId(activeMenuId === memoId ? null : memoId);
  };

  // 点击页面其他区域关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenuId && menuRefs.current[activeMenuId]) {
        const menuElement = menuRefs.current[activeMenuId];
        if (!menuElement.contains(event.target)) {
          setActiveMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  // 添加Ctrl+K快捷键聚焦搜索框
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 处理热力图日期点击
  const handleDateClick = (dateStr) => {
    setActiveDate(dateStr === activeDate ? null : dateStr);
    // 清除标签筛选
    setActiveTag(null);
  };

  // 清除所有筛选条件
  const clearFilters = () => {
    setActiveTag(null);
    setActiveDate(null);
  };

  // 生成背景样式
  const backgroundStyle = backgroundConfig.imageUrl ? {
    backgroundImage: `url(${backgroundConfig.imageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    filter: `brightness(${backgroundConfig.brightness}%)`,
  } : {};

  const overlayStyle = backgroundConfig.imageUrl ? {
    backdropFilter: `blur(${backgroundConfig.blur}px)`,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  } : {};

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row lg:overflow-hidden lg:h-screen relative"
      style={backgroundStyle}
    >
      {/* 背景遮罩层 */}
      {backgroundConfig.imageUrl && (
        <div
          className="absolute inset-0 z-0"
          style={overlayStyle}
        />
      )}

      {/* 主内容区域 */}
      <div className="relative z-10 min-h-screen lg:h-full w-full flex flex-col lg:flex-row">
        
        {/* 左侧热力图区域 */}
        <LeftSidebar
          heatmapData={heatmapData}
          isLeftSidebarHidden={isLeftSidebarHidden}
          setIsLeftSidebarHidden={setIsLeftSidebarHidden}
          isLeftSidebarPinned={isLeftSidebarPinned}
          setIsLeftSidebarPinned={setIsLeftSidebarPinned}
          isLeftSidebarHovered={isLeftSidebarHovered}
          isAppLoaded={isAppLoaded}
          isInitialLoad={isInitialLoad}
          onSettingsOpen={() => setIsSettingsOpen(true)}
          onDateClick={handleDateClick}
        />

        {/* 中央主内容区 */}
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
          setNewMemo={setNewMemo}
          filteredMemos={filteredMemos}
          pinnedMemos={pinnedMemos}
          activeMenuId={activeMenuId}
          editingId={editingId}
          editContent={editContent}
          activeTag={activeTag}
          activeDate={activeDate} // 传递日期筛选状态
          showScrollToTop={showScrollToTop}
          
          // Refs
          searchInputRef={searchInputRef}
          memosContainerRef={memosContainerRef}
          menuRefs={menuRefs}
          
          // Callbacks
          onMobileMenuOpen={() => setIsMobileSidebarOpen(true)}
          onAddMemo={addMemo}
          onMenuAction={handleMenuAction}
          onMenuContainerEnter={handleMenuContainerEnter}
          onMenuContainerLeave={handleMenuContainerLeave}
          onMenuButtonClick={handleMenuButtonClick}
          onEditContentChange={setEditContent}
          onSaveEdit={saveEdit}
          onCancelEdit={cancelEdit}
          onTagClick={setActiveTag}
          onScrollToTop={scrollToTop}
          clearFilters={clearFilters} // 传递清除筛选函数
        />

        {/* 右侧标签管理区 */}
        <RightSidebar
          memos={[...memos, ...pinnedMemos]}
          activeTag={activeTag}
          setActiveTag={setActiveTag}
          isRightSidebarHidden={isRightSidebarHidden}
          setIsRightSidebarHidden={setIsRightSidebarHidden}
          isRightSidebarPinned={isRightSidebarPinned}
          setIsRightSidebarPinned={setIsRightSidebarPinned}
          isRightSidebarHovered={isRightSidebarHovered}
          isAppLoaded={isAppLoaded}
          isInitialLoad={isInitialLoad}
        />
      </div>

      {/* 移动端侧栏 */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        heatmapData={heatmapData}
        memos={[...memos, ...pinnedMemos]}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        onDateClick={handleDateClick}
      />

      {/* 设置卡片 */}
      <SettingsCard
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* 分享图对话框 */}
      <ShareDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        memo={selectedMemo}
      />
    </div>
  );
};

export default Index;
