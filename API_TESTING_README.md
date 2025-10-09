# 🚀 API 接口测试指南

## 📂 新增文件说明

为了方便你使用 Postman 测试 Next.js 后端接口，我创建了以下文件：

### 1️⃣ `API_DOCUMENTATION.md`
**完整的 API 接口文档**
- 所有接口的详细说明
- 请求/响应示例
- 参数说明
- 错误处理指南

### 2️⃣ `postman-collection.json`
**Postman Collection 配置文件**
- 包含所有 API 接口的请求模板
- 预配置的参数和请求体
- 可直接导入 Postman 使用

### 3️⃣ `POSTMAN_TESTING_GUIDE.md`
**Postman 测试完整指南**
- 分步骤教程
- 测试技巧
- 故障排查
- 高级用法（自动化测试脚本）

### 4️⃣ `test-api.sh`
**命令行快速测试脚本**
- 自动测试所有主要 API 接口
- 彩色输出，结果清晰
- 支持自动清理测试数据

---

## 🎯 快速开始

### 方案一：使用 Postman（推荐）

#### 第 1 步：启动服务
```bash
npm run dev
```

#### 第 2 步：导入 Collection
1. 打开 Postman
2. 点击 **Import**
3. 选择 `postman-collection.json`
4. 开始测试！

#### 第 3 步：查看详细指南
阅读 `POSTMAN_TESTING_GUIDE.md` 了解更多细节

---

### 方案二：使用命令行脚本

#### 第 1 步：启动服务
```bash
npm run dev
```

#### 第 2 步：运行测试脚本
```bash
./test-api.sh
```

你会看到类似这样的输出：
```
🧪 开始测试 MeowNocode API
📡 Base URL: http://localhost:8081

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1️⃣  健康检查测试
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing: 健康检查 ... ✓ PASSED (HTTP 200)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2️⃣  Memos 接口测试
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Testing: 创建备忘录 ... ✓ PASSED (HTTP 201)
  📝 Memo ID: memo-1728123456789-abc123
...
```

---

### 方案三：使用 curl 手动测试

#### 健康检查
```bash
curl http://localhost:8081/api/health
```

#### 创建备忘录
```bash
curl -X POST http://localhost:8081/api/memos \
  -H "Content-Type: application/json" \
  -d '{"content":"测试备忘录","tags":["测试"]}'
```

#### 获取备忘录列表
```bash
curl http://localhost:8081/api/memos
```

更多示例请查看 `API_DOCUMENTATION.md`

---

## 📋 可用的 API 接口

### 核心接口
- ✅ `GET /api/health` - 健康检查
- ✅ `GET /api/memos` - 获取备忘录列表（支持分页）
- ✅ `POST /api/memos` - 创建备忘录
- ✅ `GET /api/memos/:id` - 获取单个备忘录
- ✅ `PUT /api/memos/:id` - 更新备忘录
- ✅ `DELETE /api/memos/:id` - 删除备忘录
- ✅ `GET /api/memos/archived` - 获取归档备忘录

### 附件接口
- ✅ `POST /api/attachments` - 上传附件
- ✅ `GET /api/attachments/:id` - 获取附件

### 统计接口
- ✅ `GET /api/stats` - 获取统计信息

### 认证接口
- ✅ `GET /api/auth-status` - 认证状态

### 数据管理
- ✅ `GET /api/export/database` - 导出数据库
- ✅ `POST /api/import/memos-db` - 导入数据库
- ✅ `POST /api/clear-demo-data` - 清除演示数据

---

## 🔍 接口特性

### ✨ 支持分页
```bash
GET /api/memos?page=1&limit=20
```

### 🏷️ 标签系统
```json
{
  "content": "备忘录内容",
  "tags": ["工作", "重要", "今天"]
}
```

### 📌 置顶功能
```json
{
  "pinned": true
}
```

### 📦 归档功能
```json
{
  "archived": true
}
```

### 📎 附件支持
上传图片、文档等文件，自动关联到备忘录

---

## 🛠️ 技术栈

- **框架**: Next.js 14
- **API**: Next.js API Routes
- **数据库**: SQLite (通过 `sqlite3`)
- **存储**: 本地文件系统
- **端口**: 8081

---

## 📊 数据存储位置

- **数据库文件**: `data/meownocode.db`
- **上传文件**: `data/uploads/`
- **备份文件**: `data/backups/`

---

## 🔗 相关文档链接

1. **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - 完整 API 文档
2. **[POSTMAN_TESTING_GUIDE.md](./POSTMAN_TESTING_GUIDE.md)** - Postman 详细教程
3. **[postman-collection.json](./postman-collection.json)** - Postman Collection 文件

---

## ❓ 常见问题

### Q1: 如何修改端口？
A: 修改 `package.json` 中的启动命令：
```json
"dev": "next dev -p 你的端口"
```

### Q2: 数据存在哪里？
A: SQLite 数据库文件在 `data/meownocode.db`

### Q3: 如何重置数据？
A: 删除 `data/meownocode.db` 文件，重启服务器会自动创建新数据库

### Q4: 支持跨域请求吗？
A: 是的，已在中间件中配置 CORS 支持

### Q5: 文件上传大小限制？
A: 默认 100MB，可在 `next.config.js` 中修改

---

## 💡 测试建议

1. **先测试健康检查**：确保服务正常运行
2. **按顺序测试**：创建 → 查询 → 更新 → 删除
3. **保存测试数据**：将创建的 ID 保存下来用于后续测试
4. **测试边界情况**：空内容、超大文件、不存在的 ID 等
5. **查看服务器日志**：终端会显示详细的请求日志

---

## 🎉 开始测试

选择你喜欢的方式：

### 🔵 GUI 方式（Postman）
```bash
# 1. 启动服务
npm run dev

# 2. 导入 postman-collection.json 到 Postman
# 3. 开始点击测试！
```

### 🟢 命令行方式（自动化）
```bash
# 1. 启动服务
npm run dev

# 2. 在新终端运行测试脚本
./test-api.sh
```

### 🟡 手动方式（curl）
```bash
# 1. 启动服务
npm run dev

# 2. 使用 curl 命令测试
curl http://localhost:8081/api/health
```

祝测试愉快！🚀

