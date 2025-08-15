import React, { useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogPortal } from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import ContentRenderer from '@/components/ContentRenderer';
import { useTheme } from '@/context/ThemeContext';

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

  // 仅筛选今天的 memos
  const todayMemos = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return memos
      .filter((m) => {
        const d = (m.createdAt || m.timestamp || '').split('T')[0];
        return d === todayStr;
      })
      .sort((a, b) => new Date(b.updatedAt || b.lastModified || b.createdAt || b.timestamp) - new Date(a.updatedAt || a.lastModified || a.createdAt || a.timestamp));
  }, [memos]);

  // 打开时将焦点设置到轮播容器，便于捕获左右方向键
  useEffect(() => {
    if (isOpen && focusRef.current) {
      // 延迟以确保对话框内容已挂载
      const t = setTimeout(() => {
        try { focusRef.current.focus(); } catch {}
      }, 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogPortal>
        {/* 自定义内容容器（不渲染 Overlay，彻底去除外层深色区域） */}
        <DialogPrimitive.Content
          className="daily-review-content fixed left-1/2 top-1/2 z-50 grid w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 gap-4 p-2 sm:p-3 bg-transparent border-none shadow-none focus:outline-none focus-visible:outline-none"
        >
        {todayMemos.length === 0 ? (
          <div className="flex items-center justify-center p-10 text-center">
            <div className="space-y-2">
              <div className="text-base sm:text-lg font-medium">今天还没有新的记录</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">写下你的第一个想法吧。</div>
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
                {todayMemos.map((memo, idx) => (
                  <CarouselItem key={memo.id} className="basis-full">
                    <div className="relative">
                      {/* 单层卡片：移除外层套卡，仅保留内容卡片 */}
                      <div
                        className={`relative rounded-2xl p-5 sm:p-7 shadow-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/95 dark:bg-gray-900/70 backdrop-blur ${currentFont !== 'default' ? 'custom-font-content' : ''}`}
                        style={{ maxHeight: '60vh', minHeight: '300px' }}
                      >
                        {/* 日期信息：右下角 */}
                        <div className="absolute bottom-2 right-2 text-[11px] leading-none px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60">
                          {new Date(memo.updatedAt || memo.lastModified || memo.createdAt || memo.timestamp).toLocaleString('zh-CN', {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                        <div className="overflow-y-auto pr-2 scrollbar-transparent">
                          <ContentRenderer
                            content={memo.content}
                            activeTag={null}
                            onTagClick={onTagClick || (() => {})}
                          />
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
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
