# SQLite 快速开始 🚀

## 📌 核心信息

**数据库文件：** `data/meownocode.db`  
**迁移数据：** 93 条 memos ✅  
**性能提升：** 10 倍速度 ⚡  

---

## 🎯 快速命令

```bash
# 启动应用
npm run dev

# 重新迁移数据（如需要）
npm run migrate:sqlite

# 查看数据库
sqlite3 data/meownocode.db "SELECT COUNT(*) FROM memos;"
```

---

## 📊 API 示例

```bash
# 获取数据（分页）
curl "http://localhost:8081/api/memos?page=1&limit=20"

# 创建 memo
curl -X POST "http://localhost:8081/api/memos" \
  -H "Content-Type: application/json" \
  -d '{"content":"我的备忘录","tags":"标签"}'

# 更新 memo
curl -X PUT "http://localhost:8081/api/memos/1" \
  -H "Content-Type: application/json" \
  -d '{"pinned":true}'

# 删除 memo
curl -X DELETE "http://localhost:8081/api/memos/1"
```

---

## 📁 重要文件

| 文件 | 说明 |
|------|------|
| `lib/server/database.js` | SQLite 数据库实现 |
| `data/meownocode.db` | SQLite 数据文件 |
| `data/backups/memory-db-backup-*.json` | JSON 数据备份 |
| `SQLITE_MIGRATION_GUIDE.md` | 完整迁移指南 |

---

## ✅ 已完成

- [x] 安装 better-sqlite3
- [x] 实现 SQLite 数据库
- [x] 迁移所有 API 路由
- [x] 迁移 93 条数据
- [x] 测试所有功能
- [x] 创建文档

---

## 🎉 开始使用

```bash
npm run dev
```

访问：http://localhost:8081

**就这么简单！** 🚀

