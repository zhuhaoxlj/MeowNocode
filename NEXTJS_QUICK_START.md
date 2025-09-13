# Next.js 快速启动指南

> **解决您的跨浏览器数据共享问题**

您提到的问题："为啥我现在在一个浏览器上面导入了 memos 的 db 文件，另一个浏览器访问这个项目就没数据呢？" **这正是我们要解决的核心问题**！

## 🎯 **问题根源**

### ❌ **当前的问题**
```
浏览器A ─→ localStorage + IndexedDB (独立存储)
浏览器B ─→ localStorage + IndexedDB (独立存储)
```
**结果**: 每个浏览器有自己的数据，无法共享

### ✅ **Next.js 解决方案**
```
浏览器A ─┐
          ├─→ Next.js 服务器 ─→ SQLite 数据库
浏览器B ─┘
```
**结果**: 统一的数据源，真正的跨浏览器共享

---

## 🚀 **立即开始**

### 1. 一键迁移
```bash
# 在您的项目目录执行
node scripts/migrate-to-nextjs.js
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 访问新版本
打开 http://localhost:3000

---

## 🌟 **立即体验跨浏览器共享**

1. **在 Chrome 中**:
   - 访问 http://localhost:3000
   - 创建一些备忘录
   - 上传图片

2. **在 Firefox 中**:
   - 同样访问 http://localhost:3000
   - **神奇时刻**: 您会看到在 Chrome 中创建的所有数据！

3. **在手机浏览器中**:
   - 访问 http://您的IP:3000
   - 依然可以看到相同的数据！

---

## 📊 **功能对比**

| 功能 | Vite 版本 | Next.js 版本 |
|------|----------|-------------|
| 跨浏览器共享 | ❌ 不支持 | ✅ 完全支持 |
| 数据持久化 | 浏览器本地 | 服务器 SQLite |
| 图片存储 | IndexedDB | 文件系统 |
| 多设备访问 | ❌ 不支持 | ✅ 支持 |
| 数据备份 | 手动导出 | 自动备份 |
| 部署复杂度 | 简单(静态) | 中等(全栈) |
| 扩展性 | 受限 | 强大 |

---

## 📋 **迁移检查清单**

### 自动完成 ✅
- [x] Next.js 项目配置
- [x] API Routes 创建
- [x] SQLite 数据库集成
- [x] 文件上传系统
- [x] 数据服务重写

### 手动步骤 📝
- [ ] 运行迁移脚本
- [ ] 启动开发服务器
- [ ] 验证跨浏览器功能
- [ ] 导入现有数据 (可选)

---

## 🔧 **API 端点概览**

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/memos` | GET | 获取备忘录列表 |
| `/api/memos` | POST | 创建新备忘录 |
| `/api/memos/:id` | PUT | 更新备忘录 |
| `/api/memos/:id` | DELETE | 删除备忘录 |
| `/api/attachments` | POST | 上传附件 |
| `/api/attachments/:id` | GET | 获取附件 |
| `/api/import/memos-db` | POST | 导入数据库 |
| `/api/export/database` | GET | 导出数据库 |
| `/api/stats` | GET | 获取统计信息 |
| `/api/health` | GET | 健康检查 |

---

## 💾 **数据迁移选项**

### 方案1: 导入现有的 .db 文件
如果您有 memos 的 .db 文件:
```javascript
// 在新版本中使用导入功能
await nextDataService.importMemosDatabase(dbFile)
```

### 方案2: 手动重新创建
对于重要的备忘录，可以在新版本中重新创建。

### 方案3: 编写数据迁移脚本
如果需要从 localStorage/IndexedDB 迁移数据，我们可以创建专门的迁移工具。

---

## 🌐 **部署选项**

### 本地开发
```bash
npm run dev
```

### 生产部署 (Vercel - 推荐)
```bash
npm install -g vercel
vercel
```

### 自托管
```bash
npm run build
npm start
```

---

## 🛟 **常见问题**

### Q: 数据会丢失吗？
A: 不会！原有的 Vite 版本不会被影响，Next.js 版本使用独立的服务器数据库。

### Q: 性能会下降吗？
A: 不会！Next.js 提供了更好的优化，而且服务器端数据库通常比浏览器存储更快。

### Q: 需要重新学习吗？
A: 不需要！前端 UI 保持不变，只是数据层升级到了服务器端。

### Q: 如何回滚？
A: 简单！保留原有的 Vite 项目，或者使用备份的 package.json 恢复。

---

## 🎉 **立即体验**

现在就运行迁移脚本，体验真正的跨浏览器数据共享吧！

```bash
node scripts/migrate-to-nextjs.js
npm run dev
```

**几分钟后，您就能在任意浏览器中访问相同的数据了！**

---

## 📞 **需要帮助？**

如果迁移过程中遇到任何问题:

1. 查看 `NEXTJS_MIGRATION.md` 详细文档
2. 检查控制台错误信息
3. 确认端口 3000 未被占用
4. 验证文件权限设置

**这个升级将彻底解决您的跨浏览器数据共享问题！** 🚀