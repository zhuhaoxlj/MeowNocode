import React, { useState, useEffect } from 'react';
import { dataService } from '../../lib/client/dataService';

/**
 * 懒加载图片组件
 * 支持：
 * 1. data URI（直接显示）
 * 2. resourceMeta（按需加载）
 * 3. local:// 引用（从 localStorage 加载）
 */
const LazyImage = ({ src, alt, resourceMeta, memoId, ...props }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
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
          setError('找不到资源');
          return;
        }

        setIsLoading(true);
        setError(null);

        try {
          const loadedResource = await dataService.getResource(resource.id);
          
          if (loadedResource && loadedResource.dataUri) {
            setImageSrc(loadedResource.dataUri);
          } else {
            setError('加载失败');
          }
        } catch (err) {
          console.error('加载图片失败:', err);
          setError('加载失败');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // 3. 如果有 resourceMeta，按需加载（按文件名匹配）
      if (resourceMeta && memoId && alt) {
        setIsLoading(true);
        setError(null);

        try {
          // 根据 alt（文件名）找到对应的资源
          const resource = resourceMeta.find(r => 
            r.filename === alt || 
            alt.includes(r.filename) ||
            r.filename.includes(alt)
          );

          if (!resource) {
            setError('找不到资源');
            setIsLoading(false);
            return;
          }

          // 加载资源
          const loadedResource = await dataService.getResource(resource.id);
          
          if (loadedResource && loadedResource.dataUri) {
            setImageSrc(loadedResource.dataUri);
          } else {
            setError('加载失败');
          }
        } catch (err) {
          console.error('加载图片失败:', err);
          setError('加载失败');
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
  }, [src, alt, resourceMeta, memoId]);

  // 加载中
  if (isLoading) {
    return (
      <div className="inline-flex items-center justify-center w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg my-2">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 加载失败
  if (error) {
    return (
      <div className="inline-flex items-center justify-center min-w-32 h-32 bg-red-50 dark:bg-red-900/20 rounded-lg my-2 p-4">
        <div className="text-center">
          <p className="text-sm text-red-500">{error}</p>
          <p className="text-xs text-gray-500 mt-1">{alt}</p>
        </div>
      </div>
    );
  }

  // 显示图片
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={alt || '图片'}
        className="max-w-full h-auto rounded-lg shadow-sm my-2"
        {...props}
      />
    );
  }

  // 无图片数据
  return (
    <div className="inline-flex items-center justify-center min-w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg my-2 p-4">
      <p className="text-xs text-gray-500">图片未加载</p>
    </div>
  );
};

// 使用 React.memo 优化，避免父组件重新渲染时重新加载图片
export default React.memo(LazyImage);

