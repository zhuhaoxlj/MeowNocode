# MeowNocode 后端架构文档

## 🏗️ 架构概述

基于原版 **memos** 项目架构，为 MeowNocode 设计了现代化的无服务器后端解决方案：

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   React 前端    │◄──►│ Cloudflare Worker │◄──►│   D1 数据库    │
│  (浏览器应用)   │    │   (API 服务)     │    │   (SQLite)     │
└─────────────────┘    └──────────────────┘    └────────────────┘
                                │
                                ▼
                       ┌────────────────┐
                       │   R2 存储桶    │
                       │   (文件存储)   │
                       └────────────────┘
```

### 🔄 **智能存储策略**
- **优先使用后端**: 检测到后端服务可用时自动使用
- **本地存储兼容**: 后端不可用时回退到浏览器本地存储
- **数据同步**: 自动将本地数据同步到后端服务器

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 安装 Wrangler CLI
```bash
npm install -g wrangler
```

### 3. 登录 Cloudflare
```bash
wrangler login
```

### 4. 一键部署后端
```bash
npm run setup
```

### 5. 启动开发环境
```bash
# 只启动前端 (使用本地存储)
npm run dev

# 同时启动前端和后端
npm run fullstack:dev
```

## 📦 部署指南

### 自动部署
```bash
# 一键部署脚本（推荐）
npm run backend:deploy
```

### 手动部署步骤

1. **创建 D1 数据库**
```bash
wrangler d1 create meownocode
```

2. **更新 wrangler.toml**
将返回的 `database_id` 更新到 `wrangler.toml` 文件中。

3. **初始化数据库**
```bash
npm run db:init
```

4. **创建 R2 存储桶**
```bash
wrangler r2 bucket create meownocode-files
```

5. **部署 Worker**
```bash
wrangler deploy
```

## 🛠️ 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动前端开发服务器 |
| `npm run backend:dev` | 启动后端开发服务器 |
| `npm run fullstack:dev` | 同时启动前后端 |
| `npm run backend:deploy` | 部署后端到生产环境 |
| `npm run backend:logs` | 查看后端实时日志 |
| `npm run db:init` | 初始化数据库 |
| `npm run db:backup` | 备份数据库 |

## 🗄️ 数据库设计

### 主要表结构

#### memos 表
```sql
CREATE TABLE memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT UNIQUE NOT NULL,           -- 唯一标识符  
  content TEXT NOT NULL,              -- Markdown 内容
  tags TEXT DEFAULT '[]',             -- JSON 标签数组
  created_at TEXT NOT NULL,           -- ISO 8601 时间戳
  updated_at TEXT NOT NULL,           -- ISO 8601 时间戳
  pinned INTEGER DEFAULT 0            -- 是否置顶
);
```

#### attachments 表
```sql
CREATE TABLE attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT UNIQUE NOT NULL,           -- 唯一标识符
  memo_id INTEGER,                    -- 关联备忘录
  filename TEXT NOT NULL,             -- 原始文件名
  type TEXT NOT NULL,                 -- MIME 类型
  size INTEGER NOT NULL,              -- 文件大小
  storage_key TEXT NOT NULL,          -- R2 存储路径
  created_at TEXT NOT NULL,           -- 创建时间
  FOREIGN KEY (memo_id) REFERENCES memos (id)
);
```

## 🔌 API 接口

### RESTful API 设计

#### 备忘录操作
- `GET /api/v1/memos` - 获取备忘录列表
- `POST /api/v1/memos` - 创建备忘录
- `PUT /api/v1/memos/{uid}` - 更新备忘录
- `DELETE /api/v1/memos/{uid}` - 删除备忘录

#### 附件操作
- `POST /api/v1/attachments` - 上传附件
- `GET /api/v1/attachments/{uid}` - 获取附件

#### 系统接口
- `GET /api/v1/health` - 健康检查
- `POST /api/v1/init` - 初始化数据库

### 请求示例

#### 创建备忘录
```javascript
POST /api/v1/memos
Content-Type: application/json

