# Memo 列表排序修复

## 问题描述

用户反馈：当双击 memo 项目修改内容并更新后，刷新网页时 memo 列表的顺序会改变。

## 问题原因

之前的排序逻辑使用的是 `created_ts`/`created_at`（创建时间），而不是 `updated_ts`/`updated_at`（更新时间）。这导致：

1. 编辑 memo 后，`updated_ts` 会更新，但排序仍基于 `created_ts`
2. 如果多个 memo 的创建时间非常接近，排序可能出现不稳定的情况
3. 用户期望编辑过的 memo 应该排在最前面（更符合常见的 UI 模式）

## 解决方案

将所有 memo 列表查询的排序字段从 `created_ts`/`created_at` 改为 `updated_ts`/`updated_at`。

排序逻辑变更：
- **旧逻辑**: `ORDER BY pinned DESC, created_ts DESC`
- **新逻辑**: `ORDER BY pinned DESC, updated_ts DESC`

这样可以确保：
1. 置顶的 memo 始终在最前面
2. 在同一置顶状态下，最近更新（或创建）的 memo 排在前面
3. 编辑 memo 后，它会自动移到列表顶部（非置顶情况下）

## 修改的文件

### Next.js 后端（主要使用）

1. **lib/server/memos-database.js** (Memos 官方数据库适配器)
   - `getAllMemos()` - 获取所有 memo
   - `getMemosPaginated()` - 分页获取 memo
   - `getArchivedMemos()` - 获取归档 memo
   - `ensureIndexes()` - 更新索引（从 `created_ts` 改为 `updated_ts`）

2. **lib/server/database.js** (简单数据库实现)
   - `getAllMemos()` - 获取所有 memo
   - `getMemosPaginated()` - 分页获取 memo
   - `getArchivedMemos()` - 获取归档 memo

3. **lib/server/memoService.js** (Memo 服务层)
   - `getMemos()` - 获取 memo 列表

4. **lib/server/memoService-simple.js** (简化版 Memo 服务)
   - `getMemos()` - 获取 memo 列表

### Vite 版本（保持一致性）

5. **src/lib/storage/LocalDBAdapter.js** (本地数据库适配器)
   - `getMemos()` - 获取 memo 列表

## 性能优化

同时优化了数据库索引：
- 旧索引: `idx_memo_created_ts` (基于 `created_ts`)
- 新索引: `idx_memo_updated_ts` (基于 `updated_ts`)

这确保了查询性能不会因为排序字段的改变而降低。

## 测试建议

1. 创建几个 memo
2. 编辑其中一个 memo 的内容
3. 刷新页面
4. 验证编辑过的 memo 是否排在最前面（非置顶状态下）
5. 测试置顶功能，确保置顶的 memo 始终在最前面

## 影响范围

- ✅ 所有 memo 列表查询
- ✅ 分页查询
- ✅ 归档 memo 查询
- ✅ 数据库索引优化
- ✅ Next.js 和 Vite 两个版本均已更新

## 完成日期

2025-10-10

