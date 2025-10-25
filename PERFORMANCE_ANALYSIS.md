# 性能问题分析报告

## 性能指标现状
- **LCP (Largest Contentful Paint)**: 5.81s ❌ (目标: < 2.5s)
- **CLS (Cumulative Layout Shift)**: 0.08 ✅
- **总加载时间**: ~6.37s
- **JS Heap**: 62.5 MB - 159 MB

## 问题分类

### 1. 数据库查询性能问题（最严重）⚠️

#### 问题：N+1 查询
**位置**: `pages/api/memos/index.js` 第28-31行

```javascript
const memosWithAttachments = result.memos.map(memo => ({
  ...memo,
  attachments: db.getResourcesByMemoId(memo.id)  // 🚨 每个memo一次查询
}));
```

**影响**:
- 如果返回50条memo，就会执行 **51次数据库查询**（1次查memo + 50次查attachments）
- 每次查询耗时 ~10-50ms
- 总耗时: **500ms - 2500ms** 仅用于数据库查询

**优化方案**:
```javascript
// 一次性获取所有附件
const memoIds = result.memos.map(m => m.id);
const allAttachments = db.getResourcesByMemoIds(memoIds); // 批量查询

// 建立映射关系
const attachmentsByMemoId = allAttachments.reduce((acc, att) => {
  if (!acc[att.memo_id]) acc[att.memo_id] = [];
  acc[att.memo_id].push(att);
  return acc;
}, {});

// 合并数据
const memosWithAttachments = result.memos.map(memo => ({
  ...memo,
  attachments: attachmentsByMemoId[memo.id] || []
}));
```

### 2. 资源加载失败 ⚠️

**现象**: 控制台显示多个 `/resources/13`, `/resources/14` 等加载警告

**原因**:
1. ContentRenderer 可能尝试加载不存在的资源
2. 没有正确处理资源加载失败的情况

**优化方案**:
- 添加资源存在性检查
- 实现资源加载失败的fallback
- 避免重复加载相同资源

### 3. 图片加载策略问题 🖼️

**问题点**:
1. **没有真正的懒加载**: 虽然有 `LazyImage` 组件，但可能所有图片仍在初始加载时请求
2. **没有图片尺寸优化**: 可能加载原始大图
3. **缺少loading状态**: 图片加载期间可能导致布局抖动

**优化方案**:
- 使用 Intersection Observer API 实现真正的懒加载
- 只加载可视区域的图片
- 添加图片占位符，预留空间
- 使用 loading="lazy" 原生属性

### 4. 组件渲染性能 ⚛️

**问题点**:
1. **ContentRenderer 重复渲染**: 每个 memo 都有一个 ContentRenderer，可能执行大量 Markdown 解析
2. **没有适当的 memo化**: 复杂组件没有使用 React.memo
3. **大列表渲染**: 一次渲染50条复杂的 memo

**优化方案**:
```javascript
// 1. 使用 React.memo 优化组件
const MemoCard = React.memo(({ memo, ... }) => {
  // ...
}, (prevProps, nextProps) => {
  // 自定义比较逻辑
  return prevProps.memo.id === nextProps.memo.id && 
         prevProps.memo.updated_ts === nextProps.memo.updated_ts;
});

// 2. 使用虚拟列表
import { FixedSizeList } from 'react-window';

// 3. 延迟渲染非关键内容
<ContentRenderer 
  content={memo.content}
  defer={index > 10} // 只立即渲染前10条
/>
```

### 5. API 响应时间 🌐

**当前状态**:
- GET /api/memos 平均响应时间: **1,478ms - 2,478ms**

**优化目标**: < 500ms

**优化方案**:
1. 修复 N+1 查询问题（最重要）
2. 添加数据库索引
3. 减少返回的数据量（分页已实现，但可以进一步优化）
4. 考虑添加缓存层

### 6. 前端资源优化 📦

**问题**:
- Bundle 体积可能过大
- 没有代码分割
- 图片资源没有压缩

**优化方案**:
```javascript
// next.config.js
module.exports = {
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        markdown: {
          test: /[\\/]node_modules[\\/](react-markdown|remark-gfm)[\\/]/,
          name: 'markdown',
          priority: 10,
        },
      },
    };
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
};
```

## 优化优先级

### P0 - 立即修复（预期提升 2-3秒）
1. ✅ **修复 N+1 查询问题** - 预期减少 500ms-2000ms
2. ✅ **修复资源加载失败** - 避免不必要的网络请求
3. ✅ **实现真正的图片懒加载** - 减少初始加载时间

### P1 - 高优先级（预期提升 1-2秒）
4. 优化 ContentRenderer 渲染
5. 使用 React.memo 优化组件
6. 添加数据库索引

### P2 - 中优先级（预期提升 0.5-1秒）
7. 实现虚拟列表
8. 代码分割
9. 图片压缩和优化

## 预期效果

实施 P0 优化后：
- LCP: **5.81s → 2.5s** ✅
- 总加载时间: **6.37s → 3.0s** ✅
- API 响应时间: **1,478ms → 300ms** ✅

## 监控指标

建议添加以下监控：
1. 每个 API 端点的响应时间
2. 数据库查询次数和时间
3. 图片加载成功率
4. Core Web Vitals (LCP, FID, CLS)

