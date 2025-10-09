# MeowNocode API 接口文档

## 启动后端服务

### 开发模式
```bash
npm run dev
```
服务器会在 `http://localhost:8081` 启动

### 生产模式
```bash
npm run build
npm start
```

## 基础信息
- **Base URL**: `http://localhost:8081`
- **Content-Type**: `application/json` (除了文件上传)
- **端口**: 8081

---

## API 接口列表

### 1. 健康检查

#### GET `/api/health`
检查服务器状态

**请求示例**:
```bash
GET http://localhost:8081/api/health
```

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-09T12:00:00.000Z",
  "version": "2.0.0"
}
```

---

### 2. Memos 相关接口

#### GET `/api/memos`
获取备忘录列表（支持分页）

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 50

**请求示例**:
```bash
GET http://localhost:8081/api/memos?page=1&limit=20
```

**响应示例**:
```json
{
  "memos": [
    {
      "id": "memo-1728123456789-abc123",
      "content": "这是一条测试备忘录",
      "tags": ["工作", "重要"],
      "createdAt": "2025-10-09T12:00:00.000Z",
      "updatedAt": "2025-10-09T12:00:00.000Z",
      "pinned": false,
      "archived": false,
      "attachments": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

#### POST `/api/memos`
创建新备忘录

**请求体**:
```json
{
  "content": "这是一条新备忘录",
  "tags": ["工作", "重要"],
  "pinned": false
}
```

**响应示例**:
```json
{
  "memo": {
    "id": "memo-1728123456789-abc123",
    "content": "这是一条新备忘录",
    "tags": ["工作", "重要"],
    "createdAt": "2025-10-09T12:00:00.000Z",
    "updatedAt": "2025-10-09T12:00:00.000Z",
    "pinned": false,
    "archived": false
  }
}
```

#### GET `/api/memos/:id`
获取单个备忘录

**请求示例**:
```bash
GET http://localhost:8081/api/memos/memo-1728123456789-abc123
```

**响应示例**:
```json
{
  "memo": {
    "id": "memo-1728123456789-abc123",
    "content": "这是一条测试备忘录",
    "tags": ["工作"],
    "createdAt": "2025-10-09T12:00:00.000Z",
    "updatedAt": "2025-10-09T12:00:00.000Z",
    "pinned": false,
    "archived": false,
    "attachments": []
  }
}
```

#### PUT `/api/memos/:id`
更新备忘录

**请求体** (所有字段可选):
```json
{
  "content": "更新后的内容",
  "tags": ["工作", "已完成"],
  "pinned": true,
  "archived": false
}
```

**响应示例**:
```json
{
  "memo": {
    "id": "memo-1728123456789-abc123",
    "content": "更新后的内容",
    "tags": ["工作", "已完成"],
    "createdAt": "2025-10-09T12:00:00.000Z",
    "updatedAt": "2025-10-09T13:00:00.000Z",
    "pinned": true,
    "archived": false
  }
}
```

#### DELETE `/api/memos/:id`
删除备忘录

**请求示例**:
```bash
DELETE http://localhost:8081/api/memos/memo-1728123456789-abc123
```

**响应示例**:
```json
{
  "message": "删除成功"
}
```

#### GET `/api/memos/archived`
获取归档的备忘录

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 50

**请求示例**:
```bash
GET http://localhost:8081/api/memos/archived?page=1&limit=20
```

---

### 3. 附件相关接口

#### POST `/api/attachments`
上传附件

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file`: 文件
- `memoId` (可选): 关联的备忘录ID

**请求示例** (使用 curl):
```bash
curl -X POST \
  http://localhost:8081/api/attachments \
  -F "file=@/path/to/file.jpg" \
  -F "memoId=memo-1728123456789-abc123"
```

**响应示例**:
```json
{
  "id": "att-1728123456789-xyz789",
  "filename": "example.jpg",
  "type": "image/jpeg",
  "size": 102400,
  "url": "/api/attachments/att-1728123456789-xyz789",
  "createdAt": "2025-10-09T12:00:00.000Z"
}
```

#### GET `/api/attachments/:id`
获取附件

**请求示例**:
```bash
GET http://localhost:8081/api/attachments/att-1728123456789-xyz789
```

返回附件文件内容

---

### 4. 统计信息接口

#### GET `/api/stats`
获取统计信息

**查询参数**:
- `include` (可选): 逗号分隔的统计类型，可选值: `database`, `tags`, `attachments`, `server`, `all` (默认)

**请求示例**:
```bash
GET http://localhost:8081/api/stats?include=database,tags
```

**响应示例**:
```json
{
  "database": {
    "totalMemos": 150,
    "archivedMemos": 20,
    "pinnedMemos": 5
  },
  "tags": {
    "totalTags": 25,
    "topTags": [
      { "tag": "工作", "count": 45 },
      { "tag": "学习", "count": 30 }
    ]
  },
  "attachments": {
    "totalAttachments": 50,
    "totalSize": 10485760
  },
  "server": {
    "uptime": 12345,
    "memory": {
      "rss": 52428800,
      "heapTotal": 20971520,
      "heapUsed": 15728640
    },
    "platform": "darwin",
    "nodeVersion": "v20.0.0",
    "timestamp": "2025-10-09T12:00:00.000Z"
  }
}
```

---

### 5. 认证状态接口

#### GET `/api/auth-status`
获取当前认证状态

**请求示例**:
```bash
GET http://localhost:8081/api/auth-status
```

**响应示例**:
```json
{
  "authenticated": true,
  "timestamp": "2025-10-09T12:00:00.000Z"
}
```

---

### 6. 数据管理接口

#### GET `/api/export/database`
导出数据库

**请求示例**:
```bash
GET http://localhost:8081/api/export/database
```

返回 SQLite 数据库文件

#### POST `/api/import/memos-db`
导入数据库

**Content-Type**: `multipart/form-data`

**Form Data**:
- `dbFile`: SQLite 数据库文件

#### POST `/api/clear-demo-data`
清除演示数据

**请求示例**:
```bash
POST http://localhost:8081/api/clear-demo-data
```

---

## 错误响应格式

所有错误响应都遵循以下格式:

```json
{
  "error": "错误描述信息"
}
```

### 常见 HTTP 状态码
- `200` - 成功
- `201` - 创建成功
- `400` - 请求参数错误
- `404` - 资源不存在
- `405` - 方法不允许
- `500` - 服务器内部错误

---

## 使用 Postman 测试

1. 导入 `postman-collection.json` 文件
2. 确保 Next.js 服务器正在运行 (`npm run dev`)
3. 设置环境变量:
   - `baseUrl`: `http://localhost:8081`
4. 开始测试各个接口

---

## 注意事项

1. **数据持久化**: 数据存储在 `data/meownocode.db` SQLite 数据库文件中
2. **文件上传**: 上传的文件存储在 `data/uploads/` 目录
3. **CORS**: 已配置 CORS 支持跨域请求
4. **分页**: 建议使用分页参数避免一次性加载大量数据
5. **标签格式**: tags 字段为字符串数组
6. **日期格式**: 所有日期使用 ISO 8601 格式

---

## 快速测试命令

### 创建一条备忘录
```bash
curl -X POST http://localhost:8081/api/memos \
  -H "Content-Type: application/json" \
  -d '{"content":"测试备忘录","tags":["测试"]}'
```

### 获取所有备忘录
```bash
curl http://localhost:8081/api/memos
```

### 健康检查
```bash
curl http://localhost:8081/api/health
```

