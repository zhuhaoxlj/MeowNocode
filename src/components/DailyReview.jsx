import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ContentRenderer from '@/components/ContentRenderer';
import { useTheme } from '@/context/ThemeContext';
import { toast } from 'sonner';

/**
 * DailyReview 每日回顾弹窗
 * Props:
 * - isOpen: boolean 是否打开
 * - onClose: () => void 关闭回调
 * - memos: Memo[] 全量memos（包含置顶）
 * - onTagClick?: (tag: string|null) => void 标签点击（可选）
 */
const DailyReview = ({ isOpen, onClose, memos = [], onTagClick }) => {
  const { themeColor, currentFont } = useTheme();
  const focusRef = useRef(null);
  const STORAGE_KEY = 'dailyReviewStatusV1';
  // 将日期标准化为本地时区的 YYYY-MM-DD，避免 UTC 偏移导致显示错误
  const toLocalYMD = (input) => {
    const d = input instanceof Date ? input : new Date(input);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = toLocalYMD(new Date());
  const [activeDateFilter, setActiveDateFilter] = useState(todayStr); // 默认仅今日
  const [reviewStatus, setReviewStatus] = useState({}); // { [memoId]: { [dateStr]: 'PASS'|'FAIL' } }
  const [currentMemoId, setCurrentMemoId] = useState(null);
  const formatShort = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const loadStatus = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };
  const saveStatus = (data) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  };
  const getDateStr = (m) => {
    const src = m?.createdAt || m?.timestamp;
    return src ? toLocalYMD(src) : todayStr;
  };
  const getStatus = (memoId, dateStr) => reviewStatus?.[memoId]?.[dateStr] || 'FAIL';
  const setStatus = (memoId, dateStr, status) => {
    setReviewStatus(prev => {
      const next = { ...prev, [memoId]: { ...(prev[memoId] || {}), [dateStr]: status } };
      saveStatus(next);
      return next;
    });
  };
  const resetDateToFail = (dateStr) => {
    const dateMemos = memos.filter(m => getDateStr(m) === dateStr);
    setReviewStatus(prev => {
      const next = { ...prev };
      dateMemos.forEach(m => {
        next[m.id] = { ...(next[m.id] || {}), [dateStr]: 'FAIL' };
      });
      saveStatus(next);
      return next;
    });
    toast.success(`已重置 ${dateStr} 的 ${dateMemos.length} 条为 FAIL`);
  };

  // FAIL 池（根据日期筛选）
  const failPool = useMemo(() => {
    const pool = memos.filter(m => {
      const d = getDateStr(m);
      if (activeDateFilter && d !== activeDateFilter) return false;
      return getStatus(m.id, d) === 'FAIL';
    });
    // 按更新时间排序，便于稳定性
    return pool.sort((a, b) => new Date(b.updatedAt || b.lastModified || b.createdAt || b.timestamp) - new Date(a.updatedAt || a.lastModified || a.createdAt || a.timestamp));
  }, [memos, reviewStatus, activeDateFilter]);

  // 当前 memo
  const currentMemo = useMemo(() => {
    return failPool.find(m => m.id === currentMemoId) || null;
  }, [failPool, currentMemoId]);

  const pickRandomFromPool = (excludeId = null) => {
    if (!failPool.length) return null;
    if (failPool.length === 1) return failPool[0].id;
    let candidates = failPool.map(m => m.id);
    if (excludeId) candidates = candidates.filter(id => id !== excludeId);
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  };

  // 打开时加载状态、设置焦点
  useEffect(() => {
    if (isOpen) {
      setReviewStatus(loadStatus());
    }
    if (isOpen && focusRef.current) {
      // 延迟以确保对话框内容已挂载
      const t = setTimeout(() => {
        try { focusRef.current.focus(); } catch {}
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // 当池或过滤变化时，确保 currentMemo 存在
  useEffect(() => {
    if (!isOpen) return;
    if (!currentMemoId || !failPool.some(m => m.id === currentMemoId)) {
      const nextId = pickRandomFromPool(null);
      setCurrentMemoId(nextId);
    }
  }, [isOpen, failPool, currentMemoId]);

  // 键盘事件：下=PASS，上=从PASS改FAIL；左右=随机切换
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      // 避免在输入框中触发
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (!currentMemoId) return;
      const memo = memos.find(m => m.id === currentMemoId);
      const d = memo ? getDateStr(memo) : todayStr;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (getStatus(currentMemoId, d) !== 'PASS') {
          setStatus(currentMemoId, d, 'PASS');
          toast.success('已标记为 PASS');
        } else {
          toast.info('已是 PASS');
        }
        // 自动跳到下一个随机 FAIL
        const nextId = pickRandomFromPool(currentMemoId);
        setCurrentMemoId(nextId);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (getStatus(currentMemoId, d) === 'PASS') {
          setStatus(currentMemoId, d, 'FAIL');
          toast.success('已标记为 FAIL');
        } else {
          toast.info('已是 FAIL');
        }
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextId = pickRandomFromPool(currentMemoId);
        setCurrentMemoId(nextId);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, currentMemoId, reviewStatus, memos, activeDateFilter]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogPortal>
  <DialogOverlay className="bg-black/20 backdrop-blur-sm" />
        {/* 自定义内容容器（不渲染 Overlay，彻底去除外层深色区域） */}
        <DialogPrimitive.Content
          className="daily-review-content fixed left-1/2 top-1/2 z-50 grid w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 gap-4 p-2 sm:p-3 bg-transparent border-none shadow-none focus:outline-none focus-visible:outline-none"
        >
        {failPool.length === 0 || !currentMemo ? (
          <div className="flex items-center justify-center p-10 text-center">
            <div className="space-y-2">
              <div className="text-base sm:text-lg font-medium">没有需要复习的卡片</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">按日期胶囊可切换筛选，或用上/下键调整状态</div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <Carousel
              opts={{ align: 'center', loop: false, duration: 20 }}
              className="w-full focus:outline-none focus-visible:outline-none outline-none ring-0"
              ref={focusRef}
              tabIndex={0}
            >
              <CarouselContent>
                {currentMemo && (
                  <CarouselItem key={currentMemo.id} className="basis-full">
                    <div className="relative">
                      {/* 单层卡片：移除外层套卡，仅保留内容卡片 */}
                      <div
                        className={`relative rounded-2xl p-5 sm:p-7 shadow-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/98 dark:bg-gray-900/85 backdrop-blur-sm ${currentFont !== 'default' ? 'custom-font-content' : ''}`}
                        style={{ maxHeight: '60vh', minHeight: '300px' }}
                      >
            {/* 日期信息：右下角 + 重置按钮 */
            }
                        <div className="absolute bottom-2 right-2 flex items-center gap-1">
                          {/* 重置按钮（淡色，hover 变深） */}
                          <button
                            onClick={(e) => { e.stopPropagation(); resetDateToFail(getDateStr(currentMemo)); }}
                            className="px-1.5 py-0.5 rounded-full text-[11px] leading-none border transition-colors text-gray-400/70 border-gray-200/40 dark:text-gray-300/50 dark:border-gray-700/40 hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-200 dark:hover:border-gray-600 bg-transparent"
                            title="重置当日为 FAIL"
                          >
                            ×
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const d = getDateStr(currentMemo);
                              setActiveDateFilter(prev => prev === d ? null : d);
                            }}
                            className="text-[11px] leading-none px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 border"
                            style={activeDateFilter
                              ? { borderColor: themeColor, color: themeColor, boxShadow: `inset 0 0 0 1px ${themeColor}` }
                              : { borderColor: 'rgba(229,231,235,0.6)' }}
                            title={activeDateFilter
                              ? `当前筛选：${activeDateFilter}（点击切换为全部）`
                              : `未筛选（点击筛选到：${getDateStr(currentMemo)}）`}
                          >
                            {formatShort(activeDateFilter || getDateStr(currentMemo))}
                          </button>
                        </div>
                        <div className="overflow-y-auto pr-2 scrollbar-transparent">
                          <ContentRenderer
                            content={currentMemo.content}
                            activeTag={null}
                            onTagClick={onTagClick || (() => {})}
                          />
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                )}
              </CarouselContent>
              <CarouselPrevious className="-left-6 sm:-left-10 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 shadow-md" />
              <CarouselNext className="-right-6 sm:-right-10 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 border border-gray-200/60 dark:border-gray-700/60 shadow-md" />
            </Carousel>
          </div>
        )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};

export default DailyReview;
