# 环境变量迁移指南

## 🔧 已修复的问题

### Vite -> Next.js 环境变量语法转换

在 Next.js 迁移过程中，需要将 Vite 的环境变量语法转换为 Next.js 语法：

#### ❌ 原来 (Vite 语法)
```javascript
// Vite 环境变量
import.meta.env.VITE_SUPABASE_URL
import.meta.env.VITE_SUPABASE_ANON_KEY
import.meta.env.DEV
import.meta.env.VITE_ALLOW_D1_MOCK
```

#### ✅ 现在 (Next.js 语法)
```javascript
// Next.js 环境变量
process.env.NEXT_PUBLIC_SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
process.env.NODE_ENV === 'development'
process.env.NEXT_PUBLIC_ALLOW_D1_MOCK
```

## 📝 已修复的文件

### 1. `src/lib/supabase.js`
- ✅ 将 `import.meta.env.VITE_SUPABASE_URL` -> `process.env.NEXT_PUBLIC_SUPABASE_URL`
- ✅ 将 `import.meta.env.VITE_SUPABASE_ANON_KEY` -> `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ 修复了 `isDevelopment()` 函数，添加了服务器端检查

### 2. `src/lib/d1.js`
- ✅ 将 `import.meta.env.DEV` -> `process.env.NODE_ENV === 'development'`
- ✅ 将 `import.meta.env.VITE_ALLOW_D1_MOCK` -> `process.env.NEXT_PUBLIC_ALLOW_D1_MOCK`

## 🔑 环境变量配置

### 创建 `.env.local` 文件 (如果需要)

如果你需要配置 Supabase 或其他环境变量，创建 `.env.local` 文件：

```bash
# Supabase 配置 (可选)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# D1 数据库模拟 (开发环境)
NEXT_PUBLIC_ALLOW_D1_MOCK=true
```

### 环境变量命名规则

在 Next.js 中：
- `NEXT_PUBLIC_*`: 客户端可访问的环境变量
- 其他变量: 仅服务器端可访问

## ⚡ 解决步骤

1. **修复语法**: 将所有 Vite 环境变量语法改为 Next.js 语法
2. **清除缓存**: 删除 `.next` 文件夹强制重新构建
3. **重启服务**: 运行 `npm run dev` 重新启动开发服务器

## 🎯 现在的状态

- ✅ 所有环境变量语法已修复
- ✅ Supabase 配置已更新
- ✅ D1 数据库配置已更新
- ✅ 开发环境检查已修复
- ✅ 构建缓存已清除

现在应用应该可以正常启动了！🚀