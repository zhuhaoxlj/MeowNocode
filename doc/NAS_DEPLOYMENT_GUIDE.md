# NAS 部署指南

## 问题诊断

如果你在 NAS 上遇到 `500 Internal Server Error` 并且返回 HTML 而不是 JSON，通常是因为：

1. **数据库路径问题** - 数据库文件或目录不存在
2. **better-sqlite3 编译问题** - 原生模块在 NAS 架构上需要重新编译
3. **文件权限问题** - Next.js 进程没有权限访问数据库文件

## 部署步骤

### 1. 检查数据库目录

在 NAS 上确保数据库目录存在：

```bash
cd /path/to/MeowNocode
mkdir -p memos_db
```

### 2. 复制数据库文件

将本地的数据库文件上传到 NAS：

```bash
# 在本地
scp -r memos_db/* user@nas-ip:/path/to/MeowNocode/memos_db/
```

或者直接在 NAS 上创建新数据库（如果没有现有数据）：

```bash
# 在 NAS 上
touch memos_db/memos_dev.db
```

### 3. 重新编译 better-sqlite3

在 NAS 上重新编译原生模块：

```bash
cd /path/to/MeowNocode

# 删除 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装依赖（这会在 NAS 架构上重新编译 better-sqlite3）
npm install

# 或使用 npm rebuild
npm rebuild better-sqlite3
```

### 4. 设置环境变量（可选）

如果你的数据库在不同位置，创建 `.env` 文件：

```bash
# .env
MEMOS_DB_PATH=/custom/path/to/database.db
NODE_ENV=production
PORT=8081
```

### 5. 检查文件权限

确保 Next.js 进程有权限访问数据库：

```bash
# 给予适当的权限
chmod 755 memos_db
chmod 664 memos_db/memos_dev.db

# 或者更宽松的权限（仅用于测试）
chmod 777 memos_db
chmod 666 memos_db/memos_dev.db
```

### 6. 构建并启动

```bash
# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 或使用 PM2（推荐）
pm2 start npm --name "meownocode" -- start
pm2 save
pm2 startup
```

## 调试技巧

### 查看服务器日志

```bash
# 如果使用 PM2
pm2 logs meownocode

# 或直接运行查看输出
npm start
```

### 检查数据库连接

在日志中查找：

```
🔍 尝试连接数据库: /path/to/database.db
✅ Memos 数据库已连接: /path/to/database.db
```

如果看到错误：

```
❌ 数据库目录不存在: /path/to/dir
❌ 数据库初始化失败: ...
```

说明路径或权限有问题。

### 测试 API 端点

```bash
# 测试健康检查
curl http://localhost:8081/api/health

# 测试 memos API
curl http://localhost:8081/api/memos?page=1&limit=10
```

### 常见错误和解决方案

#### 错误 1: `Error: Cannot find module 'better-sqlite3'`

**解决方案**：重新安装依赖
```bash
npm install better-sqlite3 --build-from-source
```

#### 错误 2: `Error: database disk image is malformed`

**解决方案**：数据库文件损坏，恢复备份或创建新数据库
```bash
# 备份旧数据库
mv memos_db/memos_dev.db memos_db/memos_dev.db.bak

# 从备份恢复或重新导入数据
```

#### 错误 3: `SQLITE_CANTOPEN: unable to open database file`

**解决方案**：权限问题
```bash
# 检查目录权限
ls -la memos_db/

# 修复权限
chmod 755 memos_db
chmod 664 memos_db/memos_dev.db
```

## Docker 部署（推荐）

如果 NAS 支持 Docker，推荐使用 Docker 部署：

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装构建工具（用于编译 better-sqlite3）
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 创建数据库目录
RUN mkdir -p /app/memos_db

EXPOSE 8081

CMD ["npm", "start"]
```

```bash
# 构建镜像
docker build -t meownocode .

# 运行容器（挂载数据库目录）
docker run -d \
  --name meownocode \
  -p 8081:8081 \
  -v $(pwd)/memos_db:/app/memos_db \
  meownocode
```

## 性能优化

### 使用 PM2 集群模式

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'meownocode',
    script: 'npm',
    args: 'start',
    instances: 2,  // 或 'max'
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8081
    }
  }]
}

# 启动
pm2 start ecosystem.config.js
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 备份策略

定期备份数据库：

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
DB_PATH="/path/to/MeowNocode/memos_db/memos_dev.db"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp $DB_PATH $BACKUP_DIR/memos_dev_$DATE.db

# 保留最近 7 天的备份
find $BACKUP_DIR -name "memos_dev_*.db" -mtime +7 -delete

echo "Backup completed: memos_dev_$DATE.db"
```

添加到 crontab：

```bash
# 每天凌晨 2 点备份
0 2 * * * /path/to/backup-db.sh
```

## 监控

使用 PM2 监控应用状态：

```bash
# 查看状态
pm2 status

# 查看详细信息
pm2 show meownocode

# 实时监控
pm2 monit
```

## 故障排除清单

- [ ] 数据库文件和目录存在
- [ ] 文件权限正确（755 目录，664 文件）
- [ ] better-sqlite3 在 NAS 架构上正确编译
- [ ] 端口 8081 没有被占用
- [ ] 防火墙允许访问端口 8081
- [ ] 环境变量正确设置（如果使用）
- [ ] Node.js 版本 >= 18
- [ ] 有足够的磁盘空间

## 获取帮助

如果问题仍然存在，请提供：

1. 完整的错误日志
2. NAS 型号和架构（x86_64 / ARM）
3. Node.js 版本：`node --version`
4. npm 版本：`npm --version`
5. 数据库文件权限：`ls -la memos_db/`

