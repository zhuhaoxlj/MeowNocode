# NAS 部署问题快速修复指南

## 问题描述

你遇到的错误：
```
GET http://111.170.174.134:18081/api/memos?page=1&limit=50 500 (Internal Server Error)
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

这意味着 API 返回了 HTML 错误页面而不是 JSON 数据，通常是因为服务器端代码执行失败。

## 快速修复步骤

### 方案 1: 使用自动化脚本（推荐）

在 NAS 上执行：

```bash
# 进入项目目录
cd /path/to/MeowNocode

# 运行自动化部署脚本
bash scripts/setup-nas.sh
```

这个脚本会自动：
- ✅ 检查 Node.js 版本
- ✅ 创建数据库目录
- ✅ 重新编译 better-sqlite3
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 运行诊断
- ✅ 启动服务

### 方案 2: 手动修复

#### 步骤 1: 诊断问题

```bash
cd /path/to/MeowNocode
npm run diagnose
```

这会告诉你具体哪里有问题。

#### 步骤 2: 创建数据库目录

```bash
mkdir -p memos_db
chmod 755 memos_db
```

#### 步骤 3: 上传数据库文件（如果有）

```bash
# 在本地
scp memos_db/memos_dev.db user@nas-ip:/path/to/MeowNocode/memos_db/

# 在 NAS 上设置权限
chmod 664 memos_db/memos_dev.db
```

#### 步骤 4: 重新编译 better-sqlite3

这是**最关键**的一步！在 NAS 上：

```bash
# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装（这会在 NAS 架构上重新编译）
npm install

# 或者只重新编译 better-sqlite3
npm rebuild better-sqlite3
```

#### 步骤 5: 构建项目

```bash
npm run build
```

#### 步骤 6: 启动服务

```bash
# 方式 1: 直接启动
npm start

# 方式 2: 使用 PM2（推荐）
pm2 start npm --name meownocode -- start
pm2 save
```

## 常见问题和解决方案

### 问题 1: better-sqlite3 编译失败

**错误信息**：
```
Error: Cannot find module 'better-sqlite3'
```

**解决方案**：
```bash
# 安装构建工具（如果 NAS 上没有）
# Debian/Ubuntu
sudo apt-get install build-essential python3

# CentOS/RHEL
sudo yum install gcc-c++ make python3

# Alpine (Docker)
apk add --no-cache python3 make g++

# 然后重新安装
npm install better-sqlite3 --build-from-source
```

### 问题 2: 数据库权限错误

**错误信息**：
```
SQLITE_CANTOPEN: unable to open database file
```

**解决方案**：
```bash
# 检查权限
ls -la memos_db/

# 修复权限
chmod 755 memos_db
chmod 664 memos_db/memos_dev.db

# 确保所有者正确（替换为你的用户）
chown -R your-user:your-group memos_db
```

### 问题 3: 端口被占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::8081
```

**解决方案**：
```bash
# 查看占用端口的进程
lsof -i :8081

# 终止进程（替换 PID）
kill -9 PID

# 或者使用不同端口
PORT=8082 npm start
```

### 问题 4: 内存不足

**错误信息**：
```
JavaScript heap out of memory
```

**解决方案**：
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=2048" npm start
```

## 环境变量配置

如果数据库在不同位置，创建 `.env.local` 文件：

```bash
# .env.local
MEMOS_DB_PATH=/custom/path/to/database.db
NODE_ENV=production
PORT=8081
```

## 验证部署

### 1. 检查服务状态

```bash
# 如果使用 PM2
pm2 status

# 查看日志
pm2 logs meownocode
```

### 2. 测试 API

```bash
# 测试健康检查
curl http://localhost:8081/api/health

# 测试 memos API
curl http://localhost:8081/api/memos?page=1&limit=10
```

应该返回 JSON 格式的数据，而不是 HTML。

### 3. 浏览器访问

打开浏览器访问：
```
http://你的NAS-IP:8081
```

## 调试技巧

### 查看详细错误

1. 在 NAS 上直接运行（不用 PM2）：
```bash
npm start
```

2. 查看服务器日志，应该能看到具体错误信息：
```
🔍 尝试连接数据库: /path/to/database.db
❌ 数据库初始化失败: ...
```

### 启用开发模式（临时）

```bash
NODE_ENV=development npm start
```

这会在错误响应中包含完整的堆栈跟踪。

## Docker 部署（高级）

如果 NAS 支持 Docker，这是最可靠的方式：

```bash
# 使用我们提供的 Dockerfile
docker build -t meownocode .

# 运行
docker run -d \
  --name meownocode \
  -p 8081:8081 \
  -v $(pwd)/memos_db:/app/memos_db \
  meownocode

# 查看日志
docker logs -f meownocode
```

## 需要帮助？

如果问题仍然存在，请提供：

1. **运行诊断**：
   ```bash
   npm run diagnose
   ```
   
2. **完整的错误日志**：
   ```bash
   npm start 2>&1 | tee error.log
   ```

3. **系统信息**：
   - NAS 型号和架构
   - Node.js 版本：`node --version`
   - 操作系统：`uname -a`

## 相关文档

- 📖 [完整部署指南](./NAS_DEPLOYMENT_GUIDE.md)
- 🔧 [性能优化文档](./PERFORMANCE_OPTIMIZATION.md)
- 📊 [性能对比](./PERFORMANCE_COMPARISON.md)

