import React, { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

/**
 * 图片预览/放大组件
 * 功能：
 * 1. 全屏显示图片
 * 2. 支持左右切换（如果有多张图片）
 * 3. 支持缩放和旋转
 * 4. ESC 关闭，左右箭头切换
 */
const ImagePreview = ({ images = [], initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  // 切换到下一张
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setScale(1);
    setRotation(0);
  }, [images.length]);

  // 切换到上一张
  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setScale(1);
    setRotation(0);
  }, [images.length]);

  // 放大
  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 5));
  }, []);

  // 缩小
  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  }, []);

  // 旋转
  const rotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // 重置
  const reset = useCallback(() => {
    setScale(1);
    setRotation(0);
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          onClose?.();
          break;
        case 'ArrowLeft':
          if (images.length > 1) goToPrev();
          break;
        case 'ArrowRight':
          if (images.length > 1) goToNext();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
        case '_':
          zoomOut();
          break;
        case 'r':
        case 'R':
          rotate();
          break;
        case '0':
          reset();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrev, goToNext, zoomIn, zoomOut, rotate, reset, images.length]);

  // 防止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!images || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 工具栏 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-white">
          <span className="text-sm">
            {currentIndex + 1} / {images.length}
          </span>
          {currentImage.alt && (
            <span className="text-sm text-gray-300 ml-4">
              {currentImage.alt}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* 缩放控制 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomOut();
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            title="缩小 (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          
          <span className="text-white text-sm min-w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              zoomIn();
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
            title="放大 (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          {/* 旋转 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              rotate();
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white ml-2"
            title="旋转 (R)"
          >
            <RotateCw className="w-5 h-5" />
          </button>

          {/* 重置 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="px-3 py-2 hover:bg-white/10 rounded-lg transition-colors text-white text-sm ml-2"
            title="重置 (0)"
          >
            重置
          </button>

          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white ml-4"
            title="关闭 (ESC)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 图片容器 */}
      <div 
        className="relative w-full h-full flex items-center justify-center p-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.src}
          alt={currentImage.alt || '图片'}
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            cursor: scale > 1 ? 'move' : 'default'
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* 左右切换按钮（多张图片时显示） */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToPrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
            title="上一张 (←)"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              goToNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
            title="下一张 (→)"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* 快捷键提示 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs text-center">
        <p>← → 切换 | + - 缩放 | R 旋转 | 0 重置 | ESC 关闭</p>
      </div>
    </div>
  );
};

export default ImagePreview;

