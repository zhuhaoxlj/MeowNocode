# MeowNocode API 参考文档

> 版本: 2.0.0
> 基础 URL: `http://localhost:3000/api`
> 技术栈: Next.js 14 + SQLite (better-sqlite3)

---

## 目录

1. [概述](#概述)
2. [通用说明](#通用说明)
3. [备忘录 API (Memos)](#备忘录-api-memos)
4. [附件 API (Attachments)](#附件-api-attachments)
5. [资源 API (Resources)](#资源-api-resources)
6. [导入/导出 API (Import/Export)](#导入导出-api-importexport)
7. [系统 API (System)](#系统-api-system)
8. [数据模型](#数据模型)
9. [错误处理](#错误处理)

---

## 概述

MeowNocode 是一个基于 Next.js 的备忘录应用，提供完整的 RESTful API 用于备忘录管理、附件上传和数据导入导出。

### 主要功能

- **备忘录管理**: 创建、读取、更新、删除备忘录
- **附件管理**: 上传、获取、删除附件（支持图片等文件）
- **标签系统**: 自动从内容中提取 `#标签`
- **数据导入**: 支持从 Memos 数据库导入
- **数据导出**: 支持导出为 SQLite 数据库文件

---

## 通用说明

### 请求头

| Header | 说明 |
|--------|------|
| `Content-Type` | `application/json`（JSON 请求）或 `multipart/form-data`（文件上传）|
| `Accept` | `application/json` |

### CORS 支持

所有 API 支持跨域请求：
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

### 请求体大小限制

- 默认: 100MB
- 备忘录相关接口: 10MB
- 附件上传: 10MB

### 缓存策略

API 响应默认禁用缓存：
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

---

## 备忘录 API (Memos)

### 获取备忘录列表

```http
GET /api/memos
```

获取分页的备忘录列表（不含资源的完整 blob 数据）。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | integer | 1 | 页码 |
| `limit` | integer | 50 | 每页数量 |
| `pinned` | boolean | - | 筛选置顶状态：`true` 或 `false` |
| `tag` | string | - | 按标签筛选 |
| `search` | string | - | 搜索关键词 |

#### 响应示例

```json
{
  "memos": [
    {
      "id": 1,
      "content": "这是一条备忘录 #标签",
      "tags": ["标签"],
      "pinned": false,
      "archived": false,
      "created_ts": "2024-01-01T00:00:00.000Z",
      "updated_ts": "2024-01-01T00:00:00.000Z",
      "resourceMeta": [
        {
          "id": 1,
          "filename": "image.png",
          "type": "image/png",
          "size": 1024,
          "uid": "meow-abc123"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasMore": true
  }
}
```

---

### 创建备忘录

```http
POST /api/memos
```

创建新的备忘录，可选择关联已上传的附件。

#### 请求体

```json
{
  "content": "备忘录内容 #标签",
  "tags": ["标签"],
  "pinned": false,
  "attachmentIds": [1, 2, 3]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | string | 是* | 备忘录内容 |
| `tags` | string[] | 否 | 标签数组 |
| `pinned` | boolean | 否 | 是否置顶，默认 `false` |
| `attachmentIds` | integer[] | 是* | 要关联的附件 ID 数组 |

> *`content` 和 `attachmentIds` 至少提供一个

#### 响应示例

```json
{
  "memo": {
    "id": 1,
    "content": "备忘录内容 #标签",
    "tags": ["标签"],
    "pinned": false,
    "archived": false,
    "created_ts": "2024-01-01T00:00:00.000Z",
    "updated_ts": "2024-01-01T00:00:00.000Z",
    "resourceMeta": [
      {
        "id": 1,
        "filename": "image.png",
        "type": "image/png",
        "size": 1024,
        "uid": "meow-abc123"
      }
    ]
  }
}
```

**状态码**: `201 Created`

---

### 获取单个备忘录

```http
GET /api/memos/{id}
```

获取指定 ID 的备忘录。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 备忘录 ID |

#### 响应示例

```json
{
  "memo": {
    "id": 1,
    "content": "备忘录内容",
    "tags": ["标签"],
    "pinned": false,
    "archived": false,
    "created_ts": "2024-01-01T00:00:00.000Z",
    "updated_ts": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 错误响应

| 状态码 | 说明 |
|--------|------|
| 404 | Memo 不存在 |
| 500 | 获取 memo 失败 |

---

### 更新备忘录

```http
PUT /api/memos/{id}
```

更新指定 ID 的备忘录。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 备忘录 ID |

#### 请求体

```json
{
  "content": "更新后的内容",
  "tags": ["新标签"],
  "pinned": true,
  "archived": false
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | string | 否 | 新的内容 |
| `tags` | string[] | 否 | 新的标签数组 |
| `pinned` | boolean | 否 | 置顶状态 |
| `archived` | boolean | 否 | 归档状态 |

#### 响应示例

```json
{
  "memo": {
    "id": 1,
    "content": "更新后的内容",
    "tags": ["新标签"],
    "pinned": true,
    "archived": false,
    "created_ts": "2024-01-01T00:00:00.000Z",
    "updated_ts": "2024-01-02T00:00:00.000Z"
  }
}
```

---

### 删除备忘录

```http
DELETE /api/memos/{id}
```

删除指定 ID 的备忘录。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 备忘录 ID |

#### 响应示例

```json
{
  "message": "删除成功"
}
```

---

### 常用操作示例

#### 置顶备忘录

```http
PUT /api/memos/1
Content-Type: application/json

{
  "pinned": true
}
```

#### 取消置顶

```http
PUT /api/memos/1
Content-Type: application/json

{
  "pinned": false
}
```

#### 归档备忘录

```http
PUT /api/memos/1
Content-Type: application/json

{
  "archived": true
}
```

#### 取消归档（恢复）

```http
PUT /api/memos/1
Content-Type: application/json

{
  "archived": false
}
```

#### 同时更新多个字段

```http
PUT /api/memos/1
Content-Type: application/json

{
  "content": "更新的内容",
  "pinned": true,
  "tags": ["重要", "工作"]
}
```

---

### 获取归档备忘录

```http
GET /api/memos/archived
```

获取所有归档的备忘录列表。

#### 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "content": "归档的备忘录",
      "tags": [],
      "pinned": false,
      "archived": true,
      "created_ts": "2024-01-01T00:00:00.000Z",
      "updated_ts": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

---

### 获取备忘录资源

```http
GET /api/memos/{id}/resources
```

获取指定备忘录的所有资源（包含完整 blob 数据）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 备忘录 ID |

#### 响应示例

```json
{
  "resources": [
    {
      "id": 1,
      "uid": "meow-abc123",
      "filename": "image.png",
      "type": "image/png",
      "size": 1024,
      "memo_id": 1,
      "dataUri": "data:image/png;base64,iVBORw0KGgo...",
      "created_ts": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

---

### 获取完整备忘录列表 (Simple 模式)

```http
GET /api/memos/index-full
```

简化版 API，支持更多筛选参数。

#### 查询参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `pinned` | string | - | `"true"` 或 `"false"` |
| `tag` | string | - | 按标签筛选 |
| `search` | string | - | 搜索关键词 |
| `limit` | integer | 100 | 最大返回数量 |
| `offset` | integer | 0 | 偏移量 |

---

### 获取单个完整备忘录 (Simple 模式)

```http
GET /api/memos/{id}-full
```

简化版单个备忘录 API。

---

## 附件 API (Attachments)

### 上传附件 (方式一 - 二进制流)

```http
POST /api/attachments/upload
```

通过二进制流直接上传附件。

#### 请求头

| Header | 说明 |
|--------|------|
| `Content-Type` | 文件的 MIME 类型，如 `image/png` |
| `X-Filename` | 文件名（URL 编码） |

#### 请求体

二进制文件数据

#### 响应示例

```json
{
  "id": 1,
  "filename": "image.png",
  "type": "image/png",
  "size": 1024,
  "url": "/api/attachments/1"
}
```

**状态码**: `200 OK`

---

### 上传附件 (方式二 - FormData)

```http
POST /api/attachments
```

通过 FormData 上传附件。

#### 请求头

```
Content-Type: multipart/form-data
```

#### 表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | 是 | 要上传的文件 |
| `memoId` | integer | 否 | 关联的备忘录 ID |

#### 响应示例

```json
{
  "id": 1,
  "filename": "image.png",
  "type": "image/png",
  "size": 1024,
  "url": "/api/attachments/1"
}
```

**状态码**: `201 Created`

---

### 获取附件

```http
GET /api/attachments/{id}
```

获取附件的二进制数据。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 附件 ID |

#### 响应头

| Header | 说明 |
|--------|------|
| `Content-Type` | 文件的 MIME 类型 |
| `Content-Length` | 文件大小 |
| `Cache-Control` | `public, max-age=31536000`（缓存一年）|

#### 响应体

二进制文件数据

---

### 删除附件

```http
DELETE /api/attachments/{id}
```

删除指定 ID 的附件。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 附件 ID |

#### 响应示例

```json
{
  "success": true
}
```

---

## 资源 API (Resources)

### 获取单个资源

```http
GET /api/resources/{id}
```

按需加载单个资源的完整数据（包括 base64 编码的 blob）。

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string/integer | 资源 ID 或 UID（以 `meow-` 开头）|

#### 响应示例

```json
{
  "resource": {
    "id": 1,
    "uid": "meow-abc123",
    "filename": "image.png",
    "type": "image/png",
    "size": 1024,
    "memo_id": 1,
    "dataUri": "data:image/png;base64,iVBORw0KGgo...",
    "created_ts": "2024-01-01T00:00:00.000Z"
  }
}
```

> 支持通过数字 ID 或 UID（`meow-` 前缀）查询

---

## 导入/导出 API (Import/Export)

### 导入 Memos 数据库

```http
POST /api/memos-import
```

导入 Memos 官方应用的 SQLite 数据库文件。

#### 请求头

```
Content-Type: multipart/form-data
```

#### 表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `database` | File | 是 | `.db` 数据库文件 |
| `wal` | File | 否 | `.db-wal` WAL 日志文件 |
| `shm` | File | 否 | `.db-shm` 共享内存文件 |

#### 响应示例

```json
{
  "success": true,
  "data": {
    "insertedCount": 100,
    "pinnedCount": 5,
    "skippedCount": 2,
    "totalProcessed": 102,
    "summary": {
      "totalMemos": 100,
      "pinnedMemos": 5,
      "resourceCount": 20,
      "statusCounts": {
        "NORMAL": 95,
        "ARCHIVED": 5
      },
      "normalMemos": 95,
      "archivedMemos": 5
    },
    "message": "成功导入 100 条记录"
  }
}
```

#### 配置

- 最大文件大小: 100MB
- 最大超时时间: 300 秒（5 分钟）

---

### 导入 Memos 数据库 (方式二)

```http
POST /api/import/memos-db
```

另一种导入方式，会先备份现有数据再清空后导入。

#### 请求头

```
Content-Type: multipart/form-data
```

#### 表单字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `memosDb` | File | 是 | Memos 数据库文件 |

#### 响应示例

```json
{
  "success": true,
  "imported": 100,
  "archived": 5,
  "total": 105
}
```

---

### 导出数据库

```http
GET /api/export/database
```

导出当前数据库为 SQLite 文件下载。

#### 响应头

| Header | 说明 |
|--------|------|
| `Content-Type` | `application/x-sqlite3` |
| `Content-Disposition` | `attachment; filename="meownocode-{timestamp}.db"` |
| `Content-Length` | 文件大小 |

#### 响应体

SQLite 数据库文件的二进制数据

#### 错误响应

| 状态码 | 说明 |
|--------|------|
| 400 | 数据库为空，无需导出 |
| 500 | 导出失败 |

---

## 系统 API (System)

### 健康检查

```http
GET /api/health
```

检查服务健康状态。

#### 响应示例

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "2.0.0"
}
```

---

### 认证状态

```http
GET /api/auth-status
```

获取当前认证状态。

#### 响应示例

```json
{
  "isAuthenticated": true,
  "user": null
}
```

> 当前版本始终返回 `isAuthenticated: true`

---

### 统计信息

```http
GET /api/stats
```

获取系统统计信息。

#### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `include` | string | 逗号分隔的统计类别：`all`, `database`, `tags`, `attachments`, `server` |

#### 响应示例

```json
{
  "database": {
    "memos": 100,
    "resources": 20,
    "size": "5.2 MB"
  },
  "tags": {
    "total": 15,
    "popular": [
      { "name": "工作", "count": 30 },
      { "name": "生活", "count": 25 }
    ]
  },
  "attachments": {
    "total": 20,
    "totalSize": 10485760,
    "types": {
      "image/png": 15,
      "image/jpeg": 5
    }
  },
  "server": {
    "uptime": 86400,
    "memory": {
      "rss": 50000000,
      "heapTotal": 30000000,
      "heapUsed": 20000000
    },
    "platform": "linux",
    "nodeVersion": "v18.17.0",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 清除演示数据

```http
POST /api/clear-demo-data
```

清除所有备忘录和资源数据，用于导入前的数据清理。

#### 响应示例

```json
{
  "success": true,
  "message": "数据已清理，共清理 100 条记录",
  "clearedCount": 100
}
```

> ⚠️ **危险操作**: 此操作不可逆，会删除所有数据

---

## 数据模型

### Memo（备忘录）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 主键，自增 |
| `content` | string | 备忘录内容 |
| `tags` | string[] | 标签数组 |
| `pinned` | boolean | 是否置顶 |
| `archived` | boolean | 是否归档 |
| `visibility` | string | 可见性：`private`, `protected`, `public` |
| `created_ts` | string | 创建时间 (ISO 8601) |
| `updated_ts` | string | 更新时间 (ISO 8601) |
| `resourceMeta` | Resource[] | 关联的资源元数据 |

### Resource（资源）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | integer | 主键，自增 |
| `uid` | string | 唯一标识符，格式 `meow-{uuid}` |
| `memo_id` | integer | 关联的备忘录 ID |
| `filename` | string | 文件名 |
| `type` | string | MIME 类型 |
| `size` | integer | 文件大小（字节）|
| `blob` | Buffer | 二进制数据 |
| `created_ts` | string | 创建时间 (ISO 8601) |

---

## 错误处理

### 标准错误响应格式

```json
{
  "error": "错误类型",
  "message": "详细错误信息",
  "details": "额外说明（可选）",
  "stack": "调用栈（仅开发环境）"
}
```

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 405 | 方法不允许 |
| 500 | 服务器内部错误 |

### 常见错误示例

**400 Bad Request**
```json
{
  "error": "无效的请求数据",
  "message": "必须提供 content 或 attachmentIds 字段"
}
```

**404 Not Found**
```json
{
  "error": "Memo 不存在"
}
```

**405 Method Not Allowed**
```json
{
  "error": "Method Not Allowed"
}
```

**500 Internal Server Error**
```json
{
  "error": "数据库初始化失败",
  "message": "SQLITE_CANTOPEN: unable to open database file",
  "details": "请检查数据库配置和文件权限"
}
```

---

## 附录

### 完整 API 端点列表

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/auth-status` | 认证状态 |
| `GET` | `/api/stats` | 系统统计 |
| `GET` | `/api/memos` | 获取备忘录列表 |
| `POST` | `/api/memos` | 创建备忘录 |
| `GET` | `/api/memos/{id}` | 获取单个备忘录 |
| `PUT` | `/api/memos/{id}` | 更新备忘录 |
| `DELETE` | `/api/memos/{id}` | 删除备忘录 |
| `GET` | `/api/memos/archived` | 获取归档备忘录 |
| `GET` | `/api/memos/{id}/resources` | 获取备忘录资源 |
| `GET` | `/api/memos/index-full` | 完整备忘录列表（Simple） |
| `GET` | `/api/memos/{id}-full` | 完整单个备忘录（Simple） |
| `POST` | `/api/attachments` | 上传附件（FormData） |
| `POST` | `/api/attachments/upload` | 上传附件（二进制） |
| `GET` | `/api/attachments/{id}` | 获取附件 |
| `DELETE` | `/api/attachments/{id}` | 删除附件 |
| `GET` | `/api/resources/{id}` | 获取资源详情 |
| `POST` | `/api/memos-import` | 导入 Memos 数据库 |
| `POST` | `/api/import/memos-db` | 导入 Memos 数据库（方式二） |
| `GET` | `/api/export/database` | 导出数据库 |
| `POST` | `/api/clear-demo-data` | 清除演示数据 |

### 文件路径对照

| API 路径 | 源文件 |
|----------|--------|
| `/api/memos/index` | `pages/api/memos/index.js` |
| `/api/memos/[id]` | `pages/api/memos/[id].js` |
| `/api/memos/archived` | `pages/api/memos/archived.js` |
| `/api/memos/[id]/resources` | `pages/api/memos/[id]/resources.js` |
| `/api/attachments/index` | `pages/api/attachments/index.js` |
| `/api/attachments/upload` | `pages/api/attachments/upload.js` |
| `/api/attachments/[id]` | `pages/api/attachments/[id].js` |
| `/api/resources/[id]` | `pages/api/resources/[id].js` |
| `/api/health` | `pages/api/health.js` |
| `/api/auth-status` | `pages/api/auth-status.js` |
| `/api/stats` | `pages/api/stats.js` |
| `/api/memos-import` | `pages/api/memos-import.js` |
| `/api/import/memos-db` | `pages/api/import/memos-db.js` |
| `/api/export/database` | `pages/api/export/database.js` |
| `/api/clear-demo-data` | `pages/api/clear-demo-data.js` |
