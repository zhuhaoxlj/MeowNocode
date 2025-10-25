import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../../lib/client/dataService';

// 🚀 资源缓存：避免重复加载相同资源
const resourceCache = new Map();

/**
 * 懒加载图片组件
 * 支持：
 * 1. data URI（直接显示）
 * 2. resourceMeta（按需加载）
 * 3. local:// 引用（从 localStorage 加载）
 * 
 * 性能优化：
 * - 使用 Intersection Observer 实现真正的懒加载
 * - 缓存已加载的资源
 * - 错误重试机制
 */
const LazyImage = ({ src, alt, resourceMeta, memoId, ...props }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const imgRef = useRef(null);
  const retryCountRef = useRef(0);

  // 🚀 使用 Intersection Observer 实现真正的懒加载
  useEffect(() => {
    if (!imgRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 提前 50px 开始加载
      }
    );
    
    observer.observe(imgRef.current);
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // 只有当组件可见时才加载图片
    if (!isVisible) return;
    
    const loadImage = async () => {
      // 1. 如果已经是 data URI，直接使用
      if (src && src.startsWith('data:')) {
        setImageSrc(src);
        return;
      }

      // 2. 如果 src 是 placeholder，从 resourceMeta 加载
      if (src && src.startsWith('placeholder-') && resourceMeta) {
        const resourceId = parseInt(src.replace('placeholder-', ''));
        const resource = resourceMeta.find(r => r.id === resourceId);
        
        if (!resource) {
          // 🚀 不存在的资源不显示错误，静默失败
          console.warn(`资源不存在: ${resourceId}`);
          return;
        }

        // 🚀 检查缓存
        const cacheKey = `resource-${resource.id}`;
        if (resourceCache.has(cacheKey)) {
          setImageSrc(resourceCache.get(cacheKey));
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const loadedResource = await dataService.getResource(resource.id);
          
          if (loadedResource && loadedResource.dataUri) {
            // 缓存资源
            resourceCache.set(cacheKey, loadedResource.dataUri);
            setImageSrc(loadedResource.dataUri);
          } else {
            // 🚀 加载失败时重试
            if (retryCountRef.current < 2) {
              retryCountRef.current++;
              setTimeout(() => loadImage(), 1000 * retryCountRef.current);
            } else {
              console.warn(`资源加载失败: ${resource.id}`);
            }
          }
        } catch (err) {
          // 🚀 静默处理错误，避免影响页面渲染
          console.warn('加载图片失败:', err.message || err);
          
          // 重试机制
          if (retryCountRef.current < 2) {
            retryCountRef.current++;
            setTimeout(() => loadImage(), 1000 * retryCountRef.current);
          }
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 3. 如果有 resourceMeta，按需加载（按文件名匹配）
      if (resourceMeta && memoId && alt) {
        // 根据 alt（文件名）找到对应的资源
        const resource = resourceMeta.find(r => 
          r.filename === alt || 
          alt.includes(r.filename) ||
          r.filename.includes(alt)
        );

        if (!resource) {
          console.warn(`找不到匹配的资源: ${alt}`);
          return;
        }

        // 🚀 检查缓存
        const cacheKey = `resource-${resource.id}`;
        if (resourceCache.has(cacheKey)) {
          setImageSrc(resourceCache.get(cacheKey));
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          // 加载资源
          const loadedResource = await dataService.getResource(resource.id);
          
          if (loadedResource && loadedResource.dataUri) {
            // 缓存资源
            resourceCache.set(cacheKey, loadedResource.dataUri);
            setImageSrc(loadedResource.dataUri);
          } else {
            console.warn(`资源加载失败: ${resource.id}`);
          }
        } catch (err) {
          console.warn('加载图片失败:', err.message || err);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 4. 其他情况（local:// 等）
      if (src) {
        setImageSrc(src);
      }
    };

    loadImage();
  }, [src, alt, resourceMeta, memoId, isVisible]);

  // 🚀 占位符 - 在图片加载前显示，预留空间避免布局抖动
  if (!isVisible || isLoading || !imageSrc) {
    return (
      <div 
        ref={imgRef}
        className="inline-flex items-center justify-center w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg my-2"
        style={{ minHeight: '12rem' }}
      >
        {isLoading ? (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-gray-500">加载中...</p>
          </div>
        ) : (
          <div className="text-xs text-gray-400">📷</div>
        )}
      </div>
    );
  }

  // 🚀 显示图片（使用 loading="lazy" 作为额外保护）
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt || '图片'}
      loading="lazy"
      className="max-w-full h-auto rounded-lg shadow-sm my-2"
      onError={(e) => {
        // 图片加载失败时的兜底处理
        console.warn('图片渲染失败:', src || alt);
        e.target.style.display = 'none';
      }}
      {...props}
    />
  );
};

// 使用 React.memo 优化，避免父组件重新渲染时重新加载图片
export default React.memo(LazyImage);