{
  "content": "这是一个测试备忘录 #tag1 #tag2",
  "tags": ["tag1", "tag2"],
  "pinned": false
}
```

#### 上传附件
```javascript
POST /api/v1/attachments
Content-Type: multipart/form-data

file: [File object]
```

## 💾 存储方案对比

| 特性 | 本地存储 | 后端存储 | 
|------|----------|----------|
| **跨浏览器访问** | ❌ | ✅ |
| **数据持久化** | ⚠️ 可能丢失 | ✅ 永久保存 |
| **多设备同步** | ❌ | ✅ |
| **离线可用** | ✅ | ⚠️ 需网络 |
| **存储容量** | ~5-10MB | 几乎无限 |
| **图片存储** | IndexedDB | R2 (CDN) |
| **部署复杂度** | 简单 | 中等 |
| **运行成本** | 免费 | 极低 |

## 🎯 迁移策略

### 从纯本地存储升级

1. **无缝升级**: 现有应用会自动检测后端可用性
2. **数据同步**: 首次检测到后端时自动同步本地数据
3. **向后兼容**: 后端不可用时自动回退到本地存储

### 数据迁移流程

```javascript
// 自动执行，无需手动操作
const dataService = new DataService();
await dataService.initialize(); // 自动检测并同步
```

## 🔧 配置项

### 环境变量
```toml
# wrangler.toml
[vars]
CORS_ORIGIN = "http://localhost:8080"  # 开发环境
# CORS_ORIGIN = "https://your-domain.com"  # 生产环境
```

### 前端配置
```javascript
// src/lib/apiClient.js
getBaseURL() {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:8787'; // 开发环境
  }
  return 'https://your-worker.workers.dev'; // 生产环境
}
```

## 📊 监控与调试

### 查看日志
```bash
# 实时查看 Worker 日志
npm run backend:logs

# 或直接使用 wrangler
wrangler tail
```

### 数据库操作
```bash
# 连接数据库
wrangler d1 execute meownocode --command="SELECT * FROM memos LIMIT 10"

# 备份数据库  
npm run db:backup
```

## 🚀 性能优化

### 自动优化特性
- **全球 CDN**: Cloudflare 边缘网络分发
- **智能缓存**: R2 文件自动缓存
- **数据库索引**: 关键字段已建索引
- **压缩传输**: 自动 Gzip 压缩

### 建议配置
- **图片压缩**: 上传前压缩大图片
- **批量操作**: 使用批量 API 减少请求数
- **缓存策略**: 适当使用浏览器缓存

## 🔒 安全考虑

### 当前实现
- **CORS 保护**: 配置允许的源域名
- **输入验证**: 后端验证所有输入数据
- **SQL 注入防护**: 使用参数化查询

### 生产环境建议
- 添加用户认证系统
- 实现速率限制
- 配置 WAF 防护
- 定期数据库备份

## 🆘 故障排除

### 常见问题

#### 1. 后端连接失败
```bash
# 检查 Worker 状态
wrangler whoami
wrangler dev # 本地测试
```

#### 2. 数据库错误
```bash
# 重新初始化数据库
npm run db:init
```

#### 3. 文件上传失败
- 检查 R2 存储桶是否创建
- 确认文件大小未超过限制(32MB)

#### 4. CORS 错误
- 更新 `wrangler.toml` 中的 `CORS_ORIGIN`
- 重新部署 Worker

### 获取帮助
- 查看 Cloudflare Workers 文档
- 检查 GitHub Issues
- 查看浏览器控制台错误日志

## 🔄 版本升级

### v1.0 -> v2.0 升级指南
1. 备份现有数据
2. 更新代码
3. 运行数据库迁移
4. 重新部署

---

**💡 提示**: 这个架构参考了企业级的 memos 项目设计，提供了生产就绪的可扩展解决方案，同时保持了开发和部署的简单性。