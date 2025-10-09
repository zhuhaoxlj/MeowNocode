# MeowNocode - NAS 部署指南

## 🚨 遇到 500 错误？

如果你在 NAS 上遇到这个错误：
```
GET http://your-nas-ip:8081/api/memos 500 (Internal Server Error)
SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

不用担心！这是常见的部署问题，我们已经提供了完整的解决方案。

## 🚀 快速修复（3 分钟）

在你的 NAS 上，进入项目目录并运行：

```bash
cd /path/to/MeowNocode

# 运行诊断（看看哪里有问题）
npm run diagnose

# 使用自动化脚本一键部署
bash scripts/setup-nas.sh
```

就这么简单！脚本会自动：
- ✅ 检查环境
- ✅ 创建数据库目录
- ✅ 重新编译 better-sqlite3（关键！）
- ✅ 安装依赖
- ✅ 构建项目
- ✅ 运行诊断
- ✅ 启动服务

## 📋 工具和文档

### 诊断工具
```bash
npm run diagnose
```
快速检查你的 NAS 环境是否正确配置。会告诉你：
- Node.js 版本是否符合要求
- 数据库文件是否存在
- 文件权限是否正确
- better-sqlite3 是否正常工作
- 具体的修复建议

### 自动化部署脚本
```bash
bash scripts/setup-nas.sh
```
一键完成所有部署步骤，包括环境检查、依赖安装、编译和启动。

### 文档

| 文档 | 说明 | 适用场景 |
|------|------|---------|
| [快速修复指南](./doc/QUICK_FIX_NAS.md) | 5 分钟解决常见问题 | ⚡ 快速解决问题 |
| [完整部署指南](./doc/NAS_DEPLOYMENT_GUIDE.md) | 详细的部署教程和最佳实践 | 📖 深入了解 |
| [修复总结](./doc/NAS_FIX_SUMMARY.md) | 问题分析和改进说明 | 🔍 了解根本原因 |

## ❓ 常见问题

### Q1: 为什么同样的代码在本地能跑，NAS 上就报错？

**A**: `better-sqlite3` 是原生模块，包含 C++ 代码。本地编译的版本不能直接在 NAS 上使用，需要在 NAS 上重新编译。

**解决方案**：
```bash
npm rebuild better-sqlite3
```

### Q2: 数据库文件怎么上传到 NAS？

**A**: 使用 SCP 或 SFTP：
```bash
# 在本地
scp -r memos_db user@nas-ip:/path/to/MeowNocode/

# 或使用文件管理器（如 FileZilla）上传
```

### Q3: 如何查看服务器日志？

**A**: 
```bash
# 直接启动（前台运行，可以看到所有日志）
npm start

# 使用 PM2（后台运行）
pm2 start npm --name meownocode -- start
pm2 logs meownocode
```

### Q4: 端口被占用怎么办？

**A**: 
```bash
# 使用不同端口
PORT=8082 npm start

# 或终止占用端口的进程
lsof -i :8081
kill -9 <PID>
```

## 🔧 手动修复步骤

如果自动化脚本不能用，可以手动执行：

```bash
# 1. 进入项目目录
cd /path/to/MeowNocode

# 2. 创建数据库目录
mkdir -p memos_db
chmod 755 memos_db

# 3. 清理并重新安装依赖（重新编译 better-sqlite3）
rm -rf node_modules package-lock.json
npm install

# 4. 构建项目
npm run build

# 5. 启动
npm start
```

## 🎯 验证部署

部署成功后，验证是否正常：

### 1. 测试 API
```bash
# 健康检查
curl http://localhost:8081/api/health

# Memos API
curl http://localhost:8081/api/memos?page=1&limit=10
```

应该返回 JSON 格式的数据。

### 2. 浏览器访问
```
http://你的NAS-IP:8081
```

应该能看到 MeowNocode 界面。

## 🐛 仍然有问题？

如果问题仍然存在：

1. **运行诊断**并提供输出：
   ```bash
   npm run diagnose > diagnostic.log 2>&1
   ```

2. **查看完整日志**：
   ```bash
   npm start > server.log 2>&1
   ```

3. **提供系统信息**：
   ```bash
   echo "Node: $(node --version)"
   echo "NPM: $(npm --version)"
   echo "OS: $(uname -a)"
   echo "Arch: $(uname -m)"
   ```

4. 查看详细文档：
   - [快速修复指南](./doc/QUICK_FIX_NAS.md)
   - [完整部署指南](./doc/NAS_DEPLOYMENT_GUIDE.md)

## 📊 性能监控

使用 PM2 监控应用：

```bash
# 启动
pm2 start npm --name meownocode -- start

# 监控
pm2 monit

# 状态
pm2 status

# 日志
pm2 logs meownocode
```

## 🔒 安全建议

1. **使用反向代理**（Nginx）
2. **启用 HTTPS**
3. **定期备份数据库**
4. **限制外网访问**（如果只在内网使用）

## 📦 备份和恢复

### 备份
```bash
# 备份数据库
cp memos_db/memos_dev.db memos_db/backup_$(date +%Y%m%d).db

# 或使用我们的备份脚本
npm run db:backup
```

### 恢复
```bash
# 从备份恢复
cp memos_db/backup_20241009.db memos_db/memos_dev.db
```

## 🌟 最佳实践

1. **使用 PM2** 管理进程（自动重启、日志管理）
2. **定期备份** 数据库（建议设置 cron job）
3. **监控资源** 使用（CPU、内存、磁盘）
4. **保持更新** 依赖包（定期运行 `npm update`）
5. **使用环境变量** 配置敏感信息

## 📚 更多资源

- [性能优化文档](./doc/PERFORMANCE_OPTIMIZATION.md)
- [性能对比](./doc/PERFORMANCE_COMPARISON.md)
- [完整优化总结](./doc/OPTIMIZATION_COMPLETE.md)

---

**需要帮助？** 请提供诊断输出、完整错误日志和系统信息。

**一切正常？** 享受 MeowNocode 吧！🎉

