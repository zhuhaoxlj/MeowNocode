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
  const [isFlipped, setIsFlipped] = useState(false); // 是否翻到背面显示双链
  const [backlinkIndex, setBacklinkIndex] = useState(0); // 背面当前显示的双链索引
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

  // 当前 memo 的双链列表（按时间降序，存在性校验）
  const linkedMemos = useMemo(() => {
    if (!currentMemo) return [];
    const ids = Array.isArray(currentMemo.backlinks) ? currentMemo.backlinks : [];
    const list = ids
      .map(id => memos.find(m => m.id === id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt || b.lastModified || b.createdAt || b.timestamp) - new Date(a.updatedAt || a.lastModified || a.createdAt || a.timestamp));
    return list;
  }, [currentMemo, memos]);

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

  // 当切换当前 memo 或池发生变化时，重置翻转与背面索引
  useEffect(() => {
    setIsFlipped(false);
    setBacklinkIndex(0);
  }, [currentMemoId, failPool.length, activeDateFilter]);

  // 键盘事件：
  // - 空格：在每日回顾模式下翻转当前卡片，显示其双链（若无双链则提示不翻转）
  // - 正面：下=PASS，上=FAIL；左右=随机切换 FAIL 池
  // - 背面：左右=在双链中切换；上/下禁用（背面无 PASS/FAIL）
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      // 避免在输入框中触发
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (!currentMemoId) return;
      const memo = memos.find(m => m.id === currentMemoId);
      const d = memo ? getDateStr(memo) : todayStr;

      // 空格：翻转
      if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
        e.preventDefault();
        if (!isFlipped) {
          if (linkedMemos.length === 0) {
            toast.info('该卡片暂无双链');
            return;
          }
          setBacklinkIndex(0);
          setIsFlipped(true);
        } else {
          setIsFlipped(false);
        }
        return;
      }

      // 背面逻辑：只处理左右切换双链，其余忽略
      if (isFlipped) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          if (linkedMemos.length <= 1) return;
          setBacklinkIndex(prev => {
            const n = linkedMemos.length;
            if (n === 0) return 0;
            if (e.key === 'ArrowLeft') return (prev - 1 + n) % n;
            return (prev + 1) % n;
          });
        }
        // 背面无 PASS/FAIL
        return;
      }

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
  }, [isOpen, currentMemoId, reviewStatus, memos, activeDateFilter, isFlipped, linkedMemos.length]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogPortal>
  <DialogOverlay className="bg-black/20 backdrop-blur-sm" />
        {/* 自定义内容容器（不渲染 Overlay，彻底去除外层深色区域） */}
        <DialogPrimitive.Content
          className="daily-review-content fixed left-1/2 top-1/2 z-50 grid w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 gap-4 p-2 sm:p-3 bg-transparent border-none shadow-none focus:outline-none focus-visible:outline-none"
        >
  {/* A11y: Title & Description for DialogContent (visually hidden) */}
  <DialogPrimitive.Title className="sr-only">每日回顾</DialogPrimitive.Title>
  <DialogPrimitive.Description className="sr-only">使用上下键标记 PASS/FAIL，空格翻转查看双链，左右切换。</DialogPrimitive.Description>
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
                    <div className="relative" style={{ perspective: '1200px' }}>
                      {/* 翻转容器 */}
                      <div
                        className={`relative transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform`}
                        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', height: 'clamp(260px, 50vh, 58vh)' }}
                      >
                        {/* 正面 */}
                        <div
                          className={`absolute inset-0 rounded-2xl p-5 sm:p-7 shadow-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/98 dark:bg-gray-900/85 backdrop-blur-sm ${currentFont !== 'default' ? 'custom-font-content' : ''}`}
                          style={{ height: '100%', backfaceVisibility: 'hidden' }}
                        >
                          {/* 日期信息：右下角 + 重置按钮 */}
                          <div className="absolute bottom-2 right-2 flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); resetDateToFail(getDateStr(currentMemo)); }}
                              className="px-1.5 py-0.5 rounded-full text-[11px] leading-none border transition-colors text-gray-400/70 border-gray-200/40 dark:text-gray-300/50 dark:border-gray-700/40 hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-200 dark:hover:border-gray-600 bg-transparent"
                              aria-label="重置当日为 FAIL"
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
                              aria-label="切换日期筛选"
                            >
                              {formatShort(activeDateFilter || getDateStr(currentMemo))}
                            </button>
                          </div>
                          <div className="overflow-y-auto pr-2 scrollbar-transparent h-full">
                            <ContentRenderer
                              content={currentMemo.content}
                              activeTag={null}
                              onTagClick={onTagClick || (() => {})}
                            />
                          </div>
                        </div>

                        {/* 背面（双链） */}
                        <div
                          className={`absolute inset-0 rounded-2xl p-5 sm:p-7 shadow-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/98 dark:bg-gray-900/85 backdrop-blur-sm ${currentFont !== 'default' ? 'custom-font-content' : ''}`}
                          style={{ height: '100%', transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                        >
                          <div className="absolute top-2 right-3 text-xs text-gray-500 dark:text-gray-400 select-none">
                            {linkedMemos.length > 0 ? `${backlinkIndex + 1}/${linkedMemos.length}` : '无双链'}
                          </div>
                          <div className="overflow-y-auto pr-2 scrollbar-transparent h-full">
                            {linkedMemos.length > 0 ? (
                              <ContentRenderer
                                content={linkedMemos[backlinkIndex].content}
                                activeTag={null}
                                onTagClick={onTagClick || (() => {})}
                              />
                            ) : (
                              <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">暂无双链内容</div>
                            )}
                          </div>
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
