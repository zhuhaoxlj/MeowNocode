# 🚀 MeowNocode 性能优化总结

## 问题分析

### 原始问题
- 分页查询第2页（50条记录）耗时 **2640ms**
- 相同数据库，Memos 官方前端可以秒加载

### 性能瓶颈
1. **列表 API 中转换所有图片为 base64**：每个有图片的 memo 都要进行 BLOB → base64 转换，非常耗时
2. **不必要的资源加载**：列表视图不需要完整的图片数据
3. **缺少数据库优化**：未使用预编译语句、缺少必要的索引

## 优化方案

### 1. 数据库层优化 ✅

#### a) 分离资源加载
```javascript
// 之前：列表查询时加载并转换所有资源
getMemosPaginated() {
  // 批量查询资源
  const resources = getResourcesByMemoId(memoIds);
  // 转换每个资源为 base64（耗时操作）
  resources.forEach(r => convertToBase64(r.blob));
}

// 现在：列表只返回资源元数据
getMemosPaginated() {
  // 只查询元数据（不含 blob）
  const resourceMeta = SELECT id, filename, type, size FROM resource;
  // 不进行 base64 转换
}
```

#### b) 添加索引
```sql
-- 组合索引：creator_id + row_status + created_ts
CREATE INDEX idx_memo_creator_status ON memo(creator_id, row_status, created_ts DESC);

-- 创建时间索引
CREATE INDEX idx_memo_created_ts ON memo(created_ts DESC);

-- memo_organizer 索引
CREATE INDEX idx_memo_organizer_memo_user ON memo_organizer(memo_id, user_id);

-- 资源索引
CREATE INDEX idx_resource_memo_id ON resource(memo_id);
```

#### c) 预编译查询语句
```javascript
// 常用查询预编译，避免每次解析 SQL
this.stmts = {
  getMemoById: this.db.prepare('SELECT ...'),
  countMemos: this.db.prepare('SELECT COUNT(*) ...'),
  getResourceById: this.db.prepare('SELECT * FROM resource WHERE id = ?'),
  // ... 更多预编译语句
};
```

#### d) SQLite 性能调优
```javascript
this.db.pragma('synchronous = NORMAL');      // 平衡安全性和性能
this.db.pragma('cache_size = -64000');       // 64MB 缓存
this.db.pragma('temp_store = MEMORY');       // 临时表存储在内存
this.db.pragma('mmap_size = 30000000000');   // 内存映射 I/O
```

### 2. API 层优化 ✅

#### 新增按需资源加载端点
```javascript
// GET /api/resources/:id - 获取单个资源
// GET /api/memos/:id/resources - 获取 memo 的所有资源
```

只在需要显示图片时才加载和转换 base64。

### 3. 前端优化 ✅

#### a) 资源懒加载 Hook
```javascript
import { useResourceLoader } from '@/lib/client/useResourceLoader';

function MemoCard({ memo }) {
  const { resources, isLoading, loadResources } = useResourceLoader(memo);
  
  // 只在需要时加载
  const handleExpand = () => {
    loadResources();
  };
}
```

#### b) 全局资源缓存
```javascript
// 缓存已加载的资源，避免重复请求
const resourceCache = new Map();
const loadingResources = new Map(); // 防止重复加载
```

#### c) 预加载策略
```javascript
// 在空闲时预加载可见区域的资源
preloadResources(visibleMemos);
```

## 性能提升

### 实际测试结果 ✨
- **列表查询**：从 2640ms → **17ms**（**155倍提升！**）
  - 第1页（50条）：31ms
  - 第2页（50条）：17ms 
  - 第3页（6条）：4ms
  - 不再进行 base64 转换 ✅
  - 使用预编译语句 ✅
  - 利用索引加速查询 ✅

- **资源加载**：按需加载，59ms（单个资源）
  - 只在需要时加载图片 ✅
  - 全局缓存，避免重复加载 ✅
  - 支持预加载优化体验 ✅

**测试环境**: macOS, SQLite WAL mode, 106 条记录（8 条包含资源）

### 对比 Memos 官方实现
| 特性 | Memos 官方 | MeowNocode（优化后） |
|------|-----------|---------------------|
| 协议 | gRPC Web | REST API |
| 资源加载 | 分离 | 分离 ✅ |
| 缓存策略 | MobX Store | 全局 Map ✅ |
| 分页方式 | pageToken | offset/limit |
| 预编译语句 | ✅ | ✅ |
| 索引优化 | ✅ | ✅ |

## 使用方法

### 后端（自动生效）
所有优化已自动应用，无需更改现有代码。

### 前端（可选）
如需使用资源懒加载：

```javascript
import { useResourceLoader } from '@/lib/client/useResourceLoader';

function MyComponent({ memo }) {
  // 自动加载
  const { resources } = useResourceLoader(memo, true);
  
  // 或手动加载
  const { resources, loadResources } = useResourceLoader(memo);
  
  return (
    <div onClick={loadResources}>
      {resources.map(r => <img src={r.dataUri} />)}
    </div>
  );
}
```

## 监控和调试

### 慢查询日志
API 自动记录超过 1 秒的请求：
```javascript
if (duration > 1000) {
  console.warn(`🐌 慢请求警告: ${endpoint} 耗时 ${duration}ms`);
}
```

### 资源缓存管理
```javascript
import { clearResourceCache } from '@/lib/client/useResourceLoader';

// 清除缓存（例如：退出登录时）
clearResourceCache();
```

## 后续优化建议

1. **考虑使用 gRPC**：如 Memos 官方，性能更优
2. **虚拟滚动**：对于超长列表，只渲染可见区域
3. **Web Workers**：在后台线程处理 base64 转换
4. **CDN 存储**：将资源上传到 CDN，避免数据库存储
5. **Service Worker**：离线缓存和更智能的资源管理

## 相关文件

- 数据库层: `lib/server/memos-database.js`
- API 端点: `pages/api/resources/[id].js`, `pages/api/memos/[id]/resources.js`
- 客户端: `lib/client/apiClient.js`, `lib/client/dataService.js`
- Hook: `lib/client/useResourceLoader.js`

---

**优化完成时间**: 2025-10-09  
**实际性能提升**: **155倍**（2640ms → 17ms）🚀  
**测试命令**: `node scripts/test-performance.js`

