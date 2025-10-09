import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

/**
 * 图片轮播组件
 * 功能：
 * 1. 固定高度展示
 * 2. 点击图片放大
 * 3. 左右箭头按钮切换
 * 4. 指示器点击切换
 * 5. 指示器上滚轮切换（禁止页面滚动）
 * 6. 键盘方向键切换
 */
const ImageCarousel = ({ images = [], onImageClick, height = '300px' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isIndicatorHovered, setIsIndicatorHovered] = useState(false);
  const indicatorRef = useRef(null);
  const wheelTimeoutRef = useRef(null);
  const isWheelThrottledRef = useRef(false);

  // 循环切换到下一张
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // 循环切换到上一张
  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // 跳转到指定图片
  const goToIndex = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  // 使用原生 DOM 事件监听器处理指示器上的滚轮事件
  useEffect(() => {
    const indicatorElement = indicatorRef.current;
    if (!indicatorElement) return;

    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // 节流控制：在300ms内只允许切换一次
      if (isWheelThrottledRef.current) return;
      
      isWheelThrottledRef.current = true;
      
      if (e.deltaY > 0) {
        goToNext();
      } else {
        goToPrev();
      }
      
      // 300ms后解除节流
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
      
      wheelTimeoutRef.current = setTimeout(() => {
        isWheelThrottledRef.current = false;
      }, 300);
    };

    // 使用原生 addEventListener，设置 passive: false 以允许 preventDefault
    indicatorElement.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      indicatorElement.removeEventListener('wheel', handleWheel);
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [goToNext, goToPrev]);

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isHovered) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHovered, goToPrev, goToNext]);

  if (!images || images.length === 0) {
    return null;
  }

  // 只有一张图片时，简化展示
  if (images.length === 1) {
    return (
      <div 
        className="relative group cursor-pointer my-2"
        onClick={() => onImageClick?.(images[0], 0)}
      >
        <div 
          className="relative overflow-hidden rounded-lg shadow-sm"
          style={{ height }}
        >
          <img
            src={images[0].src}
            alt={images[0].alt || '图片'}
            className="w-full h-full object-contain bg-gray-50 dark:bg-gray-900"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative group my-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 图片容器 */}
      <div 
        className="relative overflow-hidden rounded-lg shadow-sm"
        style={{ height }}
      >
        {/* 当前图片 */}
        <div 
          className="relative w-full h-full cursor-pointer"
          onClick={() => onImageClick?.(images[currentIndex], currentIndex)}
        >
          <img
            src={images[currentIndex].src}
            alt={images[currentIndex].alt || `图片 ${currentIndex + 1}`}
            className="w-full h-full object-contain bg-gray-50 dark:bg-gray-900 transition-all duration-300"
          />
          
          {/* 悬停时的放大图标 */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>

        {/* 左右切换按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          aria-label="上一张"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          aria-label="下一张"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* 图片计数 */}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* 指示器 */}
      <div 
        ref={indicatorRef}
        className="flex justify-center items-center gap-2 mt-3 py-2 relative"
        onMouseEnter={() => setIsIndicatorHovered(true)}
        onMouseLeave={() => setIsIndicatorHovered(false)}
      >
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToIndex(index)}
            className={`transition-all duration-200 rounded-full ${
              index === currentIndex
                ? 'w-8 h-2 bg-blue-500'
                : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
            aria-label={`跳转到图片 ${index + 1}`}
          />
        ))}
        
        {/* 悬停提示 */}
        {isIndicatorHovered && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full whitespace-nowrap pointer-events-none">
            滚动切换图片
          </div>
        )}
      </div>

    </div>
  );
};

export default ImageCarousel;

