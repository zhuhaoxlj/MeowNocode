/**
 * 🚀 资源懒加载 Hook
 * 用于按需加载 memo 的资源（图片、附件等）
 */
import { useState, useEffect, useRef } from 'react';
import { dataService } from './dataService.js';

// 全局资源缓存（跨组件共享）
const resourceCache = new Map();
const loadingResources = new Map(); // 防止重复加载

/**
 * 使用资源加载器
 * @param {Object} memo - 备忘录对象
 * @param {boolean} autoLoad - 是否自动加载（默认 false，需要手动触发）
 */
export function useResourceLoader(memo, autoLoad = false) {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const loadResources = async () => {
    if (!memo || !memo.id) return;
    
    // 检查是否有资源需要加载
    if (!memo.hasResources && !memo.resourceMeta?.length) {
      return;
    }
    
    const memoId = memo.id;
    const cacheKey = `memo-${memoId}`;
    
    // 检查缓存
    if (resourceCache.has(cacheKey)) {
      if (isMountedRef.current) {
        setResources(resourceCache.get(cacheKey));
      }
      return;
    }
    
    // 检查是否正在加载
    if (loadingResources.has(cacheKey)) {
      // 等待现有的加载完成
      try {
        const loadedResources = await loadingResources.get(cacheKey);
        if (isMountedRef.current) {
          setResources(loadedResources);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err);
        }
      }
      return;
    }
    
    // 开始加载
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }
    
    // 创建加载 Promise
    const loadPromise = (async () => {
      try {
        const loadedResources = await dataService.getMemoResources(memoId);
        
        // 缓存结果
        resourceCache.set(cacheKey, loadedResources);
        
        if (isMountedRef.current) {
          setResources(loadedResources);
          setIsLoading(false);
        }
        
        return loadedResources;
      } catch (err) {
        console.error(`❌ 加载资源失败 (memo ${memoId}):`, err);
        
        if (isMountedRef.current) {
          setError(err);
          setIsLoading(false);
        }
        
        throw err;
      } finally {
        // 清除加载状态
        loadingResources.delete(cacheKey);
      }
    })();
    
    // 记录加载状态
    loadingResources.set(cacheKey, loadPromise);
    
    return loadPromise;
  };
  
  // 自动加载
  useEffect(() => {
    if (autoLoad && memo?.id) {
      loadResources();
    }
  }, [autoLoad, memo?.id]);
  
  return {
    resources,
    isLoading,
    error,
    loadResources, // 手动触发加载
  };
}

/**
 * 清除资源缓存
 */
export function clearResourceCache() {
  resourceCache.clear();
  loadingResources.clear();
}

/**
 * 预加载资源
 * @param {Array} memos - 备忘录列表
 */
export async function preloadResources(memos) {
  const loadPromises = memos
    .filter(memo => memo.hasResources && !resourceCache.has(`memo-${memo.id}`))
    .map(memo => {
      const cacheKey = `memo-${memo.id}`;
      if (loadingResources.has(cacheKey)) {
        return loadingResources.get(cacheKey);
      }
      
      const loadPromise = dataService.getMemoResources(memo.id)
        .then(resources => {
          resourceCache.set(cacheKey, resources);
          loadingResources.delete(cacheKey);
          return resources;
        })
        .catch(err => {
          console.error(`❌ 预加载资源失败 (memo ${memo.id}):`, err);
          loadingResources.delete(cacheKey);
          throw err;
        });
      
      loadingResources.set(cacheKey, loadPromise);
      return loadPromise;
    });
  
  return Promise.allSettled(loadPromises);
}

export default useResourceLoader;

